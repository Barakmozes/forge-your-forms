# Feature 12: Workflows & Automation — Scanner Report

**Scanned**: 2026-03-15
**Status**: Fully implemented with notable gaps
**Risk Level**: Medium (P1 issues in condition evaluation and missing trigger dispatch)

---

## 1. Touchpoints

### Pages
| File | Purpose |
|------|---------|
| `src/pages/Workflows.tsx` | Workflow listing page (FeatureGate: `business` plan) |
| `src/pages/WorkflowBuilder.tsx` | Create/edit workflow page with builder + run history tabs |

### Components
| File | Purpose |
|------|---------|
| `src/components/workflows/WorkflowCanvas.tsx` | Linear pipeline layout: Trigger -> Conditions/Actions |
| `src/components/workflows/TriggerNode.tsx` | Trigger type selector + form scoping + threshold/milestone config |
| `src/components/workflows/ConditionNode.tsx` | Condition type, field, operator, value configuration card |
| `src/components/workflows/ActionNode.tsx` | Action type selector with per-type config fields + template variables helper |
| `src/components/workflows/WorkflowList.tsx` | Workflow cards with toggle, edit, duplicate, delete |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useWorkflows.ts:16` | `useWorkflows(workspaceId)` — CRUD + realtime for `workflows` table |
| `src/hooks/useWorkflows.ts:148` | `useWorkflowRuns(workflowId)` — Read + realtime for `workflow_runs` table |

### Engine / Lib
| File | Purpose |
|------|---------|
| `src/lib/workflowEngine.ts` | Type definitions, validation, dispatch, serialization, templates |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/023_workflows.sql` | `workflows` + `workflow_runs` tables, indexes, RLS, realtime |
| `supabase/migrations/024_rls_role_remediation.sql:596-636` | RLS tightening to `authenticated` role |
| `supabase/migrations/025_policy_hardening.sql:39-44` | Drops overly permissive `workflow_runs_insert_service` policy |

### Edge Function
| File | Purpose |
|------|---------|
| `supabase/functions/execute-workflow/index.ts` | Server-side workflow execution: condition evaluation, action dispatch, run recording |

### Dispatch Integration Points
| File:Line | Trigger Type | Context |
|-----------|-------------|---------|
| `src/components/FormRenderer.tsx:489` | `form_submitted` | Standard form submission |
| `src/components/feedback/FeedbackSurveyPage.tsx:285` | `detractor_alert` or `form_submitted` | Feedback submission (conditional on sentiment) |
| `src/components/waitlist/WaitlistLandingPage.tsx:165` | `waitlist_milestone` | Every waitlist signup (not milestone-gated) |
| `src/components/support/SupportSubmitPage.tsx:236` | `ticket_created` | Support ticket submission |
| `src/hooks/useTickets.ts:107,138` | `ticket_resolved` | Single + bulk ticket status update to `resolved` |

### Routing (`src/App.tsx:160-162`)
```
/workflows          -> Workflows (ProtectedRoute)
/workflows/new      -> WorkflowBuilder (ProtectedRoute)
/workflows/:id/edit -> WorkflowBuilder (ProtectedRoute)
```

### Navigation (`src/components/Navbar.tsx:49`)
- Workflows link with Zap icon added to main nav

### Plan Gating (`src/hooks/usePlanLimits.ts:69`)
- `workflows` feature requires `business` plan tier

---

## 2. E2E Flows

### Flow 1: Create Workflow
1. Navigate to `/workflows` -> `Workflows.tsx` renders `WorkflowList` (empty state with CTA)
2. Click "Create Workflow" -> navigates to `/workflows/new` -> `WorkflowBuilder.tsx`
3. Enter name + description, optionally pick template from dialog
4. Configure trigger via `TriggerNode` (select type, optional form scope, threshold/milestone)
5. Add condition/action steps via `WorkflowCanvas`
6. Click Save -> `validateWorkflow()` checks name, trigger type, at least one step
7. `createWorkflow()` inserts to `workflows` table with `active: false`
8. Redirects to `/workflows/{id}/edit`

**Verdict**: PASS -- Full flow works. Template application pre-fills all fields. Validation catches empty name, missing trigger, zero steps.

