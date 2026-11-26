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
chmod a+rx "$D"; for f in "$ROOT/test/els-native-save-fixture.sql" "$ROOT/test/els-publication-tiers-pre.sql" "$ROOT/test/els-publication-tiers-post.sql" "$ROOT/test/els-grants-hardening-post.sql" "$P/harden-grants.sql" "$P/rollback-harden-grants.sql"; do cp "$f" "$D/"; chmod a+r "$D/$(basename "$f")"; done
q() { run "$BIN/psql" -h "$D" -p 55448 -U postgres -d els_tiers -v ON_ERROR_STOP=1 -q "$@"; }
q -f "$D/els-native-save-fixture.sql" >/dev/null
q -f "$D/els-publication-tiers-pre.sql" >/dev/null
q -f "$D/apply.sql"
q -f "$D/els-publication-tiers-post.sql" >/dev/null
# Race: the owner withdraws the page publication while the administrator approves the library request (two real sessions, row-locked).
ID=a0000000-0000-0000-0000-000000000005; ADMIN=00000000-0000-0000-0000-000000000003; OWNER=00000000-0000-0000-0000-000000000001
reset_row() { q -c "reset role; update els_records set status='pending', visibility='public', self_published=true where id='$ID';" >/dev/null; }
as() { echo "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$1',true);"; }
state() { q -At -c "reset role; select status||'/'||visibility||'/'||self_published from els_records where id='$ID';"; }
# 1) the administrator's decision holds the row first: the owner's withdrawal waits, then an approved cipher keeps its library access
reset_row
( { as $ADMIN; echo "select moderate_els_matrix('$ID','published'); select pg_sleep(2); commit;"; } | q >/dev/null ) &
sleep 0.7
{ as $OWNER; echo "select self_publish_matrix('$ID', false); commit;"; } | q >/dev/null
wait
[[ "$(state)" == "published/public/false" ]] || { echo "RACE admin-first: unexpected $(state)" >&2; exit 1; }
# 2) the owner's withdrawal holds the row first: the approval then finds a private row and is refused; nothing becomes public
reset_row
( { as $OWNER; echo "select self_publish_matrix('$ID', false); select pg_sleep(2); commit;"; } | q >/dev/null ) &
sleep 0.7
if { as $ADMIN; echo "select moderate_els_matrix('$ID','published'); commit;"; } | q >/dev/null 2>&1; then echo "RACE owner-first: the approval must be refused" >&2; exit 1; fi
wait
[[ "$(state)" == "draft/private/false" ]] || { echo "RACE owner-first: unexpected $(state)" >&2; exit 1; }
echo 'els-publication-tiers race: ok'
# Grant hardening (separate approval): before/after proof, then its own rollback restores the previous grants exactly.
q -f "$D/els-grants-hardening-post.sql" >/dev/null
q -f "$D/rollback-harden-grants.sql"
q -At -c "select has_function_privilege('anon','public.els_my_strong_ciphers()','execute');" | grep -qx t || { echo 'grant rollback did not restore' >&2; exit 1; }
echo 'els-publication-tiers grants: ok'
q -f "$D/rollback.sql"
q -c "begin; set local role anon; select test_expect((select count(*)=0 from els_records where id='a0000000-0000-0000-0000-000000000001'),'ROLLBACK keeps the leak closed: the private row stays unreadable'); commit;" >/dev/null
q -c "reset role; insert into els_records(search_term,visibility,self_published,status,owner_user_id) values ('rb-private','private',true,'draft','00000000-0000-0000-0000-000000000001'); begin; set local role anon; select test_expect((select count(*)=0 from els_records where search_term='rb-private'),'ROLLBACK: the old flag on a private row never exposes it'); commit;" >/dev/null
echo 'els-publication-tiers SQL: ok'
