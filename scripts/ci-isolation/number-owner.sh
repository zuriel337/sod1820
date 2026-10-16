#!/usr/bin/env bash
set -euo pipefail
# Both modes must start through offline.sh: no product import/build before this.
node -e "require('./scripts/ci-isolation/policy.cjs').requireIsolation()"
case "${1:-}" in
  source)
    node --test test/number-2029-owned-opening-contract.test.mjs src/lib/research/entityHubProjection.progressive.test.js src/lib/research/entityHubProjection.test.js src/lib/research/numericResearch.test.js
    node --test test/ci-isolation/number-owner.test.mjs test/ci-isolation/config.test.mjs test/ci-isolation/egress.test.mjs test/ci-isolation/udp-write.test.mjs test/ci-isolation/snapshot-contract.test.mjs
    npm run build
    ;;
  browser)
    : "${RUNNER_TEMP:?}" "${PLAYWRIGHT_DIR:?}" "${SOD_CI_SNAPSHOT:?}" "${SOD_CI_SNAPSHOT_SHA256:?}"
    # Reverify manifest/source bytes even for a direct local invocation. The
    # optional manifest argument supports the central restricted local corpus.
    verified_sha="$(node scripts/ci-isolation/number-owner-snapshot.cjs "$SOD_CI_SNAPSHOT" "${2:-test/fixtures/ci-2029/manifest.json}")"
    test "$verified_sha" = "$SOD_CI_SNAPSHOT_SHA256"
    test -f dist/2029.html
    rm -f "$RUNNER_TEMP/sod-ci-preview.ready"
    node scripts/ci-isolation/preview.mjs > "$RUNNER_TEMP/sod-number-2029-preview.log" 2>&1 &
    preview_pid=$!
    trap 'kill "$preview_pid" 2>/dev/null || true; wait "$preview_pid" 2>/dev/null || true' EXIT
    for i in {1..30}; do
      if test -f "$RUNNER_TEMP/sod-ci-preview.ready"; then break; fi
      sleep 1
    done
    test -f "$RUNNER_TEMP/sod-ci-preview.ready"
    curl --noproxy '*' -fsS http://127.0.0.1:4173/number/376 >/dev/null
    node "$PLAYWRIGHT_DIR/node_modules/playwright/cli.js" test --config scripts/ci-isolation/playwright.config.cjs tests/number-2029-owner.spec.cjs --workers=1 --reporter=line
    ;;
  *) echo 'Usage: offline.sh bash scripts/ci-isolation/number-owner.sh source|browser' >&2; exit 1 ;;
esac
