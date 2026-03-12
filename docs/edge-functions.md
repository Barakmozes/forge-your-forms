# Edge Functions Reference — FormForge

> Last updated: 2026-03-12 (Agent 17 — Phase 6)
> 10 Supabase Edge Functions (Deno runtime)

---

## Quick Reference

| Function | Method | Auth | Plan Tier | Purpose |
|----------|--------|------|-----------|---------|
| stripe-webhook | POST | Stripe signature | All | Billing event sync |
| send-email | POST | Service role key | All | Transactional emails |
| api-v1 | GET/POST | API key (X-API-Key) | Growth+ | Public REST API |
| dispatch-webhook | POST | Internal | Growth+ | Webhook delivery |
| ai-generate | POST | Supabase JWT | Business | AI form generation |
| ai-analyze | POST | Supabase JWT | Business | Response analysis |
| classify-ticket | POST | Supabase JWT | Business | Ticket classification |
| churn-score | POST | Supabase JWT | Business | Churn risk scoring |
| execute-workflow | POST | Internal | Growth+ | Workflow engine |
| slack-notify | POST | Internal | Growth+ | Slack notifications |

---

## 1. stripe-webhook

**Endpoint**: `POST /functions/v1/stripe-webhook`

Handles Stripe billing events and syncs subscription state to the `subscriptions` table.

### Handled Events
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription (upsert) |
| `invoice.paid` | Extend subscription period |
| `invoice.payment_failed` | Mark subscription as `past_due` |
| `customer.subscription.updated` | Sync plan and status changes |
| `customer.subscription.deleted` | Mark subscription as `canceled` |

### Authentication
- Stripe HMAC-SHA256 signature verification via `stripe-signature` header
- 5-minute timestamp tolerance

### Required Secrets
- `STRIPE_SECRET_KEY` — Stripe API key for fetching subscription details
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret from Stripe dashboard

### Error Handling
- Returns 200 even on processing errors (prevents Stripe retries for bad data)
- Returns 400 for missing/invalid signature
- Returns 405 for non-POST methods
- Returns 500 if secrets are not configured

### Example (Stripe sends automatically)
```bash
curl -X POST https://ywsqgrjfmxdjsuaqzsnw.supabase.co/functions/v1/stripe-webhook \
  -H "stripe-signature: t=1234,v1=abc..." \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{...}}}'
```

---

## 2. send-email

**Endpoint**: `POST /functions/v1/send-email`

Sends transactional emails via Resend API with 6 locale-aware templates.

### Templates
| Template Key | Trigger | Variables |
|-------------|---------|-----------|
| `welcome` | User signup | `userName`, `dashboardUrl` |
| `waitlist_invite` | Batch invite | `formTitle`, `inviteMessage`, `ctaUrl` |
| `ticket_confirmation` | New ticket | `ticketNumber`, `subject`, `trackingUrl` |
| `detractor_alert` | NPS ≤ 6 | `customerEmail`, `score`, `feedbackText`, `dashboardUrl` |
| `payment_confirmation` | Subscription started | `planName`, `billingDate`, `manageUrl` |
| `payment_failed` | Invoice failed | `updatePaymentUrl` |

### Request Body
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "variables": { "userName": "John" },
  "locale": "en"
}
```

### Authentication
- Requires service role key in `Authorization: Bearer <key>` or `apikey` header

### Required Secrets
- `RESEND_API_KEY` — Resend API key
- `FROM_EMAIL` — Verified sender email (default: `FormForge <noreply@formforge.io>`)

### Security
- HTML sanitization on all template variables (XSS prevention)
- URL variables preserved for href attributes

### Response
```json
{ "success": true, "messageId": "re_abc123" }
```

---

## 3. api-v1

**Endpoint**: `GET/POST /functions/v1/api-v1/{resource}`

Public REST API for external integrations. Workspace-scoped via API key.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api-v1/forms` | List forms (paginated) |
| GET | `/api-v1/forms/:id` | Get single form |
| GET | `/api-v1/submissions?form_id=X` | List submissions (paginated) |
| POST | `/api-v1/submissions` | Create submission |
| GET | `/api-v1/waitlist?form_id=X` | List waitlist entries (paginated) |
| POST | `/api-v1/waitlist` | Add to waitlist |

### Authentication
```
X-API-Key: ff_live_abc123...
```

### Rate Limiting
- 100 requests per minute per API key
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 response includes `Retry-After` header

### Pagination
```
?page=1&per_page=25
```
Maximum 100 items per page.

