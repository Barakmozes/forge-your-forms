# Scan Report: i18n / RTL
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Configuration
- `src/i18n/index.ts` — react-i18next setup, language detector (localStorage → navigator), fallback: en

### Contexts
- `src/contexts/LanguageContext.tsx` — Language state, dir attribute, isRTL flag, localStorage persistence

### Components
- `src/components/LanguageToggle.tsx` — Toggle button (EN ↔ עב) in Navbar

### Translation Files
- `src/i18n/locales/en.json` — 1,629 lines, ~1,545 key-value pairs, 25+ sections
- `src/i18n/locales/he.json` — 1,579 lines, ~1,497 key-value pairs

### Tests
- `src/test/i18n/translation.test.ts` — Key parity checks, empty value checks, section matching (10% tolerance)

### Routes
- N/A — i18n is a cross-cutting concern, no dedicated route

## 2. End-to-End Flow Status

- **Language toggle → all strings update**: WORKS — react-i18next re-renders, LanguageContext updates dir attribute
- **RTL layout on Hebrew switch**: WORKS — document.documentElement.dir = "rtl", Tailwind logical properties
- **Language persistence (localStorage)**: WORKS — key "formforge-lang" persists across sessions
- **Auto-detect from browser**: WORKS — i18next-browser-languagedetector fallback
- **Translation completeness (EN)**: WORKS — 100% coverage, no empty values
- **Translation completeness (HE)**: PARTIAL — ~48 keys missing (3% of total)
- **Component i18n wrapping**: WORKS — 184 components use useTranslation() or useLanguage()
- **RTL Tailwind support**: WORKS — ltr:/rtl: conditionals, ms-/me-/ps-/pe- logical properties

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| All tiers | Full i18n/RTL | — | N/A — no plan gating |

## 4. Cross-Dependencies

- **Depends on**: None (foundational)
- **Depended on by**: Every component in the app (cross-cutting)
- **Shared files**: `en.json` and `he.json` (Agent 37 exclusive owner per SYNC-LOG)

## 5. i18n Status

- t() coverage: 184/184 components (spot-checked 10: ALL PASS)
- Hebrew translations: PARTIAL — 48 keys missing (~3%)
- RTL layout: CORRECT — 95%+ logical properties, remaining physical properties handled with ltr:/rtl: conditionals

### Missing Hebrew Keys (by area)
- Workflows: some trigger/condition/action labels
- Webhooks: some delivery/retry labels
- Integrations: some Slack/Mailchimp/Zapier labels
- API: some key management labels
- GDPR: some data export labels

## 6. Parallelism Eligibility

- Independent: NO — must run LAST (Agent 37 per SYNC-LOG)
- Conflicts with: en.json and he.json are exclusive to Agent 37

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- None

### P2 — Medium
- **48 missing Hebrew translations**: Newer features (workflows, webhooks, integrations, API) have untranslated keys. Hebrew users see English fallback. Files: `src/i18n/locales/he.json`
- **LanguageToggle title hardcoded**: "עברית" and "English" are not translated (intentional but inconsistent). File: `src/components/LanguageToggle.tsx`
- **No namespace structure**: All 1,545 keys in flat file. Could benefit from namespace splitting for maintainability. File: both JSON files
- **Translation test tolerance**: Tests allow 10% missing keys (currently at 3%). Could be tightened. File: `src/test/i18n/translation.test.ts`

## 8. Recommended Fix Path

1. Add missing 48 Hebrew translations (focus on workflows, webhooks, integrations, API sections)
2. Tighten translation test tolerance from 10% to 5% (after filling gaps)
3. Consider namespace splitting if file size continues growing (optional)
