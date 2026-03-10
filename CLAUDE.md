# CLAUDE.md — FormForge

> Unified SaaS platform for Forms, Waitlists, Feedback/NPS, and Support Tickets.
> Built with Vite + React 18 + Supabase.

---

## CRITICAL RULES (Read First)

- **TypeScript strict mode is OFF** — `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` in `tsconfig.app.json`. Do not assume strict null checks.
- **Never modify existing migration files** — always create new `.sql` files in `supabase/migrations/`
- **Always use `@/` import alias** — never use relative `../../` imports. Alias maps to `./src/*`
- **All data queries must be scoped** — use `workspace_id` for workspace-level resources, `form_id` for form-level resources
- **Never install new dependencies without explicit approval**
- **Run `npm run lint` before declaring work complete**
- **Run `npx tsc --noEmit` to type-check** — catches errors the linter misses
- **Two toast systems exist** — protected pages use custom `useToast()` from `@/hooks/use-toast`; public pages use `toast` from `sonner`. Do not mix them.
- **No automated tests exist** — Vitest is configured (`vitest.config.ts`) but only an example test file exists at `src/test/example.test.ts`
- **Forms have a `mode` column** — `standard | waitlist | feedback | support`. This enum drives the entire dispatch pattern for public pages and admin dashboards.

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| **App Name** | FormForge |
| **Type** | Vite + React 18 SPA (no SSR) |
| **Purpose** | Unified SaaS platform with 4 modes |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **Supabase Project ID** | `rsuolemihuqjvrcpqjpa` |
| **Dev Server** | `http://localhost:8080` (configured in `vite.config.ts`) |
| **Package Manager** | npm (lockfile: `package-lock.json`) |

### The 4 Modes

| Mode | Public Page | Admin Dashboard | Data Table |
|------|------------|-----------------|------------|
| `standard` | `FormRenderer` — dynamic field rendering | Redirects to FormBuilder | `submissions` |
| `waitlist` | `WaitlistLandingPage` — email signup + referral | `WaitlistDashboard` — entries, leaderboard, analytics | `waitlist_entries` |
| `feedback` | `FeedbackSurveyPage` — NPS 0–10 + follow-up | `FeedbackDashboard` — NPS trends, sentiment, categories | `feedback_responses` |
| `support` | `SupportSubmitPage` — ticket creation form | `SupportDashboard` — ticket list, priority, status | `tickets` |

---

## 2. Tech Stack (Exact Versions)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | `^18.3.1` |
| Language | TypeScript | `^5.8.3` |
| Bundler | Vite | `^5.4.19` |
| Backend | Supabase JS | `^2.98.0` |
| Server State | TanStack React Query | `^5.83.0` |
| Routing | React Router DOM | `^6.30.1` |
| Forms | React Hook Form + Zod | `^7.61.1` / `^3.25.76` |
| UI Components | shadcn/ui (48 components) | Radix UI primitives |
| Styling | TailwindCSS | `^3.4.17` |
| Charts | Recharts | `^2.15.4` |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | `^6.3.1` / `^10.0.0` |
| Date Utilities | date-fns | `^3.6.0` |
| Toasts | Sonner (public) + custom useToast (protected) | `^1.7.4` |
| Icons | Lucide React | `^0.462.0` |
| Theme | next-themes | `^0.3.0` |
| Carousel | Embla Carousel React | `^8.6.0` |
| Testing | Vitest + Testing Library | `^3.2.4` |

Do not introduce alternative frameworks or libraries unless explicitly requested.

---

## 3. Project Structure

