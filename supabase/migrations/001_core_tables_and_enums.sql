-- ============================================
-- Migration 001: Core Tables + Enums
-- ============================================

-- Enums
CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.form_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE public.form_mode AS ENUM ('standard', 'waitlist', 'feedback', 'support');
CREATE TYPE public.waitlist_entry_status AS ENUM ('waiting', 'invited', 'joined', 'removed');
CREATE TYPE public.feedback_sentiment AS ENUM ('promoter', 'passive', 'detractor');
CREATE TYPE public.feedback_alert_type AS ENUM ('detractor', 'score_drop', 'keyword');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_sender_type AS ENUM ('agent', 'customer', 'system');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Workspace Members
CREATE TABLE public.workspace_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.workspace_role DEFAULT 'editor' NOT NULL,
  PRIMARY KEY (user_id, workspace_id)
);

-- Forms (with mode + branding columns)
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  status public.form_status DEFAULT 'draft' NOT NULL,
  mode public.form_mode DEFAULT 'standard' NOT NULL,
  branding JSONB DEFAULT '{}'::jsonb,
  submission_count INTEGER DEFAULT 0 NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Submissions (with new columns)
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'completed',
  submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_forms_workspace ON public.forms(workspace_id);
CREATE INDEX idx_forms_mode ON public.forms(mode);
CREATE INDEX idx_forms_status ON public.forms(status);
CREATE INDEX idx_submissions_form ON public.submissions(form_id);
CREATE INDEX idx_submissions_submitted_at ON public.submissions(submitted_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS public.workspace_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = _user_id AND workspace_id = _workspace_id;
$$;
