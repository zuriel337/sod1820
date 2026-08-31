-- Command Center vNext — compatibility bridge with legacy WarRoom handled markers.
-- No new store/table. Reuses research_items(bucket='handled').
-- Legacy WarRoom keys: ch:<id> channel, r:<id> research_object, c:<id> comment, w:<id> whatsapp.

create or replace function public.admin_attention_feed_v2(
  p_include_handled boolean default false,
  p_limit integer default 1600
)
returns table(
  attention_key text, source_type text, source_ref text, source_group text,
  actor_name text, title text, body text, context_label text, context_ref text,
  created_at timestamptz, status text, handled boolean, available_actions jsonb, metadata jsonb
)
language sql stable security definer set search_path=public as $$
with base as (
  select f.*,
    row_number() over(partition by f.source_type order by f.created_at desc, f.source_ref desc) as source_rank,
    case f.source_type
      when 'channel' then 'ch:'||f.source_ref
      when 'research_object' then 'r:'||f.source_ref
      when 'comment' then 'c:'||f.source_ref
      when 'whatsapp' then 'w:'||f.source_ref
      else null
    end as legacy_ref
  from public.admin_attention_feed_v1(true, 2000) f
), marked as (
  select b.*,
    (
      exists(select 1 from public.research_items i
        where i.user_id=auth.uid() and i.bucket='handled'
          and i.entity_type=b.source_type and i.entity_ref=b.source_ref)
      or (b.legacy_ref is not null and exists(select 1 from public.research_items i
        where i.user_id=auth.uid() and i.bucket='handled'
          and i.entity_type='cc_handled' and i.entity_ref=b.legacy_ref))
    ) as handled_v2,
    case
      when b.source_type in ('comment','community_hint','els','research_contribution') then true
      when b.source_type in ('contact','direct_message') and b.status in ('new','pending') then true
      when b.source_type='research_object' and b.source_rank <= 200 then true
      when b.source_type='channel' and b.source_rank <= 60 then true
      when b.source_type='whatsapp' and b.source_rank <= 20 and coalesce(b.metadata->>'reply_out','')='' then true
      else false
    end as needs_human
  from base b
)
select attention_key,source_type,source_ref,source_group,actor_name,title,body,context_label,context_ref,
       created_at,status,handled_v2,available_actions,
       coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
         'needs_human',needs_human,
         'source_rank',source_rank,
         'legacy_handled_compatible',legacy_ref is not null
       ) as metadata
from marked
where p_include_handled or not handled_v2
order by created_at desc
limit greatest(1,least(coalesce(p_limit,1600),2000));
$$;

