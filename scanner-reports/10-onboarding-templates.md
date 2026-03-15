# Scanner Report: Feature 10 -- Onboarding & Templates

**Scanner**: Feature Scanner
**Date**: 2026-03-15
**Feature**: Onboarding Wizard + Template Marketplace
**Status**: Implemented (Agent 8: Onboarding, Agent 11: Templates)

---

## 1. Touchpoints

### Onboarding Wizard
| File | Role |
|------|------|
| `src/components/onboarding/OnboardingWizard.tsx` | Main 3-step wizard container |
| `src/components/onboarding/ModeSelector.tsx` | Step 1: mode selection (standard/waitlist/feedback/support) |
| `src/components/onboarding/FirstFormGuide.tsx` | Step 2: create first template form |
| `src/components/onboarding/GuidedTour.tsx` | Step 3: tips for Dashboard, Builder, Sharing |
| `src/hooks/useOnboarding.ts` | State management: `isOnboarded`, `completeOnboarding`, `skipOnboarding`, `logActivationEvent` |
| `src/lib/emailTemplates.ts` | Welcome email dispatch via Supabase Edge Function |
| `src/App.tsx:107-118` | `HomepageRoute` checks onboarding status, redirects to `/onboarding` |
| `src/App.tsx:142` | Route: `/onboarding` -> `ProtectedRoute` -> `OnboardingWizard` |
| `supabase/migrations/015_onboarding.sql` | DB: `profiles.onboarding_completed` column + `activation_events` table |
| `src/i18n/locales/en.json:908-942` | English i18n keys |
| `src/i18n/locales/he.json:908-942` | Hebrew i18n keys |

### Template Marketplace
| File | Role |
|------|------|
| `src/pages/Templates.tsx` | Public gallery page with SEO meta tags |
| `src/pages/TemplateDetail.tsx` | Individual template detail page with SEO |
| `src/components/templates/TemplateBrowser.tsx` | Filterable grid (category, mode, search) |
| `src/components/templates/TemplateCard.tsx` | Card component with mode badge + use count |
| `src/components/templates/TemplatePreview.tsx` | Read-only form field renderer |
| `src/components/templates/UseTemplateButton.tsx` | Clone CTA with auth redirect |
| `src/hooks/useTemplates.ts` | `useTemplates` (list), `useTemplate` (single + related), `useCloneTemplate` (clone to workspace) |
| `src/data/starterTemplates.ts` | 22 client-side template definitions |
| `scripts/seed-templates.ts` | Seed script with 20 DB templates |
| `supabase/migrations/018_templates.sql` | DB: `templates` table + RLS (SELECT only) + 22 seed rows |
| `src/pages/Index.tsx:45,97-319` | Landing page: featured templates section |
| `src/pages/Forms.tsx:246-255` | "Start from Template" button in create dialog |
| `src/components/Navbar.tsx:46` | Templates nav link |
| `src/i18n/locales/en.json:1113-1162` | English template i18n keys |
| `src/i18n/locales/he.json:1113-1162` | Hebrew template i18n keys |

---

## 2. E2E Flows

### Flow 1: First-Time User Onboarding

**Steps**:
1. User signs up at `/auth` -> DB trigger creates profile with `onboarding_completed = false`
2. User is redirected to `/` -> `HomepageRoute` (App.tsx:107-118) checks `useOnboarding().isOnboarded`
3. Since `isOnboarded === false`, user is redirected to `/onboarding` (ProtectedRoute)
4. `OnboardingWizard` mounts, logs `onboarding_started` event, sends welcome email
5. Step 1: `ModeSelector` -- user picks one or more modes (must select at least 1 to proceed)
6. Step 2: `FirstFormGuide` -- user creates a template form based on primary selected mode
7. Step 3: `GuidedTour` -- static tips (Dashboard, Builder, Sharing)
8. User clicks "Finish" -> logs `onboarding_completed` event, sets `profiles.onboarding_completed = true`, redirects to `/`

