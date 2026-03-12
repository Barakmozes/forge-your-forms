# Agent 28 — Prompts

## Prompt Checklist
- [ ] 28.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 28.1 — Fix duplicated sentiment calculation
- [ ] 28.2 — Assess feedback_alerts realtime and custom fields
- [ ] 28.3 — Final verification + HANDOFF.md

---

### PROMPT 28.0: Assessment

```
You are Agent 28 — Feedback/NPS for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess feedback/NPS issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/07-feedback-nps.md
   - src/components/feedback/FeedbackSurveyPage.tsx — find inline sentiment logic (~line 279)
   - src/lib/npsCalculator.ts — canonical sentiment calculation
   - src/hooks/useFeedback.ts — realtime subscriptions
   - src/hooks/useFeedbackAnalytics.ts — NPS analytics

2. Confirm:
   - Is sentiment duplicated in FeedbackSurveyPage?
   - Does useFeedback subscribe to feedback_alerts changes?
   - Any custom field rendering edge cases?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
```

---

### PROMPT 28.1: Fix Duplicated Sentiment Calculation

```
You are Agent 28 — Feedback/NPS for FormForge Phase 7. READ CLAUDE.md first.

TASK: Replace inline sentiment check with npsCalculator function.

1. Read:
   - src/components/feedback/FeedbackSurveyPage.tsx — find inline sentiment logic
   - src/lib/npsCalculator.ts — find calculateSentiment() or equivalent

2. Fix:
   - Import calculateSentiment from npsCalculator.ts
   - Replace inline logic with function call
   - Ensure the function signature matches what FeedbackSurveyPage needs
   - If npsCalculator doesn't export calculateSentiment, add it

3. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Sentiment classification uses single source of truth
```

---

### PROMPT 28.2: Assess Alerts Realtime and Custom Fields

```
You are Agent 28 — Feedback/NPS for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess feedback_alerts realtime and custom field edge cases.

1. Read src/hooks/useFeedback.ts:
   - Check realtime subscriptions — does it watch feedback_alerts?
   - If not: decide if adding realtime is worth the complexity
   - Alternative: manual refresh or periodic polling

2. Read FeedbackSurveyPage.tsx:
   - Find custom fields rendering from form.settings
   - Check for edge cases: missing field types, invalid values, empty arrays
   - Document any issues found

3. Document decisions in HANDOFF.md.

4. Update PROGRESS.md.

VERIFY:
- Decisions documented
- No broken rendering paths
```

---

### PROMPT 28.3: Final Verification + HANDOFF

```
You are Agent 28 — Feedback/NPS for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - FeedbackSurveyPage: NPS 0-10 → category → follow-up → submit → thank you
   - FeedbackDashboard: NPS score → sentiment breakdown → weekly trends → at-risk
   - Alert flow: detractor → alert created → notification

3. Update HANDOFF.md: Status COMPLETE.

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
