# Agent 19 — Prompts

## Prompt Checklist
- [ ] 19.0 — Planning & Infrastructure Audit
- [ ] 19.1 — CI/CD Pipeline Enhancement
- [ ] 19.2 — Error Monitoring & Observability
- [ ] 19.3 — Performance Optimization
- [ ] 19.4 — GDPR Compliance & Operational Docs

---

### PROMPT 19.0: Planning & Infrastructure Audit

```
You are the DevOps & Infrastructure Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

SUPER TASK: Harden production infrastructure for reliability, observability, and compliance.

TASK: Audit current infrastructure and create a remediation plan.

1. Audit current CI/CD:
   - Read .github/workflows/ci.yml
   - Document: what it runs, on which triggers, success/failure behavior
   - Identify gaps: no deployment step? No E2E tests? No build caching?
   - Check if workflow uses correct Node version (20)

2. Audit current deployment:
   - Read vercel.json — verify rewrite rules for SPA
   - Read netlify.toml — if exists
   - Check: is auto-deploy on push to main configured?
   - Verify: environment variables are set in Vercel dashboard

3. Audit error handling infrastructure:
   - Read src/lib/errorLogger.ts — what does it do currently?
   - Read src/components/ErrorBoundary.tsx — what does it catch?
   - Is there any external monitoring service connected? (Sentry, LogRocket)
   - Are errors silently swallowed anywhere?

4. Audit bundle size:
   Run: npm run build
   Document output:
   - Total bundle size
   - Largest chunks (which modules?)
   - Are there chunks >500kB? (known issue from v3 briefing)
   - Is code splitting via React.lazy() used for routes?

5. Audit current performance:
   - Is there any Web Vitals tracking?
   - Are images optimized? (check public/ directory)
   - Is there a service worker or caching strategy?

6. Check for missing pages/features:
   - Privacy policy page? (required for production SaaS)
   - Terms of service page?
   - GDPR data export capability?
   - Account deletion capability?
   - Cookie consent banner?

7. Read Agent 16's security-baseline.md and Agent 17's docs for context.

8. Create prioritized remediation plan:
   P0: CI/CD must run all checks + error monitoring must be connected
   P1: Bundle optimization + GDPR basics
   P2: Advanced monitoring + operational runbook

9. Update PROGRESS.md with session entry.

VERIFY:
- Complete audit documented
- Remediation plan created with priorities
- Current build output documented
```

---

### PROMPT 19.1: CI/CD Pipeline Enhancement

```
You are the DevOps & Infrastructure Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Create a production-grade CI/CD pipeline.

1. Enhance .github/workflows/ci.yml:
   name: CI/CD Pipeline
   
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]
   
   jobs:
     quality-gate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20', cache: 'npm' }
         - run: npm ci
         - name: Lint
           run: npm run lint
         - name: Type Check
           run: npx tsc --noEmit
         - name: Unit Tests
           run: npm run test -- --reporter=verbose
         - name: Test Coverage
           run: npm run test:coverage
           continue-on-error: true
         - name: Upload Coverage
           uses: actions/upload-artifact@v4
           with:
             name: coverage-report
             path: coverage/
     
     build:
       runs-on: ubuntu-latest
       needs: quality-gate
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20', cache: 'npm' }
         - run: npm ci
         - name: Build
           run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
         - name: Check Bundle Size
           run: |
             du -sh dist/
             find dist/assets -name "*.js" -exec ls -lh {} \;
         - uses: actions/upload-artifact@v4
           with:
             name: dist
             path: dist/
     
     deploy-preview:
       runs-on: ubuntu-latest
       needs: build
       if: github.event_name == 'pull_request'
       steps:
         - uses: actions/checkout@v4
         - uses: actions/download-artifact@v4
           with: { name: dist, path: dist/ }
         - name: Deploy Preview
           run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} --confirm
     
     deploy-production:
       runs-on: ubuntu-latest
       needs: build
       if: github.ref == 'refs/heads/main' && github.event_name == 'push'
       steps:
         - uses: actions/checkout@v4
         - uses: actions/download-artifact@v4
           with: { name: dist, path: dist/ }
         - name: Deploy Production
           run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --confirm

2. Create .github/workflows/edge-functions.yml:
   name: Deploy Edge Functions
   on:
     push:
       branches: [main]
       paths: ['supabase/functions/**']
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: supabase/setup-cli@v1
         - run: |
             for fn in supabase/functions/*/; do
               name=$(basename "$fn")
               echo "Deploying $name..."
               supabase functions deploy "$name" --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
             done
           env:
             SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

3. Create .github/workflows/db-migration.yml:
   name: Database Migration Check
   on:
     pull_request:
       paths: ['supabase/migrations/**']
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Validate SQL syntax
           run: |
             for f in supabase/migrations/*.sql; do
               echo "Checking $f..."
               # Basic syntax validation
             done

4. Document required GitHub Secrets:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VERCEL_TOKEN
   - SUPABASE_PROJECT_ID
   - SUPABASE_ACCESS_TOKEN

VERIFY:
- CI workflow YAML is valid
- Build job produces dist/
- Deployment jobs are conditional (preview vs production)
- Edge function deployment is automated
- npm run lint passes
```

