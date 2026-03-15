# Scanner Report 13: Enterprise Features

**Feature**: Enterprise Features (SSO, Custom Domains, White-Label Branding, Powered-By Enforcement)
**Scanned**: 2026-03-15
**Status**: COMPLETE

---

## 1. Touchpoints

### Components
| File | Purpose |
|------|---------|
| `src/components/enterprise/SsoConfig.tsx` | SSO/SAML configuration UI (provider, metadata URL, certificate, entity ID, test connection) |
| `src/components/enterprise/WhiteLabelConfig.tsx` | White-label branding UI (app name, color, logo upload, favicon, preview) |
| `src/components/enterprise/CustomDomainConfig.tsx` | Custom domain management (add, verify, delete, DNS instructions) |
| `src/components/branding/PoweredByEnforcer.tsx` | "Powered by FormForge" footer enforcement by plan tier |
| `src/components/upgrade/FeatureGate.tsx` | Plan-gated wrapper with upgrade overlay + PaywallModal |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useEnterprise.ts` | CRUD for `enterprise_settings` table (SSO + white-label config); realtime subscription |
| `src/hooks/usePlanLimits.ts:61-73` | Feature gate map: `sso` -> `business`, `white_label` -> `business`, `custom_domain` -> `growth` |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/domains.ts` | `hexToHsl()` color conversion, `generateVerificationToken()`, `getDnsInstructions()` |
| `src/lib/stripe.ts:76-136` | `PLAN_FEATURES` map including `sso`, `white_label`, `custom_domain` for respective tiers |

### Auth Integration
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx:62-134` | `signInWithSSO(workspaceSlug)` method: looks up workspace, checks SSO enabled, calls `supabase.auth.signInWithSSO()` |

### Layout Integration
| File | Purpose |
|------|---------|
| `src/components/Navbar.tsx:35,60-68,161` | Replaces logo + app name with white-label values when `whiteLabelEnabled` |
| `src/components/AppLayout.tsx:16-53` | Injects custom primary color CSS vars, custom favicon, custom page title |

### Settings Page
| File | Purpose |
|------|---------|
| `src/pages/Settings.tsx:237-343` | Enterprise tab (owner-only): renders `SsoConfig`, `WhiteLabelConfig`, `CustomDomainConfig` |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/021_enterprise.sql` | `enterprise_settings` table (SSO + white-label per workspace), RLS, realtime |
| `supabase/migrations/022_custom_domains.sql` | `custom_domains` table (domain, verified, verification_token, ssl_status), RLS, realtime |
| `supabase/migrations/024_rls_role_remediation.sql:520-595` | Hardened RLS: all enterprise/domain policies scoped to `authenticated` role |

### Pricing/Marketing
| File | Purpose |
|------|---------|
| `src/pages/Pricing.tsx:148-155,177-178` | Business tier lists white-label, SSO; comparison table shows SSO + dedicated support as business-only |

### i18n
| File | Purpose |
|------|---------|
| `src/i18n/locales/en.json:1280-1364` | Full enterprise translation keys (SSO, white-label, domains) |
| `src/i18n/locales/he.json` | Hebrew translations for enterprise features |

### Tests
| File | Purpose |
|------|---------|
| `src/test/lib/stripe.test.ts:106-109` | Verifies `PLAN_FEATURES.business` contains `sso` and `white_label` |
| `src/test/hooks/useSubscription.test.ts:147` | Verifies non-business plan cannot access `sso` |

---

## 2. E2E Flows

### Flow 2.1: Configure SSO
**Path**: Settings -> Enterprise tab -> SSO card

1. Owner navigates to `/settings?tab=enterprise`
2. `SsoConfig` renders inside `FeatureGate feature="sso" requiredPlan="business"`
3. Owner toggles SSO on, selects provider (Okta/Azure AD/OneLogin/Custom SAML)
4. Enters metadata URL, entity ID, certificate
5. Clicks "Test Connection" -> fetches metadata URL client-side, validates XML/SAML markers
6. Clicks "Save Changes" -> `useEnterprise.updateSettings()` upserts to `enterprise_settings`

