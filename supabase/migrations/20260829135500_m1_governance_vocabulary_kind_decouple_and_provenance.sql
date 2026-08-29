-- =====================================================================================
-- M1 TRUTH CONTRACT — SECTIONS C + D + E + G
-- Governance vocabulary · kind/governance decoupling · verification declaration · provenance
-- =====================================================================================
-- Companion to 20260829134800_m1_truth_axes_foundation_law.sql (truth_axes_foundation_law).
-- Human-Gate decisions implemented: HG-2 (approved != canonical), HG-3 (verification
-- mandatory-DECLARED, never fabricate "match"), HG-5 (real provenance, no fabricated actor).
--
-- ZERO data rows are rewritten by this migration. No backfill. No historical normalization.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- C1. GOVERNANCE VOCABULARY — research_objects.status becomes DB-owned.
--     Verified live BEFORE adding: candidate=570, approved=5, canonical=2, total 577.
--     All live values already conform to the HG-2 vocabulary, so this constraint is added
--     VALIDATED and changes no row. 'rejected' is part of the vocabulary with 0 live rows.
-- -------------------------------------------------------------------------------------
alter table public.research_objects
  drop constraint if exists research_objects_status_governance_vocab;

alter table public.research_objects
  add constraint research_objects_status_governance_vocab
  check (status in ('candidate','approved','canonical','rejected'));

comment on constraint research_objects_status_governance_vocab on public.research_objects is
  'truth_axes_foundation_law AXIS 3 (GOVERNANCE). candidate < approved < canonical, plus rejected. '
  'approved != canonical (HG-2): approved = the Human Gate accepted the artifact into the governed '
  'research layer; canonical = the Human Gate explicitly promoted it into canonical SOD1820 knowledge. '
  'Never inferred from age, kind, confidence, verification, publication or visibility.';

-- -------------------------------------------------------------------------------------
-- C2. decision_ledger.status — NON-DESTRUCTIVE enforcement.
--     Live values: confirmed=7, applied=4, executed=2 (conforming) plus exactly ONE
--     historical row id=caf9fa14-5d4a-4261-b446-3e743e7cde27 whose status is
--     'wave4_gap_detector_and_fill_complete' — a pipeline progress note written into a
--     governance column on 2026-08-07 (decided_by='צוריאל', decision_type='canonize_architecture').
--
--     everything_additive_law + truth_axes_foundation_law INVARIANT H3: history is provenance.
--     That row is NOT rewritten, NOT deleted, NOT adjudicated by this agent.
--     Therefore the constraint is added NOT VALID: it constrains every NEW write and every
--     future UPDATE, while leaving the existing row exactly as it is.
--
--     REMAINING HISTORICAL BLOCKER (reported, not forced): the constraint cannot be VALIDATEd
--     until ZURIEL adjudicates that single row. Until then `VALIDATE CONSTRAINT` will fail by
--     design, and an UPDATE that touches that row will also fail — which is the intended
--     forcing function for adjudication rather than a silent rewrite.
-- -------------------------------------------------------------------------------------
alter table public.decision_ledger
  drop constraint if exists decision_ledger_status_governance_vocab;

alter table public.decision_ledger
  add constraint decision_ledger_status_governance_vocab
  check (status is null or status in ('confirmed','rejected','applied','executed'))
  not valid;

comment on constraint decision_ledger_status_governance_vocab on public.decision_ledger is
  'truth_axes_foundation_law AXIS 3. NOT VALID on purpose: exactly one historical row '
  '(caf9fa14-5d4a-4261-b446-3e743e7cde27) carries a pipeline progress note in this column and is '
  'preserved as provenance per everything_additive_law. New writes are enforced. '
  'VALIDATE CONSTRAINT only after ZURIEL adjudicates that row.';

-- -------------------------------------------------------------------------------------
-- D + E. admin_research_review v2 — EPISTEMIC TYPE no longer decides a GOVERNANCE transition.
--
-- DEFECT CLOSED (D-1, verified live): the previous body branched
--     if r.kind in ('fact','relation') then status := 'canonical' else status := 'approved'
-- so the caller-supplied noun at intake decided how far ONE human approval promoted a row.
--
-- POST-STATE:
--   approve       : candidate -> approved     for EVERY kind. No projection. No publication.
--   canonicalize  : approved  -> canonical    explicit, separate Human-Gate act (HG-2).
--   reject        : candidate|approved -> rejected.
--
-- ONE SYSTEM LAW: this EXTENDS the single existing canonical Human-Gate transition RPC.
-- No second canonicalization engine is created.
--
-- Graph projection moved from the approve act to the canonical act, unchanged in behaviour:
-- it still happens only for kind in ('fact','relation') AND privacy_scope='public_candidate'.
-- kind now decides only WHETHER a projection happens, never HOW FAR governance advances.
-- Graph-projectable != automatically canonical; canonical != automatically public.
--
-- E (HG-3): canonicalization DECLARES the verification state into the already-designated home
-- research_objects.engine_detail, using the ratified vocabulary match|mismatch|method_unknown|
-- not_tested. It is NOT a hard precondition — interpretive/non-computable material can be
-- canonicalized — but the state may not be silent. "match" is NEVER fabricated: when no
-- claim-vs-engine test is on record the honest 'not_tested' is written, and the legacy
-- engine_verified boolean is preserved beside it as a snapshot rather than translated into a claim.
-- No historical row is touched; only the row being transitioned is written.
-- -------------------------------------------------------------------------------------
drop function if exists public.admin_research_review(uuid, text);

