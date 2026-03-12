-- ============================================
-- Migration 026: Index Cleanup & Missing Composites
-- Agent 16 — Supabase Audit (Phase 6)
--
-- 1. Remove duplicate indexes
-- 2. Add missing composite indexes for common query patterns
-- ============================================

BEGIN;

-- ============================================
-- DROP DUPLICATE INDEXES
-- ============================================

-- 1. idx_feedback_responses_sentiment (005) is identical to
--    idx_feedback_responses_form_sentiment (010) — both on (form_id, sentiment)
DROP INDEX IF EXISTS idx_feedback_responses_sentiment;

-- 2. idx_tickets_assigned (006) on (assigned_to) is superseded by
--    idx_tickets_assigned_to (011) which is a partial index WHERE assigned_to IS NOT NULL
--    The partial index is more efficient for non-null lookups
DROP INDEX IF EXISTS idx_tickets_assigned;

-- 3. idx_api_keys_key_hash (017) is redundant — key_hash has a UNIQUE constraint
--    which automatically creates an index
DROP INDEX IF EXISTS idx_api_keys_key_hash;

-- 4. idx_subscriptions_stripe_sub (013) is redundant — stripe_subscription_id has
--    a UNIQUE constraint which automatically creates an index
DROP INDEX IF EXISTS idx_subscriptions_stripe_sub;

-- 5. idx_templates_slug (018) is redundant — slug has a UNIQUE constraint
--    which automatically creates an index
DROP INDEX IF EXISTS idx_templates_slug;

-- ============================================
-- ADD MISSING COMPOSITE INDEXES
-- ============================================

-- Tickets: agent dashboard commonly filters by (form_id, status, priority)
CREATE INDEX IF NOT EXISTS idx_tickets_form_status_priority
  ON public.tickets (form_id, status, priority);

-- Submissions: pagination/sorting by (form_id, submitted_at DESC)
CREATE INDEX IF NOT EXISTS idx_submissions_form_submitted
  ON public.submissions (form_id, submitted_at DESC);

-- Waitlist entries: admin dashboard sorts by (form_id, position)
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_form_position
  ON public.waitlist_entries (form_id, position);

-- Notifications: unread notifications query (user_id, read, created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- Tickets: SLA tracking — unresponded tickets
CREATE INDEX IF NOT EXISTS idx_tickets_first_response
  ON public.tickets (form_id, created_at)
  WHERE first_response_at IS NULL AND status NOT IN ('closed', 'resolved');

-- Webhook deliveries: retry queue
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON public.webhook_deliveries (next_retry_at)
  WHERE success = false AND attempts < max_attempts;

COMMIT;
