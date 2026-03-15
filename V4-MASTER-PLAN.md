# V4 MASTER PLAN — Final Production-Ready Solution

## Complete Autonomous Development Lifecycle System

> **Mode**: AUDIT → PLAN → APPROVE → IMPLEMENT (sequential with checkpoints).
> **Baseline**: V3.1 files (NOT V3.0). Read the actual files, not assumptions.
> **What this creates**: The final integration layer that connects V3.1's powerful prompt system with a fully V3.1-aware orchestrator.
> **Score target**: 100/100 — every issue from V1→V3.1 resolved, zero regressions, full rollback safety.

---

## CONTEXT FOR THE AGENT

### Evolution History

| Version | Score | Key Addition |
|---------|-------|-------------|
| V1 | ~65 | Scanner + Builder. Single monolithic prompt. Manual session orchestration. |
| V2 | 82 | +8 professional dimensions, role-typed agents, safety gates |
| V3.0 | 91 | 3-file split for token efficiency, confidence scoring, runtime performance dimension, 21 dims |
| V3.1 | 96 | +Project Type Classification (6 types), +CLI/Library/Mobile dims (24 total), +Role Hierarchy, +Quality Gates in Builder, +E2E gap detection, +Lazy template loading, 7 safety layers |
| **V4** | **100** | **Orchestrator fully synced with V3.1. Quality gates with auto-fix/resume/skip. 3-file extraction fix. Git-tagged rollback safety. Per-task checkpoints. Production-ready.** |

### What V4 Does NOT Do

