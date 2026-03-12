# Agent 33 — Prompts

## Prompt Checklist
- [x] 33.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [x] 33.1 — Verify RPC and fix template cloning
- [x] 33.2 — Final verification + HANDOFF.md

---

### PROMPT 33.0: Assessment

You are Agent 33 — Templates for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess template issues.

1. Read these files:
   - .agents-phase-7/scanner-reports/12-template-marketplace.md
   - src/hooks/useTemplates.ts — find increment_template_use_count RPC call
   - src/components/templates/UseTemplateButton.tsx — find fields cast
   - supabase/migrations/018_* — check if RPC exists

2. Confirm:
   - Does increment_template_use_count() exist in migrations?
   - Is the RPC fallback working correctly?
   - Are template fields validated before cloning?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.

---

### PROMPT 33.1: Verify RPC and Fix Template Cloning

You are Agent 33 — Templates for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify RPC existence and fix template field validation.

1. Search migrations for increment_template_use_count:
   - grep -r "increment_template_use_count" supabase/migrations/
   - If missing: either create migration 029_template_rpc.sql OR remove RPC call and use direct update only

2. Fix UseTemplateButton.tsx:
   - Add basic validation before cloning: verify fields is an array, each field has required properties (type, label)
   - If validation fails: show error toast instead of creating broken form

3. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 33.2: Final Verification + HANDOFF

You are Agent 33 — Templates for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - Templates page: browse → filter → search
   - TemplateDetail: preview fields → clone
   - UseTemplateButton: auth check → clone → redirect to editor

3. Update HANDOFF.md: Status COMPLETE.

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
