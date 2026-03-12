# FormForge — Automation Builder: Exact Order of Operations

> Step-by-step instructions. Follow exactly in this order.
> Total: 3 phases, ~6 steps. Estimated time: 30–45 min planning, then autonomous execution.

---

## OVERVIEW: THE THREE PHASES

```
PHASE A — Learning (Planning Mode, no code)
  Claude reads all source files, builds internal understanding.
  OUTPUT: Nothing visible. Claude's context is loaded.

PHASE B — Planning (Planning Mode, no code)  
  Claude receives the Master Prompt, creates the complete plan.
  OUTPUT: Written plan files on disk (agent folders, scripts, guides).

PHASE C — Execution (Normal Mode, writes code)
  Fresh context. Claude reads its own plan and executes autonomously.
  OUTPUT: Working automation system.
```

**Why three phases instead of two:**
You can't go straight from learning to execution. The learning phase fills context with ~200KB of reference material. The planning phase fills it further with analysis and decisions. By the time you'd want to execute, context is 80%+ consumed and Claude will lose earlier details. The clean break between planning and execution gives Claude a fresh 200K-token window dedicated entirely to building.

---

## PHASE A — LEARNING

### Step A1: Open terminal, navigate to project root

```bash
cd C:\Users\barakm\Desktop\FormForge
```

### Step A2: Start Claude Code

```bash
claude --dangerously-skip-permissions
```

### Step A3: Enter Planning Mode

Press **Shift+Tab** to toggle to Plan mode.

You should see the mode indicator change. In Plan mode, Claude will ONLY read, think, and respond — it cannot create or modify any files. This is critical: we don't want it writing anything yet, just absorbing.

### Step A4: Send the Reading List prompt

Paste this exact prompt:

```
You are the Lead Automation Engineer for FormForge. Before doing anything, you 
must deeply learn the entire system. Read every file listed below IN THIS ORDER. 
Do not summarize, do not plan, do not suggest — just read and confirm you 
understand each file.

READ THESE FILES (in order):

TIER 1 — System identity & rules:
1. CLAUDE.md (entire file — 811 lines, the project constitution)
2. project-briefing-for-new-chat-v3.md (entire file — 569 lines, complete system state)

TIER 2 — Agent architecture:
3. The_Core_Concept__Agent_flow (how agents are started, executed, handed off)
4. _Claude_Code__Terminal_Git_ (Claude Code capabilities: Plan mode, subagents, Agent Teams)

TIER 3 — Proven agent patterns:
5. formforge-agent-plan.md (1,262 lines — the master blueprint with all agent definitions)
6. SYNC-LOG.md (cross-agent coordination log)
7. terminal-commands-reference.md (every command agents use)

TIER 4 — Business context:
8. formforge-business-plan.md (what each feature SHOULD do — acceptance criteria)
9. project-briefing-for-new-chat-v2.md (gap analysis: what exists vs what's needed)

TIER 5 — Automation references:
10. פרומפט_לייצרת_האוטומציה_6 (Phase 6 automation starter commands)
11. Supabase_Master_Audit_Prompt_v2.docx (22-section Supabase audit protocol — 
    NOTE: despite .docx extension this is a plain text file, read it directly)
12. Enterprise_software_delivery_plan_framework (delivery plan framework)

TIER 6 — Supplementary:
13. briefing_for_new_chat_v3__prompt (how the v3 briefing was designed)
14. _הגדרה_ידנית_בדשבורד_של_Supabase (manual Supabase Dashboard settings)
15. README.md (currently broken — still references Lovable)

After reading ALL 15 files, give me a brief confirmation:
- How many tables exist in the database
- How many Edge Functions are deployed
- How many i18n keys exist
- What is the Supabase Project ID
- Name the 4 core modes
- What is the single most important file an agent reads first

Do NOT plan anything yet. Just confirm you've absorbed the system.
```

**Wait for Claude to respond.** It should confirm: 23+ tables, 10 Edge Functions, ~1,050 i18n keys, `rsuolemihuqjvrcpqjpa`, 4 modes (standard/waitlist/feedback/support), CLAUDE.md.

If it gets any of these wrong, it didn't read properly. Tell it to re-read the specific file.

---

## PHASE B — PLANNING

### Step B1: Stay in Planning Mode — send the Master Prompt

Claude is still in Plan mode with all 15 files loaded in context. Now send the Master Prompt.

Paste this exact prompt:

