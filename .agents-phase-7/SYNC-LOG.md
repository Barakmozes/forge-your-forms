# Phase 7 — Shared File Matrix (SYNC-LOG)

> Agents in the SAME batch must NOT modify the same files.
> This matrix documents file ownership to prevent conflicts.

---

## Batch 1 — Sequential (No conflicts possible)

| File | Agent 21 | Agent 22 | Agent 24 | Agent 25 |
|------|----------|----------|----------|----------|
| `src/hooks/usePlanLimits.ts` | ✏️ Modifies | — | — | ✏️ Modifies |
| `src/components/upgrade/FeatureGate.tsx` | ✏️ Modifies | — | — | ✏️ Modifies |
| `src/contexts/AuthContext.tsx` | — | ✏️ Modifies | — | — |
| `src/lib/stripe.ts` | — | — | ✏️ Modifies | — |
| `src/hooks/useSubscription.ts` | — | — | ✏️ Modifies | — |
| `src/hooks/useUsage.ts` | — | — | ✏️ Modifies | — |

**Order**: Agent 21 → Agent 22 → Agent 24 → Agent 25

---

## Batch 2 — Parallel (Verified: NO conflicts)

| File | Agent 26 (Forms) | Agent 27 (Waitlists) | Agent 28 (Feedback) | Agent 29 (Support) |
|------|-----------------|---------------------|--------------------|--------------------|
| `src/components/FormRenderer.tsx` | ✏️ Exclusive | — | — | — |
| `src/pages/FormBuilder.tsx` | ✏️ Exclusive | — | — | — |
| `src/components/builder/*` | ✏️ Exclusive | — | — | — |
| `src/hooks/useForms.ts` | ✏️ Exclusive | — | — | — |
| `src/components/waitlist/*` | — | ✏️ Exclusive | — | — |
| `src/hooks/useWaitlist*.ts` | — | ✏️ Exclusive | — | — |
| `src/components/feedback/*` | — | — | ✏️ Exclusive | — |
| `src/hooks/useFeedback*.ts` | — | — | ✏️ Exclusive | — |
| `src/components/support/*` | — | — | — | ✏️ Exclusive |
| `src/hooks/useTickets*.ts` | — | — | — | ✏️ Exclusive |

**Parallelism**: ALL 4 agents can run simultaneously.

---

## Batch 3 — Parallel (Verified: NO conflicts)

| File | Agent 23 (Edge) | Agent 30 (Onboard) | Agent 31 (Webhooks) | Agent 32 (Integrations) | Agent 33 (Templates) | Agent 34 (AI) |
|------|----------------|-------------------|--------------------|-----------------------|---------------------|--------------|
| `supabase/functions/*` (existing) | ✏️ Exclusive | — | — | — | — | — |
| `supabase/functions/mailchimp-sync/*` | — | — | — | ✏️ Creates | — | — |
| `src/components/onboarding/*` | — | ✏️ Exclusive | — | — | — | — |
| `src/hooks/useOnboarding.ts` | — | ✏️ Exclusive | — | — | — | — |
| `src/components/webhooks/*` | — | — | ✏️ Exclusive | — | — | — |
| `src/components/api/*` | — | — | ✏️ Exclusive | — | — | — |
| `src/hooks/useWebhooks.ts` | — | — | ✏️ Exclusive | — | — | — |
| `src/hooks/useApiKeys.ts` | — | — | ✏️ Exclusive | — | — | — |
| `src/components/integrations/*` | — | — | — | ✏️ Exclusive | — | — |
| `src/hooks/useIntegrations.ts` | — | — | — | ✏️ Exclusive | — | — |
| `src/components/templates/*` | — | — | — | — | ✏️ Exclusive | — |
| `src/hooks/useTemplates.ts` | — | — | — | — | ✏️ Exclusive | — |
| `src/components/ai/*` | — | — | — | — | — | ✏️ Exclusive |
| `src/components/predictions/*` | — | — | — | — | — | ✏️ Exclusive |
| `src/hooks/useAi*.ts` | — | — | — | — | — | ✏️ Exclusive |
| `src/hooks/useChurnPrediction.ts` | — | — | — | — | — | ✏️ Exclusive |

**Parallelism**: ALL 6 agents can run simultaneously.

---

## Batch 4 — Sequential (Shared files managed by order)

| File | Agent 35 (Enterprise) | Agent 36 (Workflows) |
|------|-----------------------|---------------------|
| `src/pages/Settings.tsx` | ✏️ Modifies | — |
| `src/components/Navbar.tsx` | ✏️ Modifies | — |
| `src/components/AppLayout.tsx` | ✏️ Modifies | — |
| `src/components/enterprise/*` | ✏️ Exclusive | — |
| `src/hooks/useEnterprise.ts` | ✏️ Exclusive | — |
| `src/components/workflows/*` | — | ✏️ Exclusive |
| `src/hooks/useWorkflows.ts` | — | ✏️ Exclusive |
| `src/lib/workflowEngine.ts` | — | ✏️ Exclusive |
| `src/hooks/useTickets.ts` | — | ✏️ Cross-agent (adds trigger) |

**Order**: Agent 35 → Agent 36

---

## Batch 5 — Sequential (Final sweep)

| File | Agent 37 (i18n) | Agent 38 (Final) |
|------|-----------------|-----------------|
| `src/i18n/locales/en.json` | ✏️ Exclusive | Read-only |
| `src/i18n/locales/he.json` | ✏️ Exclusive | Read-only |
| `src/test/i18n/translation.test.ts` | ✏️ Exclusive | Read-only |
| All source files | — | Read-only verification |

**Order**: Agent 37 → Agent 38

---

## Cross-Agent Modification Exceptions

| Source Agent | Target File | Target Agent | Reason |
|-------------|-------------|--------------|--------|
| Agent 36 (Workflows) | `src/hooks/useTickets.ts` | Agent 29 (Support) | Adds ticket_resolved trigger dispatch |

This is the ONLY cross-agent modification in Phase 7. Agent 29 must complete (Batch 2) before Agent 36 (Batch 4).

---

## Migration Numbers Reserved (Phase 7)

| Agent | Migration # | Purpose |
|-------|------------|---------|
| Agent 24 (Billing) | 028 | Usage RPC (if missing) |
| Agent 31 (Webhooks) | 029 | Webhook secret hashing (spec only) |
| Agent 33 (Templates) | 030 | Template RPC (if missing) |
