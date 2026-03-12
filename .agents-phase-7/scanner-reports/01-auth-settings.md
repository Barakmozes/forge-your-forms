# Scan Report: Auth & Settings
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/Auth.tsx` — Login/signup/forgot-password (3 views + 2 pending states)
- `src/pages/ResetPassword.tsx` — Set new password after email link
- `src/pages/Settings.tsx` — 8-tab settings hub (workspace, members, profile, billing, webhooks, api, integrations, enterprise)
- `src/pages/AccountDeletion.tsx` — GDPR account deletion with confirmation

### Components
- `src/components/MembersManager.tsx` — Workspace member invite/role/remove (owner-only)
- `src/components/enterprise/SsoConfig.tsx` — SAML SSO config (business plan)
- `src/components/enterprise/WhiteLabelConfig.tsx` — White-label branding (business plan)
- `src/components/enterprise/CustomDomainConfig.tsx` — Custom domain mapping (growth plan)

### Hooks
- `src/contexts/AuthContext.tsx` — Supabase Auth session management, SSO sign-in
- `src/hooks/useAuthHashError.ts` — Parse auth errors from URL hash (OTP expired, access denied)
- `src/hooks/useEnterprise.ts` — Enterprise settings CRUD + realtime

### Database Tables
- `profiles` — RLS: own-user read/update. Triggers: auto-create on signup. Realtime: no
- `workspaces` — RLS: member read, owner update. Triggers: auto-create on signup. Realtime: no
- `workspace_members` — RLS: member access. Triggers: none. Realtime: no
- `enterprise_settings` — RLS: member read, owner CRUD. Triggers: auto-update timestamp. Realtime: yes
- `custom_domains` — RLS: member read, owner CRUD. Triggers: none. Realtime: no

### Edge Functions
- None auth-specific (auth handled by Supabase Auth built-in)

### Routes
- `/auth` — Public (redirects if authed), Component: Auth
- `/auth/reset-password` — Session required, Component: ResetPassword
- `/settings` — Protected, Component: Settings (supports `?tab=` query param)
- `/delete-account` — Protected, Component: AccountDeletion

## 2. End-to-End Flow Status

- **Email signup → workspace creation → dashboard**: WORKS
  - Auth.tsx → Supabase signUp → DB trigger creates profile + workspace + member → redirect to /
- **Login → session → protected routes**: WORKS
  - Auth.tsx → signInWithPassword → AuthContext session → middleware redirect
- **Password reset → email → update**: WORKS
  - Auth.tsx forgotPassword → Supabase resetPasswordForEmail → email link → ResetPassword.tsx → updateUser
- **Settings: workspace name update**: WORKS
  - Settings.tsx → supabase.from("workspaces").update → toast
- **Settings: profile + avatar upload**: WORKS
  - Settings.tsx → upload to "avatars" bucket → update profiles.avatar_url
- **Settings: member invite**: WORKS
  - MembersManager → lookup profile by email → insert workspace_members → plan limit check via usePlanLimits
- **SSO sign-in flow**: PARTIAL
  - AuthContext.signInWithSSO looks up enterprise_settings + calls supabase.auth.signInWithSSO
  - Requires Supabase project SSO configured in dashboard (external dependency)
- **Account deletion (GDPR)**: WORKS
  - AccountDeletion.tsx → cascade delete workspaces → remove memberships → delete notifications → delete profile → signOut
- **Auth hash error handling**: WORKS
  - useAuthHashError parses URL hash → shows toast → redirects to /auth with query params

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | Auth, Settings (workspace, profile) | 1 member | YES — usePlanLimits.canInviteMember() client-side |
| Pro | + Members tab | 3 members | YES — client-side |
| Growth | + Custom domains | 10 members | YES — client-side |
| Business | + SSO, White-label | Unlimited members | YES — client-side |

**Note**: Member limits enforced client-side only. No RLS policy prevents inserting extra members.

## 4. Cross-Dependencies

- **Depends on**: Supabase Auth (external), Supabase Storage (avatars, branding buckets)
- **Depended on by**: Every protected feature (all require AuthContext session + WorkspaceContext)
- **Shared files**: `src/App.tsx` (routes — Agent 22 owner), `src/pages/Settings.tsx` (Agent 35 owner)

## 5. i18n Status

- t() coverage: ALL strings wrapped (auth.*, settings.*, members.*, enterprise.*, gdpr.*)
- Hebrew translations: COMPLETE (all auth/settings keys present in he.json)
- RTL layout: CORRECT — logical properties used throughout

## 6. Parallelism Eligibility

- Independent: NO — foundational feature, all others depend on it
- Conflicts with: Settings.tsx shared with Agent 35 (Enterprise)

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **Member limit client-only enforcement**: No RLS policy prevents inserting workspace_members beyond plan limit. A user could bypass limits via direct Supabase calls. File: `supabase/migrations/003_rls_policies.sql`
- **SSO requires external Supabase config**: signInWithSSO will fail if Supabase project SSO not configured in dashboard. No user-facing error handling for this case. File: `src/contexts/AuthContext.tsx`

### P2 — Medium
- **Custom domain DNS verification is simulated**: handleVerifyDomain does client-side update only, no actual DNS lookup. File: `src/components/enterprise/CustomDomainConfig.tsx`
- **White-label favicon URL-only**: No file upload for favicon (inconsistent with logo upload). File: `src/components/enterprise/WhiteLabelConfig.tsx`
- **SSO test validates reachability only**: HEAD request doesn't validate SAML metadata structure. File: `src/components/enterprise/SsoConfig.tsx`

## 8. Recommended Fix Path

1. Add RLS policy to cap workspace_members per plan — requires new migration + helper function
2. Add error handling for SSO sign-in failure in AuthContext.tsx
3. Document that custom domain verification requires external DNS check implementation
