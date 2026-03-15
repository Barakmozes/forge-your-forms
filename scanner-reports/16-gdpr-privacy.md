# Scanner Report 16: GDPR & Privacy

**Feature**: GDPR & Privacy Compliance
**Scanner**: Claude Opus 4.6
**Date**: 2026-03-15
**Status**: COMPLETE

---

## 1. Touchpoints

| File | Purpose |
|------|---------|
| `src/pages/Privacy.tsx` | Public privacy policy page (i18n-driven, static content) |
| `src/pages/DataExport.tsx` | Authenticated data export page (JSON download) |
| `src/pages/AccountDeletion.tsx` | Authenticated account deletion with two-step confirmation |
| `src/App.tsx:55-58,164-168` | Route registration for `/privacy`, `/data-export`, `/delete-account` |
| `src/i18n/locales/en.json:1534-1647` | English i18n strings for privacy policy and GDPR actions |
| `src/i18n/locales/he.json:1534-1647` | Hebrew i18n strings for privacy policy and GDPR actions |
| `docs/gdpr.md` | GDPR compliance documentation (internal reference) |
| `docs/security-baseline.md` | Security baseline with data protection section |
| `supabase/migrations/001_core_tables_and_enums.sql` | CASCADE foreign keys on core tables |
| `supabase/migrations/003_rls_policies.sql` | RLS policies (no DELETE on workspaces/profiles) |
| `supabase/migrations/024_rls_role_remediation.sql` | Hardened RLS (still no DELETE on workspaces/profiles) |
| `supabase/migrations/027_storage_hardening.sql` | Data retention cron jobs (commented out) |
| `src/pages/Auth.tsx:289-350` | Signup form (no consent/terms checkbox) |
| `src/pages/Index.tsx:354-375` | Landing page footer (no privacy link) |
| `src/components/Navbar.tsx:141-148` | User dropdown menu (no links to data export/delete account) |
| `src/pages/Settings.tsx` | Settings page (no link to privacy, data export, or delete account) |

---

## 2. E2E Flows

### Flow 1: View Privacy Policy
**Path**: User navigates to `/privacy`
**Route**: Public (no auth required) -- `src/App.tsx:165`
**Component**: `Privacy.tsx` -- static i18n-driven page

| Step | Description | Status |
|------|-------------|--------|
| 1 | Navigate to `/privacy` | Works -- public route |
| 2 | Page renders with translated privacy content | Works -- 14 sections rendered |
| 3 | "Back to Home" link at top | Works -- `Link to="/"` |
| 4 | Content covers: data collection, storage, processing, sharing, retention, rights, cookies, security, contact | Works -- comprehensive |
| 5 | Last updated date hardcoded | Works but static: `March 12, 2026` at line 24 |

**Verdict**: PASS (with minor issues -- see Issues section)

**Gaps**:
- No link to `/privacy` from landing page footer (`Index.tsx:364-368`)
- No link to `/privacy` from auth/signup page (`Auth.tsx`)
- No link to `/privacy` from any public form page
- No link to `/privacy` in Navbar or Settings

---

### Flow 2: Request Data Export (Right of Access, Article 15)
**Path**: Authenticated user navigates to `/data-export`, clicks export button
**Route**: Protected -- `src/App.tsx:166`
**Component**: `DataExport.tsx`

| Step | Description | Status |
|------|-------------|--------|
| 1 | Navigate to `/data-export` | Works -- protected route |
| 2 | Page shows export scope | Works -- lists 7 data categories |
| 3 | Click "Export My Data" | Works -- triggers sequential fetches |
| 4 | Progress bar shown | Works -- `Progress` component with % |
| 5 | Queries: profiles, workspaces, forms, submissions, waitlist, feedback, tickets | Works -- 7 parallel queries |
| 6 | JSON blob created and auto-downloaded | Works -- `Blob` + `URL.createObjectURL` |
| 7 | Success toast | Works |

**Verdict**: PARTIAL PASS -- Export is incomplete

