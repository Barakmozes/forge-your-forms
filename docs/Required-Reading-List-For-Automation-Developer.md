# FormForge — Required Reading List for Automation System Developer

> Every file in the project knowledge base, categorized by what it teaches you
> about building the dual-automation system. Files are ranked by priority.

---

## READING ORDER (Recommended)

Start here → work downward. Each tier builds on the previous.

```
TIER 1 (Must read first — system identity & rules)
  → CLAUDE.md
  → project-briefing-for-new-chat-v3.md

TIER 2 (Architecture — how agents work)
  → The_Core_Concept__Agent_flow
  → workflow_through_the_terminal_with_the_agents
  → _Claude_Code__Terminal_Git_

TIER 3 (Existing agent implementation — proven patterns)
  → formforge-agent-plan.md
  → SYNC-LOG.md
  → terminal-commands-reference.md

TIER 4 (Business context — what features must work)
  → formforge-business-plan.md
  → project-briefing-for-new-chat-v2.md

TIER 5 (Automation-specific references)
  → פרומפט_לייצרת_האוטומציה_6
  → Supabase_Master_Audit_Prompt_v2.docx
  → Enterprise_software_delivery_plan_framework

TIER 6 (Supplementary context)
  → briefing_for_new_chat_v3__prompt
  → _הגדרה_ידנית_בדשבורד_של_Supabase
  → README.md
```

---

## TIER 1 — SYSTEM IDENTITY & RULES

### 📄 `CLAUDE.md` — 811 lines, 34KB
**Priority:** CRITICAL — Every agent reads this first
**Relevance:** This IS the project's constitution. Every rule, every pattern, every constraint.

**What the automation developer needs from this file:**

| Section | Lines | What It Tells You |
|---------|-------|-------------------|
| §1 Project Overview | 25–67 | App name, tech stack versions, Supabase project ID, dev server port |
| §2 Tech Stack | 46–68 | Locked dependency versions — agents must NOT install new packages |
| §3 Project Structure | 74–170 | Complete file tree — Automation 1 uses this to map features to files |
| §4 Database Schema | 182–416 | All 14 base tables, 9 enums, column details, triggers, RLS policies, realtime config, helper functions — THE reference for Automation 1's database scanning |
| §5 Auth & Authorization | 419–447 | Provider hierarchy, context structure — needed for ADMIN role creation |
| §6 Routing Map | 452–467 | Every route, which component, auth status — Automation 1 uses this to verify page accessibility |
| §7 Architecture Patterns | 471–576 | Mode dispatch, data fetching, realtime, analytics hook, form handling, state management, toast patterns — agents MUST follow these patterns |
| §8 Code Conventions | 579–620 | Import order, component structure, CSS, colors — all agents must comply |
| §9 Component Inventory | 623–640 | 48 shadcn/ui components available |
| §10 Development Commands | 646–666 | npm scripts, migration runner, type generation — used in every VERIFY block |
| §11 Environment Variables | 670–678 | VITE_ vars needed |
| §12 Supabase Workflow | 680–710 | How to create migrations, RLS patterns, realtime setup |
| §13 Mode-Specific Architecture | 718–750 | Per-mode breakdown (standard/waitlist/feedback/support) with public page, admin dashboard, data table, hooks |
| §14 Adding New Features Checklist | 752–810 | Step-by-step for adding modes, features, tables — but our goal is to FIX existing, not add new |
| §15 Known Issues & Technical Debt | 786–810 | 9 known issues — Automation 1 must check each of these |
| §16 Anti-Patterns | 798–811 | 10 things agents must NEVER do |

---

### 📄 `project-briefing-for-new-chat-v3.md` — 569 lines, 31KB
**Priority:** CRITICAL — Complete system state after all 15 agents
**Relevance:** The single most comprehensive snapshot of what exists.

**What the automation developer needs from this file:**

