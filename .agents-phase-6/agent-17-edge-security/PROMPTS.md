# Agent 17 — Prompts

## Prompt Checklist
- [ ] 17.0 — Planning & Edge Function Inventory
- [ ] 17.1 — Core Functions: Stripe Webhook & Email
- [ ] 17.2 — API & Webhook Functions: Security Hardening
- [ ] 17.3 — AI & Enterprise Functions: Verification
- [ ] 17.4 — Deployment Automation & Documentation

---

### PROMPT 17.0: Planning & Edge Function Inventory

```
You are the Edge Functions & API Security Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

SUPER TASK: Deploy, verify, and harden all Supabase Edge Functions for production.

TASK: Inventory all edge functions, assess their deployment status, and create a remediation plan.

1. Inventory all edge function source code:
   ls -la supabase/functions/
   For each function directory, read the index.ts file and document:
   - Function name
   - Purpose and trigger type (HTTP, webhook, scheduled)
   - Required secrets/env vars
   - External service dependencies (Stripe, Resend, Anthropic)
   - Input validation present? (yes/no)
   - Error handling present? (yes/no)
   - CORS handling present? (yes/no)

2. Check deployment status via Supabase CLI:
   npx supabase functions list --project-ref ywsqgrjfmxdjsuaqzsnw
   
   Compare deployed functions vs source code functions.
   Flag any functions that exist in code but aren't deployed.

3. Check configured secrets:
   npx supabase secrets list --project-ref ywsqgrjfmxdjsuaqzsnw
   
   Required secrets inventory:
   - STRIPE_SECRET_KEY (stripe-webhook)
   - STRIPE_WEBHOOK_SECRET (stripe-webhook)
   - RESEND_API_KEY (send-email)
   - FROM_EMAIL (send-email)
   - ANTHROPIC_API_KEY (ai-generate-form, ai-analyze-responses, ai-smart-routing, ai-churn-prediction)
   
   Flag any missing secrets.

4. Create a priority matrix:
   | Function | Deployed? | Secrets OK? | Code Review | Priority |
   P0 = revenue-critical (stripe-webhook, api-v1)
   P1 = user-facing (send-email, dispatch-webhook)
   P2 = feature (ai-*, sso, custom-domain)

5. Read Agent 16's AUDIT-REPORT.md for any database-related findings 
   that affect edge functions (e.g., missing tables, RLS issues).

6. Update PROGRESS.md with session entry.

VERIFY:
- Complete inventory of all edge functions
- Deployment status known for each function
- Secret requirements documented
- Priority matrix created
```

---

### PROMPT 17.1: Core Functions — Stripe Webhook & Email

```
You are the Edge Functions & API Security Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Audit, fix, deploy, and verify the two most critical edge functions: stripe-webhook and send-email.

1. STRIPE-WEBHOOK Function:
   a. Code Review (supabase/functions/stripe-webhook/index.ts):
      - Verify Stripe signature validation using stripe.webhooks.constructEvent()
      - Verify it handles ALL 5 events:
        • checkout.session.completed → create/update subscription
        • invoice.paid → extend subscription period
        • invoice.payment_failed → mark subscription as past_due
        • customer.subscription.updated → sync plan changes
        • customer.subscription.deleted → mark as canceled
      - Verify each event handler updates the subscriptions table correctly
      - Check error handling: what happens if DB write fails after Stripe confirms?
      - Verify the function returns 200 even on non-critical errors (Stripe retries on 4xx/5xx)
   
   b. Security Checks:
      - Raw body is used for signature verification (not parsed JSON)
      - STRIPE_WEBHOOK_SECRET is used (not STRIPE_SECRET_KEY)
      - No sensitive data logged
      - Response doesn't leak internal state
   
   c. Deploy:
      npx supabase functions deploy stripe-webhook --project-ref ywsqgrjfmxdjsuaqzsnw
   
   d. Verify secrets are set:
      Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are configured
   
   e. Test (if Stripe CLI available):
      stripe trigger checkout.session.completed --forward-to <function_url>
      Or document the manual test procedure for AUDIT-REPORT.md

2. SEND-EMAIL Function:
   a. Code Review (supabase/functions/send-email/index.ts):
      - Verify Resend API integration
      - Verify all 6 email templates are implemented:
        • welcome (signup)
        • waitlist_invite (batch invite)
        • ticket_confirmation (new ticket)
        • detractor_alert (NPS ≤ 6)
        • payment_confirmation (subscription started)
        • payment_failed (invoice failed)
      - Verify locale-awareness (Hebrew + English templates)
      - Check that FROM_EMAIL matches verified Resend domain
      - Verify input validation (required fields, email format)
   
   b. Security Checks:
      - Function requires auth token or internal service key
      - Email content is sanitized (no HTML injection in user-provided fields)
      - Rate limiting to prevent email abuse
   
   c. Deploy:
      npx supabase functions deploy send-email --project-ref ywsqgrjfmxdjsuaqzsnw
   
   d. Verify RESEND_API_KEY and FROM_EMAIL are set

3. Fix any issues found in source code:
   - Add missing input validation
   - Add missing error handling
   - Fix CORS headers (allow only production domain)
   - Ensure correct Content-Type headers

4. Update AUDIT-REPORT.md with findings for each function.

VERIFY:
- stripe-webhook deployed and responding
- send-email deployed and responding
- Both functions have input validation
- Both functions handle errors gracefully
- CORS configured for production domain only
- All required secrets are set
```

