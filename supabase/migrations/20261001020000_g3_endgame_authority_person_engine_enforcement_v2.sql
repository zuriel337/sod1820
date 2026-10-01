-- G3_ENDGAME_AUTHORITY_PERSON_ENGINE_ENFORCEMENT_V2 — BRANCH-ONLY. NOT APPLIED to any live DB.
-- Owners: foundation_closure_protocol_law v7 · person_foundation_contract_law v6 ·
--         research_intake_foundation_contract_law v13 · gematria_engine_law v2 · canonical_methods_registry_law v6.
-- EXTEND_EXISTING only: no new store/engine/registry. Four parts:
--   A. fn_research_resolve_owner_person  — read-only resolver over EXISTING canonical identity
--      (wa_account_links verified phone -> persons.account_user_id; or an explicit person:<uuid> ref).
--   B. fn_all_methods — compat shape preserved; every value now comes from the canonical registry
--      (fn_method_value, gated by active + fn_method_is_engine_verified). No independent formulas.
--   C. research_artifact_save — Person-owned save without canonical owner linkage is refused
--      (never returns ok/routed); resolved owner is persisted in owner_person_id.
--   D. Bounded backfill of historical wa-raziel DM rows whose owner is uniquely provable
--      (intent: 67 linked, 21 unresolved untouched).

-- A ----------------------------------------------------------------------------------------
create or replace function public.fn_research_resolve_owner_person(p_source_ref text)
returns uuid
language plpgsql stable security definer set search_path to 'public'
as $$
declare v_ref text := btrim(coalesce(p_source_ref,'')); v_uuid uuid; v_phone text; v_n int; v_person uuid;
begin
  if v_ref = '' then return null; end if;
  -- explicit Person ref: person:<uuid>[:...] — must exist in persons
  if v_ref ~* '^person:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' then
    v_uuid := substring(v_ref from 8 for 36)::uuid;
    return (select person_id from public.persons where person_id = v_uuid);
  end if;
  -- WhatsApp DM chat id: <phone>@c.us — only a UNIQUE verified link to a UNIQUE person resolves
  if v_ref ~ '^[0-9]{8,15}@c\.us$' then
    v_phone := replace(v_ref, '@c.us', '');
    select count(distinct p.person_id), min(p.person_id::text)::uuid into v_n, v_person
      from public.wa_account_links l
      join public.persons p on p.account_user_id = l.user_id
     where l.phone = v_phone and l.verified_at is not null;
    if v_n = 1 and (select count(distinct user_id) from public.wa_account_links
                     where phone = v_phone and verified_at is not null) = 1
    then return v_person; end if;
  end if;
  return null;
end $$;
revoke all on function public.fn_research_resolve_owner_person(text) from public, anon, authenticated;
grant execute on function public.fn_research_resolve_owner_person(text) to service_role;

-- B ----------------------------------------------------------------------------------------
create or replace function public.fn_all_methods(p_word text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  w text := btrim(p_word);
  v jsonb := '{}'::jsonb;
  r record;
  cached jsonb;
  val bigint;
begin
  -- compat key -> registry method_key. Values are ONLY produced by the registry dispatch.
  for r in
    select * from (values
      ('רגיל','רגיל'),('מסתתר','מסתתר'),('קדמי','קדמי'),('מילוי','מילוי'),('גדול','גדול'),
      ('סידורי','סידורי'),('אתבש','אתבש'),('אלבם','אלבם'),('הכפלה','הכפלה'),
      ('הכפלה_גדול','הכפלה גדולה'),('קדמי_גדול','משולש גדול'),('מילוי_דמילוי','מילוי דמילוי'),
      ('ריבוע','ריבוע'),('ריבוע_גדול','ריבוע גדול'),
      ('אותיות_אחרי','אותיות אחרי'),('אותיות_לפני','אותיות לפני')
    ) t(compat_key, method_key)
  loop
    if exists (select 1 from public.gematria_methods g
                where g.method_key = r.method_key and g.active
                  and coalesce(g.required_entitlement,'public') = 'public')
       and public.fn_method_is_engine_verified(r.method_key)
       and public.fn_method_is_executable(r.method_key)
    then
      val := public.fn_method_value(r.method_key, w);
      if val is not null then v := v || jsonb_build_object(r.compat_key, val); end if;
    end if;
  end loop;
  -- provenance only: whether a verified stored row exists (and its כל_הערכים blob); never a value source
  select to_jsonb(t) into cached from (
    select all_values as "כל_הערכים" from public.gematria_words
     where phrase = w and is_verified = true
     order by (space='core') desc, lead_rank nulls last limit 1) t;
  if cached is not null then v := v || cached || jsonb_build_object('מהמאגר', true);
  else v := v || jsonb_build_object('מהמאגר', false); end if;
  return v;
end $$;

-- C ----------------------------------------------------------------------------------------
-- Re-declared from live definition (pg_get_functiondef @ main 49ebb49) with ONE added gate +
-- owner_person_id persisted on the new-row INSERT. Append/convergence path is unchanged.
do $mig$
declare d text; d2 text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='research_artifact_save';
  if d is null then raise exception 'research_artifact_save missing'; end if;
  if d like '%fn_research_resolve_owner_person%' then return; end if;  -- idempotent

  d2 := replace(d, E'  v_actor_type text;\nBEGIN', E'  v_actor_type text;\n  v_owner uuid;\nBEGIN');
  d2 := replace(d2,
    E'  v_statement := left(p_statement, 2000);\n',
    E'  -- G3 gate: a Person-owned save (person:<uuid> ref, or WA DM ref with a unique canonical link)\n'
    E'  -- must carry canonical owner linkage; an explicit person: ref that does not resolve is refused.\n'
    E'  v_owner := public.fn_research_resolve_owner_person(p_source_ref);\n'
    E'  IF v_owner IS NULL AND btrim(p_source_ref) ~* ''^person:'' THEN\n'
    E'    RETURN jsonb_build_object(''ok'', false, ''error'', ''person_owner_linkage_required'');\n'
    E'  END IF;\n\n  v_statement := left(p_statement, 2000);\n');
  d2 := replace(d2,
    E'engine_verified, engine_detail, status, privacy_scope, meta)\n  VALUES (',
    E'engine_verified, engine_detail, status, privacy_scope, meta, owner_person_id)\n  VALUES (');
  d2 := replace(d2, E'    ''private'',\n    v_meta\n  )', E'    ''private'',\n    v_meta,\n    v_owner\n  )');
  if d2 = d or d2 not like '%v_owner,%' or d2 not like '%owner_person_id)%' or d2 not like '%person_owner_linkage_required%' then
    raise exception 'research_artifact_save patch did not apply cleanly';
  end if;
  execute d2;
end $mig$;

-- D ----------------------------------------------------------------------------------------
-- Only rows: source='wa-raziel', contributor='DM' (identified), owner_person_id IS NULL, whose
-- source_ref resolves uniquely. 'DM-anon' (16) and test-zion-958 (5) never resolve and stay untouched.
-- Expected live effect (verified read-only at authoring): 67 linked, 21 unresolved untouched.
update public.research_objects r
   set owner_person_id = public.fn_research_resolve_owner_person(r.source_ref)
 where r.source = 'wa-raziel' and r.contributor = 'DM' and r.owner_person_id is null
   and public.fn_research_resolve_owner_person(r.source_ref) is not null;
