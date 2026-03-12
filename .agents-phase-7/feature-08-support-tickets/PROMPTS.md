# Agent 29 — Prompts

## Prompt Checklist
- [ ] 29.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 29.1 — Wire classify-ticket edge function to frontend (P1)
- [ ] 29.2 — Assess SupportDashboard size and auto-close limitation
- [ ] 29.3 — Verify ticket tracking and canned responses
- [ ] 29.4 — Final verification + HANDOFF.md

---

### PROMPT 29.0: Assessment

```
You are Agent 29 — Support Tickets for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess support ticket issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/08-support-tickets.md
   - src/components/support/SupportSubmitPage.tsx — ticket creation flow
   - src/hooks/useTickets.ts — ticket CRUD + find where classify-ticket should be called
   - supabase/functions/classify-ticket/index.ts — understand API contract
   - src/components/support/SupportDashboard.tsx — check size, identify split candidates

2. Confirm:
   - classify-ticket: what URL/method, what input/output format?
   - SupportDashboard: how many lines? Can it be reasonably split?
   - Auto-close: is it only client-side in useTickets?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
```

---

### PROMPT 29.1: Wire classify-ticket to Frontend (P1)

```
You are Agent 29 — Support Tickets for FormForge Phase 7. READ CLAUDE.md first.

TASK: Wire the classify-ticket edge function to be called after ticket creation.

1. Read:
   - supabase/functions/classify-ticket/index.ts — understand input/output
   - src/components/support/SupportSubmitPage.tsx — find ticket creation
   - src/hooks/useTickets.ts — find createTicket function

2. Add classify-ticket call:
   - After ticket is successfully created (has ticket ID)
   - Call the classify-ticket edge function (fire-and-forget, non-blocking)
   - On success: update ticket with ai_classification data
   - On failure: silently log error (classification is enhancement, not critical)
   - Use supabase.functions.invoke('classify-ticket', { body: { ticketId, subject, description } })

3. Verify tickets table has ai_classification column (check migrations).

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- classify-ticket is called after ticket creation
- Failure doesn't block ticket submission
```

---

### PROMPT 29.2: Assess Dashboard Size and Auto-Close

```
You are Agent 29 — Support Tickets for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess SupportDashboard size and auto-close limitation.

1. Read src/components/support/SupportDashboard.tsx:
   - Count lines/KB
   - Identify logical sections that could be split
   - Decision: Is splitting worth the refactor risk in Phase 7?

2. Read useTickets.ts — find auto-close logic:
   - Document: auto-close only runs when dashboard loads
   - Decision: server-side cron or accept client-side limitation?
   - Note: Agent 16 (Phase 6) created auto_close_resolved_tickets() function but pg_cron not enabled

3. Document decisions in HANDOFF.md.

4. Update PROGRESS.md.

VERIFY:
- Decisions documented
- No code changes needed for this prompt
```

---

### PROMPT 29.3: Verify Ticket Tracking and Canned Responses

```
You are Agent 29 — Support Tickets for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify ticket tracking and canned responses work correctly.

1. Read src/components/support/TicketTrackingPage.tsx:
   - Verify ticket lookup by number + email works
   - Verify only non-internal messages shown to customers
   - Verify customer reply submission works

2. Read src/hooks/useCannedResponses.ts:
   - Check realtime subscription (likely missing)
   - Decision: add realtime or accept stale data?

3. Document any issues found.

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- Ticket tracking flow verified
```

---

### PROMPT 29.4: Final Verification + HANDOFF

```
You are Agent 29 — Support Tickets for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - SupportSubmitPage: form → submit → ticket number → classify-ticket call
   - TicketTracking: lookup → view messages → reply
   - SupportDashboard: Kanban → ticket list → bulk ops → analytics
   - TicketDetail: messages → reply → canned responses → tags

3. Update HANDOFF.md: Status COMPLETE, files modified, decisions.

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
