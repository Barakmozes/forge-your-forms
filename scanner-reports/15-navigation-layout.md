# Scanner Report: Feature 15 -- Navigation & Layout

**Scanner**: Claude Opus 4.6
**Date**: 2026-03-15
**Feature**: Navigation & Layout (Navbar, AppLayout, routing, mobile menu, theme, Settings tabs)

---

## 1. Touchpoints

| File | Role |
|------|------|
| `src/App.tsx` | Root component: provider hierarchy, route definitions, `ProtectedRoute`, `AuthRoute`, `HomepageRoute`, lazy-loaded pages, `ErrorBoundary`, `Suspense` |
| `src/components/AppLayout.tsx` | Shared layout wrapper: `<Navbar />` + `<SubscriptionStatus />` + `<UsageBanner />` + `<main>` container; white-label CSS overrides via `useEnterprise` |
| `src/components/Navbar.tsx` | Top navigation bar: logo, nav links, workspace switcher, notifications, language toggle, plan badge, user menu, mobile hamburger Sheet |
| `src/components/NavLink.tsx` | Unused wrapper around React Router's `NavLink` with `activeClassName`/`pendingClassName` support |
| `src/pages/Settings.tsx` | Settings page: 8 tabs (workspace, members, profile, billing, webhooks, api, integrations, enterprise) with `?tab=` query param support |
| `src/pages/Forms.tsx` | Main dashboard: `AppLayout` wrapper, dashboard/forms tabs, form creation dialog |
| `src/pages/FormDashboard.tsx` | Mode-specific dashboard: `AppLayout` wrapper, back button, mode dispatch |
| `src/pages/Index.tsx` | Public landing page with its own header (not AppLayout), footer, CTA sections |
| `src/pages/NotFound.tsx` | 404 page -- standalone, no AppLayout |
| `src/components/NotificationPanel.tsx` | Notification bell popover with unread badge, filter, mark-all-read |
| `src/components/LanguageToggle.tsx` | EN/HE language toggle button |
| `src/components/billing/PlanBadge.tsx` | Current plan tier badge in navbar |
| `src/components/billing/SubscriptionStatus.tsx` | Warning banner for past_due/canceled subscriptions |
| `src/components/upgrade/UsageBanner.tsx` | Warning banner when near/at submission limit |
| `src/components/ErrorBoundary.tsx` | Class-based error boundary with retry/reload UI |
| `src/components/dashboard/DashboardHome.tsx` | Dashboard summary cards + recent submissions + quick actions |
| `src/hooks/use-mobile.tsx` | `useIsMobile()` hook -- 768px breakpoint via `matchMedia` |
| `src/contexts/AuthContext.tsx` | Auth state provider: session, user, signOut, signInWithSSO |
| `src/contexts/WorkspaceContext.tsx` | Workspace state provider: list, currentWorkspace, setCurrentWorkspace |
| `src/index.css` | CSS variables for light/dark themes, custom utilities |
| `tailwind.config.ts` | Tailwind config: container settings, color tokens, animations, font families |
| `index.html` | HTML entry: meta tags, OG/Twitter cards, favicon, preconnect |
| `src/main.tsx` | React DOM entry point |

---

## 2. E2E Flows

### Flow 2.1: Authenticated Navigation (Desktop)
**Path**: User logs in -> sees Navbar with Forms, Submissions, Templates, Workflows, At-Risk links -> clicks each -> routes correctly

- `Navbar.tsx:42-52`: Nav links array defines 5 links with i18n labels and Lucide icons.
- `Navbar.tsx:72-84`: Desktop nav rendered at `md:` breakpoint (768px+); uses `location.pathname === to` for active state.
- `App.tsx:121-171`: Routes defined; all protected routes wrapped in `<ProtectedRoute>`.
- `App.tsx:92-97`: `ProtectedRoute` redirects to `/auth` if no user, shows "Loading..." during auth check.

**Verdict**: PASS -- Desktop navigation links map correctly to routes. Active state detection works for exact pathname matches.

**Issue (P2)**: Active state uses strict equality (`location.pathname === to`), so `/submissions` is active but `/forms/abc/submissions` is not highlighted -- though `/forms/:id/submissions` is a separate route so this is acceptable. Sub-paths like `/workflows/new` will not highlight the "Workflows" nav link.

