# FormForge — Multi-Agent Development Master Plan

## DISCONNECT FROM LOVABLE — Independent Project Declaration

**This project is 100% independent.** No Lovable dependencies, no Lovable deployment, no Lovable references. All development is done via local IDE + GitHub + Supabase direct. The README.md must be rewritten as the first task.

---

## CURRENT STATE ANALYSIS (What Exists — 30 Commits)

### ✅ Infrastructure Already Built
| Component | Status | Notes |
|-----------|--------|-------|
| Vite + React 18 + TypeScript | ✅ Done | Port 8080, `@/` alias configured |
| Supabase Auth (email/password) | ✅ Done | Auto-creates profile + workspace on signup |
| Database Schema (14 tables) | ✅ Done | All 4 modes have tables, RLS, triggers |
| 9 PostgreSQL Enums | ✅ Done | form_mode, ticket_status, etc. |
| 48 shadcn/ui Components | ✅ Done | Full component library |
| Routing (React Router v6) | ✅ Done | All protected + public routes |
| AuthContext + WorkspaceContext | ✅ Done | Provider hierarchy in place |
| Form Builder (drag & drop) | ✅ Done | dnd-kit, field palette, properties panel |
| Public Form Renderer | ✅ Done | Mode dispatch in PublicForm.tsx |
| Waitlist Mode (full) | ✅ Done | Landing page, referral engine, admin dashboard |
| Feedback Mode (full) | ✅ Done | NPS survey, sentiment, analytics dashboard |
| Support Mode (full) | ✅ Done | Ticket creation, tracking, messages, canned responses |
| Dashboard Dispatcher | ✅ Done | FormDashboard.tsx routes by mode |
| Realtime Subscriptions | ✅ Done | On 6 tables |
| 8 SQL Migrations | ✅ Done | 001-006 + 2 auto-generated |

### ❌ Known Gaps & Technical Debt (from CLAUDE.md §15)
1. TypeScript strict mode OFF — no null checks
2. No automated tests (Vitest configured, only example test)
3. TanStack Query underutilized — no caching/retry
4. Dual toast systems (useToast + sonner)
5. No pagination on any query
6. Realtime only watches INSERT (except useTickets)
7. No error logging service
8. Overlapping auto-generated migrations
9. No deployment pipeline
10. No pricing/billing integration
11. No settings page (workspace, profile, members)
12. No embed/iframe generation
13. No landing page / marketing site
14. No branding customization UI in form builder
15. README still references Lovable

---

## TECH STACK (Locked — All Agents Must Use)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.3.1 |
| Language | TypeScript | ^5.8.3 |
| Bundler | Vite | ^5.4.19 |
| Backend | Supabase JS | ^2.98.0 |
| Server State | TanStack React Query | ^5.83.0 |
| Routing | React Router DOM | ^6.30.1 |
| Forms | React Hook Form + Zod | ^7.61.1 / ^3.25.76 |
| UI Components | shadcn/ui (Radix primitives) | 48 components |
| Styling | TailwindCSS | ^3.4.17 |
| Charts | Recharts | ^2.15.4 |
| Drag & Drop | @dnd-kit | ^6.3.1 |
| Icons | Lucide React | ^0.462.0 |
| Testing | Vitest + Testing Library | ^3.2.4 |

---

## GLOBAL DEVELOPMENT RULES (All Agents Must Follow)

```
1. Always use @/ import alias — never relative ../../
2. Never modify existing migration files — create new ones (007+)
3. Run `npm run lint` before declaring work complete
4. Run `npx tsc --noEmit` to type-check
5. All data queries must be scoped by workspace_id or form_id
6. Never install new dependencies without explicit approval
7. Protected pages: useToast() from @/hooks/use-toast
   Public pages: toast from sonner — NEVER MIX
8. No "use client" directives — this is Vite SPA, NOT Next.js
9. No global state stores — use Context + local state patterns
10. Every new table must have RLS enabled + policies
11. New enum values require ALTER TYPE in SQL migration
12. Components: PascalCase | Hooks: camelCase use- prefix
13. Follow existing patterns: mode dispatch, hook pattern, realtime pattern
14. UI: shadcn/ui + Tailwind only — emerald/green primary palette
15. File structure: pages/ components/{mode}/ hooks/ lib/
```

---

