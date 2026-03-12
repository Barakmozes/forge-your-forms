# Agent 38 — Final E2E Verification

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Final verification engineer. Runs complete E2E validation of all features, confirms all P0/P1 issues resolved.

## Batch
Batch 5 — Sequential (Position 2 of 2). LAST AGENT. Depends on ALL others.

## Scan Report
`.agents-phase-7/scanner-reports/MASTER-BRIEF.md` — cross-references all scan reports

## Mission
1. Verify all 2 P0 issues are resolved
2. Verify all 14 unique P1 issues are resolved or documented with mitigation
3. Run full lint + type-check + test suite
4. Generate final Phase 7 completion report

## Owned Files (Exclusive)
- `.agents-phase-7/feature-17-final-verification/*`
- `.agents-phase-7/PHASE-7-COMPLETION-REPORT.md` (NEW — creates this)

## DO NOT TOUCH
- All source files (read-only verification)
- Migration files
- Edge function files

## Dependencies
- ALL agents 21-37 must complete

## Success Criteria
- [ ] All P0 issues confirmed resolved
- [ ] All P1 issues confirmed resolved or documented with mitigation
- [ ] `npm run lint` passes with zero warnings
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run test` passes
- [ ] PHASE-7-COMPLETION-REPORT.md generated
