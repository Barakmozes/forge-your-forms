-- 012_notification_triggers.sql
-- Triggers for automatic notifications across all modes.

-- ────────────────────────────────────────────────────────────
-- 1. New Submission → Notification to workspace owner
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_form RECORD;
  v_workspace RECORD;
BEGIN
  SELECT id, title, workspace_id INTO v_form
    FROM public.forms WHERE id = NEW.form_id;

  IF v_form IS NULL THEN RETURN NEW; END IF;

  SELECT owner_id INTO v_workspace
    FROM public.workspaces WHERE id = v_form.workspace_id;

  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_workspace.owner_id,
    'submission',
    'New submission received',
    'New response on "' || v_form.title || '"',
    '/forms/' || v_form.id || '/submissions'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_submission_notify ON public.submissions;
CREATE TRIGGER on_submission_notify
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_submission();

-- ────────────────────────────────────────────────────────────
-- 2. Ticket Assigned → Notification to assigned agent
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ticket_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_form RECORD;
BEGIN
  -- Only fire when assigned_to changes from null/different to a new value
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN RETURN NEW; END IF;

  SELECT id, title INTO v_form
    FROM public.forms WHERE id = NEW.form_id;

  IF v_form IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.assigned_to,
    'ticket_assigned',
    'Ticket assigned to you',
    '"' || NEW.subject || '" (' || NEW.ticket_number || ')',
    '/forms/' || v_form.id || '/tickets/' || NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_assigned_notify ON public.tickets;
CREATE TRIGGER on_ticket_assigned_notify
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_assigned();

-- ────────────────────────────────────────────────────────────
-- NOTE: The existing detractor alert trigger (from migration 005)
-- already creates entries in feedback_alerts AND notifications
-- when a detractor response is submitted. No changes needed.
-- ────────────────────────────────────────────────────────────
