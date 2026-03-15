import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { toast } from "@/hooks/use-toast";
import { logError } from "@/lib/errorLogger";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  lastEvent: AuthChangeEvent | null;
  signOut: () => Promise<void>;
  retry: () => void;
  /* === AGENT 14: SSO Auth Flow === */
  signInWithSSO: (workspaceSlug: string) => Promise<{ error?: string }>;
  /* === END AGENT 14 === */
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  error: null,
  lastEvent: null,
  signOut: async () => {},
  retry: () => {},
  /* === AGENT 14: SSO Auth Flow === */
  signInWithSSO: async () => ({}),
  /* === END AGENT 14 === */
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<AuthChangeEvent | null>(null);
  const { handleAsync } = useErrorHandler();

  const loadSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Auth session error:", sessionError.message);
        logError(sessionError, { component: "AuthProvider", action: "getSession" });
        setError("Failed to restore session. Please refresh the page.");
      }
      setSession(session);
    } catch (err) {
      console.error("Auth connection error:", err);
      logError(err, { component: "AuthProvider", action: "getSession" });
      setError("Unable to connect to authentication service. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    loadSession();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setLastEvent(event);
        setSession(session);
        setLoading(false);
      }
    );

    loadSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await handleAsync(() => supabase.auth.signOut(), {
      context: { component: "AuthProvider", action: "signOut" },
      errorMessage: "Failed to sign out. Please try again.",
    });
  };

  /* === AGENT 14: SSO Auth Flow === */
  /* === AGENT 22: Improved error handling with toast feedback === */
  const signInWithSSO = async (workspaceSlug: string): Promise<{ error?: string }> => {
    try {
      // Look up the workspace by slug to find its SSO settings
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();

      if (wsError || !workspace) {
        const msg = "Workspace not found. Please check the workspace slug and try again.";
        toast({ title: "SSO Error", description: msg, variant: "destructive" });
        logError(wsError ?? new Error(msg), { component: "AuthProvider", action: "signInWithSSO" });
        return { error: msg };
      }

      // Check if SSO is enabled for this workspace and get the configured email domain
      const { data: enterprise, error: entError } = await supabase
        .from("enterprise_settings")
        .select("sso_enabled, sso_provider, sso_domain")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (entError) {
        const msg = "Unable to verify SSO configuration. Please try again later.";
        toast({ title: "SSO Error", description: msg, variant: "destructive" });
        logError(entError, { component: "AuthProvider", action: "signInWithSSO" });
        return { error: msg };
      }

      if (!enterprise?.sso_enabled) {
        const msg = "SSO is not enabled for this workspace. Contact your workspace administrator.";
        toast({ title: "SSO Not Configured", description: msg, variant: "destructive" });
        return { error: msg };
      }

      // sso_domain is the company email domain (e.g. "acme.com") registered
      // in the Supabase Auth SSO provider — NOT the workspace slug.
      if (!enterprise?.sso_domain) {
        const msg = "SSO login domain is not configured. Ask your workspace owner to add the company email domain in Settings > Enterprise > SSO.";
        toast({ title: "SSO Not Configured", description: msg, variant: "destructive" });
        return { error: msg };
      }

      // Supabase Auth SSO — requires Supabase project to have SSO configured
      // via the Supabase dashboard. The domain must match the registered provider.
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({
        domain: enterprise.sso_domain,
      });

      if (ssoError) {
        // Map common Supabase SSO errors to user-friendly messages
        const ssoMsg = ssoError.message?.includes("No SSO provider")
          ? "SSO provider is not configured for this workspace. Contact your administrator."
          : ssoError.message?.includes("rate limit")
            ? "Too many sign-in attempts. Please wait a moment and try again."
            : `SSO sign-in failed: ${ssoError.message}`;
        toast({ title: "SSO Sign-In Failed", description: ssoMsg, variant: "destructive" });
        logError(ssoError, { component: "AuthProvider", action: "signInWithSSO" });
        return { error: ssoMsg };
      }

      // Redirect to the SSO provider's login page
      if (data?.url) {
        window.location.href = data.url;
      }

      return {};
    } catch (err) {
      const msg = "SSO sign-in failed unexpectedly. Please try again.";
      toast({ title: "SSO Error", description: msg, variant: "destructive" });
      logError(err, { component: "AuthProvider", action: "signInWithSSO" });
      return { error: msg };
    }
  };
  /* === END AGENT 22 === */
  /* === END AGENT 14 === */

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, error, lastEvent, signOut, retry, signInWithSSO }}>
      {children}
    </AuthContext.Provider>
  );
}
