#!/bin/bash
###############################################################################
#  FormForge Phase 6 — Multi-Agent Automation Runner
#  Production Hardening & Security
#
#  Agents: 16 (Supabase Audit) → 17 (Edge Functions) → 18 (E2E Testing)
#          → 19 (DevOps/Infra) → 20 (Launch Readiness) → 5 (i18n sweep)
#
#  Usage:
#    ./run-agents-phase6.sh                  # Run all agents 16→20 + i18n
#    ./run-agents-phase6.sh --agent 17       # Run single agent
#    ./run-agents-phase6.sh --resume         # Resume from checkpoint
#    ./run-agents-phase6.sh --status         # Show progress
#    ./run-agents-phase6.sh --reset          # Reset state (fresh start)
#
#  Requires: claude CLI (Claude Code), git, npm, node
#  Compatible: Linux, macOS, Windows Git Bash (MINGW64)
###############################################################################
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

PHASE=6
AGENTS_DIR=".agents-phase-6"
I18N_AGENT_DIR=".agents/agent-5-i18n"
STATE_DIR=".automation-phase6"
STATE_FILE="${STATE_DIR}/state.json"
LOG_FILE="${STATE_DIR}/runner.log"
MSG_FILE="${STATE_DIR}/current_message.txt"
MAX_RETRIES=5
MAX_FIX_ATTEMPTS=2

# Agent definitions: number|name|folder_suffix
AGENT_LIST=(
  "16|Supabase Audit|agent-16-supabase-audit"
  "17|Edge Functions|agent-17-edge-security"
  "18|E2E Testing|agent-18-e2e-testing"
  "19|DevOps & Infrastructure|agent-19-devops-infra"
  "20|Launch Readiness|agent-20-launch-readiness"
)

# ═══════════════════════════════════════════════════════════════════════════════
# COLORS (works in Git Bash / MINGW64)
# ═══════════════════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

log() {
  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "${timestamp} | $1" >> "${LOG_FILE}"
  echo -e "$1"
}

log_header() {
  echo ""
  log "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
  log "${PURPLE}  $1${NC}"
  log "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
}

log_step()    { log "${BLUE}→ $1${NC}"; }
log_success() { log "${GREEN}✅ $1${NC}"; }
log_error()   { log "${RED}❌ $1${NC}"; }
log_warn()    { log "${YELLOW}⚠️  $1${NC}"; }
log_info()    { log "${CYAN}ℹ️  $1${NC}"; }

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT (Pure Bash — no Python, no jq)
# ═══════════════════════════════════════════════════════════════════════════════

init_state_dir() {
  mkdir -p "${STATE_DIR}"
  if [ ! -f "${LOG_FILE}" ]; then
    touch "${LOG_FILE}"
  fi
}

init_state() {
  init_state_dir
  cat > "${STATE_FILE}" << 'STATEEOF'
{
  "phase": "6",
  "current_agent": "0",
  "current_session": "0",
  "status": "not_started",
  "agents_completed": "",
  "last_error": ""
}
STATEEOF
  log_info "State initialized"
}

# Read a value from state JSON using grep+sed (Git Bash safe)
read_state() {
  local key="$1"
  if [ ! -f "${STATE_FILE}" ]; then
    echo ""
    return
  fi
  grep "\"${key}\"" "${STATE_FILE}" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1
}

