# Agent 31 — Prompts

## Prompt Checklist
- [x] 31.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [x] 31.1 — Assess webhook secret hashing approach
- [x] 31.2 — Add delivery log realtime subscription
- [x] 31.3 — Final verification + HANDOFF.md

---

### PROMPT 31.0: Assessment

You are Agent 31 — Webhooks & API for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess webhooks & API issues.

1. Read these files:
   - .agents-phase-7/scanner-reports/10-webhooks-api.md
   - src/components/webhooks/WebhookForm.tsx — secret generation + storage
   - src/hooks/useWebhooks.ts — CRUD + delivery fetch
   - src/hooks/useApiKeys.ts — API key hashing pattern (reference)
   - src/components/webhooks/DeliveryLog.tsx — delivery display

2. Confirm issues and assess complexity of fixes.

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.

---

### PROMPT 31.1: Assess Webhook Secret Hashing

You are Agent 31 — Webhooks & API for FormForge Phase 7. READ CLAUDE.md first.

TASK: Document approach for webhook secret hashing.

NOTE: Full implementation requires:
- Migration to add hashed_secret column
- Update dispatch-webhook edge function to use hash
- Update WebhookForm to hash before storing

Since edge functions are owned by Agent 23, this prompt documents the specification.

1. Read src/hooks/useApiKeys.ts — understand existing hash pattern.

2. Document in HANDOFF.md:
   - Migration spec: add hashed_secret column, keep secret for backward compat
   - Edge function change spec: dispatch-webhook reads hashed_secret or falls back to secret
   - Frontend change: WebhookForm hashes secret before DB insert, shows raw secret once
   - Migration number: 029 (next available)

3. If feasible without touching edge functions: implement the frontend hash-before-store.

4. Update PROGRESS.md.

VERIFY: Specification documented.

---

### PROMPT 31.2: Add Delivery Log Improvements

You are Agent 31 — Webhooks & API for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add realtime subscription to delivery log.

1. Read src/components/webhooks/DeliveryLog.tsx.

2. Add Supabase realtime subscription for webhook_deliveries:
   - Subscribe to INSERT events filtered by webhook_id
   - Prepend new deliveries to the list
   - Cleanup subscription on unmount

3. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 31.3: Final Verification + HANDOFF

You are Agent 31 — Webhooks & API for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify E2E flow:
   - WebhookForm: URL + events + secret → save
   - Test webhook → delivery log → status
   - ApiKeyManager: generate → copy → revoke

3. Update HANDOFF.md: Status COMPLETE, webhook hashing spec.

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
