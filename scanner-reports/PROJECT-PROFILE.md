# Project Profile

**Scanned**: 2026-03-15
**Rules File**: CLAUDE.md
**Project Type**: Web Application
**Secondary Types**: None

## Tech Stack

| Dimension | Value | Confidence |
|-----------|-------|------------|
| Language | TypeScript 5.8 (strict: false) | HIGH |
| Framework | React 18.3 + Vite 5.4 SPA | HIGH |
| Build System | Vite 5.4 + Rollup (manual chunks) | HIGH |
| Package Manager | npm | HIGH |
| Database | Supabase (PostgreSQL) | HIGH |
| ORM / DB Client | @supabase/supabase-js 2.98 | HIGH |
| Auth Provider | Supabase Auth (email/password) | HIGH |
| Test Framework | Vitest 3.2 + Testing Library + jsdom | HIGH |
| Linter | ESLint 9 (flat config) + typescript-eslint | HIGH |
| CSS Framework | TailwindCSS 3.4 + tailwindcss-animate | HIGH |
| Component Library | shadcn/ui (48+ components, Radix UI primitives) | HIGH |
| AI / LLM Integrations | YES — Supabase edge functions (ai-analyze, ai-generate, ai-suggest-reply, classify-ticket, churn-score) | HIGH |
| Analytics | Custom analytics hooks (no external service) | HIGH |
| Error Monitoring | Custom errorLogger + ErrorBoundary | MEDIUM |
| Real-time | YES — Supabase Realtime (postgres_changes) | HIGH |
| Caching | NO — no caching layer detected | HIGH |
| i18n | YES — i18next + react-i18next + LanguageContext | HIGH |
| Billing/Payments | YES — Stripe (checkout, webhooks, portal, 6 price IDs) | HIGH |
| Serverless/Edge | YES — 14 Supabase edge functions | HIGH |
| RBAC/Roles | YES — workspace_role (owner, editor, viewer) | HIGH |
| CI/CD | YES — GitHub Actions (lint, test, build, deploy to Vercel) | HIGH |
| Background Jobs | NO — no job/queue system detected | HIGH |

## Template Variables

| Variable | Value |
|----------|-------|
| `{{LINT_CMD}}` | `npm run lint` |
| `{{TYPE_CHECK_CMD}}` | `npx tsc --noEmit` |
| `{{TEST_CMD}}` | `npm run test` |
| `{{BUILD_CMD}}` | `npm run build` |
| `{{MIGRATION_CMD}}` | `node scripts/run-migration.cjs <file>` |
| `{{CODEGEN_CMD}}` | `npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts` |
| `{{AUDIT_CMD}}` | `npm audit` |
| `{{PACKAGE_MANAGER}}` | `npm` |
| `{{SOURCE_DIR}}` | `src/` |
| `{{SCHEMA_FILE}}` | `supabase/migrations/` (30 SQL files) |
| `{{PROJECT_RULES_FILE}}` | `CLAUDE.md` |

## npm audit Summary

| Package | Severity | Issue |
|---------|----------|-------|
| @remix-run/router (via react-router-dom) | HIGH | XSS via Open Redirects (GHSA-2w69-qvjg-hvjx) — affects <=1.23.1 |
| @tootallnate/once (via jsdom dev dep) | LOW | Incorrect Control Flow Scoping |

## Active Scan Dimensions

### Mandatory (always)
- [x] Touchpoints Inventory
- [x] E2E Flow Status
- [x] Cross-Dependencies
- [x] Parallelism Eligibility

### Quality (conditional)
- [x] Business Tier Mapping
- [x] i18n / RTL Status
- [x] Auth & RBAC Audit
- [x] Edge Function / Serverless Audit
- [x] Test Coverage Analysis
- [x] Accessibility Audit
- [x] Runtime Performance Audit
- [x] API Security Audit

### Professional (mixed)
- [x] Responsive Design Audit
- [x] Database & Query Optimization
- [x] Code Architecture & Quality (always)
- [x] Error Handling & Resilience (always)
- [x] CI/CD & DevOps Audit
- [x] Documentation Audit (always)
- [x] SEO Audit

### Project-Type Specific
- [ ] CLI UX Audit (CLI Tool type)
- [ ] Library / SDK API Audit (Library type)
- [ ] Mobile App Audit (Mobile type)

### Strategic (always)
- [x] Product Growth & Innovation
