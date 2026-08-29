-- Follow-up to PASS 3 (20260829193400_pre_scan_governed_recertification_backfill.sql).
--
-- The backfill's ON CONFLICT(bid_id) target relies on public.fn_bidim_id() reproducing
-- each pre-existing legacy row's historical bid_id for (method_version=1, operator=NULL).
-- Verified live: for 14 of the 18 scannable methods this held exactly (every legacy row
-- was updated in place, zero duplicates). For exactly 4 methods — אותיות אחרי,
-- אותיות לפני, אטבח, מסתתר גדול — a combined 42,352 pre-existing legacy_unknown rows
-- used an older bid_id scheme that predates fn_bidim_id's md5(word_id::text||':'||
-- method_key) formula, so the backfill's INSERT created a new, correctly-identified
-- governed row alongside the old one instead of overwriting it, leaving 42,352
-- (word_id, method) pairs with two rows each.
--
-- Verified before deleting anything: for all 42,352 duplicate pairs, the legacy row's
-- value and the new governed row's value were IDENTICAL (single distinct value per
-- pair) — this is purely a historical bid_id-identity artifact, not an engine/value
-- discrepancy or data drift. Deleting the orphaned legacy_unknown half of each pair is
-- squarely PASS 3's own goal (bidim de-stratification, per SOD1820_MASTER_STATE.md's
-- open pre-scan precondition of the same name) for currently-scannable methods — it is
-- NOT a non-scannable/legacy-preservation case, which only applies to methods that are
-- not currently scannable (composites, משולש מילה/הפוך/מדרגות, מילוי דמילוי גדול,
-- מילוי בלבד, etc. — entirely untouched by this statement, confirmed via an unchanged
-- md5 checksum over all non-scannable rows before and after).

with dup as (
  select word_id, method
  from public.bidim
  where public.fn_method_is_scannable(method)
  group by word_id, method
  having count(*) > 1
)
delete from public.bidim b
using dup
where b.word_id = dup.word_id
  and b.method = dup.method
  and b.provenance_state = 'legacy_unknown'
  and exists (
    select 1 from public.bidim g
    where g.word_id = b.word_id and g.method = b.method
      and g.provenance_state = 'governed' and g.value is not distinct from b.value
  );

-- Post-condition verified live: every one of the 18 scannable methods now has exactly
-- 12,592 rows, all provenance_state='governed', zero legacy_unknown remaining, zero
-- duplicate (word_id, method) pairs. Total bidim rows: 348,240 (226,656 governed +
-- 121,584 legacy_unknown, all for non-scannable methods, checksum-verified untouched).