## AGENT ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    FORMFORGE DEVELOPMENT                         │
│                                                                  │
│  AGENT 1          AGENT 2          AGENT 3         AGENT 4      │
│  ──────────       ──────────       ──────────      ──────────   │
│  Foundation &     Core Engine      Mode-Specific   Polish &     │
│  Infrastructure   Enhancement      Features        Production   │
│                                                                  │
│  • Lovable        • Form Builder   • Waitlist       • Testing   │
│    Cleanup          Upgrades         Enhancements   • Deploy    │
│  • Auth Fixes     • Submissions    • Feedback        Pipeline  │
│  • Settings         + Pagination     Enhancements   • Pricing  │
│    Pages          • Dashboard      • Support          Billing  │
│  • DB Migrations    Rebuild          Enhancements   • Landing  │
│  • Error Infra    • React Query    • Cross-mode       Page     │
│  • Type Safety      Migration        Analytics      • SEO      │
│  • README         • Branding UI    • Notifications  • Embed    │
│                   • Embed/Share                     • Perf      │
│                                                                  │
│  FILES:           FILES:           FILES:           FILES:      │
│  contexts/        pages/Forms*     components/      pages/      │
│  lib/             pages/Sub*         waitlist/        Index.tsx │
│  hooks/use-toast  pages/Form*        feedback/        Pricing  │
│  integrations/    components/          support/      scripts/   │
│  supabase/migr*     FormRenderer   hooks/use*       tests/     │
│  Settings pages   components/        (mode hooks)   deploy/    │
│  App.tsx routes     FormBuilder    pages/Ticket*               │
│                                                                  │
│  NO OVERLAP ──── CLEAR BOUNDARIES ──── SYNCED FRAMEWORK        │
└─────────────────────────────────────────────────────────────────┘
```

---

# AGENT 1: Foundation & Infrastructure

## Role
Cleanup Lovable remnants, fix infrastructure, build missing settings/workspace pages, upgrade type safety, establish error handling patterns, create migration workflow.

## Owned Files (Exclusive)
- `README.md` (rewrite)
- `src/contexts/AuthContext.tsx` (fixes only)
- `src/contexts/WorkspaceContext.tsx` (fixes only)
- `src/hooks/use-toast.ts` (consolidation)
- `src/lib/utils.ts` (additions)
- `src/lib/errorLogger.ts` (NEW)
- `src/pages/Settings.tsx` (NEW)
- `src/pages/WorkspaceSettings.tsx` (NEW)
- `src/pages/ProfileSettings.tsx` (NEW)
- `src/components/SettingsTabs.tsx` (NEW)
- `src/components/MembersManager.tsx` (NEW)
- `src/App.tsx` (route additions ONLY)
- `supabase/migrations/007_*` through `009_*`
- All config files (`vite.config.ts`, `tsconfig.app.json`, etc.)

## DO NOT TOUCH
- Any component in `components/waitlist/`, `components/feedback/`, `components/support/`
- Any mode-specific hook (`useWaitlist`, `useFeedback`, `useTickets`, etc.)
- `pages/Forms.tsx`, `pages/FormBuilder.tsx`, `pages/Submissions.tsx`
- `pages/PublicForm.tsx`, `pages/FormDashboard.tsx`

---

### AGENT 1 — PROMPT 1.1: Lovable Cleanup & README

```
You are building FormForge — an independent SaaS platform for forms, waitlists, 
feedback/NPS, and support tickets. Built with Vite + React 18 + Supabase.

READ FIRST: The file CLAUDE.md in the project root. Follow ALL rules there.

TASK: Remove all Lovable references and rewrite the README.

1. Rewrite README.md:
   - Project name: FormForge
   - Description: Unified SaaS platform with 4 modes (Standard Forms, Waitlist, 
     Feedback/NPS, Support Tickets)
   - Tech stack: Vite, React 18, TypeScript, Supabase, shadcn/ui, TailwindCSS
   - Setup: git clone → npm install → copy .env.example → npm run dev
   - Development commands table (from CLAUDE.md §10)
   - Project structure overview
   - Contributing guidelines
   - Remove ALL references to Lovable, lovable.dev, or lovable project IDs

2. Create .env.example with:
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id

3. Search entire codebase for any string containing "lovable" or "Lovable" 
   and remove/replace. Check: index.html title/meta, package.json description, 
   any comments.

VERIFY:
- grep -ri "lovable" src/ public/ *.md *.json *.html returns nothing
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 1 — PROMPT 1.2: Error Handling Infrastructure

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Create centralized error handling infrastructure.

1. Create src/lib/errorLogger.ts:
   - Export function logError(error: Error, context?: Record<string, any>)
   - For now, console.error with structured format: timestamp, message, context
   - Export function logWarning(message: string, context?: Record<string, any>)
   - Design so we can later plug in Sentry/LogRocket by changing this one file
   - Export type ErrorContext = { component?: string; action?: string; userId?: string }

2. Create src/hooks/useErrorHandler.ts:
   - Hook that wraps async operations with try/catch + logError
   - Returns { handleAsync: (fn, context) => Promise<result | null> }
   - On error: calls logError AND shows toast (using useToast pattern)
   - Example: const { handleAsync } = useErrorHandler();
     const result = await handleAsync(
       () => supabase.from('forms').select('*'),
       { component: 'Forms', action: 'fetchForms' }
     );

3. Create src/components/ErrorBoundary.tsx:
   - React error boundary component
   - Catches render errors, calls logError
   - Shows fallback UI: "Something went wrong" + "Try Again" button
   - Wrap this around main routes in App.tsx

VERIFY:
- Import and use in at least one existing page as proof of concept
- npm run lint passes
- npx tsc --noEmit passes

DO NOT modify any mode-specific components or hooks.
```

---

### AGENT 1 — PROMPT 1.3: Settings & Workspace Management Pages

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build the Settings pages (workspace, members, profile).

1. Create src/pages/Settings.tsx:
   - Tabbed layout using shadcn Tabs component
   - Three tabs: "Workspace", "Members", "Profile"
   - Uses useWorkspace() and useAuth() contexts
   - Route: /settings (add to App.tsx as ProtectedRoute)

2. Workspace Tab:
   - Display and edit workspace name
   - Display workspace slug (read-only)
   - Save button → updates workspaces table via Supabase
   - Only owner role can edit (use get_workspace_role or check context)

3. Members Tab (src/components/MembersManager.tsx):
   - Fetch workspace_members joined with profiles
   - Table: avatar, name, email, role badge (owner/editor/viewer)
   - "Invite Member" button → Dialog with email input + role select
   - On invite: insert into workspace_members (check if user exists by email 
     in profiles table first)
   - Remove member button (owner only, cannot remove self)
   - Change role dropdown (owner only)

4. Profile Tab:
   - Display and edit: full_name, email (read-only), avatar_url
   - Avatar: upload to Supabase Storage bucket "avatars"
   - Save → updates profiles table

5. Add "Settings" link to Navbar.tsx (gear icon, after existing nav links)

VERIFY:
- All operations scoped to currentWorkspace.id
- RLS policies already exist for these tables (check CLAUDE.md §4)
- npm run lint passes  
- npx tsc --noEmit passes
- useToast() for all notifications (this is a protected page)
```

