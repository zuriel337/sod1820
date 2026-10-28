set local statement_timeout = '55000ms';
select jsonb_agg(jsonb_build_object('id', id, 'md5_window', md5(s)) order by id) as windows
from (select id, string_agg(row_s, '' order by r) as s from (
  select w.id, w.r0 + k as r, string_agg(t.ch, '' order by t.idx) as row_s
  from (values ('real', 0, 162), ('t01', 0, 1111), ('t02', 0, 1414), ('t03', 0, 1616), ('t04', 0, 808), ('t05', 0, 303), ('t06', 0, 0), ('t07', 0, 404), ('t08', 0, 1515), ('t09', 0, 707), ('t10', 0, 606), ('t11', 0, 505), ('t12', 0, 1313)) w(id, r0, c0)
  cross join generate_series(0, 30) k
  join public.torah_stream t on t.idx between (w.r0 + k) * 10101 + w.c0 + 1 and (w.r0 + k) * 10101 + w.c0 + 101
  group by w.id, w.r0, k) rows group by id) q;
