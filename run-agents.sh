#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# FormForge Agent Automation Runner
# ═══════════════════════════════════════════════════════════════════
# 
# Usage:
#   ./run-agents.sh                    # Run all phases from beginning
#   ./run-agents.sh --phase 2          # Run only Phase 2
#   ./run-agents.sh --agent 7          # Run only Agent 7
#   ./run-agents.sh --resume           # Resume from last checkpoint
#   ./run-agents.sh --status           # Show current progress
#
# Prerequisites:
#   - claude CLI installed (npm install -g @anthropic-ai/claude-code)
#   - Project repo cloned with .agents/ folder populated
#   - npm dependencies installed
#
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.agents"
AUTOMATION_DIR="$PROJECT_ROOT/.automation"
LOG_FILE="$AUTOMATION_DIR/runner.log"
STATE_FILE="$AUTOMATION_DIR/state.json"
MAX_PROMPT_ATTEMPTS=2
VERIFY_TIMEOUT=120

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ── Phase Definitions ──
# Format: "phase_number:agent_number:agent_folder:prompt_count"
PHASE_2_AGENTS=("6:agent-6-billing:5" "7:agent-7-limits:5" "8:agent-8-onboarding:5")
PHASE_3_AGENTS=("9:agent-9-webhooks:5" "10:agent-10-integrations:4" "11:agent-11-templates:5")
PHASE_4_AGENTS=("12:agent-12-ai-generator:4" "13:agent-13-smart-routing:4")
PHASE_5_AGENTS=("14:agent-14-enterprise:4" "15:agent-15-workflows:5")

# ═══════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

log() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${timestamp} | $1" | tee -a "$LOG_FILE"
}