| Section | What It Tells You |
|---------|-------------------|
| Executive Summary | All 5 phases complete, 15 agents, deployment info, GitHub URL |
| The Automation Mechanism | How run-agents.sh works, agent structure, execution flow, key commands — **the exact pattern your new automation must follow** |
| All 15 Agents Registry | Complete deliverable list per agent — Phase 1 (MVP), Phase 2 (Revenue), Phase 3 (Growth), Phase 4 (Intelligence), Phase 5 (Enterprise) |
| i18n Sweeps | 4 sweep runs, ~1,050 total keys, en.json + he.json |
| Tech Stack (Locked) | Same as CLAUDE.md but includes Phase 2+ additions (i18next, Stripe, Resend, Anthropic API) |
| Database Schema (23 Tables) | EXPANDED from CLAUDE.md §4 — includes Phase 2-5 tables: subscriptions, usage, activation_events, webhooks, webhook_deliveries, api_keys, templates, ai_cache, churn_scores, enterprise_settings, custom_domains, workflows, workflow_runs |
| Migrations (001–023) | All 23 migration files listed |
| Supabase Edge Functions (10) | stripe-webhook, send-email, dispatch-webhook, api-v1, slack-notify, ai-generate, ai-analyze, classify-ticket, churn-score, execute-workflow |
| Development Rules (16) | Extended rules including i18n, RTL, feature gating, React Query pattern |
| Routing Map (Complete) | All 22+ routes with auth status and which agent added them |
| Settings Page Tabs | 8 tabs: Workspace, Members, Profile, Billing, Webhooks, API, Integrations, Enterprise — with gating |
| Plan Limits Matrix | Feature-by-tier enforcement table (Free/Pro/Growth/Business) |
| Environment Variables | Client-side (.env) + Supabase Edge Function Secrets |
| Key Hooks & Utilities Reference | 16 hooks/utilities with purpose and location |
| Production Readiness Checklist | Critical/Important/Nice-to-Have items — **this IS the audit checklist for Automation 1** |
| Competitive Positioning | Feature comparison vs Typeform, JotForm, etc. |
| Quick Reference Patterns | Mode dispatch, React Query, realtime, RLS, toast, i18n, RTL, feature gating, plan check, webhook trigger, workflow trigger |

---

## TIER 2 — AGENT ARCHITECTURE & EXECUTION

### 📄 `The_Core_Concept__Agent_flow` — 257 lines, 8.2KB
**Priority:** HIGH — How to run agents step by step
**Relevance:** The proven execution protocol your automation must replicate.

**Key content:**
- Step 1: Starting an agent (`claude --dangerously-skip-permissions`)
- Step 2: The bootstrap prompt pattern (read CLAUDE.md → AGENT.md → HANDOFF.md → PROMPTS.md → SYNC-LOG.md)
- Step 3: Execute prompts sequentially
- Step 4: Between-prompt quality gate (lint + typecheck + commit)
- Step 5: Full rhythm for one agent session
- Step 6: Context exhaustion recovery (write HANDOFF.md → new session → resume)
- Step 7: Moving between agents with dependency chains
- Step 8: When Agent 5 (i18n) runs — AFTER entire phase complete
- Complete lifecycle visual for Phases 2-5
- Quick reference table: what to type at each moment

---

### 📄 `workflow_through_the_terminal_with_the_agents` — 257 lines, 8.2KB
**Priority:** HIGH — Identical content to The_Core_Concept__Agent_flow
**Relevance:** Same file, different name. Contains the exact same agent execution protocol.

**Note:** These two files are duplicates (same content, same byte count: 8,242 bytes). Read one.

---

### 📄 `_Claude_Code__Terminal_Git_` — ~100 lines, 3.7KB
**Priority:** HIGH — Claude Code's advanced capabilities
**Relevance:** Documents features your automation can leverage.

**Key content:**
- **Plan mode** (Shift+Tab): Prevents Claude from writing code, forces exploration/thinking only — **Automation 1 MUST use this mode**
- **Task system**: Supports dependency graphs (DAGs), not flat lists — tasks can block on other tasks
- **Three levels of parallelism:**
  1. Subagents (Explore, Plan, general-purpose, custom) — run inside session
  2. Agent Teams (Opus 4.6, research preview) — multiple Claude instances with own context windows, shared task list, mailbox coordination, autonomous merge
  3. Background agents (Ctrl+B) — spawn and background subagents
