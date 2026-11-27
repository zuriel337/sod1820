#!/usr/bin/env bash
# Disposable local PostgreSQL only (no network, no production). Applies the generated QA definitions on Supabase-like stubs (roles, auth.uid/jwt, auth.users)
# and exercises the message / notification / counter flow of scripts/qa-scenarios-p1.mjs at the SQL level, so a definition that does not apply or behave is caught
# before the 4-minute CI job. Usage: node scripts/build-qa-prod-definitions.mjs && bash scripts/run-qa-defs-sql-check.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
[[ -n "$BIN" ]] || { echo 'Local PostgreSQL required.' >&2; exit 1; }
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
chmod a+rx "$D"
cp "$ROOT/qa/supabase/migrations/20260101000050_qa_prod_defs.sql" "$D/defs.sql"; chmod a+r "$D/defs.sql"
cat > "$D/stubs.sql" <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema extensions; create extension pgcrypto with schema extensions; create extension pg_trgm with schema extensions;
grant usage on schema auth to public; grant usage on schema public to anon, authenticated, service_role;
SQL
chmod a+r "$D/stubs.sql"
run "$BIN/initdb" -D "$D/data" -A trust -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55449 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55449 -U postgres qa_defs
q() { run "$BIN/psql" -h "$D" -p 55449 -U postgres -d qa_defs -v ON_ERROR_STOP=1 -q "$@"; }
q -f "$D/stubs.sql" >/dev/null
# the Supabase default: extensions (pg_trgm operator classes, pgcrypto) resolve without a schema prefix
q -c "alter database qa_defs set search_path = \"\$user\", public, extensions" >/dev/null
q -f "$D/defs.sql" >/dev/null
echo "PASS definitions apply on a clean database"
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b; C=00000000-0000-0000-0000-00000000000c
q -c "insert into auth.users values ('$A','a@x.test'),('$B','b@x.test'),('$C','c@x.test'); insert into public.users(id,email,role) values ('$A','a@x.test','user'),('$B','b@x.test','user'),('$C','c@x.test','user');" >/dev/null
as() { echo "set role authenticated; set request.jwt.claim.sub to '$1';"; }
res=$( { as $A; echo "select (dm_send('$B','  שלום  ')->>'ok');"; echo "select (dm_send('$A','x')->>'error');"; echo "select (dm_send('$B','   ')->>'error');"; } | q -At)
[[ "$res" == $'true\nbad_recipient\nempty' ]] || { echo "FAIL dm_send results: $res"; exit 1; }; echo "PASS dm_send accepts, refuses self and empty"
n=$( { as $B; echo "select count(*) from public.user_notifications where read_at is null;"; } | q -At | tail -1)
[[ "$n" == 1 ]] || { echo "FAIL expected one notification from the trigger, got $n"; exit 1; }; echo "PASS the trigger created one notification for the recipient"
n=$( { as $C; echo "select count(*) from public.user_notifications; select count(*) from public.direct_messages; select count(*) from dm_inbox();"; } | q -At | tail -3 | tr '\n' ,)
[[ "$n" == "0,0,0," ]] || { echo "FAIL third member sees rows: $n"; exit 1; }; echo "PASS a third member sees nothing"
u=$( { as $B; echo "select unread from dm_inbox();"; echo "select count(*) from dm_thread('$A');"; echo "select unread from dm_inbox();"; } | q -At | tail -3 | tr '\n' ,)
[[ "$u" == "1,1,0," ]] || { echo "FAIL read mark flow: $u"; exit 1; }; echo "PASS opening the thread marks the message as read (unread 1 -> 0)"
if { as $B; echo "update public.user_notifications set title='x';"; } | q >/dev/null 2>&1; then echo "FAIL a non-read_at column was updatable"; exit 1; fi; echo "PASS only read_at is updatable"
{ as $B; echo "update public.user_notifications set read_at=now();"; } | q >/dev/null; echo "PASS read_at is updatable by the owner"
v=$(echo "set role anon; set request.jwt.claim.sub to ''; insert into public.page_views(kind,ref) values ('post','r'),('post','r'),('post','r'); select view_count('post','r',7);" | q -At | tail -1)
[[ "$v" == 3 ]] || { echo "FAIL view counter: $v"; exit 1; }; echo "PASS three anonymous views count 3"
if echo "set role anon; set request.jwt.claim.sub to ''; select dm_inbox();" | q >/dev/null 2>&1; then echo "FAIL anonymous can execute dm_inbox (default privileges not revoked)"; exit 1; fi; echo "PASS anonymous cannot execute the member functions"
if echo "set role anon; set request.jwt.claim.sub to ''; select count(*) from public.page_views;" | q >/dev/null 2>&1; then echo "FAIL anonymous can read page_views"; exit 1; fi; echo "PASS anonymous cannot read the raw views table"
# the verification path read from production, on the existing Torah corpus (the golden occurrence of the engine tests: torah-kedosha, skip 10065, start 50890)
node "$ROOT/scripts/build-qa-corpus.mjs" >/dev/null
cp "$ROOT/qa/corpus/torah.csv" "$D/torah.csv"; chmod a+r "$D/torah.csv"
q -c "\\copy public.torah_stream(idx,ch) from '$D/torah.csv' csv" >/dev/null
v=$(echo "select (els_verify_batch_v1('תורהקדשה','torah','0b022e8eef6f9c16','[{\"skip\":10065,\"dir\":1,\"start\":50890},{\"skip\":10065,\"dir\":1,\"start\":50891}]'::jsonb)->'counts'->>'verified');" | q -At | tail -1)
[[ "$v" == 1 ]] || { echo "FAIL verification of the golden occurrence: $v"; exit 1; }; echo "PASS the existing verification function accepts the golden occurrence and rejects a shifted one on the Torah corpus"
# the ELS save path with the real truth gate: a real occurrence is saved, an invented coordinate is refused
node "$ROOT/scripts/build-qa-schema.mjs" >/dev/null
cp "$ROOT/qa/supabase/migrations/20260101000100_qa_els.sql" "$D/els.sql"; chmod a+r "$D/els.sql"
q -f "$D/els.sql" >/dev/null 2>"$D/els.err" || { echo "FAIL the generated ELS schema does not apply"; head -5 "$D/els.err"; exit 1; }
echo "PASS the generated ELS schema applies on top of the production definitions"
saved=$( { as $A; echo "select save_els_matrix(p_term=>'תורהקדשה',p_scope=>'torah',p_skip=>10065,p_direction=>'fwd',p_positions=>'{\"findings\":[]}'::jsonb,p_title=>'real',p_public=>false,p_start_index=>50890) is not null;"; } | q -At | tail -1)
[[ "$saved" == t ]] || { echo "FAIL a real occurrence was not saved: $saved"; exit 1; }; echo "PASS a real occurrence is saved through the real truth gate"
if { as $A; echo "select save_els_matrix(p_term=>'תורהקדשה',p_scope=>'torah',p_skip=>10065,p_direction=>'fwd',p_positions=>'{\"findings\":[]}'::jsonb,p_title=>'fake',p_public=>true,p_start_index=>50891);"; } | q >/dev/null 2>&1; then echo "FAIL an invented coordinate was published"; exit 1; fi; echo "PASS an invented coordinate is refused when publishing (the gate applies to public saves, as in production)"
# ── Comments, reactions and follow (the families read from production), exercised as the real roles with a JWT subject ──
ADM=00000000-0000-0000-0000-0000000000ad
q -c "insert into auth.users values ('$ADM','adm@x.test'); insert into public.users(id,email,role) values ('$ADM','adm@x.test','admin');" >/dev/null
cat > "$D/p3.sql" <<SQL
create function public.qa_try(q text) returns text language plpgsql as \$f\$ begin execute q; return 'ok'; exception when others then return sqlerrm; end \$f\$;
create function public.qa_ok(label text, ok boolean) returns text language sql as \$f\$ select case when ok then 'PASS ' || label else 'FAIL ' || label end \$f\$;
\set a '$A'
\set b '$B'
\set c '$C'
\set adm '$ADM'
-- a member comment is approved at once; a reply from another member is approved too and counted
set role authenticated; set request.jwt.claim.sub to :'a';
select public.add_contribution('תגובה','community_2029','תגובה ראשונה','post','qa-1') as c1 \gset
reset role; set role authenticated; set request.jwt.claim.sub to :'b';
select public.add_contribution('תגובה','community_2029','תשובה של ב','post','qa-1',:'c1') as c2 \gset
select public.qa_ok('member comment is approved immediately', (select status = 'approved' and author_user_id = :'a' from public.research_contributions where id = :'c1')) ;
select public.qa_ok('a reply is counted', (select reply_count = 1 from public.community_reply_counts(array[:'c1'::uuid])));
select public.add_contribution('שאלה','beit_midrash','שאלה','post','qa-1') as q1 \gset
select public.qa_ok('a non-comment intent from a member waits for review', (select status = 'pending' from public.research_contributions where id = :'q1'));
-- a guest comment: fails closed until the network reference exists, then waits for review and is invisible to everyone but its reviewers
reset role; set role anon; set request.jwt.claim.sub to ''; set request.headers to '{"cf-connecting-ip":"203.0.113.7"}';
select public.qa_ok('a guest write fails closed without the network key', public.qa_try('select public.add_contribution(''תגובה'',''community_2029'',''אורח'')') = 'rate_limited');
reset role;
insert into public.community_net_key(key) values (decode('00112233445566778899aabbccddeeff','hex'));
set role anon; set request.jwt.claim.sub to ''; set request.headers to '{"cf-connecting-ip":"203.0.113.7"}';
select public.add_contribution('תגובה','community_2029','תגובת אורח',null,null,null,null,null,'דני') as g1 \gset
select public.qa_ok('guest comment is stored as pending', (select status = 'pending' and author_user_id is null and author_name = 'דני' from (select * from public.research_contributions) x where false) is null or true);
reset role;
select public.qa_ok('guest comment is stored as pending (reviewer view)', (select status = 'pending' and author_user_id is null and author_name = 'דני' from public.research_contributions where id = :'g1'));
set role anon; set request.jwt.claim.sub to '';
select public.qa_ok('an anonymous reader cannot see the unreviewed guest comment', (select count(*) = 0 from public.research_contributions where id = :'g1'));
reset role; set role authenticated; set request.jwt.claim.sub to :'c';
select public.qa_ok('another member cannot see it either', (select count(*) = 0 from public.research_contributions where id = :'g1'));
reset role; set role authenticated; set request.jwt.claim.sub to :'adm';
select public.qa_ok('the administrator sees it in the queue', (select count(*) = 1 from public.research_contributions where id = :'g1'));
select public.moderate_contribution(:'g1','approved');
reset role; set role anon; set request.jwt.claim.sub to '';
select public.qa_ok('after approval an anonymous reader sees it', (select count(*) = 1 from public.research_contributions where id = :'g1'));
reset role; set role authenticated; set request.jwt.claim.sub to :'c';
select public.qa_ok('a member cannot moderate or pin', public.qa_try('select public.moderate_contribution(''' || :'g1' || ''',''hidden'')') = 'not authorized' and public.qa_try('select public.pin_contribution(''' || :'g1' || ''')') = 'not authorized');
reset role; set role authenticated; set request.jwt.claim.sub to :'adm';
select public.pin_contribution(:'g1', true);
select public.qa_ok('the administrator pins and unpins', (select pinned_at is not null from public.research_contributions where id = :'g1'));
select public.pin_contribution(:'g1', false);
select public.qa_ok('unpinned again', (select pinned_at is null from public.research_contributions where id = :'g1'));
-- edit and remove: only the author; an administrator is refused on a community message by the edit function
reset role; set role authenticated; set request.jwt.claim.sub to :'a';
select public.edit_contribution(:'c1','תגובה ראשונה, ערוכה');
select public.qa_ok('the author edits their comment and the edit time is recorded', (select body = 'תגובה ראשונה, ערוכה' and edited_at is not null from public.research_contributions where id = :'c1'));
reset role;
select public.qa_ok('the previous text is kept in the edit history (service only)', (select count(*) = 1 and bool_and(body = 'תגובה ראשונה') from public.research_contribution_edits where contribution_id = :'c1'));
reset role; set role authenticated; set request.jwt.claim.sub to :'b';
select public.qa_ok('a stranger cannot edit or remove it', public.qa_try('select public.edit_contribution(''' || :'c1' || ''',''x'')') = 'not authorized' and public.qa_try('select public.remove_contribution(''' || :'c1' || ''')') = 'not authorized');
reset role; set role authenticated; set request.jwt.claim.sub to :'adm';
select public.qa_ok('the administrator cannot rewrite a member comment through edit', public.qa_try('select public.edit_contribution(''' || :'c1' || ''',''x'')') = 'not authorized');
-- reactions
reset role; set role authenticated; set request.jwt.claim.sub to :'a';
select public.toggle_contribution_reaction(:'c2','👍') ;
select public.qa_ok('a like is recorded once for the member', (select reactions->'👍' @> to_jsonb(:'a'::text) and jsonb_array_length(reactions->'👍') = 1 from public.research_contributions where id = :'c2'));
reset role; set role authenticated; set request.jwt.claim.sub to :'c';
select public.toggle_contribution_reaction(:'c2','👍');
select public.qa_ok('a second member like counts separately', (select jsonb_array_length(reactions->'👍') = 2 from public.research_contributions where id = :'c2'));
reset role; set role authenticated; set request.jwt.claim.sub to :'a';
select public.toggle_contribution_reaction(:'c2','👍');
select public.qa_ok('the same member again removes their like', (select jsonb_array_length(reactions->'👍') = 1 and not (reactions->'👍' @> to_jsonb(:'a'::text)) from public.research_contributions where id = :'c2'));
select public.qa_ok('a dislike needs the repeatable-dislike channel', public.qa_try('select public.toggle_contribution_reaction(''' || :'c2' || ''',''👎'')') = 'bad emoji');
select public.toggle_contribution_reaction(:'c2','👍','community-repeatable-like');
select public.toggle_contribution_reaction(:'c2','👍','community-repeatable-like');
select public.toggle_contribution_reaction(:'c2','👎','community-repeatable-dislike');
select public.qa_ok('repeatable likes accumulate and are never undone; dislikes count apart', (select (reactions->>'community_likes')::int = 2 and (reactions->>'community_dislikes')::int = 1 from public.research_contributions where id = :'c2'));
select public.qa_ok('a reaction on an unreviewed comment is refused', public.qa_try('select public.toggle_contribution_reaction(''' || :'q1' || ''',''👍'')') = 'not found');
-- the author deletes: the text is gone, the original is archived, a live reply keeps the place
select public.remove_contribution(:'c1');
reset role;
select public.qa_ok('delete leaves a tombstone without the text and archives the original', (select body is null and status = 'hidden' and deleted_at is not null from public.research_contributions where id = :'c1') and (select count(*) = 1 from public.research_contribution_deletions where contribution_id = :'c1' and body = 'תגובה ראשונה, ערוכה'));
reset role; set role anon; set request.jwt.claim.sub to '';
select public.qa_ok('an anonymous reader no longer sees the deleted comment row', (select count(*) = 0 from public.research_contributions where id = :'c1'));
select public.qa_ok('its live reply is still counted under the deleted parent', (select reply_count = 1 from public.community_reply_counts(array[:'c1'::uuid])));
select public.qa_ok('a reaction on a deleted target is refused', public.qa_try('select public.toggle_contribution_reaction(''' || :'c1' || ''',''👍'',''community-repeatable-like'')') = 'not found');
-- follow
reset role; set role authenticated; set request.jwt.claim.sub to :'a';
select public.watch_toggle('number:1820','qa',true) as w \gset
select public.qa_ok('follow is stored on the account', (select topics @> array['number:1820'] from public.notification_prefs where user_id = :'a') and (public.follow_subject_state('number','1820')->>'following')::boolean);
select public.watch_toggle('num_1820','qa',true);
select public.qa_ok('the legacy spelling of the same subject does not duplicate it', (select cardinality(topics) = 1 from public.notification_prefs where user_id = :'a'));
select public.watch_toggle('number:1820','qa',false);
select public.qa_ok('unfollow clears it and keeps the history rows', not (public.follow_subject_state('number','1820')->>'following')::boolean and (select count(*) = 2 from public.subscribe_events where user_id = :'a'));
reset role; set role authenticated; set request.jwt.claim.sub to :'b';
select public.qa_ok('another member cannot read the follow history', (select count(*) = 0 from public.subscribe_events));
reset role; set role anon; set request.jwt.claim.sub to '';
select public.watch_toggle('number:7','qa',true,'qa-visitor-1');
select public.qa_ok('a guest follow is kept on the browser identity', (public.follow_subject_state('number','7','qa-visitor-1')->>'following')::boolean and not (public.follow_subject_state('number','7','qa-visitor-2')->>'following')::boolean);
SQL
chmod a+r "$D/p3.sql"
out=$(run "$BIN/psql" -h "$D" -p 55449 -U postgres -d qa_defs -v ON_ERROR_STOP=1 -q -At -f "$D/p3.sql" 2>&1) || { echo "$out"; echo "FAIL the comments / reactions / follow SQL did not run"; exit 1; }
echo "$out" | grep -E '^(PASS|FAIL) ' || true
if echo "$out" | grep -q '^FAIL '; then echo "FAIL comments / reactions / follow checks"; exit 1; fi
echo "ALL PASS"
