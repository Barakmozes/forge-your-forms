# AGENT-TEMPLATES.md — Builder Templates for V3

> The Builder reads this file for agent folder and orchestration file generation formats.

---

## Template: AGENT.md

```markdown
# Agent {{NN}} — {{Agent Name}} [{{ROLE_TYPE}}]

**Created**: {{DATE}}
**Batch**: {{BATCH_NUM}} ({{Sequential/Parallel}})
**Role**: {{ROLE_TYPE}}
**Role Description**: {{one-line based on role}}

---

## Scope

{{2-3 sentences: what this agent fixes/builds, why it matters}}

## Owned Files (Exclusive Modification Rights)

| File | Purpose |
|------|---------|

## Read-Only Files (Do NOT Modify)

| File | Why Needed |
|------|-----------|

## Dependencies

| Agent | Provides | Status |
|-------|---------|--------|

> If dependencies are PENDING, do NOT start this agent.

## Success Criteria

- [ ] {{measurable outcome}}
- [ ] `{{LINT_CMD}}` passes with no new errors
- [ ] `{{TYPE_CHECK_CMD}}` passes with no new errors

## Assigned Issues

### P0
| # | Issue | Category | Confidence | Source Report |
|---|-------|----------|------------|-------------|

### P1
| # | Issue | Category | Confidence | Source Report |
|---|-------|----------|------------|-------------|

### P2 (Best Effort)
| # | Issue | Category | Confidence | Source Report |
|---|-------|----------|------------|-------------|

## Safety Rules

- NEVER delete user data or drop database tables without explicit backup
- NEVER remove existing functionality — only fix or enhance
- NEVER commit secrets, tokens, or credentials to code
- If a fix could break other features, document risk in HANDOFF.md first
- If uncertain about a fix, document uncertainty and SKIP — do not guess
- For PRODUCT_BUILDER: include rollback instructions for every new feature

## Project Commands

| Command | Purpose |
|---------|---------|
| `{{LINT_CMD}}` | Lint |
| `{{TYPE_CHECK_CMD}}` | Type check |
| `{{TEST_CMD}}` | Tests |
| `{{BUILD_CMD}}` | Build |
| `{{MIGRATION_CMD}}` | Migrations |
| `{{CODEGEN_CMD}}` | Codegen |
| `{{AUDIT_CMD}}` | Security audit |
```

---

## Template: PROMPTS.md

```markdown
# Prompts — Agent {{NN}} ({{Agent Name}}) [{{ROLE_TYPE}}]

> Execute in order. Update PROGRESS.md after each.
> At context limits: write state to HANDOFF.md → `CONTEXT_LIMIT_REACHED`.

---

## Prompt {{N}}.0 — Assessment

**Objective**: Understand current state before changes.

**Steps**:
1. Read every file in AGENT.md "Owned Files"
2. Read scan report: `scanner-reports/{{NN}}-{{feature}}.md`
3. Cross-reference: verify each issue still exists
4. Mark ALREADY_FIXED issues
5. Note NEW issues not in scan report
6. Update PROGRESS.md → COMPLETE

**Do NOT make code changes.**

---

## Prompt {{N}}.1 — {{Fix Group Title}}

**Objective**: {{what this fixes/builds}}

**Issues**:
- {{P0/P1/P2}}: {{description}} [{{CATEGORY}}] ({{file}}:{{line}})

**Steps**:
1. {{specific change}}
2. {{specific change}}
3. Verify: {{how to confirm}}
4. Run: `{{LINT_CMD}}`
5. Update PROGRESS.md → COMPLETE

---

{{... additional prompts ...}}

---

## Prompt {{N}}.LAST — Final Verification

**Steps**:
1. `{{LINT_CMD}}` — fix new errors
2. `{{TYPE_CHECK_CMD}}` — fix new errors
3. `{{BUILD_CMD}}` — confirm build
4. `{{TEST_CMD}}` — confirm no regressions
5. Review all changes across all prompts
6. Verify every P0 resolved
7. Verify every P1 resolved
8. Update PROGRESS.md → all COMPLETE + VERIFIED
9. Update HANDOFF.md → final state, files modified, remaining P2s
10. Output: `AGENT_{{NN}}_COMPLETE`
```

