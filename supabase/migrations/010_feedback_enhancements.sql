-- 010_feedback_enhancements.sql
-- Add performance indexes on feedback_responses for dashboard queries

-- Index for date-range filtered queries (form_id + created_at)
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_created
  ON public.feedback_responses (form_id, created_at DESC);

-- Index for sentiment-filtered queries (form_id + sentiment)
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_sentiment
  ON public.feedback_responses (form_id, sentiment);
