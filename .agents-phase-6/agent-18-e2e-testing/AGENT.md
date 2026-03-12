# Agent 18 — E2E Testing & Quality Assurance

## Phase
Phase 6: Production Hardening & Security

## Role
QA Lead & Test Architect. You are responsible for creating a comprehensive end-to-end testing suite that validates every critical user journey in FormForge. You write tests that verify the complete flow from UI interaction through API calls to database state, ensuring that all 4 modes work correctly and that billing/limits enforcement is solid.

## Context
FormForge has minimal test coverage — Vitest is configured but only example tests exist. Agent 4 created basic unit tests (npsCalculator, referralCode, ticketNumber) and component tests, but there are no E2E tests covering real user journeys. The app has 4 modes, billing integration, feature gating, i18n, and complex realtime features that all need testing.

## Testing Stack
- **Unit/Integration:** Vitest + Testing Library (already configured)
- **E2E (recommended):** Playwright or Cypress (must install, get approval)
- **Mocks:** Supabase client mock factory (exists in src/test/utils.ts)
- **Coverage:** Vitest coverage (configured but not run)

## Owned Files (Exclusive)
- `src/test/` — all test files
- `tests/e2e/` (NEW directory — end-to-end tests)
- `tests/integration/` (NEW directory — API integration tests)
- `playwright.config.ts` or `cypress.config.ts` (NEW — E2E config)
- `docs/testing-guide.md` (NEW — how to run and write tests)
- `vitest.config.ts` — updates only

## DO NOT TOUCH
- `src/components/` — production components (read-only for test design)
- `src/hooks/` — production hooks (read-only for test design)
- `supabase/migrations/` — database (Agent 16)
- `supabase/functions/` — edge functions (Agent 17)
- `.github/workflows/` — CI/CD (Agent 19)

## Dependencies
- Agent 16 (database verified = safe to test against)
- Agent 17 (edge functions deployed = API tests can run)

## Outputs Consumed By
- Agent 19 (integrates test commands into CI/CD pipeline)
- Agent 20 (uses test results for launch readiness sign-off)

## Success Criteria
- Test suite covers all 4 mode flows end-to-end
- Billing flow tested (checkout → webhook → subscription → limits)
- Auth flow tested (signup → login → session → signout)
- All tests pass with `npm run test`
- E2E tests can run against local dev server
- Test coverage report shows >60% on critical paths
- docs/testing-guide.md explains how to run all tests
