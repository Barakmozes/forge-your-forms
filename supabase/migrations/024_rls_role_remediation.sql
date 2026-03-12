-- ============================================
-- Migration 024: RLS Policy Role Remediation
-- Agent 16 — Supabase Audit (Phase 6)
--
-- CRITICAL FIX: Change workspace-scoped policies
-- from {public} to {authenticated} role.
-- Policies for intentional anon access are left unchanged.
-- ============================================

BEGIN;

-- ============================================
-- PROFILES (3 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- WORKSPACES (3 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), id) OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspaces_insert_owner" ON public.workspaces;
CREATE POLICY "workspaces_insert_owner" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspaces_update_owner" ON public.workspaces;
CREATE POLICY "workspaces_update_owner" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- WORKSPACE_MEMBERS (3 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "members_select_own" ON public.workspace_members;
CREATE POLICY "members_select_own" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "members_insert_owner" ON public.workspace_members;
CREATE POLICY "members_insert_owner" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete_owner" ON public.workspace_members;
CREATE POLICY "members_delete_owner" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- ============================================
-- FORMS (4 policies → authenticated; 1 stays public)
-- ============================================

DROP POLICY IF EXISTS "forms_select_member" ON public.forms;
CREATE POLICY "forms_select_member" ON public.forms
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "forms_insert_member" ON public.forms;
CREATE POLICY "forms_insert_member" ON public.forms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "forms_update_editor" ON public.forms;
CREATE POLICY "forms_update_editor" ON public.forms
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "forms_delete_owner" ON public.forms;
CREATE POLICY "forms_delete_owner" ON public.forms
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) = 'owner'
  );

-- forms_select_active_public stays as {public} — intentional anon access

-- ============================================
-- SUBMISSIONS (1 policy → authenticated; 1 stays public)
-- ============================================

DROP POLICY IF EXISTS "submissions_select_member" ON public.submissions;
CREATE POLICY "submissions_select_member" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- submissions_insert_public stays as {public} — intentional anon access

-- ============================================
-- NOTIFICATIONS (2 policies → authenticated; 1 stays public for triggers)
-- ============================================

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- notifications_insert_system stays as {public} — used by SECURITY DEFINER triggers
-- (will be hardened in migration 025 to validate user_id)

-- ============================================
-- WAITLIST_ENTRIES (2 policies → authenticated; 2 stay public)
-- ============================================

DROP POLICY IF EXISTS "waitlist_entries_select_member" ON public.waitlist_entries;
CREATE POLICY "waitlist_entries_select_member" ON public.waitlist_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "waitlist_entries_update_member" ON public.waitlist_entries;
CREATE POLICY "waitlist_entries_update_member" ON public.waitlist_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- waitlist_entries_insert_public stays as {public} — intentional anon access
-- waitlist_entries_select_own stays as {public} — will be fixed in migration 025

