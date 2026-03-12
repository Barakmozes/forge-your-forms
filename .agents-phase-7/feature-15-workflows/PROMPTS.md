# Agent 36 — Prompts

## Prompt Checklist
- [ ] 36.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 36.1 — Add ticket_resolved workflow trigger dispatch (P1)
- [ ] 36.2 — Fix FIRE_WEBHOOK action URL config (P1)
- [ ] 36.3 — Add template variable documentation to ActionNode
- [ ] 36.4 — Final verification + HANDOFF.md

---

### PROMPT 36.0: Assessment

```
You are Agent 36 — Workflows for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess workflow issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/15-workflows.md
   - src/lib/workflowEngine.ts — find TRIGGER_TYPES and dispatchWorkflowTrigger
   - src/hooks/useTickets.ts — find status update logic (where ticket_resolved should fire)
   - src/components/workflows/ActionNode.tsx — find FIRE_WEBHOOK action config
   - src/components/workflows/TriggerNode.tsx — find trigger type options

2. Confirm:
   - Is ticket_resolved in TRIGGER_TYPES but never dispatched?
   - Does FIRE_WEBHOOK action lack URL field?
   - Does waitlist_milestone fire on every signup?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.
```

---

### PROMPT 36.1: Add ticket_resolved Trigger Dispatch (P1)

```
You are Agent 36 — Workflows for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add dispatchWorkflowTrigger("ticket_resolved") when ticket status changes to resolved.

IMPORTANT: This modifies src/hooks/useTickets.ts which is owned by Agent 29.
Agent 29 (Batch 2) has already completed. Read Agent 29 HANDOFF.md first.

1. Read src/hooks/useTickets.ts:
   - Find the function that updates ticket status
   - Find where status transitions to "resolved"

2. Add workflow trigger:
   - Import dispatchWorkflowTrigger from @/lib/workflowEngine
   - After successful status update to "resolved":
     dispatchWorkflowTrigger("ticket_resolved", { ticketId, formId, status: "resolved", ...ticketData })
   - Fire-and-forget (non-blocking)

3. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Trigger fires only on resolved status (not other status changes)
```

---

### PROMPT 36.2: Fix FIRE_WEBHOOK Action URL Config (P1)

```
You are Agent 36 — Workflows for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add URL configuration to FIRE_WEBHOOK action in ActionNode.

1. Read src/components/workflows/ActionNode.tsx:
   - Find FIRE_WEBHOOK action type rendering
   - Currently only has eventType config

2. Add URL field:
   - Add Input for webhook URL (required for fire_webhook)
   - Add URL validation (must start with https://)
   - Store URL in action config alongside eventType
   - Update the action type interface if needed

3. Read src/lib/workflowEngine.ts:
   - Verify WorkflowAction type includes url field for fire_webhook
   - If not, add it to the type definition

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- FIRE_WEBHOOK action has URL input field
```

---

### PROMPT 36.3: Add Template Variable Documentation

```
You are Agent 36 — Workflows for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add template variable documentation/tooltips to ActionNode.

1. Read src/components/workflows/ActionNode.tsx:
   - Find where template variables ({{key}}) are used in action configs
   - Find email body, Slack message, webhook payload fields

2. Add helper text or tooltip:
   - For each action type, show available variables based on trigger type
   - Variables include: {{email}}, {{name}}, {{nps_score}}, {{ticket_number}}, {{subject}}, etc.
   - Use a small info icon + tooltip or collapsible helper section

3. Read src/lib/workflowEngine.ts:
   - Document the full list of available template variables per trigger type

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Users can see available template variables
```

---

### PROMPT 36.4: Final Verification + HANDOFF

```
You are Agent 36 — Workflows for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - WorkflowBuilder: trigger → conditions → actions → save
   - ticket_resolved trigger dispatches correctly
   - FIRE_WEBHOOK has URL config
   - Template variables documented

3. Update HANDOFF.md:
   - Status: COMPLETE
   - Files modified (including cross-agent useTickets.ts)
   - P2 items deferred (waitlist_milestone, Slack action, error retry)

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
```
