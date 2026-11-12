-- Throwaway-Postgres test for supabase/proposed/20261112230000_cl13_personal_memory_pause.sql and its ROLLBACK (never a live project).
-- Spec: the contracts handoff 53bb72e13, alignment README section 14 (D-CL13-1..3, R1-R10, M-1..M-15). This file is the DATABASE
-- half of those tests; the Edge handlers run against the same database in test/cl13-personal-memory-handlers.test.mjs.
--
-- Two kinds of checks, both counted so that a check that did not run fails the runner (scripts/run-cl13-personal-memory-sql-test.sh):
--   @@CASE <id> OK | REFUSE <needle>   one run of the proposal or of its rollback (markers on stderr, as in the CL-16 lifecycle);
--   pg_temp.ok(<id>, <condition>)      one behaviour check; a false condition raises at once, and the ids are counted at the end.
-- Every refusal has its reason, and every refusal has an allowed counterpart that passes.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create temp table checks(id text primary key);
create function pg_temp.ok(c text, cond boolean, detail text default '') returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'CHECK FAILED: % %', c, detail; end if;
  insert into checks values (c);
end $$;
create function pg_temp.refused(c text, q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if position(msg in sqlerrm) > 0 then insert into checks values (c); return; end if;
    raise exception 'CHECK FAILED: % refused for another reason: % (expected %)', c, sqlerrm, msg;
  end;
  raise exception 'CHECK FAILED: % NOT REFUSED: %', c, q;
end $$;
create function pg_temp.state() returns text language sql as $$
  select coalesce(string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' | ' order by p.proname), 'none')
      || ' || ' || coalesce((select string_agg(pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']', ' ; ' order by t.tgname)
                              from pg_trigger t where to_regclass('public.agent_user_memory') is not null and t.tgrelid = to_regclass('public.agent_user_memory') and not t.tgisinternal), 'no trigger')
    from pg_proc p where p.pronamespace = 'public'::regnamespace
     and (p.proname like 'fn\_raziel\_%' escape '\' or p.proname like '%personal\_memory%' escape '\' or p.proname = 'fn_mem_add') $$;
create temp table probe(s text);
create function pg_temp.mark() returns void language sql as $$ delete from probe; insert into probe select pg_temp.state() $$;
create function pg_temp.unchanged(c text) returns void language plpgsql as $$
begin
  if pg_temp.state() is distinct from (select s from probe) then raise exception '%: a refused file changed the state', c; end if;
  insert into checks values (c || ' state unchanged');
end $$;
\set ON_ERROR_STOP off

-- L0 the table does not exist: both files stop and create nothing
select pg_temp.mark();
\warn @@CASE L0-apply-no-table REFUSE CL13 precondition: public.agent_user_memory not found; stop, nothing changed
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\warn @@CASE L0-rollback-no-table REFUSE CL13 rollback: public.agent_user_memory not found; stop, nothing changed
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L0');

-- the live shape of the table (columns and defaults as read on 12.11.2026) and of the link table
create table public.agent_user_memory (id uuid primary key default gen_random_uuid(), user_ref text not null, channel text not null, agent text not null, topic text, content text,
  data jsonb not null default '{}'::jsonb, status text not null default 'private', source_table text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  memory_type text, source text, confidence smallint, visibility text not null default 'private', memory_scope text not null default 'personal');
alter table public.agent_user_memory enable row level security;
create policy agent_user_memory_own_read on public.agent_user_memory for select using (user_ref = (auth.uid())::text);
grant all on public.agent_user_memory to service_role;
create table public.wa_account_links (id bigserial primary key, user_id uuid, phone text, verified_at timestamptz, created_at timestamptz default now(), credited_msgs integer, welcomed_at timestamptz);
create table public.wa_bot_log (id bigserial primary key, action text, text_in text, created_at timestamptz default now());
grant all on public.wa_bot_log to service_role; grant usage on sequence public.wa_bot_log_id_seq to service_role;

-- L1 the five live functions, byte-identical to live
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_remember.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_fact.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_upsert_summary.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_mem_add.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_context.sql
revoke all on function public.fn_raziel_remember(text,text,text,text,text,text,text), public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint),
  public.fn_raziel_upsert_summary(text,text,text,text), public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb), public.fn_raziel_context(text,text) from public;
grant execute on function public.fn_raziel_remember(text,text,text,text,text,text,text), public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint),
  public.fn_raziel_upsert_summary(text,text,text,text), public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb), public.fn_raziel_context(text,text) to service_role;
