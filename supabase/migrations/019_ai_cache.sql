-- ============================================
-- Migration 019: AI Cache Table (Agent 12)
-- Stores cached AI generation and analysis results
-- to reduce API costs and enforce rate limits.
-- ============================================

-- ─── Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('form_gen', 'analysis', 'summary')),
  input_hash TEXT NOT NULL,
  output JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- ─── Indexes ────────────────────────────────────────────────────────

CREATE INDEX idx_ai_cache_lookup ON public.ai_cache (input_hash, cache_type);
CREATE INDEX idx_ai_cache_rate_limit ON public.ai_cache (workspace_id, cache_type, created_at);
CREATE INDEX idx_ai_cache_expiry ON public.ai_cache (expires_at);

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- Workspace members can read cached results
CREATE POLICY "ai_cache_select_member" ON public.ai_cache
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Only service role inserts (Edge Functions use service role key)
-- No INSERT policy for anon/authenticated — Edge Functions bypass RLS
