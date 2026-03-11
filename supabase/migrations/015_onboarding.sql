-- ============================================
-- Migration 015: Onboarding & Activation Tracking (Agent 8)
-- Adds onboarding_completed to profiles + activation_events table
-- ============================================

-- 1. Add onboarding_completed column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 2. Create activation_events table for funnel tracking
CREATE TABLE IF NOT EXISTS public.activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'signup', 'onboarding_started', 'onboarding_completed',
    'first_form_created', 'first_submission_received'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient user-level queries
CREATE INDEX IF NOT EXISTS idx_activation_events_user_id ON public.activation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_workspace_id ON public.activation_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_event_type ON public.activation_events(event_type);

-- 3. Enable RLS
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own activation events
CREATE POLICY "activation_events_select_own"
  ON public.activation_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own activation events
CREATE POLICY "activation_events_insert_own"
  ON public.activation_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
