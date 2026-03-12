# Database Schema Reference — FormForge

> Auto-generated from migration analysis | 2026-03-12
> Supabase Project: rsuolemihuqjvrcpqjpa

---

## Tables (28)

### Core

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| profiles | id (UUID) | email, full_name, avatar_url, onboarding_completed | auth.users(id) CASCADE | Yes |
| workspaces | id (UUID) | name, slug (UNIQUE), owner_id | auth.users(id) CASCADE | Yes |
| workspace_members | (user_id, workspace_id) | role (workspace_role) | auth.users, workspaces CASCADE | Yes |
| forms | id (UUID) | title, fields/settings/branding (JSONB), status, mode, workspace_id | auth.users, workspaces CASCADE | Yes |
| submissions | id (UUID) | form_id, data (JSONB), submitted_by_email/name | forms CASCADE | Yes |
| notifications | id (UUID) | user_id, type, title, message, read | auth.users CASCADE | Yes |

### Waitlist

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| waitlist_entries | id (UUID) | form_id, email, referral_code (UNIQUE), position, status | forms CASCADE | Yes |
| waitlist_invites | id (UUID) | form_id, entry_id, message | forms, waitlist_entries CASCADE | Yes |

### Feedback

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| feedback_responses | id (UUID) | form_id, nps_score (0-10), sentiment, respondent_email | forms CASCADE, submissions SET NULL | Yes |
| feedback_alerts | id (UUID) | form_id, response_id, alert_type, read | forms, feedback_responses CASCADE | Yes |

### Support

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| tickets | id (UUID) | form_id, ticket_number (UNIQUE/form), status, priority, assigned_to | forms CASCADE, auth.users SET NULL | Yes |
| ticket_messages | id (UUID) | ticket_id, sender_type, message, is_internal | tickets CASCADE | Yes |
| canned_responses | id (UUID) | workspace_id, title, content, category | workspaces CASCADE | Yes |
| tags | id (UUID) | workspace_id, name (UNIQUE/workspace), color | workspaces CASCADE | Yes |
| ticket_tags | (ticket_id, tag_id) | — | tickets, tags CASCADE | Yes |

### Billing

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| subscriptions | id (UUID) | workspace_id (UNIQUE), plan, status, stripe_customer_id | workspaces CASCADE | Yes |
| usage | id (UUID) | workspace_id, month (UNIQUE/workspace+month), submission_count | workspaces CASCADE | Yes |

### Onboarding

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| activation_events | id (UUID) | user_id, workspace_id, event_type | auth.users, workspaces CASCADE | Yes |

### Integrations

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| webhooks | id (UUID) | workspace_id, url, events[], secret, active | workspaces CASCADE | Yes |
| webhook_deliveries | id (UUID) | webhook_id, event_type, payload, success, attempts | webhooks CASCADE | Yes |
| api_keys | id (UUID) | workspace_id, key_hash (UNIQUE), key_prefix, name | workspaces CASCADE | Yes |

### Templates

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| templates | id (UUID) | title, slug (UNIQUE), mode, category, fields/settings (JSONB) | None | Yes |

### AI

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| ai_cache | id (UUID) | workspace_id, cache_type, input_hash, output, expires_at | workspaces CASCADE | Yes |
| churn_scores | id (UUID) | workspace_id, customer_email (UNIQUE/workspace), risk_score | workspaces CASCADE | Yes |

### Enterprise

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| enterprise_settings | workspace_id (UUID) | sso_enabled, sso_provider, white_label_enabled | workspaces CASCADE | Yes |
| custom_domains | id (UUID) | workspace_id, domain (UNIQUE), verified, ssl_status | workspaces CASCADE | Yes |

### Automation

| Table | PK | Key Columns | FK References | RLS |
|---|---|---|---|---|
| workflows | id (UUID) | workspace_id, name, trigger_config, steps (JSONB), active | workspaces CASCADE | Yes |
| workflow_runs | id (UUID) | workflow_id, status, trigger_event, steps_executed | workflows CASCADE | Yes |

---

## Enums (9)

| Enum | Values |
|---|---|
| workspace_role | owner, editor, viewer |
| form_status | draft, active, closed |
| form_mode | standard, waitlist, feedback, support |
| waitlist_entry_status | waiting, invited, joined, removed |
| feedback_sentiment | promoter, passive, detractor |
| feedback_alert_type | detractor, score_drop, keyword |
| ticket_status | open, in_progress, waiting, resolved, closed |
| ticket_priority | low, medium, high, urgent |
| ticket_sender_type | agent, customer, system |

---

## Helper Functions

| Function | Returns | Purpose |
|---|---|---|
| is_workspace_member(user_id, workspace_id) | BOOLEAN | Check if user is a member of workspace |
| get_workspace_role(user_id, workspace_id) | workspace_role | Get user's role in workspace |
| generate_ticket_number(form_id) | TEXT | Generate next TICK-NNN for a form |
| get_workspace_usage(workspace_id) | TABLE | Get current month's usage stats |

---

## Triggers

| Trigger | Table | Event | Function |
|---|---|---|---|
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user |
| on_submission_created | submissions | AFTER INSERT | handle_new_submission |
| on_form_updated | forms | BEFORE UPDATE | handle_form_updated |
| on_waitlist_entry_position | waitlist_entries | BEFORE INSERT | handle_waitlist_position |
| on_waitlist_entry_created | waitlist_entries | AFTER INSERT | handle_waitlist_referral |
| on_feedback_response_created | feedback_responses | BEFORE INSERT | handle_feedback_response |
| on_ticket_created_number | tickets | BEFORE INSERT | handle_ticket_number |
| on_ticket_resolved | tickets | BEFORE UPDATE | handle_ticket_resolved |
| on_ticket_message_created | ticket_messages | AFTER INSERT | handle_first_response |
| on_submission_notify | submissions | AFTER INSERT | notify_on_submission |
| on_ticket_assigned_notify | tickets | AFTER UPDATE | notify_on_ticket_assigned |
| on_submission_increment_usage | submissions | AFTER INSERT | increment_usage_submission |
| on_subscription_updated | subscriptions | BEFORE UPDATE | handle_subscription_updated |
| on_webhook_updated | webhooks | BEFORE UPDATE | handle_webhook_updated_at |
| on_churn_score_updated | churn_scores | BEFORE UPDATE | handle_churn_score_updated_at |
| on_enterprise_settings_updated | enterprise_settings | BEFORE UPDATE | handle_enterprise_settings_updated_at |
| on_custom_domains_updated | custom_domains | BEFORE UPDATE | handle_custom_domains_updated_at |
| on_workflow_updated | workflows | BEFORE UPDATE | handle_workflow_updated |
