# Feature 17: Public Pages & Sharing — Scanner Report

## 1. Touchpoints

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/pages/Index.tsx` | 1-378 | Landing page (unauthenticated homepage) |
| 2 | `src/pages/Pricing.tsx` | 1-436 | Public pricing page with 4 tiers, comparison, FAQ |
| 3 | `src/pages/PublicForm.tsx` | 1-290 | Public form dispatcher (routes by `form.mode`) |
| 4 | `src/pages/NotFound.tsx` | 1-24 | 404 page |
| 5 | `src/pages/TicketTracking.tsx` | 1-17 | Public ticket tracking page (thin wrapper) |
| 6 | `src/components/embed/SharePanel.tsx` | 1-171 | Share drawer: link copy, embed iframe code, QR code |
| 7 | `src/components/waitlist/WaitlistLandingPage.tsx` | 1-502 | Public waitlist signup page with referral sharing |
| 8 | `src/components/feedback/FeedbackSurveyPage.tsx` | 1-457+ | Public NPS feedback survey |
| 9 | `src/components/support/SupportSubmitPage.tsx` | 1-456+ | Public support ticket submission |
| 10 | `src/components/support/TicketTrackingPage.tsx` | 1-229+ | Public ticket tracking UI |
| 11 | `src/components/FormRenderer.tsx` | 1-493+ | Standard mode public form renderer |
| 12 | `src/App.tsx` | 121-170 | Route definitions for public pages |
| 13 | `src/components/ErrorBoundary.tsx` | 1-82 | Global error boundary |
| 14 | `index.html` | 1-34 | HTML shell with meta/OG tags |
| 15 | `public/robots.txt` | 1-15 | Crawler directives |
| 16 | `src/contexts/LanguageContext.tsx` | 1-61 | Language + RTL direction management |
| 17 | `src/pages/FormBuilder.tsx` | :404 | SharePanel integration point |
| 18 | `src/components/waitlist/WaitlistDashboard.tsx` | :119 | Copy public link for waitlist |
| 19 | `src/components/feedback/FeedbackDashboard.tsx` | :259 | Copy public link for feedback |
| 20 | `src/components/support/SupportDashboard.tsx` | :459 | Copy public link for support |

---

## 2. E2E Flows

### Flow 2.1: View Landing Page
**Path**: Unauthenticated user visits `/`

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | `HomepageRoute` checks `useAuth()` — no user | `App.tsx:107-118` |
| 2 | Renders `<Index />` (lazy-loaded) | `App.tsx:117` |
| 3 | Landing page renders: navbar, hero, 4-mode cards, savings calculator, features grid, featured templates, CTA, footer | `Index.tsx:88-377` |
| 4 | Featured templates fetched via `useTemplates({ featured: true })` | `Index.tsx:45` |

**Verdict: PASS** — Clean, well-structured landing page with i18n, dark mode, RTL support, responsive layout, and competitive pricing comparison.

### Flow 2.2: View Pricing Page
**Path**: User navigates to `/pricing`

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | Route matches `/pricing`, renders `<Pricing />` | `App.tsx:129` |
| 2 | 4 tiers rendered (Free, Pro, Growth, Business) | `Pricing.tsx:81-157` |
| 3 | Annual toggle applies 20% discount | `Pricing.tsx:200-203` |
| 4 | Authenticated users see `CheckoutButton` for paid tiers | `Pricing.tsx:325-335` |
| 5 | Current plan shows "Current Plan" badge | `Pricing.tsx:311-313` |
| 6 | Feature comparison table with 19 rows | `Pricing.tsx:159-179` |
| 7 | FAQ section with accordion | `Pricing.tsx:181-198` |

**Verdict: PASS** — Complete pricing page with smart CTA behavior (checkout for authed, sign-up for anon). Annual billing toggle works correctly.

### Flow 2.3: Access Public Form (Standard Mode)
**Path**: User visits `/f/:id` for a standard-mode form

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | Route matches `/f/:id`, renders `<PublicForm />` | `App.tsx:136` |
| 2 | Form fetched from Supabase by ID | `PublicForm.tsx:41-44` |
| 3 | Loading state shown | `PublicForm.tsx:90-101` |
| 4 | Not-found / closed / draft / submission-limit checks | `PublicForm.tsx:103-193` |
| 5 | Standard mode: renders with custom branding (bg color, font, logo, accent bar) | `PublicForm.tsx:236-289` |
| 6 | `FormRenderer` handles field rendering + submission | `PublicForm.tsx:271-278` |
| 7 | "Powered by FormForge" footer shown unless disabled in branding | `PublicForm.tsx:280-286` |

**Verdict: PASS** — Correct dispatch for all 4 modes, proper gate checks (closed, draft, submission limit, workspace quota).

### Flow 2.4: Access Public Form (Waitlist Mode)
**Path**: User visits `/f/:id` for a waitlist-mode form

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | PublicForm dispatches to `<WaitlistLandingPage />` | `PublicForm.tsx:197-208` |
| 2 | Page renders with custom branding (bg, gradient, logo, accent) | `WaitlistLandingPage.tsx:212-232` |
| 3 | User enters email (+ optional name), submits | `WaitlistLandingPage.tsx:81-173` |
| 4 | Duplicate detection returns existing entry | `WaitlistLandingPage.tsx:99-115` |
| 5 | On success: shows position, referral link, share buttons (X, WhatsApp) | `WaitlistLandingPage.tsx:362-487` |
| 6 | Referral link: copy + social share (Twitter/X, WhatsApp) | `WaitlistLandingPage.tsx:187-208` |

**Verdict: PASS** — Full referral/sharing flow with social buttons.

### Flow 2.5: Share Form (Admin)
**Path**: Admin clicks "Share" button in FormBuilder

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | `SharePanel` button rendered in FormBuilder header | `FormBuilder.tsx:404` |
| 2 | Opens Sheet with 3 tabs: Link, Embed, QR Code | `SharePanel.tsx:54-167` |
| 3 | **Link tab**: Shows public URL, copy button, open-in-new-tab | `SharePanel.tsx:79-109` |
| 4 | **Embed tab**: Shows iframe snippet, copy button | `SharePanel.tsx:112-135` |
| 5 | **QR Code tab**: Generates QR via external API, download SVG | `SharePanel.tsx:139-165` |

**Verdict: PASS** — Three sharing methods implemented. Embed uses iframe approach.

### Flow 2.6: Embed Form
**Path**: External site embeds form via iframe

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | Embed code generated: `<iframe src="/f/:id" ...>` | `SharePanel.tsx:31-38` |
| 2 | Form loads inside iframe at `/f/:id` route | `PublicForm.tsx` |
| 3 | No `X-Frame-Options` or CSP headers checked in application layer | N/A |

**Verdict: PASS (with caveat)** — Iframe embed works but lacks customizable height and responsive embed options (see P2 issues).

### Flow 2.7: 404 Page
**Path**: User visits non-existent route

| Step | What Happens | File:Line |
|------|-------------|-----------|
| 1 | Catch-all route matches `*` | `App.tsx:169` |
| 2 | `NotFound` renders 404 with link home | `NotFound.tsx:4-24` |
| 3 | Logs error to console | `NotFound.tsx:8` |

**Verdict: PASS (with issues)** — Functional but minimal. See P2 issues.

---

## 3. Cross-Dependencies

| Dependency | From | To | Nature |
|-----------|------|-----|--------|
| Mode dispatch | `PublicForm.tsx` | `WaitlistLandingPage`, `FeedbackSurveyPage`, `SupportSubmitPage`, `FormRenderer` | Conditional rendering by `form.mode` |
| Branding | `PublicForm.tsx` | All public components | Passed as props (`branding`, `settings`) |
| Submission gate | `PublicForm.tsx` | `subscriptions` table, `get_workspace_usage` RPC | Checks workspace quota |
| Close-after-count | `PublicForm.tsx` | `FormSettings` type | Uses `settings.closeAfterCount` |
| Share panel | `FormBuilder.tsx` | `SharePanel.tsx` | Rendered in builder header |
| Copy-link pattern | All dashboards | `window.location.origin` | Each dashboard has inline copy-link |
| Social sharing | `WaitlistLandingPage.tsx` | Twitter intent API, WhatsApp API | Referral link sharing |
| QR code | `SharePanel.tsx` | `api.qrserver.com` external service | Third-party QR generation |
| Webhook/Slack/Workflow | All public pages | `dispatchWebhook`, `dispatchSlackNotification`, `dispatchWorkflowTrigger` | Fire-and-forget on submission |
| i18n | All pages | `useTranslation()` | Fully internationalized |
| Auth context | `Index.tsx`, `Pricing.tsx` | `useAuth()` | Conditional CTA rendering |
| Subscription context | `Pricing.tsx` | `useSubscription()` | Current plan detection |
| Templates | `Index.tsx` | `useTemplates()` | Featured templates section |

---

## 4. Parallelism Assessment

| Task | Can Run in Parallel | Notes |
|------|-------------------|-------|
| Landing page updates | Yes | Self-contained, no schema deps |
| Pricing page updates | Yes | Self-contained presentation layer |
| SharePanel improvements | Yes | Isolated component, used only in FormBuilder |
| Public form pages | Partially | Share `PublicForm.tsx` dispatcher; each mode-page is independent |
| 404 page improvements | Yes | Fully self-contained |
| SEO improvements | Yes | `index.html` + possible new meta components |
| Social sharing additions | Partially | WaitlistLandingPage has social share; would need to extend to other modes |

**Assessment**: High parallelism potential. Each public page is self-contained. SharePanel is isolated. SEO work is orthogonal to UI changes.

---

## 5. SEO Audit

### 5.1 Meta Tags (index.html)
| Tag | Present | Value |
|-----|---------|-------|
| `<title>` | YES | "FormForge -- Forms, Waitlists, Feedback & Support in One Platform" |
| `<meta name="description">` | YES | Comprehensive 200-char description |
| `<meta name="author">` | YES | "FormForge" |
| `<meta name="theme-color">` | YES | `#2f9e6e` (green) |
| `<meta name="viewport">` | YES | Standard responsive viewport |

