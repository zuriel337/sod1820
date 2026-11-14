-- M0-A regression on a DISPOSABLE PostgreSQL (never production). Fixture = the live 12.11.2026 shape of every object M0-A touches:
-- exact function bodies (md5-checked), exact policies and grants. Then: baseline (before) -> apply -> after -> idempotent re-run ->
-- drift stop -> rollback -> exact restore of the catalogue snapshot.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;
\o /dev/null
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text) $$;
create table auth.users (id uuid primary key, email text);
create table public.users (id uuid primary key, role text);
insert into auth.users values ('00000000-0000-4000-8000-00000000000a', 'admin@example.test'), ('00000000-0000-4000-8000-00000000000b', 'b@example.test'), ('00000000-0000-4000-8000-00000000000c', 'c@example.test');
insert into public.users values ('00000000-0000-4000-8000-00000000000a', 'admin'), ('00000000-0000-4000-8000-00000000000b', 'user'), ('00000000-0000-4000-8000-00000000000c', 'user');
grant select on public.users to anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.rd_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$;

-- helper: run SQL as a role with a JWT subject; returns 'ok' or the SQLSTATE. p_keep=false rolls the statement back.
create function public.m0a_try(p_role text, p_sub text, p_sql text, p_keep boolean default false) returns text language plpgsql as $$
declare res text;
begin
  begin
    perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
    execute format('set local role %I', p_role);
    execute p_sql;
    execute 'reset role';
    if not p_keep then raise exception using errcode = 'P0001', message = '__m0a_rollback__'; end if;
    res := 'ok';
  exception when others then
    if sqlerrm = '__m0a_rollback__' then res := 'ok'; else res := sqlstate; end if;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  return res;
