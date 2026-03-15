# Changelog — FormForge Pipeline Run (2026-03-15)

## Summary

This pipeline run executed **17 agents** across **7 batches** to address security vulnerabilities, fix bugs, improve UX/accessibility, add new features, and document the system.

- **Agents run**: 01–17 (Agent 18 = this documentation pass; Agents 19–20 pending)
- **Batches**: 7 sequential batches
- **Migrations applied**: 7 new SQL migration files (031–037)
- **Files touched**: ~60 source files
- **Issues addressed**: 50+ P0/P1 issues resolved, with ~20 P1–P2 issues deferred

---

## Security Fixes

### P0 (Critical)

- **`.env` tracked in git** (Agent 01): Removed from git tracking via `git rm --cached`; additional secret patterns added to `.gitignore` (*.pem, *.key, credentials.json, service-account*.json).
- **Implicit OAuth flow** (Agent 01): Changed Supabase `flowType` from `"implicit"` to `"pkce"` in `src/integrations/supabase/client.ts`.
- **Mailchimp API key stored in plaintext** (Agent 01): Secrets now encrypted client-side via AES-GCM (Web Crypto API) before DB write. `useIntegrations` hook transparently encrypts on save and decrypts on read.
- **No DELETE RLS policies** (Agent 02): DELETE policies added for `profiles`, `workspaces`, `notifications`, `waitlist_entries`, `feedback_responses`, `submissions` in migration `031_delete_rls_policies.sql`.
- **Viewers could create forms** (Agent 02): `forms_insert_editor` policy now requires `owner` or `editor` role. Viewers can no longer create forms.
- **Viewers could CRUD canned_responses, tags, webhooks, api_keys** (Agent 02): All restricted to `editor+`; `api_keys` restricted to `owner` only.
- **auth.users never deleted on account deletion** (Agent 02): New `delete-account` edge function atomically deletes all user data and the `auth.users` record via service_role.
- **No workspace membership check in create-checkout** (Agent 03): Added workspace membership verification (403 if not member).
- **No workspace membership check in create-portal-session** (Agent 03): Added membership + owner-only restriction (billing portal can cancel subscriptions).
- **No price ID validation in checkout** (Agent 03): Price IDs now validated against allowlist from env vars with hardcoded fallbacks.
- **classify-ticket no workspace check** (Agent 03): Added workspace membership check; 403 if not member.
- **churn-score no workspace check** (Agent 03): Added workspace membership check immediately after JWT validation.
- **No consent at signup** (Agent 04): `ConsentCheckbox` component added to signup form; blocks submission until checked; stores `consent_given_at` timestamp in `profiles` table.
- **No privacy notice on public forms** (Agent 04): `PrivacyNotice` component added to all 4 public form types (WaitlistLandingPage, FeedbackSurveyPage, SupportSubmitPage, FormRenderer).
- **isOwnerBypass defeated all plan gating** (Agent 05): Owner bypass removed entirely from `usePlanLimits` and `FeatureGate`; no plan gating can be bypassed.
- **Fake DNS verification in custom domains** (Agent 14): `handleVerifyDomain` no longer sets `verified: true` client-side; shows pending toast with DNS propagation notice.
- **ReDoS in phone validation** (Agent 09): `new RegExp(phonePattern)` replaced with hardcoded safe phone regex `SAFE_PHONE_RE`.

### P1 (High Priority)

