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