### 5.2 Open Graph Tags
| Tag | Present | Value |
|-----|---------|-------|
| `og:title` | YES | Matches page title |
| `og:description` | YES | Shortened description |
| `og:type` | YES | `website` |
| `og:site_name` | YES | "FormForge" |
| `og:url` | **NO** | Missing |
| `og:image` | **NO** | Missing -- critical for social shares |

### 5.3 Twitter Card Tags
| Tag | Present | Value |
|-----|---------|-------|
| `twitter:card` | YES | `summary_large_image` |
| `twitter:title` | YES | Matches title |
| `twitter:description` | YES | Shortened description |
| `twitter:image` | **NO** | Missing -- card type `summary_large_image` requires image |

### 5.4 SEO Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| `robots.txt` | YES | Allows all crawlers (`public/robots.txt:1-15`) |
| `sitemap.xml` | **NO** | Not present |
| `canonical` URL | **NO** | No `<link rel="canonical">` |
| `hreflang` tags | **NO** | Not present despite en/he i18n support |
| Structured data (JSON-LD) | **NO** | No Schema.org markup |
| Favicon | YES | SVG + ICO (`public/favicon.svg`, `public/favicon.ico`) |
| Preconnect | YES | Supabase domain preconnected (`index.html:23`) |

### 5.5 Per-Page Dynamic SEO
| Page | Dynamic `<title>`? | Dynamic OG tags? | Notes |
|------|-------------------|-------------------|-------|
| Landing `/` | NO | NO | Uses static index.html tags |
| Pricing `/pricing` | NO | NO | Same static tags |
| Public Form `/f/:id` | NO | NO | Form title not reflected in document title |
| 404 `*` | NO | NO | Shows "404" in content but title still says "FormForge" |

