# Agent 26 — Standard Forms

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Standard forms verification engineer. Verifies form builder, renderer, submissions, and branding flows.

## Batch
Batch 2 — Parallel. Can run simultaneously with Agents 27, 28, 29. Depends on Batch 1 completing.

## Scan Report
`.agents-phase-7/scanner-reports/05-standard-forms.md`

## Issues to Fix
### P2
- P2-1: "Powered by" toggle enforcement is client-side only (BrandingPanel)
- P2-2: Form auto-close by submission count — enforcement location unclear

## Owned Files (Exclusive)
- `src/pages/FormBuilder.tsx`
- `src/pages/FormPreview.tsx`
- `src/pages/Submissions.tsx`
- `src/components/FormRenderer.tsx`
- `src/components/FormResponsesTab.tsx`
- `src/components/builder/FormSettingsPanel.tsx`
- `src/components/builder/ConditionalLogic.tsx`
- `src/components/builder/BrandingPanel.tsx`
- `src/components/embed/SharePanel.tsx`
- `src/hooks/useForms.ts`
- `src/hooks/useSubmissions.ts`
- `.agents-phase-7/feature-05-standard-forms/*`

## DO NOT TOUCH
- `src/pages/Forms.tsx` (shared — not owned by any Batch 2 agent)
- `src/pages/FormDashboard.tsx` (shared)
- `src/components/PublicForm.tsx` (shared)
- `src/i18n/locales/*.json` (Agent 37)
- Any waitlist/feedback/support components (Agents 27/28/29)
- Edge function files (Agent 23)

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25)

## Success Criteria
- [ ] FormRenderer checks closeAfterCount before accepting submissions
- [ ] "Powered by" enforcement documented (client-side limitation noted)
- [ ] E2E flow: create → build → publish → submit → view verified
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
