# Agent 20 — Prompts

## Prompt Checklist
- [x] 20.0 — Cross-Agent Verification & Gap Analysis
- [x] 20.1 — Stripe Live Mode Cutover
- [x] 20.2 — Email Delivery & Template Seeding
- [x] 20.3 — Full Integration Smoke Tests
- [x] 20.4 — Launch Checklist & Runbook

---

### PROMPT 20.0: Cross-Agent Verification & Gap Analysis

```
You are the Launch Readiness Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

SUPER TASK: Verify all Phase 6 agents completed successfully and identify any remaining gaps.

TASK: Cross-reference all agent outputs and create the master gap analysis.

1. Verify Agent 16 (Supabase Audit) completeness:
   - Read supabase/audit/AUDIT-REPORT.md
   - Count: total checks, PASS, FAIL, WARN
   - Verify: zero P0 (critical) findings remain OPEN
   - If any P0 is open: STOP and document as blocker
   - Read docs/database-schema.md — is it complete?
   - Read docs/security-baseline.md — is it complete?

2. Verify Agent 17 (Edge Functions) completeness:
   - Read docs/edge-functions.md — are all 10 functions documented?
   - Read docs/api-security.md — is API security documented?
   - Verify scripts/deploy-functions.sh exists and is executable
   - Run scripts/test-functions.sh — do smoke tests pass?
   - Check: are all required secrets listed in docs/secrets-checklist.md?

3. Verify Agent 18 (Testing) completeness:
   - Run: npm run test
   - Document: total tests, passing, failing
   - If any test fails: document which test and why
   - Read docs/testing-guide.md — is it complete?
   - Check: is test coverage >60% on critical paths?

4. Verify Agent 19 (DevOps) completeness:
   - Read .github/workflows/ — are all workflows valid?
   - Check: is error monitoring connected (errorLogger.ts)?
   - Verify: /privacy page renders
   - Verify: data export works
   - Read docs/operations.md — is it complete?
   - Read docs/gdpr.md — is it complete?
   - Run: npm run build — check for chunks >500kB

5. Cross-reference against v3 Briefing Production Readiness Checklist:
   For each item, check status:
   
   CRITICAL:
   - [ ] Stripe Live Mode (Agent 20 will handle)
   - [ ] Run Migrations 013-023+ (Agent 16 verified)
   - [ ] Regenerate Types (Agent 16 verified)
   - [ ] Deploy Edge Functions (Agent 17 verified)
   - [ ] Set Edge Function Secrets (Agent 17 verified)
   - [ ] Stripe Webhook Endpoint configured (Agent 17 verified)
   - [ ] Resend Domain Verification (Agent 20 will handle)
   - [ ] DNS for Custom Domains (Agent 19 documented)
   - [ ] Seed Templates (Agent 20 will handle)
   
   IMPORTANT:
   - [ ] E2E Testing (Agent 18)
   - [ ] Stripe Test Purchases (Agent 20 will verify)
   - [ ] Email Delivery Testing (Agent 20 will verify)
   - [ ] Error Monitoring (Agent 19)
   - [ ] Rate Limit Tuning (Agent 17)
   - [ ] Bundle Size Optimization (Agent 19)

6. Create docs/launch-checklist.md:
   Comprehensive checklist with:
   | # | Check | Owner | Status | Evidence | Sign-off |
   
   Categories:
   - Database & Security (from Agent 16)
   - Edge Functions & API (from Agent 17)
   - Testing (from Agent 18)
   - Infrastructure (from Agent 19)
   - Billing (this agent)
   - Content (this agent)
   - Final Integration (this agent)

7. Update PROGRESS.md with session entry.

VERIFY:
- All agent outputs verified
- Gap analysis complete
- docs/launch-checklist.md created
- Any blockers clearly documented
```

---

### PROMPT 20.1: Stripe Live Mode Cutover