**SSO Login Flow**:
1. `AuthContext.signInWithSSO(workspaceSlug)` is exposed but **never called from any UI**
2. Auth.tsx has no SSO login button or workspace slug input

**Verdict: PARTIAL / BROKEN**
- Configuration UI is complete and well-built
- SSO test connection has been improved with content-type validation (Agent 22)
- The `signInWithSSO` method exists in AuthContext but there is **no UI to trigger it** -- the Auth.tsx page has no SSO login flow
- SSO configuration is stored in `enterprise_settings` but the Supabase Auth SSO provider registration is a manual step (not automated)
- No SAML assertion consumer service (ACS) endpoint exists

### Flow 2.2: Configure Custom Domain
**Path**: Settings -> Enterprise tab -> Custom Domains card

1. Owner sees `CustomDomainConfig` inside `FeatureGate feature="custom_domain" requiredPlan="growth"`
2. Enters domain (e.g. `forms.example.com`), clicks "Add Domain"
3. Client-side regex validates domain format
4. `generateVerificationToken()` creates 48-char hex token
5. Inserts row into `custom_domains` table
6. DNS instructions displayed: TXT record `_formforge-verification.{domain}` = `formforge-verify={token}`
7. Owner adds DNS record, clicks "Verify Domain"
8. **Verification is FAKE**: directly sets `verified: true` + `ssl_status: 'active'` client-side (lines 109-112 of CustomDomainConfig.tsx)

**Verdict: SCAFFOLD / NOT FUNCTIONAL**
- Domain management UI is complete (add, verify, delete, DNS instructions, status badges)
- **Verification does not actually check DNS** -- it just marks as verified immediately
- No server-side edge function exists to verify DNS TXT records
- No actual domain routing exists (no reverse proxy, no Cloudflare/Vercel integration)
- Custom domains are stored but never used for form serving
- SSL provisioning is not implemented

### Flow 2.3: White-Label Branding
**Path**: Settings -> Enterprise tab -> White Label card

1. Owner sees `WhiteLabelConfig` inside `FeatureGate feature="white_label" requiredPlan="business"`
2. Toggles white-label on
3. Sets custom app name, primary color (color picker + hex input), uploads logo (to Supabase Storage `branding` bucket), sets favicon URL
4. Preview panel shows changes
5. Saves to `enterprise_settings` via `useEnterprise.updateSettings()`

**Runtime effect**:
- `AppLayout.tsx` injects `--primary`, `--ring`, `--sidebar-primary` CSS vars from `custom_primary_color`
- `AppLayout.tsx` replaces favicon and page title
- `Navbar.tsx` replaces logo image and app name text

**Verdict: WORKING (admin side only)**
- White-label works well for the admin dashboard (Navbar + AppLayout)
- **NOT applied to public-facing pages** (`PublicForm.tsx` does not read enterprise settings or apply white-label)
- White-label CSS vars are cleaned up on unmount, preventing color bleed
- Logo upload has proper validation (image type, 2MB limit) and uses public Supabase Storage bucket
- Bucket is hardened (migration 027: 2MB limit, image MIME types only)

### Flow 2.4: Powered-By Enforcement
**Path**: Public form pages

1. `PoweredByEnforcer` component accepts `showPoweredBy` and `plan` props
2. Logic: Business plan -> never show; Free plan -> always show; Other plans -> respect `showPoweredBy` setting

**Verdict: UNUSED / DEAD CODE**
- `PoweredByEnforcer` is **never imported or rendered** anywhere except its own definition file
- `PublicForm.tsx:280-286` has its own inline "Powered by FormForge" implementation that only checks `form.branding.showPoweredBy` -- it does NOT check plan tier
- The inline implementation allows Free plan users to disable "Powered by" (by setting `showPoweredBy: false` in branding), which defeats the business purpose
- Only the standard form mode has the powered-by footer; waitlist, feedback, and support modes do not render any powered-by footer

