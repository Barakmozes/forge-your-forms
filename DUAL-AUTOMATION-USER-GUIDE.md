# User Guide: How to Use the Dual-Automation System

> A plain-language, step-by-step guide for using `DUAL-AUTOMATION-PROMPT-V4.md` on any project.

---

## What This System Does

This system automatically audits your entire codebase and then creates a structured plan to fix every issue it finds. It works in three stages:

1. **Scanner** — reads your code, finds every bug and issue, writes reports
2. **Builder** — reads those reports, creates a set of "agent folders" with step-by-step fix instructions
3. **Agents** — you run each agent (one at a time or several in parallel) to actually fix the code

You do not need to configure anything. The system auto-detects your tech stack, language, framework, and tools.

---

## What You Need Before Starting

- A project with source code (any language: JavaScript, TypeScript, Python, Rust, Go, Ruby, Java, etc.)
- Access to Claude (via Claude Code CLI, Claude.ai, or the API)
- Three files at project root: `DUAL-AUTOMATION-PROMPT-V4.md`, `SCAN-DIMENSIONS.md`, `AGENT-TEMPLATES.md`

---

## Quick Overview of the Full Process

```
Step 1:  Copy DUAL-AUTOMATION-PROMPT-V4.md into your project root
Step 2:  Run the Scanner (may take multiple sessions)
Step 3:  Run the Builder (may take multiple sessions)
Step 4:  Run the agents batch by batch to fix your code
Step 5:  Verify everything works
```

Total time depends on project size. A small project might finish in 3–5 sessions. A large project might take 15–25 sessions.

---

## Step 1 — Set Up

### 1.1 Copy the file to your project

Take the file `DUAL-AUTOMATION-PROMPT-V4.md` and put it in the root folder of the project you want to audit. The root folder is where your `package.json`, `Cargo.toml`, `go.mod`, or similar config file lives.

```
your-project/
├── DUAL-AUTOMATION-PROMPT-V4.md   <-- put it here
├── package.json
├── src/
└── ...
```

### 1.2 Make sure your project has a rules file (optional but recommended)

The Scanner will look for a file that describes your project's rules and conventions. It checks for these files in order and uses the first one it finds:

1. `CLAUDE.md`
2. `.cursorrules`
3. `.github/copilot-instructions.md`
4. `CONTRIBUTING.md`
5. `README.md`

If you don't have any of these, the Scanner will still work — it just won't have project-specific rules to follow. If you have a `README.md`, that's enough.

### 1.3 Nothing else to configure

You do not need to edit `DUAL-AUTOMATION-PROMPT-V4.md`. You do not need to tell it what language or framework you use. It figures that out automatically.

---

## Step 2 — Run the Scanner

The Scanner reads your entire codebase and produces structured reports about what it finds. It never changes your code.

### 2.1 Open a new Claude session

Start a fresh Claude conversation. This can be:
- A new Claude Code CLI session (run `claude` in your project directory)
- A new chat on Claude.ai (with your project files accessible)
- A new API call

### 2.2 Copy the Scanner Prompt into the session

Open `DUAL-AUTOMATION-PROMPT-V4.md` and find **Section A — The Scanner Prompt**. Copy everything between:

```
---START SCANNER---
```

and

```
---END SCANNER---
```

Paste it into your Claude session as your first message. That's the entire instruction — you don't need to add anything else.

### 2.3 Let the Scanner work

The Scanner will now:

1. **Detect your tech stack** — it reads your config files (`package.json`, `tsconfig.json`, etc.) and figures out what language, framework, database, linter, and test framework you use
2. **Create a Project Profile** — it writes `scanner-reports/PROJECT-PROFILE.md` with everything it discovered
3. **Create a Scan Queue** — it writes `SCAN-QUEUE.md` listing every feature area in your project
4. **Scan each feature** — for each feature, it reads all related files and produces a detailed report
5. **Write scan reports** — each report goes into `scanner-reports/` as a numbered file like `01-auth.md`, `02-billing.md`, etc.

### 2.4 What to do when the Scanner hits a context limit

Large projects cannot be scanned in a single session. When the Scanner runs out of context space, it will:

1. Save its progress to `SCAN-QUEUE.md`
2. Output the message: `CONTEXT_LIMIT_REACHED`
3. Stop working

**What you do next:**

1. Start a **new** Claude session
2. Paste the **same Scanner Prompt** again (the same text from Section A)
3. The Scanner reads `SCAN-QUEUE.md`, sees which features are already done, and picks up where it left off

Repeat this as many times as needed. Each session scans a few more features.

### 2.5 How to know the Scanner is done

When all features have been scanned, the Scanner will:

1. Generate `scanner-reports/MASTER-BRIEF.md` — a summary of all findings
2. Output the message: `SCANNER_COMPLETE`

