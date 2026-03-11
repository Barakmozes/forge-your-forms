-- ============================================
-- Migration 013: Subscriptions table (Agent 6)
-- ============================================

-- Subscriptions table — one per workspace
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'growth', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace subscription
CREATE POLICY "subscriptions_select_member"
  ON public.subscriptions FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Workspace owners can insert (initial creation via checkout)
CREATE POLICY "subscriptions_insert_member"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Only service role (webhooks) or workspace members can update
CREATE POLICY "subscriptions_update_member"
  ON public.subscriptions FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Auto-update updated_at on subscription changes
CREATE OR REPLACE FUNCTION public.handle_subscription_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_updated();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