**Critical Gaps in Export**:
- **Missing data**: `ticket_messages` -- customer conversations not exported (`DataExport.tsx` does not query this table)
- **Missing data**: `feedback_alerts` -- alert history not exported
- **Missing data**: `waitlist_invites` -- invite records not exported
- **Missing data**: `canned_responses` -- workspace canned responses not exported
- **Missing data**: `tags` and `ticket_tags` -- tag assignments not exported
- **Missing data**: `notifications` -- notification history not exported
- **Missing data**: `webhooks` and `webhook_deliveries` -- not exported
- **Missing data**: `api_keys` -- API key metadata not exported
- **Missing data**: `workflows` and `workflow_runs` -- automation config not exported
- **Missing data**: `activation_events` -- onboarding data not exported
- **Missing data**: `subscriptions` and `usage` -- billing data not exported
- **Missing data**: `enterprise_settings`, `custom_domains` -- enterprise config not exported
- **Missing data**: `error_logs` -- if containing PII
- Uses `select("*")` for all queries (`DataExport.tsx:42,51,58,66,72,78,84`) which includes all columns -- correct for completeness but exports potentially sensitive system fields (IDs, internal metadata)
- No CSV/alternative format option (GDPR Article 20 suggests "structured, commonly used and machine-readable format" -- JSON qualifies but CSV is more portable)

---

### Flow 3: Delete Account (Right to Erasure, Article 17)
**Path**: Authenticated user navigates to `/delete-account`, types confirmation, confirms dialog
**Route**: Protected -- `src/App.tsx:167`
**Component**: `AccountDeletion.tsx`

| Step | Description | Status |
|------|-------------|--------|
| 1 | Navigate to `/delete-account` | Works -- protected route |
| 2 | Danger zone card with consequences list | Works -- 6 consequences listed |
| 3 | Type "DELETE MY ACCOUNT" to enable button | Works -- exact match check at line 38 |
| 4 | Click delete button, AlertDialog confirms | Works -- two-step confirmation |
| 5 | Delete owned workspaces | **FAILS** -- no DELETE RLS policy on `workspaces` |
| 6 | Delete workspace memberships | Works -- `members_delete_owner` policy allows self-removal |
| 7 | Delete notifications | **FAILS** -- no DELETE RLS policy on `notifications` |
| 8 | Delete profile | **FAILS** -- no DELETE RLS policy on `profiles` |
| 9 | Sign out | Works -- calls `signOut()` |
| 10 | Delete `auth.users` record | **NOT IMPLEMENTED** -- requires service_role key |
| 11 | Navigate to `/auth` | Works |
| 12 | Toast shown | Works -- success or failure |

**Verdict**: FAIL -- Critical deletion failures

**Critical Issues**:
1. **P0 -- No DELETE RLS policy on `workspaces`**: The `handleDeleteAccount` function at `AccountDeletion.tsx:44-52` calls `supabase.from("workspaces").delete().eq("id", workspace.id)`. But across ALL migrations (001, 003, 024, 025), there is NO `FOR DELETE` policy on the `workspaces` table. RLS is enabled (`003_rls_policies.sql:7`), so this delete operation will **silently fail** (Supabase returns `{ data: [], error: null }` for RLS-blocked operations). The user sees a success toast but all owned workspaces and their CASCADE children (forms, submissions, waitlist, feedback, tickets, messages, etc.) remain intact.

2. **P0 -- No DELETE RLS policy on `profiles`**: `AccountDeletion.tsx:67-70` calls `supabase.from("profiles").delete().eq("id", user.id)`. No `FOR DELETE` policy exists on `profiles`. This will **silently fail**.

3. **P0 -- No DELETE RLS policy on `notifications`**: `AccountDeletion.tsx:61-64` calls `supabase.from("notifications").delete().eq("user_id", user.id)`. No `FOR DELETE` policy exists on `notifications`. This will **silently fail**.

4. **P0 -- auth.users record not deleted**: The comment at `AccountDeletion.tsx:72` acknowledges this: "auth user deletion requires service_role -- handled server-side or manually". But no server-side implementation (edge function or RPC) exists. The auth record persists, meaning the user's email remains in the system and they cannot re-register.

