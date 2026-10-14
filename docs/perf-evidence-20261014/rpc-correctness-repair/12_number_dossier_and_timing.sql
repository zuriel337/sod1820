\set ON_ERROR_STOP on
\echo '== distribution (per value): rows, distinct methods, NULL-method rows, unknown-method rows'
select value, count(*) hits, count(distinct method) methods, count(*) filter (where method is null) null_method, count(*) filter (where method like 'לא_רשום_%') unknown_method from bidim where value in (787,7871,7872) group by 1 order by 1;
\echo '== dossier convergences JSON equality (cur vs v2 grouped), owner / anon / authenticated, 8 values'
create or replace function lab_dossier_eq() returns table(role_name text, v bigint, equal boolean) language sql stable as $$
  select current_user::text, x, dossier_conv_cur(x) = dossier_conv_v2(x) from unnest(array[787,7871,7872,999999,0,-1,1,2,3]::bigint[]) x $$;
grant execute on function lab_dossier_eq to anon, authenticated;
select * from lab_dossier_eq() where not equal;  select 'owner' r, count(*) n, count(*) filter (where equal) eq from lab_dossier_eq();
set role anon; select 'anon' r, count(*), count(*) filter (where equal) from lab_dossier_eq();
set role authenticated; select 'authenticated' r, count(*), count(*) filter (where equal) from lab_dossier_eq(); reset role;
\echo '== timing (owner role, warm cache, 3 runs each, ms) -- fn_composite_calc is a STUB (lower bound): NOT end-to-end function speed'
\timing on
select count(*) from fn_number_lookup(787,20,null); select count(*) from fn_number_lookup(787,20,null); select count(*) from fn_number_lookup(787,20,null);
select count(*) from fn_number_lookup_v3(787,20,null); select count(*) from fn_number_lookup_v3(787,20,null); select count(*) from fn_number_lookup_v3(787,20,null);
select count(*) from fn_number_lookup(7871,20,null); select count(*) from fn_number_lookup(7871,20,null); select count(*) from fn_number_lookup(7871,20,null);
select count(*) from fn_number_lookup_v3(7871,20,null); select count(*) from fn_number_lookup_v3(7871,20,null); select count(*) from fn_number_lookup_v3(7871,20,null);
select count(*) from fn_number_lookup(7872,20,null); select count(*) from fn_number_lookup(7872,20,null); select count(*) from fn_number_lookup(7872,20,null);
select count(*) from fn_number_lookup_v3(7872,20,null); select count(*) from fn_number_lookup_v3(7872,20,null); select count(*) from fn_number_lookup_v3(7872,20,null);
select count(*) from dossier_conv_cur(7872); select count(*) from dossier_conv_cur(7872);
select count(*) from dossier_conv_v2(7872); select count(*) from dossier_conv_v2(7872);
