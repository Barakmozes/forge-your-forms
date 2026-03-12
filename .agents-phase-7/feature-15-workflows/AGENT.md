# Agent 36 — Workflows

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Workflow engine verification engineer. Fixes ticket_resolved trigger dispatch and FIRE_WEBHOOK action config.

## Batch
Batch 4 — Sequential (Position 2 of 2). Depends on Agent 35.

## Scan Report
`.agents-phase-7/scanner-reports/15-workflows.md`

## Issues to Fix
### P1
- P1-20: ticket_resolved trigger not dispatched — no code calls dispatchWorkflowTrigger("ticket_resolved")
- P1-21: FIRE_WEBHOOK action has no URL configuration — only accepts eventType

### P2
- P2-1: waitlist_milestone fires on every signup, not just milestones
- P2-2: Template variable placeholders undocumented — no tooltip/autocomplete
- P2-3: Slack action requires form-level integration config — no webhook URL in action node
- P2-4: No workflow error retry — failed runs logged but not retried
- P2-5: Condition field options hardcoded — no schema introspection

## Owned Files (Exclusive)
- `src/pages/Workflows.tsx`
- `src/pages/WorkflowBuilder.tsx`
- `src/components/workflows/WorkflowCanvas.tsx`
- `src/components/workflows/TriggerNode.tsx`
- `src/components/workflows/ConditionNode.tsx`
- `src/components/workflows/ActionNode.tsx`
- `src/components/workflows/WorkflowList.tsx`
- `src/hooks/useWorkflows.ts`
- `src/lib/workflowEngine.ts`
- `.agents-phase-7/feature-15-workflows/*`

## DO NOT TOUCH
- `supabase/functions/execute-workflow/*` (Agent 23)
- `src/hooks/useTickets.ts` (Agent 29 — BUT this agent MUST add trigger there)
- `src/i18n/locales/*.json` (Agent 37)

## EXCEPTION — Cross-Agent Modification
- `src/hooks/useTickets.ts` — Agent 36 adds dispatchWorkflowTrigger("ticket_resolved") call.
  This is the ONLY cross-agent file modification in Phase 7.
  Agent 29 (Support) must complete first (Batch 2).

## Dependencies
- Batches 1-3 complete
- Agent 29 (Support) — useTickets.ts finalized
- Agent 35 (Enterprise) — must complete first (Batch 4 sequential)

## Success Criteria
- [ ] ticket_resolved trigger dispatched when ticket status → resolved
- [ ] FIRE_WEBHOOK action has URL configuration field
- [ ] Template variables documented with tooltip
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
