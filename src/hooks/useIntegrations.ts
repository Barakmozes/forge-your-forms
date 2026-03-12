// ============================================
// useIntegrations — CRUD for third-party integration settings (Agent 10)
// Stores config in forms.settings.integrations JSONB
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SlackConfig {
  enabled: boolean;
  webhook_url: string;
  channel_name: string;
  events: string[];
}

export interface ZapierConfig {
  enabled: boolean;
}

export interface MailchimpConfig {
  enabled: boolean;
  api_key: string;
  list_id: string;
  list_name: string;
  field_mapping: Record<string, string>;
}

export interface ConvertKitConfig {
  enabled: boolean;
  api_key: string;
  form_id: string;
}

export interface IntegrationSettings {
  slack?: SlackConfig;
  zapier?: ZapierConfig;
  mailchimp?: MailchimpConfig;
  convertkit?: ConvertKitConfig;
}

const DEFAULT_SLACK: SlackConfig = {
  enabled: false,
  webhook_url: "",
  channel_name: "",
  events: [],
};

const DEFAULT_ZAPIER: ZapierConfig = {
  enabled: false,
};

const DEFAULT_MAILCHIMP: MailchimpConfig = {
  enabled: false,
  api_key: "",
  list_id: "",
  list_name: "",
  field_mapping: {},
};

const DEFAULT_CONVERTKIT: ConvertKitConfig = {
  enabled: false,
  api_key: "",
  form_id: "",
};

export function getDefaultIntegrations(): IntegrationSettings {
  return {
    slack: { ...DEFAULT_SLACK },
    zapier: { ...DEFAULT_ZAPIER },
    mailchimp: { ...DEFAULT_MAILCHIMP },
    convertkit: { ...DEFAULT_CONVERTKIT },
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useIntegrations(formId: string) {
  const [integrations, setIntegrations] = useState<IntegrationSettings>(getDefaultIntegrations());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!formId) return;
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("forms")
      .select("settings")
      .eq("id", formId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
    }

    if (!fetchError && data) {
      const settings = (data.settings as Record<string, unknown>) ?? {};
      const stored = (settings.integrations as IntegrationSettings) ?? {};
      setIntegrations({
        slack: { ...DEFAULT_SLACK, ...stored.slack },
        zapier: { ...DEFAULT_ZAPIER, ...stored.zapier },
        mailchimp: { ...DEFAULT_MAILCHIMP, ...stored.mailchimp },
        convertkit: { ...DEFAULT_CONVERTKIT, ...stored.convertkit },
      });
    }
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const updateIntegration = async <K extends keyof IntegrationSettings>(
    key: K,
    config: IntegrationSettings[K]
  ): Promise<boolean> => {
    if (!formId) return false;
    setSaving(true);

    // Fetch current settings first to avoid overwriting other keys
    const { data: current } = await supabase
      .from("forms")
      .select("settings")
      .eq("id", formId)
      .single();

    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};
    const currentIntegrations = (currentSettings.integrations as IntegrationSettings) ?? {};

    const updatedIntegrations = {
      ...currentIntegrations,
      [key]: config,
    };

    const { error } = await supabase
      .from("forms")
      .update({
        settings: {
          ...currentSettings,
          integrations: updatedIntegrations,
        },
      })
      .eq("id", formId);

    if (!error) {
      setIntegrations((prev) => ({ ...prev, [key]: config }));
    }

    setSaving(false);
    return !error;
  };

  const toggleIntegration = async (key: keyof IntegrationSettings, enabled: boolean): Promise<boolean> => {
    const current = integrations[key];
    if (!current) return false;
    return updateIntegration(key, { ...current, enabled });
  };

  return {
    integrations,
    loading,
    saving,
    error,
    updateIntegration,
    toggleIntegration,
    refetch: fetchIntegrations,
  };
}

// ─── Slack Dispatch Helper ───────────────────────────────────────────────────

/**
 * Dispatches a Slack notification for a form event.
 * Checks if Slack integration is enabled for the form, then calls the edge function.
 * Fire-and-forget — errors are silently caught.
 */
export async function dispatchSlackNotification(
  formId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Fetch form settings to check if Slack is enabled
    const { data: form } = await supabase
      .from("forms")
      .select("settings, title, workspace_id")
      .eq("id", formId)
      .single();

    if (!form) return;

    const settings = (form.settings as Record<string, unknown>) ?? {};
    const integrations = (settings.integrations as IntegrationSettings) ?? {};
    const slack = integrations.slack;

    if (!slack?.enabled || !slack.webhook_url) return;
    if (slack.events.length > 0 && !slack.events.includes(eventType)) return;

    // Call the Slack edge function
    supabase.functions
      .invoke("slack-notify", {
        body: {
          webhook_url: slack.webhook_url,
          event_type: eventType,
          form_title: form.title,
          data,
        },
      })
      .catch(() => {
        // Silent failure — Slack should never block main flow
      });
  } catch {
    // Fire-and-forget
  }
}

// ─── Mailchimp Sync Helper ──────────────────────────────────────────────────

/**
 * Syncs a contact to Mailchimp when a form submission or waitlist signup occurs.
 * Proxied through mailchimp-sync edge function to avoid browser CORS issues.
 * Fire-and-forget — errors are silently caught.
 */
export async function syncToMailchimp(
  formId: string,
  email: string,
  mergeFields?: Record<string, string>
): Promise<void> {
  try {
    const { data: form } = await supabase
      .from("forms")
      .select("settings")
      .eq("id", formId)
      .single();

    if (!form) return;

    const settings = (form.settings as Record<string, unknown>) ?? {};
    const integrations = (settings.integrations as IntegrationSettings) ?? {};
    const mc = integrations.mailchimp;

    if (!mc?.enabled || !mc.api_key || !mc.list_id) return;

    // Proxy through edge function to avoid CORS
    supabase.functions
      .invoke("mailchimp-sync", {
        body: {
          action: "sync",
          api_key: mc.api_key,
          list_id: mc.list_id,
          email,
          merge_fields: mergeFields,
        },
      })
      .catch(() => {
        // Silent failure — Mailchimp sync should never block main flow
      });
  } catch {
    // Fire-and-forget
  }
}

// ─── Mailchimp List Fetch Helper ────────────────────────────────────────────

/**
 * Fetches Mailchimp audience lists via edge function proxy.
 * Returns array of lists or throws on error.
 */
export async function fetchMailchimpLists(
  apiKey: string
): Promise<Array<{ id: string; name: string; member_count: number }>> {
  const { data, error } = await supabase.functions.invoke("mailchimp-sync", {
    body: {
      action: "fetch_lists",
      api_key: apiKey,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch Mailchimp lists");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Mailchimp API error");
  }

  return data.lists ?? [];
}