### Flow 2.2: Mobile Navigation
**Path**: User on <768px screen -> taps hamburger -> Sheet opens from left -> nav links + workspace switcher + settings + plan badge + language toggle visible -> taps link -> Sheet closes -> navigates

- `Navbar.tsx:150-153`: Hamburger button with `md:hidden`, `min-h-[44px]` touch target.
- `Navbar.tsx:158-204`: `Sheet` component opens from left, 3/4 width, max `sm:max-w-sm`.
- `Navbar.tsx:163-174`: Mobile nav links with `onClick={() => setMobileMenuOpen(false)}` to auto-close on navigation.
- `Navbar.tsx:176-201`: Mobile workspace switcher, PlanBadge, LanguageToggle, Settings link all present.

**Verdict**: PASS -- Mobile menu is comprehensive. Touch targets meet 44px minimum. Sheet auto-closes on link tap.

### Flow 2.3: Dark/Light Theme Toggle
**Path**: User wants to toggle dark mode

- `tailwind.config.ts:4`: `darkMode: ["class"]` -- requires `.dark` class on `<html>`.
- `index.css:68-105`: Full dark theme CSS variables defined.
- `src/components/ui/sonner.tsx:1`: Imports `useTheme` from `next-themes` -- but `next-themes` `ThemeProvider` is **never mounted** in `App.tsx` or `main.tsx`.
- Grep for `setTheme`, `darkMode`, `theme.*toggle` in src: **No results**.

**Verdict**: FAIL -- **No dark mode toggle exists anywhere in the UI.** The dark theme CSS variables are fully defined, `tailwind.config.ts` is configured for class-based dark mode, and `sonner.tsx` imports `useTheme` from `next-themes`, but `ThemeProvider` from `next-themes` is never wrapped around the app. Users have no way to switch to dark mode. The `next-themes` package is installed but non-functional.

### Flow 2.4: Workspace Switch in Navbar
**Path**: User clicks workspace switcher dropdown -> sees list of workspaces -> selects different workspace -> data refreshes

- `Navbar.tsx:89-106`: Desktop workspace switcher -- `DropdownMenu` with all workspaces listed; current workspace highlighted with `bg-accent`.
- `Navbar.tsx:177-189`: Mobile workspace switcher -- buttons with `setCurrentWorkspace(ws)` + close sheet.
- `WorkspaceContext.tsx:50-52`: Auto-selects first workspace; `setCurrentWorkspace` updates context.
- `WorkspaceContext.tsx:46-47`: Fetches ALL workspaces (no pagination); `order("created_at", { ascending: true })`.

**Verdict**: PASS -- Workspace switching works on both desktop and mobile. Context update triggers re-renders in consuming components.

**Issue (P2)**: `WorkspaceContext.tsx:58` -- `user` dependency in `useEffect` but `currentWorkspace` is referenced inside without being in the dependency array (React may not re-run when expected). However, `currentWorkspace` is intentionally excluded to avoid resetting selection.

### Flow 2.5: Settings Page Tabs
**Path**: User navigates to /settings -> sees tabs -> clicks each tab -> content renders -> saves workspace/profile changes

- `Settings.tsx:49`: Default tab from `?tab=` query param, falls back to `"workspace"`.
- `Settings.tsx:203-244`: 8 tab triggers: workspace, members, profile, billing (owner-only), webhooks, api, integrations, enterprise (owner-only).
- `Settings.tsx:204`: `overflow-x-auto` with `scrollbar-hide` for horizontal scrolling on mobile.
- `Settings.tsx:206-213`: Tab labels hidden on mobile (`hidden sm:inline`), only icons shown.
- `Settings.tsx:95-118`: Workspace save handler with error handling via `handleAsync`.
- `Settings.tsx:120-143`: Profile save handler similarly structured.
- `Settings.tsx:145-192`: Avatar upload with file type/size validation (2MB limit).
- `App.tsx:145`: `/billing` route redirects to `/settings?tab=billing`.

**Verdict**: PASS -- Settings tabs work correctly with query param deep-linking. Owner-only tabs conditionally rendered. Mobile overflow scrolling handled.

**Issue (P1)**: `Settings.tsx:204-205` -- On narrow mobile screens (< 360px), 8 tab icons in a row may still overflow. The `overflow-x-auto` handles this but there's no visual scroll indicator, so users may not discover tabs beyond the visible area.

