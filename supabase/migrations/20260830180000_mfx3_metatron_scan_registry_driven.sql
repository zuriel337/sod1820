-- MF-X3 — REGISTRY-DRIVEN PARTICIPATION IN THE CONVERGENCE WRITER
--
-- Fixes the EXISTING convergence writer. No new engine, registry, convergence store,
-- reverse index, graph, router or truth store. `convergences` ownership is preserved.
--
-- DEFECT
--   fn_metatron_scan section A ("same_method_equality") iterated a HARDCODED list:
--       FOREACH v_method IN ARRAY ARRAY['ragil','misratar','kadmi','miluy','gadol','siduri']
--   so a method's participation in Discovery depended on being named in that literal, not
--   on the governed registry. A newly registered/approved method could never enter
--   Discovery without editing this function — the exact failure the Engine Governance
--   Foundation forbids ("אסור שכתיבה אוטומטית כלשהי … תתרחש רק מפני ששם-שיטה מופיע בקוד קשיח").
--   Live consequence: `convergences` covered 6 method tokens while 14 were fully governed.
--
-- THE KEY IDENTITY FACT (derived live, and the reason this is safe)
--   `convergences.method` does NOT store gematria_methods.method_key. It stores
--   gematria_methods.db_column — the LATIN token ('ragil', 'gadol', …), while registry keys
--   are Hebrew ('רגיל', 'גדול', …). The six hardcoded strings are exactly six db_column
--   values. `convergences` identity is UNIQUE (kind, method, value).
--   => Iterating the registry and continuing to emit `convergences.method = db_column`
--      replaces the hardcode with ZERO change to convergence identity or meaning.
--      Existing rows keep their keys untouched; newly eligible methods add new keys.
--
-- REGISTRY ELIGIBILITY RULE (derived from live governance, not assumed)
--   participation  ⟺  public.fn_method_is_scannable(method_key)      -- the canonical
--                                                                       write/scan gate:
--                                                                       scannable ∧ active ∧
--                                                                       executable ∧
--                                                                       engine_verified (HG-E1)
--                     AND db_column IS NOT NULL
--                     AND that column physically exists on public.gematria_words
--   Live result: 14 eligible methods — the 6 previously hardcoded (ragil, misratar, kadmi,
--   miluy, gadol, siduri) plus 8 that were governed but excluded by the literal:
--   albam, atbash, hakpala, hakpala_gadol, kadmi_gadol, miluy_demiluy, ribua, ribua_gadol.
--   Nothing is widened: `scannable` remains an explicit Human Gate, so a method that has not
--   been admitted for scanning still does not participate.
--
-- "coverage: none" TREATMENT
--   A registry row whose db_column is NULL or whose column does not exist is simply not
--   iterated — no row emitted, no error. This matches the writer's existing "unavailable
--   produces nothing" convention rather than inventing an error contract.
--
-- DELIBERATELY UNCHANGED
--   · the data source (public.gematria_words.<db_column>) and its filters
--     (is_verified = true AND space = 'core' AND value IS NOT NULL AND value > 0)
--   · the grouping and p_min_group threshold
--   · the upsert target and ON CONFLICT (kind, method, value) DO UPDATE behaviour
--   · the emitted `method` token (db_column) — i.e. convergence identity
--   · section B (anchor_hit) — not method-specific, untouched
--   · the RETURNS TABLE(kind text, found integer) shape
--   · signature, volatility (VOLATILE), security mode (INVOKER) and ACL
--
-- NOT DONE HERE — EXTENSION POINT, needs a Human-Gate decision
--   16 registry methods have db_column IS NULL (including all composites and the whole
--   legacy_unknown cohort). A read-only probe proved `bidim` is an EQUIVALENT source for the
--   existing grouping — for 'רגיל' it produced 1057 groups vs 1057 from the column source,
--   1057 with identical group_size and 0 present on only one side — so bidim could remove the
--   column dependency entirely. What blocks it is not capability but IDENTITY: a column-less
--   method has no canonical `convergences.method` token, and writing Hebrew method_key into a
--   column that today holds only Latin db_column values would mix two vocabularies inside the
--   UNIQUE(kind, method, value) key, changing convergence identity/meaning. That token choice
--   is a Human-Gate decision and is deliberately NOT invented here.
--
-- THIS MIGRATION DOES NOT RUN THE SCAN. Replacing the function is separate from executing it;
-- the coverage expansion from 6 to 14 only materialises when the scan is next run
-- (cron job 27 'metatron-nightly' is currently active=false).
--
-- IDEMPOTENT: CREATE OR REPLACE may be replayed safely.

