-- G3_PERSONAL_RESEARCH_SYNC_HARDENING_V1
-- EXTEND_EXISTING only: one Research OS, same research_items + user_research tables.
-- No new store/context authority. These RPCs derive the actor from auth.uid(), require an
-- expected principal as a stale-request guard, and apply only explicit semantic operations.

create or replace function public.research_state_snapshot_v1(p_expected_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_data jsonb := '{}'::jsonb;
  v_cart jsonb := '[]'::jsonb;
  v_saved jsonb := '[]'::jsonb;
  v_pinned jsonb := '[]'::jsonb;
begin
  if v_uid is null or p_expected_user_id is null or v_uid <> p_expected_user_id then
    raise exception 'RESEARCH_PRINCIPAL_MISMATCH' using errcode = '42501';
  end if;

  select coalesce(ur.data, '{}'::jsonb)
    into v_data
    from public.user_research ur
   where ur.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(
      jsonb_build_object(
        'type', ri.entity_type,
        'ref', ri.entity_ref,
        'id', coalesce(nullif(ri.metadata->>'id',''), ri.entity_ref),
        'title', ri.title,
        'link', ri.link
      ) || coalesce(ri.metadata, '{}'::jsonb)
    ) order by ri.created_at, ri.id
  ), '[]'::jsonb)
    into v_cart
    from public.research_items ri
   where ri.user_id = v_uid and ri.bucket = 'cart';

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(
      jsonb_build_object(
        'type', ri.entity_type,
        'ref', ri.entity_ref,
        'id', coalesce(nullif(ri.metadata->>'id',''), ri.entity_ref),
        'title', ri.title,
        'link', ri.link
      ) || coalesce(ri.metadata, '{}'::jsonb)
    ) order by ri.created_at desc, ri.id
  ), '[]'::jsonb)
    into v_saved
    from public.research_items ri
   where ri.user_id = v_uid and ri.bucket = 'library';

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(
      jsonb_build_object(
        'type', ri.entity_type,
        'ref', ri.entity_ref,
        'id', coalesce(nullif(ri.metadata->>'id',''), ri.entity_ref),
        'title', ri.title,
        'link', ri.link
      ) || coalesce(ri.metadata, '{}'::jsonb)
    ) order by ri.created_at desc, ri.id
  ), '[]'::jsonb)
    into v_pinned
    from public.research_items ri
   where ri.user_id = v_uid and ri.bucket = 'pinned';

  return jsonb_build_object(
    'cart', v_cart,
    'saved', v_saved,
    'pinned', v_pinned,
    'history', coalesce(v_data->'history', '[]'::jsonb),
    'collections', coalesce(v_data->'collections', '[]'::jsonb),
    'journeys', coalesce(v_data->'journeys', '[]'::jsonb),
    'context', v_data->'context'
  );
end;
$function$;

comment on function public.research_state_snapshot_v1(uuid) is
  'G3 personal Research OS snapshot. Actor is auth.uid(); expected user id is only a stale-principal guard. Returns existing research_items/user_research state and never adopts guest/local browser state.';

