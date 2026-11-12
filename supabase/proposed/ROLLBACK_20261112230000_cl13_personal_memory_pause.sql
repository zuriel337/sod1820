-- ROLLBACK of 20261112230000_cl13_personal_memory_pause.sql - PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Restores the live 12.11.2026 state exactly: the five function bodies (their md5 values are pinned below), no trigger on
-- public.agent_user_memory, and none of the nine new functions. Full-match guards, FAIL-CLOSED: the file continues ONLY when the
-- state is exactly AFTER (then restored) or exactly BEFORE (already rolled back; a no-op). A missing table, a missing function,
-- a missing or DISABLED trigger and any other body all stop it before anything changes.
-- What it brings back: personal memory is written again on every message and old memory is read without consent. Do not run it
-- while the Edge functions of this branch are deployed without deciding that first.
-- Not undone: rows that people erased with the erasure functions stay erased.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table cl13_before on commit drop as
  select p.proname, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid in (to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)'), to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)'), to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)'), to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)'), to_regprocedure('public.fn_raziel_context(text,text)'));

do $$
declare v_state text;
  c_before constant text := 'fn_personal_memory_policy_v1=(missing) | fn_personal_memory_is_research_output_v1=(missing) | fn_personal_memory_write_guard_v1=(missing) | fn_raziel_remember=5598acf902200444827efe54305466e1 | fn_raziel_fact=ebd32bd78f3d6e6af11132c9533a2834 | fn_raziel_upsert_summary=85f60b9a552c5c03d01955dec113156a | fn_mem_add=6a26f9e5d1a05fd6c3fc25b8179951b7 | fn_raziel_context=56ffd0cfc5e29945e56044439a01f81e | fn_personal_memory_refs_v1=(missing) | fn_personal_memory_sender_refs_v1=(missing) | export_my_personal_memory=(missing) | erase_my_personal_memory=(missing) | fn_personal_memory_export=(missing) | fn_personal_memory_erase=(missing) | trigger=(missing) | other_triggers=0';
  c_after constant text := 'fn_personal_memory_policy_v1=473a942f9890a360b3b4641a69bc461a | fn_personal_memory_is_research_output_v1=07be6e8f5bd24db2a2fa79862a6c4d30 | fn_personal_memory_write_guard_v1=e09a70f39516cc7824a5de107d67a7d0 | fn_raziel_remember=5376c5c1d3253578db401be5ad67f4f1 | fn_raziel_fact=468a7a6980890b5db87fdd62870aa5c2 | fn_raziel_upsert_summary=0179dfe9830d631e782001dad63ef15e | fn_mem_add=8d1f5271d5ababe492e92816f2f2b94e | fn_raziel_context=6b92c8daafb6619269f021f49101497b | fn_personal_memory_refs_v1=8ef502be78cdd85ee3300eb6e484a28e | fn_personal_memory_sender_refs_v1=e61a31defa02ff6e716c413c9d54e21a | export_my_personal_memory=ce0be8394a059e093b77250a5c47e3af | erase_my_personal_memory=c161d38374a5faeb68e17284f275847b | fn_personal_memory_export=0a676c24ff3fc2f7630a897a7a9e45d5 | fn_personal_memory_erase=38c8ca85ab562a780e256337b05132b7 | trigger=CREATE TRIGGER trg_personal_memory_pause_v1 BEFORE INSERT OR UPDATE ON public.agent_user_memory FOR EACH ROW EXECUTE FUNCTION fn_personal_memory_write_guard_v1() [enabled=O] | other_triggers=0';
