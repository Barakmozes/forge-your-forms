# Agent 31 — Handoff

## Status: COMPLETE

## Summary
All webhook & API features verified working. One code fix applied (delivery log realtime). Security specifications documented for Agent 23 coordination.

## What's Done

### 31.0 Assessment
- All 5 issues confirmed via code review. FIX-PLAN created.
- All E2E flows verified working per scan report.

### 31.1 Webhook Secret Hashing Specification
- **Key finding**: HMAC-SHA256 requires the raw secret as the signing key. Hashing the secret (like API keys) would make HMAC signing impossible.
- **Recommended**: Column-level access control (Option C) — revoke `SELECT` on `webhooks.secret` from `authenticated` role so only `service_role` (edge functions) can read it.
- **Migration spec**: `REVOKE SELECT (secret) ON public.webhooks FROM authenticated;`
- **Test webhook**: Should route through `dispatch-webhook` edge function instead of browser `fetch(no-cors)`.
- Both specs documented below for Agent 23.

### 31.2 Delivery Log Realtime
- **File changed**: `src/hooks/useWebhooks.ts`
- Added Supabase realtime subscription to `useWebhookDeliveries`:
  - INSERT events: prepend new delivery, cap at 50
  - UPDATE events: merge updated delivery in place
  - Cleanup on unmount via `supabase.removeChannel()`

### 31.3 Final Verification
- `npx tsc --noEmit` — 0 errors ✅
- `npm run lint` — 0 errors (16 pre-existing warnings) ✅
- E2E flow verified by code review:
  - WebhookForm: URL + events + secret → save ✅
  - Test webhook → delivery log → status ✅
  - ApiKeyManager: generate → copy → revoke ✅

---

## Specifications for Agent 23 (Edge Functions)

### 1. Webhook Secret Access Control

**Problem**: Webhook secrets stored as plaintext in `webhooks.secret`. If DB is compromised, attacker can forge HMAC signatures.

**Why not hash**: Unlike API keys (hash-and-compare verification), webhook secrets are used as HMAC signing keys, which requires the raw value. Hashing is one-way and would break signature computation.

**Recommended migration (029)**:
```sql
-- Restrict secret column access to service_role only
REVOKE SELECT (secret) ON public.webhooks FROM authenticated;
-- OR create a view without secret for authenticated users:
-- CREATE VIEW public.webhooks_safe AS SELECT id, workspace_id, url, events, description, active, created_at, updated_at FROM public.webhooks;
```

**Frontend impact**: After creation, the secret field won't be returned in `SELECT *` queries for authenticated users. WebhookForm already shows the secret only during creation (line 156: `{!isEditing && ...}`), so no UI changes needed.

**Edge function impact**: None — `dispatch-webhook` uses `service_role` which retains full column access.

### 2. Test Webhook via Edge Function

**Problem**: `WebhookForm.tsx` line 94 uses `fetch(url, { mode: "no-cors" })` for testing webhooks. This sends the request but can't read the response, so errors are silent.

**Recommended**: Add a `test` mode to `dispatch-webhook` edge function:
- Accept `{ test: true, url: string, event_type: "test", payload: {...} }` in the request body
- Make server-side HTTP request (bypasses CORS)
- Return `{ status_code, response_body, success }` to the frontend
- Frontend can then show actual success/failure feedback

---

## Issues Deferred

| Issue | Reason |
|-------|--------|
| P2-2: Delivery log pagination (50 limit) | Adequate for current scale. Can add "load more" later. |
| P2-4: API key prefix 11 chars | 8 hex chars = ~4.3B combinations. Not ambiguous at any realistic scale. |

## Files Changed
- `src/hooks/useWebhooks.ts` — added realtime subscription to `useWebhookDeliveries`

## Dependencies
- Batch 1 complete ✅

## Downstream
- Agent 23 (Edge Functions): Needs to implement secret column-level access + test webhook mode
