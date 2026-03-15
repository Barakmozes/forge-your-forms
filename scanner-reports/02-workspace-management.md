# Feature 02: Workspace Management — Scan Report

**Scanned**: 2026-03-15
**Status**: READY

## Touchpoints

### Pages
| File | Purpose |
|------|---------|
| src/pages/Settings.tsx | Settings with workspace, members, profile, billing tabs |
| src/pages/AccountDeletion.tsx | Account deletion with workspace cascade |

### Components
| File | Purpose |
|------|---------|
| src/components/MembersManager.tsx | Invite, remove, change role of workspace members |
| src/components/Navbar.tsx | Workspace switcher dropdown |

### Hooks / Services
| File | Purpose |
|------|---------|
| src/contexts/WorkspaceContext.tsx | Provides workspaces[], currentWorkspace, setCurrentWorkspace |
| src/hooks/usePlanLimits.ts | Plan limits gated by workspace |
| src/hooks/useUsage.ts | Workspace usage via RPC |

### Database Tables
| Table | Key Columns | RLS |
|-------|-------------|-----|
| workspaces | id, name, slug, owner_id | YES — SELECT/INSERT/UPDATE but NO DELETE policy |
| workspace_members | user_id, workspace_id, role | YES |

### Database Functions
| Function | Purpose |
|----------|---------|
| is_workspace_member() | RLS helper — checks membership |
| get_workspace_role() | RLS helper — returns role enum |
| handle_new_user() | Trigger: creates profile + default workspace on signup |
| lookup_profile_for_invite() | SECURITY DEFINER: find user by email |

---

## E2E Flows

### Flow: Create Workspace
- **Verdict**: BROKEN
- **Evidence**: Only created via signup trigger. No UI for additional workspaces.
- **Gaps**: DB supports it, but feature is inaccessible

### Flow: Invite Member
- **Verdict**: PARTIAL
- **Evidence**: Works for existing users only. No email invitation system.
- **Gaps**: "No user found" for unregistered emails, DialogTrigger/paywall race

### Flow: Change Role
- **Verdict**: WORKS
- **Evidence**: Owner-only, RLS enforced

### Flow: Remove Member
- **Verdict**: WORKS
- **Evidence**: Owner or self-removal, RLS enforced

### Flow: Switch Workspace
- **Verdict**: PARTIAL
- **Evidence**: Works but selection not persisted to localStorage — resets on reload

---

## Dependencies

### Depended On By
| Feature | Reason | Strength |
|---------|--------|----------|
| Every authenticated feature | workspace_id scoping | HARD |

### Depends On
| Feature | Reason | Strength |
|---------|--------|----------|
| Auth & User Management | user object drives workspace fetch | HARD |

---

## Parallelism Assessment
- **Exclusive file domain?** NO — WorkspaceContext used everywhere
- **Must run sequential with**: All features (shared context)
- **Recommended batch**: Infrastructure(1)

---

## Auth & RBAC Audit

| Action | Required Role | Enforced? | Location |
|--------|--------------|-----------|----------|
| View workspace | any member | YES | RLS is_workspace_member |
| Update workspace | owner | YES | RLS owner_id check |
| **Create form** | owner/editor | **NO — viewers can create** | RLS uses is_workspace_member (no role check) |
| **Delete workspace** | owner | **NO — no DELETE policy** | Missing entirely |
| **CRUD canned_responses/tags/webhooks/api_keys** | owner/editor | **NO — viewers can write** | RLS uses is_workspace_member |

---

## Issues Found

### P0 — Critical
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Viewers can create forms — forms_insert_member uses is_workspace_member() not role check | SECURITY | HIGH | supabase/migrations/024_rls_role_remediation.sql | 89-94 | Breaks role model |
| 2 | No DELETE policy on workspaces table — account deletion silently fails | SECURITY | HIGH | All migrations | — | Orphaned workspaces, broken account deletion |
| 3 | Viewers can CRUD canned_responses, tags, webhooks, API keys — no role differentiation | SECURITY | HIGH | supabase/migrations/024_rls_role_remediation.sql | 298-340 | Breaks viewer read-only intent |

### P1 — High
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | lookup_profile_for_invite allows any workspace owner to enumerate all emails | SECURITY | HIGH | supabase/migrations/030_invite_and_member_fixes.sql | 19-21 | User enumeration |
| 2 | Workspace fetch error silently swallowed — app appears empty | RESILIENCE | HIGH | src/contexts/WorkspaceContext.tsx | 48-53 | Entire app broken silently |
| 3 | Workspace selection not persisted to localStorage | UX | MEDIUM | src/contexts/WorkspaceContext.tsx | 50-52 | Resets on reload |
| 4 | Workspace type omits slug — causes redundant query in Settings | ARCHITECTURE | HIGH | src/contexts/WorkspaceContext.tsx | 5-10 | Extra network call |
| 5 | fetchMembers failure is silent — no error state | RESILIENCE | HIGH | src/components/MembersManager.tsx | 92-95 | Empty list, no feedback |
| 6 | No UI for creating additional workspaces | UX | MEDIUM | N/A | — | Users stuck with one workspace |

### P2 — Medium
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Duplicate WorkspaceRole type in MembersManager | ARCHITECTURE | HIGH | src/components/MembersManager.tsx | 42 | DRY violation |
| 2 | No index on workspaces(owner_id) — used in 5+ RLS policies | DATABASE | MEDIUM | — | — | Policy performance |
| 3 | Only 4 shallow tests for WorkspaceContext | RESILIENCE | HIGH | src/test/contexts/ | — | Critical path untested |

---

## Recommended Fix Path
1. **P0-1,3**: New migration: fix forms_insert_member + canned_responses/tags/webhooks/api_keys policies to use get_workspace_role() IN ('owner','editor')
2. **P0-2**: New migration: add workspaces_delete_owner DELETE policy
3. **P1-1**: Tighten lookup_profile_for_invite to require workspace_id param and verify caller owns that workspace
4. **P1-2**: Add error handling to WorkspaceContext fetch with user-visible error state
5. **P1-5**: Add error handling to fetchMembers
6. **P1-3**: Persist workspace selection to localStorage
7. **P1-4**: Use WorkspaceRow type or add slug to Workspace interface

**Estimated prompts**: 6 (1 assessment + 4 fixes + 1 verification)
**Agent role**: SECURITY_ENGINEER (P0s) + ENGINEER (P1s)