```
FormForge/
├── index.html                          # Vite HTML entry
├── package.json                        # Dependencies & scripts
├── vite.config.ts                      # Vite config (port 8080, @/ alias)
├── vitest.config.ts                    # Test config (jsdom, globals)
├── tsconfig.json                       # TS root (references app + node)
├── tsconfig.app.json                   # TS app config (strict: false)
├── tailwind.config.ts                  # Tailwind theme + custom colors
├── postcss.config.js                   # PostCSS (tailwind + autoprefixer)
├── components.json                     # shadcn/ui CLI config
├── eslint.config.js                    # ESLint flat config
├── .env                                # Environment variables
│
├── scripts/
│   └── run-migration.cjs              # Migration runner (Supabase Management API)
│
├── supabase/
│   ├── config.toml                    # Supabase local dev config
│   └── migrations/                    # 8 SQL migration files (001–006 + 2 auto-generated)
│
└── src/
    ├── main.tsx                        # React DOM entry point
    ├── App.tsx                         # Root: providers + router + routes
    ├── index.css                       # CSS variables (light + dark themes)
    ├── App.css                         # Additional app styles
    ├── vite-env.d.ts                   # Vite type declarations
    │
    ├── contexts/
    │   ├── AuthContext.tsx             # Supabase Auth (session, user, signOut)
    │   └── WorkspaceContext.tsx        # Workspace selection (auto-selects first)
    │
    ├── hooks/
    │   ├── use-toast.ts               # Custom toast hook (reducer-based, 1 toast limit)
    │   ├── use-mobile.tsx             # Mobile breakpoint detection (768px)
    │   ├── useWaitlist.ts             # Waitlist CRUD + realtime + CSV export
    │   ├── useWaitlistAnalytics.ts    # Waitlist stats (useMemo computations)
    │   ├── useFeedback.ts             # Feedback CRUD + realtime
    │   ├── useFeedbackAnalytics.ts    # NPS calculation + sentiment breakdown
    │   ├── useTickets.ts              # Ticket CRUD + realtime + bulk ops
    │   ├── useTicketMessages.ts       # Ticket messages + realtime
    │   ├── useCannedResponses.ts      # Canned responses CRUD (workspace-scoped)
    │   ├── useTags.ts                 # Tags CRUD + ticket-tag junction
    │   └── useSupportAnalytics.ts     # Support stats + SLA breach detection
    │
    ├── lib/
    │   ├── utils.ts                   # cn() — clsx + tailwind-merge
    │   ├── referralCode.ts            # Crypto-random referral codes (8 chars)
    │   ├── npsCalculator.ts           # NPS score + sentiment classification
    │   └── ticketNumber.ts            # TICK-001 format generator
    │
    ├── integrations/supabase/
    │   ├── client.ts                  # Supabase client (auto-generated)
    │   └── types.ts                   # Database types (auto-generated)
    │
    ├── pages/
    │   ├── Index.tsx                   # Home/landing page
    │   ├── Auth.tsx                    # Login/signup (email + password)
    │   ├── Forms.tsx                   # Forms listing (all modes, create dialog)
    │   ├── FormBuilder.tsx            # Drag-and-drop form editor (standard mode)
    │   ├── FormDashboard.tsx          # Mode-based dashboard dispatcher
    │   ├── FormPreview.tsx            # Form preview
    │   ├── PublicForm.tsx             # Public form dispatcher (by mode)
    │   ├── Submissions.tsx            # Submissions viewer
    │   ├── WaitlistEntries.tsx        # Waitlist entries management
    │   ├── TicketDetail.tsx           # Individual ticket view
    │   ├── TicketTracking.tsx         # Public ticket tracking page
    │   ├── CannedResponses.tsx        # Canned responses management
    │   └── NotFound.tsx               # 404 page
    │
    ├── components/
    │   ├── AppLayout.tsx              # Layout wrapper (Navbar + container)
    │   ├── FormRenderer.tsx           # Dynamic field renderer (standard mode)
    │   ├── FormResponsesTab.tsx       # Responses display
    │   ├── Navbar.tsx                 # Top navigation bar
    │   ├── NavLink.tsx                # Navigation link component
    │   │
    │   ├── ui/                        # shadcn/ui components (48 files)
    │   │   └── (see Component Inventory below)
    │   │
    │   ├── waitlist/
    │   │   ├── WaitlistLandingPage.tsx # Public waitlist signup
    │   │   └── WaitlistDashboard.tsx   # Admin waitlist dashboard
    │   │
    │   ├── feedback/
    │   │   ├── FeedbackSurveyPage.tsx  # Public NPS survey
    │   │   └── FeedbackDashboard.tsx   # Admin feedback dashboard
    │   │
    │   └── support/
    │       ├── SupportSubmitPage.tsx   # Public ticket submission
    │       ├── SupportDashboard.tsx    # Admin support dashboard
    │       └── TicketTrackingPage.tsx  # Public ticket tracking
    │
    └── test/
        ├── setup.ts                   # Vitest setup (Testing Library matchers)
        └── example.test.ts            # Example test (placeholder)
```

