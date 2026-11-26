#!/usr/bin/env bash
# Disposable local PostgreSQL only: no production connection, no URL fallback. Applies the PROPOSED SQL (guard stripped: it pins the live fingerprints)
# to the isolated ELS fixture, checks the three publication tiers and the strong-cipher recommendation, then proves the rollback.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
P="$ROOT/supabase/proposed/els-publication-tiers-20261126"
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
if [[ -z "$BIN" ]]; then echo 'Local PostgreSQL required; no live fallback.' >&2; exit 1; fi
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
run "$BIN/initdb" -D "$D/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55448 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55448 -U postgres els_tiers
strip() { awk '/^do \$guard\$/{skip=1} !skip{print} /^\$guard\$;/{skip=0}' "$1" > "$D/$(basename "$1")"; chmod a+r "$D/$(basename "$1")"; }
strip "$P/apply.sql"; strip "$P/rollback.sql"
chmod a+rx "$D"; for f in "$ROOT/test/els-native-save-fixture.sql" "$ROOT/test/els-publication-tiers-pre.sql" "$ROOT/test/els-publication-tiers-post.sql"; do cp "$f" "$D/"; chmod a+r "$D/$(basename "$f")"; done
q() { run "$BIN/psql" -h "$D" -p 55448 -U postgres -d els_tiers -v ON_ERROR_STOP=1 -q "$@"; }
q -f "$D/els-native-save-fixture.sql" >/dev/null
q -f "$D/els-publication-tiers-pre.sql" >/dev/null
q -f "$D/apply.sql"
q -f "$D/els-publication-tiers-post.sql" >/dev/null
q -f "$D/rollback.sql"
q -c "begin; set local role anon; select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000001'),'ROLLBACK restores the previous policy'); commit;" >/dev/null
echo 'els-publication-tiers SQL: ok'
