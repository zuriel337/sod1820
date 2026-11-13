-- Throwaway-Postgres base for test/cl13-personal-memory-pg.test.mjs (never a live project): the live shape of the memory table,
-- the five live functions byte-identical to live (12.11.2026), and synthetic rows of every kind that exists in live.
-- The proposal is NOT applied here: the test runs the Edge handlers against this "before" state first (the Edge code deployed
-- before the database proposal), then applies the proposal, then simulates a consent.
-- All people, phones and texts are synthetic. The two research-bot handlers carry the phone of a real person as a constant;
-- the harness replaces it with the synthetic ones below before the handler runs.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create table public.agent_user_memory (id uuid primary key default gen_random_uuid(), user_ref text not null, channel text not null, agent text not null, topic text, content text,
  data jsonb not null default '{}'::jsonb, status text not null default 'private', source_table text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  memory_type text, source text, confidence smallint, visibility text not null default 'private', memory_scope text not null default 'personal');
alter table public.agent_user_memory enable row level security;
create policy agent_user_memory_own_read on public.agent_user_memory for select using (user_ref = (auth.uid())::text);
grant all on public.agent_user_memory to service_role;
create table public.wa_account_links (id bigserial primary key, user_id uuid, phone text, verified_at timestamptz, created_at timestamptz default now(), credited_msgs integer, welcomed_at timestamptz);

\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_remember.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_fact.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_upsert_summary.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_mem_add.sql
\i tests/sql/fixtures/cl13_memory_live_base_20261112/fn_raziel_context.sql
revoke all on function public.fn_raziel_remember(text,text,text,text,text,text,text), public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint),
  public.fn_raziel_upsert_summary(text,text,text,text), public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb), public.fn_raziel_context(text,text) from public;
grant execute on function public.fn_raziel_remember(text,text,text,text,text,text,text), public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint),
  public.fn_raziel_upsert_summary(text,text,text,text), public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb), public.fn_raziel_context(text,text) to service_role;
do $$ begin
  if md5(pg_get_functiondef('public.fn_raziel_remember(text,text,text,text,text,text,text)'::regprocedure)) <> '5598acf902200444827efe54305466e1'
     or md5(pg_get_functiondef('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)'::regprocedure)) <> 'ebd32bd78f3d6e6af11132c9533a2834'
     or md5(pg_get_functiondef('public.fn_raziel_upsert_summary(text,text,text,text)'::regprocedure)) <> '85f60b9a552c5c03d01955dec113156a'
     or md5(pg_get_functiondef('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)'::regprocedure)) <> '6a26f9e5d1a05fd6c3fc25b8179951b7'
     or md5(pg_get_functiondef('public.fn_raziel_context(text,text)'::regprocedure)) <> '56ffd0cfc5e29945e56044439a01f81e' then
    raise exception 'the fixtures are not the live 12.11.2026 bodies';
  end if;
end $$;