5. **P1 -- Error handling is weak**: The workspace deletion loop at `AccountDeletion.tsx:44-52` catches errors with `console.error` but continues silently. If the first workspace fails to delete, remaining steps still run. The user sees "Account deleted" toast even though nothing was actually deleted.

6. **P1 -- Missing deletion targets**: Even if RLS policies existed, the code only explicitly deletes: owned workspaces, workspace_members, notifications, profile. It does NOT explicitly delete: `activation_events`, `onboarding` status, or any data in workspaces where the user is a member but not owner (submitted tickets, feedback, etc. as a workspace member).

---

### Flow 4: Cookie/Storage Consent
**Path**: N/A -- no consent banner exists
**Assessment**: Per `docs/gdpr.md:139-148`, FormForge uses localStorage only for essential/functional purposes:
- `sb-*` keys: Supabase Auth session tokens (essential)
- `formforge-lang`: Language preference (functional, `src/i18n/index.ts:21`)
- Theme preference (functional)

No tracking cookies, no advertising scripts, no analytics cookies.

**Verdict**: PASS -- No consent banner required per GDPR for essential/functional storage. Assessment is documented.

---

### Flow 5: Data Portability (Article 20)
**Path**: Same as Data Export (Flow 2)
**Format**: JSON -- machine-readable, structured
**Verdict**: PARTIAL PASS -- JSON format is acceptable for portability, but export is incomplete (same gaps as Flow 2)

---

### Flow 6: Consent at Signup
**Path**: User signs up at `/auth`
**Component**: `Auth.tsx:289-350`

| Step | Description | Status |
|------|-------------|--------|
| 1 | Signup form shows | Works |
| 2 | Privacy policy link | **MISSING** -- no link to `/privacy` |
| 3 | Terms of service | **MISSING** -- no terms page exists |
| 4 | Consent checkbox | **MISSING** -- no "I agree" checkbox |

**Verdict**: FAIL -- No consent mechanism at signup

---

### Flow 7: Consent on Public Form Submissions
**Path**: Anonymous user submits data on `/f/:id` pages
**Components**: `FormRenderer.tsx`, `WaitlistLandingPage.tsx`, `FeedbackSurveyPage.tsx`, `SupportSubmitPage.tsx`

| Step | Description | Status |
|------|-------------|--------|
| 1 | Privacy notice before submission | **MISSING** on all 4 public form types |
| 2 | Link to privacy policy | **MISSING** on all 4 public form types |
| 3 | Consent checkbox | **MISSING** on all 4 public form types |

**Verdict**: FAIL -- No consent or privacy notice on public data collection forms. This is a significant GDPR gap. When collecting PII (email, name) from anonymous visitors, a notice about data processing is required under Articles 13-14.

---

## 3. Cross-Dependencies

| Dependency | Feature | Impact |
|------------|---------|--------|
| RLS policies (migrations 003, 024) | Account Deletion | **BLOCKER** -- missing DELETE policies prevent account deletion |
| Auth service_role | Account Deletion | **BLOCKER** -- auth.users cannot be deleted from client |
| Supabase CASCADE FKs | Account Deletion | Dependent -- workspace deletion cascades to forms, submissions, etc. |
| WorkspaceContext | Data Export, Account Deletion | Both consume `workspaces` from context to scope queries |
| AuthContext | Data Export, Account Deletion | Both require authenticated session |
| i18n | All GDPR pages | All content is i18n-ized (en, he) |
| Settings page | GDPR discoverability | No links to GDPR pages from Settings |
| Navbar | GDPR discoverability | No links to GDPR pages from user menu |
| Landing page | Privacy discoverability | No link to `/privacy` in footer |
| Signup page | Consent | No consent mechanism |
| Public form pages | Data collection consent | No privacy notice or consent |
| Stripe (billing) | Data deletion | Stripe subscription not cancelled on account deletion |
| Edge functions | Account deletion | No edge function exists for service_role-based user deletion |
| Scanner Report 02 | Workspace Management | Confirmed: "No DELETE policy on workspaces table" flagged there too |

