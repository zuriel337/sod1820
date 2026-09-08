-- Authorization Bedrock critical write-path hardening
-- Live-applied first; this migration records the canonical reproducible state.

revoke execute on function public.credit_grant(uuid, integer, text, jsonb) from anon, authenticated, public;
grant execute on function public.credit_grant(uuid, integer, text, jsonb) to service_role;

create or replace function public.wa_word_review(p_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;

  if p_action = 'approve' then
    update gematria_words
       set is_verified=true,
           visibility_reason='approved_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    return 'approved';
  elsif p_action = 'reject' then
    update gematria_words
       set is_verified=false,
           visibility_reason='rejected_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    return 'rejected';
  elsif p_action = 'delete' then
    delete from gematria_words where id=p_id;
    return 'deleted';
  end if;
  return 'noop';
end;
$function$;

create or replace function public.resolve_word_review(
  p_id uuid,
  p_action text,
  p_edit text default null::text,
  p_by text default 'admin'::text
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v record;
  v_phrase text;
  v_add_result text;
  v_word_id uuid;
  v_engine_verified boolean;
  v_actor text;
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;
  v_actor := auth.uid()::text;

  select * into v from public.word_review_queue where id = p_id;
  if not found then return 'not_found'; end if;
  v_phrase := btrim(coalesce(nullif(p_edit,''), v.extracted));

  if p_action in ('approve','edit') then
    v_add_result := public.wa_add_word(v_phrase, coalesce(v.source,'review'), null);
    if v_add_result = 'possible_variant_queued' then
      update public.word_review_queue
         set status='merged', extracted=v_phrase, decided_by=v_actor,
             decided_at=now(), updated_at=now()
       where id=p_id;
      return 'possible_variant_redirected:' || v_phrase;
    end if;

    select (public.fn_resolve_word_identity(v_phrase)->>'word_id')::uuid into v_word_id;
    if v_word_id is not null then
      v_engine_verified := public.fn_verify_gematria_word_engine(v_word_id);
      update public.gematria_words
         set visibility_reason = 'approved_by_admin', visibility_changed_at = now()
       where id = v_word_id;
    end if;

    update public.word_review_queue
       set status='approved', extracted=v_phrase, decided_by=v_actor,
           decided_at=now(), updated_at=now()
     where id=p_id;

    return 'approved:' || coalesce(v_add_result,'unknown') ||
           case when v_word_id is not null
                then ':engine_verified=' || coalesce(v_engine_verified,false)::text
                else ':engine_verified=false' end;
  elsif p_action = 'reject' then
    update public.word_review_queue set status='rejected', decided_by=v_actor, decided_at=now() where id=p_id;
    return 'rejected';
  elsif p_action in ('block','hide') then
    update public.word_review_queue set status='blocked', decided_by=v_actor, decided_at=now() where id=p_id;
    return 'blocked';
  elsif p_action = 'merge' then
    update public.word_review_queue set status='merged', decided_by=v_actor, decided_at=now() where id=p_id;
    return 'merged';
  elsif p_action = 'delete' then
    delete from public.word_review_queue where id=p_id;
    return 'deleted';
  end if;
  return 'noop';
end;
$function$;

create or replace function public.project_contribution_to_graph(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c public.research_contributions;
  v_node uuid;
  v_target uuid;
  v_lt uuid;
  l record;
  v_rel text;
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;

  select * into c from public.research_contributions where id = p_id;
  if not found then return null; end if;

  v_node := c.graph_node_id;
  if v_node is null then
    insert into public.nodes (type, label, is_active, metadata)
    values ('contribution', coalesce(nullif(c.title,''), left(c.body,60), 'תרומה'), true,
      jsonb_build_object('intent',c.intent,'origin',c.origin,'state',c.research_state,'author',c.author_name,'contribution_id',c.id))
    returning id into v_node;
    update public.research_contributions set graph_node_id = v_node where id = p_id;
  end if;

  if c.target_id is not null then
    if c.target_type = 'number' and c.target_id ~ '^[0-9]+$' then
      v_target := public.get_or_create_entity_node('number', c.target_id, jsonb_build_object('value', c.target_id::bigint));
    else
      v_target := public.get_or_create_entity_node(coalesce(c.target_type,'entity'), c.target_id, '{}'::jsonb);
    end if;
    v_rel := case when c.intent = 'תגובה' then 'related' else 'contributes_to' end;
    perform public.upsert_edge(v_node, v_target, v_rel, jsonb_build_object('via','contribution'));
  end if;

  for l in select * from public.contribution_links where from_contribution_id = p_id loop
    v_lt := null;
    if l.target_type = 'number' and l.target_id ~ '^[0-9]+$' then
      v_lt := public.get_or_create_entity_node('number', l.target_id, jsonb_build_object('value', l.target_id::bigint));
    elsif l.target_type = 'contribution' then
      if l.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
         and l.target_id::uuid <> p_id then
        select graph_node_id into v_lt from public.research_contributions where id = l.target_id::uuid;
        if not found then
          v_lt := null;
        elsif v_lt is null then
          v_lt := public.project_contribution_to_graph(l.target_id::uuid);
        end if;
      end if;
    else
      v_lt := public.get_or_create_entity_node(coalesce(l.target_type,'entity'), l.target_id, '{}'::jsonb);
    end if;
    if v_lt is not null then
      perform public.upsert_edge(v_node, v_lt, coalesce(nullif(l.relation_type,''),'related'), jsonb_build_object('via','found_connection'));
    end if;
  end loop;

  return v_node;
end;
$function$;