V4 does NOT rewrite the prompt system. V3.1 is excellent (96/100). V4's job is strictly:
1. **Fix the orchestrator** to work with 3-file architecture (the #1 blocker)
2. **Add quality gates** with proper state management, auto-fix, resume, and skip
3. **Sync the orchestrator** with all V3.1 features (24 dims, 10 roles, 9 batches, project types, role hierarchy)
4. **Update user guides** to reflect the complete system
5. **Verify everything** works end-to-end on Windows
6. **Guarantee zero regressions** via baseline audit, git tags, and per-task checkpoints

### Files That Exist — READ ALL BEFORE STARTING

**Prompt System (V3.1 — DO NOT downgrade to V3.0):**
1. `DUAL-AUTOMATION-PROMPT-V3.md` — BUT check if `DUAL-AUTOMATION-PROMPT-V3_1.md` exists. If V3_1 exists, use that as the canonical file. It contains:
   - Step 0.2b: Project Type Classification (6 types: Web, CLI, Library, Mobile, Backend, Service)
   - 15 conditional dimensions (not 12)
   - Lazy template loading (Builder Phase 0 defers AGENT-TEMPLATES.md to Phase 2)
   - Builder gate awareness (gate table in Step 1.3)
   - Role Hierarchy (Mechanic 5 with upstream/downstream graph)
   - Quality Gates documented (Mechanic 7 with 4 gates)
   - 7 Safety Layers (not 6)
2. `SCAN-DIMENSIONS.md` — ~663 lines, **24 dimensions** including:
   - CLI UX Audit, Library/SDK API Audit, Mobile App Audit (3 project-type dims)
   - E2E Coverage Gate in Test Coverage dimension (auto-flags zero E2E coverage as P1)
   - Project Type field in PROJECT-PROFILE.md format
   - Modern CSS: container queries, dvh/svh, aspect-ratio, CSS-in-JS, prefers-reduced-motion
   - Runtime Performance: frontend bundle + backend queries + Core Web Vitals + assets
3. `AGENT-TEMPLATES.md` — ~529 lines, 11 templates for 10 roles

**Orchestrator (V1 — needs upgrade to V4):**
4. `orchestrator.mjs` — ~1,692 lines (built for V1 single-file architecture)
5. `orchestrator.config.json` — V1 config schema

**User Guides:**
6. `ORCHESTRATOR-USER-GUIDE.md` — ~582 lines
7. `DUAL-AUTOMATION-USER-GUIDE.md` — ~500 lines

### Critical Architecture Principle — 3-File Token Optimization

The 3-file split is load-bearing. Each session loads ONLY what it needs:

| Session | Loads | Does NOT load | Token savings |
|---------|-------|---------------|---------------|
| Scanner | V4 main + SCAN-DIMENSIONS.md | AGENT-TEMPLATES.md | ~45% vs monolith |
| Builder | V4 main + AGENT-TEMPLATES.md (Phase 2 only) | SCAN-DIMENSIONS.md | ~49% vs monolith |
| Agent | Only its 4 agent files + scan report | None of the 3 main files | ~96% vs monolith |
| Orchestrator | Extracts prompts from V4 main | Sends companion file-read instructions as prepend | ~50 token overhead |

---

## PHASE 1 — AUDIT & PLAN (Do this FIRST, then STOP)

### Task 0: Baseline Audit (MANDATORY FIRST STEP)

Before planning any changes, verify the actual state of every file. Do NOT trust this plan's assumptions — trust the files.

**Step 0a — Create rollback safety net:**

```bash
# Tag the current state BEFORE any V4 changes
git add -A
git commit -m "pre-V4: snapshot of V3.1 state"
git tag v3.1-backup -m "V3.1 baseline before V4 implementation"
```

> **Why this matters**: If any V4 task breaks something, `git checkout v3.1-backup` restores everything instantly. Without this tag, recovery requires manual file-by-file restoration. This is the difference between a 30-second rollback and a 30-minute one.

**Step 0b — Run baseline checks and record results:**

```bash
# 1. Which V3 prompt file exists?
ls -la DUAL-AUTOMATION-PROMPT-V3*.md

# 2. Line counts
wc -l DUAL-AUTOMATION-PROMPT-V3*.md SCAN-DIMENSIONS.md AGENT-TEMPLATES.md orchestrator.mjs orchestrator.config.json

# 3. Dimension count (should be 19+ conditional dims)
grep -c "### Dim" SCAN-DIMENSIONS.md

# 4. V3.1 features present? (each should return 1+)
echo "--- Project Type Classification ---"
grep -c "Step 0.2b\|Project Type" DUAL-AUTOMATION-PROMPT-V3*.md

echo "--- CLI/Library/Mobile dimensions ---"
grep -c "CLI UX\|Library.*API\|Mobile App" SCAN-DIMENSIONS.md

echo "--- E2E Coverage Gate ---"
grep -c "E2E Coverage" SCAN-DIMENSIONS.md

echo "--- Role Hierarchy ---"
grep -c "Role Hierarchy\|role hierarchy\|Mechanic 5.*Role" DUAL-AUTOMATION-PROMPT-V3*.md

echo "--- Quality Gates in Builder ---"
grep -c "Gate 1\|Gate 2\|Gate 3\|Gate 4" DUAL-AUTOMATION-PROMPT-V3*.md

echo "--- Lazy template loading ---"
grep -c "Phase 2.*not\|NOT.*Phase 0\|deferred" DUAL-AUTOMATION-PROMPT-V3*.md

echo "--- 7 Safety Layers ---"
grep "Safety Gates" DUAL-AUTOMATION-PROMPT-V3*.md

# 5. Orchestrator current capabilities (expect 0 for all — these are the gaps)
echo "--- Orchestrator gaps ---"
grep -c "PERFORMANCE_ENGINEER\|PRODUCT_BUILDER\|ROADMAP_COMPILER" orchestrator.mjs
grep -c "qualityGate\|quality_gate\|GATE_" orchestrator.mjs
grep -c "dimensionsFile\|templatesFile\|SCAN-DIMENSIONS" orchestrator.mjs
```

**Step 0c — Write `V4-BASELINE-AUDIT.md`:**

```markdown
# V4 Baseline Audit

**Date**: {{now}}
**Git tag**: v3.1-backup (created in Step 0a)
**Canonical prompt file**: {{V3.md or V3_1.md — whichever exists}}

## File State
| File | Exists? | Lines | Version |
|------|---------|-------|---------|
| DUAL-AUTOMATION-PROMPT-V3.md | | | |
| DUAL-AUTOMATION-PROMPT-V3_1.md | | | |
| SCAN-DIMENSIONS.md | | | |
| AGENT-TEMPLATES.md | | | |
| orchestrator.mjs | | | |
| orchestrator.config.json | | | |
| ORCHESTRATOR-USER-GUIDE.md | | | |
| DUAL-AUTOMATION-USER-GUIDE.md | | | |

## V3.1 Features (ALL must be YES to proceed)
| # | Feature | Present? | Location |
|---|---------|----------|----------|
| 1 | Project Type Classification (Step 0.2b) | YES/NO | |
| 2 | 24 dimensions (CLI/Library/Mobile in SCAN-DIMENSIONS.md) | YES/NO | |
| 3 | E2E Coverage Gate | YES/NO | |
| 4 | Role Hierarchy (Mechanic 5) | YES/NO | |
| 5 | Quality Gates in Builder (Step 1.3 gate table) | YES/NO | |
| 6 | Lazy template loading (Phase 2, not Phase 0) | YES/NO | |
| 7 | 7 Safety Layers (Mechanic 8) | YES/NO | |
| 8 | Confidence scoring (HIGH/MEDIUM/LOW) | YES/NO | |

## Orchestrator Gaps (expected: all NO — these are what V4 fixes)
| Feature | Supported? | V4 Task |
|---------|-----------|---------|
| 3-file extraction (prepends SCAN-DIMENSIONS/AGENT-TEMPLATES) | NO | Task 2 |
| Quality gates with state persistence | NO | Task 3 |
| 10 roles with colors in dashboard | NO/PARTIAL | Task 4 |
| 9 batch tiers | NO/PARTIAL | Task 4 |
| Project type display | NO | Task 4 |
| V4 summary format with roles/gates/roadmap | NO | Task 5 |
| claudeFlags support with validation | UNKNOWN | Task 8 |

## Decision
- [ ] All 8 V3.1 features present → PROCEED to implementation plan
- [ ] Any V3.1 feature missing → STOP and report. Do NOT proceed.
```

**If any V3.1 feature is MISSING from files, STOP and report.** The entire V4 plan assumes V3.1 as baseline. Proceeding without it causes regressions.

After Task 0, produce `V4-IMPLEMENTATION-PLAN.md` with delta analysis per file, then **STOP and wait for approval.**

---

## PHASE 2 — IMPLEMENTATION (After approval only)

### CRITICAL RULE: Per-Task Checkpoints

**Before starting each task**, create a git checkpoint:

```bash
git add -A && git commit -m "checkpoint: before task-N ({{task name}})"
```

**After each task passes verification**, commit the work:

```bash
git add -A && git commit -m "V4 task-N complete: {{task name}}"
```

**If a task fails verification**, rollback that task only:

```bash
git checkout HEAD -- {{files modified by this task}}
```

**If multiple tasks have failed and the situation is unclear**, full rollback:

```bash
git checkout v3.1-backup
```

> This checkpoint pattern means every task is atomic. A failed Task 5 cannot corrupt the successful work of Tasks 1–4. The worst case for any single failure is losing one task's changes, not the entire V4 implementation.

---

### Task 1: Establish V4 File Identity

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-1 (file identity)"`

**What**: Create a clean V4 prompt file from the V3.1 source.

**Steps**:
1. If `DUAL-AUTOMATION-PROMPT-V3_1.md` exists, copy it to `DUAL-AUTOMATION-PROMPT-V4.md`
2. If only `DUAL-AUTOMATION-PROMPT-V3.md` exists (and baseline audit confirmed V3.1 features inside it), copy that to `DUAL-AUTOMATION-PROMPT-V4.md`
3. In `DUAL-AUTOMATION-PROMPT-V4.md`, update:
   - Title: "V4" (not V3 or V3.1)
   - All Scanner Version references: V4
   - All Builder Version references: V4
   - All Mechanics Guide version references: V4
   - Mechanic 11 (Orchestrator Sync) → update to document V4 orchestrator features: 3-file extraction, quality gates with auto-fix/resume/skip, 10 role colors, 9 batch display, project type in dashboard
4. Update `orchestrator.config.json`: `"promptFile": "DUAL-AUTOMATION-PROMPT-V4.md"`
5. Do NOT modify `SCAN-DIMENSIONS.md` or `AGENT-TEMPLATES.md` — they are version-independent

**Verify**: 
```bash
grep -c "V3" DUAL-AUTOMATION-PROMPT-V4.md  # Should be 0 (no V3 references)
grep "V4" DUAL-AUTOMATION-PROMPT-V4.md | head -5  # Should show V4 references
diff DUAL-AUTOMATION-PROMPT-V4.md {{source_file}} | head -30  # Should show ONLY version number changes
```

**Do NOT delete V3/V3.1 files** — keep them alongside V4 as backup.

**Commit**: `git add -A && git commit -m "V4 task-1 complete: file identity established"`

---

### Task 2: Fix 3-File Extraction in Orchestrator (CRITICAL)

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-2 (3-file extraction)"`

**What**: The orchestrator extracts Scanner/Builder prompts from the main file and sends them to `claude -p`. But `claude -p` sessions don't know about the 2 companion files. This is the #1 blocker preventing the entire V3+ system from working with the orchestrator.

**Find in orchestrator.mjs**: The function that extracts prompt text between `---START SCANNER---` / `---END SCANNER---` markers and sends it to `claude -p`.

**Change 2a — Scanner prompt prepend**:

After extracting the Scanner prompt text, prepend this at the very beginning (before the `## Role` line):

```
CRITICAL FIRST STEP: Before starting any scan work, read the file "SCAN-DIMENSIONS.md" from the project root. It contains all dimension output format templates you need for structured scan reports. If this file does not exist, output "ERROR: SCAN-DIMENSIONS.md not found" and stop immediately.

If you are RESUMING (scanner-reports/PROJECT-PROFILE.md already exists), read only the dimensions marked [x] in PROJECT-PROFILE.md "Active Scan Dimensions" section — not the entire SCAN-DIMENSIONS.md file. This saves tokens for actual scanning work.
```

**Change 2b — Builder prompt prepend**:

After extracting the Builder prompt text, prepend this at the very beginning:

```
CRITICAL FIRST STEP: Verify the file "AGENT-TEMPLATES.md" exists in the project root. You will read it at Phase 2 (not now) — but confirm it exists before proceeding with any work. If missing, output "ERROR: AGENT-TEMPLATES.md not found" and stop immediately.
```

**Change 2c — File existence checks in orchestrator**:

Before starting Scanner phase:
```javascript
const dimFile = config.dimensionsFile || 'SCAN-DIMENSIONS.md';
const tplFile = config.templatesFile || 'AGENT-TEMPLATES.md';

if (!fs.existsSync(path.join(projectRoot, dimFile))) {
  log('ERROR', `${dimFile} not found in project root.`);
  log('ERROR', `The Scanner requires this file. Copy it alongside ${config.promptFile}.`);
  log('ERROR', 'Files needed: ' + config.promptFile + ', ' + dimFile + ', ' + tplFile);
  process.exit(1);
}
```

Before starting Builder phase:
```javascript
if (!fs.existsSync(path.join(projectRoot, tplFile))) {
  log('ERROR', `${tplFile} not found in project root.`);
  log('ERROR', `The Builder requires this file. Copy it alongside ${config.promptFile}.`);
  log('ERROR', 'Files needed: ' + config.promptFile + ', ' + dimFile + ', ' + tplFile);
  process.exit(1);
}
```

**Change 2d — Config schema extension**:

Add support for explicit companion file paths (with backward-compatible defaults):
```json
{
  "promptFile": "DUAL-AUTOMATION-PROMPT-V4.md",
  "dimensionsFile": "SCAN-DIMENSIONS.md",
  "templatesFile": "AGENT-TEMPLATES.md"
}
```

If `dimensionsFile`/`templatesFile` not present in config, default to `"SCAN-DIMENSIONS.md"` and `"AGENT-TEMPLATES.md"` in the same directory as `promptFile`.

**Change 2e — Dry-run display**:

When `--dry-run` is active, display the file loading plan:
```
[DRY-RUN] Scanner will load: DUAL-AUTOMATION-PROMPT-V4.md + SCAN-DIMENSIONS.md
[DRY-RUN] Builder will load: DUAL-AUTOMATION-PROMPT-V4.md + AGENT-TEMPLATES.md
[DRY-RUN] SCAN-DIMENSIONS.md: found (663 lines)
[DRY-RUN] AGENT-TEMPLATES.md: found (529 lines)
```

**Verify**:
```bash
# Existence checks work
mv SCAN-DIMENSIONS.md SCAN-DIMENSIONS.md.bak
node orchestrator.mjs run --dry-run 2>&1 | grep "not found"  # Should show clear error
mv SCAN-DIMENSIONS.md.bak SCAN-DIMENSIONS.md

# Normal dry-run shows file plan
node orchestrator.mjs run --dry-run 2>&1 | grep "will load"  # Should show both file pairs

# Extracted prompt contains prepend
node -e "
const fs = require('fs');
const content = fs.readFileSync('DUAL-AUTOMATION-PROMPT-V4.md', 'utf8');
const scanner = content.split('---START SCANNER---')[1].split('---END SCANNER---')[0];
// Simulate the prepend that orchestrator adds
const prepend = 'CRITICAL FIRST STEP: Before starting any scan work, read the file';
console.log('Prepend ready:', prepend.length > 0 ? 'YES' : 'NO');
"
```

**Commit**: `git add -A && git commit -m "V4 task-2 complete: 3-file extraction with prepend + existence checks"`

---

### Task 3: Implement Quality Gates in Orchestrator

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-3 (quality gates)"`

**What**: Add quality gate checks between batch groups. V3.1 Builder already designs batches with gate boundaries (Step 1.3 gate table) — the orchestrator now enforces them at runtime.

**Gate definitions** (read actual commands from `scanner-reports/PROJECT-PROFILE.md` Template Variables section at runtime — fall back to config `verifyCommands` if no PROJECT-PROFILE exists):

| After Batch | Gate Name | Commands | Purpose |
|-------------|-----------|----------|---------|
| 1 | Post-Infrastructure | `{{LINT_CMD}}` + `{{TYPE_CHECK_CMD}}` | Core files are clean after infra/security fixes |
| 3 | Post-Bugfix | `{{BUILD_CMD}}` | App builds successfully after all bug fixes |
| 5 | Pre-Feature | `{{BUILD_CMD}}` + `{{TEST_CMD}}` | Stable foundation before adding new features |
| 6 | Post-Feature | `{{BUILD_CMD}}` + `{{TEST_CMD}}` | New features don't break existing functionality |

**Implementation — gate definitions**:

```javascript
// Gate configuration — loaded from config with defaults
const DEFAULT_GATES = {
  1: { name: 'Post-Infrastructure', commandKeys: ['lint', 'typecheck'] },
  3: { name: 'Post-Bugfix', commandKeys: ['build'] },
  5: { name: 'Pre-Feature', commandKeys: ['build', 'test'] },
  6: { name: 'Post-Feature', commandKeys: ['build', 'test'] },
};

// Map command keys to actual commands from PROJECT-PROFILE.md or config
function resolveGateCommands(commandKeys, templateVars, verifyCommands) {
  const map = {
    lint: templateVars['LINT_CMD'] || verifyCommands[0] || 'echo "No lint configured"',
    typecheck: templateVars['TYPE_CHECK_CMD'] || verifyCommands[1] || 'echo "No typecheck configured"',
    build: templateVars['BUILD_CMD'] || verifyCommands[2] || 'echo "No build configured"',
    test: templateVars['TEST_CMD'] || 'echo "No tests configured"',
  };
  return commandKeys.map(k => map[k]).filter(Boolean);
}
```

**Implementation — gate execution flow**:

```
Batch N completes
  → Check if gate exists for batch N
  → If no gate exists OR gates disabled in config: proceed to batch N+1
  → If gate exists:
    → Log: "[GATE] Running quality gate '{name}' after batch {N}"
    → Run each gate command sequentially
    → If ALL pass:
      → Log: "[GATE] GATE_PASSED_BATCH_{N}"
      → Auto-commit: "[orchestrator] gate-{name} passed after batch-{N}"
      → Save gate result to state.json (status: "PASSED")
      → Proceed to batch N+1
    → If ANY command fails:
      → Log: "[GATE] Command failed: {command}"
      → Log: "[GATE] Attempting auto-fix (attempt 1 of {maxAttempts})..."
      → Auto-fix attempt:
        → Send error to claude -p with gateFix model:
          "Fix the following {lint/build/test} error in the project at {projectRoot}.
           Make ONLY the minimal changes needed to fix this specific error.
           Do not refactor, do not add features, do not change unrelated code.
           
           Error output:
           {error_text_last_200_lines}"
        → If auto-fix session hits CONTEXT_LIMIT_REACHED:
          → Restart auto-fix session (up to maxContextRestarts.agent times)
          → If still hitting context limit after max restarts:
            → Treat as auto-fix failure (the error is too complex for auto-fix)
      → Re-run the failed command
      → If passes now:
        → Log: "[GATE] Auto-fix succeeded for: {command}"
        → Continue to next gate command (if any remaining)
      → If still fails after all auto-fix attempts:
        → Save full gate failure state to .orchestrator/state.json
        → Write detailed error log to .orchestrator/logs/gate-{N}.log
        → Log: "[GATE] GATE_FAILED_BATCH_{N}"
        → Print user-facing message:
          "
          ⚠ Quality gate '{name}' failed after batch {N}.
          
            Failed command: {command}
            Error summary:  {first_3_lines_of_error}
          
            Options:
              1. Fix manually, then resume:
                 node orchestrator.mjs resume
              
              2. Skip this gate (use with caution):
                 node orchestrator.mjs resume --skip-gate --confirm
              
              3. View full error:
                 cat .orchestrator/logs/gate-{N}.log
              
              4. Full rollback to pre-V4:
                 git checkout v3.1-backup
          "
        → PAUSE pipeline (exit with code 0, not 1 — so it's resumable)
```

**Implementation — state persistence for gates**:

```json
{
  "phase": "agents",
  "currentBatch": 4,
  "gateHistory": [
    { "batch": 1, "gateName": "Post-Infrastructure", "status": "PASSED", "timestamp": "..." },
    {
      "batch": 3,
      "gateName": "Post-Bugfix",
      "status": "FAILED",
      "failedCommand": "npm run build",
      "errorSummary": "Module not found: ./utils/helpers",
      "fullErrorLog": ".orchestrator/logs/gate-3.log",
      "autoFixAttempted": true,
      "autoFixResult": "FAILED",
      "autoFixSessions": 1,
      "timestamp": "2026-03-15T14:30:00Z"
    }
  ]
}
```

**Implementation — resume behavior**:

- `node orchestrator.mjs resume` → Check state.json. If last gate status is "FAILED": re-run the failed gate command (user presumably fixed the issue manually). If passes → continue pipeline. If fails → show error and pause again.
- `node orchestrator.mjs resume --skip-gate` → Print: "ERROR: --skip-gate requires --confirm flag. This skips a quality check and may result in broken code in later batches."
- `node orchestrator.mjs resume --skip-gate --confirm` → Log warning: "[WARN] Gate '{name}' SKIPPED by user at batch {N}" → Save gate status as "SKIPPED" in state.json → Continue to next batch.

**Config fields**:
```json
{
  "qualityGates": {
    "enabled": true,
    "autoFixAttempts": 1
  },
  "models": {
    "gateFix": "claude-sonnet-4-6"
  }
}
```

If `qualityGates` not in config → default to `{ "enabled": true, "autoFixAttempts": 1 }`.
If `qualityGates.enabled` is false → skip all gates, log "[INFO] Quality gates disabled by config".
If `models.gateFix` not in config → default to `"claude-sonnet-4-6"`.

**Verify**:
```bash
# Dry-run shows gate checkpoints
node orchestrator.mjs run --dry-run 2>&1 | grep -i "gate"
# Expected output includes:
#   "After batch 1: Quality Gate 'Post-Infrastructure' (lint + typecheck)"
#   "After batch 3: Quality Gate 'Post-Bugfix' (build)"
#   "After batch 5: Quality Gate 'Pre-Feature' (build + test)"
#   "After batch 6: Quality Gate 'Post-Feature' (build + test)"

# Simulated gate failure resume
echo '{"phase":"agents","currentBatch":4,"gateHistory":[{"batch":3,"gateName":"Post-Bugfix","status":"FAILED","failedCommand":"npm run build","timestamp":"2026-01-01T00:00:00Z"}]}' > .orchestrator/state.json
node orchestrator.mjs resume --dry-run 2>&1 | grep -i "gate"
# Expected: "Re-running failed gate 'Post-Bugfix'..."
rm -rf .orchestrator/state.json
```

**Commit**: `git add -A && git commit -m "V4 task-3 complete: quality gates with auto-fix, resume, skip, state persistence"`

---

### Task 4: Support V3.1 Roles, Batches, and Project Types in Orchestrator

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-4 (roles+batches+project-type)"`

**4a — 10 Agent Roles with Dashboard Colors**:

Find the dashboard display function in orchestrator.mjs. Add role parsing and coloring.

Parse `[ROLE_TYPE]` from first line of each agent's `AGENT.md`:
```
# Agent 03 — auth-security [SECURITY_ENGINEER]
                             ^^^^^^^^^^^^^^^^^^ parse this
```

```javascript
function parseAgentRole(agentDir) {
  const agentMd = path.join(agentDir, 'AGENT.md');
  if (!fs.existsSync(agentMd)) return 'UNKNOWN';
  const firstLine = fs.readFileSync(agentMd, 'utf8').split('\n')[0];
  const match = firstLine.match(/\[(\w+)\]/);
  return match ? match[1] : 'UNKNOWN';
}

const ROLE_COLORS = {
  ENGINEER:               '\x1b[32m',   // green
  RESPONSIVE_SPECIALIST:  '\x1b[36m',   // cyan
  SECURITY_ENGINEER:      '\x1b[31m',   // red
  PERFORMANCE_ENGINEER:   '\x1b[33m',   // yellow
  DEVOPS_ENGINEER:        '\x1b[33m',   // yellow
  PRODUCT_BUILDER:        '\x1b[35m',   // magenta
  ARCHITECT:              '\x1b[34m',   // blue
  DOCS_WRITER:            '\x1b[0m',    // default
  ROADMAP_COMPILER:       '\x1b[35m',   // magenta
  VERIFIER:               '\x1b[1;32m', // bold green
  UNKNOWN:                '\x1b[0m',    // default with "(unknown role)" tag
};
```

Display format per agent in dashboard:
```
  agent-03-auth-security    COMPLETE  [4/4]  (SECURITY_ENGINEER)
                                              ^^^^^^^^^^^^^^^^^^^ colored by role
```

**4b — 9 Batch Tiers**:

- Remove any hardcoded batch count limits (search for magic numbers like `maxBatches`, `batch < 5`, etc.)
- Read batch count dynamically: count unique batch numbers from `.agents/MASTER-CONTEXT.md` agent table, OR from COMMANDS.md section headers, OR from the set of batch numbers found in agent folders
- Display batch type (Sequential/Parallel) parsed from COMMANDS.md or MASTER-CONTEXT.md

**4c — Project Type Display**:

Read `{{PROJECT_TYPE}}` from `scanner-reports/PROJECT-PROFILE.md` (if exists). Also read active dimension count.

Display in dashboard header:
```
╔═══════════════════════════════════════════════════════════════╗
║   AGENT ORCHESTRATION DASHBOARD — V4                         ║
║   Project: FormForge | Type: Web Application | Dims: 18/24   ║
╚═══════════════════════════════════════════════════════════════╝
```

If PROJECT-PROFILE.md doesn't exist yet (Scanner hasn't run): show "Type: pending scan".