header() {
  echo ""
  echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${WHITE}  $1${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  log "HEADER: $1"
}

success() { echo -e "${GREEN}✅ $1${NC}"; log "SUCCESS: $1"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; log "WARNING: $1"; }
error()   { echo -e "${RED}❌ $1${NC}"; log "ERROR: $1"; }
info()    { echo -e "${CYAN}ℹ️  $1${NC}"; log "INFO: $1"; }
step()    { echo -e "${BLUE}→ $1${NC}"; log "STEP: $1"; }

# Initialize automation directory
init_automation() {
  mkdir -p "$AUTOMATION_DIR"
  if [ ! -f "$STATE_FILE" ]; then
    echo '{"current_phase":"0","current_agent":"0","current_prompt":"0","status":"not_started"}' > "$STATE_FILE"
  fi
  if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE"
  fi
  log "━━━━━ Session started ━━━━━"
}

# Read/write state (pure bash — no Python dependency)
get_state() {
  local key="$1"
  if [ ! -f "$STATE_FILE" ]; then
    echo ""
    return
  fi
  # Extract value for key from simple JSON using grep+sed
  grep "\"$key\"" "$STATE_FILE" 2>/dev/null | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1
}

set_state() {
  local key="$1"
  local value="$2"
  if [ ! -f "$STATE_FILE" ]; then
    echo "{\"$key\":\"$value\"}" > "$STATE_FILE"
    return
  fi
  # Read current state, update key, write back
  if grep -q "\"$key\"" "$STATE_FILE" 2>/dev/null; then
    # Key exists — replace it
    sed -i "s/\"$key\" *: *\"[^\"]*\"/\"$key\":\"$value\"/" "$STATE_FILE"
  else
    # Key doesn't exist — add before closing brace
    sed -i "s/}$/,\"$key\":\"$value\"}/" "$STATE_FILE"
  fi
}

# ═══════════════════════════════════════════════════════════════════
# VERIFICATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

run_lint() {
  step "Running ESLint..."
  if cd "$PROJECT_ROOT" && npm run lint 2>&1 | tail -5; then
    success "Lint passed"
    return 0
  else
    error "Lint FAILED"
    return 1
  fi
}

run_typecheck() {
  step "Running TypeScript type-check..."
  if cd "$PROJECT_ROOT" && npx tsc --noEmit 2>&1 | tail -10; then
    success "Type-check passed"
    return 0
  else
    error "Type-check FAILED"
    return 1
  fi
}

run_tests() {
  step "Running tests..."
  if cd "$PROJECT_ROOT" && npm run test 2>&1 | tail -10; then
    success "Tests passed"
    return 0
  else
    warning "Tests failed (non-blocking)"
    return 0  # Don't block on tests
  fi
}

run_build() {
  step "Running production build..."
  if cd "$PROJECT_ROOT" && npm run build 2>&1 | tail -5; then
    success "Build passed"
    return 0
  else
    error "Build FAILED"
    return 1
  fi
}

full_verify() {
  header "QUALITY GATE — Verification"
  local pass=true
  
  run_lint    || pass=false
  run_typecheck || pass=false
  
  if $pass; then
    success "All verifications PASSED"
    return 0
  else
    error "Verification FAILED — fix before continuing"
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════
# GIT FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

git_commit() {
  local message="$1"
  cd "$PROJECT_ROOT"
  
  if git diff --quiet && git diff --cached --quiet; then
    info "No changes to commit"
    return 0
  fi
  
  step "Committing: $message"
  git add -A
  git commit -m "$message" 2>&1 | tail -3
  success "Committed: $message"
}

git_push() {
  step "Pushing to remote..."
  cd "$PROJECT_ROOT"
  git push origin main 2>&1 | tail -3
  success "Pushed to remote"
}

# ═══════════════════════════════════════════════════════════════════
# PROGRESS CHECK FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

# Check if an agent is complete by reading PROGRESS.md
is_agent_complete() {
  local agent_folder="$1"
  local progress_file="$AGENTS_DIR/$agent_folder/PROGRESS.md"
  
  if [ -f "$progress_file" ]; then
    if grep -q "COMPLETE" "$progress_file" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Get the last completed prompt number for an agent
get_last_completed_prompt() {
  local agent_folder="$1"
  local progress_file="$AGENTS_DIR/$agent_folder/PROGRESS.md"
  
  if [ ! -f "$progress_file" ]; then
    echo "0"
    return
  fi
  
  # Look for the last "✅ Complete" or "COMPLETE" prompt
  local last=$(grep -oP '(\d+\.\d+).*✅' "$progress_file" 2>/dev/null | tail -1 | grep -oP '^\d+\.\d+' || echo "")
  
  if [ -z "$last" ]; then
    echo "0"
  else
    echo "$last"
  fi
}

# Show full progress status
show_status() {
  header "FormForge Agent Progress Status"
  
  local all_phases=("2:${PHASE_2_AGENTS[*]}" "3:${PHASE_3_AGENTS[*]}" "4:${PHASE_4_AGENTS[*]}" "5:${PHASE_5_AGENTS[*]}")
  
  for phase_data in "2:PHASE_2" "3:PHASE_3" "4:PHASE_4" "5:PHASE_5"; do
    local phase_num="${phase_data%%:*}"
    local phase_var="${phase_data##*:}_AGENTS[@]"
    
    echo -e "\n${WHITE}Phase $phase_num:${NC}"
    
    eval 'agents=("${'$phase_var'}")'
    for agent_entry in "${agents[@]}"; do
      IFS=':' read -r agent_num agent_folder prompt_count <<< "$agent_entry"
      
      if is_agent_complete "$agent_folder"; then
        echo -e "  ${GREEN}✅ Agent $agent_num ($agent_folder) — COMPLETE${NC}"
      else
        local last=$(get_last_completed_prompt "$agent_folder")
        if [ "$last" = "0" ]; then
          echo -e "  ${YELLOW}⏳ Agent $agent_num ($agent_folder) — NOT STARTED${NC}"
        else
          echo -e "  ${BLUE}🔄 Agent $agent_num ($agent_folder) — In progress (last: $last)${NC}"
        fi
      fi
    done
  done
  
  echo ""
}

# ═══════════════════════════════════════════════════════════════════
# CLAUDE CODE INTERACTION
# ═══════════════════════════════════════════════════════════════════

# Build the bootstrap message for an agent
build_bootstrap_message() {
  local agent_num="$1"
  local agent_folder="$2"
  local is_resume="$3"
  
  if [ "$is_resume" = "true" ]; then
    cat <<EOF
Read these files in this exact order before doing anything:
1. CLAUDE.md
2. .agents/${agent_folder}/AGENT.md
3. .agents/${agent_folder}/HANDOFF.md
4. .agents/${agent_folder}/PROMPTS.md
5. .agents/${agent_folder}/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent ${agent_num}. Check PROGRESS.md and HANDOFF.md to see where you left off.

CRITICAL WORKING RULES:
- Execute the NEXT UNCOMPLETED prompt from PROMPTS.md.
- After completing each prompt, run: npm run lint && npx tsc --noEmit
- If both pass, update PROGRESS.md (mark prompt as ✅ Complete with timestamp).
- Then IMMEDIATELY continue to the next prompt. Do NOT stop and wait for me.
- Keep going through ALL remaining prompts automatically.
- If context is getting long and you sense you are near the limit, STOP IMMEDIATELY:
  1. Write everything to HANDOFF.md (what's done, what's next, decisions made)
  2. Update PROGRESS.md with current state
  3. Say exactly: "CONTEXT_LIMIT_REACHED" so the automation knows to restart you.
- When ALL prompts are complete:
  1. Update PROGRESS.md to say "## Status: ✅ COMPLETE"
  2. Write final HANDOFF.md for the next agent
  3. Update .agents/SYNC-LOG.md with any shared files you modified
  4. Say exactly: "AGENT_COMPLETE" so the automation knows to proceed.
- git commits are handled externally. Do NOT run git commands.

Start working now. Execute the next uncompleted prompt.
EOF
  else
    cat <<EOF
Read these files in this exact order before doing anything:
1. CLAUDE.md
2. .agents/${agent_folder}/AGENT.md
3. .agents/${agent_folder}/HANDOFF.md
4. .agents/${agent_folder}/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent ${agent_num}. Confirm you understand your role, owned files, and DO NOT TOUCH files.

CRITICAL WORKING RULES:
- Start with Prompt ${agent_num}.0 (planning). When complete, immediately continue to ${agent_num}.1, then ${agent_num}.2, and so on through ALL prompts.
- After completing each prompt, run: npm run lint && npx tsc --noEmit
- If both pass, update PROGRESS.md (mark prompt as ✅ Complete with timestamp).
- Then IMMEDIATELY continue to the next prompt. Do NOT stop and wait for me.
- Keep going through ALL prompts automatically without pausing.
- If context is getting long and you sense you are near the limit, STOP IMMEDIATELY:
  1. Write everything to HANDOFF.md (what's done, what's next, decisions made, files created)
  2. Update PROGRESS.md with current state
  3. Say exactly: "CONTEXT_LIMIT_REACHED" so the automation knows to restart you.
- When ALL prompts are complete:
  1. Update PROGRESS.md to say "## Status: ✅ COMPLETE"
  2. Write final HANDOFF.md for the next agent
  3. Update .agents/SYNC-LOG.md with any shared files you modified
  4. Say exactly: "AGENT_COMPLETE" so the automation knows to proceed.
- git commits are handled externally. Do NOT run git commands.

Start working now. Begin with Prompt ${agent_num}.0.
EOF
  fi
}

# Build the Agent 5 i18n sweep message for a specific phase
build_i18n_message() {
  local phase_num="$1"
  local agent_folders="$2"  # comma-separated list
  
  cat <<EOF
Read these files in this exact order:
1. CLAUDE.md
2. .agents/agent-5-i18n/AGENT.md
3. .agents/agent-5-i18n/HANDOFF.md
4. .agents/SYNC-LOG.md

You are Agent 5 — i18n & RTL. Phase ${phase_num} is COMPLETE.
Agents that built new features: ${agent_folders}

Your task for this i18n sweep:

1. Scan src/ for hardcoded English strings NOT wrapped in t().
   Focus on NEW files created by the Phase ${phase_num} agents.
   Check every .tsx and .ts file in:
$(echo "$agent_folders" | tr ',' '\n' | while read folder; do
   echo "   - Files owned by $folder (see their AGENT.md for file list)"
done)

2. For each unwrapped string found:
   a. Add key to src/i18n/locales/en.json under appropriate namespace
   b. Add Hebrew translation to src/i18n/locales/he.json
   c. Replace the string with t('namespace.key')

3. Fix RTL layout for ALL new components:
   - Use Tailwind logical properties (ms-, me-, ps-, pe-, text-start, text-end)
   - Charts stay LTR (direction: ltr wrapper)
   - Inputs for email/URL/phone stay LTR
   - Test: toggle to Hebrew, verify layout doesn't break

4. DO NOT modify existing translated keys. Only add NEW ones.

5. After each batch of changes:
   - npm run lint && npx tsc --noEmit

6. When complete:
   - Update .agents/agent-5-i18n/PROGRESS.md with sweep summary
   - Say exactly: "AGENT_COMPLETE"

IMPORTANT: Hebrew translations must be natural and professional.
Use proper Hebrew SaaS/tech terminology, not literal translation.

Start working now.
EOF
}

# Run a single agent through Claude Code
run_agent() {
  local agent_num="$1"
  local agent_folder="$2"
  local prompt_count="$3"
  local is_resume="${4:-false}"
  
  header "Agent $agent_num — $agent_folder"
  
  # Check if already complete
  if is_agent_complete "$agent_folder"; then
    success "Agent $agent_num already COMPLETE — skipping"
    return 0
  fi
  
  info "Starting Agent $agent_num ($agent_folder) with $prompt_count prompts"
  set_state "current_agent" "$agent_num"
  set_state "status" "running_agent_$agent_num"
  
  local message
  message=$(build_bootstrap_message "$agent_num" "$agent_folder" "$is_resume")
  
  # Write the message to a temp file for piping
  local msg_file="$AUTOMATION_DIR/current_message.txt"
  echo "$message" > "$msg_file"
  
  local attempt=1
  local max_context_restarts=5
  
  while [ $attempt -le $max_context_restarts ]; do
    info "Session attempt $attempt for Agent $agent_num"
    
    # Run Claude Code with the message piped via --print flag
    # Using the -p flag for non-interactive single prompt execution
    local output_file="$AUTOMATION_DIR/agent_${agent_num}_session_${attempt}.log"
    
    echo ""
    echo -e "${WHITE}┌──────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│  Running Claude Code for Agent $agent_num...         │${NC}"
    echo -e "${WHITE}│  Output: $output_file  │${NC}"
    echo -e "${WHITE}└──────────────────────────────────────────────┘${NC}"
    echo ""
    
    # Execute Claude Code with the prompt
    # -p flag = print mode (non-interactive, runs prompt and exits)
    # --output-format text = plain text output
    cd "$PROJECT_ROOT"
    
    if claude -p "$(cat "$msg_file")" \
        --dangerously-skip-permissions \
        --output-format text \
        2>&1 | tee "$output_file"; then
      
      # Check the output for completion signals
      if grep -q "AGENT_COMPLETE" "$output_file"; then
        success "Agent $agent_num completed ALL prompts!"
        
        # Run verification
        if full_verify; then
          git_commit "Agent $agent_num: All prompts complete"
          set_state "status" "agent_${agent_num}_complete"
          return 0
        else
          warning "Verification failed after Agent $agent_num — attempting fix"
          # Run Claude again to fix lint/typecheck issues
          claude -p "There are lint or type-check errors. Run npm run lint and npx tsc --noEmit, read the errors, and fix them. Do not change any functionality, only fix the errors." \
            --dangerously-skip-permissions \
            --output-format text \
            2>&1 | tee -a "$output_file"
          
          if full_verify; then
            git_commit "Agent $agent_num: All prompts complete (with fixes)"
            set_state "status" "agent_${agent_num}_complete"
            return 0
          else
            error "Could not fix verification errors for Agent $agent_num"
            return 1
          fi
        fi
        
      elif grep -q "CONTEXT_LIMIT_REACHED" "$output_file"; then
        warning "Context limit reached for Agent $agent_num — restarting session"
        
        # Commit whatever work was done
        git_commit "Agent $agent_num: Partial work (context restart $attempt)"
        
        # Rebuild message as resume
        message=$(build_bootstrap_message "$agent_num" "$agent_folder" "true")
        echo "$message" > "$msg_file"
        
        attempt=$((attempt + 1))
        sleep 2
        continue
        
      else
        # Claude exited without a clear signal — check progress
        warning "Claude exited without completion signal"
        
        if is_agent_complete "$agent_folder"; then
          success "Agent $agent_num is marked complete in PROGRESS.md"
          git_commit "Agent $agent_num: Complete"
          return 0
        fi
        
        # Commit partial work and retry
        git_commit "Agent $agent_num: Partial work (session $attempt)"
        message=$(build_bootstrap_message "$agent_num" "$agent_folder" "true")
        echo "$message" > "$msg_file"
        attempt=$((attempt + 1))
        sleep 2
        continue
      fi
      
    else
      error "Claude Code process exited with error"
      attempt=$((attempt + 1))
      sleep 5
    fi
  done
  
  error "Agent $agent_num failed after $max_context_restarts context restarts"
  return 1
}

# Run Agent 5 i18n sweep for a phase
run_i18n_sweep() {
  local phase_num="$1"
  shift
  local agent_folders="$*"
  
  header "Agent 5 — i18n Sweep for Phase $phase_num"
  
  info "Translating new strings from: $agent_folders"
  set_state "status" "i18n_sweep_phase_$phase_num"
  
  local message
  message=$(build_i18n_message "$phase_num" "$agent_folders")
  
  local output_file="$AUTOMATION_DIR/i18n_phase_${phase_num}.log"
  
  cd "$PROJECT_ROOT"
  
  local attempt=1
  while [ $attempt -le 3 ]; do
    if claude -p "$message" \
        --dangerously-skip-permissions \
        --output-format text \
        2>&1 | tee "$output_file"; then
      
      if grep -q "AGENT_COMPLETE" "$output_file"; then
        success "i18n sweep for Phase $phase_num complete!"
        
        if full_verify; then
          git_commit "Agent 5: i18n sweep Phase $phase_num"
          return 0
        else
          # Fix attempt
          claude -p "Fix all lint and type-check errors. Run npm run lint && npx tsc --noEmit and fix issues." \
            --dangerously-skip-permissions \
            --output-format text \
            2>&1 | tee -a "$output_file"
          git_commit "Agent 5: i18n sweep Phase $phase_num (with fixes)"
          return 0
        fi
        
      elif grep -q "CONTEXT_LIMIT_REACHED" "$output_file"; then
        warning "Context limit on i18n sweep — restarting"
        git_commit "Agent 5: i18n sweep Phase $phase_num (partial)"
        # Rebuild with resume context
        message="Read CLAUDE.md, .agents/agent-5-i18n/AGENT.md, .agents/agent-5-i18n/HANDOFF.md, .agents/agent-5-i18n/PROGRESS.md. Resume i18n sweep for Phase $phase_num. Check HANDOFF.md for where you left off. Continue translating remaining strings. Say AGENT_COMPLETE when done."
        attempt=$((attempt + 1))
        continue
      fi
    fi
    
    attempt=$((attempt + 1))
  done
  
  warning "i18n sweep may be incomplete — check manually"
  git_commit "Agent 5: i18n sweep Phase $phase_num (may need manual check)"
  return 0
}

# ═══════════════════════════════════════════════════════════════════
# PHASE RUNNERS
# ═══════════════════════════════════════════════════════════════════

run_phase() {
  local phase_num="$1"
  shift
  local agents=("$@")
  
  header "PHASE $phase_num"
  set_state "current_phase" "$phase_num"
  
  local agent_folder_list=""
  
  for agent_entry in "${agents[@]}"; do
    IFS=':' read -r agent_num agent_folder prompt_count <<< "$agent_entry"
    
    run_agent "$agent_num" "$agent_folder" "$prompt_count"
    
    if [ $? -ne 0 ]; then
      error "Phase $phase_num FAILED at Agent $agent_num"
      echo ""
      echo -e "${RED}════════════════════════════════════════════════════${NC}"
      echo -e "${RED}  AUTOMATION STOPPED — Agent $agent_num failed${NC}"
      echo -e "${RED}  Check: .automation/agent_${agent_num}_session_*.log${NC}"
      echo -e "${RED}  Fix issues manually, then run:${NC}"
      echo -e "${RED}    ./run-agents.sh --resume${NC}"
      echo -e "${RED}════════════════════════════════════════════════════${NC}"
      return 1
    fi
    
    agent_folder_list="${agent_folder_list:+$agent_folder_list,}$agent_folder"
  done
  
  # Phase complete — run full verification
  header "Phase $phase_num — Final Verification"
  if full_verify; then
    success "Phase $phase_num PASSED all quality gates"
  else
    error "Phase $phase_num failed final verification"
    return 1
  fi
  
  # Run Agent 5 i18n sweep
  run_i18n_sweep "$phase_num" "$agent_folder_list"
  
  # Final build check
  run_build
  
  # Push and deploy
  header "Phase $phase_num — Deploy"
  git_push
  
  local version=$((phase_num - 0))
  success "Phase $phase_num COMPLETE — deployed as v${version}.0"
  set_state "status" "phase_${phase_num}_complete"
  
  echo ""
  echo -e "${GREEN}┌──────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}│                                              │${NC}"
  echo -e "${GREEN}│   🚀 Phase $phase_num deployed successfully!       │${NC}"
  echo -e "${GREEN}│                                              │${NC}"
  echo -e "${GREEN}└──────────────────────────────────────────────┘${NC}"
  echo ""
  
  return 0
}

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

main() {
  init_automation
  
  header "FormForge Agent Automation Runner"
  echo -e "${CYAN}Project: $PROJECT_ROOT${NC}"
  echo -e "${CYAN}Agents:  $AGENTS_DIR${NC}"
  echo -e "${CYAN}Logs:    $AUTOMATION_DIR${NC}"
  echo ""
  
  # Parse arguments
  local mode="all"
  local target=""
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --phase)
        mode="phase"
        target="$2"
        shift 2
        ;;
      --agent)
        mode="agent"
        target="$2"
        shift 2
        ;;
      --resume)
        mode="resume"
        shift
        ;;
      --status)
        show_status
        exit 0
        ;;
      --help|-h)
        echo "Usage:"
        echo "  ./run-agents.sh                Run all phases"
        echo "  ./run-agents.sh --phase N      Run phase N only"
        echo "  ./run-agents.sh --agent N      Run agent N only"
        echo "  ./run-agents.sh --resume       Resume from last checkpoint"
        echo "  ./run-agents.sh --status       Show progress"
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        exit 1
        ;;
    esac
  done
  
  # Pre-flight checks
  step "Pre-flight checks..."
  
  if ! command -v claude &> /dev/null; then
    error "Claude CLI not found. Install: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
  
  if [ ! -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    error "CLAUDE.md not found. Are you in the project root?"
    exit 1
  fi
  
  if [ ! -d "$AGENTS_DIR" ]; then
    error ".agents/ directory not found. Extract the agent kit first."
    exit 1
  fi
  
  if ! cd "$PROJECT_ROOT" && npm run lint &>/dev/null; then
    warning "Initial lint check has issues — proceeding anyway"
  fi
  
  success "Pre-flight checks passed"
  
  # Execute based on mode
  case $mode in
    all)
      show_status
      echo ""
      echo -e "${YELLOW}Starting full pipeline: Phase 2 → 3 → 4 → 5${NC}"
      echo -e "${YELLOW}Press Ctrl+C to abort at any time.${NC}"
      echo ""
      sleep 3
      
      run_phase 2 "${PHASE_2_AGENTS[@]}" || exit 1
      run_phase 3 "${PHASE_3_AGENTS[@]}" || exit 1
      run_phase 4 "${PHASE_4_AGENTS[@]}" || exit 1
      run_phase 5 "${PHASE_5_AGENTS[@]}" || exit 1
      
      header "🎉 ALL PHASES COMPLETE"
      echo -e "${GREEN}FormForge is fully built with all 15 agents' work deployed.${NC}"
      ;;
      
    phase)
      case $target in
        2) run_phase 2 "${PHASE_2_AGENTS[@]}" ;;
        3) run_phase 3 "${PHASE_3_AGENTS[@]}" ;;
        4) run_phase 4 "${PHASE_4_AGENTS[@]}" ;;
        5) run_phase 5 "${PHASE_5_AGENTS[@]}" ;;
        *) error "Invalid phase: $target (must be 2-5)"; exit 1 ;;
      esac
      ;;
      
    agent)
      # Find the agent in all phases
      local found=false
      for agent_entry in "${PHASE_2_AGENTS[@]}" "${PHASE_3_AGENTS[@]}" "${PHASE_4_AGENTS[@]}" "${PHASE_5_AGENTS[@]}"; do
        IFS=':' read -r agent_num agent_folder prompt_count <<< "$agent_entry"
        if [ "$agent_num" = "$target" ]; then
          run_agent "$agent_num" "$agent_folder" "$prompt_count"
          found=true
          break
        fi
      done
      if ! $found; then
        error "Agent $target not found (must be 6-15)"
        exit 1
      fi
      ;;
      
    resume)
      info "Resuming from last checkpoint..."
      local current_phase=$(get_state "current_phase")
      local current_agent=$(get_state "current_agent")
      
      if [ -z "$current_phase" ] || [ "$current_phase" = "0" ]; then
        info "No checkpoint found — starting from Phase 2"
        main  # restart
        return
      fi
      
      info "Last state: Phase $current_phase, Agent $current_agent"
      
      # Find which agent to resume and continue from there
      local resume_phase_agents
      case $current_phase in
        2) resume_phase_agents=("${PHASE_2_AGENTS[@]}") ;;
        3) resume_phase_agents=("${PHASE_3_AGENTS[@]}") ;;
        4) resume_phase_agents=("${PHASE_4_AGENTS[@]}") ;;
        5) resume_phase_agents=("${PHASE_5_AGENTS[@]}") ;;
      esac
      
      # Resume the current phase
      run_phase "$current_phase" "${resume_phase_agents[@]}"
      
      # Continue with remaining phases
      for next_phase in $(seq $((current_phase + 1)) 5); do
        case $next_phase in
          2) run_phase 2 "${PHASE_2_AGENTS[@]}" ;;
          3) run_phase 3 "${PHASE_3_AGENTS[@]}" ;;
          4) run_phase 4 "${PHASE_4_AGENTS[@]}" ;;
          5) run_phase 5 "${PHASE_5_AGENTS[@]}" ;;
        esac
      done
      ;;
  esac
}

# Run
main "$@"
