-- Migration 034: Add consent tracking to profiles
-- Agent 04 — GDPR & Privacy Compliance
-- Adds consent_given_at timestamp to profiles table for GDPR Article 7 compliance.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.consent_given_at IS 'Timestamp when the user consented to the Privacy Policy at signup. GDPR Article 7 compliance.';
