import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useErrorHandler } from "@/hooks/useErrorHandler";

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
  const signInWithSSO = async (workspaceSlug: string): Promise<{ error?: string }> => {
    try {
      // Look up the workspace by slug to find its SSO settings
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();

      if (wsError || !workspace) {
        return { error: "Workspace not found" };
      }

      // Check if SSO is enabled for this workspace
      const { data: enterprise, error: entError } = await supabase
        .from("enterprise_settings")
        .select("sso_enabled, sso_provider")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (entError || !enterprise?.sso_enabled) {
        return { error: "SSO is not enabled for this workspace" };
      }

      // Supabase Auth SSO — requires Supabase project to have SSO configured
      // via `supabase.auth.signInWithSSO({ providerId })`.
      // The providerId must be registered in the Supabase dashboard.
      // For now, this is a ready-to-activate integration point.
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({
        domain: workspaceSlug,
      });

      if (ssoError) {
        return { error: ssoError.message };
      }

      // Redirect to the SSO provider's login page
      if (data?.url) {
        window.location.href = data.url;
      }

      return {};
    } catch (err) {
      return { error: "SSO sign-in failed. Please try again." };
    }
  };
  /* === END AGENT 14 === */

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, lastEvent, signOut, signInWithSSO }}>
      {children}
    </AuthContext.Provider>
  );
}
