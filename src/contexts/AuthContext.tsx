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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  lastEvent: null,
  signOut: async () => {},
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

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, lastEvent, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
