-- The live writers of public.posts, read (read-only) from the canonical database on 17.11.2026 for the post document freshness test.
-- The body of every function here must equal the live one: tests/sql/run-post-document-freshness.sh compares md5(prosrc) with these values:
--   admin_save_post 1f550012ff472ee24e5840f6f85aaca5 · sys_save_post 172768dce5f0ff27abff2f32a66690d1
--   admin_restore_post_revision 25b13ead26661826f670a2440f69b56a · admin_set_post_home_hidden 7b34da97f8d5dfeb61d166b7702a3cbd
--   admin_reset_post_position 8e61c4fc4934054f18cdca77f8817bbb · fn_snapshot_post_revision a66d87aad421e8cd20401ed5504a456c
-- They are loaded only into the local test database; nothing here is applied anywhere else.
CREATE OR REPLACE FUNCTION public.admin_save_post(p_id bigint DEFAULT NULL::bigint, p_title text DEFAULT ''::text, p_slug text DEFAULT NULL::text, p_content text DEFAULT ''::text, p_excerpt text DEFAULT ''::text, p_categories text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_author text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_source text DEFAULT 'ai'::text, p_ai_touched boolean DEFAULT false, p_theme text DEFAULT NULL::text, p_keep_modified boolean DEFAULT false, p_axis_pin smallint DEFAULT NULL::smallint, p_axis_pin_set boolean DEFAULT false, p_tree_priority smallint DEFAULT NULL::smallint, p_tree_priority_set boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.sys_save_post(p_id bigint DEFAULT NULL::bigint, p_title text DEFAULT ''::text, p_slug text DEFAULT NULL::text, p_content text DEFAULT ''::text, p_excerpt text DEFAULT ''::text, p_categories text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_author text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_source text DEFAULT 'ai'::text, p_ai_touched boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.admin_reset_post_position(p_id bigint, p_remove_from_axis boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
  v_row public.posts;
begin
  select exists(select 1 from public.users u where u.id = auth.uid() and u.role='admin') into v_is_admin;
  if not v_is_admin then raise exception 'not_admin'; end if;
  update public.posts set
    modified = date,
    axis_pin = case when p_remove_from_axis then 0 else axis_pin end
  where id = p_id
  returning * into v_row;
  if v_row.id is null then raise exception 'not_found'; end if;
  return jsonb_build_object('id', v_row.id, 'modified', v_row.modified, 'date', v_row.date, 'axis_pin', v_row.axis_pin);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_post_revision(p_revision_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
  v_rev public.post_revisions;
  v_cur public.posts;
begin
  select exists(select 1 from public.users u where u.id = auth.uid() and u.role='admin') into v_is_admin;
  if not v_is_admin then raise exception 'not_admin'; end if;
  select * into v_rev from public.post_revisions where id = p_revision_id;
  if v_rev.id is null then raise exception 'revision_not_found'; end if;
  select * into v_cur from public.posts where id = v_rev.post_id;
  if v_cur.id is null then raise exception 'post_not_found'; end if;
  -- צילום «לפני שחזור» של המצב הנוכחי (מבטיח יכולת-ביטול גם אם עברו פחות מ-10 דק')
  insert into public.post_revisions (post_id, title, content, excerpt, categories, tags, image_url, theme, author, authors, note, saved_by, created_at)
  values (v_cur.id, v_cur.title, v_cur.content, v_cur.excerpt, v_cur.categories, v_cur.tags, v_cur.image_url, v_cur.theme, v_cur.author, v_cur.authors, 'לפני שחזור', auth.uid()::text, now());
  -- שחזור השדות מהגרסה הנבחרת. modified מתעדכן (הפוסט אכן השתנה); כותב-הקוד שולט במיקום בנפרד.
  update public.posts set
    title = v_rev.title, content = v_rev.content, excerpt = v_rev.excerpt,
    categories = v_rev.categories, tags = v_rev.tags,
    image_url = coalesce(v_rev.image_url, image_url),
    theme = coalesce(v_rev.theme, theme),
    author = v_rev.author, authors = v_rev.authors,
    modified = now()
  where id = v_rev.post_id;
  return jsonb_build_object('post_id', v_rev.post_id, 'restored_from', v_rev.id, 'created_at', v_rev.created_at);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_post_home_hidden(p_id bigint, p_hidden boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not rd_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set home_hidden = coalesce(p_hidden,false) where id = p_id;
  return true;
end; $function$;

CREATE OR REPLACE FUNCTION public.fn_snapshot_post_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- שינוי מהותי בלבד (מדלגים על עדכוני-מטא זניחים)
  if NEW.content is not distinct from OLD.content
     and NEW.title is not distinct from OLD.title
     and NEW.excerpt is not distinct from OLD.excerpt then
    return NEW;
  end if;
  -- וֶסֶת: כבר יש צילום טרי (כולל «לפני שחזור» ידני) → מדלגים
  if exists (select 1 from public.post_revisions r
             where r.post_id = OLD.id and r.created_at > now() - interval '10 minutes') then
    return NEW;
  end if;
  insert into public.post_revisions (post_id, title, content, excerpt, categories, tags, image_url, theme, author, authors, note, saved_by, created_at)
  values (OLD.id, OLD.title, OLD.content, OLD.excerpt, OLD.categories, OLD.tags, OLD.image_url, OLD.theme, OLD.author, OLD.authors, 'edit', auth.uid()::text, now());
  -- שמירה על 50 הגרסאות האחרונות בלבד לכל פוסט
  delete from public.post_revisions r
  where r.post_id = OLD.id
    and r.id not in (select id from public.post_revisions where post_id = OLD.id order by created_at desc limit 50);
  return NEW;
end;
$function$;

CREATE TRIGGER trg_snapshot_post_revision BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.fn_snapshot_post_revision();
