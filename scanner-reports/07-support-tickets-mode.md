# Scanner Report: Feature 07 -- Support/Tickets Mode

**Scanner Agent**: Feature 07 -- Support/Tickets Mode
**Date**: 2026-03-15
**Status**: Complete

---

## 1. Touchpoints

### Pages
| File | Purpose |
|------|---------|
| `src/pages/PublicForm.tsx` | Public dispatcher; routes `mode=support` to `SupportSubmitPage` (line 223-232) |
| `src/pages/FormDashboard.tsx` | Admin dispatcher; routes `mode=support` to `SupportDashboard` (line 84-85) |
| `src/pages/TicketDetail.tsx` | Individual ticket detail page (agent view) -- 753 lines |
| `src/pages/TicketTracking.tsx` | Thin wrapper passing URL params to `TicketTrackingPage` |
| `src/pages/CannedResponses.tsx` | Canned responses CRUD management page |

### Components
| File | Purpose |
|------|---------|
| `src/components/support/SupportSubmitPage.tsx` | Public ticket submission form (615 lines) |
| `src/components/support/SupportDashboard.tsx` | Admin dashboard: overview stats, Kanban board, tickets table (1374 lines) |
| `src/components/support/TicketTrackingPage.tsx` | Public ticket tracking + conversation view (259 lines) |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useTickets.ts` | Ticket CRUD, bulk update, auto-close resolved >7d, realtime (167 lines) |
| `src/hooks/useTicketMessages.ts` | Messages CRUD + realtime subscription on INSERT (67 lines) |
| `src/hooks/useCannedResponses.ts` | Workspace-scoped canned response CRUD (67 lines) |
| `src/hooks/useTags.ts` | Tag CRUD + ticket_tags junction management (75 lines) |
| `src/hooks/useSupportAnalytics.ts` | Derived stats from tickets: SLA breaches, resolution times, volume, workload (132 lines) |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/ticketNumber.ts` | `formatTicketNumber(num)` -- client-side TICK-NNN formatter (3 lines, unused in production) |

### Database Tables (Migration 006 + 011 + 025)
| Table | Purpose |
|-------|---------|
| `tickets` | Main ticket table with auto-generated ticket_number |
| `ticket_messages` | Threaded messages (agent/customer/system, internal notes) |
| `canned_responses` | Pre-written reply templates (workspace-scoped) |
| `tags` | Workspace-scoped tags |
| `ticket_tags` | Junction table for ticket-tag relationships |

### Database Triggers
| Trigger | Table | Behavior |
|---------|-------|----------|
| `on_ticket_created_number` | tickets (BEFORE INSERT) | Auto-generates TICK-NNN via `generate_ticket_number()` |
| `on_ticket_resolved` | tickets (BEFORE UPDATE) | Sets `resolved_at` when status becomes `resolved`; updates `updated_at` |
| `on_ticket_message_created` | ticket_messages (AFTER INSERT) | Sets `first_response_at` on ticket (first agent message) |

### Routes (in `src/App.tsx`)
| Route | Component | Auth |
|-------|-----------|------|
| `/f/:id` | PublicForm -> SupportSubmitPage | Public |
| `/track/:formId` | TicketTracking -> TicketTrackingPage | Public |
| `/forms/:id` | FormDashboard -> SupportDashboard | Protected |
| `/forms/:id/tickets/:ticketId` | TicketDetailPage | Protected |
| `/canned-responses` | CannedResponses | Protected |

---

## 2. E2E Flows

### Flow 1: Submit Ticket (Public)
**Steps**: User visits `/f/:id` -> form loads with mode=support -> fills name, email, subject, description, optional category/priority -> submits -> ticket inserted via Supabase -> initial message inserted -> success screen with ticket number + tracking link

**Verdict**: PASS with gaps

**Evidence**:
- `SupportSubmitPage.tsx` validates all required fields (lines 142-181) including 20-char minimum for description
- Inserts ticket with `ticket_number: ""` (line 199), trigger auto-generates
- Inserts initial customer message (lines 213-221)
- Dispatches webhook, Slack, workflow triggers (lines 226-237)
- AI classification fire-and-forget (lines 239-241)
- Success screen shows ticket number + copy button + tracking URL (lines 287-379)

