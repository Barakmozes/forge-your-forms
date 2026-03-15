# Feature 01: Authentication & User Management — Scan Report

> Scanned: 2026-03-15
> Scanner: Claude Opus 4.6
> Scope: Signup, login, logout, password reset, profile management, account deletion, SSO, route protection, session management, RLS policies

---

## 1. Touchpoints

### Pages
| File | Purpose |
|------|---------|
| `src/pages/Auth.tsx` | Login, signup, forgot-password, email-verification pending views |
| `src/pages/ResetPassword.tsx` | Password reset form (after clicking email link) |
| `src/pages/Settings.tsx` | Profile tab (name, avatar), workspace settings, members management |
| `src/pages/AccountDeletion.tsx` | GDPR account deletion flow with confirmation |
| `src/pages/DataExport.tsx` | GDPR data export (downloads JSON of all user data) |

### Components
| File | Purpose |
|------|---------|
| `src/components/Navbar.tsx` | Sign-out button, user avatar/initials, workspace switcher |
| `src/components/MembersManager.tsx` | Invite/remove workspace members, role changes |
| `src/components/ErrorBoundary.tsx` | Global error boundary wrapping all routes |
| `src/components/enterprise/SsoConfig.tsx` | SSO configuration UI (enterprise tab) |

### Contexts & Hooks
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Session state, `useAuth()`, `signOut()`, `signInWithSSO()` |
| `src/contexts/WorkspaceContext.tsx` | Workspace list, auto-select first workspace |
| `src/hooks/useAuthHashError.ts` | Handles Supabase auth errors in URL hash (e.g., expired OTP) |
| `src/hooks/useOnboarding.ts` | Checks `profiles.onboarding_completed`, redirects to wizard |
| `src/hooks/useErrorHandler.ts` | Centralized async error handling with toast feedback |
| `src/hooks/use-toast.ts` | Custom toast system for protected pages |

### Libraries & Config
| File | Purpose |
|------|---------|
| `src/integrations/supabase/client.ts` | Supabase client (implicit flow, localStorage, auto-refresh) |
| `src/lib/errorLogger.ts` | Console + Supabase error logging with rate limiting |
| `src/App.tsx` | Route definitions, `ProtectedRoute`, `AuthRoute`, `PostVerificationRedirect` |
| `.env` | Supabase URL, anon key, Stripe keys |

### Database Tables
| Table | Auth Relevance |
|-------|----------------|
| `profiles` | Stores user email, full_name, avatar_url, onboarding_completed |
| `workspaces` | Auto-created on signup via trigger |
| `workspace_members` | Auto-created on signup (owner role) |
| `auth.users` | Supabase managed auth table |

### Migrations
| File | Auth Relevance |
|------|----------------|
| `001_core_tables_and_enums.sql` | profiles, workspaces, workspace_members tables |
| `003_rls_policies.sql` | RLS on profiles, workspaces, workspace_members |
| `004_functions_and_triggers.sql` | `handle_new_user()` trigger: creates profile + workspace on signup |
| `024_rls_role_remediation.sql` | Hardened all workspace-scoped policies to `TO authenticated` |
| `025_policy_hardening.sql` | Dropped overly permissive policies, hardened functions |
| `030_invite_and_member_fixes.sql` | `lookup_profile_for_invite()`, `lookup_profiles_by_ids()` functions |

### Tests
| File | Coverage |
|------|----------|
| `src/test/contexts/AuthContext.test.tsx` | 7 tests: session states, auth state changes, signOut, unsubscribe |
| `src/test/routing/ProtectedRoute.test.tsx` | 4 tests: ProtectedRoute + AuthRoute redirect behavior |

---

## 2. E2E Flows