create temp table live_state as select pg_temp.state() as s;
select pg_temp.ok('L1 the fixtures are the live 12.11.2026 bodies',
  md5(pg_get_functiondef('public.fn_raziel_remember(text,text,text,text,text,text,text)'::regprocedure)) = '5598acf902200444827efe54305466e1'
  and md5(pg_get_functiondef('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)'::regprocedure)) = 'ebd32bd78f3d6e6af11132c9533a2834'
  and md5(pg_get_functiondef('public.fn_raziel_upsert_summary(text,text,text,text)'::regprocedure)) = '85f60b9a552c5c03d01955dec113156a'
  and md5(pg_get_functiondef('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)'::regprocedure)) = '6a26f9e5d1a05fd6c3fc25b8179951b7'
  and md5(pg_get_functiondef('public.fn_raziel_context(text,text)'::regprocedure)) = '56ffd0cfc5e29945e56044439a01f81e');

-- the memory that exists before the pause (the kinds counted in live: site thread, private chat, a sender without an account,
-- a row recorded from a group, profile facts, and the two research bots)
\set UA '11111111-1111-4111-8111-111111111111'
\set UB '22222222-2222-4222-8222-222222222222'
insert into public.wa_account_links(user_id, phone, verified_at) values (:'UA', '972500000001', now()), (:'UB', '972500000002', null);
insert into public.agent_user_memory(user_ref, channel, agent, memory_type, memory_scope, source, topic, content, data) values
 (:'UA', 'site', 'raziel', 'conversation', 'personal', 'site', 'old question', 'OLD-SITE-THREAD-A1', '{"reply":"OLD-REPLY-A1"}'),
 (:'UA', 'site', 'raziel', 'conversation', 'personal', 'site', 'old question 2', 'OLD-SITE-THREAD-A2', '{"reply":"OLD-REPLY-A2"}'),
 (:'UA', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-DM-A', '{}'),
 (:'UA', '972500000001@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'birthday_hebrew', 'OLD-FACT-A', '{"kind":"birthday_hebrew"}'),
 ('wa:972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'PRE-LINK-MEMORY-OF-A', '{}'),
 ('972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'BARE-PHONE-MEMORY-OF-A', '{}'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-DM-UNLINKED', '{}'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'name', 'OLD-FACT-UNLINKED', '{"kind":"name"}'),
 (:'UA', '120363000000000001@g.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-FROM-GROUP-A', '{}'),
 ('channel:120363000000000001@g.us', '120363000000000001@g.us', 'raziel', 'conversation', 'channel', 'wa', 'GROUP-TOPIC', 'group topic row', '{}'),
 (:'UB', 'site', 'raziel', 'conversation', 'personal', 'site', 'b', 'OLD-SITE-THREAD-B', '{"reply":"OLD-REPLY-B"}'),
 ('wa:972500000002', '972500000002@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'UNVERIFIED-PHONE-OF-B', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'conversation', 'personal', 'wa', null, 'BOT-QUESTION-1', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'finding', 'BOT-FINDING-1', '{}'),
 ('972522222222@c.us', 'wa', 'uriel', 'conversation', 'personal', 'wa', null, 'BOT-QUESTION-2', '{}'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'wa', 'rule', 'BOT-FINDING-2', '{}');
create temp table original_ids as select id from public.agent_user_memory;
-- the full-content stamp of the rows that existed before (M-1, M-3: a count or max(created_at) would not see an UPDATE)
create function pg_temp.stamp() returns text language sql as $$
  select md5(coalesce(string_agg(md5(row_to_json(m)::text), ',' order by m.id), '')) || ':' || count(*)
    from public.agent_user_memory m where m.id in (select id from original_ids) $$;
create temp table stamp0 as select pg_temp.stamp() as s;

-- BASELINE (the live behaviour the pause replaces): memory is read without consent, merged through the link, and written on demand
select pg_temp.ok('B1 live: an old memory is read as context without any consent',
  (public.fn_raziel_context(:'UA', 'site') #>> '{user_context,summary}') like '%OLD-SITE-THREAD-A1%'
  and (public.fn_raziel_context(:'UA', 'site') #>> '{privacy,personal_memory_allowed}')::boolean);
select pg_temp.ok('B4 live: a memory recorded under the bare phone is merged into the account through the link (the identity bridge)',
  public.fn_raziel_context(:'UA', 'site')::text like '%BARE-PHONE-MEMORY-OF-A%' and public.fn_raziel_context(:'UA', 'site')::text not like '%PRE-LINK-MEMORY-OF-A%');
select pg_temp.ok('B2 live: profile facts of a sender without an account are read back',
  (public.fn_raziel_context('wa:972500000009', '972500000009@c.us') #> '{user_context,profile}')::text like '%OLD-FACT-UNLINKED%');
do $$ declare v uuid; begin
  v := public.fn_mem_add('972511111111@c.us', 'hatishbi', 'a personal note typed as something else', 'PERSONAL-TEXT');
  perform pg_temp.ok('B3 live: an unknown memory type is stored as research_note', (select memory_type from public.agent_user_memory where id = v) = 'research_note');
  delete from public.agent_user_memory where id = v;
end $$;

-- L2 drift before apply: a changed body, an unexpected trigger, and one of the new functions already present
create table l2_saved as select pg_get_functiondef('public.fn_raziel_remember(text,text,text,text,text,text,text)'::regprocedure) as def;
do $$ begin execute replace((select def from l2_saved), 'declare v_id uuid;', E'declare v_id uuid;\n  -- drift'); end $$;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L2-apply-drifted-body REFUSE CL13 drift: the state is neither the live state read on 12.11.2026 nor the applied state
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\warn @@CASE L2-rollback-drifted-body REFUSE CL13 rollback drift: the state is neither the applied state nor the live 12.11.2026 state
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L2 body');
do $$ begin execute (select def from l2_saved); end $$;
create function public.l2_noop() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger l2_unexpected before insert on public.agent_user_memory for each row execute function public.l2_noop();
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L2-apply-unexpected-trigger REFUSE other_triggers=1
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L2 trigger');
drop trigger l2_unexpected on public.agent_user_memory; drop function public.l2_noop();
create function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable as $$ select '{"write_personal":true,"read_personal":true}'::jsonb $$;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L2-apply-foreign-policy-function REFUSE CL13 drift: the state is neither the live state read on 12.11.2026 nor the applied state
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L2 foreign policy');
drop function public.fn_personal_memory_policy_v1(text);
select pg_temp.ok('L2 restored to the live state', pg_temp.state() = (select s from live_state));

-- L3 apply on the exact live state
\set ON_ERROR_STOP off
\warn @@CASE L3-apply-exact-live-state OK
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
create temp table applied_state as select pg_temp.state() as s;
select pg_temp.ok('L3 the apply changed the state and left every existing row as it was', pg_temp.state() <> (select s from live_state) and pg_temp.stamp() = (select s from stamp0));
\set ON_ERROR_STOP off
\warn @@CASE L4-apply-again-noop OK
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.ok('L4 a second apply changes nothing', pg_temp.state() = (select s from applied_state));

-- ───────────────────────── behaviour while paused ─────────────────────────
create function public.as_user(p_role text, p_sub text, p_sql text) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  execute format('set local role %I', p_role);
  begin execute p_sql into v; exception when others then v := jsonb_build_object('error', sqlerrm); end;
  reset role; perform set_config('request.jwt.claim.sub', '', true);
  return v;
end $$;
-- W1 conversation memory (M-1, R1, R2, R7): nothing is written, and the function SAYS so (NULL = not saved)
select pg_temp.ok('W1a remember for an account holder returns NULL', public.fn_raziel_remember(:'UA', '972500000001@c.us', 'NEW-DM-A') is null);
select pg_temp.ok('W1b remember for a sender without an account returns NULL', public.fn_raziel_remember('wa:972500000009', '972500000009@c.us', 'NEW-DM-UNLINKED') is null);
select pg_temp.ok('W1c remember from the site returns NULL', public.fn_raziel_remember(:'UA', 'site', 'NEW-SITE-A') is null);
select pg_temp.ok('W1d a "research" type does not get personal text through the conversation writer',
  public.fn_raziel_remember(:'UA', '972500000001@c.us', 'PERSONAL-AS-RESEARCH', 'research_note') is null);
-- W2 profile facts (M-8, M-9, R4, R5): no insert, no update of an existing fact
select pg_temp.ok('W2a a new profile fact of a linked person returns NULL', public.fn_raziel_fact(:'UA', '972500000001@c.us', 'city', 'NEW-FACT-A') is null);
select pg_temp.ok('W2b a new profile fact of a sender without an account returns NULL', public.fn_raziel_fact('wa:972500000009', '972500000009@c.us', 'birthday_hebrew', 'NEW-FACT-UNLINKED') is null);
select pg_temp.ok('W2c an existing profile fact is not updated', public.fn_raziel_fact(:'UA', '972500000001@c.us', 'birthday_hebrew', 'CHANGED-FACT-A') is null
  and exists (select 1 from public.agent_user_memory where content = 'OLD-FACT-A'));
-- W3 summary: it returns void, so it raises
select pg_temp.refused('W3 the summary writer raises', $q$select public.fn_raziel_upsert_summary('11111111-1111-4111-8111-111111111111', 'site', 'personal', 'NEW-SUMMARY')$q$,
  'personal memory is paused (CL-13): fn_raziel_upsert_summary writes nothing');
-- W4a the questions of the two research bots are personal memory (M-13)
select pg_temp.ok('W4a-1 a bot conversation row returns NULL', public.fn_mem_add('972511111111@c.us', 'hatishbi', 'conversation', 'NEW-BOT-QUESTION') is null);
select pg_temp.ok('W4a-2 a preference row returns NULL', public.fn_mem_add('972522222222@c.us', 'uriel', 'preference', 'NEW-PREFERENCE') is null);
select pg_temp.ok('W4a-3 an unknown type is no longer stored as research_note', public.fn_mem_add('972511111111@c.us', 'hatishbi', 'a personal note typed as something else', 'PERSONAL-TEXT') is null);
select pg_temp.ok('W4a-4 a research type for an agent that is not a research bot is personal memory', public.fn_mem_add(:'UA', 'raziel', 'research_note', 'PERSONAL-AS-RESEARCH-2') is null);
-- W4b the research output of the two research bots CONTINUES, in the same store (M-2, M-13)
do $$ declare a uuid; b uuid; begin
  a := public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'NEW-BOT-FINDING-1', 'finding');
  b := public.fn_mem_add('972522222222@c.us', 'uriel', 'method_discovery', 'NEW-BOT-FINDING-2', 'rule');
  perform pg_temp.ok('W4b research output is still written', a is not null and b is not null
    and (select count(*) from public.agent_user_memory where id in (a, b) and memory_type in ('research_note','method_discovery')) = 2);
end $$;
-- W5 every other writer: a direct write with the service key (the site thread, or anything else) is REFUSED with an error.
-- as_user runs one statement as another role and returns its result, or {"error": <message>} when it raised.
create temp table w5 as
  select 'a' as k, public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, memory_scope, source, content) values ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'conversation', 'personal', 'site', 'NEW-SITE-DIRECT') returning '{}'::jsonb$q$) as j union all
  select 'b', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, content) values ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'research_note', 'PERSONAL-AS-RESEARCH-3') returning '{}'::jsonb$q$) union all
  select 'c', public.as_user('service_role', null, $q$update public.agent_user_memory set content = 'REWRITTEN' where content = 'OLD-DM-A' returning '{}'::jsonb$q$) union all
  select 'd', public.as_user('service_role', null, $q$update public.agent_user_memory set agent = 'hatishbi', memory_type = 'research_note' where content = 'OLD-DM-UNLINKED' returning '{}'::jsonb$q$) union all
  select 'e', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, content) values ('wa:972500000009', 'wa', 'raziel', 'NO-TYPE') returning '{}'::jsonb$q$) union all
  select 'f1', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, content) values ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'NEW-BOT-FINDING-DIRECT') returning '{"saved":true}'::jsonb$q$) union all
  select 'f2', public.as_user('service_role', null, $q$update public.agent_user_memory set content = 'NEW-BOT-FINDING-DIRECT (edited)' where content = 'NEW-BOT-FINDING-DIRECT' returning '{"saved":true}'::jsonb$q$) union all
  select 'f3', public.as_user('service_role', null, $q$insert into public.wa_bot_log(action, text_in) values ('raziel_dm', 'an operational log row') returning '{"saved":true}'::jsonb$q$);
