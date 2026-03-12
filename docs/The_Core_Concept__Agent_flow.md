The Core Concept
Each "agent" is simply a separate Claude Code terminal session (or a separate Claude chat). You run one agent at a time per terminal. The .agents/ folder files are the agent's "brain" — they tell Claude who it is, what it owns, and what to do.

Step 1: Starting an Agent
Open your terminal in the project root and launch Claude Code:
bashclaude --dangerously-skip-permissions
```

This opens an interactive Claude session connected to your codebase.

---

## Step 2: The First Prompt (Always the Same Pattern)

The very first thing you paste into **every** agent session is the **bootstrap prompt**. For Agent 6 it looks like this:
```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-6-billing/AGENT.md
3. .agents/agent-6-billing/HANDOFF.md
4. .agents/agent-6-billing/PROMPTS.md
5. .agents/SYNC-LOG.md

After reading, tell me:
- Your agent number and role
- Your owned files
- Your DO NOT TOUCH files
- Which prompt you will execute first
```

Claude reads everything, confirms its identity, and says something like: *"I am Agent 6 — Billing & Stripe Integration. I will start with Prompt 6.0..."*

---

## Step 3: Execute Prompt 6.0

Now you simply tell it:
```
Execute Prompt 6.0
```

Claude performs the planning task — reads the codebase, creates the PLAN.md, updates PROGRESS.md. When it finishes, it tells you it's done and shows the VERIFY results.

---

## Step 4: Between-Prompt Checkpoint

After each prompt completes, you do a **quality gate** before moving on. Type:
```
Run the verification:
npm run lint
npx tsc --noEmit
If both pass clean, you commit and proceed:
bash# You do this in a separate terminal (not inside Claude)
git add -A
git commit -m "Agent 6: Prompt 6.0 complete — planning"
```

Then back in the Claude session:
```
Continue to Prompt 6.1
```

That's it. Claude reads the next prompt from PROMPTS.md and executes it.

---

## Step 5: The Full Rhythm for One Agent
```
Session start:
  You paste  →  "Read CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md, SYNC-LOG.md"
  Claude     →  Confirms identity

Prompt loop:
  You type   →  "Execute Prompt 6.0"
  Claude     →  Does the work, shows VERIFY results
  You check  →  lint + typecheck pass?
  You commit →  git add -A && git commit
  You type   →  "Continue to Prompt 6.1"
  Claude     →  Does the work...
  (repeat until last prompt)

Session end:
  Claude     →  Updates PROGRESS.md as COMPLETE, writes HANDOFF.md
  You commit →  Final git commit for this agent
```

---

## Step 6: What If Context Runs Out Mid-Agent?

Claude Code has a context window limit. If the session gets too long (usually after 3–4 heavy prompts), Claude will slow down or lose earlier context. When you notice this:

**Tell Claude before closing:**
```
You're running low on context. Write your current state to:
.agents/agent-6-billing/HANDOFF.md

Include: what's done, what's not done, which prompt you're on,
any decisions you made, any files you created/modified.
```

Claude writes the handoff. You commit it. Then **open a new session** and bootstrap again:
```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-6-billing/AGENT.md
3. .agents/agent-6-billing/HANDOFF.md  ← this now has the mid-session state
4. .agents/agent-6-billing/PROMPTS.md
5. .agents/agent-6-billing/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 6. Check PROGRESS.md and HANDOFF.md 
to see where you left off. Continue from the next incomplete prompt.
```

Claude picks up exactly where it stopped.

---

## Step 7: Moving Between Agents (Phase 2 Example)

Phase 2 has three agents (6, 7, 8) with dependencies:
```
Agent 6 (Billing)     ← runs FIRST (no dependencies)
    ↓
Agent 7 (Limits)      ← needs Agent 6's useSubscription hook
    ↓
Agent 8 (Onboarding)  ← needs Agent 6 + can run in parallel with late Agent 7
```

**Practically, you do this:**
```
Terminal 1:
  claude --dangerously-skip-permissions
  → Bootstrap Agent 6
  → Execute 6.0 → 6.1 → 6.2 → 6.3 → 6.4
  → Agent 6 writes HANDOFF.md as COMPLETE
  → git commit

Terminal 1 (new session) or Terminal 2:
  claude --dangerously-skip-permissions
  → Bootstrap Agent 7
  → Prompt 7.0 verifies Agent 6 deliverables exist
  → Execute 7.0 → 7.1 → 7.2 → 7.3 → 7.4
  → Agent 7 writes HANDOFF.md as COMPLETE
  → git commit