- **Context renewal**: /compact command, auto-compaction at ~95%, Session Memory for cross-session continuity
- **Handoff documents**: Structured brief pattern (completed work, current state, in-progress, next steps)

---

## TIER 3 — EXISTING AGENT IMPLEMENTATION

### 📄 `formforge-agent-plan.md` — 1,262 lines, 46KB
**Priority:** HIGH — The master blueprint for Phases 1-4 agents
**Relevance:** Contains every agent definition, every prompt, every conflict matrix — the template your automation must follow.

**What the automation developer needs from this file:**

| Section | What It Tells You |
|---------|-------------------|
| Current State Analysis | What existed at 30 commits — infrastructure, known gaps, technical debt |
| Tech Stack (Locked) | Version table all agents must use |
| Global Development Rules (15) | The rules every agent prompt must enforce |
| Agent Architecture Overview | ASCII diagram showing 4 agents with file ownership |
| **Agent 1 definition** | Role, owned files, DO NOT TOUCH list, 4 prompts (1.1-1.4) with full prompt text |
| **Agent 2 definition** | Role, owned files, DO NOT TOUCH list, 4 prompts (2.1-2.4) with full prompt text |
| **Agent 3 definition** | Role, owned files, DO NOT TOUCH list, 5 prompts (3.1-3.5) with full prompt text |
| **Agent 4 definition** | Role, owned files, DO NOT TOUCH list, 4 prompts (4.1-4.4) with full prompt text |
| Execution Order & Dependencies | Week-by-week schedule showing parallel vs sequential |
| **Conflict Prevention Matrix** | File ownership table — which agent owns which file, shared files marked 🟡 |
| Shared File Coordination Protocol | How App.tsx and Navbar.tsx are shared with comment blocks |
| Post-Development Checklist | 13-item verification checklist |

**Why this matters for the automation developer:** This file is the PROVEN TEMPLATE. Your Automation 2 must produce files structured exactly like this — AGENT.md with role/owned/don't-touch, PROMPTS.md with numbered prompts and VERIFY blocks, file ownership matrix, and dependency ordering.

---

### 📄 `SYNC-LOG.md` — 61 lines, 2KB
**Priority:** MEDIUM — Cross-agent coordination log
**Relevance:** Shows how shared files are coordinated between agents.

**Key content:**
- Shared file tracking for App.tsx (3 agents) and Navbar.tsx (3 agents)
- Migration number reservations per agent
- Cross-agent dependency table
- Conflict resolution log (empty — no conflicts occurred)

---

### 📄 `terminal-commands-reference.md` — 515 lines, 14KB
**Priority:** MEDIUM — Copy-paste command reference
**Relevance:** Every terminal command an agent needs, ready to use.

**Key content:**
- First-time project setup (clone, install, env)
- Starting an agent (first run + continuation patterns)
- Between-prompt commands
- Git commands (commit patterns, undo options)
- Verification commands (lint, typecheck, test, build, grep checks)
- Supabase commands (run migration, regenerate types)
- Deployment commands (Vercel, preview)
- Development server
- Troubleshooting (Claude Code stuck, port in use, TypeScript errors)
- **All 5 agent starter commands** (with full bootstrap prompts for Agents 1-5)
- Quick workflow cheat sheet (visual diagram)

---

## TIER 4 — BUSINESS CONTEXT

### 📄 `formforge-business-plan.md` — 1,020 lines, 49KB (Hebrew)
**Priority:** MEDIUM — Full business plan and feature specifications
**Relevance:** Automation 1 needs this to understand what each feature is SUPPOSED to do.

**What the automation developer needs from this file:**

