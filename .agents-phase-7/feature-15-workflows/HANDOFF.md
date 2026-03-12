# Agent 36 — Handoff

## Status: COMPLETE

## What's Done

### P1-20: ticket_resolved trigger dispatch (FIXED)
- Added `dispatchWorkflowTrigger` import to `src/hooks/useTickets.ts`
- `updateTicket()`: dispatches `"ticket_resolved"` trigger after successful status update to `"resolved"` (fire-and-forget with `.catch(() => {})`)
- `bulkUpdateStatus()`: dispatches `"ticket_resolved"` for each ticket in the batch when status is `"resolved"`
- Trigger data includes: ticketId, ticket_number, subject, email, name, category, priority, status

### P1-21: FIRE_WEBHOOK URL config (FIXED)
- Added URL input field to `src/components/workflows/ActionNode.tsx` for FIRE_WEBHOOK action
- URL stored in `action.config.url`
- Client-side validation hint: shows destructive text if URL doesn't start with `https://`
- eventType field preserved alongside URL

### P2-2: Template variable documentation (FIXED)
- Added collapsible helper section to ActionNode for actions that accept text input (send_email, create_ticket, slack_message, fire_webhook)
- Variables grouped by context: Common, Feedback/NPS, Support/Tickets, Waitlist
- Expandable via Info icon + chevron toggle
- Uses `TEMPLATE_VARIABLES` constant array for maintainability

## Files Modified
| File | Change | Cross-Agent? |
|------|--------|-------------|
| `src/hooks/useTickets.ts` | Added dispatchWorkflowTrigger import + calls in updateTicket/bulkUpdateStatus | YES (Agent 29) |
| `src/components/workflows/ActionNode.tsx` | Added URL field for FIRE_WEBHOOK, template variable helper section | No |

## P2 Items Deferred
| ID | Issue | Reason |
|----|-------|--------|
| P2-1 | waitlist_milestone fires on every signup | Edge function owned by Agent 23 |
| P2-3 | Slack action requires form-level integration config | Requires integration architecture change |
| P2-4 | No workflow error retry | Edge function owned by Agent 23 |
| P2-5 | Condition field options hardcoded | Feature enhancement, not a bug |

## i18n Keys Added (Agent 37 to translate)
- `workflows.action.webhookUrl` — "Webhook URL" label
- `workflows.action.webhookUrlHttpsRequired` — HTTPS validation message
- `workflows.action.templateVariables` — "Available template variables" helper label

## Verification
- `npm run lint`: 0 errors, 16 pre-existing warnings
- `npx tsc --noEmit`: passes cleanly

## Downstream
- Agent 37 (i18n) — needs to add 3 new translation keys above
- Agent 38 (Final) — depends on all agents completing