```
You are the Launch Readiness Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Create the Stripe live mode cutover procedure and verify billing integration.

IMPORTANT: Do NOT actually switch to live mode in this prompt. Create the 
procedure and verify test mode works perfectly first.

1. Create scripts/stripe-live-cutover.sh:
   Document the exact steps to switch from test to live:
   
   a. In Stripe Dashboard (manual steps):
      - Create live products matching test products:
        • Free (no product needed)
        • Pro Monthly ($29/mo)
        • Pro Annual ($278/yr — 20% off)
        • Growth Monthly ($59/mo)
        • Growth Annual ($566/yr)
        • Business Monthly ($149/mo)
        • Business Annual ($1,430/yr)
      - Create live prices for each product
      - Note all live price IDs
   
   b. Update src/lib/stripe.ts:
      - Replace test price IDs with live price IDs
      - Replace test publishable key with live key
      - Document which IDs go where
   
   c. Update Supabase Edge Function Secrets:
      - STRIPE_SECRET_KEY → live secret key
      - STRIPE_WEBHOOK_SECRET → new live webhook secret
   
   d. Configure Stripe Webhook:
      - Create live webhook endpoint in Stripe Dashboard
      - Point to: https://ywsqgrjfmxdjsuaqzsnw.supabase.co/functions/v1/stripe-webhook
      - Events: checkout.session.completed, invoice.paid, 
        invoice.payment_failed, customer.subscription.updated, 
        customer.subscription.deleted
      - Copy the webhook signing secret
   
   e. Update environment variables:
      - Vercel: VITE_STRIPE_PUBLISHABLE_KEY → live key
   
   f. Deploy:
      - Redeploy stripe-webhook edge function
      - Redeploy frontend with new publishable key

2. Verify Test Mode Billing Flow (do this NOW):
   Simulate the complete flow in test mode:
   
   a. Pricing page:
      - All 4 tiers render correctly
      - Monthly/annual toggle works
      - "Get Started" / "Upgrade" buttons are correct
   
   b. Checkout flow:
      - Click upgrade on Pro plan
      - Verify Stripe Checkout session created
      - Verify redirect URL is correct
      - Verify success/cancel URLs work
   
   c. Webhook processing:
      - After test checkout: verify subscription record created in DB
      - Verify plan tier is correct
      - Verify useSubscription returns correct plan
      - Verify usePlanLimits enforces correct limits
   
   d. Billing portal:
      - Verify customer portal link works
      - Can change plan
      - Can cancel subscription
      - Changes reflect in DB via webhook

3. Document the complete billing data flow:
   User clicks "Upgrade" → Stripe Checkout → Payment → 
   Stripe fires webhook → stripe-webhook Edge Function → 
   Upsert subscription record → useSubscription reacts → 
   usePlanLimits updates → UI reflects new plan
   
   Document every step and what to check if it breaks.

4. Add billing verification to docs/launch-checklist.md.

VERIFY:
- scripts/stripe-live-cutover.sh has complete procedure
- Test mode billing flow works end-to-end
- Billing data flow is documented
- No live Stripe keys are committed to code (only .env and Vercel secrets)
```

---

### PROMPT 20.2: Email Delivery & Template Seeding

```
You are the Launch Readiness Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Verify email delivery and seed production templates.

1. Email Delivery Verification:
   For each of the 6 email templates, verify:
   
   a. welcome (signup):
      - Trigger: new user signs up
      - Contains: user's name, getting started link
      - Both locales (EN + HE) render correctly
      - Subject line is correct
   
   b. waitlist_invite (batch invite):
      - Trigger: admin invites waitlist entries
      - Contains: form title, acceptance link
      - Both locales render correctly
   
   c. ticket_confirmation (new ticket):
      - Trigger: customer submits support ticket
      - Contains: ticket number, tracking link
      - Both locales render correctly
   
   d. detractor_alert (NPS ≤ 6):
      - Trigger: feedback with score 0-6
      - Contains: customer email, score, comment, form title
      - Both locales render correctly
   
   e. payment_confirmation (subscription started):
      - Trigger: successful checkout
      - Contains: plan name, amount, period
      - Both locales render correctly
   
   f. payment_failed (invoice failed):
      - Trigger: invoice.payment_failed webhook
      - Contains: plan name, amount, update payment link
      - Both locales render correctly
   
   Document: which emails have been verified as sending, which need testing.

2. Resend Domain Verification:
   Document the steps to verify sending domain in Resend:
   - Add domain in Resend dashboard
   - Add DNS records (DKIM, SPF, DMARC)
   - Verify domain
   - Update FROM_EMAIL secret if needed
   - Test send from verified domain

3. Create scripts/seed-templates.ts:
   Seed 20+ form templates into the templates table:
   
   Categories and templates:
   
   STANDARD FORMS (6):
   - Contact Form (name, email, message)
   - Job Application (name, email, resume, cover letter)
   - Event Registration (name, email, attendance, dietary)
   - Bug Report (title, description, severity, steps to reproduce)
   - Customer Feedback (name, rating, comments)
   - Newsletter Signup (email, interests)
   
   WAITLIST (4):
   - SaaS Product Launch (email, name, company)
   - Mobile App Beta (email, device type, referral)
   - Event Waitlist (email, name, +1)
   - Feature Early Access (email, use case)
   
   FEEDBACK/NPS (4):
   - Post-Purchase NPS (score, comment, product category)
   - Customer Service CSAT (score, agent, comment)
   - Employee Satisfaction (score, department, anonymous comment)
   - Product Feedback (score, feature area, suggestion)
   
   SUPPORT (4):
   - IT Help Desk (subject, description, category, priority, screenshot)
   - Customer Support (subject, description, order number)
   - HR Request (type, description, urgency)
   - Maintenance Request (location, issue type, description, photo)
   
   BILINGUAL (2):
   - Hebrew Contact Form (שם, אימייל, הודעה)
   - Hebrew Support Form (נושא, תיאור, קטגוריה)
   
   For each template:
   {
     title: string,
     title_he: string,
     description: string,
     description_he: string,
     mode: FormMode,
     category: string,
     fields: FormField[],
     settings: Record<string, any>,
     branding: { primaryColor: string, ... },
     is_public: true,
     use_count: 0
   }

4. Run the seed script:
   npx ts-node scripts/seed-templates.ts
   OR create it as a migration: supabase/migrations/030_seed_templates.sql

5. Verify templates appear on /templates page (if it exists)
   or in the "Create from Template" flow.

6. Update docs/launch-checklist.md with email + template items.

VERIFY:
- Email delivery procedure documented
- 20+ templates seeded in database
- Templates render correctly in template browser
- Each template creates a functional form when cloned
```

