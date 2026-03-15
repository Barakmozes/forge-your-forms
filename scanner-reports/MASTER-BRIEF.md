# Master Brief — FormForge

**Generated**: 2026-03-15
**Scanner Version**: V4
**Features Scanned**: 18 / 18
**Project Type**: Web Application (Vite + React 18 SPA + Supabase)

---

## System Health

| Metric | Value | Status |
|--------|-------|--------|
| Total Issues | 339 | |
| P0 (Critical) | 38 (31 unique) | RED |
| P1 (High) | 112 | RED |
| P2 (Medium) | 189 | YELLOW |
| Features with P0s | 13 / 18 | RED |
| Features with zero P0s | 5 (10, 12, 15, 17) | |
| Test Coverage | ZERO (placeholder only) | RED |
| npm audit HIGH | 1 (@remix-run/router XSS) | YELLOW |
| TypeScript strict | OFF (strict: false) | YELLOW |
| Unused lint rule | @typescript-eslint/no-unused-vars OFF | YELLOW |

**Overall Health: RED — 31 unique critical issues across security, compliance, billing, and functionality. Not production-ready.**

---

## Issue Breakdown by Category

| Category | P0 | P1 | P2 | Total | % of All |
|----------|----|----|-----|-------|----------|
| Security | 16 | 24 | 18 | 58 | 17.1% |
| Compliance (GDPR) | 4 | 4 | 3 | 11 | 3.2% |
| Bug / Functionality | 8 | 18 | 22 | 48 | 14.2% |
| Performance | 1 | 12 | 15 | 28 | 8.3% |
| Billing / Revenue | 5 | 5 | 4 | 14 | 4.1% |
| RBAC / Authorization | 3 | 8 | 5 | 16 | 4.7% |
| UX / Accessibility | 1 | 16 | 32 | 49 | 14.5% |
| Architecture / Code Quality | 0 | 10 | 28 | 38 | 11.2% |
| Resilience / Error Handling | 0 | 9 | 18 | 27 | 8.0% |
| i18n | 0 | 3 | 22 | 25 | 7.4% |
| Documentation / SEO | 0 | 3 | 22 | 25 | 7.4% |

---

## Risk Assessment

### CRITICAL RISK: Security & Compliance

The application has **systemic security gaps** that affect nearly every feature:

1. **Missing DELETE RLS policies** — 5 tables (`profiles`, `workspaces`, `notifications`, `waitlist_entries`, `feedback_responses`) have no DELETE policy. All client-side delete operations silently fail. Account deletion is completely non-functional.
2. **Edge function authorization bypass** — 6 edge functions (`create-checkout`, `create-portal-session`, `classify-ticket`, `churn-score`, `dispatch-webhook`, `slack-notify`) lack workspace membership verification. Any authenticated user can act on any workspace.
3. **GDPR non-compliance** — No consent at signup, no privacy notice on public forms, account deletion broken, incomplete data export. Articles 7, 13-14, 15, 17 all violated.
4. **Credentials in source** — `.env` tracked in git with Supabase keys and Stripe price IDs.
5. **Plaintext secret storage** — Mailchimp API keys, Slack webhook URLs, and webhook secrets stored in readable JSONB columns.

### HIGH RISK: Billing & Revenue

1. **Zero server-side enforcement** — Plan limits checked client-side only; `canAcceptSubmission()` never called.
2. **Owner bypass** — `isOwnerBypass` lets workspace owners skip all plan limits and feature gates.
3. **Checkout manipulation** — No price ID validation; no workspace authorization on checkout/portal endpoints.

### HIGH RISK: Data Integrity

1. **Race conditions** — Waitlist position assignment and ticket number generation use `MAX() + 1` without locking.
2. **Broken public flows** — Waitlist duplicate detection and count query fail after RLS policy migration.
3. **Support navigation broken** — 3 of 4 ticket navigation paths non-functional.

---

## All P0 Issues (Deduplicated)

