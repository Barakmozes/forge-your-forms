// ============================================
// useUsage — workspace usage tracking hook (Agent 7)
// ============================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";

interface WorkspaceUsage {
  submissionCount: number;
  formCount: number;
  memberCount: number;
}

async function fetchUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const { data, error } = await supabase
    .rpc("get_workspace_usage", { ws_id: workspaceId });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  return {
    submissionCount: row?.submission_count ?? 0,
    formCount: row?.form_count ?? 0,
    memberCount: row?.member_count ?? 0,
  };
}

export function useUsage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const currentMonth = format(new Date(), "yyyy-MM");

  const query = useQuery({
    queryKey: ["usage", workspaceId, currentMonth],
    queryFn: () => fetchUsage(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    submissionCount: query.data?.submissionCount ?? 0,
    formCount: query.data?.formCount ?? 0,
    memberCount: query.data?.memberCount ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
