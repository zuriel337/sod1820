#!/usr/bin/env bash
# Acceptance of supabase/proposed/ga4-history-completion-20261126/{APPLY,ROLLBACK}.sql on an isolated local PostgreSQL (no live URL or credentials).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd); HERE="$ROOT/tests/ga4-history-completion-20261126"; D="$ROOT/supabase/proposed/ga4-history-completion-20261126"
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}; TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54399 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54399 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54399 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
snap() { Q -c "select md5(string_agg(period||granularity||source||coalesce(views::text,'')||coalesce(visitors::text,'')||coalesce(sessions::text,'')||coalesce(note,''), ',' order by period, source)) from public.traffic_history where period not between date '2026-09-07' and date '2026-11-07'"; }
Q -f "$HERE/fixture.sql"
OUTSIDE=$(snap)
check "$(python3 -c "import json;a=json.load(open('$D/rows_total.json'));b=json.load(open('$D/rows_il.json'));print(len(a),len(b),sum(r['views'] for r in a),sum(r['sessions'] for r in a),sum(r['views'] for r in b))")" "62 62 60215 21519 51112" "frozen data: 62+62 days, 60,215 / 21,519 / 51,112"
check "$(python3 -c "import json,datetime;a=json.load(open('$D/rows_total.json'));d=[datetime.date.fromisoformat(r['date']) for r in a];print(d[0],d[-1],(d[-1]-d[0]).days+1,len(set(d)))")" "2026-09-07 2026-11-07 62 62" "frozen data: consecutive, no duplicate day"
Q -f "$D/APPLY.sql"
check "$(Q -c "select count(*) from public.traffic_history where granularity='day' and source='ga' and period between date '2026-09-07' and date '2026-11-07'")" 62 "62 total rows written"
check "$(Q -c "select count(*) from public.traffic_history where granularity='day' and source='ga:country:IL' and period between date '2026-09-07' and date '2026-11-07'")" 62 "62 IL rows written"
check "$(snap)" "$OUTSIDE" "every row outside the window is byte-identical (values and notes)"
check "$(Q -c "select count(*) from public.traffic_history where note is not null")" 2 "the existing notes are kept"
if Q -f "$D/APPLY.sql" >/dev/null 2>&1; then echo "FAIL a second apply was not refused"; exit 1; else pass=$((pass+1)); echo "PASS a second apply is refused (no duplicates, no overwrite)"; fi
check "$(Q -c "select count(*) from public.traffic_history where period between date '2026-09-07' and date '2026-11-07'")" 124 "still exactly 124 rows after the refused apply"
check "$(Q -f "$D/ACCEPTANCE.sql" | head -4 | tr "\n" " ")" "ga_62_rows|t il_62_rows|t ga_views_60215|t il_views_51112|t " "acceptance: the four window checks are true (the last two need the live rows 8.11-26.11 and the live notes, so they are not run on the fixture)"
Q -f "$D/ROLLBACK.sql"
check "$(Q -c "select count(*) from public.traffic_history where period between date '2026-09-07' and date '2026-11-07'")" 0 "rollback removes exactly the window"
check "$(snap)" "$OUTSIDE" "rollback leaves every other row untouched"
Q -c "insert into public.traffic_history(period,granularity,views,source) values ('2026-10-01','day',1,'ga')"
if Q -f "$D/APPLY.sql" >/dev/null 2>&1; then echo "FAIL a pre-existing day was not refused"; exit 1; else pass=$((pass+1)); echo "PASS a pre-existing row in the window refuses the whole apply"; fi
check "$(Q -c "select count(*) from public.traffic_history where period between date '2026-09-07' and date '2026-11-07'")" 1 "the refused apply wrote nothing"
echo "ALL $pass PASS"
