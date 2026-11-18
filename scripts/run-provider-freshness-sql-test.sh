#!/usr/bin/env bash
# Provider freshness watch proposal (traffic_intelligence_law + system_suggestions_law owners); isolated PostgreSQL only. Never accepts a database URL.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [[ -n "${PGLITE_MODULE:-}" ]]; then
  node "$ROOT/tests/provider-freshness-20261118/run-pglite.mjs"
  exit
fi
W=$(mktemp -d)
mkdir -p "$W/tests" "$W/supabase/proposed"
cp -R "$ROOT/tests/provider-freshness-20261118" "$W/tests/"
cp "$ROOT/supabase/proposed/20261118190000_provider_freshness_watch_PROPOSAL.sql" "$ROOT/supabase/proposed/ROLLBACK_20261118190000_provider_freshness_watch.sql" "$W/supabase/proposed/"
chmod -R a+rX "$W"
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
if [[ -z "$BIN" ]]; then echo 'Local PostgreSQL required; no live database fallback.' >&2; rm -rf "$W"; exit 1; fi
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$W" "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
run "$BIN/initdb" -D "$D/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55447 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55447 -U postgres freshness
T="$W/tests/provider-freshness-20261118"
while read -r file expect; do
  [[ -z "$file" ]] && continue
  set +e
  run "$BIN/psql" -X -h "$D" -p 55447 -U postgres -d freshness -v ON_ERROR_STOP=1 -q -t -f "$T/$file" >"$W/out" 2>&1
  code=$?
  set -e
  cat "$W/out"
  if [[ "$expect" == ok ]]; then
    [[ $code -eq 0 ]] || { echo "FAIL $file exited $code" >&2; exit 1; }
  else
    msg=${expect#fail:}
    [[ $code -ne 0 ]] && grep -qF "$msg" "$W/out" || { echo "FAIL $file must refuse with: $msg" >&2; exit 1; }
    echo "PASS $file refused: $msg"
  fi
done < "$T/steps.txt"
grep -q '^ *PROVIDER FRESHNESS ALL PASS' "$W/out"
