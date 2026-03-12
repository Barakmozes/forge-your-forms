# Agent 25 — Prompts

## Prompt Checklist
- [ ] 25.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 25.1 — Fix usePlanLimits edge cases and clamp logic
- [ ] 25.2 — Document FeatureGate additions needed by downstream agents
- [ ] 25.3 — Write server-side enforcement specification
- [ ] 25.4 — Final verification + HANDOFF.md

---

### PROMPT 25.0: Assessment

```
You are Agent 25 — Plan Limits for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess plan limits issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/04-plan-limits.md
   - src/hooks/usePlanLimits.ts — current limits (with Agent 21 changes)
   - src/components/upgrade/FeatureGate.tsx — gate component
   - src/components/ai/AiFormGenerator.tsx — check for FeatureGate
   - src/components/integrations/IntegrationManager.tsx — check for FeatureGate

2. Confirm which issues are still present after Agent 21's changes.

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
```

---

### PROMPT 25.1: Fix usePlanLimits Edge Cases

```
You are Agent 25 — Plan Limits for FormForge Phase 7. READ CLAUDE.md first.

TASK: Fix edge cases in usePlanLimits.

1. Read src/hooks/usePlanLimits.ts.

2. Fix:
   - Clamp submissionPercentUsed to max 100 (prevent >100 flash)
   - Ensure isNearLimit only triggers once at 80% (not repeatedly)
   - Add canAccessFeature check for 'integrations' (currently missing)
   - Verify all PLAN_FEATURES entries match usePlanLimits checks

3. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Percentage capped at 100
```

---

### PROMPT 25.2: Document FeatureGate Requirements for Downstream

```
You are Agent 25 — Plan Limits for FormForge Phase 7. READ CLAUDE.md first.

TASK: Document which components need FeatureGate wrapping for downstream agents to implement.

NOTE: Agent 25 does NOT modify AiFormGenerator or IntegrationManager (they're owned by other agents).
Instead, document the exact FeatureGate usage needed.

1. Read:
   - src/components/ai/AiFormGenerator.tsx — find where to wrap
   - src/components/integrations/IntegrationManager.tsx — find where to wrap

2. Write to HANDOFF.md — a clear spec for each:
   - AiFormGenerator: `<FeatureGate feature="ai" requiredPlan="business">` (for Agent 34)
   - IntegrationManager: `<FeatureGate feature="integrations" requiredPlan="pro">` (for Agent 32)
   - Include exact JSX wrapping instructions

3. Add 'integrations' to PLAN_FEATURES in usePlanLimits if missing.

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Spec is clear for downstream agents
```

---

### PROMPT 25.3: Write Server-Side Enforcement Specification

```
You are Agent 25 — Plan Limits for FormForge Phase 7. READ CLAUDE.md first.

TASK: Write specification for server-side plan limit enforcement via RLS.

NOTE: This is documentation only — no migration created in Phase 7.
The actual migration is deferred to a future phase.

1. Read:
   - src/hooks/usePlanLimits.ts — all limit values
   - supabase/migrations/003_rls_policies.sql — current RLS
   - supabase/migrations/013_* — subscriptions table
   - Agent 22 HANDOFF.md — member limit spec (if available)

2. Write specification to HANDOFF.md:
   - SQL function: check_plan_limit(workspace_id, resource_type) → BOOLEAN
   - RLS policies needed:
     * forms INSERT: check form count <= plan limit
     * submissions INSERT: check monthly submission count <= plan limit
     * workspace_members INSERT: check member count <= plan limit
   - Plan tier resolution in SQL (join workspace → subscription → map price_id to tier)
   - Edge cases: NULL subscription = free tier

3. Update PROGRESS.md.

VERIFY:
- Specification is actionable
- SQL pseudocode is valid
```

---

### PROMPT 25.4: Final Verification + HANDOFF

```
You are Agent 25 — Plan Limits for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify:
   - usePlanLimits correctly handles all edge cases
   - FeatureGate works for admin bypass (from Agent 21)
   - Downstream specs documented in HANDOFF.md

3. Update HANDOFF.md:
   - Status: COMPLETE
   - Files modified
   - Specs for Agent 32 (integrations gate) and Agent 34 (AI gate)
   - Server-side enforcement spec for future phase

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete with downstream specs
```
