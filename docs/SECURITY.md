# Security Practices — FormForge

> Last updated: 2026-03-15 (pipeline run by agents 01–17)

---

## Overview

FormForge is a Vite + React 18 SPA backed by Supabase (PostgreSQL + Auth + Realtime). Security is enforced at multiple layers:

1. **Authentication** — Supabase Auth with PKCE flow
2. **Authorization** — Row-Level Security (RLS) on every table + workspace-role checks in edge functions
3. **Input validation** — client-side (password strength, prompt length) + server-side (RLS CHECK constraints, DB triggers)
4. **Secret management** — environment variables + client-side AES-GCM encryption for integration secrets
5. **GDPR compliance** — consent at signup, data export, atomic account deletion

---

## Authentication

### Provider

- **Supabase Auth** — email + password only
- MFA/2FA: not yet implemented (tracked as future work)

### OAuth Flow

- **Flow type**: `pkce` (PKCE — Proof Key for Code Exchange)
- **Changed from**: `implicit` (changed by Agent 01 — implicit flow is vulnerable to authorization code interception in SPAs)
- **Configured in**: `src/integrations/supabase/client.ts`

```typescript
const supabase = createClient(url, key, {
  auth: {
    flowType: "pkce",
    // ...
  }
});
```

### Session Management

- Sessions are persisted in `localStorage` (Supabase default for SPAs)
- `getSession()` is called on startup in `AuthContext.tsx` — wrapped in `try/catch/finally` with error state exposed as `useAuth().error`
- A `retry()` function is available via `useAuth()` to attempt re-authentication without a page reload
- `onAuthStateChange` listener handles token refresh events automatically
- If session load fails, `loading` becomes `false` and `error` is non-null — UI should handle both states

### Password Validation

- **Minimum length**: 8 characters
- **Complexity**: at least 1 uppercase, 1 lowercase, 1 number, 1 special character
- **Enforced in**: `src/pages/Auth.tsx` signup handler via `src/lib/passwordValidation.ts`
- Password is validated client-side before `supabase.auth.signUp()` is called

```typescript
// src/lib/passwordValidation.ts
export function validatePassword(password: string): { valid: boolean; message: string }
```

---

## Authorization

### Row-Level Security (RLS)

Every database table has RLS **enabled**. No table can be accessed by default without an explicit policy.

#### Policy Patterns

| Pattern | Tables | Rule |
|---------|--------|------|
| **Own-user** | `profiles`, `notifications` | `auth.uid() = id` or `user_id` |
| **Workspace member (any role)** | `workspaces`, `forms` (read), `submissions` (read), `waitlist_entries` (read), `feedback_responses` (read), `tickets` (read), `canned_responses` (read), `tags` (read) | `is_workspace_member(auth.uid(), workspace_id)` |
| **Workspace editor+** | `forms` (INSERT, UPDATE), `canned_responses` (INSERT, UPDATE, DELETE), `tags` (INSERT, UPDATE, DELETE), `webhooks` (INSERT, UPDATE, DELETE), `feedback_responses` (UPDATE), `waitlist_entries` (DELETE), `feedback_responses` (DELETE), `submissions` (DELETE), `workflows` (INSERT) | `get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')` |
| **Workspace owner only** | `workspaces` (UPDATE), `forms` (DELETE), `api_keys` (all), `enterprise_settings` (UPDATE) | `get_workspace_role(auth.uid(), workspace_id) = 'owner'` |
| **Public insert** | `submissions`, `waitlist_entries`, `feedback_responses`, `tickets`, `ticket_messages` (customer) | Anyone can INSERT if form `status = 'active'` and `mode` matches |
| **Active form read** | `forms` | `status = 'active'` allows anonymous SELECT |
| **Delete own data** | `profiles`, `notifications` | `auth.uid() = id` or `user_id` |
| **Delete own workspace** | `workspaces` | workspace role = `owner` |

#### Helper Functions

```sql
-- Returns TRUE if the user is a member of the workspace
is_workspace_member(user_id UUID, workspace_id UUID) RETURNS BOOLEAN

-- Returns the user's role in the workspace, or NULL if not a member
get_workspace_role(user_id UUID, workspace_id UUID) RETURNS workspace_role
```

