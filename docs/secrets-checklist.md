# Secrets Checklist — FormForge Edge Functions

> Last updated: 2026-03-12 (Agent 17 — Phase 6)

---

## Required Secrets

| Secret | Used By | How to Obtain | Rotation |
|--------|---------|---------------|----------|
| `STRIPE_SECRET_KEY` | stripe-webhook | Stripe Dashboard → Developers → API keys | Generate new key in Stripe, update secret, revoke old key |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Stripe Dashboard → Developers → Webhooks → Signing secret | Delete and recreate webhook endpoint in Stripe |
| `RESEND_API_KEY` | send-email | Resend Dashboard → API Keys | Generate new key, update secret, delete old key |
| `FROM_EMAIL` | send-email | Must match a verified domain in Resend | Update when domain changes |
| `ANTHROPIC_API_KEY` | ai-generate, ai-analyze, classify-ticket | Anthropic Console → API Keys | Generate new key, update secret, disable old key |

## Auto-Configured Secrets (Supabase)

These are automatically available in all edge functions — do NOT set manually:

| Secret | Used By | Notes |
|--------|---------|-------|
| `SUPABASE_URL` | All functions using Supabase client | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions using Supabase client | Service role key (bypasses RLS) |

---

## Setting Secrets

```bash
# Set all required secrets at once
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  RESEND_API_KEY=re_... \
  FROM_EMAIL="FormForge <noreply@formforge.io>" \
  ANTHROPIC_API_KEY=sk-ant-... \
  --project-ref ywsqgrjfmxdjsuaqzsnw
```

## Verifying Secrets

```bash
# List all configured secrets (shows names only, not values)
npx supabase secrets list --project-ref ywsqgrjfmxdjsuaqzsnw
```

Expected output should include:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `ANTHROPIC_API_KEY`

## Rotating Secrets

### Stripe Keys
1. Go to Stripe Dashboard → Developers → API keys
2. Roll the secret key (Stripe keeps both active during transition)
3. Update: `npx supabase secrets set STRIPE_SECRET_KEY=sk_live_new_... --project-ref ywsqgrjfmxdjsuaqzsnw`
4. Redeploy: `npx supabase functions deploy stripe-webhook --project-ref ywsqgrjfmxdjsuaqzsnw`
5. Confirm working, then revoke old key in Stripe

### Stripe Webhook Secret
1. Go to Stripe Dashboard → Developers → Webhooks
2. Delete the existing endpoint
3. Create a new endpoint with the same URL
4. Copy the new signing secret
5. Update: `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_new_... --project-ref ywsqgrjfmxdjsuaqzsnw`
6. Redeploy stripe-webhook

### Resend API Key
1. Go to Resend Dashboard → API Keys
2. Create a new key
3. Update: `npx supabase secrets set RESEND_API_KEY=re_new_... --project-ref ywsqgrjfmxdjsuaqzsnw`
4. Redeploy send-email
5. Delete old key in Resend

### Anthropic API Key
1. Go to Anthropic Console → API Keys
2. Create a new key
3. Update: `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-new_... --project-ref ywsqgrjfmxdjsuaqzsnw`
4. Redeploy all AI functions: `./scripts/deploy-functions.sh`
5. Disable old key in Anthropic Console

---

## Security Notes

- Never commit secrets to git (check `.gitignore` includes `.env*`)
- Secrets are encrypted at rest by Supabase
- Service role key bypasses all RLS — edge functions use it intentionally
- Rotate all secrets if any team member leaves
- Test after every rotation using `./scripts/test-functions.sh`