---

## Template: PROGRESS.md

```markdown
# Progress — Agent {{NN}} ({{Agent Name}}) [{{ROLE_TYPE}}]

| Prompt | Description | Status | Timestamp |
|--------|-------------|--------|-----------|
| {{N}}.0 | Assessment | NOT_STARTED | |
| {{N}}.1 | {{title}} | NOT_STARTED | |
| ... | ... | NOT_STARTED | |
| {{N}}.LAST | Final Verification | NOT_STARTED | |

## Status Key
- NOT_STARTED / IN_PROGRESS / COMPLETE / SKIPPED / BLOCKED
```

---

## Template: HANDOFF.md

```markdown
# Handoff — Agent {{NN}} ({{Agent Name}}) [{{ROLE_TYPE}}]

## Current State
**Last completed**: {{N/A or prompt}}
**Next prompt**: {{N.0 or prompt}}
**Status**: NOT_STARTED

## Context for Next Session
{{empty — agent fills during execution}}

## Files Modified
| File | Changes | Prompt |
|------|---------|--------|

## Issues Resolved
| Issue | Category | Priority | Prompt | Notes |
|-------|----------|----------|--------|-------|

## Issues Remaining
| Issue | Category | Priority | Reason |
|-------|----------|----------|--------|

## Decisions Made
| Decision | Reason | Prompt |
|----------|--------|--------|

## Warnings for Downstream Agents
{{none yet}}

## Rollback Information
{{PRODUCT_BUILDER agents: document revert steps for each new feature}}
```

---

## Template: MASTER-CONTEXT.md

```markdown
# Builder State — MASTER-CONTEXT.md

**Created**: {{DATE}}
**Status**: {{NOT_STARTED / IN_PROGRESS / COMPLETE}}
**Scanner Reports**: {{count}} features
**Scanner Version**: V3

## Agent Folders

| # | Agent Name | Role | Batch | Type | Status | Timestamp |
|---|-----------|------|-------|------|--------|-----------|

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
| Total Agents | |
| Total Prompts | |
| P0 Coverage | 0 / {{total}} |
| P1 Coverage | 0 / {{total}} |
| Batch Count | |
| Roles | {{distribution}} |
```

---

## Template: PRODUCT-ROADMAP.md

```markdown
# Product Roadmap

**Generated**: {{DATE}}
**Source**: Scanner V3 — Product Growth & Innovation Audit
**Total Opportunities**: {{N}}

---

## Implemented This Run (P0 Quick Wins)

| # | Feature | Lens | Agent | Confidence | Status |
|---|---------|------|-------|------------|--------|

## Next Sprint — High Impact, Needs Planning (P1)

| # | Feature | Lens | Effort | Impact | Confidence | Dependencies |
|---|---------|------|--------|--------|------------|-------------|

## Future Ideas (P2)

| # | Feature | Lens | Effort | Impact | Confidence | Notes |
|---|---------|------|--------|--------|------------|-------|

## AI Integration Roadmap

| # | Feature | Location | Effort | Impact | Confidence |
|---|---------|----------|--------|--------|------------|

## Integration Opportunities

| # | Service | Type | Effort | Business Value | Confidence |
|---|---------|------|--------|---------------|------------|

## Suggested Implementation Order

1. {{feature}} — {{reason}}
2. ...
```

---

## Template: FINAL-REPORT.md

(Generated by VERIFIER agent)

