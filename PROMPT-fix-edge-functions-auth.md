# Prompt: Fix Edge Functions Auth — Replace getUser() with JWT Decode

> Copy this prompt into Claude Code to execute the fix.

---

## Context

All Edge Functions deployed with `verify_jwt: true` (the default) have the Supabase gateway validate the JWT **before** the function runs. Despite this, 11 functions make a redundant `auth.getUser()` HTTP round-trip that fails intermittently, causing 401 Unauthorized errors for authenticated users.

**Root cause:** Double-auth pattern — gateway validates JWT, then the function calls `getUser()` which makes another HTTP call to Supabase Auth that sometimes fails (cold starts, latency, rate limits).

**Solution:** Since the gateway already validated the JWT signature and expiry, we can safely decode the JWT payload to extract `sub` (user ID) and `email` directly, eliminating the failing HTTP call.

---

## Critical Fixes Missing from Original Plan

The original plan was solid (8.5/10) but had these gaps. **You MUST address all of them:**

### 1. Base64 Padding (Bug Prevention)
JWT base64url encoding often omits padding (`=`). Deno's `atob()` may fail without it. Always add padding before decoding:
```typescript
let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
// Add padding if missing
const padLength = (4 - (base64.length % 4)) % 4;
base64 += "=".repeat(padLength);
```

### 2. Defensive `exp` Check (Security Safety Net)
Even though the gateway checks expiry, add a cheap defensive check. If someone ever accidentally deploys with `--no-verify-jwt`, this prevents accepting expired tokens:
```typescript
if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
  throw new Error("Token expired");
}
```

### 3. Extract `email` from JWT (Not Just `sub`)
Some functions use `user.email` after auth (e.g., mailchimp-sync, delete-account). The JWT contains an `email` claim — extract it alongside `sub`:
```typescript
return { sub: payload.sub, email: payload.email };
```

### 4. Phased Deployment (Risk Management)
Do NOT deploy all 11 functions at once. Follow this order:
- **Phase 1:** Deploy `ai-generate` only → test → verify no 401s
- **Phase 2:** Deploy `ai-analyze` + `ai-suggest-reply` (AI group) → test
- **Phase 3:** Deploy remaining 8 functions → test

---

## Step-by-Step Execution

### Step 1: Update `_shared/supabase.ts` — Add JWT Helper + Fix `authenticateUser()`

Add this function to `supabase/functions/_shared/supabase.ts`:

```typescript
/**
 * Decode JWT payload without cryptographic verification.
 * SAFE because verify_jwt=true at the Supabase gateway already validated
 * the signature and expiry before the function executes.
 * Includes defensive exp check as safety net.
 */
export function decodeJwtPayload(token: string): { sub: string; email?: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  // Base64url → Base64 (replace URL-safe chars + add padding)
  let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padLength);

  const payloadJson = atob(base64);
  const payload = JSON.parse(payloadJson);

  if (!payload.sub) throw new Error("No sub claim in JWT");

  // Defensive expiry check (gateway already validated, but safety net
  // in case function is ever misconfigured with --no-verify-jwt)
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return { sub: payload.sub, email: payload.email };
}
```

Then update the existing `authenticateUser()` function in the same file to use `decodeJwtPayload()` instead of creating a per-request client and calling `getUser()`. The function should:
- Extract the Authorization header
- Validate it starts with "Bearer "
- Call `decodeJwtPayload(token)`
- Return `{ id: payload.sub, email: payload.email }` (same return shape as before)
- Return `null` on any error (same error behavior as before)

### Step 2: Fix `ai-generate` (Primary Target — Phase 1)

File: `supabase/functions/ai-generate/index.ts`

Replace the entire auth block (the section that creates `userClient` with `SUPABASE_ANON_KEY`, calls `getUser()`, and checks for errors) with:

