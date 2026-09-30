-- SOD1820 — G3 ELS One-Engine compatibility closure.
-- EXTEND_EXISTING only. The legacy fn_els_search name remains temporarily for
-- existing NameLab consumers, but it is not an engine: all occurrence generation
-- delegates to the canonical els_search_core_v1 / els_torah_occurrences_internal_v1 tree.
-- Also removes unused public geometry surface from anon/authenticated.

create or replace function public.fn_els_search(
  p_term text,
  p_maxskip integer default 40,
  p_maxhits integer default 16
) returns jsonb
language sql
stable
security definer
set search_path to 'public','extensions'
as $function$
  with r as (
    select public.els_search_core_v1(p_term,'torah',p_maxskip,p_maxhits,null) x
  )
  select jsonb_build_object(
    'term', x->'input'->>'normalized',
    'letters', coalesce((x->'input'->>'length')::int,0),
    'plain', coalesce((x->>'plain_count')::bigint,0),
    'els_count', coalesce((x->>'els_count')::bigint,0),
    'min_skip', case when x->>'min_skip' is null then null else (x->>'min_skip')::int end,
    'hits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skip',(h->>'skip')::int,
        'dir',(h->>'dir')::int,
        'start',(h->>'start')::int
      ) order by (h->>'skip')::int,(h->>'start')::int,(h->>'dir')::int desc)
      from jsonb_array_elements(coalesce(x->'hits','[]'::jsonb)) h
    ),'[]'::jsonb),
    'searched_maxskip', coalesce((x->'search'->>'skip_max_executed')::int,least(greatest(coalesce(p_maxskip,40),2),20000)),
    'scope','torah',
    'corpus_id',x->>'corpus_id',
    'position_base',0,
    'engine','sql-scan',
    'profile','server-scan',
    'coverage','partial',
    'skip_domain',jsonb_build_object(
      'min',2,
      'max',coalesce((x->'search'->>'skip_max_executed')::int,0),
      'full_domain_max',case when x->'search'->>'full_domain_max' is null then null else (x->'search'->>'full_domain_max')::int end
    ),
    'plain_excluded',true,
    'truncated',coalesce((x->'completion'->>'truncated')::boolean,false),
    'ordering','skip,start'
  )
  from r
$function$;

revoke all on function public.fn_els_search(text,integer,integer) from public;
grant execute on function public.fn_els_search(text,integer,integer) to anon, authenticated, service_role;

revoke all on function public.els_search_geometry_v1(text,text,integer,integer,text,integer,integer,integer[],integer) from public;
revoke execute on function public.els_search_geometry_v1(text,text,integer,integer,text,integer,integer,integer[],integer) from anon, authenticated;
grant execute on function public.els_search_geometry_v1(text,text,integer,integer,text,integer,integer,integer[],integer) to service_role;

comment on function public.fn_els_search(text,integer,integer) is
  'TEMPORARY_COMPATIBILITY legacy projection over canonical els_search_core_v1. No independent occurrence generation. Retire after fn_els_for_name/fn_name_multi consumer rewire.';

comment on function public.els_search_geometry_v1(text,text,integer,integer,text,integer,integer,integer[],integer) is
  'Internal/service compatibility wrapper over els_search_geometry_core_v1. Public anon/auth execution revoked in G3 One-Engine closure.';