### Flow 2.6: Landing Page Navigation (Unauthenticated)
**Path**: Anonymous user visits "/" -> sees landing page with its own navbar -> clicks "Sign In" / "Get Started" -> goes to /auth

- `App.tsx:107-118`: `HomepageRoute` dispatches to `<Index />` (landing) or `<Forms />` (dashboard) based on auth state.
- `Index.tsx:91-125`: Landing page has its own `<header>` with logo, Templates, Pricing, Sign In, Language Toggle, Get Started CTA.
- `Index.tsx:116-123`: Mobile landing shows only Language Toggle + Get Started (Sign In hidden at `sm:hidden`).

**Verdict**: PASS -- Landing page navigation is clean. Mobile shows essential CTA.

**Issue (P2)**: `Index.tsx:99-115`: Desktop landing nav links (Templates, Pricing, Sign In) are hidden on mobile (`hidden sm:flex`) but no hamburger menu is provided for the landing page. Mobile users can only access "Get Started Free" and Language Toggle -- no way to reach `/pricing` or `/templates` from the mobile landing header.

---

## 3. Cross-Dependencies

| Component | Depends On | Nature |
|-----------|-----------|--------|
| `Navbar` | `AuthContext`, `WorkspaceContext`, `LanguageContext`, `useIsMobile`, `useEnterprise`, `NotificationPanel`, `LanguageToggle`, `PlanBadge` | Data + UI composition |
| `AppLayout` | `Navbar`, `SubscriptionStatus`, `UsageBanner`, `useEnterprise` | UI composition |
| `ProtectedRoute` | `AuthContext` | Auth guard |
| `AuthRoute` | `AuthContext` | Reverse auth guard |
| `HomepageRoute` | `AuthContext`, `useOnboarding` | Conditional dispatch |
| `Settings` | `AppLayout`, `WorkspaceContext`, `AuthContext`, `MembersManager`, `BillingPortal`, `UsageDashboard`, `WebhookManager`, `ApiKeyManager`, `ApiDocs`, `IntegrationManager`, `SsoConfig`, `WhiteLabelConfig`, `CustomDomainConfig` | Heavy composition |
| `NotificationPanel` | `AuthContext`, `LanguageContext`, `useNotifications` | Data + navigation |
| `ErrorBoundary` | `react-i18next` (Translation), `errorLogger` | Error handling |
| `sonner.tsx` | `next-themes` (useTheme) | Theme dependency (broken) |
| `DashboardHome` | `WorkspaceContext`, `AuthContext`, `LanguageContext`, TanStack Query | Data fetching |

**Critical Chain**: `App.tsx` -> `AuthProvider` -> `WorkspaceProvider` -> `LanguageProvider` -> `ErrorBoundary` -> `Suspense` -> Routes -> `AppLayout` -> `Navbar` + content. If any provider in this chain fails, the entire app is broken.

---

## 4. Parallelism Assessment

| Work Item | Can Parallelize With | Notes |
|-----------|---------------------|-------|
| Dark mode toggle implementation | Any other nav/layout work | Isolated: add ThemeProvider + toggle button |
| Landing page mobile menu | Any other nav/layout work | Isolated: add hamburger to Index.tsx header |
| Nav active state for sub-paths | Any other nav/layout work | Small logic change in Navbar.tsx |
| Settings tab scroll indicator | Any other nav/layout work | CSS-only change |
| Skip link for accessibility | Any other nav/layout work | Add to AppLayout.tsx |
| NavLink component cleanup | Any other nav/layout work | Remove or adopt unused component |
| 404 page improvements | Any other nav/layout work | Add AppLayout, navigation |

**Assessment**: All navigation/layout fixes are highly parallelizable since they touch different files and different concerns.

---

## 5. Responsive Design Audit

### Breakpoints Used
- **Mobile breakpoint**: 768px (`md:` in Tailwind, `MOBILE_BREAKPOINT` in `use-mobile.tsx:3`)
- **Container**: Centered, padding `1rem` (default), `1.5rem` (sm), `2rem` (lg), max-width `1400px` (2xl)
- **Navbar**: `h-14` (56px) fixed height, `sticky top-0 z-50`