```typescript
// === AUTH: Extract user from JWT (gateway already validated via verify_jwt: true) ===
const authHeader = req.headers.get("Authorization");
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return new Response(
    JSON.stringify({ error: "Missing authorization header" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const token = authHeader.replace("Bearer ", "");
let userId: string;
try {
  const { sub } = decodeJwtPayload(token);
  userId = sub;
} catch (e) {
  console.error("ai-generate: JWT decode failed:", e);
  return new Response(
    JSON.stringify({ error: "Invalid authorization token" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**Important:**
- Import `decodeJwtPayload` from the shared module
- Remove the `SUPABASE_ANON_KEY` env variable usage if it was only used for the per-request client
- Replace every occurrence of `user.id` with `userId` in the rest of the function
- Keep all CORS handling, workspace membership checks, rate limiting, cache logic, and Anthropic API calls exactly as they are

### Step 3: Fix `ai-analyze`

File: `supabase/functions/ai-analyze/index.ts`

Same pattern as ai-generate. Replace the per-request client + getUser() block with JWT decode. Replace `user.id` with `userId`.

### Step 4: Fix `ai-suggest-reply` and `delete-account` (Via Shared Helper)

These two use `authenticateUser()` from `_shared/supabase.ts`. Since you already updated that function in Step 1, these should work automatically. **Verify** that:
- `ai-suggest-reply` uses the return value correctly (expects `{ id, email }`)
- `delete-account` uses the return value correctly (especially if it references `.email`)

### Step 5: Fix the 6 "Direct Token Pass" Functions

These functions use `supabase.auth.getUser(token)` pattern. Apply the same JWT decode fix to each:

1. **classify-ticket** (`supabase/functions/classify-ticket/index.ts`)
2. **churn-score** (`supabase/functions/churn-score/index.ts`)
3. **dispatch-webhook** (`supabase/functions/dispatch-webhook/index.ts`)
4. **create-checkout** (`supabase/functions/create-checkout/index.ts`)
5. **create-portal-session** (`supabase/functions/create-portal-session/index.ts`)
6. **slack-notify** (`supabase/functions/slack-notify/index.ts`)

For each function:
- Import `decodeJwtPayload` from `../_shared/supabase.ts`
- Replace the `getUser(token)` block with the JWT decode pattern
- Replace `user.id` with `userId` (and `user.email` with decoded email if used)
- Update the console.error log prefix to match the function name
- Keep everything else unchanged

### Step 6: Fix `mailchimp-sync`

File: `supabase/functions/mailchimp-sync/index.ts`

Same as ai-generate pattern (per-request client). **Extra attention:** Check if `user.email` is used anywhere in this function. If so, extract it from JWT: `const { sub: userId, email: userEmail } = decodeJwtPayload(token);`

### Step 7: DO NOT TOUCH These Functions

- **send-email** — deployed with `--no-verify-jwt`, has multi-method auth (service role + legacy JWT + user JWT). Different auth model entirely.
- **api-v1** — uses API key hash verification, no user JWT auth
- **stripe-webhook** — uses Stripe signature verification
- **execute-workflow** — service role only, no user auth

---

## Deployment (Phased)

### Phase 1 — Deploy + Test ai-generate
```bash
npx supabase functions deploy ai-generate --project-ref rsuolemihuqjvrcpqjpa
```
Then test:
```bash
# Get a fresh JWT
TOKEN=$(curl -s -X POST 'https://rsuolemihuqjvrcpqjpa.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' | jq -r '.access_token')

# Test ai-generate — should NOT return 401
curl -s -X POST 'https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/ai-generate' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"YOUR_WORKSPACE_ID","prompt":"test","type":"form"}' | jq .

# Test missing auth — should return 401
curl -s -X POST 'https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/ai-generate' \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' | jq .

# Test malformed token — should return 401
curl -s -X POST 'https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/ai-generate' \
  -H "Authorization: Bearer not.a.valid.token.here" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' | jq .
```

**Only proceed to Phase 2 if Phase 1 passes all 3 tests.**

### Phase 2 — Deploy AI Group
```bash
npx supabase functions deploy ai-analyze --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy ai-suggest-reply --project-ref rsuolemihuqjvrcpqjpa
```

### Phase 3 — Deploy Remaining Functions
```bash
npx supabase functions deploy classify-ticket --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy churn-score --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy dispatch-webhook --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy create-checkout --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy create-portal-session --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy slack-notify --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy mailchimp-sync --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions deploy delete-account --project-ref rsuolemihuqjvrcpqjpa
```

### Phase 4 — Verify Secrets
```bash
npx supabase secrets list --project-ref rsuolemihuqjvrcpqjpa
```
Confirm `ANTHROPIC_API_KEY` exists (needed by AI functions).

---

## Final Checks

```bash
npm run lint
npx tsc --noEmit
```

If lint/type-check pass → commit with message:
```
fix(edge-functions): replace getUser() with JWT decode to fix 401 errors

The Supabase gateway (verify_jwt: true) already validates JWTs before
Edge Functions execute. The redundant getUser() HTTP round-trip was
failing intermittently, causing 401s for authenticated users.

Replaced with direct JWT payload decode in 11 functions.
Added defensive exp check and proper base64url padding.
```

---

## Rollback Plan

If any deployed function starts returning errors after the fix:

```bash
# Revert the specific function by redeploying from git
git stash
npx supabase functions deploy <function-name> --project-ref rsuolemihuqjvrcpqjpa
git stash pop
```

Or revert the entire commit:
```bash
git revert HEAD
# Then redeploy all affected functions
```