**Verdict**: PASS with issues. Flow works end-to-end but has several non-critical bugs documented below.

### Flow 2: Onboarding Skip

**Steps**:
1. User clicks "Skip" at any wizard step
2. `skipOnboarding()` logs `onboarding_completed` with `{ skipped: true }` metadata
3. Sets `profiles.onboarding_completed = true`, redirects to `/`

**Verdict**: PASS. Skip is accessible at all steps via top-right link.

### Flow 3: Template Browsing (Public)

**Steps**:
1. Anonymous user visits `/templates` (public route, no auth required)
2. `TemplateBrowser` loads templates from DB via `useTemplates` hook
3. User can filter by category (9 options), mode (4 + all), and search text
4. Each `TemplateCard` links to `/templates/:slug`
5. `TemplateDetail` shows full preview, settings, related templates, and "Use This Template" CTA

**Verdict**: PASS. Public browsing works without authentication. SEO meta tags are set dynamically.

### Flow 4: Template Selection & Clone

**Steps**:
1. Authenticated user visits `/templates/:slug`
2. Clicks "Use This Template" button
3. `useCloneTemplate` validates fields, inserts new form (draft), attempts to increment `use_count`
4. Navigates to `/forms/:newFormId/edit`

**Verdict**: PARTIAL PASS. Clone works but `use_count` increment silently fails (see P1 issue below).

### Flow 5: Template-to-Auth Redirect

**Steps**:
1. Unauthenticated user on `/templates/:slug` clicks "Sign In to Use Template"
2. `UseTemplateButton` navigates to `/auth?redirect=/templates/:slug`
3. User signs in or signs up

**Verdict**: FAIL. The Auth page (`src/pages/Auth.tsx`) does NOT read the `redirect` query parameter. After auth, user goes to `/` (or `/onboarding` for new users), losing the template context entirely. See P1 issue.

### Flow 6: Landing Page Featured Templates

**Steps**:
1. Anonymous user visits `/` -> sees landing page (`Index.tsx`)
2. Landing page loads featured templates via `useTemplates({ featured: true })`
3. Displays up to 6 featured templates in grid
4. "Browse All Templates" CTA links to `/templates`

**Verdict**: PASS. Good discovery funnel from landing page.

---

## 3. Cross-Dependencies

| Dependency | Direction | Notes |
|------------|-----------|-------|
| Onboarding -> AuthContext | Read | Checks `user` for auth status |
| Onboarding -> WorkspaceContext | Read | Needs `currentWorkspace` for form creation |
| Onboarding -> profiles table | Read/Write | `onboarding_completed` flag |
| Onboarding -> activation_events table | Write | Event logging |
| Onboarding -> send-email Edge Function | Invoke | Welcome email (non-blocking) |
| Onboarding -> forms table | Write | Creates first form from template |
| Templates -> forms table | Write | Clone creates new form |
| Templates -> templates table | Read/Write | Read for browsing, attempted write for `use_count` |
| Templates -> AuthContext | Read | Gate clone behind auth |
| Templates -> WorkspaceContext | Read | Needs workspace for form insert |
| Landing page -> Templates | Read | Featured templates on homepage |
| Forms page -> Templates | Navigate | "Start from Template" button |
| Navbar -> Templates | Navigate | Templates nav link |
| HomepageRoute -> useOnboarding | Read | Gate onboarding redirect |

**Risk**: The onboarding flow depends on the welcome email Edge Function (`send-email`). If the function is not deployed or fails, the wizard still proceeds but shows a toast. This is correctly handled with non-blocking error handling.

---

## 4. Parallelism Assessment