### Flow 2: Add Triggers / Conditions / Actions
- **Triggers** (6 types): `form_submitted`, `nps_below_threshold`, `ticket_created`, `waitlist_milestone`, `ticket_resolved`, `detractor_alert`. Each selectable with optional form scoping. Threshold/milestone inputs conditionally shown.
- **Conditions** (6 types): `field_equals`, `score_below`, `score_above`, `status_is`, `priority_is`, `count_exceeds`. Field selector with 7 field options. Operator selector with 5 options.
- **Actions** (6 types): `send_email`, `create_ticket`, `slack_message`, `fire_webhook`, `change_status`, `add_tag`. Each has type-specific config fields (email recipient + template, ticket subject/description/priority, Slack message, webhook URL + event type, status selector, tag name).

**Verdict**: PARTIAL PASS -- UI is complete and well-structured. However, the `operator` field selected in ConditionNode is **ignored** by the edge function's `evaluateCondition` (see P1 issue #2).

### Flow 3: Test Workflow (Manual Trigger)
- No "Test Run" or "Dry Run" button exists in the builder UI.
- Workflows can only be triggered via actual events (form submission, ticket creation, etc.).
- Run history is viewable in the "Runs" tab when editing an existing workflow.

**Verdict**: FAIL -- No manual test capability. Users must activate the workflow and wait for a real trigger event to verify behavior.

### Flow 4: Activate / Deactivate
1. In `WorkflowBuilder.tsx`: Toggle switch (only shown when editing, line 146-154)
2. In `WorkflowList.tsx`: Inline switch per workflow card (line 113-116)
3. Both call `toggleWorkflow(id, active)` -> `updateWorkflow(id, { active })`
4. Edge function checks `active = true` before execution (line 334)

**Verdict**: PASS -- Clean toggle with toast notifications. Deactivated workflows are skipped during dispatch.

---

## 3. Cross-Dependencies

### Upstream (Dispatch triggers flow into workflows)
- **FormRenderer** (standard mode) -> dispatches `form_submitted`
- **FeedbackSurveyPage** (feedback mode) -> dispatches `detractor_alert` or `form_submitted`
- **SupportSubmitPage** (support mode) -> dispatches `ticket_created`
- **WaitlistLandingPage** (waitlist mode) -> dispatches `waitlist_milestone`
- **useTickets hook** -> dispatches `ticket_resolved` on status change

### Downstream (Workflow actions invoke other systems)
- **send_email** -> invokes `send-email` edge function
- **create_ticket** -> inserts into `tickets` table via service role
- **slack_message** -> invokes `slack-notify` edge function (looks up webhook URL from form settings)
- **fire_webhook** -> invokes `dispatch-webhook` edge function
- **change_status** -> updates `tickets.status` via service role
- **add_tag** -> finds/creates tag in `tags` table, upserts into `ticket_tags`

### Shared Systems
- **FeatureGate** (plan gating) -> `usePlanLimits` -> `business` plan required
- **WorkspaceContext** -> workspace scoping for all workflow queries
- **Supabase Realtime** -> both `workflows` and `workflow_runs` tables have realtime enabled
- **i18n** -> Full EN and HE translations (2 missing keys, see issues)

---

## 4. Parallelism Assessment

**Safe for parallel scanning**: YES

The workflow feature is **self-contained** with clear boundaries:
- Own database tables (`workflows`, `workflow_runs`) with no foreign keys to mode-specific tables
- Own routes (`/workflows/*`) not shared with other features
- Own components in `src/components/workflows/`
- Own hooks in `src/hooks/useWorkflows.ts`

**Integration points are fire-and-forget**: `dispatchWorkflowTrigger()` is called with `.catch(() => {})` and wrapped in try/catch that silently fails. This means workflow dispatch never blocks or breaks the calling feature.

**Risk**: The edge function's `create_ticket` action writes to the `tickets` table, which could interact with Support mode features. However, it uses service role (bypasses RLS) and is server-side only.

---

## 5. Code Architecture & Quality

### Workflow Engine Design
The engine follows a **linear pipeline** model: one trigger, followed by an ordered list of steps (conditions and actions executed sequentially). This is simpler than a DAG/graph model but sufficient for the current use cases.

**Strengths**:
- Clean type hierarchy: `WorkflowTriggerConfig` -> `WorkflowStep[]` -> `WorkflowCondition | WorkflowAction`
- `validateWorkflow()` performs structural validation before save
- `stepsToJson()` / `jsonToSteps()` handle serialization to/from JSONB
- Template system with `{{variable}}` interpolation in the edge function
- `generateStepId()` uses `crypto.randomUUID()` for unique IDs

