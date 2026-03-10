-- ============================================
-- Migration 005: Feedback/NPS Tables
-- ============================================

CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  respondent_email TEXT,
  respondent_name TEXT,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  category TEXT,
  sentiment public.feedback_sentiment,
  follow_up TEXT,
  custom_answers JSONB DEFAULT '{}'::jsonb,
  flagged BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.feedback_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.feedback_responses(id) ON DELETE CASCADE,
  alert_type public.feedback_alert_type NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_feedback_responses_form ON public.feedback_responses(form_id);
CREATE INDEX idx_feedback_responses_sentiment ON public.feedback_responses(form_id, sentiment);
CREATE INDEX idx_feedback_responses_nps ON public.feedback_responses(form_id, nps_score);
CREATE INDEX idx_feedback_alerts_form ON public.feedback_alerts(form_id);
CREATE INDEX idx_feedback_alerts_read ON public.feedback_alerts(form_id, read);

-- RLS
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_alerts ENABLE ROW LEVEL SECURITY;

-- Workspace members can read feedback responses
CREATE POLICY "feedback_responses_select_member" ON public.feedback_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Anon can insert feedback for active feedback forms
CREATE POLICY "feedback_responses_insert_public" ON public.feedback_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active' AND f.mode = 'feedback'
    )
  );

-- Workspace members can update (flag/unflag)
CREATE POLICY "feedback_responses_update_member" ON public.feedback_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Alerts: workspace members only
CREATE POLICY "feedback_alerts_select_member" ON public.feedback_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

CREATE POLICY "feedback_alerts_insert_system" ON public.feedback_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "feedback_alerts_update_member" ON public.feedback_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Auto-detect sentiment and create detractor alert
CREATE OR REPLACE FUNCTION public.handle_feedback_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_owner_id UUID;
  form_settings JSONB;
BEGIN
  -- Auto-set sentiment based on NPS score
  IF NEW.nps_score IS NOT NULL THEN
    IF NEW.nps_score >= 9 THEN
      NEW.sentiment := 'promoter';
    ELSIF NEW.nps_score >= 7 THEN
      NEW.sentiment := 'passive';
    ELSE
      NEW.sentiment := 'detractor';
    END IF;
  END IF;

  -- Create alert for detractors
  IF NEW.sentiment = 'detractor' THEN
    -- Get form settings to check alertOnDetractor
    SELECT f.settings INTO form_settings FROM public.forms f WHERE f.id = NEW.form_id;

    -- Only alert if setting is enabled (default true)
    IF form_settings IS NULL OR (form_settings->>'alertOnDetractor') IS NULL OR (form_settings->>'alertOnDetractor')::boolean = true THEN
      INSERT INTO public.feedback_alerts (form_id, response_id, alert_type, message)
      VALUES (NEW.form_id, NEW.id, 'detractor',
        'Detractor alert: ' || COALESCE(NEW.respondent_email, 'Anonymous') || ' gave a score of ' || NEW.nps_score);

      -- Also create a notification for workspace owner
      SELECT w.owner_id INTO workspace_owner_id
      FROM public.forms f
      JOIN public.workspaces w ON w.id = f.workspace_id
      WHERE f.id = NEW.form_id;

      IF workspace_owner_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (workspace_owner_id, 'detractor_alert', 'Detractor Alert',
          COALESCE(NEW.respondent_email, 'Anonymous') || ' gave NPS score ' || NEW.nps_score,
          '/forms/' || NEW.form_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_feedback_response_created
  BEFORE INSERT ON public.feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_feedback_response();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_responses;
