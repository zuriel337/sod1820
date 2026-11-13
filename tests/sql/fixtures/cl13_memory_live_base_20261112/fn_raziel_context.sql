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
