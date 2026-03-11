# FormForge Agent Automation — Complete Setup & Operation Guide

> This guide explains how to set up and run the automated agent pipeline
> that builds FormForge Phases 2–5 with zero manual intervention.

---

## What the Automation Does

The `run-agents.sh` script is a single terminal that:

1. Starts Claude Code with the right agent's instructions
2. Tells Claude to run ALL prompts in sequence without stopping
3. After Claude finishes (or hits context limit), catches the exit signal
4. Runs `npm run lint` + `npx tsc --noEmit` verification
5. Performs `git add -A && git commit` automatically
6. If context ran out, restarts Claude with a resume message pointing to HANDOFF.md
7. When an agent is complete, starts the next agent in the sequence
8. After all agents in a phase finish, runs Agent 5 (i18n sweep)
9. After i18n, runs `npm run build`, pushes to git, and moves to the next phase

**You start it once. It runs everything.**

---

## Prerequisites

Before running the automation for the first time:

```bash
# 1. Claude Code CLI must be installed
npm install -g @anthropic-ai/claude-code

# 2. Verify it works
claude --version

# 3. You must be logged in to Claude
claude auth login

# 4. Project must be cloned and set up
cd /path/to/forge-your-forms
npm install

# 5. The .agents/ folder must contain agents 5–15
ls .agents/
# Should show: agent-5-i18n/ agent-6-billing/ agent-7-limits/ ... agent-15-workflows/ SYNC-LOG.md

# 6. Existing agents 1–5 must be COMPLETE (the MVP must be built)

# 7. Environment variables must be set
cat .env  # Should have VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## Step-by-Step Setup

### Step 1: Place the automation files

Copy these files to your project root:

```
forge-your-forms/
├── run-agents.sh          ← the automation script
├── .agents/               ← all agent folders (already exist)
├── .automation/           ← created automatically by the script
├── CLAUDE.md              ← already exists
└── ...
```

```bash
# Copy the automation script to project root
cp run-agents.sh /path/to/forge-your-forms/run-agents.sh

# Make it executable
chmod +x /path/to/forge-your-forms/run-agents.sh
```

### Step 2: Verify the agent folders are in place

```bash
cd /path/to/forge-your-forms

# Check all 10 new agents exist
for i in 6 7 8 9 10 11 12 13 14 15; do
  if [ -d ".agents/agent-${i}-"* ]; then
    echo "✅ Agent $i found"
  else
    echo "❌ Agent $i MISSING"
  fi
done

# Check each agent has all 4 files
for dir in .agents/agent-{6,7,8,9,10,11,12,13,14,15}*/; do
  for file in AGENT.md PROMPTS.md PROGRESS.md HANDOFF.md; do
    [ -f "$dir/$file" ] || echo "❌ Missing: $dir$file"
  done
done
```

### Step 3: Do a dry-run status check

```bash
./run-agents.sh --status
```

This shows every agent's current state (not started / in progress / complete). All agents 6–15 should show "NOT STARTED".

---

## Running the Automation

### Option A: Run everything (recommended)

```bash
./run-agents.sh
```

This runs: Phase 2 → Phase 3 → Phase 4 → Phase 5, with i18n sweeps between each. It will take several hours but requires no intervention.

### Option B: Run one phase at a time

```bash
# Run only Phase 2 (Billing → Limits → Onboarding → i18n)
./run-agents.sh --phase 2