**Weaknesses**:
- `jsonToSteps()` at line 202-210 has weak type narrowing: casts `unknown` to `Record<string, unknown>` without validation
- The engine uses `as unknown as Workflow[]` casts extensively in `useWorkflows.ts` (lines 30, 76-77, 84, 163) because `workflows` and `workflow_runs` tables are **not in the generated Supabase types** (`src/integrations/supabase/types.ts` has no mention of these tables). This means zero compile-time type safety for database operations.
- `TRIGGER_LABELS`, `TRIGGER_DESCRIPTIONS`, `CONDITION_LABELS`, `ACTION_LABELS`, `ACTION_DESCRIPTIONS` in `workflowEngine.ts` are hardcoded English strings that duplicate the i18n keys in `en.json`. These are unused (the components use `t()` with i18n keys instead).
- Validation error messages in `validateWorkflow()` (lines 156-188) are hardcoded English, not using i18n keys

### Node System
- **TriggerNode**: Fetches forms from Supabase for the form selector. Conditionally renders threshold/milestone inputs based on trigger type. Clean and focused.
- **ConditionNode**: Presents condition type, field, operator, value. Field options are hardcoded (7 fields). Operator options are hardcoded (5 operators). No dynamic field detection based on trigger context.
- **ActionNode**: Most complex node with 6 action types, each with custom config fields. Includes a collapsible template variables helper. HTTPS validation warning for webhook URLs (client-side only, not enforced on save or execution).
- **WorkflowCanvas**: Linear layout with arrow connectors between nodes. No drag-to-reorder. Steps can only be added at the bottom and removed individually.

### Template System
Three built-in templates: "NPS Alert Pipeline", "Waitlist Welcome", "Auto-Assign Billing Tickets". Template names/descriptions in the templates are hardcoded English (not i18n), though i18n keys exist for them at `workflows.template.*` but are **not used** anywhere.

---

## 6. Error Handling & Resilience

### Client-Side
- `dispatchWorkflowTrigger()` (`workflowEngine.ts:214-269`): Entirely fire-and-forget. Outer try/catch silences all errors. Inner `.catch(() => {})` on each edge function invocation. **No error logging or telemetry**.
- `handleSave()` in `WorkflowBuilder.tsx:78-116`: Shows toast on success/failure but doesn't log the specific error from `createWorkflow`/`updateWorkflow`.
- Validation runs before save, preventing structurally invalid workflows from being persisted.

### Server-Side (Edge Function)
- **Circular trigger prevention**: `execution_depth` parameter with `MAX_EXECUTION_DEPTH = 3` (line 11). However, the current edge function **never passes `execution_depth` forward** when creating tickets or other actions that might re-trigger workflows. The `execution_depth` is received in the request body but not forwarded to any subsequent workflow invocations. This means the guard only works if the *caller* passes `execution_depth`, which `dispatchWorkflowTrigger()` does (line 259: `execution_depth: 0`), but ticket creation via `create_ticket` action doesn't dispatch any workflow trigger itself (it's a direct DB insert), so circular triggers through ticket creation are actually impossible. The guard is still useful for potential future scenarios.
- **Rate limiting**: `MAX_RUNS_PER_HOUR = 100` per workflow (line 12). Checks `workflow_runs` count in last hour. Returns 200 with error (not 429), which means the caller won't retry.
- **Individual action failures**: If an action fails, the run continues executing remaining actions (line 386-389 comment: "Continue executing remaining actions despite failure"). Run status is set to `failed` but partial results are recorded. This is a reasonable design choice.
- **Run recording**: Creates a `workflow_runs` record at start (`status: running`), updates it at end with `steps_executed`, `status`, `error`, `completed_at`.

### Run Count Race Condition
`run_count` in the `workflows` table is updated via `(workflow.run_count || 0) + 1` at `execute-workflow/index.ts:415`. This is a **read-modify-write** pattern vulnerable to race conditions under concurrent execution. Two simultaneous runs could both read `run_count = 5` and both write `6`, losing a count. Should use SQL `run_count = run_count + 1` or an RPC.

---

## 7. Database & Query Optimization