---

### PROMPT 19.2: Error Monitoring & Observability

```
You are the DevOps & Infrastructure Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Connect error monitoring and add observability to FormForge.

NOTE: Do NOT install new dependencies without approval. Use lightweight 
approaches that work with existing infrastructure.

1. Upgrade src/lib/errorLogger.ts:
   The current errorLogger exists but doesn't send errors anywhere.
   
   Add a pluggable backend system:
   
   interface ErrorReport {
     message: string;
     stack?: string;
     context: Record<string, unknown>;
     timestamp: string;
     userId?: string;
     workspaceId?: string;
     url: string;
     userAgent: string;
   }
   
   a. Console backend (default, always active):
      Log structured errors to console for dev
   
   b. Supabase backend (production):
      Create a client-side error reporter that sends to a 
      Supabase edge function or directly to an error_logs table:
      
      Table: error_logs
      - id UUID PK
      - message TEXT
      - stack TEXT
      - context JSONB
      - user_id UUID (nullable)
      - workspace_id UUID (nullable)
      - url TEXT
      - user_agent TEXT
      - created_at TIMESTAMPTZ
      
      NOTE: Ask Agent 16 to add this table, or create migration 
      028_error_logs.sql if Agent 16 is complete.
   
   c. External backend (Sentry-ready):
      Add a hook point where Sentry DSN can be configured later:
      if (import.meta.env.VITE_SENTRY_DSN) { /* init Sentry */ }
      Document how to enable Sentry in docs/operations.md

2. Upgrade ErrorBoundary component:
   - Catch all React rendering errors
   - Send error report to errorLogger
   - Show user-friendly error page with:
     • "Something went wrong" message (translated)
     • "Refresh" button
     • "Report issue" link
   - Log component stack trace

3. Add global error handlers:
   In src/main.tsx or App.tsx:
   
   window.onerror = (message, source, line, col, error) => {
     errorLogger.capture(error || new Error(String(message)), { source, line, col });
   };
   
   window.onunhandledrejection = (event) => {
     errorLogger.capture(event.reason, { type: 'unhandledRejection' });
   };

4. Create src/lib/analytics.ts — Web Vitals tracking:
   - Use web-vitals library (or manual Performance API):
     Track: FCP, LCP, FID, CLS, TTFB
   - Send metrics to Supabase (performance_metrics table) or console
   - Create migration 029_performance_metrics.sql (if needed):
     Table: performance_metrics
     - id, metric_name, value, page_url, user_agent, created_at
   - Initialize in main.tsx

5. Add request/response logging for Supabase calls:
   Create a thin wrapper or interceptor that logs:
   - Slow queries (>2 seconds)
   - Failed queries (non-2xx status)
   - Query frequency (for identifying N+1 issues)

6. Create admin error dashboard concept:
   Document in docs/operations.md how to query error_logs:
   - Most frequent errors (GROUP BY message)
   - Errors by page/route
   - Error trend over time
   - User-specific error patterns

VERIFY:
- errorLogger sends errors to console in dev
- ErrorBoundary catches rendering errors
- Global error handlers catch unhandled exceptions
- Web Vitals tracking initialized
- npm run lint passes
- npx tsc --noEmit passes
```

---

### PROMPT 19.3: Performance Optimization

```
You are the DevOps & Infrastructure Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Optimize bundle size and runtime performance.

1. Bundle Analysis:
   npm run build
   
   Analyze the output. Identify:
   - Chunks >500kB (flag from v3 briefing)
   - Which libraries contribute most to size
   - Opportunities for code splitting

2. Route-Level Code Splitting:
   Verify ALL routes use React.lazy():
   
   const Forms = lazy(() => import('./pages/Forms'));
   const FormBuilder = lazy(() => import('./pages/FormBuilder'));
   const FormDashboard = lazy(() => import('./pages/FormDashboard'));
   const Settings = lazy(() => import('./pages/Settings'));
   const Pricing = lazy(() => import('./pages/Pricing'));
   const Auth = lazy(() => import('./pages/Auth'));
   // ... ALL page components
   
   Wrap in Suspense:
   <Suspense fallback={<LoadingSpinner />}>
     <Routes>...</Routes>
   </Suspense>
   
   If not already done, implement this.

3. Vite Build Optimization (update vite.config.ts):
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           // Separate vendor chunks
           'vendor-react': ['react', 'react-dom', 'react-router-dom'],
           'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', ...],
           'vendor-query': ['@tanstack/react-query'],
           'vendor-charts': ['recharts'],
           'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable'],
           'vendor-i18n': ['i18next', 'react-i18next'],
         }
       }
     },
     chunkSizeWarningLimit: 500,
   }

4. Image Optimization:
   - Audit public/ directory for unoptimized images
   - Convert PNGs to WebP where possible
   - Add width/height attributes to prevent layout shift
   - Consider lazy loading for below-fold images

5. Preload Critical Resources:
   In index.html:
   <link rel="preconnect" href="https://ywsqgrjfmxdjsuaqzsnw.supabase.co" />
   <link rel="dns-prefetch" href="https://ywsqgrjfmxdjsuaqzsnw.supabase.co" />

6. TanStack Query Cache Optimization:
   Verify QueryClient configuration:
   - staleTime: 60 * 1000 (1 minute) for most queries
   - gcTime: 5 * 60 * 1000 (5 minutes)
   - refetchOnWindowFocus: false for expensive queries
   - Deduplication: same query key = single request

7. Post-optimization build:
   npm run build
   Compare: total size, largest chunk, number of chunks
   Document improvement in docs/operations.md

VERIFY:
- npm run build succeeds with no chunks >500kB
- All routes are lazy-loaded
- Vendor chunks are split appropriately
- Build time is reasonable (<30 seconds)
- Dev server starts quickly
- npm run lint passes
- npx tsc --noEmit passes
```

