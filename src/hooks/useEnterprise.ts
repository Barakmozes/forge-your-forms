// ============================================
// useEnterprise — Enterprise settings CRUD + realtime (Agent 14)
// ============================================

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface EnterpriseSettings {
  workspace_id: string;
  sso_enabled: boolean;
  sso_provider: string | null;
  sso_metadata_url: string | null;
  sso_certificate: string | null;
  sso_entity_id: string | null;
  white_label_enabled: boolean;
  custom_logo_url: string | null;
  custom_favicon_url: string | null;
  custom_app_name: string | null;
  custom_primary_color: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<EnterpriseSettings, "workspace_id" | "created_at" | "updated_at"> = {
  sso_enabled: false,
  sso_provider: null,
  sso_metadata_url: null,
  sso_certificate: null,
  sso_entity_id: null,
  white_label_enabled: false,
  custom_logo_url: null,
  custom_favicon_url: null,
  custom_app_name: null,
  custom_primary_color: null,
};

export function useEnterprise() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [settings, setSettings] = useState<EnterpriseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!workspaceId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("enterprise_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!error && data) {
      setSettings(data as unknown as EnterpriseSettings);
    } else {
      setSettings(null);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`enterprise-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enterprise_settings",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<EnterpriseSettings, "workspace_id" | "created_at" | "updated_at">>) => {
      if (!workspaceId) return { error: new Error("No workspace selected") };
      setSaving(true);

      // Upsert: insert if not exists, update if exists
      const payload = {
        workspace_id: workspaceId,
        ...DEFAULT_SETTINGS,
        ...settings,
        ...updates,
      };
      // Remove timestamp fields — DB handles them
      const { created_at, updated_at, ...upsertData } = payload as EnterpriseSettings;

      const { data, error } = await supabase
        .from("enterprise_settings")
        .upsert(upsertData as Record<string, unknown>, { onConflict: "workspace_id" })
        .select()
        .single();

      if (!error && data) {
        setSettings(data as unknown as EnterpriseSettings);
      }

      setSaving(false);
      return { data, error };
    },
    [workspaceId, settings]
  );

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: fetchSettings,
    // Convenience accessors
    ssoEnabled: settings?.sso_enabled ?? false,
    whiteLabelEnabled: settings?.white_label_enabled ?? false,
  };
}