### 2.1 Signup Flow
**Steps:**
1. User navigates to `/auth` (redirected if already authenticated via `AuthRoute`)
2. Clicks "Sign Up" toggle to switch view
3. Enters full name, email, password (minLength=6)
4. `supabase.auth.signUp()` called with `emailRedirectTo: window.location.origin`
5. View switches to `pendingVerification` with resend capability (60s cooldown)
6. On email verification click, Supabase redirects to origin
7. `onAuthStateChange` fires `SIGNED_IN`, `PostVerificationRedirect` navigates to `/`
8. DB trigger `handle_new_user()` creates profile + default workspace + workspace_member

**Verdict:** WORKS
**Evidence:** Auth.tsx:91-106, AuthContext.tsx:38-53, App.tsx:69-88, migration 004:6-35
**Gaps:**
- No password strength indicator beyond minLength=6 on the HTML input
- No duplicate email detection before calling signUp (Supabase handles this but error message is generic)
- `full_name` is required in UI (HTML `required`) but Supabase accepts empty metadata

### 2.2 Login Flow
**Steps:**
1. User navigates to `/auth`
2. Enters email and password
3. `supabase.auth.signInWithPassword()` called
4. On success, `navigate("/")` triggers redirect
5. `onAuthStateChange` fires `SIGNED_IN`, session is stored

**Verdict:** WORKS
**Evidence:** Auth.tsx:84-89, AuthContext.tsx:38-53
**Gaps:**
- No client-side rate limiting for failed login attempts (relies entirely on Supabase server-side rate limiting)
- No account lockout UI feedback if Supabase throttles requests

### 2.3 Logout Flow
**Steps:**
1. User clicks sign-out in Navbar dropdown menu
2. `signOut()` called via AuthContext
3. `supabase.auth.signOut()` invoked through `handleAsync` error wrapper
4. Session cleared, `onAuthStateChange` fires `SIGNED_OUT`
5. `ProtectedRoute` redirects to `/auth`

**Verdict:** WORKS
**Evidence:** Navbar.tsx:144, AuthContext.tsx:55-60, App.tsx:92-97
**Gaps:** None identified.

### 2.4 Password Reset Flow
**Steps:**
1. User clicks "Forgot Password?" on login form
2. Enters email, submits → `supabase.auth.resetPasswordForEmail()` with `redirectTo: /auth/reset-password`
3. View switches to `pendingReset` with resend capability (60s cooldown)
4. User clicks link in email → redirected to `/auth/reset-password`
5. Supabase implicit flow exchanges hash token for session
6. `ResetPassword.tsx` checks for user session; if present, shows password form
7. User enters new password + confirmation; `supabase.auth.updateUser({ password })`
8. On success, redirected to `/` after 2s timeout

**Verdict:** WORKS
**Evidence:** Auth.tsx:110-137, ResetPassword.tsx:23-44, App.tsx:124
**Gaps:**
- If hash token exchange fails (e.g., expired), `useAuthHashError` catches the error, shows toast, and redirects to `/auth?resetExpired=1`
- The 2-second `setTimeout` redirect after password update could lose toast visibility

### 2.5 Account Deletion Flow
**Steps:**
1. User navigates to `/delete-account` (protected route)
2. Types "DELETE MY ACCOUNT" confirmation phrase
3. Clicks delete button, then confirms in AlertDialog
4. Client-side deletion sequence: delete owned workspaces (CASCADE), remove memberships, delete notifications, delete profile
5. Sign out, navigate to `/auth`

**Verdict:** PARTIAL
**Evidence:** AccountDeletion.tsx:37-90
**Gaps:**
- **Critical:** The `auth.users` record is NOT deleted. Comment on line 72 says "auth user deletion requires service_role -- handled server-side or manually" but no server-side function exists to complete this. The user's auth record persists, meaning they could still authenticate but would have no profile/workspace.
- No RLS DELETE policy exists for `profiles` table (only SELECT, UPDATE, INSERT). The client-side `supabase.from("profiles").delete()` call on line 68-70 will silently fail due to missing policy.
- Error handling uses `console.error` instead of the centralized `logError` utility

