# RLS Policy Matrix — FormForge

> Generated: 2026-03-12 | Agent 16 Supabase Audit
> Total policies: 65+ across 21 tables

## Legend

- **Role**: `public` = anyone (incl. anon), `authenticated` = logged-in users only
- **Qual**: The USING clause (for SELECT/UPDATE/DELETE)
- **WithCheck**: The WITH CHECK clause (for INSERT/UPDATE)
- **Severity**: P0 = critical, P1 = high, P2 = medium, OK = acceptable

---

## P0 CRITICAL: All policies default to `{public}` role

Every RLS policy in the database was created WITHOUT a `TO` clause, which PostgreSQL interprets as `TO PUBLIC` — granting access to **unauthenticated (anon) users**. Only policies explicitly designed for public/anon access should use `{public}` role.

---

## Full Policy Matrix

### profiles (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| profiles_select_own | SELECT | public | `auth.uid() = id` | **P0**: Should be `authenticated` |
| profiles_update_own | UPDATE | public | `auth.uid() = id` | **P0**: Should be `authenticated` |
| profiles_insert_own | INSERT | public | `auth.uid() = id` | **P0**: Should be `authenticated` |

### workspaces (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| workspaces_select_member | SELECT | public | `is_workspace_member() OR owner_id = auth.uid()` | **P0**: Should be `authenticated` |
| workspaces_insert_owner | INSERT | public | `owner_id = auth.uid()` | **P0**: Should be `authenticated` |
| workspaces_update_owner | UPDATE | public | `owner_id = auth.uid()` | **P0**: Should be `authenticated` |

### workspace_members (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| members_select_own | SELECT | public | `user_id = auth.uid() OR is_workspace_member()` | **P0**: Should be `authenticated` |
| members_insert_owner | INSERT | public | owner check | **P0**: Should be `authenticated` |
| members_delete_owner | DELETE | public | owner check OR self | **P0**: Should be `authenticated` |

### forms (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| forms_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| forms_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| forms_update_editor | UPDATE | public | `get_workspace_role() IN ('owner','editor')` | **P0**: Should be `authenticated` |
| forms_delete_owner | DELETE | public | `get_workspace_role() = 'owner'` | **P0**: Should be `authenticated` |
| forms_select_active_public | SELECT | public | `status = 'active'` | **OK**: Intentional anon access |

### submissions (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| submissions_select_member | SELECT | public | `is_workspace_member()` via forms join | **P0**: Should be `authenticated` |
| submissions_insert_public | INSERT | public | `form.status = 'active'` | **OK**: Intentional anon access |

### notifications (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| notifications_select_own | SELECT | public | `user_id = auth.uid()` | **P0**: Should be `authenticated` |
| notifications_update_own | UPDATE | public | `user_id = auth.uid()` | **P0**: Should be `authenticated` |
| notifications_insert_system | INSERT | public | `true` | **P0**: WITH CHECK=true allows ANY user to insert. Should restrict to trigger/service role |

### waitlist_entries (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| waitlist_entries_select_member | SELECT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| waitlist_entries_insert_public | INSERT | public | `form.status='active' AND mode='waitlist'` | **OK**: Intentional anon access |
| waitlist_entries_update_member | UPDATE | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| waitlist_entries_select_own | SELECT | public | `true` | **P0**: USING=true exposes ALL entries to anyone |

### waitlist_invites (Migration 003)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| waitlist_invites_select_member | SELECT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| waitlist_invites_insert_member | INSERT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |

### feedback_responses (Migration 005)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| feedback_responses_select_member | SELECT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| feedback_responses_insert_public | INSERT | public | `form.status='active' AND mode='feedback'` | **OK**: Intentional anon access |
| feedback_responses_update_member | UPDATE | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |

### feedback_alerts (Migration 005)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| feedback_alerts_select_member | SELECT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| feedback_alerts_insert_system | INSERT | public | `true` | **P0**: WITH CHECK=true allows ANY user to insert alerts |
| feedback_alerts_update_member | UPDATE | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |

### tickets (Migration 006)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| tickets_select_member | SELECT | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |
| tickets_select_customer | SELECT | public | `true` | **P0**: USING=true exposes ALL tickets to anyone |
| tickets_insert_public | INSERT | public | `form.status='active' AND mode='support'` | **OK**: Intentional anon access |
| tickets_update_member | UPDATE | public | `is_workspace_member()` via forms | **P0**: Should be `authenticated` |