At this point, your project will have a new folder:

```
your-project/
├── scanner-reports/
│   ├── PROJECT-PROFILE.md     <-- your tech stack
│   ├── 01-auth.md             <-- feature report
│   ├── 02-billing.md          <-- feature report
│   ├── ...                    <-- more feature reports
│   └── MASTER-BRIEF.md        <-- summary of all issues
├── SCAN-QUEUE.md              <-- scan progress tracker
└── ...
```

### 2.6 Review the Master Brief (recommended)

Before moving on, read `scanner-reports/MASTER-BRIEF.md`. It tells you:

- How many P0 (critical), P1 (high), and P2 (medium) issues were found
- Which features have the most problems
- What the overall health of your project looks like

This helps you understand what the Builder will create in the next step.

---

## Step 3 — Run the Builder

The Builder reads the Scanner's reports and creates a structured set of "agents" — each one is a focused fix plan for a specific part of your codebase.

### 3.1 Open a new Claude session

Start a fresh Claude conversation. Do not reuse the Scanner session.

### 3.2 Copy the Builder Prompt into the session

Open `DUAL-AUTOMATION-PROMPT-V4.md` and find **Section B — The Builder Prompt**. Copy everything between:

```
---START BUILDER---
```

and

```
---END BUILDER---
```

Paste it into your Claude session as your first message.

### 3.3 Let the Builder work

The Builder will now:

1. **Read all scan reports** — it reads every file in `scanner-reports/`
2. **Design agents** — it decides how many agents are needed and what each one is responsible for
3. **Assign batches** — it groups agents into batches. Batch 1 runs first (infrastructure). Then Batch 2 and 3 can run in parallel (independent features). Then later batches run for cross-cutting concerns.
4. **Create agent folders** — for each agent, it creates a folder with 4 files:
   - `AGENT.md` — what this agent is responsible for, what files it owns
   - `PROMPTS.md` — step-by-step instructions for fixing the issues
   - `PROGRESS.md` — a checklist to track what's done
   - `HANDOFF.md` — notes for resuming if a session gets interrupted
5. **Create orchestration files** — coordination files that prevent agents from conflicting with each other

### 3.4 What to do when the Builder hits a context limit

Same as the Scanner. When you see `CONTEXT_LIMIT_REACHED`:

1. Start a new Claude session
2. Paste the same Builder Prompt again
3. The Builder reads `MASTER-CONTEXT.md`, sees which agents are already created, and continues

### 3.5 How to know the Builder is done

When all agents and orchestration files are created, the Builder will:

1. Output the message: `BUILDER_COMPLETE`
2. Print a summary showing how many agents, prompts, and batches were created

Your project will now have:

```
your-project/
├── .agents/
│   ├── agent-01-auth/
│   │   ├── AGENT.md
│   │   ├── PROMPTS.md
│   │   ├── PROGRESS.md
│   │   └── HANDOFF.md
│   ├── agent-02-billing/
│   │   ├── AGENT.md
│   │   ├── PROMPTS.md
│   │   ├── PROGRESS.md
│   │   └── HANDOFF.md
│   ├── ...more agent folders...
│   ├── MASTER-CONTEXT.md      <-- builder progress tracker
│   ├── SYNC-LOG.md            <-- which agent owns which file
│   ├── GAP-ANALYSIS.md        <-- every issue mapped to an agent
│   ├── COMMANDS.md            <-- ready-to-copy startup prompts
│   └── run-agents.sh          <-- orchestration dashboard script
├── scanner-reports/
│   └── ...
└── ...
```

---

## Step 4 — Run the Agents

Now you run the agents to actually fix your code. Each agent focuses on one part of the codebase.

### 4.1 Check the dashboard

If you're on macOS/Linux (or Git Bash on Windows), run:

```bash
bash .agents/run-agents.sh status
```

This shows you a colored dashboard of all agents grouped by batch, with their current status:
- **NOT_STARTED** — hasn't been run yet
- **IN_PROGRESS** — partially done
- **COMPLETE** — finished

### 4.2 Understand the batch order

Agents are grouped into batches. You **must** complete all agents in Batch 1 before starting Batch 2, all of Batch 2 before Batch 3, and so on.