- **Webhook secrets stored in plaintext** (Agent 01): All integration secrets (Slack webhook_url, Mailchimp api_key, ConvertKit api_key) encrypted via AES-GCM before DB write.
- **Weak password validation** (Agent 01): New `src/lib/passwordValidation.ts` utility enforces 8+ chars, uppercase, lowercase, number, and special character. Applied in `Auth.tsx` signup handler.
- **lookup_profile_for_invite email enumeration** (Agent 02): `lookup_profile_for_invite` function scoped to specific workspace owner; requires `workspace_id_input` parameter (migration `033_additional_rls_fixes.sql`).
- **Missing SET search_path in SECURITY DEFINER functions** (Agent 02): Fixed `is_workspace_member`, `get_workspace_role`, `notify_on_submission`, `notify_on_ticket_assigned` in migration `033_additional_rls_fixes.sql`.
- **Ticket enumeration** (Agent 02): `tickets_select_customer` policy narrowed to form-scope (partial fix; full server-side email token auth deferred).
- **Unauthenticated message injection** (Agent 02): `messages_insert_customer` policy now requires email match or workspace membership.
- **feedback_alerts public INSERT** (Agent 02): Policy removed; triggers bypass RLS and insert alerts safely.
- **Non-constant-time webhook signature comparison** (Agent 03): Replaced `===` string comparison with XOR byte-loop constant-time comparison in `stripe-webhook/index.ts`.
- **dispatch-webhook had no authentication** (Agent 03): JWT auth + workspace membership check added.
- **slack-notify had no authentication** (Agent 03): JWT auth + optional workspace membership check added.
- **No prompt length validation in ai-generate** (Agent 10): MAX_PROMPT_LENGTH = 10,000 chars enforced; returns 400 on empty or too-long prompt.
- **No prompt injection mitigation** (Agent 10): `sanitizeUserInput()` function added to all 3 AI edge functions; user content wrapped in `<user_content>` XML delimiters; anti-injection system prompt instructions added.
- **signInWithSSO using wrong domain** (Agent 14): `AuthContext.tsx` now uses `enterprise.sso_domain` (email domain) instead of workspace slug for Supabase SSO.
- **Viewer role could UPDATE feedback_responses** (Agent 02): `feedback_responses_update_editor` policy now requires `editor+`.
- **Webhook RBAC allows viewers** (Agent 02): Webhook policies restricted to `editor+`.
- **CSV injection in waitlist export** (Agent 07): `sanitizeCSVValue()` helper prefixes formula characters, escapes quotes, wraps in double quotes; UTF-8 BOM added to both CSV export functions.
- **Supabase error messages exposed to users** (Agent 09): pg error codes mapped to friendly strings; real errors logged to console only.
- **Open redirect via redirectUrl** (Agent 09): Protocol validation added before `window.location` redirect.

---

## Bug Fixes

### P0 (Critical)

- **Table row click missing in SupportDashboard** (Agent 06): `onClick` added to `TableRow` with `stopPropagation` on checkbox cell.
- **"View All Tickets" broken route** (Agent 06): Changed to `setActiveTab("tickets")` — there is no `/forms/:id/tickets` route.
- **SLA "View Ticket" broken route** (Agent 06): Changed to `navigate(/forms/${formId}/tickets/${ticket.id})`.
- **Kanban card navigation broken** (Agent 06): `KanbanColumn` destructures and passes `onNavigate`; `KanbanCard` has `onClick`.
- **Email case mismatch on ticket storage** (Agent 06): Added `.toLowerCase()` to `submitted_by_email` and `sender_email` in `SupportSubmitPage.tsx`.
- **Broken anon duplicate check in WaitlistLandingPage** (Agent 07): Replaced SELECT pre-check (blocked by RLS) with INSERT-first approach; catches PostgreSQL error code `23505` unique constraint violation.
- **Broken anon count query in WaitlistLandingPage** (Agent 07): `fetchTotalSignups` removed; `totalSignups` now set from `inserted.position` after successful signup.

### P1 (High Priority)

