-- ============================================
-- Migration 020: Churn Prediction & AI Classification (Agent 13)
-- Adds churn_scores table for customer risk tracking
-- and ai_classification JSONB column to tickets table.
-- ============================================

-- ─── Churn Scores Table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.churn_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_factors JSONB NOT NULL DEFAULT '{}',
  nps_average NUMERIC(4,2),
  ticket_count_30d INTEGER NOT NULL DEFAULT 0,
  sentiment_trend TEXT CHECK (sentiment_trend IN ('positive', 'neutral', 'negative')),
  last_interaction_at TIMESTAMPTZ,
  last_scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, customer_email)
);

-- ─── Indexes ──────────────────────────────────────────────────────

CREATE INDEX idx_churn_scores_workspace_risk ON public.churn_scores (workspace_id, risk_score DESC);
CREATE INDEX idx_churn_scores_email ON public.churn_scores (customer_email);

-- ─── RLS ──────────────────────────────────────────────────────────

ALTER TABLE public.churn_scores ENABLE ROW LEVEL SECURITY;

-- Workspace members can view churn scores
CREATE POLICY "churn_scores_select_member" ON public.churn_scores
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Authenticated workspace members can insert/update scores
CREATE POLICY "churn_scores_insert_member" ON public.churn_scores
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "churn_scores_update_member" ON public.churn_scores
  FOR UPDATE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "churn_scores_delete_member" ON public.churn_scores
  FOR DELETE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- ─── Auto-update updated_at ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_churn_score_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_churn_score_updated
  BEFORE UPDATE ON public.churn_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_churn_score_updated_at();

-- ─── AI Classification on Tickets ─────────────────────────────────

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ai_classification JSONB DEFAULT NULL;

-- ─── Extend ai_cache CHECK constraint for ticket_classify ─────────

ALTER TABLE public.ai_cache
  DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;

ALTER TABLE public.ai_cache
  ADD CONSTRAINT ai_cache_cache_type_check
  CHECK (cache_type IN ('form_gen', 'analysis', 'summary', 'ticket_classify'));
