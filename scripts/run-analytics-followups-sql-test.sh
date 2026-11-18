#!/usr/bin/env bash
# Analytics follow-ups proposal (ELS measurement, raziel notice e-mail, GA note); isolated PostgreSQL only. Never accepts a database URL.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [[ -n "${PGLITE_MODULE:-}" ]]; then
  node "$ROOT/tests/analytics-followups-20261118/run-pglite.mjs"
  exit
fi
W=$(mktemp -d)
mkdir -p "$W/tests" "$W/supabase/proposed"
cp -R "$ROOT/tests/analytics-followups-20261118" "$W/tests/"
cp "$ROOT/supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql" "$ROOT/supabase/proposed/ROLLBACK_20261118210000_analytics_followups.sql" "$W/supabase/proposed/"
chmod -R a+rX "$W"
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
if [[ -z "$BIN" ]]; then echo 'Local PostgreSQL required; no live database fallback.' >&2; rm -rf "$W"; exit 1; fi
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$W" "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
run "$BIN/initdb" -D "$D/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55448 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55448 -U postgres followups
T="$W/tests/analytics-followups-20261118"
while read -r file expect; do
  [[ -z "$file" ]] && continue
  set +e
  run "$BIN/psql" -X -h "$D" -p 55448 -U postgres -d followups -v ON_ERROR_STOP=1 -q -t -f "$T/$file" >"$W/out" 2>&1
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
grep -q '^ *ANALYTICS FOLLOWUPS ALL PASS' "$W/out"
