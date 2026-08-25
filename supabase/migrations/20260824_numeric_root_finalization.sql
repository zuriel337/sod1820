-- ============================================================================
-- NUMERIC ROOT FINALIZATION — Public Composites × bidim Materialization ×
-- Registry-Driven Maintenance. ZURIEL Human-Gate approved direction.
-- Builds on 83427b80 (method dependency metadata + research functions) and
-- 73f2592f (anchor freeze + AIQ BEKAR), both already live in this project.
-- Does NOT touch: ELS files/tables, number_anchors (stays frozen),
-- אטבח/אח"ס בט"ע/מילוי גדול (HOLD, untouched).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1 — ACCESS DECISION: composite existence/basic result -> PUBLIC.
-- Advanced tooling built on top (arbitrary composites, N x N research, deep
-- comparison/visualization, Raziel interpretation, unrestricted Research
-- Studio) stays separately ENTITLED-capable — NOT decided by this change.
-- Prior premium label (Decision E, RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md
-- §28.2) preserved as historical record in source_of_truth, not erased.
-- ----------------------------------------------------------------------------
UPDATE public.gematria_methods
SET required_entitlement = 'public',
    source_of_truth = source_of_truth ||
      ' | ZURIEL Human-Gate (Numeric Root Finalization, this pass): basic existence/deterministic-result access corrected premium->public specifically to enrich rare/large number pages with few atomic matches. Advanced research tooling built on this composite (arbitrary user-built composites, N×N research, deep comparison/visualization, Raziel deep interpretation, unrestricted Research Studio) remains separately undecided/ENTITLED-capable. Prior default (premium, all 4, Decision E / §28.2, 22.8) preserved here as historical record — not deleted, superseded for the basic-result surface only.'
WHERE category = 'composite';

-- ----------------------------------------------------------------------------
-- PART 2 — MATERIALIZE the four approved SUM composites into EXISTING bidim.
-- No new table, no new gematria_words columns. SUM only (task section 3) —
-- DIFF stays available on-demand via fn_composite_calc_all_ops, never
-- materialized here.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record; ckey text; cval bigint;
  legacy_composites text[] := ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך'];
BEGIN
  FOR r IN SELECT id, phrase, category FROM public.gematria_words WHERE is_verified = true LOOP
    FOREACH ckey IN ARRAY legacy_composites LOOP
      SELECT result INTO cval FROM public.fn_composite_calc(ckey, r.phrase);
      IF cval IS NOT NULL THEN
        INSERT INTO public.bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
        VALUES (r.id, r.phrase, ckey, cval, 4, r.category, true, md5(r.id::text || ':' || ckey))
        ON CONFLICT (bid_id) DO UPDATE SET value = excluded.value;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- PART 3 — REGISTRY-DRIVEN bidim MAINTENANCE (replaces the hardcoded write path).
-- Decision K, finally implemented. gw_enforce_engine (the 14 Legacy Baseline
-- gematria_words columns, §26.1 Method Storage Law) is UNCHANGED — those columns
-- stay exactly as they are, hardcoded on purpose (Legacy Baseline is not meant
-- to auto-grow). Only bidim_sync (the reverse INDEX) becomes registry-driven:
-- every active, function-wired, non-composite ATOMIC method + the 4 approved
-- PUBLIC SUM composites, looped from gematria_methods — no hardcoded list.
-- Verified equivalent to the legacy hardcoded version for the 14 legacy
-- methods via a rolled-back transaction test (spot-checked, not exhaustive)
-- before this was ever applied for real.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bidim_sync()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  m record; v bigint; ckey text; cval bigint; pr int;
  -- The 4 approved PUBLIC SUM composites (Decision E, existence approved;
  -- Part 1 above, access=public). Adding a 5th composite in the future is a
  -- separate Human-Gate decision, not a code change to this trigger.
  approved_sum_composites text[] := ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך'];
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    DELETE FROM public.bidim WHERE word_id = OLD.id;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') AND NEW.is_verified THEN
    -- Atomic methods: registry-driven, not hardcoded. Covers the 14 legacy
    -- methods + every depth method + AIQ BEKAR + any future approved atomic
    -- method with zero edits to this trigger.
    FOR m IN SELECT method_key, function FROM public.gematria_methods
             WHERE active = true AND function IS NOT NULL AND category <> 'composite'
    LOOP
      BEGIN
        EXECUTE format('SELECT (%I($1))::bigint', m.function) INTO v USING NEW.phrase;
      EXCEPTION WHEN others THEN
        v := NULL; -- one bad method must never block the whole word's write
      END;
      IF v IS NOT NULL THEN
        -- Priority mapping preserves the exact legacy semantics for the 14
        -- original methods; every new/depth/composite method defaults to 4,
        -- matching every prior backfill this session's own convention.
        pr := CASE m.method_key
                WHEN 'רגיל' THEN 1 WHEN 'מסתתר' THEN 1 WHEN 'קדמי' THEN 1
                WHEN 'מילוי' THEN 2 WHEN 'אתבש' THEN 3 ELSE 4 END;
        INSERT INTO public.bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
        VALUES (NEW.id, NEW.phrase, m.method_key, v, pr, NEW.category, NEW.is_verified, md5(NEW.id::text || ':' || m.method_key))
        ON CONFLICT (bid_id) DO UPDATE SET value = excluded.value, is_verified = excluded.is_verified;
      END IF;
    END LOOP;

    -- Approved PUBLIC SUM composites: derived from canonical atomic results
    -- ONLY via fn_composite_calc — never reimplemented here.
    FOREACH ckey IN ARRAY approved_sum_composites LOOP
      SELECT result INTO cval FROM public.fn_composite_calc(ckey, NEW.phrase);
      IF cval IS NOT NULL THEN
        INSERT INTO public.bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
        VALUES (NEW.id, NEW.phrase, ckey, cval, 4, NEW.category, NEW.is_verified, md5(NEW.id::text || ':' || ckey))
        ON CONFLICT (bid_id) DO UPDATE SET value = excluded.value, is_verified = excluded.is_verified;
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$fn$;

