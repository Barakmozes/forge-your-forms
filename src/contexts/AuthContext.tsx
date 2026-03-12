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
  lastEvent: AuthChangeEvent | null;
  signOut: () => Promise<void>;
  /* === AGENT 14: SSO Auth Flow === */
  signInWithSSO: (workspaceSlug: string) => Promise<{ error?: string }>;
  /* === END AGENT 14 === */
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  lastEvent: null,
  signOut: async () => {},
  /* === AGENT 14: SSO Auth Flow === */
  signInWithSSO: async () => ({}),
  /* === END AGENT 14 === */
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastEvent, setLastEvent] = useState<AuthChangeEvent | null>(null);
  const { handleAsync } = useErrorHandler();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setLastEvent(event);
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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

      // Check if SSO is enabled for this workspace
      const { data: enterprise, error: entError } = await supabase
        .from("enterprise_settings")
        .select("sso_enabled, sso_provider")
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

      // Supabase Auth SSO — requires Supabase project to have SSO configured
      // via `supabase.auth.signInWithSSO({ providerId })`.
      // The providerId must be registered in the Supabase dashboard.
      // For now, this is a ready-to-activate integration point.
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({
        domain: workspaceSlug,
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
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, lastEvent, signOut, signInWithSSO }}>
      {children}
    </AuthContext.Provider>
  );
}
