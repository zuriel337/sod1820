#!/usr/bin/env bash
# live-sync-check.sh — READ-ONLY diagnostic for live_state_sync_law.
# Never mutates git state or files. Prints origin/main vs local sync status.
set -euo pipefail

echo "=== Live Sync Check — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

git fetch origin --prune --quiet

ORIGIN_MAIN_SHA=$(git rev-parse origin/main)
LOCAL_HEAD_SHA=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LOCAL_MAIN_SHA=$(git rev-parse main 2>/dev/null || echo "N/A (no local main ref)")

AHEAD_BEHIND=$(git rev-list --left-right --count "HEAD...origin/main" 2>/dev/null || echo "?	?")
AHEAD=$(echo "$AHEAD_BEHIND" | cut -f1)
BEHIND=$(echo "$AHEAD_BEHIND" | cut -f2)

DIRTY="clean"
if [ -n "$(git status --porcelain)" ]; then
  DIRTY="DIRTY — uncommitted changes present"
fi

echo "origin/main SHA:      $ORIGIN_MAIN_SHA"
echo "local HEAD SHA:       $LOCAL_HEAD_SHA"
echo "current branch:       $CURRENT_BRANCH"
echo "local main ref SHA:   $LOCAL_MAIN_SHA"
echo "HEAD vs origin/main:  ahead=$AHEAD behind=$BEHIND"
echo "working tree state:   $DIRTY"
echo
echo "--- Supabase (manual check required) ---"
echo "Expected canonical project_id: linswmnnkjxvweumprav"
echo "  -> verify with mcp__Supabase__list_projects / get_project_url — this script cannot reach Supabase."
echo
echo "--- Roadmap version (from origin/main, not local disk) ---"
git show origin/main:SOD1820_MASTER_ROADMAP.md 2>/dev/null | head -3 || echo "  (file not found on origin/main)"
echo
if [ "$BEHIND" != "0" ]; then
  echo "WARNING: local branch is $BEHIND commits behind origin/main — do NOT treat local disk reads as live state."
fi
if [ "$AHEAD" != "0" ]; then
  echo "NOTE: local branch is $AHEAD commits ahead of origin/main (expected on a feature branch)."
fi
if [ "$DIRTY" != "clean" ]; then
  echo "WARNING: working tree is dirty — do not reset/checkout without stashing first."
fi