---

## 4. Parallelism Assessment

| Work Item | Dependencies | Parallelizable |
|-----------|-------------|----------------|
| Add DELETE RLS policies (workspaces, profiles, notifications) | None | YES -- new migration |
| Create account deletion edge function | None | YES -- standalone function |
| Complete data export (add missing tables) | None | YES -- extend DataExport.tsx |
| Add privacy link to landing footer | None | YES -- edit Index.tsx |
| Add privacy/terms link to signup page | None | YES -- edit Auth.tsx |
| Add privacy notice to public forms | None | YES -- edit 4 components |
| Add GDPR links to Settings/Navbar | None | YES -- edit Settings.tsx, Navbar.tsx |
| Implement data retention cron jobs | pg_cron extension | BLOCKED -- requires Supabase Dashboard action |

All frontend work items can be parallelized. The migration and edge function are independent.

---

## 5. Security Audit

### PII Inventory

| Table | PII Fields | Collected From | Deletable? |
|-------|-----------|----------------|------------|
| `auth.users` | email, password hash | Signup | NO -- no service_role endpoint |
| `profiles` | email, full_name, avatar_url | Signup + Settings | NO -- no DELETE policy |
| `workspaces` | name, owner_id | User creation | NO -- no DELETE policy |
| `submissions` | submitted_by_email, submitted_by_name, data (JSONB -- may contain any PII) | Public forms | Only via CASCADE (if workspace deleted) |
| `waitlist_entries` | email, name | Public waitlist | Only via CASCADE |
| `feedback_responses` | respondent_email, respondent_name, follow_up (free text) | Public survey | Only via CASCADE |
| `tickets` | submitted_by_email, submitted_by_name, description | Public support | Only via CASCADE |
| `ticket_messages` | sender_email, sender_name, message (free text) | Ticket replies | Only via CASCADE |

### PII Exposure Risks

1. **Data export exposes all fields**: `DataExport.tsx` uses `select("*")` for every table, which includes internal IDs, timestamps, and all PII. This is correct for a data subject access request but should be documented clearly.

2. **Console logging**: `AccountDeletion.tsx:50` logs workspace deletion errors to console (`console.error("Failed to delete workspace:", error)`). The error object may contain PII in error messages. `AccountDeletion.tsx:82` logs the full exception.

3. **Navbar displays user email**: `Navbar.tsx:142` renders `{user?.email}` in the dropdown -- acceptable for authenticated context.

4. **Public ticket tracking**: `tickets_select_customer` RLS policy (`025_policy_hardening.sql:113-122`) allows anonymous SELECT on all tickets for active support forms. Client-side filtering by ticket_number + email provides weak security -- an attacker can enumerate tickets without knowing the email.

5. **No PII encryption at application level**: PII stored in plaintext in PostgreSQL. Encryption at rest is Supabase-managed (AES-256) per `docs/gdpr.md:157`.

6. **No audit trail for data access/export**: No logging when a user exports their data or when PII is accessed. `docs/security-baseline.md:113` notes "Audit logging: Not implemented".

### Encryption

| Layer | Status |
|-------|--------|
| At rest | AES-256 (Supabase managed) |
| In transit | TLS 1.2+ (Supabase enforced) |
| Application-level PII encryption | NOT IMPLEMENTED |
| Backup encryption | Supabase managed |

---

## 6. Code Architecture & Quality

### Privacy.tsx
- **Quality**: Good -- clean, i18n-driven, responsive
- **Architecture**: Static page, no data fetching, no state
- **RTL support**: Yes -- `ArrowLeft` with `rtl:rotate-180`, `me-2` for margins
- **Dark mode**: Yes -- via `prose-slate dark:prose-invert`
- **Issue**: Hardcoded date `March 12, 2026` at line 24 instead of from i18n