---

### AGENT 1 — PROMPT 1.4: Toast Consolidation & Type Safety Improvements

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Consolidate toast systems and improve type safety.

1. Toast Consolidation:
   - The file src/hooks/use-toast.ts and src/components/ui/use-toast.ts 
     both exist. Ensure all protected pages import from @/hooks/use-toast
   - Add a comment header to both files explaining the rule:
     // Protected pages: import { useToast } from "@/hooks/use-toast"
     // Public pages: import { toast } from "sonner"
   - Audit all pages and fix any incorrect imports

2. Create src/types/forms.ts — shared type definitions:
   - Export type FormMode = 'standard' | 'waitlist' | 'feedback' | 'support'
   - Export type FormStatus = 'draft' | 'active' | 'closed'
   - Export type WorkspaceRole = 'owner' | 'editor' | 'viewer'
   - Export interface FormField { id: string; type: string; label: string; 
     required: boolean; options?: string[]; placeholder?: string; 
     helpText?: string; validation?: Record<string, any> }
   - Export interface Form { id: string; title: string; description: string; 
     mode: FormMode; status: FormStatus; fields: FormField[]; 
     settings: Record<string, any>; branding: Record<string, any>;
     submission_count: number; workspace_id: string; created_by: string;
     created_at: string; updated_at: string }
   - Export similar interfaces for Submission, WaitlistEntry, 
     FeedbackResponse, Ticket, TicketMessage

3. Update src/integrations/supabase/types.ts if needed (or note that 
   it's auto-generated and create a types/database.ts that re-exports 
   with better naming)

VERIFY:
- grep for incorrect toast imports
- npm run lint passes
- npx tsc --noEmit passes
```

---

# AGENT 2: Core Engine Enhancement

## Role
Upgrade the form builder, submissions system, main dashboard, React Query migration, branding UI, and embed/share functionality.

## Owned Files (Exclusive)
- `src/pages/Forms.tsx`
- `src/pages/FormBuilder.tsx`
- `src/pages/FormPreview.tsx`
- `src/pages/Submissions.tsx`
- `src/pages/FormDashboard.tsx` (dashboard content only, not mode dispatch logic)
- `src/components/FormRenderer.tsx`
- `src/components/FormResponsesTab.tsx`
- `src/components/dashboard/` (NEW directory)
- `src/components/builder/` (NEW directory — form builder sub-components)
- `src/components/embed/` (NEW directory)
- `src/hooks/useForms.ts` (NEW)
- `src/hooks/useSubmissions.ts` (NEW)
- `src/hooks/usePagination.ts` (NEW)

## DO NOT TOUCH
- `src/contexts/` (Agent 1 owns)
- `src/components/waitlist/` (Agent 3 owns)
- `src/components/feedback/` (Agent 3 owns)
- `src/components/support/` (Agent 3 owns)
- Mode-specific hooks (`useWaitlist`, `useFeedback`, `useTickets`)
- Settings pages (Agent 1)
- Landing page or pricing (Agent 4)

---

### AGENT 2 — PROMPT 2.1: React Query Migration for Core Hooks

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Migrate core data fetching to TanStack React Query for caching, 
deduplication, and retry logic.

CONTEXT: Currently all hooks use raw Supabase calls with useState. 
TanStack React Query (v5) is already installed but underutilized. 
The QueryClient is already initialized in App.tsx.

1. Create src/hooks/useForms.ts:
   - useQuery for fetching forms list (scoped by workspace_id)
   - useMutation for create, update, delete form
   - queryKey pattern: ['forms', workspaceId]
   - On mutation success: invalidateQueries(['forms', workspaceId])
   - Keep Supabase client calls inside query/mutation functions

2. Create src/hooks/useSubmissions.ts:
   - useQuery for fetching submissions (scoped by form_id)
   - Support pagination: page, pageSize params
   - queryKey: ['submissions', formId, page, pageSize]
   - useMutation for delete submission
   - Include .range() for Supabase pagination

3. Create src/hooks/usePagination.ts:
   - Generic pagination hook: usePagination(totalCount, pageSize)
   - Returns: { page, setPage, totalPages, hasNext, hasPrev, 
     nextPage, prevPage, range: [from, to] }
   - Default pageSize: 25

4. Update src/pages/Forms.tsx to use useForms hook
5. Update src/pages/Submissions.tsx to use useSubmissions + usePagination

Pattern to follow:
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useForms(workspaceId: string) {
  const queryClient = useQueryClient();
  
  const formsQuery = useQuery({
    queryKey: ['forms', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const createForm = useMutation({
    mutationFn: async (newForm) => {
      const { data, error } = await supabase
        .from('forms').insert(newForm).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    },
  });

  return { ...formsQuery, createForm };
}
```

VERIFY:
- Forms page loads correctly with React Query
- Submissions page has pagination (25 per page)
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 2 — PROMPT 2.2: Form Builder Enhancement

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Enhance the form builder with missing features.

1. Add form-level settings panel (gear icon in top bar):
   Create src/components/builder/FormSettingsPanel.tsx
   - General: title, description, status toggle (draft/active/closed)
   - Submission Settings:
     • Custom thank-you message (textarea)
     • Redirect URL after submission (text input)
     • Limit one submission per email (toggle)
     • Close after N submissions (number input, 0 = unlimited)
   - Save all to forms.settings JSONB

