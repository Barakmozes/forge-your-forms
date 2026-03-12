# Agent 37 — Prompts

## Prompt Checklist
- [x] 37.0 — Assessment: Scan all components for untranslated strings, count missing keys
- [x] 37.1 — Fill missing Hebrew translations (workflows, webhooks, integrations, API) — SKIPPED (already filled)
- [x] 37.2 — Fill remaining missing translations (GDPR, enterprise, any new Phase 7 keys)
- [x] 37.3 — Tighten translation test tolerance + final verification + HANDOFF.md

---

### PROMPT 37.0: Assessment

```
You are Agent 37 — i18n/RTL for FormForge Phase 7. READ CLAUDE.md first.

TASK: Comprehensive i18n assessment.

1. Read these files:
   - .agents-phase-7/scanner-reports/16-i18n-rtl.md
   - src/i18n/locales/en.json — count keys, identify sections
   - src/i18n/locales/he.json — count keys, find missing ones
   - src/test/i18n/translation.test.ts — current test tolerance

2. Generate diff:
   - List ALL keys present in en.json but missing from he.json
   - Group by section (workflows.*, webhooks.*, integrations.*, api.*, gdpr.*)
   - Count total missing

3. Check for new keys added by Phase 7 agents:
   - Read HANDOFF.md from agents that may have added UI strings
   - Scan for any t() calls using keys not in en.json

4. Create FIX-PLAN with exact keys to add.

5. Update PROGRESS.md.

VERIFY: Complete list of missing keys documented.
```

---

### PROMPT 37.1: Fill Missing Hebrew — Workflows, Webhooks, Integrations, API

```
You are Agent 37 — i18n/RTL for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add missing Hebrew translations for workflows, webhooks, integrations, and API sections.

1. Read en.json — find all keys under:
   - workflows.*
   - webhooks.*
   - integrations.*
   - api.*

2. Read he.json — find which of these keys are missing.

3. Add Hebrew translations for ALL missing keys:
   - Use natural Hebrew phrasing (not word-for-word translation)
   - Match the tone of existing Hebrew translations
   - Ensure RTL compatibility (no LTR-only formatting)

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- All workflows/webhooks/integrations/api keys present in he.json
```

---

### PROMPT 37.2: Fill Remaining Missing — GDPR, Enterprise, Phase 7 New Keys

```
You are Agent 37 — i18n/RTL for FormForge Phase 7. READ CLAUDE.md first.

TASK: Add remaining missing Hebrew translations.

1. From the assessment (37.0), find remaining missing keys:
   - gdpr.* section
   - enterprise.* section (if any missing)
   - Any keys added by Phase 7 agents
   - Any other isolated missing keys

2. Add Hebrew translations for ALL remaining missing keys.

3. Verify en.json also has all keys (in case Phase 7 agents added he.json keys without en.json).

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- Zero missing keys between en.json and he.json
```

---

### PROMPT 37.3: Tighten Tests + Final Verification + HANDOFF

```
You are Agent 37 — i18n/RTL for FormForge Phase 7. READ CLAUDE.md first.

TASK: Tighten translation test tolerance and final verification.

1. Read src/test/i18n/translation.test.ts.

2. Update test tolerance:
   - Change from 10% to 5% allowed missing keys
   - Or ideally to 0% now that all translations are filled

3. Run tests:
   - npm run test (verify translation tests pass)
   - npm run lint
   - npx tsc --noEmit

4. Verify language toggle:
   - Read LanguageToggle.tsx — confirm toggle works
   - Note: "עברית"/"English" labels are intentionally hardcoded (not a bug)

5. Update HANDOFF.md:
   - Status: COMPLETE
   - Total keys translated
   - Test tolerance change
   - Files modified

6. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run test passes (translation tests)
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