COMMENT ON FUNCTION public.bidim_sync() IS
  'Registry-driven bidim maintenance (Decision K, RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md §26.1). Loops gematria_methods (active atomic methods + the 4 approved PUBLIC SUM composites) instead of a hardcoded method list. A newly approved/active method or word requires zero edits to this function. gw_enforce_engine (the 14 Legacy Baseline gematria_words columns) is intentionally untouched by this change.';

-- ----------------------------------------------------------------------------
-- PART 4 — NUMBER PAGE INTEGRATION: extend the EXISTING fn_number_lookup so
-- callers can distinguish atomic vs composite matches with full component
-- provenance, without a second lookup path.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_number_lookup(bigint);

CREATE FUNCTION public.fn_number_lookup(p_value bigint)
RETURNS TABLE (
  method text, phrase text, value bigint, source text, vip_source text,
  is_verified boolean, dna_status text, node_id uuid, category text, tags text[],
  mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean,
  final_letter_sensitive boolean,
  atomic_or_composite text, component_methods text[], component_values bigint[], operator text,
  provenance text
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT b.method, b.phrase, b.value, gw.source, gw.vip_source,
         gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
         gm.final_letter_sensitive,
         CASE WHEN gm.category = 'composite' THEN 'composite' ELSE 'atomic' END,
         CASE WHEN gm.category = 'composite' THEN (SELECT c.component_methods FROM public.fn_composite_calc(b.method, b.phrase) c) ELSE NULL END,
         CASE WHEN gm.category = 'composite' THEN (SELECT c.component_values FROM public.fn_composite_calc(b.method, b.phrase) c) ELSE NULL END,
         CASE WHEN gm.category = 'composite' THEN 'sum' ELSE NULL END,
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry', b.method, b.value, gw.id)
  FROM bidim b
  JOIN gematria_words gw ON gw.id = b.word_id
  LEFT JOIN gematria_methods gm ON gm.method_key = b.method
  WHERE b.value = p_value
  ORDER BY (gm.category = 'composite'), b.method, b.phrase;
END;
$$;

COMMENT ON FUNCTION public.fn_number_lookup(bigint) IS
  'Deep Numeric Lookup — ONE thin canonical read interface. Extended (Numeric Root Finalization) with atomic_or_composite/component_methods/component_values/operator so callers can present Direct/Composite matches distinctly (never labeled as if the composite were a plain atomic method) without a second lookup path. Composite component provenance is computed on-demand via fn_composite_calc, not stored redundantly.';

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   select required_entitlement from gematria_methods where category='composite'; -- expect all 'public'
--   select count(*) from bidim where method in
--     ('רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך');           -- expect ~50,368
--   select * from fn_number_lookup(1820) where atomic_or_composite='composite';   -- may be empty, that's fine
--   select * from fn_number_lookup(368);                                          -- סבל/פחד composite, expect a composite row
-- ============================================================================