---

## 3. Cross-Dependencies

| Enterprise Feature | Depends On | Notes |
|---|---|---|
| SSO Config | `useEnterprise` hook, `FeatureGate`, `enterprise_settings` table | SSO settings stored but not consumed by auth flow |
| SSO Auth | `AuthContext.signInWithSSO`, `enterprise_settings` table, Supabase Auth SSO | No UI trigger; Supabase SSO provider must be manually registered |
| Custom Domains | `custom_domains` table, `FeatureGate`, `domains.ts` utils | No server-side DNS verification; no domain routing |
| White Label (admin) | `useEnterprise`, `AppLayout`, `Navbar`, `hexToHsl`, `branding` storage bucket | Works for admin views |
| White Label (public) | **Not connected** | PublicForm.tsx doesn't read enterprise settings |
| PoweredByEnforcer | **Dead code** -- not imported anywhere | PublicForm.tsx has separate inline implementation |
| Feature Gating | `usePlanLimits`, `FeatureGate`, `isPlanAtLeast`, Stripe plan tiers | Working; gates SSO to business, white-label to business, custom domains to growth |
| Billing Integration | `useSubscription`, `PLAN_FEATURES`, `FEATURE_REQUIRED_PLAN` | Feature flags correctly defined for all enterprise features |

---

## 4. Parallelism Assessment

Enterprise features are **mostly independent** and can be developed in parallel:

| Feature | Can Parallelize? | Blockers |
|---------|------------------|----------|
| SSO login UI | Yes | Only needs Auth.tsx changes |
| DNS verification edge function | Yes | Self-contained Supabase Edge Function |
| Custom domain routing | No | Requires infrastructure decision (Cloudflare, Vercel, etc.) |
| White-label on public pages | Yes | Needs PublicForm.tsx + mode-specific components updated |
| PoweredByEnforcer integration | Yes | Replace inline code in PublicForm.tsx |

---

## 5. Business Tier Mapping

### Feature Availability by Plan

| Feature | Free | Pro | Growth | Business |
|---------|------|-----|--------|----------|
| Custom Domains | - | - | Yes | Yes |
| SSO/SAML | - | - | - | Yes |
| White Label | - | - | - | Yes |
| Remove "Powered by" | No (always shown) | Configurable | Configurable | Auto-removed |

### Enforcement Points

1. **FeatureGate component** (`src/components/upgrade/FeatureGate.tsx:36`): `isOwnerBypass` lets workspace owners bypass ALL feature gates regardless of plan tier. This means a Free-plan workspace owner can access SSO config, white-label config, and custom domains.
   - **P1 Issue**: Owner bypass is intentional for dev/testing but creates a loophole where non-paying owners can configure enterprise features. While RLS prevents non-owners from writing, the owner on a Free plan can configure SSO, white-label, etc.

2. **FEATURE_REQUIRED_PLAN map** (`src/hooks/usePlanLimits.ts:61-73`):
   - `custom_domain` -> `growth`
   - `sso` -> `business`
   - `white_label` -> `business`

3. **PLAN_FEATURES map** (`src/lib/stripe.ts:76-136`):
   - Growth: includes `custom_domain`
   - Business: includes `sso`, `white_label`, `custom_domain`

4. **PoweredByEnforcer** (`src/components/branding/PoweredByEnforcer.tsx:17-21`):
   - Business plan: never show branding
   - Free plan: always show branding
   - Other plans: respect `showPoweredBy` setting
   - **BUT**: Component is dead code -- never used

---

## 6. Auth & RBAC Audit

### Who Can Configure Enterprise Features