select pg_temp.ok('W5a a direct insert of a site thread row is refused', (select j ->> 'error' from w5 where k = 'a') = 'personal memory is paused (CL-13): INSERT of a conversation row for agent raziel is refused; nothing was saved', (select j::text from w5 where k = 'a'));
select pg_temp.ok('W5b a direct insert of a research type for the assistant is refused', (select j ->> 'error' from w5 where k = 'b') like 'personal memory is paused (CL-13): INSERT of a research_note row for agent raziel is refused%');
select pg_temp.ok('W5c an update of an existing personal row is refused', (select j ->> 'error' from w5 where k = 'c') like 'personal memory is paused (CL-13): UPDATE of a conversation row%');
select pg_temp.ok('W5d an update cannot turn a personal row into research output', (select j ->> 'error' from w5 where k = 'd') like 'personal memory is paused (CL-13): UPDATE of a research_note row for agent hatishbi%');
select pg_temp.ok('W5e a row without a memory type is personal memory', (select j ->> 'error' from w5 where k = 'e') like '%INSERT of a (null) row for agent raziel is refused%');
select pg_temp.ok('W5f research output may be written and edited directly, and a store that is not paused is written (M-2)',
  (select bool_and(j = '{"saved":true}'::jsonb) from w5 where k in ('f1', 'f2', 'f3'))
  and exists (select 1 from public.agent_user_memory where content = 'NEW-BOT-FINDING-DIRECT (edited)') and (select count(*) from public.wa_bot_log) = 1, (select string_agg(j::text, ' ') from w5 where k like 'f%'));