---

### PROMPT 19.4: GDPR Compliance & Operational Docs

```
You are the DevOps & Infrastructure Agent for FormForge. READ CLAUDE.md first — follow ALL rules.

TASK: Implement GDPR compliance features and create operational documentation.

1. Privacy Policy Page (src/pages/Privacy.tsx):
   - Create a comprehensive privacy policy page
   - Use shadcn/ui Typography components
   - Sections: data collection, storage, processing, sharing, retention, rights
   - Specifically address: Supabase storage, Stripe payment data, 
     Resend email processing, Anthropic AI data processing
   - Must be accessible without authentication
   - Add route: /privacy in App.tsx
   - Add link to footer on landing page
   - Translate key sections (or note that full translation is Phase 6 i18n task)

2. Data Export Page (src/pages/DataExport.tsx):
   Protected page — user must be authenticated
   - "Export My Data" button
   - Exports: profile data, workspace data, all forms + submissions
   - Format: JSON download (comprehensive) or CSV (tabular)
   - Implementation:
     a. Fetch all user data via Supabase client (RLS already scopes it)
     b. Package into structured JSON
     c. Trigger browser download
   - Add route: /settings/data-export (or tab in Settings page)
   - Show progress indicator during export

3. Account Deletion (src/pages/AccountDeletion.tsx or Settings tab):
   Protected page — user must be authenticated
   - "Delete My Account" with confirmation dialog
   - Two-step confirmation:
     a. "Are you sure?" with consequences listed
     b. Type workspace name to confirm
   - Implementation:
     a. Delete all workspace data (forms, submissions, entries, tickets, etc.)
     b. Delete workspace and membership records  
     c. Delete profile
     d. Sign out via Supabase auth
     e. Delete auth user (requires service_role key — may need edge function)
   - NOTE: Cascade deletes should handle most cleanup if FK relationships are correct
   - Add route: /settings/delete-account (or tab in Settings page)

4. Cookie Consent (if needed):
   - FormForge uses Supabase auth (localStorage) — is this a cookie?
   - Document: which cookies/storage are used and why
   - If banner is needed: create lightweight CookieConsent component
   - Add to App.tsx (shows once, stores preference in localStorage)

5. Create docs/gdpr.md:
   - Data inventory: what data is collected, where stored, for how long
   - Data processing: Supabase (DB + auth), Stripe (payments), 
     Resend (emails), Anthropic (AI features), Vercel (hosting)
   - User rights: access, export, deletion, rectification
   - Data retention policy: how long data is kept
   - Breach notification procedure
   - DPA (Data Processing Agreement) requirements for sub-processors

6. Create docs/operations.md — Operational Runbook:
   a. Deployment procedures:
      - How to deploy frontend (Vercel auto-deploy or manual)
      - How to deploy edge functions (script or manual)
      - How to run database migrations
      - How to rollback a deployment
   
   b. Monitoring:
      - Where to check errors (error_logs table queries)
      - How to check Supabase health (Dashboard > Database > Health)
      - How to check edge function logs (Dashboard > Functions > Logs)
      - Key metrics to watch (error rate, response time, active users)
   
   c. Incident response:
      - Service down: check Vercel status, Supabase status
      - Database issues: check connections, disk space, slow queries
      - Auth issues: check JWT rotation, provider status
      - Payment issues: check Stripe webhook delivery
   
   d. Maintenance:
      - Supabase project pause/restore procedures
      - Database backup and restore
      - Secret rotation procedures
      - Dependency updates (npm audit)

7. Update PROGRESS.md as COMPLETE.

VERIFY:
- Privacy page renders at /privacy
- Data export downloads valid JSON
- Account deletion works (test carefully!)
- docs/gdpr.md is comprehensive
- docs/operations.md covers all operational scenarios
- npm run lint passes
- npx tsc --noEmit passes
```
