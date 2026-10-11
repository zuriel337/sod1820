-- EXTEND_EXISTING: private user-declared observations in Research OS, not canonical Events.
-- Branch-only preparation. No new tables, RLS changes, direct table grants or truth promotion.
-- Life-event source refs MUST NOT start with person: (fn_list_family reads that namespace).
begin;

-- An explicit analysis input boundary; fn_list_family is a display reader, not eligibility proof.
create or replace function public.fn_person_life_input_v1(p_owner uuid,p_person_ref text,p_purpose text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare u uuid:=auth.uid(); r public.research_objects; v_first text; v_last text; v_person jsonb;
begin
  if u is null or not exists(select 1 from public.persons where person_id=p_owner and account_user_id=u) then
    raise exception 'LIFE_OWNER_REQUIRED' using errcode='42501';
  end if;
  if p_purpose is null or p_purpose not in ('research','date_cross','word_reflection')
    or p_person_ref is null or length(p_person_ref)>240
    or p_person_ref !~ ('^person:'||p_owner::text||':(self|p:.+)$')
    or (p_purpose='word_reflection' and p_person_ref<>'person:'||p_owner::text||':self') then
    raise exception 'LIFE_ANALYSIS_SCOPE_INVALID' using errcode='42501';
  end if;
  select * into r from public.research_objects where owner_person_id=p_owner and source_ref=p_person_ref
    and kind='observation' order by created_at desc,id desc limit 1;
  if not found or r.privacy_scope<>'private' or r.status<>'candidate' or btrim(r.statement)='' then raise exception 'LIFE_PERSON_UNAVAILABLE' using errcode='42501'; end if;
  v_first:=coalesce(nullif(btrim(r.meta->>'first_name'),''),split_part(btrim(r.statement),' ',1));
  v_last:=coalesce(nullif(btrim(r.meta->>'surname'),''),nullif(btrim(substr(btrim(r.statement),length(split_part(btrim(r.statement),' ',1))+1)),''));
  v_person:=jsonb_build_object('ref',p_person_ref,'first',v_first);
  if p_purpose<>'word_reflection' then v_person:=v_person||jsonb_build_object('name',r.statement,'surname',v_last); end if;
  if p_purpose='research' then v_person:=v_person||jsonb_build_object('birthdate',r.meta->>'birthdate_iso'); end if;
  return jsonb_build_object('ok',true,'person',v_person,'record_id',r.id,'purpose',p_purpose);
end $$;
revoke all on function public.fn_person_life_input_v1(uuid,text,text) from public,anon;
grant execute on function public.fn_person_life_input_v1(uuid,text,text) to authenticated;

create or replace function public.fn_person_life_event_record_v1(
  p_owner uuid, p_event_id uuid, p_request_id uuid, p_expected_revision integer,
  p_title text, p_occurred_on date, p_person_ref text, p_notes text default ''
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u uuid := auth.uid(); v_input jsonb; v_existing public.research_objects;
  v_latest public.research_objects; v_row public.research_objects; v_revision integer;
  v_prefix text; v_title text := btrim(p_title); v_notes text := coalesce(p_notes,'');
begin
  if u is null or not exists(select 1 from public.persons where person_id=p_owner and account_user_id=u) then
    raise exception 'LIFE_OWNER_REQUIRED' using errcode='42501';
  end if;
  if p_event_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision<0
     or v_title is null or length(v_title) not between 1 and 160 or length(v_notes)>2000
     or (p_occurred_on is not null and (not isfinite(p_occurred_on) or extract(year from p_occurred_on) not between 1 and 9999)) then
    raise exception 'LIFE_EVENT_INVALID_INPUT' using errcode='22023';
  end if;
  if p_person_ref is null or length(p_person_ref)>240 or p_person_ref !~ ('^person:'||p_owner::text||':(self|p:.+)$')
     or not exists(select 1 from (select privacy_scope,status from public.research_objects where owner_person_id=p_owner
       and source_ref=p_person_ref and kind='observation' order by created_at desc,id desc limit 1) latest
       where latest.privacy_scope='private' and latest.status='candidate') then
    raise exception 'LIFE_PERSON_UNAVAILABLE' using errcode='42501';
  end if;
  v_input := jsonb_build_object('title',v_title,'occurred_on',p_occurred_on,
    'date_precision',case when p_occurred_on is null then 'unknown' else 'day' end,
    'timezone',null,'person_ref',p_person_ref,'role','subject','notes',v_notes);
  v_prefix := 'life_event:'||p_owner::text||':'||p_event_id::text||':';
  perform pg_advisory_xact_lock(hashtextextended(v_prefix,0));
  select * into v_existing from public.research_objects
    where owner_person_id=p_owner and source='person_life_event_input'
      and source_ref=v_prefix||p_request_id::text order by created_at,id limit 1;
  if found then
    if v_existing.privacy_scope<>'private' or v_existing.status<>'candidate'
       or v_existing.meta#>'{ext,life_event,input}' is distinct from v_input then
      raise exception 'LIFE_EVENT_REQUEST_CONFLICT' using errcode='22023';
    end if;
    return jsonb_build_object('ok',true,'replayed',true,'record_id',v_existing.id,'event_id',p_event_id,
      'revision',(v_existing.meta#>>'{ext,life_event,revision}')::integer);
  end if;
  select * into v_latest from public.research_objects
    where owner_person_id=p_owner and source='person_life_event_input'
      and starts_with(source_ref,v_prefix)
    order by (meta#>>'{ext,life_event,revision}')::integer desc,id desc limit 1;
  v_revision := coalesce((v_latest.meta#>>'{ext,life_event,revision}')::integer,0);
  if v_revision<>p_expected_revision then
    return jsonb_build_object('ok',false,'error','revision_conflict','revision',v_revision);
  end if;
  if v_latest.id is not null and (v_latest.privacy_scope<>'private' or v_latest.status<>'candidate') then
    raise exception 'LIFE_EVENT_GOVERNED_SUCCESSOR_REQUIRED' using errcode='42501';
  end if;
  insert into public.research_objects(kind,statement,source,source_ref,contributor,
    owner_person_id,privacy_scope,status,engine_verified,parent_id,meta)
  values('observation',v_title,'person_life_event_input',v_prefix||p_request_id::text,u::text,
    p_owner,'private','candidate',false,v_latest.id,
    jsonb_build_object('ext',jsonb_build_object('life_event',jsonb_build_object(
      'version','life-event-observation-v1','event_id',p_event_id,'revision',v_revision+1,
      'request_id',p_request_id,'supersedes_record_id',v_latest.id,'input',v_input,
      'recorded_by',u,'recorded_at',now(),'declaration','user_reported',
      'participation','explicit_run_only','analysis','explicit_run_only',
      'canonical_event_id',null,'published',false)))) returning * into v_row;
  return jsonb_build_object('ok',true,'replayed',false,'record_id',v_row.id,'event_id',p_event_id,'revision',v_revision+1);
end $$;

create or replace function public.fn_person_life_events_v1(
  p_owner uuid, p_event_id uuid default null, p_limit integer default 20,
  p_before_at timestamptz default null, p_before_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare u uuid:=auth.uid(); v_rows jsonb; v_limit integer:=least(greatest(coalesce(p_limit,20),1),50);
begin
  if u is null or not exists(select 1 from public.persons where person_id=p_owner and account_user_id=u) then
    raise exception 'LIFE_OWNER_REQUIRED' using errcode='42501';
  end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'LIFE_CURSOR_INVALID' using errcode='22023'; end if;
  with latest as (
    select distinct on (meta#>>'{ext,life_event,event_id}') r.* from public.research_objects r
    where owner_person_id=p_owner and source='person_life_event_input'
      and starts_with(source_ref,'life_event:'||p_owner::text||':')
      and meta#>>'{ext,life_event,version}'='life-event-observation-v1'
      and (p_event_id is null or meta#>>'{ext,life_event,event_id}'=p_event_id::text)
    order by meta#>>'{ext,life_event,event_id}',(meta#>>'{ext,life_event,revision}')::integer desc,id desc
  ), page as (
    select * from latest where privacy_scope='private' and status='candidate'
      and (p_before_at is null or (created_at,id)<(p_before_at,p_before_id))
    order by created_at desc,id desc limit v_limit+1
  ) select coalesce(jsonb_agg(jsonb_build_object('record_id',id,'recorded_at',created_at,
      'event_id',meta#>>'{ext,life_event,event_id}','revision',(meta#>>'{ext,life_event,revision}')::integer,
      'input',meta#>'{ext,life_event,input}','declaration','user_reported') order by created_at desc,id desc),'[]'::jsonb)
    into v_rows from page;
  return jsonb_build_object('ok',true,'items',v_rows,'page_size',v_limit,'has_more',jsonb_array_length(v_rows)>v_limit);
end $$;

create or replace function public.fn_person_life_paths_v1(
  p_owner uuid, p_limit integer default 20, p_before_at timestamptz default null, p_before_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare u uuid:=auth.uid(); v_rows jsonb; v_limit integer:=least(greatest(coalesce(p_limit,20),1),50);
begin
  if u is null or not exists(select 1 from public.persons where person_id=p_owner and account_user_id=u) then
    raise exception 'LIFE_OWNER_REQUIRED' using errcode='42501';
  end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'LIFE_CURSOR_INVALID' using errcode='22023'; end if;
  with snapshots as (
    select p.id, r.created_at, r.revision_no, r.representation#>>'{context,dimensions,lifePersonRef}' as person_ref
    from public.research_paths p cross join lateral (
      select x.* from public.research_path_revisions x where x.path_id=p.id and x.created_by_user_id=u
      order by x.revision_no desc limit 1
    ) r where p.created_by_user_id=u
      and starts_with(r.representation#>>'{context,dimensions,lifePersonRef}','person:'||p_owner::text||':')
  ), page as (
    select * from snapshots where p_before_at is null or (created_at,id)<(p_before_at,p_before_id)
    order by created_at desc,id desc limit v_limit+1
  ) select coalesce(jsonb_agg(jsonb_build_object('path_id',id,'updated_at',created_at,
    'revision',revision_no,'person_ref',person_ref,'label','מסע חיים פרטי') order by created_at desc,id desc),'[]'::jsonb)
    into v_rows from page;
  return jsonb_build_object('ok',true,'items',v_rows,'page_size',v_limit,'has_more',jsonb_array_length(v_rows)>v_limit);
end $$;

revoke all on function public.fn_person_life_event_record_v1(uuid,uuid,uuid,integer,text,date,text,text) from public,anon;
revoke all on function public.fn_person_life_events_v1(uuid,uuid,integer,timestamptz,uuid) from public,anon;
revoke all on function public.fn_person_life_paths_v1(uuid,integer,timestamptz,uuid) from public,anon;
grant execute on function public.fn_person_life_event_record_v1(uuid,uuid,uuid,integer,text,date,text,text) to authenticated;
grant execute on function public.fn_person_life_events_v1(uuid,uuid,integer,timestamptz,uuid) to authenticated;
grant execute on function public.fn_person_life_paths_v1(uuid,integer,timestamptz,uuid) to authenticated;
comment on function public.fn_person_life_event_record_v1(uuid,uuid,uuid,integer,text,date,text,text) is 'Private self-owned user declarations in existing Research OS. Append-only correction snapshots; no canonical Event, engine truth or publication.';
commit;