**Gaps**:
- Email stored as `email.trim()` without `.toLowerCase()` (line 202), but tracking page queries with `.toLowerCase()` (TicketTrackingPage line 55) -- case mismatch can cause lookup failure
- No rate limiting on public ticket submission
- No CAPTCHA or bot protection

### Flow 2: Track Ticket Status (Public)
**Steps**: Customer visits `/track/:formId` -> enters ticket number + email -> lookup query -> displays ticket status, messages, reply box

**Verdict**: PASS with gaps

**Evidence**:
- TicketTrackingPage queries tickets by form_id + ticket_number (uppercased) + email (lowercased) (lines 50-56)
- Filters out internal messages (`is_internal: false` at line 72)
- Reply box hidden for resolved/closed tickets (line 231)
- Customer can send replies (lines 79-114)

**Gaps**:
- Email case mismatch with storage (as noted above)
- No realtime subscription -- customer must refresh to see new agent replies
- Reply adds optimistic local message with `crypto.randomUUID()` (line 100) but doesn't handle duplicates if realtime were added later
- No loading spinner during ticket lookup (only button text changes)

### Flow 3: Agent Responds to Ticket
**Steps**: Agent navigates to `/forms/:id/tickets/:ticketId` -> views conversation thread -> types reply -> optionally marks as internal note -> sends

**Verdict**: PASS

**Evidence**:
- TicketDetail.tsx fetches ticket, messages, workspace members, tags (lines 112-161)
- `addMessage()` from `useTicketMessages` inserts with sender_type="agent" (lines 190-213)
- Internal notes toggled via `isInternal` state (lines 93, 396-401)
- Canned response insertion (lines 403-429, 215-217)
- Realtime on messages via useTicketMessages (INSERT only)

**Gaps**:
- Agent reply box has no character limit
- No confirmation before sending internal notes (could be accidentally sent as public)

### Flow 4: Change Ticket Status/Priority (Admin)
**Steps**: Agent uses dropdowns in TicketDetail sidebar -> status/priority/category/assignment updated

**Verdict**: PASS

**Evidence**:
- `updateField()` in TicketDetail.tsx (lines 163-188) updates any field
- Status/priority via Select dropdowns (lines 459-494)
- Category via Input with onBlur save (lines 496-514)
- Assignment via workspace members dropdown (lines 516-541)

**Gaps**:
- Category field saves onBlur -- if user navigates away before blur, change is lost
- No audit trail for status changes

### Flow 5: Bulk Operations
**Steps**: Select tickets via checkboxes in table view -> choose target status -> apply

**Verdict**: PASS

**Evidence**:
- SupportDashboard.tsx has checkbox selection (lines 553-563)
- `toggleSelectAll()` (lines 565-571)
- `bulkUpdateStatus()` from useTickets hook (lines 122-152)
- Bulk action bar appears when tickets selected (lines 1207-1240)

**Gaps**:
- No confirmation dialog for bulk actions
- No bulk priority change, only bulk status change
- Bulk action clears selection but doesn't re-validate if filtered tickets changed

### Flow 6: Kanban Board (Drag & Drop)
**Steps**: Tickets displayed in columns (open/in_progress/waiting/resolved) -> drag ticket to new column -> status updates

**Verdict**: PASS with gaps

**Evidence**:
- DndContext with PointerSensor (activation distance 8px) (lines 455-457)
- KanbanColumn with droppable zones (lines 383-422)
- KanbanCard with draggable behavior (lines 323-372)
- DragOverlay for visual feedback (lines 1191-1195)
- `handleDragEnd` calls `handleStatusChange` (lines 540-551)

**Gaps**:
- `onNavigate` prop is passed to KanbanColumn but NEVER USED inside the component (line 383: destructured as `{ status, statusLabel, tickets: columnTickets, dropHereLabel }` -- `onNavigate` is omitted). Kanban cards have no way to navigate to ticket detail.
- "closed" status column excluded from Kanban (`KANBAN_COLUMNS` at line 144 only includes 4 statuses)
- No keyboard accessibility for drag-and-drop

