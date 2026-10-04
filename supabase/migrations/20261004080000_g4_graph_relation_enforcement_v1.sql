-- G4_GRAPH_RELATION_ENFORCEMENT_V1 (BRANCH_ONLY artifact; NOT applied to live DB)
-- Owner: reality_graph_law v8 + entity_structure_law + truth_axes_foundation_law + foundation_closure_protocol_law v7.
-- EXTEND_EXISTING only: constraints on public.edges + patches to existing writer functions.
-- No new table/registry/score. No endpoint/weight/relation_type value rewrite. No edge deletion.
-- relation_evidence and identity_edges are separate vocabulary families: OUT OF SCOPE.
-- Apply only after independent review + ZURIEL Human Gate. Rollback: tests/g4-graph/g4_graph_relation_enforcement_v1_rollback.sql

begin;

-- 0. Precondition: live relation_type values must be a subset of the allowed vocabulary.
do $$
declare v_bad text;
begin
  select string_agg(distinct relation_type, ', ') into v_bad
  from public.edges
  where relation_type <> all (array[
    'bridges_to','cipher_link','contained_in','contains','contributes_to','converges_on','cross',
    'demand_signal','derived_from','discovered_by','documents','equals','equals_by_depth','equals_word',
    'extends_rule','has_language_bridge','interpreted_by','is_kadmi_of','kadmi_equals','kadmi_reverse_of',
    'mentions','opposite_of','related','relates_to','represents','reverse_of','scale','scale_x10',
    'seeded_by','source','zero_scale',
    'same_as','alias_of','variant_of']);
  if v_bad is not null then
    raise exception 'G4 precondition failed: edges.relation_type outside allowed vocabulary: %', v_bad;
  end if;
end $$;

-- 1. relation_type vocabulary: 31 live values preserved + owner-backed same_as/alias_of/variant_of (authored_by_external is contribution_links vocabulary, not edges).
--    New vocabulary afterwards requires an owner-reviewed migration.
alter table public.edges
  add constraint edges_relation_type_vocab_chk
  check (relation_type in (
    'bridges_to','cipher_link','contained_in','contains','contributes_to','converges_on','cross',
    'demand_signal','derived_from','discovered_by','documents','equals','equals_by_depth','equals_word',
    'extends_rule','has_language_bridge','interpreted_by','is_kadmi_of','kadmi_equals','kadmi_reverse_of',
    'mentions','opposite_of','related','relates_to','represents','reverse_of','scale','scale_x10',
    'seeded_by','source','zero_scale',
    'same_as','alias_of','variant_of')) not valid;
alter table public.edges validate constraint edges_relation_type_vocab_chk;

-- 2. (removed per GPT review 5405629380) No rewrite of existing edge metadata and no universal nonempty-metadata CHECK:
--    historical NULL/'{}' metadata is preserved byte-for-byte; provenance is enforced prospectively by active writers only.

-- 4. Active writers. Signatures and security mode unchanged (ACLs preserved by CREATE OR REPLACE).
--    Touched invoker writers pin search_path=public to close Supabase advisor warnings without changing authorization.
--    Writers already emitting non-empty metadata (fn_ti_project_demand, graph_wire_number,
--    project_language_bridges, project_contribution_to_graph) need no change.

-- 4a. generic writer: future empty p_meta is marked UNKNOWN_WRITER. This marker is NOT provenance and NOT Research Strength.
create or replace function public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb default '{}'::jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  if not exists (select 1 from public.edges where from_node = p_from and to_node = p_to and relation_type = p_rel) then
    insert into public.edges (from_node, to_node, relation_type, metadata)
    values (p_from, p_to, p_rel,
      case when p_meta is null or p_meta = '{}'::jsonb
           then jsonb_build_object('provenance_state','UNKNOWN_WRITER','writer','upsert_edge')
           else p_meta end);
  end if;
end; $function$;

-- 4b. sync_convergence: source/via/role known from the topic card.
create or replace function public.sync_convergence(p_card uuid)
 returns uuid
 language plpgsql
 set search_path to 'public'