2. Add field validation improvements:
   Update field properties panel (right panel in builder):
   - For text: min/max length inputs
   - For number: min/max value inputs
   - For email: auto-validates email format
   - For phone: regex pattern option
   - For file: max file size, allowed types

3. Add conditional logic (basic):
   Create src/components/builder/ConditionalLogic.tsx
   - Each field can have a "Show if" condition
   - Condition: [field_id] [is/is_not/contains] [value]
   - Store in field definition: { ...field, condition: { fieldId, operator, value } }
   - FormRenderer.tsx evaluates conditions to show/hide fields

4. Auto-save indicator:
   - Show "Saving..." → "Saved ✓" in top bar
   - Debounce saves (500ms after last change)
   - Save to forms.fields JSONB

VERIFY:
- Settings save and persist on reload
- Conditional logic works in preview
- Auto-save shows indicator
- npm run lint passes
- npx tsc --noEmit passes

DO NOT touch mode-specific components (waitlist/feedback/support).
```

---

### AGENT 2 — PROMPT 2.3: Dashboard Rebuild & Sharing Features

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Rebuild the main dashboard and add sharing/embed features.

1. Main Dashboard at / (currently Forms.tsx, enhance it):
   Create src/components/dashboard/DashboardHome.tsx
   - Welcome message with user's name (from useAuth)
   - Summary cards row:
     • Total Forms (icon per mode)
     • Total Submissions This Month
     • Submissions Today
     • Most Active Form (name + count)
   - Recent Submissions feed (last 10 across all forms):
     form name, respondent email, time ago (date-fns formatDistanceToNow)
   - Forms overview: mini cards for each active form — mode icon, title, 
     submission count, sparkline (Recharts)
   - Quick Actions: "Create Form", "View All Submissions"

2. Sharing features — create src/components/embed/SharePanel.tsx:
   - Triggered from form builder top bar "Share" button
   - Sheet/Dialog with tabs:
     a. "Link" tab: Public URL (/f/[form-id]) with copy button
     b. "Embed" tab: iframe code snippet with copy button
        <iframe src="https://yourapp.com/f/[id]" width="100%" 
        height="600" frameborder="0"></iframe>
     c. "QR Code" tab: Generate QR code for the public URL
        (use a simple SVG-based QR generator — no new dependency,
        or use the existing canvas API)

3. Add "Duplicate Form" action:
   - In Forms.tsx dropdown menu for each form card
   - Copies all form data except: id, submission_count, created_at
   - New title: "Copy of [original title]"
   - Status: draft

VERIFY:
- Dashboard shows real data from current workspace
- Share panel generates correct URLs
- Duplicate creates working copy
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 2 — PROMPT 2.4: Branding UI in Form Builder

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build the branding customization UI for forms.

1. Create src/components/builder/BrandingPanel.tsx:
   - Accessible from form builder sidebar or settings
   - Color picker for primary color (used on buttons, accents)
   - Color picker for background color/gradient
   - Logo upload (to Supabase Storage "branding" bucket)
   - Font selection: Inter, Plus Jakarta Sans, System Default
   - Corner radius: Sharp / Rounded / Pill
   - "Powered by FormForge" toggle (free tier = always on)
   - Preview thumbnail that updates in real-time

2. Save all branding to forms.branding JSONB:
   { primaryColor, backgroundColor, logoUrl, font, borderRadius, 
     showPoweredBy }

3. Apply branding in public pages:
   - Update FormRenderer.tsx to read form.branding and apply styles
   - CSS variables approach: set --ff-primary, --ff-bg, --ff-radius
     on the public page container
   - The WaitlistLandingPage already uses branding — ensure consistency

4. Create migration 007_branding_storage.sql:
   - Create Supabase Storage bucket "branding" if not exists
   - Add storage policy: authenticated users can upload to their 
     workspace path
   - Public can read all files in branding bucket

VERIFY:
- Branding changes reflect in form preview
- Public page uses branding colors
- Logo uploads and displays
- npm run lint passes
- npx tsc --noEmit passes
```

---

# AGENT 3: Mode-Specific Feature Enhancement

## Role
Enhance each of the 4 modes with missing features, improve analytics dashboards, fix realtime subscriptions, add cross-mode insights.

## Owned Files (Exclusive)
- `src/components/waitlist/WaitlistLandingPage.tsx`
- `src/components/waitlist/WaitlistDashboard.tsx`
- `src/components/feedback/FeedbackSurveyPage.tsx`
- `src/components/feedback/FeedbackDashboard.tsx`
- `src/components/support/SupportSubmitPage.tsx`
- `src/components/support/SupportDashboard.tsx`
- `src/components/support/TicketTrackingPage.tsx`
- `src/hooks/useWaitlist.ts`
- `src/hooks/useWaitlistAnalytics.ts`
- `src/hooks/useFeedback.ts`
- `src/hooks/useFeedbackAnalytics.ts`
- `src/hooks/useTickets.ts`
- `src/hooks/useTicketMessages.ts`
- `src/hooks/useCannedResponses.ts`
- `src/hooks/useTags.ts`
- `src/hooks/useSupportAnalytics.ts`
- `src/pages/WaitlistEntries.tsx`
- `src/pages/TicketDetail.tsx`
- `src/pages/TicketTracking.tsx`
- `src/pages/CannedResponses.tsx`
- `src/lib/npsCalculator.ts`
- `src/lib/referralCode.ts`
- `src/lib/ticketNumber.ts`
- `supabase/migrations/010_*` through `012_*`

