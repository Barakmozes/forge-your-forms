# FormForge Deployment Guide

## Environment Variables

All deployments require these environment variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

---

## Vercel (Recommended)

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects Vite — defaults are correct:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add environment variables in **Settings > Environment Variables**
5. Deploy

The included `vercel.json` handles SPA client-side routing rewrites.

---

## Netlify

1. Push your repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) and import the repo
3. The included `netlify.toml` configures:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **SPA Redirect**: all routes → `index.html`
4. Add environment variables in **Site settings > Environment variables**
5. Deploy

---

## Cloudflare Pages

1. Push your repo to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) > **Pages** > **Create a project**
3. Connect your GitHub repo
4. Configure build settings:
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Node.js Version**: `22`
5. Add environment variables in **Settings > Environment variables**
6. For SPA routing, add a `public/_redirects` file:
   ```
   /*  /index.html  200
   ```
7. Deploy

---

## CI/CD

GitHub Actions CI runs automatically on push to `main` and on pull requests:

1. Install dependencies
2. Lint (`npm run lint`)
3. Type check (`npx tsc --noEmit`)
4. Test (`npm run test`)
5. Build (`npm run build`)
6. Upload `dist/` as artifact (retained 7 days)

See `.github/workflows/ci.yml` for the full workflow.
