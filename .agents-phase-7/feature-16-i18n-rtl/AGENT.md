# Agent 37 — i18n / RTL

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
i18n & RTL verification engineer. Fills missing Hebrew translations and tightens test coverage.

## Batch
Batch 5 — Sequential (Position 1 of 2). Must complete BEFORE Agent 38. Runs LAST before final verification.

## Scan Report
`.agents-phase-7/scanner-reports/16-i18n-rtl.md`

## Issues to Fix
### P2
- P2-1: 48 missing Hebrew translations (workflows, webhooks, integrations, API, GDPR sections)
- P2-2: LanguageToggle title hardcoded ("עברית" / "English")
- P2-3: No namespace structure (all 1,545 keys in flat file)
- P2-4: Translation test tolerance at 10% (currently at 3%)

## Owned Files (Exclusive)
- `src/i18n/locales/en.json`
- `src/i18n/locales/he.json`
- `src/i18n/index.ts`
- `src/contexts/LanguageContext.tsx`
- `src/components/LanguageToggle.tsx`
- `src/test/i18n/translation.test.ts`
- `.agents-phase-7/feature-16-i18n-rtl/*`

## DO NOT TOUCH
- Any component files (other agents own them)
- Any hook files
- Edge function files
- Migration files

## Dependencies
- ALL other agents (21-36) must complete first — i18n sweeps up any new keys they added

## Success Criteria
- [ ] All missing Hebrew translations filled (0 missing keys)
- [ ] Translation test passes with tightened tolerance (5%)
- [ ] Any new keys added by Phase 7 agents are translated
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes (translation tests)
