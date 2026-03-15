-- ============================================
-- Migration 031: DELETE RLS Policies
-- Agent 02 — Database Security (RLS & Policies)
--
-- Adds missing DELETE policies for tables that
-- need them for GDPR compliance and correct
-- account deletion behavior.
--
-- Tables covered:
--   profiles, workspaces, notifications,
--   waitlist_entries, feedback_responses, submissions
-- ============================================

BEGIN;

-- ============================================
-- PROFILES: owner can delete own profile
-- ============================================

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- WORKSPACES: owner can delete workspace
-- (CASCADE will remove forms, members, etc.)
-- ============================================

DROP POLICY IF EXISTS "workspaces_delete_owner" ON public.workspaces;
CREATE POLICY "workspaces_delete_owner" ON public.workspaces
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), id) = 'owner'
  );

-- ============================================
-- NOTIFICATIONS: user can delete own notifications
-- ============================================

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- WAITLIST_ENTRIES: workspace member (editor+) can delete
-- Fixes: admin delete operations silently rejected (BUG)
-- ============================================

DROP POLICY IF EXISTS "waitlist_entries_delete_member" ON public.waitlist_entries;
CREATE POLICY "waitlist_entries_delete_member" ON public.waitlist_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id
        AND public.get_workspace_role(auth.uid(), f.workspace_id) IN ('owner', 'editor')
    )
  );

-- ============================================
-- FEEDBACK_RESPONSES: workspace member (editor+) can delete
-- Fixes: GDPR right-to-erasure compliance gap
-- ============================================

DROP POLICY IF EXISTS "feedback_responses_delete_member" ON public.feedback_responses;
CREATE POLICY "feedback_responses_delete_member" ON public.feedback_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id
        AND public.get_workspace_role(auth.uid(), f.workspace_id) IN ('owner', 'editor')
    )
  );

-- ============================================
-- SUBMISSIONS: workspace member (editor+) can delete
-- Fixes: submission delete operations silently rejected
-- ============================================

DROP POLICY IF EXISTS "submissions_delete_member" ON public.submissions;
CREATE POLICY "submissions_delete_member" ON public.submissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id
        AND public.get_workspace_role(auth.uid(), f.workspace_id) IN ('owner', 'editor')
    )
  );

COMMIT;
