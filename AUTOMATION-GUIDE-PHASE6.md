# FormForge Phase 6 — Automation Guide

> **One command. Five agents. 25 prompts. Zero manual intervention.**
> Estimated runtime: 2–3 hours.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Setup](#2-setup)
3. [Running the Automation](#3-running-the-automation)
4. [How It Works Inside](#4-how-it-works-inside)
5. [The Two Signals](#5-the-two-signals)
6. [Context Restart Mechanism](#6-context-restart-mechanism)
7. [Monitoring While Running](#7-monitoring-while-running)
8. [Error Handling](#8-error-handling)
9. [Resuming After Interruption](#9-resuming-after-interruption)
10. [i18n Sweep](#10-i18n-sweep)
11. [Timeline Estimate](#11-timeline-estimate)
12. [Command Reference](#12-command-reference)

---

## 1. Prerequisites

Before running the automation, confirm ALL of the following:

**Software installed:**
- Node.js 20+ and npm
- Git (with push access to the repo)
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
- Verify: `claude --version`

**Project state:**
- You are in the FormForge project root (`forge-your-forms/`)
- `CLAUDE.md` exists in the root
- `npm install` has been run (node_modules exists)
- The project builds cleanly: `npm run build`
- Git is clean: `git status` shows no uncommitted changes

**Agent files extracted:**
- `.agents-phase-6/` folder exists with 5 agent subfolders
- Each subfolder has: AGENT.md, PROMPTS.md, PROGRESS.md, HANDOFF.md
- `.agents-phase-6/SYNC-LOG.md` exists

**For the i18n sweep (optional):**
- `.agents/agent-5-i18n/` folder exists (from Phase 1)

**Verify everything:**
```bash
claude --version
node --version
npm --version
git status
ls .agents-phase-6/
./run-agents-phase6.sh --status
```

---

## 2. Setup

**Step 1:** Place the script in the project root:
```bash
# If downloaded as a file:
cp run-agents-phase6.sh /path/to/forge-your-forms/
cd /path/to/forge-your-forms/

# Make it executable
chmod +x run-agents-phase6.sh
```

**Step 2:** Extract agent files (if not already done):
```bash
tar xzf agents-phase-6-kit.tar.gz
mv .agents-phase-6/* .agents-phase-6/ 2>/dev/null || true
```

**Step 3:** Verify setup:
```bash
./run-agents-phase6.sh --status
```

You should see a table with 5 agents, all showing "NOT STARTED".

---

## 3. Running the Automation

### Run everything (recommended):
```bash
./run-agents-phase6.sh
```

This runs Agents 16 → 17 → 18 → 19 → 20 → i18n sweep → build → push.
Takes approximately 2–3 hours. You can walk away.

### Run a single agent:
```bash
./run-agents-phase6.sh --agent 17
```

### Resume after interruption:
```bash
./run-agents-phase6.sh --resume
```

### Check progress:
```bash
./run-agents-phase6.sh --status
```

### Start fresh:
```bash
./run-agents-phase6.sh --reset
```

---

## 4. How It Works Inside

Here is the complete execution flow:

```
┌─────────────────────────────────────────────────────────────┐
│                  run-agents-phase6.sh                        │
│                                                              │
│  ┌──────────────────┐                                        │
│  │ Check prereqs     │ claude, git, npm, CLAUDE.md           │
│  └────────┬─────────┘                                        │
│           ▼                                                  │
│  ┌──────────────────┐                                        │
│  │ Init state.json   │ .automation-phase6/state.json         │
│  └────────┬─────────┘                                        │
│           ▼                                                  │
│  ╔══════════════════╗  For each agent 16→17→18→19→20:        │
│  ║  AGENT LOOP      ║                                        │
│  ║                  ║                                        │
│  ║  ┌────────────┐  ║  1. Check if already COMPLETE → skip   │
│  ║  │ Build msg  │  ║  2. Build bootstrap message             │
│  ║  └─────┬──────┘  ║  3. Send to: claude -p "..." --output  │
│  ║        ▼         ║                                        │
│  ║  ┌────────────┐  ║  4. Wait for Claude to finish          │
│  ║  │ Run Claude │  ║     (10–30 min per agent)              │
│  ║  └─────┬──────┘  ║                                        │
│  ║        ▼         ║  5. Grep output for signal:            │
│  ║  ┌────────────┐  ║     AGENT_COMPLETE → verify → commit   │
│  ║  │ Check      │  ║     CONTEXT_LIMIT → commit → resume    │
│  ║  │ signals    │  ║     No signal → check PROGRESS.md      │
│  ║  └─────┬──────┘  ║                                        │
│  ║        ▼         ║  6. Run npm run lint + tsc --noEmit     │
│  ║  ┌────────────┐  ║     Pass → git commit → next agent     │
│  ║  │ Verify &   │  ║     Fail → auto-fix (up to 2x)        │
│  ║  │ commit     │  ║     Still fail → STOP                  │
│  ║  └────────────┘  ║                                        │
│  ╚══════════════════╝                                        │
│           ▼                                                  │
│  ┌──────────────────┐                                        │
│  │ i18n sweep        │ Agent 5 scans Phase 6 new files       │
│  └────────┬─────────┘                                        │
│           ▼                                                  │
│  ┌──────────────────┐                                        │
│  │ npm run build     │ Production build                      │
│  └────────┬─────────┘                                        │
│           ▼                                                  │
│  ┌──────────────────┐                                        │
│  │ git push          │ Deploy to Vercel                      │
│  └────────┬─────────┘                                        │
│           ▼                                                  │
│  🚀 PRODUCTION LAUNCH READY                                  │
└─────────────────────────────────────────────────────────────┘
```

### The Core Command

Every agent interaction uses this single CLI command:

```bash
claude -p "<bootstrap_message>" --dangerously-skip-permissions --output-format text
```

Where:
- `-p` = print mode (non-interactive: sends prompt, Claude works, exits)
- `--dangerously-skip-permissions` = auto-approve all file operations
- `--output-format text` = plain text output (script can grep it)

The bootstrap message tells Claude:
1. Which files to read (CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md)
2. Run ALL prompts without stopping
3. Say `AGENT_COMPLETE` when done
4. Say `CONTEXT_LIMIT_REACHED` if running low on context
5. Do NOT run git commands (handled externally)

---

## 5. The Two Signals

The entire automation hinges on two text signals that Claude outputs:

### Signal 1: `AGENT_COMPLETE`

**Meaning:** Claude finished ALL prompts for this agent successfully.

**What the script does:**
1. Runs `npm run lint` and `npx tsc --noEmit`
2. If both pass: `git add -A && git commit -m "Agent N: All prompts complete"`
3. Moves to the next agent in the pipeline

### Signal 2: `CONTEXT_LIMIT_REACHED`

**Meaning:** Claude's context window is getting full. It has written its current state to HANDOFF.md and stopped.

**What the script does:**
1. `git add -A && git commit -m "Agent N: Partial work (session X, context limit)"`
2. Builds a RESUME message that includes PROGRESS.md
3. Starts a fresh `claude -p "..."` session
4. Claude reads HANDOFF.md, picks up where it left off
5. Repeats up to 5 times per agent

### What if neither signal appears?

The script falls back to checking:
1. Does PROGRESS.md contain "COMPLETE"?
2. Are all prompt checkboxes `[x]` in PROMPTS.md?
3. If yes → treat as complete. If no → resume.

---

## 6. Context Restart Mechanism

Claude Code has a finite context window. A single agent with 5 heavy prompts may exceed it. Here's how the script handles this:

```
Session 1:  Claude runs prompts 16.0, 16.1, 16.2 → context full
            Claude writes HANDOFF.md: "Done: 16.0-16.2. Next: 16.3"
            Claude outputs: CONTEXT_LIMIT_REACHED
            Script commits partial work
            
Session 2:  Script sends RESUME message
            Claude reads HANDOFF.md → sees 16.3 is next
            Claude runs 16.3, 16.4 → all done
            Claude outputs: AGENT_COMPLETE
            Script verifies → commits → next agent
```

Each agent gets up to 5 restart sessions. In practice, most agents finish in 1–2 sessions.

---

## 7. Monitoring While Running

### Watch the terminal

The script outputs colored status messages in real-time:
- 🟣 Purple headers = new agent starting
- 🔵 Blue arrows = steps being executed
- 🟢 Green checks = success
- 🟡 Yellow warnings = non-critical issues
- 🔴 Red X = errors (script may stop)

### Watch the log file

In another terminal:
```bash
tail -f .automation-phase6/runner.log
```

### Check agent-specific output

Each Claude session is logged separately:
```bash
# See what Claude did in Agent 17, Session 1:
cat .automation-phase6/agent_17_session_1.log

# See the current message being sent:
cat .automation-phase6/current_message.txt
```

### Check progress mid-run

```bash
./run-agents-phase6.sh --status
```

### Check git commits:
```bash
git log --oneline -20
```

---

## 8. Error Handling

### Scenario: Lint or TypeScript errors after an agent

**What happens automatically:**
1. Script detects errors from `npm run lint` or `npx tsc --noEmit`
2. Sends an auto-fix prompt to Claude: "Read the errors and fix them"
3. Re-runs verification
4. Retries up to 2 times
5. If still failing: stops the pipeline with an error message

**What you do:**
```bash
# Check what's wrong:
npm run lint
npx tsc --noEmit

# Fix manually, then resume:
git add -A && git commit -m "Manual fix"
./run-agents-phase6.sh --resume
```

### Scenario: Agent fails to complete after 5 sessions

**What happens:** Script stops with an error.

**What you do:**
1. Check the logs: `cat .automation-phase6/agent_N_session_5.log`
2. Check HANDOFF.md: `cat .agents-phase-6/agent-N-name/HANDOFF.md`
3. Run the agent manually if needed:
   ```bash
   claude --dangerously-skip-permissions
   # Then paste the bootstrap message from PHASE-6-COMMANDS.md
   ```
4. After fixing: `./run-agents-phase6.sh --resume`

### Scenario: Machine goes to sleep / network drops

**What happens:** The `claude -p` command may fail or hang.

**What you do:**
```bash
# Kill any hanging process
# Then resume:
./run-agents-phase6.sh --resume
```

The resume flag checks which agents are already complete and skips them.

### Scenario: Git push fails

**What happens:** Everything is committed locally. Only the push failed.

**What you do:**
```bash
git push origin main
```

---

## 9. Resuming After Interruption

The `--resume` flag is your safety net. It:

1. Reads `.automation-phase6/state.json` to find where it stopped
2. Checks each agent's PROGRESS.md for "COMPLETE" status
3. Skips all completed agents
4. Starts the next incomplete agent from where it left off (using HANDOFF.md)
5. Continues through the rest of the pipeline

```bash
# Always safe to run:
./run-agents-phase6.sh --resume
```

If you want to restart a specific agent from scratch:
```bash
# Reset that agent's progress:
echo "# Progress Log\n\n## Status: NOT STARTED\n\n---\n" > .agents-phase-6/agent-17-edge-security/PROGRESS.md
echo "# Handoff\n\nNone — first session." > .agents-phase-6/agent-17-edge-security/HANDOFF.md

# Then run just that agent:
./run-agents-phase6.sh --agent 17
```

---

## 10. i18n Sweep

After ALL feature agents (16–20) complete, the script automatically runs Agent 5 (i18n) with a Phase 6-specific message.

**What Agent 5 does:**
- Scans new pages created by Agents 19-20 (Privacy.tsx, DataExport.tsx, AccountDeletion.tsx)
- Adds English keys to `en.json` under namespaces: `privacy.*`, `gdpr.*`, `errors.*`, `launch.*`
- Translates all new keys to `he.json` with professional Hebrew
- Replaces hardcoded strings with `t()` calls
- Fixes RTL layout for new components

**Agent 5 files are in:** `.agents/agent-5-i18n/` (the original Phase 1 folder)

**If Agent 5 folder doesn't exist:** The script logs a warning and skips the i18n sweep. You can run it manually later.

---

## 11. Timeline Estimate

Based on the proven mechanism from Phases 2–5:

| Agent | Est. Time | What It Does |
|-------|-----------|-------------|
| Agent 16 | 25–35 min | Supabase audit, RLS fixes, migrations |
| Agent 17 | 20–30 min | Edge function deploy, security hardening |
| Agent 18 | 25–35 min | Test suite creation, coverage report |
| Agent 19 | 25–35 min | CI/CD, monitoring, GDPR, performance |
| Agent 20 | 20–30 min | Launch checklist, Stripe, templates |
| Agent 5 | 10–15 min | i18n sweep for new pages |
| Build + Push | 2–5 min | Production build, deploy |
| **Total** | **~2–3 hours** | |

The pipeline runs unattended. You can check back when it finishes.

---

## 12. Command Reference

| Command | What It Does |
|---------|-------------|
| `./run-agents-phase6.sh` | Run full pipeline (all agents + i18n + build) |
| `./run-agents-phase6.sh --agent 17` | Run only Agent 17 |
| `./run-agents-phase6.sh --resume` | Resume from where it stopped |
| `./run-agents-phase6.sh --status` | Show agent completion table |
| `./run-agents-phase6.sh --reset` | Reset state for fresh start |
| `./run-agents-phase6.sh --help` | Show usage help |

### Log files location:

| File | Purpose |
|------|---------|
| `.automation-phase6/runner.log` | Master log (all output) |
| `.automation-phase6/state.json` | Checkpoint state |
| `.automation-phase6/agent_N_session_M.log` | Per-agent Claude output |
| `.automation-phase6/i18n_phase_6.log` | i18n sweep output |
| `.automation-phase6/current_message.txt` | Last message sent to Claude |
| `.automation-phase6/fix_attempt_N.log` | Auto-fix attempt output |

### Quick start (copy-paste):

```bash
cd /path/to/forge-your-forms
chmod +x run-agents-phase6.sh
./run-agents-phase6.sh --status    # Verify setup
./run-agents-phase6.sh             # Run everything
# ... wait 2-3 hours ...
# 🚀 Production launch ready!
```

---

*Phase 6: 5 agents, 25 prompts, 4 security migrations, 10 edge functions, full test suite, CI/CD pipeline, GDPR compliance, and a launch checklist — all automated.*