### Navbar Responsive Behavior
| Viewport | Behavior |
|----------|----------|
| < 768px | Logo icon only (text hidden `hidden sm:inline`), hamburger menu visible, notification bell visible, user avatar visible |
| >= 768px | Full nav links, workspace switcher, plan badge, language toggle, settings icon, notification bell, user avatar |

### AppLayout Responsive Behavior
- `AppLayout.tsx:65`: `<main className="container py-4 sm:py-6">` -- responsive padding.
- Container centers content with responsive padding defined in `tailwind.config.ts:10-14`.

### Settings Page Responsive Behavior
- `Settings.tsx:200`: `max-w-3xl mx-auto` -- constrained width.
- `Settings.tsx:204`: Tab list horizontally scrollable with `overflow-x-auto` on mobile.
- `Settings.tsx:206-213`: Tab labels hidden on mobile, icons only.

### Issues Found
1. **(P2)** `Navbar.tsx:93`: Workspace name truncated at `max-w-[200px]`, fine for desktop but could still be tight for long workspace names.
2. **(P2)** Landing page (`Index.tsx`) has no mobile hamburger menu -- Templates and Pricing links inaccessible on mobile.
3. **(P2)** `NotFound.tsx` uses no `AppLayout` or navigation -- dead-end page for authenticated users.

---

## 6. Accessibility Audit

### Keyboard Navigation
- **Nav links**: Standard `<Link>` + `<Button>` components from shadcn/ui, inherently keyboard-focusable.
- **Dropdown menus**: Radix UI `DropdownMenu` provides built-in keyboard navigation (arrow keys, Escape).
- **Sheet (mobile menu)**: Radix UI `Sheet` provides focus trapping and Escape-to-close.
- **No custom `onKeyDown` handlers** in `Navbar.tsx`.

### Focus Management
- **focus-visible**: shadcn/ui Button component (`button.tsx`) includes `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` -- provides visible focus indicators.
- **No focus management on route change**: After navigation, focus is not explicitly moved to main content or page heading. Screen reader users may lose context.

### ARIA
- **Navbar `<nav>`**: `Navbar.tsx:72` uses semantic `<nav>` element but **no `aria-label`** to distinguish it from other navigation landmarks (e.g., footer nav on landing page, mobile sheet nav).
- **Mobile sheet nav**: `Navbar.tsx:163` uses `<nav>` without `aria-label`.
- **Hamburger button**: `Navbar.tsx:151` -- no `aria-label` or `aria-expanded` attribute.
- **NotificationPanel**: `NotificationPanel.tsx:80` -- has `title` attribute but no `aria-label` on the trigger button.
- **Notification items**: `NotificationPanel.tsx:128-171` -- use `<div>` with `onClick` but no `role="button"` or keyboard handler, making them non-focusable/non-actionable via keyboard.
- **Delete notification button**: `NotificationPanel.tsx:162-169` -- uses `<button>` element (good) but no `aria-label` describing what it does.

### Skip Links
- **No skip-to-content link exists.** Users must tab through the entire navbar on every page.

### Screen Reader Announcements
- **Route changes**: No `aria-live` region announces page transitions.
- **Notification badge count**: `NotificationPanel.tsx:83` -- badge count is visual only, no `aria-label` like "3 unread notifications" on the bell button.

### Color Contrast
- `index.css`: Primary green (`hsl(155, 60%, 40%)` on white) -- WCAG AA ratio ~4.6:1 for large text but may fall below 4.5:1 for small text depending on exact rendering.
- Muted foreground (`hsl(160, 10%, 45%)`) on light background (`hsl(150, 20%, 99%)`) -- may not meet WCAG AA 4.5:1 ratio.

### Issues Summary
| Issue | Severity |
|-------|----------|
| No skip-to-content link | P1 |
| Hamburger button missing `aria-label` and `aria-expanded` | P1 |
| Nav elements missing `aria-label` to distinguish landmarks | P1 |
| Notification items are `<div onClick>` without keyboard accessibility | P1 |
| No focus management on route change | P2 |
| No `aria-live` for route change announcements | P2 |
| Notification bell missing descriptive `aria-label` with count | P2 |
| Delete notification button missing `aria-label` | P2 |
| Muted foreground color may not meet WCAG AA contrast ratio | P2 |

---

## 7. Code Architecture & Quality