| # | Category | Description | Features | Confidence | Key Files |
|---|----------|-------------|----------|------------|-----------|
| 1 | SECURITY | `.env` file tracked in git — Supabase keys and Stripe price IDs exposed | 01 | HIGH | `.env`, `.gitignore` |
| 2 | SECURITY | Implicit OAuth flow (`flowType: "implicit"`) — tokens in URL fragments | 01 | HIGH | `client.ts:17` |
| 3 | SECURITY | No DELETE RLS on `profiles` — account deletion silently fails | 01, 16 | HIGH | `003_rls_policies.sql` |
| 4 | SECURITY | No DELETE RLS on `workspaces` — cascade deletion silently fails | 01, 02, 16 | HIGH | `003_rls_policies.sql` |
| 5 | SECURITY | No DELETE RLS on `notifications` — delete operations fail silently | 14, 16 | HIGH | `003_rls_policies.sql` |
| 6 | SECURITY | No DELETE RLS on `waitlist_entries` — admin deletes revert on refresh | 05 | HIGH | migrations |
| 7 | COMPLIANCE | No DELETE RLS on `feedback_responses` — GDPR erasure impossible | 06 | HIGH | `005_feedback_tables.sql` |
| 8 | SECURITY | `auth.users` record never deleted — no edge function/RPC exists | 01, 16 | HIGH | `AccountDeletion.tsx:72` |
| 9 | SECURITY | Viewers can create forms — `forms_insert_member` has no role check | 02 | HIGH | `024_rls_role_remediation.sql` |
| 10 | SECURITY | Viewers can CRUD canned_responses, tags, webhooks, API keys | 02 | HIGH | `024_rls_role_remediation.sql` |
| 11 | SECURITY | ReDoS vulnerability — user-supplied regex in phone validation | 03, 04 | HIGH | `FormRenderer.tsx:349-356` |
| 12 | BUG | Broken anon duplicate check on waitlist after policy drop | 05 | HIGH | `WaitlistLandingPage.tsx:99-114` |
| 13 | BUG | Broken anon total count query — social proof counter invisible | 05 | HIGH | `WaitlistLandingPage.tsx:66-75` |
| 14 | PERFORMANCE | No pagination on `feedback_responses` — client OOM at scale | 06 | HIGH | `useFeedback.ts:17-20` |
| 15 | BUG | Support table rows have no click handler — can't navigate to ticket | 07 | HIGH | `SupportDashboard.tsx:1299` |
| 16 | BUG | "View Ticket" navigates to nonexistent route `/forms/:id/tickets` | 07 | HIGH | `SupportDashboard.tsx:679, 720` |
| 17 | BUG | Kanban `onNavigate` prop passed but never used — cards not clickable | 07 | HIGH | `SupportDashboard.tsx:379, 383` |
| 18 | BUG | Email case mismatch on ticket tracking — uppercase emails fail lookup | 07 | HIGH | `SupportSubmitPage.tsx:202` |
| 19 | SECURITY | No workspace auth in `create-checkout` edge function | 08 | HIGH | `create-checkout/index.ts:89-95` |
| 20 | SECURITY | No workspace auth in `create-portal-session` edge function | 08 | HIGH | `create-portal-session/index.ts:80-84` |
| 21 | BILLING | No server-side usage limit enforcement — free unlimited submissions | 08 | HIGH | `usePlanLimits.ts:108-111` |
| 22 | BILLING | `canAcceptSubmission()` defined but never called anywhere | 08 | HIGH | `usePlanLimits.ts:108` |
| 23 | SECURITY | No price ID validation in checkout — client controls Stripe price | 08 | HIGH | `create-checkout/index.ts:150` |
| 24 | BUG | `classify-ticket` called from unauthenticated page — always 401 | 09 | HIGH | `SupportSubmitPage.tsx:110` |
| 25 | SECURITY | `classify-ticket` has no workspace membership check | 09 | HIGH | `classify-ticket/index.ts:64-84` |
| 26 | SECURITY | `churn-score` has no workspace membership check | 09, 18 | HIGH | `churn-score/index.ts:80-100` |
| 27 | SECURITY | Mailchimp API key stored in plaintext JSONB | 11 | HIGH | `useIntegrations.ts:26` |
| 28 | SECURITY | Fake DNS verification — domain marked verified without TXT check | 13 | HIGH | `CustomDomainConfig.tsx:101-123` |
| 29 | BILLING | Owner bypass (`isOwnerBypass`) defeats all plan gating | 13 | HIGH | `FeatureGate.tsx:36`, `usePlanLimits.ts:93` |
| 30 | COMPLIANCE | No consent mechanism at signup — GDPR Article 7 violation | 16 | HIGH | `Auth.tsx:306-335` |
| 31 | COMPLIANCE | No privacy notice on public form submissions — Articles 13-14 | 16 | HIGH | 4 public form components |

