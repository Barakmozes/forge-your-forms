# Agent 23 — Prompts

## Prompt Checklist
- [x] 23.0 — Assessment: Read all 12 edge functions, confirm issues, create FIX-PLAN
- [x] 23.1 — Extract shared utilities to _shared/ directory
- [x] 23.2 — Verify classify-ticket and ai-generate edge functions
- [x] 23.3 — Verify billing and webhook edge functions
- [x] 23.4 — Final verification + HANDOFF.md

---

### PROMPT 23.0: Assessment

You are Agent 23 — Edge Functions for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess all 12 edge functions for issues.

1. Read all edge function index.ts files:
   - supabase/functions/*/index.ts (all 12)

2. Document for each function:
   - Does it work? (based on scan report)
   - What shared code is duplicated?
   - What issues remain?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented with exact changes per function.

---

### PROMPT 23.1: Extract Shared Utilities

You are Agent 23 — Edge Functions for FormForge Phase 7. READ CLAUDE.md first.

TASK: Create _shared/ directory with common edge function utilities.

1. Read 3-4 edge functions to identify duplicated code:
   - CORS headers object
   - SHA-256 hash function
   - Supabase client initialization
   - Response helper functions

2. Create supabase/functions/_shared/cors.ts — shared CORS headers
3. Create supabase/functions/_shared/supabase.ts — client initialization
4. Create supabase/functions/_shared/hash.ts — SHA-256 utility

5. NOTE: Do NOT update existing functions to import from _shared/ in this prompt.
   Just create the shared files. Updating imports is optional and risky for 12 functions.

6. Update PROGRESS.md.

VERIFY: _shared/ files created with correct exports.

---

### PROMPT 23.2: Verify AI Edge Functions

You are Agent 23 — Edge Functions for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify classify-ticket and ai-generate work correctly.

1. Read supabase/functions/classify-ticket/index.ts:
   - Verify input contract (what body fields expected)
   - Verify output format (category, priority, confidence)
   - Document the API contract for Agent 29

2. Read supabase/functions/ai-generate/index.ts:
   - Verify rate limit logic (10/day/workspace)
   - Verify cache behavior (7d TTL)
   - Verify Claude API integration

3. Document any fixes needed.

4. Update PROGRESS.md.

VERIFY: Both functions have documented API contracts.

---

### PROMPT 23.3: Verify Billing and Webhook Functions

You are Agent 23 — Edge Functions for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify billing and webhook edge functions.

1. Read supabase/functions/create-checkout/index.ts:
   - Verify it reads price IDs correctly
   - Document env vars needed

2. Read supabase/functions/stripe-webhook/index.ts:
   - Verify HMAC signature validation
   - Verify subscription upsert logic

3. Read supabase/functions/dispatch-webhook/index.ts:
   - Verify retry logic
   - Document hardcoded delays

4. Read supabase/functions/send-email/index.ts:
   - Verify template rendering
   - Document error handling gaps

5. Update PROGRESS.md.

VERIFY: All functions verified with documented contracts.

---

### PROMPT 23.4: Final Verification + HANDOFF

You are Agent 23 — Edge Functions for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify all edge function files are syntactically valid.

3. Update HANDOFF.md:
   - Status: COMPLETE
   - API contracts for each edge function
   - Files created (_shared/)
   - Remaining P2 items deferred

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