-- A = an account holder with a verified phone link; B = another account holder; 972500000009 = a sender without an account.
-- The site thread of A is three exchanges, so that "the stored thread wins over the turns the client sends" is visible.
insert into public.wa_account_links(user_id, phone, verified_at) values ('11111111-1111-4111-8111-111111111111', '972500000001', now());
insert into public.agent_user_memory(user_ref, channel, agent, memory_type, memory_scope, source, topic, content, data, created_at) values
 ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'conversation', 'personal', 'site', 'old 1', 'OLD-SITE-THREAD-A1', '{"reply":"OLD-REPLY-A1","context_snapshot":{"old":1}}', now() - interval '30 days'),
 ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'conversation', 'personal', 'site', 'old 2', 'OLD-SITE-THREAD-A2', '{"reply":"OLD-REPLY-A2","context_snapshot":{"old":2}}', now() - interval '29 days'),
 ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'conversation', 'personal', 'site', 'old 3', 'OLD-SITE-THREAD-A3', '{"reply":"OLD-REPLY-A3","context_snapshot":{"old":3}}', now() - interval '28 days'),
 ('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-DM-A', '{}', now() - interval '20 days'),
 ('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'birthday_hebrew', 'OLD-FACT-A', '{"kind":"birthday_hebrew"}', now() - interval '20 days'),
 ('11111111-1111-4111-8111-111111111111', '972500000001@c.us', 'raziel', 'preference', 'personal', 'wa', null, 'OLD-PREFERENCE-A', '{}', now() - interval '20 days'),
 ('11111111-1111-4111-8111-111111111111', 'site', 'raziel', 'research_note', 'personal', 'site', null, 'OLD-RESEARCH-TYPED-ROW-OF-A', '{}', now() - interval '20 days'),
 ('wa:972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'PRE-LINK-MEMORY-OF-A', '{}', now() - interval '40 days'),
 -- the live identity bridge joins the account id with the BARE phone of wa_account_links (live has no such row on 12.11.2026)
 ('972500000001', '972500000001@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'BARE-PHONE-MEMORY-OF-A', '{}', now() - interval '39 days'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-DM-UNLINKED', '{}', now() - interval '10 days'),
 ('wa:972500000009', '972500000009@c.us', 'raziel', 'personal_context', 'personal', 'profile', 'name', 'OLD-FACT-UNLINKED', '{"kind":"name"}', now() - interval '10 days'),
 ('11111111-1111-4111-8111-111111111111', '120363000000000001@g.us', 'raziel', 'conversation', 'personal', 'wa', null, 'OLD-FROM-GROUP-A', '{}', now() - interval '15 days'),
 ('22222222-2222-4222-8222-222222222222', 'site', 'raziel', 'conversation', 'personal', 'site', 'b', 'OLD-SITE-THREAD-B', '{"reply":"OLD-REPLY-B"}', now() - interval '12 days'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'conversation', 'personal', 'wa', null, 'OLD-BOT-QUESTION-H', '{}', now() - interval '100 days'),
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'old finding', 'OLD-BOT-FINDING-H', '{}', now() - interval '100 days'),
 -- a stored "research" row that carries a personal detail (a synthetic phone and a family/health remark): personal memory
 ('972511111111@c.us', 'wa', 'hatishbi', 'research_note', 'personal', 'wa', 'old personal finding', 'OLD-BOT-PERSONAL-H: בעלה חולה, טלפון 050-0000001', '{}', now() - interval '99 days'),
 ('972522222222@c.us', 'wa', 'uriel', 'conversation', 'personal', 'wa', null, 'OLD-BOT-QUESTION-U', '{}', now() - interval '80 days'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'wa', 'א', 'OLD-BOT-RULE-U', '{"subtype":"letter_rule"}', now() - interval '80 days'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'wa', 'אור', 'OLD-BOT-FINDING-U', '{"subtype":"word_decomposition","decomposed_form":"א-ו-ר"}', now() - interval '80 days'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'wa', 'בית', 'OLD-BOT-PERSONAL-U: שמי רחל, כתובת המייל שלי r@example.invalid', '{"subtype":"word_decomposition","decomposed_form":"ב-י-ת"}', now() - interval '79 days'),
 ('972522222222@c.us', 'wa', 'uriel', 'method_discovery', 'personal', 'wa', 'ב', 'OLD-BOT-PERSONAL-RULE-U: נולדתי בחודש ניסן', '{"subtype":"letter_rule"}', now() - interval '79 days');
create table public.cl13_original_ids as select id from public.agent_user_memory;
-- the full-content stamp of the rows that existed before (M-1, M-3: a count or max(created_at) would not see an UPDATE)
create function public.cl13_stamp() returns text language sql as $$
  select md5(coalesce(string_agg(md5(row_to_json(m)::text), ',' order by m.id), '')) || ':' || count(*)
    from public.agent_user_memory m where m.id in (select id from public.cl13_original_ids) $$;