---

## All P1 Issues (Deduplicated)

| # | Category | Description | Features | Confidence |
|---|----------|-------------|----------|------------|
| 1 | RESILIENCE | `getSession()` has no `.catch()` — loading stuck forever if Supabase unreachable | 01 | HIGH |
| 2 | SECURITY | No password strength validation beyond minLength=6 | 01 | HIGH |
| 3 | SECURITY | No MFA / 2FA support | 01 | MEDIUM |
| 4 | BUG | Account deletion non-atomic — partial failure leaves orphaned data | 01 | HIGH |
| 5 | ARCHITECTURE | `console.error` instead of `logError` in DataExport | 01 | HIGH |
| 6 | UX | No email change functionality in Settings | 01 | HIGH |
| 7 | UX | Member invite requires existing account — no email invitations | 01 | MEDIUM |
| 8 | BUG | `signInWithSSO` passes `workspaceSlug` as SSO `domain` — will fail | 01, 13 | MEDIUM |
| 9 | SECURITY | `lookup_profile_for_invite` enables email enumeration | 02 | HIGH |
| 10 | RESILIENCE | Workspace fetch error silently swallowed — app appears empty | 02 | HIGH |
| 11 | RESILIENCE | `fetchMembers` failure is silent — empty list, no error feedback | 02 | HIGH |
| 12 | ARCHITECTURE | Workspace type omits `slug` — causes redundant query in Settings | 02 | HIGH |
| 13 | UX | Workspace selection not persisted to localStorage — resets on reload | 02 | MEDIUM |
| 14 | UX | No UI for creating additional workspaces | 02 | MEDIUM |
| 15 | RESPONSIVE | Mobile properties panel missing validation + conditional logic editors | 03 | HIGH |
| 16 | ARCHITECTURE | FormField interface defined in 3+ places with divergent shapes | 03 | HIGH |
| 17 | BUG | Auto-save useEffect missing `save` dependency — stale closure risk | 03 | HIGH |
| 18 | BUG | `save()` does not persist `mode` field — mode changes lost | 03 | MEDIUM |
| 19 | BUG | `navigate()` called during render in FormDashboard | 03, 15 | HIGH |
| 20 | BUG | Delete submission fails silently — no DELETE RLS policy | 04 | HIGH |
| 21 | PERFORMANCE | Unbounded query fetches all submissions in FormResponsesTab | 04 | HIGH |
| 22 | PERFORMANCE | Submissions page fetches 1000 rows with silent truncation | 04 | HIGH |
| 23 | SECURITY | Supabase error messages leaked to end users in FormRenderer | 04 | MEDIUM |
| 24 | SECURITY | CSV injection in waitlist export — formula prefixes not escaped | 05 | HIGH |
| 25 | DATABASE | Waitlist position assignment race condition (MAX+1 no locking) | 05 | MEDIUM |
| 26 | RESILIENCE | Non-atomic bulk invite — partial failure leaves inconsistent state | 05 | MEDIUM |
| 27 | PERFORMANCE | No pagination on waitlist entries fetch | 05 | HIGH |
| 28 | BUG | Redundant RPC for referral increment — `increment_referral_count` doesn't exist | 05 | MEDIUM |
| 29 | FUNCTIONALITY | Feedback alerts have no realtime subscription — alerts only on refresh | 06 | HIGH |
| 30 | SECURITY | `feedback_alerts_insert_system` is public — fake alerts possible | 06 | MEDIUM |
| 31 | RBAC | Viewer role can UPDATE feedback_responses and feedback_alerts | 06 | HIGH |
| 32 | CONVENTION | FeedbackDashboard uses sonner instead of useToast (protected page) | 06 | HIGH |
| 33 | TECHNICAL DEBT | `score_drop` and `keyword` alert types unused — dead enum values | 06 | HIGH |
| 34 | FUNCTIONALITY | Only workspace owner receives detractor notifications — editors excluded | 06 | MEDIUM |
| 35 | SECURITY | Ticket enumeration via `tickets_select_customer` — exposes all tickets | 07 | HIGH |
| 36 | SECURITY | Unauthenticated message injection — `messages_insert_public` allows impersonation | 07 | MEDIUM |
| 37 | PERFORMANCE | No pagination on tickets query | 07 | HIGH |
| 38 | PERFORMANCE | Auto-close fires unnecessary DB writes on every fetch | 07 | HIGH |
| 39 | DATABASE | Ticket number generation race condition (MAX without locking) | 07 | MEDIUM |
| 40 | UX | Assigned-to column shows raw UUID instead of name | 07 | HIGH |
| 41 | UX | Delete canned response has no confirmation dialog | 07 | HIGH |
| 42 | SECURITY | Non-constant-time webhook signature comparison — timing attack | 08 | HIGH |
| 43 | BILLING | `isOwnerBypass` defeats billing — owners skip all limits | 08 | HIGH |
| 44 | DATA | Pro plan member limit mismatch (3 vs 5 in different files) | 08 | HIGH |
| 45 | DATA | Pro plan `maxSupportInboxes` is 0 — feature unavailable to Pro | 08 | HIGH |
| 46 | DATA | Pricing page vs plan limits inconsistency (Support at Pro vs Growth) | 08 | HIGH |
| 47 | ARCHITECTURE | Price-to-plan mapping duplicated in 2 files — sync hazard | 08 | MEDIUM |
| 48 | RESILIENCE | Webhook returns 200 on errors — Stripe won't retry failures | 08 | MEDIUM |
| 49 | SECURITY | No edge function plan-tier checks — paid features callable from DevTools | 08 | MEDIUM |
| 50 | RESILIENCE | No timeout on Anthropic API calls (4 edge functions) — infinite loading | 09 | HIGH |
| 51 | SECURITY | No prompt length validation in ai-generate — API credit waste | 09 | HIGH |
| 52 | BUG | ai-analyze cache key too weak — stale results returned | 09 | HIGH |
| 53 | PERFORMANCE | churn-score N+1 query — ~4000 DB queries for 1000 customers | 09, 18 | HIGH |
| 54 | SECURITY | No prompt injection mitigation — user text in LLM prompts unescaped | 09 | MEDIUM |
| 55 | TEST | ai-suggest-reply missing from smoke test — regressions undetected | 09 | HIGH |
| 56 | DATABASE | Missing UPDATE RLS on templates — `use_count` never increments | 10 | HIGH |
| 57 | BUG | Auth redirect from templates broken — template context lost after sign-in | 10 | HIGH |
| 58 | RESILIENCE | FirstFormGuide swallows form creation errors — no feedback | 10 | HIGH |
| 59 | RESILIENCE | completeOnboarding has no error handling — users stuck | 10 | HIGH |
| 60 | SECURITY | Webhook secrets stored in plaintext — any workspace member can read | 11 | HIGH |
| 61 | SECURITY | Slack webhook URL stored in plaintext | 11 | HIGH |
| 62 | SECURITY | `dispatch-webhook` has no authentication — anyone can trigger | 11 | HIGH |
| 63 | SECURITY | `slack-notify` has no authentication — anyone can invoke | 11 | HIGH |
| 64 | RESILIENCE | Webhook retry system non-functional — failed deliveries never retried | 11 | HIGH |
| 65 | RBAC | Webhook RBAC allows viewers to create/edit/delete webhooks | 11 | HIGH |
| 66 | BUG | Condition operator field ignored in workflow execution | 12 | HIGH |
| 67 | BUG | `waitlist_milestone` trigger fires on every signup, not milestones | 12 | HIGH |
| 68 | BUG | `nps_below_threshold` trigger type exists but is dead code | 12 | HIGH |
| 69 | i18n | Missing i18n keys in ActionNode — raw keys displayed | 12 | HIGH |
| 70 | FUNCTIONALITY | No SSO login UI — signInWithSSO exists but no button in Auth.tsx | 13 | HIGH |
| 71 | FUNCTIONALITY | PoweredByEnforcer dead code — PublicForm uses inline badge not gated to plan | 13 | HIGH |
| 72 | FUNCTIONALITY | White-label not applied to public pages — admin only | 13 | HIGH |
| 73 | TYPES | Missing generated types for enterprise tables — all `as` assertions | 13 | HIGH |
| 74 | FUNCTIONALITY | Custom domains have no functional purpose — UI scaffold only | 13 | HIGH |
| 75 | SECURITY | `notify_on_submission`/`notify_on_ticket_assigned` missing `SET search_path` | 14 | HIGH |
| 76 | FUNCTIONALITY | `ticket_message` and `waitlist_signup` notification types have UI but no DB triggers | 14 | HIGH |
| 77 | FUNCTIONALITY | Notifications only sent to workspace owner — editors/viewers excluded | 14 | HIGH |
| 78 | RESILIENCE | `useNotifications` fetch error leaves loading state forever | 14 | HIGH |
| 79 | RESILIENCE | NotificationPanel CRUD failures not handled — delete always fails silently | 14 | HIGH |
| 80 | UX | No dark mode toggle — next-themes installed but ThemeProvider never mounted | 15 | HIGH |
| 81 | A11Y | No skip-to-content link — WCAG 2.4.1 violation | 15 | HIGH |
| 82 | A11Y | Hamburger button missing aria-label | 15 | HIGH |
| 83 | A11Y | Nav landmarks missing aria-label — indistinguishable to assistive tech | 15 | HIGH |
| 84 | A11Y | Notification items are div+onClick — not keyboard accessible | 15 | HIGH |
| 85 | UX | Settings tabs not discoverable on small mobile — no scroll indicator | 15 | HIGH |
| 86 | FUNCTIONALITY | Data export incomplete — only 7 of 19+ tables queried | 16 | HIGH |
| 87 | UX | No navigation path to GDPR pages — orphaned from UI | 16 | HIGH |
| 88 | UX | Privacy policy not linked from landing page footer | 16 | HIGH |
| 89 | BILLING | Stripe subscription not cancelled on account deletion | 16 | HIGH |
| 90 | RESILIENCE | Account deletion error swallowing — "success" shown on failure | 16 | HIGH |
| 91 | SEO | No `og:image` — social share previews show no image | 17 | HIGH |
| 92 | SEO | No dynamic meta tags for public forms — static "FormForge" on shares | 17 | HIGH |
| 93 | UX | No `document.title` updates — all tabs show same title | 17 | HIGH |
| 94 | PERFORMANCE | N+1 query in churn-score — 300-400 round trips for 100 customers | 18 | HIGH |
| 95 | PERFORMANCE | `ilike` email matching prevents index usage — full table scans | 18 | HIGH |
| 96 | BUG | `risk_factors.last_interaction` vs `last_interaction_at` field mismatch | 18 | HIGH |
| 97 | RESILIENCE | No per-email error handling in scoring loop — one failure kills all | 18 | HIGH |

