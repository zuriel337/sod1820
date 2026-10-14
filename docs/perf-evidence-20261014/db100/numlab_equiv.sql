-- strict equivalence: NULL methods, unregistered method, duplicate phrases/ties; EXCEPT ALL both directions; identical cursor chain for ALL pages; ordered sequence compare
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select (select id from gematria_words where is_verified and is_published limit 1), 'null-method '||g, null, 787, 'n787-'||g, 'ok', now(), 1 from generate_series(1,3) g;
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select (select id from gematria_words where is_verified and is_published limit 1), 'unregistered '||g, 'לא-רשום', 787, 'u787-'||g, 'ok', now(), 1 from generate_series(1,3) g;
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)  -- ties on (method, phrase)
select (select id from gematria_words where is_verified and is_published limit 1), 'same phrase', 'רגיל', 787, 'tie787-'||g, 'ok', now(), 1 from generate_series(1,4) g;
create or replace function chk(p bigint, lim int) returns table(page int, cur_only bigint, v2_only bigint, seq_equal boolean) language plpgsql as $$
declare cur text := null; pg int := 0; rc bigint; a bigint; b bigint; eq boolean;
begin
  loop
    pg := pg + 1;
    select count(*) into a from (select * from fn_number_lookup(p, lim, cur) except all select * from fn_number_lookup_v2(p, lim, cur)) x;
    select count(*) into b from (select * from fn_number_lookup_v2(p, lim, cur) except all select * from fn_number_lookup(p, lim, cur)) y;
    select coalesce(bool_and(c.bid_id is not distinct from v.bid_id), true) and (select count(*) from fn_number_lookup(p,lim,cur)) = (select count(*) from fn_number_lookup_v2(p,lim,cur))
      into eq from (select row_number() over () rn, bid_id from fn_number_lookup(p, lim, cur)) c join (select row_number() over () rn, bid_id from fn_number_lookup_v2(p, lim, cur)) v using (rn);
    page := pg; cur_only := a; v2_only := b; seq_equal := eq; return next;
    select bid_id, count(*) over () into cur, rc from (select bid_id from fn_number_lookup(p, lim, cur) offset greatest(lim-1,0) limit 1) z;
    exit when cur is null or pg > 400;
  end loop;
end $$;
select 'value 787 limit 20' scope, count(*) pages, sum(cur_only) cur_only, sum(v2_only) v2_only, bool_and(seq_equal) all_seq_equal from chk(787, 20);
select 'value 7871 limit 50' scope, count(*) pages, sum(cur_only) cur_only, sum(v2_only) v2_only, bool_and(seq_equal) all_seq_equal from chk(7871, 50);
select 'missing cursor' scope, count(*) from (select * from fn_number_lookup(787, 20, 'no-such') except all select * from fn_number_lookup_v2(787, 20, 'no-such')) a;
select 'null method rows present' scope, count(*) from fn_number_lookup(787, 500, null) where method is null;
select 'null method rows in v2' scope, count(*) from fn_number_lookup_v2(787, 500, null) where method is null;
