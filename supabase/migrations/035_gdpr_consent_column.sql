-- Migration 034: Add consent_given_at column to profiles
-- GDPR Article 7 — demonstrable consent at signup
-- Agent 04 — GDPR & Privacy Compliance

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- Index for compliance queries (e.g., find users without consent)
CREATE INDEX IF NOT EXISTS profiles_consent_given_at_idx
  ON public.profiles (consent_given_at)
  WHERE consent_given_at IS NOT NULL;