---

## Issue Counts by Feature

| # | Feature | P0 | P1 | P2 | Total | Top Category |
|---|---------|----|----|-----|-------|-------------|
| 01 | Authentication & User Management | 5 | 8 | 10 | 23 | Security |
| 02 | Workspace Management | 3 | 6 | 3 | 12 | Security / RBAC |
| 03 | Form Builder (Standard Mode) | 1 | 5 | 7 | 13 | Security / Architecture |
| 04 | Form Submissions | 1 | 4 | 6 | 11 | Performance / Security |
| 05 | Waitlist Mode | 3 | 8 | 20 | 31 | Bug / Security |
| 06 | Feedback/NPS Mode | 2 | 8 | 19 | 29 | Compliance / RBAC |
| 07 | Support/Tickets Mode | 4 | 7 | 20 | 31 | Bug / UX |
| 08 | Billing & Subscriptions | 5 | 8 | 15 | 28 | Security / Billing |
| 09 | AI Features | 3 | 10 | 10 | 23 | Security / Resilience |
| 10 | Onboarding & Templates | 0 | 4 | 9 | 13 | Resilience |
| 11 | Integrations | 1 | 6 | 10 | 17 | Security |
| 12 | Workflows & Automation | 0 | 4 | 7 | 11 | Bug / Logic |
| 13 | Enterprise Features | 2 | 6 | 8 | 16 | Security / Functionality |
| 14 | Notifications & Alerts | 1 | 5 | 7 | 13 | Security / Resilience |
| 15 | Navigation & Layout | 0 | 7 | 9 | 16 | Accessibility / UX |
| 16 | GDPR & Privacy | 6 | 5 | 7 | 18 | Compliance / Security |
| 17 | Public Pages & Sharing | 0 | 3 | 12 | 15 | SEO / UX |
| 18 | Predictions & Analytics | 1 | 4 | 10 | 15 | Security / Performance |
| | **TOTALS** | **38** | **112** | **189** | **339** | |

