#!/usr/bin/env bash
# S1 (27.11.2026): the contract v14 files (04-contract-v14.sql and its rollback) under psql on an isolated local PostgreSQL that carries the REAL CL-16 rule guard
# in its live (AFTER) state: the repository's fixture, then supabase/proposed/20261112200000_g1_rule_guard_cl16.sql (live function md5 90b5917b..., read 27.11.2026).
# The v13 row is a stand-in (the real text is not in the repository); in a TEMP copy the md5 pin of the v13 description is replaced by the stand-in's.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
R=$ROOT/supabase/proposed/measurement-reliability-20261127
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54399 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54399 -U postgres -d postgres -v ON_ERROR_STOP=1)
Q() { "${PSQL[@]}" -qtAX "$@"; }
F() { "${PSQL[@]}" -qX -f "$1" >/dev/null; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
refused() { if F "$1" 2>"$TMP/err.txt"; then echo "FAIL $2 (was not refused)"; exit 1; fi; pass=$((pass+1)); echo "PASS $2"; }
Q <<'SQL'
create table public.nodes (id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
SQL
F "$ROOT/tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql"
F "$ROOT/supabase/proposed/20261112200000_g1_rule_guard_cl16.sql"
check "$(Q -c "select md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure))")" 90b5917b1412be02f66d1f805241018c 'the isolated database carries the live (AFTER) CL-16 rule guard'
# the stand-in v13 (inserted with the guard disabled, as a fixture only), self-owned root rule
Q <<'SQL'
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1;
insert into public.nodes(type,label,description,metadata,is_active,rule_id,rule_version,weight) values
 ('rule','Traffic Intelligence law','STAND-IN V13 BODY',
  '{"owner_routing":{"canonical_owner":"traffic_intelligence_law","domain":"traffic_analytics","resolution":"RESOLVED"},"g3_disposition_v1":{"classification":"KEEP_CANONICAL_OWNER","gate":"G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS"},"compaction_v1":{"classification":"OWNER","canonical_owner":"traffic_intelligence_law","owner_family":"traffic_analytics"},"propagate":true}'::jsonb,true,'traffic_intelligence_law',13,1),
 ('rule','Another law','OTHER BODY','{"owner_routing":{"canonical_owner":"other_law"}}'::jsonb,true,'other_law',1,1);
alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1;
SQL
H=$(Q -c "select md5(description) from public.nodes where rule_id='traffic_intelligence_law' and rule_version=13")
sed "s/e7ad8ffbe9e4a612f53fa1d8c3799693/$H/g" "$R/04-contract-v14.sql" > "$TMP/v14.sql"
check "$(grep -c e7ad8ffbe9e4a612f53fa1d8c3799693 "$R/04-contract-v14.sql")" 1 'the committed file pins the live v13 description md5'
F "$TMP/v14.sql"
check "$(Q -c "select count(*) from public.nodes where rule_id='traffic_intelligence_law' and is_active")" 1 'exactly one active version after the apply'
check "$(Q -c "select rule_version from public.nodes where rule_id='traffic_intelligence_law' and is_active")" 14 'the active version is v14'
check "$(Q -c "select is_active from public.nodes where rule_id='traffic_intelligence_law' and rule_version=13")" f 'v13 is retired and kept as history'
check "$(Q -c "select metadata->'rule_guard' is not null from public.nodes where rule_id='traffic_intelligence_law' and rule_version=13")" t 'the guard stamped the retirement itself (the file never wrote rule_guard)'
check "$(Q -c "select supersedes_version from public.nodes where rule_id='traffic_intelligence_law' and rule_version=14")" 13 'v14 records that it supersedes v13'
check "$(Q -c "select left(description, 17) from public.nodes where rule_id='traffic_intelligence_law' and rule_version=14")" 'STAND-IN V13 BODY' 'v14 keeps the whole v13 body first (extend, never rewrite)'
for rule in "MEASUREMENT IDENTITY LAYERS" "INTENSITY IS NOT EVIDENCE OF AUTOMATION" "ENGAGEMENT VERSION 2" "FLOOR UNIT" "OPEN ACTIVITY TIER" "PUBLIC BY DEFAULT, PERSONAL SEARCH MASKED" "SUPPORT TEXT IS NOT ANALYTICS" "MEASURED ACTION TRIAD" "REACTIONS POLICY UNCHANGED" "PRESERVED FUTURE CAPABILITIES"; do
  check "$(Q -c "select position('$rule' in description) > 0 from public.nodes where rule_id='traffic_intelligence_law' and rule_version=14")" t "v14 carries the clause: $rule"
done
check "$(Q -c "select count(*) from public.nodes where rule_id='other_law' and is_active")" 1 'no other law is touched'
refused "$TMP/v14.sql" 'a second apply is refused (v14 exists)'
# rollback by supersession (a plain reactivation of v13 is a REVIVAL and the guard refuses it)
if Q -c "update public.nodes set is_active=false where rule_id='traffic_intelligence_law' and rule_version=14; update public.nodes set is_active=true where rule_id='traffic_intelligence_law' and rule_version=13" >/dev/null 2>&1; then echo 'FAIL the guard allowed a revival of v13'; exit 1; fi
pass=$((pass+1)); echo 'PASS the guard refuses to REVIVE v13 (so the rollback is a supersession)'
F "$R/04-contract-v14.rollback.sql"
check "$(Q -c "select rule_version from public.nodes where rule_id='traffic_intelligence_law' and is_active")" 15 'the rollback makes v15 the active version'
check "$(Q -c "select description from public.nodes where rule_id='traffic_intelligence_law' and rule_version=15")" 'STAND-IN V13 BODY' 'v15 body equals the v13 body exactly'
check "$(Q -c "select count(*) from public.nodes where rule_id='traffic_intelligence_law'")" 3 'history is kept: v13, v14 and v15 all remain'
# drift: a v13 body that changed after the read is refused
Q -c "alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1; delete from public.nodes where rule_id='traffic_intelligence_law' and rule_version>13; update public.nodes set is_active=true, description='CHANGED BODY' where rule_id='traffic_intelligence_law' and rule_version=13; alter table public.nodes enable trigger trg_rule_compaction_integrity_guard_v1"
refused "$TMP/v14.sql" 'a v13 body that changed after the read is refused (md5 pin)'
echo "ALL PASS ($pass)"
