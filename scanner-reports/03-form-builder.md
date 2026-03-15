# Feature 03: Form Builder (Standard Mode) — Scan Report

**Scanned**: 2026-03-15
**Status**: READY

## Touchpoints

### Pages
| File | Purpose |
|------|---------|
| src/pages/FormBuilder.tsx (825 lines) | Main form builder with drag-and-drop, field palette, properties panel |
| src/pages/Forms.tsx (408 lines) | Form listing + creation dialog (mode selection) |
| src/pages/FormPreview.tsx (142 lines) | Preview renders form with branding in read-only mode |
| src/pages/FormDashboard.tsx (107 lines) | Mode dispatcher — standard redirects to FormBuilder |
| src/pages/PublicForm.tsx (290 lines) | Public-facing form page |

### Components
| File | Purpose |
|------|---------|
| src/components/FormRenderer.tsx (614 lines) | Field rendering, validation, file upload, submission |
| src/components/builder/FormSettingsPanel.tsx | Settings: thank-you message, redirect URL, limits |
| src/components/builder/BrandingPanel.tsx | Branding: colors, logo, font, border radius |
| src/components/builder/ConditionalLogic.tsx | Conditional show/hide logic per field |
| src/components/embed/SharePanel.tsx | Share via link, embed, QR code |

### Hooks / Services
| File | Purpose |
|------|---------|
| src/hooks/useForms.ts | TanStack Query CRUD for forms |

### Database Tables
| Table | Key Columns | RLS |
|-------|-------------|-----|
| forms | fields (JSONB), settings (JSONB), branding (JSONB), status, mode | YES |

---

## E2E Flows

### Flow: Create Form
- **Steps**: 1. Open dialog 2. Select mode 3. Enter title 4. Submit 5. Navigate to editor
- **Verdict**: WORKS
- **Evidence**: useForms().createForm mutation, proper navigation on success

### Flow: Add Fields (drag-and-drop + click)
- **Steps**: 1. Click palette item or drag to canvas 2. Field appended/inserted 3. Auto-selected for editing
- **Verdict**: WORKS
- **Evidence**: @dnd-kit with SortableContext, createNewField() with UUID defaults

### Flow: Reorder Fields
- **Steps**: 1. Drag field on canvas 2. arrayMove reorders 3. Auto-save
- **Verdict**: WORKS
- **Evidence**: KeyboardSensor configured with sortableKeyboardCoordinates

### Flow: Configure Settings & Branding
- **Verdict**: WORKS

### Flow: Preview Form
- **Verdict**: WORKS
- **Evidence**: Opens /forms/:id/preview in new tab, sticky preview banner

### Flow: Publish Form
- **Verdict**: WORKS
- **Evidence**: Status select (draft/active/closed) triggers auto-save

---

## Dependencies

### Depends On
| Feature | Reason | Strength |
|---------|--------|----------|
| Auth & User Management | Protected route, user identity | HARD |
| Workspace Management | workspace_id scoping | HARD |

### Depended On By
| Feature | Reason | Strength |
|---------|--------|----------|
| Form Submissions | Form fields drive rendering | HARD |
| Waitlist Mode | Form settings/branding | HARD |
| Feedback Mode | Form settings/branding | HARD |
| Support Mode | Form settings/branding | HARD |
| AI Features | AI form generation targets builder | SOFT |
| Templates | Template "use" creates form | SOFT |

---

## Parallelism Assessment
- **Exclusive file domain?** NO — shares FormRenderer with Submissions/PublicForm
- **Shared files**: FormRenderer.tsx, PublicForm.tsx, types/forms.ts
- **Can run parallel with**: Waitlist, Feedback, Support, Billing, Enterprise
- **Must run sequential with**: Submissions (shared FormRenderer)
- **Recommended batch**: Feature(2)

---

## Test Coverage

| Module | Unit | Integration | E2E |
|--------|------|------------|-----|
| FormRenderer | 5 tests | NONE | NONE |
| FormDashboard | 6 tests | NONE | NONE |
| FormBuilder | NONE | NONE | NONE |
| FormSettingsPanel | NONE | NONE | NONE |
| BrandingPanel | NONE | NONE | NONE |
| ConditionalLogic | NONE | NONE | NONE |
| useForms | NONE | NONE | NONE |

---

## Issues Found

### P0 — Critical
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | ReDoS vulnerability — user-supplied regex in phone validation | SECURITY | HIGH | src/components/FormRenderer.tsx | 349-356 | Browser freeze on malicious patterns |

### P1 — High
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Mobile properties panel missing validation + conditional logic editors | RESPONSIVE | HIGH | src/pages/FormBuilder.tsx | 760-810 | Mobile users cannot configure validation |
| 2 | FormField interface defined in 3+ places with divergent shapes | ARCHITECTURE | HIGH | FormRenderer, FormBuilder, types/forms.ts | — | Type drift, maintenance hazard |
| 3 | Auto-save useEffect missing `save` dependency — fragile closure | BUG | HIGH | src/pages/FormBuilder.tsx | 281-291 | Potential stale saves |
| 4 | save() does not persist `mode` field — dead state | BUG | MEDIUM | src/pages/FormBuilder.tsx | 257-278 | Mode changes (if any) not saved |
| 5 | FormDashboard: navigate() called during render (side effect) | BUG | HIGH | src/pages/FormDashboard.tsx | 88 | React strict mode issues |

### P2 — Medium
| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | Open redirect via redirectUrl — no protocol validation | SECURITY | MEDIUM | src/components/FormRenderer.tsx | 493 | Phishing/XSS via javascript: URLs |
| 2 | isInitialLoad 500ms timeout is fragile race condition | BUG | MEDIUM | src/pages/FormBuilder.tsx | 253 | Spurious save on load |
| 3 | Missing ARIA labels on drag handles, FAB, inputs, color pickers | UX | HIGH | FormBuilder.tsx, BrandingPanel.tsx | — | Accessibility gaps |
| 4 | QR code uses external api.qrserver.com — privacy concern | SECURITY | LOW | src/components/embed/SharePanel.tsx | 40 | Form URLs sent to third party |
| 5 | createNewField adds 3 options for all field types including non-choice | ARCHITECTURE | LOW | src/pages/FormBuilder.tsx | 110-119 | Noise in saved JSONB |
| 6 | Error message from Supabase leaked to user on submission failure | SECURITY | MEDIUM | src/components/FormRenderer.tsx | 499 | Exposes backend details |
| 7 | God component: FormBuilder.tsx at 825 lines | ARCHITECTURE | HIGH | src/pages/FormBuilder.tsx | — | Hard to maintain |

---

## Recommended Fix Path
1. **P1-1**: Extract shared FieldPropertyEditor component for desktop sidebar + mobile sheet
2. **P1-2**: Consolidate FormField type into src/types/forms.ts, update all imports
3. **P1-5**: Replace navigate() with `<Navigate replace />` in FormDashboard switch default
4. **P0-1**: Add ReDoS protection — restrict to curated phone patterns or validate regex complexity
5. **P1-3**: Wrap save in useCallback with correct dependencies
6. **P2-1**: Validate redirectUrl protocol (http/https only) before redirect
7. **P2-3**: Add ARIA labels to drag handles, FAB, inputs, color pickers
8. **P2-7**: Extract canvas + properties panel into sub-components to reduce FormBuilder size

**Estimated prompts**: 7 (1 assessment + 5 fixes + 1 verification)
**Agent role**: MIXED (ENGINEER + RESPONSIVE_SPECIALIST + SECURITY_ENGINEER)
