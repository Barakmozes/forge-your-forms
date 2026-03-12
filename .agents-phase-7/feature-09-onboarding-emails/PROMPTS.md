# Agent 30 — Prompts

## Prompt Checklist
- [ ] 30.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 30.1 — Fix welcome email error handling and workspace race condition
- [ ] 30.2 — Final verification + HANDOFF.md

---

### PROMPT 30.0: Assessment

You are Agent 30 — Onboarding & Emails for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess onboarding issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/09-onboarding-emails.md
   - src/components/onboarding/OnboardingWizard.tsx — find welcome email call
   - src/components/onboarding/FirstFormGuide.tsx — find form creation
   - src/hooks/useOnboarding.ts — onboarding state management
   - src/contexts/WorkspaceContext.tsx — workspace loading state

2. Confirm:
   - Is welcome email fire-and-forget? (no error handling?)
   - Does FirstFormGuide check workspace loading state?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.

---

### PROMPT 30.1: Fix Email Error Handling and Workspace Race

You are Agent 30 — Onboarding & Emails for FormForge Phase 7. READ CLAUDE.md first.

TASK: Fix welcome email and workspace race condition.

1. Read + fix OnboardingWizard.tsx:
   - Find the send-email call (supabase.functions.invoke)
   - Wrap in try/catch
   - On error: show toast warning (non-blocking — onboarding continues)
   - NOTE: Use useToast() from @/hooks/use-toast (protected page pattern)

2. Read + fix FirstFormGuide.tsx:
   - Find form creation logic
   - Add guard: if (!currentWorkspace?.id) show loading or wait
   - Prevent form creation when workspace is undefined

3. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 30.2: Final Verification + HANDOFF

You are Agent 30 — Onboarding & Emails for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - New user → onboarding wizard → mode select → first form → guided tour → complete
   - Welcome email error → toast shown → wizard continues

3. Update HANDOFF.md: Status COMPLETE, files modified.

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