---

## Cross-Feature Dependency Graph

### Tier 1 — Foundation (blocks everything)
```
Authentication (01) ──► Workspace (02) ──► All protected features
         │                    │
         ▼                    ▼
   GDPR/Privacy (16)    Forms core (03, 04)
```

### Tier 2 — Core Platform
```
Forms (03, 04) ──► Waitlist (05)
               ──► Feedback (06)
               ──► Support (07)
               ──► Billing (08)
```

### Tier 3 — Value-Add Features
```
Billing (08) ──► Enterprise (13)
             ──► Plan limits → all modes

AI (09) ──► Support (classify-ticket)
        ──► Feedback (sentiment)
        ──► Form Builder (ai-generate)
        ──► Predictions (churn-score)

Integrations (11) ──► Workflows (12)
                   ──► Notifications (14)
```

### Tier 4 — Cross-Cutting
```
Navigation (15) ──► All pages
Notifications (14) ──► All modes
i18n ──► All user-facing text
Public Pages (17) ──► All public form modes
```

### Critical Dependency Chains

| Chain | Impact |
|-------|--------|
| Auth → Workspace → RLS → All data | Broken auth/RBAC cascades to every feature |
| Billing → Plan limits → Feature gates | Owner bypass means billing has zero enforcement |
| Forms → Public pages → All 4 modes | Public page bugs affect all modes |
| GDPR → Account deletion → Auth + all tables | Missing DELETE RLS breaks entire deletion flow |
| Integrations → Workflows → Automation | Unauthenticated edge functions expose all integrations |