create or replace function public.research_state_apply_ops_v1(
  p_expected_user_id uuid,
  p_ops jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_ops jsonb := coalesce(p_ops, '[]'::jsonb);
  v_op jsonb;
  v_kind text;
  v_bucket text;
  v_entity jsonb;
  v_type text;
  v_ref text;
  v_id text;
  v_patch jsonb;
  v_coll text;
  v_data jsonb := '{}'::jsonb;
  v_arr jsonb := '[]'::jsonb;
  v_applied integer := 0;
begin
  if v_uid is null or p_expected_user_id is null or v_uid <> p_expected_user_id then
    raise exception 'RESEARCH_PRINCIPAL_MISMATCH' using errcode = '42501';
  end if;

  if jsonb_typeof(v_ops) <> 'array' then
    raise exception 'RESEARCH_OPS_NOT_ARRAY' using errcode = '22023';
  end if;
  if jsonb_array_length(v_ops) > 100 then
    raise exception 'RESEARCH_OPS_BATCH_TOO_LARGE' using errcode = '22023';
  end if;

  -- One row lock serializes blob operations for this principal. Existing state is preserved.
  insert into public.user_research(user_id, data, updated_at)
  values (v_uid, '{}'::jsonb, now())
  on conflict (user_id) do nothing;

  select coalesce(ur.data, '{}'::jsonb)
    into v_data
    from public.user_research ur
   where ur.user_id = v_uid
   for update;

  for v_op in select value from jsonb_array_elements(v_ops)
  loop
    v_kind := nullif(v_op->>'kind', '');
    if v_kind is null then
      raise exception 'RESEARCH_OP_MISSING_KIND' using errcode = '22023';
    end if;

    if v_kind = 'item_upsert' then
      v_bucket := nullif(v_op->>'bucket','');
      if v_bucket not in ('cart','library','pinned') then
        raise exception 'RESEARCH_BAD_BUCKET' using errcode = '22023';
      end if;
      v_entity := v_op->'entity';
      if jsonb_typeof(v_entity) <> 'object' then
        raise exception 'RESEARCH_BAD_ENTITY' using errcode = '22023';
      end if;
      v_type := nullif(btrim(v_entity->>'type'),'');
      v_ref := coalesce(
        nullif(btrim(v_entity->>'ref'),''),
        nullif(btrim(v_entity->>'id'),''),
        nullif(btrim(v_entity->>'title'),'')
      );
      if v_type is null or v_ref is null then
        raise exception 'RESEARCH_ENTITY_IDENTITY_REQUIRED' using errcode = '22023';
      end if;

      insert into public.research_items(user_id,bucket,entity_type,entity_ref,title,link,metadata)
      values (
        v_uid, v_bucket, v_type, v_ref,
        nullif(v_entity->>'title',''), nullif(v_entity->>'link',''), v_entity
      )
      on conflict (user_id,bucket,entity_type,entity_ref)
      do update set
        title = excluded.title,
        link = excluded.link,
        metadata = excluded.metadata;

    elsif v_kind = 'item_delete' then
      v_bucket := nullif(v_op->>'bucket','');
      v_type := nullif(btrim(v_op->>'entity_type'),'');
      v_ref := nullif(btrim(v_op->>'entity_ref'),'');
      if v_bucket not in ('cart','library','pinned') or v_type is null or v_ref is null then
        raise exception 'RESEARCH_DELETE_IDENTITY_REQUIRED' using errcode = '22023';
      end if;
      delete from public.research_items
       where user_id = v_uid and bucket = v_bucket
         and entity_type = v_type and entity_ref = v_ref;

    elsif v_kind = 'item_clear_bucket' then
      v_bucket := nullif(v_op->>'bucket','');
      if v_bucket not in ('cart','library','pinned') then
        raise exception 'RESEARCH_BAD_BUCKET' using errcode = '22023';
      end if;
      delete from public.research_items
       where user_id = v_uid and bucket = v_bucket;

    elsif v_kind = 'history_add' then
      v_entity := v_op->'entity';
      v_id := nullif(v_entity->>'id','');
      if jsonb_typeof(v_entity) <> 'object' or v_id is null then
        raise exception 'RESEARCH_HISTORY_ID_REQUIRED' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(q.el order by q.ord), '[]'::jsonb)
        into v_arr
        from (
          select e.el, e.ord
            from jsonb_array_elements(coalesce(v_data->'history','[]'::jsonb)) with ordinality e(el,ord)
           where e.el->>'id' is distinct from v_id
           order by e.ord
           limit 49
        ) q;
      v_data := jsonb_set(v_data, '{history}', jsonb_build_array(v_entity) || v_arr, true);

    elsif v_kind = 'history_clear' then
      v_data := jsonb_set(v_data, '{history}', '[]'::jsonb, true);

    elsif v_kind = 'collection_add' then
      v_entity := v_op->'collection';
      v_id := nullif(v_entity->>'id','');
      if jsonb_typeof(v_entity) <> 'object' or v_id is null then
        raise exception 'RESEARCH_COLLECTION_ID_REQUIRED' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(e.el order by e.ord), '[]'::jsonb)
        into v_arr
        from jsonb_array_elements(coalesce(v_data->'collections','[]'::jsonb)) with ordinality e(el,ord)
       where e.el->>'id' is distinct from v_id;
      v_data := jsonb_set(v_data, '{collections}', v_arr || jsonb_build_array(v_entity), true);

    elsif v_kind = 'collection_update' then
      v_id := nullif(v_op->>'id','');
      v_patch := coalesce(v_op->'patch', '{}'::jsonb);
      if v_id is null or jsonb_typeof(v_patch) <> 'object' then
        raise exception 'RESEARCH_COLLECTION_PATCH_INVALID' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(
        case when e.el->>'id' = v_id then e.el || v_patch else e.el end
        order by e.ord
      ), '[]'::jsonb)
        into v_arr
        from jsonb_array_elements(coalesce(v_data->'collections','[]'::jsonb)) with ordinality e(el,ord);
      v_data := jsonb_set(v_data, '{collections}', v_arr, true);

    elsif v_kind = 'collection_remove' then
      v_id := nullif(v_op->>'id','');
      if v_id is null then
        raise exception 'RESEARCH_COLLECTION_ID_REQUIRED' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(e.el order by e.ord), '[]'::jsonb)
        into v_arr
        from jsonb_array_elements(coalesce(v_data->'collections','[]'::jsonb)) with ordinality e(el,ord)
       where e.el->>'id' is distinct from v_id;
      v_data := jsonb_set(v_data, '{collections}', v_arr, true);
      update public.research_items
         set metadata = coalesce(metadata,'{}'::jsonb) - 'coll'
       where user_id = v_uid and bucket = 'library' and metadata->>'coll' = v_id;

    elsif v_kind = 'collection_assign' then
      v_type := nullif(btrim(v_op->>'entity_type'),'');
      v_ref := nullif(btrim(v_op->>'entity_ref'),'');
      v_coll := nullif(v_op->>'coll_id','');
      if v_type is null or v_ref is null then
        raise exception 'RESEARCH_ASSIGN_IDENTITY_REQUIRED' using errcode = '22023';
      end if;
      update public.research_items
         set metadata = case
           when v_coll is null then coalesce(metadata,'{}'::jsonb) - 'coll'
           else jsonb_set(coalesce(metadata,'{}'::jsonb), '{coll}', to_jsonb(v_coll), true)
         end
       where user_id = v_uid and bucket = 'library'
         and entity_type = v_type and entity_ref = v_ref;

    elsif v_kind = 'journey_add' then
      v_entity := v_op->'journey';
      v_id := nullif(v_entity->>'id','');
      if jsonb_typeof(v_entity) <> 'object' or v_id is null then
        raise exception 'RESEARCH_JOURNEY_ID_REQUIRED' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(q.el order by q.ord), '[]'::jsonb)
        into v_arr
        from (
          select e.el, e.ord
            from jsonb_array_elements(coalesce(v_data->'journeys','[]'::jsonb)) with ordinality e(el,ord)
           where e.el->>'root' is distinct from v_entity->>'root'
           order by e.ord
           limit 29
        ) q;
      v_data := jsonb_set(v_data, '{journeys}', jsonb_build_array(v_entity) || v_arr, true);

    elsif v_kind = 'journey_remove' then
      v_id := nullif(v_op->>'id','');
      if v_id is null then
        raise exception 'RESEARCH_JOURNEY_ID_REQUIRED' using errcode = '22023';
      end if;
      select coalesce(jsonb_agg(e.el order by e.ord), '[]'::jsonb)
        into v_arr
        from jsonb_array_elements(coalesce(v_data->'journeys','[]'::jsonb)) with ordinality e(el,ord)
       where e.el->>'id' is distinct from v_id;
      v_data := jsonb_set(v_data, '{journeys}', v_arr, true);

    elsif v_kind = 'journey_clear' then
      v_data := jsonb_set(v_data, '{journeys}', '[]'::jsonb, true);

    elsif v_kind = 'context_set' then
      v_data := jsonb_set(v_data, '{context}', coalesce(v_op->'context', 'null'::jsonb), true);

    else
      raise exception 'RESEARCH_UNKNOWN_OP: %', v_kind using errcode = '22023';
    end if;

    v_applied := v_applied + 1;
  end loop;

  update public.user_research
     set data = v_data,
         updated_at = now()
   where user_id = v_uid;

  return jsonb_build_object('ok', true, 'applied', v_applied);
end;
$function$;

comment on function public.research_state_apply_ops_v1(uuid,jsonb) is
  'G3 personal Research OS explicit-operation sync. No delete-by-absence. auth.uid() is authority; expected user id only prevents stale account-switch requests. Operations are bounded and atomic over existing user_research/research_items.';

revoke all on function public.research_state_snapshot_v1(uuid) from public, anon;
revoke all on function public.research_state_apply_ops_v1(uuid,jsonb) from public, anon;
grant execute on function public.research_state_snapshot_v1(uuid) to authenticated, service_role;
grant execute on function public.research_state_apply_ops_v1(uuid,jsonb) to authenticated, service_role;