### Flow 7: Canned Responses Management
**Steps**: Navigate to `/canned-responses` -> create/edit/delete pre-written responses

**Verdict**: PASS with gaps

**Evidence**:
- Full CRUD via `useCannedResponses` hook (lines 27-38 in CannedResponses.tsx)
- Dialog for create/edit (lines 141-172)
- Delete without confirmation (line 77-81)
- Workspace-scoped via `currentWorkspace?.id` (line 26)

**Gaps**:
- Delete has no confirmation dialog
- No search/filter on canned responses list
- Empty workspace ID passed as `""` if no workspace selected (line 26)

### Flow 8: Tags Management
**Steps**: In TicketDetail sidebar -> search for tags -> add/remove tags from ticket

**Verdict**: PASS

**Evidence**:
- Tag search with filtered suggestions (lines 235-242 in TicketDetail.tsx)
- Add tag (lines 219-225), remove tag (lines 227-233)
- Tags displayed with color indicators (lines 574-602)

### Flow 9: SLA Tracking
**Steps**: Analytics hook computes SLA breaches -> alert banner on dashboard

**Verdict**: PASS

**Evidence**:
- `slaBreaches` computed in `useSupportAnalytics` (lines 97-106): tickets >24h without first_response_at
- Alert banner in SupportDashboard (lines 688-736)
- SLA visual indicators on Kanban cards: red >48h, amber >24h (line 329)

**Gaps**:
- SLA threshold is hardcoded to 24h -- not configurable per workspace or form
- SLA breach "View Ticket" button navigates to `/forms/${formId}/tickets` which is a NONEXISTENT ROUTE

---

## 3. Cross-Dependencies

| Dependency | Used By | Notes |
|------------|---------|-------|
| `AuthContext` | TicketDetail.tsx | Gets `user.email` for agent sender info |
| `WorkspaceContext` | TicketDetail.tsx, CannedResponses.tsx, SupportDashboard.tsx | Gets `currentWorkspace.id` for scoped queries |
| `useTickets` | SupportDashboard.tsx | Provides tickets data + CRUD |
| `useSupportAnalytics` | SupportDashboard.tsx | Derives stats from tickets array |
| `useTicketMessages` | TicketDetail.tsx | Thread management |
| `useCannedResponses` | TicketDetail.tsx, CannedResponses.tsx | Template management |
| `useTags` | TicketDetail.tsx | Tag management |
| `@dnd-kit` | SupportDashboard.tsx | Kanban drag-and-drop |
| `recharts` | SupportDashboard.tsx | Volume, priority, category, resolution charts |
| Webhook system (Agent 9) | SupportSubmitPage.tsx | `dispatchWebhook` on ticket creation |
| Slack integration (Agent 10) | SupportSubmitPage.tsx | `dispatchSlackNotification` on ticket creation |
| Workflow engine (Agent 15) | SupportSubmitPage.tsx, useTickets.ts | Triggers on ticket creation and resolution |
| AI Classification (Agent 29) | SupportSubmitPage.tsx | `classifyTicket` fire-and-forget |
| AI Summary (Agent 12) | SupportDashboard.tsx | `AiSummaryWidget` + `useAiAnalysis` |
| AI Suggestions (Agent 13) | TicketDetail.tsx | `AiCannedSuggestions` component |
| At-Risk Widget (Agent 13) | SupportDashboard.tsx | `AtRiskWidget` in overview tab |
| Plan limits (Agent 7) | FormDashboard.tsx | Mode gating for support (requires "growth" plan) |

---

## 4. Parallelism Assessment

| Hook/Component | Parallel-Safe? | Risk |
|----------------|---------------|------|
| `useTickets` | Yes | Realtime re-fetches full list on any event. Auto-close logic runs on every fetch (lines 24-38 in useTickets.ts) which causes extra writes. |
| `useTicketMessages` | Yes | Realtime appends new messages. No dedup check. |
| `useCannedResponses` | Yes | No realtime -- uses local state only. |
| `useTags` | Yes | No realtime -- uses local state only. |
| `generate_ticket_number()` | RISK | DB function uses `MAX(ticket_number)` without explicit locking (006_support_tables.sql line 184). Concurrent inserts could generate duplicate numbers. The UNIQUE constraint (line 22) would cause one to fail, but retries are not implemented. |

