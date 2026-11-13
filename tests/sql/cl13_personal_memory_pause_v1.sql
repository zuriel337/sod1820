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
     and (p.proname like 'fn\_raziel\_%' escape '\' or p.proname like '%personal\_memory%' escape '\' or p.proname like 'fn\_research\_%' escape '\' or p.proname = 'fn_mem_add') $$;
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
-- the canonical text (live: public.tanach_verses, 23,204 verses; points removed, plain spelling as in live)
create table public.tanach_verses (book_idx smallint, book text, chapter smallint, verse smallint, text text, words text[]);
grant select on public.tanach_verses to service_role;
insert into public.tanach_verses(book_idx, book, chapter, verse, text) values
 (0, 'בראשית', 1, 1, 'בראשית ברא אלהים את השמים ואת הארץ'),
 (2, 'ויקרא', 19, 2, 'דבר אל כל עדת בני ישראל ואמרת אלהם קדשים תהיו כי קדוש אני יהוה אלהיכם'),
 (4, 'דברים', 6, 4, 'שמע ישראל יהוה אלהינו יהוה אחד');
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
 (:'UA', 'site', 'raziel', 'research_note', 'personal', 'site', null, 'OLD-RESEARCH-TYPED-ROW-OF-A', '{}'),
 ('wa:972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'PRE-LINK-MEMORY-OF-A', '{}'),
 ('972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'BARE-PHONE-MEMORY-OF-A', '{}'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-DM-UNLINKED', '{}'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'name', 'OLD-FACT-UNLINKED', '{"kind":"name"}'),
 (:'UA', '120363000000000001@g.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-FROM-GROUP-A', '{}'),
 ('channel:120363000000000001@g.us', '120363000000000001@g.us', 'raziel', 'conversation', 'channel', 'wa', 'GROUP-TOPIC', 'group topic row', '{}'),
 (:'UB', 'site', 'raziel', 'conversation', 'personal', 'site', 'b', 'OLD-SITE-THREAD-B', '{"reply":"OLD-REPLY-B"}'),
 ('wa:972500000002', '972500000002@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'UNVERIFIED-PHONE-OF-B', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'conversation', 'personal', 'wa', null, 'BOT-QUESTION-1', '{}'),
 -- research rows: a curated import source (attested), the same source carrying a personal detail, and two rows extracted from a chat
 -- (source 'wa'): a depression statement and a clean-looking sentence. Nothing attests the last two.
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'yiska_method_notes', 'finding', 'BOT-FINDING-1', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'yiska_method_notes', 'family note', 'BOT-FINDING-PERSONAL: בעלה חולה, טלפון 050-1234567', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'a statement', 'BOT-FINDING-DEPRESSION: אני מתמודד עם דיכאון כבר שנה', '{}'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'a sentence', 'BOT-FINDING-UNATTESTED-CLEAN: המסע הזה קשה לי מאוד כבר שנה', '{}'),
 ('972533333333@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'to approve', 'BOT-FINDING-TO-APPROVE: clean sentence from a chat', '{}'),
 ('972533333333@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'to approve 2', 'BOT-FINDING-DEPRESSION-TO-APPROVE: אני מתמודד עם דיכאון', '{}'),
 ('972522222222@c.us', 'wa', 'uriel', 'conversation', 'personal', 'wa', null, 'BOT-QUESTION-2', '{}'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'christina_letter_combinations', 'rule', 'BOT-FINDING-2', '{}');
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

-- L2b the canonical text is missing: the proposal stops (a quotation could not be attested) and changes nothing
alter table public.tanach_verses rename to tanach_verses_away;
select pg_temp.mark();
\set ON_ERROR_STOP off
\warn @@CASE L2b-apply-no-canonical-text REFUSE CL13 precondition: public.tanach_verses (the canonical text that attests a quotation) not found; stop, nothing changed
\i supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
\warn @@END
\set ON_ERROR_STOP on
select pg_temp.unchanged('L2b no canonical text');
alter table public.tanach_verses_away rename to tanach_verses;

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
  -- a verse analysis (the subject is a quotation from the canonical text) and a row from a curated import source
  a := public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק בראשית ברא אלוהים', 'בראשית ברא אלוהים');
  b := public.fn_mem_add('972522222222@c.us', 'uriel', 'method_discovery', 'NEW-BOT-FINDING-2', 'rule', 'private', 'private', 'christina_letter_combinations');
  perform pg_temp.ok('W4b attested research output is still written', a is not null and b is not null
    and (select count(*) from public.agent_user_memory where id in (a, b) and memory_type in ('research_note','method_discovery')) = 2
    and (select data ->> 'research_attestation' from public.agent_user_memory where id = a) = 'verse');
end $$;
-- W5 every other writer: a direct write with the service key (the site thread, or anything else) is REFUSED with an error.
-- as_user runs one statement as another role and returns its result, or {"error": <message>} when it raised.
create temp table w5 as
  select 'a' as k, public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, memory_scope, source, content) values ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'conversation', 'personal', 'site', 'NEW-SITE-DIRECT') returning '{}'::jsonb$q$) as j union all
  select 'b', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, content) values ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'research_note', 'PERSONAL-AS-RESEARCH-3') returning '{}'::jsonb$q$) union all
  select 'c', public.as_user('service_role', null, $q$update public.agent_user_memory set content = 'REWRITTEN' where content = 'OLD-DM-A' returning '{}'::jsonb$q$) union all
  select 'd', public.as_user('service_role', null, $q$update public.agent_user_memory set agent = 'hatishbi', memory_type = 'research_note' where content = 'OLD-DM-UNLINKED' returning '{}'::jsonb$q$) union all
  select 'e', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, content) values ('wa:972500000009', 'wa', 'raziel', 'NO-TYPE') returning '{}'::jsonb$q$) union all
  select 'f1', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content) values ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'ברא אלהים את השמים', 'NEW-BOT-FINDING-DIRECT') returning '{"saved":true}'::jsonb$q$) union all
  select 'f2', public.as_user('service_role', null, $q$update public.agent_user_memory set content = 'NEW-BOT-FINDING-DIRECT (edited)' where content = 'NEW-BOT-FINDING-DIRECT' returning '{"saved":true}'::jsonb$q$) union all
  select 'f3', public.as_user('service_role', null, $q$insert into public.wa_bot_log(action, text_in) values ('raziel_dm', 'an operational log row') returning '{"saved":true}'::jsonb$q$);