```markdown
# Final Pipeline Report

**Generated**: {{DATE}}
**Pipeline Version**: V3

## Summary

| Metric | Value |
|--------|-------|
| Total Agents | |
| Completed / Failed | |
| Issues Fixed | |
| P0 Resolved | / |
| P1 Resolved | / |
| New Features Built | |
| Opportunities Documented | |

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Lint | PASS/FAIL | |
| Type Check | PASS/FAIL | |
| Build | PASS/FAIL | |
| Tests | PASS/FAIL | |
| Security Audit | PASS/FAIL/N-A | |

## Cross-Agent Conflict Check
| File | Agents | Conflict? | Resolution |
|------|--------|-----------|-----------|

## Remaining Issues
| Issue | Category | Priority | Reason Not Fixed |
|-------|----------|----------|-----------------|

## Recommendations
{{VERIFIER agent recommendations}}
```

---

## Template: SYNC-LOG.md

```markdown
# Sync Log — File Ownership Matrix

> Only the owning agent may modify a file.

## Exclusive Ownership
| File | Owner Agent | Role | Batch |
|------|------------|------|-------|

## Shared File Exceptions (edit in batch order)
| File | Agents (order) | Rule |
|------|----------------|------|

## Read-Only Shared
| File | Readers | Modifier |
|------|---------|----------|
```

---

## Template: GAP-ANALYSIS.md

```markdown
# Gap Analysis — Issue-to-Agent Mapping

## Coverage Summary
| Priority | Total | Assigned | Unassigned |
|----------|-------|----------|------------|
| P0 | | | 0 |
| P1 | | | 0 |
| P2 | | | {{acceptable}} |

## Coverage by Category
| Category | P0 | P1 | Agent Roles |
|----------|----|----|------------|

## P0 Assignments
| # | Feature | Issue | Category | Confidence | Agent | Role | Prompt |
|---|---------|-------|----------|------------|-------|------|--------|

## P1 Assignments
| # | Feature | Issue | Category | Confidence | Agent | Role | Prompt |
|---|---------|-------|----------|------------|-------|------|--------|

## Product Opportunity Routing
| # | Opportunity | Lens | Priority | Confidence | Route |
|---|-----------|------|----------|------------|-------|
(P0+HIGH/MED → PRODUCT_BUILDER agent. P1/P2 or LOW → PRODUCT-ROADMAP.md)

## Deduplicated Cross-Feature Issues
| Issue | Features | Assigned To | Reason |
|-------|---------|-------------|--------|
```

---

## Template: COMMANDS.md

```markdown
# Agent Bootstrap Commands

---

## Agent {{NN}} — {{Name}} [{{ROLE_TYPE}}]

**Batch**: {{N}} ({{Sequential/Parallel}})
**Role**: {{description}}
**Dependencies**: {{list or "None"}}
**Est. prompts**: {{N}}

### Bootstrap Prompt

```
You are an agent with role: {{ROLE_TYPE}}.

Read in order:
1. {{PROJECT_RULES_FILE}}
2. .agents/agent-{{NN}}-{{name}}/AGENT.md
3. .agents/agent-{{NN}}-{{name}}/PROMPTS.md
4. .agents/agent-{{NN}}-{{name}}/PROGRESS.md
5. .agents/agent-{{NN}}-{{name}}/HANDOFF.md
6. scanner-reports/{{NN}}-{{feature}}.md

Safety rules:
- NEVER delete user data or drop tables without backup
- NEVER remove existing functionality
- NEVER commit secrets/tokens/credentials
- Document risks in HANDOFF.md before risky changes
- Skip uncertain fixes — document and move on

Execute first NOT_STARTED prompt in PROGRESS.md.

After each prompt:
- Update PROGRESS.md (COMPLETE + timestamp)
- Update HANDOFF.md (state + files modified)
- At context limits → write state → CONTEXT_LIMIT_REACHED

When all COMPLETE:
- Run: {{LINT_CMD}}
- Run: {{TYPE_CHECK_CMD}}
- Final HANDOFF.md update
- Output: AGENT_{{NN}}_COMPLETE
```

---
```

---

## Template: run-agents.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

AGENTS_DIR=".agents"
PROJECT_RULES="{{PROJECT_RULES_FILE}}"

AGENT_FOLDERS=({{agent folders array}})
AGENT_ROLES=({{agent roles array}})

