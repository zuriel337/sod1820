-- Bidim Foundation Patch: source-derived publication + in_engine sync gate.
--
-- Human-Gate direction (ZURIEL, 2026-08-29):
-- 1) bidim stays a derived projection/index; gematria_words remains the
--    single publication source of truth. No is_published column on bidim.
-- 2) bidim public access must derive from the source row's
--    is_verified=true AND is_published=true.
-- 3) bidim_sync's method-selection gate must also require in_engine=true.
-- 4) gematria_methods registry rows for the 5 affected methods are left
--    untouched -- their in_engine reconciliation is separate, future work.
--    "Function executes" is not the same claim as "method verified."

-- 1) bidim RLS: replace the wide-open policy with a source-derived one.
--    No new column added to bidim -- publication is read live from
--    gematria_words via word_id, preserving single-source-of-truth.
drop policy if exists "bidim_public_read" on public.bidim;
create policy "bidim_public_read" on public.bidim
  for select
  using (
    exists (
      select 1 from public.gematria_words gw
      where gw.id = bidim.word_id
        and gw.is_verified = true
        and gw.is_published = true
    )
  );

-- 2) bidim_sync: require in_engine=true in addition to the existing
--    active=true / function IS NOT NULL / category<>'composite' gate.
--    Everything else in the function body is unchanged.
CREATE OR REPLACE FUNCTION public.bidim_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m record; v bigint; ckey text; cval bigint; pr int;
  approved_sum_composites text[] := ARRAY['רגיל+מילוי','רגיל+מסתתר','רגיל+משולש','משולש מילה+משולש הפוך'];
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    DELETE FROM public.bidim WHERE word_id = OLD.id;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') AND NEW.is_verified THEN
    FOR m IN SELECT method_key, function FROM public.gematria_methods
             WHERE active = true AND in_engine = true AND function IS NOT NULL AND category <> 'composite'
    LOOP
      BEGIN
        EXECUTE format('SELECT (%I($1))::bigint', m.function) INTO v USING NEW.phrase;
      EXCEPTION WHEN others THEN
        v := NULL;
      END;
      IF v IS NOT NULL THEN
        pr := CASE m.method_key
                WHEN 'רגיל' THEN 1 WHEN 'מסתתר' THEN 1 WHEN 'קדמי' THEN 1
                WHEN 'מילוי' THEN 2 WHEN 'אתבש' THEN 3 ELSE 4 END;
        INSERT INTO public.bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
        VALUES (NEW.id, NEW.phrase, m.method_key, v, pr, NEW.category, NEW.is_verified, md5(NEW.id::text || ':' || m.method_key))
        ON CONFLICT (bid_id) DO UPDATE SET value = excluded.value, is_verified = excluded.is_verified;
      END IF;
    END LOOP;

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
$function$;

-- NOTE (not executed here, informational): existing bidim rows for the 5
-- in_engine=false methods (איק בכר, מילוי דמילוי גדול, משולש הפוך,
-- משולש מדרגות, משולש מילה) are NOT deleted by this migration -- this gate
-- only controls future syncs. Audited before this migration: every existing
-- row for these 5 methods belongs to a source row that is already
-- is_verified=true AND is_published=true (the grandfathered corpus), so the
-- new bidim RLS above continues to expose them exactly as before -- no
-- exposure change, no orphaning, no cleanup currently required. See
-- work_log for the per-method counts.
