-- RESEARCH_TIME_REVISION_REPLAY_FOUNDATION_V1
-- Human-Gate: ZURIEL, authorized per work_log AFTER entries
--   092da154-2572-4165-b2c2-a63af0d8964c (CLAUDE specialist AFTER, A+C recommended)
--   7f17d4c9-f6cf-4db2-9014-ca687f90c4c6 (CLAUDE specialist cross-check AFTER)
-- Implements exactly A+C from the specialist cross-check, no scope expansion:
--   A. Material semantic claim change on an approved/canonical fact|relation ->
--      never a silent UPDATE; must go through fn_research_object_correct(),
--      which creates a successor Research Object and preserves provenance to
--      the predecessor.
--   C. Immutable, append-only BEFORE snapshot of every UPDATE/DELETE on
--      research_objects, in a narrow revision/replay primitive.
--
-- research_objects remains the sole owner of CURRENT state.
-- research_object_revisions is Audit/Replay only -- never a second truth store.
--
-- Explicitly NOT done here (out of scope per authorization):
--   no Journey/Path changes, no OD-TIME-8 changes, no nodes/edges temporal
--   system, no JSON revision-history array inside research_objects, no
--   fabricated historical backfill, no change to any of the 6 existing
--   writer functions (admin_research_review, research_artifact_save,
--   fn_upsert_self_profile, fn_upsert_family_member,
--   fn_upsert_family_relation, link_identity).

-- ============================================================================
-- 1. research_object_revisions -- append-only audit/replay table
-- ============================================================================

create table public.research_object_revisions (
  id                          bigint generated always as identity primary key,
  research_object_id         uuid not null,
  -- deliberate: NO foreign key to research_objects(id). This log must
  -- outlive the row it describes (a DELETE's own snapshot is inserted
  -- before the row disappears); a live FK would either cascade-destroy
  -- the audit trail on delete, or block the delete outright. Referential
  -- integrity is enforced at write time by the trigger itself, which
  -- always inserts the OLD.id of the row actually being mutated.
  research_object_source_uid text,
  research_object_claim_uid  text,
  change_kind                text not null check (change_kind in ('update','delete')),
  changed_fields             text[] not null default '{}',
  before_snapshot            jsonb not null,
  statement_before           text,
  successor_id               uuid,
  actor                      uuid,
  actor_fallback             text not null,
  occurred_at                timestamptz not null default now()
);

comment on table public.research_object_revisions is
  'Append-only Audit/Replay log for public.research_objects. Never queried as a truth source -- research_objects.status/meta remain the sole owner of CURRENT state. No 50-row retention, no debounce, no delete of old revisions (unlike post_revisions) -- research claims require unlimited immutable history. occurred_at is Knowledge Time (when the DB write happened), never conflated with the row''s own created_at/occurred_at/decision timestamps (Reality Time != Knowledge Time).';

create index research_object_revisions_object_time_idx
  on public.research_object_revisions (research_object_id, occurred_at desc);

create index research_object_revisions_identity_idx
  on public.research_object_revisions (research_object_source_uid, research_object_claim_uid);

alter table public.research_object_revisions enable row level security;

create policy ro_revisions_admin_read on public.research_object_revisions
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- No INSERT/UPDATE/DELETE policy for anon/authenticated: writes happen only
-- via the trigger below, which always executes in the same privileged
-- context (postgres/service_role) that already performs the UPDATE/DELETE
-- on research_objects today -- mirrors the exact grant shape already live
-- on research_objects/post_revisions (anon/authenticated get no DML grant).

-- ============================================================================
-- 2. Trigger function: snapshot BEFORE UPDATE / BEFORE DELETE, enforce A
-- ============================================================================

create or replace function public.fn_snapshot_research_object_revision()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_changed text[] := '{}';
  v_material boolean := false;
