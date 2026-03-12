# Agent 26 — Prompts

## Prompt Checklist
- [ ] 26.0 — Assessment: Read scan report + code, confirm issues, create FIX-PLAN
- [ ] 26.1 — Verify and fix closeAfterCount enforcement
- [ ] 26.2 — Verify form-uploads bucket and branding flow
- [ ] 26.3 — Final verification + HANDOFF.md

---

### PROMPT 26.0: Assessment

```
You are Agent 26 — Standard Forms for FormForge Phase 7. READ CLAUDE.md first.

TASK: Assess standard forms issues from the scan report.

1. Read these files:
   - .agents-phase-7/scanner-reports/05-standard-forms.md
   - src/components/FormRenderer.tsx — find submission handling + closeAfterCount check
   - src/components/builder/FormSettingsPanel.tsx — find closeAfterCount setting
   - src/components/builder/BrandingPanel.tsx — find "Powered by" toggle
   - src/hooks/useForms.ts — form CRUD
   - src/pages/FormBuilder.tsx — builder flow

2. Confirm:
   - Does FormRenderer check form.settings.closeAfterCount before accepting?
   - Does BrandingPanel enforce "Powered by" based on plan?
   - Is the form-uploads bucket properly configured?

3. Create FIX-PLAN.

4. Update PROGRESS.md.

VERIFY:
- FIX-PLAN documented
```

---

### PROMPT 26.1: Fix closeAfterCount Enforcement

```
You are Agent 26 — Standard Forms for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify and fix form auto-close by submission count.

1. Read src/components/FormRenderer.tsx — find submission handling.

2. Check:
   - Does it read form.settings.closeAfterCount?
   - Does it compare against form.submission_count?
   - If count exceeded: does it show "Form closed" message?

3. If missing or incomplete:
   - Add check before submission: if closeAfterCount > 0 && submission_count >= closeAfterCount → show closed message
   - Add check on form load: if already exceeded → render closed state immediately

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- closeAfterCount properly prevents submissions when limit reached
```

---

### PROMPT 26.2: Verify Form Uploads and Branding

```
You are Agent 26 — Standard Forms for FormForge Phase 7. READ CLAUDE.md first.

TASK: Verify file upload and branding flows work correctly.

1. Read FormRenderer.tsx — find file upload handling.
   - Verify it uploads to "form-uploads" bucket
   - Verify file URLs are stored in submission data
   - Check for error handling on upload failure

2. Read BrandingPanel.tsx — verify plan enforcement.
   - "Powered by" toggle: confirm lock + tooltip for free plan
   - Logo upload: verify it uses "branding" bucket
   - Color picker: verify it saves to form.branding

3. Document any issues found.

4. Update PROGRESS.md.

VERIFY:
- npm run lint passes
- All form features work as documented in scan report
```

---

### PROMPT 26.3: Final Verification + HANDOFF

```
You are Agent 26 — Standard Forms for FormForge Phase 7. READ CLAUDE.md first.

TASK: Final verification of standard forms.

1. Run: npm run lint && npx tsc --noEmit

2. Verify full E2E flow by reading code paths:
   - FormBuilder: field add → drag → configure → save (auto-save)
   - PublicForm → FormRenderer: load form → render fields → validate → submit
   - Submissions: list → search → date filter → CSV export
   - Share: public link, embed iframe, QR code generation

3. Update HANDOFF.md: Status COMPLETE, files modified, issues resolved.

4. Update PROGRESS.md as COMPLETE.

VERIFY:
- npm run lint passes
- npx tsc --noEmit passes
- HANDOFF.md complete
```
