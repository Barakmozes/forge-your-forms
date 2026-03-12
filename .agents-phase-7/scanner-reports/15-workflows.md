# Scan Report: Workflows
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/Workflows.tsx` — Workflow listing page (FeatureGate: business plan)
- `src/pages/WorkflowBuilder.tsx` — Create/edit workflow page with canvas + run history

### Components
- `src/components/workflows/WorkflowCanvas.tsx` — Vertical flow builder: trigger → conditions → actions
- `src/components/workflows/TriggerNode.tsx` — Trigger config: 6 types, form selector, threshold inputs
- `src/components/workflows/ConditionNode.tsx` — Condition config: 6 types, field/operator/value
- `src/components/workflows/ActionNode.tsx` — Action config: 6 types (email, ticket, Slack, webhook, status, tag)
- `src/components/workflows/WorkflowList.tsx` — Workflow cards: name, active toggle, counts, last run, dropdown menu

### Hooks
- `src/hooks/useWorkflows.ts` — CRUD + realtime for workflows and workflow_runs

### Database Tables
- `workflows` — RLS: workspace member CRUD. Triggers: auto-update timestamp. Realtime: yes
- `workflow_runs` — RLS: member read, insert allowed. Triggers: none. Realtime: yes

### Edge Functions
- `execute-workflow` — Server-side execution: condition eval, 6 action types, run logging, rate limit (100/hr), depth limit (3)

### Lib
- `src/lib/workflowEngine.ts` — Types, validation, serialization, dispatchWorkflowTrigger(), 3 templates

### Routes
- `/workflows` — Protected, Workflows listing
- `/workflows/new` — Protected, WorkflowBuilder (create mode)
- `/workflows/:id` — Protected, WorkflowBuilder (edit mode)

## 2. End-to-End Flow Status

- **Create workflow → configure trigger/conditions/actions → save**: WORKS — validates, serializes steps to JSONB, inserts
- **Apply template → customize → save**: WORKS — 3 pre-built templates (NPS Alert, Waitlist Welcome, Auto-Assign)
- **Toggle workflow active/inactive**: WORKS — updateWorkflow with active flag
- **Duplicate workflow**: WORKS — clone with "(copy)" suffix
- **View workflow run history**: WORKS — useWorkflowRuns fetches last 50 with status badges
- **Trigger dispatch from form submission**: WORKS — dispatchWorkflowTrigger called from FormRenderer, FeedbackSurveyPage, SupportSubmitPage, WaitlistLandingPage
- **Condition evaluation in edge function**: WORKS — 6 condition types (field_equals, score_below/above, status_is, priority_is, count_exceeds)
- **Action execution**: WORKS — send_email (→ send-email fn), create_ticket (→ DB insert), slack_message (→ slack-notify fn), fire_webhook (→ dispatch-webhook fn), change_status (→ ticket update), add_tag (→ tag upsert)
- **Template variable resolution**: WORKS — {{key}} substitution in action configs
- **Rate limiting (100 runs/hr)**: WORKS — edge function checks workflow_runs count
- **Recursion prevention (depth 3)**: WORKS — execution_depth parameter tracked

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free-Growth | No workflows | — | YES — FeatureGate(requiredPlan="business") on Workflows page |
| Business | Full access | 100 runs/hr/workflow | YES — edge function rate limit |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Edge Functions: send-email, slack-notify, dispatch-webhook
- **Depended on by**: None directly (triggered by form submissions)
- **Shared files**: All public form pages call dispatchWorkflowTrigger() from workflowEngine.ts

## 5. i18n Status

- t() coverage: ALL strings wrapped (workflows.*)
- Hebrew translations: PARTIAL — some workflow keys may be missing from he.json
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **ticket_resolved trigger not dispatched**: TRIGGER_TYPES includes "ticket_resolved" but no code calls dispatchWorkflowTrigger with this type. Users can create "ticket_resolved" workflows that never fire. File: `src/lib/workflowEngine.ts` + `src/hooks/useTickets.ts`
- **FIRE_WEBHOOK action incomplete**: Only accepts eventType config, no URL configuration. Fire webhook action can't actually specify where to send. File: `src/components/workflows/ActionNode.tsx`

### P2 — Medium
- **waitlist_milestone fires on every entry**: Called on every signup, not just milestones. Edge function must check threshold. File: `src/components/waitlist/WaitlistLandingPage.tsx`
- **Template variable placeholders undocumented**: Users must guess available variables ({{email}}, {{nps_score}}, etc.). No tooltip or autocomplete. File: `src/components/workflows/ActionNode.tsx`
- **Slack action requires integration config**: Action type exists but no Slack webhook URL config in action node. Relies on form-level Slack integration. File: `src/components/workflows/ActionNode.tsx`
- **No workflow error retry**: Failed runs logged but not automatically retried. File: `supabase/functions/execute-workflow/index.ts`
- **Condition field options hardcoded**: No schema introspection from actual form fields. File: `src/components/workflows/ConditionNode.tsx`

## 8. Recommended Fix Path

1. Add dispatchWorkflowTrigger("ticket_resolved", ...) when ticket status changes to resolved in useTickets.ts
2. Add URL field to FIRE_WEBHOOK action config in ActionNode.tsx
3. Add tooltip/documentation for available template variables per trigger type
4. Add milestone threshold check in edge function (compare entry position vs trigger config threshold)