### DataExport.tsx
- **Quality**: Good -- progress bar, loading state, error handling
- **Architecture**: Sequential Supabase queries with progress tracking
- **Type safety**: Uses `ExportData` interface (lines 13-22) with `Record<string, unknown>` -- loose typing but acceptable for export
- **Issue**: No pagination -- large datasets may time out or OOM the browser
- **Issue**: `select("*")` queries fetch all columns including internal system columns

### AccountDeletion.tsx
- **Quality**: Good UX -- two-step confirmation, clear consequences
- **Architecture**: Sequential deletion with error swallowing
- **Critical bug**: All deletion operations silently fail due to missing RLS policies
- **Type safety**: Adequate -- uses AuthContext and WorkspaceContext properly
- **I18n**: Fully translated (en + he)
- **RTL**: `dir="ltr"` on confirmation input (line 135) -- correct for English phrase

### i18n Coverage
- Both `en.json` and `he.json` have complete `privacy` (lines 1534-1603) and `gdpr` (lines 1605-1647) sections
- All strings are translated

---

## 7. Error Handling & Resilience

| Scenario | Handling | Quality |
|----------|----------|---------|
| Data export network failure | try/catch with destructive toast | GOOD |
| Data export with empty datasets | Null coalescing: `forms \|\| []` | GOOD |
| Account deletion failure | try/catch with toast + console.error | POOR -- errors swallowed per-step |
| Workspace deletion RLS block | Silent fail -- `{ data: [], error: null }` | CRITICAL -- user told success when nothing deleted |
| Profile deletion RLS block | Silent fail | CRITICAL |
| Notification deletion RLS block | Silent fail | CRITICAL |
| Large data export (thousands of records) | No pagination, no chunking | MEDIUM RISK -- browser OOM |
| Race condition: user signs out mid-deletion | Partial deletion possible | LOW RISK |

---

## 8. Documentation Audit

| Document | Exists | Accurate | Complete |
|----------|--------|----------|----------|
| `docs/gdpr.md` | YES | PARTIALLY | YES for documentation scope |
| `docs/security-baseline.md` (section 7) | YES | YES | Acknowledges gaps |
| Privacy Policy (in-app) | YES | YES | Comprehensive |
| Terms of Service | NO | N/A | **MISSING** entirely |
| Cookie Policy | NOT NEEDED | N/A | Documented in gdpr.md |
| Data Processing Agreement (DPA) | NO | N/A | Referenced in gdpr.md but no link |

**gdpr.md accuracy issues**:
- States `/delete-account` page works (`gdpr.md:78-83`) but deletion silently fails due to missing RLS policies
- States "CASCADE deletes ensure no orphaned personal data" (`gdpr.md:160`) but the trigger (workspace deletion) never fires
- States auth.users deletion "requires manual admin deletion or edge function" (`gdpr.md:82`) -- neither exists
- Recommends cron jobs for data retention (`gdpr.md:106-111`) but these are commented out in `027_storage_hardening.sql:78-79`

---

## 9. Product Growth & Innovation

### Current State
- Privacy policy page exists and is comprehensive
- Data export exists but is incomplete
- Account deletion exists but is non-functional
- No consent tracking, no terms of service, no privacy links in navigation

### Opportunities
1. **Privacy dashboard in Settings**: Add a dedicated "Privacy & Data" tab in Settings with links to data export, account deletion, and privacy policy. Currently these pages are orphaned with no navigation path.
2. **Granular data export**: Let users select which data categories to export (profile only, specific forms, date range filter).
3. **Export history**: Track when users exported their data (audit trail).
4. **Data anonymization**: Offer to anonymize (pseudonymize) old submission data rather than full deletion -- useful for preserving analytics.
5. **Consent management**: Track and display what the user consented to and when. Allow withdrawal of consent.
6. **Data subject request portal**: For form respondents (non-users) to request their data or deletion -- they currently have no mechanism.
7. **Automated retention**: Implement the documented cron jobs for error_logs cleanup.
8. **Terms of Service page**: Create `/terms` page to complement `/privacy`.

---

## 10. Issues Found