---

## 5. Auth & RBAC Audit

### RLS Policies (after hardening in migration 025)

| Table | Operation | Policy | Assessment |
|-------|-----------|--------|------------|
| tickets | SELECT (member) | `tickets_select_member` -- workspace member check | OK |
| tickets | SELECT (customer) | `tickets_select_customer` -- active support forms only (025 hardened) | MEDIUM RISK: exposes all tickets for active support forms to anonymous users, filtered client-side by email+ticket_number |
| tickets | INSERT | `tickets_insert_public` -- active support form check | OK |
| tickets | UPDATE | `tickets_update_member` -- workspace member check | OK |
| tickets | DELETE | None | No delete capability (by design) |
| ticket_messages | SELECT (member) | `messages_select_member` -- workspace member via ticket->form | OK |
| ticket_messages | SELECT (customer) | `messages_select_customer` -- `NOT is_internal` filter | OK |
| ticket_messages | INSERT | `messages_insert_public` -- validates ticket exists, form active+support, not closed (025 hardened) | OK |
| canned_responses | CRUD | All workspace-member-scoped | OK |
| tags | CRUD | All workspace-member-scoped | OK |
| ticket_tags | SELECT/INSERT/DELETE | All workspace-member-scoped via ticket->form | OK |

### Remaining Concerns
1. **tickets_select_customer** allows anonymous enumeration of all tickets for any active support form. An attacker knowing a form_id could query all tickets (subjects, emails, priorities). Client-side email filter is not a security boundary.
2. **No ticket DELETE policy** -- tickets cannot be deleted, which is good for audit trail but may need consideration for GDPR data deletion requests.
3. **messages_insert_public** allows customer to reply to any non-closed ticket without email verification -- an attacker could impersonate a customer by guessing ticket_id.

---

## 6. Test Coverage Analysis

### Existing Tests
| Test File | Scope | Assessment |
|-----------|-------|------------|
| `src/test/lib/ticketNumber.test.ts` | `formatTicketNumber()` utility | 5 test cases, good coverage of edge cases |
| `src/test/hooks/useTickets.test.ts` | `useTickets` hook | 5 tests: fetch, loading state, CRUD method existence, status filter, realtime setup. Does NOT test auto-close, bulk operations, or error handling. |

### Missing Test Coverage
- **No tests for**: `useTicketMessages`, `useCannedResponses`, `useTags`, `useSupportAnalytics`
- **No component tests for**: SupportSubmitPage, SupportDashboard, TicketTrackingPage, TicketDetail, CannedResponses
- **No E2E tests** for any ticket flow
- **No test for**: Kanban drag-and-drop, bulk operations, SLA computation, email case handling

---

## 7. Code Architecture & Quality

### Strengths
- Clean separation of concerns: hooks for data, components for UI, analytics hook for derived stats
- Consistent use of TypeScript enums from Supabase generated types
- Good loading states with skeleton components in SupportDashboard
- Internationalization (i18n) throughout all support components
- RTL support with `ltr:/rtl:` Tailwind classes
- Fire-and-forget pattern for AI classification prevents blocking the ticket submission

### Issues
1. **SupportDashboard.tsx is 1374 lines** -- a monolithic component containing Kanban cards, columns, tooltips, skeletons, and the main dashboard. Should be split into sub-components.
2. **`formatTicketNumber` utility is unused** -- the actual ticket number generation is done server-side by the DB trigger. The client-side utility exists but is never imported outside tests.
3. **Duplicated status/priority color maps** -- `STATUS_COLORS`, `PRIORITY_COLORS` etc. are defined in both SupportDashboard.tsx and TicketDetail.tsx and TicketTrackingPage.tsx with slight variations.
4. **Auto-close logic runs on every fetch** in `useTickets.ts` (lines 24-38) -- this fires DB writes on every page load/navigation, which is wasteful and should be a server-side cron or trigger.
5. **No pagination** -- `useTickets` fetches ALL tickets with `select("*")` (line 17). Will not scale for forms with thousands of tickets.

