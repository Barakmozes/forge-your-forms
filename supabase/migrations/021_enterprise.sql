-- ============================================
-- Migration 021: Enterprise Settings (Agent 14)
-- Stores SSO/SAML config + white-label branding
-- per workspace (Business plan only).
-- ============================================

-- ─── Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- SSO / SAML
  sso_enabled BOOLEAN NOT NULL DEFAULT false,
  sso_provider TEXT CHECK (sso_provider IN ('okta', 'azure_ad', 'onelogin', 'custom_saml')),
  sso_metadata_url TEXT,
  sso_certificate TEXT,
  sso_entity_id TEXT,

  -- White-label branding
  white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_logo_url TEXT,
  custom_favicon_url TEXT,
  custom_app_name TEXT,
  custom_primary_color TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────

CREATE INDEX idx_enterprise_settings_sso ON public.enterprise_settings (sso_enabled)
  WHERE sso_enabled = true;

-- ─── Auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_enterprise_settings_updated
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_enterprise_settings_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- Workspace members can read (needed for white-label rendering)
CREATE POLICY "enterprise_settings_select_member" ON public.enterprise_settings
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Only workspace owners can insert
CREATE POLICY "enterprise_settings_insert_owner" ON public.enterprise_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Only workspace owners can update
CREATE POLICY "enterprise_settings_update_owner" ON public.enterprise_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Only workspace owners can delete
CREATE POLICY "enterprise_settings_delete_owner" ON public.enterprise_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ─── Realtime ───────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.enterprise_settings;
