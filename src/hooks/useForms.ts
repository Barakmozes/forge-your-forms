import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];
type FormStatus = Database["public"]["Enums"]["form_status"];

export interface FormRow {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  mode: FormMode;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

interface CreateFormInput {
  title: string;
  description?: string | null;
  mode?: FormMode;
}

interface UpdateFormInput {
  id: string;
  title?: string;
  description?: string | null;
  status?: FormStatus;
  fields?: unknown[];
  settings?: Record<string, unknown>;
  branding?: Record<string, unknown>;
}

async function fetchForms(workspaceId: string): Promise<FormRow[]> {
  const { data, error } = await supabase
    .from("forms")
    .select("id, title, description, status, mode, submission_count, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FormRow[];
}

export function useForms() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const formsQuery = useQuery({
    queryKey: ["forms", workspaceId],
    queryFn: () => fetchForms(workspaceId!),
    enabled: !!workspaceId,
  });

  const createForm = useMutation({
    mutationFn: async (input: CreateFormInput) => {
      if (!workspaceId || !user) throw new Error("Missing workspace or user");
      const { data, error } = await supabase
        .from("forms")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          mode: input.mode ?? "standard",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] });
    },
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFormInput) => {
      const { error } = await supabase
        .from("forms")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] });
    },
  });

  return {
    forms: formsQuery.data ?? [],
    isLoading: formsQuery.isLoading,
    error: formsQuery.error,
    refetch: formsQuery.refetch,
    createForm,
    updateForm,
    deleteForm,
  };
}