select pg_temp.ok('W5a a direct insert of a site thread row is refused', (select j ->> 'error' from w5 where k = 'a') = 'personal memory is paused (CL-13): INSERT of a conversation row for agent raziel is refused; nothing was saved', (select j::text from w5 where k = 'a'));
select pg_temp.ok('W5b a direct insert of a research type for the assistant is refused', (select j ->> 'error' from w5 where k = 'b') like 'personal memory is paused (CL-13): INSERT of a research_note row for agent raziel is refused%');
select pg_temp.ok('W5c an update of an existing personal row is refused', (select j ->> 'error' from w5 where k = 'c') like 'personal memory is paused (CL-13): UPDATE of a conversation row%');
select pg_temp.ok('W5d an update cannot turn a personal row into research output', (select j ->> 'error' from w5 where k = 'd') = 'a research-typed row without an attestation is personal memory, and personal memory is paused (CL-13): UPDATE of a research_note row for agent hatishbi is refused; nothing was saved');
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

-- RESEARCH (decision of ZURIEL after the Codex review of abb2f3907): authorised research may be USED during the pause; personal
-- information inside research stays subject to consent; the label "research" opens nothing personal.
create temp table rq as
  select 'bot' as k, public.fn_research_output_context_v1('972511111111@c.us', 'hatishbi') as c union all
  select 'other-person', public.fn_research_output_context_v1('972522222222@c.us', 'hatishbi') union all
  select 'assistant-rows', public.fn_research_output_context_v1(:'UA', 'raziel') union all
  select 'nobody', public.fn_research_output_context_v1('', 'hatishbi');