---

### PROMPT 17.2: API & Webhook Functions — Security Hardening

```
You are the Edge Functions & API Security Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Audit, harden, deploy, and verify the API and webhook edge functions.

1. API-V1 Function:
   a. Code Review (supabase/functions/api-v1/index.ts):
      - Verify API key authentication:
        • Reads X-API-Key header
        • Hashes the key and looks up in api_keys table
        • Checks key is not revoked (revoked_at IS NULL)
        • Updates last_used_at on successful auth
      - Verify rate limiting (100 req/min per API key):
        • How is it tracked? (in-memory counter resets? Redis? DB?)
        • Is it correctly enforced or easily bypassed?
      - Verify all REST endpoints:
        • GET /forms — list forms for workspace
        • POST /forms — create form
        • GET /forms/:id/submissions — list submissions
        • POST /forms/:id/submissions — create submission
        • GET /waitlist/:formId — list waitlist entries
        • POST /waitlist/:formId — add to waitlist
      - Check workspace scoping: API key → workspace → only that workspace's data
      - Verify response format consistency (JSON, status codes, error messages)
   
   b. Security Hardening:
      - Input validation on all POST bodies (Zod or manual)
      - SQL injection prevention (parameterized queries only)
      - Response size limits
      - No internal error details leaked in production responses
      - CORS: restrict to known origins or * for API usage
      - Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
   
   c. Deploy and test:
      npx supabase functions deploy api-v1 --project-ref ywsqgrjfmxdjsuaqzsnw
      
      Test with curl:
      curl -H "X-API-Key: test_key" https://ywsqgrjfmxdjsuaqzsnw.supabase.co/functions/v1/api-v1/forms

2. DISPATCH-WEBHOOK Function:
   a. Code Review (supabase/functions/dispatch-webhook/index.ts):
      - Verify HMAC-SHA256 signature generation:
        • Uses webhook.secret to sign payload
        • Signature sent in X-Webhook-Signature header
      - Verify retry logic (3 retries with exponential backoff):
        • Retry on 5xx responses
        • Don't retry on 4xx (client error)
        • Backoff: 1s → 4s → 16s (or similar)
      - Verify delivery logging to webhook_deliveries table:
        • Logs: webhook_id, payload, response_status, response_body, attempt_number
      - Check timeout handling (what if target server is slow?)
      - Verify payload structure matches documentation
   
   b. Security Hardening:
      - Webhook URLs are validated (no internal/localhost URLs)
      - Payload size limits
      - Timeout: max 30 seconds per attempt
      - No credential leaking in payloads
   
   c. Deploy:
      npx supabase functions deploy dispatch-webhook --project-ref ywsqgrjfmxdjsuaqzsnw

3. Create docs/api-security.md:
   - API authentication flow (API key lifecycle)
   - Rate limiting specification
   - HMAC webhook signature verification guide for consumers
   - Error response format specification
   - CORS policy documentation

4. Update AUDIT-REPORT.md with findings.

VERIFY:
- api-v1 deployed and responding to authenticated requests
- dispatch-webhook deployed and signing payloads correctly
- Rate limiting is functional (not just documented)
- docs/api-security.md is complete
- No internal URLs accessible via webhook dispatch
```

---

### PROMPT 17.3: AI & Enterprise Functions — Verification

