# AGENT 3: Mode-Specific Features — Ready-to-Copy Prompts

## AGENT IDENTITY & RULES
Copy this preamble into every chat session for Agent 3:

```
You are Agent 3 (Mode-Specific Features) for FormForge — an independent 
SaaS platform for forms, waitlists, feedback/NPS, and support tickets.

Tech stack: Vite + React 18 + TypeScript + Supabase + shadcn/ui + TailwindCSS.
Charts: Recharts ^2.15.4. Drag & Drop: @dnd-kit/core + @dnd-kit/sortable.

CRITICAL RULES:
- Always use @/ import alias — never relative ../../
- Never modify existing migration files — create new ones (010+)
- Run npm run lint before declaring work complete
- Run npx tsc --noEmit to type-check
- All data queries scoped by workspace_id or form_id
- Protected pages: useToast() from @/hooks/use-toast
- Public pages: toast from sonner — NEVER MIX
- No "use client" — Vite SPA, NOT Next.js
- Emerald/green primary palette
- Realtime: subscribe to INSERT, UPDATE, DELETE events

YOUR OWNED FILES:
- src/components/waitlist/ (all files)
- src/components/feedback/ (all files)
- src/components/support/ (all files)
- src/components/NotificationPanel.tsx (NEW)
- src/hooks/useWaitlist.ts, useWaitlistAnalytics.ts
- src/hooks/useFeedback.ts, useFeedbackAnalytics.ts
- src/hooks/useTickets.ts, useTicketMessages.ts
- src/hooks/useCannedResponses.ts, useTags.ts, useSupportAnalytics.ts
- src/hooks/useNotifications.ts (NEW)
- src/pages/WaitlistEntries.tsx, TicketDetail.tsx, TicketTracking.tsx, CannedResponses.tsx
- src/lib/npsCalculator.ts, referralCode.ts, ticketNumber.ts
- supabase/migrations/010_* through 012_*

DO NOT TOUCH:
- src/pages/Forms.tsx, FormBuilder.tsx (Agent 2)
- src/components/FormRenderer.tsx (Agent 2)
- src/contexts/ (Agent 1)
- Settings pages (Agent 1)
- Landing/pricing pages (Agent 4)
- src/test/ (Agent 4)

The GitHub repo is: https://github.com/Barakmozes/forge-your-forms
Clone it and read CLAUDE.md before starting any task.
```

---

## PROMPT 3.1 — Waitlist Mode Enhancements
```
TASK: Enhance Waitlist Mode with settings, batch invites, exports, realtime.

1. Waitlist Settings (read from forms.settings JSONB):
   - require_name: show name field on landing
   - show_position: show "You're #X" after signup
   - show_count: show "Join X+ others" counter
   - enable_referrals: show referral URL post-signup
   - referral_boost: positions to boost per referral (default 1)
   - WaitlistLandingPage.tsx conditionally renders based on these

2. Batch Invite:
   - "Invite Top N" button → number input dialog
   - Changes top N from 'waiting' to 'invited'
   - Creates waitlist_invites records
   - "Invite Selected" for checkbox-selected entries

3. Export:
   - "Export CSV" — all columns
   - "Export Emails Only" — emails only, one per line
   - Both respect current filters/search

4. Fix Realtime in useWaitlist.ts:
   - Add UPDATE and DELETE events (currently INSERT only)
   - Status changes reflect in local state

5. Analytics in WaitlistDashboard.tsx:
   - Signup Growth: area chart cumulative + daily overlay (Recharts)
   - Source Breakdown: pie (Direct vs Referral)
   - Referral Leaderboard: top 10 by referral_count
   - Stats cards: Total, Today, This Week, Referral Rate

VERIFY: Settings toggle controls, batch invite works, CSV exports, 
realtime reflects changes. Lint + type-check pass.
```

---

## PROMPT 3.2 — Feedback Mode Enhancements
```
TASK: Enhance Feedback analytics and survey experience.

1. Enhanced NPS Dashboard (FeedbackDashboard.tsx):
   - NPS Score card: large (-100 to +100), color (red<0, yellow 0-30, green>30), 
     delta from previous period
   - NPS Breakdown donut: Promoters/Passives/Detractors (Recharts PieChart)
   - NPS Over Time: line chart week/month, last 6 months, toggle view
   - Response Volume: stacked bar by sentiment
   - At-Risk Clients: detractors with score, comment, date
     "Flag for follow-up" + "Mark as resolved" (update flagged boolean)
   - Category breakdown: NPS per category horizontal bar

2. Date Range Filter:
   - Last 7d, 30d, 90d, All Time
   - All charts update based on selection
   - useFeedbackAnalytics accepts dateRange param

3. Survey Page (FeedbackSurveyPage.tsx):
   - Step-by-step mode: one question at a time, progress indicator
   - Animated NPS button selection (highlight scale)
   - Category selector from form.settings.categories
   - Custom questions from form.fields

4. Fix Realtime in useFeedback.ts:
   - Add UPDATE event for flagged/resolved changes

5. Migration 010_feedback_enhancements.sql:
   - Index on feedback_responses(form_id, created_at)
   - Index on feedback_responses(form_id, sentiment)

VERIFY: NPS = ((promoters-detractors)/total)*100 correct. 
Date filter works. Flagging persists. Lint + type-check pass.
```