### File Naming Conventions
- **Components**: PascalCase (`FormBuilder.tsx`, `WaitlistDashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useWaitlist.ts`, `useFeedbackAnalytics.ts`)
- **Utilities**: camelCase (`referralCode.ts`, `npsCalculator.ts`)
- **Pages**: PascalCase (`Forms.tsx`, `PublicForm.tsx`)
- **UI components**: kebab-case (`alert-dialog.tsx`, `input-otp.tsx`)

---

## 4. Database Schema

### Enums (9 total)

| Enum | Values |
|------|--------|
| `workspace_role` | `owner`, `editor`, `viewer` |
| `form_status` | `draft`, `active`, `closed` |
| `form_mode` | `standard`, `waitlist`, `feedback`, `support` |
| `waitlist_entry_status` | `waiting`, `invited`, `joined`, `removed` |
| `feedback_sentiment` | `promoter`, `passive`, `detractor` |
| `feedback_alert_type` | `detractor`, `score_drop`, `keyword` |
| `ticket_status` | `open`, `in_progress`, `waiting`, `resolved`, `closed` |
| `ticket_priority` | `low`, `medium`, `high`, `urgent` |
| `ticket_sender_type` | `agent`, `customer`, `system` |

### Tables (14 total)

#### Core Tables

**profiles**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | References `auth.users(id)` CASCADE |
| `email` | TEXT NOT NULL | |
| `full_name` | TEXT | |
| `avatar_url` | TEXT | |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**workspaces**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default: `gen_random_uuid()` |
| `name` | TEXT NOT NULL | |
| `slug` | TEXT UNIQUE | |
| `owner_id` | UUID NOT NULL | References `auth.users(id)` CASCADE |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**workspace_members** (junction)
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID PK | References `auth.users(id)` CASCADE |
| `workspace_id` | UUID PK | References `workspaces(id)` CASCADE |
| `role` | `workspace_role` | Default: `editor` |

**forms**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default: `gen_random_uuid()` |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `fields` | JSONB | Default: `[]` — form field definitions |
| `settings` | JSONB | Default: `{}` — mode-specific settings |
| `status` | `form_status` | Default: `draft` |
| `mode` | `form_mode` | Default: `standard` |
| `branding` | JSONB | Default: `{}` — colors, logo, etc. |
| `submission_count` | INTEGER | Default: `0` — auto-incremented by trigger |
| `created_by` | UUID NOT NULL | References `auth.users(id)` CASCADE |
| `workspace_id` | UUID NOT NULL | References `workspaces(id)` CASCADE |
| `created_at` | TIMESTAMPTZ | Default: `now()` |
| `updated_at` | TIMESTAMPTZ | Default: `now()` — auto-updated by trigger |

**submissions**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default: `gen_random_uuid()` |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `data` | JSONB | Default: `{}` — form response data |
| `submitted_by_email` | TEXT | |
| `submitted_by_name` | TEXT | |
| `metadata` | JSONB | Default: `{}` |
| `status` | TEXT | Default: `completed` |
| `submitted_at` | TIMESTAMPTZ | Default: `now()` |