select pg_temp.ok('Q1 allowed research is available during the pause: the bot reads its findings, old and new',
  (select c ->> 'allowed' = 'true' and c::text like '%BOT-FINDING-1%' and c::text like '%ניתוח הפסוק בראשית ברא אלוהים%' and c::text like '%NEW-BOT-FINDING-DIRECT (edited)%'
     and (c ->> 'policy') = 'cl13_pause_v1' from rq where k = 'bot'), (select c::text from rq where k = 'bot'));
select pg_temp.ok('Q2 a research-typed row that is not attested, or that carries a personal detail, is withheld without consent, and counted',
  (select c::text not like '%BOT-FINDING-PERSONAL%' and c::text not like '%050-1234567%' and c::text not like '%דיכאון%' and c::text not like '%BOT-FINDING-UNATTESTED-CLEAN%'
     and (c ->> 'withheld_personal')::int = 3 from rq where k = 'bot'), (select c::text from rq where k = 'bot'));
select pg_temp.ok('Q3 the questions (personal memory) are never research context', (select c::text not like '%BOT-QUESTION%' from rq where k = 'bot'));
select pg_temp.ok('Q4 one person and one bot only: another person, and rows of the assistant typed as research, return nothing',
  (select c -> 'rows' = '[]'::jsonb from rq where k = 'other-person') and (select c -> 'rows' = '[]'::jsonb and c::text not like '%OLD-RESEARCH-TYPED%' from rq where k = 'assistant-rows')
  and (select c ->> 'allowed' = 'false' from rq where k = 'nobody'));
-- the detector: every kind it knows, and research-like texts that must NOT be taken for a personal detail
create temp table det(t text, want text);
insert into det values
 ('כתבה אליי mail: someone@example.org', 'email'), ('הטלפון 050-123-4567', 'phone'), ('+972 52 1234567', 'phone'), ('מספר 123456789', 'long_number'),
 ('ת.ז. שלה', 'identity_number'), ('תעודת זהות', 'identity_number'), ('שמי רחל', 'name'), ('קוראים לי דוד', 'name'),
 ('אני גרה בחיפה', 'address'), ('כתובתה ברחוב הרצל', 'address'), ('מיקוד 1234567', 'postal'), ('נולדתי בכסלו', 'birth'), ('תאריך הלידה שלה', 'birth'),
 ('בעלה אמר', 'family'), ('האבא שלה', null), ('אבא שלה היה שם', 'family'), ('היא חולה', 'health'), ('עברה ניתוח', 'health'),
 ('ניתוח הפסוק בראשית ברא אלוהים', null), ('קדוש אני יהוה אלהיכם', null), ('אני מתמודד עם דיכאון כבר שנה', 'first_person'), ('דיכאון', 'health'), ('הוא עבר ניתוח בברך', 'health'),
 ('אור = 207, רז = 207', null), ('משיח 358 נחש 358', null), ('התגלות בשנת 1820', null), ('בראשית א א: בראשית ברא', null), ('אתגר בלימוד האותיות', null),
 ('הערך 123456 במילוי', null), ('אות א = אלף, פירוק: א-ל-ף', null), ('{"subtype":"letter_rule"}', null), ('', null), (null, null);
select pg_temp.ok('Q5 the detector names every kind it knows and leaves research text alone',
  not exists (select 1 from det where public.fn_personal_memory_personal_detail_v1(t) is distinct from want),
  (select string_agg(coalesce(t, '(null)') || ' -> ' || coalesce(public.fn_personal_memory_personal_detail_v1(t), 'NULL') || ' (want ' || coalesce(want, 'NULL') || ')', ' ; ') from det where public.fn_personal_memory_personal_detail_v1(t) is distinct from want));
-- the label "research" does not carry a personal detail in: not through the writer function, not directly, not by an edit
select pg_temp.ok('Q6 the writer function saves no research row that carries a personal detail (NULL = not saved), in any field',
  public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'RESEARCH-WITH-PHONE 050-7654321', 'בראשית ברא אלוהים') is null
  and public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'clean text', 'RESEARCH-TOPIC someone@example.org') is null
  and public.fn_mem_add('972522222222@c.us', 'uriel', 'method_discovery', 'clean text', 'word', 'private', 'private', 'christina_letter_combinations', null, 'wa', '{"interpretation":"RESEARCH-DATA: היא חולה"}'::jsonb) is null
  and public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'RESEARCH: נולדתי בכסלו', 'בראשית ברא אלוהים') is null
  and public.fn_mem_add('972511111111@c.us', 'hatishbi', 'research_note', 'אני מתמודד עם דיכאון כבר שנה', 'בראשית ברא אלוהים') is null);