Both functions have `SET search_path = public` to prevent schema injection attacks (hardened in migration `033_additional_rls_fixes.sql`).

#### Key Policy Decisions

- **`api_keys`** are restricted to workspace **owner** only (not editor+) because API keys are high-privilege credentials
- **`feedback_alerts`** has no INSERT policy — alerts are created by database triggers running as `SECURITY DEFINER`, which bypass RLS by design
- **`tickets_select_customer`** allows anonymous read of tickets scoped to a form (partial enumeration risk; full fix requires server-side email token verification)
- **`messages_insert_customer`** requires email match or workspace membership to prevent unauthenticated message injection

#### Migrations History (Security-Relevant)

| Migration | Changes |
|-----------|---------|
| `031_delete_rls_policies.sql` | Added DELETE policies for profiles, workspaces, notifications, waitlist_entries, feedback_responses, submissions |
| `032_role_based_policy_fixes.sql` | Restricted forms INSERT, canned_responses/tags/webhooks to editor+; api_keys to owner; viewer UPDATE removed |
| `033_additional_rls_fixes.sql` | Ticket enumeration narrowed; message injection prevention; feedback_alerts public INSERT removed; search_path hardening; lookup_profile_for_invite workspace-scoped |

### Edge Function Authorization

Every edge function that accesses user or workspace data must:
1. **Validate the JWT** — verify `Authorization: Bearer <token>` is present and valid
2. **Check workspace membership** — query `workspace_members` table to confirm the caller is a member of the workspace
3. **Check role when needed** — billing portal requires `owner`; most other functions allow any `member`

#### Per-Function Auth Summary

