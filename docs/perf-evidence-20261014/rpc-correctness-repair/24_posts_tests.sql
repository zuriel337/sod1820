-- posts_by_number_strict equivalence. Oracle rank uses the OLD regex verbatim. Compare (a) full result (lim=1e6) as MULTISET two-way (EXCEPT ALL), duplicates counted;
-- (b) ordered (rnk,date) sequence; (c) limited pages: sequence equal AND returned rows subset of full set (old order among exact ties is unspecified => not compared by identity).
\set ON_ERROR_STOP on
create or replace function lab_old_rnk(p posts, n int) returns int language sql stable as $$
  select case when p.title ~ ('(^|[^0-9])' || n::text || '([^0-9]|$)') then 1
              when exists (select 1 from unnest(p.tags) t where t ~ ('(^|[^0-9])' || n::text || '([^0-9]|$)')) then 2 else 9 end $$;
create or replace function lab_cmp_posts(fn text, n int, l int, out miss bigint, out extra bigint, out seq_equal boolean, out subset_ok boolean, out err text)
language plpgsql as $$
declare oa jsonb; na jsonb; full_old jsonb; oe text; ne text;
begin
  begin select coalesce(jsonb_agg(to_jsonb(r)),'[]') into oa from posts_by_number_strict(n,l) r; exception when others then oe:=sqlstate; end;
  begin execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I($1,$2) r', fn) into na using n,l; exception when others then ne:=sqlstate; end;
  if oe is not null or ne is not null then miss:=0; extra:=0; seq_equal:=(oe is not distinct from ne); subset_ok:=seq_equal; err:=coalesce(oe,'ok')||'/'||coalesce(ne,'ok'); return; end if;
  -- sequence in terms of (oracle rank, date)
  seq_equal := (select coalesce(jsonb_agg(jsonb_build_array(lab_old_rnk(p,n), x->>'date') ),'[]') from jsonb_array_elements(oa) x join posts p on p.slug=x->>'slug')
            is not distinct from
               (select coalesce(jsonb_agg(jsonb_build_array(lab_old_rnk(p,n), x->>'date') ),'[]') from jsonb_array_elements(na) x join posts p on p.slug=x->>'slug');
  -- NOTE: the join by slug on both sides loses order; recompute order-preserving:
  seq_equal := (select jsonb_agg(jsonb_build_array(lab_old_rnk(p,n), x->>'date') order by ord) from jsonb_array_elements(oa) with ordinality a(x,ord) join posts p on p.slug=x->>'slug')
            is not distinct from
               (select jsonb_agg(jsonb_build_array(lab_old_rnk(p,n), x->>'date') order by ord) from jsonb_array_elements(na) with ordinality a(x,ord) join posts p on p.slug=x->>'slug');
  if l is null or l >= 1000000 then
    select count(*) into miss  from (select x from jsonb_array_elements(oa) x except all select x from jsonb_array_elements(na) x) s;
    select count(*) into extra from (select x from jsonb_array_elements(na) x except all select x from jsonb_array_elements(oa) x) s;
    subset_ok := miss=0 and extra=0;
  else
    select coalesce(jsonb_agg(to_jsonb(r)),'[]') into full_old from posts_by_number_strict(n,1000000) r;
    miss:=0; extra := (select count(*) from (select x from jsonb_array_elements(na) x except select x from jsonb_array_elements(full_old) x) s);
    subset_ok := extra=0;
  end if;
end $$;
create or replace function lab_posts_matrix(fn text) returns table(n int, l int, miss bigint, extra bigint, seq_equal boolean, subset_ok boolean, err text) language plpgsql as $$
declare nn int; ll int; r record; begin
  for nn in select distinct x from (select (regexp_matches(coalesce(title,'')||' '||array_to_string(tags,' '),'[0-9]{1,9}','g'))[1]::int x from posts
      union select unnest(array[787,0,-787,-5,5,788,7870,2147483647,1000000000,999999999,-2147483648,123456]) ) s order by 1 loop
    foreach ll in array array[1000000,null,0,1,2,3,7] loop
      select * into r from lab_cmp_posts(fn,nn,ll); n:=nn; l:=ll; miss:=r.miss; extra:=r.extra; seq_equal:=r.seq_equal; subset_ok:=r.subset_ok; err:=r.err; return next; end loop; end loop;
  select * into r from lab_cmp_posts(fn,null,3); n:=null; l:=3; miss:=r.miss; extra:=r.extra; seq_equal:=r.seq_equal; subset_ok:=r.subset_ok; err:=r.err; return next;
  select * into r from lab_cmp_posts(fn,787,-1); n:=787; l:=-1; miss:=r.miss; extra:=r.extra; seq_equal:=r.seq_equal; subset_ok:=r.subset_ok; err:=r.err; return next;
end $$;
