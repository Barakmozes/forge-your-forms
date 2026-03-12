# Agent 22 — Handoff

## Status: COMPLETE

## What's Done

### 22.0 — Assessment
- All P1/P2 issues confirmed. FIX-PLAN created in PROGRESS.md.

### 22.1 — SSO Error Handling (AuthContext.tsx)
- Added toast + error logging at each failure point in `signInWithSSO`
- Maps specific Supabase SSO error codes to user-friendly messages
- 5 distinct error paths: workspace not found, config lookup failure, SSO not enabled, provider error, generic

### 22.2 — SSO Test Validation (SsoConfig.tsx)
- CORS-enabled GET with content-type + SAML body validation
- Falls back to no-cors HEAD if CORS blocked
- 10s timeout, URL format validation, HTTP status reporting

### 22.3 — Member Limit Server-Side Specification
- Full specification below for Agent 25 to implement

## What's Next
All prompts complete. Agent 24 (Billing) can proceed.

## Files Modified
- `src/contexts/AuthContext.tsx` — SSO error handling with toast + logError
- `src/components/enterprise/SsoConfig.tsx` — Improved SSO test connection validation

## Dependencies
- Agent 21 (ADMIN bypass) — must complete first (owner bypass already in usePlanLimits)

## Downstream
- Agent 24 (Billing) — depends on this completing
- Agent 25 (Plan Limits) — will implement server-side member limits spec below

---

## Server-Side Member Limit Enforcement Specification (For Agent 25)

### Problem
Member limits are enforced client-side only via `usePlanLimits.canInviteMember()`. The RLS policy `members_insert_owner` (migration 003) only checks workspace ownership — a user with direct DB access or API manipulation could bypass limits.

### Current State
- **Client-side**: `usePlanLimits.ts` defines `PLAN_LIMITS[plan].maxMembers`: free=1, pro=3, growth=10, business=null (unlimited)
- **RLS policy** (`003_rls_policies.sql`): `members_insert_owner` checks `EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())` — no count check
- **Subscriptions table** (`013_subscriptions.sql`): `subscriptions.plan` column (`free|pro|growth|business`), indexed by `workspace_id` (unique)

### Required: SQL Function `check_member_limit`

```sql
CREATE OR REPLACE FUNCTION public.check_member_limit(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan TEXT;
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get the workspace's plan (default to 'free' if no subscription)
  SELECT COALESCE(s.plan, 'free') INTO current_plan
  FROM workspaces w
  LEFT JOIN subscriptions s ON s.workspace_id = w.id AND s.status = 'active'
  WHERE w.id = target_workspace_id;

  -- Business plan has unlimited members
  IF current_plan = 'business' THEN
    RETURN TRUE;
  END IF;

  -- Count existing members
  SELECT COUNT(*) INTO current_count
  FROM workspace_members
  WHERE workspace_id = target_workspace_id;

  -- Determine max allowed
  max_allowed := CASE current_plan
    WHEN 'free' THEN 1
    WHEN 'pro' THEN 3
    WHEN 'growth' THEN 10
    ELSE 1  -- fallback to free limits
  END;

  RETURN current_count < max_allowed;
END;
$$;
```

### Required: Updated RLS Policy

Replace or augment the existing `members_insert_owner` policy:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "members_insert_owner" ON public.workspace_members;

-- New policy: owner + member limit check
CREATE POLICY "members_insert_owner_with_limit" ON public.workspace_members
  FOR INSERT WITH CHECK (
    -- Must be workspace owner
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    -- Must be within plan member limit
    AND public.check_member_limit(workspace_id)
  );
```

### Edge Cases

1. **Owner is always counted**: The owner is a member (inserted by signup trigger). `maxMembers: 1` on free plan means owner-only.
2. **Existing members not affected**: The limit check is on INSERT only. Downgrading a plan doesn't remove existing members — they remain until manually removed.
3. **No subscription row**: If `subscriptions` table has no row for a workspace, `COALESCE(s.plan, 'free')` defaults to free tier limits.
4. **Inactive subscriptions**: Only `status = 'active'` subscriptions count. Past-due or canceled subscriptions fall back to free limits.
5. **Workspace owner bypass**: The client-side `isOwnerBypass` in `usePlanLimits.ts` always allows the owner. Server-side, the owner is always allowed to insert (they're the workspace owner), but the limit still applies — they just get a DB error if at limit. The client paywall should prevent this from happening.
6. **Race condition**: Two concurrent invites could exceed the limit. The function counts current members inside the RLS check, which runs per-row. For strict enforcement, an advisory lock could be added, but this is low-risk given the UI already gates invites.

### Migration File Suggestion

Create `supabase/migrations/NNN_member_limit_enforcement.sql` containing:
1. `check_member_limit()` function
2. Drop old `members_insert_owner` policy
3. Create new `members_insert_owner_with_limit` policy

### Testing Checklist
- [ ] Free plan workspace: owner (1 member) cannot invite a 2nd member via DB
- [ ] Pro plan workspace: can have up to 3 members, 4th insert blocked by RLS
- [ ] Growth plan workspace: can have up to 10 members
- [ ] Business plan workspace: unlimited members
- [ ] No subscription row: defaults to free (1 member)
- [ ] Canceled subscription: defaults to free limits
- [ ] Existing members above limit after downgrade: not removed, but no new invites

## Decisions Made
1. **Toast in AuthContext**: Used module-level `toast()` import (not `useToast` hook) since the toast system is module-level and works regardless of provider hierarchy.
2. **SSO test CORS fallback**: Falls back to no-cors HEAD when CORS blocks GET, showing informative "reachable but unvalidated" message rather than false failure.
3. **Member limit enforcement**: Documented spec only — implementation deferred to Agent 25 per AGENT.md instructions.
