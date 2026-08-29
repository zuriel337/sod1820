-- PASS 3 of "Pre-Scan Closure Pass — Invariant Fix + Governed Re-Certification".
-- One-time governed backfill: for every currently is_verified=true gematria_words row
-- and every currently v_method_states.scannable=true method (18 methods, confirmed live
-- to also independently satisfy active/executable/engine_verified — the same predicate
-- bidim_sync() itself uses), compute the value via the canonical dispatcher
-- public.fn_method_value() and upsert into public.bidim via the SAME identity/upsert
-- pattern bidim_sync() already uses in production (fn_bidim_id, provenance_state=
-- 'governed', a single shared engine_run_id for this whole backfill run:
-- 6aa83a2d-cdc6-482b-a004-33f5f01a581b).
--
-- This does NOT touch: any non-scannable/legacy method's rows (the 4 composites,
-- משולש מילה, משולש הפוך, משולש מדרגות, מילוי דמילוי גדול, מילוי בלבד, אות רבתי,
-- איק בכר, or any other not-currently-scannable method) — those bid_id values never
-- appear in any of the 18 statements below, so their rows are never touched by the
-- ON CONFLICT upsert. It does NOT change gematria_words. It does NOT activate any
-- composite (all remain active=false, scannable=false, untouched by this pass). All
-- 18 currently-scannable methods are non-composite (category <> 'composite'), so
-- operator/dependency_version_snapshot are NULL for every row this pass writes.
--
-- EXECUTION NOTE: a first attempt wrapped this as a single nested PL/pgSQL loop
-- (18 methods x 12,592 words, with a BEGIN/EXCEPTION block per iteration) submitted
-- via apply_migration. That call exceeded the MCP tool's 60s client timeout; the
-- underlying Postgres backend was confirmed (via pg_stat_activity) to still be
-- executing minutes later, but once the client connection dropped, Postgres rolled
-- the whole transaction back cleanly (bidim was verified byte-identical to baseline
-- afterward — no partial/corrupted write occurred). Per-iteration EXCEPTION blocks
-- implicitly create a subtransaction/savepoint each time, which does not scale to
-- ~226,656 iterations. This file instead uses 18 plain set-based INSERT...SELECT
-- statements (one per scannable method, each computing fn_method_value once per row
-- via a CTE, no per-row exception handling) — each individually verified fast
-- (single-method reads over the full 12,592-row corpus completed in low single-digit
-- seconds). Applied as 18 separate direct SQL executions against the canonical
-- project (data/DML, not DDL — per Supabase MCP tool guidance, apply_migration is
-- reserved for schema/DDL, which this is not), each well under any timeout, rather
-- than as a single apply_migration call. Kept here as one file for reviewability and
-- reproducibility of exactly what was run.

-- Shared run id for this whole backfill: 6aa83a2d-cdc6-482b-a004-33f5f01a581b

with meta as (
  select method_key, category, operator, method_version, dependency_versions
  from public.v_method_states where method_key = 'רגיל' and scannable
),
computed as (
  select w.id, w.phrase, w.category as wcat, w.is_verified,
         public.fn_method_value(meta.method_key, w.phrase) as v,
         meta.category as mcat, meta.operator, meta.method_version, meta.dependency_versions
  from public.gematria_words w cross join meta
  where w.is_verified
)
insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                          bid_id, method_version, operator, dependency_version_snapshot,
                          computed_at, engine_run_id, provenance_state)
select c.id, c.phrase, 'רגיל', c.v, 1, c.wcat, c.is_verified,
       public.fn_bidim_id(c.id, 'רגיל', c.method_version, case when c.mcat='composite' then c.operator else null end),
       c.method_version, case when c.mcat='composite' then c.operator else null end,
       case when c.mcat='composite' then c.dependency_versions else null end,
       now(), '6aa83a2d-cdc6-482b-a004-33f5f01a581b'::uuid, 'governed'
from computed c where c.v is not null
on conflict (bid_id) do update set
  value = excluded.value, phrase = excluded.phrase, is_verified = excluded.is_verified,
  category = excluded.category, priority = excluded.priority, method_version = excluded.method_version,
  operator = excluded.operator, dependency_version_snapshot = excluded.dependency_version_snapshot,
  computed_at = excluded.computed_at, engine_run_id = excluded.engine_run_id, provenance_state = 'governed';

-- The same statement shape is repeated for the remaining 17 scannable methods,
-- substituting only the method key and its priority-class (1 for מסתתר/קדמי, 2 for
-- מילוי, 3 for אתבש, 4 for every other scannable method), per bidim_sync()'s own
-- priority mapping:
-- מילוי (2) · מסתתר (1) · קדמי (1) · ריבוע (4) · גדול (4) · סידורי (4) · אתבש (3) ·
-- אלבם (4) · אטבח (4) · אותיות אחרי (4) · אותיות לפני (4) · הכפלה (4) ·
-- משולש גדול (4) · מסתתר גדול (4) · מילוי דמילוי (4) · הכפלה גדולה (4) · ריבוע גדול (4)
