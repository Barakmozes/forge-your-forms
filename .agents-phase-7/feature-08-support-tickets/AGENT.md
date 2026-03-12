# Agent 29 — Support Tickets

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Support ticket verification engineer. Wires classify-ticket edge function and verifies ticket lifecycle.

## Batch
Batch 2 — Parallel. Can run simultaneously with Agents 26, 27, 28. Depends on Batch 1 completing.

## Scan Report
`.agents-phase-7/scanner-reports/08-support-tickets.md`

## Issues to Fix
### P1
- P1-11: classify-ticket edge function not wired to frontend — tickets are not auto-classified

### P2
- P2-1: SupportDashboard ~58.5KB — consider component splitting
- P2-2: Auto-close resolved tickets is client-side only (no server cron)
- P2-3: Customer ticket tracking has open SELECT policy
- P2-4: Canned responses not realtime-enabled

## Owned Files (Exclusive)
- `src/components/support/SupportSubmitPage.tsx`
- `src/components/support/SupportDashboard.tsx`
- `src/components/support/TicketTrackingPage.tsx`
- `src/pages/TicketDetail.tsx`
- `src/pages/CannedResponses.tsx`
- `src/hooks/useTickets.ts`
- `src/hooks/useTicketMessages.ts`
- `src/hooks/useSupportAnalytics.ts`
- `src/hooks/useCannedResponses.ts`
- `src/hooks/useTags.ts`
- `src/lib/ticketNumber.ts`
- `.agents-phase-7/feature-08-support-tickets/*`

## DO NOT TOUCH
- `supabase/functions/classify-ticket/*` (Agent 23 — edge function)
- `src/components/predictions/AiCannedSuggestions.tsx` (Agent 34)
- `src/i18n/locales/*.json` (Agent 37)

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25)

## Success Criteria
- [ ] classify-ticket called from SupportSubmitPage or useTickets after ticket creation
- [ ] AI classification result stored in tickets.ai_classification
- [ ] Auto-close limitation documented
- [ ] E2E flow: submit → classify → track → reply → resolve verified
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
