# Agent 23 — Edge Functions

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Edge function verification engineer. Fixes dead code, missing plan gates, and shared code duplication across 12 edge functions.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 30-34. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/02-edge-functions.md

## Issues to Fix
### P1
- P1-3: classify-ticket not called from frontend (wiring done by Agent 29; this agent verifies edge fn works)
- P1-4: ai-generate not plan-gated (FeatureGate added by Agent 34; this agent verifies edge fn rate limit)
- P1-5: Stripe price IDs are placeholders (fixed by Agent 24; this agent verifies edge fn config)

### P2
- P2-1: No _shared/ directory — CORS, hash, client init duplicated across 12 functions
- P2-2: ai-generate rate limit UX — no button disable state
- P2-3: dispatch-webhook retry delays hardcoded (1/5/30 min)
- P2-4: send-email welcome fire-and-forget — no error handling

## Owned Files (Exclusive)
- supabase/functions/ai-analyze/*
- supabase/functions/ai-generate/*
- supabase/functions/api-v1/*
- supabase/functions/churn-score/*
- supabase/functions/classify-ticket/*
- supabase/functions/create-checkout/*
- supabase/functions/create-portal-session/*
- supabase/functions/dispatch-webhook/*
- supabase/functions/execute-workflow/*
- supabase/functions/send-email/*
- supabase/functions/slack-notify/*
- supabase/functions/stripe-webhook/*
- supabase/functions/_shared/* (NEW — shared utilities)
- .agents-phase-7/feature-02-edge-functions/*

## DO NOT TOUCH
- src/ files (frontend agents own these)
- src/i18n/locales/*.json (Agent 37)
- supabase/functions/mailchimp-sync/* (Agent 32 creates this)

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25)

## Success Criteria
- [ ] All 12 edge functions verified working
- [ ] _shared/ directory created with common utilities (optional P2)
- [ ] classify-ticket verified accessible and returns correct format
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