**notifications**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default: `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | References `auth.users(id)` CASCADE |
| `type` | TEXT NOT NULL | e.g., `detractor_alert` |
| `title` | TEXT NOT NULL | |
| `message` | TEXT | |
| `link` | TEXT | |
| `read` | BOOLEAN | Default: `false` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

#### Waitlist Tables

**waitlist_entries**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `email` | TEXT NOT NULL | UNIQUE(form_id, email) |
| `name` | TEXT | |
| `referral_code` | TEXT UNIQUE NOT NULL | Auto-generated client-side |
| `referred_by` | TEXT | Referral code of referrer |
| `position` | INTEGER | Auto-assigned by trigger |
| `referral_count` | INTEGER | Default: `0` — incremented by trigger |
| `status` | `waitlist_entry_status` | Default: `waiting` |
| `metadata` | JSONB | Default: `{}` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**waitlist_invites**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `entry_id` | UUID NOT NULL | References `waitlist_entries(id)` CASCADE |
| `message` | TEXT | |
| `invited_at` | TIMESTAMPTZ | Default: `now()` |

#### Feedback Tables

**feedback_responses**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `submission_id` | UUID | References `submissions(id)` SET NULL |
| `respondent_email` | TEXT | |
| `respondent_name` | TEXT | |
| `nps_score` | INTEGER | CHECK: 0–10 |
| `category` | TEXT | |
| `sentiment` | `feedback_sentiment` | Auto-set by trigger based on nps_score |
| `follow_up` | TEXT | |
| `custom_answers` | JSONB | Default: `{}` |
| `flagged` | BOOLEAN | Default: `false` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**feedback_alerts**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `response_id` | UUID NOT NULL | References `feedback_responses(id)` CASCADE |
| `alert_type` | `feedback_alert_type` | |
| `message` | TEXT | |
| `read` | BOOLEAN | Default: `false` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

#### Support Tables

**tickets**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `form_id` | UUID NOT NULL | References `forms(id)` CASCADE |
| `ticket_number` | TEXT NOT NULL | Auto-generated: `TICK-001` format. UNIQUE(form_id, ticket_number) |
| `subject` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | `ticket_status` | Default: `open` |
| `priority` | `ticket_priority` | Default: `medium` |
| `category` | TEXT | |
| `assigned_to` | UUID | References `auth.users(id)` SET NULL |
| `submitted_by_email` | TEXT | |
| `submitted_by_name` | TEXT | |
| `first_response_at` | TIMESTAMPTZ | Auto-set on first agent message |
| `resolved_at` | TIMESTAMPTZ | Auto-set when status changes to `resolved` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |
| `updated_at` | TIMESTAMPTZ | Default: `now()` |

**ticket_messages**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ticket_id` | UUID NOT NULL | References `tickets(id)` CASCADE |
| `sender_type` | `ticket_sender_type` | Default: `customer` |
| `sender_name` | TEXT | |
| `sender_email` | TEXT | |
| `message` | TEXT NOT NULL | |
| `is_internal` | BOOLEAN | Default: `false` — hidden from customers |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**canned_responses** (workspace-scoped, shared across forms)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspace_id` | UUID NOT NULL | References `workspaces(id)` CASCADE |
| `title` | TEXT NOT NULL | |
| `content` | TEXT NOT NULL | |
| `category` | TEXT | |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**tags** (workspace-scoped)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspace_id` | UUID NOT NULL | References `workspaces(id)` CASCADE |
| `name` | TEXT NOT NULL | UNIQUE(workspace_id, name) |
| `color` | TEXT | Default: `#6366f1` |

**ticket_tags** (junction)
| Column | Type | Notes |
|--------|------|-------|
| `ticket_id` | UUID PK | References `tickets(id)` CASCADE |
| `tag_id` | UUID PK | References `tags(id)` CASCADE |

### Database Triggers

