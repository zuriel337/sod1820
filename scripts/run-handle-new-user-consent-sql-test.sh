#!/usr/bin/env bash
# Runs tests/sql/handle_new_user_no_auto_enrollment.sql on a throwaway local Postgres (never a live project).
# The proposal and rollback are the owner-reviewed files under docs/reviews/admin-full-access-auth-20261103/auth: this runner only
# extracts the pre-change function from the rollback file and drives them. Nothing is applied to Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."
AUTH=docs/reviews/admin-full-access-auth-20261103/auth
PROPOSAL="$PWD/$AUTH/handle-new-user-consent.proposal.sql"
ROLLBACK="$PWD/$AUTH/handle-new-user-consent.rollback.sql"
if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  echo "no local PostgreSQL found (/usr/lib/postgresql/*/bin); install postgresql to run this test" >&2; exit 2
fi
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chmod 755 "$D"; chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
cleanup() { run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null 2>&1" || true; rm -rf "$D"; }
trap cleanup EXIT
# The function as it is live today = the CREATE statement the rollback file restores (source-guarded against drift by the proposal itself).
awk '/^CREATE OR REPLACE FUNCTION/{p=1} p{print} p&&/^;$/{exit}' "$ROLLBACK" > "$D/old_function.sql"
[ -s "$D/old_function.sql" ] || { echo "could not extract the pre-change function from the rollback file" >&2; exit 3; }
chmod 644 "$D/old_function.sql"
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55433 -k $D -c listen_addresses=' -l $D/log -w start >/dev/null"
run "$BIN/createdb -h $D -p 55433 t"
PSQL="$BIN/psql -X -h $D -p 55433 -d t"
run "cd $PWD && $PSQL -v ON_ERROR_STOP=1 -v old_function=$D/old_function.sql -v proposal=$PROPOSAL -v rollback=$ROLLBACK -f tests/sql/handle_new_user_no_auto_enrollment.sql" | grep -E 'PASS|expected prosrc' 
# Guard: both scripts must refuse to overwrite an independently changed function.
run "$PSQL -q -c \"CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql AS \\\$\\\$BEGIN RETURN NEW; END\\\$\\\$;\""
for script in "$PROPOSAL" "$ROLLBACK"; do
  if run "$PSQL -q -v ON_ERROR_STOP=1 -f $script" >/dev/null 2>"$D/err.txt"; then echo "guard failed: $script ran over a changed function" >&2; exit 4; fi
  grep -q 'source_changed_review_required' "$D/err.txt" || { echo "guard did not report source_changed_review_required for $script" >&2; cat "$D/err.txt" >&2; exit 5; }
done
echo "PASS guards: proposal and rollback refuse an independently changed function"
