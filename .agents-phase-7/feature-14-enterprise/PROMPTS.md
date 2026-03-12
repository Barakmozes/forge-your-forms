# Agent 35 — Prompts

## Prompt Checklist
- [x] 35.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [x] 35.1 — Document DNS verification edge function specification
- [x] 35.2 — Assess white-label application to public pages
- [x] 35.3 — Document custom domain routing requirements
- [x] 35.4 — Final verification + HANDOFF.md

---

### PROMPT 35.0: Assessment

```
You are Agent 35 — Enterprise for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess enterprise feature issues.

1. Read these files:
   - .agents-phase-7/scanner-reports/14-enterprise.md
   - src/components/enterprise/CustomDomainConfig.tsx — find handleVerifyDomain
   - src/components/enterprise/WhiteLabelConfig.tsx — find favicon handling
   - src/hooks/useEnterprise.ts — enterprise settings CRUD
   - src/components/PublicForm.tsx — check if enterprise_settings are read

2. Confirm:
   - DNS verification: is it truly client-side only?
   - White-label: are settings applied to public form pages?
   - Favicon: is it URL-only or does it support upload?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY: FIX-PLAN documented.
```

---

### PROMPT 35.1: Document DNS Verification Spec

```
You are Agent 35 — Enterprise for FormForge Phase 7. READ CLAUDE.md first.

TASK: Write specification for DNS verification edge function.

NOTE: Creating the actual edge function is deferred (Agent 23 owns edge functions).
This prompt writes the spec only.

1. Read src/components/enterprise/CustomDomainConfig.tsx:
   - Find handleVerifyDomain implementation
   - Document current behavior (client-side DB update)

2. Write specification in HANDOFF.md:
   - Edge function: dns-verify
   - Input: { domain, verification_token }
   - Behavior: query DNS TXT records for _formforge-verification.{domain}
   - Match verification_token against TXT record value
   - Return: { verified: boolean, error?: string }
   - Frontend change: call edge function instead of direct DB update
   - Document: this requires external DNS resolution (not available in all Supabase regions)

3. Update PROGRESS.md.

VERIFY: Specification is actionable.
```

---

### PROMPT 35.2: Assess White-Label on Public Pages

```
You are Agent 35 — Enterprise for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess whether white-label settings are applied to public form pages.

1. Read:
   - src/hooks/useEnterprise.ts — how settings are fetched
   - src/components/PublicForm.tsx — does it read enterprise_settings?
   - src/components/FormRenderer.tsx — does it apply branding from enterprise?
   - src/components/waitlist/WaitlistLandingPage.tsx — branding application
   - src/components/feedback/FeedbackSurveyPage.tsx — branding application

2. Document findings:
   - Are enterprise white-label settings applied to public pages? (likely NO)
   - What would be needed to apply them?
   - Is this a Phase 7 fix or deferred?

3. Decision: If not applied, document the spec for future implementation.
   If partially applied, fix any gaps.

4. Update PROGRESS.md.

VERIFY: Assessment complete with clear decision.
```

---

### PROMPT 35.3: Document Custom Domain Routing

```
You are Agent 35 — Enterprise for FormForge Phase 7. READ CLAUDE.md first.

TASK: Document custom domain routing requirements.

NOTE: This is infrastructure documentation, not code implementation.

1. Research and document in HANDOFF.md:
   - Option A: Cloudflare Workers proxy (route custom domain → FormForge app)
   - Option B: Vercel custom domains (if deployed on Vercel)
   - Option C: Supabase custom domains feature
   - Recommended approach with pros/cons

2. Document what the frontend needs:
   - How PublicForm.tsx would detect it's being served from a custom domain
   - How to look up workspace_id from custom domain
   - SSL/TLS considerations

3. Update PROGRESS.md.

VERIFY: Documentation complete with actionable recommendations.
```

---

### PROMPT 35.4: Final Verification + HANDOFF

```
You are Agent 35 — Enterprise for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification.

1. Run: npm run lint && npx tsc --noEmit

2. Verify:
   - SsoConfig still works (read code path)
   - WhiteLabelConfig still works
   - CustomDomainConfig still works
   - Settings.tsx Enterprise tab renders correctly

3. Update HANDOFF.md:
   - Status: COMPLETE
   - DNS verification spec
   - Custom domain routing documentation
   - White-label public page assessment
   - Files modified (if any)

4. Update PROGRESS.md as COMPLETE.

VERIFY: npm run lint passes, npx tsc --noEmit passes, HANDOFF.md complete.
```