create temp table rw as
  select 'insert' as k, public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, content) values ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'RESEARCH-DIRECT 050-7654321') returning '{}'::jsonb$q$) as j union all
  select 'edit', public.as_user('service_role', null, $q$update public.agent_user_memory set content = content || ' someone@example.org' where content = 'BOT-FINDING-1' returning '{}'::jsonb$q$) union all
  select 'clean-edit', public.as_user('service_role', null, $q$update public.agent_user_memory set topic = 'finding (re-titled)' where content = 'NEW-BOT-FINDING-2' returning '{"saved":true}'::jsonb$q$);
select pg_temp.ok('Q7 a direct write of a research row with a personal detail is refused with its reason, and an edit cannot add one',
  (select j ->> 'error' from rw where k = 'insert') = 'a research row that carries a personal detail (phone) is personal memory, and personal memory is paused (CL-13): INSERT of a research_note row for agent hatishbi is refused; nothing was saved'
  and (select j ->> 'error' from rw where k = 'edit') like 'a research row that carries a personal detail (email) is personal memory%UPDATE of a research_note row for agent hatishbi%'
  and (select j from rw where k = 'clean-edit') = '{"saved":true}'::jsonb
  and not exists (select 1 from public.agent_user_memory where content like 'RESEARCH-%' or content like '%someone@example.org%'), (select string_agg(k || '=' || j::text, ' ') from rw));
select pg_temp.ok('Q8 a client may not call the research reader', (public.as_user('authenticated', '11111111-1111-4111-8111-111111111111', $q$select public.fn_research_output_context_v1('972511111111@c.us', 'hatishbi')$q$) ->> 'error') like 'permission denied%');
select pg_temp.ok('Q9 nothing personal was added by the research section, and the old rows are unchanged', (select count(*) from public.agent_user_memory m where m.id not in (select id from original_ids)) = 3
  and pg_temp.stamp() = (select s from stamp0));


-- ELIGIBILITY (round 8, Codex): research is attested POSITIVELY - by a trusted source or an approval - and never by the absence of a
-- match to the personal-detail filter. The two cases that Codex named, and their allowed counterparts:
create temp table el as
  select 'verse-analysis' as k, public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק בראשית ברא אלוהים', 'ניתוח הפסוק בראשית ברא אלוהים') as id union all
  select 'verse-with-i', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק', 'קדוש אני יהוה אלהיכם') union all
  select 'depression', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'אני מתמודד עם דיכאון כבר שנה', 'אני מתמודד עם דיכאון כבר שנה') union all
  select 'depression-under-a-canonical-subject', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'אני מתמודד עם דיכאון כבר שנה', 'בראשית ברא אלוהים') union all
  select 'no-pattern-no-source', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'המסע הזה קשה לי מאוד כבר שנה', 'המסע הזה קשה לי מאוד כבר שנה') union all
  select 'short-quote', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'ניתוח', 'ברא אלהים') union all
  select 'self-approval-on-insert', public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'a clean sentence from a chat', 'a subject', 'private', 'approved', 'wa');
select pg_temp.ok('A1 CODEX CASE 1: "analysis of the verse In the beginning God created" is research: stored, and marked as attested by the canonical text',
  (select id from el where k = 'verse-analysis') is not null
  and (select data ->> 'research_attestation' from public.agent_user_memory where id = (select id from el where k = 'verse-analysis')) = 'verse');
select pg_temp.ok('A1b a verse that contains the word "I" is research (a quotation is not a personal statement)', (select id from el where k = 'verse-with-i') is not null);
select pg_temp.ok('A2 CODEX CASE 2: "I have been coping with depression for a year" is NOT saved as research (no source attests it, and it is a personal detail)',
  (select id from el where k = 'depression') is null);
