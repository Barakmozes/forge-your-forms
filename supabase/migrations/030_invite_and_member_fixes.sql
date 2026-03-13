-- ============================================
-- Migration 030: Invite & Member Fixes
-- ============================================
-- a) SECURITY DEFINER function to look up a profile by email for invitation
-- b) SECURITY DEFINER function to look up profiles by IDs for member listing
-- c) UPDATE policy on workspace_members for workspace owners

-- a) lookup_profile_for_invite: returns {id, email} for a given email
--    Bypasses profiles RLS so workspace owners can find users to invite.
--    Only workspace owners may call this function.
CREATE OR REPLACE FUNCTION public.lookup_profile_for_invite(email_input TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only workspace owners can look up users for invitation
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only workspace owners can look up users';
  END IF;

  RETURN QUERY
    SELECT p.id, p.email
    FROM public.profiles p
    WHERE p.email = lower(email_input)
    LIMIT 1;
END;
$$;

-- b) lookup_profiles_by_ids: returns profile data for a list of user IDs
--    Bypasses profiles RLS so workspace members list can load all member details.
--    Only returns profiles of users who share a workspace with the caller.
CREATE OR REPLACE FUNCTION public.lookup_profiles_by_ids(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT p.id, p.email, p.full_name, p.avatar_url
    FROM public.profiles p
    JOIN public.workspace_members wm ON wm.user_id = p.id
    WHERE p.id = ANY(user_ids)
      AND wm.workspace_id IN (
        SELECT wm2.workspace_id FROM public.workspace_members wm2 WHERE wm2.user_id = auth.uid()
      );
END;
$$;

-- c) Allow workspace owners to update member roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_members'
      AND policyname = 'members_update_owner'
  ) THEN
    CREATE POLICY "members_update_owner" ON public.workspace_members
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspaces
          WHERE id = workspace_members.workspace_id
            AND owner_id = auth.uid()
        )
      );
  END IF;
END $$;
