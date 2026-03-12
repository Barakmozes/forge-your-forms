# MASTER BRIEF — Phase 7 Scanner Results
> Completed: 2026-03-12 | Scanner: Automation 1 — Phase 7

---

## 1. Issue Counts by Feature

| # | Feature | P0 | P1 | P2 | Total |
|---|---------|----|----|----|----|
| 01 | Auth & Settings | 0 | 2 | 3 | 5 |
| 02 | Edge Functions | 0 | 3 | 4 | 7 |
| 03 | Billing / Stripe | 1 | 2 | 3 | 6 |
| 04 | Plan Limits | 0 | 3 | 3 | 6 |
| 05 | Standard Forms | 0 | 0 | 2 | 2 |
| 06 | Waitlists | 0 | 0 | 2 | 2 |
| 07 | Feedback / NPS | 0 | 0 | 3 | 3 |
| 08 | Support Tickets | 0 | 1 | 4 | 5 |
| 09 | Onboarding & Emails | 0 | 0 | 3 | 3 |
| 10 | Webhooks & API | 0 | 1 | 4 | 5 |
| 11 | Integrations | 1 | 3 | 5 | 9 |
| 12 | Template Marketplace | 0 | 0 | 3 | 3 |
| 13 | AI Features | 0 | 2 | 4 | 6 |
| 14 | Enterprise | 0 | 2 | 5 | 7 |
| 15 | Workflows | 0 | 2 | 5 | 7 |
| 16 | i18n / RTL | 0 | 0 | 4 | 4 |
| **TOTAL** | | **2** | **21** | **57** | **80** |

---

## 2. All P0 Issues (Critical — Blocks End-to-End)

| # | Feature | Issue | File |
|---|---------|-------|------|
| P0-1 | Billing | Stripe price IDs are placeholders — checkout will fail | `src/lib/stripe.ts` |
| P0-2 | Integrations | Mailchimp sync CORS failure — browser POST to Mailchimp API blocked | `src/hooks/useIntegrations.ts` |

---

## 3. All P1 Issues (High — Feature Partially Broken)

| # | Feature | Issue | File |
|---|---------|-------|------|
| P1-1 | Auth | Member limit client-only — no RLS prevents exceeding plan | `supabase/migrations/003_rls_policies.sql` |
| P1-2 | Auth | SSO requires external Supabase config — no error handling | `src/contexts/AuthContext.tsx` |
| P1-3 | Edge Fns | classify-ticket not called from frontend — dead code | `supabase/functions/classify-ticket/index.ts` |
| P1-4 | Edge Fns | ai-generate not plan-gated — free users can use | `src/components/ai/AiFormGenerator.tsx` |
| P1-5 | Edge Fns | Stripe price IDs are placeholders | `src/lib/stripe.ts` |
| P1-6 | Billing | No server-side submission limit enforcement | `src/hooks/usePlanLimits.ts` |
| P1-7 | Billing | Usage RPC may not exist — verify migration | `src/hooks/useUsage.ts` |
| P1-8 | Plan Limits | All limits client-side only — no RLS enforcement | All migration files |
| P1-9 | Plan Limits | Integrations not plan-gated | `src/components/integrations/IntegrationManager.tsx` |
| P1-10 | Plan Limits | AiFormGenerator not plan-gated (duplicate of P1-4) | `src/components/ai/AiFormGenerator.tsx` |
| P1-11 | Support | classify-ticket not wired (duplicate of P1-3) | `supabase/functions/classify-ticket/index.ts` |
| P1-12 | Webhooks | Webhook secret stored plaintext | `supabase/migrations/016_webhooks.sql` |
| P1-13 | Integrations | Mailchimp API key stored plaintext in JSONB | `src/hooks/useIntegrations.ts` |
| P1-14 | Integrations | No plan gating on integrations | `src/components/integrations/IntegrationManager.tsx` |
| P1-15 | Integrations | Slack webhook URL stored plaintext | `src/hooks/useIntegrations.ts` |
| P1-16 | AI | AiFormGenerator not plan-gated (duplicate of P1-4) | `src/components/ai/AiFormGenerator.tsx` |
| P1-17 | AI | classify-ticket dead code (duplicate of P1-3) | `supabase/functions/classify-ticket/index.ts` |
| P1-18 | Enterprise | Custom domain DNS verification simulated | `src/components/enterprise/CustomDomainConfig.tsx` |
| P1-19 | Enterprise | Custom domain routing not implemented | N/A (missing) |
| P1-20 | Workflows | ticket_resolved trigger not dispatched | `src/hooks/useTickets.ts` |
| P1-21 | Workflows | FIRE_WEBHOOK action has no URL config | `src/components/workflows/ActionNode.tsx` |

### Deduplicated P1 Issues (14 unique)

| # | Issue | Affects |
|---|-------|---------|
| 1 | **Stripe price IDs are placeholders** | Billing, checkout |
| 2 | **All plan limits client-side only** (no RLS) | Auth, Plan Limits, all gated features |
| 3 | **AiFormGenerator not plan-gated** | AI, Plan Limits, Edge Functions |
| 4 | **classify-ticket not called from frontend** | AI, Support, Edge Functions |
| 5 | **Integrations not plan-gated** | Integrations, Plan Limits |
| 6 | **Mailchimp API key stored plaintext** | Integrations, Security |
| 7 | **Slack webhook URL stored plaintext** | Integrations, Security |
| 8 | **Webhook secret stored plaintext** | Webhooks, Security |
| 9 | **SSO requires external config — no error handling** | Auth, Enterprise |
| 10 | **Custom domain DNS verification simulated** | Enterprise |
| 11 | **Custom domain routing not implemented** | Enterprise |
| 12 | **ticket_resolved trigger not dispatched** | Workflows |
| 13 | **FIRE_WEBHOOK action has no URL config** | Workflows |
| 14 | **Usage RPC existence unverified** | Billing |

