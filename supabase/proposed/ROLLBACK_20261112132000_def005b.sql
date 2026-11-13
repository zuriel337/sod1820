-- Rollback of 20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql.
-- Restores the exact execute grants read from the live catalogue on 12.11.2026 (proacl), per signature.
-- "PUBLIC" = the previous default/explicit PUBLIC execute; a NULL ACL is restored as the equivalent explicit PUBLIC grant.
do $$
declare r record;
begin
  for r in select * from (values
    ('public.blocked_countries()',                                                         array['anon','authenticated','service_role']),
    ('public.contrib_unlock(text,text)',                                                   array['anon','authenticated']),
    ('public.enqueue_word_review(text,text,text,integer,jsonb,integer,integer,text,text,boolean)', array['public','anon','authenticated']),
    ('public.fn_cohort_acceptance(text)',                                                  array['public']),
    ('public.fn_decision_reeval_check(uuid)',                                              array['public']),
    ('public.fn_metatron_gaps()',                                                          array['public']),
    ('public.fn_metatron_status()',                                                        array['public']),
    ('public.increment_post_share_by_slug(text)',                                          array['public','anon','authenticated']),
    ('public.log_edge_geo(text,text)',                                                     array['public','anon','authenticated']),
    ('public.log_edge_geo(text)',                                                          array['public','anon','authenticated']),
    ('public.log_translit_query(text,text,text,text,numeric,text)',                        array['public','anon','authenticated']),
    ('public.push_sub_count()',                                                            array['public','anon','authenticated']),
    ('public.record_feedback(text,text,text,text,text,text,jsonb)',                        array['public','anon','authenticated']),
    ('public.refresh_traffic_daily(integer)',                                              array['public']),
    ('public.trusted_contributor_uids()',                                                  array['public','anon','authenticated']),
    ('public.vote_translit(text,text,text)',                                               array['public','anon','authenticated'])
  ) as t(sig, grantees)
  loop
    if to_regprocedure(r.sig) is null then raise notice 'skip missing %', r.sig; continue; end if;
    execute format('revoke all on function %s from public, anon, authenticated, service_role', r.sig);
    execute format('grant execute on function %s to %s', r.sig, array_to_string(r.grantees, ', '));
  end loop;
end $$;
