# Feature 04: Form Submissions — Scan Report

**Scanned**: 2026-03-15
**Status**: READY

## Touchpoints

### Pages
| File | Purpose |
|------|---------|
| src/pages/Submissions.tsx | Admin submissions viewer with filtering, pagination, CSV export |
| src/pages/PublicForm.tsx | Public form dispatcher; handles standard form rendering + submission |
| src/pages/FormBuilder.tsx | Embeds FormResponsesTab as a tab |

### Components
| File | Purpose |
|------|---------|
| src/components/FormRenderer.tsx | Renders fields, validates, uploads files, inserts into submissions |
| src/components/FormResponsesTab.tsx | Analytics dashboard for single form's responses |

### Hooks / Services
| File | Purpose |
|------|---------|
| src/hooks/useSubmissions.ts | TanStack Query-based data fetching with server-side pagination |
| src/hooks/usePagination.ts | Generic client-side pagination state machine |

### Database Tables
| Table | Key Columns | RLS |
|-------|-------------|-----|
| submissions | id, form_id, data (JSONB), submitted_by_email, submitted_at | YES — SELECT for workspace members, INSERT for active forms, no DELETE policy |
| forms | submission_count (auto-incremented by trigger) | YES |

---

## E2E Flows

### Flow: Submit Form (Public)
- **Steps**: 1. Load /f/:id 2. Render form fields 3. Validate client-side 4. Upload files to storage 5. Insert into submissions
- **Verdict**: PARTIAL
- **Evidence**: Flow works but has ReDoS vulnerability in phone validation, submission gate fails open
- **Gaps**: User-controlled regex in phone validation, Supabase errors leaked to users

### Flow: View Submissions (Admin)
- **Steps**: 1. Load /forms/:id/submissions 2. Fetch via useSubmissions 3. Client-side filter/search 4. Paginate
- **Verdict**: PARTIAL
- **Evidence**: Fetches page size 1000, then paginates client-side
- **Gaps**: Silent truncation at 1000 rows, server-side pagination bypassed

### Flow: Export CSV
- **Steps**: 1. Filter submissions 2. Click export 3. Generate CSV blob 4. Download
- **Verdict**: WORKS
- **Evidence**: Properly escapes values, creates downloadable blob
- **Gaps**: Exports only from client-side filtered array (max 1000)

### Flow: Response Analytics (FormBuilder Tab)
- **Steps**: 1. Open FormBuilder 2. Switch to responses tab 3. Fetch all submissions 4. Render charts
- **Verdict**: PARTIAL
- **Evidence**: Unbounded query fetches all submissions without limit
- **Gaps**: Will degrade with large datasets

---

## Dependencies

### Depends On
| Feature | Reason | Strength |
|---------|--------|----------|
| Auth & User Management | Protected routes, workspace scoping | HARD |
| Workspace Management | workspace_id scoping for queries | HARD |
| Form Builder | Form fields definition drives rendering | HARD |

### Depended On By
| Feature | Reason | Strength |
|---------|--------|----------|
| Feedback/NPS Mode | submission_id FK in feedback_responses | SOFT |
| Integrations | Webhook dispatch on submission | SOFT |
| Billing | Usage counting includes submissions | SOFT |

---

## Parallelism Assessment
- **Exclusive file domain?** MOSTLY — shares FormRenderer with PublicForm
- **Shared files**: FormRenderer.tsx, PublicForm.tsx, types
- **Can run parallel with**: Waitlist, Feedback, Support, AI, Enterprise
- **Must run sequential with**: Form Builder (shared FormRenderer), Billing (usage limits)
- **Recommended batch**: Feature(2)

---

## Test Coverage

| Module | Unit | Integration | E2E |
|--------|------|------------|-----|
| usePagination | 12 tests | NONE | NONE |
| useSubmissions | NONE | NONE | NONE |
| FormRenderer validation | NONE | NONE | NONE |
| FormResponsesTab | NONE | NONE | NONE |
| Submissions.tsx (filtering, CSV) | NONE | NONE | NONE |

### Critical Untested Paths
| Path | Risk | Reason |
|------|------|--------|
| FormRenderer.validateFields | HIGH | Complex branching logic, multiple field types |
| useSubmissions mutations | MEDIUM | TanStack Query integration untested |

---

## Issues Found

### P0 — Critical
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | ReDoS vulnerability in phone validation via user-controlled regex | SECURITY | HIGH | src/components/FormRenderer.tsx | 349-356 | Browser freeze on malicious regex patterns |

### P1 — High
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Delete submission mutation will always fail — no RLS DELETE policy | BUG | HIGH | src/hooks/useSubmissions.ts | 76-87 | Dead code path, misleading API |
| 2 | FormResponsesTab unbounded query fetches all submissions | PERFORMANCE | HIGH | src/components/FormResponsesTab.tsx | 36-44 | Memory/payload issues at scale |
| 3 | Submissions page fetches 1000 rows, silent truncation | PERFORMANCE | HIGH | src/pages/Submissions.tsx | 81-86 | Users miss data beyond 1000 |
| 4 | Supabase error messages leaked to end users | SECURITY | MEDIUM | src/components/FormRenderer.tsx | 498-500 | Exposes backend architecture |

### P2 — Medium
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Submission limit check fails open by design | SECURITY | MEDIUM | src/pages/PublicForm.tsx | 81-83 | Quota bypass during outage |
| 2 | Duplicated closeAfterCount logic in PublicForm and FormRenderer | ARCHITECTURE | HIGH | src/pages/PublicForm.tsx, src/components/FormRenderer.tsx | 176-193, 422-438 | Maintenance risk |
| 3 | FormField type defined in 3 places with divergent shapes | ARCHITECTURE | HIGH | FormRenderer, Submissions, FormResponsesTab | — | Type drift risk |
| 4 | Realtime subscription in Submissions.tsx unfiltered (workspace-wide) | PERFORMANCE | MEDIUM | src/pages/Submissions.tsx | 121-133 | Unnecessary refetches |
| 5 | useSubmissions queryKey includes unstable array reference | PERFORMANCE | MEDIUM | src/hooks/useSubmissions.ts | 71 | Cache instability |
| 6 | File upload allows any extension when no allowedFileTypes configured | SECURITY | LOW | src/components/FormRenderer.tsx | 374-384 | Confusing UX on server rejection |

---

## Recommended Fix Path
1. **P0-1**: Replace user-supplied regex in phone validation with curated predefined patterns
2. **P1-4**: Replace Supabase error messages with generic user-facing message, log actual error
3. **P1-2**: Add `.limit()` to FormResponsesTab query with truncation warning
4. **P1-3**: Move search/date filtering server-side or add visible warning at 1000-row cap
5. **P1-1**: Add DELETE RLS policy for submissions or remove dead deleteSubmission mutation
6. **P2-4**: Add filter to realtime subscription in Submissions.tsx
7. **P2-3**: Consolidate FormField type to single canonical export
8. **P2-2**: Remove duplicated closeAfterCount from FormRenderer

**Estimated prompts**: 6 (1 assessment + 4 fixes + 1 verification)
**Agent role**: MIXED (SECURITY_ENGINEER for P0/P1-4, ENGINEER for the rest)