begin
  if TG_OP = 'UPDATE' then
    if NEW.kind is distinct from OLD.kind then v_changed := v_changed || 'kind'; end if;
    if NEW.statement is distinct from OLD.statement then v_changed := v_changed || 'statement'; end if;
    if NEW.value is distinct from OLD.value then v_changed := v_changed || 'value'; end if;
    if NEW.terms is distinct from OLD.terms then v_changed := v_changed || 'terms'; end if;
    if NEW.relates is distinct from OLD.relates then v_changed := v_changed || 'relates'; end if;
    if NEW.source is distinct from OLD.source then v_changed := v_changed || 'source'; end if;
    if NEW.source_ref is distinct from OLD.source_ref then v_changed := v_changed || 'source_ref'; end if;
    if NEW.contributor is distinct from OLD.contributor then v_changed := v_changed || 'contributor'; end if;
    if NEW.confidence is distinct from OLD.confidence then v_changed := v_changed || 'confidence'; end if;
    if NEW.engine_verified is distinct from OLD.engine_verified then v_changed := v_changed || 'engine_verified'; end if;
    if NEW.engine_detail is distinct from OLD.engine_detail then v_changed := v_changed || 'engine_detail'; end if;
    if NEW.evidence is distinct from OLD.evidence then v_changed := v_changed || 'evidence'; end if;
    if NEW.status is distinct from OLD.status then v_changed := v_changed || 'status'; end if;
    if NEW.promoted_node_id is distinct from OLD.promoted_node_id then v_changed := v_changed || 'promoted_node_id'; end if;
    if NEW.parent_id is distinct from OLD.parent_id then v_changed := v_changed || 'parent_id'; end if;
    if NEW.meta is distinct from OLD.meta then v_changed := v_changed || 'meta'; end if;
    if NEW.owner_person_id is distinct from OLD.owner_person_id then v_changed := v_changed || 'owner_person_id'; end if;
    if NEW.privacy_scope is distinct from OLD.privacy_scope then v_changed := v_changed || 'privacy_scope'; end if;

    -- Option A guard: material semantic change to an already-governed fact/relation.
    -- Scoped narrowly: kind in ('fact','relation') AND OLD.status in
    -- ('approved','canonical'). candidate-stage rows, observation/hypothesis/
    -- question rows (incl. personal self/family-profile upserts), and any
    -- meta/status/engine_detail-only change are never gated here.
    if OLD.kind in ('fact','relation') and OLD.status in ('approved','canonical') then
      if (NEW.statement is distinct from OLD.statement
            and public.fn_research_claim_uid(NEW.statement) is distinct from public.fn_research_claim_uid(OLD.statement))
         or NEW.value is distinct from OLD.value
         or NEW.terms is distinct from OLD.terms
         or NEW.relates is distinct from OLD.relates
      then
        v_material := true;
      end if;
    end if;

    if v_material and coalesce(current_setting('app.allow_claim_correction', true), '') is distinct from 'on' then
      raise exception 'material_change_requires_correction_rpc: an approved/canonical fact or relation''s statement/value/terms/relates cannot be updated directly (id=%). Use public.fn_research_object_correct() to create a governed successor instead.', OLD.id;
    end if;

    insert into public.research_object_revisions
      (research_object_id, research_object_source_uid, research_object_claim_uid,
       change_kind, changed_fields, before_snapshot, statement_before,
       actor, actor_fallback, occurred_at)
    values
      (OLD.id, public.fn_research_source_uid(OLD.source_ref), public.fn_research_claim_uid(OLD.statement),
       'update', v_changed, to_jsonb(OLD), OLD.statement,
       auth.uid(), session_user, now());

    return NEW;

  elsif TG_OP = 'DELETE' then
    insert into public.research_object_revisions
      (research_object_id, research_object_source_uid, research_object_claim_uid,
       change_kind, changed_fields, before_snapshot, statement_before,
       actor, actor_fallback, occurred_at)
    values
      (OLD.id, public.fn_research_source_uid(OLD.source_ref), public.fn_research_claim_uid(OLD.statement),
       'delete', '{}', to_jsonb(OLD), OLD.statement,
       auth.uid(), session_user, now());

    return OLD;
  end if;

  return null;
end;
$function$;

create trigger trg_snapshot_research_object_before_update
  before update on public.research_objects
  for each row execute function public.fn_snapshot_research_object_revision();

create trigger trg_snapshot_research_object_before_delete
  before delete on public.research_objects
  for each row execute function public.fn_snapshot_research_object_revision();

-- ============================================================================
-- 3. fn_research_object_correct -- the only sanctioned path for a material
--    semantic correction to an approved/canonical fact or relation
-- ============================================================================

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
  v_admin   boolean;
  v_actor   uuid := auth.uid();
  v_old     public.research_objects;
  v_new_id  uuid;
  v_statement text;
  v_value     integer;
  v_terms     text[];
  v_relates   text[];
  v_material  boolean := false;
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

  if (v_statement is distinct from v_old.statement
        and public.fn_research_claim_uid(v_statement) is distinct from public.fn_research_claim_uid(v_old.statement))
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

  -- Defensive only: this predecessor UPDATE never touches statement/value/
  -- terms/relates (only meta), so the trigger guard would never fire on it
  -- regardless -- the flag is set anyway for forward-compatibility with any
  -- future revision of this RPC that might also touch a predecessor's
  -- material fields directly.
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