**4d — Role Distribution in Summary**:

Count agents per role from parsed AGENT.md files. Display as compact line:
```
Roles: ENGINEER:4, SECURITY:1, RESPONSIVE:2, PERFORMANCE:1, PRODUCT:3, ARCHITECT:1, DOCS:1, DEVOPS:1, ROADMAP:1, VERIFIER:1
```

**Verify**:
```bash
# Create mock .agents/ structure
mkdir -p .agents/agent-01-test .agents/agent-02-test .agents/agent-03-test
echo '# Agent 01 — infra [ENGINEER]' > .agents/agent-01-test/AGENT.md
echo '# Agent 02 — security [SECURITY_ENGINEER]' > .agents/agent-02-test/AGENT.md
echo '# Agent 03 — responsive [RESPONSIVE_SPECIALIST]' > .agents/agent-03-test/AGENT.md
# Create minimal PROGRESS.md files
for d in .agents/agent-0*; do echo '| 1.0 | Assessment | NOT_STARTED | |' > "$d/PROGRESS.md"; done

node orchestrator.mjs status
# Expected: 3 agents displayed, each with correct color and role name
# Expected: No crashes, no "undefined" in output

# Cleanup
rm -rf .agents/agent-01-test .agents/agent-02-test .agents/agent-03-test
```