| Trigger | Table | Event | Behavior |
|---------|-------|-------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Creates profile + default workspace + workspace_member |
| `on_submission_created` | `submissions` | AFTER INSERT | Increments `forms.submission_count` |
| `on_form_updated` | `forms` | BEFORE UPDATE | Sets `updated_at = now()` |
| `on_waitlist_entry_position` | `waitlist_entries` | BEFORE INSERT | Auto-assigns next `position` |
| `on_waitlist_entry_created` | `waitlist_entries` | AFTER INSERT | Increments referrer's `referral_count` |
| `on_feedback_response_created` | `feedback_responses` | BEFORE INSERT | Auto-sets `sentiment` from `nps_score`; creates detractor alert + notification |
| `on_ticket_created_number` | `tickets` | BEFORE INSERT | Auto-generates `ticket_number` (TICK-001 format) |
| `on_ticket_resolved` | `tickets` | BEFORE UPDATE | Sets `resolved_at` when status → `resolved`; updates `updated_at` |
| `on_ticket_message_created` | `ticket_messages` | AFTER INSERT | Sets `first_response_at` on ticket (if agent message and not already set) |

### RLS Policy Summary

All tables have RLS enabled. Key patterns:

| Pattern | Tables | Rule |
|---------|--------|------|
| **Own-user** | profiles, notifications | `auth.uid() = id` or `user_id` |
| **Workspace member** | workspaces, forms, submissions (read), waitlist, feedback, tickets, canned_responses, tags | `is_workspace_member(auth.uid(), workspace_id)` |
| **Public insert** | submissions, waitlist_entries, feedback_responses, tickets, ticket_messages | Anyone can insert if form is `active` (and correct mode) |
| **Active form read** | forms | `status = 'active'` allows anonymous SELECT |
| **Customer read** | tickets, ticket_messages | Tickets: open SELECT. Messages: non-internal only |
| **Owner-only** | workspaces (update), forms (delete) | `workspace_role = 'owner'` |
| **Editor+** | forms (update) | `workspace_role IN ('owner', 'editor')` |

### Supabase Realtime

Enabled on: `submissions`, `waitlist_entries`, `notifications`, `feedback_responses`, `tickets`, `ticket_messages`

### Helper Functions

- `is_workspace_member(user_id, workspace_id)` → BOOLEAN — checks membership
- `get_workspace_role(user_id, workspace_id)` → workspace_role — returns role
- `generate_ticket_number(form_id)` → TEXT — next TICK-NNN for form

---

## 5. Authentication & Authorization

### Auth Setup
- **Provider**: Supabase Auth (email + password)
- **Context**: `AuthContext` at `src/contexts/AuthContext.tsx`
- **Hook**: `useAuth()` → `{ session, user, loading, signOut }`
- **Persistence**: localStorage with auto-refresh tokens
- **Signup**: Creates profile + default workspace via database trigger

### Workspace Context
- **Context**: `WorkspaceContext` at `src/contexts/WorkspaceContext.tsx`
- **Hook**: `useWorkspace()` → `{ workspaces, currentWorkspace, setCurrentWorkspace, loading }`
- **Behavior**: Auto-selects first workspace on login

### Route Protection
- `ProtectedRoute` — redirects to `/auth` if not authenticated
- `AuthRoute` — redirects to `/` if already authenticated
- RLS policies enforce server-side authorization

### Provider Hierarchy
```
QueryClientProvider (TanStack React Query)
  └─ TooltipProvider (shadcn/ui)
    └─ Toaster (custom) + Sonner
      └─ BrowserRouter (React Router)
        └─ AuthProvider (Supabase Auth)
          └─ WorkspaceProvider
            └─ AppRoutes
```

---

## 6. Routing Map

| Path | Component | Auth | Purpose |
|------|-----------|------|---------|
| `/auth` | `Auth` | Public (redirects if authed) | Login / signup |
| `/` | `Forms` | Protected | Forms listing (all modes) |
| `/forms/:id` | `FormDashboard` | Protected | Mode-specific admin dashboard |
| `/forms/:id/edit` | `FormBuilder` | Protected | Drag-and-drop form editor |
| `/forms/:id/preview` | `FormPreview` | Protected | Form preview |
| `/forms/:id/entries` | `WaitlistEntries` | Protected | Waitlist entries management |
| `/forms/:id/submissions` | `Submissions` | Protected | Form submissions viewer |
| `/forms/:id/tickets/:ticketId` | `TicketDetail` | Protected | Individual ticket detail |
| `/submissions` | `Submissions` | Protected | All submissions |
| `/canned-responses` | `CannedResponses` | Protected | Canned responses management |
| `/f/:id` | `PublicForm` | **Public** | Public form/waitlist/survey/support |
| `/track/:formId` | `TicketTracking` | **Public** | Public ticket tracking |
| `*` | `NotFound` | Public | 404 page |

