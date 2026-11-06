#!/usr/bin/env bash
# Runs the beacon RPC behind a REAL PostgREST (pinned 12.2.8) against a throwaway local Postgres. Never a live project.
# It proves what the HTTP shim cannot: that PostgREST puts the request headers into request.headers, that its JWT claims
# reach auth.uid(), and that the canary works end to end.
#
# The tarball is NOT downloaded by this script. Supply it and the OFFICIAL SHA256 yourself; nothing is extracted or executed
# unless the digest matches:
#   POSTGREST_TARBALL=/path/postgrest-v12.2.8-linux-static-x86-64.tar.xz \
#   POSTGREST_SHA256=<digest shown by GitHub next to that asset on the v12.2.8 release page> \
#   bash scripts/run-reading-activity-postgrest-test.sh
set -euo pipefail
[ -f test/reading-activity-postgrest.test.mjs ] || { echo "refusing: test/reading-activity-postgrest.test.mjs is not written yet (harness is prepared, proof NOT run)"; exit 2; }
: "${POSTGREST_TARBALL:?set POSTGREST_TARBALL to the downloaded postgrest-v12.2.8-linux-static-x86-64.tar.xz}"
: "${POSTGREST_SHA256:?set POSTGREST_SHA256 to the official digest; the script refuses to run without it}"
case "$(basename "$POSTGREST_TARBALL")" in postgrest-v12.2.8-linux-static-x86-64.tar.xz) ;; *) echo "refusing: unexpected file name (pinned to v12.2.8 linux-static-x86-64)"; exit 2;; esac
ACTUAL=$(sha256sum "$POSTGREST_TARBALL" | cut -d' ' -f1)
[ "$ACTUAL" = "$(echo "$POSTGREST_SHA256" | tr 'A-F' 'a-f')" ] || { echo "refusing: SHA256 mismatch (got $ACTUAL). Nothing was extracted or executed."; exit 2; }
echo "SHA256 verified: $ACTUAL"

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chmod 755 "$D"; chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
PGRST_PID=""
cleanup() { [ -n "$PGRST_PID" ] && kill "$PGRST_PID" 2>/dev/null || true; run "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null" || true; rm -rf "$D"; }
trap cleanup EXIT
tar -xJf "$POSTGREST_TARBALL" -C "$D"; chmod 755 "$D/postgrest"
[ "$("$D/postgrest" --version | grep -o '12\.2\.8')" = "12.2.8" ] || { echo "refusing: binary is not 12.2.8"; exit 2; }

run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55434 -k $D -c max_connections=200' -l $D/log -w start >/dev/null"
PSQL="$BIN/psql -h $D -p 55434 -d t -v ON_ERROR_STOP=1 -qtA"
run "$BIN/createdb -h $D -p 55434 t"
run "cd $(pwd) && $PSQL -f tests/sql/fixtures/reading_activity_v1_prod_replica.sql >/dev/null"
run "cd $(pwd) && $PSQL -f supabase/proposed/reading_activity_v1.sql >/dev/null"
run "$PSQL -c \"create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator; alter role service_role bypassrls; create schema t; \"" >/dev/null
SECRET=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
cat > "$D/postgrest.conf" <<CONF
db-uri = "postgresql://authenticator@/t?host=$D&port=55434"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-host = "127.0.0.1"
server-port = 3011
log-level = "warn"
CONF
chmod 644 "$D/postgrest.conf"
run "$D/postgrest $D/postgrest.conf >$D/postgrest.log 2>&1 & echo \$! > $D/postgrest.pid"
PGRST_PID=$(cat "$D/postgrest.pid")
for i in $(seq 1 40); do curl -s -o /dev/null -m 2 http://127.0.0.1:3011/ && break; sleep 0.5; done
curl -s -o /dev/null -m 2 http://127.0.0.1:3011/ || { echo "PostgREST did not start"; tail -20 "$D/postgrest.log"; exit 1; }
echo "PostgREST $("$D/postgrest" --version) is serving the local database"
RA_PGRST_URL=http://127.0.0.1:3011 RA_PGRST_SECRET="$SECRET" RA_PG_BIN="$BIN" RA_PG_SOCKET="$D" RA_PG_PORT=55434 RA_PG_AS_POSTGRES=$([ "$(id -u)" = 0 ] && echo 1 || echo 0) \
  node --test test/reading-activity-postgrest.test.mjs
