-- ============================================
-- Migration 029: Extend ai_cache for reply suggestions
-- ============================================

-- Extend the cache_type CHECK constraint to include 'reply_suggest'
ALTER TABLE public.ai_cache
  DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;

ALTER TABLE public.ai_cache
  ADD CONSTRAINT ai_cache_cache_type_check
  CHECK (cache_type IN ('form_gen', 'analysis', 'summary', 'ticket_classify', 'reply_suggest'));
