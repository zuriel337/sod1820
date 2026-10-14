\set since 'now() - interval ''7 days'''
\echo == GW1 public total count (count=exact, HEAD)
explain (analyze, buffers, costs off, timing off) select count(*) from gematria_words where is_verified and is_published and (is_encrypted is null or is_encrypted = false);
\echo == GW2 public created in last 7d count
explain (analyze, buffers, costs off, timing off) select count(*) from gematria_words where is_verified and is_published and (is_encrypted is null or is_encrypted = false) and created_at >= :since;
\echo == GW3 public visibility_changed in last 7d count
explain (analyze, buffers, costs off, timing off) select count(*) from gematria_words where is_verified and is_published and (is_encrypted is null or is_encrypted = false) and visibility_changed_at >= :since;
\echo == GW4 latest 3 by created_at
explain (analyze, buffers, costs off, timing off) select phrase,ragil,created_at,visibility_changed_at from gematria_words where is_verified and is_published and (is_encrypted is null or is_encrypted = false) order by created_at desc nulls last limit 3;
\echo == GW5 latest 3 by visibility_changed_at
explain (analyze, buffers, costs off, timing off) select phrase,ragil,created_at,visibility_changed_at from gematria_words where is_verified and is_published and (is_encrypted is null or is_encrypted = false) order by visibility_changed_at desc nulls last limit 3;
\echo == GW6 treasure tag (verified, tags @> x, limit 40)
explain (analyze, buffers, costs off, timing off) select phrase,ragil,gadol,tags from gematria_words where is_verified and tags @> array['אוצרות הגילוי'] limit 40;
\echo == GW7 number lookup ragil=787 verified
explain (analyze, buffers, costs off, timing off) select phrase,ragil from gematria_words where ragil = 787 and is_verified limit 50;
\echo == RC1 approved last 7d, order created desc limit 1000 (with count exact)
explain (analyze, buffers, costs off, timing off) select id,author_user_id,author_contributor_id,author_name,created_at from research_contributions where status='approved' and created_at >= :since order by created_at desc limit 1000;
\echo == RC1c count exact same filter
explain (analyze, buffers, costs off, timing off) select count(*) from research_contributions where status='approved' and created_at >= :since;
\echo == RC2 by 4 authors + convergence slug (literal ids)
select string_agg(quote_literal(id::text)||'::uuid', ',') as ids from (select distinct author_contributor_id id from research_contributions where author_contributor_id is not null and convergence_slug is not null limit 4) s \gset
explain (analyze, buffers, costs off, timing off) select id,title from research_contributions where author_contributor_id in (:ids) and status='approved' and convergence_slug is not null order by created_at desc limit 100;
\echo == RC3 target number 787 approved limit 12
explain (analyze, buffers, costs off, timing off) select id,author_name,title from research_contributions where target_type='number' and target_id='787' and status='approved' order by created_at desc limit 12;
