-- ============================================
-- Migration 004: Functions & Triggers
-- ============================================

-- Auto-create profile + default workspace on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );

  -- Create default workspace
  new_workspace_id := gen_random_uuid();
  INSERT INTO public.workspaces (id, name, slug, owner_id)
  VALUES (new_workspace_id, 'My Workspace', 'ws-' || substr(NEW.id::text, 1, 8), NEW.id);

  -- Add user as owner of default workspace
  INSERT INTO public.workspace_members (user_id, workspace_id, role)
  VALUES (NEW.id, new_workspace_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Increment forms.submission_count on submission insert
CREATE OR REPLACE FUNCTION public.handle_new_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forms
  SET submission_count = submission_count + 1
  WHERE id = NEW.form_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_submission_created
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_submission();

-- Auto-update forms.updated_at on form update
CREATE OR REPLACE FUNCTION public.handle_form_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_form_updated
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_form_updated();

-- Referral tracking: increment referrer's referral_count on waitlist entry with referred_by
CREATE OR REPLACE FUNCTION public.handle_waitlist_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    UPDATE public.waitlist_entries
    SET referral_count = referral_count + 1
    WHERE referral_code = NEW.referred_by
      AND form_id = NEW.form_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_waitlist_entry_created
  AFTER INSERT ON public.waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_waitlist_referral();

-- Auto-assign position for waitlist entries
CREATE OR REPLACE FUNCTION public.handle_waitlist_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1
  INTO next_position
  FROM public.waitlist_entries
  WHERE form_id = NEW.form_id;

  NEW.position := next_position;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_waitlist_entry_position
  BEFORE INSERT ON public.waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_waitlist_position();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
