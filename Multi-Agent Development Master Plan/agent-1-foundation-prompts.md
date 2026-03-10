# AGENT 1: Foundation & Infrastructure — Ready-to-Copy Prompts

## AGENT IDENTITY & RULES
Copy this preamble into every chat session for Agent 1:

```
You are Agent 1 (Foundation & Infrastructure) for FormForge — an independent 
SaaS platform for forms, waitlists, feedback/NPS, and support tickets.

Tech stack: Vite + React 18 + TypeScript + Supabase + shadcn/ui + TailwindCSS.

CRITICAL RULES:
- Always use @/ import alias — never relative ../../
- Never modify existing migration files — create new ones (007+)
- Run npm run lint before declaring work complete
- Run npx tsc --noEmit to type-check
- All data queries scoped by workspace_id or form_id
- Protected pages: useToast() from @/hooks/use-toast
- No "use client" directives — Vite SPA, NOT Next.js
- No global state stores — Context + local state patterns
- Emerald/green primary palette

YOUR OWNED FILES:
- README.md, .env.example
- src/contexts/ (fixes only)
- src/hooks/use-toast.ts (consolidation)
- src/lib/errorLogger.ts, src/lib/utils.ts
- src/hooks/useErrorHandler.ts
- src/components/ErrorBoundary.tsx
- src/pages/Settings.tsx, WorkspaceSettings.tsx, ProfileSettings.tsx
- src/components/SettingsTabs.tsx, MembersManager.tsx
- src/types/forms.ts
- supabase/migrations/007_* through 009_*
- Config files

DO NOT TOUCH:
- components/waitlist/, feedback/, support/
- Mode-specific hooks (useWaitlist, useFeedback, useTickets, etc.)
- pages/Forms.tsx, FormBuilder.tsx, Submissions.tsx
- pages/PublicForm.tsx, FormDashboard.tsx
- pages/Index.tsx (landing page — Agent 4)

The GitHub repo is: https://github.com/Barakmozes/forge-your-forms
Clone it and read CLAUDE.md before starting any task.
```

---

## PROMPT 1.1 — Lovable Cleanup & README
```
TASK: Remove all Lovable references and rewrite README.

1. Rewrite README.md:
   - Project: FormForge — Unified SaaS platform with 4 modes
   - Tech: Vite, React 18, TypeScript, Supabase, shadcn/ui, TailwindCSS
   - Setup: git clone → npm install → copy .env.example → npm run dev
   - Dev commands table (dev, build, lint, test, type-check)
   - Project structure overview
   - Contributing guidelines
   - Remove ALL Lovable references

2. Create .env.example:
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id

3. Search entire codebase for "lovable" or "Lovable" and remove/replace.
   Check: index.html, package.json, any comments.

VERIFY:
- grep -ri "lovable" src/ public/ *.md *.json *.html returns nothing
- npm run lint passes
- npx tsc --noEmit passes
```

---

## PROMPT 1.2 — Error Handling Infrastructure
```
TASK: Create centralized error handling infrastructure.

1. Create src/lib/errorLogger.ts:
   - logError(error: Error, context?: Record<string, any>) — structured console.error
   - logWarning(message: string, context?: Record<string, any>)
   - Designed for later Sentry/LogRocket plug-in

2. Create src/hooks/useErrorHandler.ts:
   - Hook: const { handleAsync } = useErrorHandler()
   - handleAsync wraps async ops with try/catch + logError + toast
   - Returns result on success, null on error

3. Create src/components/ErrorBoundary.tsx:
   - React error boundary, catches render errors
   - Fallback: "Something went wrong" + "Try Again" button
   - Wrap around main routes in App.tsx

VERIFY:
- Import and test in one existing page
- npm run lint passes
- npx tsc --noEmit passes
```

---

## PROMPT 1.3 — Settings & Workspace Management
```
TASK: Build Settings pages (workspace, members, profile).

1. src/pages/Settings.tsx:
   - Tabbed layout: Workspace, Members, Profile
   - Route: /settings (ProtectedRoute in App.tsx)

2. Workspace Tab:
   - Edit workspace name (owner only)
   - Display slug (read-only)
   - Save → updates workspaces table

3. Members Tab (src/components/MembersManager.tsx):
   - Table: avatar, name, email, role badge
   - "Invite Member" → Dialog: email + role select
   - Remove member (owner only, not self)
   - Change role dropdown (owner only)

4. Profile Tab:
   - Edit full_name, avatar upload (Supabase Storage "avatars")
   - Email read-only
   - Save → updates profiles table

5. Add "Settings" gear icon to Navbar.tsx

VERIFY:
- All ops scoped to currentWorkspace.id
- useToast() for all notifications
- npm run lint + npx tsc --noEmit pass
```

---

## PROMPT 1.4 — Toast Consolidation & Type Safety
```
TASK: Consolidate toast systems and create shared types.

1. Toast audit:
   - Ensure all protected pages import from @/hooks/use-toast
   - All public pages use toast from sonner
   - Add comment headers to both files explaining the rule
   - Fix any incorrect imports

2. Create src/types/forms.ts:
   - FormMode = 'standard' | 'waitlist' | 'feedback' | 'support'
   - FormStatus = 'draft' | 'active' | 'closed'
   - WorkspaceRole = 'owner' | 'editor' | 'viewer'
   - FormField interface: id, type, label, required, options, etc.
   - Form interface: all form columns
   - Submission, WaitlistEntry, FeedbackResponse, Ticket interfaces

3. Create src/types/database.ts:
   - Re-export auto-generated types with better naming

VERIFY:
- grep for incorrect toast imports
- npm run lint + npx tsc --noEmit pass
```