**Commit**: `git add -A && git commit -m "V4 task-4 complete: 10 roles with colors, 9 batch tiers, project type display"`

---

### Task 5: Enhanced Completion Summary

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-5 (summary)"`

**What**: Update the pipeline completion output to display V4 metrics: roles, gates, roadmap, project type.

**Summary format**:

```
════════════════════════════════════════════════════════════
  PIPELINE COMPLETE — V4 Full Lifecycle
════════════════════════════════════════════════════════════

  Project:      {{name}} ({{PROJECT_TYPE}})
  Duration:     {{time}}
  Sessions:     {{N}} total ({{N}} scanner, {{N}} builder, {{N}} agents)
  Agents:       {{complete}}/{{total}} complete
  Dimensions:   {{active}}/24 scanned

  By Role:
    ENGINEER:              {{N}} agents, {{N}} issues fixed
    SECURITY_ENGINEER:     {{N}} agents, {{N}} issues fixed
    RESPONSIVE_SPECIALIST: {{N}} agents, {{N}} issues fixed
    PERFORMANCE_ENGINEER:  {{N}} agents, {{N}} issues fixed
    PRODUCT_BUILDER:       {{N}} agents, {{N}} features built
    ARCHITECT:             {{N}} agents
    DOCS_WRITER:           {{N}} agents
    DEVOPS_ENGINEER:       {{N}} agents

  Quality Gates:
    Post-Infrastructure: {{PASS/FAIL/SKIPPED/N-A}}
    Post-Bugfix:         {{PASS/FAIL/SKIPPED/N-A}}
    Pre-Feature:         {{PASS/FAIL/SKIPPED/N-A}}
    Post-Feature:        {{PASS/FAIL/SKIPPED/N-A}}

  Verification:
    Lint:       {{PASS/FAIL}}
    Typecheck:  {{PASS/FAIL}}
    Build:      {{PASS/FAIL}}
    Tests:      {{PASS/FAIL}}

  Product Roadmap:
    Features built:    {{N}}
    Next sprint ideas: {{N}}
    Future backlog:    {{N}}

  Reports:
    Pipeline report:  .orchestrator/logs/summary.md
    Product roadmap:  PRODUCT-ROADMAP.md
    Final report:     FINAL-REPORT.md
    Review changes:   git log --oneline -{{N}}
════════════════════════════════════════════════════════════
```