**Critical gap**: This is an SPA with no server-side rendering. Social crawlers (Twitter, Facebook, Slack) will see only the static `index.html` meta tags for ALL pages, including public forms. Shared form links will show "FormForge" branding instead of the specific form title.

---

## 6. Responsive Design Audit

### 6.1 Landing Page (`Index.tsx`)
| Breakpoint | Behavior | Status |
|-----------|----------|--------|
| Mobile (<640px) | Single-column modes grid, stacked CTA buttons, hamburger replaced with minimal nav (two buttons) | PASS |
| Tablet (640-1024px) | 2-column modes grid, 2-column savings cards | PASS |
| Desktop (1024+) | 4-column modes grid, full nav | PASS |

- Responsive classes: `sm:py-28 lg:py-32`, `sm:grid-cols-2 lg:grid-cols-4`, `sm:flex-row`, `sm:text-5xl lg:text-6xl`
- Mobile nav: Shows only LanguageToggle + CTA button (`Index.tsx:116-123`), hides full nav links

### 6.2 Pricing Page (`Pricing.tsx`)
| Breakpoint | Behavior | Status |
|-----------|----------|--------|
| Mobile (<640px) | Single-column cards, scrollable comparison table | PASS |
| Tablet (640-1024px) | 2-column cards | PASS |
| Desktop (1024+) | 4-column cards with Growth highlighted + scaled up | PASS |

