**SUPABASE PROJECT**

**COMPREHENSIVE MASTER AUDIT PROMPT**

Standard Operating Procedure for Production Readiness Assessment

Generic Template --- Applicable to Any Supabase-Backed Application

Version 2.0 --- March 2026

Derived from: Supabase_Audit_Prompt.docx, LeadFlow Audit Report,
Security Remediation Report,

and real-world production deployment verification across 19 edge
functions and 19 database tables.

**HOW TO USE THIS PROMPT**

This document is a self-contained, reusable prompt designed to be handed
to a human engineer, an AI agent, or a DevSecOps team. It covers every
configuration surface of a Supabase project: the Dashboard GUI, the CLI,
the REST API, direct SQL access, and edge function source code
inspection.

**Instructions for the auditor:**

1.  Replace all placeholders marked with {{PLACEHOLDER}} with your
    project-specific values before execution.

2.  Work through every section in order. Each section specifies the
    access method required (Dashboard, CLI, SQL, API, or Code Review).

3.  For each check, record the result as PASS, FAIL, WARN, or N/A with
    evidence (screenshot, query result, or CLI output).

4.  Any FAIL result must generate a remediation ticket with a priority
    level (P0 = critical/immediate, P1 = high/this week, P2 =
    medium/this sprint).

5.  After remediation, re-run only the failed checks to confirm
    resolution. Do not re-audit passing items unless the remediation
    could have introduced regressions.

6.  The SQL verification queries embedded in each section can be
    executed directly in the Supabase SQL Editor, via the CLI (npx
    supabase db execute), or through the Supabase MCP API (execute_sql
    tool).

**Access methods legend:**

  --------------------- -------------------------------------------------------
  **Field / Setting**   **Expected Value / Verification Step**

  **🖥️ Dashboard**      Supabase Dashboard GUI at
                        https://supabase.com/dashboard/project/{{PROJECT_ID}}

  **💻 CLI**            Supabase CLI: npx supabase \<command\> \--project-ref
                        {{PROJECT_ID}}

  **🗃️ SQL**            SQL Editor in Dashboard or execute_sql API. Queries are
                        provided inline.

  **🔐 API**            Supabase Management API or REST API (PostgREST).

  **📝 Code Review**    Inspect source files in the project repository.
  --------------------- -------------------------------------------------------

