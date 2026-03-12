# Agent 35 — Handoff

## Status: COMPLETE

## What's Done

### Prompt 35.0 — Assessment
- All P1/P2 issues confirmed. FIX-PLAN created.
- P2-1 (SSO test) already improved by Agent 22 — no further action needed.

### Prompt 35.1 — DNS Verification Edge Function Specification

#### Current Behavior (BROKEN)
`src/components/enterprise/CustomDomainConfig.tsx:95-117` — `handleVerifyDomain` performs client-side DB update only:
```typescript
const { error } = await supabase
  .from("custom_domains")
  .update({ verified: true, ssl_status: "active" })
  .eq("id", domain.id);
```
No actual DNS lookup. Any domain is marked as "verified" immediately.

#### Edge Function Specification: `dns-verify`

**Purpose**: Server-side DNS TXT record verification for custom domains.

**Endpoint**: `POST /functions/v1/dns-verify`

**Authentication**: Requires Supabase Auth JWT (workspace owner).

**Input**:
```json
{
  "domain_id": "uuid",
  "domain": "forms.example.com",
  "verification_token": "hex-token-from-custom_domains-row"
}
```

**Behavior**:
1. Validate that the calling user is a workspace member with owner role for the workspace that owns this domain.
2. Query DNS TXT records for `_formforge-verification.{domain}` using Deno's `Deno.resolveDns()` or a DNS-over-HTTPS provider (e.g., Cloudflare `https://cloudflare-dns.com/dns-query?name=_formforge-verification.{domain}&type=TXT`).
3. Search TXT records for a value matching `formforge-verify={verification_token}`.
4. If match found:
   - Update `custom_domains` row: `verified = true`, `ssl_status = 'provisioning'`
   - Return `{ verified: true }`
5. If no match:
   - Return `{ verified: false, error: "TXT record not found or does not match" }`
6. If DNS query fails:
   - Return `{ verified: false, error: "DNS lookup failed — domain may not exist or DNS propagation is still in progress" }`

**Output (success)**:
```json
{ "verified": true }
```

**Output (failure)**:
```json
{ "verified": false, "error": "TXT record not found or does not match" }
```

**SSL Provisioning Note**:
- SSL status should NOT be hardcoded to `"active"`. After DNS verification, set to `"provisioning"`.
- Actual SSL certificate provisioning depends on the custom domain routing strategy (see Prompt 35.3 below).
- A separate polling mechanism or webhook callback would set `ssl_status = "active"` once the certificate is issued.

**DNS Resolution Approaches**:
1. **Deno.resolveDns()** — Available in Supabase Edge Functions (Deno runtime). Simple but may not work in all regions.
2. **DNS-over-HTTPS (DoH)** — Uses HTTP fetch to Cloudflare/Google DNS API. Works everywhere, no region restrictions.
   - Cloudflare: `GET https://cloudflare-dns.com/dns-query?name={host}&type=TXT` with `Accept: application/dns-json`
   - Google: `GET https://dns.google/resolve?name={host}&type=TXT`
3. **Recommendation**: Use DNS-over-HTTPS (DoH) via Cloudflare for maximum compatibility.

**Frontend Change Required**:
Replace `handleVerifyDomain` in `CustomDomainConfig.tsx` to call the edge function:
```typescript
async function handleVerifyDomain(domain: CustomDomain) {
  setVerifying(domain.id);
  try {
    const { data, error } = await supabase.functions.invoke("dns-verify", {
      body: {
        domain_id: domain.id,
        domain: domain.domain,
        verification_token: domain.verification_token,
      },
    });
    if (error) throw error;
    if (data.verified) {
      toast({ title: t("enterprise.domains.verified") });
    } else {
      toast({ title: t("enterprise.domains.verifyFailed"), description: data.error, variant: "destructive" });
    }
    fetchDomains();
  } catch {
    toast({ title: t("enterprise.domains.verifyFailed"), variant: "destructive" });
  } finally {
    setVerifying(null);
  }
}
```

**Implementation Owner**: Agent 23 (Edge Functions) — this spec is a handoff document.

---

### Prompt 35.2 — White-Label on Public Pages Assessment

#### Current State: NOT APPLIED

**Two separate branding systems exist**:

1. **Form-level branding** (`forms.branding` JSONB column):
   - Set per form via the BrandingPanel in FormBuilder
   - Passed as `branding` prop to all public page components
   - Applied: `primaryColor`, `backgroundColor`, `backgroundGradient`, `logo`, `logoUrl`, `font`, `showPoweredBy`
   - **This works correctly.**

2. **Enterprise white-label** (`enterprise_settings` table):
   - Set per workspace via WhiteLabelConfig in Settings
   - Fields: `custom_app_name`, `custom_primary_color`, `custom_logo_url`, `custom_favicon_url`, `white_label_enabled`
   - **NOT read by any public page component.**