create or replace function public.fn_metatron_scan(p_min_group integer default 3)
returns table(kind text, found integer)
language plpgsql
as $function$
#variable_conflict use_column
DECLARE
  v_method TEXT;
  v_count INT;
  v_total_eq INT := 0;
  v_total_anchor INT := 0;
BEGIN
  -- A) קבוצות שוויון בתוך שיטה: אותו ערך, כמה ביטויים מאומתים (core, לא lab)
  -- MF-X3: participation is now REGISTRY-DRIVEN. The former hardcoded six-method literal is
  -- replaced by the governed scan gate (fn_method_is_scannable) restricted to methods that
  -- actually have a materialised column. v_method remains the db_column token, so the value
  -- written to convergences.method — and therefore convergence identity — is unchanged.
  FOR v_method IN
    SELECT m.db_column
      FROM public.gematria_methods m
     WHERE m.db_column IS NOT NULL
       AND public.fn_method_is_scannable(m.method_key)
       AND EXISTS (
             SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = 'public'
                AND c.table_name   = 'gematria_words'
                AND c.column_name  = m.db_column
           )
     ORDER BY m.db_column
  LOOP
    EXECUTE format($q$
      INSERT INTO public.convergences (kind, method, value, phrases, group_size, score, details)
      SELECT 'same_method_equality', %L, val, phr, n, n,
             jsonb_build_object('method', %L)
      FROM (
        SELECT %I AS val, array_agg(phrase ORDER BY phrase) AS phr, count(*) AS n
        FROM public.gematria_words
        WHERE is_verified = true AND space = 'core' AND %I IS NOT NULL AND %I > 0
        GROUP BY %I
        HAVING count(*) >= %s
      ) g
      ON CONFLICT (kind, method, value) DO UPDATE SET
        phrases = EXCLUDED.phrases,
        group_size = EXCLUDED.group_size,
        score = EXCLUDED.score,
        last_seen = NOW()
    $q$, v_method, v_method, v_method, v_method, v_method, v_method, p_min_group);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_eq := v_total_eq + v_count;
  END LOOP;

  -- B) פגיעות בעוגנים: מילים שערך כלשהו שלהן פוגע במספר-אם פעיל  (UNCHANGED)
  INSERT INTO public.convergences (kind, method, value, phrases, group_size, score, details)
  SELECT 'anchor_hit', 'any', nr.number,
         array_agg(DISTINCT gw.phrase ORDER BY gw.phrase),
         count(DISTINCT gw.phrase),
         count(DISTINCT gw.phrase) + 10,
         jsonb_build_object('root_word', nr.root_word, 'essence', left(coalesce(nr.essence,''), 200))
  FROM public.number_roots nr
  JOIN public.gematria_words gw
    ON nr.number = ANY(gw.all_values)
   AND gw.is_verified = true AND gw.space = 'core'
  WHERE nr.is_active = true
  GROUP BY nr.number, nr.root_word, nr.essence
  ON CONFLICT (kind, method, value) DO UPDATE SET
    phrases = EXCLUDED.phrases,
    group_size = EXCLUDED.group_size,
    score = EXCLUDED.score,
    last_seen = NOW();
  GET DIAGNOSTICS v_total_anchor = ROW_COUNT;

  RETURN QUERY SELECT 'same_method_equality'::TEXT, v_total_eq
  UNION ALL SELECT 'anchor_hit'::TEXT, v_total_anchor;
END;
$function$;

comment on function public.fn_metatron_scan(integer) is
  'Convergence writer (Discovery, stage 4 of unified_discovery_architecture). MF-X3: method participation is REGISTRY-DRIVEN — fn_method_is_scannable(method_key) AND db_column present AND the column exists — replacing the former hardcoded six-method literal. convergences.method continues to carry db_column, so convergence identity UNIQUE(kind,method,value) is unchanged. Methods without db_column cannot participate yet: they have no canonical convergences.method token, which is a Human-Gate identity decision (EXTENSION POINT). Section B (anchor_hit) unchanged. MF-X3, 30.8.2026.';
