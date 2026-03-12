# Agent 36 — FIX-PLAN

## Assessment Summary

### Issues Confirmed

| ID | Severity | Issue | File(s) | Status |
|----|----------|-------|---------|--------|
| P1-20 | P1 | `ticket_resolved` trigger defined but never dispatched | `src/hooks/useTickets.ts`, `src/lib/workflowEngine.ts` | Confirmed |
| P1-21 | P1 | FIRE_WEBHOOK action has no URL config field | `src/components/workflows/ActionNode.tsx` | Confirmed |
| P2-2 | P2 | Template variable placeholders undocumented | `src/components/workflows/ActionNode.tsx` | Confirmed |

### Issues Deferred (P2, out of scope or owned by other agents)

| ID | Severity | Issue | Reason |
|----|----------|-------|--------|
| P2-1 | P2 | waitlist_milestone fires on every signup | Edge function owned by Agent 23 |
| P2-3 | P2 | Slack action requires form-level integration config | Requires integration architecture change |
| P2-4 | P2 | No workflow error retry | Edge function owned by Agent 23 |
| P2-5 | P2 | Condition field options hardcoded | Feature enhancement, not a bug |

---

## Fix Plan

### Prompt 36.1 — Add ticket_resolved Trigger Dispatch (P1-20)

**Problem**: `TRIGGER_TYPES.TICKET_RESOLVED` exists in `workflowEngine.ts` but no code ever calls `dispatchWorkflowTrigger` with `"ticket_resolved"`. Users can create ticket_resolved workflows that never fire.

**Fix**:
1. In `src/hooks/useTickets.ts`:
   - Import `dispatchWorkflowTrigger` from `@/lib/workflowEngine`
   - In `updateTicket()` (line 88): after successful update, check if `updates.status === "resolved"` → fire-and-forget `dispatchWorkflowTrigger(formId, "ticket_resolved", { ticketId, ...updates })`
   - In `bulkUpdateStatus()` (line 107): after successful bulk update, if `status === "resolved"`, fire trigger for each ticket
   - Fire-and-forget pattern (non-blocking, catch errors silently)

**Constraints**: This is a cross-agent file (Agent 29 owns it). Agent 29 has completed. Must be a minimal, targeted change.

### Prompt 36.2 — Fix FIRE_WEBHOOK Action URL Config (P1-21)

**Problem**: FIRE_WEBHOOK action in `ActionNode.tsx` only has `eventType` field. No URL input means users can't specify where to send webhooks.

**Fix**:
1. In `src/components/workflows/ActionNode.tsx`:
   - Add URL input field for FIRE_WEBHOOK action (required, before eventType)
   - Add client-side validation hint (must start with `https://`)
   - Store URL in `action.config.url`
2. In `src/lib/workflowEngine.ts`:
   - Verify `WorkflowAction.config` type is flexible enough (it uses `Record<string, unknown>` — already fine)

### Prompt 36.3 — Add Template Variable Documentation (P2-2)

**Problem**: Users must guess available template variables like `{{email}}`, `{{nps_score}}`, etc. No tooltip or help text.

**Fix**:
1. In `src/components/workflows/ActionNode.tsx`:
   - Add a collapsible helper section showing available variables per trigger context
   - Variables grouped by trigger type:
     - All triggers: `{{email}}`, `{{name}}`, `{{form_id}}`, `{{form_title}}`
     - feedback: `{{nps_score}}`, `{{respondent_email}}`, `{{respondent_name}}`, `{{category}}`, `{{follow_up}}`
     - support: `{{ticket_number}}`, `{{subject}}`, `{{description}}`, `{{priority}}`, `{{status}}`
     - waitlist: `{{referral_code}}`, `{{position}}`
   - Use info icon + tooltip or small expandable section

### Prompt 36.4 — Final Verification

- Run `npm run lint` and `npx tsc --noEmit`
- Verify all changes are consistent
- Update HANDOFF.md with completion status