## DO NOT TOUCH
- `src/pages/Forms.tsx` (Agent 2)
- `src/pages/FormBuilder.tsx` (Agent 2)
- `src/components/FormRenderer.tsx` (Agent 2)
- `src/contexts/` (Agent 1)
- Settings/profile pages (Agent 1)
- Landing page (Agent 4)

---

### AGENT 3 — PROMPT 3.1: Waitlist Mode Enhancements

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Enhance Waitlist Mode with missing features.

CONTEXT: Waitlist mode already has: landing page, referral engine, 
admin dashboard with entries table and basic analytics. Tables: 
waitlist_entries, waitlist_invites. All in place.

1. Waitlist Settings Integration:
   - In the waitlist form settings (stored in forms.settings JSONB), 
     ensure these work end-to-end:
     • require_name: boolean (show name field on landing page)
     • show_position: boolean (show "You're #X" after signup)
     • show_count: boolean (show "Join X+ others" on landing page)
     • enable_referrals: boolean (show referral URL after signup)
     • referral_boost: number (positions to boost per referral, default 1)
   - WaitlistLandingPage.tsx should read these from form.settings 
     and conditionally render

2. Batch Invite Improvement:
   In WaitlistDashboard.tsx or WaitlistEntries.tsx:
   - "Invite Top N" button → number input dialog
   - Changes status from 'waiting' to 'invited' for top N by position
   - Creates waitlist_invites records
   - Shows toast: "Invited N people"
   - Add "Invite Selected" for checkbox-selected entries

3. Export Improvements:
   - "Export CSV" — all columns
   - "Export Emails Only" — just emails, one per line
   - Both respect current filters/search

4. Fix Realtime:
   - useWaitlist.ts currently watches INSERT only
   - Add UPDATE and DELETE events to the channel subscription
   - When entry status changes (invited/joined), update local state

5. Waitlist-specific analytics improvements in WaitlistDashboard.tsx:
   - Signup Growth: area chart (cumulative) with daily overlay
   - Source Breakdown: pie chart (Direct vs Referral)
   - Referral Leaderboard: top 10 by referral_count
   - Stats cards: Total Signups, Today, This Week, Referral Rate

VERIFY:
- Settings toggle controls landing page rendering
- Batch invite works for top N
- CSV export includes all data
- Realtime reflects status changes
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 3 — PROMPT 3.2: Feedback Mode Enhancements

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Enhance Feedback Mode analytics and collection.

CONTEXT: Feedback mode has: NPS survey page, sentiment auto-classification, 
basic analytics. Tables: feedback_responses, feedback_alerts.

1. Enhanced NPS Dashboard (FeedbackDashboard.tsx):
   - NPS Score card: large display (-100 to +100), color-coded 
     (red < 0, yellow 0-30, green > 30), delta from previous period
   - NPS Breakdown donut: Promoters (green), Passives (yellow), 
     Detractors (red) with counts + percentages — use Recharts PieChart
   - NPS Over Time: line chart by week/month, last 6 months
     Toggle between weekly and monthly view
   - Response Volume: stacked bar chart by sentiment
   - At-Risk Clients section: recent detractors with score, comment, 
     date. "Flag for follow-up" and "Mark as resolved" buttons
     (update flagged boolean on feedback_responses)
   - Category breakdown: if categories configured, NPS per category 
     as horizontal bar chart

2. Date Range Filter:
   - Add to dashboard: Last 7d, 30d, 90d, All Time
   - All charts and stats update based on selection
   - useFeedbackAnalytics.ts should accept dateRange param

3. Survey Page Improvements (FeedbackSurveyPage.tsx):
   - Step-by-step mode: one question at a time with progress indicator
   - Animated NPS button selection (scale highlight)
   - Category selector if form.settings.categories is configured
   - Optional additional custom questions from form.fields

4. Fix Realtime:
   - useFeedback.ts: add UPDATE event subscription
   - When response is flagged/resolved, reflect in dashboard

5. Create migration 010_feedback_enhancements.sql:
   - Add index on feedback_responses(form_id, created_at) for 
     time-range queries
   - Add index on feedback_responses(form_id, sentiment) for 
     breakdown queries

VERIFY:
- NPS score calculates correctly: ((promoters - detractors) / total) * 100
- Date range filter works on all widgets
- Flagging detractors persists
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 3 — PROMPT 3.3: Support Mode — Kanban Board

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build the Kanban board for Support Mode ticket management.

CONTEXT: Support mode has: ticket table view, ticket detail with 
messages, canned responses. Missing: Kanban board, SLA monitoring.

1. Build Kanban View in SupportDashboard.tsx:
   - Dual-view toggle at top: "Kanban" | "Table" (default: Kanban)
   - Kanban columns: Open, In Progress, Waiting on Customer, Resolved
   - Each card shows: ticket number, subject (truncated 50 chars), 
     priority badge (urgent=red, high=orange, medium=yellow, low=gray),
     assigned agent avatar (or dashed border if unassigned),
     category tag, time since created (formatDistanceToNow)
   - Drag tickets between columns using @dnd-kit/core + @dnd-kit/sortable
     (already installed)
   - On drop: update ticket status via Supabase
   - Click card → navigate to /forms/[formId]/tickets/[ticketId]
   - Unassigned tickets: dashed border highlight

2. Filters (both views):
   - Status, Priority, Assigned To, Category, Search text, Date range
   - Filter bar above the board/table
   - Filters apply to both Kanban and Table views

3. Bulk Actions (Table view):
   - Checkbox selection
   - Bulk assign to agent
   - Bulk change status
   - Bulk change priority