---

## PROMPT 3.3 — Support Mode Kanban Board
```
TASK: Build Kanban board for ticket management.

1. Kanban View in SupportDashboard.tsx:
   - Toggle: "Kanban" | "Table" (default Kanban)
   - Columns: Open, In Progress, Waiting on Customer, Resolved
   - Cards: ticket#, subject (50 chars), priority badge (urgent=red, 
     high=orange, medium=yellow, low=gray), agent avatar, 
     category tag, time since created
   - Drag between columns → update status (@dnd-kit, already installed)
   - Click → /forms/[formId]/tickets/[ticketId]
   - Unassigned: dashed border

2. Filters (both views):
   - Status, Priority, Assigned To, Category, Search, Date range
   - Filter bar above board/table

3. Bulk Actions (Table view):
   - Checkbox selection
   - Bulk assign, change status, change priority

4. SLA Monitor:
   - Yellow: tickets >24h without first_response_at
   - Red: tickets >48h without first_response_at
   - Sorted by urgency
   - "Assign & Respond" quick action

VERIFY: Drag updates status, filters work both views, 
SLA flags correct tickets. Lint + type-check pass.
```

---

## PROMPT 3.4 — Support Analytics & Ticket Detail
```
TASK: Support analytics and ticket detail enhancement.

1. Analytics (SupportDashboard.tsx tab/section):
   - Cards: Open, Unassigned, Avg First Response, Avg Resolution, Resolved Today
   - Ticket Volume: bar chart new vs resolved/day (30 days)
   - Priority Breakdown: donut of open by priority
   - Agent Workload: horizontal bars per agent
   - Category Analysis: bar by category
   - Resolution Metrics: avg resolution time trend over weeks

2. Enhance TicketDetail.tsx:
   Left panel (70%):
   - Header: subject, ticket#, status + priority badges
   - Thread: customer=left/gray, agent=right/blue, internal=yellow "(Internal)"
   - Reply box: textarea + "Insert Canned Response" searchable dropdown 
     (from useCannedResponses) + "Send Reply" + "Internal Note" buttons
   
   Right sidebar (30%):
   - Status, priority, category, assigned agent dropdowns (save immediately)
   - Requester: name, email, ticket count
   - Tags: editable chips with autocomplete (useTags)
   - Timeline: created, assigned, first response, status changes

3. Auto-close (migration 011_auto_close_tickets.sql):
   - Tickets with status='resolved' for 7+ days → 'closed'
   - Implement as client-side check on dashboard load

VERIFY: Analytics correct, thread styled right, canned responses work, 
internal notes hidden from tracking page. Lint + type-check pass.
```

---

## PROMPT 3.5 — Unified Notifications System
```
TASK: Build notification system across all modes.

1. src/hooks/useNotifications.ts:
   - Fetch for current user, ordered DESC
   - markAsRead, markAllAsRead, delete
   - Realtime subscription (INSERT)
   - Filter: all vs unread

2. src/components/NotificationPanel.tsx:
   - Dropdown from navbar bell (shadcn Popover)
   - Unread count badge
   - List: type icon, title, message, time ago, read indicator
   - Click → navigate to notification.link
   - "Mark All Read" button
   - Icons by type:
     • new_submission → FileText
     • detractor_alert → AlertTriangle (red)
     • ticket_assigned → UserCheck
     • ticket_reply → MessageSquare
     • waitlist_milestone → Users

3. Ensure notifications are created:
   - Detractor: verify existing trigger works
   - Migration 012_notification_triggers.sql:
     • New submission → notification for workspace owner
     • Ticket assigned → notification for assigned agent

4. Update Navbar.tsx:
   - Replace static bell with NotificationPanel
   - Show unread count badge

VERIFY: Bell shows correct count, click navigates, 
detractor alerts appear realtime. Lint + type-check pass.
```