| Edge Function | JWT Required | Workspace Auth | Role Restriction |
|---------------|-------------|----------------|-----------------|
| `create-checkout` | Yes | Yes | Any member |
| `create-portal-session` | Yes | Yes | Owner only |
| `classify-ticket` | Yes | Yes | Any member |
| `churn-score` | Yes | Yes | Any member |
| `dispatch-webhook` | Yes | Optional (if workspace_id present) | Any member |
| `slack-notify` | Yes | Optional (if workspace_id present) | Any member |
| `delete-account` | Yes | N/A (deletes calling user's data) | Self only |
| `ai-analyze` | Yes | Yes | Any member |
| `ai-generate` | Yes | Yes | Any member |
| `ai-suggest-reply` | Yes | Yes | Any member |
| `execute-workflow` | Yes (service role) | Yes (via form_id) | Service role |
| `stripe-webhook` | No (Stripe signature) | N/A | N/A |

**Note on `execute-workflow`**: Called from `dispatch-webhook` using the Supabase service role client (`supabaseAdmin.functions.invoke`). Supabase service role invocations bypass JWT requirements. Verify in staging that service-role function-to-function calls succeed.

#### Stripe Webhook Signature Verification

`stripe-webhook/index.ts` verifies the `Stripe-Signature` header using constant-time XOR byte comparison (not `===` string comparison, which is vulnerable to timing attacks):

```typescript
// Constant-time comparison — prevents timing-based signature guessing
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}
```

If signature verification fails, returns `400`. If processing fails (transient DB error), returns `500` so Stripe will retry. Unknown event types return `200`.

---

## Data Protection

### Input Validation

#### Client-Side

| Input | Validation |
|-------|-----------|
| Password (signup) | 8+ chars, uppercase, lowercase, number, special char — `src/lib/passwordValidation.ts` |
| Phone field in FormRenderer | Hardcoded safe regex `SAFE_PHONE_RE` (not user-controlled pattern — ReDoS prevented) |
| AI prompt length (ai-generate) | `MAX_PROMPT_LENGTH = 10,000` chars; empty/whitespace check |
| Redirect URL (FormRenderer) | Protocol validation — only `http:` and `https:` allowed |
| Integration config (useIntegrations) | Secrets encrypted before DB write — see Secret Management below |

#### Server-Side (DB Level)

- `nps_score`: CHECK constraint `0–10` on `feedback_responses`
- `ticket_number`: UNIQUE constraint per `(form_id, ticket_number)` — prevents duplicates
- `email`: UNIQUE constraint per `(form_id, email)` in `waitlist_entries` — prevents duplicate signups
- RLS `WITH CHECK` constraints enforce workspace membership and form status before INSERTs

#### AI Prompt Injection Mitigation

All three AI edge functions (`ai-analyze`, `ai-generate`, `ai-suggest-reply`) apply:

1. **`sanitizeUserInput(text: string)`**: Strips null bytes, removes excessive whitespace, trims to max length
2. **`<user_content>` XML delimiters**: User text is wrapped so the model can distinguish between instructions and content
3. **System prompt instruction**: Each function's system prompt includes an explicit anti-injection instruction

```typescript
// Pattern used in all AI edge functions
const sanitized = sanitizeUserInput(userText);
// Prompt structure:
// [System prompt with anti-injection instruction]
// <user_content>
// [sanitized user text]
// </user_content>
```

### Secret Management

#### Environment Variables

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | Supabase client | Safe to expose (client-side) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client | Anon key — safe to expose; RLS enforces access |
| `VITE_SUPABASE_PROJECT_ID` | Migration scripts | Safe to expose |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe.js | Safe to expose (publishable key) |
| `STRIPE_SECRET_KEY` | Edge functions only | **NEVER in client code** |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook/index.ts` | **NEVER in client code** |
| `ANTHROPIC_API_KEY` | AI edge functions only | **NEVER in client code** |
| Supabase service role key | Edge functions only | **NEVER in client code** |

**Rules**:
- All `VITE_` prefixed variables are bundled into the client build — treat as public
- Secret keys must live only in Supabase edge function environment variables (Supabase Dashboard → Edge Functions → Secrets)
- Never commit `.env` to git (`.gitignore` patterns: `*.env`, `.env*`, `*.pem`, `*.key`, `credentials.json`, `service-account*.json`)
- An `.env.example` file with placeholder values (`<your-key-here>`) is committed for documentation

#### Integration Secret Encryption

Webhook URLs, API keys (Slack, Mailchimp, ConvertKit) are encrypted client-side before being written to the database:

- **Algorithm**: AES-GCM, 256-bit key
- **Key derivation**: PBKDF2 from a hardcoded seed via Web Crypto API
- **Implementation**: `src/lib/secretEncryption.ts`
- **Storage format**: `enc:<base64-encoded-ciphertext>`
- **Backward compatibility**: `isEncrypted()` checks for the `enc:` prefix. Existing plaintext values are returned as-is (transparent migration).

**Important**: The encryption key is derived from a hardcoded seed in the client code. This is MVP-level protection — it prevents plaintext at-rest exposure in the database but is not as strong as server-managed key storage. For production hardening, consider migrating to Supabase Vault or a server-side key management service.

---

## GDPR Compliance

### Consent at Signup

- A `ConsentCheckbox` component is displayed in the signup form
- The sign-up button is disabled until the user checks consent
- On signup, `consent_given_at TIMESTAMPTZ` is updated in the `profiles` table (migration `034_consent_tracking.sql`)
- Component: `src/components/gdpr/ConsentCheckbox.tsx`

### Privacy Notice on Public Forms

- A `PrivacyNotice` component is shown near the submit button on all public form types
- Displays which data is collected and for what purpose (configurable per form mode)
- Component: `src/components/gdpr/PrivacyNotice.tsx`
- Applied to: `WaitlistLandingPage`, `FeedbackSurveyPage`, `SupportSubmitPage`, `FormRenderer` (live forms only)

### Data Export

- Users can export all their data from the Navbar → user dropdown → "Export My Data" (navigates to `/data-export`)
- **Implemented in**: `src/pages/DataExport.tsx`
- **Exports 15 data categories**: profile, workspaces, forms, submissions, notifications, waitlistEntries, waitlistInvites, feedbackResponses, feedbackAlerts, tickets, ticketMessages, cannedResponses, tags, ticketTags
- Each category is exported as a separate JSON download

### Account Deletion

- Users can delete their account from the Navbar → user dropdown → "Delete Account" (navigates to `/account-deletion`)
- **Implemented in**: `src/pages/AccountDeletion.tsx`
- Deletion calls the `delete-account` edge function atomically
- **`delete-account` edge function** (`supabase/functions/delete-account/index.ts`):
  - Requires valid JWT (401 if missing)
  - Deletes owned workspaces via CASCADE (removes all related data: forms, submissions, waitlist entries, tickets, etc.)
  - Deletes workspace memberships
  - Deletes notifications
  - Deletes profile
  - Deletes `auth.users` record via service role
- If the user has active Stripe subscriptions, a warning is shown with a link to billing settings (automatic cancellation not yet implemented)

### Known GDPR Gaps

| Gap | Status |
|-----|--------|
| Terms of Service page (`/terms`) | Not implemented |
| Data retention cron jobs | Commented out in migration 027; requires pg_cron via Supabase Dashboard |
| Anonymous form respondent data portal | Not implemented (respondents cannot request their own data) |
| Audit log for data exports | Not implemented |
| Automatic Stripe subscription cancellation on deletion | Warning shown; manual cancellation required |

---

## Security Headers

### Current State

Security headers are not currently configured at the application level. FormForge is a Vite SPA with no custom server — headers depend on the deployment host (e.g., Vercel, Netlify, Supabase Hosting).

### Recommended Production Headers

For production deployment, configure the following response headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Notes**:
- CSP must allow `*.supabase.co` for Supabase Auth, Realtime, and API calls
- CSP must allow `api.stripe.com` and `js.stripe.com` for Stripe.js
- `unsafe-inline` for styles is required by Tailwind CSS; consider enabling `nonces` for a stronger CSP

### CORS (Edge Functions)

Edge functions include CORS headers to support browser-side calls. Review each edge function's CORS `origin` setting before production deployment — consider restricting to the application domain instead of `*`.

---

## Vulnerability Management

### npm Audit

Run `npm audit` regularly to check for known vulnerabilities in dependencies.

**Current status (2026-03-15, post-pipeline)**:
- 15 vulnerabilities found (3 low, 5 moderate, 7 high)
- **All are in development/build tools** (rollup, minimatch) — NOT in runtime code
- No vulnerabilities in production dependencies (React, Supabase JS, Tailwind, Radix UI, etc.)

**To check**:
```bash
npm audit
# For runtime-only audit (excludes devDependencies):
npm audit --omit=dev
```

### Dependency Update Strategy

- Run `npm audit` before each release
- Pin major versions in `package.json` to avoid unexpected breaking changes
- Review changelog before upgrading Supabase JS (auth behavior may change)
- Do not install new dependencies without explicit review — see `CLAUDE.md`

---

## Known Deferred Security Issues

| Issue | Priority | Description |
|-------|----------|-------------|
| Server-side submission limit enforcement | P0 | `canAcceptSubmission()` is client-side only; a malicious client can bypass it |
| `classify-ticket` 401 from public page | P0 | Edge function requires JWT; public `SupportSubmitPage` has none — ticket classification silently fails |
| Ticket enumeration (partial fix) | P1 | Anonymous users can still list tickets scoped to a form; full fix requires server-side email token |
| Ticket number race condition | P1 | `generate_ticket_number()` uses `MAX(ticket_number)` without advisory locking |
| Missing UPDATE RLS on `form_templates` | P1 | Template table existence not confirmed; policy skipped |
| SSO login UI not wired | P1 | `signInWithSSO` in AuthContext works; UI not yet added to `Auth.tsx` |
| White-label on public pages | P1 | `PoweredByEnforcer` component ready; not yet integrated in public form pages |
| Client-side encryption key hardcoded | P2 | AES-GCM key derived from hardcoded PBKDF2 seed; should use server-managed key for production |
| No MFA/2FA | P2 | Not yet implemented; Supabase supports TOTP and phone OTP |

---

## Reporting Security Issues

If you discover a security vulnerability in FormForge, please:

1. Do **not** create a public GitHub issue
2. Contact the workspace owner or security team directly
3. Include: description, reproduction steps, impact assessment, and any suggested fix

Allow reasonable time for the team to patch before any public disclosure.
