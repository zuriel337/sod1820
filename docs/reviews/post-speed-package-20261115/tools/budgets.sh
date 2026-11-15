#!/bin/bash
# First-load and built-graph budgets of every tree under test (root `npm run build`, then the two guard scripts), with the CI's client id. Prints one block per tree.
# usage: budgets.sh <tree>...      (run it alone: it builds)
export NODE_PATH=/usr/local/lib/node_modules_global
for tree in "$@"; do
  cd "$tree" || exit 1
  echo "=== $(basename $tree) $(git rev-parse --short HEAD) $(git status --short | head -n 1)"
  VITE_GA_ID=G-TEST npm run build > build-budget.log 2>&1 || { tail -n 5 build-budget.log; echo BUILD-FAILED; cd - > /dev/null; continue; }
  node scripts/test-2029-first-load-graph.mjs 2>&1 | tail -n 3
  node scripts/test-2029-built-graph.mjs 2>&1 | tail -n 6
  cd - > /dev/null
done
