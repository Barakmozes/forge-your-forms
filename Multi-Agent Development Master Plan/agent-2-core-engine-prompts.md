# AGENT 2: Core Engine Enhancement — Ready-to-Copy Prompts

## AGENT IDENTITY & RULES
Copy this preamble into every chat session for Agent 2:

```
You are Agent 2 (Core Engine Enhancement) for FormForge — an independent 
SaaS platform for forms, waitlists, feedback/NPS, and support tickets.

Tech stack: Vite + React 18 + TypeScript + Supabase + shadcn/ui + TailwindCSS.

CRITICAL RULES:
- Always use @/ import alias — never relative ../../
- Never modify existing migration files — create new ones
- Run npm run lint before declaring work complete
- Run npx tsc --noEmit to type-check
- All data queries scoped by workspace_id or form_id
- Protected pages: useToast() from @/hooks/use-toast
- No "use client" directives — Vite SPA, NOT Next.js
- Emerald/green primary palette
- TanStack React Query v5 is installed — USE IT for all new hooks

YOUR OWNED FILES:
- src/pages/Forms.tsx
- src/pages/FormBuilder.tsx, FormPreview.tsx
- src/pages/Submissions.tsx
- src/pages/FormDashboard.tsx (dashboard content, not mode dispatch)
- src/components/FormRenderer.tsx, FormResponsesTab.tsx
- src/components/dashboard/ (NEW)
- src/components/builder/ (NEW)
- src/components/embed/ (NEW)
- src/hooks/useForms.ts, useSubmissions.ts, usePagination.ts (NEW)

DO NOT TOUCH:
- src/contexts/ (Agent 1)
- src/components/waitlist/ (Agent 3)
- src/components/feedback/ (Agent 3)
- src/components/support/ (Agent 3)
- Mode-specific hooks (useWaitlist, useFeedback, useTickets)
- Settings pages (Agent 1)
- Landing/pricing pages (Agent 4)

The GitHub repo is: https://github.com/Barakmozes/forge-your-forms
Clone it and read CLAUDE.md before starting any task.
```

---

## PROMPT 2.1 — React Query Migration for Core Hooks
```
TASK: Migrate core data fetching to TanStack React Query v5.

CONTEXT: All hooks currently use raw Supabase calls with useState.
QueryClient is already initialized in App.tsx.

1. Create src/hooks/useForms.ts:
   - useQuery for forms list (queryKey: ['forms', workspaceId])
   - useMutation for create, update, delete
   - invalidateQueries on mutation success
   - enabled: !!workspaceId

2. Create src/hooks/useSubmissions.ts:
   - useQuery with pagination (queryKey: ['submissions', formId, page, pageSize])
   - .range(from, to) for Supabase pagination
   - useMutation for delete

3. Create src/hooks/usePagination.ts:
   - usePagination(totalCount, pageSize=25)
   - Returns: page, setPage, totalPages, hasNext, hasPrev, nextPage, prevPage, range

4. Update Forms.tsx → use useForms hook
5. Update Submissions.tsx → use useSubmissions + usePagination

Pattern:
  const formsQuery = useQuery({
    queryKey: ['forms', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms').select('*').eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

VERIFY:
- Forms page loads with React Query
- Submissions has working pagination (25/page)
- npm run lint + npx tsc --noEmit pass
```

---

## PROMPT 2.2 — Form Builder Enhancement
```
TASK: Enhance form builder with settings, validation, conditional logic.

1. Form Settings Panel (src/components/builder/FormSettingsPanel.tsx):
   - Gear icon in top bar opens sheet/dialog
   - General: title, description, status toggle
   - Submission Settings:
     • Custom thank-you message (textarea)
     • Redirect URL after submit (text input)
     • Limit one per email (toggle)
     • Close after N submissions (number, 0=unlimited)
   - Save to forms.settings JSONB

2. Field Validation (right panel properties):
   - Text: min/max length
   - Number: min/max value
   - Email: auto-validate format
   - Phone: regex pattern
   - File: max size, allowed types

3. Conditional Logic (src/components/builder/ConditionalLogic.tsx):
   - "Show if" condition per field
   - Condition: [field_id] [is/is_not/contains] [value]
   - Store: { ...field, condition: { fieldId, operator, value } }
   - FormRenderer.tsx evaluates to show/hide fields

4. Auto-save:
   - "Saving..." → "Saved ✓" indicator in top bar
   - Debounce 500ms, save to forms.fields JSONB

VERIFY: Settings persist, conditional logic works in preview, 
auto-save shows indicator. Lint + type-check pass.
```

---

## PROMPT 2.3 — Dashboard Rebuild & Sharing Features
```
TASK: Rebuild main dashboard and add sharing/embed.

1. Dashboard (src/components/dashboard/DashboardHome.tsx):
   - Welcome with user's name
   - Cards: Total Forms, Submissions This Month, Today, Most Active Form
   - Recent Submissions feed (last 10 across all forms)
   - Mini cards per active form: mode icon, title, count, sparkline
   - Quick Actions: "Create Form", "View All Submissions"

2. Share Panel (src/components/embed/SharePanel.tsx):
   - From form builder "Share" button
   - Tabs: Link (copy URL), Embed (iframe code), QR Code
   - iframe: <iframe src="/f/[id]" width="100%" height="600" frameborder="0">

3. Duplicate Form:
   - Dropdown action on form cards in Forms.tsx
   - Copies all except id, submission_count, created_at
   - Title: "Copy of [original]", Status: draft

VERIFY: Dashboard shows real data, share panel works, 
duplicate creates working copy. Lint + type-check pass.
```

---

## PROMPT 2.4 — Branding UI in Form Builder
```
TASK: Build branding customization UI.

1. src/components/builder/BrandingPanel.tsx:
   - Color picker: primary color (buttons, accents)
   - Color picker: background color/gradient
   - Logo upload (Supabase Storage "branding" bucket)
   - Font: Inter, Plus Jakarta Sans, System Default
   - Corner radius: Sharp / Rounded / Pill
   - "Powered by FormForge" toggle (free=always on)
   - Real-time preview thumbnail

2. Save to forms.branding JSONB:
   { primaryColor, backgroundColor, logoUrl, font, borderRadius, showPoweredBy }

3. Apply in public pages:
   - FormRenderer.tsx reads form.branding
   - CSS variables: --ff-primary, --ff-bg, --ff-radius on container
   - Ensure consistency with WaitlistLandingPage (already uses branding)

4. Migration 007_branding_storage.sql:
   - Supabase Storage bucket "branding"
   - Policy: auth users upload to workspace path, public read

VERIFY: Branding reflects in preview and public page. 
Logo uploads. Lint + type-check pass.
```