| Section (Hebrew) | What It Tells You |
|-------------------|-------------------|
| חלק 1: חזון המוצר | Product vision, problem statement, target audience, UVP |
| חלק 2: ארכיטקטורת המוצר | Core architecture diagram, 4 modes in detail (standard/waitlist/feedback/support), shared core engine components |
| חלק 3: מבנה בסיס הנתונים | Full database schema with column definitions — core tables, waitlist tables, feedback tables, support tables, notifications, RLS rules |
| חלק 4: המודל העסקי | **Pricing tiers table** (Free/Pro/Growth/Business with exact limits), conversion triggers, revenue model (MRR projections), go-to-market channels, competitive moat |
| חלק 5: תוכנית פיתוח | **Build prompts for each stage** — Prompt 1.1 (Foundation), 1.2 (Form Builder), 2.1 (Waitlist Public), 2.2 (Waitlist Admin), 3.1 (Feedback Survey), 3.2 (Feedback Analytics), 4.1 (Support Tickets), 4.2 (Support Kanban), 4.3 (Support Analytics) — **these describe what each feature SHOULD do end-to-end** |
| חלק 6: מפת דרכים | Roadmap: Q1-2 Foundation, Q3 Integrations, Q4 Templates, Year 2 AI, Year 3 Enterprise |
| חלק 7: ניתוח תחרותי | Competitive analysis table vs Typeform, JotForm, Google Forms, Tally, Waitlist API, Delighted, Zendesk |
| חלק 8: סיכונים ומענה | Risk analysis (5 risks with probability/impact/mitigation) |
| חלק 9: מדדי הצלחה | KPIs: Activation Rate 40%, Multi-Mode Adoption 30%, MRR targets, Churn <5%, Viral Coefficient >1.2 |

**Why this matters:** The build prompts in Part 5 describe exactly what each feature should do. Automation 1 compares actual behavior against these specifications.

---

### 📄 `project-briefing-for-new-chat-v2.md` — 335 lines, 15KB
**Priority:** MEDIUM — State after Phase 1 (Agents 1-5)
**Relevance:** Shows what existed before Phases 2-5, useful for understanding the foundation.

**Key content:**
- Completed agents 1-5 deliverable summary
- 14-table database schema (pre-Phase 2)
- Development rules (10 rules, pre-i18n/RTL additions)
- Agent system explanation (how it works)
- **Business Model Gap Analysis** — Feature-by-feature matrix: what exists vs what business plan requires. Color-coded: 🔴 Critical (billing), 🟡 High (growth), 🟠 Medium (marketplace/AI), 🟢 Low (enterprise)
- Recommended Phases 2-5 with agent assignments
- i18n workflow for future agents
- KPI targets

---

## TIER 5 — AUTOMATION-SPECIFIC REFERENCES

### 📄 `פרומפט_לייצרת_האוטומציה_6` — ~280 lines, 11KB (Mixed Hebrew/English)
**Priority:** HIGH — Phase 6 automation starter commands
**Relevance:** The exact copy-paste commands for running Phase 6 agents.

**What the automation developer needs from this file:**

| Section | What It Tells You |
|---------|-------------------|
| Execution Order | Agent 16 → 17 → 18 (parallel) → 19 (parallel) → 20 (AFTER all) → Agent 5 i18n → Deploy v6.0 |
| Agent 16 starter (first run) | Bootstrap prompt for Supabase Audit agent — includes working principles, MCP tools instruction, PASS/FAIL/WARN protocol |
| Agent 16 starter (continuation) | Resume prompt with PROGRESS.md reading |
| Agent 17 starter (first + continuation) | Edge Functions agent — must read Agent 16's AUDIT-REPORT.md first |
| Agent 18 starter (first + continuation) | E2E Testing agent — test patterns, mock instructions |
| Agent 19 starter (first + continuation) | DevOps agent — CI/CD YAML validation, GDPR features |
| Agent 20 starter (first + continuation) | Launch Readiness agent — verify ALL other agents complete, no P0 blockers |
| Agent 5 i18n sweep (Phase 6) | Phase-specific i18n prompt targeting new files from Agents 19-20 |
| Quick Workflow Cheat Sheet | Visual diagram of the Phase 6 work cycle |

**Why this matters:** This file IS the PHASE-6-COMMANDS.md equivalent. Your Automation 2 must produce similar files for each phase.

---

### 📄 `Supabase_Master_Audit_Prompt_v2.docx` — 1,106 lines, 37KB (actually UTF-8 text)
**Priority:** HIGH — Comprehensive Supabase audit template
**Relevance:** This is the audit PROTOCOL that Automation 1 should follow for database/edge function scanning.

**Note:** Despite the .docx extension, this is a plain text file.