### 2.6 Profile Update Flow
**Steps:**
1. User navigates to `/settings?tab=profile`
2. Profile data loaded from `profiles` table
3. User can update full name and upload avatar (image only, max 2MB)
4. Avatar uploaded to Supabase Storage `avatars` bucket, URL saved to profile
5. Email shown as read-only ("Email cannot be changed")

**Verdict:** WORKS
**Evidence:** Settings.tsx:120-191
**Gaps:**
- No ability to change email address (UI explicitly says "cannot be changed")
- No ability to change password from settings (only via forgot-password flow)
- Avatar URL uses public bucket URL; no validation that the file is actually an image beyond MIME type check

### 2.7 SSO Sign-In Flow
**Steps:**
1. User enters workspace slug on SSO form
2. `signInWithSSO()` looks up workspace by slug, checks `enterprise_settings.sso_enabled`
3. If enabled, calls `supabase.auth.signInWithSSO({ domain: workspaceSlug })`
4. On success, redirects to SSO provider URL

**Verdict:** PARTIAL
**Evidence:** AuthContext.tsx:64-132
**Gaps:**
- This is a "ready-to-activate integration point" per comment on line 103. Requires Supabase SSO provider registration.
- The `domain` parameter is set to `workspaceSlug` which may not match the actual SSO domain configured in Supabase
- No UI entry point in Auth.tsx for SSO login (only callable programmatically or from enterprise settings)

---

## 3. Cross-Dependencies

### Depends On
| Dependency | Strength | Notes |
|-----------|----------|-------|
| Supabase Auth service | HARD | All authentication flows depend on Supabase Auth |
| `profiles` table + trigger | HARD | Signup creates profile; all user display relies on profiles |
| `workspaces` + `workspace_members` tables | HARD | Auto-created on signup; required for any protected page |
| Supabase Storage (`avatars` bucket) | SOFT | Only for avatar upload in settings |
| `enterprise_settings` table | SOFT | Only for SSO flow |
| `activation_events` table | SOFT | Only for onboarding tracking |
| i18n (`react-i18next`) | SOFT | All auth UI strings are translated |

### Depended On By
| Dependent | Strength | Notes |
|-----------|----------|-------|
| **Every protected route** | HARD | `ProtectedRoute` wraps all authenticated pages |
| `WorkspaceContext` | HARD | Fetches workspaces only when `user` exists |
| `useOnboarding` | HARD | Checks profile for onboarding status |
| All data hooks (`useWaitlist`, `useFeedback`, `useTickets`, etc.) | HARD | Data fetched via authenticated Supabase client |
| `MembersManager` | HARD | Invite/role management requires auth context |
| `Navbar` | HARD | Displays user info, provides sign-out |
| `BillingPortal` / `CheckoutButton` | HARD | Require authenticated session |
| All RLS policies | HARD | `auth.uid()` used in every workspace-scoped policy |

---

## 4. Parallelism Assessment

| Task | Can Run in Parallel With Feature 01? | Notes |
|------|--------------------------------------|-------|
| Feature 02: Workspace Management | NO | Depends on auth trigger for workspace creation |
| Feature 03: Form Builder | YES | Only needs auth to be functional, not modified |
| Feature 04: Submissions | YES | Independent data flow |
| Feature 05: Waitlist | YES | Independent data flow |
| Feature 06: Feedback | YES | Independent data flow |
| Feature 07: Support Tickets | YES | Independent data flow |

---

## 5. Auth & RBAC Audit

