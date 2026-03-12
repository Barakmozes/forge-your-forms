# Agent 38 — Prompts

## Prompt Checklist
- [x] 38.0 — Pre-flight: Verify all agent HANDOFFs are COMPLETE
- [x] 38.1 — P0/P1 Issue Verification
- [x] 38.2 — Full Build + Lint + Test Verification
- [x] 38.3 — Generate Phase 7 Completion Report

---

### PROMPT 38.0: Pre-flight — Verify All Agents Complete

```
You are Agent 38 — Final Verification for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify all 17 agents (21-37) have completed.

1. Read ALL HANDOFF.md files:
   - .agents-phase-7/feature-00-admin-role/HANDOFF.md
   - .agents-phase-7/feature-01-auth-settings/HANDOFF.md
   - .agents-phase-7/feature-02-edge-functions/HANDOFF.md
   - .agents-phase-7/feature-03-billing-stripe/HANDOFF.md
   - .agents-phase-7/feature-04-plan-limits/HANDOFF.md
   - .agents-phase-7/feature-05-standard-forms/HANDOFF.md
   - .agents-phase-7/feature-06-waitlists/HANDOFF.md
   - .agents-phase-7/feature-07-feedback-nps/HANDOFF.md
   - .agents-phase-7/feature-08-support-tickets/HANDOFF.md
   - .agents-phase-7/feature-09-onboarding-emails/HANDOFF.md
   - .agents-phase-7/feature-10-webhooks-api/HANDOFF.md
   - .agents-phase-7/feature-11-integrations/HANDOFF.md
   - .agents-phase-7/feature-12-templates/HANDOFF.md
   - .agents-phase-7/feature-13-ai-features/HANDOFF.md
   - .agents-phase-7/feature-14-enterprise/HANDOFF.md
   - .agents-phase-7/feature-15-workflows/HANDOFF.md
   - .agents-phase-7/feature-16-i18n-rtl/HANDOFF.md

2. For each agent, verify Status is COMPLETE.

3. If any agent is NOT COMPLETE: STOP and report which agents are incomplete.

4. Update PROGRESS.md.

VERIFY: All 17 HANDOFFs show Status: COMPLETE.
```

---

### PROMPT 38.1: P0/P1 Issue Verification

```
You are Agent 38 — Final Verification for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify all P0 and P1 issues from the MASTER-BRIEF are resolved.

1. Read .agents-phase-7/scanner-reports/MASTER-BRIEF.md — get the issue list.

2. For EACH P0 issue, verify the fix:
   - P0-1 (Stripe IDs): Read src/lib/stripe.ts — confirm env-configurable
   - P0-2 (Mailchimp CORS): Read src/hooks/useIntegrations.ts — confirm edge function proxy

3. For EACH unique P1 issue, verify the fix or mitigation:
   - P1-1 (Stripe IDs): same as P0-1
   - P1-2 (Plan limits client-only): Read usePlanLimits.ts — check for server-side spec
   - P1-3 (AiFormGenerator not gated): Read AiFormGenerator.tsx — check FeatureGate
   - P1-4 (classify-ticket dead code): Read SupportSubmitPage/useTickets — check for call
   - P1-5 (Integrations not gated): Read IntegrationManager.tsx — check FeatureGate
   - P1-6/7 (Plaintext secrets): Check HANDOFF.md for mitigation docs
   - P1-8 (Webhook secret): Check HANDOFF.md for migration spec
   - P1-9 (SSO error): Read AuthContext.tsx — check error handling
   - P1-10/11 (Custom domain): Check HANDOFF.md for documentation
   - P1-12 (ticket_resolved): Read useTickets.ts — check trigger dispatch
   - P1-13 (FIRE_WEBHOOK URL): Read ActionNode.tsx — check URL field
   - P1-14 (Usage RPC): Check migration files

4. Create verification matrix: Issue → Status (RESOLVED / MITIGATED / OPEN)

5. Update PROGRESS.md.

VERIFY: All P0 RESOLVED, all P1 RESOLVED or MITIGATED with documented plan.
```

---

### PROMPT 38.2: Full Build + Lint + Test

```
You are Agent 38 — Final Verification for FormForge Phase 7. READ CLAUDE.md first.

TASK: Run full build, lint, type-check, and test verification.

1. Run: npm run lint
   - Document any warnings/errors
   - Fix if possible (minor — e.g., unused imports from other agents)

2. Run: npx tsc --noEmit
   - Document any type errors
   - Fix if possible (minor type issues)

3. Run: npm run test
   - Document test results
   - Note any failures

4. Attempt: npm run build
   - Document if build succeeds
   - Note any build errors

5. Update PROGRESS.md.

VERIFY: All 4 commands pass (lint, tsc, test, build).
```

---

### PROMPT 38.3: Generate Phase 7 Completion Report

```
You are Agent 38 — Final Verification for FormForge Phase 7. READ CLAUDE.md first.

TASK: Generate the final Phase 7 Completion Report.

1. Create .agents-phase-7/PHASE-7-COMPLETION-REPORT.md with:

   ## Phase 7 Summary
   - Start date, end date
   - Total agents: 18 (21-38)
   - Total prompts executed: (count from all PROGRESS.md)

   ## P0 Resolution Status
   | Issue | Status | Agent | Fix Description |
   (from 38.1 verification)

   ## P1 Resolution Status
   | Issue | Status | Agent | Fix Description |
   (from 38.1 verification)

   ## P2 Status Summary
   - Resolved: N
   - Deferred: N
   - Key deferrals and reasons

   ## Build Health
   - npm run lint: PASS/FAIL
   - npx tsc --noEmit: PASS/FAIL
   - npm run test: PASS/FAIL
   - npm run build: PASS/FAIL

   ## Remaining Work
   - Items deferred to future phases
   - Server-side enforcement migration (from Agent 25 spec)
   - DNS verification edge function (from Agent 35 spec)
   - Custom domain routing implementation

   ## System Health Score
   Updated score (was 7.5/10 pre-Phase 7)

2. Update HANDOFF.md: Status COMPLETE.

3. Update PROGRESS.md as COMPLETE.

VERIFY: PHASE-7-COMPLETION-REPORT.md is complete and accurate.
```
