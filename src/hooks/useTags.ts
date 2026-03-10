import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Tag = Tables<"tags">;

export function useTags(workspaceId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    setTags(data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const create = async (name: string, color: string) => {
    const { data, error } = await supabase
      .from("tags")
      .insert({ workspace_id: workspaceId, name, color })
      .select()
      .single();

    if (!error && data) {
      setTags((prev) => [...prev, data]);
    }
    return { data, error };
  };

  const update = async (id: string, updates: { name?: string; color?: string }) => {
    const { error } = await supabase
      .from("tags")
      .update(updates)
      .eq("id", id);

    if (!error) {
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    }
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (!error) {
      setTags((prev) => prev.filter((t) => t.id !== id));
    }
    return { error };
  };

  const addTagToTicket = async (ticketId: string, tagId: string) => {
    return supabase.from("ticket_tags").insert({ ticket_id: ticketId, tag_id: tagId });
  };

  const removeTagFromTicket = async (ticketId: string, tagId: string) => {
    return supabase.from("ticket_tags").delete().eq("ticket_id", ticketId).eq("tag_id", tagId);
  };

  return { tags, loading, create, update, remove, addTagToTicket, removeTagFromTicket, refetch: fetchTags };
}
