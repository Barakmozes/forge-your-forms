# API Security Documentation — FormForge

> Last updated: 2026-03-12 (Agent 17 — Phase 6)

---

## 1. API Key Authentication (api-v1)

### Flow
1. Client sends request with `X-API-Key: <raw_key>` header
2. Edge function hashes the key with SHA-256
3. Looks up `key_hash` in `api_keys` table
4. Verifies key is not revoked (`revoked_at IS NULL`)
5. Checks rate limit (100 req/min per key)
6. Updates `last_used_at` timestamp (fire-and-forget)
7. Returns workspace-scoped data

### Key Lifecycle
- **Creation**: Generated in dashboard, stored as SHA-256 hash (raw key shown once)
- **Usage**: Include in `X-API-Key` header on every request
- **Revocation**: Set `revoked_at` timestamp — key immediately stops working
- **Rotation**: Create new key, update integrations, revoke old key

### Workspace Scoping
Every API request is scoped to the workspace associated with the API key. A key cannot access data from other workspaces. The workspace_id is derived from the key lookup, never from user input.

---

## 2. Rate Limiting

### api-v1 (Public API)
- **Limit**: 100 requests per minute per API key
- **Implementation**: In-memory counter per key hash (resets on cold start)
- **Headers**: All responses include rate limit headers:
  - `X-RateLimit-Limit`: Maximum requests per window (100)
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when the window resets
- **429 Response**: Includes `Retry-After` header (seconds until reset)

### AI Functions
- `ai-generate`: 10 generations per day per workspace (tracked in `ai_cache` table)
- `ai-analyze`: No explicit rate limit (batch size capped at 100 submissions)
- `classify-ticket`: No explicit rate limit (single-ticket classification)

### Workflow Engine
- `execute-workflow`: 100 runs per hour per workflow
- Circular execution depth limited to 3

---

## 3. HMAC Webhook Signature Verification

### How Signatures Work (dispatch-webhook)

When FormForge dispatches a webhook, each request includes:

| Header | Value |
|--------|-------|
| `X-FormForge-Signature` | `sha256=<hex_hmac>` |
| `X-FormForge-Event` | Event type (e.g., `form.submission_created`) |
| `X-FormForge-Delivery-Id` | Unique delivery UUID |
| `Content-Type` | `application/json` |
| `User-Agent` | `FormForge-Webhook/1.0` |

### Verifying Signatures (Consumer Guide)

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-formforge-signature'];
  const rawBody = req.rawBody; // Must use raw body, not parsed JSON

  if (!verifySignature(rawBody, signature, YOUR_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});
```

### Payload Structure

```json
{
  "id": "<delivery_uuid>",
  "event": "form.submission_created",
  "created_at": "2026-03-12T10:00:00.000Z",
  "data": {
    // Event-specific payload
  }
}
```

### Retry Policy
- Failed deliveries (5xx or network error) are scheduled for retry
- Retry intervals: 1 minute, 5 minutes, 30 minutes
- 4xx responses are NOT retried (client error)
- Maximum 3 delivery attempts total

---

## 4. SSRF Protection

### dispatch-webhook
Webhook URLs are validated before delivery:
- Only HTTPS URLs allowed
- Blocked: `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `169.254.169.254`
- Blocked: Private IP ranges (`10.*`, `192.168.*`, `172.*`)
- Blocked: `.internal` and `.local` domains
- Request timeout: 10 seconds

### slack-notify
- Only `hooks.slack.com` hostname is allowed
- All other URLs are rejected with 400

---

## 5. Error Response Format

### api-v1 Errors
```json
{
  "error": {
    "code": "unauthorized|bad_request|not_found|rate_limited|internal|method_not_allowed|conflict",
    "message": "Human-readable error description"
  }
}
```

### Other Functions
```json
{
  "error": "Human-readable error description",
  "success": false
}
```

### Standard HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad request (missing/invalid fields) |
| 401 | Unauthorized (missing or invalid auth) |
| 404 | Not found |
| 405 | Method not allowed |
| 409 | Conflict (duplicate resource) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | Bad gateway (upstream AI API failure) |
| 503 | Service unavailable (missing configuration) |

---

## 6. CORS Policy

| Function | Access-Control-Allow-Origin | Rationale |
|----------|---------------------------|-----------|
| stripe-webhook | None (no CORS) | Server-to-server only (Stripe) |
| send-email | Internal only | Called by triggers/workflows, not browser |
| api-v1 | `*` | Public API, any origin allowed |
| dispatch-webhook | `*` | Internal, but may be called from dashboard |
| ai-generate | `*` | Called from authenticated frontend |
| ai-analyze | `*` | Called from authenticated frontend |
| classify-ticket | `*` | Called from authenticated frontend |
| churn-score | `*` | Called from authenticated frontend |
| execute-workflow | `*` | Internal workflow engine |
| slack-notify | `*` | Internal, called by workflow engine |

---

## 7. Authentication Matrix

| Function | Auth Method | Who Can Call |
|----------|------------|-------------|
| stripe-webhook | Stripe signature (HMAC-SHA256) | Stripe only |
| send-email | Service role key (Authorization header) | Internal services only |
| api-v1 | API key (X-API-Key header) | External integrations |
| dispatch-webhook | None (internal, called by service role) | Internal services |
| ai-generate | Supabase JWT (Authorization: Bearer) | Authenticated users |
| ai-analyze | Supabase JWT | Authenticated users |
| classify-ticket | Supabase JWT | Authenticated users |
| churn-score | Supabase JWT | Authenticated users |
| execute-workflow | None (internal, called by triggers) | Internal services |
| slack-notify | None (internal, called by workflows) | Internal services |

---

## 8. Input Validation Summary

All edge functions validate:
- HTTP method (POST only for mutations)
- Required fields in request body
- JSON parse errors (returns 400)

Additional validations per function:
- **api-v1**: UUID format for IDs, pagination limits (max 100 per page), workspace scoping
- **send-email**: Template name must exist in registry, HTML sanitization on template variables
- **ai-generate**: Mode must be valid, prompt required, workspace_id required
- **classify-ticket**: Priority output validated against allowed values
- **dispatch-webhook**: URL SSRF validation
- **slack-notify**: URL must be hooks.slack.com