---

## 8. Error Handling & Resilience

### Error Handling Patterns
| Component | Pattern | Assessment |
|-----------|---------|------------|
| SupportSubmitPage | try/catch with toast.error (line 249-256) | OK -- surfaces error message |
| TicketTrackingPage | Silent failure on lookup (no error toast if Supabase returns error) | GAP: line 50-63, error from `.select()` is ignored |
| TicketDetail | toast with destructive variant (lines 173-178, 202-207) | OK |
| useTickets | Errors silently swallowed on fetch (line 16-21); returned as `{ error }` on mutations | MIXED |
| useTicketMessages | Error silently swallowed on fetch (line 14-18) | GAP |
| useCannedResponses | Error silently swallowed on fetch (line 13-19) | GAP |
| useTags | Error silently swallowed on fetch (line 13-17) | GAP |

### Resilience Gaps
1. **No retry logic** on any Supabase query
2. **No error boundary** specific to support components (relies on global ErrorBoundary)
3. **Optimistic local updates** in useTickets.ts (lines 100-103, 129-132) but no rollback on failure
4. **classifyTicket** in SupportSubmitPage is fire-and-forget with silent catch (lines 131-134) -- appropriate for enhancement but logs only to console

---

## 9. Responsive Design Audit

### SupportSubmitPage (Public)
- Grid: `grid-cols-1 sm:grid-cols-2` for name/email row (line 441) -- OK
- Responsive padding: `px-4 py-8 sm:py-12` (line 387) -- OK
- Max width container: `max-w-2xl` (line 393) -- OK
- Touch targets: Submit button `h-12` (line 583) -- meets 44px minimum
- **Verdict**: Good responsive design

### SupportDashboard (Admin)
- Filter bar: `flex-col sm:flex-row` (line 739) -- OK
- Stats grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (line 802) -- OK
- Charts: `ResponsiveContainer width="100%"` throughout -- OK
- Kanban: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (line 1176) -- OK
- Table: `overflow-x-auto` wrapper (line 1260) with hidden columns at breakpoints (md/lg) -- OK
- Tabs: `w-full sm:w-auto` for TabsList (line 786) -- OK
- **Verdict**: Good responsive design

### TicketTrackingPage (Public)
- Grid: `grid-cols-1 sm:grid-cols-2` for inputs (line 133) -- OK
- Max width: `max-w-2xl` (line 119) -- OK
- Messages: `ltr:ml-4 ltr:sm:ml-8` responsive margins (line 213) -- OK
- **Verdict**: Good responsive design

### TicketDetail (Admin)
- Two-column layout: `grid-cols-1 lg:grid-cols-10` (line 304) -- OK
- Left panel 70% / right 30% at lg: `lg:col-span-7` / `lg:col-span-3` -- OK
- Reply controls: `flex-wrap gap-2` (line 387) -- OK
- **Verdict**: Good responsive design

### CannedResponses
- Cards grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (line 114) -- OK
- Edit/delete buttons: classes have `min-h-[44px] min-w-[44px]` (lines 121-124) -- Good touch targets
- **Verdict**: Good responsive design

---

## 10. Database & Query Optimization

### Indexes (from migration 006)
| Index | Columns | Assessment |
|-------|---------|------------|
| `idx_tickets_form` | `tickets(form_id)` | OK -- used by most queries |
| `idx_tickets_status` | `tickets(form_id, status)` | OK -- used by status filter |
| `idx_tickets_assigned` | `tickets(assigned_to)` | OK |
| `idx_tickets_number` | `tickets(ticket_number)` | OK -- used by tracking lookup |
| `idx_ticket_messages_ticket` | `ticket_messages(ticket_id)` | OK |
| `idx_canned_responses_workspace` | `canned_responses(workspace_id)` | OK |
| `idx_tags_workspace` | `tags(workspace_id)` | OK |
| `idx_tickets_resolved_at` (011) | `tickets(status, resolved_at) WHERE status='resolved'` | OK -- partial index |

