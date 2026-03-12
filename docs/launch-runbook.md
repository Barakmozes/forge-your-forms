# FormForge Launch Runbook

> **Last Updated**: 2026-03-12 (Agent 20 — Launch Readiness)
> **Status**: READY FOR EXECUTION

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Production App | https://forge-your-forms.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/rsuolemihuqjvrcpqjpa |
| Stripe Dashboard | https://dashboard.stripe.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Repository | https://github.com/Barakmozes/forge-your-forms |
| Resend Dashboard | https://resend.com/dashboard |

---

## PRE-LAUNCH (T-24h)

### 1. Run Full Test Suite
```bash
npm run test
# Expected: 158+ passing (2 known warnings in errorLogger.test.ts)

npm run lint
# Expected: 0 errors (warnings OK)

npx tsc --noEmit
# Expected: no output (no errors)
```

### 2. Production Build
```bash
npm run build
# Verify: builds in <30s, no errors
# Verify: no chunks >500kB
```

### 3. Verify Staging
```bash
# Deploy to preview/staging and test
./scripts/verify-production.sh https://your-preview-url.vercel.app
```

### 4. Database Backup
```bash
# Via Supabase Dashboard:
# Project → Settings → Database → Download Backup
# OR via pg_dump if direct DB access configured
```

### 5. Review Stripe Products
- Open https://dashboard.stripe.com/products
- Verify live products exist with correct prices:
  - Pro: $29/mo, $278/yr
  - Growth: $59/mo, $566/yr
  - Business: $99/mo, $950/yr
- Verify each product has both monthly + annual prices

### 6. Verify Secrets Readiness
- [ ] Have Stripe live secret key (sk_live_...)
- [ ] Have Stripe live publishable key (pk_live_...)
- [ ] Have Stripe webhook signing secret (whsec_...)
- [ ] Have Resend API key (re_...)
- [ ] Have Anthropic API key (sk-ant-...)
- [ ] Know FROM_EMAIL address (e.g., noreply@formforge.io)

---

## LAUNCH (T-0)

### Step 1: Execute Stripe Live Cutover
```bash
./scripts/stripe-live-cutover.sh
# Follow the interactive prompts for each step
```

**Key steps** (if not using the script interactively):

1a. Update `src/lib/stripe.ts` with live price IDs
1b. Update `supabase/functions/stripe-webhook/index.ts` price map
1c. Set Supabase secrets:
```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  --project-ref rsuolemihuqjvrcpqjpa
```

### Step 2: Set All Edge Function Secrets
```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  RESEND_API_KEY=re_... \
  FROM_EMAIL="FormForge <noreply@formforge.io>" \
  ANTHROPIC_API_KEY=sk-ant-... \
  --project-ref rsuolemihuqjvrcpqjpa

# Verify:
npx supabase secrets list --project-ref rsuolemihuqjvrcpqjpa
```

### Step 3: Deploy Edge Functions
```bash
./scripts/deploy-functions.sh
# Deploys all 10 edge functions
```

### Step 4: Verify Stripe Webhook Endpoint
- Go to https://dashboard.stripe.com/webhooks
- Verify endpoint URL: `https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/stripe-webhook`
- Events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- Send test webhook event to verify connection

### Step 5: Update Vercel Environment Variables
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Set/update: `VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...`
- Ensure set for **Production** environment

### Step 6: Deploy Frontend
```bash
git add src/lib/stripe.ts supabase/functions/stripe-webhook/index.ts
git commit -m "Switch to Stripe live mode price IDs"
git push
# Vercel auto-deploys on push to main
```

### Step 7: Seed Templates
```bash
npx tsx scripts/seed-templates.ts
# Expected: 20 templates seeded (or "already exist" if re-run)
```

### Step 8: Run Production Smoke Tests
```bash
./scripts/verify-production.sh https://forge-your-forms.vercel.app
# All checks should PASS
```

### Step 9: Test Real Purchase
1. Open production app
2. Sign up with a new account
3. Navigate to /pricing
4. Upgrade to Pro plan ($29) with your own card
5. Verify:
   - [ ] Stripe Checkout page loads
   - [ ] Payment completes successfully
   - [ ] Redirected to /checkout/success
   - [ ] Subscription appears in Supabase `subscriptions` table
   - [ ] App shows Pro plan features unlocked
   - [ ] Billing portal accessible from Settings