end $$;
create function public.m0a_val(p_role text, p_sub text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  execute format('set local role %I', p_role);
  execute p_sql into v;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  return v;
end $$;
create function public.m0a_assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin if not coalesce(p_ok, false) then raise exception 'M0-A TEST FAILED: %', p_msg; end if; end $$;
grant execute on function public.m0a_try(text, text, text, boolean), public.m0a_val(text, text, text), public.m0a_assert(boolean, text) to public;

-- 12 system functions (exact signatures; production default PUBLIC execute; two with the explicit "=X" form as live)
create function public.fn_edge_grant_audit() returns int language sql security definer as $$ select 1 $$;
create function public.fn_rls_grant_audit() returns int language sql security definer as $$ select 1 $$;
create function public.check_security_spike() returns int language sql security definer as $$ select 1 $$;
create function public.snapshot_seo_wave(integer, integer) returns int language sql security definer as $$ select 1 $$;
create function public.fn_detect_patterns(integer, text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_detect_pattern_contradictions() returns int language sql security definer as $$ select 1 $$;
create function public.fn_scan_reeval(text, text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_outbox_bump(text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_raziel_claim(text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_raziel_claims_gc() returns int language sql security definer as $$ select 1 $$;
create function public.ai_quota_check(text, text, integer) returns int language sql security definer as $$ select 1 $$;
create function public.router_rate_check(uuid, integer) returns int language sql security definer as $$ select 1 $$;
grant execute on function public.ai_quota_check(text, text, integer), public.fn_outbox_bump(text) to public;
-- owner-rights callers that must keep working (as admin_candidate_decide / fn_edge_grant_gaps / fn_capability_execution_gate_v1)
create function public.owner_caller_detect() returns int language sql security definer as $$ select public.fn_detect_patterns(1, 'x') + public.fn_outbox_bump('k') + public.ai_quota_check('i', 't', 1) $$;
revoke all on function public.owner_caller_detect() from public;
grant execute on function public.owner_caller_detect() to authenticated;

-- wa_msg_count (exact live body) and its SECURITY DEFINER caller research_level_of
create table public.wa_account_links (user_id uuid, phone text);
create table public.wa_bot_log (sender text, msg_id text, group_id text, action text, created_at timestamptz default now(), sender_name text);
create table public.wa_deep_queue (sender text, msg_id text);
create table public.wa_message_status (sender text, msg_id text);
create table public.wa_vip_inbox (sender text, msg_id text);
create table public.wa_msg_ext (phone text, msg_id text);
insert into public.wa_account_links values ('00000000-0000-4000-8000-00000000000b', '15550000001');
insert into public.wa_bot_log (sender, msg_id, group_id, action) values ('15550000001@c.us', 'm1', '15550000001@c.us', 'pm_ai'), ('15550000001@c.us', 'm2', 'g1@g.us', 'grp_ai');

CREATE OR REPLACE FUNCTION public.wa_msg_count(p_uid uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with phones as (select phone from public.wa_account_links where user_id = p_uid),
  msgs as (
    select regexp_replace(sender,'@.*$','') as ph, msg_id from public.wa_bot_log       where sender ~ '^[0-9]'
    union select regexp_replace(sender,'@.*$',''), msg_id from public.wa_deep_queue     where sender ~ '^[0-9]'
    union select regexp_replace(sender,'@.*$',''), msg_id from public.wa_message_status where sender ~ '^[0-9]'
    union select regexp_replace(sender,'@.*$',''), msg_id from public.wa_vip_inbox      where sender ~ '^[0-9]'
    union select phone, msg_id from public.wa_msg_ext
  )
  select coalesce(count(*),0)::int from msgs m join phones p on p.phone = m.ph;
$function$
;

-- support objects for the exact admin_resolve_translit / admin_ai_cost / link_visitor_identity bodies
create table public.translit_suggestions (id serial primary key, input_norm text unique, proposed_hebrew text, status text, updated_at timestamptz);
insert into public.translit_suggestions (input_norm, proposed_hebrew, status) values ('shalom', 'שלום', 'pending');
create table public.translit_promotions (input_norm text, hebrew text);
create function public._promote_translit(text, text, numeric, text) returns void language sql security definer as $$ insert into public.translit_promotions values ($1, $2) $$;
create table public.ai_token_log (created_at timestamptz default now(), input_tokens int, output_tokens int, model text, source text, kind text, ref text);
insert into public.ai_token_log (input_tokens, output_tokens, model, source, kind, ref) values (1000, 500, 'sonnet', 'ai-analyze', 'number', '15550000001@c.us');
create function public._ai_price(text) returns table (in_price numeric, out_price numeric) language sql stable as $$ select 3::numeric, 15::numeric $$;
create table public.visitor_identity (visitor text primary key, user_id uuid, email text, last_seen timestamptz);

CREATE OR REPLACE FUNCTION public.admin_resolve_translit(p_input_norm text, p_hebrew text DEFAULT NULL::text, p_approve boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v record;
begin
  select * into v from translit_suggestions where input_norm = lower(btrim(p_input_norm));
  if not found then return 'not_found'; end if;
  if not p_approve then
    update translit_suggestions set status='rejected', updated_at=now() where id = v.id;
    return 'rejected';
  end if;
  perform _promote_translit(v.input_norm, coalesce(p_hebrew, v.proposed_hebrew), 0.98, 'admin');
  return 'verified';
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_ai_cost(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_total jsonb; v_by_source jsonb; v_by_model jsonb; v_by_kind jsonb; v_by_day jsonb; v_wa jsonb;
begin
  select jsonb_build_object('calls', count(*),
           'input_tokens', coalesce(sum(input_tokens),0), 'output_tokens', coalesce(sum(output_tokens),0),
           'total_tokens', coalesce(sum(input_tokens+output_tokens),0),
           'cost_usd', round(coalesce(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
             output_tokens*(select out_price from _ai_price(model))/1e6),0)::numeric,4))
  into v_total from ai_token_log where created_at >= v_since;

  select coalesce(jsonb_agg(row order by (row->>'total_tokens')::bigint desc), '[]'::jsonb) into v_by_source from (
    select jsonb_build_object('source', source, 'calls', count(*),
             'input_tokens', sum(input_tokens), 'output_tokens', sum(output_tokens),
             'total_tokens', sum(input_tokens+output_tokens),
             'cost_usd', round(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
               output_tokens*(select out_price from _ai_price(model))/1e6)::numeric,4)) as row
    from ai_token_log where created_at >= v_since group by source) s;

  select coalesce(jsonb_agg(row order by (row->>'cost_usd')::numeric desc), '[]'::jsonb) into v_by_model from (
    select jsonb_build_object('model', model, 'calls', count(*), 'total_tokens', sum(input_tokens+output_tokens),
             'cost_usd', round(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
               output_tokens*(select out_price from _ai_price(model))/1e6)::numeric,4)) as row
    from ai_token_log where created_at >= v_since group by model) m;

  select coalesce(jsonb_agg(row order by (row->>'cost_usd')::numeric desc), '[]'::jsonb) into v_by_kind from (
    select jsonb_build_object('source', source, 'kind', kind, 'calls', count(*), 'total_tokens', sum(input_tokens+output_tokens),
             'cost_usd', round(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
               output_tokens*(select out_price from _ai_price(model))/1e6)::numeric,4)) as row
    from ai_token_log where created_at >= v_since group by source, kind) k;

  select coalesce(jsonb_agg(row order by (row->>'day')), '[]'::jsonb) into v_by_day from (
    select jsonb_build_object('day', to_char(date_trunc('day', created_at),'YYYY-MM-DD'),
             'calls', count(*), 'total_tokens', sum(input_tokens+output_tokens),
             'cost_usd', round(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
               output_tokens*(select out_price from _ai_price(model))/1e6)::numeric,4)) as row
    from ai_token_log where created_at >= v_since group by date_trunc('day', created_at)) d;

  -- 📱 פעילות בוט + עלות שיחת-AI לכל צ׳אט (קבוצה/משתמש פרטי)
  with acts as (
    select group_id,
      case when group_id like '%@g.us' then 'group' else 'private' end as kind,
      count(*) as msgs,
      count(*) filter (where action in ('pm_ai','pm_ai_vip','grp_ai')) as ai_msgs,
      max(created_at) as last,
      max(sender_name) filter (where sender_name is not null and sender_name <> '') as name
    from wa_bot_log where created_at >= v_since group by group_id
  ), costs as (
    select ref,
      round(sum(input_tokens*(select in_price from _ai_price(model))/1e6 +
        output_tokens*(select out_price from _ai_price(model))/1e6)::numeric,4) as cost_usd,
      sum(input_tokens+output_tokens) as tokens, count(*) as ai_calls
    from ai_token_log where created_at >= v_since and ref is not null group by ref
  )
  select jsonb_build_object(
    'total_msgs', (select count(*) from wa_bot_log where created_at >= v_since),
    'ai_msgs', (select coalesce(sum(ai_msgs),0) from acts),
    'ai_cost_usd', (select coalesce(sum(cost_usd),0) from costs),
    'chats', coalesce((select jsonb_agg(jsonb_build_object(
        'chat_id', a.group_id, 'kind', a.kind, 'name', a.name,
        'msgs', a.msgs, 'ai_msgs', a.ai_msgs, 'last', a.last,
        'cost_usd', coalesce(c.cost_usd,0), 'ai_tokens', coalesce(c.tokens,0), 'ai_calls', coalesce(c.ai_calls,0)
      ) order by a.msgs desc) from acts a left join costs c on c.ref = a.group_id), '[]'::jsonb))
  into v_wa;

  return jsonb_build_object('days', p_days, 'total', v_total, 'by_source', v_by_source,
    'by_model', v_by_model, 'by_kind', v_by_kind, 'by_day', v_by_day, 'wa', v_wa);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.link_visitor_identity(p_visitor text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid; em text;
begin
  uid := auth.uid();
  if uid is null or p_visitor is null or length(p_visitor) < 6 then return; end if;
  select email into em from auth.users where id = uid;
  insert into public.visitor_identity(visitor, user_id, email, last_seen)
  values (p_visitor, uid, em, now())
  on conflict (visitor) do update set user_id = excluded.user_id, email = excluded.email, last_seen = now();
end $function$
;

-- live execute grants of the exact-body functions (12.11.2026 proacl)
revoke all on function public.admin_resolve_translit(text,text,boolean) from public;
grant execute on function public.admin_resolve_translit(text,text,boolean) to authenticated;
revoke all on function public.admin_ai_cost(integer) from public;
grant execute on function public.admin_ai_cost(integer) to authenticated;
grant execute on function public.link_visitor_identity(text) to public, authenticated;
create function public.research_level_of(p_uid uuid) returns int language sql stable security definer set search_path to 'public' as $$ select public.wa_msg_count(p_uid) $$;
revoke all on function public.research_level_of(uuid) from public;
grant execute on function public.research_level_of(uuid) to anon, authenticated;
grant select on public.wa_bot_log to service_role;
-- gematria_wall (live policy "wall public read" = true; 185/28,950 private rows live)
create table public.gematria_wall (id uuid default gen_random_uuid() primary key, phrase text, ragil int, hits int default 1, created_at timestamptz default now(), last_at timestamptz default now(), private boolean default false);
alter table public.gematria_wall enable row level security;
create policy "wall public read" on public.gematria_wall for select to public using (true);
grant select on public.gematria_wall to anon, authenticated;
insert into public.gematria_wall (phrase, ragil, private) values ('אור', 207, false), ('סוד', 70, true);

-- the seven Legacy tables with the live grants and policies
create table public.words (id serial primary key, w text);
create table public.syncs (id serial primary key, s text);
create table public.chat_messages (id serial primary key, content text, author text);
create table public.chiddush_submissions (id serial primary key, body text);
create table public.metatron_beta_feedback (id serial primary key, body text);
create table public.lab_notes (id serial primary key, kind text, title text);
create table public.lab_messages (id serial primary key, thread text, content text);
alter table public.words enable row level security; alter table public.syncs enable row level security;
alter table public.chat_messages enable row level security; alter table public.chiddush_submissions enable row level security;
alter table public.metatron_beta_feedback enable row level security; alter table public.lab_notes enable row level security;
alter table public.lab_messages enable row level security;
grant insert, select on public.words, public.syncs, public.chat_messages to anon, authenticated;
grant insert on public.chiddush_submissions to anon; grant insert, select on public.chiddush_submissions to authenticated;
grant insert on public.metatron_beta_feedback to anon, authenticated;
grant select, insert, update, delete on public.lab_notes, public.lab_messages to anon, authenticated;
grant all on public.words, public.syncs, public.chat_messages, public.chiddush_submissions, public.metatron_beta_feedback, public.lab_notes, public.lab_messages to service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;
create policy anon_insert_words on public.words for insert to anon with check (true);
create policy anon_select_words on public.words for select to anon, authenticated using (true);
create policy anon_insert_syncs on public.syncs for insert to anon with check (true);
create policy anon_select_syncs on public.syncs for select to anon, authenticated using (true);
create policy chat_public_insert on public.chat_messages for insert to public
  with check (((length(content) >= 1) AND (length(content) <= 1000) AND ((length(author) >= 1) AND (length(author) <= 60))));
create policy chat_public_read on public.chat_messages for select to public using (true);
create policy chiddush_admin_read on public.chiddush_submissions for select to authenticated using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy chiddush_public_insert on public.chiddush_submissions for insert to anon, authenticated with check (true);
create policy beta_feedback_insert on public.metatron_beta_feedback for insert to anon, authenticated with check (true);
create policy lab_notes_admin_delete on public.lab_notes for delete to public using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy lab_notes_admin_update on public.lab_notes for update to public using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')) with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy lab_notes_insert on public.lab_notes for insert to public with check (true);
create policy lab_notes_read on public.lab_notes for select to public using (true);
create policy lab_messages_admin_delete on public.lab_messages for delete to public using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy lab_messages_admin_update on public.lab_messages for update to public using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')) with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy lab_messages_insert on public.lab_messages for insert to public with check (true);
create policy lab_messages_read on public.lab_messages for select to public using (true);
insert into public.lab_notes (kind, title) values ('insight', 'n1'); insert into public.lab_messages (thread, content) values ('main', 'm1');
insert into public.words (w) values ('w1'); insert into public.syncs (s) values ('s1');

-- the seven dormant ALL policies (clients hold SELECT only, as live)
create table public.insights (id serial primary key, space text, panel_data jsonb default '{}');
create table public.word_aliases (id serial primary key, alias text);
create table public.hint_sets (id serial primary key, status text, visibility text);
create table public.hint_set_members (id serial primary key, set_id int);
create table public.trails (id serial primary key, status text, visibility text);
create table public.trail_members (id serial primary key, trail_id int);
create table public.page_content (id serial primary key, body text);
do $$ declare t text; begin
  foreach t in array array['insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
create policy "authenticated write" on public.insights for all to authenticated using (true) with check (true);
create policy "public read" on public.insights for select to anon, authenticated using (true);
-- live (read 14.11.2026): a RESTRICTIVE read policy the M0-A step leaves untouched; present so that the catalogue fingerprint of the fixture equals the live one
create policy insights_private_space_read on public.insights as restrictive for select to anon, authenticated
  using ((coalesce(space, 'core'::text) <> 'private'::text) or (select rd_is_admin()) or ((panel_data ->> 'privacy_owner_user_id'::text) = ((select auth.uid()))::text));
create policy word_aliases_auth_write on public.word_aliases for all to authenticated using (true) with check (true);
create policy word_aliases_public_read on public.word_aliases for select to public using (true);
create policy admin_all on public.hint_sets for all to authenticated using (true) with check (true);
create policy public_read_published on public.hint_sets for select to public using (status = 'published' and visibility = 'public');
create policy admin_all on public.hint_set_members for all to authenticated using (true) with check (true);
create policy public_read_via_set on public.hint_set_members for select to public using (exists (select 1 from hint_sets s where s.id = hint_set_members.set_id and s.status = 'published' and s.visibility = 'public'));
create policy admin_all on public.trails for all to authenticated using (true) with check (true);
create policy public_read_published on public.trails for select to public using (status = 'published' and visibility = 'public');
create policy admin_all on public.trail_members for all to authenticated using (true) with check (true);
create policy public_read_via_trail on public.trail_members for select to public using (exists (select 1 from trails t where t.id = trail_members.trail_id and t.status = 'published' and t.visibility = 'public'));
create policy anon_read on public.page_content for select to public using (true);
create policy auth_write on public.page_content for all to public using ((auth.role() = 'authenticated'::text));
insert into public.hint_sets (status, visibility) values ('draft', 'private'), ('published', 'public');
insert into public.trails (status, visibility) values ('draft', 'private');

-- pg_cron stub with the four inactive jobs (fake secret) and one active job that must stay
create schema cron;
create table cron.job (jobid bigserial primary key, schedule text, command text, nodename text default 'localhost', nodeport int default 5432,
  database text default 'postgres', username text default 'postgres', active boolean default true, jobname text unique);
create function cron.unschedule(job_id bigint) returns boolean language sql as $$ delete from cron.job where jobid = job_id returning true $$;
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (job_name, schedule, command) returning jobid $$;
create function cron.alter_job(job_id bigint, schedule text default null, command text default null, database text default null, username text default null, active boolean default null)
  returns void language sql as $$ update cron.job set schedule = coalesce(alter_job.schedule, job.schedule), command = coalesce(alter_job.command, job.command), active = coalesce(alter_job.active, job.active) where jobid = job_id $$;
insert into cron.job (jobid, jobname, schedule, active, command) values
  (6, 'wa-deep-process', '* * * * *', false, E'\n  select net.http_post(\n    url := ''https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-process?s=FAKEFAKEFAKEFAKE0000'',\n    headers := ''{"Content-Type":"application/json"}''::jsonb,\n    body := ''{}''::jsonb\n  );\n'),
  (7, 'wa-poll', '* * * * *', false, E'\n  select net.http_post(\n    url := ''https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-poll?s=FAKEFAKEFAKEFAKE0000'',\n    headers := ''{"Content-Type":"application/json"}''::jsonb,\n    body := ''{}''::jsonb\n  );\n'),
  (22, 'wa-michael', '*/2 * * * *', false, 'select net.http_get(url:=''https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-michael?s=FAKEFAKEFAKEFAKE0000'', timeout_milliseconds:=55000);'),
  (24, 'wa-gabriel', '* * * * *', false, 'select net.http_get(url:=''https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-gabriel?s=FAKEFAKEFAKEFAKE0000'', timeout_milliseconds:=55000);'),
  (40, 'security_spike_hourly', '0 * * * *', true, 'select public.check_security_spike()');
select setval('cron.job_jobid_seq', 1000);


-- add_contribution (exact live body) and the objects its guest path touches
create table public.anon_contrib_log (ip text, created_at timestamptz default now());
create table public.contributors (id uuid primary key default gen_random_uuid(), user_id uuid, trusted boolean);
create table public.research_contributions (id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text,
  intent text, origin text, research_state text, status text, target_type text, target_id text, parent_id uuid, title text, body text,
  gematria_claim jsonb, image_url text, last_activity_at timestamptz);
create table public.contribution_events (user_id uuid, kind text, ref text, value numeric, source text, metadata jsonb);
create function public.contribution_weight(text, boolean, boolean, boolean) returns numeric language sql immutable as $$ select 1::numeric $$;
CREATE OR REPLACE FUNCTION public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_parent_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text, p_gematria_claim jsonb DEFAULT NULL::jsonb, p_author_name text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_cid uuid;
  v_name text;
  v_status text;
  v_state text;
  new_id uuid;
  v_ip text;
  v_recent int;
  v_trusted boolean := false;
  v_intent text := nullif(btrim(coalesce(p_intent,'')), '');
begin
  if p_body is null or length(btrim(p_body)) = 0 then raise exception 'empty body'; end if;

  if v_intent is null or not (v_intent = any(array[
    'תגובה','חידוש','שאלה','תיקון','תצפית','השערה','מקור','צופן','גימטריה','קשר'
  ]::text[])) then
    raise exception 'invalid intent';
  end if;

  if v_uid is not null then
    select id, coalesce(trusted,false)
      into v_cid, v_trusted
    from public.contributors
    where user_id = v_uid
    limit 1;

    v_status := case when v_intent = 'תגובה' then 'approved' else 'pending' end;
    v_state  := case
      when v_intent = 'תגובה' then 'discussion'
      when v_trusted then 'validated'
      else 'idea'
    end;

    select coalesce(nullif(display_name,''), nullif(username,''))
      into v_name
    from public.users
    where id = v_uid
    limit 1;
  else
    v_ip := split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for',''), ',', 1);
    v_ip := nullif(btrim(v_ip), '');
    if v_ip is not null then
      select count(*) into v_recent
      from public.anon_contrib_log
      where ip = v_ip and created_at > now() - interval '1 hour';
      if v_recent >= 5 then raise exception 'rate_limited'; end if;
      insert into public.anon_contrib_log(ip) values (v_ip);
    end if;
    v_status := 'pending';
    v_state  := 'discussion';
    v_name := left(coalesce(nullif(btrim(p_author_name),''), 'אורח'), 40);
  end if;

  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status,
     target_type, target_id, parent_id, title, body, gematria_claim, image_url)
  values
    (v_uid, v_cid, v_name, v_intent, coalesce(nullif(p_origin,''),'beit_midrash'),
     v_state, v_status, p_target_type, p_target_id, p_parent_id, p_title,
     left(p_body, 6000), p_gematria_claim, nullif(btrim(p_image_url), ''))
  returning id into new_id;

  if p_parent_id is not null then
    update public.research_contributions
       set last_activity_at = now()
     where id = p_parent_id;
  end if;

  if v_uid is not null and v_status = 'approved' then
    insert into public.contribution_events (user_id, kind, ref, value, source, metadata)
    values (
      v_uid,
      'contribution_posted',
      new_id::text,
      public.contribution_weight(v_intent, false, false, coalesce(nullif(p_origin,''),'beit_midrash') <> 'broadcast'),
      coalesce(nullif(p_origin,''),'beit_midrash'),
      jsonb_build_object('intent', v_intent, 'parent_id', p_parent_id, 'auto', true)
    );
  end if;

  return new_id;
end;
$function$
;
select public.m0a_assert(md5(pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure)) = 'a2110027d793b61e461bb62954a4be69', 'fixture add_contribution = live md5');
create function public.m0a_contrib_burst(p_n int) returns int language plpgsql as $$
declare i int; ok int := 0;
begin
  for i in 1..p_n loop
    begin
      perform set_config('request.headers', json_build_object('cf-connecting-ip', '203.0.113.7', 'x-forwarded-for', '198.51.100.' || i || ', 203.0.113.7')::text, true);
      perform public.add_contribution('שאלה', 'beit_midrash', 'גוף ' || i);
      ok := ok + 1;
    exception when others then if sqlerrm <> 'rate_limited' then raise; end if;
    end;
  end loop;
  delete from public.anon_contrib_log; delete from public.research_contributions;
  return ok;
end $$;

-- fixtures reproduce the live bodies byte for byte
select public.m0a_assert(md5(pg_get_functiondef('public.admin_resolve_translit(text,text,boolean)'::regprocedure)) = '2aab330cb1f1fc77e51d902dfae5041b', 'fixture admin_resolve_translit = live md5');
select public.m0a_assert(md5(pg_get_functiondef('public.admin_ai_cost(integer)'::regprocedure)) = '0487c48ca5e930f132c3b30cceb69ca9', 'fixture admin_ai_cost = live md5');
select public.m0a_assert(md5(pg_get_functiondef('public.link_visitor_identity(text)'::regprocedure)) = '4622faa398b9531275077139de09cc4e', 'fixture link_visitor_identity = live md5');
select public.m0a_assert(md5(pg_get_functiondef('public.wa_msg_count(uuid)'::regprocedure)) = '4f00d794b5df6d2b2a606661e3bffac8', 'fixture wa_msg_count = live md5');

-- ===== catalogue snapshot (used to prove the rollback restores the exact previous state) =====
create table public.m0a_snap (tag text, k text, v text);
create function public.m0a_snapshot(p_tag text) returns void language plpgsql as $$
declare f text; t text; r text; p text;
begin
  foreach f in array array['public.fn_edge_grant_audit()','public.fn_rls_grant_audit()','public.check_security_spike()','public.snapshot_seo_wave(integer,integer)',
    'public.fn_detect_patterns(integer,text)','public.fn_detect_pattern_contradictions()','public.fn_scan_reeval(text,text)','public.fn_outbox_bump(text)',
    'public.fn_raziel_claim(text)','public.fn_raziel_claims_gc()','public.ai_quota_check(text,text,integer)','public.router_rate_check(uuid,integer)',
    'public.admin_resolve_translit(text,text,boolean)','public.admin_ai_cost(integer)','public.link_visitor_identity(text)','public.wa_msg_count(uuid)',
    'public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'] loop
    foreach r in array array['anon','authenticated','service_role'] loop
      insert into public.m0a_snap values (p_tag, 'exec:' || f || ':' || r, has_function_privilege(r, f, 'EXECUTE')::text);
    end loop;
    insert into public.m0a_snap values (p_tag, 'md5:' || f, md5(pg_get_functiondef(f::regprocedure)));
  end loop;
  foreach t in array array['gematria_wall','words','syncs','chat_messages','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages',
    'insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content'] loop
    foreach r in array array['anon','authenticated','service_role'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
        insert into public.m0a_snap values (p_tag, 'tbl:' || t || ':' || r || ':' || p, has_table_privilege(r, 'public.' || t, p)::text);
      end loop;
    end loop;
  end loop;
  insert into public.m0a_snap select p_tag, 'pol:' || tablename || ':' || policyname, permissive || '|' || roles::text || '|' || cmd || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
    from pg_policies where schemaname = 'public';
  insert into public.m0a_snap select p_tag, 'cron:' || jobname, schedule || '|' || active || '|' || regexp_replace(command, '([?&]s=)[^&''" )]+', '\1X', 'g') from cron.job;
end $$;
select public.m0a_snapshot('before');

-- ===== BEFORE: the exposures exist (baseline proves the fixture reproduces production) =====
select public.m0a_assert(has_function_privilege('anon', 'public.check_security_spike()', 'EXECUTE'), 'before: anon can run a system function');
select public.m0a_assert(has_function_privilege('anon', 'public.ai_quota_check(text,text,integer)', 'EXECUTE'), 'before: anon can bump any quota');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.admin_resolve_translit(''nothing'')') = 'not_found', 'before: non-admin runs admin_resolve_translit');
select public.m0a_assert(public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.admin_ai_cost(30)') = 'ok', 'before: non-admin reads admin_ai_cost');
select public.m0a_assert(public.m0a_val('anon', null, 'select public.wa_msg_count(''00000000-0000-4000-8000-00000000000b'')::text') = '2', 'before: anon reads anyone''s WhatsApp count');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.gematria_wall where private') = '1', 'before: anon reads private wall rows');
select public.m0a_assert(public.m0a_try('anon', null, 'insert into public.words (w) values (''x'')') = 'ok', 'before: anon inserts into words');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.lab_notes') = '1', 'before: anon reads lab_notes');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000c', 'select count(*)::text from public.hint_sets') = '2', 'before: non-admin reads unpublished hint_sets');
select public.m0a_assert(public.m0a_contrib_burst(8) = 8, 'before: a rotating fake first X-Forwarded-For hop bypasses the guest limit');
-- visitor hijack demonstration (rolled back)
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.link_visitor_identity(''visitor-bbbbbb'')', true);
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000c', 'select public.link_visitor_identity(''visitor-bbbbbb'')', true);
select public.m0a_assert((select user_id from public.visitor_identity where visitor = 'visitor-bbbbbb') = '00000000-0000-4000-8000-00000000000c', 'before: C hijacked B''s visitor id');
delete from public.visitor_identity;

-- ===== APPLY (production order) =====
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
\i supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql
\i supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql
\i supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql
\i supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql
\i supabase/proposed/20261112133000_m0a_add_contribution_client_address.sql

-- ===== AFTER =====
do $$
declare f text;
begin
  foreach f in array array['public.fn_edge_grant_audit()','public.fn_rls_grant_audit()','public.check_security_spike()','public.snapshot_seo_wave(integer,integer)',
    'public.fn_detect_patterns(integer,text)','public.fn_detect_pattern_contradictions()','public.fn_scan_reeval(text,text)','public.fn_outbox_bump(text)',
    'public.fn_raziel_claim(text)','public.fn_raziel_claims_gc()','public.ai_quota_check(text,text,integer)','public.router_rate_check(uuid,integer)','public.wa_msg_count(uuid)'] loop
    perform public.m0a_assert(not has_function_privilege('anon', f, 'EXECUTE'), 'after: anon still executes ' || f);
    perform public.m0a_assert(not has_function_privilege('authenticated', f, 'EXECUTE'), 'after: authenticated still executes ' || f);
    perform public.m0a_assert(has_function_privilege('service_role', f, 'EXECUTE'), 'after: service_role lost ' || f);
  end loop;
end $$;
select public.m0a_assert(public.m0a_try('anon', null, 'select public.check_security_spike()') = '42501', 'after: anon call of a system function is refused');
select public.m0a_assert(public.m0a_try('service_role', null, 'select public.fn_raziel_claim(''k'')') = 'ok', 'after: service role (WhatsApp bots) still claims');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.owner_caller_detect()::text') = '3', 'after: owner-rights callers (admin_candidate_decide, gate) unaffected');
-- admin guards
select public.m0a_assert(public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.admin_resolve_translit(''shalom'')') = '42501', 'after: non-admin refused admin_resolve_translit');
select public.m0a_assert(public.m0a_try('anon', null, 'select public.admin_resolve_translit(''shalom'')') = '42501', 'after: anon refused admin_resolve_translit');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000a', 'select public.admin_resolve_translit(''shalom'')') = 'verified', 'after: admin still resolves');
select public.m0a_assert(public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000c', 'select public.admin_ai_cost(30)') = '42501', 'after: non-admin refused admin_ai_cost');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000a', 'select (public.admin_ai_cost(30)->''total''->>''calls'')') = '1', 'after: admin still reads AI cost');
-- account data
select public.m0a_assert(public.m0a_try('anon', null, 'select public.wa_msg_count(''00000000-0000-4000-8000-00000000000b'')') = '42501', 'after: anon refused wa_msg_count');
select public.m0a_assert(public.m0a_val('anon', null, 'select public.research_level_of(''00000000-0000-4000-8000-00000000000b'')::text') = '2', 'after: research_level_of (owner rights) unchanged');
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.link_visitor_identity(''visitor-bbbbbb'')', true);
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000c', 'select public.link_visitor_identity(''visitor-bbbbbb'')', true);
select public.m0a_assert((select user_id from public.visitor_identity where visitor = 'visitor-bbbbbb') = '00000000-0000-4000-8000-00000000000b', 'after: C can no longer take B''s visitor id');
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000b', 'select public.link_visitor_identity(''visitor-bbbbbb'')', true);
select public.m0a_assert((select count(*) from public.visitor_identity) = 1, 'after: B re-links its own visitor id');
select public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000c', 'select public.link_visitor_identity(''visitor-cccccc'')', true);
select public.m0a_assert((select user_id from public.visitor_identity where visitor = 'visitor-cccccc') = '00000000-0000-4000-8000-00000000000c', 'after: a new visitor id still links');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.gematria_wall where private') = '0', 'after: private wall rows hidden from anon');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.gematria_wall') = '1', 'after: public wall rows still visible');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000a', 'select count(*)::text from public.gematria_wall') = '2', 'after: admin still sees private rows');
-- Legacy
do $$
declare t text; r text;
begin
  foreach t in array array['words','syncs','chiddush_submissions','metatron_beta_feedback','lab_notes','lab_messages'] loop
    foreach r in array array['anon','authenticated'] loop
      perform public.m0a_assert(public.m0a_try(r, '00000000-0000-4000-8000-00000000000b', format('insert into public.%I default values', t)) = '42501', format('after: %s insert into %s refused', r, t));
    end loop;
  end loop;
  foreach r in array array['anon','authenticated'] loop
    perform public.m0a_assert(public.m0a_try(r, '00000000-0000-4000-8000-00000000000b', 'insert into public.chat_messages (content, author) values (''x'', ''y'')') = '42501', 'after: chat_messages insert refused for ' || r);
    perform public.m0a_assert(public.m0a_try(r, '00000000-0000-4000-8000-00000000000b', 'update public.lab_notes set title = ''x''') = '42501', 'after: lab_notes update refused for ' || r);
    perform public.m0a_assert(public.m0a_try(r, '00000000-0000-4000-8000-00000000000b', 'delete from public.lab_messages') = '42501', 'after: lab_messages delete refused for ' || r);
  end loop;
end $$;
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.words') = '1', 'after: words still publicly readable');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.syncs') = '1', 'after: syncs still publicly readable');
select public.m0a_assert(public.m0a_try('anon', null, 'select count(*) from public.chat_messages') = 'ok', 'after: chat_messages still publicly readable');
select public.m0a_assert(public.m0a_try('anon', null, 'select count(*) from public.lab_notes') = '42501', 'after: anon cannot read lab_notes');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000b', 'select count(*)::text from public.lab_messages') = '0', 'after: non-admin sees no lab_messages');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000a', 'select count(*)::text from public.lab_notes') = '1', 'after: admin reads lab_notes');
select public.m0a_assert(public.m0a_try('service_role', null, 'insert into public.lab_notes (kind, title) values (''insight'', ''bot'')') = 'ok', 'after: lab-reflect / wa-mora (service role) still write');
select public.m0a_assert((select count(*) from public.words) = 1 and (select count(*) from public.lab_notes) = 1 and (select count(*) from public.lab_messages) = 1, 'after: no row deleted');
-- dormant policies
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000c', 'select count(*)::text from public.hint_sets') = '1', 'after: non-admin sees only the published hint set');
select public.m0a_assert(public.m0a_val('anon', null, 'select count(*)::text from public.hint_sets') = '1', 'after: public read of published hint sets unchanged');
select public.m0a_assert(public.m0a_val('authenticated', '00000000-0000-4000-8000-00000000000a', 'select count(*)::text from public.hint_sets') = '2', 'after: admin sees all hint sets');
select public.m0a_assert(public.m0a_try('authenticated', '00000000-0000-4000-8000-00000000000a', 'insert into public.hint_sets (status) values (''x'')') = '42501', 'after: client writes stay inert (no grant) - unchanged');
-- add_contribution guest limit
select public.m0a_assert(public.m0a_contrib_burst(8) = 5, 'after: the guest limit (5/hour) holds for one platform address whatever the first XFF hop');
-- cron
select public.m0a_assert((select count(*) from cron.job where jobid in (6, 7, 22, 24)) = 0, 'after: the four secret-carrying jobs are gone');
select public.m0a_assert((select active from cron.job where jobname = 'security_spike_hourly'), 'after: active jobs untouched');
select public.m0a_assert((select count(*) from cron.job where command ~ '[?&]s=') = 0, 'after: no job carries a query secret');