| Component | Can Test in Parallel? | Dependencies |
|-----------|-----------------------|--------------|
| ModeSelector UI | Yes | None (pure UI) |
| FirstFormGuide form creation | No | Requires auth + workspace |
| GuidedTour UI | Yes | None (pure UI) |
| TemplateBrowser filtering | Partially | Requires seeded templates in DB |
| TemplateDetail rendering | Partially | Requires template in DB |
| UseTemplateButton clone | No | Requires auth + workspace + template |
| Landing page featured | Partially | Requires templates in DB |

**Parallelism Score**: Medium. Onboarding UI components are testable in isolation, but integration flows require sequential auth -> workspace -> form creation.

---

## 5. Code Architecture & Quality

### Strengths
- **Clean component decomposition**: Wizard split into 3 focused sub-components + a hook
- **i18n support**: All user-facing strings use translation keys, available in EN and HE
- **Activation event tracking**: Well-structured funnel events for analytics
- **Template data model**: Proper DB table with indexes, RLS, and seed data
- **SEO awareness**: Template pages set `document.title` and meta description dynamically
- **Lazy loading**: Both onboarding and template pages are code-split via `lazy()`
- **Skip mechanism**: Users can bypass onboarding at any step

### Issues

**5.1 Type mismatch in `FirstFormGuide.tsx:29-54`**
`TEMPLATE_CONFIGS` is typed as `Record<FormMode, { ... fieldLabelKeys: ... }>` but the `waitlist`, `feedback`, and `support` entries use `fields: []` instead of `fieldLabelKeys`. This property name mismatch is masked because TypeScript strict mode is off and the runtime code uses `config.fieldLabelKeys || []` as a fallback (line 70). If strict mode were enabled, this would be a compile error.

**5.2 Duplicate template data sources**
Two separate template definitions exist:
- `src/data/starterTemplates.ts` -- 22 client-side template definitions (used by nothing at runtime currently)
- `scripts/seed-templates.ts` -- 20 server-side seed templates
- `supabase/migrations/018_templates.sql` -- 22 inline INSERT rows

These overlap significantly but have subtle differences (e.g., Bug Report is `mode: "support"` in `starterTemplates.ts` and `018_templates.sql` but `mode: "standard"` in `seed-templates.ts`; newsletter-signup is `mode: "waitlist"` in `starterTemplates.ts` / `018_templates.sql` but `mode: "standard"` in `seed-templates.ts`). The seed script also has different categories for some templates (e.g., "General" vs "Marketing" for Contact Form).

**5.3 `starterTemplates.ts` appears unused at runtime**
The file at `src/data/starterTemplates.ts` exports `starterTemplates` but no component imports it. All runtime template data comes from the `templates` DB table. This is dead code.

**5.4 Hardcoded "or" divider string**
In `Forms.tsx:249`, the text `"or"` between "Create Form" and "Start from Template" is hardcoded in English, not using i18n.

---

## 6. Error Handling & Resilience

### Onboarding

| Scenario | Handling | Verdict |
|----------|----------|---------|
| Welcome email fails | Toast shown, wizard continues | Good |
| Form creation fails (DB error) | `creating` state stuck as `false`, no error toast shown | **Missing** |
| User has no workspace | Button disabled (`!currentWorkspace`), loading state shown | OK |
| Profile read fails for `onboarding_completed` | Falls back to `isOnboarded = false`, shows wizard | Acceptable |
| `completeOnboarding` DB update fails | No error handling, user stuck | **Missing** |
| `logActivationEvent` fails | Silently ignored | Acceptable |

**P1: FirstFormGuide.tsx:76-99** -- When `supabase.from("forms").insert(...)` fails, the error is silently swallowed. The `setCreating(false)` runs, but no error toast is shown. The user sees the button re-enabled with no feedback about what went wrong.

**P1: useOnboarding.ts:79-88** -- `markOnboardingComplete` has no error handling. If the profile update fails, the user will be stuck in onboarding indefinitely until they manually clear the state.

### Templates