create or replace function public.admin_research_review(
  p_id uuid,
  p_decision text,
  p_verification_state text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
begin
  -- Human Gate (truth_axes_foundation_law INVARIANT G3). AI never writes a governance transition.
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  v_actor := auth.uid()::text;

  if p_decision not in ('approve','reject','canonicalize') then
    return jsonb_build_object('ok',false,'error','invalid_decision',
      'allowed', jsonb_build_array('approve','reject','canonicalize'));
  end if;

  -- Invalid semantic input is REJECTED, never silently coerced (INVARIANT PR2).
  if p_verification_state is not null
     and p_verification_state not in ('match','mismatch','method_unknown','not_tested') then
    return jsonb_build_object('ok',false,'error','invalid_verification_state',
      'allowed', jsonb_build_array('match','mismatch','method_unknown','not_tested'));
  end if;

  select * into r from public.research_objects where id = p_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not found'); end if;

  ------------------------------------------------------------------ REJECT
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
    -- Rejection semantics (existing system meaning): the CONCLUSION is not accepted under the
    -- current evidence and criterion. It is NOT an assertion that the datum is false.
    return jsonb_build_object('ok',true,'status','rejected','from',r.status);
  end if;

  ------------------------------------------------------------------ APPROVE
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

  ------------------------------------------------------------------ CANONICALIZE
  if r.status <> 'approved' then
    return jsonb_build_object('ok',false,'error','invalid_transition',
      'from', r.status, 'to', 'canonical', 'required_prior_state','approved');
  end if;

  -- E. Verification declaration (HG-3). Declared, never fabricated.
  v_detail := coalesce(r.engine_detail, '{}'::jsonb);
  v_prev   := v_detail->>'verification_state';
  v_vstate := coalesce(p_verification_state, v_prev);

  if v_vstate is null then
    -- Nothing was ever declared and no claim-vs-engine test is on record.
    -- 'not_tested' is the honest statement here; it is NOT a downgrade of engine_verified,
    -- which is preserved beside it as a snapshot instead of being translated into a claim.
    v_vstate := 'not_tested';
    v_detail := v_detail || jsonb_build_object(
      'verification_state', v_vstate,
      'verification_declared', jsonb_build_object(
        'declared_at', now(), 'declared_by', v_actor, 'at_transition', 'canonicalize',
        'reason', 'no_claim_vs_engine_test_on_record',
        'engine_verified_snapshot', r.engine_verified));
  elsif p_verification_state is not null and p_verification_state is distinct from v_prev then
    -- Human Gate explicitly declares/overrides. The previous value is PRESERVED alongside
    -- (everything_additive_law) rather than silently replaced.
    v_detail := v_detail || jsonb_build_object(
      'verification_state', v_vstate,
      'verification_declared', jsonb_build_object(
        'declared_at', now(), 'declared_by', v_actor, 'at_transition', 'canonicalize',
        'reason', 'human_gate_declared',
        'previous_verification_state', v_prev,
        'engine_verified_snapshot', r.engine_verified));
  end if;

  -- Graph projection: unchanged predicate, moved to the canonical act.
  -- kind decides only WHETHER we project; privacy_scope decides whether it may be public.
  -- Canonicalization NEVER changes privacy_scope and NEVER publishes.
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

    -- One Tree identity gate: a Research Object has at most one graph projection identity.
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
                              'verification_state', v_vstate))
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
                    'verification_state_at_canonicalization', v_vstate))
   where id = p_id;

  return jsonb_build_object(
    'ok', true, 'status', 'canonical', 'kind', r.kind,
    'privacy_scope', r.privacy_scope,
    'verification_state', v_vstate,
    'graph_promoted', v_graph,
    'insight_node', v_ins, 'number_node', v_num,
    'promoted_node_id', coalesce(v_ins, r.promoted_node_id),
    'edge_id', v_edge, 'decision_ledger_id', v_ledger,
    'published', false,
    'note', 'canonical != published (INVARIANT P1) — privacy_scope was not changed by this call'
  );
