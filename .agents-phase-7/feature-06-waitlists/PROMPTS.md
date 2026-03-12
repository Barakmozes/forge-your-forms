# Agent 27 — Prompts

## Prompt Checklist
- [ ] 27.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 27.1 — Fix client-side position race condition
- [ ] 27.2 — Assess and document referral_boost decision
- [ ] 27.3 — Final verification + HANDOFF.md

---

### PROMPT 27.0: Assessment

```
You are Agent 27 — Waitlists for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess waitlist issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/06-waitlists.md
   - src/components/waitlist/WaitlistLandingPage.tsx — find position calculation
   - src/hooks/useWaitlist.ts — CRUD + realtime
   - src/hooks/useWaitlistAnalytics.ts — analytics
   - supabase/migrations/004_* — find position trigger

2. Confirm:
   - Does WaitlistLandingPage calculate position client-side?
   - Does the DB trigger auto-assign position correctly?
   - Is referral_boost in form.settings used anywhere?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
```

---

### PROMPT 27.1: Fix Position Race Condition

```
You are Agent 27 — Waitlists for FormForge Phase 7. READ CLAUDE.md first.

TASK: Remove client-side position calculation, trust DB trigger.

1. Read src/components/waitlist/WaitlistLandingPage.tsx.

2. Find client-side position logic (e.g., querying max position).

3. Fix:
   - Remove client-side position query before insert
   - Let DB trigger handle position assignment
   - After insert, read the returned entry's position for display
   - Use the .select() return from the insert to get the actual position

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- No client-side position calculation remains
- Position shown after signup comes from DB-assigned value
```

---

### PROMPT 27.2: Assess referral_boost

```
You are Agent 27 — Waitlists for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess and document referral_boost feature.

1. Read:
   - WaitlistLandingPage.tsx — find referral_boost in settings
   - WaitlistDashboard.tsx — any referral_boost display
   - useWaitlist.ts — any position re-ordering logic

2. Decision:
   - If referral_boost is a published feature users can configure:
     Document that position re-ordering needs a DB function
   - If it's unused/experimental:
     Remove the setting from the UI or add "Coming Soon" indicator

3. Document decision in HANDOFF.md.

4. Update PROGRESS.md.

VERIFY:
- Decision documented
- No broken UI referencing referral_boost
```

---

### PROMPT 27.3: Final Verification + HANDOFF

```
You are Agent 27 — Waitlists for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification of waitlist feature.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow by reading code:
   - WaitlistLandingPage: email → submit → position → referral code → share
   - WaitlistDashboard: stats → chart → leaderboard
   - WaitlistEntries: search → bulk invite → CSV export

3. Update HANDOFF.md: Status COMPLETE, files modified, decisions.

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
