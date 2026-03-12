# Phase 7 — Operator Manual

> How to execute Phase 7: End-to-End Verification & Fix

---

## Overview

Phase 7 runs **18 agents** (numbered 21-38) across **5 batches**.
Total prompts: ~68 across all agents.
Estimated sessions: 30-40 (each prompt = 1 session, some agents have 3-5 prompts).

---

## Prerequisites

Before starting Phase 7:
1. Phase 6 complete (all agents 16-20 done)
2. All scan reports generated in `.agents-phase-7/scanner-reports/`
3. All agent folders created in `.agents-phase-7/feature-*/`
4. `npm install` completed
5. Dev server NOT required (agents read code, don't need running app)

---

## Execution Order

### Step 1: Batch 1 — Infrastructure (Sequential)

Run ONE agent at a time, in order:

| Order | Agent | Prompts | Est. Sessions |
|-------|-------|---------|--------------|
| 1st | Agent 21 (ADMIN bypass) | 21.0-21.3 | 2-3 |
| 2nd | Agent 22 (Auth & Settings) | 22.0-22.4 | 3-4 |
| 3rd | Agent 24 (Billing/Stripe) | 24.0-24.4 | 3-4 |
| 4th | Agent 25 (Plan Limits) | 25.0-25.4 | 3-4 |

**Checkpoint**: After Batch 1, run `npm run lint && npx tsc --noEmit` to verify.

### Step 2: Batch 2 — Core Modes (Parallel ⚡)

Run ALL 4 agents simultaneously in separate terminals:

| Agent | Prompts | Est. Sessions |
|-------|---------|--------------|
| Agent 26 (Standard Forms) | 26.0-26.3 | 2-3 |
| Agent 27 (Waitlists) | 27.0-27.3 | 2-3 |
| Agent 28 (Feedback/NPS) | 28.0-28.3 | 2-3 |
| Agent 29 (Support Tickets) | 29.0-29.4 | 3-4 |

**Checkpoint**: After all 4 complete, run lint + tsc.

### Step 3: Batch 3 — Platform Features (Parallel ⚡)

Run ALL 6 agents simultaneously:

| Agent | Prompts | Est. Sessions |
|-------|---------|--------------|
| Agent 23 (Edge Functions) | 23.0-23.4 | 3-4 |
| Agent 30 (Onboarding) | 30.0-30.2 | 2 |
| Agent 31 (Webhooks & API) | 31.0-31.3 | 2-3 |
| Agent 32 (Integrations) | 32.0-32.4 | 3-4 |
| Agent 33 (Templates) | 33.0-33.2 | 2 |
| Agent 34 (AI Features) | 34.0-34.3 | 2-3 |

**Checkpoint**: After all 6 complete, run lint + tsc.

### Step 4: Batch 4 — Enterprise & Workflows (Sequential)

| Order | Agent | Prompts | Est. Sessions |
|-------|-------|---------|--------------|
| 1st | Agent 35 (Enterprise) | 35.0-35.4 | 3-4 |
| 2nd | Agent 36 (Workflows) | 36.0-36.4 | 3-4 |

**Checkpoint**: After Batch 4, run lint + tsc.

### Step 5: Batch 5 — Final (Sequential)

| Order | Agent | Prompts | Est. Sessions |
|-------|-------|---------|--------------|
| 1st | Agent 37 (i18n/RTL) | 37.0-37.3 | 2-3 |
| 2nd | Agent 38 (Final Verification) | 38.0-38.3 | 2-3 |

**Final output**: `PHASE-7-COMPLETION-REPORT.md`

---

## How to Run an Agent

1. Open a new Claude Code session (terminal)
2. Navigate to the FormForge project root
3. Copy the bootstrap prompt from `PHASE-7-COMMANDS.md`
4. Paste into the Claude Code session
5. The agent will:
   - Read its AGENT.md and PROMPTS.md
   - Execute the next incomplete prompt
   - Update PROGRESS.md and HANDOFF.md
6. Repeat until all prompts are complete (agent marks HANDOFF as COMPLETE)

### Resuming an Agent

If a session is interrupted:
1. Start a new session with the same bootstrap prompt
2. The agent reads PROGRESS.md to know which prompt to continue from
3. It reads HANDOFF.md for current state

### Multi-Prompt Sessions

Each agent session can execute 1-3 prompts before context limits.
For agents with 4-5 prompts, plan for 2 sessions per agent.

---

## Monitoring Progress

Run the status dashboard:
```bash
./run-agents-phase7.sh status
```

Or check individual agents:
```bash
cat .agents-phase-7/feature-00-admin-role/PROGRESS.md
```

---

## Troubleshooting

### Agent fails lint/tsc
1. Read the error output
2. Fix in the same session if minor
3. If major: note in HANDOFF.md, move to next prompt

### Cross-agent conflict
1. Check SYNC-LOG.md for file ownership
2. Only Agent 36 has a cross-agent exception (useTickets.ts)
3. If unexpected conflict: resolve manually, document in SYNC-LOG.md

### Agent can't proceed (missing dependency)
1. Check AGENT.md dependencies
2. Verify upstream agent's HANDOFF.md is COMPLETE
3. If upstream is incomplete: complete it first

---

## Key Files

| File | Purpose |
|------|---------|
| `SYNC-LOG.md` | Shared file ownership matrix |
| `GAP-ANALYSIS.md` | All issues mapped to agents |
| `PHASE-7-COMMANDS.md` | Bootstrap prompts for each agent |
| `MASTER-CONTEXT.md` | Builder resume state |
| `run-agents-phase7.sh` | Status dashboard + run helper |
| `scanner-reports/MASTER-BRIEF.md` | All scan results summary |
