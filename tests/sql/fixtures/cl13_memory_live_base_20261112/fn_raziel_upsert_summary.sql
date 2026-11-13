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
