-- Preserve the old fn_els_search projection contract for existing callers while all execution is
-- delegated to els_search_core_v1. New 2029 consumers use els_search_v1 and see the new engine
-- identity/result contract; legacy callers continue to see the historical sql-scan/server-scan tags.

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
      ) order by (h->>'skip')::int,(h->>'start')::int)
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

grant execute on function public.fn_els_search(text,integer,integer) to public;