### Schema
- `workflows` table: JSONB columns for `trigger_config` and `steps`. No JSONB indexes (e.g., GIN on `trigger_config->>'type'`), which means the `dispatchWorkflowTrigger()` query at `workflowEngine.ts:232-236` must scan all active workflows per workspace and filter in application code.
- `workflow_runs` table: Good indexes on `workflow_id`, `status`, `started_at DESC`. `steps_executed` is JSONB (array of step results).
- Partial index `idx_workflows_active` (`WHERE active = true`) is a good optimization for the dispatch path.

### Query Patterns
- `useWorkflows` fetches `SELECT *` for all workflows in a workspace. No pagination.
- `useWorkflowRuns` fetches with `LIMIT 50` ordered by `started_at DESC`. Adequate for the UI.
- `dispatchWorkflowTrigger()` at `workflowEngine.ts:232-236` executes two queries per trigger event: (1) lookup form's workspace_id, (2) fetch all active workflows for that workspace. The workspace lookup could be avoided if the caller passed `workspace_id` directly.
- Realtime subscriptions on both tables re-fetch full data sets on any change event (lines 53, 189 in `useWorkflows.ts`). This is inefficient but consistent with the codebase pattern.

### RLS Policy State (after migrations 023-025)
- `workflows`: Full CRUD for authenticated workspace members. Correct.
- `workflow_runs`: SELECT only for authenticated workspace members. No INSERT/UPDATE/DELETE policies for clients. The edge function uses service role (bypasses RLS). Correct.

