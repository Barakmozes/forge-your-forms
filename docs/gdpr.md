# GDPR Compliance — FormForge

> Version: 1.0 | Date: 2026-03-12
> Author: Agent 19 (Phase 6 — Production Hardening)

---

## 1. Data Inventory

### Personal Data Collected

| Data Category | Fields | Source | Storage |
|---|---|---|---|
| Account | email, password hash | User signup | Supabase Auth |
| Profile | full_name, avatar_url | User settings | `profiles` table |
| Workspace | name, slug, owner_id | User creation | `workspaces` table |
| Forms | title, description, fields | User creation | `forms` table |
| Submissions | form responses, email, name | Public submissions | `submissions` table |
| Waitlist | email, name, referral data | Public signup | `waitlist_entries` table |
| Feedback | email, name, NPS score, comments | Public survey | `feedback_responses` table |
| Tickets | email, name, subject, description | Public submission | `tickets` table |
| Messages | sender email/name, message content | Ticket replies | `ticket_messages` table |
| Error Logs | user agent, page URL, error details | Automatic | `error_logs` table |

### Data Flow Diagram

```
User Browser
  ├─→ Supabase Auth (authentication)
  ├─→ Supabase DB (application data via RLS-protected REST API)
  ├─→ Supabase Storage (image uploads)
  ├─→ Stripe (payment processing — no card data stored)
  ├─→ Resend (email delivery — transactional only)
  └─→ Anthropic Claude (AI features — no data retained for training)
```

---

## 2. Data Processing Activities

### Sub-Processors

| Processor | Purpose | Data Processed | DPA Status |
|---|---|---|---|
| Supabase (AWS) | Database, Auth, Storage, Realtime | All application data | Supabase DPA applies |
| Vercel | Frontend hosting, CDN | No user data stored server-side | Vercel DPA applies |
| Stripe | Payment processing | Email, subscription plan | Stripe DPA applies |
| Resend | Email delivery | Email addresses, message content | Resend DPA applies |
| Anthropic | AI features | Form content, ticket text | Anthropic API terms apply |

### Lawful Basis for Processing

| Processing Activity | Legal Basis |
|---|---|
| Account creation & management | Contract performance |
| Form submissions & responses | Legitimate interest (service operation) |
| Payment processing | Contract performance |
| Email notifications | Legitimate interest (service operation) |
| AI-powered features | Consent (opt-in features) |
| Error logging & analytics | Legitimate interest (service reliability) |

---

## 3. User Rights Implementation

### Right of Access (Article 15)
- **Implementation**: `/data-export` page
- **Method**: User clicks "Export My Data" → downloads complete JSON file
- **Scope**: Profile, workspaces, forms, submissions, waitlist entries, feedback, tickets
- **Response Time**: Immediate (automated)

### Right to Data Portability (Article 20)
- **Implementation**: Same as Access — `/data-export` page
- **Format**: JSON (structured, machine-readable)
- **Scope**: All user-provided data

### Right to Erasure (Article 17)
- **Implementation**: `/delete-account` page
- **Method**: Two-step confirmation (type "DELETE MY ACCOUNT" + dialog confirmation)
- **Scope**: All profile data, owned workspaces (CASCADE deletes all forms, submissions, etc.), workspace memberships, notifications
- **Cascade**: PostgreSQL CASCADE foreign keys handle cleanup automatically
- **Auth User**: Signed out immediately; auth.users record requires manual admin deletion or edge function with service_role key
- **Timeline**: Immediate for application data; backup purge within 30 days

### Right to Rectification (Article 16)
- **Implementation**: Settings > Profile tab
- **Scope**: Full name, avatar

### Right to Restriction (Article 18)
- **Implementation**: Manual process — user contacts privacy@formforge.app
- **Method**: Admin sets workspace to inactive or removes access

---

## 4. Data Retention Policy

| Data Type | Retention Period | Deletion Trigger |
|---|---|---|
| Active account data | Indefinite (while account active) | Account deletion |
| Deleted account data | Immediately purged | Account deletion |
| Database backups | 30 days | Automatic rotation |
| Error logs | 90 days | Automatic cleanup (recommended) |
| Performance metrics | 90 days | Automatic cleanup (recommended) |
| Stripe payment records | Per Stripe retention policy | N/A (Stripe managed) |

### Recommended Cron Jobs
```sql
-- Auto-delete error logs older than 90 days
SELECT cron.schedule('cleanup-error-logs', '0 4 * * 0',
  $$DELETE FROM public.error_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

---

## 5. Breach Notification Procedure

### Detection
1. Monitor error_logs table for unusual patterns
2. Supabase provides infrastructure-level breach notification
3. Stripe provides payment-related breach notification

### Response (72-hour GDPR requirement)
1. **Identify**: Determine scope, affected data, and number of users
2. **Contain**: Disable affected services, rotate compromised credentials
3. **Assess**: Evaluate risk to individuals' rights and freedoms
4. **Notify**:
   - Supervisory authority within 72 hours (if risk to individuals)
   - Affected users without undue delay (if high risk)
5. **Document**: Record breach details, impact, and remediation steps
6. **Remediate**: Fix vulnerability, update security measures

### Contact
- Data Protection Officer: privacy@formforge.app
- Supervisory Authority: Relevant EU/EEA data protection authority

---

## 6. Cookie/Storage Consent

FormForge uses **localStorage only** (not cookies) for:
- `sb-*` keys: Supabase Auth session tokens (essential)
- `i18nextLng`: Language preference (functional)
- `theme`: Light/dark mode preference (functional)

**Assessment**: No tracking cookies are used. No third-party advertising scripts.
Per GDPR, essential and functional localStorage does not require consent banners.
A cookie consent banner is **not required** at this time.

---

## 7. Privacy by Design Measures

1. **Row-Level Security (RLS)**: All database tables enforce access control at the database level
2. **Workspace Isolation**: All queries scoped by workspace_id; users cannot access other workspaces' data
3. **Minimal Data Collection**: Only email required for signup; all other fields optional
4. **Encryption**: AES-256 at rest, TLS 1.2+ in transit
5. **No Data Sharing**: No personal data sold or shared with advertisers
6. **AI Data Protection**: Anthropic does not use API data for model training
7. **Automatic Cleanup**: CASCADE deletes ensure no orphaned personal data