---

## Product Growth Opportunities (Top 20)

| # | Opportunity | Lens | Effort | Impact | Confidence | Dependencies |
|---|-----------|------|--------|--------|------------|-------------|
| 1 | AI form generation from natural language | AI Integration | M | High | HIGH | ai-generate edge fn (exists) |
| 2 | Template marketplace with community templates | Missing Features | L | High | HIGH | useTemplates hook (exists) |
| 3 | Email-embedded NPS (click score in email) | Business Model | M | High | HIGH | send-email fn (exists) |
| 4 | Webhook/Zapier integrations on all events | Integration | M | High | HIGH | dispatch-webhook (exists) |
| 5 | Dark mode toggle | UX Gaps | S | Medium | HIGH | next-themes installed, CSS vars defined |
| 6 | Command palette (Cmd+K) for power users | UX Gaps | M | Medium | HIGH | React Router (exists) |
| 7 | Dynamic OG images per form for social shares | Technical Leverage | M | High | HIGH | Public form pages (exist) |
| 8 | Position-based referral rewards for waitlists | Business Model | S | High | HIGH | Referral system (exists) |
| 9 | Automated detractor response workflows | AI Integration | M | High | MEDIUM | Workflows + feedback (exist) |
| 10 | CSV/PDF export for all dashboards | Missing Features | M | Medium | HIGH | Data hooks (exist) |
| 11 | Breadcrumb navigation | UX Gaps | S | Medium | HIGH | React Router (exists) |
| 12 | Scheduled NPS email digest | Business Model | M | Medium | MEDIUM | send-email fn (exists) |
| 13 | Customer health dashboard (unified churn view) | Technical Leverage | L | High | MEDIUM | churn-score fn (exists) |
| 14 | A/B testing for landing pages | Business Model | L | High | MEDIUM | Forms infrastructure (exists) |
| 15 | Native Web Share API on public pages | Missing Features | S | Medium | HIGH | Public pages (exist) |
| 16 | Onboarding tour highlighting nav items | UX Gaps | S | Medium | HIGH | GuidedTour component (exists) |
| 17 | Audit logging for enterprise compliance | Business Model | M | High | HIGH | Supabase (exists) |
| 18 | Push notifications via Web Push API | Integration | M | Medium | MEDIUM | Notifications system (exists) |
| 19 | Embed code generator for forms | Missing Features | S | High | HIGH | Public form pages (exist) |
| 20 | Custom success page / redirect after submission | UX Gaps | S | Medium | HIGH | Form settings JSONB (exists) |

