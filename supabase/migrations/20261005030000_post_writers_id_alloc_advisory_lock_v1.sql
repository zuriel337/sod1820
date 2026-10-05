-- POST_PUBLISHING_2029_CHAIN_V1_FINAL_HARDEN (G) — serialize id/wp_id allocation in the EXISTING post writers.
-- BRANCH-ONLY: NOT applied to live. No new table/sequence/store/writer.
-- Both public.sys_save_post and public.admin_save_post allocate posts.id / posts.wp_id via max()+1. Two concurrent
-- INSERT-path calls could read the same max and collide. Both now take the SAME transaction-scoped advisory lock
-- (key: hashtextextended('public.posts.id_wp_id_allocation', 0)) immediately before the max()+1 allocation, INSERT path only.
-- Signatures, SECURITY DEFINER, search_path=public, the admin auth.uid gate and all UPDATE semantics are byte-for-byte
-- the live definitions observed 2026-10-05. CREATE OR REPLACE preserves existing ACLs (sys_save_post: service_role +
-- postgres per 20261005020000; admin_save_post: unchanged).

create or replace function public.sys_save_post(p_id bigint default null::bigint, p_title text default ''::text, p_slug text default null::text, p_content text default ''::text, p_excerpt text default ''::text, p_categories text[] default '{}'::text[], p_tags text[] default '{}'::text[], p_author text default null::text, p_image_url text default null::text, p_source text default 'ai'::text, p_ai_touched boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id bigint; v_wp bigint; v_slug text; v_row public.posts;
begin
  if coalesce(btrim(p_title),'') = '' then raise exception 'empty_title'; end if;
  v_slug := nullif(btrim(coalesce(p_slug,'')), '');
  if v_slug is null then v_slug := lower(regexp_replace(regexp_replace(btrim(p_title), '\s+', '-', 'g'), '[^a-zA-Z0-9א-ת_-]', '', 'g')); end if;
  if coalesce(v_slug,'') = '' then v_slug := 'post'; end if;
  if p_id is null then
    perform pg_advisory_xact_lock(hashtextextended('public.posts.id_wp_id_allocation', 0));
    select coalesce(max(id),0)+1 into v_id from public.posts;
    select coalesce(max(wp_id),0)+1 into v_wp from public.posts;
    if exists(select 1 from public.posts where slug = v_slug) then v_slug := v_slug || '-' || v_id::text; end if;
    insert into public.posts (id, wp_id, title, slug, content, excerpt, date, modified, categories, tags, source, image_url, author, ai_touched)
    overriding system value
    values (v_id, v_wp, p_title, v_slug, p_content, p_excerpt, now(), now(), coalesce(p_categories,'{}'), coalesce(p_tags,'{}'), coalesce(nullif(p_source,''),'ai'), p_image_url, p_author, coalesce(p_ai_touched,false))
    returning * into v_row;
  else
    update public.posts set title=p_title, slug=v_slug, content=p_content, excerpt=p_excerpt,
      categories=coalesce(p_categories,categories), tags=coalesce(p_tags,tags), author=p_author,
      image_url=coalesce(nullif(p_image_url,''),image_url), ai_touched=coalesce(p_ai_touched,ai_touched), modified=now()
    where id=p_id returning * into v_row;
    if v_row.id is null then raise exception 'not_found'; end if;
  end if;
  return jsonb_build_object('id', v_row.id, 'slug', v_row.slug, 'wp_id', v_row.wp_id);
end; $function$;

create or replace function public.admin_save_post(p_id bigint default null::bigint, p_title text default ''::text, p_slug text default null::text, p_content text default ''::text, p_excerpt text default ''::text, p_categories text[] default '{}'::text[], p_tags text[] default '{}'::text[], p_author text default null::text, p_image_url text default null::text, p_source text default 'ai'::text, p_ai_touched boolean default false, p_theme text default null::text, p_keep_modified boolean default false, p_axis_pin smallint default null::smallint, p_axis_pin_set boolean default false, p_tree_priority smallint default null::smallint, p_tree_priority_set boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_is_admin boolean;
  v_id bigint;
  v_wp bigint;
  v_slug text;
  v_row public.posts;
  v_theme text;
begin
  select exists(select 1 from public.users u where u.id = auth.uid() and u.role='admin') into v_is_admin;
  if not v_is_admin then raise exception 'not_admin'; end if;
  if coalesce(btrim(p_title),'') = '' then raise exception 'empty_title'; end if;

  v_theme := nullif(btrim(coalesce(p_theme,'')), '');
  if v_theme is not null and v_theme not in ('auto','light','dark') then v_theme := null; end if;

  v_slug := nullif(btrim(coalesce(p_slug,'')), '');
  if v_slug is null then
    v_slug := lower(regexp_replace(regexp_replace(btrim(p_title), '\s+', '-', 'g'), '[^a-zA-Z0-9א-ת_-]', '', 'g'));
  end if;
  if coalesce(v_slug,'') = '' then v_slug := 'post'; end if;

  if p_id is null then
    perform pg_advisory_xact_lock(hashtextextended('public.posts.id_wp_id_allocation', 0));
    select coalesce(max(id),0)+1 into v_id from public.posts;
    select coalesce(max(wp_id),0)+1 into v_wp from public.posts;
    if exists(select 1 from public.posts where slug = v_slug) then
      v_slug := v_slug || '-' || v_id::text;
    end if;
    insert into public.posts (id, wp_id, title, slug, content, excerpt, date, modified, categories, tags, source, image_url, author, ai_touched, theme, axis_pin, tree_priority)
    overriding system value
    values (v_id, v_wp, p_title, v_slug, p_content, p_excerpt, now(), now(),
            coalesce(p_categories,'{}'), coalesce(p_tags,'{}'),
            coalesce(nullif(p_source,''),'ai'), p_image_url, p_author, coalesce(p_ai_touched,false),
            coalesce(v_theme,'auto'),
            case when p_axis_pin_set then p_axis_pin else null end,
            case when p_tree_priority_set then p_tree_priority else null end)
    returning * into v_row;
  else
    update public.posts set
      title = p_title,
      slug = v_slug,
      content = p_content,
      excerpt = p_excerpt,
      categories = coalesce(p_categories, categories),
      tags = coalesce(p_tags, tags),
      author = p_author,
      image_url = coalesce(nullif(p_image_url,''), image_url),
      -- כשמחליפים תמונה ראשית — מאפסים את ה-thumbnail הישן כדי ש-gen-thumb יחדש אותו מהתמונה החדשה
      thumb_url = case
        when nullif(p_image_url,'') is not null and nullif(p_image_url,'') is distinct from image_url then null
        else thumb_url end,
      ai_touched = coalesce(p_ai_touched, ai_touched),
      theme = coalesce(v_theme, theme),
      axis_pin = case when p_axis_pin_set then p_axis_pin else axis_pin end,
      tree_priority = case when p_tree_priority_set then p_tree_priority else tree_priority end,
      modified = case when coalesce(p_keep_modified,false) then modified else now() end
    where id = p_id
    returning * into v_row;
    if v_row.id is null then raise exception 'not_found'; end if;
  end if;

  return jsonb_build_object('id', v_row.id, 'slug', v_row.slug, 'wp_id', v_row.wp_id,
                            'modified', v_row.modified, 'date', v_row.date,
                            'theme', v_row.theme, 'axis_pin', v_row.axis_pin, 'tree_priority', v_row.tree_priority);
end;
$function$;
