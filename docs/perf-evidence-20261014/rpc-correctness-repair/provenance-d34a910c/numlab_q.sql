\timing off
\echo === equivalence (rows only in one side; expect 0 / 0)
select (select count(*) from (select * from fn_number_lookup(787,20,null) except select * from fn_number_lookup_v2(787,20,null)) a) cur_only_787_l20,
       (select count(*) from (select * from fn_number_lookup_v2(787,20,null) except select * from fn_number_lookup(787,20,null)) b) v2_only_787_l20,
       (select count(*) from (select * from fn_number_lookup(7871,null,null) except select * from fn_number_lookup_v2(7871,null,null)) a) cur_only_7871_all,
       (select count(*) from (select * from fn_number_lookup_v2(7871,null,null) except select * from fn_number_lookup(7871,null,null)) b) v2_only_7871_all,
       (select min(total_count) from fn_number_lookup(787,20,null)) tc_cur, (select min(total_count) from fn_number_lookup_v2(787,20,null)) tc_v2;
\echo === cursor page 2 equivalence
select (select count(*) from (select * from fn_number_lookup(7871,20,(select bid_id from fn_number_lookup(7871,20,null) offset 19 limit 1)) except select * from fn_number_lookup_v2(7871,20,(select bid_id from fn_number_lookup_v2(7871,20,null) offset 19 limit 1))) a) page2_cur_only;
