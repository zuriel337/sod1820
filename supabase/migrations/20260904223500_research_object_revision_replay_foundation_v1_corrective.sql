-- RESEARCH_TIME_REVISION_REPLAY_FOUNDATION_V1 -- CORRECTIVE
-- Fixes a real bug caught during live post-apply verification (not a
-- specialist-assumption error -- a plpgsql syntax bug in the trigger
-- function itself): `text[] || 'literal'` is ambiguous in Postgres --
-- an untyped string literal on the right of || against a text[] can be
-- parsed as an attempted array literal ("malformed array literal"),
-- which made the trigger raise on every single UPDATE to
-- research_objects (all 16 field-diff lines were affected). This
-- silently broke every one of the 6 existing writer functions the
-- instant the previous migration was applied.
--
-- Fix: use array_append(...) explicitly instead of the || operator
-- against bare string literals. No behavior change beyond making the
-- function actually work as designed; same guard/logic/columns.

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