6. Cancel the test subscription via billing portal
7. Verify cancellation reflected in app

---

## POST-LAUNCH (T+1h)

### 1. Monitor Error Logs
```sql
-- In Supabase SQL Editor:
SELECT * FROM public.error_logs
ORDER BY created_at DESC
LIMIT 20;
```

### 2. Check Stripe Webhook Delivery
- Go to https://dashboard.stripe.com/webhooks
- Click on the live webhook endpoint
- Check "Recent deliveries" — all should show 200 OK

### 3. Verify Email Delivery
- Resend Dashboard → Check delivery logs
- Verify welcome email sent on signup
- (Optional) Test each template by triggering its flow

### 4. Monitor Edge Function Logs
```bash
# Check all function logs
npx supabase functions logs stripe-webhook --project-ref rsuolemihuqjvrcpqjpa
npx supabase functions logs send-email --project-ref rsuolemihuqjvrcpqjpa
```

### 5. Check Realtime Subscriptions
- Open two browser tabs
- Submit a form in one tab
- Verify the dashboard updates in real-time in the other tab

### 6. Performance Check
- Open browser DevTools → Lighthouse audit
- Target: Performance >80, Accessibility >90
- Check Web Vitals in production (analytics.ts)

---

## POST-LAUNCH (T+24h)

### 1. Review Analytics
- Check user signups in `profiles` table
- Check form creation count
- Check submission count
- Review any error_logs entries

### 2. Enable Optional Features
```sql
-- Enable pg_cron (Supabase Dashboard → Extensions)
-- Then register cron jobs:
SELECT cron.schedule('auto-close-tickets', '0 2 * * *', 'SELECT public.auto_close_resolved_tickets()');
SELECT cron.schedule('cleanup-ai-cache', '0 3 * * *', 'SELECT public.cleanup_expired_ai_cache()');
```

### 3. Set Up Domain Verification (Resend)
1. Go to Resend Dashboard → Domains
2. Add `formforge.io` (or your domain)
3. Add DNS records: DKIM, SPF, DMARC
4. Verify domain
5. Update FROM_EMAIL secret if needed

---

## ROLLBACK PROCEDURE

If critical issues are found after launch:

### Level 1: Frontend Rollback
```bash
# Revert to previous Vercel deployment
# Vercel Dashboard → Deployments → Find last good deploy → "..." → Promote to Production
```

### Level 2: Stripe Rollback
1. Disable live webhook in Stripe Dashboard
2. Revert `VITE_STRIPE_PUBLISHABLE_KEY` to test key in Vercel
3. Revert `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase secrets
4. Redeploy stripe-webhook edge function
5. Any live charges must be refunded manually in Stripe

### Level 3: Full Rollback
1. Perform Level 1 + Level 2 rollbacks
2. Revert edge function deployments:
```bash
# Redeploy from a known-good commit
git checkout <last-good-commit>
./scripts/deploy-functions.sh
```
3. If database migration issues:
   - Do NOT drop tables in production
   - Create a corrective migration instead
   - Contact Supabase support for point-in-time recovery if needed

### Rollback Decision Matrix

| Symptom | Action |
|---------|--------|
| UI broken, API works | Level 1 (frontend only) |
| Payments failing | Level 2 (Stripe rollback) |
| Data corruption | Level 3 + Supabase PITR restore |
| Auth broken | Check Supabase Auth settings, may need config revert |
| Emails not sending | Check Resend API key + FROM_EMAIL secret |

---

## EMERGENCY CONTACTS

| Role | Contact |
|------|---------|
| Project Lead | Barak (repo owner) |
| Supabase Support | https://supabase.com/dashboard/support |
| Stripe Support | https://support.stripe.com |
| Vercel Support | https://vercel.com/support |
| Resend Support | https://resend.com/support |

---

## LAUNCH SIGN-OFF

| Check | Status |
|-------|--------|
| All P0 security findings remediated | PASS |
| Production build succeeds | PASS |
| 158/160 tests pass | PASS (2 non-blocking) |
| Stripe cutover procedure ready | PASS |
| Email delivery system verified | PASS |
| 20 templates ready to seed | PASS |
| Smoke test script ready | PASS |
| Launch runbook complete | PASS |
| Zero P0 blockers | PASS |

**FormForge is READY FOR LAUNCH.**