---

## 7. Architecture Patterns

### Mode Dispatch Pattern
Both `PublicForm.tsx` and `FormDashboard.tsx` read `form.mode` and render mode-specific components:

```tsx
// PublicForm.tsx (simplified)
if (form.mode === "waitlist") return <WaitlistLandingPage />;
if (form.mode === "feedback") return <FeedbackSurveyPage />;
if (form.mode === "support") return <SupportSubmitPage />;
return <FormRenderer fields={form.fields} />;  // standard
```

```tsx
// FormDashboard.tsx (simplified)
switch (form.mode) {
  case "waitlist":  return <WaitlistDashboard />;
  case "feedback":  return <FeedbackDashboard />;
  case "support":   return <SupportDashboard />;
  default:          navigate(`/forms/${id}/edit`); // standard → builder
}
```

### Data Fetching Pattern
All hooks use **direct Supabase client calls** (not TanStack Query wrappers):

```tsx
// Typical hook pattern
export function useWaitlist(formId: string) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("form_id", formId)
      .order("position");
    if (!error) setEntries(data);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [formId]);
  // ... CRUD methods that update local state after DB success
}
```

### Realtime Pattern
Hooks subscribe to Supabase Postgres Changes:

```tsx
const channel = supabase
  .channel(`waitlist-${formId}`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist_entries", filter: `form_id=eq.${formId}` },
    (payload) => setEntries(prev => [...prev, payload.new])
  )
  .subscribe();
// Cleanup on unmount
return () => { supabase.removeChannel(channel); };
```

### Analytics Hook Pattern
Analytics hooks take pre-fetched data as props and compute derived stats with `useMemo`:

```tsx
export function useFeedbackAnalytics(responses: FeedbackResponse[]) {
  const npsScore = useMemo(() => calculateNPS(responses), [responses]);
  const breakdown = useMemo(() => getNPSBreakdown(responses), [responses]);
  return { npsScore, breakdown, /* ... */ };
}
```

### Form Handling
- **Form builder fields**: Manual state management with `useState` arrays
- **Auth page**: Direct `useState` + manual validation
- **Public pages**: Manual state + inline validation (not React Hook Form)
- **React Hook Form + Zod**: Available but not widely used yet

### State Management
- **React Context**: Auth state (`AuthContext`), workspace state (`WorkspaceContext`)
- **TanStack React Query**: `QueryClient` is initialized but hooks use direct Supabase calls
- **Local state**: Each hook manages its own `useState` — no global state store (no Zustand/Redux)
- **No centralized cache**: Data is fetched independently per hook instance

### Toast Pattern
```tsx
// Protected pages (dashboard, builder, etc.)
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Error", description: msg, variant: "destructive" });
toast({ title: "Success", description: msg });

// Public pages (waitlist, feedback, support)
import { toast } from "sonner";
toast.success("Thank you!");
toast.error("Something went wrong");
toast.info("Already on the list");
```

### Loading / Error / Empty States
```tsx
if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
if (!data) return <NotFound />;
// Empty states: inline message or illustration
```

---

## 8. Code Conventions

### Import Order
1. React / React DOM
2. Third-party libraries (`@supabase`, `@tanstack`, `react-router-dom`, etc.)
3. `@/` internal imports (contexts, hooks, lib, components)
4. Relative imports (`./`)

