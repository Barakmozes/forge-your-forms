import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Webhook = Database["public"]["Tables"]["webhooks"]["Row"];
type WebhookInsert = Database["public"]["Tables"]["webhooks"]["Insert"];
type WebhookDelivery = Database["public"]["Tables"]["webhook_deliveries"]["Row"];

export function useWebhooks(workspaceId: string | undefined) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!error && data) setWebhooks(data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`webhooks-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "webhooks", filter: `workspace_id=eq.${workspaceId}` },
        () => { fetchWebhooks(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, fetchWebhooks]);

  async function createWebhook(webhook: Omit<WebhookInsert, "workspace_id">): Promise<{ data: Webhook | null; error: string | null }> {
    if (!workspaceId) return { data: null, error: "No workspace" };

    const { data, error } = await supabase
      .from("webhooks")
      .insert({ ...webhook, workspace_id: workspaceId })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    if (data) setWebhooks((prev) => [data, ...prev]);
    return { data, error: null };
  }

  async function updateWebhook(id: string, updates: Partial<WebhookInsert>): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("webhooks")
      .update(updates)
      .eq("id", id);

    if (error) return { error: error.message };
    setWebhooks((prev) => prev.map((wh) => (wh.id === id ? { ...wh, ...updates } as Webhook : wh)));
    return { error: null };
  }

  async function deleteWebhook(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
    return { error: null };
  }

  async function toggleWebhook(id: string, active: boolean): Promise<{ error: string | null }> {
    return updateWebhook(id, { active });
  }

  return {
    webhooks,
    loading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    refetch: fetchWebhooks,
  };
}

export function useWebhookDeliveries(webhookId: string | undefined) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    if (!webhookId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setDeliveries(data);
    setLoading(false);
  }, [webhookId]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  async function retryDelivery(deliveryId: string): Promise<{ error: string | null }> {
    // Re-dispatch by invoking the edge function with stored payload
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { error: "Delivery not found" };

    const payload = delivery.payload as Record<string, unknown>;
    const { error } = await supabase.functions.invoke("dispatch-webhook", {
      body: {
        workspace_id: (payload as Record<string, unknown>)?.workspace_id,
        event_type: delivery.event_type,
        payload: (payload as Record<string, unknown>)?.data ?? payload,
      },
    });

    if (error) return { error: error.message };
    fetchDeliveries();
    return { error: null };
  }

  return {
    deliveries,
    loading,
    retryDelivery,
    refetch: fetchDeliveries,
  };
}
