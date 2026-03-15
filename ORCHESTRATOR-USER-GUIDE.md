# Super Orchestrator — User Guide

> A step-by-step guide for running the Dual-Automation pipeline with a single command.

---

## 1. What This System Does

The Super Orchestrator (`orchestrator.mjs`) automates the entire codebase audit-and-fix pipeline. Without it, you have to manually copy prompts between Claude sessions, watch for completion signals, manage batch ordering, and handle context limit restarts — potentially dozens of sessions. The orchestrator replaces all of that with one command: `node orchestrator.mjs run`. It runs the Scanner (finds every issue), the Builder (creates fix plans), the Agents (executes fixes), and Verification (lint, typecheck, build) — all automatically. When it finishes, you get fixed code, git commits per batch, and a summary report.

---

## 2. Prerequisites

You need three things installed before running the orchestrator.

### Node.js (version 18 or higher)

```bash
node --version
```

✅ You should see `v18.x.x` or higher (e.g., `v20.9.0`).

If not installed, download from https://nodejs.org.

### Claude CLI

```bash
claude --version
```

✅ You should see a version number like `1.x.x`.

If not installed, see https://docs.anthropic.com/en/docs/claude-code for installation instructions.

### Claude Subscription

You need one of:
- **Claude Max subscription** — gives you access to `claude -p` (print mode) with usage limits
- **Anthropic API key** — configured via `claude` CLI login

The orchestrator uses `claude -p` (non-interactive print mode) to run each phase. Each phase consumes API credits or subscription usage. A typical full pipeline costs $15–$80 depending on project size.

---

## 3. First-Time Setup (Any Project)

### Step 1: Copy three files to your project root

Place these files in the root directory of the project you want to audit (where your `package.json`, `go.mod`, `Cargo.toml`, etc. lives):

```
your-project/
├── orchestrator.mjs              <-- the orchestrator
├── orchestrator.config.json      <-- configuration (optional but recommended)
├── DUAL-AUTOMATION-PROMPT.md     <-- the automation prompts
├── package.json                  <-- your existing project files
├── src/
└── ...
```

You do not need to install any dependencies. The orchestrator uses only Node.js built-in modules.

### Step 2: Customize the config file

Open `orchestrator.config.json` in any editor. Here is every option explained:

```json
{
  "models": {
    "scanner": "claude-opus-4-6",
    "builder": "claude-opus-4-6",
    "agents": "claude-sonnet-4-6",
    "verification": "claude-sonnet-4-6"
  },
  "budgetPerPhase": 10,
  "budgetTotal": 50,
  "parallelism": 3,
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
  "promptFile": "DUAL-AUTOMATION-PROMPT.md",
  "agentsDir": ".agents"
}
```

**Config options in plain language:**

| Option | What it controls | Default | When to change |
|--------|-----------------|---------|----------------|
| `models.scanner` | Which AI model scans your code | `claude-opus-4-6` | Use Opus for best quality. Use Sonnet for lower cost. |
| `models.builder` | Which model creates fix plans | `claude-opus-4-6` | Same as above. |
| `models.agents` | Which model executes code fixes | `claude-sonnet-4-6` | Sonnet is fast and cheap. Use Opus for harder fixes. |
| `models.verification` | Which model auto-fixes lint/build errors | `claude-sonnet-4-6` | Rarely needs changing. |
| `budgetPerPhase` | Max dollars per phase (per agent session) | `10` | Increase to `15`–`20` for large projects. |
| `budgetTotal` | Total dollar cap for the entire run | `50` | Increase for large codebases with many agents. |
| `parallelism` | How many agents run at the same time | `3` | Lower to `1`–`2` if you hit rate limits. Raise to `5` if you have high API limits. |
| `maxContextRestarts.scanner` | Max times Scanner can restart after context limits | `20` | Increase only for very large codebases (100+ files per feature). |
| `maxContextRestarts.builder` | Max times Builder can restart | `15` | Rarely needs changing. |
| `maxContextRestarts.agent` | Max times a single agent can restart | `10` | Increase for agents with many prompts (6+). |
| `timeoutMs` | Kill a session if no output for this many milliseconds | `600000` (10 min) | Increase if your project has very large files that take a long time to process. |
| `verifyCommands` | Commands to run during the verification phase | lint, typecheck, build | **Change this for your project.** See examples below. |
| `promptFile` | Name of the automation prompt file | `DUAL-AUTOMATION-PROMPT.md` | Only change if you renamed the file. |
| `agentsDir` | Where agent folders are created | `.agents` | Only change if you want a custom name like `.agents-v2`. |