begin
  if to_regclass('public.agent_user_memory') is null then raise exception 'CL13 rollback: public.agent_user_memory not found; stop, nothing changed'; end if;
  v_state := 'fn_personal_memory_policy_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_policy_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_is_research_output_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_is_research_output_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_write_guard_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_write_guard_v1()')), '(missing)')
    || ' | ' || 'fn_raziel_remember=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_raziel_fact=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)')), '(missing)')
    || ' | ' || 'fn_raziel_upsert_summary=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_mem_add=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)')), '(missing)')
    || ' | ' || 'fn_raziel_context=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_context(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_refs_v1(uuid)')), '(missing)')
    || ' | ' || 'fn_personal_memory_sender_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_sender_refs_v1(text)')), '(missing)')
    || ' | ' || 'export_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.export_my_personal_memory()')), '(missing)')
    || ' | ' || 'erase_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.erase_my_personal_memory(boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_export=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_export(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_erase=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_erase(text,boolean)')), '(missing)')
    || ' | trigger=' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t
         where t.tgrelid = 'public.agent_user_memory'::regclass and t.tgname = 'trg_personal_memory_pause_v1' and not t.tgisinternal), '(missing)')
    || ' | other_triggers=' || (select count(*) from pg_trigger t where t.tgrelid = 'public.agent_user_memory'::regclass and not t.tgisinternal and t.tgname <> 'trg_personal_memory_pause_v1');
  if v_state = c_before then
    raise notice 'CL13 rollback: already the live 12.11.2026 state (no-op)';
  elsif v_state = c_after then
    null; -- exactly the applied state: restore
  else
    raise exception 'CL13 rollback drift: the state is neither the applied state nor the live 12.11.2026 state; stop, nothing changed. State: %', v_state;
  end if;
end $$;

DROP TRIGGER IF EXISTS trg_personal_memory_pause_v1 ON public.agent_user_memory;