### P0 -- Critical / Blocking

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P0-1 | **Account deletion silently fails: no DELETE RLS policy on `workspaces`** | `supabase/migrations/003_rls_policies.sql`, `024_rls_role_remediation.sql` -- no `FOR DELETE` policy. Called from `AccountDeletion.tsx:44-52` | GDPR Right to Erasure (Article 17) non-functional. User data persists after "successful" deletion. Supabase returns `{ data: [], error: null }` for RLS-blocked deletes, so no error is raised. |
| P0-2 | **Account deletion silently fails: no DELETE RLS policy on `profiles`** | Same migrations -- no `FOR DELETE` on `profiles`. Called from `AccountDeletion.tsx:67-70` | Profile PII (email, name, avatar) persists after "deletion" |
| P0-3 | **Account deletion silently fails: no DELETE RLS policy on `notifications`** | Same migrations -- no `FOR DELETE` on `notifications`. Called from `AccountDeletion.tsx:61-64` | Notification data persists |
| P0-4 | **auth.users record never deleted** | `AccountDeletion.tsx:72` acknowledges this gap. No edge function or RPC exists to delete the auth record with service_role | User's email permanently retained in auth system. Cannot re-register. Violates Article 17 Right to Erasure |
| P0-5 | **No consent mechanism at signup** | `Auth.tsx:306-335` -- signup form has no privacy policy link or consent checkbox | GDPR Article 7 requires demonstrable consent. No record of user agreeing to data processing |
| P0-6 | **No privacy notice on public form submissions** | `FormRenderer.tsx`, `WaitlistLandingPage.tsx`, `FeedbackSurveyPage.tsx`, `SupportSubmitPage.tsx` -- no privacy notice, no link to privacy policy | GDPR Articles 13-14 require informing data subjects before collecting PII (email, name). All 4 public form types collect PII without notice |

### P1 -- High

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P1-1 | **Data export is incomplete** -- missing 12+ tables | `DataExport.tsx:37-98` -- only queries 7 tables; missing ticket_messages, feedback_alerts, waitlist_invites, canned_responses, tags, ticket_tags, notifications, webhooks, api_keys, workflows, subscriptions, usage, enterprise_settings, custom_domains, activation_events | Incomplete Right of Access (Article 15). User cannot see all data held about them |
| P1-2 | **No navigation path to GDPR pages** | `Navbar.tsx`, `Settings.tsx`, `Index.tsx` -- no links to `/privacy`, `/data-export`, or `/delete-account` | Pages exist but are effectively hidden. Users cannot discover their GDPR rights without knowing the URLs directly |
| P1-3 | **Privacy policy not linked from landing page footer** | `Index.tsx:364-368` -- footer has Pricing, Templates, Features, Sign In but no Privacy link | Visitors cannot access the privacy policy before signing up |
| P1-4 | **Stripe subscription not cancelled on account deletion** | `AccountDeletion.tsx:37-91` -- no Stripe cancellation logic | If user deletes account, Stripe continues billing. Orphaned subscription with no associated workspace |
| P1-5 | **Error swallowing in account deletion** | `AccountDeletion.tsx:44-52` -- workspace deletion errors logged to console but process continues; user sees "success" toast | User believes account is deleted when it may not be |
| P1-6 | **gdpr.md states deletion works but it does not** | `docs/gdpr.md:78-82` claims `/delete-account` page handles erasure | Documentation is actively misleading; creates false compliance confidence |

### P2 -- Medium

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P2-1 | **No Terms of Service page** | No `/terms` route, no `Terms.tsx` component | Legal gap -- no enforceable terms |
| P2-2 | **Privacy policy date hardcoded** | `Privacy.tsx:24` -- `March 12, 2026` not i18n-ized | Must manually update code when policy changes |
| P2-3 | **No data retention automation** | `027_storage_hardening.sql:78-79` -- cron jobs for cleanup are commented out; pg_cron not enabled | `error_logs` and `ai_cache` grow indefinitely |
| P2-4 | **No audit log for data exports** | `DataExport.tsx` -- no server-side record of when data was exported | Cannot prove compliance with access request timelines |
| P2-5 | **Large dataset export may OOM browser** | `DataExport.tsx` -- fetches all records with no pagination | Users with thousands of submissions/tickets could crash the tab |
| P2-6 | **No mechanism for form respondents to request data/deletion** | No portal for anonymous submitters to exercise GDPR rights | Respondents (non-users) who submitted PII via public forms have no self-service path |
| P2-7 | **Confirmation phrase not localized** | `AccountDeletion.tsx:35` -- `const confirmPhrase = "DELETE MY ACCOUNT"` is always English, even for Hebrew users | Confusing UX for non-English users |

