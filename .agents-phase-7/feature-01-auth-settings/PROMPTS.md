# Agent 22 — Prompts

## Prompt Checklist
- [x] 22.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [x] 22.1 — Fix SSO error handling in AuthContext
- [x] 22.2 — Improve SSO test validation in SsoConfig
- [x] 22.3 — Document member limit server-side enforcement plan
- [x] 22.4 — Final verification + HANDOFF.md

---

### PROMPT 22.0: Assessment

```
You are Agent 22 — Auth & Settings for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess auth & settings issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/01-auth-settings.md — full scan report
   - src/contexts/AuthContext.tsx — SSO sign-in flow
   - src/components/enterprise/SsoConfig.tsx — SSO test connection
   - src/components/MembersManager.tsx — member invite limits
   - src/hooks/usePlanLimits.ts — current limit enforcement

2. For each P1/P2 issue, confirm:
   - Is the issue still present? (code may have changed)
   - What is the exact fix needed?
   - Which files need modification?

3. Create FIX-PLAN with:
   - Issue-by-issue fix details
   - Any migrations needed
   - Risk assessment for each fix

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
- All P1/P2 issues confirmed or dismissed
```

---

### PROMPT 22.1: Fix SSO Error Handling

```
You are Agent 22 — Auth & Settings for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add proper error handling for SSO sign-in failures.

1. Read src/contexts/AuthContext.tsx — find signInWithSSO function.

2. Add error handling:
   - Wrap signInWithSSO in try/catch
   - On failure: show descriptive error toast (e.g., "SSO not configured", "Provider unreachable")
   - Handle specific Supabase auth error codes
   - Return error state so calling component can react

3. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- SSO error flow returns meaningful messages
```

---

### PROMPT 22.2: Improve SSO Test Validation

```
You are Agent 22 — Auth & Settings for FormForge Phase 7. READ CLAUDE.md first.

TASK: Improve SSO test connection validation in SsoConfig.

1. Read src/components/enterprise/SsoConfig.tsx — find test connection logic.

2. Improve validation:
   - Current: HEAD request only checks URL reachability
   - Add: Validate response content type includes XML or SAML metadata indicators
   - Add: Better error messages for common failures (404, timeout, invalid response)
   - Keep backwards compatibility with existing UI

3. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Test connection provides more useful feedback
```

---

### PROMPT 22.3: Document Member Limit Server-Side Plan

```
You are Agent 22 — Auth & Settings for FormForge Phase 7. READ CLAUDE.md first.

TASK: Document the plan for server-side member limit enforcement.

NOTE: The actual RLS migration for member limits is deferred to Agent 25 (Plan Limits).
This prompt creates the documentation and specification.

1. Read:
   - src/hooks/usePlanLimits.ts — current client-side limits
   - src/components/MembersManager.tsx — member invite flow
   - supabase/migrations/003_rls_policies.sql — current RLS

2. Write a specification in this agent's HANDOFF.md:
   - SQL function needed: check_member_limit(workspace_id)
   - RLS policy needed on workspace_members INSERT
   - How to resolve plan tier in RLS (join subscriptions table)
   - Edge cases: owner always allowed, existing members not affected

3. Update PROGRESS.md.

VERIFY:
- Specification is clear enough for Agent 25 to implement
```

---

### PROMPT 22.4: Final Verification + HANDOFF

```
You are Agent 22 — Auth & Settings for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification of all auth & settings fixes.

1. Run verification:
   - npm run lint
   - npx tsc --noEmit

2. Verify E2E flows (read code paths):
   - SSO sign-in error handling path
   - SSO test connection path
   - Member invite path (confirm client-side limits still work)

3. Update HANDOFF.md:
   - Status: COMPLETE
   - Files modified
   - Specification for server-side member limits (for Agent 25)
   - Decisions made

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
