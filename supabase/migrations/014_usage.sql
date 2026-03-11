-- ============================================
-- Migration 014: Usage tracking table & triggers (Agent 7)
-- ============================================

-- Monthly usage tracking per workspace
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month TEXT NOT NULL,            -- Format: 'YYYY-MM'
  submission_count INTEGER NOT NULL DEFAULT 0,
  form_count INTEGER NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, month)
);

-- Index for fast lookups
CREATE INDEX idx_usage_workspace_month ON public.usage(workspace_id, month);

-- RLS
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace usage"
  ON public.usage FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Trigger function: increment submission_count on new submission
CREATE OR REPLACE FUNCTION public.increment_usage_submission()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_submission_increment_usage
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.increment_usage_submission();

-- Helper RPC: get current month usage for a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_usage(ws_id UUID)
RETURNS TABLE(submission_count INTEGER, form_count INTEGER, member_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(u.submission_count, 0),
    (SELECT COUNT(*)::INTEGER FROM public.forms WHERE workspace_id = ws_id AND status != 'closed'),
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members WHERE workspace_id = ws_id)
  FROM (SELECT 1) AS dummy
  LEFT JOIN public.usage u
    ON u.workspace_id = ws_id
    AND u.month = to_char(now(), 'YYYY-MM');
$$;

-- Enable realtime for usage table
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage;