select pg_temp.ok('A2b the same sentence under a canonical subject is NOT saved either: the personal detail is a veto on top of the attestation',
  (select id from el where k = 'depression-under-a-canonical-subject') is null);
select pg_temp.ok('A3 a sentence that matches NO pattern is not research either: the absence of a match proves nothing',
  (select id from el where k = 'no-pattern-no-source') is null and public.fn_personal_memory_personal_detail_v1('המסע הזה קשה לי מאוד כבר שנה') is null);
select pg_temp.ok('A3b a short quotation is no proof (it is in some verse anyway)', (select id from el where k = 'short-quote') is null);
select pg_temp.ok('A4 a row cannot approve itself by being inserted as approved', (select id from el where k = 'self-approval-on-insert') is null);
create temp table el2 as
  select 'direct-unattested' as k, public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'המסע הזה קשה לי מאוד', 'המסע הזה קשה לי מאוד כבר שנה') returning '{}'::jsonb$q$) as j union all
  select 'direct-depression', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'אני מתמודד עם דיכאון כבר שנה', 'אני מתמודד עם דיכאון כבר שנה') returning '{}'::jsonb$q$) union all
  select 'direct-approved-on-insert', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content, status) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'a subject', 'a clean sentence from a chat', 'approved') returning '{}'::jsonb$q$) union all
  select 'direct-forged-marker', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content, data) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'a subject', 'a clean sentence', '{"research_attestation":"verse"}'::jsonb) returning '{}'::jsonb$q$) union all
  select 'direct-canonical-with-forged-value', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content, data) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'שמע ישראל יהוה אלהינו', 'a clean analysis', '{"research_attestation":"anything"}'::jsonb) returning '{"saved":true}'::jsonb$q$) union all
  select 'turn-a-personal-row-into-research', public.as_user('service_role', null, $q$update public.agent_user_memory set agent = 'hatishbi', memory_type = 'research_note', topic = 'בראשית ברא אלוהים' where content = 'OLD-DM-UNLINKED' returning '{}'::jsonb$q$);
select pg_temp.ok('A5 a direct write is judged like the writer function: an unattested sentence is refused with its reason',
  (select j ->> 'error' from el2 where k = 'direct-unattested') = 'a research-typed row without an attestation is personal memory, and personal memory is paused (CL-13): INSERT of a research_note row for agent hatishbi is refused; nothing was saved');
select pg_temp.ok('A5b a direct write of the depression sentence is refused as a personal detail',
  (select j ->> 'error' from el2 where k = 'direct-depression') like 'a research row that carries a personal detail (first_person) is personal memory%');
select pg_temp.ok('A5c a direct write claiming status approved is refused (an approval is a later act on an existing row)',
  (select j ->> 'error' from el2 where k = 'direct-approved-on-insert') like 'a research-typed row without an attestation%');
select pg_temp.ok('A5d a forged attestation marker is ignored: the row is judged again, and an incoming value is replaced by the one the trigger computes',
  (select j ->> 'error' from el2 where k = 'direct-forged-marker') like 'a research-typed row without an attestation%'
  and (select j from el2 where k = 'direct-canonical-with-forged-value') = '{"saved":true}'::jsonb
  and (select data ->> 'research_attestation' from public.agent_user_memory where content = 'a clean analysis') = 'verse');
select pg_temp.ok('A5e an attested subject does not turn a personal row of another agent into research output',
  (select j ->> 'error' from el2 where k = 'turn-a-personal-row-into-research') = 'personal memory is paused (CL-13): UPDATE of a research_note row for agent hatishbi is refused; nothing was saved');
-- the approval route: a human act on an existing row. Before: the person's two chat-extracted rows are withheld. After approving
-- the clean one it is research; the one that carries a personal detail stays personal even when approved.
create temp table ap1 as select public.fn_research_output_context_v1('972533333333@c.us', 'hatishbi') as c;
create temp table ap2 as
  select 'clean' as k, public.as_user('service_role', null, $q$update public.agent_user_memory set status = 'approved' where content like 'BOT-FINDING-TO-APPROVE:%' returning '{"saved":true}'::jsonb$q$) as j union all
  select 'personal', public.as_user('service_role', null, $q$update public.agent_user_memory set status = 'approved' where content like 'BOT-FINDING-DEPRESSION-TO-APPROVE:%' returning '{"saved":true}'::jsonb$q$);
