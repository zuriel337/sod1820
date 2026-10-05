-- ROLLBACK for 20261004080000_g4_graph_relation_enforcement_v1.sql (BRANCH_ONLY artifact; not applied live)
-- Drops the relation_type CHECK, restores the writer definitions as of main 10cbd029 (live 2026-10-04),
-- No metadata was rewritten by the migration, so none is reverted.
-- No edge deleted; no endpoint/weight/relation_type changed.
begin;

alter table public.edges drop constraint if exists edges_relation_type_vocab_chk;

create or replace function public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb default '{}'::jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  if not exists (select 1 from public.edges where from_node = p_from and to_node = p_to and relation_type = p_rel) then
    insert into public.edges (from_node, to_node, relation_type, metadata) values (p_from, p_to, p_rel, coalesce(p_meta,'{}'::jsonb));
  end if;
end; $function$;

create or replace function public.wire_image_meaningful(p_img uuid)
 returns void language plpgsql
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
  insert into edges(from_node,to_node,relation_type) select v_img,v_num,'contains'
    where not exists (select 1 from edges e where e.from_node=v_img and e.to_node=v_num and e.relation_type='contains');
end $function$;

create or replace function public.wire_number_to_images(p_n bigint)
 returns jsonb language plpgsql
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
  insert into edges(from_node,to_node,relation_type)
  select imn.id, v_num, 'contains'
  from gallery_images gi
  join nodes imn on imn.type='image' and imn.metadata->>'gallery_image_id'=gi.id::text
  where gi.primary_value = p_n
    and not exists (select 1 from edges e where e.from_node=imn.id and e.to_node=v_num and e.relation_type='contains');
  get diagnostics v_edges = row_count;
  select count(*) into v_imgs from gallery_images where primary_value=p_n;
  return jsonb_build_object('number',p_n,'images_primary',v_imgs,'new_edges',v_edges);
end $function$;

create or replace function public.sync_convergence(p_card uuid)
 returns uuid language plpgsql
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
    insert into edges(from_node,to_node,relation_type) values(v_node, num_node, 'contains');
  end loop;
  for ent in
    select e.id from nodes e
    where e.type='entity' and e.is_active and e.metadata ? 'value'
      and (e.metadata->>'value') ~ '^[0-9]+$'
      and (e.metadata->>'value')::int = any(coalesce(c.highlight_numbers,'{}'::int[]))
  loop
    insert into edges(from_node,to_node,relation_type) values(v_node, ent.id, 'related');
  end loop;
  return v_node;
end
$function$;

commit;