- Comparison table: `overflow-x-auto` handles horizontal scroll (`Pricing.tsx:363`)
- `min-w-[200px]` / `min-w-[100px]` prevent column collapse

### 6.3 Public Forms (`PublicForm.tsx` + mode pages)
| Component | Mobile | Desktop | Status |
|-----------|--------|---------|--------|
| Standard form | `max-w-2xl mx-auto px-4` | Centered, comfortable width | PASS |
| Waitlist page | `max-w-lg mx-auto px-4` | Centered card layout | PASS |
| Feedback survey | `max-w-2xl mx-auto px-4` | Centered with NPS grid | PASS (note below) |
| Support form | `max-w-2xl mx-auto px-4` | 2-col name/email row, full-width on mobile | PASS |
| Ticket tracking | `max-w-2xl mx-auto px-4` | 2-col lookup fields | PASS |

**Note on NPS grid**: The 0-10 score buttons use `grid-cols-6 sm:grid-cols-11` (`FeedbackSurveyPage.tsx:430`). On mobile, 11 buttons wrap to 2 rows of 6+5. This works but the last row has an orphan button that may look unbalanced.

### 6.4 404 Page (`NotFound.tsx`)
- Minimal centered layout, works at all sizes
- No responsive breakpoints needed

---

## 7. Accessibility Audit

### 7.1 Semantic HTML
| Page | `<main>` tag | `<nav>` tag | `<h1>` | `<h2>` hierarchy | Status |
|------|------------|------------|--------|-------------------|--------|
| Landing | NO | YES (inside header) | YES | YES (proper) | WARN |
| Pricing | NO | YES | YES | YES | WARN |
| Public Form | NO | N/A | YES | N/A | WARN |
| 404 | NO | N/A | YES | N/A | WARN |

**Issue**: No `<main>` landmark on any page. All content is within `<div>` wrappers.

### 7.2 ARIA Attributes
| Component | ARIA Usage | Status |
|-----------|-----------|--------|
| WaitlistLandingPage | `aria-label="Copy referral link"` on copy button | PARTIAL |
| FeedbackSurveyPage | `aria-label`, `aria-pressed` on NPS buttons | GOOD |
| SupportSubmitPage | `aria-label="Copy ticket number"`, `aria-hidden="true"` on asterisks | GOOD |
| NotFound | None | MISSING |
| Landing page | None | MISSING |
| SharePanel | None beyond shadcn defaults | MINIMAL |