| Action | Required Role | Enforcement | Status |
|--------|--------------|-------------|--------|
| Sign up | Anonymous | Supabase Auth | ENFORCED |
| Log in | Anonymous | Supabase Auth | ENFORCED |
| Sign out | Authenticated | AuthContext | ENFORCED |
| Reset password | Anonymous (email) | Supabase Auth | ENFORCED |
| Update password | Authenticated (via reset link) | Supabase Auth + session | ENFORCED |
| View own profile | Authenticated | RLS `profiles_select_own` (TO authenticated) | ENFORCED |
| Update own profile | Authenticated | RLS `profiles_update_own` (TO authenticated) | ENFORCED |
| Delete own profile | Authenticated | **NO RLS DELETE POLICY** | NOT ENFORCED |
| Upload avatar | Authenticated | Storage bucket policies | ENFORCED |
| View workspace | Workspace member | RLS `workspaces_select_member` (TO authenticated) | ENFORCED |
| Update workspace | Workspace owner | RLS `workspaces_update_owner` (TO authenticated) | ENFORCED |
| Delete workspace | Workspace owner | **NO RLS DELETE POLICY FOR WORKSPACES** | NOT ENFORCED (client-side only) |
| Invite member | Workspace owner | RLS `members_insert_owner` + client-side `isOwner` check | ENFORCED |
| Remove member | Workspace owner (or self) | RLS `members_delete_owner` | ENFORCED |
| Change member role | Workspace owner | RLS `members_update_owner` (TO authenticated) | ENFORCED |
| SSO sign-in | Anonymous | Enterprise settings check + Supabase SSO | PARTIAL |
| Access protected route | Authenticated | `ProtectedRoute` component | ENFORCED |
| Access auth route when logged in | Authenticated | `AuthRoute` redirects to `/` | ENFORCED |

---

## 6. Test Coverage Analysis

### Existing Tests
| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `src/test/contexts/AuthContext.test.tsx` | 7 | Session null/present, loading, auth state change, signOut, unsubscribe |
| `src/test/routing/ProtectedRoute.test.tsx` | 4 | ProtectedRoute redirect, AuthRoute redirect |

### Critical Untested Paths
| Path | Priority | Risk |
|------|----------|------|
| **Signup form submission** | P0 | Core flow, no test coverage |
| **Login form submission** | P0 | Core flow, no test coverage |
| **Password reset request** | P1 | Important flow, no test |
| **Password reset completion** (ResetPassword.tsx) | P1 | Token exchange + password update |
| **Account deletion** | P1 | Destructive action, incomplete implementation |
| **Profile update** (Settings.tsx profile tab) | P2 | CRUD operation |
| **Avatar upload** | P2 | File handling |
| **Member invite/remove/role change** | P1 | RBAC enforcement |
| **SSO sign-in flow** | P2 | Enterprise feature |
| **Auth hash error handling** | P2 | Edge case for expired tokens |
| **Post-verification redirect** | P2 | One-time redirect logic |
| **Onboarding gate** | P2 | Redirect logic for new users |
| **Email resend cooldown** | P2 | UI timer logic |
| **Concurrent session handling** | P1 | Multiple tabs, token refresh |

---

## 7. Code Architecture & Quality

### Patterns
- **AuthContext** follows React context pattern with `onAuthStateChange` subscription + `getSession` initial load. Clean separation of concerns.
- **ProtectedRoute / AuthRoute** are inline in `App.tsx` rather than extracted to separate files. Functional but could benefit from extraction for testability.
- **Error handling** uses `useErrorHandler` hook consistently in Settings.tsx and MembersManager.tsx, but Auth.tsx uses direct try/catch with inline toast calls.
- **Toast consistency**: Auth.tsx and ResetPassword.tsx correctly use `useToast` (protected pages). AuthContext.tsx uses the `toast` named export (also from `use-toast`), which is correct for non-component context.

### Code Smells
1. **Race condition in AuthContext** (line 38-53): Both `onAuthStateChange` and `getSession` can call `setSession` and `setLoading(false)`. If `onAuthStateChange` fires before `getSession` resolves, the session could briefly flash. This is a known Supabase pattern but documented as a potential issue.

2. **Implicit auth flow** (`client.ts:17`): Using `flowType: "implicit"` instead of PKCE. The implicit flow exposes tokens in URL fragments, which is less secure than PKCE for SPAs. Supabase recommends PKCE for new projects.

3. **PostVerificationRedirect** (App.tsx:69-88) uses a `useRef` to prevent double-redirect. This is fragile and could miss edge cases where the component re-mounts.

