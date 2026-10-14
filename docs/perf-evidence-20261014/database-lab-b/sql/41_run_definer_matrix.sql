\set ON_ERROR_STOP on
\echo '== definer RPC parity matrix (LIVE definition vs v3 candidate), per caller context. cases / differing / raised an error / same error in both'
drop table if exists lab_res; create table lab_res(ctx text, v integer, k text, equal boolean, err_old text, err_new text, old_len integer, scope text, cu text, adm boolean); grant all on lab_res to public;
select set_config('lab.ctx','owner_no_claims',false) as _ \gset
select set_config('request.jwt.claims','',false) as _ \gset
insert into lab_res select * from lab_def_matrix();
select set_config('lab.ctx','service_role_claim',false) as _ \gset
select set_config('request.jwt.claims','{"role":"service_role"}',false) as _ \gset
insert into lab_res select * from lab_def_matrix();
select set_config('lab.ctx','anon',false) as _ \gset
select set_config('request.jwt.claims','{"role":"anon"}',false) as _ \gset
set role anon;
insert into lab_res select * from lab_def_matrix();
reset role;
select set_config('lab.ctx','authenticated_non_admin',false) as _ \gset
select set_config('request.jwt.claims','{"role":"authenticated","sub":"bbbbbbbb-0000-0000-0000-000000000002"}',false) as _ \gset
set role authenticated;
insert into lab_res select * from lab_def_matrix();
reset role;
select set_config('lab.ctx','authenticated_admin',false) as _ \gset
select set_config('request.jwt.claims','{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001"}',false) as _ \gset
set role authenticated;
insert into lab_res select * from lab_def_matrix();
reset role;
select ctx, k, count(*) cases, count(*) filter (where not equal) differing, count(*) filter (where err_old is not null or err_new is not null) raised_error, count(*) filter (where err_old is not null and err_new is not null and err_old = err_new) same_error from lab_res group by ctx, k order by ctx, k;
\echo '-- context really applied? (db user, rd_is_admin(), projection_scope of the live function output)'
select ctx, k, min(cu) db_user, bool_and(adm) all_admin, bool_or(adm) any_admin, string_agg(distinct scope, ',') scopes from lab_res group by ctx, k order by 1,2;
\echo '-- first differing cases'
select ctx, k, v, left(err_old,60) err_old, left(err_new,60) err_new from lab_res where not equal order by ctx, k, v limit 20;
\echo '-- distinct error messages (same in both)'
select distinct k, v, left(err_old,100) from lab_res where err_old is not null order by 1,2 limit 12;
