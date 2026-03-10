-- ============================================
-- Migration 002: Waitlist Tables
-- ============================================

CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  status public.waitlist_entry_status DEFAULT 'waiting' NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(form_id, email)
);

CREATE TABLE public.waitlist_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.waitlist_entries(id) ON DELETE CASCADE,
  message TEXT,
  invited_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_waitlist_entries_form ON public.waitlist_entries(form_id);
CREATE INDEX idx_waitlist_entries_email ON public.waitlist_entries(email);
CREATE INDEX idx_waitlist_entries_referral_code ON public.waitlist_entries(referral_code);
CREATE INDEX idx_waitlist_entries_referred_by ON public.waitlist_entries(referred_by);
CREATE INDEX idx_waitlist_entries_status ON public.waitlist_entries(form_id, status);
CREATE INDEX idx_waitlist_invites_form ON public.waitlist_invites(form_id);
CREATE INDEX idx_waitlist_invites_entry ON public.waitlist_invites(entry_id);
