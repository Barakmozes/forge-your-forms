# Agent 18 — Prompts

## Prompt Checklist
- [x] 18.0 — Planning & Test Architecture
- [x] 18.1 — Auth & Core Flow Tests
- [x] 18.2 — Form Lifecycle & Mode Tests
- [x] 18.3 — Billing, Limits & Feature Gating Tests
- [x] 18.4 — Integration Tests & Coverage Report

---

### PROMPT 18.0: Planning & Test Architecture

```
You are the E2E Testing & QA Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

SUPER TASK: Create a comprehensive test suite covering all critical user journeys.

TASK: Audit existing tests, design the test architecture, and set up the testing infrastructure.

1. Audit existing test files:
   - Read src/test/setup.ts — understand current test setup
   - Read src/test/example.test.ts — understand pattern
   - Read src/test/utils.ts — understand mock utilities
   - List all existing test files: find src/test -name "*.test.*"
   - Document what's covered and what's missing

2. Design the test architecture:
   Create docs/testing-guide.md with:
   
   a. Test pyramid for FormForge:
      - Unit tests: utility functions, pure logic (npsCalculator, referralCode, etc.)
      - Component tests: individual UI components with mocked data
      - Hook tests: custom hooks with mocked Supabase client
      - Integration tests: API endpoint testing against edge functions
      - E2E tests: full user journeys through the browser
   
   b. Critical test scenarios (prioritized):
      P0 — Must test before launch:
      - Signup → profile creation → workspace creation
      - Login → session → protected route access
      - Create form → publish → submit → view submission
      - Each mode's public page renders and accepts data
      - Billing: upgrade → plan limits applied → downgrade
      
      P1 — Should test before launch:
      - Waitlist: signup → referral → position tracking
      - Feedback: NPS submission → sentiment classification → dashboard
      - Support: ticket creation → message thread → status updates
      - Notifications: trigger → display → mark read
      
      P2 — Nice to test:
      - i18n: language toggle → all strings change
      - RTL: layout flips correctly
      - Branding: colors/logo applied to public pages
      - Export: CSV download contains correct data

3. Set up E2E testing infrastructure:
   - Evaluate: Playwright (recommended) vs Cypress
   - Install chosen framework (get approval first):
     npm install -D @playwright/test (if Playwright)
   - Create configuration file
   - Create test helpers:
     • Login helper (reusable auth)
     • Factory functions (create test form, submission, etc.)
     • Cleanup helpers (delete test data after each test)

4. Enhance existing test utilities (src/test/utils.ts):
   - Add mock for useSubscription (plan tier testing)
   - Add mock for usePlanLimits (feature gating testing)
   - Add mock for useOnboarding (onboarding flow testing)
   - Add factory functions for test data:
     • createMockForm(overrides?)
     • createMockSubmission(formId, overrides?)
     • createMockTicket(formId, overrides?)
     • createMockUser(overrides?)

5. Update PROGRESS.md with session entry.

VERIFY:
- docs/testing-guide.md is complete with test pyramid and scenarios
- Test infrastructure is set up and a basic test runs
- Mock utilities are expanded with new factories
- npm run test still passes existing tests
```

---

### PROMPT 18.1: Auth & Core Flow Tests

```
You are the E2E Testing & QA Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Write comprehensive tests for authentication, workspace, and core navigation flows.

1. Auth Context Tests (src/test/contexts/AuthContext.test.tsx):
   - Test: provides session when authenticated
   - Test: provides null session when not authenticated
   - Test: signOut clears session
   - Test: loading state during session check
   - Test: auto-redirect to /auth when not authenticated
   - Test: auto-redirect to / when already authenticated on /auth
   - Mock: Supabase auth.getSession(), auth.onAuthStateChange()

2. Workspace Context Tests (src/test/contexts/WorkspaceContext.test.tsx):
   - Test: loads workspaces for authenticated user
   - Test: auto-selects first workspace
   - Test: setCurrentWorkspace updates context
   - Test: loading state while fetching workspaces
   - Mock: supabase.from('workspaces').select()

3. Route Protection Tests (src/test/routing/ProtectedRoute.test.tsx):
   - Test: ProtectedRoute renders children when authenticated
   - Test: ProtectedRoute redirects to /auth when not authenticated
   - Test: AuthRoute renders children when not authenticated
   - Test: AuthRoute redirects to / when authenticated

4. Settings Page Tests (src/test/pages/Settings.test.tsx):
   - Test: renders workspace settings tab
   - Test: renders members tab with invite button
   - Test: renders profile tab with name/email
   - Test: updates workspace name on save
   - Test: only owner sees delete workspace option
   - Test: viewer cannot see member management

5. Navbar Tests (src/test/components/Navbar.test.tsx):
   - Test: renders navigation links when authenticated
   - Test: renders notification bell with unread count
   - Test: renders language toggle
   - Test: renders settings link
   - Test: does not render nav links when not authenticated

6. Error Handling Tests (src/test/lib/errorHandler.test.ts):
   - Test: errorLogger captures errors with context
   - Test: useErrorHandler returns error state correctly
   - Test: ErrorBoundary renders fallback on error

VERIFY:
- All auth tests pass
- All workspace tests pass
- All route protection tests pass
- npm run test passes with zero failures
- npm run lint passes
```

