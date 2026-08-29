-- BLOCKER-EG-1 closure, correction: best_evidence_class was picked with min() on the
-- class NAME, which ranks alphabetically ('historical_unexecutable' < 'historical_ungoverned')
-- and would therefore report a strictly worse class as the "best" one. Replaced with an
-- explicit semantic rank. Behaviour of `governed` and of the returned row set is unchanged.
create or replace function public.fn_value_phrase_list(p_value bigint, p_limit int default 240)
returns table(phrase text, governed boolean, best_evidence_class text,
              governed_methods text[], historical_methods text[])
language sql stable set search_path to 'public' as $$
  with rows as (
    select b.phrase as ph, b.method as mt,
           public.fn_method_evidence_class(b.method) as ec
    from public.bidim b where b.value = p_value
  ),
  ranked as (
    select ph, mt, ec,
           case ec when 'governed' then 0 when 'historical_public' then 1
                   when 'historical_unverified' then 2 when 'historical_ungoverned' then 3
                   when 'historical_unexecutable' then 4 else 5 end as rnk
    from rows
  )
  select ph,
         bool_or(ec = 'governed')                                                   as governed,
         (array_agg(ec order by rnk))[1]                                            as best_evidence_class,
         array_agg(distinct mt order by mt) filter (where ec = 'governed')           as governed_methods,
         array_agg(distinct mt order by mt) filter (where ec <> 'governed')          as historical_methods
  from ranked
  group by ph
  order by bool_or(ec = 'governed') desc, min(rnk), ph
  limit p_limit;
$$;

comment on function public.fn_value_phrase_list(bigint, int) is
  'Governed projection of the value family (מסע ההתכנסות / equal-value list). HG-E4: EVERY phrase that reaches the value is still returned — including phrases reached only through inactive composites or non-scannable methods — but each carries `governed`, its best (semantically ranked) evidence class, and the exact governed/historical method sets. Governed phrases rank first. Nothing is filtered out.';
