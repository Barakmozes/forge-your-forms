-- Migration 017: API Keys
-- Agent 9: Webhooks & REST API

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_workspace_id ON public.api_keys(workspace_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Workspace members can SELECT api keys
CREATE POLICY "api_keys_select_member" ON public.api_keys
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace owners can INSERT api keys
CREATE POLICY "api_keys_insert_owner" ON public.api_keys
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace owners can UPDATE api keys (revoke)
CREATE POLICY "api_keys_update_owner" ON public.api_keys
  FOR UPDATE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workspace owners can DELETE api keys
CREATE POLICY "api_keys_delete_owner" ON public.api_keys
  FOR DELETE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
