# Agent 21 — FIX-PLAN: Admin/Owner Bypass

## Assessment Findings

### 1. usePlanLimits — No Role Awareness
- Only reads `plan` from `useSubscription()` and usage counts from `useUsage()`
- All gating functions (`canCreateForm`, `canAcceptSubmission`, `canInviteMember`, `canAccessMode`, `canAccessFeature`) are purely plan-tier-based
- No concept of owner/admin bypass exists

### 2. FeatureGate — No Admin Bypass
- Strictly checks `isPlanAtLeast(plan, requiredPlan)`
- Always shows blur/lock overlay + PaywallModal for insufficient plans
- No prop or internal logic to skip gating for admin/owner users

### 3. WorkspaceContext — Owner ID Available
- `Workspace` interface has `owner_id: string`
- `useWorkspace()` returns `currentWorkspace` which includes `owner_id`
- `useAuth()` returns `user` with `user.id` (from Supabase Auth)
- Comparison: `user.id === currentWorkspace.owner_id` determines ownership

### 4. No Existing Bypass Paths
- No code in the codebase checks for admin/owner bypass of plan limits

---

## Planned Changes

### File 1: `src/hooks/usePlanLimits.ts`

**What to change:**
1. Import `useWorkspace` from `@/contexts/WorkspaceContext`
2. Import `useAuth` from `@/contexts/AuthContext`
3. Compute `isOwnerBypass`: `user?.id === currentWorkspace?.owner_id`
4. When `isOwnerBypass` is true, all gating functions return `true` / unlimited
5. Export `isOwnerBypass` from the hook return value so FeatureGate can use it
6. Keep all existing logic as fallback for non-owner users

**Specific changes to gating functions:**
- `canAccessMode(mode)` → return `true` if `isOwnerBypass`
- `canCreateForm(mode)` → return `true` if `isOwnerBypass`
- `canAcceptSubmission()` → return `true` if `isOwnerBypass`
- `canInviteMember()` → return `true` if `isOwnerBypass`
- `canAccessFeature(feature)` → return `true` if `isOwnerBypass`
- `submissionPercentUsed` → `0` if `isOwnerBypass`
- `isNearLimit` → `false` if `isOwnerBypass`
- `isAtLimit` → `false` if `isOwnerBypass`

### File 2: `src/components/upgrade/FeatureGate.tsx`

**What to change:**
1. Read `isOwnerBypass` from the existing `usePlanLimits()` call (already imported)
2. Early return `<>{children}</>` if `isOwnerBypass` is `true` (before the plan check)
3. This ensures no blur, no lock overlay, no PaywallModal for workspace owners

### No New Files Needed
- Owner check is simple enough to inline in `usePlanLimits` (no separate hook needed)
- `useWorkspace().currentWorkspace.owner_id` and `useAuth().user.id` are all that's needed
