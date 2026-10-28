set local statement_timeout = '55000ms';
select jsonb_agg(jsonb_build_object('id', id, 'md5_window', md5(s)) order by id) as windows
from (select id, string_agg(row_s, '' order by r) as s from (
  select w.id, w.r0 + k as r, string_agg(t.ch, '' order by t.idx) as row_s
  from (values ('v1', 22, 3555)) w(id, r0, c0)
  cross join generate_series(0, 32) k
  join public.torah_stream t on t.idx between (w.r0 + k) * 5541 + w.c0 + 1 and (w.r0 + k) * 5541 + w.c0 + 41
  group by w.id, w.r0, k) rows group by id) q;