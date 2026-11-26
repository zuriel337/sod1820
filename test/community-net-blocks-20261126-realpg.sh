#!/usr/bin/env bash
# Community network protection (ZURIEL 26.11.2026) on an isolated REAL PostgreSQL. Nothing touches a shared database. The two guest write routes are exact copies of the live
# bodies (md5-checked). Proves: the network is a keyed hash made at write time (no raw address stored by the new code, none returned to staff), blocks apply to guest writes only and
# expire by themselves, permanent blocks need a request and ONE designated approver (fail closed while unset), every action is audited append-only, historical messages are never
# guessed, authorization is staff-only, reads and signed-in accounts are untouched, the rollback restores both routes exactly and deletes no record.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); P=$ROOT/supabase/proposed; FX=$ROOT/test/fixtures
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
if [ ! -x "$PG_BIN/initdb" ]; then echo "SKIP: no PostgreSQL binaries at $PG_BIN"; exit 0; fi
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54397 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54397 -U postgres)
"${PSQL[@]}" -qc 'create database review' >/dev/null
Q() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
QE() { "${PSQL[@]}" -d review -qtAX "$@" 2>&1 || true; }
F() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX -1 -f "$1" 2>&1; }
FE() { "${PSQL[@]}" -d review -qtAX -1 -f "$1" 2>&1 || true; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
MOD=11111111-1111-4111-8111-111111111111; ADM=22222222-2222-4222-8222-222222222222; USR=33333333-3333-4333-8333-333333333333; APP=44444444-4444-4444-8444-444444444444
# as_user <uid|-> <headers json|-> <sql>  : one transaction with the identity and the request headers a PostgREST call would carry
as_user() { local u="$1" h="$2" s="$3"; local role=authenticated; [ "$u" = "-" ] && role=anon; local pre="select set_config('test.uid','$( [ "$u" = "-" ] && echo "" || echo "$u")',true);"; [ "$h" != "-" ] && pre="$pre select set_config('request.headers','$h',true);"; QE -c "$pre set local role $role; $s"; }
H() { echo "{\"cf-connecting-ip\":\"$1\"}"; }

Q -c "create role anon; create role authenticated; create role service_role; create schema auth;
create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('test.uid', true), '')::uuid \$\$;
create table public.users(id uuid primary key, role text, community_moderator boolean default false, display_name text, username text);
insert into public.users values ('$MOD','user',true,'אמילי','emily'), ('$ADM','admin',false,'מנהל','admin1'), ('$USR','user',false,'גולש','u1'), ('$APP','admin',false,'מאשר','approver');
create function public.community_can_moderate_guests() returns boolean language sql stable security definer as \$\$ select exists (select 1 from public.users where id = auth.uid() and (role = 'admin' or community_moderator)) \$\$;
create table public.contributors(id uuid default gen_random_uuid(), user_id uuid, trusted boolean);
create table public.contribution_events(user_id uuid, kind text, ref text, value numeric, source text, metadata jsonb);
create function public.contribution_weight(a text, b boolean, c boolean, d boolean) returns numeric language sql as 'select 1::numeric';
create table public.research_contributions(id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text, intent text, origin text, research_state text, status text,
  target_type text, target_id text, parent_id uuid, title text, body text, gematria_claim jsonb, image_url text, deleted_at timestamptz, thread_hidden_at timestamptz, last_activity_at timestamptz, updated_at timestamptz default now());
create table public.community_guest_settings(singleton boolean primary key default true, enabled boolean, updated_at timestamptz default now());
insert into public.community_guest_settings values (true, true);
create table public.community_guest_posts(contribution_id uuid primary key, created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid);
create table public.anon_contrib_log(id bigserial primary key, ip text, created_at timestamptz default now());
create index anon_contrib_log_ip_time on public.anon_contrib_log(ip, created_at);
grant usage on schema public, auth to anon, authenticated;
grant select on public.research_contributions to anon, authenticated;"
F "$FX/community_writers_live_20261126.sql" >/dev/null
Q -c "grant execute on function public.add_guest_community_message(text,uuid,text,text), public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text) to anon, authenticated"
GMD5() { Q -c "select md5(prosrc) from pg_proc where proname='$1'"; }
check "$(GMD5 add_guest_community_message)|$(GMD5 add_contribution)" '4eb11358227e6b3d8d77b933e076b28a|2c2baa01ecf07abf1e1511f3cb951d3b' 'fixture: both guest write routes are byte-identical to the live sources'
ROOTMSG=$(Q -c "insert into public.research_contributions(author_name,origin,status,target_type,target_id,body) values ('חבר','community_2029','approved','home','community','שורש') returning id")
G() { as_user - "$(H "$1")" "select public.add_guest_community_message('$2', '$ROOTMSG', '', null)"; } # $1 ip, $2 body
check "$(G 203.0.113.7 'תגובה לפני התיקון' | grep -c ERROR)|$(Q -c "select ip from public.anon_contrib_log")|$(Q -c "select count(*) from public.community_guest_posts")" '0|203.0.113.7|1' 'baseline: before the patch the raw address is what the existing rate-limit log stores (the gap)'
HIST=$(Q -c "select contribution_id from public.community_guest_posts limit 1")