```
Good. Now I need you to design the complete dual-automation system for FormForge.

Read the file: FormForge-Dual-Automation-Master-Prompt.md

This is your blueprint. It describes two automations:
- Automation 1 (The Scanner): Discovers the state of every feature
- Automation 2 (The Builder): Creates agent folders with prompts

YOUR TASK (still in planning mode — do NOT write any files yet):

1. ANALYZE what you've learned from all 15 files and tell me:
   a. How many distinct features/system-parts need to be scanned by Automation 1?
      List each one with a one-line description.
   b. For each feature, what is your parallelism assessment?
      - Can it be scanned independently? (yes/no)
      - Can its fix-agents run in parallel with other features' agents? (yes/no/depends)
   c. What is the optimal execution order?
   d. What cross-feature dependencies exist?

2. DESIGN the agent folder structure:
   - How many agent folders will Automation 2 create?
   - What naming convention?
   - How many prompts per agent (estimate)?
   - Which agents can run simultaneously?

3. DESIGN the run-agents script:
   - What flags does it need? (--status, --feature, --resume, etc.)
   - How does it handle parallel vs sequential?
   - How does it detect context exhaustion?
   - How does it handle the queue?

4. IDENTIFY risks:
   - What could go wrong?
   - What are the biggest context-window challenges?
   - What files are shared and need coordination?

Present this as a structured plan. I will review it before you write anything.
```

**Wait for Claude to respond with the full plan.** Review it carefully. Ask questions if anything is unclear. This is your last chance to course-correct before execution.

### Step B2: Approve the plan and instruct Claude to write

Once you're satisfied with the plan, switch OUT of Planning Mode:

Press **Shift+Tab** again to toggle back to Normal mode.

Then paste:

```
Your plan is approved. Now execute it.

Write ALL output files to disk. Create:

1. The .agents-automation/ directory structure with:
   - AUTOMATION-1-SCANNER/ folder containing:
     - SCANNER-PROTOCOL.md (the scanning protocol for each feature)
     - FEATURE-QUEUE.md (ordered list of features to scan)
     - SCAN-TEMPLATE.md (template for scan reports)
   
   - AUTOMATION-2-BUILDER/ folder containing:
     - BUILDER-PROTOCOL.md (how to create agent folders from scan reports)
     - QUEUE-MANAGER.md (queue management rules)
     - MASTER-CONTEXT.md (the Builder's central state file)
     - AGENT-TEMPLATE/ (template folder with AGENT.md, PROMPTS.md, PROGRESS.md, HANDOFF.md)

2. run-automation.sh — the master bash script that orchestrates both automations

3. AUTOMATION-OPERATIONS-GUIDE.md — step-by-step guide for the operator

4. For each feature identified in your plan:
   - A scan protocol file in AUTOMATION-1-SCANNER/scans/
   - A pre-built agent folder structure in .agents-automation/

5. SYNC-LOG.md — cross-feature coordination log

6. ADMIN-ROLE-SETUP.md — instructions for creating the unrestricted admin user

Write every file completely. Do not use placeholders like "TODO" or "fill in later."
After writing, run: find .agents-automation -type f | wc -l
to confirm the total file count.

When all files are written, write a HANDOFF.md at .agents-automation/HANDOFF.md 
that contains:
- Everything you created
- How to use it
- What the next session needs to do
- The exact command to start execution

This handoff is CRITICAL — the next session will read ONLY this file to continue.
```

**Wait for Claude to finish writing all files.** This will take several minutes. Claude will create dozens of files.

### Step B3: Verify and commit

Once Claude finishes, verify:

```bash
# Check what was created
find .agents-automation -type f | head -50

# Check the handoff exists
cat .agents-automation/HANDOFF.md | head -30

# Commit everything
git add -A
git commit -m "Automation system: complete planning phase — all protocols and agent templates created"
```

### Step B4: Exit Claude Code

```
/exit
```

---

## PHASE C — EXECUTION

### Step C1: Start a fresh Claude Code session

```bash
cd C:\Users\barakm\Desktop\FormForge
claude --dangerously-skip-permissions
```

**This is a brand new context window.** No planning baggage, no reference material weight — just clean execution capacity.

### Step C2: Bootstrap from the handoff

Paste this exact prompt:

```
Read these files in this exact order:

1. CLAUDE.md (project rules — read fully)
2. .agents-automation/HANDOFF.md (what was planned and what to do now)
3. .agents-automation/AUTOMATION-OPERATIONS-GUIDE.md (how to operate)
4. .agents-automation/AUTOMATION-1-SCANNER/SCANNER-PROTOCOL.md (scanning rules)
5. .agents-automation/AUTOMATION-2-BUILDER/BUILDER-PROTOCOL.md (building rules)

You are the Automation Executor. The planning phase is COMPLETE. All protocols, 
templates, and agent structures have been created by the previous session.

Your job now: EXECUTE.

Start with Automation 1 — The Scanner.
Pick the first feature from FEATURE-QUEUE.md.
Run the scan protocol against the live codebase.
Write the scan report.
Then hand it to Automation 2 logic to create the agent folder.

WORKING RULES:
- After each feature scan+build cycle: git add -A && git commit
- Monitor your context usage. When you feel you're at ~70%, STOP.
  Write a HANDOFF.md with exactly what's done and what's next.
  I will start a new session to continue.
- Log everything to MASTER-CONTEXT.md as you go.
- For each feature, record: SCANNED / AGENTS_CREATED / IN_QUEUE / RUNNING / COMPLETE

Begin now with the first feature.
```

### Step C3: Let Claude work autonomously

