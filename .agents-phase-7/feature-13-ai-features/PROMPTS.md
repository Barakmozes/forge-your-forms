# Agent 34 — Prompts

## Prompt Checklist
- [ ] 34.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 34.1 — Add FeatureGate to AiFormGenerator (P1)
- [ ] 34.2 — Fix ChurnScore type mismatch and rate limit UX
- [ ] 34.3 — Final verification + HANDOFF.md

---

### PROMPT 34.0: Assessment

You are Agent 34 — AI Features for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess AI features issues.

1. Read these files:
   - .agents-phase-7/scanner-reports/13-ai-features.md
   - src/components/ai/AiFormGenerator.tsx — check for FeatureGate
   - src/hooks/useAiGenerate.ts — find RATE_LIMIT handling
   - src/hooks/useChurnPrediction.ts — find last_interaction type
   - .agents-phase-7/feature-04-plan-limits/HANDOFF.md — FeatureGate spec

2. Confirm all P1/P2 issues.

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.

---

### PROMPT 34.1: Add FeatureGate to AiFormGenerator (P1)

You are Agent 34 — AI Features for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add FeatureGate to AiFormGenerator.

1. Read Agent 25 HANDOFF.md for spec (if available).
   If not available: use FeatureGate feature="ai" requiredPlan="business"

2. Read src/components/ai/AiFormGenerator.tsx.

3. Add FeatureGate:
   - Import FeatureGate from @/components/upgrade/FeatureGate
   - Wrap the generator content with FeatureGate
   - Free/Pro/Growth users see blur + upgrade prompt to Business plan

4. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 34.2: Fix Type Mismatch and Rate Limit UX

You are Agent 34 — AI Features for FormForge Phase 7. READ CLAUDE.md first.

TASK: Fix ChurnScore type and rate limit button behavior.

1. Read src/hooks/useChurnPrediction.ts:
   - Find last_interaction vs last_interaction_at mismatch
   - Fix to match DB column name (last_interaction_at)

2. Read src/hooks/useAiGenerate.ts:
   - Find RATE_LIMIT error handling
   - Add: on RATE_LIMIT error, set a `rateLimited` state flag
   - Return `rateLimited` from the hook
   - AiFormGenerator can use this to disable the generate button

3. Read + update src/components/ai/AiFormGenerator.tsx:
   - Import rateLimited from useAiGenerate
   - Disable generate button when rateLimited is true
   - Show "Rate limit reached" message

4. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 34.3: Final Verification + HANDOFF

You are Agent 34 — AI Features for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify:
   - AiFormGenerator has FeatureGate
   - ChurnScore type matches DB
   - Rate limit disables button
   - AiSummaryWidget, AiCannedSuggestions still work

3. Update HANDOFF.md: Status COMPLETE.

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