create temp table ap3 as select public.fn_research_output_context_v1('972533333333@c.us', 'hatishbi') as c;
select pg_temp.ok('A6 an approval makes a row research; the personal detail stays personal even when approved',
  (select c -> 'rows' = '[]'::jsonb and (c ->> 'withheld_personal')::int = 2 from ap1)
  and (select j = '{"saved":true}'::jsonb from ap2 where k = 'clean')
  and (select j ->> 'error' from ap2 where k = 'personal') like 'a research row that carries a personal detail (first_person) is personal memory%'
  and (select c::text like '%BOT-FINDING-TO-APPROVE%' and c::text not like '%דיכאון%' and (c ->> 'withheld_personal')::int = 1 from ap3), (select c::text from ap3));
select pg_temp.ok('A6a a client may not call the eligibility helpers (the sources, the canonical-text check, the route, the row test, the detector)',
  (select bool_and(public.as_user('authenticated', '11111111-1111-4111-8111-111111111111', q) ->> 'error' like 'permission denied%')
     from unnest(array[$q$select public.fn_personal_memory_research_sources_v1()$q$, $q$select public.fn_research_subject_in_corpus_v1('בראשית ברא אלוהים')$q$,
       $q$select public.fn_personal_memory_research_route_v1('hatishbi','research_note','private','wa','x','{}'::jsonb,false)$q$,
       $q$select public.fn_personal_memory_row_is_research_v1('hatishbi','research_note','private','wa','x','x','{}'::jsonb,false)$q$,
       $q$select public.fn_personal_memory_personal_detail_v1('x')$q$]) q));
-- the approval used above is undone (outside the trigger) so that the original rows stay byte-identical for the checks that follow
set session_replication_role = replica;
update public.agent_user_memory set status = 'private' where content like 'BOT-FINDING-TO-APPROVE:%';
reset session_replication_role;
select pg_temp.ok('A6b the seed rows are back to their original content', pg_temp.stamp() = (select s from stamp0), pg_temp.stamp());
-- research_output_write is enforced in the writer function AND in the trigger, direct writes included
create temp table sim_saved0 as select pg_get_functiondef('public.fn_personal_memory_policy_v1(text)'::regprocedure) as def;
create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object('policy', 'SIMULATED_NO_RESEARCH_WRITE', 'write_personal', p_user_ref = '972566666666@c.us', 'write_profile_facts', false, 'read_personal', false,
    'research_output_write', false, 'research_output_read', true, 'reason', 'research writes closed') $$;
create temp table rwp as
  select 'writer-attested' as k, to_jsonb(public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק שמע ישראל', 'שמע ישראל יהוה אלהינו')) as j union all
  select 'writer-curated', to_jsonb(public.fn_mem_add('972522222222@c.us', 'uriel', 'method_discovery', 'RWP-CURATED', 'rule', 'private', 'private', 'christina_letter_combinations')) union all
  select 'direct-attested', public.as_user('service_role', null, $q$insert into public.agent_user_memory(user_ref, channel, agent, memory_type, topic, content) values ('972544444444@c.us', 'wa', 'hatishbi', 'research_note', 'שמע ישראל יהוה אלהינו', 'RWP-DIRECT') returning '{}'::jsonb$q$) union all
  select 'direct-edit', public.as_user('service_role', null, $q$update public.agent_user_memory set topic = 'finding (edited under a closed grant)' where content = 'BOT-FINDING-1' returning '{}'::jsonb$q$) union all
  select 'writer-with-consent', to_jsonb(public.fn_mem_add('972566666666@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק שמע ישראל', 'שמע ישראל יהוה אלהינו'));
select pg_temp.ok('A7 without research_output_write (and without a consent) the writer function saves no research, attested or not',
  (select j is null from rwp where k = 'writer-attested') and (select j is null from rwp where k = 'writer-curated'));
select pg_temp.ok('A7b without research_output_write the trigger refuses a direct insert and an edit of research output, with its reason',
  (select j ->> 'error' from rwp where k = 'direct-attested') = 'research output is not allowed for this person by the policy (research_output_write is not granted) (CL-13): INSERT of a research_note row for agent hatishbi is refused; nothing was saved'
  and (select j ->> 'error' from rwp where k = 'direct-edit') like 'research output is not allowed for this person by the policy%UPDATE of a research_note row%');
select pg_temp.ok('A7c the consent of the person (write_personal) is the other way in: the same attested row is saved as personal memory of that person',
  (select j is not null from rwp where k = 'writer-with-consent'));
delete from public.agent_user_memory where user_ref in ('972544444444@c.us', '972566666666@c.us') or content = 'RWP-CURATED';
do $$ begin execute (select def from sim_saved0); end $$;
-- the allowed counterpart of A7, under the reviewed policy (research_output_write = true)
select pg_temp.ok('A7d under the reviewed policy the attested research is written again',
  public.fn_mem_add('972544444444@c.us', 'hatishbi', 'research_note', 'ניתוח הפסוק שמע ישראל', 'שמע ישראל יהוה אלהינו') is not null);
delete from public.agent_user_memory where user_ref = '972544444444@c.us';

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
    'read_personal', p_user_ref = '11111111-1111-4111-8111-111111111111', 'research_output_write', true, 'research_output_read', true, 'reason', 'no consent') $$;
