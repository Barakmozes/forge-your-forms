# Scan Report: Support Tickets
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/TicketDetail.tsx` — Individual ticket view with message thread

### Components
- `src/components/support/SupportSubmitPage.tsx` — Public ticket form: name, email, subject, description, category, priority
- `src/components/support/SupportDashboard.tsx` — Admin: Kanban board, ticket list, analytics, bulk ops, canned responses (~58.5KB)
- `src/components/support/TicketTrackingPage.tsx` — Public: ticket lookup by number + email, conversation view, customer reply

### Hooks
- `src/hooks/useTickets.ts` — CRUD + realtime (* all events) + auto-close (resolved >7d → closed)
- `src/hooks/useTicketMessages.ts` — Messages CRUD + realtime (INSERT)
- `src/hooks/useSupportAnalytics.ts` — Stats: total, open, in_progress, resolved, unassigned, avg resolution/response time, SLA breaches
- `src/hooks/useCannedResponses.ts` — Workspace-scoped canned response CRUD
- `src/hooks/useTags.ts` — Tag CRUD + ticket-tag junction management

### Database Tables
- `tickets` — RLS: member CRUD, public insert (if form active + mode=support), customer read. Triggers: auto-number, resolved_at, updated_at. Realtime: yes
- `ticket_messages` — RLS: member read all, customer read non-internal, public insert. Triggers: first_response_at. Realtime: yes
- `canned_responses` — RLS: workspace member CRUD. No triggers. Realtime: no
- `tags` — RLS: workspace member CRUD. No triggers. Realtime: no
- `ticket_tags` — RLS: workspace member CRUD. No triggers. Realtime: no

### Lib
- `src/lib/ticketNumber.ts` — formatTicketNumber() (TICK-001 format)

### Routes
- `/forms/:id` — Protected, SupportDashboard (when mode=support)
- `/forms/:id/tickets/:ticketId` — Protected, TicketDetail
- `/f/:id` — Public, SupportSubmitPage
- `/track/:formId` — Public, TicketTrackingPage
- `/canned-responses` — Protected, CannedResponses page

## 2. End-to-End Flow Status

- **Public ticket submission → auto-number → confirmation**: WORKS — insert ticket (trigger assigns TICK-NNN) + initial message
- **Customer tracking → lookup → reply**: WORKS — TicketTrackingPage: number + email lookup, non-internal messages, customer replies
- **Admin: Kanban board drag-and-drop**: WORKS — DnD status changes (open → in_progress → resolved → closed)
- **Admin: ticket list + search + filters**: WORKS — search, status, priority, assignment, tag filters
- **Admin: bulk status update**: WORKS — select multiple → update status
- **Admin: agent reply + internal notes**: WORKS — sender_type=agent, is_internal flag
- **Auto-close resolved tickets**: WORKS — client-side: resolved >7 days → status=closed on dashboard load
- **SLA tracking (first_response_at)**: WORKS — trigger sets on first agent message
- **SLA breach detection**: WORKS — useSupportAnalytics flags tickets open >24h without response
- **Canned response management**: WORKS — CRUD workspace-scoped templates
- **Tag management + ticket tagging**: WORKS — tags CRUD + ticket_tags junction
- **Webhook/Slack/Workflow triggers**: WORKS — dispatched from SupportSubmitPage
- **Realtime updates**: WORKS — tickets (*) and ticket_messages (INSERT)
- **Notification on ticket assignment**: WORKS — trigger creates notification when assigned_to changes

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | No support | 0 support inboxes | YES — canAccessMode("support") returns false |
| Pro | No support | 0 support inboxes | YES — client-side |
| Growth | 1 support inbox | 25k subs/mo | YES — client-side |
| Business | Unlimited | Unlimited | YES — client-side |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Forms (05)
- **Depended on by**: AI Features (13) — AiCannedSuggestions, classify-ticket, churn scoring
- **Shared files**: None (isolated components)

## 5. i18n Status

- t() coverage: ALL strings wrapped (support.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **classify-ticket edge function not wired**: Exists but never called from SupportSubmitPage or useTickets. Tickets are not auto-classified. File: `supabase/functions/classify-ticket/index.ts`

### P2 — Medium
- **SupportDashboard very large**: ~58.5KB single file. Could benefit from component splitting for maintainability.
- **Auto-close is client-side only**: Resolved tickets only close when a user loads the dashboard. No server-side cron. File: `src/hooks/useTickets.ts`
- **Customer ticket tracking has open SELECT policy**: Any anonymous user can query tickets table. File: RLS policies
- **Canned responses not realtime**: No subscription — stale if another user adds templates. File: `src/hooks/useCannedResponses.ts`

## 8. Recommended Fix Path

1. Wire classify-ticket edge function into SupportSubmitPage (call after ticket insert) or useTickets
2. Consider splitting SupportDashboard into sub-components (KanbanBoard, TicketTable, AnalyticsPanel)
3. Consider server-side auto-close via scheduled edge function or DB cron
