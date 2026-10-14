-- Exact live public SECURITY DEFINER reader captured 2026-10-13 for privacy regression.
CREATE OR REPLACE FUNCTION public.contributors_feed(p_limit integer DEFAULT 40)
 RETURNS TABLE(slug text, display_name text, kind text, last_activity timestamp with time zone, ciphers integer, posts integer, findings integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.slug, t.display_name, t.kind, t.last_activity, t.ciphers, t.posts, t.findings
  from (
    select c.slug, c.display_name, c.kind,
      greatest(
        coalesce((select max(e.created_at) from els_records e where e.owner_user_id=c.user_id and e.status<>'hidden'), 'epoch'::timestamptz),
        coalesce((select max(p.date) from posts p where p.author=c.display_name), 'epoch'::timestamptz),
        coalesce((select max(rc.created_at) from research_contributions rc where (rc.author_user_id=c.user_id or rc.author_name=c.display_name) and rc.status in ('approved','published')), 'epoch'::timestamptz)
      ) as last_activity,
      -- 🔒 רף איכות: ספירת צפנים לפי מונח *ייחודי* (5 «ד. טראמפ» = 1) — אי אפשר לנפח דירוג בכפילויות
      (select count(distinct e.search_term)::int from els_records e where e.owner_user_id=c.user_id and e.status<>'hidden') as ciphers,
      (select count(*)::int from posts p where p.author=c.display_name) as posts,
      (select count(*)::int from research_contributions rc where (rc.author_user_id=c.user_id or rc.author_name=c.display_name) and rc.status in ('approved','published') and rc.parent_id is null) as findings,
      coalesce(c.locked,false) as cl, coalesce(c.building,false) as cb,
      (coalesce(c.tags,'{}'::text[]) @> array['כתב חדש']) as is_new   -- ⭐ כתב חדש עובר גם בלי תוכן
    from contributors c
    where coalesce(c.kind,'') <> 'private'
      and coalesce(c.active,true)
      and c.slug not like 'r-%' and coalesce(c.display_name,'') <> 'sod1820'
  ) t
  where (t.ciphers + t.posts + t.findings) > 0 or t.cl or t.cb or t.is_new
  order by t.is_new desc, (t.findings + t.posts + t.ciphers) desc, t.last_activity desc
  limit p_limit
$function$

