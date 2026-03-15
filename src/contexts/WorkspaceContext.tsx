import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

const WORKSPACE_STORAGE_KEY = "formforge_current_workspace_id";

interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  loading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  loading: true,
  error: null,
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setCurrentWorkspace = (ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, ws.id);
  };

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchWorkspaces = async () => {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("workspaces")
        .select("id, name, slug, owner_id, created_at")
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError("Failed to load workspaces. Please refresh.");
        setLoading(false);
        return;
      }

      if (data) {
        setWorkspaces(data);

        // Restore persisted selection, or fall back to first workspace
        const savedId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        const savedWs = savedId ? data.find((w) => w.id === savedId) : null;
        if (!currentWorkspace) {
          setCurrentWorkspaceState(savedWs ?? data[0] ?? null);
        }
      }
      setLoading(false);
    };

    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace, loading, error }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