---

## Recommended Batch Order

### Batch 0 — Security Emergency (before any feature work)

**Agent**: security-auditor + database-expert

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Add `.env` to `.gitignore`, rotate all keys | P0 #1 | S |
| Switch OAuth to PKCE flow | P0 #2 | S |
| Add DELETE RLS policies (profiles, workspaces, notifications, waitlist_entries, feedback_responses) | P0 #3-7 | M |
| Create `delete-account` edge function (service_role) | P0 #8 | M |
| Add workspace membership check to 6 edge functions | P0 #19-20, #25-26, P1 #62-63 | M |
| Fix ReDoS in phone validation (use safe regex) | P0 #11 | S |
| Encrypt secrets in integration settings | P0 #27, P1 #60-61 | M |
| Add authentication to dispatch-webhook, slack-notify | P1 #62-63 | S |
| Add server-side price ID validation | P0 #23 | S |

### Batch 1 — Compliance & Billing (revenue + legal)

**Agent**: database-expert + refactorer

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Add consent checkbox at signup | P0 #30 | S |
| Add privacy notice to all 4 public form types | P0 #31 | S |
| Implement server-side usage limits (edge function middleware) | P0 #21-22 | M |
| Remove `isOwnerBypass` from usePlanLimits | P0 #29, P1 #43 | S |
| Fix plan limit data inconsistencies | P1 #44-46 | S |
| Cancel Stripe subscription on account deletion | P1 #89 | M |
| Complete data export (all tables) | P1 #86 | M |
| Add GDPR pages to navigation | P1 #87-88 | S |

### Batch 2 — Core Bug Fixes (user-facing functionality)

**Agent**: debugger + refactorer

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Fix support dashboard navigation (3 broken paths) | P0 #15-17 | M |
| Fix email case normalization in ticket tracking | P0 #18 | S |
| Fix waitlist anon duplicate check and count query | P0 #12-13 | M |
| Add pagination to feedback, waitlist, tickets, submissions | P0 #14, P1 #21-22, #27, #37 | L |
| Fix classify-ticket for unauthenticated context | P0 #24 | M |
| Fix workflow condition operator evaluation | P1 #66 | S |
| Fix waitlist_milestone trigger logic | P1 #67 | S |
| Fix churn-score field name mismatch | P1 #96 | S |

### Batch 3 — RBAC & Authorization Hardening

