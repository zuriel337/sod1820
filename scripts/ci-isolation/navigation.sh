#!/usr/bin/env bash
set -euo pipefail
node -e "require('./scripts/ci-isolation/policy.cjs').frozenSnapshot()"
(cd "$RUNNER_TEMP/nav-base" && VERCEL_GIT_COMMIT_SHA=0825b326ea0fd9faa57b41d0d48bdadada9f3c7f node scripts/build-integrated-preview.mjs)
node scripts/build-integrated-preview.mjs
node --test test/perf-navigation-2029.test.mjs
node scripts/perf-navigation-2029/run.mjs --mode replay --dist "$RUNNER_TEMP/nav-base/preview-deploy/dist" --fixtures "$SOD_CI_SNAPSHOT" --runs 1 --paths /world --headers 1 --catalog 1 --catalogsize 8 --sha 0825b326 --out "$RUNNER_TEMP/nav-results/catalog-base.json"
node scripts/perf-navigation-2029/run.mjs --mode replay --dist "$GITHUB_WORKSPACE/preview-deploy/dist" --fixtures "$SOD_CI_SNAPSHOT" --runs 1 --paths /world --headers 1 --catalog 1 --catalogsize 2 --catalogfail 1 --catalogreturn 1 --sha "$(git rev-parse HEAD)" --out "$RUNNER_TEMP/nav-results/catalog-head.json"
node scripts/perf-navigation-2029/catalog-parity.mjs "$SOD_CI_SNAPSHOT" "$RUNNER_TEMP/nav-results/catalog-parity.json"
node scripts/perf-navigation-2029/run.mjs --mode replay --dist "$RUNNER_TEMP/nav-base/preview-deploy/dist" --fixtures "$SOD_CI_SNAPSHOT" --runs 7 --paths /world,/post/seventh-to-tenth-sefirot-2027 --headers 1 --sha 0825b326 --out "$RUNNER_TEMP/nav-results/before.json"
node scripts/perf-navigation-2029/run.mjs --mode replay --dist "$GITHUB_WORKSPACE/preview-deploy/dist" --fixtures "$SOD_CI_SNAPSHOT" --runs 7 --paths /world,/post/seventh-to-tenth-sefirot-2027 --headers 1 --sha "$(git rev-parse HEAD)" --out "$RUNNER_TEMP/nav-results/after.json"
node scripts/perf-navigation-2029/compare.mjs "$RUNNER_TEMP/nav-results/before.json" "$RUNNER_TEMP/nav-results/after.json" "$RUNNER_TEMP/nav-results/comparison.json"
