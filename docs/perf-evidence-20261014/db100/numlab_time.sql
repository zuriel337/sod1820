\echo fn_number_lookup value=787 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(787,20,null);
\echo fn_number_lookup value=787 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(787,null,null);
\echo fn_number_lookup_v2 value=787 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(787,20,null);
\echo fn_number_lookup_v2 value=787 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(787,null,null);
\echo fn_number_lookup value=7871 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7871,20,null);
\echo fn_number_lookup value=7871 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7871,null,null);
\echo fn_number_lookup_v2 value=7871 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7871,20,null);
\echo fn_number_lookup_v2 value=7871 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7871,null,null);
\echo fn_number_lookup value=7872 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7872,20,null);
\echo fn_number_lookup value=7872 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7872,null,null);
\echo fn_number_lookup_v2 value=7872 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7872,20,null);
\echo fn_number_lookup_v2 value=7872 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7872,null,null);
\echo fn_number_lookup value=7873 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7873,20,null);
\echo fn_number_lookup value=7873 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup(7873,null,null);
\echo fn_number_lookup_v2 value=7873 limit=20
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7873,20,null);
\echo fn_number_lookup_v2 value=7873 limit=null
explain (analyze, buffers, timing off, costs off) select * from fn_number_lookup_v2(7873,null,null);
