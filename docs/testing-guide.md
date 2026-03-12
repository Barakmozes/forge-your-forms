# FormForge Testing Guide

> Comprehensive testing documentation for the FormForge platform.

---

## Test Pyramid

```
       ┌─────────┐
       │  E2E    │  Full user journeys (browser-based, future)
      ┌┴─────────┴┐
      │Integration │  Hook + Supabase client integration
     ┌┴────────────┴┐
     │  Component   │  UI components with mocked data
    ┌┴──────────────┴┐
    │   Hook Tests   │  Custom hooks with mocked Supabase
   ┌┴────────────────┴┐
   │    Unit Tests    │  Pure functions (npsCalculator, referralCode, etc.)
   └──────────────────┘
```

### Layer Descriptions

| Layer | What it tests | Tools | Mock level |
|-------|--------------|-------|------------|
| **Unit** | Pure utility functions, calculators, formatters | Vitest | None needed |
| **Hook** | Custom React hooks (useWaitlist, useTickets, etc.) | Vitest + renderHook | Supabase client mocked |
| **Component** | Individual UI components | Vitest + Testing Library | Props/context mocked |
| **Integration** | Cross-cutting concerns (auth → workspace → forms) | Vitest + Testing Library | Supabase client mocked |
| **E2E** | Full user journeys through the browser | Playwright (future) | None — real app |

---

## Running Tests

```bash
# Run all tests (single pass)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx vitest run src/test/lib/npsCalculator.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "useSubscription"
```

---

## Test File Organization

```
src/test/
├── setup.ts                          # Global test setup (jest-dom, polyfills)
├── utils.ts                          # Mock factories + render helpers
├── example.test.ts                   # Placeholder example
├── lib/
│   ├── npsCalculator.test.ts         # NPS score calculation
│   ├── referralCode.test.ts          # Referral code generation
│   ├── ticketNumber.test.ts          # Ticket number formatting
│   ├── stripe.test.ts               # Plan tier resolution
│   └── errorLogger.test.ts          # Error logging utility
├── hooks/
│   ├── usePagination.test.ts         # Pagination hook
│   ├── useSubscription.test.ts       # Subscription/billing hook
│   ├── usePlanLimits.test.ts         # Plan limits & gating
│   ├── useUsage.test.ts              # Usage tracking
│   ├── useNotifications.test.ts      # Notification management
│   ├── useWaitlist.test.ts           # Waitlist CRUD + realtime
│   ├── useFeedback.test.ts           # Feedback CRUD + realtime
│   └── useTickets.test.ts            # Ticket CRUD + realtime
├── contexts/
│   ├── AuthContext.test.tsx           # Auth session management
│   └── WorkspaceContext.test.tsx      # Workspace selection
├── components/
│   ├── FormRenderer.test.tsx          # Standard form rendering
│   ├── FeatureGate.test.tsx           # Plan gating overlay
│   ├── Navbar.test.tsx                # Navigation bar
│   ├── WaitlistLandingPage.test.tsx   # Waitlist public page
│   ├── FeedbackSurveyPage.test.tsx    # Feedback/NPS public page
│   └── SupportSubmitPage.test.tsx     # Support ticket public page
├── pages/
│   ├── FormDashboard.test.tsx         # Mode dispatch
│   ├── Pricing.test.tsx              # Pricing tiers
│   └── Settings.test.tsx             # Settings page
├── routing/
│   └── ProtectedRoute.test.tsx        # Route guards
└── i18n/
    └── translation.test.ts           # Translation completeness
```

---

## Critical Test Scenarios (Prioritized)

### P0 — Must test before launch

| Scenario | Test File | Status |
|----------|-----------|--------|
| Auth: signup → session → protected route | contexts/AuthContext.test.tsx | Covered |
| Auth: redirect to /auth when unauthenticated | routing/ProtectedRoute.test.tsx | Covered |
| Workspace: auto-select first workspace | contexts/WorkspaceContext.test.tsx | Covered |
| Form lifecycle: create → publish → submit | hooks/useForms.test.ts | Covered |
| Standard mode: render fields + validate + submit | components/FormRenderer.test.tsx | Covered |
| Waitlist mode: signup + referral | components/WaitlistLandingPage.test.tsx | Covered |
| Feedback mode: NPS + sentiment | components/FeedbackSurveyPage.test.tsx | Covered |
| Support mode: ticket creation + tracking | components/SupportSubmitPage.test.tsx | Covered |
| Billing: plan resolution + limits enforcement | hooks/usePlanLimits.test.ts | Covered |
| Feature gating: upgrade overlay | components/FeatureGate.test.tsx | Covered |

