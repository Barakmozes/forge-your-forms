#!/bin/bash
# ============================================
# FormForge Edge Functions Deployment Script
# Deploys all 10 edge functions to Supabase.
# Usage: ./scripts/deploy-functions.sh [--verify]
# ============================================

set -euo pipefail

PROJECT_REF="ywsqgrjfmxdjsuaqzsnw"
FUNCTIONS_DIR="supabase/functions"
VERIFY=false

# Parse flags
for arg in "$@"; do
  case $arg in
    --verify) VERIFY=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

FUNCTIONS=(
  "stripe-webhook"
  "send-email"
  "dispatch-webhook"
  "api-v1"
  "ai-generate"
  "ai-analyze"
  "classify-ticket"
  "churn-score"
  "execute-workflow"
  "slack-notify"
)

PASSED=0
FAILED=0
ERRORS=()

echo "========================================"
echo "FormForge Edge Function Deployment"
echo "Project: $PROJECT_REF"
echo "Functions: ${#FUNCTIONS[@]}"
echo "========================================"
echo ""

for fn in "${FUNCTIONS[@]}"; do
  if [ ! -d "$FUNCTIONS_DIR/$fn" ]; then
    echo "[$fn] ERROR: Source directory not found at $FUNCTIONS_DIR/$fn"
    FAILED=$((FAILED + 1))
    ERRORS+=("$fn: source not found")
    continue
  fi

  if [ ! -f "$FUNCTIONS_DIR/$fn/index.ts" ]; then
    echo "[$fn] ERROR: index.ts not found"
    FAILED=$((FAILED + 1))
    ERRORS+=("$fn: index.ts not found")
    continue
  fi

  echo "[$fn] Deploying..."
  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1; then
    echo "[$fn] SUCCESS"
    PASSED=$((PASSED + 1))
  else
    echo "[$fn] FAILED"
    FAILED=$((FAILED + 1))
    ERRORS+=("$fn: deployment failed")
  fi
  echo ""
done

echo "========================================"
echo "Deployment Summary"
echo "  Passed: $PASSED / ${#FUNCTIONS[@]}"
echo "  Failed: $FAILED / ${#FUNCTIONS[@]}"
echo "========================================"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Errors:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
fi

# Run smoke tests if --verify flag is set
if [ "$VERIFY" = true ]; then
  echo ""
  echo "Running smoke tests..."
  bash "$(dirname "$0")/test-functions.sh"
fi

exit $FAILED
