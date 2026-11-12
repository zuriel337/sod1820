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
