-- PROPOSAL ONLY: NOT APPLIED. Explicit separate shared-server approval required.
-- Synthetic fixtures only until approved; do not pipe into any linked/live project.
BEGIN;
DO $preflight$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.chat_search_facts(text,integer)') AND md5(prosrc) IN ('7b39aef3ed6d61853642d98253e2522e','6a51702f61bad7fdf4c79b310f971132')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: chat_search_facts(text,integer)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.cross_source_posts(text[])') AND md5(prosrc) IN ('f08037b7525a41877ee79322ce55e39c','671dc2f7c7338b1f2cb13bcb84257150')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: cross_source_posts(text[])'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.hot_posts_live(integer,integer)') AND md5(prosrc) IN ('9504a95791d5fd9c4fce8ff66463ea16','0eb84329484552ceed66164fab913a66')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: hot_posts_live(integer,integer)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.name_lab_research(text,integer)') AND md5(prosrc) IN ('d75a95a78b1f156dac9fbddced7c9391','726d0538b89945264439e6eadbbf998c')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: name_lab_research(text,integer)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.number_dossier_json(integer)') AND md5(prosrc) IN ('de11202c2a95853d4888d44d28180853','ea1d01059a7f7823a99ab7947957f4fa')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: number_dossier_json(integer)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.post_conversation_projection(bigint,integer)') AND md5(prosrc) IN ('21fd4a74595d566d8e9488d793c0e379','be92850a2aa7e74be8bbb141b213e11b')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: post_conversation_projection(bigint,integer)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.lang_links_list(text)') AND md5(prosrc) IN ('5ac5cd537e243ca661bd6194ba9ac0aa','9cf329e46bac6a9d2ed00811d539d5a8')) THEN RAISE EXCEPTION 'S2_SOURCE_DRIFT: lang_links_list(text)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='redirect_map' AND md5(pg_get_viewdef('public.redirect_map'::regclass,true)) IN ('e364dd14e1d92a4c50f0047a8c73e0bb','91d72f34d8dc7a91c0d65d99934b6556')) THEN RAISE EXCEPTION 'S2_REDIRECT_VIEW_DRIFT'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_anon_read' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles=ARRAY['anon']::name[] AND qual IN ('true','(NOT (COALESCE(tags, ''{}''::text[]) && ARRAY[''טיוטה''::text]))')) THEN RAISE EXCEPTION 'S2_POLICY_DRIFT: posts_anon_read'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_auth_read' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles=ARRAY['authenticated']::name[] AND qual IN ('true','(NOT (COALESCE(tags, ''{}''::text[]) && ARRAY[''טיוטה''::text]))')) THEN RAISE EXCEPTION 'S2_POLICY_DRIFT: posts_auth_read'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_admin_write' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND permissive='PERMISSIVE' AND qual='(EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = ''admin''::text))))' AND with_check='(EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = ''admin''::text))))') THEN RAISE EXCEPTION 'S2_ADMIN_POLICY_DRIFT'; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND cmd IN ('ALL','SELECT') AND policyname NOT IN ('posts_anon_read','posts_auth_read','posts_admin_write')) THEN RAISE EXCEPTION 'S2_UNREVIEWED_POST_READ_POLICY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.posts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'S2_POSTS_RLS_DRIFT'; END IF;
END $preflight$;
ALTER POLICY posts_anon_read ON public.posts TO anon USING (NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]));
ALTER POLICY posts_auth_read ON public.posts TO authenticated USING (NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]));
CREATE OR REPLACE VIEW public.redirect_map AS
 SELECT wp_id,
    slug,
    '/'::text || slug AS target_path
   FROM posts
  WHERE wp_id IS NOT NULL AND slug IS NOT NULL AND NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]);
CREATE OR REPLACE FUNCTION public.chat_search_facts(p_query text, p_limit integer DEFAULT 3)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_posts text;
  v_vals int[];
  v_nums text := '';
