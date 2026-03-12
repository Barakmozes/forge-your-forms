-- ============================================
-- Migration 025: Overly Permissive Policy Fixes & Function Hardening
-- Agent 16 — Supabase Audit (Phase 6)
--
-- Fixes:
-- 1. DROP webhook_deliveries_update_service (qual='true')
-- 2. DROP webhook_deliveries_insert_service (with_check='true')
--    (Service role bypasses RLS; no client policy needed)
-- 3. DROP workflow_runs_insert_service (with_check='true')
--    (Service role bypasses RLS; no client policy needed)
-- 4. Restrict notifications_insert_system: validate user_id
-- 5. Restrict feedback_alerts_insert_system: validate form_id
-- 6. Restrict messages_insert_public: validate ticket exists, form active
-- 7. DROP waitlist_entries_select_own (USING=true, exposes all entries)
-- 8. Replace tickets_select_customer (USING=true) with scoped policy
-- 9. DROP profiles_select_by_email_authenticated (overly broad, if exists)
-- 10. Harden 5 functions: add SECURITY DEFINER SET search_path = public
-- ============================================

BEGIN;

-- ============================================
-- 1. DROP webhook_deliveries_update_service
-- Reason: USING(true) allows ANYONE to update delivery records.
-- Service role bypasses RLS entirely, so this policy is unnecessary.
-- ============================================

DROP POLICY IF EXISTS "webhook_deliveries_update_service" ON public.webhook_deliveries;

-- ============================================
-- 2. DROP webhook_deliveries_insert_service
-- Reason: WITH CHECK(true) allows ANYONE to insert delivery records.
-- Service role bypasses RLS entirely, so this policy is unnecessary.
-- ============================================

DROP POLICY IF EXISTS "webhook_deliveries_insert_service" ON public.webhook_deliveries;

-- ============================================
-- 3. DROP workflow_runs_insert_service
-- Reason: WITH CHECK(true) allows ANYONE to insert workflow runs.
-- Service role bypasses RLS entirely, so this policy is unnecessary.
-- ============================================

DROP POLICY IF EXISTS "workflow_runs_insert_service" ON public.workflow_runs;

-- ============================================
-- 4. Restrict notifications_insert_system
-- Before: WITH CHECK(true) — anyone can insert notifications for any user
-- After: Validate that user_id references an actual auth user
-- Note: Kept as {public} because SECURITY DEFINER triggers need it
-- ============================================

DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
  );

-- ============================================
-- 5. Restrict feedback_alerts_insert_system
-- Before: WITH CHECK(true) — anyone can insert alerts
-- After: Validate form_id and response_id exist
-- Note: Kept as {public} because SECURITY DEFINER triggers need it
-- ============================================

DROP POLICY IF EXISTS "feedback_alerts_insert_system" ON public.feedback_alerts;
CREATE POLICY "feedback_alerts_insert_system" ON public.feedback_alerts
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.forms WHERE id = form_id)
    AND EXISTS (SELECT 1 FROM public.feedback_responses WHERE id = response_id)
  );

-- ============================================
-- 6. Restrict messages_insert_public
-- Before: WITH CHECK(true) — anyone can insert messages to any ticket
-- After: Validate ticket exists, form is active and in support mode,
--        and ticket is not closed
-- ============================================

DROP POLICY IF EXISTS "messages_insert_public" ON public.ticket_messages;
CREATE POLICY "messages_insert_public" ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id
        AND f.status = 'active'
        AND f.mode = 'support'
        AND t.status != 'closed'
    )
  );

-- ============================================
-- 7. DROP waitlist_entries_select_own
-- Reason: USING(true) exposes ALL waitlist entries to ANYONE.
-- The public waitlist page only INSERTs; it doesn't need to read entries.
-- Admin dashboard reads via waitlist_entries_select_member (authenticated).
-- ============================================

DROP POLICY IF EXISTS "waitlist_entries_select_own" ON public.waitlist_entries;

-- ============================================
-- 8. Replace tickets_select_customer
-- Before: USING(true) — exposes ALL tickets to ANYONE
-- After: Only tickets for active support forms are readable by anon.
-- The TicketTrackingPage also filters by ticket_number + email client-side.
-- ============================================

DROP POLICY IF EXISTS "tickets_select_customer" ON public.tickets;
CREATE POLICY "tickets_select_customer" ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id
        AND f.status = 'active'
        AND f.mode = 'support'
    )
  );

-- ============================================
-- 9. DROP profiles_select_by_email_authenticated
-- Reason: If it exists (may have been added via Dashboard),
-- it allows any authenticated user to read ALL profiles.
-- The profiles_select_own policy is sufficient.
-- ============================================

DROP POLICY IF EXISTS "profiles_select_by_email_authenticated" ON public.profiles;

-- Also add a scoped policy for workspace members to read
-- other members' profiles (needed for assignment dropdowns, etc.)
CREATE POLICY "profiles_select_workspace_member" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = id
    )
  );

-- ============================================
-- 10. Harden functions — add SECURITY DEFINER + search_path
-- These are all simple updated_at triggers but should be consistent.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_webhook_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_churn_score_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_enterprise_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_custom_domains_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_workflow_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Also harden the two usage functions that were missing search_path
CREATE OR REPLACE FUNCTION public.increment_usage_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
  current_month TEXT;
BEGIN
  SELECT workspace_id INTO ws_id FROM public.forms WHERE id = NEW.form_id;
  IF ws_id IS NULL THEN
    RETURN NEW;
  END IF;

  current_month := to_char(now(), 'YYYY-MM');

  INSERT INTO public.usage (workspace_id, month, submission_count)
  VALUES (ws_id, current_month, 1)
  ON CONFLICT (workspace_id, month)
  DO UPDATE SET
    submission_count = public.usage.submission_count + 1,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_usage(ws_id UUID)
RETURNS TABLE(submission_count INTEGER, form_count INTEGER, member_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(u.submission_count, 0),
    (SELECT COUNT(*)::INTEGER FROM public.forms WHERE workspace_id = ws_id AND status != 'closed'),
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members WHERE workspace_id = ws_id)
  FROM (SELECT 1) AS dummy
  LEFT JOIN public.usage u
    ON u.workspace_id = ws_id
    AND u.month = to_char(now(), 'YYYY-MM');
$$;

COMMIT;
