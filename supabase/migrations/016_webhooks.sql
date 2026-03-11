-- Migration 016: Webhooks & Webhook Deliveries
-- Agent 9: Webhooks & REST API

-- ============================================
-- WEBHOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_workspace_id ON public.webhooks(workspace_id);

-- ============================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

-- ============================================
-- AUTO-UPDATE updated_at ON webhooks
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_webhook_updated
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_webhook_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Workspace members can SELECT webhooks
CREATE POLICY "webhooks_select_member" ON public.webhooks
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace members can INSERT webhooks
CREATE POLICY "webhooks_insert_member" ON public.webhooks
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace members can UPDATE webhooks
CREATE POLICY "webhooks_update_member" ON public.webhooks
  FOR UPDATE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace members can DELETE webhooks
CREATE POLICY "webhooks_delete_member" ON public.webhooks
  FOR DELETE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace members can SELECT deliveries (via webhook join)
CREATE POLICY "webhook_deliveries_select_member" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = webhook_id
        AND public.is_workspace_member(auth.uid(), w.workspace_id)
    )
  );

-- Service role can INSERT deliveries (dispatch function)
CREATE POLICY "webhook_deliveries_insert_service" ON public.webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- Service role can UPDATE deliveries (retry logic)
CREATE POLICY "webhook_deliveries_update_service" ON public.webhook_deliveries
  FOR UPDATE USING (true);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_deliveries;
