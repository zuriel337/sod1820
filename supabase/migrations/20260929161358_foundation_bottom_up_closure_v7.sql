-- FOUNDATION_BOTTOM_UP_CLOSURE_V7
-- Human Gate: ZURIEL 2026-09-29
-- OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law v6 -> v7.
-- Adds bottom-up/no-premature-ascent acceptance and G3 Maintenance Acceptance Matrix.
-- No new monitoring/closure/control/cost system or schema.

do $$
declare
  v_prev public.nodes%rowtype;
  v_metadata jsonb;
  v_description text;
begin
  -- Canonical live DB may already carry v7 from the Human-Gate write.
  -- Keep Git parity migration replay-safe/idempotent.
  if exists (
    select 1 from public.nodes
    where type='rule'
      and rule_id='foundation_closure_protocol_law'
      and rule_version=7
  ) then
    return;
  end if;

  select *
  into v_prev
  from public.nodes
  where type='rule'
    and rule_id='foundation_closure_protocol_law'
    and is_active=true
  order by rule_version desc
  limit 1
  for update;

  if v_prev.id is null then
    raise exception 'foundation_closure_protocol_law active owner not found';
  end if;

  if v_prev.rule_version <> 6 then
    raise exception 'expected foundation_closure_protocol_law v6, found v%', v_prev.rule_version;
  end if;

  v_metadata := coalesce(v_prev.metadata, '{}'::jsonb) || jsonb_build_object(
    'v7_bottom_up_closure_binding', jsonb_build_object(
      'human_gate','ZURIEL 2026-09-29',
      'owner_check','EXTEND_EXISTING',
      'verify_before_build',true,
      'one_gap_one_descent',true,
      'ascent_evidence_required',true,
      'percentage_not_gate',true,
      'post_closure_invariant_maintenance',true,
      'maintenance_acceptance_matrix',true,
      'maintenance_shape',jsonb_build_array('OWNER','SIGNAL','ENFORCEMENT','PROJECTION'),
      'maintenance_statuses',jsonb_build_array('LIVE_VERIFIED','IMPLEMENTED_NOT_LIVE','PLANNED_G3','LATER_STAGE','GAP'),
      'no_new_monitoring_system',true,
      'privacy_by_design',true,
      'duplicate_maintenance_reconciliation_required',true
    )
  );

  v_description := coalesce(v_prev.description,'') || E'\n\n'
    || '[UPDATE v7 · Human-Gate ZURIEL · 29.9.2026 — BOTTOM-UP CLOSURE / NO PREMATURE ASCENT + MAINTENANCE ACCEPTANCE · EXTEND_EXISTING]' || E'\n\n'
    || '87) VERIFY-BEFORE-BUILD. Before any new WRITE intended to close a gate or lower-layer blocker, first verify live owner/runtime/current-main state to determine whether the required capability or acceptance evidence already exists. If the canonical runtime already satisfies the requirement, do not rebuild, duplicate or backfill merely because a raw storage field/audit snapshot appears incomplete. Evidence must be read through the owner-defined effective contract.' || E'\n\n'
    || '88) LOWER DEPENDENCIES FIRST. Closure follows dependency order: Foundation → runtime seam → capability → projection → experience. A higher node may remain visible/branch-only as evidence, but it is not CLOSED while a load-bearing lower dependency is unresolved.' || E'\n\n'
    || '89) ONE GAP → ONE DESCENT. A later-discovered lower-layer defect descends only to its owning branch/seam and the smallest affected dependency set. It does not reopen all of G2/G3 or unrelated closed work. After the gap is closed and reverified, execution resumes from the interrupted dependency point.' || E'\n\n'
    || '90) ASCENT EVIDENCE REQUIRED. Before a layer is marked CLOSED, evidence must include, where applicable: current canonical owner resolution; live/runtime or replay evidence; at least one negative/failure path; proof of no parallel authority/system; exact-head tests/challenge when required; and current-main/live reconciliation. UI readiness, a Golden-looking screen, branch existence or a percentage complete are not closure evidence by themselves.' || E'\n\n'
    || '91) NO PERCENTAGE-DRIVEN BUILDING. Completion percentages are dashboard context only. Dependency gates determine whether ascent is allowed. “95% complete” never waives a lower MUST, and a visible surface never authorizes skipping its unresolved substrate.' || E'\n\n'
    || '92) POST-CLOSURE INVARIANT MAINTENANCE. A closed lower gate remains closed only while its routing/compaction invariants remain current. After any material owner-version promotion, the existing owner/coordination tooling must check classification inheritance, compaction metadata and current Owner Index pointer/routing. Version drift that changes only pointers/metadata is repaired without reopening unrelated architecture; semantic drift follows the owning gate.' || E'\n\n'
    || '93) G3 MAINTENANCE ACCEPTANCE MATRIX — RECONCILIATION, NOT A NEW SYSTEM. Before formal G3 CLOSED, reconcile all operational maintenance/monitoring/control requirements gathered during G3 through the existing owners and projections. For every existing or planned operational capability, record exactly: OWNER → SIGNAL → ENFORCEMENT → PROJECTION, plus one status from LIVE_VERIFIED / IMPLEMENTED_NOT_LIVE / PLANNED_G3 / LATER_STAGE / GAP. No Monitoring/Watchman/Control/Cost system 2 may be created.' || E'\n\n'
    || '94) MINIMUM G3 MAINTENANCE COVERAGE. Include at least: reliability/health; browser/runtime failures; dead-man; exact-SHA canary; operational trace/correlation; provider/AI cost; cache/billable state; egress; DB/query performance; capacity/growth/top-growers; retention/compaction; privacy/RLS failures; restore/recovery evidence; and release health. Each row resolves through its current canonical owner; later-stage items receive explicit carry-forward and do not keep G3 open when no G3 redesign risk remains.' || E'\n\n'
    || '95) OBSERVABILITY IS NOT ENFORCEMENT. If the original requirement is protective/guarding, a signal or dashboard alone is not acceptance-complete. The row is CLOSED only when the required owner-native enforcement exists and is verified. Example: an exact-SHA canary that records failure but cannot block the NEXT release where deploy_on_request requires that gate remains incomplete. Detection-only requirements may close as detection only when the owner contract says so.' || E'\n\n'
    || '96) PRIVACY-BY-DESIGN FOR OPERATIONS. Maintenance telemetry is operational evidence, not a Truth Store. Preserve metadata/correlation/hashes/secure references where sufficient; do not copy raw private corpus, credentials or unrestricted personal payloads into trace/health/cost/incident stores.' || E'\n\n'
    || '97) NO DUPLICATE MAINTENANCE IMPLEMENTATION. Final G3 closure must prove that parallel sessions did not implement the same maintenance requirement twice. Reconcile duplicate candidates to one canonical owner/runtime/projection; classify the others as superseded/absorbed/archive evidence while preserving provenance.' || E'\n\n'
    || '98) G3 ASCENT BINDING. Active route: small G2 routing hygiene only when live drift requires it → No-Black-Box effective acceptance → client/server correlation + material-path trace coverage → remaining lower-layer closure by dependency → ELS runtime closure/Goldens/statistical controls/provenance → global G3 reliability pre-close → Maintenance Acceptance Matrix reconciliation → Implementation Compaction → independent Foundation challenge → G3 CLOSED → G3.5. This is navigation over existing owners, not a second roadmap.' || E'\n\n'
    || 'OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law v6 + existing domain owners + inter_agent_coordination_law + deploy_on_request. No new closure, monitoring, maintenance, trace, cost, control or roadmap system.';

  update public.nodes set is_active=false where id=v_prev.id;

  insert into public.nodes (
    type,label,description,metadata,is_active,rule_id,rule_version,depends_on,
    supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key
  )
  values (
    'rule',
    'Foundation Closure Protocol v7 — Bottom-Up Closure + Maintenance Acceptance',
    v_description,
    v_metadata,
    true,
    'foundation_closure_protocol_law',
    7,
    v_prev.depends_on,
    6,
    v_prev.weight,
    v_prev.hebrew_date,
    v_prev.axis_theme,
    v_prev.gallery_id,
    v_prev.identity_key
  );
end
$$;