{{batch definitions}}

TOTAL_BATCHES={{N}}

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m'
BLUE='\033[0;34m' CYAN='\033[0;36m' MAGENTA='\033[0;35m' NC='\033[0m'

role_color() {
  case "$1" in
    ENGINEER) echo "$GREEN" ;; RESPONSIVE_SPECIALIST) echo "$CYAN" ;;
    SECURITY_ENGINEER) echo "$RED" ;; PERFORMANCE_ENGINEER) echo "$YELLOW" ;;
    DEVOPS_ENGINEER) echo "$YELLOW" ;; PRODUCT_BUILDER) echo "$MAGENTA" ;;
    ARCHITECT) echo "$BLUE" ;; DOCS_WRITER) echo "$NC" ;;
    ROADMAP_COMPILER) echo "$MAGENTA" ;; VERIFIER) echo "$GREEN" ;;
    *) echo "$NC" ;; esac
}

get_agent_status() {
  local pf="$AGENTS_DIR/$1/PROGRESS.md"
  [[ ! -f "$pf" ]] && echo "NOT_STARTED" && return
  if grep -q "NOT_STARTED\|IN_PROGRESS" "$pf" 2>/dev/null; then
    grep -q "COMPLETE" "$pf" 2>/dev/null && echo "IN_PROGRESS" || echo "NOT_STARTED"
  else echo "COMPLETE"; fi
}

get_progress() {
  local pf="$AGENTS_DIR/$1/PROGRESS.md"
  [[ ! -f "$pf" ]] && echo "0/0" && return
  local t c; t=$(grep -c "| .* |" "$pf" 2>/dev/null || echo 1); t=$((t-1))
  c=$(grep -c "COMPLETE" "$pf" 2>/dev/null || echo 0); echo "$c/$t"
}

show_dashboard() {
  echo ""
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║        AGENT ORCHESTRATION DASHBOARD — V3 (Full Lifecycle)   ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  for bn in $(seq 1 $TOTAL_BATCHES); do
    local bv="BATCH_${bn}[@]"; local aa=("${!bv}")
    echo -e "${BLUE}━━━ Batch $bn ━━━${NC}"
    for i in "${aa[@]}"; do
      local f="${AGENT_FOLDERS[$i]}" r="${AGENT_ROLES[$i]}"
      local s; s=$(get_agent_status "$f"); local p; p=$(get_progress "$f")
      local sc; case "$s" in COMPLETE) sc="$GREEN";; IN_PROGRESS) sc="$YELLOW";; *) sc="$RED";; esac
      local rc; rc=$(role_color "$r")
      printf "  ${sc}%-42s %s  [%s]  ${rc}(%s)${NC}\n" "$f" "$s" "$p" "$r"
    done; echo ""
  done
}

check_batch() {
  local bv="BATCH_${1}[@]"; local aa=("${!bv}")
  for i in "${aa[@]}"; do
    [[ "$(get_agent_status "${AGENT_FOLDERS[$i]}")" != "COMPLETE" ]] && return 1
  done; return 0
}

case "${1:-status}" in
  status) show_dashboard ;;
  batch)
    local bn="${2:?Usage: $0 batch <N>}"
    [[ $bn -gt 1 ]] && ! check_batch $((bn-1)) && echo -e "${RED}Batch $((bn-1)) incomplete.${NC}" && exit 1
    echo -e "${GREEN}Batch $bn ready.${NC}"
    local bv="BATCH_${bn}[@]"; for i in "${!bv}"; do echo "  → ${AGENT_FOLDERS[$i]} (${AGENT_ROLES[$i]})"; done ;;
  agent)
    local an="${2:?Usage: $0 agent <N>}"
    echo -e "${CYAN}Agent: ${AGENT_FOLDERS[$an]}${NC}"
    echo "Copy bootstrap from COMMANDS.md" ;;
  *) echo "Usage: $0 {status|batch <N>|agent <N>}" ;;
esac
```

---

# End of AGENT-TEMPLATES.md