### Step 3: Set the right verify commands for your project

This is the most important config change. Replace `verifyCommands` with whatever commands check your project's health:

**JavaScript / TypeScript:**
```json
"verifyCommands": ["npm run lint", "npx tsc --noEmit", "npm run build"]
```

**Python:**
```json
"verifyCommands": ["ruff check .", "mypy .", "pytest --tb=short"]
```

**Go:**
```json
"verifyCommands": ["golangci-lint run", "go vet ./...", "go build ./..."]
```

**Rust:**
```json
"verifyCommands": ["cargo clippy", "cargo check", "cargo test"]
```

⚠️ If you skip this step, the defaults assume a JavaScript/TypeScript project. Wrong verify commands won't break anything — they'll just fail during verification and the orchestrator will try to auto-fix.

### Step 4: Make sure you have a project rules file (recommended)

The Scanner works better if it can find a file describing your project conventions. It looks for these in order:
1. `CLAUDE.md`
2. `.cursorrules`
3. `.github/copilot-instructions.md`
4. `CONTRIBUTING.md`
5. `README.md`

If you have at least a `README.md`, that's enough. If you have none, the Scanner still works but may produce less targeted results.

---

## 4. Running the Full Pipeline

### The command

```bash
node orchestrator.mjs run
```

That's it. The orchestrator handles everything from here.

### What happens at each phase

**Phase 1 — Scanner** (typically 2–10 minutes, 1–5 sessions)

The Scanner reads your entire codebase without modifying anything. It detects your tech stack, identifies every feature area, and writes a detailed report for each one. Reports go into `scanner-reports/`. If the Scanner hits Claude's context limit, it saves progress and the orchestrator automatically starts a new session. You will see log lines like:

```
[INFO] Scanner session 1/20...
[WARN] Context limit reached in session 1 — will re-invoke
[INFO] Scanner session 2/20...
[OK]   Scanner emitted SCANNER_COMPLETE
[OK]   Scanner complete. 16 features scanned.
```

**Phase 2 — Builder** (typically 1–5 minutes, 1–3 sessions)

The Builder reads the Scanner's reports and creates a set of agent folders — each one is a focused fix plan for a specific part of your codebase. It groups agents into batches (some sequential, some parallel) and writes bootstrap prompts. Output goes into `.agents/`. You will see:

```
[INFO] Builder session 1/15...
[OK]   Builder emitted BUILDER_COMPLETE
[OK]   Builder complete. 18/18 agent folders valid.
```

**Phase 3 — Agents** (typically 15–60 minutes, 5–20+ sessions)

This is the longest phase. The orchestrator runs each agent by batch order. Sequential batches run one agent at a time. Parallel batches run up to `parallelism` agents simultaneously. Each agent reads its instructions, fixes the code, and updates its progress. You will see:

```
--- Batch 1 (sequential): 4 agents ---
[INFO] Agent 21 (Auth): session 1/10...
[OK]   Agent 21 (Auth): COMPLETE (session 2, 185s)
[INFO] Agent 22 (Settings): session 1/10...
...
--- Batch 2 (parallel): 4 agents ---
[INFO] Running 3 agents in parallel...
[OK]   Agent 26 (Forms): COMPLETE (session 1, 92s)
[OK]   Agent 27 (Waitlists): COMPLETE (session 1, 78s)
...
```