| Action | Required Role | Enforcement Point |
|--------|---------------|-------------------|
| View Enterprise tab | Workspace owner | `Settings.tsx:238` -- `isOwner` check hides tab trigger |
| Read enterprise_settings | Any workspace member | RLS: `enterprise_settings_select_member` |
| Insert/update/delete enterprise_settings | Workspace owner only | RLS: `enterprise_settings_insert_owner`, `_update_owner`, `_delete_owner` |
| Read custom_domains | Any workspace member | RLS: `custom_domains_select_member` |
| Insert/update/delete custom_domains | Workspace owner only | RLS: `custom_domains_insert_owner`, `_update_owner`, `_delete_owner` |
| Trigger SSO login | Anyone (if they know workspace slug) | `AuthContext.signInWithSSO` -- no auth required for the lookup |

### RBAC Findings

1. **Proper**: Enterprise tab is hidden for non-owners in Settings.tsx UI
2. **Proper**: RLS policies enforce owner-only write access at database level (hardened in migration 024)
3. **Proper**: All RLS policies use `TO authenticated` role (migration 024 hardening)
4. **Issue**: `handleDeleteDomain` in CustomDomainConfig.tsx (line 128) deletes by `id` only without `workspace_id` filter. RLS protects this, but defense-in-depth suggests adding `workspace_id` filter.
5. **Issue**: `enterprise_settings` SELECT policy allows any workspace member to read SSO certificates and metadata URLs. These are sensitive values that should potentially be masked in the UI or restricted to owners only for SELECT as well.

---

## 7. API Security Audit

### SSO Security

1. **SSO Certificate Storage** (`enterprise_settings.sso_certificate`):
   - X.509 certificate is stored as plaintext in the database
   - Any workspace member can read it via SELECT RLS policy
   - **Risk**: Low (certificates are public keys, not secrets), but metadata URL exposure is a minor concern

2. **SSO Metadata URL Test** (`SsoConfig.tsx:69-166`):
   - Client-side fetch to arbitrary URLs (SSRF risk is limited since this runs in the browser, not server-side)
   - Good: URL validation with `new URL()` before fetch
   - Good: 10-second timeout with AbortController
   - Good: Content-type validation for XML/SAML markers (Agent 22 improvement)
   - Good: Graceful CORS fallback with no-cors reachability check

3. **SSO Login Flow** (`AuthContext.tsx:64-132`):
   - Uses `supabase.auth.signInWithSSO({ domain: workspaceSlug })` which relies on Supabase's built-in SSO provider registry
   - Good: Checks enterprise_settings to verify SSO is enabled before attempting
   - Good: User-friendly error messages for common failure scenarios
   - Good: Error logging via `logError()`
   - Issue: Passes `workspaceSlug` as the `domain` parameter to `signInWithSSO`, but Supabase SSO expects the email domain, not a workspace slug -- this may not work correctly

### Custom Domain Security

1. **Domain Verification Token** (`domains.ts:46-50`):
   - Uses `crypto.getRandomValues(new Uint8Array(24))` -- cryptographically secure, 48 hex chars
   - Good entropy for DNS verification

2. **Domain Validation** (`CustomDomainConfig.tsx:71`):
   - Regex `/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/` is reasonable but does not prevent:
     - Internal/private domains
     - Domains with underscores (valid in some DNS contexts)
   - Does not block `localhost` or IP addresses (minor, but worth noting)

3. **FAKE DNS Verification** (`CustomDomainConfig.tsx:101-123`):
   - **P0 Issue**: Verification simply sets `verified: true` without actually checking DNS
   - Comment on line 104-105 acknowledges this: "In a production environment, this would call a server-side function"
   - Any user can mark any domain as verified

### Storage Security

1. **Branding Bucket** (`supabase/migrations/007_branding_storage_bucket.sql`):
   - Public read access (correct -- logos need to be displayed publicly)
   - Authenticated upload (any authenticated user can upload to any path)
   - Hardened in migration 027: 2MB limit, image MIME types only
   - **Issue**: No path-level restriction -- a user in workspace A could overwrite workspace B's logo if they guess the path `{workspace_id}/white-label-logo.{ext}`

---

## 8. Code Architecture & Quality

### Strengths

