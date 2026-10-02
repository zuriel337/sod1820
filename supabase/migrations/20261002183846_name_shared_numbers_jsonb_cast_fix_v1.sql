-- NAME_SHARED_NUMBERS_JSONB_CAST_FIX_V1
-- Regression fix after G3 fn_all_methods compatibility metadata was made registry-driven.
-- fn_all_methods now returns non-numeric metadata keys such as "מהמאגר": boolean.
-- Guard the integer cast inside CASE so PostgreSQL never attempts boolean::integer.
-- No engine/registry semantics change; consumer hardening only.

create or replace function public.fn_shared_numbers(p_parts text[])
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with mv as (
    select
      p as part,
      m.key as method,
      case
        when jsonb_typeof(m.value) = 'number'
          then (m.value #>> '{}')::int
        else null
      end as val
    from unnest(p_parts) p
    cross join lateral jsonb_each(fn_all_methods(p)) m(key,value)
    where m.key not in ('הכפלה','הכפלה_גדול','קדמי_גדול','ריבוע_גדול')
  ),
  dedup as (
    select distinct part, method, val
    from mv
    where val is not null and val > 0
  )
  select jsonb_build_object(
    'distinct_parts', (select count(distinct part) from dedup),
    'cross_parts', coalesce((
      select jsonb_agg(
        jsonb_build_object('value',val,'parts',nparts,'sources',sources)
        order by nparts desc, val
      )
      from (
        select
          val,
          count(distinct part) as nparts,
          jsonb_agg(distinct jsonb_build_object('part',part,'method',method)) as sources
        from dedup
        group by val
        having count(distinct part) >= 2
      ) a
      limit 20
    ), '[]'::jsonb),
    'internal', coalesce((
      select jsonb_agg(
        jsonb_build_object('part',part,'value',val,'methods',mcount,'ms',ms)
        order by mcount desc, val
      )
      from (
        select
          part,
          val,
          count(distinct method) as mcount,
          jsonb_agg(distinct method) as ms
        from dedup
        group by part, val
        having count(distinct method) >= 2
      ) b
      limit 20
    ), '[]'::jsonb)
  );
$function$;
