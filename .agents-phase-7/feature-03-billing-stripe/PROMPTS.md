# Agent 24 — Prompts

## Prompt Checklist
- [x] 24.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [x] 24.1 — Fix Stripe price ID configuration (P0)
- [x] 24.2 — Verify usage RPC and submission limit enforcement
- [x] 24.3 — Document Stripe env requirements and edge cases
- [x] 24.4 — Final verification + HANDOFF.md

---

### PROMPT 24.0: Assessment

```
You are Agent 24 — Billing/Stripe for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess billing issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/03-billing-stripe.md
   - src/lib/stripe.ts — find STRIPE_PLANS and price IDs
   - src/hooks/useSubscription.ts — plan tier resolution
   - src/hooks/useUsage.ts — find get_workspace_usage RPC call
   - supabase/migrations/014_* — verify RPC exists

2. For each P0/P1/P2 issue, confirm:
   - Stripe price IDs: are they real or placeholders?
   - get_workspace_usage: does the RPC function exist in migrations?
   - Server-side submission limits: any RLS enforcement?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN with exact changes per issue
```

---

### PROMPT 24.1: Fix Stripe Price ID Configuration (P0)

```
You are Agent 24 — Billing/Stripe for FormForge Phase 7. READ CLAUDE.md first.

TASK: Make Stripe price IDs configurable instead of hardcoded placeholders.

1. Read src/lib/stripe.ts — find STRIPE_PLANS object.

2. Fix:
   - Replace hardcoded placeholder IDs with environment variable references
   - Use VITE_STRIPE_PRICE_PRO_MONTHLY, VITE_STRIPE_PRICE_PRO_ANNUAL, etc.
   - Add fallback to current placeholder values (for dev) with console.warn
   - Add a STRIPE_CONFIG_VALID check that returns false if env vars are missing
   - Document all required env vars in a comment block

3. Update CheckoutButton.tsx if needed to check STRIPE_CONFIG_VALID.

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- Price IDs come from env vars with fallback
- CheckoutButton shows error state when Stripe not configured
```

---

### PROMPT 24.2: Verify Usage RPC and Submission Limits

```
You are Agent 24 — Billing/Stripe for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify get_workspace_usage RPC exists and submission tracking works.

1. Search all migration files for get_workspace_usage:
   - grep -r "get_workspace_usage" supabase/migrations/
   - If missing: create migration to add it

2. Read src/hooks/useUsage.ts — verify RPC call matches function signature.

3. Verify usage tracking trigger:
   - Check submissions INSERT trigger increments usage table
   - Verify monthly reset logic

4. If get_workspace_usage RPC is missing:
   - Create supabase/migrations/028_usage_rpc.sql with the function
   - Function should return: submission_count, form_count, member_count for workspace

5. Update PROGRESS.md.

VERIFY:
- RPC exists in migrations
- useUsage.ts call matches RPC signature
- npm run lint passes
```

---

### PROMPT 24.3: Document Stripe Configuration

```
You are Agent 24 — Billing/Stripe for FormForge Phase 7. READ CLAUDE.md first.

TASK: Document all Stripe-related configuration requirements.

1. Create a configuration checklist in HANDOFF.md:
   - All VITE_STRIPE_* env vars needed
   - Supabase Function secrets needed (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
   - Stripe Dashboard configuration steps
   - Webhook endpoint URL to configure in Stripe

2. Document the full checkout flow with error states.

3. Update PROGRESS.md.

VERIFY:
- Documentation complete in HANDOFF.md
```

---

### PROMPT 24.4: Final Verification + HANDOFF

```
You are Agent 24 — Billing/Stripe for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify:
   - stripe.ts has env-configurable price IDs
   - useUsage.ts RPC exists
   - All billing components render without errors

3. Update HANDOFF.md: Status COMPLETE, files modified, Stripe config checklist.

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
