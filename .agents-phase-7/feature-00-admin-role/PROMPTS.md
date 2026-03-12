# Agent 21 — Prompts

## Prompt Checklist
- [ ] 21.0 — Assessment: Read code, confirm admin bypass gaps, create FIX-PLAN
- [ ] 21.1 — Add admin/owner bypass to usePlanLimits
- [ ] 21.2 — Add admin bypass to FeatureGate component
- [ ] 21.3 — Final verification + HANDOFF.md

---

### PROMPT 21.0: Assessment

```
You are Agent 21 — ADMIN Role Bypass for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess the current admin/owner handling in plan limits and feature gates.

1. Read these files:
   - src/hooks/usePlanLimits.ts — understand how limits are checked
   - src/components/upgrade/FeatureGate.tsx — understand how features are gated
   - src/hooks/useSubscription.ts — understand plan tier resolution
   - src/contexts/WorkspaceContext.tsx — understand workspace role access
   - .agents-phase-7/scanner-reports/04-plan-limits.md — P1 issues

2. Document findings:
   - Does usePlanLimits check workspace role?
   - Does FeatureGate allow any admin bypass?
   - How does WorkspaceContext expose the user's role?
   - Are there any existing admin/owner privilege escalation paths?

3. Create FIX-PLAN in this file with specific changes:
   - What to add to usePlanLimits (owner bypass)
   - What to add to FeatureGate (admin bypass)
   - Any helper needed (e.g., useIsWorkspaceOwner hook)

4. Update PROGRESS.md with session entry.

VERIFY:
- FIX-PLAN documented with exact files and changes
- No code changes yet — assessment only
```

---

### PROMPT 21.1: Add Admin/Owner Bypass to usePlanLimits

```
You are Agent 21 — ADMIN Role Bypass for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add workspace owner bypass logic to usePlanLimits.

1. Read the FIX-PLAN from Prompt 21.0 assessment.

2. Read these files:
   - src/hooks/usePlanLimits.ts
   - src/contexts/WorkspaceContext.tsx

3. Modify src/hooks/usePlanLimits.ts:
   - Import workspace context or role info
   - Add an `isOwnerBypass` flag: if current user is workspace owner AND a specific condition (e.g., env flag or admin panel toggle), return unlimited limits
   - All `canCreate*`, `canAccess*`, `canInvite*` functions should return true when owner bypass is active
   - Keep existing limit logic as fallback for non-owners

4. Update PROGRESS.md with session entry.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- usePlanLimits still works correctly for non-owner users
- Owner users get unlimited access
```

---

### PROMPT 21.2: Add Admin Bypass to FeatureGate

```
You are Agent 21 — ADMIN Role Bypass for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add admin bypass to FeatureGate component.

1. Read these files:
   - src/components/upgrade/FeatureGate.tsx
   - src/hooks/usePlanLimits.ts (now with owner bypass from 21.1)

2. Modify src/components/upgrade/FeatureGate.tsx:
   - If usePlanLimits indicates owner bypass is active, always render children without blur/lock overlay
   - No visual indicator needed for admin mode (clean passthrough)
   - Ensure PaywallModal is not triggered for admin users

3. Update PROGRESS.md with session entry.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- FeatureGate still works for non-admin users
- FeatureGate allows passthrough for admin users
```

---

### PROMPT 21.3: Final Verification + HANDOFF

```
You are Agent 21 — ADMIN Role Bypass for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification of all ADMIN bypass changes.

1. Run verification:
   - npm run lint
   - npx tsc --noEmit

2. Verify non-regression:
   - Read FeatureGate usage in at least 3 components to confirm they still work
   - Read usePlanLimits usage in at least 3 components to confirm they still work

3. Update HANDOFF.md:
   - Status: COMPLETE
   - Files modified (list all)
   - Decisions made
   - Next: Agent 22 can proceed

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md updated
- PROGRESS.md marked complete
```