-- M-1 / M-3: after EVERY attempt above, no personal row was added and no existing row changed (full content, not a count)
select pg_temp.ok('M1 no new personal memory row', (select count(*) from public.agent_user_memory m where m.id not in (select id from original_ids)
   and not public.fn_personal_memory_is_research_output_v1(m.agent, m.memory_type)) = 0);
select pg_temp.ok('M1 the only new rows are research output', (select count(*) from public.agent_user_memory m where m.id not in (select id from original_ids)) = 3);
select pg_temp.ok('M3 the full content of every existing row is unchanged', pg_temp.stamp() = (select s from stamp0), pg_temp.stamp());
select pg_temp.ok('M9 no profile detail of a sender without an account in any store', not exists (select 1 from public.agent_user_memory where content like 'NEW-FACT%')
  and not exists (select 1 from public.wa_bot_log where text_in like '%NEW-FACT%'));

-- READER (M-4, M-7, R10): no old memory in the context that is built, with the same shape as before
create temp table ctx as
  select 'A-site' as k, public.fn_raziel_context(:'UA', 'site') as c union all
  select 'A-dm', public.fn_raziel_context(:'UA', '972500000001@c.us') union all
  select 'unlinked-dm', public.fn_raziel_context('wa:972500000009', '972500000009@c.us') union all
  select 'group', public.fn_raziel_context(:'UA', '120363000000000001@g.us') union all
  select 'nobody', public.fn_raziel_context(null, 'site');
