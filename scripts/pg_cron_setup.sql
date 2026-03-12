-- ============================================================
-- FormForge — pg_cron Scheduled Jobs Setup
-- ============================================================
--
-- PREREQUISITES:
--   1. Go to Supabase Dashboard → Database → Extensions
--   2. Search for "pg_cron" and enable it
--   3. Then run this SQL in the SQL Editor
--
-- These jobs call functions created in migration 027.
-- ============================================================

-- Job 1: Auto-close resolved tickets older than 7 days (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'auto-close-tickets',
  '0 2 * * *',
  'SELECT public.auto_close_resolved_tickets()'
);

-- Job 2: Clean expired AI generation cache (runs daily at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-ai-cache',
  '0 3 * * *',
  'SELECT public.cleanup_expired_ai_cache()'
);

-- ============================================================
-- Verify jobs were created:
-- SELECT * FROM cron.job;
--
-- To remove a job:
-- SELECT cron.unschedule('auto-close-tickets');
-- SELECT cron.unschedule('cleanup-ai-cache');
-- ============================================================
