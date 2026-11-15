#!/usr/bin/env bash
# Existing Traffic owner; isolated PostgreSQL only. Never accepts a database URL.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [[ -n "${PGLITE_MODULE:-}" ]]; then
  node "$ROOT/tests/measurement-identity-20261115/run-pglite.mjs"
  exit
fi
W=$(mktemp -d)
mkdir -p "$W/tests" "$W/supabase/proposed"
cp -R "$ROOT/tests/measurement-identity-20261115" "$W/tests/"
cp "$ROOT/supabase/proposed/20261115180000_measurement_identity_PROPOSAL.sql" "$ROOT/supabase/proposed/ROLLBACK_20261115180000_measurement_identity.sql" "$W/supabase/proposed/"
chmod -R a+rX "$W"
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
if [[ -z "$BIN" ]]; then echo 'Local PostgreSQL required; no live database fallback.' >&2; rm -rf "$W"; exit 1; fi
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$W" "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
run "$BIN/initdb" -D "$D/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55443 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55443 -U postgres measurement
run "$BIN/psql" -X -h "$D" -p 55443 -U postgres -d measurement -v ON_ERROR_STOP=1 -q -t -f "$W/tests/measurement-identity-20261115/run.sql" 2>&1 | tee "$W/result"
grep -q '^ *MEASUREMENT IDENTITY ALL PASS' "$W/result"
