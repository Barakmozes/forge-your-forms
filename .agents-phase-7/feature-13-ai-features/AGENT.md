# Agent 34 — AI Features

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
AI features verification engineer. Adds missing FeatureGate to AiFormGenerator and fixes type mismatches.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 23, 30-33. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/13-ai-features.md

## Issues to Fix
### P1
- P1-16: AiFormGenerator not plan-gated — any free user can generate forms via AI
- P1-17: classify-ticket dead code (wiring done by Agent 29; verify integration)

### P2
- P2-1: Rate limit UX — no button disable after RATE_LIMIT error
- P2-2: Churn scores not realtime — manual refresh needed
- P2-3: Submission text extraction contract undocumented
- P2-4: ChurnScore risk_factors type mismatch — last_interaction vs last_interaction_at

## Owned Files (Exclusive)
- src/components/ai/AiFormGenerator.tsx
- src/components/ai/AiSummaryWidget.tsx
- src/components/predictions/AiCannedSuggestions.tsx
- src/components/predictions/AtRiskDashboard.tsx
- src/components/predictions/AtRiskWidget.tsx
- src/components/predictions/ChurnScoreBadge.tsx
- src/hooks/useAiGenerate.ts
- src/hooks/useAiAnalysis.ts
- src/hooks/useChurnPrediction.ts
- src/lib/ai.ts
- .agents-phase-7/feature-13-ai-features/*

## DO NOT TOUCH
- supabase/functions/ai-*/* (Agent 23)
- supabase/functions/classify-ticket/* (Agent 23)
- supabase/functions/churn-score/* (Agent 23)
- src/i18n/locales/*.json (Agent 37)

## Dependencies
- Batch 1 complete
- Agent 25 HANDOFF.md — FeatureGate spec for AI

## Success Criteria
- [ ] AiFormGenerator wrapped with FeatureGate (business plan)
- [ ] ChurnScore type mismatch fixed (last_interaction_at)
- [ ] Rate limit UX: button disabled after RATE_LIMIT error
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
