# AGENT 4: Polish, Production & Launch — Ready-to-Copy Prompts

## AGENT IDENTITY & RULES
Copy this preamble into every chat session for Agent 4:

```
You are Agent 4 (Polish, Production & Launch) for FormForge — an independent 
SaaS platform for forms, waitlists, feedback/NPS, and support tickets.

Tech stack: Vite + React 18 + TypeScript + Supabase + shadcn/ui + TailwindCSS.
Testing: Vitest + Testing Library (already configured).

CRITICAL RULES:
- Always use @/ import alias — never relative ../../
- Run npm run lint before declaring work complete
- Run npx tsc --noEmit to type-check
- No "use client" — Vite SPA, NOT Next.js
- Emerald/green primary palette
- Use shadcn/ui components for all UI
- Performance: lazy load routes, code splitting

YOUR OWNED FILES:
- src/pages/Index.tsx (rewrite as landing page)
- src/pages/Pricing.tsx (NEW)
- src/components/landing/ (NEW)
- src/components/pricing/ (NEW)
- src/test/ (all test files)
- vitest.config.ts (updates)
- .github/workflows/ (NEW)
- public/ (assets, favicon, OG images)
- index.html (meta tags, SEO)
- vercel.json, netlify.toml (NEW)
- docs/ (NEW)

DO NOT TOUCH:
- src/components/waitlist/ (Agent 3)
- src/components/feedback/ (Agent 3)
- src/components/support/ (Agent 3)
- src/pages/FormBuilder.tsx (Agent 2)
- src/contexts/ (Agent 1)
- supabase/migrations/ (Agents 1 & 3)

The GitHub repo is: https://github.com/Barakmozes/forge-your-forms
Clone it and read CLAUDE.md before starting any task.
```

---

## PROMPT 4.1 — Landing Page
```
TASK: Build conversion-optimized landing page.

IMPORTANT: Vite React SPA, NOT Next.js. No "use client".
shadcn/ui + TailwindCSS only. Emerald/green primary.

1. Rewrite src/pages/Index.tsx as public landing page:
   
   Hero:
   - Headline: "One platform for forms, waitlists, feedback & support"
   - Sub: "Stop paying for 4 tools. FormForge unifies everything your 
     business needs to collect and act on information."
   - CTAs: "Get Started Free" → /auth, "See Pricing" → /pricing

   How it works (4 cards):
   - Standard Forms: "Build any form with drag-and-drop"
   - Waitlist: "Launch with viral waitlists & referrals"
   - Feedback: "Measure NPS & catch at-risk customers"
   - Support: "Manage tickets with Kanban boards"

   Social proof:
   - "Replaces 4 tools in 1" comparison
   - Savings: Typeform($25)+Waitlist API($15)+Delighted($224)+Zendesk($19) 
     = $283 vs FormForge $29

   Features grid:
   - Drag-and-drop builder, Referral engine, NPS analytics, Kanban boards,
     Team collaboration, CSV export, Custom branding, Public pages, Realtime

   CTA: "Start free — no credit card required"
   Footer: Logo, Product, Pricing, Docs links

2. Routing in App.tsx:
   - / → Landing (not authenticated)
   - / → Dashboard/Forms (authenticated)
   - Use existing AuthRoute/ProtectedRoute

3. Update index.html:
   - Title: "FormForge — Forms, Waitlists, Feedback & Support in One Platform"
   - Meta description, Open Graph tags
   - Favicon: simple green "F"

VERIFY: Landing renders for logged-out, dashboard for logged-in.
CTAs link correctly. Mobile responsive. Lint + type-check pass.
```

---

## PROMPT 4.2 — Pricing Page
```
TASK: Build pricing page with tier comparison.

1. src/pages/Pricing.tsx (route: /pricing, public):
   - Header: "Simple pricing that grows with you"
   - Monthly/Annual toggle (annual = 20% discount)

   FREE ($0):
   - 3 standard forms, 1 waitlist, 100 submissions/mo, 1 member, 
     FormForge branding

   PRO ($29/mo, $23/mo annual):
   - Unlimited forms, 3 waitlists, 3 feedback surveys, 5000 subs/mo,
     3 members, custom branding, referral engine, basic NPS

   GROWTH ($59/mo, $47/mo annual) — "Most Popular":
   - All Pro + unlimited waitlists/feedback, 1 support inbox, 
     25000 subs/mo, 10 members, Kanban, SLA, API, webhooks, A/B

   BUSINESS ($99/mo, $79/mo annual):
   - Everything unlimited, SSO, workflow automation, AI, white-label

   Each card: feature list + CTA button
   Free → "Get Started Free", Paid → "Start Free Trial" → /auth

2. Feature comparison table (full, with checks/crosses, sticky header)

3. FAQ: Change plans? Hit limit? Free trial? Cancel?

4. Add "Pricing" to Navbar (visible when not authenticated) + footer

VERIFY: Toggle switches prices, responsive cards, links work.
Lint + type-check pass.
```

---

## PROMPT 4.3 — Testing Foundation
```
TASK: Establish testing with critical unit and integration tests.

1. Test utilities (src/test/utils.ts):
   - Mock Supabase client factory
   - Mock Auth/Workspace context providers
   - renderWithProviders helper (QueryClient, Router, Auth, Workspace)

2. Unit tests:
   src/test/lib/npsCalculator.test.ts:
   - NPS calculation with known inputs
   - Sentiment classification (0-6, 7-8, 9-10)
   - Edge cases: empty, single, all same

   src/test/lib/referralCode.test.ts:
   - 8 chars alphanumeric
   - Uniqueness (100 generated)

   src/test/lib/ticketNumber.test.ts:
   - TICK-001 format

3. Component tests:
   src/test/components/FormRenderer.test.tsx:
   - Renders text field, select with options
   - Required validation
   - Submit calls onSubmit correctly

   src/test/components/Navbar.test.tsx:
   - Renders nav links
   - Bell shows count

4. Hook tests:
   src/test/hooks/usePagination.test.ts:
   - Page calculation, next/prev, range

VERIFY: npm run test passes all. Tests are meaningful.
Lint passes.
```

---

## PROMPT 4.4 — CI/CD & Production Deployment
```
TASK: CI/CD pipeline and deployment config.

1. .github/workflows/ci.yml:
   on: [push, pull_request]
   Jobs: lint → type-check → test → build
   Node 20, npm ci, upload dist artifact

2. docs/deployment.md:
   - Vercel (recommended): one-click SPA deploy
   - Netlify: drag dist
   - Cloudflare Pages: GitHub integration
   - Env var setup per platform

3. vercel.json:
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }

4. netlify.toml:
   build command, publish dir, SPA redirect

5. Performance:
   - vite.config.ts: code splitting for routes
   - Lazy load: const Forms = lazy(() => import('./pages/Forms'))
   - React.Suspense with loading fallback in App.tsx
   - Verify bundle size with npm run build

VERIFY: CI YAML valid, build produces dist/, lazy loading works.
Lint + type-check pass.
```