- **Auto-save stale closure in FormBuilder** (Agent 09): `save` function wrapped in `useCallback`; dependencies updated to `[save, loading]`.
- **Mode not persisted on form save** (Agent 09): `mode` field added to Supabase update payload in `save()`.
- **navigate() called during render in FormDashboard** (Agent 09): Replaced with `<Navigate replace />` declarative redirect.
- **ai-analyze cache key too weak** (Agent 10): Cache key now uses sorted submission IDs + form_id + locale (was: form_id:count:locale).
- **Condition operator field ignored in execute-workflow** (Agent 11): `evaluateByOperator()` helper added; handles equals, not_equals, contains, not_contains, greater_than, less_than, is_empty, is_not_empty operators.
- **waitlist_milestone fires on every signup** (Agent 11): Edge function guard checks exact position match to configured milestone (default set: 10, 25, 50, 100, 250, 500, 1000).
- **Redundant RPC call in WaitlistLandingPage** (Agent 07): Removed `increment_referral_count` RPC block; DB trigger `handle_waitlist_referral` handles this on INSERT.
- **Auth redirect from templates broken** (Agent 12): `UseTemplateButton` stores template context in sessionStorage; `TemplateBrowser` restores redirect after authentication.
- **FirstFormGuide swallows form creation errors** (Agent 12): Error toast added to `handleCreateForm`.
- **completeOnboarding has no error handling** (Agent 12): `markOnboardingComplete` throws on DB error; `OnboardingWizard` catches with toast and disables buttons during completion.
- **useNotifications fetch error leaves loading state forever** (Agent 13): `try/catch/finally` ensures `setLoading(false)` always runs.
- **NotificationPanel CRUD failures not handled** (Agent 13): `markAsRead`, `markAllAsRead`, `deleteNotification` failures now show destructive toasts.
- **assigned_to shows UUID in SupportDashboard** (Agent 06): Workspace members fetched; UUID resolved to display name/email.
- **Delete canned response with no confirm dialog** (Agent 06): `AlertDialog` added with Cancel/Delete actions.
- **churn-score N+1 query** (Agent 03): Per-email loop (3-4 queries each) replaced with 2 bulk queries + in-memory Map aggregation.
- **churn-score `last_interaction` field name mismatch** (Agent 03): Fixed: edge function now writes `last_interaction_at` to match frontend `ChurnScore` interface.
- **stripe-webhook returns 200 on errors** (Agent 03): Error handler now returns 500 so Stripe retries transient failures; unknown event types still return 200.
- **getSession() has no error handling** (Agent 15): Wrapped in `try/catch/finally`; `error` state and `retry` function exposed via `useAuth()`.
- **isInitialLoad set via setTimeout in FormBuilder** (Agent 09): Changed to set after data fetch, eliminating fragile race condition.

---

## Performance Improvements

- **Feedback responses pagination** (Agent 08): `useFeedback` now paginates 50 responses/page via Supabase `.range()`; `FeedbackDashboard` shows Previous/Next controls. Analytics computed from a separate lightweight all-rows fetch (8 fields) so NPS/trends remain accurate.
- **Ticket list pagination** (Agent 06): Client-side pagination in `SupportDashboard` (PAGE_SIZE=25) with Previous/Next controls.
- **Waitlist entries pagination** (Agent 07): `useWaitlist` paginates 50 entries/page; `WaitlistEntries.tsx` shows Previous/Next controls.
- **FormResponsesTab unbounded query** (Agent 09): `.limit(500)` added with truncation warning banner.
- **Submissions 1000-row silent truncation** (Agent 09): `pageSize` reduced from 1000 to 200; visible warning banner when total > fetched count.
- **churn-score N+1 eliminated** (Agent 03): See bug fixes above.
- **ilike email matching eliminated** (Agent 03): Emails lowercased before Set; bulk queries use `.in()` — leverages index instead of full table scan.
- **Auto-close fires on every fetch in useTickets** (Agent 06): `autoCloseRanRef` guard added — auto-close runs once per component mount.

---

## UX & Accessibility