-- ===== idempotent re-run and drift stop =====
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
\i supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql
\i supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql
do $$
begin
  begin
    perform pg_temp.m0a_patch('public.rd_is_admin()', '00000000000000000000000000000000', '11111111111111111111111111111111', 'x', 'y');
    raise exception 'drift guard did not stop';
  exception when others then
    if sqlerrm not like 'M0-A drift:%' then raise; end if;
  end;
end $$;

-- ===== ROLLBACK (reverse order) and exact restore =====
\i supabase/proposed/ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql
\i supabase/proposed/ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql
\i supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql
\i supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql
\i supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql
\i supabase/proposed/ROLLBACK_20261106131000_def005.sql
select public.m0a_snapshot('rolled_back');
do $$
declare diff text;
begin
  select string_agg(coalesce(b.k, a.k) || ' before=' || coalesce(b.v, '∅') || ' after=' || coalesce(a.v, '∅'), E'\n') into diff
  from (select * from public.m0a_snap where tag = 'before') b
  full join (select * from public.m0a_snap where tag = 'rolled_back') a on a.k = b.k
  where b.v is distinct from a.v;
  if diff is not null then raise exception E'M0-A TEST FAILED: rollback is not exact:\n%', diff; end if;
end $$;
select public.m0a_assert((select bool_and(not active) from cron.job where jobname in ('wa-deep-process', 'wa-poll', 'wa-michael', 'wa-gabriel')), 'rollback: re-created jobs are inactive');
select public.m0a_assert((select count(*) from cron.job where command like '%FAKEFAKE%') = 0, 'rollback: the old secret is not restored (by design)');