### 7.3 Form Labels
| Form | Labels | Associated? | Status |
|------|--------|------------|--------|
| Waitlist signup | `<label htmlFor="waitlist-email">` | YES | PASS |
| Feedback survey | `<Label>` but NPS section uses generic `<Label>` without `htmlFor` | PARTIAL |
| Support ticket | `<Label htmlFor="field-name">` etc. | YES | PASS |
| Ticket tracking | `<Label>` without `htmlFor` | MISSING |

### 7.4 Keyboard Navigation
- Form controls: Standard browser defaults (tab through inputs/buttons)
- NPS buttons: Have `focus-visible:ring-2` styles (`FeedbackSurveyPage.tsx:440`)
- No skip-to-content link on any page
- No focus trap in SharePanel Sheet (handled by Radix Sheet primitive)

### 7.5 Color Contrast
- Uses semantic color tokens with dark mode variants
- NPS button colors provide good contrast for both states
- `text-muted-foreground` may have contrast issues at small sizes on light backgrounds

### 7.6 Screen Reader
- No `aria-live` regions for dynamic content (form submission success)
- Loading states use visual-only indicators (no `aria-busy`)
- 404 logs to console but doesn't announce via screen reader

---

## 8. Runtime Performance Audit

### 8.1 Largest Contentful Paint (LCP)
| Page | LCP Element | Risk | Notes |
|------|------------|------|-------|
| Landing | Hero `<h1>` text | LOW | Text-based, fast render |
| Pricing | Price cards | LOW | No images in critical path |
| Public Form | Form title `<h1>` | LOW | Single Supabase query |
| Waitlist | Hero `<h1>` + logo image | MEDIUM | Logo from external URL |

- All routes are lazy-loaded via `React.lazy()` (`App.tsx:18-57`) -- good for initial load
- Supabase preconnect in `index.html:23` -- good for API latency
- No image optimization (no `loading="lazy"`, no srcset) for branding logos

### 8.2 Cumulative Layout Shift (CLS)
| Page | CLS Risk | Cause |
|------|----------|-------|
| Landing | LOW | Static content, no async content that shifts layout |
| Public Form | MEDIUM | Loading state -> form content swap. Uses `min-h-screen` to prevent shift. |
| Waitlist | LOW | Form -> success card transition uses animation, not layout shift |
| Pricing | LOW | Static content |

### 8.3 JavaScript Bundle
- Code splitting via lazy routes -- each page is a separate chunk
- All public pages load Supabase client (~30KB gzipped)
- `useTranslation` loads i18n bundles (en/he) -- loaded on init, not per-page
- No unnecessary re-renders detected in public pages (simple `useState` patterns)

### 8.4 Network Requests
| Page | API Calls on Load | Notes |
|------|------------------|-------|
| Landing | 1 (featured templates) | Could be cached or deferred |
| Pricing | 1 (subscription check if authed) | Lightweight |
| Public Form | 2-3 (form data + workspace usage + subscription) | Sequential calls, could be parallelized |
| Waitlist | 1 (total signup count) | Lightweight |

**Issue**: `PublicForm.tsx:46-83` makes sequential calls: first fetches form, then (inside `.then`) fetches workspace usage, then fetches subscription. These three calls could be parallelized after the form fetch.

---

## 9. Code Architecture & Quality

### 9.1 Patterns
| Pattern | Implementation | Quality |
|---------|---------------|---------|
| Mode dispatch | `if/switch` in `PublicForm.tsx` | GOOD -- clear, follows existing pattern |
| Branding application | Props drilled to mode components | GOOD -- consistent across all modes |
| Share functionality | `SharePanel` component + inline copy in dashboards | FRAGMENTED -- two patterns for same concern |
| Social sharing | Only in `WaitlistLandingPage` | INCOMPLETE -- not available for other modes |
| Error handling | Try/catch with toast | CONSISTENT |
| i18n | Full coverage via `useTranslation()` | GOOD |