#### Affected Components

| Component | Receives form branding | Reads enterprise settings | Gap |
|-----------|----------------------|--------------------------|-----|
| `PublicForm.tsx` | Yes (fetches `forms.branding`) | No | Does not fetch `enterprise_settings` |
| `FormRenderer` | Yes (via props) | No | No enterprise fallback |
| `WaitlistLandingPage` | Yes (via props) | No | No enterprise fallback |
| `FeedbackSurveyPage` | Yes (via props) | No | No enterprise fallback |
| `SupportSubmitPage` | Yes (via props) | No | No enterprise fallback |

#### What Enterprise White-Label Should Do on Public Pages

1. **Replace "Powered by FormForge"**: When `white_label_enabled`, the footer should show `custom_app_name` instead of "FormForge", or hide the footer entirely.
2. **Workspace logo fallback**: If form has no logo set, use `custom_logo_url` from enterprise settings.
3. **Primary color fallback**: If form has no primary color set, use `custom_primary_color`.
4. **Favicon**: Set `custom_favicon_url` via `document.head` on public pages when enterprise settings exist.

#### Implementation Spec (Deferred — Not Phase 7)

**Reason for deferral**: This is a feature enhancement, not a bug fix. The form-level branding system works correctly. Enterprise white-label is an overlay/fallback layer that requires:

1. **PublicForm.tsx** changes:
   - Fetch `enterprise_settings` using the `workspace_id` already available from the forms query
   - Pass enterprise branding as a separate prop to public page components
   - Apply favicon via `useEffect` + `document.querySelector('link[rel="icon"]')`

2. **Public page components** changes:
   - Accept optional `enterpriseBranding` prop
   - Use enterprise values as fallback when form-level branding is not set
   - When `white_label_enabled`: replace "Powered by FormForge" text with `custom_app_name`

3. **RLS consideration**:
   - `enterprise_settings` currently requires workspace membership for SELECT
   - Public pages are anonymous — would need a new RLS policy: `SELECT allowed if related workspace has an active form`

**Decision**: Deferred to post-Phase 7. The form-level branding works. Enterprise white-label application to public pages requires RLS changes + component updates across multiple files.

---

### Prompt 35.3 — Custom Domain Routing Requirements

#### Current State: NOT IMPLEMENTED

Forms are accessed via `https://app.formforge.com/f/:formId`. Custom domains stored in `custom_domains` table are saved but never used for routing. There is no mechanism to serve forms from `https://forms.customer.com`.

#### Architecture Options

##### Option A: Cloudflare Workers Proxy (Recommended)

**How it works**: Customer points their domain's DNS (CNAME) to a Cloudflare Worker. The Worker proxies requests to the FormForge app.

**Pros**:
- Full SSL automation (Cloudflare for SaaS or SSL for SaaS)
- Global CDN edge network
- No changes to FormForge's hosting infrastructure
- Supports wildcard certificates
- Mature, battle-tested solution used by many SaaS platforms

**Cons**:
- Requires Cloudflare account (cost: ~$2/domain for SSL for SaaS)
- Adds a network hop (minimal latency impact)
- Requires Cloudflare Workers Paid plan for custom domains at scale

**Worker logic**:
```
Request: https://forms.customer.com/
→ Look up workspace_id from custom_domains table (via API or cached mapping)
→ Proxy to: https://app.formforge.com/f/{default_form_id}?_domain=forms.customer.com
→ Or: Inject workspace context into request headers
```

##### Option B: Vercel Custom Domains (If Deployed on Vercel)

**How it works**: Vercel supports adding custom domains to projects. Customers CNAME their domain to `cname.vercel-dns.com`.

**Pros**:
- Native integration if FormForge deploys on Vercel
- Automatic SSL via Let's Encrypt
- No additional service needed

**Cons**:
- FormForge is a Vite SPA, not deployed on Vercel currently
- Vercel custom domains are project-level, not dynamic per-customer
- Would need Vercel API integration for dynamic domain management
- Vercel Pro/Enterprise plan required for API-managed domains

**Not recommended** unless FormForge migrates to Vercel hosting.

##### Option C: Supabase Custom Domains

**How it works**: Supabase offers custom domains for the Supabase project URL itself.

**Pros**:
- Native to existing infrastructure

**Cons**:
- Supabase custom domains are for the Supabase project URL (API/Auth), NOT for serving frontend content
- Does not solve the problem of routing custom domains to the SPA
- **Not applicable to this use case.**

##### Option D: Self-Managed Reverse Proxy (Caddy/Nginx)