| Scenario | Handling | Verdict |
|----------|----------|---------|
| Template not found | Shows "Template not found" with "Browse Templates" button | Good |
| No templates match filters | Shows empty state with "Clear filters" button | Good |
| Clone fails (DB error) | Error toast with message | Good |
| Invalid template fields | Validation before clone, error toast | Good |
| `use_count` update fails | Silently ignored (`.then(() => {})`) | See P1 RLS issue |
| Network error on template fetch | Empty template list, no error indicator | **Missing** |

---

## 7. Responsive Design Audit

### Onboarding Wizard

| Breakpoint | Behavior | Verdict |
|------------|----------|---------|
| Desktop (1024px+) | Card centered, max-w-lg | Good |
| Tablet (768px) | Card fills width with padding | Good |
| Mobile (375px) | `px-4 py-8`, card fills width, `p-6 sm:p-8` responsive padding | Good |

- ModeSelector grid: `grid-cols-1 sm:grid-cols-2` -- collapses to single column on mobile. Good.
- Navigation buttons: `flex items-center justify-between` -- back/next spread correctly. Good.
- Progress dots: centered, scales appropriately. Good.

### Template Pages

| Breakpoint | Behavior | Verdict |
|------------|----------|---------|
| Desktop | 3-column grid for templates, 3-column layout on detail page | Good |
| Tablet | 2-column grid | Good |
| Mobile | 1-column grid | Good |

- TemplateBrowser search: `flex gap-2` with `flex-1` input -- responsive. Good.
- Category pills: `flex flex-wrap gap-2` -- wraps on narrow screens. Good.
- TemplateDetail sidebar: `lg:grid-cols-3` with sidebar going below on mobile. Good.
- Template detail sticky sidebar: `sticky top-20` -- functional on desktop, flows inline on mobile. Good.

**Minor issue**: The Templates page (`Templates.tsx`) navbar has Sign In and Get Started buttons but no mobile hamburger menu. On small screens, the two buttons might feel cramped. The template pages use a separate simpler navbar (not the main `Navbar.tsx`), which lacks the mobile Sheet menu.

---

## 8. Accessibility Audit

### Onboarding

| Check | Status | Notes |
|-------|--------|-------|
| Keyboard navigation | Partial | Mode cards are `<button>` elements (good), but wizard navigation uses `<Button>` components (good). Skip link is a plain `<button>` (good). |
| Focus management | Missing | No focus trap in wizard. After step change, focus does not move to the new step heading. |
| Screen reader | Partial | Progress dots have no `aria-label` or role. Current step is only indicated visually (width/color). |
| Color contrast | OK | Uses emerald-500 on white/dark backgrounds. |
| ARIA attributes | Missing | Mode cards lack `aria-pressed` or `role="checkbox"` for multi-select behavior. No `aria-current="step"` on progress indicators. |

**P2**: Progress dots (`OnboardingWizard.tsx:130-143`) are purely visual `<div>` elements. Screen readers cannot determine current step. Should use `role="progressbar"` or `aria-label` on dots, or use an `aria-live` region.

**P2**: Mode selector buttons (`ModeSelector.tsx:37-59`) behave as toggles (multi-select) but use plain `<button>` without `aria-pressed`. Screen readers cannot convey selection state.

### Templates

| Check | Status | Notes |
|-------|--------|-------|
| Keyboard navigation | Good | Cards are `<Card>` with `onClick` + `cursor-pointer`, but NOT focusable via keyboard (no `tabIndex` or `role="link"`). |
| Focus indicators | Default | Uses Tailwind defaults (ring on focus-visible). |
| Image alt text | N/A | No images used in template cards (icons via Lucide). |
| Color contrast | OK | Mode badges use sufficient contrast ratios with dark mode support. |

**P2**: `TemplateCard.tsx:33-68` -- The entire card is clickable via `onClick` but is a `<Card>` (div), not a `<button>` or `<a>`. It is not keyboard-focusable and has no `role` attribute. Users who rely on keyboard navigation cannot reach template cards.

