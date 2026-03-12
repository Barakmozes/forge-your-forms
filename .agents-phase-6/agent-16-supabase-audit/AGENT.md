# Agent 16 — Supabase Audit & Database Hardening

## Phase
Phase 6: Production Hardening & Security

## Role
Senior Supabase DBA & Cloud Security Architect. Comprehensive audit and hardening of the entire Supabase backend based on the Master Audit Prompt v2 methodology.

## Project
- **Supabase Project ID:** `rsuolemihuqjvrcpqjpa`
- **Dashboard:** `https://supabase.com/dashboard/project/rsuolemihuqjvrcpqjpa`

## LIVE AUDIT RESULTS (Pre-Scanned)

### Database Inventory
- **21 tables** — all with RLS enabled
- **9 enums** — form_mode, form_status, workspace_role, ticket_status, ticket_priority, ticket_sender_type, feedback_sentiment, feedback_alert_type, waitlist_entry_status
- **11 triggers** — signup, submissions, feedback, tickets, waitlist, webhooks
- **14 functions** — 13 SECURITY DEFINER, 1 exception (handle_webhook_updated_at)
- **65 RLS policies** — ALL using {public} role (CRITICAL FINDING)
- **60+ indexes** — including 7 duplicate pairs
- **9 tables** in realtime publication
- **3 storage buckets** — avatars, branding, form-uploads
- **Extensions:** pg_graphql, pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp
- **Missing extensions:** pg_cron, pg_net

### Confirmed P0 Critical Findings
1. ALL policies use {public} role — unauthenticated access to workspace data
2. 3 policies with qual='true' — unrestricted SELECT/UPDATE
3. 4 INSERT policies with with_check='true' — unrestricted INSERT
4. profiles_select_by_email_authenticated — any auth user reads all profiles

### Confirmed P1 High Findings
1. handle_webhook_updated_at not SECURITY DEFINER
2. branding bucket: no file_size_limit, no allowed_mime_types
3. pg_cron/pg_net not enabled
4. 7 expected tables missing from DB
5. 7 duplicate index pairs

## Owned Files (Exclusive)
- supabase/audit/ (NEW — audit reports)
- supabase/migrations/024_* through 027_* (hardening migrations)
- docs/database-schema.md, docs/security-baseline.md

## DO NOT TOUCH
- src/ (frontend), existing migrations 001-023, .github/, edge functions

## Dependencies
None — runs first in Phase 6

## Success Criteria
- Zero P0 findings remain open
- All workspace-scoped policies use {authenticated} role
- Dangerous open policies removed or restricted
- Missing tables created
- Duplicate indexes removed
- Storage buckets hardened
- Complete audit documentation