-- ===== catalogue guards (foundation package, 14.11.2026): on a drifted catalogue the apply and the rollback REFUSE and change nothing =====
-- The state here is the exact "before" state. Steps 4, 5 and 6 carry a fingerprint guard; each refusal below leaves the catalogue as it was,
-- and with the drift reverted the same file applies, so the refusal was caused by the drift and by nothing else.
\set ON_ERROR_STOP off
-- step 5: a policy the step drops was edited
alter policy chat_public_insert on public.chat_messages with check (true);
\i supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql
\set ON_ERROR_STOP on
select public.m0a_assert(has_table_privilege('anon', 'public.words', 'INSERT') and has_table_privilege('anon', 'public.lab_notes', 'DELETE')
  and exists (select 1 from pg_policies where tablename = 'lab_notes' and policyname = 'lab_notes_read'), 'guard step 5: an edited policy makes the apply refuse; grants and policies unchanged');
alter policy chat_public_insert on public.chat_messages with check (((length(content) >= 1) AND (length(content) <= 1000) AND ((length(author) >= 1) AND (length(author) <= 60))));
-- step 6: an extra policy appeared on one of the seven tables
create policy drift_extra on public.page_content for select to anon using (true);
\set ON_ERROR_STOP off
\i supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql
\set ON_ERROR_STOP on
select public.m0a_assert((select qual from pg_policies where tablename = 'page_content' and policyname = 'auth_write') = '(auth.role() = ''authenticated''::text)',
  'guard step 6: an extra policy makes the apply refuse; the dormant policy is unchanged');
