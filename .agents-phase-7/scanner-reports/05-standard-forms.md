# Scan Report: Standard Forms
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/FormBuilder.tsx` — Drag-and-drop form editor with 3 tabs (Build, Responses, Share)
- `src/pages/FormPreview.tsx` — Read-only preview with "Preview Mode" banner
- `src/pages/Submissions.tsx` — Multi-form submission viewer with search, date filter, CSV export, pagination
- `src/pages/Forms.tsx` — Form listing page (all modes), create dialog

### Components
- `src/components/FormRenderer.tsx` — Dynamic field renderer (14 field types), validation, file upload, submission
- `src/components/FormResponsesTab.tsx` — Analytics: choice charts, number stats, text responses
- `src/components/builder/FormSettingsPanel.tsx` — Thank you msg, redirect URL, one-per-email, auto-close
- `src/components/builder/ConditionalLogic.tsx` — Field visibility conditions (is, is_not, contains)
- `src/components/builder/BrandingPanel.tsx` — Colors, logo, font, border-radius, powered-by toggle
- `src/components/embed/SharePanel.tsx` — Public link, embed iframe, QR code

### Hooks
- `src/hooks/useForms.ts` — TanStack Query: form CRUD (fetchForms, createForm, updateForm, deleteForm)
- `src/hooks/useSubmissions.ts` — TanStack Query: submission fetch, pagination, delete

### Database Tables
- `forms` — RLS: member CRUD, public active read. Triggers: auto-update timestamp. Realtime: no
- `submissions` — RLS: member read, public insert (if form active). Triggers: increment form.submission_count. Realtime: yes

### Edge Functions
- None form-specific (submissions trigger webhook/slack/workflow dispatch from client)

### Routes
- `/` — Protected, Component: Forms (listing)
- `/forms/:id` — Protected, Component: FormDashboard (mode-based dispatch)
- `/forms/:id/edit` — Protected, Component: FormBuilder
- `/forms/:id/preview` — Protected, Component: FormPreview
- `/forms/:id/submissions` — Protected, Component: Submissions
- `/submissions` — Protected, Component: Submissions (all forms)
- `/f/:id` — Public, Component: PublicForm → FormRenderer (standard mode)

## 2. End-to-End Flow Status

- **Create form → edit fields → save**: WORKS — auto-save with 500ms debounce, DnD field ordering
- **Publish form → public URL → submit**: WORKS — FormRenderer validates + inserts to submissions + triggers
- **View submissions → search → export CSV**: WORKS — pagination, date filter, CSV download
- **Conditional logic (show_if)**: WORKS — evaluateCondition supports is/is_not/contains operators
- **File upload in form**: WORKS — uploads to "form-uploads" Supabase bucket
- **Form branding customization**: WORKS — logo upload, colors, font, border-radius
- **Share via link/embed/QR**: WORKS — QR via qrserver.com API
- **AI field generation (from FormBuilder)**: WORKS — FeatureGate on business plan (but AiFormGenerator itself not gated)
- **Submission realtime updates**: WORKS — Supabase realtime subscription in Submissions.tsx

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | Create + publish + submissions | 3 forms, 100 submissions/mo | YES — client-side |
| Pro | + custom branding (no powered-by) | Unlimited forms, 5k subs/mo | YES — client-side |
| Growth | Same | 25k subs/mo | YES — client-side |
| Business | + AI generation | Unlimited | YES — client-side |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Supabase Storage (form-uploads, branding buckets)
- **Depended on by**: Webhooks (10), Integrations (11), Workflows (15) — all triggered on submission
- **Shared files**: FormRenderer triggers dispatchWebhook, dispatchSlackNotification, dispatchWorkflowTrigger

## 5. i18n Status

- t() coverage: ALL strings wrapped (builder.*, forms.*, submissions.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT — ltr:/rtl: conditional classes used

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None (isolated components)

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- None

### P2 — Medium
- **"Powered by" toggle locked for free**: Client-side only enforcement in BrandingPanel via useSubscription. File: `src/components/builder/BrandingPanel.tsx`
- **Form auto-close by submission count**: closeAfterCount stored in settings JSONB but enforcement location unclear (likely FormRenderer checks)

## 8. Recommended Fix Path

1. Verify FormRenderer checks form.settings.closeAfterCount before accepting submissions
2. Ensure "form-uploads" Supabase Storage bucket exists and has proper RLS policies
