-- RESEARCH -> GRAPH PROMOTION SAFETY PATCH v1
-- Human-Gate authorized: ZURIEL, decision_ledger id=40cb64c7-c7fc-47f3-af0b-ddd70b182b9c
-- (subject_type='cross_domain_contract'), following work_log audit AFTER 2748c29f-c2d0-
-- 4605-8775-bd39728fdc92 (UNIVERSAL_RESEARCH_TO_GRAPH_PROMOTION_FOUNDATION_GATE_V1) and
-- GPT challenge 60b69029-a00b-4d1b-b217-c4cba002b81c.
--
-- WHY: the audit found that admin_research_review's canonicalize step, when a row has
-- kind in ('fact','relation') and privacy_scope='public_candidate', creates an `insight`
-- node (description = the row's FULL statement text) and, when the row carries a numeric
-- value, a `number` node, a `has_value` edge and a decision_ledger row -- with NO
-- metadata.space set on any of them. fn_graph_space_is_public() treats a missing space as
-- 'core' (public), and SELECT is GRANTed to anon on both nodes and edges. So the very
-- first real exercise of this path would have made a claim's full text readable by
-- anonymous visitors, even though the source research_objects row itself is NOT publicly
-- readable (public_candidate is a governance-eligibility label, not a publication grant;
-- research_objects' own public-reachable RLS path, ro_dossier_read, is gated on an
-- unrelated writer-dossier-visibility condition). This directly contradicts the
-- function's own asserted 'canonical != published' invariant. Independently, `has_value`
-- has never been used anywhere in the live edge vocabulary (0 rows) and was never taken
-- through no_hidden_schema_expansion_law's Agent->Proposal->Metatron->decision_ledger->
-- Human-approval chain; `insight` is not a registered entity_types row either. This path
-- has never fired in live data (verified: 0 nodes carry its metadata signature, 0
-- has_value edges exist) -- so this patch changes no historical data, it only prevents a
-- first exercise that would have been unsafe.
--
-- ZURIEL'S TWO DECISIONS (decision_ledger 40cb64c7), applied here:
--   DECISION 1 -- canonicalize must not create graph state. Reality Graph materialization
--   (Graph Promotion) becomes a separate, explicit, future Human-Gate action -- NOT built
--   in this patch. This migration only REMOVES the automatic side effect; it adds no
--   replacement RPC, no new table, no new node/relation type.
--   DECISION 2 -- whenever graph materialization is eventually implemented, every node/
--   edge it creates must carry an explicit metadata.space, and absence of an explicit
--   publication decision must never default to public. This patch enforces Decision 2 by
--   construction: since canonicalize no longer creates any graph state at all, there is
--   nothing left that could default to public.
--
-- WHAT STAYS EXACTLY THE SAME (unchanged from the live function, byte-for-byte, verified
-- against supabase/migrations/20260830080500_research_intake_v1_extraction_fidelity_gate.sql
-- which matches the live pg_get_functiondef() with 0 drift as of this patch):
--   * Signature: admin_research_review(p_id uuid, p_decision text, p_verification_state
--     text default null, p_ack_extraction_incomplete boolean default false) returns jsonb.
--   * SECURITY DEFINER, search_path='public', admin-only check, GRANT/REVOKE (unchanged by
--     CREATE OR REPLACE -- not restated here).
--   * p_decision validation, p_verification_state validation.
--   * reject: fully unchanged (status candidate/approved -> rejected + governance stamp).
--   * approve: fully unchanged (status candidate -> approved + governance stamp, explicit
--     'approved != canonical (HG-2)' note).
--   * canonicalize precondition (status must be 'approved'), the V6 SS7.3 Extraction
--     Fidelity Gate (refusal-only, no write on block), and all verification_state /
--     engine_detail handling: fully unchanged.
--   * research_objects UPDATE on canonicalize: status='canonical', engine_detail, meta.
--     governance stamp (canonicalized_by/at/from, verification_state_at_canonicalization,
--     extraction_fidelity_at_canonicalization, extraction_incomplete_ack): fully unchanged.
--
-- WHAT IS REMOVED from the canonicalize branch (the entire graph-materialization block):
--   * no SELECT/INSERT on public.nodes (no `number` node lookup/creation, no `insight`
--     node lookup/creation/update);
--   * no SELECT/INSERT/UPDATE on public.edges (no `has_value` edge);
--   * no INSERT on public.decision_ledger for a relation subject;
--   * promoted_node_id is left completely untouched in the UPDATE (no `coalesce(v_ins,
--     promoted_node_id)` -- v_ins no longer exists -- so any pre-existing value is
--     preserved exactly as-is, simply by not naming that column in the SET list).
-- v_graph is still computed and returned (renamed graph_eligible in the payload) purely
-- as READ-ONLY, informational provenance -- "would this row have qualified for graph
-- materialization under the retired automatic rule" -- so a human can later find
-- candidates for the still-to-be-built separate Graph Promotion action. It never gates
-- any DML in this function.
--
-- Return payload changes: 'graph_promoted' is now unconditionally false for canonicalize
-- (there is no longer any DML path that could make it true). 'insight_node', 'number_node',
-- 'edge_id', 'decision_ledger_id' are always null (kept in the shape for any existing
-- caller that reads those keys, so this is a behavior-narrowing change, not a breaking
-- shape change). A new 'graph_note' key states plainly that graph materialization is a
-- separate, not-yet-built, explicit Human-Gate action.

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

  -- READ-ONLY provenance signal only (Decision 1: this no longer gates any DML below).
  -- "Would this row have qualified for automatic graph materialization under the retired
  -- rule?" — kept so a human can find Graph Promotion candidates once that separate,
  -- explicit action exists. It creates nothing by itself.
  v_graph := (r.kind in ('fact','relation')
              and coalesce(r.privacy_scope,'private') = 'public_candidate');

  -- ── GRAPH MATERIALIZATION REMOVED (Human-Gate decision_ledger 40cb64c7, Decision 1) ───────────
  -- No public.nodes / public.edges / public.decision_ledger writes happen here anymore.
  -- Canonicalization is a governance transition only. Reality Graph materialization is a
  -- separate, explicit, not-yet-built Human-Gate action — see decision_ledger 40cb64c7 and
  -- work_log 2748c29f/6220abc9. promoted_node_id is intentionally absent from the UPDATE
  -- below, so any pre-existing value is left exactly as it was.

  update public.research_objects
     set status = 'canonical',
         engine_detail = v_detail,
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
    'graph_promoted', false,
    'graph_eligible', v_graph,
    'graph_note', 'graph materialization is a separate, not-yet-built, explicit Human-Gate action (decision_ledger 40cb64c7) — canonicalize no longer creates nodes/edges',
    'insight_node', null, 'number_node', null,
    'promoted_node_id', r.promoted_node_id,
    'edge_id', null, 'decision_ledger_id', null,
    'published', false,
    'note', 'canonical != published (INVARIANT P1) — privacy_scope was not changed by this call'
  );
end;
$function$;