After each batch, the orchestrator automatically creates a git commit with all changes from that batch.

**Phase 4 — Verification** (typically 1–3 minutes)

The orchestrator runs each command from `verifyCommands`. If a command fails (e.g., lint errors), it uses Claude to auto-fix the issues and reruns the check. You will see:

```
[INFO] Running: npm run lint
[OK]   lint: PASS
[INFO] Running: npx tsc --noEmit
[WARN] tsc: FAIL — attempting auto-fix...
[OK]   tsc: PASS (after auto-fix)
```

### Final output

When everything is done, you see a completion summary:

```
════════════════════════════════════════════════════════════
  PIPELINE COMPLETE
════════════════════════════════════════════════════════════

  Duration:     52m 18s
  Sessions:     14 total (2 scanner, 1 builder, 11 agents)
  Agents:       18/18 complete

  Verification:
    npm run lint: PASS
    npx tsc --noEmit: PASS
    npm run build: PASS

  Full report:  .orchestrator/logs/summary.md
  Review:       git log --oneline -10
```

Your terminal will also beep to notify you.

### How long does it take?

| Project size | Estimated time | Estimated sessions | Estimated cost |
|-------------|---------------|-------------------|---------------|
| Small (10–30 files) | 10–20 min | 3–6 | $5–$15 |
| Medium (30–100 files) | 20–50 min | 6–15 | $15–$40 |
| Large (100–300 files) | 40–90 min | 10–25 | $30–$80 |

💡 These are rough estimates. Actual time depends on your project's complexity, the number of issues found, and API response speed.

---

## 5. Useful Commands Reference

### Core commands

| Command | What it does |
|---------|-------------|
| `node orchestrator.mjs run` | Run the full pipeline from start to finish |
| `node orchestrator.mjs run --dry-run` | Show the execution plan without doing anything |
| `node orchestrator.mjs resume` | Pick up where you left off after an interruption |
| `node orchestrator.mjs status` | Show a dashboard of current progress |

### Individual phase commands

| Command | What it does |
|---------|-------------|
| `node orchestrator.mjs scan` | Run only the Scanner phase |
| `node orchestrator.mjs build` | Run only the Builder phase (Scanner must be done) |
| `node orchestrator.mjs agents` | Run only the Agents phase (Scanner + Builder must be done) |
| `node orchestrator.mjs verify` | Run only the Verification phase |

### CLI flags

Every flag is optional. They override the values in `orchestrator.config.json`.

| Flag | What it does | Example |
|------|-------------|---------|
| `--budget <usd>` | Set the dollar budget per phase/agent session (default: 10) | `--budget 15` |
| `--budget-total <usd>` | Set the total dollar cap for the entire run (default: 50) | `--budget-total 80` |
| `--parallelism <n>` | Max agents to run at the same time (default: 3) | `--parallelism 5` |
| `--model <name>` | Use this model for all phases. Accepts `opus`, `sonnet`, or a full model ID | `--model opus` |
| `--dry-run` | Print what would happen without actually running anything | |
| `--verbose` | Show the full output from Claude (useful for debugging) | |
| `--no-verify` | Skip the verification phase entirely | |
| `--timeout <ms>` | Kill a session if no output for this many milliseconds (default: 600000) | `--timeout 900000` |
| `--agents-dir <path>` | Use a different agents directory (default: `.agents`) | `--agents-dir .agents-v2` |
| `--config <path>` | Use a different config file | `--config my-config.json` |

### Examples with flags

```bash
# Full pipeline with higher budget and more parallelism
node orchestrator.mjs run --budget 20 --parallelism 5

# Use Opus for everything (higher quality, higher cost)
node orchestrator.mjs run --model opus

# Just run agents from a specific directory
node orchestrator.mjs agents --agents-dir .agents-phase-7

# Preview what would happen
node orchestrator.mjs run --dry-run
```

---

## 6. Reusing on the Same Project

### When to rerun

- After adding new features that haven't been audited
- After manually changing code that agents previously fixed
- As periodic maintenance (monthly or quarterly)