**Agent**: security-auditor + database-expert

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Add role checks to form INSERT policy (editor+) | P0 #9 | S |
| Add role checks to canned_responses, tags, webhooks, API keys | P0 #10, P1 #65 | M |
| Fix viewer UPDATE on feedback_responses, feedback_alerts | P1 #31 | S |
| Fix ticket enumeration via RLS | P1 #35 | S |
| Fix message injection via `messages_insert_public` | P1 #36 | S |
| Fix fake alert insertion via `feedback_alerts_insert_system` | P1 #30 | S |

### Batch 4 — Resilience & Error Handling

**Agent**: debugger + refactorer

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Add `.catch()` to `getSession()` | P1 #1 | S |
| Fix error handling in workspace fetch, member fetch | P1 #10-11 | S |
| Fix notification fetch infinite loading | P1 #78 | S |
| Add timeouts to Anthropic API calls | P1 #50 | M |
| Fix webhook 200-on-error | P1 #48 | S |
| Make account deletion atomic or add rollback | P1 #4 | M |
| Add per-email error handling in churn-score | P1 #97 | S |

### Batch 5 — UX, A11Y & Polish

**Agent**: ui-reviewer + a11y-auditor

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Mount ThemeProvider, add dark mode toggle | P1 #80 | S |
| Add skip-to-content link | P1 #81 | S |
| Add aria-labels to hamburger, navs, notification items | P1 #82-84 | S |
| Add keyboard accessibility to notification items | P1 #84 | S |
| Fix document.title updates per route | P1 #93 | M |
| Add og:image and dynamic meta tags | P1 #91-92 | M |
| Fix assigned-to UUID display | P1 #40 | S |
| Add confirmation to canned response delete | P1 #41 | S |

### Batch 6 — Performance & Architecture

**Agent**: performance-optimizer + database-expert

| Task | Issues Resolved | Effort |
|------|----------------|--------|
| Fix churn-score N+1 query pattern | P1 #53, #94 | M |
| Replace `ilike` with `eq` in churn-score | P1 #95 | S |
| Fix auto-close unnecessary DB writes | P1 #38 | S |
| Fix ai-analyze cache key | P1 #52 | S |
| Add `SET search_path` to SECURITY DEFINER functions | P1 #75 | S |
| Consolidate FormField interface to single source | P1 #16 | M |
| Deduplicate price-to-plan mapping | P1 #47 | S |

---

## Agent Role Distribution

| Agent | Batches | Est. Issues | Primary Focus |
|-------|---------|-------------|---------------|
| security-auditor | 0, 3 | 24 | RLS policies, edge function auth, secret management, RBAC |
| database-expert | 0, 1, 3, 6 | 18 | Migrations, RLS policies, query optimization, schema fixes |
| debugger | 2, 4 | 22 | Broken flows, error handling, race conditions |
| refactorer | 1, 2, 4 | 14 | Code consolidation, billing logic, resilience patterns |
| ui-reviewer | 5 | 8 | Theme, meta tags, document titles, UX polish |
| a11y-auditor | 5 | 5 | ARIA labels, keyboard nav, skip links, WCAG compliance |
| performance-optimizer | 6 | 6 | N+1 queries, pagination, caching, bundle optimization |
| test-writer | All | — | Tests for every batch (currently ZERO test coverage) |

---

## Statistics

| Metric | Value |
|--------|-------|
| Features scanned | 18 |
| Total issues found | 339 |
| P0 (Critical) | 38 raw / 31 unique |
| P1 (High) | 112 raw / 97 unique |
| P2 (Medium) | 189 |
| Unique P0+P1 | 128 |
| Scan dimensions active | 20 |
| Recommended batches | 7 (0–6) |
| Estimated agent assignments | 8 agent roles |
| Features with P0 issues | 13 / 18 (72%) |
| Most affected feature | Waitlist Mode (31 issues) |
| Highest P0 count | GDPR & Privacy (6 P0s) |
| Top issue category | Security (58 issues, 17.1%) |
| Test coverage | ZERO (Vitest configured, no real tests) |
| npm HIGH vulnerabilities | 1 (@remix-run/router XSS) |

---

**END OF MASTER BRIEF**