**22 Sections + 2 Appendices:**

| Section | Lines | What It Covers |
|---------|-------|---------------|
| How To Use | 1-100 | Audit methodology, access methods, PASS/FAIL/WARN protocol, project metadata template |
| §1 Authentication & User Management | 103-203 | Auth providers, signup trigger, session config, MFA |
| §2 Row-Level Security (RLS) | 204-275 | RLS verification queries, policy completeness, public vs authenticated role checking |
| §3 Edge Functions — Config & Security | 276-403 | Per-function checklist: CORS, auth, validation, error handling, deployment verification |
| §4 Secrets & Environment Variables | 404-450 | Secret audit, .env in git check, rotation policy |
| §5 Webhook Endpoints & External Integrations | 451-477 | Stripe webhook, Resend, external service verification |
| §6 Database Schema & Table Audit | 478-542 | Table inventory, column verification, constraint checking |
| §7 Functions, Triggers & Enums | 543-585 | Trigger verification, enum completeness, function audit |
| §8 Realtime & Pub/Sub | 586-603 | Realtime publication verification |
| §9 Storage Buckets & Policies | 604-629 | Storage bucket audit, policy verification |
| §10 Cron Jobs & Scheduled Tasks | 630-654 | Scheduled task verification |
| §11 API Settings & CORS | 655-672 | PostgREST config, CORS headers |
| §12 Billing & Subscription Integration | 673-692 | Stripe integration verification |
| §13 Multi-Tenancy & Workspace Isolation | 693-721 | Cross-workspace data leak testing |
| §14 Rate Limiting & Abuse Prevention | 722-739 | Rate limit verification |
| §15 Compliance, Consent & Suppression | 740-758 | GDPR, consent tracking |
| §16 Logging, Monitoring & Observability | 759-783 | Error logging, monitoring setup |
| §17 Migration History & Schema Drift | 784-805 | Migration consistency, drift detection |
| §18 Client-Side Configuration | 806-826 | Env vars, client config |
| §19 Performance & Indexing | 827-860 | Index audit, query performance |
| §20 Disaster Recovery & Backup | 861-885 | Backup verification |
| §21 Post-Deployment Verification | 886-940 | End-to-end deployment checks |
| §22 Cross-Environment Alignment | 941-961 | Staging vs production consistency |
| Appendix A | 962-1033 | SQL verification quick reference (copy-paste queries) |
| Appendix B | 1034-1106 | Lessons learned from previous audit (LeadFlow project) |

**Why this matters:** This is the most detailed audit protocol in the project. Automation 1 should use Sections 1-22 as its scanning checklist for the Supabase layer. The SQL queries in Appendix A can be executed directly.

---

### 📄 `Enterprise_software_delivery_plan_framework` — ~10 lines, 1.5KB
**Priority:** LOW — Framework prompt for creating delivery plans
**Relevance:** Defines the tone and structure for Automation 2's planning output.

**Key content:**
- Role definition: "Elite Technical Project Manager and Lead Delivery Architect"
- Objective: Deconstruct complex project into phased delivery plan
- Required per phase: goal, definition of done, milestones, bottlenecks, mitigation
- Tone: "authoritative, visionary, and highly structured"

---

## TIER 6 — SUPPLEMENTARY CONTEXT

### 📄 `briefing_for_new_chat_v3__prompt` — ~47 lines, 3.6KB
**Priority:** LOW — The prompt that GENERATED project-briefing-v3
**Relevance:** Shows the thinking process behind the v3 briefing.

**Key content:**
- Role definition for the briefing creator
- Required sections for the briefing document
- Instructions to synthesize from all sources

---

### 📄 `_הגדרה_ידנית_בדשבורד_של_Supabase` — 33 lines, 2KB (Hebrew)
**Priority:** LOW — Manual Supabase Dashboard settings
**Relevance:** Specific settings that must be verified in the Supabase Dashboard.

**Key content:**
1. Authentication → URL Configuration (Site URL: forge-your-forms.vercel.app)
2. Storage → form-uploads bucket (must be Public, needs INSERT policy)
3. Realtime → submissions table must have replication enabled
4. Authentication → Email Templates (customize with FormForge branding)
5. Authentication → Providers → Email enabled, confirm email ON

