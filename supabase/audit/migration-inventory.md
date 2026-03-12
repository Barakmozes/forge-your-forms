# Migration Inventory — FormForge

> Generated: 2026-03-12 | Agent 16 Supabase Audit
> Project ID: rsuolemihuqjvrcpqjpa

## Migration Files (25 total)

| # | File | Tables | Enums | Functions | Triggers | Policies | Indexes |
|---|------|--------|-------|-----------|----------|----------|---------|
| 001 | core_tables_and_enums.sql | 6 | 9 | 2 | 0 | 0 | 8 |
| 002 | waitlist_tables.sql | 2 | 0 | 0 | 0 | 0 | 6 |
| 003 | rls_policies.sql | 0 | 0 | 0 | 0 | 26 | 0 |
| 004 | functions_and_triggers.sql | 0 | 0 | 5 | 5 | 0 | 0 |
| 005 | feedback_tables.sql | 2 | 0 | 1 | 1 | 6 | 5 |
| 006 | support_tables.sql | 5 | 0 | 4 | 3 | 16 | 7 |
| 007 | branding_storage_bucket.sql | 0 | 0 | 0 | 0 | 4 (storage) | 0 |
| 010 | feedback_enhancements.sql | 0 | 0 | 0 | 0 | 0 | 2 |
| 011 | auto_close_tickets.sql | 0 | 0 | 0 | 0 | 0 | 2 |
| 012 | notification_triggers.sql | 0 | 0 | 2 | 2 | 0 | 0 |
| 013 | subscriptions.sql | 1 | 0 | 1 | 1 | 3 | 3 |
| 014 | usage.sql | 1 | 0 | 2 | 1 | 1 | 1 |
| 015 | onboarding.sql | 1 (+ALTER) | 0 | 0 | 0 | 2 | 3 |
| 016 | webhooks.sql | 2 | 0 | 1 | 1 | 6 | 3 |
| 017 | api_keys.sql | 1 | 0 | 0 | 0 | 4 | 2 |
| 018 | templates.sql | 1 | 0 | 0 | 0 | 1 | 4 |
| 019 | ai_cache.sql | 1 | 0 | 0 | 0 | 1 | 3 |
| 020 | predictions.sql | 1 (+ALTER) | 0 | 1 | 1 | 4 | 2 |
| 021 | enterprise.sql | 1 | 0 | 1 | 1 | 4 | 1 |
| 022 | custom_domains.sql | 1 | 0 | 1 | 1 | 4 | 2 |
| 023 | workflows.sql | 2 | 0 | 1 | 1 | 5 | 5 |
| auto-1 | 20260308233552_*.sql | 6 (dup) | 2 (dup) | 5 (dup) | 3 (dup) | inline | 0 |
| auto-2 | 20260308233600_*.sql | 0 | 0 | 1 (dup) | 0 | 0 | 0 |

## Totals

| Resource | Count |
|---|---|
| Tables | 27 unique (+ 6 duplicated in auto-gen) |
| Enums | 9 unique |
| Functions | 23 unique |
| Triggers | 19 unique |
| RLS Policies | ~65 unique |
| Indexes | 60+ |
| Storage Buckets | 1 (branding) |

## Table List (27)

### Core (001)
1. profiles
2. workspaces
3. workspace_members
4. forms
5. submissions
6. notifications

### Waitlist (002)
7. waitlist_entries
8. waitlist_invites

### Feedback (005)
9. feedback_responses
10. feedback_alerts

### Support (006)
11. tickets
12. ticket_messages
13. canned_responses
14. tags
15. ticket_tags

### Subscriptions (013)
16. subscriptions

### Usage (014)
17. usage

### Onboarding (015)
18. activation_events

### Webhooks (016)
19. webhooks
20. webhook_deliveries

### API Keys (017)
21. api_keys

### Templates (018)
22. templates

### AI (019-020)
23. ai_cache
24. churn_scores

### Enterprise (021-022)
25. enterprise_settings
26. custom_domains

### Workflows (023)
27. workflows
28. workflow_runs

## Realtime Publication

Tables in `supabase_realtime`:
1. submissions (004)
2. waitlist_entries (004)
3. notifications (004)
4. feedback_responses (005)
5. tickets (006)
6. ticket_messages (006)
7. subscriptions (013)
8. usage (014)
9. webhooks (016)
10. webhook_deliveries (016)
11. enterprise_settings (021)
12. workflows (023)
13. workflow_runs (023)

**Missing from realtime**: feedback_alerts, waitlist_invites, activation_events, api_keys, canned_responses, tags, ticket_tags, churn_scores, custom_domains, templates, ai_cache

## Function Security

| Function | SECURITY DEFINER | search_path set |
|---|---|---|
| is_workspace_member | Yes | Yes |
| get_workspace_role | Yes | Yes |
| handle_new_user | Yes | Yes |
| handle_new_submission | Yes | Yes |
| handle_form_updated | Yes | Yes |
| handle_waitlist_referral | Yes | Yes |
| handle_waitlist_position | Yes | Yes |
| handle_feedback_response | Yes | Yes |
| generate_ticket_number | Yes | Yes |
| handle_ticket_number | Yes | Yes |
| handle_ticket_resolved | Yes | Yes |
| handle_first_response | Yes | Yes |
| notify_on_submission | Yes | Yes |
| notify_on_ticket_assigned | Yes | Yes |
| handle_subscription_updated | Yes | Yes |
| increment_usage_submission | Yes | No (missing) |
| get_workspace_usage | Yes | No (missing) |
| handle_webhook_updated_at | **No** | **No** |
| handle_churn_score_updated_at | **No** | **No** |
| handle_enterprise_settings_updated_at | **No** | **No** |
| handle_custom_domains_updated_at | **No** | **No** |
| handle_workflow_updated | **No** | **No** |

**Finding P1-1**: 5 functions missing SECURITY DEFINER and/or search_path. These are all simple updated_at triggers and low risk, but should be hardened for consistency.

## Auto-Generated Migration Issues

The two auto-generated migrations (20260308233552, 20260308233600) duplicate tables, enums, and functions from migrations 001-004. They appear to be Supabase Dashboard exports that should NOT be applied again. They are harmless if the DB already has 001-004 applied (IF NOT EXISTS would skip), but they add confusion.

**Recommendation**: These files should be documented as historical artifacts and not re-applied.
