-- Read-only parity probe used for number-db-map.md. Everything lives in pg_temp inside a rolled-back transaction.
-- Requires pg_temp.nl(p bigint) with the 37-column body from number-lookup.new-body.sql.tmpl (:P → p).
begin; set local role anon;
-- create function pg_temp.nl(...) ... ;  (see the .tmpl; columns identical to fn_number_lookup's RETURNS TABLE)
select v,
 (select count(*) from (select * from public.fn_number_lookup(v) except select * from pg_temp.nl(v)) d) old_minus_new,
 (select count(*) from (select * from pg_temp.nl(v) except select * from public.fn_number_lookup(v)) d) new_minus_old,
 (select count(*) from public.fn_number_lookup(v)) rows_old, (select count(*) from pg_temp.nl(v)) rows_new
from unnest(array[0,1,26,300,363,541,613,888,1820,2026,5112,99999]::bigint[]) v order by v;
rollback;