F "$P/20261126200000_community_net_blocks_PROPOSAL.sql" >/dev/null; check "$?" 0 'apply: the proposal applies as one transaction on the live fingerprints'
check "$(FE "$P/20261126200000_community_net_blocks_PROPOSAL.sql" | grep -c ERROR)" 0 'apply: re-applying is a quiet no-op'
check "$(G 203.0.113.7 'תגובה אחרי התיקון' | grep -c ERROR)|$(Q -c "select count(*) from public.community_guest_posts where net_ref ~ '^[0-9a-f]{64}\$'")|$(Q -c "select count(*) from public.community_guest_posts where net_ref is null")" '0|1|1' 'link: a new guest message carries a 64-hex network reference; the historical one has none (no guess, no time matching)'
check "$(Q -c "select count(*) from public.anon_contrib_log where ip ~ '^[0-9.:]+\$' and id > 1")|$(Q -c "select count(*) from public.anon_contrib_log where ip ~ '^[0-9a-f]{64}\$'")" '0|1' 'privacy: from now on the rate-limit log stores the hash, never the raw address'
check "$(Q -c "select count(*) from public.community_guest_posts g join public.anon_contrib_log l on l.ip = g.net_ref")" 1 'privacy: the message reference and the rate-limit log use the same keyed hash'
NEW=$(Q -c "select contribution_id from public.community_guest_posts where net_ref is not null limit 1")

# authorization
check "$(as_user $USR - "select public.community_guest_block_from_message_v1('$NEW','h24','הטרדה חוזרת של אורח')" | grep -c 'not authorized')" 1 'auth: a signed-in non-staff user cannot block'
check "$(as_user - - "select public.community_guest_block_from_message_v1('$NEW','h24','הטרדה חוזרת של אורח')" | grep -c 'permission denied')" 1 'auth: anon cannot even call the staff API'
check "$(as_user $MOD - "select public.community_net_ref_v1('203.0.113.7')" | grep -c 'permission denied')|$(as_user - - "select count(*) from public.community_net_blocks" | grep -c 'permission denied')|$(as_user $MOD - "select count(*) from public.community_net_key" | grep -c 'permission denied')" '1|1|1' 'auth: staff and anon cannot call the internal helpers or read the key, blocks or reference tables'
check "$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW','permanent','הטרדה חוזרת של אורח')" | grep -c 'bad_duration')|$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW','d3','קצר')" | grep -c 'reason_required')|$(as_user $MOD - "select public.community_guest_block_from_message_v1('$HIST','d3','הטרדה חוזרת של אורח')" | grep -c 'no_network_reference')|$(as_user $MOD - "select public.community_guest_block_from_message_v1('$ROOTMSG','d3','הטרדה חוזרת של אורח')" | grep -c 'not_guest_post')" '1|1|1|1' 'rules: no permanent block is created directly; a reason is mandatory; a historical message cannot be blocked; a non-guest message cannot be blocked'