### Component Structure
```tsx
"use client" // NOT used — this is a Vite SPA, not Next.js

import { ... } from "react";
import { ... } from "@/components/ui/button";

interface Props { /* ... */ }

export default function ComponentName({ prop }: Props) {
  // hooks
  // state
  // effects
  // handlers
  // render
}
```

### Props
- Defined as inline `interface Props` or destructured directly
- No PropTypes — TypeScript interfaces only

### CSS
- TailwindCSS utility classes exclusively
- CSS variables defined in `src/index.css` for theming
- Dark mode via `next-themes` with `.dark` class
- Custom utilities: `gradient-primary`, `gradient-subtle`, `shadow-colored`
- Fonts: Inter (body), Plus Jakarta Sans (headings)

### Colors (HSL via CSS variables)
- Primary: Green (`hsl(155, 60%, 40%)` light / `hsl(155, 60%, 50%)` dark)
- Semantic: `success`, `warning`, `info`, `destructive` tokens
- All colors have `foreground` counterparts

---

## 9. shadcn/ui Component Inventory (48 components)

```
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb,
button, calendar, card, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, form, hover-card, input,
input-otp, label, menubar, navigation-menu, pagination, popover, progress,
radio-group, resizable, scroll-area, select, separator, sheet, sidebar,
skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster,
toggle, toggle-group, tooltip
```

**Configuration** (`components.json`):
- Style: `default`
- RSC: `false` (SPA, not Next.js)
- Base color: `slate`
- CSS variables: `true`
- Aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`

Additionally, `use-toast.ts` exists in both `src/hooks/` and `src/components/ui/`.

---

## 10. Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest (single run) |
| `npm run test:watch` | Run Vitest (watch mode) |
| `npx tsc --noEmit` | Type check (no output) |

### Migration & Type Generation
```bash
# Run a migration against Supabase
node scripts/run-migration.cjs supabase/migrations/007_my_migration.sql

# Regenerate Supabase types after schema changes
npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts
```

---

## 11. Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (client-safe) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID (`rsuolemihuqjvrcpqjpa`) |

All client-side env vars use the `VITE_` prefix (Vite convention).

---

## 12. Supabase Workflow

### Creating a New Migration
1. Create `supabase/migrations/NNN_description.sql` with your SQL
2. Run: `node scripts/run-migration.cjs supabase/migrations/NNN_description.sql`
3. Regenerate types: `npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts`

### RLS Policy Pattern
```sql
-- Workspace member can read
CREATE POLICY "table_select_member" ON public.my_table
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Public can insert if form is active and correct mode
CREATE POLICY "table_insert_public" ON public.my_table
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active' AND f.mode = 'my_mode'
    )
  );
```

### Realtime
Add tables to the realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.my_table;
```

---

## 13. Mode-Specific Architecture

### Standard Mode
- **Public**: `FormRenderer` renders fields dynamically from `form.fields` JSONB
- **Admin**: `FormBuilder` — drag-and-drop field editor with auto-save
- **Data**: Stored in `submissions` table as JSONB `data`
- **Hooks**: None mode-specific (uses direct Supabase calls in pages)

### Waitlist Mode
- **Public**: `WaitlistLandingPage` — email input, referral code display, share buttons
- **Admin**: `WaitlistDashboard` — entries table, referral leaderboard, daily signups chart
- **Data**: `waitlist_entries` (with auto-position and referral tracking via triggers)
- **Hooks**: `useWaitlist` (CRUD + realtime), `useWaitlistAnalytics` (stats)
- **Settings**: `form.settings` may include waitlist-specific config
- **Branding**: `form.branding` controls colors/logo on public page

### Feedback Mode
- **Public**: `FeedbackSurveyPage` — NPS scale (0–10), category, follow-up text, custom fields
- **Admin**: `FeedbackDashboard` — NPS score, sentiment breakdown, weekly trends, category analysis, at-risk clients
- **Data**: `feedback_responses` (auto-sentiment via trigger), `feedback_alerts` (detractor notifications)
- **Hooks**: `useFeedback` (CRUD + realtime), `useFeedbackAnalytics` (NPS calculation)
- **NPS Formula**: `((promoters - detractors) / total) * 100`
- **Sentiment**: 9–10 = promoter, 7–8 = passive, 0–6 = detractor

