# Edge Function Secrets

All secrets are configured in the Supabase Dashboard:
**Project Settings > Edge Functions > Secrets**

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in all edge functions — do NOT set them manually.

---

## Required Secrets

### STRIPE_SECRET_KEY
- **Used by:** `stripe-webhook`, `create-checkout`, `create-portal-session`
- **Where to get:** [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)
- **Format:** `sk_test_...` (test) or `sk_live_...` (production)
- **Status:** Configured (test mode)

### STRIPE_WEBHOOK_SECRET
- **Used by:** `stripe-webhook`
- **Where to get:** [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks) — create an endpoint pointing to `https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/stripe-webhook` and copy the signing secret
- **Format:** `whsec_...`
- **Status:** Needs to be set after deploying the stripe-webhook function

### RESEND_API_KEY
- **Used by:** `send-email`
- **Where to get:** [Resend Dashboard > API Keys](https://resend.com/api-keys)
- **Format:** `re_...`
- **Status:** Not set — function returns 500 gracefully when missing

### FROM_EMAIL
- **Used by:** `send-email`
- **Default:** `FormForge <noreply@formforge.io>`
- **Note:** The sending domain must be verified in Resend before emails will deliver
- **Status:** Optional — falls back to default

### ANTHROPIC_API_KEY
- **Used by:** `ai-generate`, `ai-analyze`, `classify-ticket`
- **Where to get:** [Anthropic Console > API Keys](https://console.anthropic.com/settings/keys)
- **Format:** `sk-ant-...`
- **Status:** Not set — AI functions return 503 gracefully when missing

---

## Function → Secret Matrix

| Function | STRIPE_SECRET_KEY | STRIPE_WEBHOOK_SECRET | RESEND_API_KEY | FROM_EMAIL | ANTHROPIC_API_KEY |
|----------|:-:|:-:|:-:|:-:|:-:|
| `stripe-webhook` | x | x | | | |
| `create-checkout` | x | | | | |
| `create-portal-session` | x | | | | |
| `send-email` | | | x | x | |
| `ai-generate` | | | | | x |
| `ai-analyze` | | | | | x |
| `classify-ticket` | | | | | x |
| `churn-score` | | | | | |
| `dispatch-webhook` | | | | | |
| `slack-notify` | | | | | |
| `api-v1` | | | | | |
| `execute-workflow` | | | | | |

---

## JWT Verification

| Function | verify_jwt | Auth Method |
|----------|:----------:|-------------|
| `stripe-webhook` | false | Stripe signature verification |
| `api-v1` | false | API key (`X-API-Key` header) |
| `create-checkout` | true | Supabase JWT |
| `create-portal-session` | true | Supabase JWT |
| `send-email` | true | Service role key |
| `ai-generate` | true | Supabase JWT |
| `ai-analyze` | true | Supabase JWT |
| `classify-ticket` | true | Supabase JWT |
| `churn-score` | true | Supabase JWT |
| `dispatch-webhook` | true | Supabase JWT |
| `slack-notify` | true | Supabase JWT |
| `execute-workflow` | true | Supabase JWT |

---

## Stripe Webhook Endpoint Setup

After deploying, register this URL in the Stripe Dashboard:

**URL:** `https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/stripe-webhook`

**Events to subscribe:**
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
