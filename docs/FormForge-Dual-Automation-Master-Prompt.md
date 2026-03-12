# FormForge — Dual-Automation System: Master Implementation Prompt

> **Role:** Lead Automation Engineer & Site Reliability Engineer (SRE)
> **Objective:** Build two central automations that ensure every existing feature in the FormForge platform is 100% active, functional, and useful — end to end.
> **Critical Rule:** We are NOT developing new features. We are making everything that already exists work perfectly.

---

## TABLE OF CONTENTS

1. [System Overview & Goal](#1-system-overview--goal)
2. [General Rules & Principles](#2-general-rules--principles)
3. [The Two Central Automations](#3-the-two-central-automations)
4. [Automation 1 — Discovery & Planning (The Scanner)](#4-automation-1--discovery--planning-the-scanner)
5. [Automation 2 — Agent Factory & Orchestrator (The Builder)](#5-automation-2--agent-factory--orchestrator-the-builder)
6. [Agent File Structure & Working Method](#6-agent-file-structure--working-method)
7. [Execution Mechanism — run-agents Script](#7-execution-mechanism--run-agents-script)
8. [Deliverables Checklist](#8-deliverables-checklist)
9. [End-to-End Example — Standard Forms Feature](#9-end-to-end-example--standard-forms-feature)

---

## 1. SYSTEM OVERVIEW & GOAL

FormForge is a unified SaaS platform with 4 modes: Standard Forms, Waitlists, Feedback/NPS, and Support Tickets. Built with Vite + React 18 + Supabase. All features have been coded across 15 agents and 5 phases, but not all features are verified to work end-to-end in production.

**The Goal:** Develop an automation system consisting of two central automations that:
- Audit every existing feature for completeness and functionality
- Ensure every page, flow, integration, and Edge Function is 100% working
- Create an ADMIN role for unrestricted testing across the entire platform
- Fix anything broken without introducing new features
- Guarantee system reliability and uptime

**The 4 Core Features to Audit:**

| Feature | Description |
|---------|-------------|
| **Standard Forms** | Drag-and-drop form builder with dynamic field rendering |
| **Waitlists** | Email signup with referral tracking, leaderboard, and analytics |
| **Feedback / NPS** | NPS surveys (0–10) with sentiment analysis and trend tracking |
| **Support Tickets** | Ticket creation, threaded messaging, SLA tracking, canned responses |

**Additional Systems to Audit:** Billing (Stripe), Plan Limits, Onboarding, Webhooks, API, Integrations (Slack/Zapier/Mailchimp), Templates, AI Features, Enterprise (SSO/White-Label/Domains), Workflows, i18n/RTL, Auth, Settings.

---

## 2. GENERAL RULES & PRINCIPLES

### Work Session Protocol
Every work session must follow this two-prompt opening:
1. **Prompt 1 — Orientation:** Claude reads the relevant context files (CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md, SYNC-LOG.md)
2. **Prompt 2 — Goal Definition:** Explicitly state what the session will accomplish

### Core Principles
- **Functionality First:** Delivering reliable, high-performing solutions that solve real-world problems
- **Generics & DRY:** Writing clean, reusable, maintainable code (Don't Repeat Yourself)
- **User Experience:** Focus on the core goal to create perfectly balanced, effective designs with brand consistency
- **Parallelism:** Try to develop things in parallel whenever possible. Sometimes one part depends on completing another; comprehensive planning can bypass conflicts and enable parallel work
- **No New Features:** Only fix, complete, and verify what already exists
- **Context Preservation:** Every automation must have a built-in mechanism to proactively create a handoff brief BEFORE the context window runs out

### ADMIN Role Requirement
Create an ADMIN role for a user who can freely navigate ALL features in the system without any restrictions. This user can:
- Access all tiers (Free, Pro, Growth, Business) features without plan limits
- Test all modes (standard, waitlist, feedback, support)
- Access all Settings tabs (Workspace, Members, Profile, Billing, Webhooks, API, Integrations, Enterprise)
- View all dashboards, analytics, and admin panels
- Bypass all feature gates and plan checks

---

## 3. THE TWO CENTRAL AUTOMATIONS

The system is built on two automations that work in sequence with a handoff pipeline:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DUAL-AUTOMATION ARCHITECTURE                       │
│                                                                       │
│  AUTOMATION 1                          AUTOMATION 2                   │
│  "The Scanner"                         "The Builder"                  │
│  ─────────────                         ─────────────                  │
│  Discovery &                           Agent Factory &                │
│  Planning                              Orchestrator                   │
│                                                                       │
│  • Scans each feature                  • Receives scan reports        │
│  • Explores codebase deeply            • Creates agent folders        │
│  • Checks pages, components,           • Writes comprehensive         │
│    hooks, integrations                   prompts per agent            │
│  • Verifies Edge Functions             • Decides parallel vs          │
│  • Tests end-to-end flows                sequential execution         │
│  • Checks business tier logic          • Manages execution queue      │
│  • Documents what works,               • Monitors agent terminals     │
│    what doesn't                        • Handles conflicts            │
│                                        • Generates run-agents.sh      │
│                                                                       │
│  OUTPUT: Focused report                OUTPUT: Agent folders +        │
│  per feature/system part               run script + guide             │
│                                                                       │
│  ───── Handoff Pipeline ─────>                                        │
│  (Report files transfer                                               │
│   to Automation 2 queue)                                              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. AUTOMATION 1 — DISCOVERY & PLANNING (The Scanner)

### Purpose
Systematically scan every feature and system component in FormForge. Produce a comprehensive, focused report per feature. Work feature-by-feature until the entire system is covered.

### How It Works

**Execution Environment:** Runs through the Git terminal using Claude Code in dedicated terminals. Each terminal runs in **dedicated planning mode** — Claude is PREVENTED from writing any code and is FORCED to only explore and think.

**Protocol per Feature:**
For each feature/system part, the Scanner must:

1. **Identify all touchpoints:**
   - Which pages contain this feature
   - Which components render it
   - Which hooks manage its data
   - Which Supabase tables/RLS policies/triggers support it
   - Which Edge Functions serve it
   - Which routes expose it

2. **Check functionality completeness:**
   - Which processes work end-to-end (tested, verified)
   - Which processes are partially built but incomplete
   - Which features create real value that users can actually use
   - What is the complete flow to fulfill this feature's purpose

3. **Check business model integration:**
   - Which pricing tier (Free, Pro, Growth, Business) gates this feature
   - Is plan-level gating implemented and working
   - Are the feature limits enforced correctly (e.g., 3 forms on Free, 100 submissions/month)

4. **Check integrations and dependencies:**
   - What keys, secrets, and external integrations does this feature require
   - Is it connected to another feature (cross-dependencies)
   - Can it be worked on independently / in parallel with other parts

5. **Check Edge Functions:**
   - Connect to the Supabase dashboard
   - Which Edge Functions are deployed for this feature
   - Which functions need to be created or redeployed for full implementation
   - Verify function configuration and secrets

6. **Check i18n/RTL:**
   - Are all UI strings wrapped in `t()` calls
   - Do Hebrew translations exist
   - Is RTL layout correct

### Output per Feature
A focused, comprehensive information file containing:
- Feature name and description
- All pages, components, hooks, tables, triggers, Edge Functions involved
- What works (tested, verified)
- What doesn't work (broken, incomplete, missing)
- Business tier mapping and enforcement status
- Dependencies on other features
- Parallel-work eligibility (can this be fixed independently?)
- Templates, rules, key points, important summaries
- Recommended implementation path for full end-to-end flow

### Completion Rule
The Scanner finishes its work ONLY when ALL important parts of the system have been scanned. It writes a comprehensive work-completion brief covering all parts it has gone through.

**Extensibility:** If new tools or features are added later, the Scanner can be restarted. It reads the last work-summary brief and continues from where it left off with the same protocol.

### Handoff
After all relevant information on a particular part has been collected, the Scanner transfers the report file to Automation 2's queue. This happens in full synchronization — the Scanner can continue scanning the next feature while Automation 2 begins processing.

---

## 5. AUTOMATION 2 — AGENT FACTORY & ORCHESTRATOR (The Builder)

### Purpose
Receive scan reports from Automation 1 and transform them into executable agent folders with comprehensive prompts. Manage the execution queue, decide parallelism, and orchestrate multi-terminal agent runs.

### How It Works — Two Roles

#### Role 1: Agent Plan Creator

When a scan report arrives from Automation 1:

1. **Analyze the report** — Understand the feature, its gaps, and the work required
2. **Create an agent folder** with the standard 4-file structure (AGENT.md, PROMPTS.md, PROGRESS.md, HANDOFF.md)
3. **Write comprehensive prompts** — A wide set of prompts that:
   - Break the work into clear subtasks
   - Each prompt maximizes the capabilities of one focused subtask
   - Include clear instructions for correct, comprehensive implementation
   - Include verification steps (`npm run lint`, `npx tsc --noEmit`, functional tests)
   - Include monitoring tests and documentation essential for synchronization
   - Include context-preservation handoff mechanism

4. **Make two critical parallelism decisions:**

   **Decision A — Internal Parallelism:** Can the agents within this feature's folder work simultaneously, or must they run in a specific sequential order?
   
   **Decision B — Cross-Feature Parallelism:** If agents from another feature are currently running and not yet finished, can THIS feature's agents run at the same time without creating conflicts?

   Rule of thumb: Maximize parallel execution whenever safely possible. Some parts depend on completing another part; some don't. Comprehensive planning can identify which.

#### Role 2: Queue Manager & Orchestrator

The Builder maintains a **master context file** — a dedicated file where it centralizes:
- What is currently in action (running agents)
- What has completed
- What is in the queue waiting
- Cross-feature dependency status

**Queue Rules:**
- When a new scan report arrives while the Builder is still creating agents for the previous feature → the Builder finishes the current work first, then processes the next report
- Before sending agents into action, the Builder checks: is there a running process in another feature that could conflict?
  - If NO conflict → agents go into action immediately (parallel or sequential as decided)
  - If YES conflict → the ready feature enters the queue; when the conflicting work finishes, the queued feature starts under the Builder's supervision

**Agent Execution:**
- The Builder can open multiple Claude Code terminals simultaneously
- Each terminal is one agent executing its prompts
- The Builder monitors each terminal's context health (watching for context window exhaustion)
- If an agent's context is running low → trigger the handoff mechanism (write HANDOFF.md, commit, start fresh session)

### Output per Feature
A complete agent folder ready for execution:
```
.agents-phase-N/
└── feature-name/
    ├── AGENT.md      — Identity, role, owned files, DO NOT TOUCH list
    ├── PROMPTS.md     — Ordered task prompts with verification steps
    ├── PROGRESS.md    — Completion tracking per prompt
    └── HANDOFF.md     — Context bridge for session resume
```

Plus contributions to:
- `SYNC-LOG.md` — Cross-agent coordination log
- `GAP-ANALYSIS.md` — Feature-level gap tracking
- `PHASE-N-COMMANDS.md` — Copy-paste starter prompts for each agent

---

## 6. AGENT FILE STRUCTURE & WORKING METHOD

### Directory Structure
```
FormForge/
├── run-agents-phaseN.sh              ← Bash automation script
├── AUTOMATION-GUIDE-PHASEN.md        ← Step-by-step operation guide
└── .agents-phase-N/
    ├── SYNC-LOG.md                   ← Cross-agent coordination
    ├── GAP-ANALYSIS.md               ← Feature gap tracking
    ├── PHASE-N-COMMANDS.md           ← Copy-paste starter prompts
    ├── feature-1-standard-forms/     ← (AGENT.md, PROMPTS.md, PROGRESS.md, HANDOFF.md)
    ├── feature-2-waitlists/          ← (same 4 files)
    ├── feature-3-feedback-nps/       ← (same 4 files)
    ├── feature-4-support-tickets/    ← (same 4 files)
    ├── feature-5-billing-stripe/     ← (same 4 files)
    ├── feature-6-plan-limits/        ← (same 4 files)
    └── ... (one folder per feature/system part)
```

### The 4 Agent Files Explained

**AGENT.md** — The agent's identity card:
- Agent number and name
- Role and responsibilities
- Owned files (exclusive — only this agent modifies these)
- DO NOT TOUCH list (files other agents own)
- Dependencies (what must be complete before this agent starts)
- Success criteria

**PROMPTS.md** — The agent's task list:
- Ordered prompts (X.0, X.1, X.2, ...) with checkboxes
- Each prompt contains: context, task description, step-by-step instructions, VERIFY block
- Prompts are designed to maximize Claude's capability per subtask
- Includes monitoring, testing, and documentation steps

**PROGRESS.md** — The agent's work log:
- Table with prompt status (Not Started / In Progress / Complete)
- Session log entries appended after each prompt
- Timestamps and notes

**HANDOFF.md** — The agent's context bridge:
- Current status (not started / in progress / complete)
- What was done in the last session
- What files were created or modified
- What decisions were made
- What the next session should do first
- Notes for other agents that depend on this work

### Agent Execution Rhythm
```
Session Start:
  You paste  →  "Read CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md, SYNC-LOG.md"
  Claude     →  Confirms identity and current state

Prompt Loop:
  You type   →  "Execute Prompt X.0"
  Claude     →  Does the work, shows VERIFY results
  You check  →  lint + typecheck pass?
  You commit →  git add -A && git commit -m "Feature X: Prompt X.0 — description"
  You type   →  "Continue to Prompt X.1"
  Claude     →  Does the work...
  (repeat until last prompt)

Context Running Low:
  Claude     →  Proactively writes HANDOFF.md with full state
  You commit →  git commit
  New session → Bootstrap with AGENT.md + HANDOFF.md + PROMPTS.md

Session End:
  Claude     →  Updates PROGRESS.md as COMPLETE, writes final HANDOFF.md
  You commit →  Final git commit for this feature
```

---

## 7. EXECUTION MECHANISM — run-agents Script

### What Must Be Created
Two files per phase:

1. **`run-agents-phaseN.sh`** — Bash automation script that:
   - Reads agent folders in execution order
   - Launches Claude Code terminals per agent
   - Bootstraps each agent with the correct file-reading prompt
   - Manages sequential vs parallel execution based on the Builder's decisions
   - Runs verification (lint, typecheck, test) between prompts
   - Commits after each completed prompt
   - Handles context exhaustion (detects, triggers handoff, restarts)
   - Reports status and progress

2. **`AUTOMATION-GUIDE-PHASEN.md`** — Step-by-step operation guide:
   - Prerequisites (Node.js, Claude Code installed, project cloned)
   - Setup commands
   - How to run the automation
   - How to check status
   - How to resume if interrupted
   - Troubleshooting common issues

### Running the Automation
```bash
# Setup
cd ~/Desktop/FormForge
claude --dangerously-skip-permissions

# Extract and position agent files
tar xzf agents-phase-N-kit.tar.gz && mv .agents-phase-N/* .agents/

# Make script executable
chmod +x run-agents-phaseN.sh

# Check setup
./run-agents-phaseN.sh --status

# Run everything
./run-agents-phaseN.sh

# When complete: each feature does commit + deploy checks
```

### Script Capabilities
```bash
./run-agents-phaseN.sh                # Run all features (sequential/parallel as planned)
./run-agents-phaseN.sh --status       # Show progress across all features
./run-agents-phaseN.sh --feature N    # Run one specific feature's agents
./run-agents-phaseN.sh --resume       # Resume from last checkpoint
```

---

## 8. DELIVERABLES CHECKLIST

### From Automation 1 (The Scanner)
- [ ] Scan report for Standard Forms
- [ ] Scan report for Waitlists
- [ ] Scan report for Feedback/NPS
- [ ] Scan report for Support Tickets
- [ ] Scan report for Billing/Stripe
- [ ] Scan report for Plan Limits & Feature Gating
- [ ] Scan report for Onboarding & Emails
- [ ] Scan report for Webhooks & API
- [ ] Scan report for Integrations (Slack/Zapier/Mailchimp)
- [ ] Scan report for Template Marketplace
- [ ] Scan report for AI Features (Generator, Analysis, Classification, Churn)
- [ ] Scan report for Enterprise (SSO, White-Label, Custom Domains)
- [ ] Scan report for Workflows
- [ ] Scan report for Auth & Settings
- [ ] Scan report for i18n/RTL
- [ ] Scan report for Edge Functions (all 10)
- [ ] Master completion brief covering all parts

### From Automation 2 (The Builder)
- [ ] Agent folders for each feature (4 files each)
- [ ] SYNC-LOG.md — cross-feature coordination
- [ ] GAP-ANALYSIS.md — all gaps identified with fix plans
- [ ] PHASE-N-COMMANDS.md — copy-paste starter prompts
- [ ] Master context file — what's running, completed, queued
- [ ] run-agents-phaseN.sh — bash automation script
- [ ] AUTOMATION-GUIDE-PHASEN.md — operation guide
- [ ] ADMIN role creation agent/prompt

### Post-Execution Verification
- [ ] `npm run lint` — zero errors
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — builds successfully
- [ ] All 4 modes work end-to-end
- [ ] Public pages render without auth
- [ ] Protected pages redirect to /auth
- [ ] Realtime updates work across all modes
- [ ] Billing flow: checkout → webhook → subscription → enforcement
- [ ] i18n: toggle Hebrew ↔ English without regressions
- [ ] Edge Functions: all 10 deployed and responding
- [ ] ADMIN user can access everything without restrictions

---

## 9. END-TO-END EXAMPLE — Standard Forms Feature

This example shows the complete flow for ONE feature to illustrate how both automations work together.

### Step 1: Automation 1 Scans Standard Forms

The Scanner opens a Claude Code terminal in **planning mode** (no code writing) and executes:

**Discovery Protocol:**
```
1. Identify pages: FormBuilder.tsx, Forms.tsx, PublicForm.tsx, FormPreview.tsx, 
   Submissions.tsx, FormDashboard.tsx
   
2. Identify components: FormRenderer.tsx, FormResponsesTab.tsx, 
   builder/FormSettingsPanel.tsx, builder/BrandingPanel.tsx, 
   builder/ConditionalLogic.tsx, embed/SharePanel.tsx, 
   dashboard/DashboardHome.tsx

3. Identify hooks: useForms.ts, useSubmissions.ts, usePagination.ts

4. Identify tables: forms, submissions (with RLS, triggers)

5. Identify Edge Functions: none specific to standard forms 
   (submissions go direct to Supabase)

6. Check end-to-end flows:
   - Create form → add fields → save → activate → public URL works?
   - Public submission → data stored → dashboard shows it?
   - Conditional logic → works in preview?
   - Branding → applies to public page?
   - Share panel → embed code generates correct iframe?
   - Duplicate form → creates working copy?
   - CSV export → downloads correct data?
   - Auto-save → indicator shows and persists?

7. Check business tier:
   - Free: max 3 standard forms, 100 submissions/month
   - Pro+: unlimited forms, 5000+ submissions
   - Is FeatureGate enforcing this?

8. Check cross-dependencies:
   - Form builder is independent of mode-specific features
   - Can be worked on in parallel with waitlist/feedback/support fixes
   - Shares App.tsx routes (coordinate via SYNC-LOG)

9. Check i18n: All form builder labels translated? RTL layout correct?
```

**Output:** A comprehensive report file `standard-forms-scan.md` transferred to Automation 2.

### Step 2: Automation 2 Creates the Agent System

The Builder receives the scan report and:

1. **Analyzes the report** — Identifies 3-4 subtasks (builder fixes, public rendering fixes, submission pipeline, branding/sharing)

2. **Makes parallelism decisions:**
   - Decision A: Agents 1 and 2 (builder + public renderer) can work simultaneously since they touch different files
   - Decision B: No conflict with other running features (waitlist agents touch completely different files)

3. **Creates the agent folder:**
```
.agents-phase-N/feature-standard-forms/
├── AGENT.md       — Owns: FormBuilder.tsx, FormRenderer.tsx, useForms.ts, etc.
├── PROMPTS.md     — 4 prompts covering builder, rendering, submissions, branding
├── PROGRESS.md    — Empty tracking table
└── HANDOFF.md     — Initial state: "Not started"
```

4. **Writes prompts** that are specific, actionable, and include VERIFY blocks

5. **Updates master context** — Notes that standard-forms agents can run parallel with waitlist agents

6. **Triggers execution** via the run-agents script — opens Claude Code terminals for each agent

### Step 3: Agents Execute

Each agent terminal:
1. Reads context files
2. Executes prompts sequentially
3. Runs lint + typecheck after each prompt
4. Commits progress
5. Writes handoff if context runs low
6. Reports completion to PROGRESS.md

### Step 4: Verification & Commit

Once all agents for this feature complete:
- All prompts checked in PROMPTS.md
- `npm run lint && npx tsc --noEmit` pass
- Feature-specific manual verification
- Git commit with descriptive message
- Builder updates master context: "Standard Forms — COMPLETE"

---

## SUMMARY

This dual-automation system transforms the manual process of auditing and fixing a large SaaS application into an organized, parallel, self-documenting pipeline:

1. **Automation 1 (Scanner)** systematically discovers the state of every feature
2. **Automation 2 (Builder)** transforms discoveries into executable agent plans
3. **Agents execute** in parallel or sequential order as decided
4. **The run-agents script** automates the terminal management
5. **Every step is documented** with handoffs, progress tracking, and sync logs
6. **The result:** A fully functional FormForge where every feature works end-to-end

The key insight is that this is NOT about building new things — it's about making everything that exists actually work, reliably, for real users, at production quality.
