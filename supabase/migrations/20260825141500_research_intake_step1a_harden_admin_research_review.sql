-- SOD1820 Research Intake — STEP 1A: harden admin_research_review (extend existing RPC, no new RPC)
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: RESEARCH_INTAKE_STEP0_STEP1A
--
-- Brings the existing, live, admin-only Human-Gate RPC (public.admin_research_review, last
-- touched 20260823_security_fix_anon_execute_revoke_and_null_bypass.sql) into compliance with
-- research_intake_foundation_contract (project_codex, CLOSED 25.8.2026), specifically its
-- §5 Privacy Promotion Law: "Research Object פרטי (privacy_scope='private') לעולם לא-יהפוך
-- ליחס/ישות ציבורית בגרף (nodes/edges) רק-בגלל שעבר אימות-מנוע" and §4 Human-Gate provenance
-- convention for relations (decision_ledger subject_type='relation'/subject_ref=edges.id +
-- edges.metadata.decision_ledger_id reciprocal pointer).
--
-- Live behavior BEFORE this migration (verified via pg_get_functiondef this session):
--   1. p_decision was NOT whitelisted — any value other than the literal string 'reject' fell
--      through to the approve branch (e.g. a typo 'aprove' silently approved).
--   2. No idempotency guard — calling it twice on an already-approved/rejected row re-ran the
--      approve/reject side effects (duplicate node/edge creation on repeated approve calls).
--   3. No privacy_scope check at all — a fact/relation research_objects row with
--      privacy_scope='private' (or 'family_shared') and engine_verified=true was promoted to
--      PUBLIC nodes/edges exactly like a 'public_candidate' row. This is the concrete violation
--      of the closed Privacy Promotion Law fixed here.
--   4. decision_ledger was never written to by any code path (verified: zero references in
--      src/, supabase/functions/, supabase/migrations/ before this file).
--
-- Behavior AFTER this migration:
--   - p_decision whitelist: only 'approve' | 'reject' proceed; anything else returns
--     {ok:false, error:'invalid_decision'} with ZERO side effects (fail closed).
--   - Idempotency: review only proceeds when research_objects.status = 'candidate'; a repeat
--     call on an already-decided row returns {ok:false, error:'already_reviewed', status:...}
--     with ZERO side effects.
--   - reject: unchanged (status='rejected', row never deleted, no node/edge ever created).
--   - approve + kind in (observation,hypothesis,question): unchanged (status='approved', no
--     node/edge — "approved as living knowledge, not yet a node").
--   - approve + kind in (fact,relation):
--       * ALWAYS ends at research_objects.status='canonical' ("research state" — the claim
--         itself is settled), regardless of privacy_scope. PRIVATE CANONICAL ≠ PUBLIC.
--       * privacy_scope IN ('private','family_shared') → graph_promoted:=false. NO node/edge
--         is created. promoted_node_id is explicitly left NULL. This is the privacy gate.
--       * privacy_scope = 'public_candidate' → graph_promoted:=true. Existing behavior
--         preserved: number-node reuse/create (only if value present) + insight-node insert +
--         has_value edge (only if a number node exists) + promoted_node_id set to the insight
--         node. NEW: when (and only when) the has_value edge is actually created, a
--         decision_ledger row is written per the closed contract's exact convention
--         (subject_type='relation', subject_ref=<edges.id>::text, human_decision='approve',
--         reason_code='engine_verified' when research_objects.engine_verified=true — reusing
--         the existing decision_reason_codes vocabulary, not inventing one) and the edge's own
--         metadata gets the reciprocal pointer (metadata.decision_ledger_id=<ledger id>).
--
-- Explicitly OUT OF SCOPE (per Zuriel's instruction) and NOT implemented here — no decision_ledger
-- semantics invented for: private-canonical approval, reject, or observation/hypothesis/question
-- approval. Only the one convention the contract already closed (relation→edge Human-Gate
-- provenance) is wired. No new table, no new ledger, no new engine, no new RPC — this is a
-- CREATE OR REPLACE of the existing function, same signature (p_id uuid, p_decision text).

CREATE OR REPLACE FUNCTION public.admin_research_review(p_id uuid, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin boolean;
  r public.research_objects;
  v_num uuid;
  v_ins uuid;
  v_edge uuid;
  v_ledger uuid;
  v_reason text;
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;

  select * into r from public.research_objects where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not found'); end if;

  -- STEP 1A #1: fail-closed whitelist — only literal 'approve'/'reject' may proceed.
  if p_decision not in ('approve','reject') then
    return jsonb_build_object('ok',false,'error','invalid_decision');
  end if;

  -- STEP 1A #2: idempotency — review only allowed on a still-pending candidate. A repeat call
  -- (or a call on a row some other path already decided) is a no-op, not a re-run.
  if r.status <> 'candidate' then
    return jsonb_build_object('ok',false,'error','already_reviewed','status',r.status);
  end if;

  if p_decision = 'reject' then
    update public.research_objects set status='rejected' where id=p_id;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;

  -- approve
  if r.kind in ('fact','relation') then

    -- STEP 1A #3: Privacy Promotion Law — only public_candidate may reach graph promotion.
    if coalesce(r.privacy_scope,'private') <> 'public_candidate' then
      update public.research_objects set status='canonical' where id=p_id;
      return jsonb_build_object(
        'ok', true, 'status', 'canonical', 'kind', r.kind,
        'privacy_scope', r.privacy_scope, 'graph_promoted', false,
        'promoted_node_id', null
      );
    end if;

    -- public_candidate path — existing graph-promotion behavior, preserved as-is.
    if r.value is not null then
      select id into v_num from public.nodes where type='number' and label = r.value::text limit 1;
      if v_num is null then
        insert into public.nodes(type,label,description,metadata,is_active)
        values ('number', r.value::text, 'מספר '||r.value, jsonb_build_object('via','research_extractor'), true)
        returning id into v_num;
      end if;
    end if;

    insert into public.nodes(type,label,description,metadata,is_active)
    values ('insight', left(r.statement,120), r.statement,
            jsonb_build_object('kind',r.kind,'value',r.value,'terms',r.terms,'relates',r.relates,
                               'contributor',r.contributor,'source',r.source,'engine_verified',r.engine_verified),
            true)
    returning id into v_ins;

    if v_num is not null then
      insert into public.edges(from_node,to_node,relation_type,metadata)
      values (v_ins, v_num, 'has_value', jsonb_build_object('via','research_extractor'))
      returning id into v_edge;

      -- STEP 1A #4: decision_ledger wiring, exactly per research_intake_foundation_contract §4
      -- (extends decision_ledger's existing polyamorphic subject_type/subject_ref pattern —
      -- no new ledger/table). Only fires when an edge was actually created.
      v_reason := case when r.engine_verified is true then 'engine_verified' else null end;
      insert into public.decision_ledger
        (decision_type, subject_type, subject_ref, human_decision, decided_by, status,
         created_by_agent, domain, reason_code, candidate)
      values
        ('research', 'relation', v_edge::text, 'approve', auth.uid()::text, 'confirmed',
         'admin_research_review', 'research_intake', v_reason,
         jsonb_build_object('research_object_id', p_id, 'kind', r.kind, 'value', r.value))
      returning id into v_ledger;

      update public.edges
        set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('decision_ledger_id', v_ledger)
        where id = v_edge;
    end if;

    update public.research_objects set status='canonical', promoted_node_id=v_ins where id=p_id;
    return jsonb_build_object(
      'ok', true, 'status', 'canonical', 'kind', r.kind, 'privacy_scope', r.privacy_scope,
      'graph_promoted', true, 'insight_node', v_ins, 'number_node', v_num,
      'promoted_node_id', v_ins, 'edge_id', v_edge, 'decision_ledger_id', v_ledger
    );
  else
    -- observation/hypothesis/question: מאושר כידע-חי (לא צומת עדיין) — unchanged.
    update public.research_objects set status='approved' where id=p_id;
    return jsonb_build_object('ok',true,'status','approved','kind',r.kind);
  end if;
end; $function$;