- **Batch 1** agents run **one at a time** (they touch shared files like routing, auth, config)
- **Batch 2–3** agents can run **in parallel** (they each own separate files that don't overlap)
- **Later batches** usually run **one at a time** (they touch files across multiple features)

### 4.3 Start an agent

Open `.agents/COMMANDS.md` and find the agent you want to run. Each agent has a "Bootstrap Prompt" section. It looks something like this:

```
Read the following files in order:
1. CLAUDE.md
2. .agents/agent-01-auth/AGENT.md
3. .agents/agent-01-auth/PROMPTS.md
4. .agents/agent-01-auth/PROGRESS.md
5. .agents/agent-01-auth/HANDOFF.md
6. scanner-reports/01-auth.md

Then execute the first prompt in PROMPTS.md that has status NOT_STARTED
in PROGRESS.md.
...
```

**What you do:**

1. Start a new Claude session
2. Copy that entire bootstrap prompt block
3. Paste it as your first message
4. Claude reads all the files and starts working on the first fix

### 4.4 Work through the prompts

Each agent has multiple numbered prompts in its `PROMPTS.md`:

- **Prompt N.0 (Assessment)** — Claude reads the code and understands the current state. No changes are made.
- **Prompts N.1, N.2, ...** — each prompt fixes one group of related issues. Claude makes the code changes and verifies them.
- **Prompt N.LAST (Verification)** — Claude runs the linter, type checker, and build to confirm everything works.

After completing each prompt, Claude updates `PROGRESS.md` (marks it COMPLETE) and `HANDOFF.md` (notes what changed).

You may need to give Claude permission to edit files and run commands as it works.

### 4.5 What to do if an agent session hits a context limit

If Claude outputs `CONTEXT_LIMIT_REACHED` mid-agent:

1. Start a new Claude session
2. Paste the **same bootstrap prompt** from COMMANDS.md for that agent
3. Claude reads `PROGRESS.md` and `HANDOFF.md`, sees which prompts are done, and resumes from the next one

### 4.6 What to do when an agent finishes

When an agent completes all its prompts, Claude will output: `AGENT_NN_COMPLETE` (where NN is the agent number).

At this point:
- The agent's `PROGRESS.md` shows all prompts as COMPLETE
- The agent's `HANDOFF.md` lists all files modified and issues resolved

Move on to the next agent in the current batch. If all agents in the current batch are done, move to the next batch.

### 4.7 Running parallel agents (Batch 2+ only)

For batches marked "Parallel", you can run multiple agents at the same time in separate Claude sessions. For example, if Batch 2 has agents 04, 05, and 06, you can:

1. Open Claude session A → paste agent-04 bootstrap prompt
2. Open Claude session B → paste agent-05 bootstrap prompt
3. Open Claude session C → paste agent-06 bootstrap prompt

They won't conflict because each agent owns different files (guaranteed by `SYNC-LOG.md`).

**Important:** Never run agents from different batches in parallel. Batch order must be respected.

### 4.8 Track your progress

Run the dashboard script periodically to see where you stand:

```bash
bash .agents/run-agents.sh status
```

You can also check a specific batch:

```bash
bash .agents/run-agents.sh batch 2
```

This tells you whether the batch is ready to run (i.e., the previous batch is complete).

---

## Step 5 — Verify Everything

After all agents in all batches are complete:

### 5.1 Run your project's quality checks

Run whatever quality commands your project uses. The Scanner detected these automatically, but here are common ones:

```bash
# JavaScript/TypeScript
npm run lint
npx tsc --noEmit
npm run build
npm test

# Python
ruff check .
mypy .
pytest

# Rust
cargo clippy
cargo check
cargo test

# Go
golangci-lint run
go vet ./...
go test ./...
```

### 5.2 Review the changes

Use `git diff` or your preferred diff tool to review all the changes the agents made. Every change should be traceable:

- Each agent's `HANDOFF.md` lists what files were modified and why
- Each issue can be traced back through `GAP-ANALYSIS.md` → scan report → original code

### 5.3 Commit your changes

If everything looks good, commit the changes. You can commit per-agent, per-batch, or all at once — whatever suits your workflow.

---

## Common Situations and What to Do

### "The Scanner found 0 issues"

Your codebase is in great shape. The Builder will have nothing to build. You're done.

### "The Scanner found issues but they're all P2"

P2 issues are cosmetic and non-blocking. You can run the Builder and agents to fix them, or you can skip them — they won't break anything.

### "I want to scan only part of my project"

The system is designed to scan everything. However, after the Scanner creates `SCAN-QUEUE.md`, you can manually edit it to mark certain features as `READY` (skipped) before continuing.

### "An agent made a mistake"

Undo the agent's changes using `git checkout` for the affected files, then re-run that agent's current prompt. The agent reads the code fresh each time, so it will try again.

### "I want to add a custom scan dimension"

Read Section C of `DUAL-AUTOMATION-PROMPT-V4.md` (the Mechanics Guide) for instructions on adding custom dimensions. You would edit the Scanner Prompt's conditional dimensions section.

### "My project uses a language/framework the system doesn't mention"

The fingerprinting system checks for many ecosystems, but if yours isn't listed, the Scanner will still work — it will just mark some variables as "not detected." The scan reports will still catalog files, flows, and issues. You may need to manually set the template variables in `PROJECT-PROFILE.md` after the Scanner creates it.

### "I ran the Scanner weeks ago and the code has changed since"

Re-run the Scanner. Delete or rename the old `scanner-reports/` folder and `SCAN-QUEUE.md`, then start fresh. The Scanner always reads the current state of the code.

### "I want to use this on a monorepo with multiple packages"

Run the Scanner and Builder separately for each package. Navigate into each package's directory and run the process from there.

---

## File Reference — What Gets Created and Where

| File / Folder | Created By | Purpose |
|---------------|-----------|---------|
| `scanner-reports/PROJECT-PROFILE.md` | Scanner | Your detected tech stack and settings |
| `scanner-reports/01-feature.md` ... | Scanner | One report per feature area |
| `scanner-reports/MASTER-BRIEF.md` | Scanner | Summary of all findings |
| `SCAN-QUEUE.md` | Scanner | Tracks which features have been scanned |
| `.agents/agent-NN-name/AGENT.md` | Builder | Agent's role, owned files, dependencies |
| `.agents/agent-NN-name/PROMPTS.md` | Builder | Step-by-step fix instructions |
| `.agents/agent-NN-name/PROGRESS.md` | Builder + Agent | Checklist updated as prompts complete |
| `.agents/agent-NN-name/HANDOFF.md` | Builder + Agent | Session resume notes, files changed |
| `.agents/MASTER-CONTEXT.md` | Builder | Builder's own progress tracker |
| `.agents/SYNC-LOG.md` | Builder | Which agent owns which file |
| `.agents/GAP-ANALYSIS.md` | Builder | Every issue mapped to an agent |
| `.agents/COMMANDS.md` | Builder | Ready-to-copy agent startup prompts |
| `.agents/run-agents.sh` | Builder | Dashboard script for tracking progress |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Scanner** | The first automation. It reads your code and produces reports. Never modifies code. |
| **Builder** | The second automation. It reads Scanner reports and creates agent folders. Never modifies code. |
| **Agent** | A focused fix plan for one part of your codebase. Each agent has its own folder with instructions. |
| **Batch** | A group of agents. Batches run in order. Agents within a parallel batch can run simultaneously. |
| **P0** | Critical issue — blocks a core user flow. Must be fixed. |
| **P1** | High-priority issue — feature partially broken. Should be fixed. |
| **P2** | Medium-priority issue — cosmetic or non-blocking. Nice to fix. |
| **Scan Report** | A structured document describing one feature's files, flows, dependencies, and issues. |
| **Master Brief** | A summary document listing all issues across all features. |
| **Fingerprinting** | The Scanner's auto-detection of your tech stack from config files. |
| **SYNC-LOG** | A file that maps every source file to exactly one owning agent. Prevents conflicts. |
| **GAP-ANALYSIS** | A file that maps every issue to the agent responsible for fixing it. Ensures nothing is missed. |
| **Context Limit** | When Claude's conversation memory fills up. The system saves state and resumes in a new session. |
| **Bootstrap Prompt** | The text you paste into a new Claude session to start an agent. Found in COMMANDS.md. |
| **Quality Gate** | An automated check (lint, build, test) that runs between batch groups to verify code health. |
| **Project Type** | Auto-detected classification (Web, CLI, Library, Mobile, Backend, Service) that determines which scan dimensions are active. |
| **Confidence Score** | Rating (HIGH/MEDIUM/LOW) applied to product opportunities to filter speculative suggestions. |
| **Role Hierarchy** | Batch ordering system where infrastructure and security roles run before feature-building roles. |

---

## Summary Cheat Sheet

```
SETUP (3 files needed — 24 dimensions available, auto-selected by project type)
  1. Put DUAL-AUTOMATION-PROMPT-V4.md, SCAN-DIMENSIONS.md, and AGENT-TEMPLATES.md in your project root

SCAN (Section A)
  2. New Claude session → paste Scanner Prompt → let it work
  3. If CONTEXT_LIMIT_REACHED → new session → paste same prompt → it resumes
  4. Repeat until SCANNER_COMPLETE
  5. Read scanner-reports/MASTER-BRIEF.md to see findings

BUILD (Section B)
  6. New Claude session → paste Builder Prompt → let it work
  7. If CONTEXT_LIMIT_REACHED → new session → paste same prompt → it resumes
  8. Repeat until BUILDER_COMPLETE

FIX (Agent Execution)
  9.  Open .agents/COMMANDS.md
  10. For each batch (in order):
      a. For each agent in the batch:
         - New Claude session → paste bootstrap prompt from COMMANDS.md
         - Let it work through all prompts
         - If CONTEXT_LIMIT_REACHED → new session → paste same prompt
         - Done when it outputs AGENT_NN_COMPLETE
      b. Parallel batches: run multiple agents at the same time
  11. After all batches: run linter, type checker, build, tests
  12. Review changes with git diff
  13. Commit
```
