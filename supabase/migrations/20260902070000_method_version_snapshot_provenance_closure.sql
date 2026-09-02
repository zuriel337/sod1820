-- Method Version Snapshot — Provenance Closure
-- Closes the single "MUST FOUNDATION NOW" from the Universal Research Core Closure Pass
-- (SOD1820 — METHOD VERSION SNAPSHOT · FOUNDATION CLOSURE IMPLEMENTATION, 2.9.2026).
--
-- GAP (re-verified live before this migration): research_objects.engine_detail rows already
-- capture {engine, method, result, verified_at} but NOT gematria_methods.version/
-- dependency_version/dependency_versions. gematria_methods already tracks these (confirmed
-- live: version=1, dependency_version=1, dependency_versions={} for רגיל/מסתתר today), but
-- nothing snapshots them into a verification record at the moment of verification. For base
-- methods (immutable Hebrew letter-values) this is low-risk; for composite/derived methods
-- with real dependency_rules, a future dependency-rule revision would leave historical claims
-- with no stored proof of which version verified them.
--
-- SCOPE (writer crosswalk performed live before this migration):
--   fn_persist_discovery      -- AFFECTED. Server-side method verification (loops over phrase/
--                                 method pairs, calls fn_ragil/fn_misratar/fn_gadol/... directly
--                                 against p_value). Already has provable method_key knowledge --
--                                 gets the snapshot unconditionally, zero caller changes needed.
--   research_artifact_save    -- AFFECTED. engine_detail arrives pre-built from the caller
--                                 (client triage.js/buildIntakeMeta); this function does not
--                                 itself know which method verified the claim. Gets a new
--                                 trailing optional p_method_keys text[] default null param --
--                                 opt-in, 100% backward compatible, no existing caller touched.
--   admin_research_review     -- OUT OF SCOPE. Reads/merges existing engine_detail at governance
--                                 transitions (verification_state declarations); does not
--                                 originate a method-verified claim.
--   channel_update_save_to_research,
--   image_artifact_route_to_intake -- OUT OF SCOPE. engine_verified is always false for these;
--                                 engine_detail holds raw channel/OCR metadata, never a method-
--                                 verified calculation.
--   fn_composite_convergence_candidate -- OUT OF SCOPE. Writes only to research_candidates,
--                                 reads (never writes) research_objects.engine_detail.
--   els_records writers (save_els_matrix / update_els_matrix / ...) -- OUT OF SCOPE. Different
--                                 table (els_records, not research_objects), separate already-
--                                 closed Foundation domain; not touched.
--
-- NOT a new Method Identity system, not a new table, not a new engine, not a new graph, not a
-- Projection feature, not a historical-data cleanup. Purely additive: research_objects.status,
-- .kind, .engine_verified, verification vocabulary, governance/canonical/publication state and
-- confidence/ranking are all untouched by this migration. No historical research_objects row is
-- modified. Missing/unregistered method state is stored honestly as null -- never fabricated.

-- 1) Shared constructor. Pure/stable, reads only the live canonical gematria_methods registry.
--    Not SECURITY DEFINER: it is only ever invoked from inside the two SECURITY DEFINER writers
--    below, which already run with sufficient privilege; not yet exposed as its own public RPC
--    surface in this pass (kept minimal, per instruction not to build more than the invariant
--    requires).
create or replace function public.fn_method_version_snapshot(p_method_keys text[])
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with keys as (
    select distinct k from unnest(coalesce(p_method_keys, '{}'::text[])) as k
    where k is not null and btrim(k) <> ''
  ),
  resolved as (
    select
      keys.k as method_key,
      (gm.method_key is not null) as registered,
      gm.active,
      gm.version as method_version,
      gm.dependency_version,
      gm.dependency_versions,
      gm.function as engine,
      gm.dependency_verified_at
    from keys
    left join public.gematria_methods gm on gm.method_key = keys.k
  )
  select case
    when (select count(*) from resolved) = 0 then null
    when (select count(*) from resolved) = 1 then (
      select jsonb_build_object(
        'method_key', r.method_key,
        'registered', r.registered,
        'active', r.active,
        'method_version', r.method_version,
        'dependency_version', r.dependency_version,
        'dependency_versions', coalesce(r.dependency_versions, '{}'::jsonb),
        'engine', r.engine,
        'dependency_verified_at', r.dependency_verified_at
      ) from resolved r
    )
    else (
      select jsonb_build_object(
        'method_key', string_agg(r.method_key, '+' order by r.method_key),
        'registered', bool_and(r.registered),
        'method_version', null,
        'dependency_versions', jsonb_object_agg(r.method_key, r.method_version),
        'methods', jsonb_agg(jsonb_build_object(
          'method_key', r.method_key, 'registered', r.registered, 'active', r.active,
          'method_version', r.method_version, 'dependency_version', r.dependency_version,
          'dependency_versions', coalesce(r.dependency_versions, '{}'::jsonb),
          'engine', r.engine, 'dependency_verified_at', r.dependency_verified_at
        ) order by r.method_key)
      ) from resolved r
    )
  end;