### 9.2 Code Duplication
| Duplication | Files | Lines |
|------------|-------|-------|
| Copy-link handler | `WaitlistDashboard.tsx`, `FeedbackDashboard.tsx`, `SupportDashboard.tsx` | ~10 lines each, nearly identical |
| Success screen layout | `FeedbackSurveyPage.tsx:307-361`, `SupportSubmitPage.tsx:287-379` | Very similar structure |
| Branding extraction | All public pages | Same `const primaryColor = branding?.primaryColor ?? ""` pattern |
| "Powered by" footer | `PublicForm.tsx:280-286`, `WaitlistLandingPage.tsx:494-498`, `FeedbackSurveyPage.tsx:355-358`, `SupportSubmitPage.tsx:373-376` | 4 copies with slight variations |

### 9.3 Type Safety
- `PublicForm.tsx` properly types `FormData` interface and `FormMode`
- `branding` is typed as `Record<string, string> | null` (loose) rather than `FormBranding` -- cast happens at render time (`PublicForm.tsx:236`)
- Mode pages receive `settings` as `Record<string, unknown> | null` -- type-safe but loses IDE autocomplete

### 9.4 Unused Imports
- `Index.tsx`: All imports appear used
- `PublicForm.tsx`: `useSearchParams` import used only for `ref` param on waitlist mode

---

## 10. Error Handling & Resilience

### 10.1 Error Scenarios
| Scenario | Handling | Quality |
|---------|---------|---------|
| Form not found | Shows custom "not found" UI | GOOD (`PublicForm.tsx:103-117`) |
| Form closed | Shows "form closed" message | GOOD (`PublicForm.tsx:119-135`) |
| Form draft | Shows "form in draft" message | GOOD (`PublicForm.tsx:137-153`) |
| Submission limit reached | Shows "not accepting responses" | GOOD (`PublicForm.tsx:156-172`) |
| Close-after-count | Shows "form closed" message | GOOD (`PublicForm.tsx:176-193`) |
| Supabase query failure | Sets `notFound = true` | ACCEPTABLE -- conflates error with not-found |
| Workspace usage check failure | Fails open (allows submission) | GOOD (`PublicForm.tsx:81-83`) |
| Submission failure | Toast error with message | GOOD (all mode pages) |
| Clipboard API failure | Toast error | GOOD (SharePanel, WaitlistLandingPage) |
| Network offline | No specific handling | MISSING |

### 10.2 Error Boundary
- Global `ErrorBoundary` wraps all routes (`App.tsx:185-191`)
- Logs errors via `logError()` (`ErrorBoundary.tsx:27-34`)
- Recovery options: "Retry" (reset state) + "Refresh" (reload page)

### 10.3 Edge Cases
- **Invalid UUID in URL**: Supabase returns null on bad UUID format; properly handled as not-found
- **Concurrent submissions**: No client-side debounce on submit buttons; `disabled={submitState === "submitting"}` prevents double-click
- **Very long form titles**: No text truncation on public pages; could overflow
- **Empty form fields array**: Handled with "no fields yet" message (`PublicForm.tsx:266-269`)

---

## 11. Documentation Audit

| Item | Documented in CLAUDE.md? | Accurate? |
|------|--------------------------|-----------|
| Public routes (`/f/:id`, `/track/:formId`) | YES (Section 6, Route Map) | YES |
| Mode dispatch pattern | YES (Section 7, 13) | YES |
| Toast system split (sonner for public) | YES (Section 7) | YES |
| SharePanel component | NO | N/A |
| Embed code generation | NO | N/A |
| Social sharing (waitlist) | NO | N/A |
| SEO tags (index.html) | NO | N/A |
| robots.txt | NO | N/A |
| QR code external dependency | NO | N/A |

---

## 12. Product Growth & Innovation

