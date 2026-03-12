# Agent 31 — FIX-PLAN

## Assessment Summary

All E2E flows work correctly per scan report. Issues are security/UX improvements, not functional bugs.

---

## Issue Analysis

### P1-12: Webhook Secret Stored Plaintext
**Status**: CONFIRMED
**Location**: `WebhookForm.tsx:30-33` generates secret, passes raw to `createWebhook()` in `useWebhooks.ts:51` which stores it directly.
**Compare**: `useApiKeys.ts:40-44` hashes with SHA-256 before storing, only keeps `key_hash` + `key_prefix`.
**Complexity**: HIGH — cross-boundary change:
- Migration needed: add `hashed_secret` column to `webhooks` table
- Edge function `dispatch-webhook` must read hashed secret for HMAC signing (owned by Agent 23 — DO NOT TOUCH)
- Frontend: hash before store, show raw once
**Decision**: Document spec in HANDOFF.md. Implement frontend hash-before-store if feasible without edge function changes. The edge function currently reads `secret` column for HMAC — changing this without updating the edge function would break signature verification.
**Resolution**: Frontend-only hash would break HMAC signing. Must be coordinated with Agent 23. Will document full spec only.

### P2-1: Test Webhook Uses no-cors Mode
**Status**: CONFIRMED
**Location**: `WebhookForm.tsx:94-106` — `fetch(url, { mode: "no-cors" })`
**Analysis**: This is actually intentional. Browser CORS blocks cross-origin requests to arbitrary webhook URLs. `no-cors` at least sends the request (opaque response). The proper fix is routing test through the `dispatch-webhook` edge function (bypasses browser CORS entirely).
**Complexity**: LOW frontend change, but requires edge function support (Agent 23).
**Decision**: DOCUMENT as spec — test webhook should invoke `dispatch-webhook` edge function instead of direct fetch. Not fixable on frontend alone without edge function update.

### P2-2: Delivery Log Limited to 50, No Pagination
**Status**: CONFIRMED
**Location**: `useWebhooks.ts:109` — `.limit(50)`
**Analysis**: For webhook delivery logs, 50 is reasonable for recent history. Adding "load more" is low complexity.
**Complexity**: LOW
**Decision**: DEFER — not in scope for Phase 7 verification. 50 entries is adequate for most use cases. Document as future improvement.

### P2-3: No Delivery Log Realtime Subscription
**Status**: CONFIRMED
**Location**: `useWebhookDeliveries` hook in `useWebhooks.ts:97-144` has no realtime. Compare `useWebhooks` (lines 31-44) which subscribes to webhooks table changes.
**Complexity**: LOW — standard Supabase realtime pattern.
**Decision**: FIX in Prompt 31.2. Add realtime subscription for `webhook_deliveries` filtered by `webhook_id`.

### P2-4: API Key Prefix Truncation (11 chars)
**Status**: CONFIRMED but NOT A REAL ISSUE
**Location**: `useApiKeys.ts:38` — `rawKey.substring(0, 11)` gives "ff_" + 8 hex chars
**Analysis**: 8 hex chars = 16^8 = ~4.3 billion combinations. Prefix is for display only (identifying which key), not for auth. Collision probability is negligible at any realistic scale.
**Decision**: NO ACTION — not a real problem.

---

## Fix Plan

| Prompt | Issue | Action | Files Changed |
|--------|-------|--------|---------------|
| 31.1 | P1-12 Secret plaintext | Document hashing spec for Agent 23 coordination | HANDOFF.md |
| 31.1 | P2-1 no-cors test | Document edge function routing spec | HANDOFF.md |
| 31.2 | P2-3 No realtime | Add realtime subscription to useWebhookDeliveries | src/hooks/useWebhooks.ts |
| 31.3 | All | Final lint + type-check verification | — |
| — | P2-2 Pagination | DEFERRED — adequate for current scale | — |
| — | P2-4 Prefix length | NO ACTION — not a real issue | — |