-- ============================================
-- WAITLIST_INVITES (2 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "waitlist_invites_select_member" ON public.waitlist_invites;
CREATE POLICY "waitlist_invites_select_member" ON public.waitlist_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "waitlist_invites_insert_member" ON public.waitlist_invites;
CREATE POLICY "waitlist_invites_insert_member" ON public.waitlist_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- ============================================
-- FEEDBACK_RESPONSES (2 policies → authenticated; 1 stays public)
-- ============================================

DROP POLICY IF EXISTS "feedback_responses_select_member" ON public.feedback_responses;
CREATE POLICY "feedback_responses_select_member" ON public.feedback_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "feedback_responses_update_member" ON public.feedback_responses;
CREATE POLICY "feedback_responses_update_member" ON public.feedback_responses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- feedback_responses_insert_public stays as {public} — intentional anon access

-- ============================================
-- FEEDBACK_ALERTS (2 policies → authenticated; 1 stays public for triggers)
-- ============================================

DROP POLICY IF EXISTS "feedback_alerts_select_member" ON public.feedback_alerts;
CREATE POLICY "feedback_alerts_select_member" ON public.feedback_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "feedback_alerts_update_member" ON public.feedback_alerts;
CREATE POLICY "feedback_alerts_update_member" ON public.feedback_alerts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- feedback_alerts_insert_system stays as {public} — used by SECURITY DEFINER triggers
-- (will be hardened in migration 025 to validate form_id)

-- ============================================
-- TICKETS (2 policies → authenticated; 2 stay public)
-- ============================================

DROP POLICY IF EXISTS "tickets_select_member" ON public.tickets;
CREATE POLICY "tickets_select_member" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "tickets_update_member" ON public.tickets;
CREATE POLICY "tickets_update_member" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- tickets_select_customer stays as {public} — will be fixed in migration 025
-- tickets_insert_public stays as {public} — intentional anon access

-- ============================================
-- TICKET_MESSAGES (1 policy → authenticated; 2 stay public)
-- ============================================

DROP POLICY IF EXISTS "messages_select_member" ON public.ticket_messages;
CREATE POLICY "messages_select_member" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- messages_select_customer stays as {public} — intentional anon access
-- messages_insert_public stays as {public} — will be hardened in migration 025

-- ============================================
-- CANNED_RESPONSES (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "canned_select_member" ON public.canned_responses;
CREATE POLICY "canned_select_member" ON public.canned_responses
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "canned_insert_member" ON public.canned_responses;
CREATE POLICY "canned_insert_member" ON public.canned_responses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "canned_update_member" ON public.canned_responses;
CREATE POLICY "canned_update_member" ON public.canned_responses
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "canned_delete_member" ON public.canned_responses;
CREATE POLICY "canned_delete_member" ON public.canned_responses
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- TAGS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "tags_select_member" ON public.tags;
CREATE POLICY "tags_select_member" ON public.tags
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "tags_insert_member" ON public.tags;
CREATE POLICY "tags_insert_member" ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "tags_update_member" ON public.tags;
CREATE POLICY "tags_update_member" ON public.tags
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "tags_delete_member" ON public.tags;
CREATE POLICY "tags_delete_member" ON public.tags
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- TICKET_TAGS (3 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "ticket_tags_select_member" ON public.ticket_tags;
CREATE POLICY "ticket_tags_select_member" ON public.ticket_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "ticket_tags_insert_member" ON public.ticket_tags;
CREATE POLICY "ticket_tags_insert_member" ON public.ticket_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "ticket_tags_delete_member" ON public.ticket_tags;
CREATE POLICY "ticket_tags_delete_member" ON public.ticket_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- ============================================
-- SUBSCRIPTIONS (3 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "subscriptions_select_member" ON public.subscriptions;
CREATE POLICY "subscriptions_select_member" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "subscriptions_insert_member" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_member" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "subscriptions_update_member" ON public.subscriptions;
CREATE POLICY "subscriptions_update_member" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- USAGE (1 policy → authenticated)
-- ============================================

DROP POLICY IF EXISTS "Members can view workspace usage" ON public.usage;
CREATE POLICY "usage_select_member" ON public.usage
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- ACTIVATION_EVENTS (2 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "activation_events_select_own" ON public.activation_events;
CREATE POLICY "activation_events_select_own" ON public.activation_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "activation_events_insert_own" ON public.activation_events;
CREATE POLICY "activation_events_insert_own" ON public.activation_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- WEBHOOKS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "webhooks_select_member" ON public.webhooks;
CREATE POLICY "webhooks_select_member" ON public.webhooks
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "webhooks_insert_member" ON public.webhooks;
CREATE POLICY "webhooks_insert_member" ON public.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "webhooks_update_member" ON public.webhooks;
CREATE POLICY "webhooks_update_member" ON public.webhooks
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "webhooks_delete_member" ON public.webhooks;
CREATE POLICY "webhooks_delete_member" ON public.webhooks
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- WEBHOOK_DELIVERIES (1 policy → authenticated; 2 stay public for service role)
-- ============================================

DROP POLICY IF EXISTS "webhook_deliveries_select_member" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_select_member" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.webhooks w
      WHERE w.id = webhook_id
        AND public.is_workspace_member(auth.uid(), w.workspace_id)
    )
  );

-- webhook_deliveries_insert_service and _update_service stay — will be fixed in 025

-- ============================================
-- API_KEYS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "api_keys_select_member" ON public.api_keys;
CREATE POLICY "api_keys_select_member" ON public.api_keys
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "api_keys_insert_owner" ON public.api_keys;
CREATE POLICY "api_keys_insert_owner" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "api_keys_update_owner" ON public.api_keys;
CREATE POLICY "api_keys_update_owner" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "api_keys_delete_owner" ON public.api_keys;
CREATE POLICY "api_keys_delete_owner" ON public.api_keys
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- AI_CACHE (1 policy → authenticated)
-- ============================================

DROP POLICY IF EXISTS "ai_cache_select_member" ON public.ai_cache;
CREATE POLICY "ai_cache_select_member" ON public.ai_cache
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- CHURN_SCORES (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "churn_scores_select_member" ON public.churn_scores;
CREATE POLICY "churn_scores_select_member" ON public.churn_scores
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "churn_scores_insert_member" ON public.churn_scores;
CREATE POLICY "churn_scores_insert_member" ON public.churn_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "churn_scores_update_member" ON public.churn_scores;
CREATE POLICY "churn_scores_update_member" ON public.churn_scores
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "churn_scores_delete_member" ON public.churn_scores;
CREATE POLICY "churn_scores_delete_member" ON public.churn_scores
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- ENTERPRISE_SETTINGS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "enterprise_settings_select_member" ON public.enterprise_settings;
CREATE POLICY "enterprise_settings_select_member" ON public.enterprise_settings
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "enterprise_settings_insert_owner" ON public.enterprise_settings;
CREATE POLICY "enterprise_settings_insert_owner" ON public.enterprise_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "enterprise_settings_update_owner" ON public.enterprise_settings;
CREATE POLICY "enterprise_settings_update_owner" ON public.enterprise_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "enterprise_settings_delete_owner" ON public.enterprise_settings;
CREATE POLICY "enterprise_settings_delete_owner" ON public.enterprise_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ============================================
-- CUSTOM_DOMAINS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "custom_domains_select_member" ON public.custom_domains;
CREATE POLICY "custom_domains_select_member" ON public.custom_domains
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "custom_domains_insert_owner" ON public.custom_domains;
CREATE POLICY "custom_domains_insert_owner" ON public.custom_domains
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "custom_domains_update_owner" ON public.custom_domains;
CREATE POLICY "custom_domains_update_owner" ON public.custom_domains
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "custom_domains_delete_owner" ON public.custom_domains;
CREATE POLICY "custom_domains_delete_owner" ON public.custom_domains
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ============================================
-- WORKFLOWS (4 policies → authenticated)
-- ============================================

DROP POLICY IF EXISTS "workflows_select_member" ON public.workflows;
CREATE POLICY "workflows_select_member" ON public.workflows
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "workflows_insert_member" ON public.workflows;
CREATE POLICY "workflows_insert_member" ON public.workflows
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "workflows_update_member" ON public.workflows;
CREATE POLICY "workflows_update_member" ON public.workflows
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "workflows_delete_member" ON public.workflows;
CREATE POLICY "workflows_delete_member" ON public.workflows
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- WORKFLOW_RUNS (1 policy → authenticated; 1 stays public for service role)
-- ============================================

DROP POLICY IF EXISTS "workflow_runs_select_member" ON public.workflow_runs;
CREATE POLICY "workflow_runs_select_member" ON public.workflow_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_id
      AND public.is_workspace_member(auth.uid(), w.workspace_id)
    )
  );

-- workflow_runs_insert_service stays — will be fixed in 025

COMMIT;
