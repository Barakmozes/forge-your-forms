#!/bin/bash
# =============================================================================
# Phase 7 — Agent Orchestration Script
# FormForge: End-to-End Verification & Fix
# =============================================================================
#
# Usage:
#   ./run-agents-phase7.sh [batch_number] [agent_number]
#
# Examples:
#   ./run-agents-phase7.sh           # Show status dashboard
#   ./run-agents-phase7.sh 1         # Run all Batch 1 agents (sequential)
#   ./run-agents-phase7.sh 2         # Run all Batch 2 agents (parallel)
#   ./run-agents-phase7.sh 1 21      # Run only Agent 21
#   ./run-agents-phase7.sh status    # Show completion status
#
# =============================================================================

set -euo pipefail

BASE_DIR=".agents-phase-7"
SCANNER_DIR="$BASE_DIR/scanner-reports"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Agent mapping: agent_number -> folder_name
declare -A AGENT_FOLDERS=(
  [21]="feature-00-admin-role"
  [22]="feature-01-auth-settings"
  [23]="feature-02-edge-functions"
  [24]="feature-03-billing-stripe"
  [25]="feature-04-plan-limits"
  [26]="feature-05-standard-forms"
  [27]="feature-06-waitlists"
  [28]="feature-07-feedback-nps"
  [29]="feature-08-support-tickets"
  [30]="feature-09-onboarding-emails"
  [31]="feature-10-webhooks-api"
  [32]="feature-11-integrations"
  [33]="feature-12-templates"
  [34]="feature-13-ai-features"
  [35]="feature-14-enterprise"
  [36]="feature-15-workflows"
  [37]="feature-16-i18n-rtl"
  [38]="feature-17-final-verification"
)

# Batch definitions
BATCH_1=(21 22 24 25)       # Sequential
BATCH_2=(26 27 28 29)       # Parallel
BATCH_3=(23 30 31 32 33 34) # Parallel
BATCH_4=(35 36)             # Sequential
BATCH_5=(37 38)             # Sequential

get_agent_status() {
  local agent_num=$1
  local folder="${AGENT_FOLDERS[$agent_num]}"
  local handoff="$BASE_DIR/$folder/HANDOFF.md"

  if [ ! -f "$handoff" ]; then
    echo "MISSING"
    return
  fi

  if grep -q "Status: COMPLETE" "$handoff" 2>/dev/null; then
    echo "COMPLETE"
  elif grep -q "Status: IN PROGRESS" "$handoff" 2>/dev/null; then
    echo "IN_PROGRESS"
  else
    echo "NOT_STARTED"
  fi
}

get_prompt_progress() {
  local agent_num=$1
  local folder="${AGENT_FOLDERS[$agent_num]}"
  local progress="$BASE_DIR/$folder/PROGRESS.md"

  if [ ! -f "$progress" ]; then
    echo "0/0"
    return
  fi

  local total=$(grep -c "⬜\|✅\|🔄\|COMPLETE\|Not Started\|In Progress" "$progress" 2>/dev/null || echo 0)
  local done=$(grep -c "✅\|COMPLETE" "$progress" 2>/dev/null || echo 0)
  echo "$done/$total"
}

print_status_line() {
  local agent_num=$1
  local folder="${AGENT_FOLDERS[$agent_num]}"
  local status=$(get_agent_status $agent_num)
  local progress=$(get_prompt_progress $agent_num)

  local color=$NC
  local icon="⬜"
  case $status in
    COMPLETE)    color=$GREEN;  icon="✅" ;;
    IN_PROGRESS) color=$YELLOW; icon="🔄" ;;
    NOT_STARTED) color=$NC;     icon="⬜" ;;
    MISSING)     color=$RED;    icon="❌" ;;
  esac

  printf "  ${color}${icon} Agent %2d │ %-30s │ %-12s │ %s${NC}\n" \
    "$agent_num" "$folder" "$status" "$progress"
}

