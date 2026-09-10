-- PHASE 5 (cont.) · remaining coverage gaps for the currently-scannable methods.
insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                          bid_id, method_version, operator, dependency_version_snapshot,
                          computed_at, engine_run_id, provenance_state)
select g.id, g.phrase, m.method_key, public.fn_method_value(m.method_key, g.phrase),
       4, g.category, g.is_verified,
       public.fn_bidim_id(g.id, m.method_key, m.version,
                          case when m.category='composite' then m.operator else null end),
       m.version,
       case when m.category='composite' then m.operator else null end,
       case when m.category='composite' then m.dependency_versions else null end,
       now(), '33333333-4444-4555-8666-777777777777'::uuid, 'governed'
  from public.gematria_words g
  cross join public.gematria_methods m
 where m.method_key in ('מילוי דמילוי גדול','משולש מדרגות','משולש מילה','משולש הפוך','איק בכר','משולש מילה+משולש הפוך')
   and g.is_verified
   and not exists (select 1 from public.bidim b where b.word_id=g.id and b.method=m.method_key)
   and public.fn_method_value(m.method_key, g.phrase) is not null
on conflict (bid_id) do nothing;