### Missing Indexes
- No composite index on `tickets(form_id, ticket_number, submitted_by_email)` for tracking page lookup
- No index on `ticket_messages(ticket_id, is_internal)` for customer message filtering

### Query Optimization Issues
1. **No pagination** -- `useTickets` fetches all tickets for a form (line 17). For high-volume support forms this will degrade.
2. **Auto-close writes on every fetch** -- `useTickets` (lines 24-38) updates resolved tickets >7 days old on every component mount/refetch. This is a client-side cron anti-pattern.
3. **N+1 in TicketDetail workspace members** -- fetches workspace_members, then fetches profiles in a separate query (lines 143-161).
4. **Full refetch on any realtime event** in useTickets (line 52-54) -- `event: "*"` triggers refetch for every INSERT/UPDATE/DELETE, even on fields that don't matter.
5. **Agent workload shows UUID** -- the tickets table has `assigned_to` as UUID. SupportDashboard displays raw UUID in the "Assigned To" column (line 1357) and in agent workload chart (line 1060).

### Realtime Configuration
- `tickets` and `ticket_messages` added to `supabase_realtime` publication (006 lines 261-262)
- `useTickets` subscribes to `*` events (all) -- good, catches status updates
- `useTicketMessages` subscribes to INSERT only -- misses message edits/deletes (but neither is implemented)

---

## 11. Accessibility Audit

### Strengths
- Labels with `htmlFor` properly associated with inputs (SupportSubmitPage lines 443-459)
- `aria-hidden="true"` on decorative asterisks (line 445)
- `aria-label` on copy button (line 335)
- `aria-label` on checkbox select all / per-ticket (lines 1271, 1307)
- Semantic form element with `onSubmit` (line 439)
- Required fields marked with `required` attribute on inputs

### Gaps
1. **No skip navigation link** on public pages
2. **Kanban board has no keyboard accessibility** -- drag-and-drop requires pointer interaction, no keyboard alternative for status change
3. **Table rows have `cursor-pointer`** but no click handler and no `tabIndex` or keyboard navigation
4. **Tag remove buttons** use plain `<button>` with no accessible text other than the `title` attribute (TicketDetail line 596-598)
5. **Color-only status/priority indicators** -- while text labels exist alongside colors, chart tooltips and Kanban cards rely heavily on color coding
6. **TicketTrackingPage inputs** lack `aria-required` attributes
7. **Message thread** has no `role="log"` or live region for realtime updates
8. **SLA alert** has no `role="alert"` -- uses `<Alert>` component which may or may not set the role

---

## 12. SEO Audit (Public Pages)

### SupportSubmitPage (`/f/:id`)
- No `<title>` tag management (SPA with Vite, no document.title updates)
- No meta description
- No Open Graph tags
- No structured data (e.g., `ContactPage` schema)
- Dynamic content only -- not crawlable without SSR/prerendering

### TicketTrackingPage (`/track/:formId`)
- Same issues as above
- No `<title>` update
- No robots directives (tracking pages probably should be `noindex`)

### Assessment
SEO is not a priority for these pages since they are functional forms/tracking tools rather than content pages. However, the public submit page could benefit from basic title/description for sharing.

---

## 13. Documentation Audit

### Inline Documentation
- Good use of section comments in SupportDashboard (e.g., `// --- Types ---`, `// --- Constants ---`)
- Agent attribution comments (e.g., `/* === AGENT 9: Webhook import === */`) throughout
- JSDoc: None present in any support file
- README for support feature: None

### CLAUDE.md Coverage
- Support mode architecture documented in sections 3, 4, 13
- Database schema for all support tables documented
- Triggers documented
- Routes documented
- Hooks listed with descriptions

---

## 14. Product Growth & Innovation (7 Lenses)

### 1. User Engagement
- **Strength**: Kanban board provides visual ticket management; SLA alerts create urgency
- **Opportunity**: Add ticket satisfaction survey (CSAT) after resolution; email notifications to customers on status change

### 2. Conversion
- **Strength**: Public submission form is clean and fast
- **Opportunity**: Add file attachment support for ticket descriptions; add knowledge base / FAQ deflection before ticket creation