**P2**: `TemplatePreview.tsx` -- All form fields are `disabled`, which is correct for preview, but disabled inputs are excluded from tab order and may confuse screen readers that enumerate form fields.

---

## 9. UX Analysis

### Onboarding Flow Quality

**Strengths**:
- 3-step wizard is concise and goal-oriented
- Mode selection gives users agency over their experience
- First form creation provides immediate value (time-to-first-form is minimized)
- GuidedTour step provides orientation without overwhelming
- Skip option respects user autonomy
- Welcome email adds a professional touch

**Weaknesses**:
- **No back-and-forth state preservation**: If a user creates a form in Step 2, goes back to Step 1 to change modes, and returns to Step 2, the form is already marked as created. The `created` state persists but the mode may have changed. No way to create a different form.
- **Only one form created**: Step 2 only creates a form for `selectedModes[0]` (the primary mode). If the user selected 3 modes, only 1 form is created. The other selected modes are displayed as badges but no forms are created for them.
- **No progress persistence**: If the user closes the browser mid-wizard, they restart from Step 1. The `step` state is local (useState), not persisted.
- **GuidedTour is passive**: Step 3 is a static list of tips, not an interactive walkthrough. It does not highlight actual UI elements or guide the user through real actions.

### Template Discovery

**Strengths**:
- Templates are accessible from 4 entry points: landing page, navbar, form creation dialog, direct URL
- Filtering by category and mode is intuitive
- Search functionality supports title and description matching
- Related templates on detail page encourage exploration
- "Free to use" messaging reduces friction
- Use count provides social proof

**Weaknesses**:
- **No template preview live demo**: Users see a static read-only form, not a working preview
- **No "most popular" or "newest" sorting controls**: Templates are sorted by `use_count` DESC only
- **Categories are hardcoded**: No dynamic category discovery from DB
- **Search requires clicking a button**: Enter key works, but debounced search-as-you-type would be more fluid

---

## 10. Documentation Audit

| Area | Status |
|------|--------|
| CLAUDE.md coverage | Partial -- templates table and onboarding are NOT documented in CLAUDE.md sections 4 (Database Schema) or 6 (Routing Map) |
| Inline code comments | Good -- agent attribution comments (`// === AGENT 8 ===`, `// === AGENT 11 ===`) mark all integration points |
| Hook API docs | Minimal -- `useOnboarding` has a JSDoc on `trackActivationEvent` but hooks lack parameter docs |
| Seed script usage | Good -- `scripts/seed-templates.ts` has a usage comment at top |
| Migration files | Good -- clear headers and numbered sections |

**P2**: CLAUDE.md is stale relative to the onboarding and templates features. The Database Schema section (section 4) does not list `activation_events` or `templates` tables. The Routing Map (section 6) does not list `/onboarding`, `/templates`, or `/templates/:slug`. The Known Issues section does not mention the missing UPDATE RLS policy on `templates`.

---

## 11. Product Growth & Innovation

### Conversion Funnel
The onboarding flow establishes a clear activation funnel:
`signup` -> `onboarding_started` -> `first_form_created` -> `onboarding_completed` -> `first_submission_received`

This enables data-driven optimization of the signup-to-activation path. The `metadata` field on activation events (e.g., `{ skipped: true }`) provides qualitative signal.

### Template Marketplace as Growth Lever
- Public template pages function as SEO landing pages (dynamic meta tags, descriptive content)
- Templates reduce time-to-value for new users
- `use_count` tracking enables "popular templates" ranking
- Auth gate on clone drives signups from organic template traffic

### Suggestions for Innovation
1. **Template rating/reviews** -- Let users rate templates after use, improving discovery
2. **User-submitted templates** -- Allow power users to publish their forms as community templates
3. **Template analytics** -- Track which templates lead to highest activation rates
4. **Contextual template suggestions** -- After mode selection in onboarding, suggest relevant templates instead of creating a blank form
5. **Interactive onboarding tour** -- Replace static GuidedTour with a pointer-based walkthrough (like Shepherd.js) that highlights actual UI elements
6. **Onboarding checklist on dashboard** -- Show remaining setup tasks (activate form, get first submission, invite team) as a persistent widget