4. **Account deletion** (AccountDeletion.tsx:42-52) iterates owned workspaces and deletes them one by one in a loop. This is not atomic -- if one deletion fails, partial state results.

5. **Settings.tsx** profile loading uses `.then()` inside `useEffect` (lines 82-89) rather than async/await with proper error handling.

### DRY Violations
- Password validation (min 6 chars) is duplicated: HTML `minLength={6}` in Auth.tsx:318 and explicit `password.length < 6` check in ResetPassword.tsx:26. No shared validation constant or function.
- The cooldown timer logic in Auth.tsx (lines 46-67) could be extracted into a reusable `useCooldown` hook.
- `getInitials()` logic appears in Navbar.tsx:38-40, Settings.tsx:194-196, and MembersManager.tsx:215-217 with slight variations.

### Separation of Concerns
- Auth.tsx manages 5 different views (login, signup, forgotPassword, pendingVerification, pendingReset) in a single component. This is getting large (350 lines) and would benefit from view extraction.
- AuthContext properly separates auth state from workspace state (separate contexts).

---

## 8. Error Handling & Resilience

### Error Boundaries
- `ErrorBoundary` component wraps all routes in App.tsx (line 185-191). Catches rendering errors and shows retry/reload UI.
- ErrorBoundary logs to `errorLogger.ts` which supports console (dev) and Supabase error_logs table (production).

### Try-Catch Coverage
| Component | Error Handling | Quality |
|-----------|---------------|---------|
| AuthContext.signOut | `handleAsync` wrapper | Good |
| AuthContext.signInWithSSO | Full try-catch with specific error mapping | Good |
| Auth.tsx handleSubmit | Checks error from Supabase response | Adequate (no catch) |
| Auth.tsx handleForgotPassword | Checks error from Supabase response | Adequate (no catch) |
| ResetPassword.tsx handleSubmit | Checks error from Supabase response | Adequate (no catch) |
| Settings.tsx handleSaveProfile | `handleAsync` wrapper | Good |
| Settings.tsx handleAvatarUpload | `handleAsync` wrapper | Good |
| AccountDeletion.tsx handleDeleteAccount | Full try-catch | Good structure, but silent failures (console.error only for workspace deletion) |
| DataExport.tsx handleExport | Full try-catch | Uses console.error instead of logError |

### Graceful Degradation
- Auth loading state shows "Loading..." text (minimal but functional)
- ResetPassword shows clear invalid/expired session state with "Request New Reset Link" button
- Network failures during auth operations show toast errors but do not prevent retrying

### Unhandled Scenarios
1. **Token refresh failure**: If `autoRefreshToken` fails silently, user may get 401s from Supabase without being redirected to login
2. **Offline mode**: No offline detection or messaging. Auth operations will fail with generic network errors
3. **Concurrent tab logout**: If user logs out in one tab, other tabs will not be notified until next Supabase call fails
4. **getSession rejection**: The `.then()` on line 47-50 of AuthContext.tsx has no `.catch()`. If `getSession` throws, loading state may never resolve.

---

## 9. Documentation Audit

| Area | Status | Notes |
|------|--------|-------|
| CLAUDE.md auth section | Complete | Sections 4-6 cover auth setup, route protection, provider hierarchy |
| Inline code comments | Adequate | Key functions documented, agent markers present |
| Auth flow diagrams | Missing | No visual documentation of auth flows |
| RLS policy documentation | Good | Documented in CLAUDE.md section 4, also in `supabase/audit/rls-matrix.md` |
| API/hook documentation | Partial | `useAuth()` return type documented in interface; no JSDoc |
| Error codes/messages | Missing | No documentation of error scenarios and expected user-facing messages |
| SSO setup guide | Missing | SSO code has integration comments but no setup documentation |

---

## 10. Product Growth & Innovation (7 Lenses)