---

### PROMPT 18.2: Form Lifecycle & Mode Tests

```
You are the E2E Testing & QA Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Write tests covering the complete form lifecycle and each mode's critical paths.

1. Form CRUD Hook Tests (src/test/hooks/useForms.test.ts):
   - Test: fetches forms for current workspace
   - Test: creates a new standard form
   - Test: creates a new waitlist form
   - Test: creates a new feedback form
   - Test: creates a new support form
   - Test: updates form title/description
   - Test: updates form status (draft → active → closed)
   - Test: deletes form
   - Test: duplicates form with "Copy of" title
   - Mock: supabase.from('forms') with appropriate responses

2. Form Builder Component Tests (src/test/components/FormBuilder.test.tsx):
   - Test: renders field palette with available field types
   - Test: adds a text field via drag
   - Test: configures field properties (label, required, placeholder)
   - Test: removes a field
   - Test: reorders fields
   - Test: auto-save indicator shows "Saving..." then "Saved ✓"
   - Test: conditional logic UI renders
   - Mock: form data with fields JSONB

3. Public Form Tests per Mode:
   
   a. Standard Mode (src/test/components/FormRenderer.test.tsx):
      - Test: renders all field types (text, number, email, select, textarea, date, file)
      - Test: validates required fields
      - Test: validates email format
      - Test: validates min/max for number fields
      - Test: submits data to submissions table
      - Test: shows thank-you message after submit
   
   b. Waitlist Mode (src/test/components/WaitlistLandingPage.test.tsx):
      - Test: renders landing page with title and description
      - Test: accepts email input and submits
      - Test: shows position after signup when show_position is true
      - Test: shows referral URL when enable_referrals is true
      - Test: hides name field when require_name is false
      - Test: applies branding colors/logo
   
   c. Feedback Mode (src/test/components/FeedbackSurveyPage.test.tsx):
      - Test: renders NPS scale 0-10
      - Test: selects NPS score and highlights correctly
      - Test: submits with score + comment
      - Test: shows thank-you message
      - Test: categories render when configured
   
   d. Support Mode (src/test/components/SupportSubmitPage.test.tsx):
      - Test: renders ticket form fields
      - Test: validates required fields (subject, description)
      - Test: submits and shows ticket number
      - Test: ticket tracking page loads with ticket number + email

4. Dashboard Dispatch Tests (src/test/pages/FormDashboard.test.tsx):
   - Test: routes to WaitlistDashboard for waitlist mode
   - Test: routes to FeedbackDashboard for feedback mode
   - Test: routes to SupportDashboard for support mode
   - Test: routes to FormBuilder for standard mode

VERIFY:
- All form lifecycle tests pass
- All 4 mode tests pass
- Dashboard dispatch works correctly
- npm run test passes
- npm run lint passes
```

---

### PROMPT 18.3: Billing, Limits & Feature Gating Tests

