-- ============================================
-- Migration 022: Custom Domains Table (Agent 14)
-- Stores custom domain mappings per workspace
-- for white-label public form URLs.
-- ============================================

-- ─── Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT NOT NULL,
  ssl_status TEXT NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────

CREATE INDEX idx_custom_domains_workspace ON public.custom_domains (workspace_id);
CREATE INDEX idx_custom_domains_domain ON public.custom_domains (domain) WHERE verified = true;

-- ─── Auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_custom_domains_updated
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_custom_domains_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Workspace members can read domains
CREATE POLICY "custom_domains_select_member" ON public.custom_domains
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Only workspace owners can manage domains
CREATE POLICY "custom_domains_insert_owner" ON public.custom_domains
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "custom_domains_update_owner" ON public.custom_domains
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "custom_domains_delete_owner" ON public.custom_domains
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );
