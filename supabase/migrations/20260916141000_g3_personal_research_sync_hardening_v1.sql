-- G3_PERSONAL_RESEARCH_SYNC_HARDENING_V1 — BRANCH ONLY until explicit release.
-- Same Research OS / same two tables / original owner-RLS policies and content identity preserved.
-- Operational revision + last 128 batch receipts live INSIDE existing user_research.data.
-- A receipt-expired stale request conflicts; it is never silently replayed or rebased.
begin;

create or replace function public.research_state_snapshot_v1(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  u uuid := auth.uid(); d jsonb; items jsonb; result jsonb;
begin
  if u is null or p_expected_user_id is distinct from u then
    raise exception 'RESEARCH_PRINCIPAL_MISMATCH' using errcode = '42501';
  end if;
  -- Same lock as apply, including the first-write/no-user_research-row case.
  perform pg_advisory_xact_lock(hashtextextended('research-sync:' || u::text, 0));
  select data into d from public.user_research where user_id=u;
  d := coalesce(d, '{}'::jsonb);
  if jsonb_typeof(d) is distinct from 'object' then
    raise exception 'RESEARCH_STORED_STATE_INVALID' using errcode='22023';
  end if;
  result := jsonb_build_object('revision',coalesce((d#>>'{_research_sync_v1,revision}')::bigint,0),
    'history',coalesce(d->'history','[]'::jsonb),'collections',coalesce(d->'collections','[]'::jsonb),
    'journeys',coalesce(d->'journeys','[]'::jsonb),'context',d->'context');
  select coalesce(jsonb_object_agg(bucket, payload),'{}'::jsonb) into items from (
    select bucket, jsonb_agg(
      (case when jsonb_typeof(metadata)='object' then metadata else '{}'::jsonb end) ||
      jsonb_strip_nulls(jsonb_build_object('type',entity_type,'ref',entity_ref,
        'id',coalesce(nullif(metadata->>'id',''),entity_ref,id::text),'title',title,'link',link))
      order by created_at desc,id) as payload
    from public.research_items where user_id=u and bucket in ('cart','library','pinned') group by bucket
  ) q;
  return result || jsonb_build_object('cart',coalesce(items->'cart','[]'::jsonb),
    'saved',coalesce(items->'library','[]'::jsonb),'pinned',coalesce(items->'pinned','[]'::jsonb));
end;
$function$;

create or replace function public.research_state_apply_ops_v1(
  p_expected_user_id uuid, p_ops jsonb, p_expected_revision bigint, p_batch_id uuid
) returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  u uuid := auth.uid(); d jsonb; rev bigint; receipt jsonb; receipts jsonb;
  fingerprint text; op jsonb; kind text; bucket_name text; e jsonb; typ text; ref text;
  eid text; patch jsonb; arr jsonb; fld text; coll text; changed integer := 0;
begin
  if u is null or p_expected_user_id is distinct from u then
    raise exception 'RESEARCH_PRINCIPAL_MISMATCH' using errcode='42501';
  end if;
  if p_batch_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'RESEARCH_BATCH_IDENTITY_REQUIRED' using errcode='22023';
  end if;
  if jsonb_typeof(p_ops) is distinct from 'array' then
    raise exception 'RESEARCH_OPS_NOT_ARRAY' using errcode='22023';
  end if;
  if jsonb_array_length(p_ops) not between 1 and 100 or octet_length(p_ops::text)>524288 then
    raise exception 'RESEARCH_OPS_BATCH_TOO_LARGE' using errcode='22023';
  end if;
  fingerprint := encode(sha256(convert_to(p_ops::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('research-sync:' || u::text,0));
  insert into public.user_research(user_id,data) values(u,'{}'::jsonb) on conflict(user_id) do nothing;
  select data into d from public.user_research where user_id=u for update;
  if jsonb_typeof(d) is distinct from 'object' then
    raise exception 'RESEARCH_STORED_STATE_INVALID' using errcode='22023';
  end if;
  rev := coalesce((d#>>'{_research_sync_v1,revision}')::bigint,0);
  receipts := coalesce(d#>'{_research_sync_v1,receipts}','[]'::jsonb);
  select value into receipt from jsonb_array_elements(receipts) where value->>'id'=p_batch_id::text;
  if receipt is not null then
    if receipt->>'hash' is distinct from fingerprint then
      raise exception 'RESEARCH_BATCH_PAYLOAD_MISMATCH' using errcode='22023';
    end if;
    return jsonb_build_object('ok',true,'replayed',true,'batch_id',p_batch_id,
      'applied_revision',(receipt->>'revision')::bigint,'snapshot',public.research_state_snapshot_v1(u));
  end if;
  if rev<>p_expected_revision then
    raise exception 'RESEARCH_SYNC_CONFLICT' using errcode='40001';
  end if;

  for op in select value from jsonb_array_elements(p_ops) loop
    if jsonb_typeof(op) is distinct from 'object' or nullif(op->>'op_id','') is null then
      raise exception 'RESEARCH_OP_ID_REQUIRED' using errcode='22023';
    end if;
    kind := op->>'kind';
    if kind in ('item_upsert','item_delete','item_clear_bucket') then
      bucket_name := op->>'bucket';
      if bucket_name is null or bucket_name not in ('cart','library','pinned') then
        raise exception 'RESEARCH_BAD_BUCKET' using errcode='22023';
      end if;
      if kind='item_clear_bucket' then
        delete from public.research_items where user_id=u and bucket=bucket_name;
      elsif kind='item_delete' then
        typ := nullif(btrim(op->>'entity_type'),''); ref := nullif(btrim(op->>'entity_ref'),'');
        if typ is null or ref is null then raise exception 'RESEARCH_DELETE_IDENTITY_REQUIRED' using errcode='22023'; end if;
        delete from public.research_items where user_id=u and bucket=bucket_name and entity_type=typ and entity_ref=ref;
      else
        e:=op->'entity';
        if jsonb_typeof(e) is distinct from 'object' then raise exception 'RESEARCH_BAD_ENTITY' using errcode='22023'; end if;
        typ:=nullif(btrim(e->>'type'),''); ref:=nullif(btrim(coalesce(e->>'ref',e->>'id',e->>'title')),'');
        if typ is null or ref is null then raise exception 'RESEARCH_ENTITY_IDENTITY_REQUIRED' using errcode='22023'; end if;
        insert into public.research_items(user_id,bucket,entity_type,entity_ref,title,link,metadata)
          values(u,bucket_name,typ,ref,e->>'title',e->>'link',e)
          on conflict(user_id,bucket,entity_type,entity_ref) do update
          set title=coalesce(excluded.title,research_items.title),link=coalesce(excluded.link,research_items.link),
            metadata=research_items.metadata || excluded.metadata;
      end if;
    elsif kind in ('history_add','history_clear','collection_add','collection_update','collection_remove','journey_add','journey_remove','journey_clear') then
      fld:=case when kind like 'history_%' then 'history' when kind like 'collection_%' then 'collections' else 'journeys' end;
      arr:=coalesce(d->fld,'[]'::jsonb);
      if jsonb_typeof(arr) is distinct from 'array' then raise exception 'RESEARCH_STORED_ARRAY_INVALID' using errcode='22023'; end if;
      if kind in ('history_clear','journey_clear') then arr:='[]'::jsonb;
      elsif kind in ('history_add','collection_add','journey_add') then
        e:=op->case kind when 'history_add' then 'entity' when 'collection_add' then 'collection' else 'journey' end;
        eid:=nullif(e->>'id','');
        if jsonb_typeof(e) is distinct from 'object' or eid is null then raise exception 'RESEARCH_ID_REQUIRED' using errcode='22023'; end if;
        if kind='journey_add' and nullif(e->>'root','') is null then raise exception 'RESEARCH_JOURNEY_ROOT_REQUIRED' using errcode='22023'; end if;
        select coalesce(jsonb_agg(q.value order by q.ord),'[]'::jsonb) into arr from (
          select value,ord from jsonb_array_elements(arr) with ordinality a(value,ord)
          where case when kind='journey_add' then value->>'root' is distinct from e->>'root' else value->>'id' is distinct from eid end
          order by ord limit case when kind='history_add' then 49 when kind='journey_add' then 29 else 2147483647 end
        ) q;
        arr:=case when kind='collection_add' then arr||jsonb_build_array(e) else jsonb_build_array(e)||arr end;
      else
        eid:=nullif(op->>'id','');
        if eid is null then raise exception 'RESEARCH_ID_REQUIRED' using errcode='22023'; end if;
        if kind='collection_update' then
          patch:=op->'patch';
          if jsonb_typeof(patch) is distinct from 'object' or (patch ? 'id' and patch->>'id' is distinct from eid) then
            raise exception 'RESEARCH_COLLECTION_PATCH_INVALID' using errcode='22023';
          end if;
          select coalesce(jsonb_agg(case when value->>'id'=eid then value||patch else value end order by ord),'[]'::jsonb)
            into arr from jsonb_array_elements(arr) with ordinality a(value,ord);
        else
          select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into arr
            from jsonb_array_elements(arr) with ordinality a(value,ord) where value->>'id' is distinct from eid;
          if kind='collection_remove' then
            update public.research_items set metadata=metadata-'coll' where user_id=u and bucket='library' and metadata->>'coll'=eid;
          end if;
        end if;
      end if;
      d:=jsonb_set(d,array[fld],arr,true);
    elsif kind='collection_assign' then
      typ:=nullif(btrim(op->>'entity_type'),''); ref:=nullif(btrim(op->>'entity_ref'),''); coll:=nullif(op->>'coll_id','');
      if typ is null or ref is null then raise exception 'RESEARCH_ASSIGN_IDENTITY_REQUIRED' using errcode='22023'; end if;
      update public.research_items set metadata=case when coll is null then metadata-'coll' else jsonb_set(metadata,'{coll}',to_jsonb(coll)) end
        where user_id=u and bucket='library' and entity_type=typ and entity_ref=ref;
    elsif kind='context_set' then
      e:=coalesce(op->'context','null'::jsonb);
      if jsonb_typeof(e) not in ('null','object') then raise exception 'RESEARCH_CONTEXT_INVALID' using errcode='22023'; end if;
      d:=jsonb_set(d,'{context}',e,true);
    else raise exception 'RESEARCH_UNKNOWN_OP' using errcode='22023';
    end if;
    changed:=changed+1;
  end loop;
  rev:=rev+1;
  select coalesce(jsonb_agg(q.value order by q.ord),'[]'::jsonb) into receipts
    from (select value,ord from jsonb_array_elements(receipts) with ordinality a(value,ord) order by ord desc limit 127) q;
  receipts:=receipts||jsonb_build_array(jsonb_build_object('id',p_batch_id,'hash',fingerprint,'revision',rev));
  d:=jsonb_set(d,'{_research_sync_v1}',jsonb_build_object('revision',rev,'receipts',receipts),true);
  update public.user_research set data=d,updated_at=now() where user_id=u;
  return jsonb_build_object('ok',true,'replayed',false,'applied',changed,'batch_id',p_batch_id,
    'applied_revision',rev,'snapshot',public.research_state_snapshot_v1(u));
end;
$function$;

revoke all on function public.research_state_snapshot_v1(uuid) from public,anon;
revoke all on function public.research_state_apply_ops_v1(uuid,jsonb,bigint,uuid) from public,anon;
grant execute on function public.research_state_snapshot_v1(uuid) to authenticated,service_role;
grant execute on function public.research_state_apply_ops_v1(uuid,jsonb,bigint,uuid) to authenticated,service_role;
-- Retire the old browser delete-by-absence path at cutover. Service/internal owner paths stay intact.
-- Preserve direct hint/searched/handled consumers; constrain only managed sync buckets.
-- These RESTRICTIVE policies AND with the existing ownership policies; they never widen access.
create policy research_sync_managed_insert_v1 on public.research_items as restrictive
  for insert to authenticated with check (bucket not in ('cart','library','pinned'));
create policy research_sync_managed_update_v1 on public.research_items as restrictive
  for update to authenticated using (bucket not in ('cart','library','pinned'))
  with check (bucket not in ('cart','library','pinned'));
create policy research_sync_managed_delete_v1 on public.research_items as restrictive
  for delete to authenticated using (bucket not in ('cart','library','pinned'));
revoke insert,update,delete,truncate on public.user_research from public,anon,authenticated;
comment on function public.research_state_apply_ops_v1(uuid,jsonb,bigint,uuid) is
 'Existing personal Research OS: auth.uid root, expected-principal guard, explicit intent, atomic CAS, bounded replay receipts. No publication/canonicalization or new store.';
commit;