begin
  -- (1) פוסטים (RAG)
  with toks as (
    select array(
      select w from (
        select regexp_replace(t, '[^א-ת]', '', 'g') as w
        from regexp_split_to_table(coalesce(p_query, ''), '\s+') t
      ) x
      where char_length(w) >= 3
        and w not in ('מה','יש','על','של','את','זה','זו','לי','לך','לו','גם','כי','לא','כן','אבל',
          'הוא','היא','הם','אני','אתה','עם','או','רק','כל','אם','אז','מי','איך','למה','מתי','האם',
          'אין','הכל','ספר','תספר','רוצה','תגיד','בבקשה','אותי','אותך','שלי','שלך','כמה','איזה',
          'הזה','הזאת','עכשיו','תודה','שלום','היי','אולי','צריך','באמת','ממש')
    ) as ws
  ),
  q as (
    select case when array_length(ws, 1) is null then null
                else to_tsquery('simple', array_to_string(ws, ' | ')) end as tsq
    from toks
  ),
  ranked as (
    select p.title,
      left(regexp_replace(coalesce(nullif(p.excerpt, ''), p.content), '<[^>]+>|\s+', ' ', 'g'), 280) as snip,
      ts_rank(to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,'')), q.tsq) as rank
    from public.posts p, q
    where q.tsq is not null
      and NOT (coalesce(p.tags, '{}'::text[]) && ARRAY['טיוטה']::text[])
      and q.tsq @@ to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,''))
    order by rank desc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
  )
  select string_agg('• ' || title || ': ' || trim(snip), E'\n') into v_posts from ranked;

  -- (2) 🔢 מספר בשאילתה → אינטליגנציית-המספר המלאה (number_dossier), מקור-אמת יחיד
  select array_agg(distinct (m)[1]::int) into v_vals
  from regexp_matches(coalesce(p_query, ''), '\d{2,6}', 'g') m;

  if v_vals is not null then
    select string_agg(d, E'\n\n') into v_nums
    from (select public.number_dossier(v) d from (select distinct unnest(v_vals) as v) t) z
    where d is not null;
  end if;

  return nullif(concat_ws(E'\n\n', nullif(v_nums, ''), v_posts), '');
end; $function$
;

CREATE OR REPLACE FUNCTION public.cross_source_posts(p_labels text[])
 RETURNS TABLE(label text, slug text, title text, wp_id bigint, via text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with graph as (
  select t.label, p.metadata->>'slug' as slug, p.label as title,
         (select cp.wp_id from public.posts cp where cp.slug = p.metadata->>'slug'
           and (nullif(p.metadata->>'post_wp_id','') is null or cp.wp_id::text = p.metadata->>'post_wp_id')
           and NOT (coalesce(cp.tags, '{}'::text[]) && ARRAY['טיוטה']::text[])) as wp_id, 'graph'::text as via,
         row_number() over (partition by t.label order by coalesce(p.weight,3) desc) as rn
  from unnest(p_labels) as t(label)
  join nodes e on e.type='entity' and e.is_active and e.label = t.label
  join edges ed on ed.relation_type='mentions' and ed.to_node = e.id
  join nodes p on p.id = ed.from_node and p.type='post' and p.is_active
             and coalesce(p.metadata->>'slug','') <> ''
  where (select count(*) from public.posts cp where cp.slug = p.metadata->>'slug') = 1
    and exists (select 1 from public.posts cp where cp.slug = p.metadata->>'slug'
      and (nullif(p.metadata->>'post_wp_id','') is null or cp.wp_id::text = p.metadata->>'post_wp_id')
      and NOT (coalesce(cp.tags, '{}'::text[]) && ARRAY['טיוטה']::text[]))
),
txt as (
  select t.label, p.slug, p.title, p.wp_id::bigint, 'text'::text as via, p.rn
  from unnest(p_labels) as t(label)
  cross join lateral (
    select slug, title, wp_id, row_number() over (order by (title ilike '%'||t.label||'%') desc, date desc) as rn
    from posts
    where NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[])
      and (title ilike '%'||t.label||'%' or content ilike '%'||t.label||'%')
      and slug is not null
    limit 2
  ) p
  where not exists (select 1 from graph g where g.label = t.label)
)
select label, slug, title, wp_id, via from graph where rn <= 2
union all
select label, slug, title, wp_id, via from txt where rn <= 2;
$function$
;