### 10.1 Retention
- **Onboarding gate**: New users are redirected to `/onboarding` wizard before accessing the app. Good for activation.
- **Gap**: No "welcome back" or session resumption messaging after periods of inactivity.
- **Opportunity**: Add login streak tracking or "last activity" display to encourage daily engagement.

### 10.2 Activation
- **Auto-workspace creation on signup** reduces friction to first value.
- **Gap**: No guided tour or contextual help after onboarding completes.
- **Opportunity**: Track time-to-first-form-creation as a key activation metric.

### 10.3 Conversion
- **Free-to-paid gate**: Member invite limits enforce plan upgrades (PaywallModal in MembersManager).
- **Gap**: No trial period management or upgrade prompts during auth flows.
- **Opportunity**: Show plan comparison on signup or after Nth login.

### 10.4 Security Perception
- **Strengths**: RLS policies hardened (migrations 024, 025), SECURITY DEFINER functions use `SET search_path = public`, profile lookup scoped to workspace membership.
- **Gaps**: Implicit OAuth flow, no MFA, no password strength indicator.
- **Opportunity**: Add MFA toggle in Settings, show security score badge.

### 10.5 Collaboration
- **Member invite system** works (by existing email only, not email invitation).
- **Gap**: No pending invitation state; invitee must already have a FormForge account.
- **Opportunity**: Add email invitation for non-existing users (trigger signup flow).

### 10.6 Trust & Compliance
- **GDPR data export** exists at `/data-export`.
- **GDPR account deletion** exists at `/delete-account` but is incomplete (auth.users not deleted).
- **Gap**: No Terms of Service acceptance tracking at signup.
- **Opportunity**: Add consent checkboxes, data retention policy display.

### 10.7 Developer Experience
- **Clean context separation**: AuthContext handles auth, WorkspaceContext handles workspaces.
- **Gap**: No auth utilities for testing (mock providers are duplicated across test files).
- **Opportunity**: Create shared test utilities in `src/test/utils.ts` for auth mocking.

---

## 11. Issues Found

### P0 — Critical / Must Fix

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | `.env` file IS tracked by git (`git ls-files` confirms it). Despite `.gitignore` listing `.env`, the file was added before the ignore rule and remains tracked. Contains Supabase anon key (client-safe by design) but also 6 Stripe price IDs and a Stripe publishable key. These are test keys but should still not be in version control. Any contributor clone gets these credentials. | SECURITY | HIGH | `.env` | 1-10 | Stripe keys and Supabase credentials exposed in git history to all repo cloners |
| 2 | Account deletion does NOT delete the `auth.users` record. The comment says "handled server-side or manually" but no server-side function exists. User can still authenticate after "deletion" and will find an empty state. | BUG | HIGH | `src/pages/AccountDeletion.tsx` | 72 | Broken GDPR compliance; zombie auth accounts |
| 3 | No RLS DELETE policy on `profiles` table. The `AccountDeletion.tsx` delete call (line 68-70) will silently fail via RLS. Profile data persists after "deletion". | SECURITY | HIGH | `supabase/migrations/003_rls_policies.sql` | 16-21 | Profile data not actually deleted; GDPR violation |
| 4 | No RLS DELETE policy on `workspaces` table. The cascade deletion in `AccountDeletion.tsx` (line 45-52) will silently fail. | SECURITY | HIGH | `supabase/migrations/003_rls_policies.sql` | 24-31 | Workspace data not deleted during account deletion |
| 5 | Using `flowType: "implicit"` instead of PKCE. The implicit flow exposes access tokens in URL hash fragments, which can be leaked via browser history, referrer headers, and server logs. Supabase and OAuth 2.1 recommend PKCE for SPAs. | SECURITY | HIGH | `src/integrations/supabase/client.ts` | 17 | Token exposure risk in browser history and referrer headers |

