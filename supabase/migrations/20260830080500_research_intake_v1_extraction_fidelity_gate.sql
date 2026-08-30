-- ============================================================================
-- RESEARCH INTAKE BUILD v1 — PART 2: EXTRACTION FIDELITY GATE (contract v6 §7.3)
-- ============================================================================
-- Human-Gate authorized (ZURIEL, 2026-08-30). work_log BEFORE 2d9b45b1-3e82-4d09-a936-53bf318288d2.
--
-- WHY: contract v6 §7.3 says "ENGINE_VERIFIED arithmetic is not sufficient evidence that extraction
-- succeeded ... Loss of any materially claim-bearing element is EXTRACTION_INCOMPLETE, even when all
-- surviving calculations are correct", and classifies §7.3 as "MUST FOUNDATION NOW as an acceptance
-- gate". Until now that was documentation only: nothing in the system could act on it.
--
-- The task requires the Human-Gate boundary to be ENFORCEABLE, not merely documented. This makes the
-- narrowest possible enforcement real:
--   canonicalize is REFUSED while meta.ext.extraction_integrity.fidelity_status = 'partial',
--   unless ZURIEL passes p_ack_extraction_incomplete => true, which is then recorded as provenance.
--
-- DELIBERATE BOUNDARIES (all required by the contract itself):
--   * approve and reject are COMPLETELY UNCHANGED. Only canonicalize is gated -- promotion to the
--     canonical graph is exactly the step §7.3 protects.
--   * Fidelity NEVER auto-mutates engine_verified / status / privacy_scope / value. triage.js §7.3
--     states the truth taxonomy stays separate from the fidelity signal; this gate blocks a
--     PROMOTION, it never silently downgrades a claim.
--   * The gate is a REFUSAL, not a downgrade: the row is untouched on refusal (no write at all).
--   * A row with no extraction_integrity recorded (simple material, or anything ingested before this
--     build) is NOT blocked -- absence is not evidence of incompleteness, and blocking history would
--     be a retroactive change of meaning. Only an explicit 'partial' blocks.
--   * ZURIEL can always proceed. AI cannot bypass: the acknowledgement is an explicit argument that a
--     human must pass, and every use is written to meta.governance.extraction_incomplete_ack.
--
-- NO new table, NO new column, NO new store/engine/graph. Uses the existing meta jsonb and the
-- existing decision_ledger/governance provenance already written by this function.
--
-- ACL NOTE: DROP+CREATE resets a function ACL to the default (PUBLIC EXECUTE). The prior ACL for
-- admin_research_review was anon=false, authenticated=true, service_role=true and is restored
-- explicitly at the bottom of this migration.
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_research_review(uuid, text, text);