# Later, run Phase 3
./run-agents.sh --phase 3
```

### Option C: Run a single agent

```bash
# Run only Agent 7
./run-agents.sh --agent 7
```

### Option D: Resume after interruption

If you Ctrl+C, your machine sleeps, or something crashes:

```bash
./run-agents.sh --resume
```

The script reads `.automation/state.json` and the agents' PROGRESS.md files to figure out exactly where it stopped. It resumes from that point.

---

## What Happens Inside the Script (Detailed Flow)

Here is exactly what happens when you run `./run-agents.sh --phase 2`:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1. Script reads PHASE_2_AGENTS = [6, 7, 8]                │
│                                                              │
│  2. FOR Agent 6:                                             │
│     a. Check: is Agent 6 already COMPLETE? → skip if yes    │
│     b. Build bootstrap message with ALL rules:               │
│        - Read CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md   │
│        - "Run ALL prompts without stopping"                  │
│        - "Say AGENT_COMPLETE when done"                      │
│        - "Say CONTEXT_LIMIT_REACHED if running low"          │
│     c. Run: claude -p "<message>" --dangerously-skip-perms   │
│     d. Claude executes: 6.0 → 6.1 → 6.2 → 6.3 → 6.4       │
│     e. Claude outputs: "AGENT_COMPLETE"                      │
│     f. Script catches this signal                            │
│     g. Script runs: npm run lint && npx tsc --noEmit         │
│     h. If pass: git add -A && git commit                     │
│     i. If fail: runs Claude again to fix errors, then commit │
│                                                              │
│     CONTEXT OVERFLOW HANDLING:                               │
│     If Claude says "CONTEXT_LIMIT_REACHED" instead:          │
│     f'. Script catches this different signal                 │
│     g'. git commit partial work                              │
│     h'. Rebuild message as RESUME (reads HANDOFF.md)         │
│     i'. Run claude -p "<resume message>" again               │
│     j'. Claude reads HANDOFF.md, continues from last prompt  │
│     k'. Repeat until AGENT_COMPLETE or max 5 restarts        │
│                                                              │
│  3. REPEAT step 2 for Agent 7, then Agent 8                 │
│                                                              │
│  4. ALL agents done → Full verification:                     │
│     npm run lint + npx tsc --noEmit + npm run test           │
│                                                              │
│  5. Agent 5 i18n sweep:                                      │
│     - Build i18n message listing Phase 2 agent files         │
│     - Run claude -p "<i18n message>"                         │
│     - Agent 5 translates new strings, fixes RTL              │
│     - Verify + commit                                        │
│                                                              │
│  6. npm run build → git push → PHASE 2 DEPLOYED 🚀          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## How the Two Magic Signals Work

The automation relies on Claude outputting one of two exact phrases:

### Signal 1: `AGENT_COMPLETE`

Claude says this when ALL prompts in PROMPTS.md are finished. The bootstrap message explicitly tells Claude: "When ALL prompts are complete, say exactly: AGENT_COMPLETE". The script uses `grep` to detect this in Claude's output and proceeds to the next agent.

### Signal 2: `CONTEXT_LIMIT_REACHED`

Claude says this when it senses the context window is getting full. The bootstrap message tells Claude: "If context is getting long, STOP IMMEDIATELY, write HANDOFF.md, and say exactly: CONTEXT_LIMIT_REACHED". The script:

1. Commits the partial work
2. Builds a new RESUME message that tells Claude to read HANDOFF.md
3. Starts a fresh `claude -p` session with the resume message
4. Claude picks up where it left off

This can happen up to 5 times per agent before the script gives up.

---

## The Key CLI Command

The core of the automation is this single command:

```bash
claude -p "<prompt_text>" --dangerously-skip-permissions --output-format text
```

What each flag does:

| Flag | Purpose |
|------|---------|
| `-p "..."` | **Print mode** — sends one prompt, gets full response, exits. No interactive session. This is what makes automation possible. |
| `--dangerously-skip-permissions` | Auto-approves all file writes and command execution. No manual confirmations. |
| `--output-format text` | Plain text output (no JSON wrapping). Easier to grep for signals. |

Claude receives the full prompt, does ALL the work (reading files, writing code, running lint), outputs everything, and exits. The script then reads the output for the completion signal.

---

## Monitoring While It Runs

### Watch the live output

The script prints everything to your terminal AND saves it to log files:

```
.automation/
├── runner.log                    ← master log (all phases)
├── state.json                    ← current position (for --resume)
├── agent_6_session_1.log         ← Agent 6 first session output
├── agent_6_session_2.log         ← Agent 6 second session (if context restarted)
├── agent_7_session_1.log         ← Agent 7 output
├── ...
├── i18n_phase_2.log              ← Agent 5 i18n sweep output
└── current_message.txt           ← the prompt being sent to Claude
```

### Check progress mid-run (from another terminal)

```bash
# See where we are
./run-agents.sh --status