### What happens when you rerun

If a `.agents/` directory already exists from a previous run, the orchestrator moves it to a timestamped backup:

```
.agents/  →  .agents-backup-2026-03-14T19-38-00/
```

Then it starts fresh: new scan, new builder output, new agents.

### How the system detects completed work

The orchestrator checks file state before running each phase:

- **Scanner**: If `scanner-reports/MASTER-BRIEF.md` exists and `SCAN-QUEUE.md` shows all features as `READY`, the Scanner is skipped.
- **Builder**: If `.agents/MASTER-CONTEXT.md` shows status `COMPLETE` and a `COMMANDS.md` file exists, the Builder is skipped.
- **Each agent**: If an agent's `PROGRESS.md` shows all prompts as `COMPLETE` (or `HANDOFF.md` shows status `COMPLETE`), that agent is skipped.

This means you can safely rerun and it will only do work that hasn't been done yet.

### Targeted reruns

```bash
# Just re-scan (if you changed code since last scan)
# Delete scanner-reports/ first to force a fresh scan
node orchestrator.mjs scan

# Just rebuild agents (if you want different agent structure)
# Delete .agents/ first to force a fresh build
node orchestrator.mjs build

# Just run agents (scan and build are already done)
node orchestrator.mjs agents

# Just verify (after manually fixing something)
node orchestrator.mjs verify
```

💡 To force a completely fresh run, delete `scanner-reports/`, `SCAN-QUEUE.md`, `.agents/`, and `.orchestrator/` before running.

---

## 7. Using on a Different Project

The orchestrator is fully project-agnostic. You do not need to modify `orchestrator.mjs` for different projects.

### Step-by-step: Moving from Project A to Project B

```bash
# 1. Copy the three files to your new project
cp /path/to/projectA/orchestrator.mjs /path/to/projectB/
cp /path/to/projectA/orchestrator.config.json /path/to/projectB/
cp /path/to/projectA/DUAL-AUTOMATION-PROMPT.md /path/to/projectB/

# 2. Navigate to the new project
cd /path/to/projectB

# 3. Edit orchestrator.config.json (change verifyCommands for the new stack)

# 4. Run
node orchestrator.mjs run
```

No changes to `orchestrator.mjs` are needed. It works with any language, framework, or project structure.

### Config changes for different stacks

The only config you typically need to change is `verifyCommands`:

| Stack | verifyCommands |
|-------|---------------|
| React / Next.js | `["npm run lint", "npx tsc --noEmit", "npm run build"]` |
| Python / Django | `["ruff check .", "mypy .", "pytest --tb=short"]` |
| Go | `["golangci-lint run", "go vet ./...", "go build ./..."]` |
| Rust | `["cargo clippy -- -D warnings", "cargo check", "cargo test"]` |

💡 Everything else works with defaults across any project.

---

## 8. What to Do When Something Goes Wrong

### The orchestrator stopped mid-run (Ctrl+C, crash, terminal closed)

The orchestrator saves its state automatically. Just resume:

```bash
node orchestrator.mjs resume
```

It reads `.orchestrator/state.json` and the pipeline's own state files to figure out where to continue. No work is lost.

### An agent failed after multiple retries

1. Check the agent's log file:

```bash
# Look at the most recent session log for that agent
cat .orchestrator/logs/agent-21-session-1.log
```

2. Check the agent's progress:

```bash
cat .agents/feature-00-admin-role/PROGRESS.md
```

3. Try running just the agents phase again:

```bash
node orchestrator.mjs agents
```

The orchestrator will skip completed agents and retry failed ones.

### Verification failed (lint or build errors that couldn't be auto-fixed

1. Check what failed:

```bash
cat .orchestrator/logs/verification.log
```

2. Fix the errors manually, then re-verify:

```bash
node orchestrator.mjs verify
```

3. Or skip verification and review the changes yourself:

```bash
node orchestrator.mjs run --no-verify
```

### "claude: command not found"

