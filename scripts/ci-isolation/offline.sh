#!/usr/bin/env bash
# GitHub-hosted Linux runner: isolate all descendants at the OS boundary too.
set -euo pipefail
if [ "${SOD_CI_NETNS:-}" != 1 ]; then
  exec sudo --preserve-env=PATH,RUNNER_TEMP,GITHUB_WORKSPACE,PLAYWRIGHT_DIR,PERF_CHROME,SOD_CI_SNAPSHOT,SOD_CI_SNAPSHOT_SHA256,SOD_CI_ESBUILD,SOD_CI_AUDIT_OUT \
    unshare --net -- bash -c 'set -e; ip link set lo up; export SOD_CI_NETNS=1; exec "$@"' bash "$0" "$@"
fi
exec node scripts/ci-isolation/run.mjs -- "$@"