### 12.1 Current Growth Features
| Feature | Status | Impact |
|---------|--------|--------|
| Referral system (waitlist) | Implemented | HIGH -- viral loop |
| Social share buttons (X, WhatsApp) | Waitlist only | MEDIUM |
| "Powered by FormForge" branding | All public pages | MEDIUM -- organic brand awareness |
| QR code generation | Via SharePanel | LOW -- niche use case |
| Embed code | Via SharePanel | MEDIUM -- distribution channel |

### 12.2 Missing Growth Opportunities
| Opportunity | Impact | Effort |
|------------|--------|--------|
| **Dynamic OG images per form** | HIGH | MEDIUM -- requires server-side rendering or edge function |
| **Native Web Share API** | MEDIUM | LOW -- `navigator.share()` not used anywhere |
| **Social share buttons on all modes** | MEDIUM | LOW -- only waitlist has them |
| **Form preview cards** (link previews) | HIGH | HIGH -- needs SSR or prerender |
| **Public form analytics** (view count) | LOW | LOW -- increment counter on load |
| **Share tracking** (UTM params) | MEDIUM | LOW -- add UTM to share URLs |
| **Customizable success page** | MEDIUM | MEDIUM -- redirect or custom content |
| **Email sharing** (mailto: link) | LOW | LOW |

---

## 13. Issues Found

### P0 (Critical) -- None

### P1 (Important)

| # | Issue | File:Line | Impact |
|---|-------|-----------|--------|
| P1-1 | **No `og:image` meta tag** -- Social shares (Twitter, Facebook, Slack, LinkedIn) will show no preview image. `twitter:card` is set to `summary_large_image` which explicitly requires an image. | `index.html:18` | Every shared link looks broken/generic on social media |
| P1-2 | **No dynamic meta tags for public forms** -- Since this is a client-side SPA, all pages share the same static meta tags from `index.html`. When someone shares a public form link (`/f/:id`), social crawlers will show "FormForge" branding instead of the form title. | `index.html` + `PublicForm.tsx` | Shared form links have no contextual preview |
| P1-3 | **No `document.title` updates** -- The browser tab always shows the static title from `index.html` regardless of which page the user is on. Public forms, pricing, 404 -- all show the same tab title. | All pages | Poor UX -- users can't distinguish tabs; browser history is unclear |

### P2 (Moderate)

| # | Issue | File:Line | Impact |
|---|-------|-----------|--------|
| P2-1 | **No sitemap.xml** -- Search engines have no structured map of public pages. The landing, pricing, templates, and public form pages are not indexed efficiently. | `public/` | Reduced SEO discoverability |
| P2-2 | **No `<link rel="canonical">`** -- No canonical URL prevents duplicate content issues, especially for forms accessible at multiple URLs. | `index.html` | SEO penalty risk |
| P2-3 | **No `hreflang` tags** despite supporting en/he locales | `index.html` | International SEO gap |
| P2-4 | **404 page is minimal** -- No styled design, no suggestions, no search, hardcoded English text ("Oops! Page not found"), no i18n support. | `NotFound.tsx:12-20` | Poor UX for lost users, breaks i18n |
| P2-5 | **Sequential API calls in PublicForm** -- Form fetch, then workspace usage, then subscription check are chained sequentially. Could be parallelized. | `PublicForm.tsx:46-83` | Slower public page load time |
| P2-6 | **Copy-link handler duplicated** across 3 dashboards -- identical pattern of `navigator.clipboard.writeText(publicLink)` + toast + state toggle. | `WaitlistDashboard.tsx:121-127`, `FeedbackDashboard.tsx:267-273`, `SupportDashboard.tsx:502-508` | Maintenance burden |
| P2-7 | **"Powered by" footer duplicated 4 times** with slight condition variations -- `PublicForm.tsx:280`, `WaitlistLandingPage.tsx:494`, `FeedbackSurveyPage.tsx:355`, `SupportSubmitPage.tsx:373` | Multiple files | Inconsistent toggling logic |
| P2-8 | **QR code depends on external API** (`api.qrserver.com`) -- no fallback if service is down. | `SharePanel.tsx:40` | QR generation fails if external service is unavailable |
| P2-9 | **No `<main>` landmark** on any public page -- all content wrapped in plain `<div>` | All public pages | Accessibility: screen readers can't find main content region |
| P2-10 | **Social sharing only on waitlist mode** -- Feedback and Support success screens lack share buttons | `FeedbackSurveyPage.tsx`, `SupportSubmitPage.tsx` | Missed viral potential on 2 of 4 modes |
| P2-11 | **No `aria-live` regions** for dynamic state changes (loading -> content, form -> success) | All public pages | Screen readers not informed of content changes |
| P2-12 | **Embed iframe has fixed height (600px)** -- no auto-resize or responsive height option | `SharePanel.tsx:33` | Embedded forms may clip or have excess whitespace |
| P2-13 | **No `navigator.share()` integration** -- modern Web Share API not used for native mobile sharing | All share touchpoints | Missed native share sheet on mobile devices |
| P2-14 | **Ticket tracking label associations missing** -- `<Label>` elements in `TicketTrackingPage.tsx:135-150` lack `htmlFor` attributes | `TicketTrackingPage.tsx:135,143` | Form inputs not properly associated with labels for screen readers |
| P2-15 | **NotFound.tsx does not use `<Link>`** -- uses `<a href="/">` instead of React Router `<Link>`, causing full page reload | `NotFound.tsx:17` | Unnecessary full reload instead of client-side navigation |

