# Agent 35 — Enterprise (SSO/White-Label/Custom Domains)

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Enterprise features verification engineer. Fixes DNS verification simulation and documents custom domain routing requirements.

## Batch
Batch 4 — Sequential (Position 1 of 2). Must complete BEFORE Agent 36.

## Scan Report
`.agents-phase-7/scanner-reports/14-enterprise.md`

## Issues to Fix
### P1
- P1-18: Custom domain DNS verification simulated — client-side DB update only, no actual DNS lookup
- P1-19: Custom domain routing not implemented — no server-side routing from custom domains

### P2
- P2-1: SSO test only checks URL reachability (no SAML validation)
- P2-2: SSL status hardcoded to "active" on verification
- P2-3: White-label favicon URL-only (no file upload)
- P2-4: White-label not applied to public pages — settings saved but not read by PublicForm
- P2-5: No plan enforcement in RLS for enterprise_settings

## Owned Files (Exclusive)
- `src/components/enterprise/SsoConfig.tsx`
- `src/components/enterprise/WhiteLabelConfig.tsx`
- `src/components/enterprise/CustomDomainConfig.tsx`
- `src/hooks/useEnterprise.ts`
- `src/lib/domains.ts`
- `src/pages/Settings.tsx` — Enterprise tab (shared file, Agent 35 is Batch 4 owner)
- `src/components/Navbar.tsx` — White-label logo (shared file, Agent 35 is Batch 4 owner)
- `src/components/AppLayout.tsx` — White-label CSS overrides (shared file, Agent 35 is Batch 4 owner)
- `.agents-phase-7/feature-14-enterprise/*`

## DO NOT TOUCH
- `src/contexts/AuthContext.tsx` (Agent 22 — SSO sign-in handled there)
- `src/hooks/usePlanLimits.ts` (Agent 25)
- `src/i18n/locales/*.json` (Agent 37)
- Edge function files (Agent 23)

## Dependencies
- Batches 1-3 complete
- Agent 22 (Auth) — SSO sign-in error handling already done

## Success Criteria
- [ ] DNS verification documented as requiring edge function (spec written)
- [ ] Custom domain routing requirements documented
- [ ] White-label application to public pages assessed
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
