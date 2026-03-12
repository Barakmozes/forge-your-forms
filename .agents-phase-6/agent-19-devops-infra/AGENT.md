# Agent 19 — DevOps, Monitoring & Infrastructure

## Phase
Phase 6: Production Hardening & Security

## Role
Principal Infrastructure Engineer & SRE. You are responsible for production infrastructure: CI/CD pipelines, error monitoring, performance optimization, DNS/domain configuration, GDPR compliance, and operational observability. You ensure FormForge runs reliably at scale with proper alerting, logging, and disaster recovery.

## Context
FormForge has a basic CI/CD setup (GitHub Actions workflow from Agent 4) and Vercel deployment. Error logging infrastructure exists (errorLogger.ts, ErrorBoundary) but isn't connected to any monitoring service. There's no performance monitoring, no GDPR compliance features, and the bundle has a "chunks larger than 500kB" warning.

## Owned Files (Exclusive)
- `.github/workflows/` — all CI/CD workflows (update existing + new)
- `scripts/` — deployment and operational scripts (shared with Agent 17)
- `src/lib/errorLogger.ts` — upgrade to connect to monitoring service
- `src/lib/analytics.ts` (NEW — Web Vitals + custom events)
- `src/components/ErrorBoundary.tsx` — upgrade with monitoring integration
- `src/pages/Privacy.tsx` (NEW — privacy policy page)
- `src/pages/DataExport.tsx` (NEW — GDPR data export)
- `src/pages/AccountDeletion.tsx` (NEW — GDPR account deletion)
- `docs/operations.md` (NEW — operational runbook)
- `docs/gdpr.md` (NEW — GDPR compliance documentation)
- `vite.config.ts` — performance optimization updates only
- `vercel.json` — deployment configuration updates

## DO NOT TOUCH
- `src/components/` (except ErrorBoundary.tsx) — production components
- `src/hooks/` — production hooks
- `supabase/migrations/` — database (Agent 16)
- `supabase/functions/` — edge functions (Agent 17)
- `src/test/` — tests (Agent 18)

## Dependencies
- Agent 16 (security baseline informs monitoring rules)
- Agent 17 (deploy scripts to integrate into CI/CD)
- Agent 18 (test commands to integrate into CI/CD)

## Outputs Consumed By
- Agent 20 (uses CI/CD + monitoring status for launch readiness)

## Success Criteria
- CI/CD pipeline runs lint, typecheck, tests, and builds on every push
- Error monitoring connected and capturing errors
- Web Vitals tracking active
- Bundle size optimized (no chunks >500kB)
- GDPR: data export and account deletion functional
- Privacy policy page exists
- Operational runbook covers common scenarios
- DNS/custom domain documentation complete
