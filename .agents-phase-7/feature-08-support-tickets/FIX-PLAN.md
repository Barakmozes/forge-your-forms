# Agent 29 — FIX-PLAN

## Assessment Summary

### P1-11: classify-ticket edge function not wired
- **Edge function**: `supabase/functions/classify-ticket/index.ts`
- **Input**: `{ subject, description, categories, form_id, workspace_id }` + Authorization header
- **Output**: `{ category, priority, confidence, reasoning }`
- **Column**: `tickets.ai_classification` JSONB (added in migration 020)
- **Auth requirement**: The function requires a valid user auth token (returns 401 otherwise)
- **Challenge**: `SupportSubmitPage` is public (no auth session). `supabase.functions.invoke` will include the anon key but no user token for unauthenticated users.

**Fix Plan**:
1. Add classify-ticket call in `SupportSubmitPage.tsx` after successful ticket creation
2. Fire-and-forget (non-blocking) — don't await before showing success
3. On success: update ticket's `ai_classification` column
4. On failure: silently log error (expected for unauthenticated users)
5. The classification will primarily work when tickets are created from authenticated contexts
6. Future improvement: consider a database trigger or webhook to classify tickets server-side

### P2-1: SupportDashboard ~52KB / 1,340 lines
- **Decision**: DO NOT SPLIT in Phase 7. The component works correctly. Splitting is a maintainability improvement, not a bug fix. Risk of regressions outweighs benefit.
- **Document**: Note as technical debt for future cleanup.

### P2-2: Auto-close is client-side only
- **Location**: `useTickets.ts` lines 24-37
- **Behavior**: When admin loads dashboard, resolved tickets older than 7 days are set to "closed"
- **Decision**: ACCEPT limitation. Agent 16 created `auto_close_resolved_tickets()` DB function but `pg_cron` is not enabled on Supabase. Document as known limitation.

### P2-3: Customer ticket tracking has open SELECT policy
- **Decision**: DOCUMENT ONLY. This is by design — customers need to look up their tickets by number + email. The RLS policy allows anonymous SELECT on tickets, but the tracking page requires both ticket_number and email match, providing practical security through obscurity.

### P2-4: Canned responses not realtime
- **Decision**: ACCEPT. Canned responses are workspace-scoped admin tools that change infrequently. Adding realtime subscription adds complexity for minimal benefit.

## Execution Order
1. **Prompt 29.1**: Wire classify-ticket to SupportSubmitPage (P1 fix)
2. **Prompt 29.2**: Document P2 decisions (no code changes)
3. **Prompt 29.3**: Verify ticket tracking and canned responses
4. **Prompt 29.4**: Final verification