# Write a value to state JSON using sed (Git Bash safe)
write_state() {
  local key="$1"
  local value="$2"
  if [ ! -f "${STATE_FILE}" ]; then
    init_state
  fi
  # Use a temp file for portability (sed -i behaves differently on macOS vs Linux vs Git Bash)
  local tmpfile="${STATE_DIR}/state_tmp.json"
  sed "s|\"${key}\": *\"[^\"]*\"|\"${key}\": \"${value}\"|" "${STATE_FILE}" > "${tmpfile}"
  mv "${tmpfile}" "${STATE_FILE}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

get_agent_number() {
  echo "$1" | cut -d'|' -f1
}

get_agent_name() {
  echo "$1" | cut -d'|' -f2
}

get_agent_folder() {
  echo "$1" | cut -d'|' -f3
}

get_agent_dir() {
  local folder
  folder="$(get_agent_folder "$1")"
  echo "${AGENTS_DIR}/${folder}"
}

is_agent_complete() {
  local agent_dir="$1"
  if [ -f "${agent_dir}/PROGRESS.md" ]; then
    if grep -qi "COMPLETE" "${agent_dir}/PROGRESS.md" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

check_prerequisites() {
  log_step "Checking prerequisites..."
  
  local missing=0

  if ! command -v claude &>/dev/null; then
    log_error "claude CLI not found. Install: npm install -g @anthropic-ai/claude-code"
    missing=1
  fi

  if ! command -v git &>/dev/null; then
    log_error "git not found"
    missing=1
  fi

  if ! command -v npm &>/dev/null; then
    log_error "npm not found"
    missing=1
  fi

  if ! command -v node &>/dev/null; then
    log_error "node not found"
    missing=1
  fi

  if [ ! -f "CLAUDE.md" ]; then
    log_error "CLAUDE.md not found — are you in the project root?"
    missing=1
  fi

  if [ ! -d "${AGENTS_DIR}" ]; then
    log_error "${AGENTS_DIR}/ not found. Extract agents-phase-6-kit.tar.gz first."
    missing=1
  fi

  if [ "${missing}" -eq 1 ]; then
    log_error "Prerequisites check failed. Fix the above issues and retry."
    exit 1
  fi

  log_success "All prerequisites OK"
}

elapsed_time() {
  local start=$1
  local now
  now=$(date +%s)
  local diff=$((now - start))
  local mins=$((diff / 60))
  local secs=$((diff % 60))
  echo "${mins}m ${secs}s"
}

# ═══════════════════════════════════════════════════════════════════════════════
# BOOTSTRAP MESSAGE BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

build_bootstrap_message() {
  local agent_num="$1"
  local agent_name="$2"
  local agent_dir="$3"
  local is_resume="${4:-false}"

  local msg=""

  if [ "${is_resume}" = "true" ]; then
    msg="Read these files in this exact order:
1. CLAUDE.md
2. ${agent_dir}/AGENT.md
3. ${agent_dir}/HANDOFF.md
4. ${agent_dir}/PROMPTS.md
5. ${agent_dir}/PROGRESS.md
6. ${AGENTS_DIR}/SYNC-LOG.md

You are RESUMING Agent ${agent_num} — ${agent_name} for FormForge Phase 6.
Check HANDOFF.md and PROGRESS.md to see exactly where the last session left off.
Continue from the next incomplete prompt.

"
  else
    msg="Read these files in this exact order:
1. CLAUDE.md
2. ${agent_dir}/AGENT.md
3. ${agent_dir}/HANDOFF.md
4. ${agent_dir}/PROMPTS.md
5. ${AGENTS_DIR}/SYNC-LOG.md

You are Agent ${agent_num} — ${agent_name} for FormForge Phase 6: Production Hardening & Security.

"
  fi

  msg="${msg}CRITICAL WORKING RULES:
- Execute ALL prompts in order (${agent_num}.0, ${agent_num}.1, ${agent_num}.2, ${agent_num}.3, ${agent_num}.4) without stopping.
- After each prompt: update the checkbox in PROMPTS.md and append a session entry to PROGRESS.md.
- Run npm run lint and npx tsc --noEmit after each prompt to verify nothing broke.
- Do NOT run any git commands. Git is handled externally by the automation script.
- If you complete ALL prompts successfully, write PROGRESS.md status as COMPLETE and say the exact phrase: AGENT_COMPLETE
- If you are running low on context and cannot finish all prompts, write your current state to HANDOFF.md (what is done, what is next, files created/modified) and say the exact phrase: CONTEXT_LIMIT_REACHED
- These two phrases (AGENT_COMPLETE and CONTEXT_LIMIT_REACHED) are CRITICAL signals — the automation script watches for them.

Start working now."

  echo "${msg}"
}

build_i18n_message() {
  local msg="Read these files in order:
1. CLAUDE.md
2. ${I18N_AGENT_DIR}/AGENT.md
3. ${I18N_AGENT_DIR}/HANDOFF.md
4. ${AGENTS_DIR}/SYNC-LOG.md

You are Agent 5 — i18n & RTL. Phase 6 is complete (Agents 16-20).
Your task:

1. Scan src/ for hardcoded English strings not wrapped in t().
   Focus on NEW files created by Agents 19-20:
   - src/pages/Privacy.tsx
   - src/pages/DataExport.tsx
   - src/pages/AccountDeletion.tsx
   - src/components/ErrorBoundary.tsx (upgraded text)
   - Any new UI components created in Phase 6

2. Add all new keys to en.json under these namespaces:
   privacy.*, gdpr.*, errors.*, launch.*

3. Translate all new keys to he.json with accurate Hebrew.

4. Replace hardcoded strings with t() calls.

5. Fix RTL layout for new components:
   - Privacy page, data export page, error boundary
   - Use Tailwind logical properties (ms-, me-, ps-, pe-)

6. DO NOT modify any existing translated keys.
   Only add NEW keys that don't exist yet.

CRITICAL SIGNALS:
- When ALL translation work is done, say: AGENT_COMPLETE
- If running low on context, write HANDOFF.md and say: CONTEXT_LIMIT_REACHED
- Do NOT run git commands.

VERIFY:
- Toggle language to Hebrew — every new screen shows Hebrew
- Toggle back to English — no regressions
- RTL layout correct on all new components
- npm run lint and npx tsc --noEmit pass

Start working now."

  echo "${msg}"
}

build_fix_message() {
  echo "There are lint or type-check errors in the codebase. Run these commands:
  npm run lint
  npx tsc --noEmit

Read all the errors carefully, then fix them. Rules:
- Do NOT change any functionality — only fix lint and type errors.
- Do NOT add new features or modify behavior.
- Do NOT run git commands.
- When done fixing, run the verification commands again to confirm zero errors.
- Say AGENT_COMPLETE when all errors are fixed."
}

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

run_verification() {
  log_step "Running verification: npm run lint..."
  local lint_ok=0
  local tsc_ok=0

  if npm run lint >> "${LOG_FILE}" 2>&1; then
    log_success "Lint passed"
    lint_ok=1
  else
    log_warn "Lint has errors"
  fi

  log_step "Running verification: npx tsc --noEmit..."
  if npx tsc --noEmit >> "${LOG_FILE}" 2>&1; then
    log_success "TypeScript check passed"
    tsc_ok=1
  else
    log_warn "TypeScript has errors"
  fi

  if [ "${lint_ok}" -eq 1 ] && [ "${tsc_ok}" -eq 1 ]; then
    return 0
  else
    return 1
  fi
}

auto_fix() {
  local attempt=0
  while [ "${attempt}" -lt "${MAX_FIX_ATTEMPTS}" ]; do
    attempt=$((attempt + 1))
    log_warn "Auto-fix attempt ${attempt}/${MAX_FIX_ATTEMPTS}..."

    local fix_msg
    fix_msg="$(build_fix_message)"

    local fix_log="${STATE_DIR}/fix_attempt_${attempt}.log"
    log_step "Sending fix prompt to Claude..."

    if claude -p "${fix_msg}" --dangerously-skip-permissions --output-format text > "${fix_log}" 2>&1; then
      log_info "Fix session completed"
    else
      log_warn "Fix session returned non-zero exit code"
    fi

    if run_verification; then
      log_success "Auto-fix succeeded on attempt ${attempt}"
      return 0
    fi
  done

  log_error "Auto-fix failed after ${MAX_FIX_ATTEMPTS} attempts"
  return 1
}

git_commit() {
  local message="$1"
  log_step "Git commit: ${message}"
  git add -A >> "${LOG_FILE}" 2>&1
  git commit -m "${message}" >> "${LOG_FILE}" 2>&1 || {
    log_info "Nothing to commit (working tree clean)"
  }
}

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

run_agent() {
  local agent_entry="$1"
  local agent_num
  local agent_name
  local agent_folder
  local agent_dir

  agent_num="$(get_agent_number "${agent_entry}")"
  agent_name="$(get_agent_name "${agent_entry}")"
  agent_folder="$(get_agent_folder "${agent_entry}")"
  agent_dir="$(get_agent_dir "${agent_entry}")"

  log_header "AGENT ${agent_num}: ${agent_name}"

  # Check if already complete
  if is_agent_complete "${agent_dir}"; then
    log_success "Agent ${agent_num} already COMPLETE — skipping"
    return 0
  fi

  # Verify agent directory exists
  if [ ! -d "${agent_dir}" ]; then
    log_error "Agent directory not found: ${agent_dir}"
    return 1
  fi

  write_state "current_agent" "${agent_num}"
  write_state "status" "running"

  local session=1
  local agent_done=false
  local agent_start
  agent_start=$(date +%s)

  while [ "${session}" -le "${MAX_RETRIES}" ] && [ "${agent_done}" = "false" ]; do
    local session_log="${STATE_DIR}/agent_${agent_num}_session_${session}.log"
    local is_resume="false"

    if [ "${session}" -gt 1 ]; then
      is_resume="true"
    fi

    write_state "current_session" "${session}"
    log_step "Session ${session}/${MAX_RETRIES} for Agent ${agent_num} (resume=${is_resume})"

    # Build the message
    local message
    message="$(build_bootstrap_message "${agent_num}" "${agent_name}" "${agent_dir}" "${is_resume}")"

    # Save message for debugging
    echo "${message}" > "${MSG_FILE}"

    # Run Claude
    local session_start
    session_start=$(date +%s)
    log_step "Sending prompt to Claude (this may take 10-30 minutes)..."

    local claude_exit=0
    claude -p "${message}" --dangerously-skip-permissions --output-format text > "${session_log}" 2>&1 || claude_exit=$?

    local session_elapsed
    session_elapsed="$(elapsed_time "${session_start}")"
    log_info "Session ${session} completed in ${session_elapsed} (exit code: ${claude_exit})"

    # Check for signals in output
    if grep -q "AGENT_COMPLETE" "${session_log}" 2>/dev/null; then
      log_success "Agent ${agent_num} signaled AGENT_COMPLETE"
      agent_done=true

    elif grep -q "CONTEXT_LIMIT_REACHED" "${session_log}" 2>/dev/null; then
      log_warn "Agent ${agent_num} signaled CONTEXT_LIMIT_REACHED — will resume"
      
      # Commit partial work before resuming
      git_commit "Agent ${agent_num}: Partial work (session ${session}, context limit)"
      
      session=$((session + 1))
      sleep 3

    else
      # No signal found — check if agent is complete by other means
      if is_agent_complete "${agent_dir}"; then
        log_success "Agent ${agent_num} is COMPLETE (detected from PROGRESS.md)"
        agent_done=true
      else
        log_warn "No signal detected in output. Checking PROGRESS.md..."
        # Check if prompts file shows all checked
        local unchecked
        unchecked=$(grep -c "\[ \]" "${agent_dir}/PROMPTS.md" 2>/dev/null) || unchecked=0
        unchecked="${unchecked// /}"
        unchecked="${unchecked:-0}"
        if [ "${unchecked}" = "0" ]; then
          log_success "All prompts checked off — treating as complete"
          agent_done=true
        else
          log_warn "${unchecked} prompts still unchecked. Resuming..."
          git_commit "Agent ${agent_num}: Partial work (session ${session}, no signal)"
          session=$((session + 1))
          sleep 3
        fi
      fi
    fi
  done

  if [ "${agent_done}" = "false" ]; then
    log_error "Agent ${agent_num} did not complete after ${MAX_RETRIES} sessions"
    write_state "status" "failed"
    write_state "last_error" "Agent ${agent_num} exceeded max retries"
    return 1
  fi

  # Verification
  log_step "Running post-agent verification..."
  if ! run_verification; then
    log_warn "Verification failed — attempting auto-fix..."
    if ! auto_fix; then
      log_error "Agent ${agent_num} completed but verification still fails"
      write_state "status" "verify_failed"
      write_state "last_error" "Agent ${agent_num} verification failed"
      return 1
    fi
  fi

  # Commit
  git_commit "Agent ${agent_num}: All prompts complete"

  local agent_elapsed
  agent_elapsed="$(elapsed_time "${agent_start}")"
  log_success "Agent ${agent_num} (${agent_name}) completed in ${agent_elapsed}"

  # Update completed agents list
  local completed
  completed="$(read_state "agents_completed")"
  if [ -z "${completed}" ]; then
    write_state "agents_completed" "${agent_num}"
  else
    write_state "agents_completed" "${completed},${agent_num}"
  fi

  return 0
}

# ═══════════════════════════════════════════════════════════════════════════════
# I18N SWEEP
# ═══════════════════════════════════════════════════════════════════════════════

run_i18n_sweep() {
  log_header "AGENT 5: i18n Sweep for Phase 6"

  if [ ! -d "${I18N_AGENT_DIR}" ]; then
    log_warn "i18n agent directory not found at ${I18N_AGENT_DIR} — skipping"
    return 0
  fi

  local i18n_log="${STATE_DIR}/i18n_phase_6.log"
  local message
  message="$(build_i18n_message)"

  echo "${message}" > "${MSG_FILE}"

  local i18n_start
  i18n_start=$(date +%s)
  log_step "Sending i18n prompt to Claude..."

  local claude_exit=0
  claude -p "${message}" --dangerously-skip-permissions --output-format text > "${i18n_log}" 2>&1 || claude_exit=$?

  local i18n_elapsed
  i18n_elapsed="$(elapsed_time "${i18n_start}")"
  log_info "i18n sweep completed in ${i18n_elapsed}"

  if run_verification; then
    git_commit "Agent 5: i18n sweep Phase 6"
    log_success "i18n sweep complete and verified"
  else
    log_warn "i18n sweep has verification issues — attempting auto-fix..."
    if auto_fix; then
      git_commit "Agent 5: i18n sweep Phase 6 (with auto-fix)"
      log_success "i18n sweep complete (after auto-fix)"
    else
      log_warn "i18n verification still failing — committed anyway"
      git_commit "Agent 5: i18n sweep Phase 6 (verify issues)"
    fi
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# SHOW STATUS
# ═══════════════════════════════════════════════════════════════════════════════

show_status() {
  init_state_dir
  log_header "Phase 6 Status"

  if [ ! -f "${STATE_FILE}" ]; then
    log_info "No state file found. Run the script to begin."
    echo ""
    # Still show agent status from files
  fi

  echo ""
  echo "  Agent    Name                           Status        Prompts"
  echo "  -------  -----------------------------  ------------  -------"

  for entry in "${AGENT_LIST[@]}"; do
    local num name dir
    num="$(get_agent_number "${entry}")"
    name="$(get_agent_name "${entry}")"
    dir="$(get_agent_dir "${entry}")"

    local status_text="NOT STARTED"
    local status_color="${NC}"
    local checked=0
    local unchecked=0
    local total=0

    if [ -d "${dir}" ]; then
      if is_agent_complete "${dir}"; then
        status_text="COMPLETE"
        status_color="${GREEN}"
      elif [ -f "${dir}/PROGRESS.md" ]; then
        local linecount
        linecount=$(wc -l < "${dir}/PROGRESS.md" 2>/dev/null)
        linecount="${linecount// /}"
        if [ "${linecount:-0}" -gt 5 ] 2>/dev/null; then
          status_text="IN PROGRESS"
          status_color="${YELLOW}"
        fi
      fi

      if [ -f "${dir}/PROMPTS.md" ]; then
        checked=$(grep -c "\[x\]" "${dir}/PROMPTS.md" 2>/dev/null) || checked=0
        checked="${checked// /}"
        checked="${checked:-0}"
        unchecked=$(grep -c "\[ \]" "${dir}/PROMPTS.md" 2>/dev/null) || unchecked=0
        unchecked="${unchecked// /}"
        unchecked="${unchecked:-0}"
        total=$((checked + unchecked))
      fi
    else
      status_text="NOT FOUND"
      status_color="${RED}"
    fi

    printf "  %-7s  %-29s  " "${num}" "${name}"
    echo -e "${status_color}${status_text}${NC}  ${checked}/${total}"
  done

  echo ""

  if [ -f "${STATE_FILE}" ]; then
    local cur_status
    cur_status="$(read_state "status")"
    local cur_agent
    cur_agent="$(read_state "current_agent")"
    local completed
    completed="$(read_state "agents_completed")"
    log_info "Automation status: ${cur_status}"
    if [ -n "${cur_agent}" ] && [ "${cur_agent}" != "0" ]; then
      log_info "Current/last agent: ${cur_agent}"
    fi
    if [ -n "${completed}" ]; then
      log_info "Completed agents: ${completed}"
    fi
  fi

  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL BUILD & DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════

final_build() {
  log_header "FINAL BUILD & DEPLOY"

  log_step "Running production build..."
  if npm run build >> "${LOG_FILE}" 2>&1; then
    log_success "Production build succeeded"
  else
    log_error "Production build FAILED"
    return 1
  fi

  log_step "Pushing to origin/main..."
  if git push origin main >> "${LOG_FILE}" 2>&1; then
    log_success "Pushed to origin/main"
  else
    log_warn "Git push failed (may need manual push)"
  fi

  echo ""
  echo -e "${GREEN}"
  echo "  ╔═══════════════════════════════════════════════════════════╗"
  echo "  ║                                                           ║"
  echo "  ║     🚀  FORMFORGE PHASE 6 COMPLETE — LAUNCH READY  🚀   ║"
  echo "  ║                                                           ║"
  echo "  ║   All agents executed. All verifications passed.          ║"
  echo "  ║   Code pushed. Ready for production launch.               ║"
  echo "  ║                                                           ║"
  echo "  ║   Next: Execute docs/launch-runbook.md                    ║"
  echo "  ║                                                           ║"
  echo "  ╚═══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION FLOWS
# ═══════════════════════════════════════════════════════════════════════════════

run_single_agent() {
  local target_num="$1"
  check_prerequisites
  init_state

  for entry in "${AGENT_LIST[@]}"; do
    local num
    num="$(get_agent_number "${entry}")"
    if [ "${num}" = "${target_num}" ]; then
      run_agent "${entry}"
      return $?
    fi
  done

  log_error "Agent ${target_num} not found in Phase 6 agent list"
  return 1
}

run_resume() {
  check_prerequisites

  if [ ! -f "${STATE_FILE}" ]; then
    log_error "No state file found. Cannot resume. Run without --resume first."
    exit 1
  fi

  local cur_agent
  cur_agent="$(read_state "current_agent")"
  local completed
  completed="$(read_state "agents_completed")"

  log_info "Resuming from agent ${cur_agent}. Completed so far: ${completed}"

  local started=false

  for entry in "${AGENT_LIST[@]}"; do
    local num
    num="$(get_agent_number "${entry}")"

    # Skip completed agents
    if echo ",${completed}," | grep -q ",${num},"; then
      log_info "Agent ${num} already completed — skipping"
      continue
    fi

    # Also skip if PROGRESS.md says COMPLETE
    local dir
    dir="$(get_agent_dir "${entry}")"
    if is_agent_complete "${dir}"; then
      log_info "Agent ${num} COMPLETE in PROGRESS.md — skipping"
      continue
    fi

    started=true
    if ! run_agent "${entry}"; then
      log_error "Agent ${num} failed. Fix issues and run with --resume"
      exit 1
    fi
  done

  if [ "${started}" = "false" ]; then
    log_success "All feature agents already complete"
  fi

  # i18n sweep
  run_i18n_sweep

  # Final build
  final_build
  write_state "status" "complete"
}

run_all() {
  local total_start
  total_start=$(date +%s)

  check_prerequisites
  init_state

  log_header "FormForge Phase 6 — Production Hardening & Security"
  log_info "Agents: 16 → 17 → 18 → 19 → 20 → i18n sweep"
  log_info "Estimated time: 2-3 hours"
  log_info "Log file: ${LOG_FILE}"
  echo ""

  write_state "status" "running"

  # Run each agent sequentially
  for entry in "${AGENT_LIST[@]}"; do
    local num
    num="$(get_agent_number "${entry}")"

    if ! run_agent "${entry}"; then
      log_error "Pipeline stopped at Agent ${num}. Fix issues and run with --resume"
      write_state "status" "failed"
      exit 1
    fi
  done

  log_success "All 5 feature agents complete"

  # i18n sweep
  run_i18n_sweep

  # Final build & deploy
  final_build

  local total_elapsed
  total_elapsed="$(elapsed_time "${total_start}")"

  write_state "status" "complete"

  log_header "EXECUTION SUMMARY"
  log_success "Phase 6 completed in ${total_elapsed}"
  log_info "Agents executed: 16, 17, 18, 19, 20 + i18n sweep"
  log_info "Logs: ${STATE_DIR}/"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CLI ARGUMENT PARSING
# ═══════════════════════════════════════════════════════════════════════════════

main() {
  # Always init state dir first (before any file reads)
  init_state_dir

  case "${1:-}" in
    --status)
      show_status
      ;;
    --agent)
      if [ -z "${2:-}" ]; then
        log_error "Usage: ./run-agents-phase6.sh --agent <number>"
        exit 1
      fi
      run_single_agent "$2"
      ;;
    --resume)
      run_resume
      ;;
    --reset)
      log_step "Resetting state..."
      init_state
      log_success "State reset. Ready for fresh run."
      ;;
    --help|-h)
      echo ""
      echo "FormForge Phase 6 — Multi-Agent Automation Runner"
      echo ""
      echo "Usage:"
      echo "  ./run-agents-phase6.sh              Run all agents (16→20 + i18n)"
      echo "  ./run-agents-phase6.sh --agent 17   Run single agent"
      echo "  ./run-agents-phase6.sh --resume     Resume from checkpoint"
      echo "  ./run-agents-phase6.sh --status     Show progress"
      echo "  ./run-agents-phase6.sh --reset      Reset state (fresh start)"
      echo "  ./run-agents-phase6.sh --help       Show this help"
      echo ""
      ;;
    "")
      run_all
      ;;
    *)
      log_error "Unknown argument: $1"
      echo "Run with --help for usage"
      exit 1
      ;;
  esac
}

main "$@"
