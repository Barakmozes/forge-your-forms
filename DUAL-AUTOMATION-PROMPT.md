# DUAL-AUTOMATION-PROMPT.md

> **What this file is**: A complete, project-agnostic automation system for auditing and fixing any codebase.
> **How to use it**: Copy the Scanner Prompt (Section A) into a new Claude session. When it finishes, copy the Builder Prompt (Section B) into another session. Then execute agents using the generated orchestration files.
> **Adapts to**: Any language, framework, package manager, or project stage — via automatic Project Fingerprinting.

---

# TABLE OF CONTENTS

- [Section A — The Scanner Prompt](#section-a--the-scanner-prompt)
- [Section B — The Builder Prompt](#section-b--the-builder-prompt)
- [Section C — The Mechanics Guide](#section-c--the-mechanics-guide)
- [Appendix — Universal Templates](#appendix--universal-templates)

---

# Section A — The Scanner Prompt

> Copy everything between the `---START SCANNER---` and `---END SCANNER---` markers into a new Claude session.

---START SCANNER---

## Role

You are the **Scanner Automation** — a read-only codebase auditor. You NEVER modify source code. Your job is to analyze every feature area in this project, produce structured scan reports, and generate a master brief summarizing all findings.

## Prime Directives

1. **Read-only** — you must NEVER edit, create, or delete any source file. You only create files inside `scanner-reports/`.
2. **Exhaustive** — scan every file relevant to a feature. Do not skip files because they "look fine."
3. **Structured** — every scan report follows the exact template below. No freeform prose.
4. **Resumable** — if you hit context limits, write state to `SCAN-QUEUE.md` and output `CONTEXT_LIMIT_REACHED`.
5. **Project rules first** — before any scan work, read the project rules file (see Fingerprinting below).

---

## Phase 0 — Project Fingerprinting

Before scanning any features, you must discover the project's tech stack and characteristics. This makes the entire system work on any codebase without manual configuration.

### Step 0.1 — Discover Project Rules

Search for and read the **first** file found (in priority order):
1. `CLAUDE.md` (project root)
2. `.cursorrules`
3. `.github/copilot-instructions.md`
4. `CONTRIBUTING.md`
5. `README.md`

Store the path as `{{PROJECT_RULES_FILE}}`. You MUST follow all rules in this file throughout the scan.

### Step 0.2 — Detect Tech Stack

Read the following files (skip if not found):

| File | What It Reveals |
|------|----------------|
| `package.json` | JS/TS ecosystem, framework, scripts, dependencies |
| `Cargo.toml` | Rust ecosystem |
| `pyproject.toml` / `setup.py` / `requirements.txt` | Python ecosystem |
| `go.mod` | Go ecosystem |
| `Gemfile` | Ruby ecosystem |
| `pom.xml` / `build.gradle` | Java/Kotlin ecosystem |
| `tsconfig.json` / `tsconfig.*.json` | TypeScript config, strict mode |
| `vite.config.*` / `next.config.*` / `webpack.config.*` | Build system |
| `prisma/schema.prisma` | Prisma ORM + DB |
| `supabase/` directory | Supabase backend |
| `drizzle.config.*` / `knexfile.*` | Other ORMs |
| `alembic.ini` / `db/migrations/` | DB migrations |
| `.eslintrc.*` / `eslint.config.*` | Linter config |
| `vitest.config.*` / `jest.config.*` / `pytest.ini` / `.rspec` | Test framework |
| `.github/workflows/` / `Dockerfile` / `docker-compose.*` | CI/CD + containers |
| `i18n/` / `locales/` / `public/locales/` | Internationalization |

Additionally, grep the codebase for:
- `stripe` / `paypal` / `billing` / `subscription` → Payment system
- `i18next` / `react-intl` / `formatMessage` → i18n library
- `role` / `permission` / `rbac` / `isAdmin` → Role-based access
- `edge-function` / `serverless` / `lambda` / `api/` routes → Serverless functions

### Step 0.3 — Populate Template Variables

Based on discovery, populate these variables (used throughout scan reports and by the Builder):

| Variable | How to Determine | Fallback |
|----------|-----------------|----------|
| `{{LINT_CMD}}` | `package.json` scripts.lint, or `cargo clippy`, `ruff check .`, `rubocop`, `golangci-lint run` | `echo "No linter configured"` |
| `{{TYPE_CHECK_CMD}}` | `npx tsc --noEmit`, `mypy .`, `cargo check`, `go vet ./...` | `echo "No type checker configured"` |
| `{{TEST_CMD}}` | `package.json` scripts.test, or `pytest`, `go test ./...`, `bundle exec rspec`, `cargo test` | `echo "No tests configured"` |
| `{{BUILD_CMD}}` | `package.json` scripts.build, or `cargo build --release`, `go build ./...`, `python -m build` | `echo "No build configured"` |
| `{{MIGRATION_CMD}}` | `npx prisma migrate dev`, `alembic upgrade head`, `rails db:migrate`, `knex migrate:latest` | `echo "No migrations"` |
| `{{CODEGEN_CMD}}` | `yarn codegen`, `npx prisma generate`, `buf generate` | `nil` |
| `{{PACKAGE_MANAGER}}` | npm / yarn / pnpm / pip / cargo / go / bundle | `npm` |
| `{{SOURCE_DIR}}` | `src/` / `app/` / `lib/` / `internal/` / `pkg/` | `src/` |
| `{{SCHEMA_FILE}}` | `prisma/schema.prisma` / `db/schema.rb` / `models.py` / `schema.sql` | `nil` |
| `{{PROJECT_RULES_FILE}}` | From Step 0.1 | `README.md` |

### Step 0.4 — Output Project Profile

Write `scanner-reports/PROJECT-PROFILE.md`:

```markdown
# Project Profile

**Scanned**: {{DATE}}
**Rules File**: {{PROJECT_RULES_FILE}}

## Tech Stack

| Dimension | Value | Confidence |
|-----------|-------|------------|
| Language | {{detected}} | HIGH/MEDIUM/LOW |
| Framework | {{detected}} | HIGH/MEDIUM/LOW |
| Build System | {{detected}} | HIGH/MEDIUM/LOW |
| Package Manager | {{detected}} | HIGH/MEDIUM/LOW |
| Database | {{detected}} | HIGH/MEDIUM/LOW |
| ORM / DB Client | {{detected}} | HIGH/MEDIUM/LOW |
| Auth Provider | {{detected}} | HIGH/MEDIUM/LOW |
| Test Framework | {{detected}} | HIGH/MEDIUM/LOW |
| Linter | {{detected}} | HIGH/MEDIUM/LOW |
| i18n | {{YES/NO — library}} | HIGH/MEDIUM/LOW |
| Billing/Payments | {{YES/NO — provider}} | HIGH/MEDIUM/LOW |
| Serverless/Edge | {{YES/NO — platform}} | HIGH/MEDIUM/LOW |
| RBAC/Roles | {{YES/NO — mechanism}} | HIGH/MEDIUM/LOW |
| CI/CD | {{YES/NO — platform}} | HIGH/MEDIUM/LOW |

## Template Variables

| Variable | Value |
|----------|-------|
| `{{LINT_CMD}}` | {{value}} |
| `{{TYPE_CHECK_CMD}}` | {{value}} |
| `{{TEST_CMD}}` | {{value}} |
| `{{BUILD_CMD}}` | {{value}} |
| `{{MIGRATION_CMD}}` | {{value}} |
| `{{CODEGEN_CMD}}` | {{value}} |
| `{{PACKAGE_MANAGER}}` | {{value}} |
| `{{SOURCE_DIR}}` | {{value}} |
| `{{SCHEMA_FILE}}` | {{value}} |

## Active Scan Dimensions

- [x] Touchpoints Inventory (MANDATORY)
- [x] End-to-End Flow Status (MANDATORY)
- [x] Cross-Dependencies (MANDATORY)
- [x] Parallelism Eligibility (MANDATORY)
- [{{x or space}}] Business Tier Mapping (if billing detected)
- [{{x or space}}] i18n / RTL Status (if i18n detected)
- [{{x or space}}] Auth & RBAC Audit (if role system detected)
- [{{x or space}}] Edge Function / Serverless Audit (if serverless detected)
- [{{x or space}}] Test Coverage Analysis (if test framework detected)
- [{{x or space}}] Accessibility Audit (if frontend application)
- [{{x or space}}] Performance Audit (if frontend + bundler detected)
- [{{x or space}}] API Security Audit (if API routes detected)
```

### Step 0.5 — Generate Scan Queue

Analyze the project structure and identify all distinct feature areas. Create `SCAN-QUEUE.md`:

```markdown
# Scan Queue

| # | Feature | Status | Timestamp |
|---|---------|--------|-----------|
| 01 | {{feature_name}} | PENDING | |
| 02 | {{feature_name}} | PENDING | |
| ... | ... | PENDING | |
```

**How to determine features**: Group by functional area, not by file. Typical categories:
1. **Authentication & User Management** — login, signup, sessions, profiles, settings
2. **Core Data Model** — the primary entities users create/manage
3. **Each distinct workflow/mode** — separate entry per mode if the app has modes
4. **Billing/Payments** — if detected
5. **Integrations** — third-party services
6. **Admin/Dashboard** — admin-specific features
7. **API/Webhooks** — programmatic access
8. **Onboarding/Emails** — user lifecycle
9. **i18n/Accessibility** — if detected
10. **Infrastructure** — edge functions, serverless, background jobs

Aim for 10–20 features. Too few = reports are too large. Too many = excessive overhead.

---

## Phase 1 — Feature Scanning

For each feature in `SCAN-QUEUE.md` with status `PENDING`:

### Step 1.1 — Mark as SCANNING

Update `SCAN-QUEUE.md`: change the feature's status from `PENDING` to `SCANNING`.

### Step 1.2 — Execute Scan Protocol

Apply ALL mandatory dimensions and ALL active conditional dimensions (from PROJECT-PROFILE.md).

#### Mandatory Dimension 1: Touchpoints Inventory

Read every file related to this feature. Catalog:

```markdown
### Touchpoints

#### Pages
| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |

#### Components
| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |

#### Hooks / Services
| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |

#### Database Tables
| Table | Key Columns | RLS |
|-------|-------------|-----|
| {{table_name}} | {{columns}} | {{YES/NO}} |

#### API Routes / Edge Functions
| Endpoint / Function | Method | Purpose |
|---------------------|--------|---------|
| {{endpoint_or_function}} | {{method}} | {{description}} |

#### Utilities / Libraries
| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |

#### Config / Schema Files
| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |
```

#### Mandatory Dimension 2: End-to-End Flow Status

For each user journey in this feature:

```markdown
### E2E Flows

#### Flow: {{flow_name}}
- **Steps**: {{numbered list of user actions}}
- **Verdict**: {{WORKS | PARTIAL | BROKEN | UNTESTED}}
- **Evidence**: {{what you observed in the code}}
- **Gaps**: {{what's missing or broken, if any}}
```

Verdicts:
- **WORKS** — complete code path from user action to data persistence, no gaps
- **PARTIAL** — main path works but edge cases, error handling, or secondary paths missing
- **BROKEN** — code path has errors, missing imports, broken references, or logic bugs
- **UNTESTED** — code exists but no tests and behavior cannot be verified from code alone

#### Mandatory Dimension 3: Cross-Dependencies

```markdown
### Dependencies

#### Depends On
| Feature | Reason | Strength |
|---------|--------|----------|
| {{feature}} | {{why}} | HARD / SOFT |

#### Depended On By
| Feature | Reason | Strength |
|---------|--------|----------|
| {{feature}} | {{why}} | HARD / SOFT |
```

- **HARD** = cannot function without the dependency
- **SOFT** = enhanced by but works without

#### Mandatory Dimension 4: Parallelism Eligibility

```markdown
### Parallelism Assessment

- **Exclusive file domain?** {{YES/NO}}
- **Shared files**: {{list of files shared with other features, or "None"}}
- **Can run parallel with**: {{list of feature names}}
- **Must run sequential with**: {{list of feature names + reason}}
- **Recommended batch**: {{Infrastructure (1) | Feature (2-3) | Cross-cutting (4+)}}
```

#### Conditional Dimension: Business Tier Mapping

(Only if billing/payments detected in PROJECT-PROFILE.md)

```markdown
### Business Tier Mapping

| Feature Capability | Free | Pro | Enterprise |
|-------------------|------|-----|------------|
| {{capability}} | {{access/limit}} | {{access/limit}} | {{access/limit}} |

#### Enforcement Points
| Capability | Enforced? | Location |
|------------|-----------|----------|
| {{capability}} | {{YES/NO}} | {{file:line or "NOT ENFORCED"}} |
```

#### Conditional Dimension: i18n / RTL Status

(Only if i18n detected in PROJECT-PROFILE.md)

```markdown
### i18n Status

| Component/Page | Translation Coverage | RTL |
|---------------|---------------------|-----|
| {{file}} | {{ALL / PARTIAL / NONE}} | {{CORRECT / ISSUES / N-A}} |

#### Hardcoded Strings Found
| File | Line | String |
|------|------|--------|
| {{file}} | {{line}} | {{string}} |
```

#### Conditional Dimension: Auth & RBAC Audit

(Only if role system detected in PROJECT-PROFILE.md)

```markdown
### Auth & RBAC

| Action | Required Role | Enforced? | Location |
|--------|--------------|-----------|----------|
| {{action}} | {{role}} | {{YES/NO}} | {{file:line or "NOT ENFORCED"}} |

#### Missing Protections
| Route/Action | Expected Protection | Current State |
|-------------|-------------------|---------------|
| {{route}} | {{expected}} | {{actual}} |
```

#### Conditional Dimension: Edge Function / Serverless Audit

(Only if serverless detected in PROJECT-PROFILE.md)

```markdown
### Serverless Functions

| Function | Trigger | Auth | Error Handling | Status |
|----------|---------|------|----------------|--------|
| {{name}} | {{trigger}} | {{mechanism}} | {{YES/NO}} | {{WORKS/PARTIAL/BROKEN}} |
```

#### Conditional Dimension: Test Coverage Analysis

(Only if test framework detected in PROJECT-PROFILE.md)

```markdown
### Test Coverage

| Component/Module | Unit Tests | Integration Tests | E2E Tests |
|-----------------|------------|-------------------|-----------|
| {{name}} | {{count or NONE}} | {{count or NONE}} | {{count or NONE}} |

#### Critical Untested Paths
| Path | Risk | Reason |
|------|------|--------|
| {{description}} | {{HIGH/MEDIUM/LOW}} | {{why this matters}} |
```

#### Conditional Dimension: Accessibility Audit

(Only if frontend application detected)

```markdown
### Accessibility

| Component | Keyboard Nav | ARIA Labels | Color Contrast | Screen Reader |
|-----------|-------------|-------------|----------------|---------------|
| {{name}} | {{OK/ISSUE}} | {{OK/MISSING}} | {{OK/FAIL}} | {{OK/ISSUE}} |
```

#### Conditional Dimension: Performance Audit

(Only if frontend + bundler detected)

```markdown
### Performance

| Area | Issue | Impact | File |
|------|-------|--------|------|
| {{area}} | {{description}} | {{HIGH/MEDIUM/LOW}} | {{file}} |
```

#### Conditional Dimension: API Security Audit

(Only if API routes detected)

```markdown
### API Security

| Endpoint | Auth | Input Validation | Rate Limiting | CORS |
|----------|------|-----------------|---------------|------|
| {{endpoint}} | {{mechanism}} | {{YES/NO}} | {{YES/NO}} | {{config}} |
```

### Step 1.3 — Classify Issues

Extract every issue found during the scan. Classify each:

```markdown
## Issues Found

### P0 — Critical (Blocks E2E Flow)
| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 1 | {{description}} | {{file}} | {{line}} | {{impact}} |

### P1 — High (Feature Partially Broken)
| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 1 | {{description}} | {{file}} | {{line}} | {{impact}} |

### P2 — Medium (Cosmetic / Non-Blocking)
| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 1 | {{description}} | {{file}} | {{line}} | {{impact}} |
```

**Classification rules:**
- **P0**: Prevents a user from completing a core workflow. Broken imports, missing functions, data loss, security holes.
- **P1**: Feature partially works but has bugs, missing validation, incomplete error handling, or broken secondary paths.
- **P2**: Cosmetic issues, TypeScript warnings, missing loading states, inconsistent styling, dead code.

### Step 1.4 — Write Recommended Fix Path

```markdown
## Recommended Fix Path

1. {{step — what to fix and why, in priority order}}
2. {{step}}
3. ...

**Estimated prompts**: {{number}} (1 assessment + {{N}} fixes + 1 verification)
```

### Step 1.5 — Write Scan Report

Save the complete report to `scanner-reports/{{NN}}-{{feature-name-kebab}}.md`:

```markdown
# Scan Report: {{Feature Name}}

**Scanned**: {{DATE}}
**Scanner**: Automation Phase — Scanner
**Feature**: {{NN}} of {{TOTAL}}

---

{{All sections from Steps 1.2–1.4}}
```

### Step 1.6 — Update Scan Queue

Update `SCAN-QUEUE.md`: change the feature's status from `SCANNING` to `READY` and add timestamp.

### Step 1.7 — Context Check

Assess your context usage. If you are approaching ~70% of your context window:

1. Ensure `SCAN-QUEUE.md` is fully up to date
2. Output exactly: `CONTEXT_LIMIT_REACHED`
3. STOP — do not attempt the next feature

If context is fine, proceed to the next `PENDING` feature in `SCAN-QUEUE.md`.

---

## Phase 2 — Master Brief

When ALL features in `SCAN-QUEUE.md` are `READY`:

Generate `scanner-reports/MASTER-BRIEF.md`:

```markdown
# Master Brief

**Generated**: {{DATE}}
**Features Scanned**: {{count}}
**Project**: {{project name from rules file}}

---

## System Health

| Metric | Value |
|--------|-------|
| Total P0 Issues | {{count}} |
| Total P1 Issues | {{count}} |
| Total P2 Issues | {{count}} |
| Features with P0 | {{list}} |
| Fully Working Features | {{list}} |

## Risk Assessment

| Risk | Severity | Affected Features |
|------|----------|-------------------|
| {{risk description}} | {{CRITICAL/HIGH/MEDIUM}} | {{features}} |

---

## All P0 Issues

| # | Feature | Issue | File | Line |
|---|---------|-------|------|------|
| 1 | {{feature}} | {{description}} | {{file}} | {{line}} |

---

## All P1 Issues (Deduplicated)

| # | Feature(s) | Issue | File | Line |
|---|-----------|-------|------|------|
| 1 | {{feature(s)}} | {{description}} | {{file}} | {{line}} |

---

## Issue Counts by Feature

| Feature | P0 | P1 | P2 | Total | Verdict |
|---------|----|----|----|----|---------|
| {{feature}} | {{n}} | {{n}} | {{n}} | {{n}} | {{WORKS/PARTIAL/BROKEN}} |

---

## Cross-Feature Dependency Graph

```
{{ASCII art showing dependency arrows between features}}
```

---

## Recommended Batch Order

| Batch | Type | Features | Reason |
|-------|------|----------|--------|
| 1 | Sequential | {{features}} | Infrastructure — shared files |
| 2 | Parallel | {{features}} | Exclusive file domains |
| 3 | Parallel | {{features}} | Platform features, independent |
| 4 | Sequential | {{features}} | Cross-cutting, needs Batch 2+3 |
| 5 | Sequential | {{features}} | Final verification |

---

## Recommended Agent Count

- **Total agents**: {{N}}
- **Total estimated prompts**: {{N}}
- **Projected sessions**: {{N}} (at ~15 prompts per session)
```

Output exactly: `SCANNER_COMPLETE`

---

## Resumption Protocol

If you are starting a new session and `SCAN-QUEUE.md` already exists:

1. Read `{{PROJECT_RULES_FILE}}`
2. Read `scanner-reports/PROJECT-PROFILE.md`
3. Read `SCAN-QUEUE.md`
4. Find the first feature with status `PENDING` or `SCANNING`
5. If `SCANNING`, re-scan that feature (previous attempt was interrupted)
6. Continue the scan loop from Step 1.1

If ALL features are `READY` but `MASTER-BRIEF.md` doesn't exist, go to Phase 2.

If `MASTER-BRIEF.md` exists, output: `SCANNER_COMPLETE — nothing to do`

---END SCANNER---

---

# Section B — The Builder Prompt

> Copy everything between the `---START BUILDER---` and `---END BUILDER---` markers into a new Claude session. Run this AFTER the Scanner has completed.

---START BUILDER---

## Role

You are the **Builder Automation** — a scaffolding generator that transforms Scanner reports into executable agent folders and orchestration files. You read scan reports and produce structured agent infrastructure. You do NOT fix bugs or modify application source code.

## Prime Directives

1. **Scaffold only** — you create agent folders and orchestration files. You NEVER modify source code.
2. **Complete coverage** — every P0 and P1 issue from every scan report must be assigned to an agent.
3. **Deterministic** — same scan reports always produce same agent structure.
4. **Resumable** — if you hit context limits, write state to `MASTER-CONTEXT.md` and output `CONTEXT_LIMIT_REACHED`.
5. **Project rules first** — read the project rules file before any work.

---

## Phase 0 — Intake

### Step 0.1 — Read Project Context

1. Read `{{PROJECT_RULES_FILE}}` (path from `scanner-reports/PROJECT-PROFILE.md`)
2. Read `scanner-reports/PROJECT-PROFILE.md` (template variables, active dimensions)
3. Read `scanner-reports/MASTER-BRIEF.md` (issue summary, recommended batches)

### Step 0.2 — Read All Scan Reports

Read every file in `scanner-reports/` matching `NN-*.md`. For each, extract:
- Feature name and number
- All P0, P1, P2 issues with file locations
- Dependency information
- Parallelism assessment
- Recommended fix path and estimated prompts

### Step 0.3 — Initialize Output Directory

Create the agent directory structure:

```
.agents/
├── MASTER-CONTEXT.md
├── SYNC-LOG.md
├── GAP-ANALYSIS.md
├── COMMANDS.md
└── run-agents.sh
```

### Step 0.4 — Initialize MASTER-CONTEXT.md

```markdown
# Builder State — MASTER-CONTEXT.md

**Created**: {{DATE}}
**Status**: IN_PROGRESS
**Scanner Reports**: {{count}} features

## Agent Folders

| # | Agent Name | Batch | Status | Timestamp |
|---|-----------|-------|--------|-----------|
| {{NN}} | {{name}} | {{batch}} | AWAITING_CREATION | |

## Orchestration Files

| File | Status |
|------|--------|
| SYNC-LOG.md | PENDING |
| GAP-ANALYSIS.md | PENDING |
| COMMANDS.md | PENDING |
| run-agents.sh | PENDING |

## Statistics

| Metric | Value |
|--------|-------|
| Total Agents | {{N}} |
| Total Estimated Prompts | {{N}} |
| P0 Coverage | 0 / {{total P0}} |
| P1 Coverage | 0 / {{total P1}} |
| Batch Count | {{N}} |
```

---

## Phase 1 — Agent Design

### Step 1.1 — Determine Agent Boundaries

Map scan report features to agents. Rules:
- One agent per feature area (usually 1:1 with scan reports)
- Exception: very small features can be merged; very large features can be split
- Each agent owns a set of files — no two agents own the same file (enforced in SYNC-LOG)

### Step 1.2 — Apply Batch Grouping Algorithm

Assign each agent to a batch using these 4 rules:

**Rule 1 — Infrastructure First (Sequential)**
Agents that modify core shared files (main app entry, routing, providers, core config, auth, database schema) go in Batch 1. They run sequentially because they touch shared state.

**Rule 2 — Exclusive File Domains Enable Parallelism**
Agents whose owned files don't overlap with any other agent in the same batch can run in parallel. Group these into Batch 2–3.

**Rule 3 — Cross-Cutting Concerns Last (Sequential)**
Agents that touch files across 3+ other agent domains (i18n sweeps, accessibility fixes, final verification) go in the last batches. They run sequentially.

**Rule 4 — Dependency Chains Determine Sequence**
If Agent A depends on Agent B's output, B must complete before A starts. Either: same batch with B before A (sequential), or B in earlier batch.

### Step 1.3 — Number Agents

Agents are numbered sequentially starting from `01`. The number is the agent's identity throughout the system.

Format: `agent-{{NN}}-{{kebab-name}}/`

---

## Phase 2 — Agent Folder Generation

For each agent (in batch order):

### Step 2.1 — Create Agent Folder

Create directory: `.agents/agent-{{NN}}-{{kebab-name}}/`

### Step 2.2 — Generate AGENT.md

Use the AGENT.md template (see Appendix). Fill in:
- Agent number, name, role description
- Batch number and type (sequential/parallel)
- Owned files (exclusive to this agent)
- Read-only files (can read but not modify)
- Dependencies (which agents must complete first)
- Success criteria (measurable outcomes)
- Template variables from PROJECT-PROFILE.md

### Step 2.3 — Generate PROMPTS.md

Use the PROMPTS.md template (see Appendix). Create prompts:

- **Prompt N.0 — Assessment**: Read all owned files, understand current state, identify all issues from scan report that map to this agent.
- **Prompts N.1 through N.K — Fixes**: One prompt per logical fix group. Group related issues together. Each prompt has:
  - Clear objective
  - Files to modify
  - Exact changes needed
  - Verification step
- **Prompt N.LAST — Verification**: Run `{{LINT_CMD}}`, `{{TYPE_CHECK_CMD}}`, `{{BUILD_CMD}}`. Confirm all P0/P1 issues resolved. Update PROGRESS.md and HANDOFF.md.

Rules for prompt design:
- Each prompt should be completable in one Claude session
- Never combine unrelated fixes in one prompt
- Always include verification at the end of each prompt
- Reference specific file paths and line numbers from scan reports
- Include the exact issue text from the scan report so the agent has context

### Step 2.4 — Generate PROGRESS.md

Use the PROGRESS.md template (see Appendix). Pre-populate with all prompts from PROMPTS.md, all set to `NOT_STARTED`.

### Step 2.5 — Generate HANDOFF.md

Use the HANDOFF.md template (see Appendix). Initialize with empty state.

### Step 2.6 — Update MASTER-CONTEXT.md

Change the agent's status from `AWAITING_CREATION` to `CREATED`. Update P0/P1 coverage counts.

### Step 2.7 — Context Check

If approaching ~70% context usage:
1. Ensure MASTER-CONTEXT.md is fully up to date
2. Output exactly: `CONTEXT_LIMIT_REACHED`
3. STOP

---

## Phase 3 — Orchestration Files

After ALL agent folders are created:

### Step 3.1 — Generate SYNC-LOG.md

Map every source file that any agent will modify to its owning agent. Format:

```markdown
# Sync Log — File Ownership Matrix

> **Rule**: Only the owning agent may modify a file. All other agents treat it as read-only.

## Exclusive Ownership

| File | Owner Agent | Batch |
|------|------------|-------|
| {{file_path}} | Agent {{NN}} — {{name}} | {{batch}} |

## Shared File Exceptions

> These files are modified by multiple agents. They MUST be edited in batch order.

| File | Agents (in order) | Coordination Rule |
|------|-------------------|-------------------|
| {{file_path}} | Agent {{A}} (Batch {{X}}), then Agent {{B}} (Batch {{Y}}) | {{rule}} |

## Read-Only Shared Files

> These files are read by many agents but modified by none (or by exactly one).

| File | Reader Agents | Modifier (if any) |
|------|--------------|-------------------|
| {{file_path}} | {{agents}} | {{agent or "None"}} |
```

### Step 3.2 — Generate GAP-ANALYSIS.md

Map every P0 and P1 issue to its assigned agent. Format:

```markdown
# Gap Analysis — Issue-to-Agent Mapping

## Coverage Summary

| Priority | Total Issues | Assigned | Unassigned |
|----------|-------------|----------|------------|
| P0 | {{N}} | {{N}} | 0 |
| P1 | {{N}} | {{N}} | 0 |
| P2 | {{N}} | {{N}} | {{N}} (acceptable) |

## P0 Issue Assignments

| # | Feature | Issue | Agent | Prompt |
|---|---------|-------|-------|--------|
| 1 | {{feature}} | {{issue}} | Agent {{NN}} | {{N.K}} |

## P1 Issue Assignments

| # | Feature | Issue | Agent | Prompt |
|---|---------|-------|-------|--------|
| 1 | {{feature}} | {{issue}} | Agent {{NN}} | {{N.K}} |

## P2 Summary by Agent

| Agent | P2 Count | Categories |
|-------|----------|------------|
| Agent {{NN}} | {{N}} | {{categories}} |

## Deduplicated Cross-Feature Issues

| Issue | Affected Features | Assigned To | Reason |
|-------|------------------|-------------|--------|
| {{issue}} | {{features}} | Agent {{NN}} | {{why this agent}} |
```

**Validation**: Every P0 and P1 issue from every scan report MUST appear in this file. If any are missing, add them now.

### Step 3.3 — Generate COMMANDS.md

Bootstrap prompts for each agent. These are the prompts an operator copies into a Claude session to start an agent.

```markdown
# Agent Bootstrap Commands

> Copy the appropriate command block into a new Claude session to start an agent.

---

## Agent {{NN}} — {{Name}}

**Batch**: {{N}} ({{Sequential/Parallel}})
**Dependencies**: {{list or "None"}}
**Estimated prompts**: {{N}}

### Bootstrap Prompt

```
Read the following files in order:
1. {{PROJECT_RULES_FILE}}
2. .agents/agent-{{NN}}-{{name}}/AGENT.md
3. .agents/agent-{{NN}}-{{name}}/PROMPTS.md
4. .agents/agent-{{NN}}-{{name}}/PROGRESS.md
5. .agents/agent-{{NN}}-{{name}}/HANDOFF.md
6. scanner-reports/{{NN}}-{{feature}}.md

Then execute the first prompt in PROMPTS.md that has status NOT_STARTED in PROGRESS.md.

After completing each prompt:
- Update PROGRESS.md (mark COMPLETE, add timestamp)
- Update HANDOFF.md (current state, files modified)
- If approaching context limits, write state and output CONTEXT_LIMIT_REACHED

When all prompts are COMPLETE:
- Run: {{LINT_CMD}}
- Run: {{TYPE_CHECK_CMD}}
- Update HANDOFF.md with final state
- Output: AGENT_{{NN}}_COMPLETE
```

---
```

### Step 3.4 — Generate run-agents.sh

```bash
#!/usr/bin/env bash
# =============================================================================
# Agent Orchestration Script
# Generated by Builder Automation
# =============================================================================

set -euo pipefail

# --- Configuration ---
AGENTS_DIR=".agents"
PROJECT_RULES="{{PROJECT_RULES_FILE}}"

# Agent folders (in order)
AGENT_FOLDERS=(
{{#each agent}}
  "agent-{{NN}}-{{kebab-name}}"
{{/each}}
)

# Batch definitions
{{#each batch}}
BATCH_{{N}}=({{space-separated agent indices}})  # {{Sequential/Parallel}} — {{description}}
{{/each}}

TOTAL_BATCHES={{batch_count}}

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Functions ---

get_agent_status() {
  local folder="$1"
  local progress_file="$AGENTS_DIR/$folder/PROGRESS.md"
  if [[ ! -f "$progress_file" ]]; then
    echo "NOT_STARTED"
    return
  fi
  if grep -q "NOT_STARTED\|IN_PROGRESS" "$progress_file" 2>/dev/null; then
    if grep -q "COMPLETE" "$progress_file" 2>/dev/null; then
      echo "IN_PROGRESS"
    else
      echo "NOT_STARTED"
    fi
  else
    echo "COMPLETE"
  fi
}

get_prompt_progress() {
  local folder="$1"
  local progress_file="$AGENTS_DIR/$folder/PROGRESS.md"
  if [[ ! -f "$progress_file" ]]; then
    echo "0/0"
    return
  fi
  local total
  total=$(grep -c "| .* |" "$progress_file" 2>/dev/null | tail -1 || echo "0")
  total=$((total - 1))  # Subtract header row
  local complete
  complete=$(grep -c "COMPLETE" "$progress_file" 2>/dev/null || echo "0")
  echo "$complete/$total"
}

show_dashboard() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║         AGENT ORCHESTRATION DASHBOARD        ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
  echo ""

  for batch_num in $(seq 1 $TOTAL_BATCHES); do
    local batch_var="BATCH_${batch_num}[@]"
    local agents=("${!batch_var}")
    echo -e "${BLUE}━━━ Batch $batch_num ━━━${NC}"
    for idx in "${agents[@]}"; do
      local folder="${AGENT_FOLDERS[$idx]}"
      local status
      status=$(get_agent_status "$folder")
      local progress
      progress=$(get_prompt_progress "$folder")
      local color
      case "$status" in
        COMPLETE)     color="$GREEN" ;;
        IN_PROGRESS)  color="$YELLOW" ;;
        NOT_STARTED)  color="$RED" ;;
        *)            color="$NC" ;;
      esac
      printf "  ${color}%-40s %s  [%s]${NC}\n" "$folder" "$status" "$progress"
    done
    echo ""
  done
}

check_batch_complete() {
  local batch_num=$1
  local batch_var="BATCH_${batch_num}[@]"
  local agents=("${!batch_var}")
  for idx in "${agents[@]}"; do
    local folder="${AGENT_FOLDERS[$idx]}"
    local status
    status=$(get_agent_status "$folder")
    if [[ "$status" != "COMPLETE" ]]; then
      return 1
    fi
  done
  return 0
}

run_agent() {
  local folder="$1"
  local agent_num
  agent_num=$(echo "$folder" | grep -oP 'agent-\K\d+')
  echo -e "${CYAN}Starting agent: $folder${NC}"
  echo ""
  echo "Copy this into a new Claude session:"
  echo "─────────────────────────────────────"
  sed -n "/^## Agent ${agent_num} /,/^---$/p" "$AGENTS_DIR/COMMANDS.md" 2>/dev/null | head -30
  echo "─────────────────────────────────────"
}

# --- Main ---

case "${1:-status}" in
  status)
    show_dashboard
    ;;
  batch)
    batch_num="${2:?Usage: $0 batch <number>}"
    if [[ $batch_num -gt 1 ]]; then
      prev=$((batch_num - 1))
      if ! check_batch_complete "$prev"; then
        echo -e "${RED}ERROR: Batch $prev is not complete. Finish it first.${NC}"
        show_dashboard
        exit 1
      fi
    fi
    echo -e "${GREEN}Batch $batch_num is ready to run.${NC}"
    batch_var="BATCH_${batch_num}[@]"
    agents=("${!batch_var}")
    for idx in "${agents[@]}"; do
      echo "  → ${AGENT_FOLDERS[$idx]}"
    done
    ;;
  agent)
    agent_num="${2:?Usage: $0 agent <number>}"
    folder="${AGENT_FOLDERS[$agent_num]}"
    run_agent "$folder"
    ;;
  *)
    echo "Usage: $0 {status|batch <N>|agent <N>}"
    ;;
esac
```

### Step 3.5 — Finalize MASTER-CONTEXT.md

Update all orchestration file statuses to `CREATED`. Set overall status to `COMPLETE`. Add final statistics.

### Step 3.6 — Output Completion

Output exactly: `BUILDER_COMPLETE`

Followed by a summary:

```
Builder Complete.
- {{N}} agents created across {{N}} batches
- {{N}} total prompts generated
- {{N}} P0 issues assigned (100%)
- {{N}} P1 issues assigned (100%)
- Orchestration files: SYNC-LOG.md, GAP-ANALYSIS.md, COMMANDS.md, run-agents.sh
- Next step: Run `bash .agents/run-agents.sh status` to see the dashboard
```

---

## Resumption Protocol

If you are starting a new session and `MASTER-CONTEXT.md` already exists:

1. Read `{{PROJECT_RULES_FILE}}`
2. Read `scanner-reports/PROJECT-PROFILE.md`
3. Read `.agents/MASTER-CONTEXT.md`
4. Find the first agent with status `AWAITING_CREATION`
5. Continue from Phase 2 Step 2.1 for that agent
6. If all agents are `CREATED` but orchestration files are `PENDING`, go to Phase 3

If everything is `CREATED`/`COMPLETE`, output: `BUILDER_COMPLETE — nothing to do`

---END BUILDER---

---

# Section C — The Mechanics Guide

> This section explains every design decision, how the pieces fit together, and how to adapt the system.

---

## Mechanic 1: Two-Phase Architecture

**What**: The system is split into Scanner (read-only audit) and Builder (scaffold generation).

**Why**: Separation of concerns. The Scanner never modifies code, which means:
- It's safe to run repeatedly without side effects
- Scan reports serve as documentation even if you never run the Builder
- The Builder can be re-run with different strategies on the same scan data
- If either phase fails, you only redo that phase

**How it works**:
1. Scanner reads codebase → writes scan reports
2. Builder reads scan reports → writes agent folders + orchestration
3. Agents read their folders + source code → fix issues

Each phase has its own resume mechanism, so multi-session execution is seamless.

---

## Mechanic 2: Project Fingerprinting (Self-Discovery)

**What**: Instead of requiring manual configuration, the Scanner auto-detects the project's tech stack by reading config files.

**Why**: Makes the system work on ANY project — React, Rails, Go, Rust, Python, etc. — without editing the prompt.

**How it works**:
1. Scanner checks for known config files (`package.json`, `Cargo.toml`, `go.mod`, etc.)
2. Extracts language, framework, package manager, DB, auth, test framework
3. Populates template variables (`{{LINT_CMD}}`, `{{TEST_CMD}}`, etc.)
4. Activates conditional scan dimensions (billing, i18n, RBAC, etc.)

**Adaptation**: To add support for a new ecosystem, add its config files to the Fingerprinting step and its commands to the template variables table.

---

## Mechanic 3: Conditional Scan Dimensions

**What**: The scan protocol has 4 mandatory dimensions (touchpoints, E2E flows, dependencies, parallelism) plus 4+ conditional dimensions that only activate if the project fingerprint detects the relevant systems.

**Why**: A Go microservice doesn't need i18n scanning. A CLI tool doesn't need accessibility audits. Conditional activation keeps scan reports focused and avoids noise.

**How it works**:
- Mandatory dimensions run on every feature, every project
- Conditional dimensions are listed in `PROJECT-PROFILE.md` with checkboxes
- Each scan report only includes sections for active dimensions
- The Builder reads which dimensions are active to determine agent scope

**Available conditional dimensions**:
| Dimension | Activates When |
|-----------|---------------|
| Business Tier Mapping | Billing/payments detected |
| i18n / RTL Status | i18n system detected |
| Auth & RBAC Audit | Role/permission system detected |
| Edge Function / Serverless | Serverless platform detected |
| Test Coverage Analysis | Test framework detected |
| Accessibility Audit | Frontend application detected |
| Performance Audit | Frontend + bundler detected |
| API Security Audit | API routes detected |

---

## Mechanic 4: Universal Issue Taxonomy (P0/P1/P2)

**What**: Every issue found during scanning is classified as P0, P1, or P2.

**Why**: Consistent prioritization across all features enables:
- The Builder to ensure 100% P0/P1 coverage in agent assignments
- Operators to focus on P0 first within each agent
- GAP-ANALYSIS.md to serve as a coverage guarantee

**Classification**:
- **P0 (Critical)**: Blocks an end-to-end user flow. Data loss, security holes, broken imports, missing core functionality.
- **P1 (High)**: Feature partially works but has bugs, missing validation, incomplete error handling.
- **P2 (Medium)**: Cosmetic issues, TypeScript warnings, inconsistent styling, dead code. P2s may be deferred.

---

## Mechanic 5: Batch Grouping Algorithm

**What**: Agents are assigned to numbered batches. Within a batch, agents may run in parallel or sequentially. Batches run in order.

**Why**: Maximizes parallelism while respecting dependencies. Infrastructure must be fixed before features. Cross-cutting concerns must wait for isolated features.

**The 4 Rules**:

| Rule | Condition | Result |
|------|-----------|--------|
| 1. Infrastructure First | Agent modifies core shared files (app entry, routing, providers, auth, DB schema) | Batch 1, sequential |
| 2. Exclusive Domains | Agent's owned files don't overlap with any other agent in the same batch | Same batch, parallel |
| 3. Cross-Cutting Last | Agent touches files in 3+ other agent domains | Last batches, sequential |
| 4. Dependency Chains | Agent A depends on Agent B's output | B must complete before A starts |

**Decision process**:
1. List all agents and their owned files
2. Identify shared files → those agents go to Batch 1 (sequential)
3. Group remaining agents by file domain exclusivity → parallel batches
4. Place cross-cutting agents after all their dependencies
5. Add a final verification agent in the last batch

---

## Mechanic 6: Agent Folder Structure (4 Required Files)

**What**: Each agent gets a folder with exactly 4 files: AGENT.md, PROMPTS.md, PROGRESS.md, HANDOFF.md.

**Why**: Standardization enables:
- Any operator to pick up any agent without learning a new format
- The orchestration script to read progress programmatically
- Session continuity — a new Claude session reads these files and knows exactly where to continue

| File | Purpose | Updated By |
|------|---------|-----------|
| AGENT.md | Role definition, owned files, dependencies, success criteria | Builder (never changed after) |
| PROMPTS.md | Numbered prompts with objectives and verification steps | Builder (never changed after) |
| PROGRESS.md | Status table tracking completion per prompt | Agent (during execution) |
| HANDOFF.md | Current state, files modified, decisions made | Agent (during execution) |

---

## Mechanic 7: SYNC-LOG (File Ownership Matrix)

**What**: A matrix mapping every source file that will be modified to exactly one owning agent.

**Why**: Prevents parallel modification conflicts. If Agent 26 and Agent 27 both try to edit `App.tsx`, they'll create merge conflicts. The SYNC-LOG ensures only one agent owns each file.

**How conflicts are resolved**:
1. Prefer the agent whose primary responsibility involves the file
2. If ambiguous, assign to the agent in the earlier batch
3. Document "Shared File Exceptions" where sequential editing is unavoidable
4. The orchestration script enforces batch order, which enforces edit order

---

## Mechanic 8: GAP-ANALYSIS (Issue-to-Agent Coverage)

**What**: A complete mapping of every P0 and P1 issue to the agent and prompt that will fix it.

**Why**: Guarantees nothing falls through the cracks. After the Builder runs, you can verify that every critical issue has an owner.

**Validation rule**: `Unassigned P0 = 0` and `Unassigned P1 = 0`. If any P0/P1 is unassigned, the Builder must create an additional agent or add prompts to an existing agent.

---

## Mechanic 9: Session Continuity (Context Overflow Handling)

**What**: Three resume mechanisms for three levels of the system.

| Level | State File | Resume By |
|-------|-----------|-----------|
| Scanner | `SCAN-QUEUE.md` | Read queue, find next PENDING feature |
| Builder | `MASTER-CONTEXT.md` | Read context, find next AWAITING_CREATION agent |
| Agent | `PROGRESS.md` + `HANDOFF.md` | Read progress, find next NOT_STARTED prompt |

**Why**: Claude sessions have context windows. Complex projects need more analysis than one session can hold. State files make multi-session execution seamless.

**Protocol**:
1. At ~70% context usage → STOP current work
2. Write complete state to the appropriate file
3. Output the marker: `CONTEXT_LIMIT_REACHED`
4. Operator starts a new session
5. New session reads project rules + state file
6. New session continues from where the previous one stopped

**Critical**: The ~70% threshold prevents truncation. Going to 100% risks losing work in the current response.

---

## Mechanic 10: Numbered Prompt Protocol

**What**: Each agent's PROMPTS.md contains numbered prompts: N.0 (assessment), N.1–N.K (fixes), N.LAST (verification).

**Why**:
- Sequential execution prevents the agent from trying to fix everything at once
- Each prompt is scoped to one logical change, making it reviewable
- The assessment prompt (N.0) ensures the agent understands current state before changing anything
- The verification prompt (N.LAST) confirms all fixes work together
- Progress tracking is simple: which prompt number are you on?

**Prompt numbering**: Agent 05's prompts are numbered 5.0, 5.1, 5.2, ..., 5.LAST. This makes prompts globally unique across all agents.

---

## Mechanic 11: Master Brief (Scanner Summary)

**What**: A single document summarizing all scan findings, generated after all features are scanned.

**Why**: The Builder needs a bird's-eye view to determine batch structure and agent count. Operators need a quick health assessment without reading 16 individual reports.

**Contents**: Issue counts by feature, all P0s listed, cross-feature dependency graph, recommended batch order, risk assessment.

---

## Mechanic 12: Orchestration Script (run-agents.sh)

**What**: A bash script that reads PROGRESS.md files and displays a colored dashboard of agent status.

**Why**: Operators need to see at a glance which agents are done, in progress, or not started. The script also enforces batch ordering — you can't start Batch 2 until Batch 1 is complete.

**Commands**:
- `status` — show the full dashboard
- `batch <N>` — check if batch N is ready (validates previous batch is complete)
- `agent <N>` — show the bootstrap prompt for agent N

---

## Mechanic 13: COMMANDS.md (Bootstrap Prompts)

**What**: Ready-to-copy prompts that initialize each agent in a new Claude session.

**Why**: Eliminates human error in agent setup. The operator just copies the prompt, and the Claude session loads all the right files in the right order.

**Structure per agent**: Read project rules → read AGENT.md → read PROMPTS.md → read PROGRESS.md → read HANDOFF.md → read scan report → execute first NOT_STARTED prompt.

---

## Mechanic 14: Template Variable System

**What**: Instead of hardcoding stack-specific commands, templates use `{{VARIABLE}}` placeholders populated during fingerprinting.

**Why**: A single prompt works for npm, yarn, pnpm, pip, cargo, go, and bundle projects. The Scanner discovers the right commands; the Builder substitutes them into agent prompts.

**Variable lifecycle**:
1. Scanner fingerprints the project → populates variables in PROJECT-PROFILE.md
2. Builder reads PROJECT-PROFILE.md → substitutes variables into PROMPTS.md templates
3. Agents execute the concrete commands (e.g., `npm run lint`, not `{{LINT_CMD}}`)

---

## Mechanic 15: Deterministic Feature-to-Agent Mapping

**What**: The mapping from scan report features to agent folders is deterministic and traceable.

**Why**: Enables auditing. Given the same scan reports, the Builder always produces the same agents with the same batch assignments. If an issue is found later, you can trace it back through GAP-ANALYSIS.md → agent → prompt → scan report → feature.

**Traceability chain**: Issue → GAP-ANALYSIS.md → Agent NN → Prompt N.K → Scan Report → Feature → Source File:Line

---

## How to Adapt This System

### For a Different Project
No changes needed. Copy this file to the new project root and run the Scanner. Project Fingerprinting handles the rest.

### For a Different AI Assistant
The prompts are designed for Claude but work with any LLM that can:
- Read files from the filesystem
- Write files to the filesystem
- Follow structured instructions
- Respect context window limits

Adjust the ~70% context threshold based on your model's window size.

### For a Monorepo
Run the Scanner once per package/service. Each service gets its own `scanner-reports/` directory. The Builder can create a unified `.agents/` directory or per-service agent directories.

### For a Microservices Architecture
Treat each service as an independent project. Run Scanner + Builder per service. Cross-service issues go in a shared "integration" scan report.

### For Adding Custom Scan Dimensions
1. Add the dimension to the Conditional Dimensions section of the Scanner
2. Add a detection rule to Project Fingerprinting (Step 0.2)
3. Add a template section to the scan report format
4. The Builder will automatically include the new data in agent prompts

### For Changing Batch Strategy
Modify the 4 rules in the Batch Grouping Algorithm (Builder Phase 1 Step 1.2). The rules are independent — you can add, remove, or reorder them.

---

# Appendix — Universal Templates

> These templates are used by the Builder to generate agent files. They are included here for reference and for the Builder to copy.

---

## Template: AGENT.md

```markdown
# Agent {{NN}} — {{Agent Name}}

**Created**: {{DATE}}
**Batch**: {{BATCH_NUM}} ({{Sequential/Parallel}})
**Role**: {{one-line description of this agent's responsibility}}

---

## Scope

{{2-3 sentence description of what this agent fixes and why it matters}}

## Owned Files (Exclusive Modification Rights)

| File | Purpose |
|------|---------|
| {{file_path}} | {{description}} |

## Read-Only Files (Reference Only — Do NOT Modify)

| File | Purpose |
|------|---------|
| {{file_path}} | {{why this agent needs to read it}} |

## Dependencies

| Agent | What It Provides | Status |
|-------|-----------------|--------|
| Agent {{NN}} | {{what this agent needs from it}} | {{PENDING/COMPLETE}} |

> If dependencies are PENDING, do NOT start this agent.

## Success Criteria

- [ ] {{measurable outcome 1}}
- [ ] {{measurable outcome 2}}
- [ ] {{measurable outcome N}}
- [ ] `{{LINT_CMD}}` passes with no new errors
- [ ] `{{TYPE_CHECK_CMD}}` passes with no new errors

## Assigned Issues

### P0
| # | Issue | Source Report |
|---|-------|-------------|
| 1 | {{issue}} | {{NN}}-{{feature}}.md |

### P1
| # | Issue | Source Report |
|---|-------|-------------|
| 1 | {{issue}} | {{NN}}-{{feature}}.md |

### P2 (Best Effort)
| # | Issue | Source Report |
|---|-------|-------------|
| 1 | {{issue}} | {{NN}}-{{feature}}.md |

## Project Commands

| Command | Purpose |
|---------|---------|
| `{{LINT_CMD}}` | Lint check |
| `{{TYPE_CHECK_CMD}}` | Type check |
| `{{TEST_CMD}}` | Run tests |
| `{{BUILD_CMD}}` | Production build |
| `{{MIGRATION_CMD}}` | Run database migrations (if applicable) |
| `{{CODEGEN_CMD}}` | Run code generation (if applicable) |
```

---

## Template: PROMPTS.md

```markdown
# Prompts — Agent {{NN}} ({{Agent Name}})

> Execute prompts in order. After each prompt, update PROGRESS.md.
> If approaching context limits, write state to HANDOFF.md and output `CONTEXT_LIMIT_REACHED`.

---

## Prompt {{N}}.0 — Assessment

**Objective**: Understand the current state of all owned files before making changes.

**Steps**:
1. Read every file listed in AGENT.md "Owned Files" section
2. Read the scan report: `scanner-reports/{{NN}}-{{feature}}.md`
3. Cross-reference: for each issue in the scan report, verify it still exists in the code
4. Note any issues that have been fixed since the scan (mark as ALREADY_FIXED)
5. Note any NEW issues not in the scan report (add to your fix list)
6. Update PROGRESS.md: mark this prompt as COMPLETE

**Do NOT make any code changes in this prompt.**

---

## Prompt {{N}}.1 — {{Fix Group Title}}

**Objective**: {{what this prompt fixes}}

**Issues addressed**:
- {{P0/P1/P2}}: {{issue description}} ({{file}}:{{line}})

**Steps**:
1. {{specific change to make}}
2. {{specific change to make}}
3. Verify: {{how to confirm the fix works}}
4. Run: `{{LINT_CMD}}`
5. Update PROGRESS.md: mark this prompt as COMPLETE

---

{{... additional fix prompts ...}}

---

## Prompt {{N}}.LAST — Final Verification

**Objective**: Confirm all fixes work together and nothing is broken.

**Steps**:
1. Run: `{{LINT_CMD}}` — fix any new errors
2. Run: `{{TYPE_CHECK_CMD}}` — fix any new errors
3. Run: `{{BUILD_CMD}}` — confirm successful build
4. Run: `{{TEST_CMD}}` — confirm no test regressions
5. Review all changes made across all prompts
6. Verify every P0 issue in AGENT.md is resolved
7. Verify every P1 issue in AGENT.md is resolved
8. Update PROGRESS.md: mark this prompt as COMPLETE, mark all as VERIFIED
9. Update HANDOFF.md: write final state, list all files modified, note any remaining P2s
10. Output: `AGENT_{{NN}}_COMPLETE`
```

---

## Template: PROGRESS.md

```markdown
# Progress — Agent {{NN}} ({{Agent Name}})

| Prompt | Description | Status | Timestamp |
|--------|-------------|--------|-----------|
| {{N}}.0 | Assessment | NOT_STARTED | |
| {{N}}.1 | {{title}} | NOT_STARTED | |
| {{N}}.2 | {{title}} | NOT_STARTED | |
| ... | ... | NOT_STARTED | |
| {{N}}.LAST | Final Verification | NOT_STARTED | |

## Status Key
- `NOT_STARTED` — prompt has not been executed
- `IN_PROGRESS` — prompt is being executed (context limit hit mid-prompt)
- `COMPLETE` — prompt finished, changes made
- `SKIPPED` — prompt not needed (issue already fixed)
- `BLOCKED` — cannot proceed (dependency not met)
```

---

## Template: HANDOFF.md

```markdown
# Handoff — Agent {{NN}} ({{Agent Name}})

> This file is updated by the agent during execution. It enables session continuity.

## Current State

**Last completed prompt**: {{N/A or prompt number}}
**Next prompt to execute**: {{N.0 or prompt number}}
**Status**: NOT_STARTED

## Context for Next Session

{{empty initially — agent fills this with relevant context for resumption}}

## Files Modified

| File | Changes | Prompt |
|------|---------|--------|
| {{none yet}} | | |

## Issues Resolved

| Issue | Priority | Prompt | Notes |
|-------|----------|--------|-------|
| {{none yet}} | | | |

## Issues Remaining

| Issue | Priority | Reason |
|-------|----------|--------|
| {{none yet}} | | |

## Decisions Made

| Decision | Reason | Prompt |
|----------|--------|--------|
| {{none yet}} | | |

## Warnings for Downstream Agents

{{none yet}}
```

---

## Template: SCAN-QUEUE.md

```markdown
# Scan Queue

**Project**: {{project name}}
**Created**: {{DATE}}
**Total Features**: {{N}}

| # | Feature | Status | Timestamp |
|---|---------|--------|-----------|
| 01 | {{feature_name}} | PENDING | |
| 02 | {{feature_name}} | PENDING | |
| ... | ... | ... | |

## Status Key
- `PENDING` — not yet scanned
- `SCANNING` — scan in progress (may need re-scan if interrupted)
- `READY` — scan complete, report written
```

---

## Template: MASTER-CONTEXT.md

```markdown
# Builder State — MASTER-CONTEXT.md

**Created**: {{DATE}}
**Status**: {{NOT_STARTED / IN_PROGRESS / COMPLETE}}
**Scanner Reports**: {{count}} features
**Project Rules**: {{PROJECT_RULES_FILE}}

## Agent Folders

| # | Agent Name | Batch | Type | Status | Timestamp |
|---|-----------|-------|------|--------|-----------|
| 01 | {{name}} | {{batch}} | {{Seq/Par}} | AWAITING_CREATION | |
| ... | ... | ... | ... | ... | |

## Orchestration Files

| File | Status | Timestamp |
|------|--------|-----------|
| SYNC-LOG.md | PENDING | |
| GAP-ANALYSIS.md | PENDING | |
| COMMANDS.md | PENDING | |
| run-agents.sh | PENDING | |

## Statistics

| Metric | Value |
|--------|-------|
| Total Agents | {{N}} |
| Total Estimated Prompts | {{N}} |
| P0 Issues (assigned / total) | {{N}} / {{N}} |
| P1 Issues (assigned / total) | {{N}} / {{N}} |
| P2 Issues (assigned / total) | {{N}} / {{N}} |
| Batch Count | {{N}} |
| Projected Sessions | {{N}} |

## Status Key
- `AWAITING_CREATION` — agent folder not yet created
- `CREATED` — agent folder created with all 4 files
- `PENDING` — orchestration file not yet generated
- `COMPLETE` — file generated
```

---

## Template: MASTER-BRIEF.md

(See Scanner Phase 2 for the complete format — it is generated dynamically from scan data, not from a static template.)

---

## Template: GAP-ANALYSIS.md

(See Builder Phase 3 Step 3.2 for the complete format — it is generated dynamically from issue data.)

---

## Template: SYNC-LOG.md

(See Builder Phase 3 Step 3.1 for the complete format — it is generated dynamically from file ownership data.)

---

## Template: COMMANDS.md

(See Builder Phase 3 Step 3.3 for the complete format — it is generated dynamically from agent data.)

---

## Template: run-agents.sh

(See Builder Phase 3 Step 3.4 for the complete script — it is generated dynamically from batch data.)

---

# End of DUAL-AUTOMATION-PROMPT.md