---

### PROMPT 20.3: Full Integration Smoke Tests

```
You are the Launch Readiness Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Run a complete integration smoke test of every critical user journey.

Create scripts/verify-production.sh that tests the following flows.
For each flow, document: steps, expected result, actual result, PASS/FAIL.

1. ANONYMOUS USER FLOWS:
   a. Landing page loads at /
   b. Pricing page loads at /pricing
   c. Privacy page loads at /privacy (if created by Agent 19)
   d. Public form renders at /f/:id for each mode
   e. Waitlist signup works (submit email)
   f. Feedback survey works (submit NPS score)
   g. Support ticket works (submit ticket, get number)
   h. Ticket tracking works at /track/:formId (enter ticket number + email)

2. AUTH FLOWS:
   a. Signup with email/password → verification email → login
   b. Login with existing credentials → dashboard
   c. Session persists on page refresh
   d. Logout → redirects to /auth
   e. Protected routes redirect to /auth when not logged in
   f. Onboarding wizard appears for new users (if created by Agent 8)

3. FORM LIFECYCLE:
   a. Create standard form → opens builder
   b. Add fields (text, email, select) → auto-saves
   c. Set form to active → generates public URL
   d. Open public URL → form renders with correct fields
   e. Submit form → see in submissions dashboard
   f. Create waitlist form → landing page renders
   g. Create feedback form → NPS survey renders
   h. Create support form → ticket form renders

4. MODE-SPECIFIC FLOWS:
   a. Waitlist: signup → position shown → referral URL works → admin batch invite
   b. Feedback: submit NPS 3 → classified as detractor → alert notification
   c. Feedback: submit NPS 9 → classified as promoter → dashboard updates
   d. Support: submit ticket → admin sees ticket → reply → customer tracking updated

5. BILLING FLOW (test mode):
   a. Free plan: create 3 forms → 4th blocked
   b. Free plan: 100 submissions → next blocked
   c. Upgrade to Pro → limits increase
   d. Billing portal → manage subscription
   e. Cancel → reverts to Free limits

6. CROSS-CUTTING:
   a. Language toggle: EN → HE → all strings change → no broken layouts
   b. RTL toggle: layout flips correctly
   c. Notifications: trigger → bell badge → click → navigate
   d. Branding: change colors → public page reflects
   e. Export: CSV download → contains correct data
   f. Share: embed code → iframe renders form

7. EDGE FUNCTION VERIFICATION:
   a. API endpoint responds to authenticated request
   b. Webhook fires on new submission (if webhook configured)
   c. AI form generation works (if Business plan)

8. Create comprehensive test results document:
   For each test: # | Flow | Steps | Expected | Actual | Status
   
   Summary:
   - Total tests: N
   - Passed: N
   - Failed: N (list each with details)
   - Blocked: N (list each with reason)

VERIFY:
- All critical flows tested
- Results documented
- Any failures have remediation plan
- docs/launch-checklist.md updated with test results
```

