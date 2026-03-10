import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CannedResponse = Tables<"canned_responses">;

export function useCannedResponses(workspaceId: string) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("canned_responses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("title");

    setResponses(data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const create = async (title: string, content: string, category?: string) => {
    const { data, error } = await supabase
      .from("canned_responses")
      .insert({ workspace_id: workspaceId, title, content, category: category || null })
      .select()
      .single();

    if (!error && data) {
      setResponses((prev) => [...prev, data]);
    }
    return { data, error };
  };

  const update = async (id: string, updates: { title?: string; content?: string; category?: string | null }) => {
    const { error } = await supabase
      .from("canned_responses")
      .update(updates)
      .eq("id", id);

    if (!error) {
      setResponses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("canned_responses")
      .delete()
      .eq("id", id);

    if (!error) {
      setResponses((prev) => prev.filter((r) => r.id !== id));
    }
    return { error };
  };

  return { responses, loading, create, update, remove, refetch: fetchResponses };
}