The Claude CLI is not installed or not in your PATH. Install it:

```bash
# Check if it's installed somewhere
which claude
```

If not found, install from https://docs.anthropic.com/en/docs/claude-code.

### "Could not find ---START SCANNER--- markers"

The `DUAL-AUTOMATION-PROMPT.md` file is missing or corrupted. Make sure it exists in your project root and contains the `---START SCANNER---` and `---END SCANNER---` markers.

### Context limit warnings

```
[WARN] Context limit reached in session 2 — will re-invoke
```

This is normal. It means Claude's conversation memory filled up. The orchestrator automatically starts a new session and the pipeline resumes from where it stopped. No action needed.

### Rate limit errors

```
[WARN] Rate limit hit — backing off 30s
```

This means you're sending too many requests. The orchestrator automatically:
1. Waits with increasing backoff (10s, 30s, 60s, 120s...)
2. Reduces parallelism if the problem persists

If rate limits are frequent, lower your parallelism:

```bash
node orchestrator.mjs resume --parallelism 1
```

### Watchdog timeout (no output for 10 minutes)

```
[WARN] Watchdog: no output for 600s — killing process
```

This means a Claude session stopped producing output. The orchestrator kills it and retries. If this happens repeatedly, try increasing the timeout:

```bash
node orchestrator.mjs resume --timeout 900000
```

---

## 9. Understanding the Output

### Where to find the summary report

After the pipeline finishes, the full report is at:

```
.orchestrator/logs/summary.md
```

It contains:
- Total duration, session count, and phase breakdown
- Status of every agent (complete or failed, how many sessions each took)
- Verification results (pass/fail for each command)

### How to review what changed

```bash
# See all commits the orchestrator made (one per batch)
git log --oneline -10

# See the full diff of everything that changed
git diff HEAD~5

# See what a specific batch changed
git show HEAD~2
```

Each commit message follows the format:
```
[orchestrator] batch-1 complete (4 agents)
```

### What P0, P1, P2 mean

The Scanner classifies every issue it finds into priority levels:

| Priority | Meaning | Example |
|----------|---------|---------|
| **P0** (Critical) | Blocks a core user flow. Must be fixed. | Login page crashes. Database query returns wrong data. |
| **P1** (High) | Feature partially broken or has a significant gap. | Form validation missing. Error messages not shown. |
| **P2** (Medium) | Cosmetic or non-blocking. Nice to fix. | Console warnings. Missing loading states. Inconsistent styling. |

The `scanner-reports/MASTER-BRIEF.md` file shows the count of each priority level. The `GAP-ANALYSIS.md` file in the agents directory maps every issue to the agent responsible for fixing it.

### Per-session logs

Every Claude session is logged individually:

```
.orchestrator/logs/
├── orchestrator.log          # Full orchestrator log (timestamped)
├── scanner-session-1.log     # Raw Claude output from scanner session 1
├── scanner-session-2.log     # Raw Claude output from scanner session 2
├── builder-session-1.log     # Raw Claude output from builder
├── agent-21-session-1.log    # Raw Claude output from agent 21, session 1
├── agent-21-session-2.log    # If agent 21 needed a restart
├── verification.log          # Verification command outputs
└── summary.md                # Human-readable final report
```

---

## 10. Cheat Sheet

```
 1.  Copy orchestrator.mjs + orchestrator.config.json + DUAL-AUTOMATION-PROMPT.md to project root
 2.  Edit orchestrator.config.json — set verifyCommands for your stack
 3.  node orchestrator.mjs run --dry-run        ← preview the plan
 4.  node orchestrator.mjs run                  ← run the full pipeline
 5.  ... wait (typically 20-60 minutes) ...
 6.  node orchestrator.mjs status               ← check progress anytime
 7.  If interrupted: node orchestrator.mjs resume
 8.  Review: git log --oneline -10 && git diff HEAD~5
 9.  Read: .orchestrator/logs/summary.md
10.  Done. Your code is audited and fixed.
```
