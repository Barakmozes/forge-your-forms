-- ============================================================
-- Migration 037: Add sso_domain column to enterprise_settings
-- Agent 14 — Enterprise Features
--
-- Adds the SSO login email domain (e.g. "acme.com") to enterprise
-- settings. This is the domain Supabase Auth uses to resolve the
-- SSO provider — distinct from the workspace slug.
-- ============================================================

ALTER TABLE public.enterprise_settings
  ADD COLUMN IF NOT EXISTS sso_domain TEXT;

COMMENT ON COLUMN public.enterprise_settings.sso_domain IS
  'The company email domain used for SSO login (e.g. acme.com). Must match the domain registered in the Supabase Auth SSO provider.';
