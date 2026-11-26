-- Skip research revisions for true no-op updates (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB). Apply as ONE transaction.
-- Package: docs/reviews/db-capacity-audit-20261126/PART3-DECISION-337.md section 5.
--
-- Owner: research_intake_foundation_contract_law v14 (ADDITIVE_RESEARCH_HISTORY, revision lineage). EXTEND_EXISTING: the same
-- trigger function, one early return; no table, column, trigger or cron is added.
-- What: an UPDATE that changes none of the 18 tracked columns (kind, statement, value, terms, relates, source, source_ref,
-- contributor, confidence, engine_verified, engine_detail, evidence, status, promoted_node_id, parent_id, meta,
-- owner_person_id, privacy_scope; the only other columns, id and created_at, are immutable) no longer writes a revision.
-- What does NOT change: every real change keeps its full before_snapshot, including each separate meta step by a different
-- pipeline (e.g. meta.ext.corpus_batch and meta.ext.wa_channel_intake written minutes apart are two revisions, as today);
-- DELETE revisions; the material-change guard (app.allow_claim_correction); existing rows (nothing is deleted or merged).
-- Evidence: 1,565 of 44,084 revisions (3.6%) have changed_fields = '{}' (1,180 of them on 21.10); 0 of the 1,606 consecutive
-- meta-only pairs on 20.11 are no-ops (each adds a different meta.ext key).
-- Writer-side companion (no database change): UPDATE ... WHERE <col> IS DISTINCT FROM <new> keeps the trigger from running at all.
-- Guard: the live source must be the one read on 26.11.2026 (md5 of prosrc c57e6d3884edc74769be98bde1d86f8b).
-- Rollback: 20261126140000_research_revision_noop_skip_ROLLBACK.sql.
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.fn_snapshot_research_object_revision()'::regprocedure)
       <> 'c57e6d3884edc74769be98bde1d86f8b' then
    raise exception 'fn_snapshot_research_object_revision drifted from the 26.11.2026 source; reconcile before applying';
  end if;
end
$guard$;

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
    if NEW.kind is distinct from OLD.kind then v_changed := array_append(v_changed, 'kind'); end if;
    if NEW.statement is distinct from OLD.statement then v_changed := array_append(v_changed, 'statement'); end if;
    if NEW.value is distinct from OLD.value then v_changed := array_append(v_changed, 'value'); end if;
    if NEW.terms is distinct from OLD.terms then v_changed := array_append(v_changed, 'terms'); end if;
    if NEW.relates is distinct from OLD.relates then v_changed := array_append(v_changed, 'relates'); end if;
    if NEW.source is distinct from OLD.source then v_changed := array_append(v_changed, 'source'); end if;
    if NEW.source_ref is distinct from OLD.source_ref then v_changed := array_append(v_changed, 'source_ref'); end if;
    if NEW.contributor is distinct from OLD.contributor then v_changed := array_append(v_changed, 'contributor'); end if;
    if NEW.confidence is distinct from OLD.confidence then v_changed := array_append(v_changed, 'confidence'); end if;
    if NEW.engine_verified is distinct from OLD.engine_verified then v_changed := array_append(v_changed, 'engine_verified'); end if;
    if NEW.engine_detail is distinct from OLD.engine_detail then v_changed := array_append(v_changed, 'engine_detail'); end if;
    if NEW.evidence is distinct from OLD.evidence then v_changed := array_append(v_changed, 'evidence'); end if;
    if NEW.status is distinct from OLD.status then v_changed := array_append(v_changed, 'status'); end if;
    if NEW.promoted_node_id is distinct from OLD.promoted_node_id then v_changed := array_append(v_changed, 'promoted_node_id'); end if;
    if NEW.parent_id is distinct from OLD.parent_id then v_changed := array_append(v_changed, 'parent_id'); end if;
    if NEW.meta is distinct from OLD.meta then v_changed := array_append(v_changed, 'meta'); end if;
    if NEW.owner_person_id is distinct from OLD.owner_person_id then v_changed := array_append(v_changed, 'owner_person_id'); end if;
    if NEW.privacy_scope is distinct from OLD.privacy_scope then v_changed := array_append(v_changed, 'privacy_scope'); end if;

    if OLD.kind in ('fact','relation','observation') and OLD.status in ('approved','canonical') then
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

    -- 26.11.2026 (decision 337): none of the 18 tracked columns changed (id and created_at are immutable), so the row is
    -- identical to its last state and there is nothing to preserve. Any real change, including each separate meta step, is still
    -- recorded below with its full preimage; only a true no-op is skipped.
    if coalesce(array_length(v_changed, 1), 0) = 0 then
      return NEW;
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
