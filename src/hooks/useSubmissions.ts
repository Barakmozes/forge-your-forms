import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubmissionRow {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
}

interface FetchSubmissionsResult {
  submissions: SubmissionRow[];
  totalCount: number;
}

interface FetchSubmissionsParams {
  formId: string | null;
  formIds: string[];
  page: number;
  pageSize: number;
}

async function fetchSubmissions({
  formId,
  formIds,
  page,
  pageSize,
}: FetchSubmissionsParams): Promise<FetchSubmissionsResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("submissions")
    .select("id, form_id, data, submitted_by_email, submitted_by_name, submitted_at", {
      count: "exact",
    })
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (formId) {
    query = query.eq("form_id", formId);
  } else if (formIds.length > 0) {
    query = query.in("form_id", formIds);
  } else {
    return { submissions: [], totalCount: 0 };
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const submissions: SubmissionRow[] = (data ?? []).map((s) => ({
    ...s,
    data: (s.data as Record<string, unknown>) ?? {},
  }));

  return { submissions, totalCount: count ?? 0 };
}

export function useSubmissions(
  formId: string | null,
  formIds: string[],
  page: number,
  pageSize = 25
) {
  const queryClient = useQueryClient();
  const effectiveKey = formId ?? "all";

  const submissionsQuery = useQuery({
    queryKey: ["submissions", effectiveKey, page, pageSize, formIds],
    queryFn: () => fetchSubmissions({ formId, formIds, page, pageSize }),
    enabled: !!formId || formIds.length > 0,
  });

  const deleteSubmission = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from("submissions")
        .delete()
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });

  return {
    submissions: submissionsQuery.data?.submissions ?? [],
    totalCount: submissionsQuery.data?.totalCount ?? 0,
    isLoading: submissionsQuery.isLoading,
    error: submissionsQuery.error,
    refetch: submissionsQuery.refetch,
    deleteSubmission,
  };
}