---

## 4. Cross-Feature Dependency Graph

```
Auth & Settings (01) ──────────────────────────────────────────┐
  ├── Plan Limits (04) ← Billing (03)                         │
  │     ├── FeatureGate wraps: Webhooks, API, Integrations,    │
  │     │   AI, Enterprise, Workflows                          │
  │     └── Mode gating: Feedback (pro), Support (growth)      │
  │                                                            │
  ├── Standard Forms (05) ─── triggers ──→ Webhooks (10)       │
  │                           triggers ──→ Integrations (11)    │
  │                           triggers ──→ Workflows (15)       │
  │                                                            │
  ├── Waitlists (06) ──── triggers ──→ Webhooks (10)           │
  │                       triggers ──→ Integrations (11)        │
  │                       triggers ──→ Workflows (15)           │
  │                                                            │
  ├── Feedback/NPS (07) ── triggers ──→ Webhooks (10)          │
  │                        triggers ──→ Integrations (11)       │
  │                        triggers ──→ Workflows (15)          │
  │                        embeds ───→ AI Summary (13)          │
  │                                                            │
  ├── Support Tickets (08) ── triggers ──→ Webhooks (10)       │
  │                           triggers ──→ Integrations (11)    │
  │                           triggers ──→ Workflows (15)       │
  │                           embeds ───→ AI Suggestions (13)   │
  │                                                            │
  ├── Onboarding (09) ←── send-email edge fn                  │
  ├── Templates (12) ──── creates Forms (05)                   │
  ├── AI Features (13) ←── ai-generate/analyze/churn edge fns │
  ├── Enterprise (14) ←── enterprise_settings table            │
  ├── Workflows (15) ←── execute-workflow edge fn              │
  └── i18n/RTL (16) ←── cross-cutting, all components         │
```

---

## 5. Recommended Execution Batch Order for Builder

### Batch 1 — Infrastructure (Sequential, FIRST)
1. **Fix Stripe price IDs** — `src/lib/stripe.ts` (P0-1)
2. **Add FeatureGate to AiFormGenerator** — `src/components/ai/AiFormGenerator.tsx` (P1-3)
3. **Add FeatureGate to IntegrationManager** — `src/components/integrations/IntegrationManager.tsx` (P1-5)
4. **Verify get_workspace_usage RPC exists** — check migration 014

### Batch 2 — Security Fixes (Parallel)
5. **Create mailchimp-sync edge function** — proxy Mailchimp API calls (P0-2, P1-6)
6. **Hash webhook secrets in DB** — migration + edge function update (P1-8)
7. **Move integration secrets to secure storage** — new table or encrypted column (P1-6, P1-7)

### Batch 3 — Wire Missing Features (Parallel)
8. **Wire classify-ticket to frontend** — call from SupportSubmitPage, store in tickets.ai_classification (P1-4)
9. **Add ticket_resolved workflow dispatch** — in useTickets.ts when status → resolved (P1-12)
10. **Add URL config to FIRE_WEBHOOK action** — ActionNode.tsx (P1-13)

### Batch 4 — Server-Side Enforcement (Sequential)
11. **Add plan-aware RLS policies** — member count, submission count, form count limits (P1-2)

### Batch 5 — Enterprise Polish (Parallel)
12. **Create DNS verification edge function** — actual DNS TXT record lookup (P1-10)
13. **Add SSO error handling** — AuthContext.tsx (P1-9)
14. **Document custom domain CDN requirements** — (P1-11)

### Batch 6 — i18n Completion (Last)
15. **Fill 48 missing Hebrew translations** — he.json (P2)
16. **Tighten translation test tolerance** — 10% → 5%

---

## 6. Overall System Health Assessment

### Health Score: 7.5 / 10

**Strengths:**
- Comprehensive feature set across 4 modes (standard/waitlist/feedback/support)
- Solid i18n/RTL implementation (97% coverage, 184 components)
- Well-structured component architecture with consistent patterns
- Realtime subscriptions properly implemented across major features
- Edge functions well-designed with caching, rate limiting, SSRF protection
- FeatureGate pattern consistently applied (with 2 exceptions noted)

**Weaknesses:**
- **Security**: Secrets stored plaintext (webhook secrets, Mailchimp API keys, Slack URLs)
- **Plan enforcement**: All limits client-side only — no server-side RLS enforcement
- **Incomplete features**: classify-ticket dead code, custom domain routing missing, FIRE_WEBHOOK action incomplete
- **Stripe placeholder IDs**: Billing checkout non-functional until real IDs configured
- **Mailchimp CORS**: Integration will fail in production browsers

### Risk Assessment:
- **Launch-blocking**: P0-1 (Stripe IDs), P0-2 (Mailchimp CORS)
- **Revenue-affecting**: P1 plan limit bypasses (client-only enforcement)
- **Security-affecting**: P1 plaintext secrets (webhook, Mailchimp, Slack)
- **Feature gaps**: classify-ticket, custom domain routing, ticket_resolved trigger

---

SCANNER_COMPLETE