as $function$
declare c record; v_node uuid; n int; num_node uuid; ent record;
begin
  select * into c from topic_cards where id = p_card;
  if not found then raise exception 'card % not found', p_card; end if;

  select node_id into v_node from topic_cards where id = p_card;
  if v_node is null then
    insert into nodes(type,label,description,metadata,is_active,weight,hebrew_date)
    values('convergence', c.title, c.subtitle,
      jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
        'highlight',to_jsonb(c.highlight_numbers),
        'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
      c.status='approved', greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
      case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end)
    returning id into v_node;
    update topic_cards set node_id = v_node where id = p_card;
  else
    if c.title is null or c.title ~ '[א-ת]' then
      update nodes set label=c.title, description=c.subtitle,
        metadata=jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
          'highlight',to_jsonb(c.highlight_numbers),
          'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
        is_active=(c.status='approved'),
        weight=greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
        hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end
      where id = v_node;
    else
      update nodes set
        metadata=jsonb_build_object('card_id',c.id::text,'slug',c.slug,'numbers',to_jsonb(c.numbers),
          'highlight',to_jsonb(c.highlight_numbers),
          'year', case when c.occurred_at is not null then extract(year from c.occurred_at)::int else null end),
        is_active=(c.status='approved'),
        weight=greatest(1,least(5, round(coalesce(c.quality,5)/2.0)::int)),
        hebrew_date = case when c.occurred_at is not null then to_char(c.occurred_at,'YYYY-MM-DD') else null end
      where id = v_node;
    end if;
  end if;

  delete from edges where from_node = v_node and relation_type in ('contains','related');
  foreach n in array coalesce(c.numbers,'{}'::int[]) loop
    select id into num_node from nodes where type='number' and label = n::text limit 1;
    if num_node is null then
      insert into nodes(type,label,metadata,is_active,weight)
      values('number', n::text, jsonb_build_object('value',n), true, 1) returning id into num_node;
    end if;
    insert into edges(from_node,to_node,relation_type,metadata)
    values(v_node, num_node, 'contains',
      jsonb_build_object('source','sync_convergence','via','topic_card','card_id',c.id::text,'relation_role','card_number'));
  end loop;
  for ent in
    select e.id from nodes e
    where e.type='entity' and e.is_active and e.metadata ? 'value'
      and (e.metadata->>'value') ~ '^[0-9]+$'
      and (e.metadata->>'value')::int = any(coalesce(c.highlight_numbers,'{}'::int[]))
  loop
    insert into edges(from_node,to_node,relation_type,metadata)
    values(v_node, ent.id, 'related',
      jsonb_build_object('source','sync_convergence','via','topic_card','card_id',c.id::text,'relation_role','highlight_number_match'));
  end loop;
  return v_node;
end
$function$;

-- 4c. wire_image_meaningful: source/via/role known (gallery image -> primary number).
create or replace function public.wire_image_meaningful(p_img uuid)
 returns void
 language plpgsql
 set search_path to 'public'
as $function$
declare v_img uuid; v_num uuid; pv int;
begin
  select primary_value into pv from gallery_images where id=p_img;
  if pv is null or not (pv = any(public.meaningful_numbers())) then return; end if;
  select id into v_img from nodes where type='image' and metadata->>'gallery_image_id'=p_img::text limit 1;
  if v_img is null then
    insert into nodes(type,label,metadata,is_active,weight)
    select 'image', left(coalesce(nullif(gi.name,''),regexp_replace(gi.image_url,'^.*/','')),120),
      jsonb_build_object('gallery_image_id',gi.id::text,'url',gi.image_url,'gallery_id',gi.gallery_id), true,1
    from gallery_images gi where gi.id=p_img returning id into v_img;
  end if;
  select id into v_num from nodes where type='number' and label=pv::text limit 1;
  if v_num is null then insert into nodes(type,label,metadata,is_active,weight) values('number',pv::text,jsonb_build_object('value',pv),true,1) returning id into v_num; end if;
  insert into edges(from_node,to_node,relation_type,metadata)
    select v_img,v_num,'contains',
      jsonb_build_object('source','wire_image_meaningful','via','gallery_image','gallery_image_id',p_img::text,'relation_role','image_primary_value')
    where not exists (select 1 from edges e where e.from_node=v_img and e.to_node=v_num and e.relation_type='contains');
end $function$;

-- 4d. wire_number_to_images: source/via/role known.
create or replace function public.wire_number_to_images(p_n bigint)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
declare v_num uuid; v_imgs int; v_edges int;
begin
  select id into v_num from nodes where type='number' and label=p_n::text limit 1;
  if v_num is null then insert into nodes(type,label,metadata,is_active,weight) values('number',p_n::text,jsonb_build_object('value',p_n),true,1) returning id into v_num; end if;
  insert into nodes(type,label,metadata,is_active,weight)
  select 'image', left(coalesce(nullif(gi.name,''),regexp_replace(gi.image_url,'^.*/','')),120),
         jsonb_build_object('gallery_image_id',gi.id::text,'url',gi.image_url,'gallery_id',gi.gallery_id), true, 1
  from gallery_images gi
  where gi.primary_value = p_n
    and not exists (select 1 from nodes n where n.type='image' and n.metadata->>'gallery_image_id'=gi.id::text);
  insert into edges(from_node,to_node,relation_type,metadata)
  select imn.id, v_num, 'contains',
         jsonb_build_object('source','wire_number_to_images','via','gallery_image','gallery_image_id',gi.id::text,'relation_role','image_primary_value')
  from gallery_images gi
  join nodes imn on imn.type='image' and imn.metadata->>'gallery_image_id'=gi.id::text
  where gi.primary_value = p_n
    and not exists (select 1 from edges e where e.from_node=imn.id and e.to_node=v_num and e.relation_type='contains');
  get diagnostics v_edges = row_count;
  select count(*) into v_imgs from gallery_images where primary_value=p_n;
  return jsonb_build_object('number',p_n,'images_primary',v_imgs,'new_edges',v_edges);
end $function$;

commit;