---

## 12. Issues Found

### P0 (Critical) -- None

### P1 (High Priority)

**P1-1: Missing UPDATE RLS policy on `templates` table causes silent `use_count` failure**
- **File**: `supabase/migrations/018_templates.sql`
- **Code**: `useCloneTemplate` (useTemplates.ts:171-176) calls `supabase.from("templates").update(...)` but the only RLS policy on `templates` is `FOR SELECT`. There is no UPDATE policy.
- **Impact**: Every template clone silently fails to increment `use_count`. The `.then(() => {})` swallows the error. All templates show `use_count: 0` forever in production.
- **Fix**: Add an UPDATE policy: `CREATE POLICY "Authenticated can increment use_count" ON public.templates FOR UPDATE TO authenticated USING (is_active = true) WITH CHECK (is_active = true);`

**P1-2: Auth redirect from templates is broken**
- **File**: `src/components/templates/UseTemplateButton.tsx:22` -> `navigate("/auth?redirect=/templates/${slug}")`
- **File**: `src/pages/Auth.tsx` -- does NOT read `searchParams.get("redirect")`
- **Impact**: When an unauthenticated user clicks "Sign In to Use Template", they are sent to `/auth?redirect=/templates/...`. After successful auth, they are redirected to `/` (or `/onboarding`), losing the template they wanted. The redirect parameter is completely ignored.
- **Fix**: In Auth.tsx post-login handler, check `searchParams.get("redirect")` and navigate there instead of `/`.

**P1-3: FirstFormGuide swallows form creation errors**
- **File**: `src/components/onboarding/FirstFormGuide.tsx:76-99`
- **Code**: When the DB insert fails, `setCreating(false)` runs but no error toast is shown. The `if (!error && data)` block only handles the success case.
- **Impact**: If form creation fails (quota exceeded, network error, RLS issue), the user gets no feedback. The button reappears but nothing indicates failure.
- **Fix**: Add an `else` branch showing an error toast.

**P1-4: `completeOnboarding` and `skipOnboarding` have no error handling**
- **File**: `src/hooks/useOnboarding.ts:90-98`
- **Code**: Both functions `await` DB operations but do not catch errors. If the profile update fails, `setIsOnboarded(true)` never runs and the user is stuck.
- **Impact**: Network errors during onboarding completion leave the user in a broken state.
- **Fix**: Wrap in try/catch, show error toast, and consider retry logic.

### P2 (Medium Priority)

**P2-1: Property name mismatch in `TEMPLATE_CONFIGS`**
- **File**: `src/components/onboarding/FirstFormGuide.tsx:29-54`
- **Detail**: The TypeScript type declares `fieldLabelKeys` as required for all modes, but `waitlist`, `feedback`, `support` entries use `fields: []` instead. Works at runtime only because `config.fieldLabelKeys || []` fallback and strict mode is off.
- **Fix**: Change `fields: []` to `fieldLabelKeys: []` for waitlist/feedback/support entries.

**P2-2: Hardcoded "or" string in Forms page**
- **File**: `src/pages/Forms.tsx:249`
- **Code**: `<span className="bg-background px-2 text-muted-foreground">or</span>` is not i18n'd.
- **Fix**: Use `t("common.or")`.

**P2-3: `starterTemplates.ts` is dead code**
- **File**: `src/data/starterTemplates.ts`
- **Detail**: Exports `starterTemplates` and `StarterTemplate` type but nothing imports them at runtime. The DB-seeded templates (migration 018) are the actual data source.
- **Fix**: Remove the file or repurpose it as the single source of truth for the seed script.