**How it works**: Deploy a reverse proxy that accepts custom domains, terminates SSL, and proxies to the FormForge app.

**Pros**:
- Full control
- Automatic SSL via Caddy (built-in ACME/Let's Encrypt)
- No vendor lock-in

**Cons**:
- Requires managing infrastructure (VPS/container)
- SSL certificate management at scale can be complex
- No CDN benefits without additional setup

#### Recommendation: Option A (Cloudflare Workers)

Best balance of automation, cost, and reliability. Implementation steps:

1. **Cloudflare setup**:
   - Create a Cloudflare Worker that handles incoming requests on custom domains
   - Use Cloudflare for SaaS (SSL for SaaS) for automatic SSL on customer domains
   - Customer adds CNAME: `forms.customer.com → formforge-proxy.example.workers.dev`

2. **Domain lookup**:
   - Worker fetches workspace mapping from Supabase (with caching):
     ```sql
     SELECT cd.workspace_id, f.id as default_form_id
     FROM custom_domains cd
     JOIN forms f ON f.workspace_id = cd.workspace_id AND f.status = 'active'
     WHERE cd.domain = 'forms.customer.com' AND cd.verified = true
     LIMIT 1
     ```
   - Cache mapping in Cloudflare KV (TTL: 5 minutes)

3. **Request proxying**:
   - Proxy to FormForge app with custom header: `X-FormForge-Domain: forms.customer.com`
   - Or rewrite URL to include workspace context

#### Frontend Detection

`PublicForm.tsx` would detect a custom domain request via:

```typescript
// Option 1: Check current hostname against known app domains
const isCustomDomain = !window.location.hostname.endsWith("formforge.com")
  && window.location.hostname !== "localhost";

// Option 2: Check for proxy header (if SSR or edge middleware)
// Not applicable for Vite SPA — use Option 1

if (isCustomDomain) {
  // Look up workspace from custom_domains table using hostname
  const { data: domainData } = await supabase
    .from("custom_domains")
    .select("workspace_id")
    .eq("domain", window.location.hostname)
    .eq("verified", true)
    .maybeSingle();

  if (domainData) {
    // Fetch workspace's active forms or default form
    // Render form list or specific form
  }
}
```

#### SSL/TLS Considerations

1. **Certificate provisioning**: Handled by Cloudflare for SaaS — automatic certificate issuance when customer CNAME is verified.
2. **SSL status tracking**: After DNS verification (via `dns-verify` edge function), set `ssl_status = 'provisioning'`. Cloudflare webhook or polling would update to `'active'` once cert is issued.
3. **Certificate renewal**: Automatic with Cloudflare for SaaS (no action needed).
4. **Mixed content**: All resources must be served over HTTPS. FormForge app already uses HTTPS.

#### Database Changes Needed

Add column to `custom_domains`:
```sql
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS default_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;
```

Add RLS policy for anonymous domain lookup:
```sql
CREATE POLICY "custom_domains_public_lookup" ON public.custom_domains
  FOR SELECT USING (verified = true);
```

**Implementation Owner**: Infrastructure team — requires Cloudflare account setup, Worker deployment, and DNS configuration beyond frontend scope.

---

### Prompt 35.4 — Final Verification

- `npm run lint`: PASS (0 errors, 16 pre-existing warnings)
- `npx tsc --noEmit`: PASS (0 errors)
- SsoConfig: renders on Settings Enterprise tab (line 324), FeatureGate(sso, business), save/test work
- WhiteLabelConfig: renders on Settings Enterprise tab (line 325), FeatureGate(white_label, business), save works
- CustomDomainConfig: renders on Settings Enterprise tab (line 326), FeatureGate(custom_domain, growth), add/delete work

## Files Modified
No source code files were modified. All deliverables are documentation:
- `.agents-phase-7/feature-14-enterprise/FIX-PLAN.md` — created
- `.agents-phase-7/feature-14-enterprise/HANDOFF.md` — updated with specs
- `.agents-phase-7/feature-14-enterprise/PROGRESS.md` — updated

## Success Criteria Checklist
- [x] DNS verification documented as requiring edge function (spec written)
- [x] Custom domain routing requirements documented (4 options evaluated, Cloudflare recommended)
- [x] White-label application to public pages assessed (not applied, deferred with spec)
- [x] `npm run lint` passes
- [x] `npx tsc --noEmit` passes

## What's Next
Agent 35 work is COMPLETE. Agent 36 (Workflows) can proceed.

## Dependencies
- Batches 1-3 complete

## Downstream
- Agent 36 (Workflows) — unblocked, can proceed
- Agent 37 (i18n) — enterprise i18n keys already complete per scan report
- Agent 23 (Edge Functions) — DNS verification edge function spec ready for implementation
