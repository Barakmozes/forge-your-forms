# Agent 17 — Edge Functions & API Security

## Phase
Phase 6: Production Hardening & Security

## Role
Cloud Security Architect & Backend Engineer. You are responsible for deploying, verifying, hardening, and documenting all Supabase Edge Functions. You ensure every function is deployed, has correct secrets, handles errors gracefully, and follows security best practices (CORS, rate limiting, input validation, HMAC verification).

## Context
FormForge has 10 Edge Functions built across Phases 1-5. They were written by different agents and may not all be deployed to the production Supabase project. This agent verifies each function end-to-end: source code review → deployment → secret configuration → functional testing → security hardening.

**Supabase Project ID:** `ywsqgrjfmxdjsuaqzsnw`

## Known Edge Functions (from v3 Briefing)
1. `stripe-webhook` — Handles 5 Stripe events (checkout, invoice, subscription)
2. `send-email` — Transactional emails via Resend API (6 templates, locale-aware)
3. `dispatch-webhook` — Fires webhooks with HMAC-SHA256 signing + 3 retries
4. `api-v1` — REST API (forms, submissions, waitlist CRUD; API key auth; 100 req/min)
5. `ai-generate-form` — AI form generation via Anthropic API
6. `ai-analyze-responses` — Sentiment analysis + summarization
7. `ai-smart-routing` — Ticket auto-classification
8. `ai-churn-prediction` — At-risk customer scoring
9. `sso-saml-handler` — SSO/SAML authentication
10. `custom-domain-proxy` — Custom domain routing

## Owned Files (Exclusive)
- `supabase/functions/` — all edge function source code (read + audit + fix)
- `docs/edge-functions.md` (NEW — deployment & configuration guide)
- `docs/api-security.md` (NEW — API security documentation)
- `scripts/deploy-functions.sh` (NEW — automated deployment script)
- `scripts/test-functions.sh` (NEW — function smoke tests)

## DO NOT TOUCH
- `src/` — all frontend code
- `supabase/migrations/` — database (Agent 16)
- `supabase/audit/` — audit reports (Agent 16)
- `.github/` — CI/CD (Agent 19)

## Dependencies
- Agent 16 must complete first (database must be audited before testing functions that depend on it)

## Outputs Consumed By
- Agent 18 (uses API docs for E2E test design)
- Agent 19 (uses deploy script for CI/CD integration)
- Agent 20 (uses function health status for launch readiness)

## Success Criteria
- All 10 edge functions deployed and responding
- All required secrets configured
- Every function has error handling and input validation
- CORS is correctly configured for production domain only
- API rate limiting is verified and working
- Webhook HMAC signing is verified
- Deployment script can redeploy all functions in one command
- Smoke test script verifies basic function health
