\timing off
create temp table c(fn text, v bigint, rows_ int, ms numeric);
do $$
declare v bigint; t0 timestamptz; n int; r int;
begin
 for v in select x from unnest(array[787,1820,2029,613,26,1]::bigint[]) x loop
  for r in 1..3 loop
   t0:=clock_timestamp(); select count(*) into n from fn_number_lookup(v,20,null); insert into c values('lookup_old',v,n,extract(epoch from clock_timestamp()-t0)*1000);
   t0:=clock_timestamp(); select count(*) into n from fn_number_lookup_v3(v,20,null); insert into c values('lookup_v3',v,n,extract(epoch from clock_timestamp()-t0)*1000);
   t0:=clock_timestamp(); perform fn_number_dossier(v::int); insert into c values('dossier_old',v,0,extract(epoch from clock_timestamp()-t0)*1000);
   t0:=clock_timestamp(); perform fn_number_dossier_v3(v::int); insert into c values('dossier_v3',v,0,extract(epoch from clock_timestamp()-t0)*1000);
   if v<2000000000 then
   t0:=clock_timestamp(); perform fn_number_journey(v::int); insert into c values('journey_old',v,0,extract(epoch from clock_timestamp()-t0)*1000);
   t0:=clock_timestamp(); perform fn_number_journey_v3(v::int); insert into c values('journey_v3',v,0,extract(epoch from clock_timestamp()-t0)*1000);
   end if;
  end loop;
 end loop;
end$$;
select fn, v, round(min(ms),1) min_ms, round((percentile_cont(.5) within group(order by ms))::numeric,1) med_ms, round(max(ms),1) max_ms from c group by fn,v order by v,fn;
