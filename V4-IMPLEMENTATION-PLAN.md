# V4 Implementation Plan

**Date**: 2026-03-15
**Baseline**: V3.1 (all 8 features verified present in V4-BASELINE-AUDIT.md)
**Git safety**: v3.1-backup tag created

---

## Delta Analysis Per File

### 1. DUAL-AUTOMATION-PROMPT-V4.md (NEW — copy from V3.md)
- Copy `DUAL-AUTOMATION-PROMPT-V3.md` → `DUAL-AUTOMATION-PROMPT-V4.md`
- Search-replace all version references: V3 → V4, V3.1 → V4
- Update Mechanic 11 (Orchestrator Sync) to document V4 orchestrator features
- **Risk**: Low — text-only version stamp changes
- **Regression check**: Task 7 verifies all V3.1 features survive

### 2. orchestrator.mjs (MODIFY — targeted edits to existing functions)

| Change | Target | Lines | Risk |
|--------|--------|-------|------|
| **2a. Scanner prepend** | `extractPrompts()` | ~248-274 | Low — add string before extracted text |
| **2b. Builder prepend** | `extractPrompts()` | ~248-274 | Low — same as above |
| **2c. File existence checks** | Before `runScanner()`/`runBuilder()` in `runPipeline()` | ~1517-1576 | Low — new guard clauses |
| **2d. Config: dimensionsFile/templatesFile** | `mergeConfig()` defaults | ~38-53, 208-242 | Low — add 2 default fields |
| **2e. Dry-run file plan display** | `dryRun()` | ~1433-1451 | Low — add 4 log lines |
| **3. Quality gates** | New `runQualityGate()` function + call in `runAgents()` | After ~1163, new fn | Medium — new logic, but self-contained |
| **3. Gate state persistence** | Extend `defaultState()` + `saveState()` | ~131-144 | Low — add gateHistory array |
| **3. Gate resume** | Extend `resumePipeline()` | ~1578-1600 | Medium — new resume path |
| **3. Skip-gate flag** | Extend `parseArgs()` | ~174-196 | Low — add 2 flags |
| **4a. Role parsing + colors** | New `parseAgentRole()` fn + update `showStatus()` | ~1379-1427 | Low — display only |
| **4b. Dynamic batch count** | Already dynamic (no hardcoded limits found) | — | None — already correct |
| **4c. Project type display** | Update `showStatus()` header + `dryRun()` | ~1379-1427 | Low — display only |
| **4d. Role distribution** | Update `showStatus()` | ~1379-1427 | Low — display only |
| **5. Enhanced summary** | Rewrite `generateSummary()` | ~1297-1373 | Medium — significant output change |
| **6. Signal handling** | Verify existing + add gate signal logging | ~502-514 | Low — mostly verification |
| **8. Config defaults** | Update `DEFAULTS` object, add `loadConfig()` upgrade notice | ~38-53, 198-242 | Low |
| **8. claudeFlags validation** | Add validation before first `invokeClaude()` | Before ~1532 | Low — new guard |
| **10. Windows compat** | CRLF normalize in file reads, shell:true in gate cmds, taskkill | Scattered | Low — defensive additions |

### 3. orchestrator.config.json (MODIFY)
- Update `promptFile` from V3 to V4
- Confirm all V4 fields present (already partially there)
- **Risk**: Trivial

### 4. ORCHESTRATOR-USER-GUIDE.md (MODIFY — surgical edits)
- 8 specific section updates documented in Task 9
- **Risk**: Low — text additions only

### 5. DUAL-AUTOMATION-USER-GUIDE.md (MODIFY — surgical edits)
- 4 specific edits documented in Task 9
- **Risk**: Low — text additions only

### 6. SCAN-DIMENSIONS.md (NO CHANGE)
### 7. AGENT-TEMPLATES.md (NO CHANGE)

---

## Task Execution Order

| Task | Description | Files Modified | Estimated Complexity |
|------|-------------|---------------|---------------------|
| 0 | Baseline Audit | V4-BASELINE-AUDIT.md (new) | DONE |
| 1 | File Identity | DUAL-AUTOMATION-PROMPT-V4.md (new) | Simple |
| 2 | 3-File Extraction | orchestrator.mjs | Medium |
| 3 | Quality Gates | orchestrator.mjs | Complex |
| 4 | Roles/Batches/ProjectType | orchestrator.mjs | Medium |
| 5 | Enhanced Summary | orchestrator.mjs | Medium |
| 6 | Signal Handling | orchestrator.mjs (verify + minor additions) | Simple |
| 7 | V3.1 Verification | None (read-only checks) | Simple |
| 8 | Config Update | orchestrator.config.json, orchestrator.mjs | Simple |
| 9 | User Guides | ORCHESTRATOR-USER-GUIDE.md, DUAL-AUTOMATION-USER-GUIDE.md | Simple |
| 10 | Windows Compat | orchestrator.mjs | Simple |
| 11 | Full Verification | None (read-only checks) | Simple |

---

## Key Architectural Decisions

1. **Quality gates as a new function** — `runQualityGate(batchNum, cfg, state)` called from `runAgents()` after each batch completes. Self-contained, no modification to existing batch logic.
2. **Gate auto-fix uses `invokeClaude()`** — reuses existing infrastructure for spawning claude sessions.
3. **Role parsing is read-only** — just reads AGENT.md first line, no modification to agent execution.
4. **Prepends are string concatenation** — simplest possible approach in `extractPrompts()`.
5. **State.json gets `gateHistory` array** — backward compatible (old state files just won't have it).

---

## Approval Required

All 8 V3.1 features verified. Implementation plan is ready. Awaiting approval to proceed with Tasks 1-11.
