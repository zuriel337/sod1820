-- RESEARCH_TIME_REVISION_REPLAY_FOUNDATION_V1 -- IDENTITY INVARIANT FINAL CORRECTIVE
-- Addresses GPT's second independent crosscheck (work_log a750c20a-a724-4cba-b47f-db58ea138e17),
-- same branch, no scope change, no identity index/invariant column change, no Journey/
-- OD-TIME-8/nodes-edges/main touch.
--
-- Prior corrective (719382ba) fixed an identity_uidx collision by giving a
-- value/terms/relates-only successor a disambiguated source_ref
-- (`<original>#correction:<predecessor_id>`). GPT correctly flagged this as
-- identity drift: source_ref is a provenance/citation field (what document/
-- channel a claim came from), not an identity-disambiguation slot -- silently
-- mutating it to dodge a unique constraint breaks the invariant that a
-- successor of the same source is still identifiably "from the same source"
-- (fn_research_source_uid(predecessor.source_ref) should equal
-- fn_research_source_uid(successor.source_ref) whenever the correction is a
-- legitimate same-source correction), and could confuse any future code that
-- joins/matches on source_ref (e.g. research_artifact_save's citation-append
-- path).
--
-- Corrected design: the successor's source_ref is now ALWAYS identical to
-- the predecessor's, unconditionally. Instead, a successor may only be
-- created when the correction's new statement produces a genuinely
-- different normalized claim UID (fn_research_claim_uid). A correction that
-- only changes value/terms/relates while leaving the statement (and its
-- claim UID) identical is no longer silently worked around -- it is
-- rejected with a controlled, explicit `requires_new_claim_uid` error asking
-- the caller to also supply a statement that reflects the substantive
-- change. This reuses the system's own existing identity definition
-- (same source + same normalized claim text = same claim) as the authority
-- for what counts as a genuinely new, distinguishable claim, rather than
-- inventing a second disambiguation mechanism.
--
-- The BEFORE UPDATE/DELETE trigger (fn_snapshot_research_object_revision)
-- is UNCHANGED by this migration: it still correctly blocks any direct
-- statement/value/terms/relates edit on an approved/canonical fact|relation
-- outside this RPC, regardless of whether the eventual correction turns out
-- to be claim-UID-changing or not -- that decision belongs here, in the one
-- sanctioned correction path, not in the trigger.

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
  v_admin         boolean;
  v_actor         uuid := auth.uid();
  v_old           public.research_objects;
  v_new_id        uuid;
  v_statement     text;
  v_value         integer;
  v_terms         text[];
  v_relates       text[];
  v_claim_changed boolean := false;
  v_any_field_changed boolean := false;
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

  v_any_field_changed := v_claim_changed
                          or v_value is distinct from v_old.value
                          or v_terms is distinct from v_old.terms
                          or v_relates is distinct from v_old.relates;

  if not v_any_field_changed then
    return jsonb_build_object('ok', false, 'error', 'not_material',
      'note', 'normalized claim UID, value, terms and relates are all unchanged -- this is a cosmetic edit, not a material correction; a direct UPDATE is permitted for cosmetic fixes and is still captured by the revision trigger');
  end if;

  -- Identity invariant (this migration's fix): a successor may only be
  -- created when the statement itself produces a distinct normalized claim
  -- UID. source_ref is never mutated to work around this -- it always stays
  -- identical to the predecessor's, preserving "same source" provenance.
  if not v_claim_changed then
    return jsonb_build_object('ok', false, 'error', 'requires_new_claim_uid',
      'note', 'value/terms/relates differ, but the statement (and therefore its normalized claim UID) is unchanged from the predecessor -- research_objects_identity_uidx treats same-source+same-claim-text as the same claim. Supply a p_new_statement that reflects the substantive change so the correction is identifiable as a genuinely new claim; source_ref is never altered to work around this.');
  end if;

  begin
    insert into public.research_objects
      (kind, statement, value, terms, relates, source, source_ref, contributor,
       engine_verified, engine_detail, status, privacy_scope, owner_person_id, meta)
    values
      (v_old.kind, v_statement, v_value, v_terms, v_relates,
       v_old.source, v_old.source_ref, v_old.contributor,
       false, null, 'candidate', v_old.privacy_scope, v_old.owner_person_id,
       jsonb_build_object('ext', jsonb_build_object('revision', jsonb_build_object(
         'predecessor_id', v_old.id,
         'reason', p_reason,
         'corrected_by', v_actor,
         'corrected_at', now()
       ))))
    returning id into v_new_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'identity_collision',
      'note', 'an equivalent research object already exists at this identity (source_uid, claim_uid) -- this correction would not be distinguishable from an existing row; refine the statement further or contact an admin to review the existing row instead');
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
    'note', 'successor created as candidate -- not auto-approved/canonical; it returns to the existing admin_research_review Human-Gate pipeline like any other candidate'
  );
end;
$function$;
