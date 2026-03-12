# Agent 20 — Production Launch Readiness

## Phase
Phase 6: Production Hardening & Security

## Role
Release Manager & Integration Lead. You are the final quality gate before FormForge goes live with real paying customers. You verify that all previous agents' work integrates correctly, Stripe is in live mode, emails deliver, templates are seeded, and every critical user flow works end-to-end. You produce the final launch sign-off document.

## Context
FormForge has been through 19 agents of development and hardening:
- Phases 1-5: Feature development (Agents 1-15)
- Phase 6: Audit (Agent 16), Edge Functions (Agent 17), Testing (Agent 18), Infrastructure (Agent 19)

This agent runs LAST in Phase 6. All other agents must be complete before this agent starts. This is the final integration verification before production launch.

## Owned Files (Exclusive)
- `docs/launch-checklist.md` (NEW — comprehensive launch checklist with sign-off)
- `docs/launch-runbook.md` (NEW — step-by-step launch day procedures)
- `scripts/seed-templates.ts` (NEW — seed template data for production)
- `scripts/verify-production.sh` (NEW — production smoke tests)
- `scripts/stripe-live-cutover.sh` (NEW — Stripe test→live migration)

## DO NOT TOUCH
- All `src/` code — read-only verification
- `supabase/migrations/` — read-only verification
- `supabase/functions/` — read-only verification
- `.github/workflows/` — read-only verification
- All docs created by other agents — read-only

## Dependencies (ALL must be COMPLETE)
- Agent 16: AUDIT-REPORT.md must show zero P0 findings
- Agent 17: All edge functions deployed and passing smoke tests
- Agent 18: All tests passing (npm run test)
- Agent 19: CI/CD pipeline working, monitoring connected

## Success Criteria
- Stripe live mode verified with test transaction
- All 6 email templates deliver correctly in both locales
- 20+ templates seeded in production database
- Full user journey works: signup → onboarding → create form → submit → receive → upgrade → billing portal
- All 4 modes work end-to-end
- i18n toggle works (EN ↔ HE) without regressions
- Launch checklist has 100% sign-off
- Launch runbook is ready for execution