show_dashboard() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║           Phase 7 — Agent Status Dashboard                      ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  # Batch 1
  echo -e "${CYAN}── Batch 1: Infrastructure (Sequential) ──${NC}"
  for agent in "${BATCH_1[@]}"; do print_status_line $agent; done
  echo ""

  # Batch 2
  echo -e "${CYAN}── Batch 2: Core Modes (Parallel ⚡) ──${NC}"
  for agent in "${BATCH_2[@]}"; do print_status_line $agent; done
  echo ""

  # Batch 3
  echo -e "${CYAN}── Batch 3: Platform Features (Parallel ⚡) ──${NC}"
  for agent in "${BATCH_3[@]}"; do print_status_line $agent; done
  echo ""

  # Batch 4
  echo -e "${CYAN}── Batch 4: Enterprise & Workflows (Sequential) ──${NC}"
  for agent in "${BATCH_4[@]}"; do print_status_line $agent; done
  echo ""

  # Batch 5
  echo -e "${CYAN}── Batch 5: Final (Sequential) ──${NC}"
  for agent in "${BATCH_5[@]}"; do print_status_line $agent; done
  echo ""

  # Summary
  local total=18
  local complete=0
  for agent in "${!AGENT_FOLDERS[@]}"; do
    if [ "$(get_agent_status $agent)" = "COMPLETE" ]; then
      ((complete++))
    fi
  done

  echo -e "${BOLD}Summary: ${complete}/${total} agents complete${NC}"
  echo ""
}

check_batch_complete() {
  local batch_name=$1
  shift
  local agents=("$@")

  for agent in "${agents[@]}"; do
    if [ "$(get_agent_status $agent)" != "COMPLETE" ]; then
      echo -e "${RED}ERROR: Batch $batch_name not complete. Agent $agent status: $(get_agent_status $agent)${NC}"
      return 1
    fi
  done
  return 0
}

run_agent() {
  local agent_num=$1
  local folder="${AGENT_FOLDERS[$agent_num]}"

  echo -e "${BLUE}Starting Agent $agent_num ($folder)...${NC}"
  echo ""
  echo "Copy this prompt into a new Claude Code session:"
  echo ""
  echo "---"
  echo "You are Agent $agent_num. Read these files in order:"
  echo "1. CLAUDE.md"
  echo "2. $BASE_DIR/$folder/AGENT.md"
  echo "3. $BASE_DIR/$folder/PROMPTS.md"
  echo "4. $BASE_DIR/$folder/PROGRESS.md"
  echo "5. $BASE_DIR/$folder/HANDOFF.md"
  echo ""
  echo "Execute the NEXT incomplete prompt from PROMPTS.md."
  echo "After completing each prompt, update PROGRESS.md and HANDOFF.md."
  echo "---"
  echo ""
}

# Main
case "${1:-status}" in
  status|"")
    show_dashboard
    ;;
  1)
    if [ -n "${2:-}" ]; then
      run_agent $2
    else
      echo -e "${CYAN}Batch 1 — Sequential: Run agents one at a time${NC}"
      for agent in "${BATCH_1[@]}"; do
        run_agent $agent
        echo "Press Enter after Agent $agent completes..."
        read
      done
    fi
    ;;
  2)
    check_batch_complete "1" "${BATCH_1[@]}" || exit 1
    echo -e "${CYAN}Batch 2 — Parallel: Run ALL 4 agents simultaneously ⚡${NC}"
    for agent in "${BATCH_2[@]}"; do
      run_agent $agent
    done
    ;;
  3)
    check_batch_complete "1" "${BATCH_1[@]}" || exit 1
    check_batch_complete "2" "${BATCH_2[@]}" || exit 1
    echo -e "${CYAN}Batch 3 — Parallel: Run ALL 6 agents simultaneously ⚡${NC}"
    for agent in "${BATCH_3[@]}"; do
      run_agent $agent
    done
    ;;
  4)
    check_batch_complete "1" "${BATCH_1[@]}" || exit 1
    check_batch_complete "2" "${BATCH_2[@]}" || exit 1
    check_batch_complete "3" "${BATCH_3[@]}" || exit 1
    echo -e "${CYAN}Batch 4 — Sequential: Run agents one at a time${NC}"
    for agent in "${BATCH_4[@]}"; do
      run_agent $agent
      echo "Press Enter after Agent $agent completes..."
      read
    done
    ;;
  5)
    check_batch_complete "1" "${BATCH_1[@]}" || exit 1
    check_batch_complete "2" "${BATCH_2[@]}" || exit 1
    check_batch_complete "3" "${BATCH_3[@]}" || exit 1
    check_batch_complete "4" "${BATCH_4[@]}" || exit 1
    echo -e "${CYAN}Batch 5 — Sequential (FINAL): Run agents one at a time${NC}"
    for agent in "${BATCH_5[@]}"; do
      run_agent $agent
      echo "Press Enter after Agent $agent completes..."
      read
    done
    ;;
  *)
    echo "Usage: $0 [status|1|2|3|4|5] [agent_number]"
    ;;
esac