**P2-4: Duplicate/divergent template data across 3 sources**
- **Files**: `src/data/starterTemplates.ts`, `scripts/seed-templates.ts`, `supabase/migrations/018_templates.sql`
- **Detail**: Three separate template definitions with subtle differences in mode, category, and field structure (e.g., Bug Report is `mode: "support"` in two sources but `mode: "standard"` in `seed-templates.ts`).
- **Fix**: Establish a single source of truth. The seed script should import from `starterTemplates.ts`.

**P2-5: Progress dots not accessible to screen readers**
- **File**: `src/components/onboarding/OnboardingWizard.tsx:130-143`
- **Fix**: Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`.

**P2-6: Mode selector toggles lack `aria-pressed`**
- **File**: `src/components/onboarding/ModeSelector.tsx:37-59`
- **Fix**: Add `aria-pressed={isSelected}` to each button.

**P2-7: Template cards not keyboard-focusable**
- **File**: `src/components/templates/TemplateCard.tsx:33`
- **Detail**: Card uses `onClick` on a `<Card>` (div) without `tabIndex` or `role`.
- **Fix**: Add `tabIndex={0}`, `role="link"`, `onKeyDown` handler for Enter/Space.

**P2-8: Template pages use separate simple navbar without mobile menu**
- **Files**: `src/pages/Templates.tsx:28-47`, `src/pages/TemplateDetail.tsx:80-102`
- **Detail**: Public template pages have their own inline navbar that lacks a hamburger/sheet menu for mobile. On small screens, the header buttons (Sign In, Get Started) are not collapsible.
- **Fix**: Add a mobile-friendly menu or reuse a shared public navbar component.

**P2-9: CLAUDE.md not updated for onboarding and templates**
- **File**: `CLAUDE.md`
- **Detail**: Database schema (section 4), routing map (section 6), and file structure (section 3) are stale. `activation_events`, `templates` tables and `/onboarding`, `/templates` routes are undocumented.

---

## 13. Recommended Fix Path

### Phase 1: Critical Fixes (P1 -- do first)

1. **Add UPDATE RLS policy on `templates`** -- New migration file:
   ```sql
   CREATE POLICY "Authenticated can update template use_count"
     ON public.templates FOR UPDATE TO authenticated
     USING (is_active = true)
     WITH CHECK (is_active = true);
   ```
   This fixes silent `use_count` failure (P1-1).

2. **Fix auth redirect from templates** -- In `src/pages/Auth.tsx`, after successful login:
   ```tsx
   const redirectTo = searchParams.get("redirect");
   if (redirectTo) navigate(redirectTo, { replace: true });
   ```
   Also handle in `PostVerificationRedirect` (App.tsx). This fixes P1-2.

3. **Add error handling to `FirstFormGuide`** -- After the `if (!error && data)` block, add:
   ```tsx
   if (error) {
     toast({ title: t("common.error"), description: error.message, variant: "destructive" });
   }
   ```
   This fixes P1-3.

4. **Add error handling to `useOnboarding` completion** -- Wrap `markOnboardingComplete` and `completeOnboarding` in try/catch. This fixes P1-4.

### Phase 2: Quality Improvements (P2 -- next sprint)

5. Fix `TEMPLATE_CONFIGS` property names (P2-1)
6. i18n the "or" divider (P2-2)
7. Remove or consolidate `starterTemplates.ts` (P2-3, P2-4)
8. Add accessibility attributes to progress dots and mode toggles (P2-5, P2-6)
9. Make template cards keyboard-focusable (P2-7)
10. Add mobile menu to template page navbar (P2-8)
11. Update CLAUDE.md with new tables and routes (P2-9)

### Phase 3: Enhancement Opportunities

12. Persist onboarding step in localStorage/DB so users can resume
13. Replace static GuidedTour with interactive pointer-based walkthrough
14. Add onboarding completion checklist to dashboard
15. Create multiple forms in Step 2 when multiple modes are selected
16. Add template sorting controls (newest, most popular)
17. Implement search-as-you-type with debounce