1. **Clean separation**: Enterprise settings (SSO + white-label) share one table via `useEnterprise` hook; custom domains have their own table and self-contained component
2. **Realtime**: `useEnterprise` subscribes to postgres changes on `enterprise_settings`, so multiple tabs stay in sync
3. **i18n**: All user-facing strings are fully translated (en + he)
4. **FeatureGate pattern**: Consistent use of `FeatureGate` wrapper with plan-based access control
5. **Loading/error states**: All three enterprise components handle loading, error, and empty states properly
6. **Cleanup**: AppLayout restores CSS variables on unmount
7. **hexToHsl utility**: Properly converts hex colors to HSL for CSS variable injection

### Issues

1. **Type safety gap**: `enterprise_settings` and `custom_domains` tables are NOT in the generated `src/integrations/supabase/types.ts`. The hook uses `as` casts (lines 65, 124 of useEnterprise.ts; line 58 of CustomDomainConfig.tsx) to work around this. All Supabase queries for these tables lack compile-time type checking.

2. **Duplicate state management**: `SsoConfig.tsx` and `WhiteLabelConfig.tsx` both maintain local `useState` copies of enterprise settings, synced via `useEffect`. This creates a sync lag and risks stale state if the user switches tabs quickly.

3. **Inconsistent API patterns**:
   - `CustomDomainConfig` manages its own fetch/CRUD (direct supabase calls)
   - `SsoConfig` and `WhiteLabelConfig` use `useEnterprise` hook
   - This means custom domains have no realtime subscription

4. **`useEnterprise` upsert pattern** (line 105-112): Spreads `DEFAULT_SETTINGS` + `settings` + `updates`, then strips timestamps. This works but could overwrite non-null DB values with defaults if `settings` is null (first save scenario is fine due to spread order, but fragile).

---

## 9. Error Handling & Resilience

### Good Patterns

| Pattern | Location |
|---------|----------|
| Toast feedback on all save/delete/verify operations | All three enterprise components |
| Retry button on load failures | SsoConfig:185, WhiteLabelConfig:109, CustomDomainConfig:160 |
| AbortController timeout (10s) for SSO test | SsoConfig:87-88 |
| CORS fallback for SSO test | SsoConfig:148-162 |
| Duplicate domain detection via error message parsing | CustomDomainConfig:89 |
| File type + size validation before upload | WhiteLabelConfig:47-54 |
| Error logging in SSO auth flow | AuthContext:76,90,116,129 |

### Missing Patterns