**Data sources** (all must handle "not found" gracefully — show "N/A", never crash):

| Data | Source | Parse Method |
|------|--------|-------------|
| Project name + type | `scanner-reports/PROJECT-PROFILE.md` | Read "Project Type" line |
| Active dimensions | `scanner-reports/PROJECT-PROFILE.md` | Count `[x]` checkboxes |
| Agent roles + counts | `.agents/agent-*/AGENT.md` | Parse `[ROLE_TYPE]` from first line |
| Issues fixed per role | `.agents/agent-*/HANDOFF.md` | Count rows in "Issues Resolved" table |
| Features built | Count PRODUCT_BUILDER agents with COMPLETE status | Read PROGRESS.md |
| Gate results | `.orchestrator/state.json` | Read gateHistory array |
| Roadmap counts | `PRODUCT-ROADMAP.md` | Count table rows per section |
| Verification results | `FINAL-REPORT.md` or `.orchestrator/logs/verification.log` | Parse PASS/FAIL |

**Write the summary to both console AND `.orchestrator/logs/summary.md`.**

**Verify**: Create mock data files, run summary generation, confirm all fields populated or "N/A". No crashes when files are missing.

**Commit**: `git add -A && git commit -m "V4 task-5 complete: enhanced summary with roles, gates, roadmap metrics"`

---

### Task 6: Completion Signal Handling

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-6 (signals)"`