### ticket_messages (Migration 006)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| messages_select_member | SELECT | public | `is_workspace_member()` via tickets→forms | **P0**: Should be `authenticated` |
| messages_select_customer | SELECT | public | `NOT is_internal AND ticket exists` | **OK**: Intentional anon access (public tracking) |
| messages_insert_public | INSERT | public | `true` | **P0**: WITH CHECK=true allows ANY user to insert messages to ANY ticket |

### canned_responses (Migration 006)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| canned_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| canned_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| canned_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| canned_delete_member | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### tags (Migration 006)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| tags_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| tags_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| tags_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| tags_delete_member | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### ticket_tags (Migration 006)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| ticket_tags_select_member | SELECT | public | `is_workspace_member()` via tickets→forms | **P0**: Should be `authenticated` |
| ticket_tags_insert_member | INSERT | public | `is_workspace_member()` via tickets→forms | **P0**: Should be `authenticated` |
| ticket_tags_delete_member | DELETE | public | `is_workspace_member()` via tickets→forms | **P0**: Should be `authenticated` |

### subscriptions (Migration 013)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| subscriptions_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| subscriptions_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| subscriptions_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### usage (Migration 014)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| Members can view workspace usage | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### activation_events (Migration 015)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| activation_events_select_own | SELECT | public | `auth.uid() = user_id` | **P0**: Should be `authenticated` |
| activation_events_insert_own | INSERT | public | `auth.uid() = user_id` | **P0**: Should be `authenticated` |

### webhooks (Migration 016)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| webhooks_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| webhooks_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| webhooks_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| webhooks_delete_member | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### webhook_deliveries (Migration 016)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| webhook_deliveries_select_member | SELECT | public | `is_workspace_member()` via webhooks | **P0**: Should be `authenticated` |
| webhook_deliveries_insert_service | INSERT | public | `true` | **P0**: WITH CHECK=true, intended for service role only |
| webhook_deliveries_update_service | UPDATE | public | `true` | **P0**: USING=true allows ANYONE to update deliveries |

### api_keys (Migration 017)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| api_keys_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| api_keys_insert_owner | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| api_keys_update_owner | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| api_keys_delete_owner | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### templates (Migration 018)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| Anyone can view active templates | SELECT | public | `is_active = true` | **OK**: Intentional public access |

### ai_cache (Migration 019)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| ai_cache_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### churn_scores (Migration 020)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| churn_scores_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| churn_scores_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| churn_scores_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| churn_scores_delete_member | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### enterprise_settings (Migration 021)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| enterprise_settings_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| enterprise_settings_insert_owner | INSERT | public | owner check | **P0**: Should be `authenticated` |
| enterprise_settings_update_owner | UPDATE | public | owner check | **P0**: Should be `authenticated` |
| enterprise_settings_delete_owner | DELETE | public | owner check | **P0**: Should be `authenticated` |

### custom_domains (Migration 022)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| custom_domains_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| custom_domains_insert_owner | INSERT | public | owner check | **P0**: Should be `authenticated` |
| custom_domains_update_owner | UPDATE | public | owner check | **P0**: Should be `authenticated` |
| custom_domains_delete_owner | DELETE | public | owner check | **P0**: Should be `authenticated` |

### workflows (Migration 023)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| workflows_select_member | SELECT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| workflows_insert_member | INSERT | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| workflows_update_member | UPDATE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |
| workflows_delete_member | DELETE | public | `is_workspace_member()` | **P0**: Should be `authenticated` |

### workflow_runs (Migration 023)

| Policy Name | Operation | Role | Qual/WithCheck | Finding |
|---|---|---|---|---|
| workflow_runs_select_member | SELECT | public | `is_workspace_member()` via workflows | **P0**: Should be `authenticated` |
| workflow_runs_insert_service | INSERT | public | `true` | **P0**: WITH CHECK=true, intended for service role only |

---

## Summary

| Severity | Count | Description |
|---|---|---|
| **P0 — Role** | ~55 policies | All use `{public}` instead of `{authenticated}` |
| **P0 — Open qual** | 3 policies | `tickets_select_customer`, `waitlist_entries_select_own`, `webhook_deliveries_update_service` have `USING(true)` |
| **P0 — Open check** | 4 policies | `notifications_insert_system`, `feedback_alerts_insert_system`, `messages_insert_public`, `webhook_deliveries_insert_service`, `workflow_runs_insert_service` have `WITH CHECK(true)` |
| **OK — Intentional** | 10 policies | Public form access, anon submission/signup, template viewing, customer ticket tracking |

## Remediation Plan

1. **Migration 024**: DROP + recreate ~55 policies with `TO authenticated`
2. **Migration 025**: Fix or drop dangerous open policies (qual=true, with_check=true)
