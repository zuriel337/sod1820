-- PHASE 3b · bounded coverage completion for מילוי בלבד (2,044 rows), AFTER the 10,588/10,588 attestation.
-- SAFE PATH: direct governed INSERT. gematria_words is NOT touched (that would run the trigger).
-- The 10,588 historical rows are not read, updated or deleted here.
insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                          bid_id, method_version, operator, dependency_version_snapshot,
                          computed_at, engine_run_id, provenance_state)
select g.id, g.phrase, 'מילוי בלבד', public.fn_method_value('מילוי בלבד', g.phrase),
       4, g.category, g.is_verified,
       public.fn_bidim_id(g.id, 'מילוי בלבד', 2, 'diff'), 2, 'diff',
       (select gm.dependency_versions from public.gematria_methods gm where gm.method_key='מילוי בלבד'),
       now(), '11111111-2222-4333-8444-555555555555'::uuid, 'governed'
  from public.gematria_words g
 where g.is_verified
   and not exists (select 1 from public.bidim b where b.word_id = g.id and b.method = 'מילוי בלבד')
   and public.fn_method_value('מילוי בלבד', g.phrase) is not null
on conflict (bid_id) do nothing;