end;
$function$;

revoke all on function public.admin_research_review(uuid, text, text) from public, anon;
grant execute on function public.admin_research_review(uuid, text, text) to authenticated, service_role;

comment on function public.admin_research_review(uuid, text, text) is
  'Single canonical Human-Gate governance transition for research_objects (truth_axes_foundation_law '
  'AXIS 3). approve: candidate->approved for EVERY kind. canonicalize: approved->canonical, explicit '
  'and separate (HG-2). reject: candidate|approved->rejected. EPISTEMIC TYPE (kind) never decides the '
  'governance transition; it only decides whether a graph projection happens at canonicalization. '
  'Canonicalization declares the verification state into engine_detail (HG-3) and never fabricates '
  '"match". Canonicalization never publishes and never widens access.';

-- -------------------------------------------------------------------------------------
-- G. set_relation_evidence — real provenance, no fabricated actor (HG-5).
--
-- DEFECT CLOSED (D-8, verified live): the body inserted  source => 'zuriel'  as a literal for
-- ANY authenticated admin caller, asserting an attribution instead of observing one.
--
-- SEMANTIC FINDING that shapes the fix: relation_evidence.source is EVIDENCE-SOURCE semantics,
-- not acting-user. Live vocabulary: engine_scan (also the column default), els_record:<uuid>,
-- ai_judge:<tag>, cross_method:<n>, cipher_scan:<tag>, vip, zuriel. Per the task contract we
-- therefore do NOT overload it with auth.uid(). Instead:
--   * the caller may now DECLARE the real evidence source (p_source);
--   * when it does not, we record the honest category 'human_admin' instead of naming a person.
-- ON CONFLICT deliberately does NOT overwrite source: the original evidence provenance of an
-- existing row is preserved (everything_additive_law).
--
-- REPORTED MISSING PRIMITIVE (not invented here): relation_evidence has NO actor/provenance
-- column, so the acting user still cannot be recorded on this table. Adding one is blocked by a
-- real access consequence rather than by taste: anon AND authenticated hold TABLE-level SELECT
-- on relation_evidence (relacl anon=rDxtm), so any new column is world-readable the moment it
-- exists, and src/lib/supabase.js reads the table with .select('*'), so converting to
-- column-level grants would break the live Findings tab. Recording the actor therefore requires
-- a Human-Gate decision about relation_evidence's read surface. Not designed around here.
-- -------------------------------------------------------------------------------------
drop function if exists public.set_relation_evidence(text, text, text, integer, text, text, text);

create or replace function public.set_relation_evidence(
  p_method text,
  p_a text,
  p_b text,
  p_value integer,
  p_status text,
  p_note text default null,
  p_reason text default null,
  p_source text default null
)
returns public.relation_evidence
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rel      text;
  res      public.relation_evidence;
  v_source text;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  if p_status not in ('candidate','confirmed','rejected') then raise exception 'bad status'; end if;

  -- HG-5 / truth_axes_foundation_law INVARIANT H2: never fabricate an attribution.
  v_source := nullif(btrim(coalesce(p_source, '')), '');
  if v_source is null then v_source := 'human_admin'; end if;

  select relation_type into rel from method_semantics where method = p_method limit 1;

  insert into relation_evidence
    (relation_type, method, a_phrase, b_phrase, value, note, source, status, rejection_reason, updated_at)
  values
    (coalesce(rel,'unknown'), p_method, p_a, p_b, p_value, p_note, v_source, p_status, p_reason, now())
  on conflict (method, a_phrase, b_phrase) do update
    set status           = excluded.status,
        note             = coalesce(excluded.note, relation_evidence.note),
        value            = excluded.value,
        rejection_reason = coalesce(excluded.rejection_reason, relation_evidence.rejection_reason),
        updated_at       = now()
  returning * into res;

  return res;
end;
$function$;

revoke all on function public.set_relation_evidence(text, text, text, integer, text, text, text, text) from public, anon;
grant execute on function public.set_relation_evidence(text, text, text, integer, text, text, text, text) to authenticated, service_role;

comment on function public.set_relation_evidence(text, text, text, integer, text, text, text, text) is
  'Evidence write for relation_evidence. HG-5: the hardcoded source=''zuriel'' attribution is removed — '
  'source keeps EVIDENCE-SOURCE semantics and is either declared by the caller (p_source) or recorded '
  'as the honest category ''human_admin''. The acting user still cannot be recorded on this table: it '
  'has no actor column, and adding one is gated on a Human-Gate decision about its table-level anon '
  'SELECT grant. Historical rows are never reinterpreted.';