- **Dark mode support** (Agent 16): `ThemeProvider` from `next-themes` mounted as outermost provider in `App.tsx` with `defaultTheme="system"`. Dark mode toggle added to Navbar (desktop + mobile).
- **Skip-to-content link** (Agent 16): Added to `AppLayout.tsx` using `sr-only focus:not-sr-only` Tailwind pattern; `<main id="main-content" tabIndex={-1}>` landmark added.
- **Hamburger button accessibility** (Agent 16): `aria-label`, `aria-expanded`, `aria-controls` added to mobile menu button in `Navbar.tsx`.
- **Nav landmarks** (Agent 16): `aria-label="Main navigation"` and `"Mobile navigation"` added to nav elements.
- **Notification panel keyboard accessibility** (Agent 16): Notification items: `role="button"`, `tabIndex={0}`, `onKeyDown`, `aria-label`; delete button aria-label added.
- **Dynamic document titles** (Agent 16): `useDocumentTitle` hook created at `src/hooks/useDocumentTitle.ts`; applied to Forms, FormBuilder, FormDashboard, Submissions, Auth, Settings, CannedResponses, NotFound pages. PublicForm.tsx sets title + og meta from form data.
- **SEO meta tags** (Agent 16): `og:image` and `twitter:image` meta tags added to `index.html` (reference `/og-image.png` — file to be created).
- **Settings email change** (Agent 16): Email change section added to Settings profile tab with Supabase `updateUser`.
- **Settings workspace creation** (Agent 16): Create Workspace dialog added to Settings workspace tab.
- **Settings tab scroll indicator** (Agent 16): Gradient fade indicator on mobile for scrollable tabs.
- **Notification loading indicator** (Agent 13): Loading text shown while notifications fetch; inline error message on fetch failure instead of spinner.
- **WorkspaceContext error state** (Agent 02): Error state with user-visible message added; workspace selection persisted in localStorage.
- **MembersManager error state** (Agent 02): `fetchError` state added; shows error message instead of silent empty list.
- **GDPR navigation** (Agent 04): "Export My Data" and "Delete Account" links added to Navbar user dropdown; "Privacy Policy" link added to landing page footer.
- **Data export completeness** (Agent 04): Now exports 15 tables (was 7). Added: ticket_messages, feedback_alerts, waitlist_invites, canned_responses, tags, ticket_tags, notifications.

---

## Architecture Changes

- **PKCE auth flow** (Agent 01): Supabase client now uses PKCE flow — more secure for SPAs than implicit flow.
- **FormField type consolidation** (Agent 09): Canonical `FormField` type defined in `src/types/forms.ts`; `FormRenderer.tsx` re-exports for backward compatibility. Duplicate inline definitions removed from FormRenderer and FormBuilder.
- **AuthContext error + retry** (Agent 15): `useAuth()` now returns `error: string | null` and `retry: () => void`. Backward-compatible — existing consumers unaffected.
- **WorkspaceContext improvements** (Agent 02): `slug` field added to `Workspace` interface; error state and localStorage persistence added.
- **Hook return type additions** (multiple agents): All changes are backward-compatible additions:
  - `useNotifications`: added `error: string | null`
  - `useWaitlist`: added `page`, `setPage`, `totalPages`, `PAGE_SIZE`
  - `useFeedback`: added `page`, `setPage`, `totalCount`, `totalPages`, `PAGE_SIZE`, `analyticsData`
  - `useAuth`: added `error: string | null`, `retry: () => void`
- **Provider hierarchy** (Agent 16): `ThemeProvider` placed as outermost wrapper in `App.tsx`, outside `QueryClientProvider`. Architecturally correct for `next-themes`.
- **Enterprise types** (Agent 14): `CustomDomain` interface extracted to `src/types/enterprise.ts`; `EnterpriseSettings` in `useEnterprise.ts` updated with `sso_domain: string | null`.
- **Enterprise SSO domain** (Agent 14): `sso_domain` column added to `enterprise_settings` table (migration `037_enterprise_sso_domain.sql`); `SsoConfig.tsx` has domain input field; `AuthContext.signInWithSSO` uses correct email domain.

