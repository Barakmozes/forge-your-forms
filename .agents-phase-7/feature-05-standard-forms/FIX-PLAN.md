# Agent 26 — FIX-PLAN

## Assessment Summary

### P2-1: "Powered by" toggle enforcement (CLIENT-SIDE ONLY)
- **Status**: Working as designed, but client-side only
- **Location**: `src/components/builder/BrandingPanel.tsx` lines 242-278
- **Behavior**: Free users see locked toggle (disabled, forced to `true`). Pro/Growth can toggle. Business tier hides the toggle entirely (implicitly off).
- **Public page**: `PublicForm.tsx` line 256 respects `showPoweredBy !== false`
- **Limitation**: A user could theoretically modify `branding` JSONB directly in DB to bypass. No server-side enforcement exists.
- **Action**: Document as known limitation. No code change needed — this is acceptable for a SaaS with client-side plan enforcement.

### P2-2: closeAfterCount enforcement — MISSING
- **Status**: NOT ENFORCED
- **Setting defined**: `FormSettingsPanel.tsx` — `closeAfterCount?: number | null` in `FormSettings`
- **Issue 1**: `PublicForm.tsx` does NOT fetch `submission_count` — the `FormData` interface lacks it
- **Issue 2**: `FormRenderer.tsx` receives `settings` prop but never checks `closeAfterCount`
- **Result**: Users can configure auto-close but it has zero effect

## Fix Plan

### Fix 1: Add closeAfterCount check in PublicForm.tsx (PRIMARY)
1. Add `submission_count` to the Supabase select query
2. Add `submission_count` to the `FormData` interface
3. After form load, check: if `settings.closeAfterCount > 0 && submission_count >= settings.closeAfterCount` → show "form closed" message
4. This is the primary guard — it prevents the form from even rendering

### Fix 2: Add closeAfterCount check in FormRenderer.tsx (SAFETY NET)
1. Add `submissionCount` prop to `FormRendererProps`
2. On form load: if limit reached, show closed state immediately
3. Before submission: re-check (in case concurrent submissions happened)
4. Pass `submission_count` from `PublicForm.tsx` to `FormRenderer`

### Fix 3: Document "Powered by" limitation
- Add note in HANDOFF.md about client-side-only enforcement

## Files to Modify
- `src/pages/PublicForm.tsx` — fetch submission_count, add closeAfterCount gate
- `src/components/FormRenderer.tsx` — add submissionCount prop + pre-submission check

## Files NOT Modified
- `src/components/builder/BrandingPanel.tsx` — working as designed
- `src/components/builder/FormSettingsPanel.tsx` — setting UI is correct
- `src/hooks/useForms.ts` — no changes needed