### P1 — High Priority

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 6 | `getSession().then()` has no `.catch()` handler. If Supabase is unreachable, the `loading` state will never become `false`, permanently blocking the UI on "Loading..." | RESILIENCE | HIGH | `src/contexts/AuthContext.tsx` | 47-50 | App permanently stuck on loading if Supabase is down at startup |
| 7 | No password strength validation beyond HTML minLength=6. Supabase default minimum is 6 chars. Users can set trivially weak passwords like "123456". | SECURITY | HIGH | `src/pages/Auth.tsx` | 318 | Weak passwords accepted |
| 8 | No MFA / 2FA support. No UI for TOTP setup, no enforcement for admin/owner roles. | SECURITY | MEDIUM | `src/contexts/AuthContext.tsx` | — | Single-factor authentication only |
| 9 | Account deletion performs sequential, non-atomic operations. If workspace deletion fails partway, user ends up in inconsistent state (some data deleted, some not). | BUG | HIGH | `src/pages/AccountDeletion.tsx` | 42-73 | Partial deletion leaving orphaned data |
| 10 | DataExport.tsx uses `console.error` (line 114) instead of the centralized `logError` utility, bypassing production error tracking. | ARCHITECTURE | HIGH | `src/pages/DataExport.tsx` | 114 | Export failures not tracked in production |
| 11 | No email change functionality. Settings page explicitly says "Email cannot be changed" with no alternative flow. Users who need to change email are stuck. | UX | HIGH | `src/pages/Settings.tsx` | 390-391 | Users cannot update their email address |
| 12 | Member "invite" requires the invitee to already have a FormForge account. No email invitation system for new users. This limits team growth. | UX | MEDIUM | `src/components/MembersManager.tsx` | 122-127 | Cannot invite users who haven't signed up |

### P2 — Medium Priority

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 13 | `getInitials()` logic duplicated in 3 files with slight variations (Navbar uses `user_metadata.full_name`, Settings/MembersManager use profile data). | ARCHITECTURE | HIGH | `src/components/Navbar.tsx` | 38-40 | DRY violation; inconsistent initial generation |
| 14 | Auth.tsx manages 5 views (login, signup, forgotPassword, pendingVerification, pendingReset) in a single 350-line component. Should be split into view components. | ARCHITECTURE | MEDIUM | `src/pages/Auth.tsx` | 1-350 | Reduced maintainability |
| 15 | Password validation (min 6 chars) is hardcoded in two separate files with no shared constant. | ARCHITECTURE | HIGH | `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx` | 318, 26 | Inconsistency risk if minimum changes |
| 16 | Cooldown timer logic (60s interval with setInterval) could be extracted to a reusable `useCooldown` hook. | ARCHITECTURE | MEDIUM | `src/pages/Auth.tsx` | 46-67 | DRY violation |
| 17 | Settings.tsx profile loading uses `.then()` inside useEffect (lines 82-89) without error handling. If profile fetch fails, form shows empty values with no error message. | RESILIENCE | HIGH | `src/pages/Settings.tsx` | 79-93 | Silent failure on profile load |
| 18 | No "remember me" option on login. Session persists via localStorage regardless, so this is cosmetic, but user expectation may differ on shared devices. | UX | LOW | `src/pages/Auth.tsx` | — | No session expiry control for users |
| 19 | `PostVerificationRedirect` uses a `useRef` to prevent double-redirect, which resets on component remount. | BUG | MEDIUM | `src/App.tsx` | 69-88 | Potential missed redirect on remount |
| 20 | No CSRF protection beyond Supabase's built-in token validation. The implicit flow relies on same-origin policy. | SECURITY | LOW | `src/integrations/supabase/client.ts` | — | Mitigated by SameSite cookies and CORS, but defense-in-depth is missing |
| 21 | No audit log for authentication events (login, logout, password change, account deletion). | SECURITY | MEDIUM | — | — | No forensic trail for security incidents |
| 22 | The `signInWithSSO` function passes `workspaceSlug` as the SSO `domain` parameter. This likely will not match the actual SAML/OIDC domain configured in Supabase. | BUG | MEDIUM | `src/contexts/AuthContext.tsx` | 104-106 | SSO sign-in will fail when actually configured |
| 23 | No social login providers configured (Google, GitHub, etc.). Only email/password auth is available. | OPPORTUNITY | MEDIUM | `src/pages/Auth.tsx` | — | Friction for users preferring social auth |
| 24 | No session timeout / idle detection. Sessions persist indefinitely via auto-refresh. | SECURITY | LOW | `src/integrations/supabase/client.ts` | 14 | Long-lived sessions on shared devices |

