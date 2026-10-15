#!/usr/bin/env bash
set -euo pipefail
node -e "require('./scripts/ci-isolation/snapshot-contract.cjs').requireCoverage(require('./scripts/ci-isolation/policy.cjs').frozenSnapshot(),'performance')"
(cd "$RUNNER_TEMP/perf-base" && npm run build:2029)
npm run build:2029
mkdir -p "$RUNNER_TEMP/perf-results"
node scripts/perf-execution-2029/mobile-image-gate.mjs "$GITHUB_WORKSPACE/dist" "$RUNNER_TEMP/perf-results/mobile-image-functional.json" "$SOD_CI_SNAPSHOT"
node scripts/perf-execution-2029/measure.mjs --mode replay --dist "$RUNNER_TEMP/perf-base/dist" --out "$RUNNER_TEMP/perf-results/before.json" --fixtures "$SOD_CI_SNAPSHOT" --label before
node scripts/perf-execution-2029/measure.mjs --mode replay --dist "$GITHUB_WORKSPACE/dist" --out "$RUNNER_TEMP/perf-results/after.json" --fixtures "$SOD_CI_SNAPSHOT" --label after
node scripts/perf-execution-2029/replay-gate.mjs "$RUNNER_TEMP/perf-results/before.json"
node scripts/perf-execution-2029/replay-gate.mjs "$RUNNER_TEMP/perf-results/before.json" "$RUNNER_TEMP/perf-results/after.json" scripts/perf-execution-2029/replay-budgets.json
node scripts/perf-execution-2029/measure.mjs --mode replay --dist "$GITHUB_WORKSPACE/dist" --out "$RUNNER_TEMP/perf-results/extension-failure.json" --fixtures "$SOD_CI_SNAPSHOT" --routes /world --runs 1 --extensiondelay 2000 --extensionfail 1 --label delayed-failed-extensions
node scripts/perf-execution-2029/extension-gate.mjs "$RUNNER_TEMP/perf-results/extension-failure.json"