$function$;

comment on function public.fn_method_version_snapshot(text[]) is
  'Method Version Snapshot Provenance Closure (2.9.2026). Pure/stable read of the live gematria_methods registry. Returns {method_key, registered, active, method_version, dependency_version, dependency_versions, engine, dependency_verified_at} for one method_key, or a composite shape ({method_key: joined by "+", dependency_versions: {key:version,...}, methods:[...]}) for several. Unregistered/unknown method_key -> registered=false, all version fields honestly null (never fabricated). Callers merge the result into research_objects.engine_detail as the sibling key "method_version_snapshot"; it never replaces or reinterprets any existing engine_detail key.';

-- 2) fn_persist_discovery: unconditional snapshot. It already knows every (phrase, method_key)
--    pair it verified -- collect the distinct method_keys used across the whole call and attach
--    the snapshot before insert. Every other line is byte-identical to the live function.
create or replace function public.fn_persist_discovery(p_value integer, p_terms text[], p_statement text, p_confidence integer DEFAULT NULL::integer, p_engine_detail jsonb DEFAULT '{}'::jsonb, p_evidence text DEFAULT NULL::text, p_source text DEFAULT 'discovery-engine'::text, p_source_ref text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_key text; v_id uuid; v_ph text; v_m text; v_calc int; v_lock bigint;
  v_methods_used text[] := '{}'::text[];
  v_snapshot jsonb;
  v_engine_detail jsonb;
begin
  if p_value is null
     or coalesce(array_length(p_terms,1),0) < 2
     or btrim(coalesce(p_statement,'')) = ''
     or p_engine_detail is null or p_engine_detail = '{}'::jsonb then
    raise warning 'fn_persist_discovery: insufficient_discovery (value=%, terms=%)', p_value, p_terms;
    return jsonb_build_object('ok', false, 'error', 'insufficient_discovery');
  end if;

  for v_ph, v_m in
    select je.key, jsonb_array_elements_text(je.value) from jsonb_each(p_engine_detail) je
  loop
    v_calc := case v_m
      when 'רגיל'   then fn_ragil(v_ph)
      when 'מילוי'  then fn_miluy(v_ph)
      when 'מסתתר'  then fn_misratar(v_ph)
      when 'קדמי'   then kadmi_calc(v_ph)
      when 'גדול'   then fn_gadol(v_ph)
      when 'סידורי' then fn_siduri(v_ph)
      when 'אתבש'   then atbash_calc(v_ph)
      when 'אלבם'   then fn_albam(v_ph)
      when 'ריבוע'  then fn_ribua(v_ph)
      else null end;
    if v_calc is null or v_calc <> p_value then
      raise warning 'fn_persist_discovery: engine_verification_failed (%/% = % ≠ %)', v_ph, v_m, v_calc, p_value;
      return jsonb_build_object('ok', false, 'error', 'engine_verification_failed',
        'phrase', v_ph, 'method', v_m, 'got', v_calc, 'expected', p_value);
    end if;
    v_methods_used := array_append(v_methods_used, v_m);
  end loop;

  -- Method Version Snapshot Provenance Closure (2.9.2026): attach a snapshot of every
  -- method's registry state at verification time, additively, never overwriting any
  -- existing key. Unaffected: dedup/idempotency below still keys off source_uid/claim_uid
  -- only, so a re-verification of an already-existing statement returns the EXISTING row
  -- untouched -- a historical row's snapshot is never retroactively rewritten by a later
  -- gematria_methods version change.
  v_snapshot := public.fn_method_version_snapshot(v_methods_used);
  v_engine_detail := case when v_snapshot is not null
    then p_engine_detail || jsonb_build_object('method_version_snapshot', v_snapshot)
    else p_engine_detail end;

  select string_agg(t, '|' order by t) into v_key
    from (select distinct btrim(x) t from unnest(p_terms) x) s;
  v_lock := hashtextextended('rd:' || p_value::text || ':' || v_key, 0);
  perform pg_advisory_xact_lock(v_lock);

  select ro.id into v_id from public.research_objects ro
   where ro.kind = 'relation' and ro.value = p_value and ro.status <> 'rejected'
     and (select string_agg(t, '|' order by t)
            from (select distinct btrim(x) t from unnest(ro.terms) x) z) = v_key
   limit 1;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'dedup', true, 'id', v_id, 'status', 'existing');
  end if;

  insert into public.research_objects
    (kind, status, value, terms, relates, statement, engine_verified, engine_detail,
     evidence, confidence, source, source_ref, contributor, meta, parent_id, promoted_node_id)
  values
    ('relation', 'candidate', p_value, p_terms, p_terms, p_statement, true, v_engine_detail,
     p_evidence, p_confidence,
     coalesce(nullif(btrim(p_source), ''), 'discovery-engine'), p_source_ref,
     'מערכת כי לה׳ המלוכה', coalesce(p_meta, '{}'::jsonb), null, null)
  on conflict (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    where created_at >= timestamptz '2026-08-29 21:00:00+00'
    do nothing
  returning id into v_id;

  if v_id is null then
    select ro.id into v_id from public.research_objects ro
     where public.fn_research_source_uid(ro.source_ref) = public.fn_research_source_uid(p_source_ref)
       and public.fn_research_claim_uid(ro.statement)   = public.fn_research_claim_uid(p_statement)
     order by ro.created_at
     limit 1;
    return jsonb_build_object('ok', true, 'dedup', true, 'id', v_id, 'status', 'existing',
      'absorbed_by', 'research_objects_identity_uidx');
  end if;

  return jsonb_build_object('ok', true, 'dedup', false, 'id', v_id, 'status', 'candidate');
end; $function$;

-- 3) research_artifact_save: new trailing optional param, opt-in, backward compatible.
--    Every line other than the new param and the snapshot merge is byte-identical to the
--    live function -- existing callers that don't pass p_method_keys get identical behavior.
create or replace function public.research_artifact_save(p_source_ref text, p_kind text, p_statement text, p_value integer, p_terms text[], p_contributor text, p_engine_verified boolean, p_engine_detail jsonb, p_meta jsonb DEFAULT '{}'::jsonb, p_method_keys text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_existing_id uuid;
  v_statement text;
  v_meta jsonb;
  v_engine_detail jsonb;
  v_new_id uuid;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_only');
  END IF;

  IF coalesce(trim(p_source_ref), '') = '' OR coalesce(trim(p_statement), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_required_field');
  END IF;

  IF p_kind NOT IN ('fact', 'relation', 'observation', 'hypothesis', 'question') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;

  v_statement := left(p_statement, 2000);

  -- V6 §7.1/§7.2/§7.3 provenance arrives already shaped by triage.js buildIntakeMeta(); only an
  -- OBJECT is accepted, so a malformed payload can never corrupt meta.
  v_meta := CASE WHEN jsonb_typeof(p_meta) = 'object' THEN p_meta ELSE '{}'::jsonb END;

  -- Method Version Snapshot Provenance Closure (2.9.2026): opt-in. p_method_keys is null for
  -- every caller that existed before this migration -- v_engine_detail is then byte-identical
  -- to p_engine_detail, so nothing changes for them. A caller that knows which method(s) it
  -- verified against can now pass them and get an honest, non-fabricated version snapshot
  -- merged in as an additive sibling key.
  v_engine_detail := p_engine_detail;
  IF p_method_keys IS NOT NULL AND coalesce(array_length(p_method_keys,1),0) > 0 THEN
    v_engine_detail := coalesce(v_engine_detail, '{}'::jsonb)
      || jsonb_build_object('method_version_snapshot', public.fn_method_version_snapshot(p_method_keys));
  END IF;

  -- Canonical identity pre-check (MF-1). NOT source_ref alone: that was the silent data-loss bug.
  SELECT id INTO v_existing_id
  FROM public.research_objects
  WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(p_source_ref)
    AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
  ORDER BY created_at
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id);
  END IF;

  INSERT INTO public.research_objects
    (kind, statement, value, terms, source, source_ref, contributor,
     engine_verified, engine_detail, status, privacy_scope, meta)
  VALUES (
    p_kind,
    v_statement,
    p_value,
    coalesce(p_terms, '{}'::text[]),
    'research_triage',
    p_source_ref,
    p_contributor,
    coalesce(p_engine_verified, false),
    v_engine_detail,
    'candidate',
    'private',
    v_meta
  )
  ON CONFLICT (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
    WHERE created_at >= timestamptz '2026-08-29 21:00:00+00'
    DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.research_objects
    WHERE public.fn_research_source_uid(source_ref) = public.fn_research_source_uid(p_source_ref)
      AND public.fn_research_claim_uid(statement)   = public.fn_research_claim_uid(v_statement)
    ORDER BY created_at
    LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', true,
      'research_object_id', v_existing_id, 'absorbed_by', 'research_objects_identity_uidx');
  END IF;

  RETURN jsonb_build_object('ok', true, 'routed', true, 'already_existed', false,
    'research_object_id', v_new_id,
    'extraction_fidelity', v_meta -> 'ext' -> 'extraction_integrity' ->> 'fidelity_status');
END;
$function$;
