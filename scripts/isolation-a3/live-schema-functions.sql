-- Canonical read-only pg_get_functiondef schema evidence, 2026-11-02. No rows.
CREATE OR REPLACE FUNCTION public.digit_reverse(n integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when n is null then null else nullif(reverse(n::text),'')::int end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_graph_space_is_public(p_metadata jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT coalesce(p_metadata->>'space', 'core') = 'core';
$function$;

CREATE OR REPLACE FUNCTION public.fn_verses_by_gematria(p_value integer, p_limit integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'value', p_value,
    'count', (select count(*) from tanach_verses where ragil=p_value),
    'verses', (select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)),'[]'::jsonb)
               from (select book,chapter,verse,text,book_idx from tanach_verses where ragil=p_value
                     order by book_idx,chapter,verse limit p_limit) v)
  );
$function$;

CREATE OR REPLACE FUNCTION public.number_neighbors(p_value integer, p_limit integer DEFAULT 8)
 RETURNS TABLE(value integer, weight numeric, via_topic bigint, via_gallery bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with t as (
    select unnest(numbers) as v
    from topic_cards
    where status = 'approved' and p_value = any(numbers)
  ),
  g as (
    select unnest(all_values) as v
    from gallery_images
    where p_value = any(all_values)
  ),
  co as (
    select v,
           count(*) filter (where src = 't') as via_topic,
           count(*) filter (where src = 'g') as via_gallery
    from (select v, 't'::text as src from t union all select v, 'g'::text as src from g) u
    where v <> p_value and v >= 10
    group by v
  ),
  freq as (
    select v, count(*)::numeric as f
    from (select unnest(all_values) as v from gallery_images) a
    where v in (select v from co)
    group by v
  )
  select co.v as value,
         round(co.via_topic * 5 + co.via_gallery / (1 + ln(1 + coalesce(freq.f, 0))), 2) as weight,
         co.via_topic, co.via_gallery
  from co
  left join freq on freq.v = co.v
  order by weight desc, co.v
  limit greatest(1, least(p_limit, 24));
$function$;

CREATE OR REPLACE FUNCTION public.rd_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$;

CREATE OR REPLACE FUNCTION public.zero_root(n integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when n is null or n=0 then n
              else (n / power(10, (length(n::text) - length(rtrim(n::text,'0'))))::int)::int end;
$function$;