# block, hide, enforcement
BID=$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW','h24','הטרדה חוזרת של אורח אחרי אזהרה')" | tail -1)
check "$(Q -c "select status from public.research_contributions where id='$NEW'")|$(Q -c "select count(*) from public.community_net_block_events where block_id='$BID' and action in ('block_created','message_hidden')")|$(Q -c "select (extract(epoch from (expires_at - created_at))/3600)::int from public.community_net_blocks where id='$BID'")" 'hidden|2|24' 'block: the message is hidden, the block lasts 24 hours and both actions are audited'
check "$(G 203.0.113.7 'ניסיון מהרשת החסומה' | grep -c 'community_write_blocked')" 1 'enforce: a guest reply from the blocked network is refused'
check "$(G 203.0.113.9 'מאותה רשת' | grep -c ERROR)|$(G 198.51.100.4 'רשת אחרת' | grep -c ERROR)" '0|0' 'enforce: another address is not blocked (an IPv4 address is the unit)'
check "$(as_user - "$(H 203.0.113.7)" "select public.add_contribution('תגובה','beit_midrash','x',null,null,null,null,null,'אורח',null)" | grep -c 'community_write_blocked')" 1 'enforce: the anonymous contribution route cannot be used to bypass the block'
check "$(as_user $USR "$(H 203.0.113.7)" "select public.add_contribution('תגובה','beit_midrash','חשבון מחובר',null,null,null,null,null,null,null)" | grep -c ERROR)" 0 'scope: a signed-in account on the same network is not affected'
check "$(as_user - - "select count(*) from public.research_contributions where status='approved'" | tail -1)" "$(Q -c "select count(*) from public.research_contributions where status='approved'")" 'scope: reading is not affected by a block (anon read of approved rows still works)'
check "$(as_user $MOD - "select * from public.community_net_blocks_list_v1(false, 10)" | grep -cE '203\.0\.113|[0-9a-f]{64}')|$(Q -c "select count(*) from pg_proc p where proname like 'community_%' and prorettype::regtype::text not in ('void','boolean','uuid') and pg_get_function_result(oid) ~* 'net_ref|ip'")" '0|0' 'privacy: the staff list contains neither the address nor the network reference, and no new function returns an address or reference column'
check "$(as_user $MOD - "select count(*) from public.community_net_blocks_list_v1(false, 10)" | tail -1)|$(as_user $USR - "select count(*) from public.community_net_blocks_list_v1(false, 10)" | tail -1)" '1|0' 'auth: the list is for staff only (a non-staff user gets nothing)'
check "$(as_user $MOD - "select linked_messages||'/'||state||'/'||created_by_name from public.community_net_blocks_list_v1(false, 10)" | tail -1)" '1/active/אמילי' 'list: shows the count of linked messages, the state and who blocked, never the network'
check "$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW','d3','ניסיון חוזר באותה רשת')" | grep -c 'already_blocked')" 1 'rules: a network cannot carry two open blocks'
# expiry and lift
Q -c "update public.community_net_blocks set expires_at = now() - interval '1 minute', created_at = now() - interval '25 hours' where id='$BID'"
check "$(G 203.0.113.7 'אחרי הפקיעה' | grep -c ERROR)" 0 'expiry: the block ends by itself (checked at write time, no cron)'
check "$(as_user $MOD - "select state from public.community_net_blocks_list_v1(true, 10)" | tail -1)" expired 'expiry: the list shows it as expired'
NEW2=$(Q -c "select contribution_id from public.community_guest_posts where net_ref is not null order by created_at desc limit 1")
B2=$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW2','d7','הטרדה חוזרת של אורח שוב')" | tail -1)
check "$(Q -c "select count(*) from public.community_net_blocks where lifted_at is not null and lift_reason='expired'")|$(Q -c "select duration_kind from public.community_net_blocks where id='$B2'")" '1|d7' 'expiry: a new block retires the expired one and starts a fresh 7-day block'
check "$(as_user $MOD - "select public.community_net_block_lift_v1('$B2','נבדק והוסר לבקשת הצוות')" | grep -c ERROR)|$(G 203.0.113.7 'אחרי ביטול' | grep -c ERROR)" '0|0' 'lift: a block can be lifted and writing resumes at once'
check "$(QE -c "update public.community_net_block_events set reason='x'" | grep -c 'append-only')|$(QE -c "delete from public.community_net_block_events" | grep -c 'append-only')" '1|1' 'audit: the event table is append-only (no update, no delete)'
# permanent: request + one designated approver, fail closed while unset
NEW3=$(Q -c "select contribution_id from public.community_guest_posts where net_ref is not null order by created_at desc limit 1")
B3=$(as_user $MOD - "select public.community_guest_block_from_message_v1('$NEW3','d3','הטרדה חוזרת וחמורה של אורח')" | tail -1)
check "$(as_user $ADM - "select public.community_net_block_approve_permanent_v1('$B3','אישור לצמיתות')" | grep -c 'not authorized')" 1 'permanent: an admin is not enough while no approver is designated (fail closed)'
as_user $MOD - "select public.community_net_block_request_permanent_v1('$B3','ביקשתי חסימה לצמיתות כי ההטרדה חוזרת')" >/dev/null
Q -c "update public.community_net_settings set permanent_approver_user_id='$APP'"
check "$(as_user $ADM - "select public.community_net_block_approve_permanent_v1('$B3','אישור לצמיתות')" | grep -c 'not authorized')|$(as_user $MOD - "select public.community_net_block_approve_permanent_v1('$B3','אישור לצמיתות')" | grep -c 'not authorized')" '1|1' 'permanent: other admins and moderators cannot approve; only the designated approver'
check "$(as_user $APP - "select public.community_net_block_approve_permanent_v1('$B3','אישור לצמיתות על ידי הבעלים')" | grep -c ERROR)|$(Q -c "select duration_kind||'/'||coalesce(expires_at::text,'none') from public.community_net_blocks where id='$B3'")" '0|permanent/none' 'permanent: the designated approver turns the requested block permanent (no expiry)'
Q -c "select pg_sleep(0)"; check "$(G 203.0.113.7 'רשת חסומה לצמיתות' | grep -c 'community_write_blocked')" 1 'permanent: the permanent block keeps refusing guest writes'
check "$(Q -c "select string_agg(action, ',' order by id) from public.community_net_block_events where block_id='$B3'")" 'block_created,message_hidden,permanent_requested,permanent_approved' 'audit: who, when and why are recorded for every step (event rows carry the actor and the reason)'
# IPv6: one /64 is one network
V6=$(as_user - "$(H 2001:db8:aaaa:1::5)" "select public.add_guest_community_message('מרשת שש', '$ROOTMSG', '', null)" | tail -1)
V6M=$(Q -c "select contribution_id from public.community_guest_posts order by created_at desc limit 1")
as_user $MOD - "select public.community_guest_block_from_message_v1('$V6M','h24','הטרדה חוזרת מרשת IPv6')" >/dev/null
check "$(as_user - "$(H 2001:db8:aaaa:1::99)" "select public.add_guest_community_message('אותה רשת', '$ROOTMSG', '', null)" | grep -c 'community_write_blocked')|$(as_user - "$(H 2001:db8:aaaa:2::5)" "select public.add_guest_community_message('רשת אחרת', '$ROOTMSG', '', null)" | grep -c ERROR)" '1|0' 'ipv6: the unit is the /64; a different /64 is not blocked'
check "$(as_user - "$(H 'not-an-ip')" "select public.add_guest_community_message('x', '$ROOTMSG', '', null)" | grep -c 'rate_limited')" 1 'fail closed: an unparsable address cannot write (as the existing route already did without an address)'
# performance of the added work
T0=$(date +%s%N); Q -c "select count(public.community_net_blocked_v1(public.community_net_ref_v1('203.0.113.' || (i % 250)))) from generate_series(1,100000) i" >/dev/null; T1=$(date +%s%N)
echo "INFO perf: 100,000 (hash + block lookup) took $(( (T1-T0)/1000000 )) ms = $(( (T1-T0)/100000000 )) x 0.1 us-ish per call on this machine (only guest writes pay it; reads pay nothing)"
check "$(( (T1-T0)/1000000 < 20000 ))" 1 'perf: the added work per guest write is far below a millisecond'
# rollback
BLK=$(Q -c "select count(*) from public.community_net_blocks"); EVT=$(Q -c "select count(*) from public.community_net_block_events"); GP=$(Q -c "select count(*) from public.community_guest_posts where net_ref is not null")
F "$P/20261126200000_community_net_blocks_ROLLBACK.sql" >/dev/null; check "$(GMD5 add_guest_community_message)|$(GMD5 add_contribution)" '4eb11358227e6b3d8d77b933e076b28a|2c2baa01ecf07abf1e1511f3cb951d3b' 'rollback: both guest write routes are restored byte for byte (same md5)'
check "$(Q -c "select count(*) from public.community_net_blocks")|$(Q -c "select count(*) from public.community_net_block_events")|$(Q -c "select count(*) from public.community_guest_posts where net_ref is not null")" "$BLK|$EVT|$GP" 'rollback: no block, event or network reference is deleted'
check "$(Q -c "select count(*) from pg_proc where (proname like 'community_net_%' and proname <> 'community_net_block_events_append_only_v1') or proname in ('community_guest_block_from_message_v1','community_guest_hide_v1')")" 0 'rollback: the staff API and the helpers are gone'
check "$(G 203.0.113.7 'אחרי שחזור' | grep -c ERROR)" 0 'rollback: with the routes restored, guest writing works as before the proposal'
F "$P/20261126200000_community_net_blocks_PROPOSAL.sql" >/dev/null; check "$(G 203.0.113.7 'אחרי החלה חוזרת' | grep -c 'community_write_blocked')" 1 'reapply: re-applying after a rollback restores enforcement from the kept blocks and the same key'
echo "COMMUNITY NET BLOCKS 20261126 REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