**PROJECT METADATA (Fill Before Audit)**

  --------------------- -------------------------------------------------------
  **Field / Setting**   **Expected Value / Verification Step**

  **Project Name**      {{PROJECT_NAME}}

  **Supabase Project    {{PROJECT_ID}}
  ID**                  

  **Dashboard URL**     https://supabase.com/dashboard/project/{{PROJECT_ID}}

  **Production URL**    {{PRODUCTION_URL}} (e.g., https://app.example.com)

  **Repository**        {{GIT_REPO_URL}} (branch: {{BRANCH}})

  **Client Framework**  {{FRAMEWORK}} (e.g., Vite + React, Next.js, SvelteKit)

  **Auth Method**       {{AUTH_METHOD}} (e.g., email/password, OAuth, magic
                        link)

  **Deployment Target** {{DEPLOY_TARGET}} (e.g., Vercel, Netlify, Cloudflare
                        Pages)

  **Audit Date**        {{AUDIT_DATE}}

  **Auditor**           {{AUDITOR_NAME}}

  **Environment**       {{ENVIRONMENT}} (production / staging / development)
  --------------------- -------------------------------------------------------

*Lesson learned: Always confirm the project ID before running
destructive or mutating queries. A wrong project ID has cascading
consequences.*

**SECTION 1: Authentication & User Management**

*Access: Dashboard \> Authentication + SQL + Code Review*

Verify every authentication setting in the Supabase Dashboard and
confirm alignment with the application\'s auth implementation.

**1.1 Auth Providers**

7.  Confirm which providers are enabled in Dashboard \> Authentication
    \> Providers.

8.  Verify that all unused OAuth providers (Google, GitHub, Apple, etc.)
    are explicitly disabled.

9.  If password-only: confirm magic link and OTP login are disabled.

10. If OAuth: verify each provider\'s client ID, secret, and redirect
    URIs are correctly configured.

11. Check for phone auth: if unused, confirm it is disabled to prevent
    SMS abuse.

*Gap discovered: Provider status is not queryable via SQL --- this is a
Dashboard-only check. Do not skip it.*

**1.2 Email Templates & Configuration**

12. Review all Supabase Auth email templates: Confirm, Reset Password,
    Magic Link, Invite.

13. Verify the Site URL (Dashboard \> Authentication \> URL
    Configuration) matches the production domain.

14. Verify the Redirect URLs allowlist contains only production and
    staging domains.

15. Check email rate limits (Dashboard \> Authentication \> Rate
    Limits). Default: 4 emails/hour/user.

16. If using custom SMTP (SendGrid, Resend, etc.): verify settings in
    Dashboard \> Authentication \> SMTP.

17. If using default Supabase SMTP: note the daily sending limit
    (typically 4/hour for free tier).

**1.3 Session & JWT Settings**

18. Confirm JWT expiry time in Dashboard \> Authentication \> Settings.
    Default is 3600s (1 hour).

19. Verify Refresh Token Rotation is enabled.

20. Check Refresh Token Reuse Interval (recommended: 10 seconds).

21. Confirm session persistence mode matches your threat model:
    localStorage (default), sessionStorage, or cookie-based.

22. Verify that the JWT secret has not been rotated without updating
    edge functions that validate tokens.

**1.4 User Signup Flow & Database Trigger**

The signup trigger is a critical security boundary. It must correctly
create all required records atomically.

23. Verify the on_auth_user_created trigger exists:

> SELECT trigger_name, event_manipulation, action_statement FROM
> information_schema.triggers WHERE event_object_schema = \'auth\' AND
> event_object_table = \'users\';

24. Inspect the trigger function body for correctness:

> SELECT prosrc FROM pg_proc WHERE proname = \'handle_new_user\';

25. Confirm it creates: a workspace/org row, a profile row, a membership
    row (with \'owner\' role).

26. Check for idempotency: does it use ON CONFLICT or IF NOT EXISTS?

27. Test that duplicate email signup is rejected gracefully.

28. Confirm whether email confirmation is required before login
    (Dashboard \> Auth \> Settings).

*Lesson learned: If the trigger uses COALESCE for metadata fields,
verify what happens when raw_user_meta_data is null or missing expected
keys.*

**1.5 Multi-Factor Authentication (MFA)**

29. Check if MFA/TOTP is enabled in Dashboard \> Authentication \>
    Multi-Factor.

30. If enabled: verify the enrollment and verification flows in client
    code.

31. If not enabled: document whether it is planned and for which user
    roles.

**SECTION 2: Row-Level Security (RLS) Policies**

*Access: SQL + Dashboard \> Authentication \> Policies*

RLS is the single most critical security layer in Supabase. Every table
in the public schema MUST have RLS enabled. All data-bearing tables must
enforce tenant scoping.

**2.1 Global RLS Verification**

32. Run the following query. The result MUST be empty. Any table that
    appears is a critical vulnerability:

> SELECT tablename FROM pg_tables WHERE schemaname = \'public\' AND NOT
> rowsecurity;

33. Get a complete inventory of all tables and their RLS status:

> SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n
> ON n.oid = c.relnamespace WHERE n.nspname = \'public\' AND c.relkind =
> \'r\' ORDER BY c.relname;

34. Verify that any cache/enrichment tables have service-role-only
    policies (qual = \'false\' for authenticated):

> SELECT policyname, qual FROM pg_policies WHERE tablename =
> \'{{CACHE_TABLE}}\' AND roles = \'{authenticated}\';

**2.2 Per-Table Policy Audit**

35. Retrieve ALL policies across all tables:

> SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
> FROM pg_policies WHERE schemaname = \'public\' ORDER BY tablename,
> cmd;

36. For each table, verify: (a) SELECT policy exists with tenant
    scoping, (b) INSERT policy exists with WITH CHECK, (c) UPDATE/DELETE
    policies exist where needed.

37. Verify the tenant-scoping function is SECURITY DEFINER:

> SELECT proname, prosecdef FROM pg_proc WHERE proname =
> \'{{TENANT_FUNCTION}}\';

38. Confirm the tenant function cannot be called with arbitrary user IDs
    from client code (it should only be invoked within RLS policy
    context with auth.uid()).

**2.3 Common RLS Pitfalls to Check**

39. CRITICAL: Check if any policy uses the \'public\' role instead of
    \'authenticated\'. This grants access to unauthenticated requests:

> SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname
> = \'public\' AND roles::text LIKE \'%public%\';

40. Check for overly permissive DELETE policies (should users be able to
    delete activity logs?).

41. Verify that child tables (e.g., campaign_steps) scope through their
    parent table\'s workspace_id via subquery, not direct workspace_id
    column.

42. Confirm that INSERT policies use WITH CHECK (not just USING) to
    prevent data injection into other tenants.

*Lesson learned: In the LeadFlow audit, the notifications table had an
ALL policy granted to the \'public\' role instead of \'authenticated\'.
This allowed unauthenticated access. Always grep for public role
policies.*

**SECTION 3: Edge Functions --- Configuration & Security**

*Access: CLI + API + Code Review*

Edge functions are the most attack-surface-rich component of a Supabase
project. Every function must be audited for authentication,
authorization, input validation, error handling, and CORS configuration.

**3.1 Function Inventory & JWT Verification**

43. List all deployed functions and their verify_jwt status:

> CLI: npx supabase functions list \--project-ref {{PROJECT_ID}}

44. Or use the Supabase Management API: GET
    /v1/projects/{{PROJECT_ID}}/functions

45. Categorize each function into one of three classes:

-   User-facing (must have verify_jwt = true): send-\*, create-\*,
    enroll-\*, find-\*, score-\*, search-\*, check-\*, customer-\*

-   Webhook receivers (must have verify_jwt = false but MUST implement
    signature verification): \*-webhook

-   Public endpoints (verify_jwt = false, intentional): unsubscribe,
    public health checks

46. Every user-facing function with verify_jwt = false is a CRITICAL
    finding.

*Lesson learned: In the LeadFlow project, ALL 19 functions had
verify_jwt = false at launch. 13 user-facing functions were completely
unprotected at the gateway level.*

**3.2 Per-Function Security Audit**

For each function, retrieve the source code and verify the following:

47. Retrieve function source:

> CLI: npx supabase functions download {{FUNCTION_NAME}} \--project-ref
> {{PROJECT_ID}}

48. Authentication: Does the function validate the Authorization header?
    Does it call supabase.auth.getUser() or verify JWT claims?

49. Authorization (Workspace Ownership): After authenticating the user,
    does the function verify the user belongs to the workspace specified
    in the request body?

-   Pattern: Fetch profile.workspace_id for auth.uid(), compare against
    request\'s workspace_id.

-   For enrollment functions: compare campaign.workspace_id against
    user\'s workspace_id.

50. Suppression Check: Do send-\* functions check the suppressions table
    BEFORE sending?

51. Input Validation: Are required fields checked (lead_id,
    workspace_id, etc.)?

52. Error Handling: Does the function return safe error messages
    (allowlist pattern) or does it leak internal details, stack traces,
    or API keys?

-   Safe: \'Lead not found\', \'No sender email configured\'

-   Unsafe: \'SendGrid API error \[401\]:
    {\"errors\":\[{\"message\":\"\...\"}\]}\'

53. Service Role Key: Is SUPABASE_SERVICE_ROLE_KEY only used for
    privileged operations (inserting messages, suppression lookups)? Is
    it never returned in error responses?

**3.3 CORS Configuration**

54. Check if all functions return Access-Control-Allow-Origin: \*

55. User-facing functions should read ALLOWED_ORIGIN from environment
    and restrict to the production domain.

56. Webhook functions may retain wildcard CORS since they receive
    requests from external services.

57. Verify that OPTIONS preflight handling is present in all functions.

**3.4 Webhook Signature Verification**

58. email-webhook: Must verify SendGrid ECDSA signatures via
    X-Twilio-Email-Event-Webhook-Signature header. Requires
    SENDGRID_WEBHOOK_VERIFICATION_KEY secret.

59. sms-webhook / whatsapp-webhook: Must verify Twilio HMAC-SHA1
    signatures via X-Twilio-Signature header using TWILIO_AUTH_TOKEN.

60. stripe-webhook: Must verify Stripe signatures via
    stripe.webhooks.constructEvent() using STRIPE_WEBHOOK_SECRET.

61. If the corresponding secret is not set, the function should log a
    warning and gracefully skip verification (not silently pass).

*Lesson learned: The original LeadFlow deployment had zero webhook
signature verification. Any internet user could POST fabricated webhook
events to modify message statuses, inject notifications, or trigger
suppressions.*

**3.5 Edge Function Deployment Verification**

After deploying hardened functions, always verify the deployment
actually took effect:

62. Check that the function version number has incremented (v1 → v2).

63. Check that verify_jwt matches the intended setting.

64. Retrieve the deployed source code and confirm the security changes
    are present (not the old code).

65. Check the ezbr_sha256 hash changed from the previous deployment.

*Lesson learned: In the LeadFlow project, the Security Remediation
Report documented 9 function modifications as \'DONE\', but none had
been deployed to production. The live functions were all still at v1
with the original insecure code. Always verify deployments against the
live environment, not just local files.*

**SECTION 4: Secrets & Environment Variables**

*Access: CLI + Code Review*

**4.1 Edge Function Secrets Inventory**

66. List all configured secrets:

> CLI: npx supabase secrets list \--project-ref {{PROJECT_ID}}

67. Compare against the expected inventory. Common secrets for a
    multi-channel SaaS:

-   SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, SENDGRID_API_KEY

-   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

-   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

-   SENDGRID_WEBHOOK_VERIFICATION_KEY, ALLOWED_ORIGIN

-   Any enrichment API keys (Hunter, PDL, etc.)

68. Verify no secrets are missing that would cause runtime failures.

**4.2 Client-Side Variable Safety**

69. Verify that only public/anon keys are used in client-side code
    (VITE\_\*, NEXT_PUBLIC\_\*, etc.).

70. Search the build output (dist/ or .next/) for any secret key
    patterns:

> grep -r \'service_role\' dist/ ; grep -r \'sk_live\' dist/ ; grep -r
> \'SG\\.\' dist/

71. Check if .env or .env.local was ever committed to git history:

> git log \--all \--full-history \-- .env .env.local

72. If secrets were exposed in git history: ALL secrets must be rotated
    at each provider\'s dashboard.

*Lesson learned: The LeadFlow .env file was committed to git history.
This is a P0 finding that requires immediate rotation of every secret at
every external provider (SendGrid, Twilio, Stripe, OpenAI, etc.).*

**SECTION 5: Webhook Endpoints & External Integrations**

*Access: External Provider Dashboards + Code Review*

73. For each external service that sends webhooks, verify the endpoint
    URL is correct:

> https://{{PROJECT_ID}}.supabase.co/functions/v1/{{FUNCTION_NAME}}

74. Verify that signature verification is implemented in the function
    code (see Section 3.4).

75. Check that webhook handlers are idempotent (processing the same
    event twice should not cause duplicates).

76. Verify that webhook retry handling is correct (Stripe retries for 3
    days, SendGrid retries, Twilio retries).

77. For email services: verify domain authentication (DKIM, SPF, DMARC)
    in the provider\'s dashboard.

78. For SMS/WhatsApp: verify opt-out keyword handling (STOP,
    UNSUBSCRIBE, etc.) correctly adds to the suppressions table.

79. For payment webhooks: verify test vs. live mode matches the API key
    mode.

**SECTION 6: Database Schema & Table Audit**

*Access: SQL*

**6.1 Table Inventory**

80. List all tables in the public schema:

> SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n
> ON n.oid = c.relnamespace WHERE n.nspname = \'public\' AND c.relkind =
> \'r\' ORDER BY c.relname;

81. Compare against the expected table count from your schema
    documentation.

82. Check for any unexpected tables (potential security risk from manual
    SQL or migrations).

**6.2 Foreign Key & Cascade Audit**

83. Retrieve all foreign keys with their cascade behavior:

> SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table,
> rc.delete_rule FROM information_schema.table_constraints tc JOIN
> information_schema.key_column_usage kcu ON tc.constraint_name =
> kcu.constraint_name JOIN information_schema.constraint_column_usage
> ccu ON tc.constraint_name = ccu.constraint_name JOIN
> information_schema.referential_constraints rc ON tc.constraint_name =
> rc.constraint_name WHERE tc.constraint_type = \'FOREIGN KEY\' AND
> tc.table_schema = \'public\' ORDER BY tc.table_name;

84. Verify workspace_id foreign keys use ON DELETE CASCADE (deleting a
    workspace cleans up all data).

85. Check for problematic FK behaviors:

-   ON DELETE SET NULL on profile.workspace_id → orphans profiles after
    workspace deletion

-   ON DELETE NO ACTION on template references → prevents template
    deletion if used in campaigns

**6.3 Constraint Audit**

86. Check for missing unique constraints:

> SELECT conname, contype, pg_get_constraintdef(c.oid) FROM
> pg_constraint c JOIN pg_class r ON c.conrelid = r.oid WHERE r.relname
> = \'{{TABLE_NAME}}\' ORDER BY contype;

87. Common missing constraints:

-   workspace_members(workspace_id, user_id) --- prevents duplicate
    membership

-   subscriptions(workspace_id) --- one subscription per workspace

-   suppressions(workspace_id, phone_or_email, channel) --- prevents
    duplicate suppression entries

*Lesson learned: The LeadFlow workspace_members table had a unique
constraint on (workspace_id, invited_email) but NOT on (workspace_id,
user_id), allowing the same user to be added multiple times after
accepting an invite.*

**SECTION 7: Database Functions, Triggers & Enums**

*Access: SQL*

**7.1 RPC Functions**

88. List all public functions with their security definer status:

> SELECT p.proname, p.prosecdef, pg_get_function_arguments(p.oid) as
> args, pg_get_function_result(p.oid) as returns FROM pg_proc p JOIN
> pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = \'public\'
> AND p.prokind = \'f\' ORDER BY p.proname;

89. Verify that tenant-scoping functions (get_user_workspace_id, etc.)
    are SECURITY DEFINER.

90. Verify that credit-incrementing functions enforce plan limits.

91. Check that template-seeding functions are idempotent.

**7.2 Triggers**

92. List all triggers:

> SELECT trigger_name, event_manipulation, event_object_table,
> action_statement FROM information_schema.triggers WHERE trigger_schema
> = \'public\' OR event_object_schema = \'auth\' ORDER BY
> event_object_table;

93. Expected triggers: on_auth_user_created (signup flow), rate limit
    cleanup, updated_at auto-update.

**7.3 Enums**

94. List all enums and their values:

> SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) FROM
> pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON
> n.oid = t.typnamespace WHERE n.nspname = \'public\' GROUP BY t.typname
> ORDER BY t.typname;

95. Compare against expected enum values from your schema documentation.

**SECTION 8: Realtime & Pub/Sub Configuration**

*Access: SQL + Dashboard \> Realtime*

96. Check which tables are in the realtime publication:

> SELECT \* FROM pg_publication_tables WHERE pubname =
> \'supabase_realtime\';

97. Only tables that NEED realtime should be listed. Every additional
    table is a potential data leakage vector.

98. Verify that RLS policies on realtime tables properly scope data
    (e.g., notifications filtered by user_id).

99. Confirm no sensitive tables (leads, messages, payments) are
    inadvertently in the publication.

**SECTION 9: Storage Buckets & Policies**

*Access: SQL + Dashboard \> Storage*

100. List all storage buckets with their configuration:

> SELECT id, name, public, file_size_limit, allowed_mime_types FROM
> storage.buckets;

101. For each bucket, verify: (a) Public/private matches intent, (b)
     File size limit is set (recommended: 2MB for avatars/logos), (c)
     Allowed MIME types are restricted to expected types.

102. List all storage policies:

> SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE
> schemaname = \'storage\' ORDER BY policyname;

103. Verify that storage policies scope uploads/deletes to the user\'s
     workspace (e.g., folder path = workspace_id).

*Lesson learned: The LeadFlow workspace-logos bucket was public with no
file size limit, no MIME restrictions, and any authenticated user could
upload/delete any workspace\'s logos. This was a complete storage
security failure.*

**SECTION 10: Cron Jobs & Scheduled Tasks**

*Access: SQL + Dashboard \> Database \> Extensions*

104. Verify pg_cron and pg_net extensions are enabled:

> SELECT extname, extversion FROM pg_extension WHERE extname IN
> (\'pg_cron\', \'pg_net\');

105. List all registered cron jobs:

> SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;

106. For each expected cron job, verify it exists and is active.

107. Verify the cron job invokes the correct edge function URL with the
     service_role_key as Bearer token.

108. Check cron job execution history for failures.

*Lesson learned: In the LeadFlow project, pg_cron and pg_net were
enabled but the cron.job table was completely empty. The campaign-engine
scheduler was never registered, meaning campaigns would never
auto-execute. The cron_setup.sql script had not been run.*

**SECTION 11: API Settings & CORS**

*Access: Dashboard \> Settings \> API*

109. Verify the anon key matches the client-side environment variable.

110. Verify the service_role key is NOT exposed in client code or build
     artifacts.

111. Check API rate limiting settings.

112. Verify the project URL and API URL match .env configuration.

113. Check API schema exposure: only \'public\' schema should be
     accessible.

114. Verify PostgREST maximum rows setting (default: 1000).

**SECTION 12: Billing & Subscription Integration**

*Access: External Dashboard (Stripe) + SQL + Code Review*

115. Verify payment provider is in the correct mode (live vs. test) for
     the environment.

116. Confirm products and prices match the application\'s plan tiers.

117. Verify the checkout flow creates sessions with correct price IDs
     and success/cancel URLs.

118. Verify the webhook handler correctly syncs subscription status to
     the local database.

119. Confirm plan limits are enforced in application code (messages,
     leads, users, AI calls).

120. Test the full upgrade flow end-to-end.

**SECTION 13: Multi-Tenancy & Workspace Isolation**

*Access: SQL + Code Review*

Workspace isolation is the most critical security property of any
multi-tenant platform. A failure here means data leakage between
customers.

121. Verify every SELECT/INSERT/UPDATE/DELETE query in every hook file
     filters by workspace_id.

122. Confirm the tenant-scoping function is SECURITY DEFINER and cannot
     be called with arbitrary user_ids.

123. Test cross-workspace isolation: User A should NEVER see User B\'s
     data.

124. Verify team invitation flow correctly associates new members with
     the inviting workspace.

125. Confirm workspace_members enforces unique (workspace_id, user_id)
     constraint.

126. Verify workspace deletion cascades correctly to all dependent
     tables.

127. Check that role enum (owner, admin, member) is enforced for
     permission-gated actions.

**SECTION 14: Rate Limiting & Abuse Prevention**

*Access: SQL + Code Review + Dashboard*

128. AI calls: Verify daily limit per workspace is enforced.

129. Search/enrichment: Verify rate limit tables and credit tracking.

130. Message sending: Verify plan limits are checked before send.

131. CSV import: Verify lead count limits per plan.

132. Auth rate limiting: Verify Supabase\'s built-in rate limiting is
     not disabled.

133. Verify rate limit cleanup triggers work correctly and don\'t
     interfere with active checks.

**SECTION 15: Compliance, Consent & Suppression**

*Access: SQL + Code Review*

134. Verify suppression table is checked BEFORE every send function.

135. Confirm unsubscribe endpoint correctly adds to suppressions and
     updates lead status.

136. Verify email footer includes: unsubscribe link, physical address,
     privacy policy (CAN-SPAM).

137. Confirm SMS opt-out keywords (STOP, UNSUBSCRIBE, etc.) are handled
     in webhook.

138. Verify consent tracking fields exist on leads table.

139. Confirm campaign enrollment respects suppression list.

**SECTION 16: Logging, Monitoring & Observability**

*Access: Dashboard \> Logs + SQL*

140. Review edge function invocation errors in Dashboard \> Logs (last 7
     days).

141. Check slow queries in Dashboard \> Database \> Query Performance
     (\> 500ms).

142. Verify activity logging is recording all expected activity types.

143. Confirm AI/enrichment usage is tracked for cost monitoring.

144. Verify error handling in edge functions returns structured JSON,
     not stack traces.

145. Review CI/CD pipeline: build + test steps passing on latest commit.

146. Check that pg_stat_statements extension is enabled for query
     monitoring:

> SELECT extname FROM pg_extension WHERE extname =
> \'pg_stat_statements\';

**SECTION 17: Migration History & Schema Drift**

*Access: CLI + Dashboard \> Database \> Migrations*

147. List all applied migrations:

> CLI: npx supabase migration list \--project-ref {{PROJECT_ID}}

148. Compare local migration files against applied migrations to detect
     drift.

149. Check for manual SQL changes in Dashboard that are not captured in
     migration files.

150. Regenerate database types and diff against checked-in types:

> CLI: npx supabase gen types typescript \--project-id {{PROJECT_ID}} \>
> types_new.ts && diff types_new.ts src/integrations/supabase/types.ts

151. Verify no migration applies destructive changes without explicit
     intent.

**SECTION 18: Client-Side Configuration**

*Access: Code Review*

152. Verify the Supabase client uses only the publishable/anon key,
     never the service role key.

153. Confirm auth config: persistSession, autoRefreshToken settings
     match security requirements.

154. Verify all protected routes are wrapped in an auth guard component.

155. Check that server state management (React Query, SWR, etc.) uses
     appropriate stale/cache times.

156. Verify admin-only routes are not exposed to non-admin users (check
     navigation, command palette, etc.).

157. Confirm error boundaries catch rendering errors and display
     fallback UI.

**SECTION 19: Performance & Indexing**

*Access: SQL + Dashboard \> Database \> Query Performance*

158. Retrieve all indexes on public tables:

> SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname
> = \'public\' ORDER BY tablename;

159. Verify indexes exist on: (a) tenant-scoping columns (workspace_id +
     status), (b) foreign key columns (lead_id, campaign_id), (c)
     frequently filtered columns (status, created_at), (d) lookup
     columns (linkedin_url, phone_or_email + channel).

160. Check for missing indexes on query-critical paths:

-   campaign_enrollments(status, enrolled_at) --- used by campaign
    engine scheduler

-   search_rate_limits(workspace_id, searched_at) --- used by rate limit
    checks

-   notifications(user_id, is_read, created_at) --- used by notification
    feed

161. Check connection pooling settings in Dashboard \> Settings \>
     Database.

162. Verify Supavisor is configured for expected concurrent user count.

*Lesson learned: The LeadFlow campaign_enrollments table had only a PK
index. The campaign engine query would do full sequential scans on every
15-minute cron run.*

**SECTION 20: Disaster Recovery & Backup**

*Access: Dashboard \> Settings \> Database \> Backups*

163. Verify automatic backups are enabled.

164. Confirm backup frequency and retention period match the plan (Pro:
     daily, 7-day retention).

165. Test PITR availability if on a paid plan.

166. Verify deployment platform (Vercel/Netlify) can be rolled back to
     previous version.

167. Confirm edge function deployments are versioned and can be
     reverted.

168. Verify the Git repository matches deployed code.

169. Document recovery procedure: DB restore → redeploy edge functions →
     verify webhooks → test critical paths.

170. Confirm payment subscription data can be resynchronized if local DB
     is restored from backup.

**SECTION 21: Post-Deployment Verification Protocol**

*Access: CLI + API + SQL*

This section was added based on the critical finding that remediation
code was marked as \'DONE\' in documentation but never actually deployed
to production. Every remediation MUST be verified against the live
environment.

**21.1 Edge Function Deployment Verification**

171. After deploying hardened functions, verify each function\'s version
     and settings:

> CLI: npx supabase functions list \--project-ref {{PROJECT_ID}}

172. For each modified function, confirm: (a) Version number
     incremented, (b) verify_jwt setting matches intent, (c) SHA hash
     changed from pre-remediation.

173. Retrieve deployed source code and verify security changes are
     present:

> API: Supabase Management API → GET function details with source

**21.2 SQL Remediation Verification**

174. After running remediation SQL, verify each change took effect:

-   New indexes: SELECT indexname FROM pg_indexes WHERE indexname =
    \'{{INDEX_NAME}}\';

-   New constraints: SELECT conname FROM pg_constraint WHERE conname =
    \'{{CONSTRAINT_NAME}}\';

-   RLS changes: SELECT policyname, roles FROM pg_policies WHERE
    tablename = \'{{TABLE}}\';

-   Cron jobs: SELECT jobid, schedule, active FROM cron.job;

-   Storage: SELECT file_size_limit, allowed_mime_types FROM
    storage.buckets WHERE id = \'{{BUCKET}}\';

**21.3 Secret Rotation Verification**

175. After rotating secrets, test each external integration end-to-end.

176. Send a test email, SMS, and WhatsApp message.

177. Process a test payment.

178. Run a test enrichment/search query.

179. Verify webhook delivery with the new credentials.

**SECTION 22: Cross-Environment Alignment**

*Access: CLI + Dashboard (per environment)*

Ensure development, staging, and production environments are aligned on
security configuration.

180. Compare RLS policies between environments (they should be
     identical).

181. Compare edge function versions and verify_jwt settings.

182. Verify staging uses test API keys (Stripe test mode, SendGrid
     sandbox, etc.).

183. Confirm that database migrations applied in staging match
     production.

184. Verify that environment-specific secrets (ALLOWED_ORIGIN, API keys)
     point to the correct endpoints.

**APPENDIX A: SQL Verification Quick Reference**

*Copy-paste these queries into the SQL Editor for rapid auditing.*

**Tables without RLS (must be empty):**

> SELECT tablename FROM pg_tables WHERE schemaname = \'public\' AND NOT
> rowsecurity;

**All RLS policies:**

> SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE
> schemaname = \'public\' ORDER BY tablename, cmd;

**Policies using \'public\' role (potential vulnerability):**

> SELECT tablename, policyname FROM pg_policies WHERE schemaname =
> \'public\' AND roles::text LIKE \'%public%\';

**All SECURITY DEFINER functions:**

> SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON
> p.pronamespace = n.oid WHERE n.nspname = \'public\' AND p.prosecdef =
> true;

**All triggers:**

> SELECT trigger_name, event_object_table, action_statement FROM
> information_schema.triggers WHERE trigger_schema = \'public\' OR
> event_object_schema = \'auth\';

**All enums:**

> SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) FROM
> pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON
> n.oid = t.typnamespace WHERE n.nspname = \'public\' GROUP BY
> t.typname;

**All indexes:**

> SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname
> = \'public\' ORDER BY tablename;

**All foreign keys with cascade rules:**

> SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table,
> rc.delete_rule FROM information_schema.table_constraints tc JOIN
> information_schema.key_column_usage kcu ON tc.constraint_name =
> kcu.constraint_name JOIN information_schema.constraint_column_usage
> ccu ON tc.constraint_name = ccu.constraint_name JOIN
> information_schema.referential_constraints rc ON tc.constraint_name =
> rc.constraint_name WHERE tc.constraint_type = \'FOREIGN KEY\' AND
> tc.table_schema = \'public\' ORDER BY tc.table_name;

**Realtime publication tables:**

> SELECT \* FROM pg_publication_tables WHERE pubname =
> \'supabase_realtime\';

**Storage buckets:**

> SELECT id, public, file_size_limit, allowed_mime_types FROM
> storage.buckets;

**Cron jobs:**

> SELECT jobid, schedule, command, active FROM cron.job;

**Extensions:**

> SELECT extname, extversion FROM pg_extension ORDER BY extname;

**APPENDIX B: Lessons Learned from LeadFlow Audit**

These findings are from a real production audit of a Supabase-backed
SaaS platform (19 tables, 19 edge functions, multi-channel messaging).
Every lesson resulted in a security fix.

**1. verify_jwt = false was set on ALL functions including user-facing
ones.**

Root cause: config.toml defaulted to false and was never updated. Fix:
Set verify_jwt = true on all user-facing functions and implement
app-level auth in webhook functions.

**2. The notifications RLS policy used the \'public\' role instead of
\'authenticated\'.**

Root cause: Copy-paste error during initial RLS setup. Fix: DROP and
recreate the policy with \'authenticated\' role.

**3. Storage bucket had no file size limit, no MIME restrictions, and no
workspace scoping.**

Root cause: Bucket was created via Dashboard with defaults. Fix: UPDATE
storage.buckets to set limits + replace policies with workspace-scoped
versions.

**4. Campaign-engine cron job was never registered despite pg_cron being
enabled.**

Root cause: cron_setup.sql was written but never executed. Fix: Execute
via SQL Editor + verify in cron.job table.

**5. Remediation report marked fixes as \'DONE\' but none were
deployed.**

Root cause: Code changes were made locally but the deployment step was
skipped. Fix: Always verify against the live environment using API/CLI,
never trust local file status.

**6. enrich-linkedin function was completely unauthenticated.**

Root cause: Function was written without auth during prototyping and
never hardened. Anyone on the internet could consume PDL API credits.
Fix: Add Bearer + JWT auth + verify_jwt = true.

**7. send-invite-email had no role check.**

Root cause: Stub function that only logged invites. Any authenticated
user could trigger invites. Fix: Full rewrite with owner/admin role
verification.

**8. workspace_members lacked a unique constraint on (workspace_id,
user_id).**

Root cause: Only (workspace_id, invited_email) was constrained. After
invite acceptance, duplicate active memberships were possible. Fix: Add
partial unique index WHERE user_id IS NOT NULL.

**9. Missing indexes on campaign_enrollments and search_rate_limits.**

Root cause: Tables were created with only PK indexes. Queries used by
the campaign engine and rate limiter would do sequential scans. Fix:
Create composite indexes on the columns used in WHERE clauses.

**10. .env committed to git history.**

Root cause: .gitignore was added after initial commit. Fix: Rotate ALL
secrets at ALL providers immediately.

*--- End of Master Audit Prompt ---*

Version 2.0 --- 22 Sections --- Derived from production audit of
LeadFlow (beam-lead)