---

## 14. Recommended Fix Path

### Phase 1: SEO Critical (P1-1, P1-2, P1-3)
1. **Add `og:image`**: Create a branded OG image (1200x630px) and add `<meta property="og:image">` + `<meta name="twitter:image">` to `index.html` -- resolves P1-1 immediately.
2. **Add `document.title` hook**: Create a `useDocumentTitle(title: string)` hook and apply it in `Index.tsx`, `Pricing.tsx`, `PublicForm.tsx`, `NotFound.tsx` -- resolves P1-3.
3. **Dynamic meta for public forms (long-term)**: For P1-2, requires either:
   - (a) A Supabase Edge Function that serves pre-rendered HTML with form-specific OG tags for crawler user agents, or
   - (b) A lightweight SSR middleware (e.g., prerender.io) that generates meta tags for social crawlers.

### Phase 2: SEO Infrastructure (P2-1, P2-2, P2-3)
4. **Generate `sitemap.xml`**: At minimum, a static sitemap with `/`, `/pricing`, `/templates`. For dynamic form pages, generate via Edge Function or build script.
5. **Add canonical and hreflang tags**: Add to `index.html` or dynamically via the document title hook.

### Phase 3: Accessibility (P2-9, P2-11, P2-14)
6. **Add `<main>` landmark**: Wrap page content in `<main>` on all public pages.
7. **Add `aria-live` regions**: Announce form submission success/failure.
8. **Fix label associations**: Add `htmlFor` to `TicketTrackingPage.tsx` labels.

### Phase 4: UX Polish (P2-4, P2-12, P2-13, P2-15)
9. **Improve 404 page**: Add i18n, styled design, "Return to Home" via `<Link>`, search suggestions.
10. **Add responsive embed**: Include a `postMessage`-based auto-resize script for embedded iframes.
11. **Add Web Share API**: Use `navigator.share()` with fallback to current clipboard approach.
12. **Fix NotFound Link**: Replace `<a href="/">` with `<Link to="/">`.

### Phase 5: Code Quality (P2-5, P2-6, P2-7, P2-8)
13. **Parallelize PublicForm API calls**: Use `Promise.all` for workspace usage + subscription after form fetch.
14. **Extract shared utilities**: `useCopyToClipboard()` hook, `PoweredByFooter` component.
15. **QR fallback**: Add a client-side QR library as fallback (e.g., `qrcode` npm package -- requires approval).
