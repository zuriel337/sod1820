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