### 3. Retention
- **Strength**: AI classification and canned responses speed up agent workflows
- **Opportunity**: Add saved filters/views for the ticket list; agent performance reports

### 4. Monetization
- **Strength**: Support mode gated to "growth" plan
- **Opportunity**: Tier SLA features (custom SLA thresholds, escalation rules) to enterprise plan

### 5. Viral/Network
- **Strength**: Ticket tracking URLs are shareable
- **Opportunity**: Customer satisfaction ratings visible in analytics

### 6. Data/Analytics
- **Strength**: Good analytics: volume, priority breakdown, category, agent workload, SLA, resolution trend
- **Opportunity**: Add first-response-time trend, customer satisfaction trend, tag-based analytics

### 7. Developer Experience
- **Strength**: Clean hook abstraction, typed Supabase queries
- **Opportunity**: Extract Kanban into a reusable component; add pagination utilities; centralize status/priority color maps

---

## 15. Issues Found

### P0 -- Critical

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Table rows have `cursor-pointer` but NO `onClick` handler -- clicking a ticket row in the table view does nothing, misleading users | UX/Functionality | High | `src/components/support/SupportDashboard.tsx` | 1299 | Users cannot navigate to ticket detail from the table view |
| 2 | "View All Tickets" and SLA "View Ticket" buttons navigate to `/forms/${formId}/tickets` which is a NONEXISTENT ROUTE (404) | Routing/Functionality | High | `src/components/support/SupportDashboard.tsx` | 679, 720 | Broken navigation -- users see 404 page |
| 3 | `onNavigate` prop passed to KanbanColumn but NEVER destructured/used -- Kanban cards have no way to navigate to ticket detail | UX/Functionality | High | `src/components/support/SupportDashboard.tsx` | 379, 383 | Users cannot open ticket detail from Kanban board |
| 4 | Email case mismatch: ticket stores `email.trim()` (no lowercase), but tracking lookup uses `.toLowerCase()` -- customers who typed uppercase email cannot find their ticket | Data Integrity | High | `src/components/support/SupportSubmitPage.tsx`, `src/components/support/TicketTrackingPage.tsx` | 202, 55 | Ticket tracking fails for users with uppercase email |

### P1 -- High

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 5 | `tickets_select_customer` RLS policy allows anonymous enumeration of ALL tickets for any active support form (subjects, emails, priorities exposed) | Security | High | `supabase/migrations/025_policy_hardening.sql` | 113-122 | Information disclosure -- attacker can read all ticket data |
| 6 | `messages_insert_public` allows any user to reply to any non-closed ticket without email verification -- impersonation possible | Security | Medium | `supabase/migrations/025_policy_hardening.sql` | 83-94 | Attacker could inject messages into any ticket by guessing ticket_id |
| 7 | No pagination on ticket fetches -- `select("*")` loads ALL tickets for a form | Performance | High | `src/hooks/useTickets.ts` | 17 | Dashboard will degrade/crash for forms with thousands of tickets |
| 8 | Auto-close logic fires DB writes on EVERY page load/refetch (resolved >7d tickets) | Performance | High | `src/hooks/useTickets.ts` | 24-38 | Unnecessary writes; potential race conditions with concurrent sessions |
| 9 | `generate_ticket_number()` SQL function uses `MAX()` without explicit row-level locking | Data Integrity | Medium | `supabase/migrations/006_support_tables.sql` | 184-195 | Concurrent inserts could generate duplicate numbers (UNIQUE constraint catches but no retry) |
| 10 | Assigned-to column shows raw UUID instead of user email/name | UX | High | `src/components/support/SupportDashboard.tsx` | 1357 | Meaningless data displayed to agents |
| 11 | Delete canned response has no confirmation dialog | UX | High | `src/pages/CannedResponses.tsx` | 77-81 | Accidental data loss |