### Provider Hierarchy
`App.tsx:173-199` defines a clean provider chain:
```
QueryClientProvider -> TooltipProvider -> Toaster + Sonner -> BrowserRouter -> AuthProvider -> WorkspaceProvider -> LanguageProvider -> ErrorBoundary -> Suspense -> AppRoutes
```

**Issues**:
1. **(P1)** `App.tsx:176-177`: `<Toaster />` and `<Sonner />` are placed **outside** `<BrowserRouter>`, which is correct (they don't need routing), but they are also outside `<AuthProvider>` and `<LanguageProvider>`. The custom `useToast()` works because it's a standalone reducer, but the Sonner `<Toaster>` uses `useTheme()` from `next-themes` which has **no provider** -- `useTheme` will return `{ theme: "system" }` as default, which happens to work but is architecturally incorrect.

2. **(P2)** `App.tsx:90`: `queryClient` is created at module scope outside the component, which is correct for singleton behavior but means the QueryClient survives hot module replacement during development, potentially showing stale data.

### Lazy Loading
- `App.tsx:18-62`: All page components are lazy-loaded via `React.lazy()` with a single `<Suspense>` boundary at `App.tsx:187-189`.
- **No per-route Suspense boundaries**: If one lazy chunk fails to load, the entire app shows the fallback.
- **No error handling for chunk load failures**: `React.lazy` rejects if the network request fails, caught by `ErrorBoundary` -- but the error message is generic, not "failed to load page."

### NavLink Component: Dead Code
- `src/components/NavLink.tsx`: Fully implemented wrapper around React Router's `NavLink` with `activeClassName`/`pendingClassName` support.
- **Not imported anywhere** except its own file. The `Navbar.tsx` uses `<Link>` + manual active state instead.

### AppLayout Pattern
- `AppLayout` is used as a wrapper component (`<AppLayout>{children}</AppLayout>`) rather than as a React Router layout route with `<Outlet />`.
- Each protected page manually wraps itself in `<AppLayout>`. This leads to:
  - `AppLayout` being re-mounted on every navigation (Navbar, banners re-render).
  - 14 files import `AppLayout` (per grep results).
  - If a page forgets `<AppLayout>`, it has no navbar.

### Route Definition Issues
1. **(P2)** `App.tsx:153-155`: `/templates` and `/templates/:slug` are **not** wrapped in `<ProtectedRoute>`, making them public. This is intentional (template gallery is public-facing).
2. **(P2)** `App.tsx:147`: `/checkout/cancel` is not wrapped in `<ProtectedRoute>` -- users can hit this page without auth, which is fine for Stripe redirect flows.
3. **(P1)** `App.tsx:88` (`FormDashboard.tsx:87-89`): Standard mode forms trigger `navigate()` inside a render function -- calling `navigate` during render is a side effect that can cause issues in React 18 strict mode. Should use `useEffect` or `<Navigate>`.

### i18n Integration
- All navigation text uses `t()` translation keys consistently.
- `LanguageToggle` toggles between `en` and `he` only -- hardcoded two-language support.

---

## 8. Error Handling & Resilience

### Auth Loading States
- `ProtectedRoute` (`App.tsx:94`): Shows "Loading..." during auth check -- no skeleton, no timeout.
- `AuthRoute` (`App.tsx:101`): Returns `null` during loading -- blank screen flash possible.
- `HomepageRoute` (`App.tsx:112`): Shows "Loading..." during auth + onboarding check.

### ErrorBoundary
- `ErrorBoundary.tsx`: Catches render errors with retry/reload buttons and error logging via `logError`.
- Does NOT catch errors in event handlers, async code, or effects (React limitation).
- Wraps all routes at `App.tsx:185-191`.

### Network Resilience
- No offline detection or indicator in the navbar.
- No retry mechanism for failed lazy chunk loads (network flap = stuck error boundary).
- `WorkspaceContext.tsx:48-53`: If workspace fetch fails, `workspaces` stays empty, `currentWorkspace` stays null -- pages depending on workspace will show empty state but no error message.

### Navbar Error Resilience
- `Navbar.tsx` has no try-catch or error boundary -- if `useEnterprise()`, `useAuth()`, or `useWorkspace()` throws during render, the entire app crashes (caught by parent ErrorBoundary).
- `NotificationPanel.tsx:53`: `useNotifications(user?.id ?? "")` -- passes empty string if no user, which will make a Supabase query with `user_id = ""` returning no results. Not harmful but wasteful.

---

## 9. SEO Audit

### Meta Tags (index.html)
- `<title>`: "FormForge -- Forms, Waitlists, Feedback & Support in One Platform" -- good.
- `<meta name="description">`: Comprehensive, 200+ chars -- good.
- `<meta name="theme-color">`: `#2f9e6e` -- matches brand.
- Open Graph: `og:title`, `og:description`, `og:type`, `og:site_name` -- present but **no `og:image`** or `og:url`.
- Twitter Card: `summary_large_image` but **no `twitter:image`** -- card will not render an image.
- **No canonical URL** meta tag.

### Dynamic Page Titles
- `AppLayout.tsx:43-45`: Sets `document.title` to enterprise app name if white-label enabled.
- `TemplateDetail.tsx:38`: Sets title to template name.
- `Templates.tsx:14`: Sets title to translated template page name.
- **All other pages**: Use the default `index.html` title ("FormForge -- Forms, Waitlists...") regardless of which page the user is on. No per-page title management.

### SPA SEO Limitations
- No SSR/SSG -- search engines relying on JS rendering may index poorly.
- No `robots.txt` or `sitemap.xml` found.
- No structured data (JSON-LD).

---

## 10. Documentation Audit

- `CLAUDE.md` extensively documents the project structure, routes, patterns, and conventions.
- **No JSDoc or inline documentation** on the Navbar, AppLayout, or NavLink components.
- Agent comments (`// === AGENT N: Feature ===`) throughout the code provide traceability but add visual noise.
- No README or architectural decision records (ADRs) for the navigation architecture choices.

---

## 11. Product Growth & Innovation

### Opportunities

1. **Breadcrumb Navigation**: Deep pages like `/forms/:id/tickets/:ticketId` have only a back button. Breadcrumbs would improve wayfinding (e.g., Forms > My Form > Tickets > TICK-003).

2. **Command Palette (Cmd+K)**: With 20+ routes and growing, a command palette would dramatically improve power-user navigation. shadcn/ui `command` component is already installed (`src/components/ui/command.tsx`).

3. **Dark Mode Toggle**: The infrastructure is 90% there (CSS variables, Tailwind config, `next-themes` installed). Just needs `ThemeProvider` and a toggle button. Users increasingly expect dark mode.

4. **Persistent Sidebar for Desktop**: The current top-nav works but as features grow (Forms, Submissions, Templates, Workflows, At-Risk, Canned Responses), a collapsible sidebar would scale better. The `sidebar.tsx` UI component already exists.

5. **Navigation Badges**: Show counts on nav items (e.g., unread notifications count on bell -- already done; could extend to "3 open tickets" on forms, "2 at-risk" on At-Risk).

6. **Route-based Page Titles**: Each page should set its own `document.title` for better browser tab identification and bookmarking.

7. **Onboarding Tour Integration**: The nav could highlight items during the onboarding flow (e.g., pulsing dot on "Templates" for new users).

---

## 12. Issues Found

### P0 (Critical -- Blocks Core Functionality)

_None found. Navigation and layout are functional._

### P1 (High -- Significant UX/Quality Gap)

| # | Issue | File:Line | Description |
|---|-------|-----------|-------------|
| 1 | No dark mode toggle or ThemeProvider | `App.tsx` (missing), `sonner.tsx:1` | `next-themes` is installed, dark CSS vars defined, but `ThemeProvider` never mounted. `useTheme()` in `sonner.tsx` silently returns system default. Users cannot toggle dark mode. |
| 2 | No skip-to-content link | `AppLayout.tsx` | Keyboard/screen-reader users must tab through entire navbar on every page load. WCAG 2.1 Level A violation (2.4.1 Bypass Blocks). |
| 3 | Hamburger missing aria-label | `Navbar.tsx:151` | Mobile menu button has no `aria-label`. Screen readers announce it as an unlabeled button. |
| 4 | Nav landmarks missing aria-label | `Navbar.tsx:72`, `Navbar.tsx:163` | Two `<nav>` elements (desktop + mobile) lack `aria-label`, making them indistinguishable to assistive tech. |
| 5 | Notification items not keyboard accessible | `NotificationPanel.tsx:128-171` | Notification items are `<div onClick>` -- not focusable or activatable via keyboard. |
| 6 | Navigate called during render | `FormDashboard.tsx:88` | `navigate()` called inside `renderDashboard()` during render phase for standard mode forms. Should use `<Navigate>` component or `useEffect`. |
| 7 | Settings tabs not discoverable on small mobile | `Settings.tsx:204-244` | 8 icon-only tabs in horizontally scrollable area with no visual scroll indicator. Users may not know more tabs exist. |

### P2 (Medium -- Should Fix)

| # | Issue | File:Line | Description |
|---|-------|-----------|-------------|
| 8 | NavLink component is dead code | `NavLink.tsx` | Fully implemented but not imported anywhere. Navbar uses `<Link>` with manual active state instead. |
| 9 | Landing page no mobile hamburger | `Index.tsx:99-123` | Mobile landing page hides Templates, Pricing, Sign In links with no hamburger alternative. |
| 10 | AppLayout not used as Router layout | `AppLayout.tsx`, `App.tsx` | Each page wraps itself in `<AppLayout>` causing re-mounts. Should use React Router nested layout with `<Outlet>`. |
| 11 | NotFound page has no navigation | `NotFound.tsx` | 404 page uses plain `<a href="/">` link, no AppLayout, no navbar. Authenticated users lose all navigation context. |
| 12 | No per-page document.title | Most pages | Only Templates and TemplateDetail set page titles. All other pages use the generic index.html title. |
| 13 | No og:image or twitter:image | `index.html` | Social sharing cards will not render preview images. |
| 14 | Nav active state doesn't match sub-paths | `Navbar.tsx:74` | Sub-routes (e.g., `/workflows/new`) don't highlight parent nav item ("Workflows"). |
| 15 | No focus management on route change | `App.tsx` | After SPA navigation, focus stays on the clicked link. Screen reader users are not oriented to new content. |
| 16 | AuthRoute returns null during loading | `App.tsx:101` | Brief blank flash possible while auth state loads. |
| 17 | No lazy chunk load error handling | `App.tsx:187` | Network failure loading a lazy chunk shows generic ErrorBoundary rather than a "failed to load, retry" message. |

---

## 13. Recommended Fix Path

### Phase 1: Accessibility (P1 -- Immediate)
1. **Add skip-to-content link** in `AppLayout.tsx` before `<Navbar />`:
   - Add `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>`
   - Add `id="main-content"` to `<main>`.

2. **Add `aria-label` to nav elements** in `Navbar.tsx`:
   - Desktop nav: `<nav aria-label="Main navigation">`
   - Mobile sheet nav: `<nav aria-label="Mobile navigation">`

3. **Add `aria-label` to hamburger button** in `Navbar.tsx:151`:
   - `aria-label={t("nav.openMenu")}` or equivalent.

4. **Make notification items keyboard accessible** in `NotificationPanel.tsx`:
   - Change `<div onClick>` to `<button>` or add `role="button" tabIndex={0} onKeyDown`.

### Phase 2: Dark Mode (P1 -- High Impact)
5. **Mount ThemeProvider** in `App.tsx`:
   - Wrap with `<ThemeProvider attribute="class" defaultTheme="system">` from `next-themes`.
   - Add dark mode toggle button to Navbar (both desktop and mobile menu).

### Phase 3: UX Polish (P2)
6. **Fix `navigate` in render** in `FormDashboard.tsx:88`:
   - Replace `navigate(...)` with `return <Navigate to={...} replace />`.

7. **Add mobile hamburger to landing page** (`Index.tsx`).

8. **Add per-page document.title** using a custom `useDocumentTitle` hook or in each page's `useEffect`.

9. **Fix nav active state** to use `startsWith` or `matchPath` for sub-path highlighting.

10. **Add AppLayout to NotFound page** for authenticated users.

11. **Remove or adopt `NavLink.tsx`** -- either use it in Navbar (replacing manual active state) or delete it.

12. **Add scroll indicator for Settings tabs** on mobile (e.g., fade gradient on edges, or dots indicator).

### Phase 4: Architecture (P2 -- Longer Term)
13. **Refactor to React Router nested layouts** with `<Outlet>` to avoid AppLayout re-mounts.

14. **Add og:image and twitter:image** meta tags to `index.html`.

15. **Implement Command Palette (Cmd+K)** using the already-installed `command.tsx` component.

16. **Add lazy chunk retry logic** wrapping `React.lazy` with a retry-on-failure wrapper.