4. SLA Monitor section (below Kanban):
   - Yellow warning: tickets open >24h without first_response_at
   - Red critical: tickets open >48h without first_response_at
   - Sorted by urgency
   - "Assign & Respond" quick action button per ticket

VERIFY:
- Drag and drop updates ticket status
- Filters work on both views
- SLA monitor flags correct tickets
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 3 — PROMPT 3.4: Support Analytics & Ticket Detail Enhancement

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build support analytics and enhance ticket detail page.

1. Support Analytics (add tab/section to SupportDashboard.tsx):
   - Stats cards: Open Tickets, Unassigned, Avg First Response Time, 
     Avg Resolution Time, Resolved Today
   - Ticket Volume: bar chart new vs resolved per day (last 30 days)
   - Priority Breakdown: donut of open tickets by priority
   - Agent Workload: horizontal bars showing count per agent
   - Category Analysis: bar chart of tickets per category
   - Resolution Metrics: average resolution time trend over weeks

2. Enhance TicketDetail.tsx (src/pages/TicketDetail.tsx):
   - Left panel (70%): 
     • Header: subject, ticket number, status + priority badges
     • Message thread: customer messages left/gray, agent messages 
       right/blue, internal notes yellow with "(Internal)" label
     • Reply box: textarea + "Insert Canned Response" dropdown 
       (searchable, from useCannedResponses hook) + "Send Reply" 
       and "Internal Note" buttons
     • First agent reply auto-sets first_response_at (trigger exists)
   - Right sidebar (30%):
     • Status dropdown, priority dropdown, category, assigned agent 
       — all save immediately on change
     • Requester info: name, email, total ticket count
     • Tags: editable chips with autocomplete from useTags hook
     • Timeline: created, assigned, first response, status changes

3. Add auto-close logic:
   - Create migration 011_auto_close_tickets.sql
   - Supabase scheduled function or check on load:
     tickets with status='resolved' for 7+ days → change to 'closed'
   - Or implement client-side: on dashboard load, bulk update 
     resolved tickets older than 7 days

VERIFY:
- Analytics calculate correctly from real data
- Ticket detail shows thread with correct styling
- Canned response insertion works
- Internal notes hidden from customer tracking page
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 3 — PROMPT 3.5: Cross-Mode Notifications System

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build the unified notification system across all modes.

CONTEXT: notifications table exists. Navbar has bell icon. 
Need to wire it all together.

1. Create src/hooks/useNotifications.ts:
   - Fetch notifications for current user, ordered by created_at DESC
   - Mark as read (update read = true)
   - Mark all as read
   - Delete notification
   - Realtime subscription on notifications table (INSERT)
   - Filter: all, unread only

2. Create src/components/NotificationPanel.tsx:
   - Dropdown from navbar bell icon (use shadcn Popover or Sheet)
   - Unread count badge on bell icon
   - List: icon (varies by type), title, message, time ago, 
     read/unread indicator
   - Click notification → navigate to notification.link
   - "Mark All Read" button at top
   - Types and icons:
     • new_submission → FileText icon
     • detractor_alert → AlertTriangle icon (red)
     • ticket_assigned → UserCheck icon
     • ticket_reply → MessageSquare icon
     • waitlist_milestone → Users icon

3. Ensure notifications are created:
   - Detractor alerts: already created by DB trigger (verify)
   - New submission: create notification in submission insert trigger
     or add to the existing trigger (migration 012_notification_triggers.sql)
   - Ticket assigned: create when assigned_to changes
   - Verify all notification types have correct link URLs

4. Update Navbar.tsx:
   - Replace static bell with NotificationPanel component
   - Show count badge for unread

VERIFY:
- Bell shows correct unread count
- Clicking notification navigates to correct page
- New detractor alert creates notification in real-time
- Mark all read works
- npm run lint passes
- npx tsc --noEmit passes