---

## New Features

- **AES-GCM secret encryption** (Agent 01): `src/lib/secretEncryption.ts` — exports `encryptSecret`, `decryptSecret`, `maskSecret`, `isEncrypted`. Used for integration webhook and API key secrets.
- **Password strength validation** (Agent 01): `src/lib/passwordValidation.ts` — `validatePassword()` utility. Applied at signup.
- **delete-account edge function** (Agent 02): `supabase/functions/delete-account/index.ts` — atomically deletes all user data including `auth.users` via service_role.
- **Consent tracking** (Agent 04): `src/components/gdpr/ConsentCheckbox.tsx` and `src/components/gdpr/PrivacyNotice.tsx` — reusable GDPR components. Consent timestamp stored in `profiles.consent_given_at`.
- **Workflow condition operators** (Agent 11): `evaluateByOperator()` in `execute-workflow` now handles 8 operator types for flexible workflow conditions.
- **Webhook retry with exponential backoff** (Agent 11): `fire_webhook` action retries dispatch-webhook up to 3 times (1s/2s/4s backoff).
- **Custom domain config** (Agent 14): `custom_domains` table with RLS (migration `022_custom_domains.sql`); `CustomDomainConfig.tsx` stores domains without fake client-side verification.
- **Enterprise settings table** (Agent 14): `enterprise_settings` table (migration `021_enterprise.sql`) with RLS and realtime.
- **useDocumentTitle hook** (Agent 16): `src/hooks/useDocumentTitle.ts` — sets `document.title` per route; restores on unmount.
- **Dark mode toggle** (Agent 16): Full dark mode support via `next-themes` with system preference detection.
- **workspace_selection persistence** (Agent 02): Workspace selection stored in localStorage; restored on page reload.
- **Template redirect via sessionStorage** (Agent 12): Template auth redirect preserved through authentication flow via sessionStorage.
- **nps_below_threshold server-side guard** (Agent 11): Execute-workflow skips run if `nps_score >= threshold` (default 7); removed from TriggerNode dropdown (FeedbackSurveyPage not wired to dispatch trigger).

---

## Database Migrations

| Migration | Purpose | Agent |
|-----------|---------|-------|
| `031_delete_rls_policies.sql` | DELETE RLS policies for profiles, workspaces, notifications, waitlist_entries, feedback_responses, submissions | Agent 02 |
| `032_role_based_policy_fixes.sql` | Editor+ restrictions for forms INSERT, canned_responses, tags, webhooks; owner-only for api_keys; feedback_responses UPDATE restricted to editor+ | Agent 02 |
| `033_additional_rls_fixes.sql` | Ticket enumeration fix, message injection prevention, feedback_alerts public INSERT removed, search_path hardening on SECURITY DEFINER functions, lookup_profile_for_invite workspace-scoped | Agent 02 |
| `034_consent_tracking.sql` | Adds `consent_given_at TIMESTAMPTZ` to `profiles` table | Agent 04 |
| `035_gdpr_consent_column.sql` | Adds index on `consent_given_at` (Note: may be duplicate of 034 — see Known Issues) | Agent 04 |
| `036_feedback_alerts_realtime.sql` | Adds `feedback_alerts` to `supabase_realtime` publication (idempotent DO block) | Agent 08 |
| `037_enterprise_sso_domain.sql` | Adds `sso_domain TEXT` column to `enterprise_settings` table | Agent 14 |

