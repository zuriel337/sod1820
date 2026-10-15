#!/usr/bin/env bash
set -euo pipefail
# Snapshot is verified before the preview or any browser starts.
node -e "require('./scripts/ci-isolation/snapshot-contract.cjs').requireCoverage(require('./scripts/ci-isolation/policy.cjs').frozenSnapshot(),'browser')"
cp dist/2029.html dist/index.html
rm -f "$RUNNER_TEMP/sod-ci-preview.ready"
node scripts/ci-isolation/preview.mjs > "$RUNNER_TEMP/sod-2029-preview.log" 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true; wait "$preview_pid" 2>/dev/null || true' EXIT
for i in {1..30}; do
  if test -f "$RUNNER_TEMP/sod-ci-preview.ready"; then break; fi
  sleep 1
done
test -f "$RUNNER_TEMP/sod-ci-preview.ready"
curl --noproxy '*' -fsS http://127.0.0.1:4173/world >/dev/null
# Entry Orientation + Contextual Learn browser acceptance
mkdir -p test-results/release-visual
node "$PLAYWRIGHT_DIR/node_modules/playwright/cli.js" test --config scripts/ci-isolation/playwright.config.cjs tests/entry-learn-2029.spec.cjs --reporter=line

# World browser acceptance on pre-cutover preview
SOD_WORLD_PRE_CUTOVER_FIXTURE=1 node "$PLAYWRIGHT_DIR/node_modules/playwright/cli.js" test --config scripts/ci-isolation/playwright.config.cjs tests/world2029-release.spec.cjs --reporter=line
