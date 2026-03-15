-- ============================================
-- Migration 036: Add feedback_alerts to realtime publication
-- ============================================
-- Required for the feedback alerts realtime subscription added in useFeedback.ts.
-- Without this, INSERT/UPDATE events on feedback_alerts are not broadcast to subscribers.
-- Resolves P1 #29: Feedback alerts have no realtime subscription.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'feedback_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_alerts;
  END IF;
END $$;