**Why this matters:** Automation 1 should verify each of these dashboard settings.

---

### 📄 `README.md` — 73 lines, 2.2KB
**Priority:** LOW — Currently still has Lovable references
**Relevance:** Shows the README hasn't been properly rewritten (Agent 1 was supposed to fix this).

**Key finding:** The README still says "Welcome to your Lovable project" and links to lovable.dev. This is a concrete example of something Automation 1 should flag as incomplete.

---

## CROSS-REFERENCE: WHICH FILES FEED WHICH AUTOMATION

### Automation 1 (The Scanner) Must Read:

| File | What Scanner Gets From It |
|------|--------------------------|
| `CLAUDE.md` §3-4, §6, §13-15 | File tree, database schema, routes, mode architecture, known issues |
| `project-briefing-for-new-chat-v3.md` | Complete feature registry, all 23 tables, 10 Edge Functions, production checklist |
| `formforge-business-plan.md` Part 5 | What each feature SHOULD do (acceptance criteria) |
| `project-briefing-for-new-chat-v2.md` Gap Analysis | Feature gap matrix — what's built vs what's needed |
| `Supabase_Master_Audit_Prompt_v2.docx` | 22-section audit protocol with SQL queries |
| `_הגדרה_ידנית_בדשבורד_של_Supabase` | Dashboard-specific settings to verify |
| `README.md` | Example of incomplete Phase 1 work |

### Automation 2 (The Builder) Must Read:

| File | What Builder Gets From It |
|------|--------------------------|
| `formforge-agent-plan.md` | The TEMPLATE for agent structure — copy this pattern |
| `The_Core_Concept__Agent_flow` | Exact execution protocol (bootstrap → prompt loop → handoff) |
| `_Claude_Code__Terminal_Git_` | Claude Code capabilities (Plan mode, subagents, Agent Teams, background agents) |
| `SYNC-LOG.md` | How shared files are coordinated between agents |
| `terminal-commands-reference.md` | All commands agents need |
| `פרומפט_לייצרת_האוטומציה_6` | Phase 6 starter commands — the exact pattern to replicate |
| `Enterprise_software_delivery_plan_framework` | Tone and structure for delivery plans |
| `CLAUDE.md` §7-8, §10, §14, §16 | Patterns agents must follow, commands, anti-patterns |

### Both Automations Must Read:

| File | Why |
|------|-----|
| `CLAUDE.md` | Global rules both must enforce |
| `project-briefing-for-new-chat-v3.md` | System state both need for context |

---

## QUICK-ACCESS: KEY DATA POINTS SCATTERED ACROSS FILES

| Data Point | Where to Find It |
|-----------|-----------------|
| Supabase Project ID | CLAUDE.md line 31: `rsuolemihuqjvrcpqjpa` |
| GitHub URL | v3 briefing: `https://github.com/Barakmozes/forge-your-forms` |
| Production URL | v3 briefing + הגדרה_ידנית: `https://forge-your-forms.vercel.app` |
| Dev server port | CLAUDE.md line 32: `8080` |
| All 23 table names | v3 briefing §Database Schema |
| All 10 Edge Functions | v3 briefing §Edge Functions |
| All 22+ routes | v3 briefing §Routing Map |
| All 16 hooks | v3 briefing §Key Hooks Reference |
| Pricing tiers & limits | v3 briefing §Plan Limits Matrix + business-plan Part 4 |
| All 9 enums + values | CLAUDE.md §4 Enums |
| All triggers | CLAUDE.md §4 Triggers |
| All RLS patterns | CLAUDE.md §4 RLS Policy Summary |
| Migration numbering | SYNC-LOG.md + v3 briefing (001-023 exist) |
| Required secrets | v3 briefing §Environment Variables |
| i18n key count | v3 briefing: ~1,050+ keys |
| Agent file structure | formforge-agent-plan.md + The_Core_Concept |
| Run-agents script pattern | v3 briefing §Automation Mechanism |
| Known technical debt | CLAUDE.md §15 (9 items) |
| README still broken | README.md (still shows Lovable) |
