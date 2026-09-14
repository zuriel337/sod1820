-- G2 P0 containment A+D only. Human Gate: ZURIEL 2026-09-13.
-- Preserve history/payload; close unauthenticated authority mutation and freeze legacy autonomous publisher.

-- 1) discoveries is not a public intake table. Remove direct client INSERT authority and permissive policy.
DROP POLICY IF EXISTS anon_insert_discoveries ON public.discoveries;
REVOKE INSERT ON TABLE public.discoveries FROM anon, authenticated;

-- 2) Internal semantic/publication writers are not client APIs.
REVOKE EXECUTE ON FUNCTION public.run_direct_scan(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_direct_scan(text,text,jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.ingest_bridges_to_discoveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_bridges_to_discoveries() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cron_sync_writer_gematria() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_sync_writer_gematria() TO service_role;

-- Machine-only verifier: nested SECURITY DEFINER/admin code can still call it as owner; service paths retain access.
REVOKE EXECUTE ON FUNCTION public.fn_verify_gematria_word_engine(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_gematria_word_engine(uuid) TO service_role;

-- 3) Freeze the legacy autonomous publisher. Function/history remain intact for replay/audit.
SELECT cron.unschedule(37) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobid=37);

-- 4) Identity bridge hardening: preserve only live client capabilities (legacy seed, authenticated login, push).
-- Arbitrary caller-supplied kinds may no longer mint identity edges.
CREATE OR REPLACE FUNCTION public.link_identity(
  p_sod_id text,
  p_kind text,
  p_legacy_id text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_meta jsonb DEFAULT NULL::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_person uuid;
  v_existing uuid;
  v_old uuid;
  v_claimed boolean;
BEGIN
  IF p_sod_id IS NULL OR btrim(p_sod_id) = '' THEN
    RETURN NULL;
  END IF;

  -- Public contract is explicit and finite. resolve_person itself creates the canonical device edge.
  IF p_kind NOT IN ('legacy_seed','login','push') THEN
    RETURN NULL;
  END IF;

  IF p_kind = 'login' THEN
    IF p_user_id IS NULL OR auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
      RETURN NULL;
    END IF;
  ELSE
    -- Anonymous bridge kinds never carry a claimed account principal.
    IF p_user_id IS NOT NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  IF p_kind = 'legacy_seed' AND (p_legacy_id IS NULL OR btrim(p_legacy_id) = '') THEN
    RETURN NULL;
  END IF;

  v_person := public.resolve_person(p_sod_id);
  IF v_person IS NULL THEN RETURN NULL; END IF;

  IF p_kind = 'login' THEN
    SELECT (account_user_id IS NOT NULL AND account_user_id <> p_user_id)
      INTO v_claimed FROM persons WHERE person_id = v_person;
    IF NOT coalesce(v_claimed, false) THEN
      SELECT person_id INTO v_existing FROM persons WHERE account_user_id = p_user_id LIMIT 1;
      IF v_existing IS NOT NULL AND v_existing <> v_person THEN
        v_old := v_person;
        UPDATE identity_edges SET person_id = v_existing WHERE person_id = v_old;
        UPDATE events SET person_id = v_existing WHERE person_id = v_old;
        UPDATE research_objects SET owner_person_id = v_existing WHERE owner_person_id = v_old;
        UPDATE persons
           SET last_seen = greatest(persons.last_seen, (SELECT last_seen FROM persons WHERE person_id=v_old))
         WHERE person_id = v_existing;
        DELETE FROM persons WHERE person_id = v_old;
        v_person := v_existing;
      ELSE
        UPDATE persons SET account_user_id = p_user_id WHERE person_id = v_person;
      END IF;
    END IF;
  END IF;

  IF p_kind = 'legacy_seed' THEN
    INSERT INTO identity_edges (sod_id, person_id, kind, legacy_id, meta)
      VALUES (p_sod_id, v_person, p_kind, p_legacy_id, p_meta)
      ON CONFLICT (sod_id, person_id, legacy_id)
        WHERE kind = 'legacy_seed' AND legacy_id IS NOT NULL
      DO UPDATE SET last_seen = now();
  ELSE
    INSERT INTO identity_edges (sod_id, person_id, kind, legacy_id, meta)
      VALUES (p_sod_id, v_person, p_kind, p_legacy_id, p_meta)
      ON CONFLICT (sod_id, person_id, kind) WHERE kind <> 'legacy_seed'
      DO UPDATE SET last_seen = now(), legacy_id = coalesce(excluded.legacy_id, identity_edges.legacy_id);
  END IF;

  RETURN v_person;
END
$function$;

COMMENT ON FUNCTION public.link_identity(text,text,text,uuid,jsonb) IS
  'Canonical identity bridge. Public/client kinds are finite: legacy_seed, login (auth-owned), push. Arbitrary kinds are rejected before resolve_person. G2 P0 containment 2026-09-13.';