CREATE OR REPLACE FUNCTION public.admin_research_review(
  p_id uuid,
  p_decision text,
  p_verification_state text DEFAULT NULL::text,
  p_ack_extraction_incomplete boolean DEFAULT false
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin   boolean;
  r         public.research_objects;
  v_actor   text;
  v_num     uuid;
  v_ins     uuid;
  v_edge    uuid;
  v_ledger  uuid;
  v_reason  text;
  v_detail  jsonb;
  v_vstate  text;
  v_prev    text;
  v_graph   boolean;
  v_fid     text;
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  v_actor := auth.uid()::text;

  if p_decision not in ('approve','reject','canonicalize') then
    return jsonb_build_object('ok',false,'error','invalid_decision',
      'allowed', jsonb_build_array('approve','reject','canonicalize'));
  end if;

  if p_verification_state is not null
     and p_verification_state not in ('match','mismatch','method_unknown','not_tested') then
    return jsonb_build_object('ok',false,'error','invalid_verification_state',
      'allowed', jsonb_build_array('match','mismatch','method_unknown','not_tested'));
  end if;

  select * into r from public.research_objects where id = p_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not found'); end if;

  if p_decision = 'reject' then
    if r.status not in ('candidate','approved') then
      return jsonb_build_object('ok',false,'error','invalid_transition',
        'from', r.status, 'to', 'rejected', 'allowed_from', jsonb_build_array('candidate','approved'));
    end if;
    update public.research_objects
       set status = 'rejected',
           meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object(
                    'governance',
                    coalesce(meta->'governance','{}'::jsonb) || jsonb_build_object(
                      'rejected_by', v_actor, 'rejected_at', now(), 'rejected_from', r.status))
     where id = p_id;
    return jsonb_build_object('ok',true,'status','rejected','from',r.status);
  end if;

  if p_decision = 'approve' then
    if r.status <> 'candidate' then
      return jsonb_build_object('ok',false,'error','already_reviewed',
        'status', r.status, 'promoted_node_id', r.promoted_node_id);
    end if;
    update public.research_objects
       set status = 'approved',
           meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object(
                    'governance',
                    coalesce(meta->'governance','{}'::jsonb) || jsonb_build_object(
                      'approved_by', v_actor, 'approved_at', now()))
     where id = p_id;
    return jsonb_build_object(
      'ok', true, 'status', 'approved', 'kind', r.kind,
      'graph_promoted', false, 'promoted_node_id', r.promoted_node_id,
      'note', 'approved != canonical (HG-2) — canonical promotion is a separate explicit Human-Gate act: p_decision=canonicalize'
    );
  end if;

  if r.status <> 'approved' then
    return jsonb_build_object('ok',false,'error','invalid_transition',
      'from', r.status, 'to', 'canonical', 'required_prior_state','approved');
  end if;

  -- ── V6 §7.3 EXTRACTION FIDELITY GATE ───────────────────────────────────────────────────────────
  -- Refusal only. Nothing is written when the gate blocks: the row keeps its exact prior state.
  v_fid := r.meta -> 'ext' -> 'extraction_integrity' ->> 'fidelity_status';
  if v_fid = 'partial' and coalesce(p_ack_extraction_incomplete, false) is not true then
    return jsonb_build_object(
      'ok', false, 'error', 'extraction_incomplete',
      'fidelity_status', v_fid,
      'extraction_integrity', r.meta -> 'ext' -> 'extraction_integrity',
      'status', r.status,
      'note', 'research_intake_foundation_contract §7.3 — ENGINE_VERIFIED arithmetic is not sufficient evidence that extraction succeeded. A materially claim-bearing element (semantic operand origin and/or source media reference) is missing or unresolved. Resolve it, or pass p_ack_extraction_incomplete=true to canonicalize deliberately; the acknowledgement is recorded as provenance. Nothing was changed by this call.'
    );
  end if;

  v_detail := coalesce(r.engine_detail, '{}'::jsonb);
  v_prev   := v_detail->>'verification_state';
  v_vstate := coalesce(p_verification_state, v_prev);

  if v_vstate is null then
    v_vstate := 'not_tested';
    v_detail := v_detail || jsonb_build_object(
      'verification_state', v_vstate,
      'verification_declared', jsonb_build_object(
        'declared_at', now(), 'declared_by', v_actor, 'at_transition', 'canonicalize',
        'reason', 'no_claim_vs_engine_test_on_record',
        'engine_verified_snapshot', r.engine_verified));
  elsif p_verification_state is not null and p_verification_state is distinct from v_prev then
    v_detail := v_detail || jsonb_build_object(
      'verification_state', v_vstate,
      'verification_declared', jsonb_build_object(
        'declared_at', now(), 'declared_by', v_actor, 'at_transition', 'canonicalize',
        'reason', 'human_gate_declared',
        'previous_verification_state', v_prev,
        'engine_verified_snapshot', r.engine_verified));
  end if;

  v_graph := (r.kind in ('fact','relation')
              and coalesce(r.privacy_scope,'private') = 'public_candidate');

  if v_graph then
    if r.value is not null then
      select id into v_num from public.nodes where type='number' and label = r.value::text limit 1;
      if v_num is null then
        insert into public.nodes(type,label,description,metadata,is_active)
        values ('number', r.value::text, 'מספר '||r.value,
                jsonb_build_object('via','research_extractor'), true)
        returning id into v_num;
      end if;
    end if;

    if r.promoted_node_id is not null then
      select id into v_ins from public.nodes where id=r.promoted_node_id and type='insight' limit 1;
    end if;

    if v_ins is null then
      select id into v_ins
        from public.nodes
       where type='insight' and metadata->>'research_object_id'=p_id::text
       order by created_at asc limit 1;
    end if;

    if v_ins is null then
      insert into public.nodes(type,label,description,metadata,is_active)
      values ('insight', left(r.statement,120), r.statement,
              jsonb_build_object('research_object_id',p_id,'kind',r.kind,'value',r.value,
                                 'terms',r.terms,'relates',r.relates,'contributor',r.contributor,
                                 'source',r.source,'engine_verified',r.engine_verified,
                                 'verification_state', v_vstate,
                                 'via','admin_research_review:canonicalize'),
              true)
      returning id into v_ins;
    else
      update public.nodes
         set metadata = coalesce(metadata,'{}'::jsonb)
                        || jsonb_build_object('research_object_id',p_id,
                                              'verification_state', v_vstate,
                                              'via','admin_research_review:canonicalize')
       where id=v_ins;
    end if;

    if v_num is not null then
      select id into v_edge from public.edges
       where from_node=v_ins and to_node=v_num and relation_type='has_value'
       order by id limit 1;

      if v_edge is null then
        insert into public.edges(from_node,to_node,relation_type,metadata)
        values (v_ins, v_num, 'has_value',
                jsonb_build_object('via','research_extractor','research_object_id',p_id))
        returning id into v_edge;
      else
        update public.edges
           set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('research_object_id',p_id)
         where id=v_edge;
      end if;

      select id into v_ledger
        from public.decision_ledger
       where decision_type='research' and subject_type='relation' and subject_ref=v_edge::text
         and human_decision='approve' and status='confirmed'
         and candidate->>'research_object_id'=p_id::text
       order by created_at asc limit 1;

      if v_ledger is null then
        v_reason := case when r.engine_verified is true then 'engine_verified' else null end;
        insert into public.decision_ledger
          (decision_type, subject_type, subject_ref, human_decision, decided_by, status,
           created_by_agent, domain, reason_code, candidate)
        values
          ('research', 'relation', v_edge::text, 'approve', v_actor, 'confirmed',
           'admin_research_review', 'research_intake', v_reason,
           jsonb_build_object('research_object_id', p_id, 'kind', r.kind, 'value', r.value,
                              'governance_transition', 'approved->canonical',
                              'verification_state', v_vstate,
                              'extraction_fidelity_at_canonicalization', v_fid,
                              'extraction_incomplete_acknowledged',
                                (v_fid = 'partial' and coalesce(p_ack_extraction_incomplete,false))))
        returning id into v_ledger;
      end if;

      update public.edges
         set metadata = coalesce(metadata,'{}'::jsonb)
                        || jsonb_build_object('decision_ledger_id', v_ledger, 'research_object_id', p_id)
       where id = v_edge;
    end if;
  end if;

  update public.research_objects
     set status = 'canonical',
         engine_detail = v_detail,
         promoted_node_id = coalesce(v_ins, promoted_node_id),
         meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object(
                  'governance',
                  coalesce(meta->'governance','{}'::jsonb) || jsonb_build_object(
                    'canonicalized_by', v_actor, 'canonicalized_at', now(),
                    'canonicalized_from', 'approved',
                    'verification_state_at_canonicalization', v_vstate,
                    'extraction_fidelity_at_canonicalization', v_fid)
                  || case when v_fid = 'partial' and coalesce(p_ack_extraction_incomplete,false)
                       then jsonb_build_object('extraction_incomplete_ack',
                              jsonb_build_object('acknowledged_by', v_actor, 'acknowledged_at', now(),
                                                 'contract', 'research_intake_foundation_contract §7.3'))
                       else '{}'::jsonb end)
   where id = p_id;

  return jsonb_build_object(
    'ok', true, 'status', 'canonical', 'kind', r.kind,
    'privacy_scope', r.privacy_scope,
    'verification_state', v_vstate,
    'extraction_fidelity', v_fid,
    'extraction_incomplete_acknowledged', (v_fid = 'partial' and coalesce(p_ack_extraction_incomplete,false)),
    'graph_promoted', v_graph,
    'insight_node', v_ins, 'number_node', v_num,
    'promoted_node_id', coalesce(v_ins, r.promoted_node_id),
    'edge_id', v_edge, 'decision_ledger_id', v_ledger,
    'published', false,
    'note', 'canonical != published (INVARIANT P1) — privacy_scope was not changed by this call'
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_research_review(uuid, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_research_review(uuid, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_research_review(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_research_review(uuid, text, text, boolean) TO service_role;