### Required Secrets
- `SUPABASE_URL` (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

### Example
```bash
curl -H "X-API-Key: ff_live_abc123" \
  "https://ywsqgrjfmxdjsuaqzsnw.supabase.co/functions/v1/api-v1/forms?page=1&per_page=10"
```

### Response Format
```json
{
  "data": [...],
  "pagination": { "page": 1, "per_page": 10, "total": 42 }
}
```

---

## 4. dispatch-webhook

**Endpoint**: `POST /functions/v1/dispatch-webhook`

Delivers webhook payloads to registered URLs with HMAC-SHA256 signing.

### Request Body
```json
{
  "workspace_id": "uuid",
  "event_type": "form.submission_created",
  "payload": { ... }
}
```

### Delivery Headers
| Header | Value |
|--------|-------|
| `X-FormForge-Signature` | `sha256=<hmac_hex>` |
| `X-FormForge-Event` | Event type |
| `X-FormForge-Delivery-Id` | Unique delivery UUID |
| `User-Agent` | `FormForge-Webhook/1.0` |

### Security
- SSRF protection: blocks localhost, private IPs, internal domains
- HTTPS only
- 10-second timeout per delivery
- Response body truncated to 1000 chars

### Response
```json
{ "delivered": 2, "failed": 1, "total": 3 }
```

---

## 5. ai-generate

**Endpoint**: `POST /functions/v1/ai-generate`

Generates form fields from natural language prompts using Anthropic Claude.

### Request Body
```json
{
  "prompt": "Create a customer feedback form for a restaurant",
  "mode": "feedback",
  "locale": "en",
  "workspace_id": "uuid"
}
```

### Authentication
- Supabase JWT via `Authorization: Bearer <access_token>`

### Rate Limit
- 10 generations per day per workspace

### Required Secrets
- `ANTHROPIC_API_KEY`

### Response
```json
{
  "title": "Restaurant Feedback",
  "description": "Share your dining experience",
  "fields": [...]
}
```

---

## 6. ai-analyze

**Endpoint**: `POST /functions/v1/ai-analyze`

Analyzes form submissions for sentiment, themes, and actionable insights.

### Request Body
```json
{
  "submissions": [
    { "id": "uuid", "text_fields": { "feedback": "Great product!" } }
  ],
  "form_id": "uuid",
  "workspace_id": "uuid",
  "locale": "en"
}
```

### Limits
- Maximum 100 submissions per request
- Results cached for 24 hours

### Response
```json
{
  "summary": {
    "topThemes": ["..."],
    "sentimentTrend": "improving",
    "overallSentiment": "positive",
    "suggestedActions": ["..."],
    "analyzedCount": 50,
    "analyzedAt": "2026-03-12T..."
  },
  "sentiments": [
    { "submissionId": "uuid", "sentiment": "positive", "keywords": ["great"] }
  ]
}
```

---

## 7. classify-ticket

**Endpoint**: `POST /functions/v1/classify-ticket`

Auto-classifies support tickets by category and priority.

### Request Body
```json
{
  "subject": "Can't login to my account",
  "description": "Getting 500 error when I try to sign in",
  "categories": ["Bug", "Account", "Billing", "Feature Request"],
  "form_id": "uuid",
  "workspace_id": "uuid"
}
```

### Response
```json
{
  "category": "Account",
  "priority": "high",
  "confidence": 0.92,
  "reasoning": "Login failure affecting user access is high priority"
}
```

---

## 8. churn-score

**Endpoint**: `POST /functions/v1/churn-score`

Calculates customer churn risk scores based on NPS, ticket frequency, sentiment, and engagement.

### Request Body
```json
{
  "workspace_id": "uuid"
}
```

### Scoring Formula
| Factor | Impact |
|--------|--------|
| NPS < 5 | +30 risk |
| NPS 5-6 | +15 risk |
| NPS 7-8 | -5 risk |
| NPS 9-10 | -20 risk |
| >3 tickets/30d | +20 risk |
| 1-3 tickets/30d | +5 risk |
| Negative sentiment | +15 risk |
| Positive sentiment | -10 risk |
| >30 days inactive | +10 risk |

Base score: 50. Range: 0-100.

### Response
```json
{
  "scored": 15,
  "message": "Churn scores calculated successfully"
}
```

---

## 9. execute-workflow

**Endpoint**: `POST /functions/v1/execute-workflow`

Executes workflow automation (conditions + actions).

### Request Body
```json
{
  "workflow_id": "uuid",
  "workspace_id": "uuid",
  "trigger_type": "feedback.detractor",
  "trigger_data": { "nps_score": 3, "respondent_email": "user@example.com" }
}
```

### Supported Actions
- `send_email` — Send email via send-email function
- `create_ticket` — Create support ticket
- `slack_message` — Send Slack notification
- `fire_webhook` — Dispatch webhook
- `change_status` — Update ticket status
- `add_tag` — Add tag to ticket

### Safety
- Max execution depth: 3 (prevents circular triggers)
- Rate limit: 100 runs per hour per workflow

---

## 10. slack-notify

**Endpoint**: `POST /functions/v1/slack-notify`

Sends formatted Slack Block Kit messages via Incoming Webhook.

### Request Body
```json
{
  "webhook_url": "https://hooks.slack.com/services/T.../B.../xxx",
  "event_type": "form.submission_created",
  "form_title": "Contact Form",
  "data": { "email": "user@example.com", "name": "John" }
}
```

### Security
- Only `hooks.slack.com` URLs are accepted (SSRF protection)

---

## Deployment Guide

### Deploy All Functions
```bash
./scripts/deploy-functions.sh
```

### Deploy Single Function
```bash
npx supabase functions deploy <function-name> --project-ref ywsqgrjfmxdjsuaqzsnw
```

### Set Secrets
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref ywsqgrjfmxdjsuaqzsnw
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref ywsqgrjfmxdjsuaqzsnw
npx supabase secrets set RESEND_API_KEY=re_... --project-ref ywsqgrjfmxdjsuaqzsnw
npx supabase secrets set FROM_EMAIL="FormForge <noreply@formforge.io>" --project-ref ywsqgrjfmxdjsuaqzsnw
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref ywsqgrjfmxdjsuaqzsnw
```

### View Logs
```bash
npx supabase functions logs <function-name> --project-ref ywsqgrjfmxdjsuaqzsnw
```

### Run Smoke Tests
```bash
./scripts/test-functions.sh
```

### Rollback
Supabase edge functions don't have built-in rollback. To rollback:
1. Check out the previous commit: `git checkout <commit> -- supabase/functions/<name>/`
2. Redeploy: `npx supabase functions deploy <name> --project-ref ywsqgrjfmxdjsuaqzsnw`