CREATE OR REPLACE FUNCTION public.hot_posts_live(days integer DEFAULT 7, lim integer DEFAULT 4)
 RETURNS TABLE(slug text, title text, image_url text, views bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.slug, p.title, p.image_url, count(*)::bigint as views
  from public.page_views v
  join public.posts p on p.slug = v.ref
  where NOT (coalesce(p.tags, '{}'::text[]) && ARRAY['טיוטה']::text[]) and v.kind = 'post' and v.created_at > now() - make_interval(days => days)
  group by p.slug, p.title, p.image_url
  order by views desc limit lim;
$function$
;

CREATE OR REPLACE FUNCTION public.name_lab_research(p_word text, p_value integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  w text := btrim(coalesce(p_word,''));
  v int := coalesce(p_value,0);
  bridges jsonb; posts_j jsonb; posts_c int; treas_j jsonb; treas_c int; hints_j jsonb; hints_c int;
begin
  if w = '' then return jsonb_build_object('bridges','[]'::jsonb,'posts','[]'::jsonb,'treasures','[]'::jsonb,'hints','[]'::jsonb); end if;

  -- 🌉 גשרים — מהגרף (nodes type='language_bridge'), ישות-מחקר מלאה
  bridges := public.get_graph_bridges(w, nullif(v,0));

  select count(*) into posts_c from public.posts where NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]) and title ilike '%'||w||'%';
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into posts_j from (
    select id, title, slug, image_url from public.posts where NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]) and title ilike '%'||w||'%'
    order by coalesce(modified, "date") desc nulls last limit 6) p;

  if v > 0 then
    select count(*) into treas_c from public.gallery_images where source='update' and primary_value = v;
    select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) into treas_j from (
      select image_url, name, primary_value, occurred_at from public.gallery_images
      where source='update' and primary_value = v order by coalesce(occurred_at, created_at) desc nulls last limit 6) g;
    select count(*) into hints_c from public.insights where is_active and v = any(related_numbers);
    select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb) into hints_j from (
      select id, title, source_type, source_ref, origin from public.insights
      where is_active and v = any(related_numbers) order by coalesce(convergence_score,0) desc, created_at desc limit 6) h;
  else treas_c:=0; treas_j:='[]'::jsonb; hints_c:=0; hints_j:='[]'::jsonb; end if;

  return jsonb_build_object(
    'bridges', bridges,
    'posts', posts_j, 'posts_count', posts_c,
    'treasures', treas_j, 'treasures_count', treas_c,
    'hints', hints_j, 'hints_count', hints_c);
end $function$
;

CREATE OR REPLACE FUNCTION public.number_dossier_json(n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        and NOT (coalesce(p.tags, '{}'::text[]) && ARRAY['טיוטה']::text[])
      limit 4
    ) x;
  exception when others then v_posts := '[]'::jsonb; end;

  begin
    select count(*) into v_reality
    from gallery_images
    where primary_value=n and source='update' and coalesce(curator_hidden,false)=false;
  exception when others then v_reality := 0; end;

  -- Truth Axes P1/P3 + Graph Privacy Foundation: public_candidate is an
  -- intake/publication candidate state, not per-surface publication consent.
  -- Until research_objects has an explicit public-surface publication authority,
  -- the public Number dossier must not project statements from that table.
  -- Preserve the legacy output shape with an empty definitions array.
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
$function$
;

CREATE OR REPLACE FUNCTION public.post_conversation_projection(p_post_wp_id bigint, p_limit integer DEFAULT 200)
 RETURNS TABLE(source_kind text, source_id text, parent_ref text, author_display_name text, author_is_contributor boolean, body text, reactions jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_post_id bigint;
begin
  select id into v_post_id from public.posts where wp_id = p_post_wp_id and NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[]);
  if v_post_id is null then
    return; -- unresolved post_wp_id: never guess a canonical post to attach comments to
  end if;

  return query
  select * from (
    select
      'wordpress'::text as source_kind,
      c.wp_id::text as source_id,
      c.parent_wp_id::text as parent_ref,
      c.author_name as author_display_name,
      false as author_is_contributor,
      c.content as body,
      null::jsonb as reactions,
      c.date as created_at
    from public.comments c
    where c.post_wp_id = p_post_wp_id
      and c.status = 'publish'

    union all

    select
      'community'::text as source_kind,
      rc.id::text as source_id,
      rc.parent_id::text as parent_ref,
      coalesce(rc.author_name, ct.display_name) as author_display_name,
      (rc.author_contributor_id is not null) as author_is_contributor,
      rc.body,
      rc.reactions,
      rc.created_at
    from public.research_contributions rc
    left join public.contributors ct on ct.id = rc.author_contributor_id
    where rc.target_type = 'post'
      and rc.target_id = v_post_id::text
      and (rc.status = 'approved' or rc.author_user_id = auth.uid())
      -- Phase 2.2 integrity fix: never project a visually empty Community reply into the post
      -- conversation. A visible reply whose parent is one of these invisible rows keeps its
      -- parent_ref by id; the WordPress half of this union is unaffected (its own source never
      -- exhibited this blank-payload defect).
      and (
        coalesce(btrim(rc.body), '') <> ''
        or coalesce(btrim(rc.title), '') <> ''
        or rc.image_url is not null
        or jsonb_array_length(rc.media) > 0
      )
  ) unified
  order by created_at asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.lang_links_list(p_visitor text DEFAULT NULL::text)
 RETURNS SETOF language_links
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT l.id, l.hebrew, l.foreign_word, l.lang, l.relationship_type, l.note, l.gematria_he, l.status, l.created_by_name, NULL::text AS created_by_visitor, l.created_at, l.reviewed_at, NULL::uuid AS reviewed_by, l.method, l.evidence_level, l.translation_source, l.human_verified
  FROM public.language_links l
  WHERE l.status = 'approved'
  ORDER BY l.created_at DESC
  LIMIT 500;
$function$
;
COMMIT;
