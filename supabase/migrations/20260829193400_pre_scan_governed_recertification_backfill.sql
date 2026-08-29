-- PASS 3 of "Pre-Scan Closure Pass — Invariant Fix + Governed Re-Certification".
-- One-time governed backfill: for every currently is_verified=true gematria_words row
-- and every currently v_method_states.scannable=true method (18 methods, confirmed live
-- to also independently satisfy active/executable/engine_verified — same predicate
-- bidim_sync() itself uses), compute the value via the canonical dispatcher
-- public.fn_method_value() and upsert into public.bidim via the SAME identity/upsert
-- pattern bidim_sync() already uses in production (fn_bidim_id, provenance_state=
-- 'governed', a single shared engine_run_id for this backfill run).
--
-- This does NOT touch: any non-scannable/legacy method's rows (the 4 composites,
-- משולש מילה, משולש הפוך, משולש מדרגות, מילוי דמילוי גדול, מילוי בלבד, אות רבתי,
-- איק בכר, or any other not-currently-scannable method) — those bid_id values never
-- appear in this loop's scannable-method set, so their rows are never touched by the
-- ON CONFLICT upsert. It does NOT change gematria_words. It does NOT activate any
-- composite (all remain active=false, scannable=false, untouched by this pass).
--
-- Mirrors bidim_sync()'s per-row logic exactly (same priority mapping, same
-- exception-swallow-to-null per computation, same conflict target/update set),
-- applied once across the whole current corpus rather than per-trigger-fire.

do $$
declare
  m record;
  w record;
  v bigint;
  pr int;
  v_bid text;
  v_run uuid := gen_random_uuid();
begin
  for m in
    select method_key, category, operator, method_version, dependency_versions, sort_order
    from public.v_method_states
    where scannable
    order by sort_order
  loop
    for w in
      select id, phrase, category, is_verified
      from public.gematria_words
      where is_verified
    loop
      begin
        v := public.fn_method_value(m.method_key, w.phrase);
      exception when others then
        v := null;
      end;

      if v is not null then
        pr := case m.method_key
                when 'רגיל' then 1 when 'מסתתר' then 1 when 'קדמי' then 1
                when 'מילוי' then 2 when 'אתבש' then 3
                else 4 end;

        v_bid := public.fn_bidim_id(
                   w.id, m.method_key, m.method_version,
                   case when m.category = 'composite' then m.operator else null end);

        insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                                  bid_id, method_version, operator, dependency_version_snapshot,
                                  computed_at, engine_run_id, provenance_state)
        values (w.id, w.phrase, m.method_key, v, pr, w.category, w.is_verified,
                v_bid, m.method_version,
                case when m.category = 'composite' then m.operator else null end,
                case when m.category = 'composite' then m.dependency_versions else null end,
                now(), v_run, 'governed')
        on conflict (bid_id) do update set
          value                       = excluded.value,
          phrase                      = excluded.phrase,
          is_verified                 = excluded.is_verified,
          category                    = excluded.category,
          priority                    = excluded.priority,
          method_version              = excluded.method_version,
          operator                    = excluded.operator,
          dependency_version_snapshot = excluded.dependency_version_snapshot,
          computed_at                 = excluded.computed_at,
          engine_run_id               = excluded.engine_run_id,
          provenance_state            = 'governed';
      end if;
    end loop;
  end loop;
end $$;