# See recent commits
git log --oneline -10

# Read an agent's progress
cat .agents/agent-7-limits/PROGRESS.md

# Tail the master log
tail -f .automation/runner.log
```

---

## Error Handling

### If lint/typecheck fails after a prompt

The script automatically asks Claude to fix the errors:

```
"There are lint or type-check errors. Run npm run lint and npx tsc --noEmit,
 read the errors, and fix them."
```

If the fix works, it commits and continues. If not, the script stops and tells you which agent failed and where to look.

### If an agent fails completely

The script stops and prints:

```
════════════════════════════════════════════════════
  AUTOMATION STOPPED — Agent 7 failed
  Check: .automation/agent_7_session_*.log
  Fix issues manually, then run:
    ./run-agents.sh --resume
════════════════════════════════════════════════════
```

You then: read the log, fix the issue manually (or run Claude interactively), commit the fix, and run `--resume`.

### If your machine loses power / you Ctrl+C

Just run `./run-agents.sh --resume`. It reads state.json and each agent's PROGRESS.md to find exactly where things stopped.

---

## Checking When Agent 5 Is Working

Agent 5 runs automatically after each phase. You will see this in the terminal:

```
═══════════════════════════════════════════════════════════
  Agent 5 — i18n Sweep for Phase 2
═══════════════════════════════════════════════════════════

ℹ️  Translating new strings from: agent-6-billing, agent-7-limits, agent-8-onboarding
```

Agent 5 gets a custom prompt listing exactly which agents' files to scan, focusing on the delta. It does not re-translate existing strings.

---

## Full Execution Timeline

```
./run-agents.sh
│
├─ Phase 2 ─────────────────────────────────────────
│  ├─ Agent 6  (Billing)        ~30-60 min
│  │  └─ 6.0 → 6.1 → 6.2 → 6.3 → 6.4 → commit
│  ├─ Agent 7  (Limits)         ~30-60 min
│  │  └─ 7.0 → 7.1 → 7.2 → 7.3 → 7.4 → commit
│  ├─ Agent 8  (Onboarding)     ~30-60 min
│  │  └─ 8.0 → 8.1 → 8.2 → 8.3 → 8.4 → commit
│  ├─ ✅ Verify all
│  ├─ Agent 5  (i18n sweep)     ~15-30 min
│  └─ 🚀 Deploy v2.0
│
├─ Phase 3 ─────────────────────────────────────────
│  ├─ Agent 9  (Webhooks)       ~30-60 min
│  ├─ Agent 10 (Integrations)   ~20-40 min
│  ├─ Agent 11 (Templates)      ~30-60 min
│  ├─ Agent 5  (i18n sweep)     ~15-30 min
│  └─ 🚀 Deploy v3.0
│
├─ Phase 4 ─────────────────────────────────────────
│  ├─ Agent 12 (AI Generator)   ~30-45 min
│  ├─ Agent 13 (Smart Routing)  ~30-45 min
│  ├─ Agent 5  (i18n sweep)     ~10-20 min
│  └─ 🚀 Deploy v4.0
│
└─ Phase 5 ─────────────────────────────────────────
   ├─ Agent 14 (Enterprise)     ~30-45 min
   ├─ Agent 15 (Workflows)      ~30-60 min
   ├─ Agent 5  (i18n sweep)     ~15-30 min
   └─ 🚀 Deploy v5.0

Total estimated: 6–10 hours unattended
```

---

## Summary

| Question | Answer |
|----------|--------|
| How many terminals? | **One.** The script handles everything. |
| Do I type prompts? | **No.** The script sends them via `claude -p`. |
| What if context runs out? | The script detects it, commits, and restarts with HANDOFF.md. |
| What if lint fails? | The script asks Claude to fix it. If it can't, the script stops and tells you. |
| When does Agent 5 run? | **Automatically**, after each phase's agents all complete. |
| How do I know where we are? | `./run-agents.sh --status` or `tail -f .automation/runner.log` |
| How do I resume? | `./run-agents.sh --resume` |
| Can I run just one phase? | `./run-agents.sh --phase 3` |
| Can I run just one agent? | `./run-agents.sh --agent 12` |
