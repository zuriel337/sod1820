-- PHASE 5 · governed reverse-index coverage, safe path (direct INSERT; gematria_words never touched).
-- מיקום האות: 39 -> full verified corpus (it was opened to scanning after the last bulk scan).
insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                          bid_id, method_version, operator, dependency_version_snapshot,
                          computed_at, engine_run_id, provenance_state)
select g.id, g.phrase, 'מיקום האות', public.fn_method_value('מיקום האות', g.phrase),
       4, g.category, g.is_verified,
       public.fn_bidim_id(g.id, 'מיקום האות', (select version from public.gematria_methods where method_key='מיקום האות'), null),
       (select version from public.gematria_methods where method_key='מיקום האות'), null, null,
       now(), '33333333-4444-4555-8666-777777777777'::uuid, 'governed'
  from public.gematria_words g
 where g.is_verified
   and not exists (select 1 from public.bidim b where b.word_id=g.id and b.method='מיקום האות')
   and public.fn_method_value('מיקום האות', g.phrase) is not null
on conflict (bid_id) do nothing;