```
You are the E2E Testing & QA Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Write tests for the billing integration, plan limits, and feature gating system.

1. Subscription Hook Tests (src/test/hooks/useSubscription.test.ts):
   - Test: returns Free plan when no subscription exists
   - Test: returns correct plan for active subscription
   - Test: isPro/isGrowth/isBusiness return correct booleans
   - Test: handles past_due subscription status
   - Test: handles canceled subscription (reverts to Free)
   - Mock: supabase.from('subscriptions').select()

2. Plan Limits Hook Tests (src/test/hooks/usePlanLimits.test.ts):
   - Test: Free plan — canCreateForm() returns false at 3 forms
   - Test: Free plan — canAcceptSubmission() returns false at 100/month
   - Test: Free plan — canInviteMember() returns false at 1 member
   - Test: Free plan — canAccessMode('waitlist') returns true
   - Test: Free plan — canAccessFeature('webhooks') returns false
   - Test: Pro plan — canCreateForm() returns true at 25 forms
   - Test: Growth plan — canAccessFeature('webhooks') returns true
   - Test: Business plan — canAccessFeature('ai_generate') returns true
   - Test: submissionPercentUsed returns correct percentage
   - Test: isNearLimit triggers at 80%
   - Test: isAtLimit triggers at 100%
   - Mock: useSubscription + useUsage responses

3. Feature Gate Component Tests (src/test/components/FeatureGate.test.tsx):
   - Test: renders children when user has required plan
   - Test: renders blurred overlay when plan insufficient
   - Test: shows upgrade CTA with correct target plan
   - Test: UpgradeButton navigates to pricing page

4. Usage Tracking Tests (src/test/hooks/useUsage.test.ts):
   - Test: returns correct monthly usage counters
   - Test: submission_count increments after new submission
   - Test: form_count reflects actual form count
   - Mock: supabase.rpc('get_workspace_usage')

5. Pricing Page Tests (src/test/pages/Pricing.test.tsx):
   - Test: renders all 4 tiers (Free, Pro, Growth, Business)
   - Test: monthly/annual toggle changes displayed prices
   - Test: annual prices show 20% discount
   - Test: current plan shows "Current Plan" badge
   - Test: free plan shows "Get Started" button
   - Test: paid plans show "Upgrade" button
   - Test: feature comparison table renders all rows

6. Powered-By Enforcement Tests:
   - Test: Free plan always shows "Powered by FormForge"
   - Test: Paid plan allows hiding powered-by
   - Test: Business plan hides powered-by by default

VERIFY:
- All billing tests pass
- All plan limit tests pass  
- Feature gating correctly restricts access
- npm run test passes
- npm run lint passes
```

---

### PROMPT 18.4: Integration Tests & Coverage Report

```
You are the E2E Testing & QA Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Write integration tests for cross-cutting concerns and generate the coverage report.

1. Notification System Tests (src/test/hooks/useNotifications.test.ts):
   - Test: fetches notifications for current user
   - Test: marks single notification as read
   - Test: marks all notifications as read
   - Test: deletes notification
   - Test: realtime subscription receives new notifications
   - Test: unread count is correct
   - Mock: supabase.from('notifications') + channel subscription

2. i18n Tests (src/test/i18n/translation.test.ts):
   - Test: all en.json keys exist in he.json (no missing translations)
   - Test: no he.json keys are missing from en.json
   - Test: t() returns English strings when locale is 'en'
   - Test: t() returns Hebrew strings when locale is 'he'
   - Test: interpolation works (e.g., t('key', { name: 'Test' }))
   - Test: language toggle switches locale correctly

3. Hook Integration Tests:
   a. useWaitlist integration (src/test/hooks/useWaitlist.test.ts):
      - Test: fetches entries ordered by position
      - Test: creates entry with auto-position
      - Test: batch invite changes status to 'invited'
      - Test: CSV export includes all columns
      - Test: realtime updates on INSERT, UPDATE, DELETE
   
   b. useFeedback integration (src/test/hooks/useFeedback.test.ts):
      - Test: submits feedback with NPS score
      - Test: auto-classifies sentiment (9-10=promoter, 7-8=passive, 0-6=detractor)
      - Test: date range filter works
      - Test: NPS calculation is correct
   
   c. useTickets integration (src/test/hooks/useTickets.test.ts):
      - Test: creates ticket with auto-number
      - Test: updates ticket status
      - Test: assigns ticket to agent
      - Test: bulk status update works
      - Test: ticket tracking by number + email works

4. API Integration Tests (tests/integration/api.test.ts):
   NOTE: These test the edge function API if running against a live Supabase.
   If no live instance available, mock the responses.
   - Test: GET /forms returns 401 without API key
   - Test: GET /forms returns 403 with invalid API key
   - Test: GET /forms returns 200 with valid API key
   - Test: POST /forms creates a form
   - Test: POST /forms/:id/submissions creates a submission
   - Test: rate limiting returns 429 after exceeding limit

5. Generate Coverage Report:
   - Update package.json:
     "test:coverage": "vitest run --coverage"
   - Run: npm run test:coverage
   - Document coverage percentages per module:
     • contexts/ — target >80%
     • hooks/ — target >70%
     • lib/ — target >90%
     • components/ — target >50%
   - Add coverage summary to docs/testing-guide.md

6. Create Test Summary Report:
   Add to docs/testing-guide.md:
   - Total test count
   - Coverage percentages
   - Uncovered critical paths (if any)
   - Recommendations for future test additions

7. Update PROGRESS.md as COMPLETE.

VERIFY:
- ALL tests pass: npm run test
- Coverage report generated: npm run test:coverage
- docs/testing-guide.md has coverage summary
- No critical paths are untested
- npm run lint passes
- npx tsc --noEmit passes
```