---

### PROMPT 20.4: Launch Checklist & Runbook

```
You are the Launch Readiness Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Finalize the launch checklist and create the launch day runbook.

1. Finalize docs/launch-checklist.md:
   Consolidate ALL findings from Agents 16-20.
   
   Format:
   ## Section: [Category]
   | # | Check | Owner | Status | Evidence | Blocker? |
   
   Categories:
   A. DATABASE & SECURITY (Agent 16 findings)
      - All tables have RLS ✅/❌
      - All triggers verified ✅/❌
      - No P0 audit findings open ✅/❌
      - Indexes optimized ✅/❌
      - Storage buckets configured ✅/❌
   
   B. EDGE FUNCTIONS & API (Agent 17 findings)
      - All 10 functions deployed ✅/❌
      - All secrets configured ✅/❌
      - Smoke tests passing ✅/❌
      - CORS correctly configured ✅/❌
      - Rate limiting functional ✅/❌
   
   C. TESTING (Agent 18 findings)
      - Unit tests passing ✅/❌
      - Component tests passing ✅/❌
      - Integration tests passing ✅/❌
      - Coverage >60% on critical paths ✅/❌
   
   D. INFRASTRUCTURE (Agent 19 findings)
      - CI/CD pipeline working ✅/❌
      - Error monitoring connected ✅/❌
      - Bundle optimized (<500kB chunks) ✅/❌
      - GDPR features functional ✅/❌
      - Privacy page exists ✅/❌
   
   E. BILLING (Agent 20 findings)
      - Test mode billing works end-to-end ✅/❌
      - Stripe live cutover procedure ready ✅/❌
      - All pricing tiers match business plan ✅/❌
   
   F. CONTENT & MARKETING
      - 20+ templates seeded ✅/❌
      - Landing page SEO meta tags ✅/❌
      - OG images configured ✅/❌
      - All emails deliver ✅/❌
   
   G. FINAL INTEGRATION
      - Full user journey works ✅/❌
      - All 4 modes work ✅/❌
      - i18n complete ✅/❌
      - No Lovable references anywhere ✅/❌

2. Create docs/launch-runbook.md:
   Step-by-step launch day procedure:
   
   PRE-LAUNCH (T-24h):
   1. Run full test suite: npm run test
   2. Run production build: npm run build
   3. Verify staging deployment works
   4. Final review of Stripe products/prices
   5. Backup current database
   
   LAUNCH (T-0):
   1. Execute stripe-live-cutover.sh steps
   2. Update Vercel environment variables
   3. Deploy edge functions with live secrets
   4. Verify Stripe webhook endpoint
   5. Deploy frontend
   6. Run verify-production.sh
   7. Test one real purchase (your own card)
   8. Verify webhook → subscription → limits flow
   
   POST-LAUNCH (T+1h):
   1. Monitor error logs
   2. Check Stripe webhook delivery
   3. Verify email delivery
   4. Monitor performance metrics
   5. Check realtime subscriptions
   
   ROLLBACK PROCEDURE:
   If critical issues found:
   1. Revert Vercel to previous deployment
   2. Switch Stripe back to test mode
   3. Revert edge function secrets
   4. Document what went wrong

3. Create a quick-reference card:
   Key URLs:
   - Production: https://forge-your-forms.vercel.app
   - Supabase Dashboard: https://supabase.com/dashboard/project/ywsqgrjfmxdjsuaqzsnw
   - Stripe Dashboard: https://dashboard.stripe.com
   - Vercel Dashboard: https://vercel.com/dashboard
   - GitHub: https://github.com/Barakmozes/forge-your-forms
   - Resend Dashboard: https://resend.com/dashboard
   
   Emergency contacts / escalation path

4. Update PROGRESS.md as COMPLETE.

5. Write HANDOFF.md with:
   PHASE 6 COMPLETE — FormForge is ready for production launch.
   Summary of all agent outputs and launch readiness status.

VERIFY:
- docs/launch-checklist.md has 100% of items checked
- docs/launch-runbook.md covers pre-launch, launch, post-launch, rollback
- All scripts are executable
- Zero P0 blockers remain
- FormForge is READY FOR LAUNCH
```
