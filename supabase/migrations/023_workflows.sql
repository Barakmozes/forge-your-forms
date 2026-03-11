-- ============================================
-- Migration 023: Workflows & Workflow Runs
-- Agent 15: Visual Workflow Builder
-- ============================================

-- === Workflows table ===
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON public.workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON public.workflows(active) WHERE active = true;

-- === Workflow Runs table ===
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event JSONB,
  steps_executed JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started ON public.workflow_runs(started_at DESC);

-- === Auto-update updated_at trigger ===
CREATE OR REPLACE FUNCTION public.handle_workflow_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_workflow_updated
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workflow_updated();

-- === RLS ===
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Workflows: workspace members can CRUD
CREATE POLICY "workflows_select_member" ON public.workflows
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "workflows_insert_member" ON public.workflows
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "workflows_update_member" ON public.workflows
  FOR UPDATE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "workflows_delete_member" ON public.workflows
  FOR DELETE USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Workflow Runs: workspace members can read (via workflow → workspace)
CREATE POLICY "workflow_runs_select_member" ON public.workflow_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_id
      AND public.is_workspace_member(auth.uid(), w.workspace_id)
    )
  );

-- Workflow Runs: insert allowed for workflow members (for edge function via service role)
CREATE POLICY "workflow_runs_insert_service" ON public.workflow_runs
  FOR INSERT WITH CHECK (true);

-- === Realtime ===
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_runs;
