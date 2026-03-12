# Phase 6 — Cross-Agent Sync Log

> Update this file whenever an agent modifies a shared file or creates outputs consumed by other agents.
> Agents read this to avoid conflicts and verify dependencies.

---

## Phase 6: Production Hardening & Security

### Execution Order & Dependencies

```
Agent 16 (Supabase Audit)     ← runs FIRST (no dependencies)
    ↓
Agent 17 (Edge Functions)     ← needs Agent 16's audit findings
    ↓ (can partially overlap)
Agent 18 (E2E Testing)        ← needs Agent 16 + 17 for integration tests
Agent 19 (DevOps/Infra)       ← can start 19.0-19.1 in parallel with 16-17
    ↓
Agent 20 (Launch Readiness)   ← runs LAST (needs ALL above complete)
    ↓
Agent 5 (i18n sweep)          ← runs AFTER Phase 6 for any new UI strings
    ↓
🚀 Deploy v6.0 — PRODUCTION LAUNCH
```

### Parallel Execution Notes
- Agent 18 can start unit/component tests (18.0, 18.1, 18.2) while Agent 16/17 work
- Agent 19 can start CI/CD (19.0, 19.1) independently
- Agent 18 integration tests (18.4) require Agent 17 edge functions deployed
- Agent 19 monitoring (19.2) benefits from Agent 16's security baseline
- Agent 20 CANNOT start until 16, 17, 18, 19 are all COMPLETE

---

## Shared File: docs/ Directory

| File | Owner Agent | Consumers | Status |
|------|-------------|-----------|--------|
| docs/database-schema.md | Agent 16 | 17, 18, 20 | — |
| docs/security-baseline.md | Agent 16 | 17, 19, 20 | — |
| docs/edge-functions.md | Agent 17 | 18, 20 | — |
| docs/api-security.md | Agent 17 | 18, 20 | — |
| docs/secrets-checklist.md | Agent 17 | 19, 20 | — |
| docs/testing-guide.md | Agent 18 | 19, 20 | — |
| docs/operations.md | Agent 19 | 20 | — |
| docs/gdpr.md | Agent 19 | 20 | — |
| docs/launch-checklist.md | Agent 20 | — (final output) | — |
| docs/launch-runbook.md | Agent 20 | — (final output) | — |

---

## Shared File: supabase/audit/

| File | Owner | Status |
|------|-------|--------|
| supabase/audit/AUDIT-REPORT.md | Agent 16 | — |
| supabase/audit/rls-matrix.md | Agent 16 | — |
| supabase/audit/migration-inventory.md | Agent 16 | — |

---

## Migration Numbers Reserved (Phase 6)

| Agent | Migration Numbers | Purpose |
|-------|------------------|---------|
| Agent 16 | 024-027 | Auth hardening, RLS fixes, indexes, realtime/storage |
| Agent 19 | 028-029 | error_logs table, performance_metrics table |
| Agent 20 | 030 | Seed templates |

---

## Shared File: scripts/

| Script | Owner | Consumers |
|--------|-------|-----------|
| scripts/deploy-functions.sh | Agent 17 | Agent 19 (CI/CD), Agent 20 (launch) |
| scripts/test-functions.sh | Agent 17 | Agent 19 (CI/CD), Agent 20 (launch) |
| scripts/seed-templates.ts | Agent 20 | — |
| scripts/verify-production.sh | Agent 20 | — |
| scripts/stripe-live-cutover.sh | Agent 20 | — |

---

## Cross-Agent Dependencies Detail

| Dependency | From → To | Notes |
|-----------|-----------|-------|
| AUDIT-REPORT.md | Agent 16 → Agent 17, 20 | Agent 17 uses DB findings; Agent 20 verifies zero P0 |
| security-baseline.md | Agent 16 → Agent 19 | Agent 19 uses for monitoring rules |
| deploy-functions.sh | Agent 17 → Agent 19 | Agent 19 integrates into CI/CD workflow |
| test-functions.sh | Agent 17 → Agent 19 | Agent 19 integrates into CI/CD workflow |
| Test commands | Agent 18 → Agent 19 | Agent 19 adds npm run test to CI/CD |
| edge-functions.md | Agent 17 → Agent 18 | Agent 18 uses for API integration test design |
| All agent outputs | Agents 16-19 → Agent 20 | Agent 20 cross-verifies everything |

---

## Conflicts Detected & Resolved

<!-- Log any merge conflicts and how they were resolved -->

None yet.

---

## Quick Reference: What You Type

| Moment | What You Paste / Type |
|--------|----------------------|
| Start agent | "Read CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md, SYNC-LOG.md" |
| First prompt | "Execute Prompt X.0" |
| Next prompt | "Continue to Prompt X.1" |
| Between prompts | npm run lint + npx tsc --noEmit + git commit |
| Context running out | "Write your state to HANDOFF.md" → new session → resume |
| Agent finished | Check PROGRESS.md says COMPLETE → start next agent |
| Phase finished | All agents COMPLETE → run Agent 5 i18n sweep → deploy |