Terminal 1 (new session) or Terminal 3:
  claude --dangerously-skip-permissions
  → Bootstrap Agent 8
  → Execute 8.0 → 8.1 → 8.2 → 8.3 → 8.4
  → Agent 8 writes HANDOFF.md as COMPLETE
  → git commit
```

---

## Step 8: When Does Agent 5 (i18n) Run?

**The rule is simple: Agent 5 runs AFTER an entire phase is complete and committed. Never during.**

Here's exactly how you know it's time:
```
✅ Agent 6 PROGRESS.md says COMPLETE
✅ Agent 7 PROGRESS.md says COMPLETE
✅ Agent 8 PROGRESS.md says COMPLETE
✅ npm run lint passes on the full codebase
✅ npx tsc --noEmit passes
✅ npm run test passes
✅ All three agents' work is committed to git

→ NOW it's time for Agent 5
```

You open a new Claude session and give Agent 5 a **phase-specific prompt**:
```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-5-i18n/AGENT.md
3. .agents/agent-5-i18n/HANDOFF.md
4. .agents/SYNC-LOG.md

You are Agent 5 — i18n & RTL. Phase 2 is complete (Agents 6, 7, 8).
Your task:

1. Scan src/ for hardcoded English strings not wrapped in t().
   Focus on NEW files created by Agents 6-8:
   - src/components/billing/
   - src/components/upgrade/
   - src/components/onboarding/
   - src/hooks/useSubscription.ts
   - src/hooks/usePlanLimits.ts
   - src/hooks/useUsage.ts
   - src/hooks/useOnboarding.ts

2. Add all new keys to en.json under these namespaces:
   billing.*, limits.*, upgrade.*, onboarding.*, emails.*

3. Translate all new keys to he.json with accurate Hebrew.

4. Replace hardcoded strings with t() calls.

5. Fix RTL layout for new components:
   - Upgrade modals, billing portal, onboarding wizard steps
   - Use Tailwind logical properties (ms-, me-, ps-, pe-)

6. DO NOT modify any existing translated keys.
   Only add NEW keys that don't exist yet.

VERIFY:
- Toggle language to Hebrew — every new screen shows Hebrew
- Toggle back to English — no regressions
- RTL layout correct on all new components
- npm run lint + npx tsc --noEmit pass
```

Agent 5 runs, translates the delta, commits. **Then you deploy.**

---

## The Complete Lifecycle Visual
```
PHASE 2:
  Terminal → Agent 6 (5 prompts) → commit → done
  Terminal → Agent 7 (5 prompts) → commit → done
  Terminal → Agent 8 (5 prompts) → commit → done
  ✅ All three complete?
  Terminal → Agent 5 (i18n sweep) → commit
  🚀 Deploy v2.0

PHASE 3:
  Terminal → Agent 9  (5 prompts) → commit → done
  Terminal → Agent 10 (4 prompts) → commit → done
  Terminal → Agent 11 (5 prompts) → commit → done
  ✅ All three complete?
  Terminal → Agent 5 (i18n sweep) → commit
  🚀 Deploy v3.0

PHASE 4:
  Terminal → Agent 12 (4 prompts) → commit → done
  Terminal → Agent 13 (4 prompts) → commit → done
  ✅ Both complete?
  Terminal → Agent 5 (i18n sweep) → commit
  🚀 Deploy v4.0

PHASE 5:
  Terminal → Agent 14 (4 prompts) → commit → done
  Terminal → Agent 15 (5 prompts) → commit → done
  ✅ Both complete?
  Terminal → Agent 5 (i18n sweep — FINAL) → commit
  🚀 Deploy v5.0

Quick Reference: What You Type
MomentWhat You Paste / TypeStart agent"Read CLAUDE.md, AGENT.md, HANDOFF.md, PROMPTS.md, SYNC-LOG.md"First prompt"Execute Prompt X.0"Next prompt"Continue to Prompt X.1"Between promptsnpm run lint + npx tsc --noEmit + git commitContext running out"Write your state to HANDOFF.md" → new session → resumeAgent finishedCheck PROGRESS.md says COMPLETE → start next agentPhase finishedAll agents COMPLETE → run Agent 5 with phase-specific i18n promptAfter Agent 5npm run build → deploy
The Prompt 0 (planning) of each agent acts as a safety gate — it verifies that all dependencies from previous agents actually exist before writing any code. If something's missing, it stops and tells you, so you never build on an incomplete foundation.