-- RESEARCH_TIME_REVISION_REPLAY_FOUNDATION_V1 -- CROSSCHECK CORRECTIVE
-- Addresses GPT independent cross-check (work_log 8cf447e4-6e13-49d8-ac39-b470705eec4c),
-- same branch, no scope change, no identity invariant/index change, no Journey/OD-TIME-8/
-- nodes-edges/main touch.
--
-- Bug found: fn_research_object_correct() built the successor row with the
-- predecessor's own source_ref unchanged. research_objects_identity_uidx is
-- unique on (fn_research_source_uid(source_ref), fn_research_claim_uid(statement))
-- for created_at >= 2026-08-29 21:00:00+00. A material correction that only
-- changes value/terms/relates (leaving the statement text, and therefore its
-- normalized claim UID, identical to the predecessor's) would insert a
-- successor with the EXACT SAME (source_uid, claim_uid) pair as the
-- predecessor -> unique_violation, an ungoverned raw Postgres error instead
-- of controlled behavior.
--
-- Fix: when the correction does NOT change the normalized claim UID (i.e.
-- the material change is to value/terms/relates only), give the successor a
-- disambiguated source_ref (`<original>#correction:<predecessor_id>`) so its
-- identity is guaranteed distinct without touching the shared identity
-- index/function at all. When the correction DOES change the statement
-- (and therefore the claim UID), the source_ref is left exactly as before --
-- unchanged behavior, still naturally distinct.
--
-- fn_research_source_uid() only strips a trailing `#(batch|a)[0-9]+` suffix,
-- so `#correction:<uuid>` is never touched by it and remains a distinct,
-- stable, deterministic identity per predecessor.

create or replace function public.fn_research_object_correct(
  p_id uuid,
  p_reason text,
  p_new_statement text default null,
  p_new_value integer default null,
  p_new_terms text[] default null,
  p_new_relates text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin       boolean;
  v_actor       uuid := auth.uid();
  v_old         public.research_objects;
  v_new_id      uuid;
  v_statement   text;
  v_value       integer;
  v_terms       text[];
  v_relates     text[];
  v_material    boolean := false;
  v_claim_changed boolean := false;
  v_new_source_ref text;
begin
  select (role = 'admin') into v_admin from public.users where id = v_actor;
  if not coalesce(v_admin, false) then
    raise exception 'admin only';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_reason');
  end if;

  select * into v_old from public.research_objects where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_old.kind not in ('fact', 'relation') then
    return jsonb_build_object('ok', false, 'error', 'invalid_kind_for_correction',
      'note', 'fn_research_object_correct is only for kind=fact|relation; other kinds may be edited in place (never gated)');
  end if;

  if v_old.status not in ('approved', 'canonical') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status_for_correction', 'status', v_old.status,
      'note', 'candidate/rejected rows are not gated -- edit them directly, no successor needed');
  end if;

  v_statement := coalesce(p_new_statement, v_old.statement);
  v_value     := coalesce(p_new_value, v_old.value);
  v_terms     := coalesce(p_new_terms, v_old.terms);
  v_relates   := coalesce(p_new_relates, v_old.relates);

  v_claim_changed := v_statement is distinct from v_old.statement
                      and public.fn_research_claim_uid(v_statement) is distinct from public.fn_research_claim_uid(v_old.statement);

  if v_claim_changed
     or v_value is distinct from v_old.value
     or v_terms is distinct from v_old.terms
     or v_relates is distinct from v_old.relates
  then
    v_material := true;
  end if;

  if not v_material then
    return jsonb_build_object('ok', false, 'error', 'not_material',
      'note', 'normalized claim UID, value, terms and relates are all unchanged -- this is a cosmetic edit, not a material correction; a direct UPDATE is permitted for cosmetic fixes and is still captured by the revision trigger');
  end if;

  -- Identity-collision guard (this migration's fix): only disambiguate
  -- source_ref when the claim UID itself did NOT change -- a value/terms/
  -- relates-only correction would otherwise share the predecessor's exact
  -- (source_uid, claim_uid) pair and hit research_objects_identity_uidx.
  if v_claim_changed then
    v_new_source_ref := v_old.source_ref;
  else
    v_new_source_ref := v_old.source_ref || '#correction:' || v_old.id::text;
  end if;

  begin
    insert into public.research_objects
      (kind, statement, value, terms, relates, source, source_ref, contributor,
       engine_verified, engine_detail, status, privacy_scope, owner_person_id, meta)
    values
      (v_old.kind, v_statement, v_value, v_terms, v_relates,
       v_old.source, v_new_source_ref, v_old.contributor,
       false, null, 'candidate', v_old.privacy_scope, v_old.owner_person_id,
       jsonb_build_object('ext', jsonb_build_object('revision', jsonb_build_object(
         'predecessor_id', v_old.id,
         'reason', p_reason,
         'corrected_by', v_actor,
         'corrected_at', now(),
         'claim_uid_changed', v_claim_changed
       ))))
    returning id into v_new_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'identity_collision',
      'note', 'an equivalent research object already exists at this identity (source_uid, claim_uid) -- this correction would not be distinguishable from an existing row; refine the statement or contact an admin to review the existing row instead');
  end;

  perform set_config('app.allow_claim_correction', 'on', true);

  update public.research_objects
     set meta = coalesce(meta, '{}'::jsonb)
                || jsonb_build_object('ext',
                     coalesce(meta -> 'ext', '{}'::jsonb)
                     || jsonb_build_object('revision',
                          coalesce(meta -> 'ext' -> 'revision', '{}'::jsonb)
                          || jsonb_build_object(
                               'superseded_by', v_new_id,
                               'superseded_at', now(),
                               'superseded_by_actor', v_actor
                             )))
   where id = p_id;

  perform set_config('app.allow_claim_correction', '', true);

  return jsonb_build_object(
    'ok', true, 'predecessor_id', p_id, 'successor_id', v_new_id, 'status', 'candidate',
    'claim_uid_changed', v_claim_changed,
    'note', 'successor created as candidate -- not auto-approved/canonical; it returns to the existing admin_research_review Human-Gate pipeline like any other candidate'
  );
end;
$function$;