drop policy drift_extra on public.page_content;
-- step 4: the gematria_wall policy was edited
alter policy "wall public read" on public.gematria_wall using (true and true);
\set ON_ERROR_STOP off
\i supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql
\set ON_ERROR_STOP on
select public.m0a_assert(md5(pg_get_functiondef('public.admin_ai_cost(integer)'::regprocedure)) = '0487c48ca5e930f132c3b30cceb69ca9'
  and has_function_privilege('anon', 'public.wa_msg_count(uuid)', 'EXECUTE'), 'guard step 4: an edited wall policy makes the apply refuse before any function is patched');
alter policy "wall public read" on public.gematria_wall using (true);
-- with every drift reverted the three files apply
\i supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql
\i supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql
\i supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql
select public.m0a_assert(not has_table_privilege('anon', 'public.words', 'INSERT') and not has_function_privilege('anon', 'public.wa_msg_count(uuid)', 'EXECUTE')
  and (select qual from pg_policies where tablename = 'page_content' and policyname = 'auth_write') like '%rd_is_admin%', 'guard: with the drift reverted the same files apply');
-- a later change after the apply: the rollbacks refuse (and change nothing)
grant select on public.lab_notes to anon;
\set ON_ERROR_STOP off
\i supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql
\set ON_ERROR_STOP on
select public.m0a_assert(exists (select 1 from pg_policies where tablename = 'lab_notes' and policyname = 'lab_notes_admin_read') and not has_table_privilege('anon', 'public.words', 'INSERT'),
  'guard step 5 rollback: a later grant makes the rollback refuse; the applied state stays');
