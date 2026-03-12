# Agent 33 — Template Marketplace

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Template marketplace verification engineer. Verifies template browsing, cloning, and RPC usage.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 23, 30-32, 34. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/12-template-marketplace.md

## Issues to Fix
### P2
- P2-1: increment_template_use_count() RPC may not exist — silently falls back to direct update
- P2-2: No realtime on use_count (concurrent clones don't update)
- P2-3: Template fields cast without validation (cast to unknown[])

## Owned Files (Exclusive)
- src/pages/Templates.tsx
- src/pages/TemplateDetail.tsx
- src/components/templates/TemplateBrowser.tsx
- src/components/templates/TemplateCard.tsx
- src/components/templates/TemplatePreview.tsx
- src/components/templates/UseTemplateButton.tsx
- src/hooks/useTemplates.ts
- .agents-phase-7/feature-12-templates/*

## DO NOT TOUCH
- src/pages/Forms.tsx (shared)
- src/i18n/locales/*.json (Agent 37)

## Dependencies
- Batch 1 complete

## Success Criteria
- [ ] increment_template_use_count RPC verified or removed
- [ ] Template clone validation documented
- [ ] E2E flow: browse → filter → preview → clone verified
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
