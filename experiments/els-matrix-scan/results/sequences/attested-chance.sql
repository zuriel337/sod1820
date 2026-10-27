-- How often does a RANDOM straight run of k letters (here: skip 461, deterministic start offsets) appear as k consecutive letters of the Torah text?
-- Read-only. torah_stream.ch is already base letters. 20,000 deterministic samples per k.
set local statement_timeout = '55000ms';
with s as materialized (select idx, ch from public.torah_stream),
n as materialized (select count(*)::int as total from s),
w as materialized (select idx, string_agg(ch, '') over (order by idx rows between current row and 7 following) as g8 from s),
gram as materialized (select idx, substr(g8, 1, 5) as g5, substr(g8, 1, 6) as g6, substr(g8, 1, 7) as g7, g8 from w where length(g8) = 8),
d as materialized (select (select count(distinct g5) from gram) as d5, (select count(distinct g6) from gram) as d6, (select count(distinct g7) from gram) as d7, (select count(distinct g8) from gram) as d8),
samples as materialized (select i, ((i::bigint * 104729) % ((select total from n) - 3700))::int as p from generate_series(1, 20000) i),
rays as materialized (select sm.i, string_agg(t.ch, '' order by j) as r8 from samples sm cross join generate_series(0, 7) j join s t on t.idx = sm.p + j * 461 + 1 group by sm.i),
rk as materialized (select i, substr(r8, 1, 5) as r5, substr(r8, 1, 6) as r6, substr(r8, 1, 7) as r7, r8 from rays),
set5 as materialized (select distinct g5 as g from gram), set6 as materialized (select distinct g6 as g from gram),
set7 as materialized (select distinct g7 as g from gram), set8 as materialized (select distinct g8 as g from gram)
select (select total from n) as stream_letters, d.*,
  (select count(*) from rk where r5 in (select g from set5)) as hit5, (select count(*) from rk where r6 in (select g from set6)) as hit6,
  (select count(*) from rk where r7 in (select g from set7)) as hit7, (select count(*) from rk where r8 in (select g from set8)) as hit8,
  (select count(*) from rk) as samples
from d;