revoke select on public.lab_notes from anon;
alter policy admin_all on public.trails using (true) with check (true);
\set ON_ERROR_STOP off
\i supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql
\set ON_ERROR_STOP on
select public.m0a_assert((select qual from pg_policies where tablename = 'page_content' and policyname = 'auth_write') like '%rd_is_admin%',
  'guard step 6 rollback: a later policy edit makes the rollback refuse; the applied state stays');
alter policy admin_all on public.trails using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));
create temp table wall_saved as select pg_get_expr(polqual, polrelid) as q from pg_policy where polrelid = 'public.gematria_wall'::regclass and polname = 'wall public read';
alter policy "wall public read" on public.gematria_wall using (true and true);
\set ON_ERROR_STOP off
\i supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql
\set ON_ERROR_STOP on
select public.m0a_assert(md5(pg_get_functiondef('public.admin_ai_cost(integer)'::regprocedure)) = 'd33b0bfbaf9d1f39177333bef3024b9f',
  'guard step 4 rollback: a later wall-policy edit makes the rollback refuse; the patched function stays');
do $$ declare v text; begin select w.q into v from wall_saved w; execute format('alter policy "wall public read" on public.gematria_wall using (%s)', v); end $$;
-- the unchanged applied state rolls back exactly (reverse order), and the catalogue equals the starting snapshot
\i supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql
\i supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql
\i supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql
select public.m0a_snapshot('guards_end');
do $$
declare diff text;
begin
  select string_agg(coalesce(b.k, a.k) || ' before=' || coalesce(b.v, '∅') || ' after=' || coalesce(a.v, '∅'), E'\n') into diff
  from (select * from public.m0a_snap where tag = 'before') b
  full join (select * from public.m0a_snap where tag = 'guards_end') a on a.k = b.k
  where b.v is distinct from a.v;
  if diff is not null then raise exception E'M0-A TEST FAILED: after the guard cases the rollbacks are not exact:\n%', diff; end if;
end $$;

\o
\echo 'M0-A permissions regression: ALL PASS'