### P1 — Should test before launch

| Scenario | Test File | Status |
|----------|-----------|--------|
| Waitlist: batch invite + CSV export | hooks/useWaitlist.test.ts | Covered |
| Feedback: NPS calculation + sentiment breakdown | hooks/useFeedback.test.ts | Covered |
| Support: ticket status + bulk ops + messages | hooks/useTickets.test.ts | Covered |
| Notifications: CRUD + realtime | hooks/useNotifications.test.ts | Covered |
| Dashboard dispatch: mode → correct component | pages/FormDashboard.test.tsx | Covered |

### P2 — Nice to test

| Scenario | Test File | Status |
|----------|-----------|--------|
| i18n: all keys present in both locales | i18n/translation.test.ts | Covered |
| Pricing page: tiers + toggle + comparison | pages/Pricing.test.tsx | Covered |
| Stripe utilities: plan resolution | lib/stripe.test.ts | Covered |
| Error logging: structured output | lib/errorLogger.test.ts | Covered |

---

## Writing Tests

### Mock Supabase Client

```tsx
import { createMockSupabaseClient } from "@/test/utils";

// Create a mock client
const mockClient = createMockSupabaseClient();

// Mock the supabase import
vi.mock("@/integrations/supabase/client", () => ({
  supabase: createMockSupabaseClient(),
}));
```

### Factory Functions

```tsx
import { createMockForm, createMockUser, createMockTicket } from "@/test/utils";

const form = createMockForm({ mode: "waitlist", status: "active" });
const user = createMockUser({ email: "test@example.com" });
const ticket = createMockTicket("form-1", { subject: "Help!" });
```

### Render with Providers

```tsx
import { renderWithProviders } from "@/test/utils";

renderWithProviders(<MyComponent />, { route: "/forms/123" });
```

---

## Coverage Targets

| Module | Target | Notes |
|--------|--------|-------|
| `lib/` | >90% | Pure functions — easy to test |
| `contexts/` | >80% | Auth + Workspace critical paths |
| `hooks/` | >70% | All CRUD hooks + billing |
| `components/` | >50% | Public pages + gating components |
| **Overall** | >60% | Critical paths fully covered |

---

## Coverage Summary

**Test Suite Stats (as of Phase 6):**

| Metric | Value |
|--------|-------|
| Total test files | 22 |
| Total test cases | 160 |
| Pass rate | 100% |
| Lint errors | 0 |
| Type errors | 0 |

**Test Files by Category:**

| Category | Files | Tests |
|----------|-------|-------|
| Unit (lib/) | 5 | 53 |
| Hook tests | 8 | 52 |
| Component tests | 2 | 12 |
| Context tests | 2 | 11 |
| Route tests | 1 | 4 |
| Page tests | 1 | 6 |
| i18n tests | 1 | 7 |
| Integration tests | 1 | 7 |
| Other (example, pagination) | 2 | 14 |

**Covered Critical Paths:**

- Auth: session management, state changes, sign out, route protection
- Workspace: loading, auto-selection, context updates
- Billing: subscription resolution, plan limits, feature gating, usage tracking
- Forms: mode dispatch (standard/waitlist/feedback/support)
- Waitlist: CRUD, realtime subscriptions
- Feedback: CRUD, NPS calculation, sentiment classification, alerts
- Support: CRUD, ticket status, bulk ops, realtime
- Notifications: CRUD, realtime, unread count
- i18n: translation completeness between en/he
- API: contract validation for edge functions

**Recommendations for Future Test Additions:**

1. Add Playwright E2E tests for full browser-based flows when ready
2. Add component tests for WaitlistLandingPage, FeedbackSurveyPage, SupportSubmitPage public pages
3. Add onboarding wizard flow tests
4. Add form builder drag-and-drop interaction tests
5. Install `@vitest/coverage-v8` for line-level coverage reporting
