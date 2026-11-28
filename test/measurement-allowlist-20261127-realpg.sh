#!/usr/bin/env bash
# S4/S5 (27.11.2026): the REAL allowlist PROPOSAL.sql / ROLLBACK.sql and the S1 file 01 under psql on an isolated local PostgreSQL, against a stub ingest_event
# that holds the exact clause and spec fragments (the live text is not reproducible from the repository). In TEMP copies the four live md5 pins become the stub's.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
A=$ROOT/supabase/proposed/measurement-allowlist-20261127; R=$ROOT/supabase/proposed/measurement-reliability-20261127
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54398 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres -d postgres -v ON_ERROR_STOP=1)
Q() { "${PSQL[@]}" -qtAX "$@"; }
F() { "${PSQL[@]}" -qX -f "$1" >/dev/null; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q <<'SQL'
create function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text default null, p_ref_host text default null, p_via text default null, p_app_context text default null, p_device text default null, p_session_id text default null, p_journey_id text default null, p_depth smallint default null, p_utm jsonb default null, p_props jsonb default null, p_is_bot boolean default false)
returns void language plpgsql as $f$
declare
  v_props jsonb := p_props;
  v_spec jsonb := '{"app_health":{"events":["save_started"],"fields":{"reason":"token","stage":"token"}},"calculator_2029":{"events":["calculator_view","result_selected","ai_analysis_requested"],"fields":{"surface":"token","method":"token","reason":"token","count":"int"}},"entry_2029":{"events":"token","fields":{"entry_surface":"token"}},"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}},"els":{"events":["search"],"fields":{"kind":"token"}}}'::jsonb;
begin
  if (select 1) is distinct from 1
        or v_props->'engagement_version' is distinct from '1'::jsonb
        or coalesce(v_props->>'flush_reason' not in ('route_change','pagehide'),true) then raise exception 'invalid engagement'; end if;
end $f$;
SQL
IE='public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'
S0=$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")
R1() { Q -c "select md5(replace(pg_get_functiondef('$IE'::regprocedure), \$q\$or v_props->'engagement_version' is distinct from '1'::jsonb\$q\$, \$q\$or (v_props->'engagement_version' is distinct from '1'::jsonb and v_props->'engagement_version' is distinct from '2'::jsonb)\$q\$))"; }
S1=$(R1)
N4='"item_2029":{"events":["view"],"fields":{"kind":"token","item_ref":"token"}},"nav_2029":{"events":["number_link_open","panel_open","panel_close","search_submit","share_bar_open","media_play","gallery_open","study_action"],"fields":{"from_surface":"token","target_surface":"token","panel":"token","section":"token","outcome":"token","provider":"token","count":"int"}},"calc_outcome_2029":{"events":["ai_analysis_result","compute_failed","compute_empty","equals_preview_shown","equals_preview_all_opened"],"fields":{"surface":"token","method":"token","reason":"token","count":"int"}},"calculator_2029":'
S45=$(Q -c "select md5(replace(pg_get_functiondef('$IE'::regprocedure), '\"calculator_2029\":', \$q\$$N4\$q\$))")
BOTH=$(Q -c "select md5(replace(replace(pg_get_functiondef('$IE'::regprocedure), \$q\$or v_props->'engagement_version' is distinct from '1'::jsonb\$q\$, \$q\$or (v_props->'engagement_version' is distinct from '1'::jsonb and v_props->'engagement_version' is distinct from '2'::jsonb)\$q\$), '\"calculator_2029\":', \$q\$$N4\$q\$))")
pins() { sed "s/3d2fa7cf1aa7513b981d338cab5aebc2/$S0/g; s/d5a37d261f13c4f910d1bdd6ecf1417c/$S1/g; s/2c965ff385fe61e90a02957a43b25ba7/$S45/g; s/6efcfc48731fdb0957e6a0b35031c4e8/$BOTH/g" "$1" > "$2"; }
pins "$A/PROPOSAL.sql" "$TMP/a.sql"; pins "$A/ROLLBACK.sql" "$TMP/a.rb.sql"; pins "$R/01-ingest-event-engagement-v2.sql" "$TMP/e.sql"; pins "$R/01-ingest-event-engagement-v2.rollback.sql" "$TMP/e.rb.sql"
check "$(grep -c 3d2fa7cf1aa7513b981d338cab5aebc2 "$A/PROPOSAL.sql")" 2 'the committed allowlist file pins the live md5'
F "$TMP/a.sql"
spec() { Q -c "select pg_get_functiondef('$IE'::regprocedure)" | grep -c "$1" || true; }
check "$(spec 'nav_2029')" 1 'nav_2029 is added to the spec'
check "$(spec 'item_2029')" 1 'item_2029 is added to the spec'
check "$(spec 'calc_outcome_2029')" 1 'calc_outcome_2029 is added to the spec'
check "$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")" "$S45" 'the result is the exact expected text'
F "$TMP/a.sql"; pass=$((pass+1)); echo 'PASS a second apply is a no-op'
F "$TMP/e.sql"
check "$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")" "$BOTH" 'ORDER: allowlist first, then engagement v2: both land and the text is the exact combination'
F "$TMP/e.rb.sql"; F "$TMP/a.rb.sql"
check "$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")" "$S0" 'both rollbacks restore the exact original'
F "$TMP/e.sql"; F "$TMP/a.sql"
check "$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")" "$BOTH" 'ORDER: engagement v2 first, then the allowlist: the same final text'
Q -c "create or replace function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text default null, p_ref_host text default null, p_via text default null, p_app_context text default null, p_device text default null, p_session_id text default null, p_journey_id text default null, p_depth smallint default null, p_utm jsonb default null, p_props jsonb default null, p_is_bot boolean default false) returns void language sql as 'select 1'"
if F "$TMP/a.sql" 2>/dev/null; then echo 'FAIL a drifted ingest_event was not refused'; exit 1; fi
pass=$((pass+1)); echo 'PASS a drifted ingest_event is refused'
echo "ALL PASS ($pass)"