Claude will now:
1. Read the first feature from the queue
2. Scan the codebase for that feature (files, components, hooks, tables, Edge Functions)
3. Write a scan report
4. Create agent folders with comprehensive prompts
5. Commit
6. Move to the next feature

**Your role during execution:**
- Watch for Claude saying "context is getting long"
- If it stops, commit its work, exit, start fresh session, paste continuation prompt:

```
Read these files in order:
1. CLAUDE.md
2. .agents-automation/HANDOFF.md
3. .agents-automation/AUTOMATION-2-BUILDER/MASTER-CONTEXT.md

You are resuming the Automation Executor. Check HANDOFF.md for where you left off.
Check MASTER-CONTEXT.md for the current state of all features.
Continue from the next incomplete feature in FEATURE-QUEUE.md.
```

- Repeat until all features are scanned and all agent folders are created.

### Step C4: Once all features are processed

Claude should have created:
- Scan reports for every feature
- Agent folders for every feature
- The run-automation.sh script
- Updated MASTER-CONTEXT.md showing all features COMPLETE

Now verify and run:

```bash
# Verify everything
find .agents-automation -type f | wc -l
cat .agents-automation/AUTOMATION-2-BUILDER/MASTER-CONTEXT.md

# Make the run script executable
chmod +x run-automation.sh

# Check status
./run-automation.sh --status

# Start the agents
./run-automation.sh
```

---

## CONTEXT BUDGET GUIDE

Understanding why we split into three phases:

```
Claude Code Context Window: ~200K tokens

PHASE A (Learning):
  15 files × average 5K tokens = ~75K tokens consumed by reading
  + Claude's internal state     = ~15K tokens
  TOTAL: ~90K tokens used, ~110K remaining ← enough for Phase B

PHASE B (Planning + Writing):
  Inherited context from A      = ~90K tokens
  + Planning analysis           = ~30K tokens  
  + Writing files to disk       = ~40K tokens
  TOTAL: ~160K tokens used, ~40K remaining ← tight but sufficient
  
  ⚠️ If Claude slows down or loses details during writing,
     that means context is exhausted. Commit what's written,
     exit, and start Phase C.

PHASE C (Execution):
  Fresh context                 = 200K tokens available
  CLAUDE.md + HANDOFF.md        = ~40K tokens
  Remaining for work            = ~160K tokens ← maximum capacity
  
  Each feature scan+build       ≈ ~15-25K tokens
  So one session can handle     ≈ 6-10 features before needing refresh
```

---

## TROUBLESHOOTING

### Claude won't enter Plan mode
Plan mode is Shift+Tab. If it doesn't toggle, try typing `/plan` or check Claude Code version:
```bash
claude --version
```
Must be a recent version. Update if needed: `npm update -g @anthropic-ai/claude-code`

### Claude starts writing code during Phase A or B
It left Plan mode. Press Shift+Tab to re-enter. Or prefix your prompt with:
```
[PLANNING ONLY — DO NOT WRITE CODE]
```

### Context runs out during Phase B (planning)
This means the codebase is very large. Solution:
1. Let Claude write whatever files it can before stopping
2. It should write HANDOFF.md automatically
3. Commit, exit, start fresh
4. In the new session: "Read HANDOFF.md, continue writing the remaining files"

### Phase C session runs out after only 3-4 features
Normal for a large project. The continuation prompt handles this:
1. Claude writes HANDOFF.md + MASTER-CONTEXT.md
2. Commit, exit, start fresh
3. Paste the continuation prompt from Step C3
4. Claude picks up from the next feature

### Claude's scan misses files
After a scan report is written, quick-check:
```bash
# Example: verify all Standard Forms files are captured
grep -r "FormBuilder\|FormRenderer\|useForms" src/ --include="*.ts" --include="*.tsx" -l
```
If the scan missed files, tell Claude: "Your scan for Standard Forms missed these files: [list]. Update the scan report."

### The run-automation.sh script fails
Most likely a path issue. Check:
```bash
# Verify agent folders exist
ls .agents-automation/

# Verify Claude Code is accessible
claude --version

# Check script permissions
ls -la run-automation.sh
```

---

## QUICK REFERENCE: WHAT YOU TYPE AT EACH MOMENT

| Moment | What You Do |
|--------|-------------|
| Start | `cd FormForge && claude --dangerously-skip-permissions` |
| Enter Plan mode | Press **Shift+Tab** |
| Phase A | Paste the Reading List prompt (Step A4) |
| Wait for confirmation | Claude responds with 6 data points |
| Phase B | Paste the Master Prompt (Step B1) |
| Review plan | Read Claude's analysis, ask questions |
| Approve | Press **Shift+Tab** (exit Plan mode), paste write instructions (Step B2) |
| After writing | `git add -A && git commit`, then `/exit` |
| Phase C | New terminal: `claude --dangerously-skip-permissions` |
| Start execution | Paste bootstrap prompt (Step C2) |
| Context runs out | Claude writes HANDOFF.md → commit → exit → new session → continuation prompt |
| All done | `chmod +x run-automation.sh && ./run-automation.sh --status` |
