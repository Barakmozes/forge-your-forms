-- ============================================
-- Migration 027: Storage Bucket Hardening & Cron Job Registration
-- Agent 16 — Supabase Audit (Phase 6)
--
-- 1. Set file_size_limit and allowed_mime_types on branding bucket
-- 2. Register auto-close cron job for resolved tickets (requires pg_cron)
-- 3. Register expired ai_cache cleanup (requires pg_cron)
-- ============================================

-- ============================================
-- 1. Harden branding bucket
-- Before: No file_size_limit, no allowed_mime_types
-- After: 2MB limit, images only
-- ============================================

UPDATE storage.buckets
SET
  file_size_limit = 2097152,  -- 2MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
WHERE id = 'branding';

-- ============================================
-- 2. Auto-close resolved tickets (requires pg_cron extension)
-- Tickets resolved for 7+ days are automatically closed.
-- NOTE: pg_cron must be enabled via Supabase Dashboard first.
--       If pg_cron is not available, this section will be skipped.
-- ============================================

-- Create the function regardless (can be called manually or via cron)
CREATE OR REPLACE FUNCTION public.auto_close_resolved_tickets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  UPDATE public.tickets
  SET status = 'closed', updated_at = now()
  WHERE status = 'resolved'
    AND resolved_at IS NOT NULL
    AND resolved_at < now() - interval '7 days';

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

-- ============================================
-- 3. Clean expired AI cache entries (requires pg_cron extension)
-- Removes entries older than their expires_at timestamp.
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- Cron job registration (run only if pg_cron is available)
-- These SELECT statements will fail gracefully if pg_cron is not enabled.
-- To enable pg_cron: Supabase Dashboard → Database → Extensions → pg_cron
-- Then run these manually:
--
-- SELECT cron.schedule('auto-close-tickets', '0 2 * * *', 'SELECT public.auto_close_resolved_tickets()');
-- SELECT cron.schedule('cleanup-ai-cache', '0 3 * * *', 'SELECT public.cleanup_expired_ai_cache()');
-- ============================================