---

## 12. Recommended Fix Path

| Step | Action | Est. Prompts | Agent Role |
|------|--------|-------------|------------|
| 1 | **[P0 #5]** Change `flowType` from `"implicit"` to `"pkce"` in `client.ts`. Update `ResetPassword.tsx` and `useAuthHashError.ts` to handle PKCE code exchange instead of hash fragments. | 2-3 | Security Engineer |
| 2 | **[P0 #3, #4]** Create migration `031_profile_workspace_delete_policies.sql` adding DELETE policies: `profiles_delete_own` (authenticated, `auth.uid() = id`) and `workspaces_delete_owner` (authenticated, `owner_id = auth.uid()`). | 1 | Database Engineer |
| 3 | **[P0 #2]** Create a Supabase Edge Function `delete-user-auth` that uses `service_role` key to call `supabase.auth.admin.deleteUser(userId)`. Call this from `AccountDeletion.tsx` after data cleanup. | 2-3 | Backend Engineer |
| 4 | **[P0 #1]** Remove `.env` from git tracking: `git rm --cached .env`. Rotate Stripe keys since they are in git history. Verify `.gitignore` is effective. Consider using `.env.example` with placeholder values. | 1 | DevOps |
| 5 | **[P1 #6]** Add `.catch()` to `getSession()` in `AuthContext.tsx` to handle startup failure gracefully (show error state instead of infinite loading). | 1 | Frontend Engineer |
| 6 | **[P1 #7]** Add password strength indicator component to Auth.tsx signup form. Create shared `PASSWORD_MIN_LENGTH` constant. Consider using `zxcvbn` or a lightweight alternative. | 2 | Frontend Engineer |
| 7 | **[P1 #9]** Refactor account deletion to use a single Supabase Edge Function that performs all deletions atomically server-side, including `auth.users` deletion. | 2-3 | Backend Engineer |
| 8 | **[P1 #10]** Replace `console.error` with `logError` in DataExport.tsx and AccountDeletion.tsx. | 1 | Frontend Engineer |
| 9 | **[P1 #11]** Add email change flow in Settings profile tab using `supabase.auth.updateUser({ email })` with confirmation. | 2 | Full-Stack Engineer |
| 10 | **[P1 #12]** Add email invitation system: generate invite link, send via Supabase Edge Function, allow signup with pre-filled workspace association. | 3-4 | Full-Stack Engineer |
| 11 | **[P2 #13]** Extract `getInitials()` into `src/lib/utils.ts` and use across Navbar, Settings, MembersManager. | 1 | Frontend Engineer |
| 12 | **[P2 #14]** Split Auth.tsx into sub-components: `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `PendingVerification`, `PendingReset`. | 2 | Frontend Engineer |
| 13 | **[P2 #15, #16]** Extract `PASSWORD_MIN_LENGTH` constant and `useCooldown` hook. | 1 | Frontend Engineer |
| 14 | **[P2 #17]** Add error handling to Settings.tsx profile/workspace data loading with user-facing error states. | 1 | Frontend Engineer |
| 15 | **[P1 #8]** Add MFA setup UI in Settings security tab using Supabase TOTP enrollment. | 3-4 | Security Engineer |
| 16 | **[P2 #23]** Add social login providers (Google, GitHub) in Auth.tsx with Supabase OAuth. | 2-3 | Full-Stack Engineer |

**Total estimated prompts:** 25-34

---

*End of scan report for Feature 01: Authentication & User Management*