### Missing: No UPDATE policy on `workflow_runs`
The edge function updates `workflow_runs` at line 399-407 using service role, which bypasses RLS. This is correct. However, there is **no client-side UPDATE policy** either, which means if the client tried to update a run (which it doesn't currently), it would be blocked. This is fine for the current design.

---

## 8. Documentation Audit

### i18n Coverage
- **English (`en.json`)**: Comprehensive. ~170 workflow-related keys covering all UI strings, trigger/condition/action labels, validation messages, template descriptions.
- **Hebrew (`he.json`)**: Complete parity with English. All 170+ keys translated.
- **Missing keys** (2): `workflows.action.webhookUrlHttpsRequired` and `workflows.action.templateVariables` are referenced in `ActionNode.tsx` (lines 203, 263) but do **not exist** in either `en.json` or `he.json`. The UI will display the raw key string instead of translated text.

### Code Comments
- All files have clear header comments identifying the feature and agent.
- Agent 15 agent markers (`/* === AGENT 15: ... === */`) at integration points in `FormRenderer.tsx`, `FeedbackSurveyPage.tsx`, `WaitlistLandingPage.tsx`, `SupportSubmitPage.tsx`.

### Inline Documentation
- Template variables reference in `ActionNode.tsx` (lines 46-51) lists all available `{{variables}}` grouped by context. Good for user discoverability.
- Edge function has inline comments explaining each action type's behavior.

### External Documentation
- Referenced in `docs/edge-functions.md`, `docs/database-schema.md`, `docs/deployment.md` (grep results).

---

## 9. Product Growth & Innovation

### Current Capabilities
- 6 trigger types covering all 4 form modes
- 6 condition types with field/operator/value configuration
- 6 action types (email, ticket creation, Slack, webhook, status change, tagging)
- Template library with 3 pre-built workflows
- Execution history with step-level detail
- Rate limiting and circular trigger prevention
- Plan gating (business tier)

### Growth Opportunities
1. **Manual Test/Dry Run**: Add a "Test" button that simulates a trigger with sample data and shows what would happen without actually executing actions.
2. **Branching Logic**: Current model is linear. Support for if/else branches (true path / false path) would enable more complex workflows.
3. **Step Reordering**: No drag-and-drop reorder for steps. Steps can only be added at the bottom.
4. **Delay/Wait Step**: Add a timed delay between actions (e.g., "wait 24 hours then send follow-up email").
5. **Workflow Logs Dashboard**: A workspace-wide view of all workflow runs across all workflows, filterable by status/date.
6. **Condition Groups**: AND/OR logic for multiple conditions (currently conditions are evaluated sequentially with short-circuit on failure).
7. **Webhook URL Validation**: Enforce HTTPS-only on save, not just a client-side warning.
8. **Usage Analytics**: Track which workflows run most, average execution time, failure rates.
9. **Workflow Versioning**: Save versions when editing, allow rollback.
10. **NPS Threshold Trigger**: The `nps_below_threshold` trigger type is defined but never dispatched (see P1 issue #3).

---

## 10. Issues Found

### P0 (Critical)
*None*

### P1 (High)

**P1-1: `operator` field in ConditionNode is ignored by the edge function**
- **Location**: `supabase/functions/execute-workflow/index.ts:49-78` vs `src/components/workflows/ConditionNode.tsx:26-32`
- **Impact**: The ConditionNode UI allows users to select 5 operators (`equals`, `not_equals`, `less_than`, `greater_than`, `contains`), and the `operator` property is stored on the condition. However, the edge function's `evaluateCondition()` function **completely ignores the `operator` field** and instead hardcodes behavior per condition type (e.g., `field_equals` always does `===`, `score_below` always does `<`). If a user selects `field_equals` with operator `not_equals`, the condition will still evaluate as `equals`. The `not_equals` and `contains` operators are **never evaluated** anywhere.
- **Fix**: Refactor `evaluateCondition()` to use the `operator` field instead of (or in addition to) the condition `type`, or remove the operator selector from the UI if it's not meant to be used.

**P1-2: `waitlist_milestone` trigger fires on every waitlist signup, not just milestones**
- **Location**: `src/components/waitlist/WaitlistLandingPage.tsx:165`
- **Impact**: `dispatchWorkflowTrigger(formId, "waitlist_milestone", ...)` is called after every successful waitlist entry insertion, regardless of whether a milestone was reached. This means any workflow with a `waitlist_milestone` trigger will fire on **every single signup**, not when specific milestones (e.g., 100, 500, 1000) are reached. The trigger config has a `milestone` field, but the dispatch-side never checks it. The edge function evaluates conditions after dispatch, but the trigger itself is semantically wrong -- the trigger event should only fire when the milestone is actually reached.
- **Fix**: Check the current waitlist entry count against the configured milestone before dispatching, or rename the trigger to `waitlist_entry_created` and let conditions handle milestone logic.

**P1-3: `nps_below_threshold` trigger type is defined but never dispatched**
- **Location**: `src/lib/workflowEngine.ts:12` (defined), not found in any `dispatchWorkflowTrigger` call
- **Impact**: Users can create workflows with `nps_below_threshold` as the trigger, configure a threshold, and activate the workflow, but it will **never fire**. The feedback submission page (`FeedbackSurveyPage.tsx:285`) dispatches `detractor_alert` for NPS 0-6 or `form_submitted` otherwise, but never `nps_below_threshold`. Any workflow using this trigger type is effectively dead.
- **Fix**: Add a dispatch for `nps_below_threshold` in `FeedbackSurveyPage.tsx` when `npsScore < threshold`, or remove the trigger type from the UI if it's intentionally covered by `detractor_alert`.

**P1-4: Missing i18n keys cause raw key strings in UI**
- **Location**: `src/components/workflows/ActionNode.tsx:203,263`
- **Keys**: `workflows.action.webhookUrlHttpsRequired` (HTTPS warning text), `workflows.action.templateVariables` (template variables section header)
- **Impact**: These strings render as raw key paths in both English and Hebrew locales.
- **Fix**: Add the missing keys to both `src/i18n/locales/en.json` and `src/i18n/locales/he.json`.

### P2 (Medium)

**P2-1: `workflows` and `workflow_runs` tables missing from generated Supabase types**
- **Location**: `src/integrations/supabase/types.ts` (no workflow-related types)
- **Impact**: All Supabase operations in `useWorkflows.ts` use `as unknown as Workflow` casts (lines 30, 76-77, 84, 163). Zero compile-time type safety. Any schema drift (e.g., column rename) would only be caught at runtime.
- **Fix**: Run `npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts` to regenerate types.

**P2-2: `run_count` update has race condition**
- **Location**: `supabase/functions/execute-workflow/index.ts:411-417`
- **Impact**: `run_count: (workflow.run_count || 0) + 1` is a read-modify-write pattern. Under concurrent workflow execution, counts can be lost.
- **Fix**: Use a Supabase RPC or raw SQL: `run_count = run_count + 1`.

**P2-3: No manual test/dry-run capability**
- **Location**: `src/pages/WorkflowBuilder.tsx` (no test button)
- **Impact**: Users cannot verify workflow behavior without activating it and waiting for a real trigger event. This increases the risk of deploying broken workflows and reduces confidence during development.
- **Fix**: Add a "Test Run" button that invokes the edge function with sample data and `dry_run: true` flag.

**P2-4: Hardcoded English strings in `workflowEngine.ts` templates**
- **Location**: `src/lib/workflowEngine.ts:280-407` (WORKFLOW_TEMPLATES)
- **Impact**: Template names ("NPS Alert Pipeline") and descriptions are hardcoded English in the template definitions. The i18n keys exist (`workflows.template.*`) but are never used. When a template is applied, the hardcoded English strings are set as the workflow name/description.
- **Fix**: Use i18n keys in the template dialog display and only set the i18n key or a default value when applying.

**P2-5: Hardcoded English strings in `validateWorkflow()` error messages**
- **Location**: `src/lib/workflowEngine.ts:148-189`
- **Impact**: Validation error messages like "Workflow name is required" are hardcoded English. i18n keys exist at `workflows.validation.*` but are **not used** in `validateWorkflow()`. The caller in `WorkflowBuilder.tsx:83` displays these raw English strings via toast.
- **Fix**: Return error keys from `validateWorkflow()` and translate them in the caller, or accept a `t` function parameter.

**P2-6: Unused duplicate label constants in `workflowEngine.ts`**
- **Location**: `src/lib/workflowEngine.ts:21-37, 52-59, 74-90`
- **Impact**: `TRIGGER_LABELS`, `TRIGGER_DESCRIPTIONS`, `CONDITION_LABELS`, `ACTION_LABELS`, `ACTION_DESCRIPTIONS` are exported but never imported or used anywhere. The components use i18n keys instead. Dead code.
- **Fix**: Remove the unused constants.

**P2-7: Webhook URL HTTPS enforcement is client-side warning only**
- **Location**: `src/components/workflows/ActionNode.tsx:201-205`
- **Impact**: The HTTPS warning is displayed below the input but the user can still save a workflow with an HTTP URL. The edge function's `fire_webhook` action (line 197-206) does not validate the URL scheme. Webhooks to HTTP endpoints would send data in plaintext.
- **Fix**: Add server-side validation in the edge function and/or in `validateWorkflow()`.

---

## 11. Recommended Fix Path

### Phase 1: Critical Fixes (P1s)
1. **Fix condition operator evaluation** (P1-1): Refactor `evaluateCondition()` in the edge function to dispatch on the `operator` field for `field_equals` type, supporting all 5 operators. Estimated: 1-2 hours.
2. **Fix waitlist_milestone trigger** (P1-2): Add entry count check before dispatching `waitlist_milestone`, comparing against the trigger's configured milestone value. Estimated: 1 hour.
3. **Add `nps_below_threshold` dispatch** (P1-3): In `FeedbackSurveyPage.tsx`, dispatch `nps_below_threshold` when NPS score is below the threshold. Alternatively, document that `detractor_alert` covers this and remove the trigger type. Estimated: 30 min.
4. **Add missing i18n keys** (P1-4): Add `workflows.action.webhookUrlHttpsRequired` and `workflows.action.templateVariables` to both `en.json` and `he.json`. Estimated: 10 min.

### Phase 2: Quality Improvements (P2s)
5. **Regenerate Supabase types** (P2-1): Run type generation command. Estimated: 5 min.
6. **Fix run_count race condition** (P2-2): Change to SQL-level increment. Estimated: 30 min.
7. **Use i18n keys in templates and validation** (P2-4, P2-5): Replace hardcoded English with i18n lookups. Estimated: 1 hour.
8. **Remove dead code** (P2-6): Delete unused label/description constants. Estimated: 10 min.
9. **Add HTTPS validation on save** (P2-7): Add URL scheme check in `validateWorkflow()`. Estimated: 20 min.

### Phase 3: Enhancements (P2-3 + Growth)
10. **Add test/dry-run capability** (P2-3): Add a "Test Run" button and `dry_run` mode to the edge function. Estimated: 3-4 hours.
11. **Step reordering**: Add drag-and-drop step reorder in canvas. Estimated: 2-3 hours.
12. **Branching logic**: Support if/else paths for conditions. Estimated: 8+ hours (significant architecture change).