---

## 11. Recommended Fix Path

### Phase 1: Critical Fixes (P0) -- Must-fix before launch

**Step 1: Create DELETE RLS policies (new migration)**
```sql
-- File: supabase/migrations/031_gdpr_delete_policies.sql
CREATE POLICY "workspaces_delete_owner" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

**Step 2: Create edge function for auth.users deletion**
- New edge function `delete-account` that accepts authenticated JWT
- Validates user identity, then calls `supabase.auth.admin.deleteUser(userId)` with service_role
- Call this from `AccountDeletion.tsx` after application data deletion

**Step 3: Add consent at signup**
- Add privacy policy link to `Auth.tsx` signup form
- Add "I agree to the Privacy Policy" checkbox (required)
- Store consent timestamp in `profiles` table (new column: `privacy_consent_at`)

**Step 4: Add privacy notice to public forms**
- Add a small footer line on all 4 public form types: "By submitting, you agree to our [Privacy Policy](/privacy)"
- Link to `/privacy` page

### Phase 2: High Priority (P1)

**Step 5: Complete data export**
- Add missing tables to `DataExport.tsx`: ticket_messages, feedback_alerts, waitlist_invites, canned_responses, tags, ticket_tags, notifications, webhooks, api_keys, workflows, subscriptions, usage

**Step 6: Add navigation to GDPR pages**
- Settings page: Add "Privacy & Data" tab with links to data export and account deletion
- Landing page footer: Add "Privacy Policy" link
- Navbar user dropdown: Add "Privacy" and "Delete Account" menu items

**Step 7: Cancel Stripe subscription on account deletion**
- Before deleting workspace data, call Stripe API to cancel active subscriptions

**Step 8: Fix error handling in account deletion**
- Check return values from each delete operation
- If any delete fails, show accurate error toast with details
- Do not show "success" if operations failed

### Phase 3: Medium Priority (P2)

**Step 9**: Create Terms of Service page (`/terms`)
**Step 10**: Enable pg_cron and register data retention cron jobs
**Step 11**: Add audit logging for data exports and account deletions
**Step 12**: Paginate data export for large datasets
**Step 13**: Localize the confirmation phrase in AccountDeletion
**Step 14**: Create respondent data request mechanism

### Estimated Effort

| Phase | Items | Effort |
|-------|-------|--------|
| Phase 1 (P0) | 4 steps | 2-3 days |
| Phase 2 (P1) | 4 steps | 1-2 days |
| Phase 3 (P2) | 6 steps | 3-4 days |
| **Total** | **14 steps** | **6-9 days** |

---

## Summary

The GDPR feature has a solid foundation -- privacy policy page, data export page, and account deletion page all exist with good UX, i18n support (en/he), and RTL compatibility. However, the implementation has **critical functional failures**:

1. **Account deletion is entirely non-functional** due to missing DELETE RLS policies on `workspaces`, `profiles`, and `notifications`. All delete operations silently succeed (Supabase returns no error for RLS-blocked operations) while leaving all data intact. The `auth.users` record is also never deleted.

2. **Data export is incomplete**, covering only 7 of 19+ tables with PII.

3. **No consent mechanism exists** -- neither at signup nor on public form submissions where PII is collected from anonymous visitors.

4. **GDPR pages are undiscoverable** -- no links from Settings, Navbar, landing page, or signup page.

The gap between documentation claims (`docs/gdpr.md` states compliance) and actual behavior (deletion does nothing) represents the most urgent compliance risk.