### Support Mode
- **Public**: `SupportSubmitPage` — name, email, subject, description, category, priority
- **Admin**: `SupportDashboard` — ticket list, status/priority filters, bulk actions
- **Tracking**: `TicketTrackingPage` at `/track/:formId` — customers check ticket status
- **Data**: `tickets` (auto-numbered), `ticket_messages` (threaded), `tags` + `ticket_tags`
- **Hooks**: `useTickets`, `useTicketMessages`, `useCannedResponses`, `useTags`, `useSupportAnalytics`
- **Ticket Number**: `TICK-001` format, auto-generated per form by DB trigger
- **SLA**: `first_response_at` tracked; analytics flag tickets >24h without response

---

## 14. Adding New Features Checklist

### Adding a New Mode
1. Add value to `form_mode` enum (new migration)
2. Create data tables with RLS policies (new migration)
3. Add triggers as needed (new migration)
4. Run migration and regenerate types
5. Create public page component in `src/components/{mode}/`
6. Create admin dashboard component in `src/components/{mode}/`
7. Add dispatch case in `PublicForm.tsx`
8. Add dispatch case in `FormDashboard.tsx`
9. Create hooks in `src/hooks/` (CRUD + analytics)
10. Add mode option to form creation dialog in `Forms.tsx`

### Adding a New Feature to Existing Mode
1. **Database**: Create migration if schema changes needed
2. **Types**: Regenerate Supabase types
3. **Hook**: Add method to existing hook or create new hook
4. **Component**: Build UI using shadcn/ui components
5. **Route**: Add to `App.tsx` if new page needed
6. **Lint**: Run `npm run lint`
7. **Type check**: Run `npx tsc --noEmit`

### Adding a New Database Table
1. Write SQL in `supabase/migrations/NNN_description.sql`
2. Include: CREATE TABLE, indexes, ENABLE RLS, CREATE POLICY statements
3. Enable realtime if needed: `ALTER PUBLICATION supabase_realtime ADD TABLE ...`
4. Run migration: `node scripts/run-migration.cjs supabase/migrations/NNN_description.sql`
5. Regenerate types: `npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts`

---

## 15. Known Issues & Technical Debt

1. **TypeScript strict mode disabled** — `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`
2. **`@typescript-eslint/no-unused-vars` turned off** — dead code not flagged
3. **No automated test suite** — Vitest configured but only example test exists
4. **TanStack Query underutilized** — `QueryClient` initialized but all hooks use raw Supabase calls (no caching, deduplication, or retry logic)
5. **Dual toast systems** — `useToast` (custom) and `sonner` coexist; consolidation opportunity
6. **No pagination** — all queries fetch full result sets
7. **Realtime subscriptions watch INSERT only** — most hooks don't react to UPDATE/DELETE (exception: `useTickets` watches all events)
8. **No error logging** — errors returned as tuples but not logged to any service
9. **Two auto-generated migrations** (`20260308...`) partially overlap with manual migrations 001–004

---

## 16. Anti-Patterns (DO NOT)

- **Add `"use client"` directives** — this is a Vite SPA, not Next.js. No RSC exists.
- **Use relative imports** (`../../`) — always use `@/` alias
- **Mix toast systems** — use `useToast()` in protected pages, `toast` from `sonner` in public pages
- **Skip RLS policies** on new tables — every table must have RLS enabled
- **Modify existing migrations** — always create new migration files
- **Install dependencies without approval** — check with user first
- **Use raw SQL in application code** — use Supabase JS client methods
- **Create global state stores** — use existing patterns (Context for auth/workspace, local state in hooks)
- **Skip workspace scoping** — all queries must filter by `workspace_id` or `form_id`
- **Add new enum values without migration** — PostgreSQL enums require ALTER TYPE in SQL