CREATE OR REPLACE FUNCTION public.fn_raziel_remember(p_user_ref text, p_channel text, p_content text, p_memory_type text DEFAULT 'conversation'::text, p_scope text DEFAULT 'personal'::text, p_topic text DEFAULT NULL::text, p_visibility text DEFAULT 'private'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if coalesce(p_user_ref,'')='' or coalesce(p_content,'')='' then return null; end if;
  insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,topic,content,visibility,source,status)
  values (p_user_ref,p_channel,'raziel',p_memory_type,p_scope,p_topic,left(p_content,4000),p_visibility,'wa','private')
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_fact(p_user_ref text, p_channel text, p_kind text, p_value text, p_data jsonb DEFAULT '{}'::jsonb, p_visibility text DEFAULT 'private'::text, p_confidence smallint DEFAULT 3)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_merged jsonb;
begin
  if coalesce(p_user_ref,'')='' or coalesce(p_kind,'')='' or coalesce(p_value,'')='' then return null; end if;
  if p_visibility not in ('private','team','public') then p_visibility := 'private'; end if;
  v_merged := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('kind',p_kind,'value',p_value);
  update agent_user_memory
     set content=left(p_value,4000), data=v_merged, visibility=p_visibility,
         confidence=p_confidence, updated_at=now()
   where user_ref=p_user_ref and agent='raziel' and memory_type='personal_context'
     and source='profile' and topic=p_kind
   returning id into v_id;
  if v_id is not null then return v_id; end if;
  insert into agent_user_memory
    (user_ref,channel,agent,memory_type,memory_scope,topic,content,data,visibility,source,status,confidence)
  values
    (p_user_ref,p_channel,'raziel','personal_context','personal',p_kind,left(p_value,4000),
     v_merged,p_visibility,'profile','private',p_confidence)
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_upsert_summary(p_user_ref text, p_channel text, p_scope text, p_summary text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_scope='channel' then
    update agent_user_memory set content=left(p_summary,4000), updated_at=now()
      where agent='raziel' and memory_type='summary' and memory_scope='channel' and channel=p_channel;
    if not found then
      insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,content,visibility,source,status)
      values (coalesce(p_user_ref,'channel:'||p_channel),p_channel,'raziel','summary','channel',left(p_summary,4000),'private','ai','private');
    end if;
  else
    update agent_user_memory set content=left(p_summary,4000), updated_at=now()
      where agent='raziel' and memory_type='summary' and memory_scope='personal' and user_ref=p_user_ref;
    if not found then
      insert into agent_user_memory (user_ref,channel,agent,memory_type,memory_scope,content,visibility,source,status)
      values (p_user_ref,p_channel,'raziel','summary','personal',left(p_summary,4000),'private','ai','private');
    end if;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_mem_add(p_user text, p_agent text, p_memory_type text, p_content text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_visibility text DEFAULT 'private'::text, p_status text DEFAULT 'private'::text, p_source text DEFAULT 'wa'::text, p_confidence smallint DEFAULT NULL::smallint, p_channel text DEFAULT 'wa'::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v uuid;
begin
  insert into public.agent_user_memory(user_ref,channel,agent,memory_type,topic,content,data,source,confidence,visibility,status)
  values (p_user, coalesce(p_channel,'wa'), p_agent,
    case when p_memory_type in ('conversation','personal_context','research_note','method_discovery','preference') then p_memory_type else 'research_note' end,
    p_topic, p_content, coalesce(p_data,'{}'::jsonb), coalesce(p_source,'wa'), p_confidence,
    case when p_visibility in ('private','team','public') then p_visibility else 'private' end,
    case when p_status in ('private','candidate','review','approved','canonical') then p_status else 'private' end)
  returning id into v; return v;
end $function$;

CREATE OR REPLACE FUNCTION public.fn_raziel_context(p_user_ref text, p_channel text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_group boolean := coalesce(p_channel,'') like '%@g.us';
  v_user jsonb; v_chan jsonb;
  v_refs text[];
  v_recent text;
  v_real_summary text;
begin
  if v_is_group or p_user_ref is null then
    v_user := jsonb_build_object('approved_preferences','[]'::jsonb,'research_threads','[]'::jsonb,'summary',null,'profile','[]'::jsonb,'recent_conversation','[]'::jsonb);
  else
    -- 🌉 גשר-זהות: איחוד אתר(UUID)↔וואטסאפ(טלפון) דרך wa_account_links
    select coalesce(array_agg(distinct r) filter (where r is not null), array[p_user_ref]) into v_refs from (
      select p_user_ref as r
      union select phone::text from wa_account_links where user_id::text = p_user_ref
      union select user_id::text from wa_account_links where phone = p_user_ref
    ) x;

    -- 🧠 שיחות אחרונות גולמיות (אתר+וואטסאפ יחד) — התיקון: רזיאל זוכר את השיחה בפועל,
    --    לא רק «סיכום» (source='summary') שנוצר בתהליך-רקע. עד 10 האחרונות.
    select string_agg(content, ' · ') into v_recent from (
      select content from agent_user_memory
      where user_ref = any(v_refs) and agent='raziel'
        and memory_type='conversation' and memory_scope='personal'
      order by created_at desc limit 10) t;

    v_real_summary := (select content from agent_user_memory where user_ref = any(v_refs) and agent='raziel'
        and memory_type='conversation' and memory_scope='personal' and source='summary' order by updated_at desc limit 1);

    v_user := jsonb_build_object(
      'approved_preferences', coalesce((select jsonb_agg(content order by updated_at desc) from agent_user_memory
         where user_ref = any(v_refs) and agent='raziel' and memory_type='preference'
           and visibility in ('team','public')),'[]'::jsonb),
      'research_threads', coalesce((select jsonb_agg(content) from (
         select content from agent_user_memory where user_ref = any(v_refs) and agent='raziel'
           and memory_type in ('research_note','method_discovery') order by updated_at desc limit 8) t),'[]'::jsonb),
      -- summary = סיכום-אמת אם קיים, אחרת דיג'סט מהשיחות האחרונות (כדי שרזיאל תמיד «יזכור»)
      'summary', coalesce(v_real_summary,
         case when v_recent is not null then 'שיחות אחרונות (אתר+וואטסאפ): ' || v_recent else null end),
      'recent_conversation', coalesce((select jsonb_agg(content) from (
         select content from agent_user_memory where user_ref = any(v_refs) and agent='raziel'
           and memory_type='conversation' and memory_scope='personal' order by created_at desc limit 10) t),'[]'::jsonb),
      'profile', coalesce((select jsonb_agg(jsonb_build_object('kind',topic,'value',content) order by updated_at desc)
           from agent_user_memory where user_ref = any(v_refs) and agent='raziel'
             and memory_type='personal_context' and source='profile'),'[]'::jsonb));
  end if;
  v_chan := jsonb_build_object(
    'topic_summary', null,
    'recent_group_topics', coalesce((select jsonb_agg(topic) from (
         select distinct topic from agent_user_memory where channel=p_channel and agent='raziel'
           and memory_scope='channel' and topic is not null limit 10) t),'[]'::jsonb));
  return jsonb_build_object('user_context',v_user,'channel_context',v_chan,
    'privacy', jsonb_build_object('personal_memory_allowed', not v_is_group and p_user_ref is not null));
end $function$;

DROP FUNCTION IF EXISTS public.fn_personal_memory_erase(text,boolean);
DROP FUNCTION IF EXISTS public.fn_personal_memory_export(text);
DROP FUNCTION IF EXISTS public.erase_my_personal_memory(boolean);
DROP FUNCTION IF EXISTS public.export_my_personal_memory();
DROP FUNCTION IF EXISTS public.fn_personal_memory_sender_refs_v1(text);
DROP FUNCTION IF EXISTS public.fn_personal_memory_refs_v1(uuid);
DROP FUNCTION IF EXISTS public.fn_personal_memory_write_guard_v1();
DROP FUNCTION IF EXISTS public.fn_personal_memory_is_research_output_v1(text,text);
DROP FUNCTION IF EXISTS public.fn_personal_memory_policy_v1(text);

do $$
declare v_state text;
  c_before constant text := 'fn_personal_memory_policy_v1=(missing) | fn_personal_memory_is_research_output_v1=(missing) | fn_personal_memory_write_guard_v1=(missing) | fn_raziel_remember=5598acf902200444827efe54305466e1 | fn_raziel_fact=ebd32bd78f3d6e6af11132c9533a2834 | fn_raziel_upsert_summary=85f60b9a552c5c03d01955dec113156a | fn_mem_add=6a26f9e5d1a05fd6c3fc25b8179951b7 | fn_raziel_context=56ffd0cfc5e29945e56044439a01f81e | fn_personal_memory_refs_v1=(missing) | fn_personal_memory_sender_refs_v1=(missing) | export_my_personal_memory=(missing) | erase_my_personal_memory=(missing) | fn_personal_memory_export=(missing) | fn_personal_memory_erase=(missing) | trigger=(missing) | other_triggers=0';
begin
  v_state := 'fn_personal_memory_policy_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_policy_v1(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_is_research_output_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_is_research_output_v1(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_write_guard_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_write_guard_v1()')), '(missing)')
    || ' | ' || 'fn_raziel_remember=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_remember(text,text,text,text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_raziel_fact=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_fact(text,text,text,text,jsonb,text,smallint)')), '(missing)')
    || ' | ' || 'fn_raziel_upsert_summary=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_upsert_summary(text,text,text,text)')), '(missing)')
    || ' | ' || 'fn_mem_add=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_mem_add(text,text,text,text,text,text,text,text,smallint,text,jsonb)')), '(missing)')
    || ' | ' || 'fn_raziel_context=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_raziel_context(text,text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_refs_v1(uuid)')), '(missing)')
    || ' | ' || 'fn_personal_memory_sender_refs_v1=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_sender_refs_v1(text)')), '(missing)')
    || ' | ' || 'export_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.export_my_personal_memory()')), '(missing)')
    || ' | ' || 'erase_my_personal_memory=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.erase_my_personal_memory(boolean)')), '(missing)')
    || ' | ' || 'fn_personal_memory_export=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_export(text)')), '(missing)')
    || ' | ' || 'fn_personal_memory_erase=' || coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_personal_memory_erase(text,boolean)')), '(missing)')
    || ' | trigger=' || coalesce((select pg_get_triggerdef(t.oid) || ' [enabled=' || t.tgenabled::text || ']' from pg_trigger t
         where t.tgrelid = 'public.agent_user_memory'::regclass and t.tgname = 'trg_personal_memory_pause_v1' and not t.tgisinternal), '(missing)')
    || ' | other_triggers=' || (select count(*) from pg_trigger t where t.tgrelid = 'public.agent_user_memory'::regclass and not t.tgisinternal and t.tgname <> 'trg_personal_memory_pause_v1');
  if v_state is distinct from c_before then raise exception 'CL13 rollback postcondition: the state is not exactly the live 12.11.2026 one: %', v_state; end if;
  if exists (select 1 from cl13_before b join pg_proc p on p.proname = b.proname and p.pronamespace = 'public'::regnamespace
              where p.proowner <> b.proowner or p.proacl::text is distinct from b.acl or p.prosecdef <> b.prosecdef
                 or p.proconfig is distinct from b.proconfig or p.provolatile <> b.provolatile) then
    raise exception 'CL13 rollback postcondition: owner, privileges, SECURITY DEFINER, search_path or volatility of a replaced function changed';
  end if;
end $$;

commit;
