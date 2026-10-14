-- Counterexample 3: d34 numlab_data.sql generator shape. Noncorrelated scalar subquery => InitPlan evaluated once.
create temp table mkx as select array_agg(k order by k) a from (values ('a'),('b'),('c'),('d'),('e')) v(k);
create temp table old_gen as select (select a[1+floor(random()*cardinality(a))::int] from mkx) m from generate_series(1,1000) g;
select 'OLD generator distinct methods over 1000 rows' as what, count(distinct m) from old_gen;   -- expect 1
