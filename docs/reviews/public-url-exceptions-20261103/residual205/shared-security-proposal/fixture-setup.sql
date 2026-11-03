-- Completely synthetic PostgreSQL fixture. No live connection or data.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
CREATE TABLE public.users(id uuid primary key,role text);GRANT SELECT ON public.users TO anon,authenticated;
INSERT INTO public.users VALUES ('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','user'),('00000000-0000-4000-8000-000000000003','user');
CREATE TABLE public.posts("id" bigint NOT NULL,
"title" text,
"content" text,
"date" timestamp with time zone,
"slug" text,
"link" text,
"images" text[],
"categories" text[],
"created_at" timestamp with time zone DEFAULT now(),
"wp_id" bigint,
"image_url" text,
"excerpt" text,
"author" text,
"tags" text[] DEFAULT '{}'::text[],
"modified" timestamp with time zone,
"source" text DEFAULT 'wordpress'::text NOT NULL,
"tree_priority" smallint,
"space" text DEFAULT 'core'::text NOT NULL,
"content_old" text,
"verified" boolean DEFAULT false NOT NULL,
"verified_at" timestamp with time zone,
"verified_by" text,
"ai_addition" text,
"ai_touched" boolean DEFAULT false NOT NULL,
"ai_touched_note" text,
"verify_level" text DEFAULT 'none'::text NOT NULL,
"convergence_score" smallint DEFAULT 0 NOT NULL,
"convergence_axes" text[] DEFAULT '{}'::text[],
"has_1820" boolean DEFAULT false NOT NULL,
"verify_signature" text,
"has_1820_seal" boolean DEFAULT false NOT NULL,
"ai_number" integer,
"share_to_fb" boolean DEFAULT false NOT NULL,
"fb_posted_at" timestamp with time zone,
"fb_post_id" text,
"fb_error" text,
"theme" text DEFAULT 'auto'::text NOT NULL,
"authors" text[],
"axis_pin" smallint,
"thumb_url" text,
"home_hidden" boolean DEFAULT false NOT NULL,
"cipher_slug" text);
CREATE TABLE public.language_links("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"hebrew" text NOT NULL,
"foreign_word" text NOT NULL,
"lang" text DEFAULT 'en'::text NOT NULL,
"relationship_type" text DEFAULT 'semantic'::text NOT NULL,
"note" text,
"gematria_he" integer,
"status" text DEFAULT 'pending'::text NOT NULL,
"created_by_name" text,
"created_by_visitor" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"reviewed_at" timestamp with time zone,
"reviewed_by" uuid,
"method" text,
"evidence_level" text,
"translation_source" text,
"human_verified" boolean DEFAULT false);
ALTER TABLE public.posts ADD PRIMARY KEY(id); ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_anon_read ON public.posts FOR SELECT TO anon USING(true);
CREATE POLICY posts_auth_read ON public.posts FOR SELECT TO authenticated USING(true);
CREATE POLICY posts_admin_write ON public.posts FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='admin')) WITH CHECK(EXISTS(SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='admin'));
GRANT SELECT ON public.posts TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.posts TO authenticated;
CREATE OR REPLACE VIEW public.redirect_map AS SELECT wp_id,slug,'/'::text||slug AS target_path FROM posts WHERE wp_id IS NOT NULL AND slug IS NOT NULL;
GRANT SELECT ON public.redirect_map TO anon,authenticated;
CREATE TABLE public.nodes(id uuid,type text,label text,metadata jsonb,is_active boolean,weight real);
CREATE TABLE public.edges(from_node uuid,to_node uuid,relation_type text);
CREATE TABLE public.page_views(kind text,ref text,created_at timestamptz);
CREATE TABLE public.gallery_images(image_url text,name text,primary_value integer,occurred_at timestamptz,created_at timestamptz,source text,curator_hidden boolean);
CREATE TABLE public.insights(id uuid,title text,source_type text,source_ref text,origin text,is_active boolean,related_numbers integer[],convergence_score real,created_at timestamptz);
CREATE TABLE public.gematria_words(phrase text,is_verified boolean,is_published boolean,category text,source_wp_ids bigint[],node_id uuid,lead_rank integer,ragil integer,misratar integer,atbash integer,kadmi integer,gadol integer,miluy integer);
CREATE TABLE public.topic_cards_public(title text,meter_score real,numbers integer[],highlight_numbers integer[]);
CREATE TABLE public.comments(wp_id bigint,parent_wp_id bigint,author_name text,content text,date timestamptz,status text,post_wp_id bigint);
CREATE TABLE public.research_contributions(id uuid,parent_id uuid,author_name text,author_contributor_id uuid,author_user_id uuid,body text,reactions jsonb,created_at timestamptz,target_type text,target_id text,status text,title text,image_url text,media jsonb);
CREATE TABLE public.contributors(id uuid,display_name text);
-- Unchanged non-Post branches are empty controlled inputs, not canonical-engine acceptance.
CREATE FUNCTION public.get_graph_bridges(text,integer) RETURNS jsonb LANGUAGE sql AS $$SELECT '[]'::jsonb$$;
CREATE FUNCTION public.fn_ragil(text) RETURNS integer LANGUAGE sql AS $$SELECT 0$$;
CREATE FUNCTION public.number_dossier(integer) RETURNS text LANGUAGE sql AS $$SELECT null::text$$;
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
         nullif(p.metadata->>'post_wp_id','')::bigint as wp_id, 'graph'::text as via,
         row_number() over (partition by t.label order by coalesce(p.weight,3) desc) as rn
  from unnest(p_labels) as t(label)
  join nodes e on e.type='entity' and e.is_active and e.label = t.label
  join edges ed on ed.relation_type='mentions' and ed.to_node = e.id
  join nodes p on p.id = ed.from_node and p.type='post' and p.is_active
             and coalesce(p.metadata->>'slug','') <> ''
),
txt as (
  select t.label, p.slug, p.title, p.wp_id::bigint, 'text'::text as via, p.rn
  from unnest(p_labels) as t(label)
  cross join lateral (
    select slug, title, wp_id, row_number() over (order by (title ilike '%'||t.label||'%') desc, date desc) as rn
    from posts
    where (title ilike '%'||t.label||'%' or content ilike '%'||t.label||'%')
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
  where v.kind = 'post' and v.created_at > now() - make_interval(days => days)
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

  select count(*) into posts_c from public.posts where title ilike '%'||w||'%';
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into posts_j from (
    select id, title, slug, image_url from public.posts where title ilike '%'||w||'%'
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
  select id into v_post_id from public.posts where wp_id = p_post_wp_id;
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
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select * from public.language_links
  where status = 'approved'
     or (p_visitor is not null and p_visitor <> '' and created_by_visitor = p_visitor)
  order by (status <> 'approved') desc, created_at desc
  limit 500;
$function$
;
CREATE OR REPLACE FUNCTION public.lang_link_add(p_hebrew text, p_foreign text, p_lang text DEFAULT 'en'::text, p_rel text DEFAULT 'semantic'::text, p_note text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_gem int; v_rel text; v_lang text;
begin
  if p_hebrew is null or btrim(p_hebrew) = '' or p_foreign is null or btrim(p_foreign) = '' then
    return jsonb_build_object('error','empty');
  end if;
  if length(p_hebrew) > 60 or length(p_foreign) > 80 or length(coalesce(p_note,'')) > 400 then
    return jsonb_build_object('error','too_long');
  end if;
  -- סוג-קשר מותר בלבד (אחרת ברירת-מחדל רעיוני)
  v_rel := case lower(coalesce(p_rel,''))
    when 'transliteration' then 'transliteration' when 'translation' then 'translation'
    when 'semantic' then 'semantic' when 'root' then 'root' when 'pronunciation' then 'pronunciation'
    when 'community' then 'community' when 'ai' then 'ai' else 'semantic' end;
  v_lang := case lower(coalesce(p_lang,'')) when 'ru' then 'ru' when 'en' then 'en' else coalesce(nullif(btrim(p_lang),''),'other') end;
  begin v_gem := fn_ragil(btrim(p_hebrew)); exception when others then v_gem := null; end;

  insert into public.language_links(hebrew, foreign_word, lang, relationship_type, note, gematria_he, created_by_name, created_by_visitor)
  values (btrim(p_hebrew), btrim(p_foreign), v_lang, v_rel, nullif(btrim(coalesce(p_note,'')),''), v_gem, nullif(btrim(coalesce(p_name,'')),''), nullif(btrim(coalesce(p_visitor,'')),''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'gematria_he', v_gem, 'status','pending');
end; $function$
;
CREATE OR REPLACE FUNCTION public.lang_links_pending()
 RETURNS SETOF language_links
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return; -- לא אדמין → ריק
  end if;
  return query select * from public.language_links where status = 'pending' order by created_at desc limit 300;
end; $function$
;
CREATE OR REPLACE FUNCTION public.lang_link_review(p_id uuid, p_action text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return 'forbidden';
  end if;
  if p_action = 'approve' then
    update public.language_links set status='approved', reviewed_at=now(), reviewed_by=auth.uid() where id=p_id; return 'approved';
  elsif p_action = 'reject' then
    update public.language_links set status='rejected', reviewed_at=now(), reviewed_by=auth.uid() where id=p_id; return 'rejected';
  elsif p_action = 'delete' then
    delete from public.language_links where id=p_id; return 'deleted';
  end if;
  return 'noop';
end; $function$
;
REVOKE ALL ON FUNCTION public.lang_links_pending() FROM PUBLIC; REVOKE ALL ON FUNCTION public.lang_link_review(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lang_links_pending(), public.lang_link_review(uuid,text) TO authenticated;
INSERT INTO public.posts(id,wp_id,slug,title,content,excerpt,tags,date,image_url) VALUES
(1,101,'public','בדיקה ציבורי','PUBLIC_BODY','PUBLIC_SNIPPET','{}',now(),'public.png'),
(2,102,'forum','בדיקה פורום','FORUM_BODY','FORUM_SNIPPET',ARRAY['פורום'],now(),'forum.png'),
(3,103,'draft','בדיקה SECRET_DRAFT','SECRET_BODY','SECRET_SNIPPET',ARRAY['טיוטה'],now(),'SECRET_IMAGE'),
(4,104,'forum-draft','בדיקה SECRET_FORUM_DRAFT','SECRET_FORUM_BODY','SECRET_SNIPPET',ARRAY['פורום','טיוטה'],now(),'SECRET_IMAGE'),
(5,105,'null-tags','בדיקה NULL_TAGS','NULL_BODY','NULL_SNIPPET',NULL,now(),'null.png'),
(6,106,'null-element','בדיקה NULL_ELEMENT','NULL_ELEMENT_BODY','NULL_ELEMENT_SNIPPET',ARRAY[null],now(),'null-element.png'),
(7,107,'lookalike','בדיקה טיוטה בכותרת בלבד','NOT_DRAFT','public',ARRAY['בטיוטה'],now(),'public.png');
INSERT INTO public.page_views SELECT 'post',slug,now() FROM public.posts;
INSERT INTO public.gematria_words(phrase,is_verified,is_published,source_wp_ids,ragil) VALUES('בדיקה',true,true,ARRAY[101,102,103,104]::bigint[],1820);
INSERT INTO public.comments SELECT wp_id,null,'synthetic','COMMENT_'||content,now(),'publish',wp_id FROM public.posts;
INSERT INTO public.nodes VALUES
('00000000-0000-4000-8000-000000000011','entity','בדיקה','{}',true,1),
('00000000-0000-4000-8000-000000000012','post','בדיקה ציבורי','{"slug":"public","post_wp_id":"101"}',true,10),
('00000000-0000-4000-8000-000000000013','post','בדיקה SECRET_NODE','{"slug":"draft","post_wp_id":"103"}',true,9),
('00000000-0000-4000-8000-000000000014','post','בדיקה WRONG_ID','{"slug":"public","post_wp_id":"103"}',true,8),
('00000000-0000-4000-8000-000000000015','post','בדיקה MISSING_SOURCE','{"slug":"missing","post_wp_id":"999"}',true,7);
INSERT INTO public.edges SELECT id,'00000000-0000-4000-8000-000000000011','mentions' FROM public.nodes WHERE type='post';
INSERT INTO public.language_links(id,hebrew,foreign_word,lang,relationship_type,note,gematria_he,status,created_by_name,created_by_visitor,created_at,reviewed_by) VALUES
('00000000-0000-4000-8000-000000000021','מאושר','approved','en','semantic','public',0,'approved','קרדיט ציבורי','visitor-secret-approved',now(),'00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000022','ממתין','SECRET_PENDING','en','semantic',null,0,'pending','synthetic','visitor-known-A',now(),null),
('00000000-0000-4000-8000-000000000023','דחוי','SECRET_REJECTED','en','semantic',null,0,'rejected','synthetic','visitor-known-A',now(),null);