create or replace function public.admin_attention_handle_bulk_v2(
  p_items jsonb,
  p_reason text default 'טופל במפקדה'
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_item jsonb;
  v_count int:=0;
  v_type text;
  v_ref text;
  v_entity_type text;
  v_entity_ref text;
begin
  if not exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin') then
    return jsonb_build_object('ok',false,'error','not_admin');
  end if;
  if jsonb_typeof(p_items)<>'array' then
    return jsonb_build_object('ok',false,'error','items_must_be_array');
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_type:=coalesce(v_item->>'source_type','');
    v_ref:=coalesce(v_item->>'source_ref','');
    if v_type='' or v_ref='' then continue; end if;

    if v_type='channel' then v_entity_type:='cc_handled'; v_entity_ref:='ch:'||v_ref;
    elsif v_type='research_object' then v_entity_type:='cc_handled'; v_entity_ref:='r:'||v_ref;
    elsif v_type='comment' then v_entity_type:='cc_handled'; v_entity_ref:='c:'||v_ref;
    elsif v_type='whatsapp' then v_entity_type:='cc_handled'; v_entity_ref:='w:'||v_ref;
    else v_entity_type:=v_type; v_entity_ref:=v_ref;
    end if;

    insert into public.research_items(user_id,bucket,entity_type,entity_ref,title,link,metadata)
    values(
      auth.uid(),'handled',v_entity_type,v_entity_ref,
      nullif(v_item->>'title',''),nullif(v_item->>'context_ref',''),
      jsonb_build_object(
        'reason',coalesce(p_reason,'טופל במפקדה'),'at',now(),'actor','ZURIEL',
        'source_group',v_item->>'source_group','actor_name',v_item->>'actor_name',
        'body_excerpt',left(coalesce(v_item->>'body',''),300),
        'vnext_source_type',v_type,'vnext_source_ref',v_ref
      )
    )
    on conflict(user_id,bucket,entity_type,entity_ref) do update
      set metadata=coalesce(research_items.metadata,'{}'::jsonb)||excluded.metadata,
          title=coalesce(excluded.title,research_items.title),
          link=coalesce(excluded.link,research_items.link);
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('ok',true,'handled',v_count);
end $$;

create or replace function public.admin_attention_unhandle_v2(p_source_type text,p_source_ref text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_legacy text;
begin
  if not exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin') then
    return jsonb_build_object('ok',false,'error','not_admin');
  end if;

  if p_source_type='channel' then v_legacy:='ch:'||p_source_ref;
  elsif p_source_type='research_object' then v_legacy:='r:'||p_source_ref;
  elsif p_source_type='comment' then v_legacy:='c:'||p_source_ref;
  elsif p_source_type='whatsapp' then v_legacy:='w:'||p_source_ref;
  elsif p_source_type='cc_handled' then v_legacy:=p_source_ref;
  else v_legacy:=null;
  end if;

  delete from public.research_items
  where user_id=auth.uid() and bucket='handled'
    and (
      (entity_type=p_source_type and entity_ref=p_source_ref)
      or (v_legacy is not null and entity_type='cc_handled' and entity_ref=v_legacy)
      or (entity_type=p_source_type and metadata->>'vnext_source_ref'=p_source_ref)
    );
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.admin_attention_history_v2(p_limit integer default 200)
returns table(id uuid,source_type text,source_ref text,title text,context_ref text,metadata jsonb,created_at timestamptz)
language sql stable security definer set search_path=public as $$
with src as (
  select i.*,
    case
      when i.entity_type='cc_handled' and i.entity_ref like 'ch:%' then 'channel'
      when i.entity_type='cc_handled' and i.entity_ref like 'r:%' then 'research_object'
      when i.entity_type='cc_handled' and i.entity_ref like 'c:%' then 'comment'
      when i.entity_type='cc_handled' and i.entity_ref like 'w:%' then 'whatsapp'
      else i.entity_type
    end as canonical_type,
    case
      when i.entity_type='cc_handled' and i.entity_ref ~ '^(ch|r|c|w):' then split_part(i.entity_ref,':',2)
      else i.entity_ref
    end as canonical_ref
  from public.research_items i
  where i.user_id=auth.uid() and i.bucket='handled'
    and exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin')
), ranked as (
  select s.*, row_number() over(
    partition by canonical_type,canonical_ref
    order by coalesce((s.metadata->>'at')::timestamptz,s.created_at) desc,s.created_at desc
  ) rn
  from src s
)
select id,canonical_type,canonical_ref,title,link,
       coalesce(metadata,'{}'::jsonb)||jsonb_build_object('legacy_entity_type',entity_type,'legacy_entity_ref',entity_ref),
       created_at
from ranked where rn=1
order by coalesce((metadata->>'at')::timestamptz,created_at) desc
limit greatest(1,least(coalesce(p_limit,200),500));
$$;

revoke all on function public.admin_attention_feed_v2(boolean,integer) from public;
revoke all on function public.admin_attention_handle_bulk_v2(jsonb,text) from public;
revoke all on function public.admin_attention_unhandle_v2(text,text) from public;
revoke all on function public.admin_attention_history_v2(integer) from public;
grant execute on function public.admin_attention_feed_v2(boolean,integer) to authenticated;
grant execute on function public.admin_attention_handle_bulk_v2(jsonb,text) to authenticated;
grant execute on function public.admin_attention_unhandle_v2(text,text) to authenticated;
grant execute on function public.admin_attention_history_v2(integer) to authenticated;
