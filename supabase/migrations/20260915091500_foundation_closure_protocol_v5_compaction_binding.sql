-- SOD1820 Foundation Closure Protocol v5
-- Human Gate ZURIEL · 2026-09-15
-- EXTEND_EXISTING: bind G2 Canonical Compaction / Owner Hierarchy / Active Tree Freeze
-- to the existing no-skip Foundation closure owner. Idempotent parity migration for a rule
-- already applied live in canonical Supabase during the Human-Gate session.

do $$
begin
  if not exists (
    select 1 from public.nodes
    where type='rule'
      and rule_id='foundation_closure_protocol_law'
      and rule_version=5
  ) then
    insert into public.nodes(
      type,label,description,metadata,is_active,rule_id,rule_version,
      depends_on,supersedes_version,weight,identity_key
    )
    select
      type,
      'Foundation Closure Protocol v5 — No-Skip Gates + Canonical Compaction Binding',
      description || E'\n\n[UPDATE v5 · Human-Gate ZURIEL · 15.9.2026 — G2 CANONICAL COMPACTION / OWNER HIERARCHY / ACTIVE TREE FREEZE BINDING]\nThis section is additive and EXTEND_EXISTING. It creates no new Master, Roadmap, owner registry, archive system, context authority, store, graph or engine. The detailed acceptance body is preserved in `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`; this rule binds closure to that gate without duplicating its body.\n\nG2 CLOSURE BINDING: formal G2 closure is NOT SUFFICIENT until the Canonical Compaction / Owner Hierarchy / Active Tree Freeze gate passes in addition to all other active Foundation/Product Capability blockers. This is a no-skip condition under the existing command semantics; קדימה/תעלה do not waive it.\n\nMINIMUM BINDING OUTCOME: 0 material orphan active laws; 100% active-rule routing classification; owner-family hierarchy resolved without super-law duplication; compact Master current-state/pointer form with historical snapshot preserved; Roadmap reduced to navigation/priority/gates/sequence/open decisions; bounded current/open work-log routing; One Decision → One Canonical Body; exact surviving release states; fresh-agent acceptance PASS; historical provenance preserved.\n\nANTI-INFLATION BINDING: after compaction, domain semantics live at their owner; atomic research lives in Research OS; coordination/release provenance lives in work_log; priority/sequence lives in Roadmap; Master records only material current state/Human-Gate/closure plus pointers. Importance does not justify copying a full audit/contract into Master.\n\nG3 BINDING: a second Implementation Compaction / Archive Pass is mandatory at the end of G3 to retire superseded prototypes/branches/audits from normal startup routing while preserving provenance. It is not a second roadmap or archive system.\n\nClosure evidence must include a fresh-agent replay over representative domains after compaction. Failure to route correctly with bounded reads keeps the gate OPEN.\n',
      coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'v5_canonical_compaction_binding', jsonb_build_object(
          'human_gate','ZURIEL 2026-09-15',
          'owner_check','EXTEND_EXISTING',
          'no_new_system',true,
          'gate_artifact','audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md',
          'g2_no_skip',true,
          'g3_compaction_mandatory',true,
          'principles',jsonb_build_array(
            '0_orphan_active_laws',
            '100_percent_active_rule_classification',
            'owner_family_hierarchy',
            'master_v3_compact',
            'roadmap_compact',
            'bounded_work_log_current',
            'one_decision_one_canonical_body',
            'future_admission_anti_inflation',
            'fresh_agent_acceptance',
            'preserve_provenance'
          )
        )
      ),
      true,
      rule_id,
      5,
      depends_on,
      4,
      weight,
      identity_key
    from public.nodes
    where type='rule'
      and rule_id='foundation_closure_protocol_law'
      and rule_version=4;
  end if;

  if exists (
    select 1 from public.nodes
    where type='rule'
      and rule_id='foundation_closure_protocol_law'
      and rule_version=5
  ) then
    update public.nodes
      set is_active = (rule_version = 5)
    where type='rule'
      and rule_id='foundation_closure_protocol_law'
      and rule_version in (4,5);
  end if;
end $$;
