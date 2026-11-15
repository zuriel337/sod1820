#!/usr/bin/env bash
# Disposable local DB, no production connection or URL fallback.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [[ -n "${PGLITE_MODULE:-}" ]]; then node "$ROOT/tests/community-dislike-20261115/run.mjs"; exit; fi
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
if [[ -z "$BIN" ]]; then echo 'Local PostgreSQL required; no live fallback.' >&2; exit 1; fi
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
run "$BIN/initdb" -D "$D/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55444 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55444 -U postgres community_dislike
COMMUNITY_TEST_SOCKET="$D" COMMUNITY_TEST_PSQL="$BIN/psql" node "$ROOT/tests/community-dislike-20261115/run.mjs"