DO NOT modify Settings pages (Agent 1) or Form Builder (Agent 2).
```

---

# AGENT 4: Polish, Production & Launch

## Role
Build landing page, pricing page, deployment pipeline, testing foundation, SEO, performance optimization, and production readiness.

## Owned Files (Exclusive)
- `src/pages/Index.tsx` (rewrite — landing page)
- `src/pages/Pricing.tsx` (NEW)
- `src/pages/LandingPage.tsx` (NEW — or use Index.tsx)
- `src/components/landing/` (NEW directory)
- `src/components/pricing/` (NEW directory)
- `src/test/` (all test files)
- `vitest.config.ts` (updates)
- `scripts/deploy.sh` (NEW)
- `.github/workflows/` (NEW — CI/CD)
- `public/` (assets, favicon, OG images)
- `index.html` (meta tags, OG, SEO)

## DO NOT TOUCH
- `src/components/waitlist/` (Agent 3)
- `src/components/feedback/` (Agent 3)
- `src/components/support/` (Agent 3)
- `src/pages/FormBuilder.tsx` (Agent 2)
- `src/contexts/` (Agent 1)
- Database migrations (Agents 1 & 3)

---

### AGENT 4 — PROMPT 4.1: Landing Page

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build a beautiful, conversion-optimized landing page.

IMPORTANT: This is a Vite React SPA, NOT Next.js. No "use client" directives.
Use shadcn/ui components + TailwindCSS only. Emerald/green primary palette.

1. Rewrite src/pages/Index.tsx as the public landing page:
   - Hero section:
     • Headline: "One platform for forms, waitlists, feedback & support"
     • Subheadline: "Stop paying for 4 tools. FormForge unifies 
       everything your business needs to collect and act on information."
     • Two CTAs: "Get Started Free" → /auth, "See Pricing" → /pricing
     • Animated mockup or illustration of the 4 modes

   - "How it works" section:
     • 4 cards with icons for each mode
     • Standard Forms: "Build any form with drag-and-drop"
     • Waitlist: "Launch with viral waitlists & referrals"
     • Feedback: "Measure NPS & catch at-risk customers"
     • Support: "Manage tickets with Kanban boards"

   - Social proof / metrics section:
     • "Replaces 4 tools in 1" comparison
     • Savings calculator: Typeform ($25) + Waitlist API ($15) + 
       Delighted ($224) + Zendesk ($19) = $283 vs FormForge $29

   - Features grid:
     • Drag-and-drop builder, Referral engine, NPS analytics, 
       Kanban boards, Team collaboration, CSV export, 
       Custom branding, Public pages, Real-time updates

   - CTA section:
     • "Start for free — no credit card required"
     • Button → /auth

   - Footer:
     • Logo, links (Product, Pricing, Docs), copyright

2. Update routing in App.tsx:
   - / → Landing page (if not authenticated)
   - / → Dashboard/Forms (if authenticated)
   - Use existing AuthRoute/ProtectedRoute patterns

3. Update index.html:
   - Title: "FormForge — Forms, Waitlists, Feedback & Support in One Platform"
   - Meta description for SEO
   - Open Graph tags (og:title, og:description, og:image)
   - Favicon (create simple green "F" favicon)

VERIFY:
- Landing page renders for logged-out users
- Authenticated users see dashboard
- All CTAs link correctly
- Mobile responsive
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 4 — PROMPT 4.2: Pricing Page

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Build the pricing page with tier comparison.

1. Create src/pages/Pricing.tsx:
   - Route: /pricing (public, add to App.tsx)
   - Header: "Simple pricing that grows with you"
   - Monthly/Annual toggle (annual = 20% discount)

   - Four tier cards side by side:
     FREE ($0):
       3 standard forms, 1 waitlist, 100 submissions/mo, 
       1 team member, FormForge branding
     PRO ($29/mo or $23/mo annual):
       Unlimited forms, 3 waitlists, 3 feedback surveys, 
       5,000 submissions/mo, 3 members, custom branding, 
       referral engine, basic NPS
     GROWTH ($59/mo or $47/mo annual):
       Everything in Pro + unlimited waitlists, unlimited feedback,
       1 support inbox, 25,000 submissions/mo, 10 members, 
       Kanban board, SLA timer, API access, webhooks, A/B testing
     BUSINESS ($99/mo or $79/mo annual):
       Everything in Growth + unlimited everything, SSO, 
       workflow automation, AI features, white-label, 
       priority support

   - Highlight GROWTH as "Most Popular"
   - Each card: feature list, CTA button
   - Free → "Get Started Free"
   - Paid → "Start Free Trial" (for now, link to /auth)

2. Feature comparison table below cards:
   - Full feature-by-feature comparison
   - Checkmarks and crosses
   - Sticky header row

3. FAQ section:
   - "Can I change plans?" 
   - "What happens when I hit my limit?"
   - "Is there a free trial?"
   - "Can I cancel anytime?"

4. Add "Pricing" link to Navbar (visible when not authenticated)
   and to landing page footer

VERIFY:
- Toggle switches prices correctly
- Cards are responsive (stack on mobile)
- Links work
- npm run lint passes
- npx tsc --noEmit passes
```

---

### AGENT 4 — PROMPT 4.3: Testing Foundation

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Establish the testing foundation with critical unit and 
integration tests.

CONTEXT: Vitest is configured (vitest.config.ts), Testing Library 
is installed, but only src/test/example.test.ts exists.

1. Create test utilities (src/test/utils.ts):
   - Mock Supabase client factory
   - Mock AuthContext provider wrapper
   - Mock WorkspaceContext provider wrapper
   - renderWithProviders helper that wraps component in all needed 
     providers (QueryClient, Router, Auth, Workspace)

2. Unit tests for utility functions:
   src/test/lib/npsCalculator.test.ts:
   - Test NPS calculation with known inputs
   - Test sentiment classification (0-6=detractor, 7-8=passive, 9-10=promoter)
   - Edge cases: empty array, single response, all same sentiment

   src/test/lib/referralCode.test.ts:
   - Test code generation is 8 chars alphanumeric
   - Test uniqueness (generate 100, all different)

   src/test/lib/ticketNumber.test.ts:
   - Test TICK-001 format generation

3. Component tests:
   src/test/components/FormRenderer.test.tsx:
   - Test renders text field
   - Test renders select with options
   - Test required field validation
   - Test submit calls onSubmit with correct data

   src/test/components/Navbar.test.tsx:
   - Test renders navigation links
   - Test notification bell shows count

4. Hook tests:
   src/test/hooks/usePagination.test.ts:
   - Test page calculation
   - Test next/prev navigation
   - Test range calculation

5. Update package.json scripts if needed:
   - "test": "vitest run"
   - "test:watch": "vitest"
   - "test:coverage": "vitest run --coverage"

VERIFY:
- npm run test passes all tests
- Tests are meaningful (not just smoke tests)
- npm run lint passes
```

---

### AGENT 4 — PROMPT 4.4: CI/CD & Production Deployment

```
You are building FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Set up CI/CD pipeline and production deployment configuration.

1. Create .github/workflows/ci.yml:
   name: CI
   on: [push, pull_request]
   jobs:
     lint-and-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: npm ci
         - run: npm run lint
         - run: npx tsc --noEmit
         - run: npm run test
     build:
       runs-on: ubuntu-latest
       needs: lint-and-test
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-artifact@v4
           with:
             name: dist
             path: dist/

