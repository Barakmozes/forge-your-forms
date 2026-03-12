# Security Baseline — FormForge

> Version: 1.0 | Date: 2026-03-12
> Author: Agent 16 (Phase 6 — Production Hardening)

---

## 1. Authentication

| Property | Value |
|---|---|
| Provider | Supabase Auth |
| Methods | Email + password |
| Session | JWT with auto-refresh |
| MFA | Not yet enabled (planned) |

### Recommendations
- Enable email confirmation before production launch
- Consider adding OAuth providers (Google, GitHub) for user convenience
- Evaluate MFA for workspace owners

---

## 2. Authorization Model

### Roles
- **Workspace Owner**: Full CRUD on workspace resources, manage members, billing, enterprise settings
- **Editor**: Create/update forms, manage submissions and mode-specific data
- **Viewer**: Read-only access to workspace resources

### Enforcement Layers
1. **RLS Policies** (server-side, primary): All tables have RLS enabled with `TO authenticated` for member-scoped policies
2. **Helper Functions**: `is_workspace_member()` and `get_workspace_role()` — both SECURITY DEFINER
3. **Frontend Route Guards**: `ProtectedRoute` component redirects unauthenticated users
4. **Frontend UI**: Conditional rendering based on auth state (supplementary only)

### Public Access (Intentional)
These policies use `TO public` for anonymous access:
- `forms_select_active_public` — read active forms
- `submissions_insert_public` — submit to active forms
- `waitlist_entries_insert_public` — join active waitlists
- `feedback_responses_insert_public` — submit feedback to active forms
- `tickets_insert_public` — create tickets for active support forms
- `tickets_select_customer` — read tickets (scoped to active support forms)
- `messages_select_customer` — read non-internal ticket messages
- `messages_insert_public` — reply to open tickets (validated: ticket exists, form active, not closed)
- `Anyone can view active templates` — browse template gallery

---

## 3. RLS Policy Summary (Post-Hardening)

| Category | Count | Role |
|---|---|---|
| Workspace member CRUD | ~45 | `authenticated` |
| Owner-only operations | ~12 | `authenticated` (with owner check) |
| Public form access | ~9 | `public` (intentional anon) |
| System/trigger inserts | 2 | `public` (with validation) |
| **Total** | ~68 | — |

### P0 Findings Resolved
- All 55 workspace-scoped policies changed from `{public}` to `TO authenticated`
- 3 dangerous `USING(true)` policies removed or replaced with scoped checks
- 5 dangerous `WITH CHECK(true)` policies removed or replaced with validation

---

## 4. Database Function Security

All 23+ functions use:
- `SECURITY DEFINER` — executes with function owner's privileges
- `SET search_path = public` — prevents search_path injection

---

## 5. Storage Security

| Bucket | Access | Size Limit | MIME Types |
|---|---|---|---|
| branding | Public read, authenticated write | 2MB | image/png, jpeg, svg+xml, webp, gif |

### Recommendations
- Add per-user upload path restrictions (e.g., `workspace_id/filename`)
- Consider adding virus scanning for uploaded files
- Add `form-uploads` bucket if file upload fields are used

---

## 6. API Security

| Endpoint | Protection |
|---|---|
| Supabase REST API | RLS policies + anon key (client-safe) |
| Supabase Auth | Built-in rate limiting |
| Public form submissions | RLS + form status/mode validation |

### Recommendations
- Enable Supabase API rate limiting in Dashboard
- Add CAPTCHA to public form submissions (spam prevention)
- Consider IP-based rate limiting for anonymous submissions

---

## 7. Data Protection

| Concern | Status |
|---|---|
| Encryption at rest | Supabase default (AES-256) |
| Encryption in transit | TLS 1.2+ (Supabase enforced) |
| PII fields | email, name in profiles/tickets/waitlist |
| Data retention | No auto-deletion policy yet |
| Soft deletes | Not implemented (CASCADE deletes) |
| Audit logging | Not implemented |

### Recommendations
- Implement data retention policies (GDPR compliance)
- Add audit logging for sensitive operations (role changes, data exports)
- Consider data anonymization for old records

---

## 8. Realtime Security

Realtime subscriptions respect RLS policies. Tables enabled:
- submissions, waitlist_entries, notifications
- feedback_responses, tickets, ticket_messages
- subscriptions, usage, webhooks, webhook_deliveries
- enterprise_settings, workflows, workflow_runs

All realtime channels filter by RLS — unauthenticated users cannot subscribe to authenticated-only tables.

---

## 9. Extension Status

| Extension | Status | Purpose |
|---|---|---|
| pg_graphql | Enabled | GraphQL API (unused) |
| pg_stat_statements | Enabled | Query performance |
| pgcrypto | Enabled | UUID generation |
| plpgsql | Enabled | Trigger functions |
| supabase_vault | Enabled | Secret management |
| uuid-ossp | Enabled | UUID generation |
| pg_cron | **Not enabled** | Scheduled jobs (auto-close, cleanup) |
| pg_net | **Not enabled** | HTTP requests from DB |

### Action Required
Enable pg_cron and pg_net via Supabase Dashboard → Database → Extensions.
Then register cron jobs:
```sql
SELECT cron.schedule('auto-close-tickets', '0 2 * * *', 'SELECT public.auto_close_resolved_tickets()');
SELECT cron.schedule('cleanup-ai-cache', '0 3 * * *', 'SELECT public.cleanup_expired_ai_cache()');
```

---

## 10. Known Accepted Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `tickets_select_customer` allows anon read of all tickets for active support forms | Medium | Client filters by ticket_number + email; consider RPC function for stricter scoping |
| No CAPTCHA on public forms | Medium | Add CAPTCHA before high-traffic launch |
| No rate limiting on API | Medium | Enable Supabase rate limiting in Dashboard |
| No audit logging | Low | Add before handling sensitive/regulated data |
| TypeScript strict mode disabled | Low | Gradually enable strict checks |

---

## 11. Pre-Launch Checklist

- [ ] Enable pg_cron and pg_net extensions
- [ ] Register cron jobs (auto-close tickets, cleanup AI cache)
- [ ] Enable email confirmation in Supabase Auth settings
- [ ] Configure API rate limiting in Supabase Dashboard
- [ ] Review and restrict CORS origins
- [ ] Add CAPTCHA to public form pages
- [ ] Run migrations 024-027 against production database
- [ ] Verify RLS policies with test queries (anon vs authenticated)
- [ ] Review storage bucket settings in Dashboard
