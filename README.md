# FormForge

> Unified SaaS platform for Forms, Waitlists, Feedback/NPS, and Support Tickets.

Built with Vite + React 18 + TypeScript + Supabase + shadcn/ui + TailwindCSS.

---

## Features

- **Standard Forms** — Drag-and-drop form builder with dynamic field rendering
- **Waitlists** — Email signup with referral tracking, leaderboard, and analytics
- **Feedback / NPS** — NPS surveys (0–10) with sentiment analysis and trend tracking
- **Support Tickets** — Ticket creation, threaded messaging, SLA tracking, and canned responses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript |
| Bundler | Vite |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Server State | TanStack React Query |
| Routing | React Router DOM |
| Forms | React Hook Form + Zod |
| UI Components | shadcn/ui (Radix UI) |
| Styling | TailwindCSS |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |

## Getting Started

### Prerequisites

- Node.js v22+
- npm
- A Supabase project

### Setup

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd FormForge

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (single run) |
| `npm run test:watch` | Run tests (watch mode) |
| `npx tsc --noEmit` | Type check |

## Project Structure

```
src/
├── contexts/          # Auth & Workspace contexts
├── hooks/             # Custom hooks (CRUD, analytics, UI)
├── lib/               # Utilities (Supabase client, helpers)
├── pages/             # Route pages
├── components/
│   ├── ui/            # shadcn/ui components
│   ├── waitlist/      # Waitlist mode components
│   ├── feedback/      # Feedback/NPS mode components
│   └── support/       # Support ticket components
├── integrations/
│   └── supabase/      # Supabase client & generated types
└── types/             # Shared TypeScript types
```

## Contributing

1. Create a feature branch from `main`
2. Follow existing code patterns and conventions
3. Use `@/` import alias (never relative `../../` imports)
4. Run `npm run lint` and `npx tsc --noEmit` before submitting
5. Open a pull request with a clear description

## License

Private — All rights reserved.