select pg_temp.ok('R1 no memory text of any kind in a built context',
  not exists (select 1 from ctx where c::text ~ 'OLD-|PRE-LINK|BARE-PHONE|BOT-|NEW-|UNVERIFIED'), (select string_agg(k, ',') from ctx where c::text ~ 'OLD-|PRE-LINK|BARE-PHONE|BOT-|NEW-|UNVERIFIED'));
select pg_temp.ok('R2 the personal context is empty and the caller is told so',
  (select bool_and(c -> 'user_context' = '{"approved_preferences":[],"research_threads":[],"summary":null,"profile":[],"recent_conversation":[]}'::jsonb
     and (c #>> '{privacy,personal_memory_allowed}') = 'false' and (c #>> '{privacy,personal_memory_write_allowed}') = 'false'
     and (c #>> '{privacy,policy}') = 'cl13_pause_v1' and (c #>> '{privacy,reason}') is not null) from ctx));
select pg_temp.ok('R3 the shape of the object is the one the four callers already read',
  (select bool_and((select array_agg(x order by x) from jsonb_object_keys(c) x) = array['channel_context','privacy','user_context']
     and (select array_agg(x order by x) from jsonb_object_keys(c -> 'user_context') x) = array['approved_preferences','profile','recent_conversation','research_threads','summary']) from ctx));
select pg_temp.ok('R4 in a group the reason is the group, and the group topics (not personal memory) are still returned',
  (select c #>> '{privacy,reason}' = 'group' and (c #> '{channel_context,recent_group_topics}') = '["GROUP-TOPIC"]'::jsonb from ctx where k = 'group'));
select pg_temp.ok('R5 without a person the reason says so', (select c #>> '{privacy,reason}' = 'no_person' from ctx where k = 'nobody'));

-- CONSENT (M-4, M-6, M-15 second half) - a SIMULATION of a later policy version. No consent store exists in this proposal; the
-- policy function is replaced here, inside the test only, by one that allows a single person, to prove that the gate is the ONE
-- place that decides and that an allowed read returns that person's own rows and nothing else.
create table sim_saved as select pg_get_functiondef('public.fn_personal_memory_policy_v1(text)'::regprocedure) as def;
create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object('policy', 'SIMULATED_CONSENT', 'write_personal', p_user_ref = '11111111-1111-4111-8111-111111111111',
    'read_personal', p_user_ref = '11111111-1111-4111-8111-111111111111', 'research_output_write', true, 'research_output_as_personal_context', false, 'reason', 'no consent') $$;
select pg_temp.ok('S1 with consent the person''s own rows are read', (public.fn_raziel_context(:'UA', 'site') #>> '{user_context,summary}') like '%OLD-SITE-THREAD-A1%'
  and (public.fn_raziel_context(:'UA', 'site') #>> '{privacy,personal_memory_allowed}') = 'true');
select pg_temp.ok('S2 no implied merge: memory recorded under the phone before the link is NOT read for the account (M-6)',
  public.fn_raziel_context(:'UA', 'site')::text not like '%PRE-LINK-MEMORY-OF-A%' and public.fn_raziel_context(:'UA', 'site')::text not like '%BARE-PHONE-MEMORY-OF-A%');
select pg_temp.ok('S3 the consent of one person opens nobody else', public.fn_raziel_context(:'UB', 'site')::text not like '%OLD-SITE-THREAD-B%'
  and public.fn_raziel_context('wa:972500000009', '972500000009@c.us')::text not like '%OLD-%');
select pg_temp.ok('S4 even with consent nothing personal is returned in a group (M-7)',
  (public.fn_raziel_context(:'UA', '120363000000000001@g.us') -> 'user_context') = '{"approved_preferences":[],"research_threads":[],"summary":null,"profile":[],"recent_conversation":[]}'::jsonb);
select pg_temp.ok('S5 research output is not personal context without its own decision', (public.fn_raziel_context(:'UA', 'site') #> '{user_context,research_threads}') = '[]'::jsonb);
do $$ declare v uuid; begin
  v := public.fn_raziel_remember('11111111-1111-4111-8111-111111111111', 'site', 'SAVED-WITH-CONSENT');
  perform pg_temp.ok('S6 with the pause lifted for a person a row is saved and the status says so', v is not null and exists (select 1 from public.agent_user_memory where id = v));
  perform pg_temp.ok('S7 and still not for anybody else', public.fn_raziel_remember('22222222-2222-4222-8222-222222222222', 'site', 'NOT-SAVED') is null);
  delete from public.agent_user_memory where id = v;
end $$;
-- D-CL13-3: a consent to memory does NOT open profile facts. The simulated policy above grants memory only.
create temp table s9 as
  select 'fact' as k, to_jsonb(public.fn_raziel_fact('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'city', 'FACT-WITH-MEMORY-CONSENT-ONLY')) as j union all
  select 'mem_add', to_jsonb(public.fn_mem_add('11111111-1111-4111-8111-111111111111', 'raziel', 'personal_context', 'FACT-THROUGH-MEM-ADD', 'city')) union all
  select 'direct', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, memory_scope, source, topic, content) values ('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'city', 'FACT-DIRECT') returning '{}'::jsonb$q$) union all
  select 'retype', public.as_user('service_role', null, $q$update public.agent_user_memory set memory_type = 'personal_context', source = 'profile', topic = 'city' where content = 'OLD-DM-A' returning '{}'::jsonb$q$);
select pg_temp.ok('S9 with a consent to memory only, no writer saves a profile fact',
  (select j is null from s9 where k = 'fact') and (select j is null from s9 where k = 'mem_add')
  and (select j ->> 'error' from s9 where k = 'direct') = 'a profile fact requires a linked account and an explicit approval (CL-13): INSERT of a personal_context row for agent raziel is refused; nothing was saved'
  and (select j ->> 'error' from s9 where k = 'retype') like 'a profile fact requires a linked account and an explicit approval (CL-13): UPDATE of a personal_context row%'
  and not exists (select 1 from public.agent_user_memory where content like 'FACT-%'), (select string_agg(k || '=' || coalesce(j::text, 'NULL'), ' ') from s9));
create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object('policy', 'SIMULATED_CONSENT_AND_FACT_APPROVAL', 'write_personal', p_user_ref = '11111111-1111-4111-8111-111111111111',
    'write_profile_facts', p_user_ref = '11111111-1111-4111-8111-111111111111',
    'read_personal', p_user_ref = '11111111-1111-4111-8111-111111111111', 'research_output_write', true, 'research_output_as_personal_context', false, 'reason', 'no consent') $$;
do $$ declare v uuid; begin
  v := public.fn_raziel_fact('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'city', 'FACT-APPROVED');
  perform pg_temp.ok('S10 with the explicit grant for profile facts the fact is saved, for that person only', v is not null
    and exists (select 1 from public.agent_user_memory where id = v and memory_type = 'personal_context' and content = 'FACT-APPROVED')
    and public.fn_raziel_fact('wa:972500000009', '972500000009@c.us', 'city', 'FACT-OF-A-SENDER-WITHOUT-AN-ACCOUNT') is null);
  delete from public.agent_user_memory where id = v;
end $$;
do $$ begin execute (select def from sim_saved); end $$;
select pg_temp.ok('S8 the reviewed policy is back', pg_temp.state() = (select s from applied_state));

-- CONTROL (M-5): export and erasure of memory without deleting the account; for an account holder and for a sender without one
create temp table ex as
  select 'A' as k, public.as_user('authenticated', :'UA', 'select public.export_my_personal_memory()') as j union all
  select 'B', public.as_user('authenticated', :'UB', 'select public.export_my_personal_memory()') union all
  select 'nobody', public.as_user('authenticated', null, 'select public.export_my_personal_memory()') union all
  select 'anon', public.as_user('anon', null, 'select public.export_my_personal_memory()') union all
  select 'client-on-server-fn', public.as_user('authenticated', :'UA', $q$select public.fn_personal_memory_export('972500000009')$q$) union all
  select 'client-on-policy', public.as_user('authenticated', :'UA', $q$select public.fn_personal_memory_policy_v1('x')$q$) union all
  select 'client-direct-insert', public.as_user('authenticated', :'UA', $q$insert into public.agent_user_memory(user_ref, channel, agent, content) values ('11111111-1111-4111-8111-111111111111','site','raziel','x') returning '{}'::jsonb$q$) union all
  select 'sender', public.as_user('service_role', null, $q$select public.fn_personal_memory_export('972500000009@c.us')$q$) union all
  select 'no-sender', public.as_user('service_role', null, $q$select public.fn_personal_memory_export('')$q$);
select pg_temp.ok('E1 the account holder exports the account rows AND the rows recorded under the phone they verified',
  (select j::text like '%OLD-SITE-THREAD-A1%' and j::text like '%OLD-FACT-A%' and j::text like '%PRE-LINK-MEMORY-OF-A%' and j::text like '%BARE-PHONE-MEMORY-OF-A%' and j::text like '%OLD-FROM-GROUP-A%'
      and jsonb_array_length(j -> 'rows') = 7 and j::text not like '%OLD-SITE-THREAD-B%' and j::text not like '%UNLINKED%' from ex where k = 'A'), (select j::text from ex where k = 'A'));
select pg_temp.ok('E2 a phone that was not verified is not part of the holder''s export', (select jsonb_array_length(j -> 'rows') = 1 and j::text not like '%UNVERIFIED-PHONE-OF-B%' from ex where k = 'B'));
select pg_temp.ok('E3 nobody signed in gets nothing', (select j = '{"ok":false,"error":"not_authenticated"}'::jsonb from ex where k = 'nobody'));
select pg_temp.ok('E4 a guest may not call it', (select j ->> 'error' like 'permission denied%' from ex where k = 'anon'));
select pg_temp.ok('E5 a client may not call the server-only functions or write the table', (select bool_and(j ->> 'error' like 'permission denied%') from ex where k in ('client-on-server-fn', 'client-on-policy', 'client-direct-insert')));
select pg_temp.ok('E6 a sender without an account gets exactly the rows recorded under that phone', (select jsonb_array_length(j -> 'rows') = 2 and j::text like '%OLD-DM-UNLINKED%' and j::text like '%OLD-FACT-UNLINKED%' from ex where k = 'sender'));
select pg_temp.ok('E7 an empty sender is refused (it must never mean "everybody")', (select j = '{"ok":false,"error":"no_sender"}'::jsonb from ex where k = 'no-sender'));
select pg_temp.ok('E8 an export changes nothing', pg_temp.stamp() = (select s from stamp0));
create temp table er as
  select 'no-sender' as k, public.as_user('service_role', null, $q$select public.fn_personal_memory_erase('')$q$) as j union all
  select 'garbage-sender', public.as_user('service_role', null, $q$select public.fn_personal_memory_erase('abc')$q$) union all
  select 'nobody', public.as_user('authenticated', null, 'select public.erase_my_personal_memory()');
select pg_temp.ok('X1 an erasure without a person erases nothing', (select bool_and(j ->> 'ok' = 'false') from er) and pg_temp.stamp() = (select s from stamp0));
create temp table er2 as
  select 'sender' as k, public.as_user('service_role', null, $q$select public.fn_personal_memory_erase('972500000009')$q$) as j union all
  select 'A', public.as_user('authenticated', :'UA', 'select public.erase_my_personal_memory()') union all
  select 'bot-person-default', public.as_user('service_role', null, $q$select public.fn_personal_memory_erase('972511111111')$q$);
select pg_temp.ok('X2 the sender without an account erased their two rows', (select j = '{"ok":true,"deleted_personal_memory":2,"deleted_research_output":0,"kept_research_output":0,"account_deleted":false}'::jsonb from er2 where k = 'sender'));
select pg_temp.ok('X3 the account holder erased their memory and the account is untouched',
  (select (j ->> 'deleted_personal_memory')::int = 7 and (j ->> 'account_deleted') = 'false' from er2 where k = 'A')
  and not exists (select 1 from public.agent_user_memory where user_ref in ('11111111-1111-4111-8111-111111111111', 'wa:972500000001', '972500000001', '972500000001@c.us'))
  and exists (select 1 from public.wa_account_links where user_id = '11111111-1111-4111-8111-111111111111'));
select pg_temp.ok('X4 an erasure touches nobody else', exists (select 1 from public.agent_user_memory where content = 'OLD-SITE-THREAD-B') and exists (select 1 from public.agent_user_memory where content = 'UNVERIFIED-PHONE-OF-B'));
select pg_temp.ok('X5 research output is kept unless the person asks for it too', (select (j ->> 'deleted_personal_memory')::int = 1 and (j ->> 'kept_research_output')::int = 3 from er2 where k = 'bot-person-default')
  and exists (select 1 from public.agent_user_memory where content = 'BOT-FINDING-1'));
-- (the call and the check are separate statements: a statement does not see the rows its own function call deleted)
create temp table er3 as select public.as_user('service_role', null, $q$select public.fn_personal_memory_erase('972511111111', true)$q$) as j;
select pg_temp.ok('X6 with the explicit option the research output is erased too',
  (select (j ->> 'deleted_research_output')::int = 3 from er3) and not exists (select 1 from public.agent_user_memory where user_ref = '972511111111@c.us'), (select j::text from er3));
drop function public.as_user(text, text, text);

-- L5..L8 the lifecycle after apply: a missing or disabled trigger, a changed body, the rollback, and a second apply
select pg_temp.ok('L5 the state is still the applied one', pg_temp.state() = (select s from applied_state));
alter table public.agent_user_memory disable trigger trg_personal_memory_pause_v1;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L5-apply-trigger-disabled REFUSE [enabled=D]
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\warn @@CASE L5-rollback-trigger-disabled REFUSE [enabled=D]
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L5 disabled');
alter table public.agent_user_memory enable trigger trg_personal_memory_pause_v1;
drop trigger trg_personal_memory_pause_v1 on public.agent_user_memory;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L6-apply-trigger-missing REFUSE trigger=(missing)
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\warn @@CASE L6-rollback-trigger-missing REFUSE trigger=(missing)
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L6 missing');
CREATE TRIGGER trg_personal_memory_pause_v1 BEFORE INSERT OR UPDATE ON public.agent_user_memory FOR EACH ROW EXECUTE FUNCTION fn_personal_memory_write_guard_v1();
select pg_temp.ok('L6 restored to the applied state', pg_temp.state() = (select s from applied_state));
\set ON_ERROR_STOP off
\warn @@CASE L7-rollback-exact-applied-state OK
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.ok('L7 the rollback restores the exact live state', pg_temp.state() = (select s from live_state), pg_temp.state());
select pg_temp.ok('L7 the live behaviour is back: memory is written again', public.fn_raziel_remember(:'UB', 'site', 'WRITTEN-AFTER-ROLLBACK') is not null);
delete from public.agent_user_memory where content = 'WRITTEN-AFTER-ROLLBACK';
\set ON_ERROR_STOP off
\warn @@CASE L7-rollback-again-noop OK
\i supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\warn @@CASE L8-apply-after-rollback OK
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.ok('L8 re-apply after the rollback', pg_temp.state() = (select s from applied_state));
\pset tuples_only on
\pset format unaligned
select 'cl13_personal_memory_pause_v1: ' || count(*) || ' behaviour checks passed' from checks;
select 'cl13_personal_memory_pause_v1: PASS';
