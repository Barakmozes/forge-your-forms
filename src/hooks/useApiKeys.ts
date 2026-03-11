import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];

export function useApiKeys(workspaceId: string | undefined) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (!error && data) setApiKeys(data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  /**
   * Creates a new API key. Returns the raw key (shown once to user)
   * and stores only the hash in the database.
   */
  async function createApiKey(name: string): Promise<{ rawKey: string | null; error: string | null }> {
    if (!workspaceId) return { rawKey: null, error: "No workspace" };

    // Generate raw key
    const rawKey = `ff_${crypto.randomUUID().replace(/-/g, "")}`;
    const prefix = rawKey.substring(0, 11); // "ff_" + 8 chars

    // Hash the key using SHA-256
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        workspace_id: workspaceId,
        key_hash: keyHash,
        key_prefix: prefix,
        name,
      })
      .select()
      .single();

    if (error) return { rawKey: null, error: error.message };
    if (data) setApiKeys((prev) => [data, ...prev]);
    return { rawKey, error: null };
  }

  async function revokeApiKey(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { error: error.message };
    setApiKeys((prev) => prev.filter((key) => key.id !== id));
    return { error: null };
  }

  return {
    apiKeys,
    loading,
    createApiKey,
    revokeApiKey,
    refetch: fetchApiKeys,
  };
}