select pg_temp.ok('S1 with consent the person''s own rows are read', (public.fn_raziel_context(:'UA', 'site') #>> '{user_context,summary}') like '%OLD-SITE-THREAD-A1%'
  and (public.fn_raziel_context(:'UA', 'site') #>> '{privacy,personal_memory_allowed}') = 'true');
select pg_temp.ok('S2 no implied merge: memory recorded under the phone before the link is NOT read for the account (M-6)',
  public.fn_raziel_context(:'UA', 'site')::text not like '%PRE-LINK-MEMORY-OF-A%' and public.fn_raziel_context(:'UA', 'site')::text not like '%BARE-PHONE-MEMORY-OF-A%');
select pg_temp.ok('S3 the consent of one person opens nobody else', public.fn_raziel_context(:'UB', 'site')::text not like '%OLD-SITE-THREAD-B%'
  and public.fn_raziel_context('wa:972500000009', '972500000009@c.us')::text not like '%OLD-%');
select pg_temp.ok('S4 even with consent nothing personal is returned in a group (M-7)',
  (public.fn_raziel_context(:'UA', '120363000000000001@g.us') -> 'user_context') = '{"approved_preferences":[],"research_threads":[],"summary":null,"profile":[],"recent_conversation":[]}'::jsonb);
select pg_temp.ok('S5 a row of the assistant typed as research is personal memory: read with the consent of that person, and never research output',
  (public.fn_raziel_context(:'UA', 'site') #> '{user_context,research_threads}') = '["OLD-RESEARCH-TYPED-ROW-OF-A"]'::jsonb
  and (public.fn_research_output_context_v1(:'UA', 'raziel') -> 'rows') = '[]'::jsonb);
select pg_temp.ok('S5b the consent of A does not release the personal detail, or the unattested rows, inside the research of another person',
  (public.fn_research_output_context_v1('972511111111@c.us', 'hatishbi') ->> 'withheld_personal')::int = 3);
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
    'read_personal', p_user_ref = '11111111-1111-4111-8111-111111111111', 'research_output_write', true, 'research_output_read', true, 'reason', 'no consent') $$;
do $$ declare v uuid; begin
  v := public.fn_raziel_fact('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'city', 'FACT-APPROVED');
  perform pg_temp.ok('S10 with the explicit grant for profile facts the fact is saved, for that person only', v is not null
    and exists (select 1 from public.agent_user_memory where id = v and memory_type = 'personal_context' and content = 'FACT-APPROVED')
    and public.fn_raziel_fact('wa:972500000009', '972500000009@c.us', 'city', 'FACT-OF-A-SENDER-WITHOUT-AN-ACCOUNT') is null);
  delete from public.agent_user_memory where id = v;
end $$;
create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object('policy', 'SIMULATED_CONSENT_OF_THE_BOT_PERSON', 'write_personal', p_user_ref = '972511111111@c.us', 'write_profile_facts', false,
    'read_personal', p_user_ref = '972511111111@c.us', 'research_output_write', true, 'research_output_read', true, 'reason', 'no consent') $$;
select pg_temp.ok('S11 with the consent of the person the research-typed rows that are personal or unattested are read too',
  (select (c ->> 'withheld_personal')::int = 0 and c::text like '%BOT-FINDING-PERSONAL%' and c::text like '%BOT-FINDING-1%' and c::text like '%דיכאון%' and c::text like '%BOT-FINDING-UNATTESTED-CLEAN%' from (select public.fn_research_output_context_v1('972511111111@c.us', 'hatishbi') as c) x));
create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object('policy', 'SIMULATED_NO_RESEARCH_GRANT', 'write_personal', false, 'write_profile_facts', false, 'read_personal', false, 'research_output_write', true, 'reason', 'no grant') $$;
select pg_temp.ok('S12 a policy that does not grant reading research closes the research reader (only an explicit grant opens it)',
  (select c ->> 'allowed' = 'false' and c -> 'rows' = '[]'::jsonb from (select public.fn_research_output_context_v1('972511111111@c.us', 'hatishbi') as c) x));
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
      and jsonb_array_length(j -> 'rows') = 8 and j::text not like '%OLD-SITE-THREAD-B%' and j::text not like '%UNLINKED%' from ex where k = 'A'), (select j::text from ex where k = 'A'));
select pg_temp.ok('E1b the export says how each row was recorded by the exact form of the reference (an account id may begin with a digit)',
  (select bool_and((r ->> 'recorded_as') = case when (r ->> 'content') in ('PRE-LINK-MEMORY-OF-A', 'BARE-PHONE-MEMORY-OF-A') then 'whatsapp' else 'account' end)
     and count(*) filter (where (r ->> 'recorded_as') = 'whatsapp') = 2 and count(*) filter (where (r ->> 'recorded_as') = 'account') = 6
     from ex, jsonb_array_elements(j -> 'rows') r where k = 'A')
  and (select bool_and((r ->> 'recorded_as') = 'whatsapp') from ex, jsonb_array_elements(j -> 'rows') r where k = 'sender'),
  (select string_agg((r ->> 'content') || '=' || (r ->> 'recorded_as'), ' ; ') from ex, jsonb_array_elements(j -> 'rows') r where k = 'A'));
select pg_temp.ok('E1c the export names a row of the assistant typed as research as personal memory, not as research output',
  (select bool_and((r ->> 'kind') = 'personal_memory') from ex, jsonb_array_elements(j -> 'rows') r where k = 'A'));
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
  (select (j ->> 'deleted_personal_memory')::int = 8 and (j ->> 'account_deleted') = 'false' from er2 where k = 'A')
  and not exists (select 1 from public.agent_user_memory where user_ref in ('11111111-1111-4111-8111-111111111111', 'wa:972500000001', '972500000001', '972500000001@c.us'))
  and exists (select 1 from public.wa_account_links where user_id = '11111111-1111-4111-8111-111111111111'));
select pg_temp.ok('X4 an erasure touches nobody else', exists (select 1 from public.agent_user_memory where content = 'OLD-SITE-THREAD-B') and exists (select 1 from public.agent_user_memory where content = 'UNVERIFIED-PHONE-OF-B'));
select pg_temp.ok('X5 attested research output is kept unless the person asks for it too; a research-typed row that is unattested or carries a personal detail is erased as personal memory',
  (select (j ->> 'deleted_personal_memory')::int = 4 and (j ->> 'kept_research_output')::int = 3 from er2 where k = 'bot-person-default')
  and exists (select 1 from public.agent_user_memory where content = 'BOT-FINDING-1')
  and not exists (select 1 from public.agent_user_memory where content like 'BOT-FINDING-PERSONAL%' or content like 'BOT-FINDING-DEPRESSION:%' or content like 'BOT-FINDING-UNATTESTED%'), (select j::text from er2 where k = 'bot-person-default'));
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
