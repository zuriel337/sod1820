-- W2.2c contract correction M3.
-- Truth Axes P1/P3 + Graph Privacy Foundation:
-- public_candidate is a candidate for public promotion, not per-surface publication consent.
-- Preserve number_dossier_json's public shape while withholding research_objects statements
-- until an explicit public-surface publication authority exists.

create or replace function public.number_dossier_json(n integer)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_methods jsonb := '[]'::jsonb;
  v_topics jsonb := '[]'::jsonb;
  v_posts jsonb := '[]'::jsonb;
  v_reality int := 0;
  v_defs jsonb := '[]'::jsonb;
begin
  if n is null or n < 1 then return null; end if;

  begin
    with u as (
      select 'רגיל' method,1 prio,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where ragil=n and is_verified and coalesce(is_published,false)
      union all select 'מסתתר',2,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where misratar=n and is_verified and coalesce(is_published,false)
      union all select 'אתבש',3,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where atbash=n and is_verified and coalesce(is_published,false)
      union all select 'קדמי',4,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where kadmi=n and is_verified and coalesce(is_published,false)
      union all select 'גדול',5,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where gadol=n and is_verified and coalesce(is_published,false)
      union all select 'מילוי',6,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where miluy=n and is_verified and coalesce(is_published,false)
    ), scored as (
      select method,prio,phrase,
        ((case when is_verified then 3 else 0 end)
        +(case when category in ('משיח','משיח וגאולה','יהוה','גאולה') then 3 when category ilike 'מספר-אם%' then 2 when category is null or category in ('כללי','מנוקה אוטומטית','מאגר_ערכים','מהחיפושים') then 0 else 1 end)
        +(case when source_wp_ids is not null and array_length(source_wp_ids,1)>0 then 2 else 0 end)
        +(case when node_id is not null then 1 else 0 end)
        +coalesce(10-least(lead_rank,9),0)) s
      from u
    ), ranked as (
      select method,prio,phrase,row_number() over(partition by method order by s desc,char_length(phrase) desc,phrase) rn
      from (select distinct method,prio,phrase,s from scored) d
    )
    select coalesce(jsonb_agg(jsonb_build_object('method',method,'phrases',phrases) order by prio),'[]'::jsonb)
    into v_methods
    from (
      select method,prio,jsonb_agg(phrase order by rn) phrases
      from ranked where rn<=7 group by method,prio
    ) g;
  exception when others then v_methods := '[]'::jsonb; end;

  begin
    select coalesce(jsonb_agg(jsonb_build_object('title',title,'meter',coalesce(meter_score,0))),'[]'::jsonb)
    into v_topics
    from (
      select title,meter_score from topic_cards_public
      where (n=any(numbers) or n=any(highlight_numbers))
      order by meter_score desc nulls last limit 4
    ) t;
  exception when others then v_topics := '[]'::jsonb; end;

  begin
    select coalesce(jsonb_agg(title),'[]'::jsonb)
    into v_posts
    from (
      select distinct p.title
      from posts p
      join gematria_words g on p.wp_id=any(g.source_wp_ids)
      where (g.ragil=n or g.misratar=n or g.atbash=n)
        and g.is_verified
        and coalesce(g.is_published,false)
        and p.wp_id is not null
      limit 4
    ) x;
  exception when others then v_posts := '[]'::jsonb; end;

  begin
    select count(*) into v_reality
    from gallery_images
    where primary_value=n and source='update' and coalesce(curator_hidden,false)=false;
  exception when others then v_reality := 0; end;

  -- No research_objects statement enters this public projection merely because
  -- privacy_scope='public_candidate' or governance is approved/canonical.
  v_defs := '[]'::jsonb;

  return jsonb_build_object(
    'value',n,
    'methods',v_methods,
    'topics',v_topics,
    'posts',v_posts,
    'reality',v_reality,
    'definitions',v_defs
  );
end;
$function$;