```
You are the Edge Functions & API Security Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Audit, deploy, and verify the AI and Enterprise edge functions.

1. AI FUNCTIONS (4 functions):
   a. ai-generate-form:
      - Verify Anthropic API integration (correct model, max_tokens)
      - Verify input: user description → structured form fields output
      - Check prompt injection protection (system prompt hardening)
      - Verify output validation (generated fields match expected schema)
      - Check token/cost limits per request
      - Deploy: npx supabase functions deploy ai-generate-form --project-ref ywsqgrjfmxdjsuaqzsnw
   
   b. ai-analyze-responses:
      - Verify it summarizes feedback responses and detects themes
      - Check batch size limits (don't send 10,000 responses in one call)
      - Verify caching (don't re-analyze already-analyzed responses)
      - Deploy: npx supabase functions deploy ai-analyze-responses --project-ref ywsqgrjfmxdjsuaqzsnw
   
   c. ai-smart-routing:
      - Verify ticket auto-classification (category, priority, agent)
      - Check it reads form settings for available categories/agents
      - Verify it returns structured classification, not free text
      - Deploy: npx supabase functions deploy ai-smart-routing --project-ref ywsqgrjfmxdjsuaqzsnw
   
   d. ai-churn-prediction:
      - Verify it combines NPS scores + support ticket history
      - Check the scoring formula is reasonable
      - Verify output format (risk score 0-100 + factors)
      - Deploy: npx supabase functions deploy ai-churn-prediction --project-ref ywsqgrjfmxdjsuaqzsnw
   
   For ALL AI functions, verify:
   - ANTHROPIC_API_KEY secret is required and checked
   - Request timeout handling (AI calls can be slow)
   - Cost tracking or usage limits
   - Error handling for API rate limits / outages
   - No user PII sent unnecessarily to Anthropic

2. ENTERPRISE FUNCTIONS (2 functions):
   a. sso-saml-handler:
      - Verify SAML response parsing and validation
      - Check certificate validation
      - Verify user provisioning flow (SAML assertion → profile + workspace)
      - Check for SAML replay attack protection
      - Deploy: npx supabase functions deploy sso-saml-handler --project-ref ywsqgrjfmxdjsuaqzsnw
   
   b. custom-domain-proxy:
      - Verify domain → workspace mapping logic
      - Check TLS/SSL handling
      - Verify it doesn't become an open proxy
      - Check for host header injection
      - Deploy: npx supabase functions deploy custom-domain-proxy --project-ref ywsqgrjfmxdjsuaqzsnw

3. Feature-gate verification:
   - AI functions should check the caller's plan (Business tier only)
   - Enterprise functions should check Business tier
   - How is this enforced? Auth token → workspace → subscription → plan check?
   - Document the enforcement chain

4. Update AUDIT-REPORT.md with all AI + Enterprise function findings.

VERIFY:
- All 6 functions deployed
- ANTHROPIC_API_KEY is set in Supabase secrets
- AI functions have prompt injection protection
- Enterprise functions have proper auth checks
- No open proxy vulnerabilities
- Plan-tier gating is enforced
```

---

### PROMPT 17.4: Deployment Automation & Documentation

```
You are the Edge Functions & API Security Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Create deployment automation and comprehensive documentation for all edge functions.

1. Create scripts/deploy-functions.sh:
   #!/bin/bash
   set -euo pipefail
   
   PROJECT_REF="ywsqgrjfmxdjsuaqzsnw"
   FUNCTIONS=(
     "stripe-webhook"
     "send-email"
     "dispatch-webhook"
     "api-v1"
     "ai-generate-form"
     "ai-analyze-responses"
     "ai-smart-routing"
     "ai-churn-prediction"
     "sso-saml-handler"
     "custom-domain-proxy"
   )
   
   For each function:
   - Check source exists
   - Deploy with npx supabase functions deploy
   - Verify deployment succeeded (check response)
   - Log results
   
   Include --verify flag that also runs smoke tests after deployment.

2. Create scripts/test-functions.sh:
   For each function, a basic health check:
   - stripe-webhook: POST with invalid signature → expect 400 (not 500)
   - send-email: POST without auth → expect 401
   - api-v1: GET /forms without API key → expect 401
   - api-v1: GET /forms with invalid key → expect 403
   - dispatch-webhook: POST without body → expect 400
   - AI functions: POST without ANTHROPIC_API_KEY → expect graceful error
   
   Each test: send request → check status code → PASS/FAIL

3. Create docs/edge-functions.md:
   For each function, document:
   - Endpoint URL
   - HTTP method(s)
   - Required headers
   - Request body schema
   - Response body schema
   - Error codes and meanings
   - Required secrets
   - Plan tier requirement
   - Example curl command
   
   Include a deployment guide section:
   - How to deploy all functions
   - How to set secrets
   - How to view logs
   - How to rollback

4. CORS Configuration Summary:
   Document the CORS policy for each function:
   - stripe-webhook: no CORS (server-to-server)
   - send-email: internal only (called by triggers)
   - api-v1: allow all origins (public API)
   - dispatch-webhook: internal only
   - AI functions: production domain only
   - Enterprise functions: production domain only

5. Create a secrets checklist (docs/secrets-checklist.md):
   List every secret, which functions need it, how to obtain it,
   and how to rotate it. Include verification commands.

6. Update PROGRESS.md as COMPLETE.

VERIFY:
- scripts/deploy-functions.sh is executable and complete
- scripts/test-functions.sh runs all smoke tests
- docs/edge-functions.md covers all 10 functions
- docs/secrets-checklist.md lists all secrets
- All functions are deployed and passing smoke tests
```
