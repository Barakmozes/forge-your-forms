-- ============================================
-- Migration 003: RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_invites ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces: members can see their workspaces
CREATE POLICY "workspaces_select_member" ON public.workspaces
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), id) OR owner_id = auth.uid()
  );
CREATE POLICY "workspaces_insert_owner" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_update_owner" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Workspace Members: users see their own memberships
CREATE POLICY "members_select_own" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id)
  );
CREATE POLICY "members_insert_owner" ON public.workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );
CREATE POLICY "members_delete_owner" ON public.workspace_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Forms: workspace members read; editors/owners write
CREATE POLICY "forms_select_member" ON public.forms
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
CREATE POLICY "forms_insert_member" ON public.forms
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
CREATE POLICY "forms_update_editor" ON public.forms
  FOR UPDATE USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')
  );
CREATE POLICY "forms_delete_owner" ON public.forms
  FOR DELETE USING (
    public.get_workspace_role(auth.uid(), workspace_id) = 'owner'
  );

-- Forms: anon can SELECT active forms (for public form pages)
CREATE POLICY "forms_select_active_public" ON public.forms
  FOR SELECT USING (status = 'active');

-- Submissions: workspace members read; anon insert on active forms
CREATE POLICY "submissions_select_member" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
CREATE POLICY "submissions_insert_public" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active'
    )
  );

-- Notifications: users read/update own
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Waitlist Entries: workspace members read; anon insert on active waitlist forms
CREATE POLICY "waitlist_entries_select_member" ON public.waitlist_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
CREATE POLICY "waitlist_entries_insert_public" ON public.waitlist_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active' AND f.mode = 'waitlist'
    )
  );
CREATE POLICY "waitlist_entries_update_member" ON public.waitlist_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Waitlist Entries: anon can select own entry by email (for confirmation page)
CREATE POLICY "waitlist_entries_select_own" ON public.waitlist_entries
  FOR SELECT USING (true);

-- Waitlist Invites: workspace members read
CREATE POLICY "waitlist_invites_select_member" ON public.waitlist_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
CREATE POLICY "waitlist_invites_insert_member" ON public.waitlist_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