**Verify existing signals** (these should already work — confirm, don't rewrite):

| Signal | Expected Action | Verify |
|--------|----------------|--------|
| `SCANNER_COMPLETE` | Proceed to Builder | grep in orchestrator.mjs |
| `SCANNER_COMPLETE — nothing to do` | Skip Scanner | grep in orchestrator.mjs |
| `BUILDER_COMPLETE` | Proceed to Agents | grep in orchestrator.mjs |
| `BUILDER_COMPLETE — nothing to do` | Skip Builder | grep in orchestrator.mjs |
| `AGENT_NN_COMPLETE` | Mark agent done | grep in orchestrator.mjs |
| `CONTEXT_LIMIT_REACHED` | Restart session | grep in orchestrator.mjs |

**Add new signal handling** (generated by orchestrator itself during gate execution):

| Signal | Source | Action |
|--------|--------|--------|
| `GATE_PASSED_BATCH_N` | Orchestrator (Task 3 logic) | Log to state.json + auto-commit + proceed |
| `GATE_FAILED_BATCH_N` | Orchestrator (Task 3 logic) | Log to state.json + save error + pause |

These are internal orchestrator events, not Claude output. They are logged to `.orchestrator/logs/orchestrator.log` with timestamps.

**Post-pipeline file checks** (orchestrator reads files after ALL agents complete, before final summary):
- If `PRODUCT-ROADMAP.md` exists → count opportunities per section for summary
- If `FINAL-REPORT.md` exists → extract verification results for summary
- If neither exists → log `[INFO] No product roadmap or final report generated` → continue (don't fail)

**Verify**:
```bash
# All 6 existing signals handled
grep -c "SCANNER_COMPLETE\|BUILDER_COMPLETE\|AGENT_.*_COMPLETE\|CONTEXT_LIMIT" orchestrator.mjs
# Expected: 4+ matches (each signal appears in parsing logic)

# Gate signals logged
grep -c "GATE_PASSED\|GATE_FAILED" orchestrator.mjs
# Expected: 2+ matches (from Task 3 implementation)
```

**Commit**: `git add -A && git commit -m "V4 task-6 complete: all signals verified and gate signals integrated"`

---

### Task 7: Verify V3.1 Features Intact

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-7 (V3.1 verification)"`

**What**: This task does NOT implement anything. It verifies that ALL V3.1 features survived the V4 upgrade process (Tasks 1–6). This is the regression firewall.

**Run every check. ALL must pass.**

```bash
echo "=== V3.1 Feature Preservation Check ==="

# 1. Project Type Classification exists in V4 prompt
echo -n "1. Project Type Classification: "
grep -q "Step 0.2b" DUAL-AUTOMATION-PROMPT-V4.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 2. 15 conditional dimensions in activation table  
echo -n "2. 15 conditional dimensions: "
count=$(grep -c "Activates When" DUAL-AUTOMATION-PROMPT-V4.md)
[ "$count" -ge 1 ] && echo "PASS (found activation table)" || echo "FAIL ← REGRESSION"

# 3. CLI/Library/Mobile dimensions in SCAN-DIMENSIONS.md (untouched file)
echo -n "3. CLI/Library/Mobile dims: "
grep -q "CLI UX Audit" SCAN-DIMENSIONS.md && grep -q "Library.*SDK" SCAN-DIMENSIONS.md && grep -q "Mobile App Audit" SCAN-DIMENSIONS.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 4. E2E Coverage Gate
echo -n "4. E2E Coverage Gate: "
grep -q "E2E Coverage" SCAN-DIMENSIONS.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 5. Role Hierarchy (Mechanic 5)
echo -n "5. Role Hierarchy: "
grep -q "Role Hierarchy" DUAL-AUTOMATION-PROMPT-V4.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 6. Quality Gates in Builder
echo -n "6. Quality Gates in Builder: "
count=$(grep -c "Gate [1234]" DUAL-AUTOMATION-PROMPT-V4.md)
[ "$count" -ge 4 ] && echo "PASS ($count gate refs)" || echo "FAIL ← REGRESSION (only $count)"

# 7. Lazy template loading
echo -n "7. Lazy template loading: "
grep -q "Phase 2" DUAL-AUTOMATION-PROMPT-V4.md && grep -q "NOT.*Phase 0\|not.*Phase 0\|deferred" DUAL-AUTOMATION-PROMPT-V4.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 8. 7 Safety Layers
echo -n "8. 7 Safety Layers: "
grep -q "7 Layers\|7 layers\|Safety Gates (7" DUAL-AUTOMATION-PROMPT-V4.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 9. Confidence scoring
echo -n "9. Confidence scoring: "
grep -q "HIGH.*MEDIUM.*LOW\|Confidence.*HIGH\|confidence.*scoring" DUAL-AUTOMATION-PROMPT-V4.md && echo "PASS" || echo "FAIL ← REGRESSION"

# 10. SCAN-DIMENSIONS.md NOT modified (should be identical to pre-V4)
echo -n "10. SCAN-DIMENSIONS.md unmodified: "
git diff v3.1-backup -- SCAN-DIMENSIONS.md | head -1
# Expected: empty output (no changes)

# 11. AGENT-TEMPLATES.md NOT modified
echo -n "11. AGENT-TEMPLATES.md unmodified: "
git diff v3.1-backup -- AGENT-TEMPLATES.md | head -1
# Expected: empty output (no changes)

echo "=== Check complete ==="
```

**If ANY check shows "FAIL ← REGRESSION"**: Stop immediately. Identify which task caused the regression. Restore from the task's checkpoint commit. Fix the task. Re-run this verification.

**Commit**: `git add -A && git commit -m "V4 task-7 complete: all 11 V3.1 preservation checks passed"`

---

### Task 8: Update orchestrator.config.json

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-8 (config)"`

**Final V4 config schema**:

```json
{
  "promptFile": "DUAL-AUTOMATION-PROMPT-V4.md",
  "dimensionsFile": "SCAN-DIMENSIONS.md",
  "templatesFile": "AGENT-TEMPLATES.md",
  "models": {
    "scanner": "claude-opus-4-6",
    "builder": "claude-opus-4-6",
    "agents": "claude-opus-4-6",
    "verification": "claude-opus-4-6",
    "gateFix": "claude-sonnet-4-6"
  },
  "qualityGates": {
    "enabled": true,
    "autoFixAttempts": 1
  },
  "budgetPerPhase": 10,
  "budgetTotal": 50,
  "parallelism": 2,
  "maxContextRestarts": {
    "scanner": 20,
    "builder": 15,
    "agent": 10
  },
  "timeoutMs": 600000,
  "verifyCommands": [
    "npm run lint",
    "npx tsc --noEmit",
    "npm run build"
  ],
  "agentsDir": ".agents",
  "claudeFlags": []
}
```

**Backward compatibility** — add to orchestrator.mjs:

```javascript
const DEFAULTS = {
  promptFile: 'DUAL-AUTOMATION-PROMPT-V4.md',
  dimensionsFile: 'SCAN-DIMENSIONS.md',
  templatesFile: 'AGENT-TEMPLATES.md',
  models: {
    scanner: 'claude-opus-4-6',
    builder: 'claude-opus-4-6',
    agents: 'claude-opus-4-6',
    verification: 'claude-opus-4-6',
    gateFix: 'claude-sonnet-4-6',
  },
  qualityGates: { enabled: true, autoFixAttempts: 1 },
  claudeFlags: [],
  budgetPerPhase: 10,
  budgetTotal: 50,
  parallelism: 2,
  maxContextRestarts: { scanner: 20, builder: 15, agent: 10 },
  timeoutMs: 600000,
  verifyCommands: [],
  agentsDir: '.agents',
};

function loadConfig() {
  const configPath = path.join(projectRoot, 'orchestrator.config.json');
  let userConfig = {};
  if (fs.existsSync(configPath)) {
    userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  // Deep merge: user config overrides defaults
  const config = deepMerge(DEFAULTS, userConfig);
  
  // Detect old config and warn
  if (!userConfig.dimensionsFile && !userConfig.templatesFile) {
    log('INFO', 'Config upgraded with V4 defaults (dimensionsFile, templatesFile, qualityGates).');
    log('INFO', 'Review orchestrator.config.json for new V4 options.');
  }
  
  return config;
}
```

**claudeFlags validation** — before first use, test if `claude -p` accepts the flags:

```javascript
if (config.claudeFlags && config.claudeFlags.length > 0) {
  try {
    // Quick test with a simple prompt
    const testResult = await invokeClaude('echo test', { 
      extraFlags: config.claudeFlags, 
      timeout: 15000 
    });
    log('INFO', `claudeFlags ${JSON.stringify(config.claudeFlags)} accepted by claude -p.`);
  } catch (e) {
    log('WARN', `claudeFlags ${JSON.stringify(config.claudeFlags)} not supported by claude -p.`);
    log('WARN', 'Falling back to no flags. Set CLAUDE_CODE_EFFORT_LEVEL env var instead.');
    log('WARN', 'Example: $env:CLAUDE_CODE_EFFORT_LEVEL="high" (PowerShell)');
    log('WARN', 'Example: export CLAUDE_CODE_EFFORT_LEVEL=high (bash/zsh)');
    config.claudeFlags = [];
  }
}
```

**Verify**:
```bash
# V4 config works
node orchestrator.mjs run --dry-run  # No errors

# Old V1-style config still works
cp orchestrator.config.json orchestrator.config.json.v4bak
echo '{"promptFile":"DUAL-AUTOMATION-PROMPT-V4.md","verifyCommands":["npm run lint"]}' > orchestrator.config.json
node orchestrator.mjs run --dry-run 2>&1 | grep "upgraded"
# Expected: "Config upgraded with V4 defaults"
mv orchestrator.config.json.v4bak orchestrator.config.json

# Minimal config works (just promptFile)
echo '{"promptFile":"DUAL-AUTOMATION-PROMPT-V4.md"}' > /tmp/test-config.json
# Orchestrator should work with all other fields defaulted
```

**Commit**: `git add -A && git commit -m "V4 task-8 complete: config schema with backward compat and claudeFlags validation"`

---

### Task 9: Update User Guides

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-9 (user guides)"`

**Do NOT rewrite these guides. Make targeted, surgical edits only.**

**ORCHESTRATOR-USER-GUIDE.md** — specific edits:

| Section | Edit |
|---------|------|
| Section 2 (Prerequisites) | Add line: "Two companion files must also be present: `SCAN-DIMENSIONS.md` (dimension templates for the Scanner) and `AGENT-TEMPLATES.md` (agent templates for the Builder)." |
| Section 3 (First-Time Setup), Step 1 | Update file list from 3 to 5 files: `orchestrator.mjs`, `orchestrator.config.json`, `DUAL-AUTOMATION-PROMPT-V4.md`, `SCAN-DIMENSIONS.md`, `AGENT-TEMPLATES.md`. Update the directory tree diagram. |
| Section 3, Step 2 | Add new config fields to the options table: `dimensionsFile`, `templatesFile`, `qualityGates.enabled`, `qualityGates.autoFixAttempts`, `models.gateFix`, `claudeFlags` |
| Section 4 (Running Pipeline) | Add after Phase 3 (Agents) description: a new subsection "Quality Gates" explaining what happens between batch groups: "After certain batch groups complete, the orchestrator runs quality checks (lint, build, test). If a check fails, it attempts an automatic fix. If that also fails, the pipeline pauses with instructions on how to proceed." |
| Section 5 (Individual Phases) | Add `--skip-gate --confirm` to the commands list. Update `--dry-run` to mention it shows gate checkpoints. |
| Section 6 (Reusing) | Add: "V4 automatically detects your project type (Web, CLI, Library, Mobile, Backend, Service) and activates the relevant scan dimensions. Up to 24 dimensions are available." |
| Section 8 (Troubleshooting) | Add new entry: "Quality gate failed" → "Check `.orchestrator/logs/gate-N.log` for the full error. Fix the issue manually, then `node orchestrator.mjs resume`. Or skip with `node orchestrator.mjs resume --skip-gate --confirm`." |
| Section 9 (Output) | Add PRODUCT-ROADMAP.md and FINAL-REPORT.md to the output files list. Mention role distribution in summary. |
| Section 10 (Cheat Sheet) | Add line 5.5: `If gate pauses: node orchestrator.mjs resume (or --skip-gate --confirm)` |

**DUAL-AUTOMATION-USER-GUIDE.md** — specific edits:

| Edit | Location |
|------|----------|
| Update "The file `DUAL-AUTOMATION-PROMPT.md`" references → `DUAL-AUTOMATION-PROMPT-V4.md` | Throughout |
| Add note in "What You Need" section: "Three files at project root: `DUAL-AUTOMATION-PROMPT-V4.md`, `SCAN-DIMENSIONS.md`, `AGENT-TEMPLATES.md`" | Section "What You Need Before Starting" |
| Add to Glossary: `Quality Gate`, `Project Type`, `Confidence Score`, `Role Hierarchy` | Glossary section |
| Update "24 dimensions" reference in Cheat Sheet overview | Cheat Sheet |

**Verify**: 
```bash
# No V3 references remain in guides (except version history/comparison)
grep -n "DUAL-AUTOMATION-PROMPT-V3" ORCHESTRATOR-USER-GUIDE.md | grep -v "history\|evolved\|previous\|backup"
# Expected: 0 matches

# New features mentioned
grep -c "quality gate\|Quality Gate\|SCAN-DIMENSIONS\|AGENT-TEMPLATES\|skip-gate" ORCHESTRATOR-USER-GUIDE.md
# Expected: 5+ matches

# 3 files mentioned in setup
grep "SCAN-DIMENSIONS\|AGENT-TEMPLATES" ORCHESTRATOR-USER-GUIDE.md | head -3
# Expected: Both files mentioned in setup section
```

**Commit**: `git add -A && git commit -m "V4 task-9 complete: user guides updated with V4 features"`

---

### Task 10: Windows Compatibility Pass

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-10 (windows)"`

The development environment is Windows (`C:\Users\barakm`, MINGW64/PowerShell). Verify ALL V4 changes (Tasks 2–9) work:

**Check 1 — File paths**: All new file references use `path.join()`, never string concatenation with `/`:
```bash
# Find potential raw path concatenation in modified code
grep -n "'/\|+ '/\|+ \"/" orchestrator.mjs | grep -v "path.join\|http\|url\|require\|\/\/"
# Expected: 0 risky matches
```

**Check 2 — CRLF normalization**: When parsing SCAN-DIMENSIONS.md and AGENT-TEMPLATES.md content (in file existence checks and dry-run line counting):
```javascript
// Anywhere we read these files for parsing, normalize line endings
const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
```

**Check 3 — Quality gate commands**: Run with `{ shell: true }` for Windows:
```javascript
// In gate command execution
const result = childProcess.spawnSync(command, [], { 
  shell: true, 
  cwd: projectRoot,
  encoding: 'utf8',
  timeout: config.timeoutMs
});
```

**Check 4 — Process cleanup**: Gate auto-fix uses proper Windows process termination:
```javascript
// If we need to kill a hung auto-fix session
if (process.platform === 'win32') {
  childProcess.spawnSync('taskkill', ['/T', '/F', '/PID', pid.toString()]);
} else {
  process.kill(-pid, 'SIGTERM');
}
```

**Check 5 — Flag handling**: Verify `--skip-gate` and `--confirm` work in both PowerShell and MINGW64:
```bash
# PowerShell
node orchestrator.mjs resume --skip-gate --confirm

# MINGW64
node orchestrator.mjs resume --skip-gate --confirm
```
Both should parse flags correctly (Node.js `process.argv` handles this natively).

**Check 6 — Console colors**: Verify role colors render in Windows Terminal:
```bash
node -e "
const colors = {
  green: '\x1b[32m', cyan: '\x1b[36m', red: '\x1b[31m',
  yellow: '\x1b[33m', magenta: '\x1b[35m', blue: '\x1b[34m',
  bold_green: '\x1b[1;32m', reset: '\x1b[0m'
};
Object.entries(colors).forEach(([name, code]) => {
  console.log(code + 'Testing: ' + name + colors.reset);
});
"
# Expected: Each line in its color (Windows Terminal supports ANSI since Win10 1607)
```

**Verify**:
```bash
node orchestrator.mjs run --dry-run   # No path errors on Windows
node orchestrator.mjs status          # Colors render correctly
```

**Commit**: `git add -A && git commit -m "V4 task-10 complete: Windows compatibility verified"`

---

### Task 11: Full Verification Suite

**Checkpoint**: `git add -A && git commit -m "checkpoint: before task-11 (verification)"`

Run ALL 11 tests. Every test must pass before V4 ships.

```
Test 1 — claudeFlags validity:
  Action: Run `claude -p "echo hello"` with each flag in claudeFlags
  Expected: Either works or orchestrator falls back gracefully with env var suggestion
  Pass criteria: No crash. Clear fallback message if flags unsupported.

Test 2 — Prompt extraction with prepend:
  Action: node -e to extract Scanner prompt from V4, verify SCAN-DIMENSIONS.md prepend present
  Action: node -e to extract Builder prompt from V4, verify AGENT-TEMPLATES.md reference present
  Pass criteria: Both prepend strings found in extracted text

Test 3 — Dry run:
  Action: node orchestrator.mjs run --dry-run
  Pass criteria: Shows all phases, gate checkpoints between batches, file requirements, no errors

Test 4 — Backward compatibility:
  Action: Temporarily strip V4-only fields from config, run dry-run
  Pass criteria: Works with all defaults, logs "Config upgraded with V4 defaults"

Test 5 — Status dashboard with roles:
  Action: Create mock .agents/ with 3 folders, each AGENT.md with different [ROLE_TYPE]
  Action: Run node orchestrator.mjs status
  Pass criteria: Each agent shows correct color and role name. No crashes.
  Cleanup: Remove mock .agents/

Test 6 — File existence check:
  Action: Temporarily rename SCAN-DIMENSIONS.md
  Action: Run node orchestrator.mjs run --dry-run
  Pass criteria: Clear error message about missing file, not a stack trace crash
  Cleanup: Rename back

Test 7 — Gate resume (simulated):
  Action: Write mock state.json with FAILED gate for batch 3
  Action: Run node orchestrator.mjs resume --dry-run
  Pass criteria: Shows "Re-running failed gate..."
  Cleanup: Remove mock state

Test 8 — Skip gate:
  Action: Write mock state.json with FAILED gate
  Action: Run node orchestrator.mjs resume --skip-gate (without --confirm)
  Pass criteria: Shows error requiring --confirm flag
  Action: Run node orchestrator.mjs resume --skip-gate --confirm
  Pass criteria: Logs warning about skipped gate, continues
  Cleanup: Remove mock state

Test 9 — V3.1 feature preservation (run Task 7 checks again):
  Pass criteria: All 11 grep checks pass

Test 10 — Windows path safety:
  Action: grep for raw '/' path concatenation in modified orchestrator code
  Pass criteria: No risky matches

Test 11 — Git safety net:
  Action: git tag -l | grep v3.1-backup
  Pass criteria: Tag exists
  Action: git log --oneline -15
  Pass criteria: Shows task checkpoint commits in order
```

**After all 11 tests pass**, make final updates:

1. Update Mechanics Guide in `DUAL-AUTOMATION-PROMPT-V4.md`:
   - Mechanic 11 (Orchestrator Sync) → document: 3-file extraction with prepend, quality gates with auto-fix/resume/skip, 10 role colors in dashboard, 9 batch tiers, project type display
   - Verify Mechanic 7 (Quality Gates) version reference says V4
   - Verify Mechanic 8 (Safety Gates) says "7 Layers" and lists batch quality gates

2. Final commit:
```bash
git add -A && git commit -m "V4 task-11 complete: all 11 verification tests passed"
git tag v4.0-release -m "V4 complete: orchestrator synced with V3.1 prompt system"
```

---

## CRITICAL RULES

1. **AUDIT FIRST** (Task 0) — Verify file state AND create git tag before ANY changes.
2. **CHECKPOINT EVERY TASK** — `git commit` before AND after each task. This is non-negotiable.
3. **V3.1 IS THE BASE** — Never downgrade. If V3.1 features are missing after your changes, you have a regression. Task 7 catches this.
4. **SURGICAL EDITS** — Do not rewrite orchestrator.mjs from scratch. Find the specific functions, make targeted changes.
5. **BACKWARD COMPATIBLE** — Old configs must work. New fields have defaults. Log upgrade notices.
6. **WINDOWS SAFE** — `path.join()`, CRLF handling, `shell: true`, `taskkill`, ANSI colors.
7. **PLAN → APPROVE → IMPLEMENT** — Task 0 produces audit + plan. STOP. Wait for approval. Then Tasks 1–11.
8. **TEST AFTER EACH TASK** — Each task has a verify step. Run it before committing and proceeding.
9. **PRESERVE WORKING CODE** — If something in orchestrator.mjs works, don't touch it unless V4 specifically requires a change.
10. **ROLLBACK IS ALWAYS AVAILABLE** — `git checkout v3.1-backup` at any point restores pre-V4 state. `git checkout HEAD -- {{file}}` restores a single file from last checkpoint.

---

## EXPECTED OUTCOME

After all 12 tasks (0–11):

| Metric | Value |
|--------|-------|
| Files modified | `orchestrator.mjs`, `orchestrator.config.json`, `ORCHESTRATOR-USER-GUIDE.md`, `DUAL-AUTOMATION-USER-GUIDE.md` |
| Files created | `DUAL-AUTOMATION-PROMPT-V4.md`, `V4-BASELINE-AUDIT.md`, `V4-IMPLEMENTATION-PLAN.md` |
| Files unchanged | `SCAN-DIMENSIONS.md`, `AGENT-TEMPLATES.md` (verified by Task 7 + Task 11 Test 9) |
| Files preserved | `DUAL-AUTOMATION-PROMPT-V3.md` / `V3_1.md` (kept as backup) |
| Git tags | `v3.1-backup` (rollback point), `v4.0-release` (final state) |
| Git checkpoints | 12 task commits + 12 pre-task checkpoints = 24 commits |
| Tests passed | 11/11 |
| V3.1 features preserved | All 11 checks passed (Task 7 + Task 11 Test 9) |
| Quality gates | Functional with auto-fix, resume, skip, state persistence |
| Backward compatible | Yes — V1/V2/V3 configs work with logged defaults |
| Windows tested | Yes — paths, CRLF, shell, colors, flags |
| Ready for production | Yes — `node orchestrator.mjs run` on any project |

**After completion, output**:
```
V4 IMPLEMENTATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━
  Baseline:     V3.1 (verified, preserved, git-tagged)
  Orchestrator: synced with 3-file architecture
  Quality gates: auto-fix / resume / skip-gate --confirm
  Roles:        10 types with colored dashboard
  Batches:      9 tiers with gate boundaries
  Project types: 6 types auto-detected (Web/CLI/Library/Mobile/Backend/Service)
  Dimensions:   24 (19 conditional + 4 mandatory + Product Growth)
  Config:       backward compatible V1→V4
  Windows:      tested (path.join, CRLF, shell:true, ANSI colors)
  Safety:       7 layers + git tags + per-task checkpoints
  V3.1 checks:  11/11 passed
  Tests:        11/11 passed
  Git tags:     v3.1-backup → v4.0-release
  
  Next step:    node orchestrator.mjs run --dry-run
```

Then STOP and wait for the user to run the production dry-run test.

---

## ISSUE TRACEABILITY — 25/25 RESOLVED

Every issue raised across the entire V1→V3.1 development history is resolved:

| # | Issue | Origin | Resolution |
|---|-------|--------|-----------|
| 1 | Token efficiency — monolith too large | V2 review | Fixed V3.0 (3-file split). Preserved by Task 1 + Task 7. |
| 2 | Orchestrator sync with new features | V2 review | Tasks 2, 3, 4, 5 — full orchestrator refit |
| 3 | Responsive audit missing modern CSS | V2 review | Fixed V3.0 (container queries, dvh, etc). Preserved by Task 7. |
| 4 | Missing runtime performance dimension | V2 review | Fixed V3.0. Preserved by Task 7. |
| 5 | Builder loads templates too early | V3.0 review | Fixed V3.1 (lazy loading). Preserved by Task 7 check #7. |
| 6 | E2E test gap not detected | V3.0 review | Fixed V3.1 (E2E Coverage Gate). Preserved by Task 7 check #4. |
| 7 | Web bias — no CLI/Library/Mobile dims | V3.0 review | Fixed V3.1 (3 new dims + project types). Preserved by Task 7 checks #1, #3. |
| 8 | Orchestrator still V1 architecture | V3.0 review | Tasks 2–6 — complete V4 orchestrator upgrade |
| 9 | Orchestrator doesn't know about 3 files | V3.1 review | Task 2 — prepend + existence checks + config |
| 10 | Quality gates not in orchestrator | V3.1 review | Task 3 — full gate implementation with state |
| 11 | Role colors not in dashboard | V3.1 review | Task 4a — 10 roles with ANSI colors |
| 12 | 9 batches not supported | V3.1 review | Task 4b — dynamic batch count |
| 13 | Summary doesn't show roles/gates/roadmap | V3.1 review | Task 5 — enhanced summary format |
| 14 | User guides outdated | V3.1 review | Task 9 — targeted guide updates |
| 15 | Windows compatibility unverified | V3.1 review | Task 10 — 6 Windows-specific checks |
| 16 | V4.0 plan didn't know about V3.1 | V4.0 audit | Task 0 — mandatory baseline audit |
| 17 | V4.0 tasks duplicated V3.1 work | V4.0 audit | Task 7 — verify-only, no re-implementation |
| 18 | Gate resume after context limit | V4.0 audit | Task 3 — explicit context limit handling in auto-fix |
| 19 | Scanner resumption reloads full dims | V4.0 audit | Task 2 — selective reload prepend |
| 20 | claudeFlags validity unverified | V4.0 audit | Task 8 — runtime validation with env var fallback |
| 21 | Builder doesn't know about gates | V4.0 audit | Already in V3.1 (Step 1.3). Preserved by Task 7 check #6. |
| 22 | Does Task 0 prevent regressions? | V4.1 audit | Task 0 (baseline) + Task 7 (11 checks) + Task 11 Test 9 |
| 23 | Partial task failure recovery | V4.1 audit | Per-task git checkpoints. Rollback: `git checkout HEAD -- file` |
| 24 | Full rollback strategy | V4.1 audit | `git tag v3.1-backup` in Task 0. Rollback: `git checkout v3.1-backup` |
| 25 | SCAN-DIMENSIONS.md must not be modified | V4.1 audit | Task 1 rule + Task 7 check #10 + Task 11 Test 9 |

---

# End of V4 MASTER PLAN
