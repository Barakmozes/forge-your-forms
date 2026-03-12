# Agent 25 — Handoff

## Status: COMPLETE

## Files Modified
- `src/hooks/usePlanLimits.ts` — added `integrations: "pro"` to FEATURE_REQUIRED_PLAN map

## Assessment Summary (Prompt 25.0)

### Issues Confirmed After Agent 21/24 Changes
| Issue | Status | Action |
|-------|--------|--------|
| P1-8: All limits client-side only | Still present | Server-side spec written below (deferred to future phase) |
| P1-9: IntegrationManager no FeatureGate | Still present | Documented for Agent 32 below |
| P1-10: AiFormGenerator no FeatureGate | Still present | Documented for Agent 34 below |
| P2-1: submissionPercentUsed >100 flash | **Already fixed** | Agent 21 added `Math.min(100, ...)` |
| P2-2: Stale usage data (60s) | Known limitation | useUsage not owned by this agent |
| P2-3: No "approaching limit" email | Out of scope | Deferred to future phase |

### What Agent 21 Already Fixed
- Added `isOwnerBypass` — workspace owners bypass all plan limits
- FeatureGate checks `isOwnerBypass` and renders children directly
- `submissionPercentUsed` clamped to max 100 via `Math.min`

## Fix Applied (Prompt 25.1)
- Added `integrations: "pro"` to `FEATURE_REQUIRED_PLAN` in `usePlanLimits.ts`
- This enables `canAccessFeature("integrations")` to return correct gating result
- All other edge cases were already handled by Agent 21's changes

## FeatureGate Specs for Downstream Agents (Prompt 25.2)

### For Agent 32 — IntegrationManager FeatureGate

**File**: `src/components/integrations/IntegrationManager.tsx`

**What to add**: Wrap the entire `IntegrationManager` component content with `FeatureGate` at the call site, OR wrap internally.

**Option A — Wrap at call site** (preferred if there's a parent rendering IntegrationManager):
```tsx
import FeatureGate from "@/components/upgrade/FeatureGate";

<FeatureGate feature="integrations" requiredPlan="pro" featureName="Integrations">
  <IntegrationManager />
</FeatureGate>
```

**Option B — Wrap internally** (if IntegrationManager is a page-level component):
```tsx
// At top of IntegrationManager, after early returns for loading/empty:
import FeatureGate from "@/components/upgrade/FeatureGate";

// Wrap the return JSX:
return (
  <FeatureGate feature="integrations" requiredPlan="pro" featureName="Integrations">
    <div className="space-y-6">
      {/* existing content */}
    </div>
  </FeatureGate>
);
```

**Required plan**: `"pro"` — integrations are available from Pro tier and above.

**Note**: `integrations` has been added to `FEATURE_REQUIRED_PLAN` in `usePlanLimits.ts`, so `canAccessFeature("integrations")` will work correctly.

---

### For Agent 34 — AiFormGenerator FeatureGate

**File**: `src/components/ai/AiFormGenerator.tsx`

**What to add**: Wrap at the call site where `AiFormGenerator` is rendered (likely in `Forms.tsx` or `FormBuilder.tsx`).

```tsx
import FeatureGate from "@/components/upgrade/FeatureGate";

<FeatureGate feature="ai" requiredPlan="business" featureName="AI Form Generator">
  <AiFormGenerator open={aiOpen} onOpenChange={setAiOpen} />
</FeatureGate>
```

**Alternative — gate the trigger button** instead of the dialog:
```tsx
<FeatureGate feature="ai" requiredPlan="business" featureName="AI Form Generator">
  <Button onClick={() => setAiOpen(true)}>
    <Sparkles className="h-4 w-4" />
    Create with AI
  </Button>
</FeatureGate>
```

**Required plan**: `"business"` — AI features are Business tier only.

**Note**: `ai` is already in `FEATURE_REQUIRED_PLAN` in `usePlanLimits.ts`.

---

## Server-Side Enforcement Specification (Prompt 25.3)

> **NOTE**: This is documentation only. No migration is created in Phase 7.
> The actual migration is deferred to a future phase.

### Overview

Currently all plan limits are enforced client-side only via `usePlanLimits.ts`. A user with direct Supabase client access or API calls can bypass these limits. Server-side enforcement requires RLS policies that check the workspace's subscription plan before allowing INSERT operations.

### Step 1: Create `get_workspace_plan()` Helper Function

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_plan(ws_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.plan FROM public.subscriptions s
     WHERE s.workspace_id = ws_id
       AND s.status IN ('active', 'trialing')
     LIMIT 1),
    'free'
  );