1. **No confirmation dialog for domain deletion** (`CustomDomainConfig.tsx:125-137`): Clicking the trash icon immediately deletes the domain with no "Are you sure?" prompt
2. **No optimistic update rollback**: Domain deletion updates local state optimistically but does not roll back if the database delete fails (line 135 runs even if there's a different error path)
3. **No rate limiting on domain verification**: Users can spam the "Verify Domain" button
4. **No rate limiting on domain additions**: No limit on how many domains a workspace can add
5. **SSO test connection does not clear timeout on CORS fallback path** if the initial fetch throws a non-AbortError: the `clearTimeout(timeoutId)` on line 134 handles this, but the `timeoutId` timer will still fire its abort callback after the fallback succeeds (harmless but messy)

---

## 10. Documentation Audit

### Existing Documentation

| Source | Coverage |
|--------|----------|
| `CLAUDE.md` | No mention of enterprise features (predates them) |
| `docs/database-schema.md` | References enterprise_settings and custom_domains tables |
| `docs/api-security.md` | References SSO and enterprise |
| `docs/security-baseline.md` | References SSO configuration |
| `en.json` i18n keys | Complete translations for all enterprise UI |
| Code comments | "Agent 14" annotations throughout; "Agent 22" SSO test improvements noted |

### Missing Documentation

1. No dedicated enterprise features documentation
2. No SSO setup guide for IT admins (how to configure Okta/Azure AD/OneLogin)
3. No custom domain setup guide
4. No API documentation for enterprise settings endpoints
5. No architectural decision record explaining the stub/scaffold nature of custom domains and SSO

---

## 11. Product Growth & Innovation

### Current State Assessment

Enterprise features are at approximately **40% completion**:
- **White-label (admin)**: ~80% complete (working for admin dashboard, missing public page support)
- **SSO**: ~30% complete (config UI done, auth flow coded but no login UI, requires Supabase SSO provider registration)
- **Custom domains**: ~20% complete (UI scaffold only, no server-side verification or routing)
- **Powered-by enforcement**: ~10% complete (component exists but unused)

### Growth Opportunities

1. **SSO**: Once a login UI is added to Auth.tsx, this becomes a strong enterprise selling point. Supabase Auth supports SAML SSO natively -- the plumbing exists.

2. **Custom Domains**: This is the feature gap most visible to enterprise customers. Implementing with Cloudflare for SaaS (or similar) would enable `forms.customer.com` URLs.

3. **White-Label for Public Pages**: Extending white-label to public form pages (waitlist, feedback, support, standard) would complete the offering. Currently only admin sees the branding.

4. **Audit Logging**: Enterprise customers typically require audit logs. No audit log exists for enterprise setting changes.

5. **SCIM Provisioning**: Natural extension of SSO -- automatic user provisioning/deprovisioning via SCIM.

6. **IP Allowlisting**: Common enterprise security requirement not currently offered.

---

## 12. Issues Found

### P0 (Critical / Security)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P0-1 | Fake DNS verification | `CustomDomainConfig.tsx:101-123` | "Verify Domain" immediately marks domain as verified without checking DNS TXT records. Any user can claim ownership of any domain. In production, this enables domain hijacking/impersonation. |
| P0-2 | Owner bypass defeats plan gating | `FeatureGate.tsx:36`, `usePlanLimits.ts:93` | Workspace owners on Free plan can access all enterprise features (SSO config, white-label, custom domains). While this may be intentional for development, it creates a production loophole. |

### P1 (High / Functional)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P1-1 | No SSO login UI | `src/pages/Auth.tsx` | `signInWithSSO` is implemented in AuthContext but Auth.tsx has no SSO button, workspace slug input, or SSO login flow. The feature is configured but unusable. |
| P1-2 | PoweredByEnforcer is dead code | `src/components/branding/PoweredByEnforcer.tsx` | Component is never imported or rendered. PublicForm.tsx has its own inline "Powered by" that does NOT check plan tier, allowing Free-plan users to remove branding via `showPoweredBy: false`. |
| P1-3 | White-label not applied to public pages | `src/pages/PublicForm.tsx` | Public form pages (the actual customer-facing content) do not read enterprise settings. White-label only works in the admin dashboard. |
| P1-4 | Missing generated types for enterprise tables | `src/integrations/supabase/types.ts` | `enterprise_settings` and `custom_domains` are not in the auto-generated types. All queries use `as` type assertions, losing compile-time safety. |
| P1-5 | SSO `domain` parameter mismatch | `AuthContext.tsx:105` | `signInWithSSO({ domain: workspaceSlug })` passes workspace slug, but Supabase SSO expects an email domain (e.g., `acme.com`). This will fail at runtime. |
| P1-6 | Custom domains have no functional purpose | `CustomDomainConfig.tsx` | Domains are stored in the database but never used for routing, form serving, or any other purpose. The entire feature is a UI scaffold. |

### P2 (Medium / Quality)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P2-1 | No delete confirmation for domains | `CustomDomainConfig.tsx:125` | Domain deletion has no confirmation dialog. Accidental clicks immediately delete the domain record. |
| P2-2 | Delete domain lacks workspace_id filter | `CustomDomainConfig.tsx:128-129` | `.delete().eq("id", domainId)` -- RLS protects this, but defense-in-depth recommends adding `.eq("workspace_id", workspaceId)`. |
| P2-3 | Storage path guessable for branding uploads | `WhiteLabelConfig.tsx:59` | Upload path is `{workspaceId}/white-label-logo.{ext}` -- any authenticated user can overwrite another workspace's logo if they know the workspace ID. Storage policies only check `bucket_id`, not path ownership. |
| P2-4 | No domain count limit | `CustomDomainConfig.tsx:67-98` | No limit on how many custom domains a workspace can add. Could be abused to create thousands of entries. |
| P2-5 | Enterprise settings member-readable | `021_enterprise.sql:55-58` | All workspace members can SELECT enterprise_settings including SSO certificate and metadata URL. Consider restricting SELECT to owners only, or masking sensitive fields. |
| P2-6 | No custom domains realtime subscription | `CustomDomainConfig.tsx` | Unlike `useEnterprise` which has realtime, `CustomDomainConfig` fetches domains once and does not subscribe to changes. Multi-tab edits will be inconsistent. |
| P2-7 | No enterprise feature tests | `src/test/` | No unit tests for `useEnterprise`, `CustomDomainConfig`, `SsoConfig`, `WhiteLabelConfig`, or `PoweredByEnforcer`. Only indirect references in stripe/subscription tests. |
| P2-8 | Title/favicon not restored on white-label disable | `AppLayout.tsx:43-45` | Title and favicon are set but the cleanup function (lines 47-52) only restores CSS variables, not the original page title or favicon. |

---

## 13. Recommended Fix Path

### Phase 1: Fix Security & Critical Issues (P0)

1. **P0-1**: Create a Supabase Edge Function `verify-domain` that:
   - Accepts domain ID + workspace ID
   - Queries DNS TXT records for `_formforge-verification.{domain}`
   - Compares against stored verification token
   - Only then sets `verified: true`
   - Remove client-side verification from `CustomDomainConfig.tsx:101-123`

2. **P0-2**: Remove `isOwnerBypass` from `FeatureGate` or make it conditional:
   - Option A: Remove entirely (owners must have correct plan)
   - Option B: Only bypass in development mode (`import.meta.env.DEV`)
   - Option C: Keep bypass but add server-side plan check in database triggers/functions

### Phase 2: Complete Core Flows (P1)

3. **P1-1**: Add SSO login section to Auth.tsx:
   - "Sign in with SSO" expandable section
   - Workspace slug input field
   - Calls `signInWithSSO(slug)` from AuthContext
   - Shows loading/error states

4. **P1-5**: Fix SSO domain parameter:
   - Map workspace slug to the SSO provider's domain
   - Or use `providerId` instead of `domain` in the `signInWithSSO` call

5. **P1-2 + P1-3**: Wire PoweredByEnforcer into public pages:
   - Import and render `PoweredByEnforcer` in `PublicForm.tsx` (replacing inline implementation)
   - Add to waitlist, feedback, and support public page components
   - Pass `plan` prop by looking up workspace subscription in PublicForm.tsx (already fetched for submission gate)

6. **P1-4**: Regenerate Supabase types:
   ```bash
   npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts
   ```

### Phase 3: Quality & Polish (P2)

7. **P2-1**: Add confirmation dialog before domain deletion (use existing `AlertDialog` from shadcn/ui)
8. **P2-2**: Add `.eq("workspace_id", workspaceId)` to delete query
9. **P2-3**: Add storage path-level RLS or validate workspace ownership in upload function
10. **P2-4**: Add domain count limit check (e.g., max 5 per workspace on growth, unlimited on business)
11. **P2-6**: Add realtime subscription to `CustomDomainConfig` (follow `useEnterprise` pattern)
12. **P2-7**: Write tests for enterprise hooks and components
13. **P2-8**: Store original title/favicon before overriding, restore on cleanup

### Phase 4: Feature Completion

14. **P1-6**: Implement actual domain routing (infrastructure dependent):
    - Cloudflare for SaaS SSL + DNS
    - Or Vercel custom domains API
    - Or reverse proxy with Let's Encrypt
15. **P1-3 extended**: Apply white-label branding to public form pages:
    - Read enterprise settings in PublicForm.tsx via workspace_id
    - Apply custom colors, logo, app name to public page chrome

---

*End of Scanner Report 13*
