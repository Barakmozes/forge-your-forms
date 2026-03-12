# Operational Runbook — FormForge

> Version: 1.0 | Date: 2026-03-12
> Author: Agent 19 (Phase 6 — Production Hardening)

---

## 1. Deployment Procedures

### Frontend (Vercel)

**Auto-deploy (recommended)**:
- Push to `main` branch → Vercel auto-deploys to production
- Push to PR branch → Vercel creates preview deployment
- CI/CD pipeline runs quality-gate (lint, typecheck, tests) → build → deploy

**Manual deploy**:
```bash
# Install Vercel CLI
npm i -g vercel

# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Edge Functions (Supabase)

**Auto-deploy**:
- Push changes to `supabase/functions/**` on `main` → GitHub Actions deploys all functions

**Manual deploy**:
```bash
# Deploy a specific function
supabase functions deploy <function-name> --project-ref rsuolemihuqjvrcpqjpa

# Deploy all functions
bash scripts/deploy-functions.sh
```

**Required env vars** (set in Supabase Dashboard > Functions > Secrets):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`

### Database Migrations

```bash
# Run a migration against Supabase
node scripts/run-migration.cjs supabase/migrations/NNN_description.sql

# Regenerate TypeScript types after schema changes
npx supabase gen types --project-id rsuolemihuqjvrcpqjpa --schema public > src/integrations/supabase/types.ts
```

**Migration safety rules**:
- Never modify existing migration files
- Always create new migration files with incrementing number
- Test migrations locally before applying to production
- DB migration PR check workflow validates naming + dangerous operations

### Rollback Procedures

**Frontend rollback**:
1. Go to Vercel Dashboard > Deployments
2. Find the last working deployment
3. Click "Promote to Production"

**Edge function rollback**:
1. Revert the git commit that changed the function
2. Re-deploy using `supabase functions deploy`

**Database rollback**:
- No automatic rollback. Write a new migration to reverse changes.
- For emergencies: restore from Supabase backup (Dashboard > Database > Backups)

---

## 2. Monitoring

### Error Monitoring

**Error logs are stored in the `error_logs` table** (when connected in production).

**Query recent errors**:
```sql
-- Last 50 errors
SELECT message, url, created_at
FROM error_logs
ORDER BY created_at DESC
LIMIT 50;

-- Most frequent errors (last 24h)
SELECT message, COUNT(*) as count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY message
ORDER BY count DESC
LIMIT 20;

-- Errors by page/route
SELECT url, COUNT(*) as count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY url
ORDER BY count DESC;

-- Errors for a specific user
SELECT message, url, context, created_at
FROM error_logs
WHERE user_id = '<user-uuid>'
ORDER BY created_at DESC;

-- Error trend (hourly for last 24h)
SELECT date_trunc('hour', created_at) as hour, COUNT(*)
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

**Sentry integration** (optional):
1. Install: `npm install @sentry/react`
2. Set `VITE_SENTRY_DSN` in `.env`
3. Initialize in `main.tsx`:
```tsx
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
```
4. Errors will automatically flow to Sentry dashboard

### Supabase Health

- **Dashboard**: Supabase Dashboard > Database > Health
- **Connection pool**: Monitor active connections (max depends on plan)
- **Disk usage**: Dashboard > Database > Database Size
- **Slow queries**: Dashboard > Database > Query Performance (requires pg_stat_statements)

### Edge Function Logs

- **Dashboard**: Supabase Dashboard > Edge Functions > Select function > Logs
- **CLI**: `supabase functions logs <function-name> --project-ref rsuolemihuqjvrcpqjpa`

### Key Metrics to Watch

| Metric | Source | Threshold |
|---|---|---|
| Error rate | error_logs table | < 1% of requests |
| API response time | Supabase Dashboard | < 500ms p95 |
| Edge function errors | Function logs | 0 unhandled errors |
| Active DB connections | Supabase Dashboard | < 80% of pool |
| Disk usage | Supabase Dashboard | < 80% of quota |
| Build time | GitHub Actions | < 30s |

### Web Vitals

Web Vitals are tracked in the browser console (dev) via `src/lib/analytics.ts`:
- **FCP** (First Contentful Paint): < 1.8s good, < 3.0s needs improvement
- **LCP** (Largest Contentful Paint): < 2.5s good, < 4.0s needs improvement
- **CLS** (Cumulative Layout Shift): < 0.1 good, < 0.25 needs improvement
- **TTFB** (Time to First Byte): < 0.8s good, < 1.8s needs improvement

---

## 3. Incident Response

### Service Down

1. **Check Vercel status**: https://www.vercel-status.com/
2. **Check Supabase status**: https://status.supabase.com/
3. **Check GitHub Actions**: Repository > Actions tab
4. **Verify DNS**: `dig formforge.app` or `nslookup formforge.app`
5. **Check browser console** for JavaScript errors

### Database Issues

1. **Connection errors**: Check Supabase Dashboard > Database > Connection pool
   - If pool exhausted: restart connection pooler or increase pool size
2. **Slow queries**: Dashboard > Database > Query Performance
   - Look for sequential scans on large tables
   - Add indexes for commonly filtered columns
3. **Disk full**: Dashboard > Database > Database Size
   - Clean up old error_logs, performance_metrics
   - Consider archiving old submissions

### Authentication Issues

1. **Login failures**: Check Supabase Dashboard > Authentication > Logs
2. **JWT errors**: May indicate NEXTAUTH_SECRET rotation needed
3. **Email confirmation**: Verify email templates in Supabase Dashboard > Auth > Email Templates
4. **OAuth provider issues**: Check provider status (Google, GitHub)

### Payment Issues

1. **Stripe webhook failures**: Supabase Dashboard > Edge Functions > stripe-webhook > Logs
2. **Webhook endpoint**: Verify webhook URL is correct in Stripe Dashboard
3. **Webhook secret**: Verify `STRIPE_WEBHOOK_SECRET` matches in function secrets
4. **Failed charges**: Check Stripe Dashboard > Payments for declined transactions

### Edge Function Errors

1. **Check logs**: Supabase Dashboard > Edge Functions > [function-name] > Logs
2. **Common issues**:
   - Missing environment variables (secrets)
   - Timeout (default 60s for paid, 30s for free)
   - Memory limit exceeded
3. **Re-deploy**: `supabase functions deploy <name> --project-ref rsuolemihuqjvrcpqjpa`

---

## 4. Maintenance

### Supabase Project Management

**Pause/Restore** (free tier inactivity):
- Dashboard > Project Settings > General > Pause Project
- Paused projects stop all services (DB, Auth, Storage, Functions)
- Restore: Dashboard > Paused project > Restore

### Database Backup & Restore

- **Automatic backups**: Daily (Supabase manages, 7-day retention on free, 30-day on paid)
- **Manual backup**: Dashboard > Database > Backups > Create Backup
- **Restore**: Dashboard > Database > Backups > Restore (creates new project)
- **Point-in-time recovery**: Available on Pro plan and above

### Secret Rotation

| Secret | Location | Rotation Procedure |
|---|---|---|
| Supabase anon key | `.env` + Vercel | Regenerate in Dashboard > API; update env vars |
| Supabase service key | Edge function secrets | Regenerate in Dashboard > API; update function secrets |
| Stripe keys | Edge function secrets | Rotate in Stripe Dashboard; update function secrets |
| Resend API key | Edge function secrets | Rotate in Resend Dashboard; update function secrets |
| Anthropic API key | Edge function secrets | Rotate in Anthropic Console; update function secrets |

After rotating secrets:
1. Update the secret in all locations (env vars, Vercel, Supabase Function Secrets)
2. Redeploy affected edge functions
3. Verify service functionality

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Security audit
npm audit

# Fix known vulnerabilities
npm audit fix

# Update a specific package
npm install <package>@latest
```

**Update cadence**: Monthly security patches, quarterly minor updates, annual major updates.

---

## 5. GitHub Actions Secrets Required

| Secret | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (for build) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (for build) |
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `SUPABASE_PROJECT_ID` | Supabase project reference (`rsuolemihuqjvrcpqjpa`) |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API token (for CLI operations) |

---

## 6. Custom Domain Setup

1. **Vercel**: Dashboard > Project > Settings > Domains > Add Domain
2. **DNS**: Add CNAME record pointing to `cname.vercel-dns.com`
3. **SSL**: Automatically provisioned by Vercel (Let's Encrypt)
4. **Supabase custom domain** (Pro plan): Dashboard > Project > Settings > Custom Domains

---

## 7. Bundle Size Optimization

Current optimization (post Agent 19):
- Routes: All lazy-loaded via `React.lazy()` with `Suspense`
- Vendor chunks: react (162kB), ui (142kB), supabase (176kB), charts (422kB), query (40kB), dnd (50kB), i18n (60kB), dates (25kB)
- Main app chunk: ~196kB
- No chunks exceed 500kB warning threshold
- Assets cached with immutable 1-year max-age via vercel.json

To analyze bundle further:
```bash
# Build and inspect output
npm run build

# Use vite-plugin-visualizer for detailed analysis (install separately)
```