**Previously applied migrations (pre-pipeline)**: `021_enterprise.sql`, `022_custom_domains.sql` (applied to production during Agent 14's session).

---

## Known Issues

### P0 Issues Remaining (Not Resolved in This Pipeline)

| Issue | Description | Owner |
|-------|-------------|-------|
| P0 #21 | No server-side submission limit enforcement — `canAcceptSubmission()` not called server-side | Agent 05 (deferred) |
| P0 #22 | `canAcceptSubmission()` not wired in public form submission flows (FormRenderer, WaitlistLandingPage, FeedbackSurveyPage, SupportSubmitPage) | Agents 05, 06, 07, 08 (deferred) |
| P0 #24 | `classify-ticket` returns 401 for unauthenticated public SupportSubmitPage calls | Agent 03/06 (deferred — requires DB trigger or service role wrapper) |

### P1 Issues Remaining

| Issue | Description | Owner |
|-------|-------------|-------|
| P1 #34 | Editor notification exclusion — only workspace owner gets notified (needs migration to update `handle_feedback_response` trigger) | Agent 08 (deferred) |
| P1 #35 | Ticket enumeration partial fix only (full fix requires server-side email token) | Agent 02 (deferred) |
| P1 #39 | Ticket number race condition — `generate_ticket_number()` uses MAX without advisory lock | Agent 06 (deferred) |
| P1 #56 | Missing UPDATE RLS on templates table | Agent 02 (deferred) |
| P1 #70 | SSO login UI not in Auth.tsx — implementation snippet documented in Agent 14 HANDOFF | Agent 14 (deferred) |
| P1 #72 | White-label not applied on public pages — PoweredByEnforcer integration path documented | Agent 14 (deferred) |
| P1 #74 | Custom domains have no routing (requires CDN/infrastructure changes) | Agent 14 (deferred) |
| P1 #76 | `ticket_message` notification type — no DB trigger. SQL provided in Agent 13 HANDOFF. | Agent 13 (deferred) |
| P1 #77 | Submission notifications only sent to workspace owner. SQL provided in Agent 13 HANDOFF. | Agent 13 (deferred) |
| P1 #85 | Settings tab scroll gradient on mobile | Agent 16 (completed per 16.4) |
| P1 #89 | Stripe subscription not cancelled on account deletion — warning shown, manual cancellation required | Agent 04 (deferred) |

### P2 Technical Debt

- Social proof counter only shows post-signup (no anon-accessible count source)
- Client-side search only covers fetched rows (not full dataset)
- Mobile FormBuilder missing validation editor and ConditionalLogic
- `score_drop` and `keyword` feedback alert types are dead enum values — never triggered
- `dispatch-webhook` scheduled retry processor not implemented (no cron job)
- `run_count` race condition in `execute-workflow`
- `workflows`/`workflow_runs` tables missing from Supabase generated types
- `nps_below_threshold` trigger removed from UI; FeedbackSurveyPage never dispatches it
- Client-side encryption key derived from hardcoded seed (MVP-level — no server-side key management)
- `useDocumentTitle` hook may conflict with AppLayout white-label `document.title` override
- `og-image.png` referenced in index.html but not yet created

### Test Failures (Introduced by This Pipeline)

8 test failures introduced by pagination refactors and plan limit changes:

| Test File | Failures | Root Cause | Responsible Agent |
|-----------|----------|------------|------------------|
| `src/test/lib/stripe.test.ts` | 2 | `getPriceId` expected values changed after plan limit updates | Agent 05 |
| `src/test/hooks/useWaitlist.test.ts` | 3 | Pagination refactor changed hook internals (`.range()` added) | Agent 07 |
| `src/test/hooks/useFeedback.test.ts` | 3 | Split useEffects + `analyticsData` separate fetch broke test mocks | Agent 08 |

### Migration Anomalies

- **Migration 035**: `035_gdpr_consent_column.sql` may be a duplicate of `034_consent_tracking.sql`. Both add `consent_given_at TIMESTAMPTZ` to `profiles`. Since both use `ADD COLUMN IF NOT EXISTS`, no DB failure occurs. Origin unclear — verify and consider removal.

---

## Agent Summary

| Agent | Role | Status | Issues Resolved |
|-------|------|--------|----------------|
| 01 | Credential & Auth Security (SECURITY_ENGINEER) | COMPLETE | P0: .env git tracking, implicit OAuth → PKCE, Mailchimp plaintext; P1: webhook secrets, weak password validation |
| 02 | Database Security / RLS (SECURITY_ENGINEER) | COMPLETE | P0: 6 missing DELETE RLS policies, viewers creating forms, auth.users not deleted, viewer RBAC on canned_responses/tags/webhooks/api_keys; P1: email enumeration, feedback_alerts public INSERT, ticket enumeration, message injection, search_path hardening; UX: WorkspaceContext error state + localStorage |
| 03 | Edge Function Authorization (SECURITY_ENGINEER) | COMPLETE | P0: create-checkout/portal/classify-ticket/churn-score no workspace auth, no price ID validation; P1: constant-time webhook comparison, dispatch-webhook/slack-notify no auth, churn-score N+1, field name mismatch, no per-email error isolation |
| 04 | GDPR & Privacy Compliance (ENGINEER) | COMPLETE | P0: no consent at signup, no privacy notices; P1: incomplete data export, no GDPR navigation, non-atomic account deletion, error swallowing on deletion |
| 05 | Billing & Plan Enforcement (ENGINEER) | COMPLETE | P0: isOwnerBypass removed; P1: plan limit data fixes (Pro/Growth members + support inboxes), support mode now requires Pro not Growth |
| 06 | Support Mode Fixes (ENGINEER) | COMPLETE | P0: 4 broken navigation bugs, email case mismatch; P1: pagination, auto-close guard, UUID resolution, delete confirmation dialog |
| 07 | Waitlist Mode Fixes (ENGINEER) | COMPLETE | P0: anon duplicate check, anon count query; P1: CSV injection, pagination, redundant RPC |
| 08 | Feedback Mode Fixes (ENGINEER) | COMPLETE | P0: no pagination; P1: realtime alerts subscription (+ migration 036), toast convention fix, analytics accuracy fix |
| 09 | Form Builder & Submissions (ENGINEER) | COMPLETE | P0: ReDoS in phone validation; P1: FormField type consolidation, auto-save stale closure, mode not persisted, navigate() during render, unbounded queries, error message exposure, open redirect |
| 10 | AI Features (ENGINEER) | COMPLETE | P1: Anthropic API timeout (all 3 AI functions), prompt length validation, cache key weakness, prompt injection mitigation, smoke test coverage |
| 11 | Integrations & Workflows (ENGINEER) | COMPLETE | P1: webhook retry, condition operator fix, waitlist_milestone guard, nps_below_threshold server-side guard, missing i18n keys |
| 12 | Onboarding & Templates (ENGINEER) | COMPLETE | P1: template auth redirect via sessionStorage, FirstFormGuide error toast, OnboardingWizard error handling |
| 13 | Notifications & Alerts (ENGINEER) | COMPLETE | P1: useNotifications loading state fix, NotificationPanel CRUD error handling; DB trigger issues #76/#77 documented with SQL but not implemented (migration required) |
| 14 | Enterprise Features (ENGINEER) | COMPLETE | P0: fake DNS verification removed; P1: signInWithSSO domain fix, enterprise types, sso_domain column + UI |
| 15 | Resilience & Error Handling (ENGINEER) | COMPLETE | P1: getSession() error handling + retry in AuthContext |
| 16 | UX, A11y & Navigation (ENGINEER) | COMPLETE | P1: dark mode + ThemeProvider, skip-to-content, nav landmarks, notification keyboard a11y, dynamic document titles, og meta tags, Settings email change + workspace creation + tab scroll |
| 17 | Architecture Review (ARCHITECT) | COMPLETE (read-only) | Cross-agent conflicts, pattern violations, unresolved issue master list, build/test/audit verification |
| 18 | Documentation (DOCS_WRITER) | COMPLETE | This CHANGELOG.md and SECURITY.md |