2. Create deployment options documentation (docs/deployment.md):
   - Vercel: one-click deploy (recommended for SPA)
   - Netlify: drag-and-drop dist folder
   - Cloudflare Pages: GitHub integration
   - Include env var setup for each platform

3. Create vercel.json:
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }

4. Create netlify.toml:
   [build]
     command = "npm run build"
     publish = "dist"
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

5. Performance optimizations:
   - Update vite.config.ts: code splitting for routes
   - Lazy load route components:
     const Forms = lazy(() => import('./pages/Forms'));
   - Add React.Suspense with loading fallback in App.tsx
   - Verify bundle size with: npm run build (check output)

VERIFY:
- CI workflow syntax is valid YAML
- npm run build produces dist/ directory
- Lazy loading works (routes load on navigation)
- npm run lint passes
- npx tsc --noEmit passes
```

---

## EXECUTION ORDER & DEPENDENCIES

```
WEEK 1 (Days 1-3): Foundation — All agents start simultaneously
├── Agent 1: Prompts 1.1 + 1.2 (cleanup + error handling)
├── Agent 2: Prompt 2.1 (React Query migration)  
├── Agent 3: Prompt 3.1 (Waitlist enhancements)
└── Agent 4: Prompt 4.1 (Landing page)

WEEK 1 (Days 4-7): Core Features
├── Agent 1: Prompts 1.3 + 1.4 (Settings + types)
├── Agent 2: Prompt 2.2 (Form builder enhancement)
├── Agent 3: Prompt 3.2 (Feedback enhancements)
└── Agent 4: Prompt 4.2 (Pricing page)

WEEK 2 (Days 8-10): Advanced Features
├── Agent 2: Prompt 2.3 (Dashboard + sharing)
├── Agent 3: Prompt 3.3 (Support Kanban)
└── Agent 4: Prompt 4.3 (Testing)

WEEK 2 (Days 11-14): Polish & Integration
├── Agent 2: Prompt 2.4 (Branding UI)
├── Agent 3: Prompts 3.4 + 3.5 (Support analytics + notifications)
└── Agent 4: Prompt 4.4 (CI/CD + deployment)
```

## CONFLICT PREVENTION MATRIX

| File/Directory | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|---------------|---------|---------|---------|---------|
| src/contexts/ | ✅ Own | ❌ | ❌ | ❌ |
| src/pages/Settings* | ✅ Own | ❌ | ❌ | ❌ |
| src/pages/Forms.tsx | ❌ | ✅ Own | ❌ | ❌ |
| src/pages/FormBuilder.tsx | ❌ | ✅ Own | ❌ | ❌ |
| src/pages/Submissions.tsx | ❌ | ✅ Own | ❌ | ❌ |
| src/components/builder/ | ❌ | ✅ Own | ❌ | ❌ |
| src/components/dashboard/ | ❌ | ✅ Own | ❌ | ❌ |
| src/components/embed/ | ❌ | ✅ Own | ❌ | ❌ |
| src/components/waitlist/ | ❌ | ❌ | ✅ Own | ❌ |
| src/components/feedback/ | ❌ | ❌ | ✅ Own | ❌ |
| src/components/support/ | ❌ | ❌ | ✅ Own | ❌ |
| src/hooks/useWaitlist* | ❌ | ❌ | ✅ Own | ❌ |
| src/hooks/useFeedback* | ❌ | ❌ | ✅ Own | ❌ |
| src/hooks/useTickets* | ❌ | ❌ | ✅ Own | ❌ |
| src/pages/Index.tsx | ❌ | ❌ | ❌ | ✅ Own |
| src/pages/Pricing.tsx | ❌ | ❌ | ❌ | ✅ Own |
| src/test/ | ❌ | ❌ | ❌ | ✅ Own |
| .github/ | ❌ | ❌ | ❌ | ✅ Own |
| src/App.tsx | 🟡 Routes | 🟡 Routes | ❌ | 🟡 Routes |
| src/components/Navbar.tsx | 🟡 Settings link | ❌ | 🟡 Notifications | ❌ |
| supabase/migrations/ | 007-009 | ❌ | 010-012 | ❌ |

🟡 = Shared with coordination (specific sections only)

---

## SHARED FILE COORDINATION PROTOCOL

For files touched by multiple agents (App.tsx, Navbar.tsx):

**App.tsx Routes:**
- Agent 1 adds: /settings
- Agent 2 modifies: / (dashboard logic)
- Agent 4 adds: /pricing
- Rule: Each agent adds their route in a clearly marked comment block:
  ```tsx
  {/* === AGENT 1 ROUTES === */}
  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
  {/* === END AGENT 1 === */}
  ```

**Navbar.tsx:**
- Agent 1: Adds "Settings" gear icon link
- Agent 3: Replaces bell icon with NotificationPanel
- Rule: Each adds in separate, clearly marked sections

---

## POST-DEVELOPMENT CHECKLIST

After all agents complete:
- [ ] npm run lint — zero errors
- [ ] npx tsc --noEmit — zero errors
- [ ] npm run test — all tests pass
- [ ] npm run build — builds successfully
- [ ] All 4 modes work end-to-end (manual test)
- [ ] Public pages render without auth
- [ ] Protected pages redirect to /auth
- [ ] Realtime updates work across all modes
- [ ] Landing page renders for anonymous users
- [ ] Pricing page displays correctly
- [ ] Settings page saves correctly
- [ ] Notifications appear and navigate
- [ ] No Lovable references anywhere in codebase
- [ ] README is accurate and complete