### P2 -- Medium

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 12 | SLA threshold hardcoded to 24 hours, not configurable | Feature Gap | High | `src/hooks/useSupportAnalytics.ts` | 103 | One-size-fits-all SLA may not suit all use cases |
| 13 | TicketTrackingPage silently ignores Supabase errors on lookup query | Error Handling | High | `src/components/support/TicketTrackingPage.tsx` | 50-63 | Users see "no ticket found" when the issue is a server error |
| 14 | No realtime subscription on TicketTrackingPage -- customer must refresh to see agent replies | UX | High | `src/components/support/TicketTrackingPage.tsx` | -- | Delayed communication |
| 15 | Status/priority color maps duplicated across 3 files with slight variations | Maintainability | High | Multiple files | -- | Risk of inconsistency when colors are updated |
| 16 | SupportDashboard.tsx is 1374 lines -- monolithic component | Maintainability | High | `src/components/support/SupportDashboard.tsx` | -- | Difficult to maintain and test |
| 17 | `formatTicketNumber` utility is unused in production (only used in tests) | Dead Code | High | `src/lib/ticketNumber.ts` | 1-3 | Confusion about where numbering logic lives |
| 18 | Fetch errors silently swallowed in useTicketMessages, useCannedResponses, useTags | Error Handling | High | Multiple hooks | -- | Silent failures with no user feedback |
| 19 | Kanban board has no keyboard accessibility -- pointer-only interaction | Accessibility | High | `src/components/support/SupportDashboard.tsx` | 323-372 | WCAG violation for keyboard users |
| 20 | No rate limiting or CAPTCHA on public ticket submission | Security | Medium | `src/components/support/SupportSubmitPage.tsx` | -- | Spam/abuse vector |
| 21 | Agent workload chart uses UUID as label instead of email/name | UX | High | `src/hooks/useSupportAnalytics.ts` | 82-85 | Meaningless chart labels |
| 22 | No ticket delete capability for GDPR compliance | Compliance | Medium | -- | -- | Cannot fulfill right-to-erasure requests |
| 23 | TicketDetail reply box has no character limit | UX | Low | `src/pages/TicketDetail.tsx` | 377-386 | Potential for extremely long messages |
| 24 | No composite index on `(form_id, ticket_number, submitted_by_email)` for tracking lookups | Performance | Medium | `supabase/migrations/006_support_tables.sql` | -- | Slower tracking queries at scale |

---

## 16. Recommended Fix Path

### Phase 1 -- Critical P0 Fixes (Immediate)
1. **Fix table row navigation**: Add `onClick={() => navigate(`/forms/${formId}/tickets/${ticket.id}`)}` to TableRow (SupportDashboard.tsx line 1297-1300)
2. **Fix broken route**: Either add a `/forms/:id/tickets` route in App.tsx, or change the "View All Tickets" button to navigate to the tickets tab within the dashboard (e.g., set active tab)
3. **Fix Kanban navigation**: Destructure and use `onNavigate` in KanbanColumn, or add click handler on KanbanCard
4. **Fix email case**: Add `.toLowerCase()` to `submitted_by_email` in SupportSubmitPage.tsx line 202

### Phase 2 -- High Priority P1 Fixes (This Sprint)
5. **Harden tickets_select_customer**: Replace with an RPC function that requires both ticket_number AND email match, rather than exposing all tickets
6. **Validate message sender**: Add email match check to `messages_insert_public` RLS policy or use an RPC function
7. **Add pagination**: Implement cursor-based pagination in useTickets with `.range()` query
8. **Move auto-close to server**: Create a Supabase cron job or pg_cron extension for auto-close logic; remove from client
9. **Add advisory lock** to `generate_ticket_number()` or use a sequence
10. **Resolve assigned_to display**: Join profiles table or store email alongside UUID
11. **Add confirmation dialog** to canned response delete

### Phase 3 -- Medium Priority P2 Fixes (Next Sprint)
12. Make SLA threshold configurable in form settings
13. Add error handling to TicketTrackingPage lookup
14. Add realtime subscription to TicketTrackingPage
15. Extract shared status/priority color maps to a shared constants file
16. Split SupportDashboard into sub-components
17. Either use formatTicketNumber or remove it
18. Add error toasts to hook fetch failures
19. Add keyboard navigation alternative for Kanban
20. Add rate limiting to ticket submission (Supabase Edge Function or client-side throttle)
