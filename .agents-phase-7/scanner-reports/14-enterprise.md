# Scan Report: Enterprise (SSO/White-Label/Custom Domains)
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/enterprise/SsoConfig.tsx` — SAML SSO config: provider select, metadata URL, entity ID, certificate, test connection
- `src/components/enterprise/WhiteLabelConfig.tsx` — Branding: app name, primary color, logo upload, favicon URL, live preview
- `src/components/enterprise/CustomDomainConfig.tsx` — Domain mapping: add, verify (simulated), DNS instructions, delete

### Hooks
- `src/hooks/useEnterprise.ts` — Enterprise settings CRUD + realtime (enterprise_settings table)

### Database Tables
- `enterprise_settings` — RLS: member read, owner CRUD. Triggers: auto-update timestamp. Realtime: yes. PK: workspace_id
- `custom_domains` — RLS: member read, owner CRUD. Triggers: none. Realtime: no

### Lib
- `src/lib/domains.ts` — hexToHsl(), generateVerificationToken(), getDnsInstructions()

### Routes
- `/settings?tab=enterprise` — Protected (owner-only), renders SsoConfig + WhiteLabelConfig + CustomDomainConfig

## 2. End-to-End Flow Status

- **SSO config save**: WORKS — upserts to enterprise_settings via useEnterprise
- **SSO test connection**: PARTIAL — validates metadata URL reachability (HEAD) but not SAML structure
- **SSO sign-in flow**: PARTIAL — AuthContext.signInWithSSO calls supabase.auth.signInWithSSO (requires Supabase project SSO configured externally)
- **White-label: logo upload + preview**: WORKS — uploads to "branding" Supabase bucket, live preview
- **White-label: save settings**: WORKS — upserts enterprise_settings
- **White-label: apply to public pages**: UNTESTED — settings saved but application to public form pages not verified
- **Custom domain: add domain**: WORKS — validates format, generates verification token, inserts to custom_domains
- **Custom domain: DNS verification**: BROKEN — client-side simulation only, no actual DNS lookup
- **Custom domain: SSL provisioning**: BROKEN — SSL status hard-coded to "active" on verification
- **Custom domain: routing**: BROKEN — no actual domain routing implementation (would require CDN/Supabase custom domain)

## 3. Business Tier Mapping

| Feature | Required Plan | FeatureGate? | Enforced |
|---------|--------------|-------------|----------|
| SSO | Business | YES | YES — FeatureGate(feature="sso", requiredPlan="business") |
| White-label | Business | YES | YES — FeatureGate(feature="white_label", requiredPlan="business") |
| Custom domains | Growth | YES | YES — FeatureGate(feature="custom_domain", requiredPlan="growth") |

## 4. Cross-Dependencies

- **Depends on**: Auth (01) — SSO sign-in, Plan Limits (04) — FeatureGate
- **Depended on by**: None directly (white-label could affect public page rendering)
- **Shared files**: `src/pages/Settings.tsx` (Agent 35 owner), `src/components/Navbar.tsx` (Agent 35 owner)

## 5. i18n Status

- t() coverage: ALL strings wrapped (enterprise.sso.*, enterprise.whiteLabel.*, enterprise.domains.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: MOSTLY — depends on Batch 1 for plan gating
- Conflicts with: Settings.tsx (Agent 35), Navbar.tsx (Agent 35)

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **Custom domain DNS verification simulated**: handleVerifyDomain does client-side DB update only. No actual DNS TXT record lookup. Production deployment would have unverified domains marked as verified. File: `src/components/enterprise/CustomDomainConfig.tsx`
- **Custom domain routing not implemented**: No server-side routing from custom domains to workspace forms. Would require CDN integration or Supabase custom domain feature. File: N/A (missing implementation)

### P2 — Medium
- **SSO test only checks URL reachability**: No SAML metadata XML parsing or validation. File: `src/components/enterprise/SsoConfig.tsx`
- **SSL status hardcoded**: No Let's Encrypt or certificate automation. File: `src/components/enterprise/CustomDomainConfig.tsx`
- **White-label favicon URL-only**: No file upload (inconsistent with logo upload pattern). File: `src/components/enterprise/WhiteLabelConfig.tsx`
- **White-label not applied to public pages**: Settings saved but FormRenderer/PublicForm don't read enterprise_settings for branding. File: public page components
- **No plan enforcement in RLS**: enterprise_settings RLS doesn't check workspace plan tier. File: `supabase/migrations/021_enterprise.sql`

## 8. Recommended Fix Path

1. Create edge function for DNS verification (query TXT records server-side)
2. Document that custom domain routing requires external CDN setup (Cloudflare, Vercel, etc.)
3. Apply white-label branding to public form pages (read enterprise_settings in PublicForm.tsx)
4. Add favicon upload to WhiteLabelConfig (consistent with logo upload)
