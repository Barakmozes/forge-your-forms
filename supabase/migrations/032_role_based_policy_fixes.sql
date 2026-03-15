-- ============================================
-- Migration 032: Role-Based Policy Fixes
-- Agent 02 — Database Security (RLS & Policies)
--
-- Enforces editor+ role requirement for write
-- operations that viewers should not perform.
--
-- Fixes:
-- - forms INSERT: viewers could create forms
-- - canned_responses INSERT/UPDATE/DELETE: viewers could write
-- - tags INSERT/UPDATE/DELETE: viewers could write
-- - webhooks INSERT/UPDATE/DELETE: viewers could write
-- - api_keys INSERT/UPDATE/DELETE: viewers could write (now owner-only)
-- - feedback_responses UPDATE: viewers could flag/modify
-- - workflows INSERT/UPDATE/DELETE: viewers could write
-- ============================================

BEGIN;

-- ============================================
-- FORMS INSERT: restrict to editor+
-- Old policy: is_workspace_member (includes viewers)
-- New policy: get_workspace_role IN ('owner','editor')
-- ============================================

DROP POLICY IF EXISTS "forms_insert_member" ON public.forms;
DROP POLICY IF EXISTS "forms_insert_editor" ON public.forms;
CREATE POLICY "forms_insert_editor" ON public.forms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

-- ============================================
-- CANNED_RESPONSES: restrict write to editor+
-- Old policies: is_workspace_member (includes viewers)
-- ============================================

DROP POLICY IF EXISTS "canned_insert_member" ON public.canned_responses;
DROP POLICY IF EXISTS "canned_insert_editor" ON public.canned_responses;
CREATE POLICY "canned_insert_editor" ON public.canned_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "canned_update_member" ON public.canned_responses;
DROP POLICY IF EXISTS "canned_update_editor" ON public.canned_responses;
CREATE POLICY "canned_update_editor" ON public.canned_responses
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "canned_delete_member" ON public.canned_responses;
DROP POLICY IF EXISTS "canned_delete_editor" ON public.canned_responses;
CREATE POLICY "canned_delete_editor" ON public.canned_responses
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

-- ============================================
-- TAGS: restrict write to editor+
-- Old policies: is_workspace_member (includes viewers)
-- ============================================

DROP POLICY IF EXISTS "tags_insert_member" ON public.tags;
DROP POLICY IF EXISTS "tags_insert_editor" ON public.tags;
CREATE POLICY "tags_insert_editor" ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "tags_update_member" ON public.tags;
DROP POLICY IF EXISTS "tags_update_editor" ON public.tags;
CREATE POLICY "tags_update_editor" ON public.tags
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "tags_delete_member" ON public.tags;
DROP POLICY IF EXISTS "tags_delete_editor" ON public.tags;
CREATE POLICY "tags_delete_editor" ON public.tags
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

-- ============================================
-- WEBHOOKS: restrict write to editor+
-- Old policies: is_workspace_member (includes viewers)
-- ============================================

DROP POLICY IF EXISTS "webhooks_insert_member" ON public.webhooks;
DROP POLICY IF EXISTS "webhooks_insert_editor" ON public.webhooks;
CREATE POLICY "webhooks_insert_editor" ON public.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "webhooks_update_member" ON public.webhooks;
DROP POLICY IF EXISTS "webhooks_update_editor" ON public.webhooks;
CREATE POLICY "webhooks_update_editor" ON public.webhooks
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "webhooks_delete_member" ON public.webhooks;
DROP POLICY IF EXISTS "webhooks_delete_editor" ON public.webhooks;
CREATE POLICY "webhooks_delete_editor" ON public.webhooks
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

-- ============================================
-- API_KEYS: restrict write to owner only
-- API keys are high-privilege; only owners should manage them
-- Old policies: is_workspace_member (allows any authenticated member)
-- ============================================

DROP POLICY IF EXISTS "api_keys_insert_owner" ON public.api_keys;
CREATE POLICY "api_keys_insert_owner" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) = 'owner'
  );

DROP POLICY IF EXISTS "api_keys_update_owner" ON public.api_keys;
CREATE POLICY "api_keys_update_owner" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) = 'owner'
  );

DROP POLICY IF EXISTS "api_keys_delete_owner" ON public.api_keys;
CREATE POLICY "api_keys_delete_owner" ON public.api_keys
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) = 'owner'
  );

-- ============================================
-- FEEDBACK_RESPONSES UPDATE: restrict to editor+
-- Old policy: is_workspace_member (viewers could flag/update)
-- ============================================

DROP POLICY IF EXISTS "feedback_responses_update_member" ON public.feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_update_editor" ON public.feedback_responses;
CREATE POLICY "feedback_responses_update_editor" ON public.feedback_responses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id
        AND public.get_workspace_role(auth.uid(), f.workspace_id) IN ('owner', 'editor')
    )
  );

-- ============================================
-- WORKFLOWS: restrict write to editor+
-- Guard: only run if workflows table exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workflows'
  ) THEN
    DROP POLICY IF EXISTS "workflows_insert_member" ON public.workflows;
    DROP POLICY IF EXISTS "workflows_insert_editor" ON public.workflows;
    EXECUTE 'CREATE POLICY "workflows_insert_editor" ON public.workflows
      FOR INSERT TO authenticated
      WITH CHECK (
        public.get_workspace_role(auth.uid(), workspace_id) IN (''owner'', ''editor'')
      )';

    DROP POLICY IF EXISTS "workflows_update_member" ON public.workflows;
    DROP POLICY IF EXISTS "workflows_update_editor" ON public.workflows;
    EXECUTE 'CREATE POLICY "workflows_update_editor" ON public.workflows
      FOR UPDATE TO authenticated
      USING (
        public.get_workspace_role(auth.uid(), workspace_id) IN (''owner'', ''editor'')
      )';

    DROP POLICY IF EXISTS "workflows_delete_member" ON public.workflows;
    DROP POLICY IF EXISTS "workflows_delete_editor" ON public.workflows;
    EXECUTE 'CREATE POLICY "workflows_delete_editor" ON public.workflows
      FOR DELETE TO authenticated
      USING (
        public.get_workspace_role(auth.uid(), workspace_id) IN (''owner'', ''editor'')
      )';
  END IF;
END $$;

COMMIT;
