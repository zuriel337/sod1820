-- Number lookup equivalence matrix. Duplicate-sensitive TWO-WAY (EXCEPT ALL over whole-row jsonb) + ORDERED array equality + total_count.
-- Cursor and limit are IDENTICAL inputs to both implementations (page2 cursor is always taken from the OLD implementation's page 1).
\set ON_ERROR_STOP on
create or replace function lab_cmp_lookup(newfn text, v bigint, l int, c text, out old_only bigint, out new_only bigint, out ordered_equal boolean, out old_n bigint, out new_n bigint, out err text)
language plpgsql as $$
declare o jsonb; n jsonb; oe text; ne text;
begin
  begin select coalesce(jsonb_agg(to_jsonb(r)),'[]') into o from public.fn_number_lookup(v,l,c) r; exception when others then oe := sqlstate||':'||sqlerrm; end;
  begin execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from public.%I($1,$2,$3) r', newfn) into n using v,l,c; exception when others then ne := sqlstate||':'||sqlerrm; end;
  if oe is not null or ne is not null then
    old_only := 0; new_only := 0; ordered_equal := (oe is not distinct from ne); old_n := -1; new_n := -1; err := coalesce(oe,'ok')||' || '||coalesce(ne,'ok'); return; end if;
  select count(*) into old_only from (select x from jsonb_array_elements(o) x except all select x from jsonb_array_elements(n) x) s;
  select count(*) into new_only from (select x from jsonb_array_elements(n) x except all select x from jsonb_array_elements(o) x) s;
  ordered_equal := (o = n); old_n := jsonb_array_length(o); new_n := jsonb_array_length(n);
end $$;
grant execute on function lab_cmp_lookup to anon, authenticated;

-- case matrix
create or replace function lab_number_matrix(newfn text) returns table(role_name text, v bigint, lim int, cursor_kind text, old_only bigint, new_only bigint, ordered_equal boolean, old_n bigint, new_n bigint, err text)
language plpgsql as $$
declare vv bigint; ll int; ck text; cur text; r record;
begin
  foreach vv in array array[787,7871,7872,999999,0,-1] loop
    foreach ll in array array[null,0,-5,1,20,500,501,100000] loop
      foreach ck in array array['none','page1_last','mid','unknown','null_method_row'] loop
        cur := case ck when 'none' then null
          when 'page1_last' then (select bid_id from public.fn_number_lookup(vv, case when ll is null or ll<=0 then 20 else ll end, null) order by method, phrase, bid_id desc limit 1)  -- any real row of old page 1
          when 'mid' then (select bid_id from public.fn_number_lookup(vv, 40, null) offset 19 limit 1)
          when 'unknown' then 'no-such-bid'
          when 'null_method_row' then (select b.bid_id from bidim b where b.value=vv and b.method is null order by b.bid_id limit 1) end;
        if ck <> 'none' and cur is null and ck <> 'unknown' then continue; end if;
        select * into r from lab_cmp_lookup(newfn, vv, ll, cur);
        role_name := current_user; v:=vv; lim:=ll; cursor_kind:=ck; old_only:=r.old_only; new_only:=r.new_only; ordered_equal:=r.ordered_equal; old_n:=r.old_n; new_n:=r.new_n; err:=r.err; return next;
      end loop; end loop; end loop;
  -- NULL value input
  select * into r from lab_cmp_lookup(newfn, null, 20, null); role_name:=current_user; v:=null; lim:=20; cursor_kind:='none'; old_only:=r.old_only; new_only:=r.new_only; ordered_equal:=r.ordered_equal; old_n:=r.old_n; new_n:=r.new_n; err:=r.err; return next;
end $$;
grant execute on function lab_number_matrix to anon, authenticated;
