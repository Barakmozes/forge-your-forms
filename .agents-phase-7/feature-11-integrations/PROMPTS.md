# Agent 32 — Prompts

## Prompt Checklist
- [ ] 32.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 32.1 — Create mailchimp-sync edge function (P0 fix)
- [ ] 32.2 — Update useIntegrations to use edge function proxy
- [ ] 32.3 — Add FeatureGate to IntegrationManager (P1)
- [ ] 32.4 — Final verification + HANDOFF.md

---

### PROMPT 32.0: Assessment

You are Agent 32 — Integrations for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess integration issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/11-integrations.md
   - src/hooks/useIntegrations.ts — find syncToMailchimp() CORS issue
   - src/components/integrations/IntegrationManager.tsx — check for FeatureGate
   - src/components/integrations/MailchimpIntegration.tsx — API key storage
   - .agents-phase-7/feature-04-plan-limits/HANDOFF.md — FeatureGate spec (if available)

2. Confirm:
   - syncToMailchimp() makes direct browser POST? (CORS will fail)
   - IntegrationManager has no FeatureGate wrapper?
   - API keys stored in forms.settings JSONB plaintext?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.

---

### PROMPT 32.1: Create mailchimp-sync Edge Function (P0)

You are Agent 32 — Integrations for FormForge Phase 7. READ CLAUDE.md first.

TASK: Create a new edge function to proxy Mailchimp API calls.

1. Read src/hooks/useIntegrations.ts — find syncToMailchimp() implementation.

2. Create supabase/functions/mailchimp-sync/index.ts:
   - Accept: { api_key, list_id, email, name, merge_fields }
   - Auth: JWT (authenticated user only)
   - Make server-side POST to Mailchimp API
   - Return: success/error response
   - Add CORS headers (match pattern from other edge functions)

3. Update PROGRESS.md.

VERIFY: Edge function file created with correct structure.

---

### PROMPT 32.2: Update useIntegrations for Edge Function Proxy

You are Agent 32 — Integrations for FormForge Phase 7. READ CLAUDE.md first.

TASK: Update syncToMailchimp to use edge function instead of direct browser POST.

1. Read src/hooks/useIntegrations.ts — find syncToMailchimp().

2. Replace direct Mailchimp API call with:
   - supabase.functions.invoke('mailchimp-sync', { body: { api_key, list_id, email, name } })
   - Handle success/error from edge function response
   - Keep the same external API (callers shouldn't need to change)

3. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes, syncToMailchimp uses edge function.

---

### PROMPT 32.3: Add FeatureGate to IntegrationManager (P1)

You are Agent 32 — Integrations for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add FeatureGate wrapping to IntegrationManager.

1. Read Agent 25 HANDOFF.md for FeatureGate spec (if available).
   If not available, use: FeatureGate feature="integrations" requiredPlan="pro"

2. Read src/components/integrations/IntegrationManager.tsx.

3. Wrap the integration content with FeatureGate:
   - Import FeatureGate from @/components/upgrade/FeatureGate
   - Wrap the main content area (not the entire component)
   - Free users see blur + upgrade prompt

4. Update PROGRESS.md.

VERIFY: npm run lint passes, npx tsc --noEmit passes.

---

### PROMPT 32.4: Final Verification + HANDOFF

You are Agent 32 — Integrations for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify:
   - Mailchimp sync goes through edge function
   - IntegrationManager has FeatureGate
   - Slack integration still works

3. Update HANDOFF.md:
   - Status: COMPLETE
   - P0 fix: mailchimp-sync edge function
   - P1 fix: FeatureGate on integrations
   - Deferred: plaintext secret storage (needs dedicated migration)

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
