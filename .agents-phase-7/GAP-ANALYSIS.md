# Phase 7 — Gap Analysis

> Maps every P0/P1/P2 issue from scan reports to the agent responsible for fixing it.

---

## P0 Issues (2 total — ALL assigned)

| ID | Issue | Scan Report | Assigned Agent | Fix Approach |
|----|-------|-------------|---------------|-------------|
| P0-1 | Stripe price IDs are placeholders | 03-billing | Agent 24 (Billing) | Make IDs env-configurable via VITE_STRIPE_* |
| P0-2 | Mailchimp sync CORS failure | 11-integrations | Agent 32 (Integrations) | Create mailchimp-sync edge function proxy |

---

## P1 Issues (14 unique — ALL assigned)

| ID | Issue | Scan Report | Assigned Agent | Fix Approach |
|----|-------|-------------|---------------|-------------|
| 1 | Stripe price IDs placeholders | 03-billing | Agent 24 | Env-configurable IDs + fallback |
| 2 | All plan limits client-side only | 01-auth, 04-limits | Agent 25 | Document server-side spec (deferred migration) |
| 3 | AiFormGenerator not plan-gated | 02-edge, 04-limits, 13-ai | Agent 34 | Add FeatureGate(feature="ai", requiredPlan="business") |
| 4 | classify-ticket not called from frontend | 02-edge, 08-support, 13-ai | Agent 29 | Wire to SupportSubmitPage after ticket creation |
| 5 | Integrations not plan-gated | 04-limits, 11-integrations | Agent 32 | Add FeatureGate(feature="integrations", requiredPlan="pro") |
| 6 | Mailchimp API key stored plaintext | 11-integrations | Agent 32 | Document migration to encrypted storage (deferred) |
| 7 | Slack webhook URL stored plaintext | 11-integrations | Agent 32 | Document migration to encrypted storage (deferred) |
| 8 | Webhook secret stored plaintext | 10-webhooks | Agent 31 | Document hashing spec (migration 029) |
| 9 | SSO requires external config — no error handling | 01-auth | Agent 22 | Add try/catch + error toast in AuthContext |
| 10 | Custom domain DNS verification simulated | 14-enterprise | Agent 35 | Document edge function spec (deferred) |
| 11 | Custom domain routing not implemented | 14-enterprise | Agent 35 | Document CDN routing requirements |
| 12 | ticket_resolved trigger not dispatched | 15-workflows | Agent 36 | Add dispatchWorkflowTrigger in useTickets |
| 13 | FIRE_WEBHOOK action has no URL config | 15-workflows | Agent 36 | Add URL input to ActionNode |
| 14 | Usage RPC existence unverified | 03-billing | Agent 24 | Verify or create migration 028 |

---

## P2 Issues (57 total — Summary by Agent)

| Agent | P2 Count | Key Items |
|-------|----------|-----------|
| Agent 21 (ADMIN) | 0 | — |
| Agent 22 (Auth) | 3 | DNS simulated, favicon URL-only, SSO test |
| Agent 23 (Edge Fns) | 4 | No _shared/, rate limit UX, retry hardcoded, email fire-and-forget |
| Agent 24 (Billing) | 3 | Env vars, idempotency, annual discount |
| Agent 25 (Plan Limits) | 3 | Percentage flash, stale data, no email warning |
| Agent 26 (Forms) | 2 | Powered-by toggle, closeAfterCount |
| Agent 27 (Waitlists) | 2 | Position race, referral_boost |
| Agent 28 (Feedback) | 3 | Sentiment dup, alerts not RT, custom fields |
| Agent 29 (Support) | 4 | Dashboard size, auto-close, open SELECT, canned RT |
| Agent 30 (Onboarding) | 3 | Email fire-forget, race condition, abandonment |
| Agent 31 (Webhooks) | 4 | No-cors test, log limited, no RT, key prefix |
| Agent 32 (Integrations) | 5 | Health checks, audit trail, field mapping, ConvertKit, Zapier |
| Agent 33 (Templates) | 3 | RPC fallback, no RT count, fields cast |
| Agent 34 (AI) | 4 | Rate limit UX, churn not RT, text contract, type mismatch |
| Agent 35 (Enterprise) | 5 | SSO test, SSL hardcoded, favicon, white-label public, RLS |
| Agent 36 (Workflows) | 5 | Milestone fires all, vars undocumented, Slack config, retry, field options |
| Agent 37 (i18n) | 4 | 48 missing keys, toggle hardcoded, no namespaces, test tolerance |

---

## Coverage Check

- **Total P0**: 2/2 assigned
- **Total P1 (unique)**: 14/14 assigned
- **Total P2**: 57 identified, all assigned to respective feature agents
- **Unassigned issues**: 0

---

## Deferred Items (Documented for Future Phases)

| Item | Agent | Reason |
|------|-------|--------|
| Server-side plan limit RLS | Agent 25 | Needs migration + testing, spec written |
| Webhook secret hashing migration | Agent 31 | Needs migration + edge fn update, spec written |
| DNS verification edge function | Agent 35 | Needs DNS resolution capability, spec written |
| Custom domain routing | Agent 35 | Needs CDN/infrastructure, documentation written |
| Integration secret encryption | Agent 32 | Needs dedicated table + migration, documented |
| pg_cron enablement | Agent 16 (Phase 6) | Dashboard-only action, documented |