$$;
```

### Step 2: Create `check_plan_limit()` Enforcement Function

```sql
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  ws_id UUID,
  resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan TEXT;
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  current_plan := public.get_workspace_plan(ws_id);

  -- Plan limit matrix
  CASE resource_type
    WHEN 'forms' THEN
      SELECT COUNT(*) INTO current_count FROM public.forms WHERE workspace_id = ws_id;
      max_allowed := CASE current_plan
        WHEN 'free' THEN 3
        ELSE NULL  -- unlimited for pro/growth/business
      END;

    WHEN 'submissions_monthly' THEN
      SELECT COUNT(*) INTO current_count FROM public.submissions sub
        JOIN public.forms f ON f.id = sub.form_id
        WHERE f.workspace_id = ws_id
          AND sub.submitted_at >= date_trunc('month', now());
      max_allowed := CASE current_plan
        WHEN 'free' THEN 100
        WHEN 'pro' THEN 5000
        WHEN 'growth' THEN 25000
        ELSE NULL  -- unlimited for business
      END;

    WHEN 'members' THEN
      SELECT COUNT(*) INTO current_count FROM public.workspace_members WHERE workspace_id = ws_id;
      max_allowed := CASE current_plan
        WHEN 'free' THEN 1
        WHEN 'pro' THEN 3
        WHEN 'growth' THEN 10
        ELSE NULL  -- unlimited for business
      END;

    ELSE
      RETURN TRUE;  -- unknown resource type, allow
  END CASE;

  -- NULL = unlimited
  IF max_allowed IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN current_count < max_allowed;
END;
$$;
```

### Step 3: Add Plan-Aware RLS Policies

#### Forms INSERT (replace existing `forms_insert_member`)

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "forms_insert_member" ON public.forms;

-- New policy with plan limit check
CREATE POLICY "forms_insert_member_with_limit" ON public.forms
  FOR INSERT WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND public.check_plan_limit(workspace_id, 'forms')
  );
```

#### Submissions INSERT (replace existing `submissions_insert_public`)

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "submissions_insert_public" ON public.submissions;

-- New policy with plan limit check
CREATE POLICY "submissions_insert_public_with_limit" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active'
    )
    AND public.check_plan_limit(
      (SELECT f.workspace_id FROM public.forms f WHERE f.id = form_id),
      'submissions_monthly'
    )
  );
```

#### Workspace Members INSERT (replace existing `members_insert_owner`)

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "members_insert_owner" ON public.workspace_members;

-- New policy with plan limit check
CREATE POLICY "members_insert_owner_with_limit" ON public.workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    AND public.check_plan_limit(workspace_id, 'members')
  );
```

### Edge Cases

| Case | Behavior |
|------|----------|
| No subscription row | `get_workspace_plan()` returns `'free'` |
| Subscription status `canceled` or `past_due` | Returns `'free'` (only `active`/`trialing` count) |
| `NULL` max_allowed | Unlimited — always returns TRUE |
| Concurrent inserts at limit boundary | PostgreSQL serialization handles this; worst case is +1 over limit |
| Waitlist/Feedback/Support mode-specific limits | Can be added similarly with mode-aware counting |

### Performance Considerations

- `get_workspace_plan()` is marked `STABLE` — PostgreSQL can cache within a transaction
- Indexes already exist on `subscriptions(workspace_id)` and `forms(workspace_id)`
- For high-volume submission checking, consider a materialized counter or `submission_count` column (already exists on `forms` table)

### Migration File Naming

When implementing, create: `supabase/migrations/NNN_plan_limit_enforcement.sql`

---

## Dependencies
- Agent 21 (ADMIN bypass) — usePlanLimits already modified ✅
- Agent 24 (Billing) — stripe.ts and useSubscription finalized ✅

## Downstream
- **Agent 32 (Integrations)** — must wrap IntegrationManager with `<FeatureGate feature="integrations" requiredPlan="pro">` (see spec above)
- **Agent 34 (AI)** — must wrap AiFormGenerator trigger with `<FeatureGate feature="ai" requiredPlan="business">` (see spec above)
- **Future Phase** — implement server-side enforcement migration (see SQL spec above)

## Verification
- `npm run lint` — 0 errors (16 pre-existing warnings)
- `npx tsc --noEmit` — passes clean
- `integrations` added to FEATURE_REQUIRED_PLAN ✅
- submissionPercentUsed clamped at 100 ✅ (by Agent 21)
- isOwnerBypass works for all checks ✅ (by Agent 21)
