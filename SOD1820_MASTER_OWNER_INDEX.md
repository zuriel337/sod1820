# SOD1820 — MASTER CANONICAL OWNER INDEX v2 COMPACT

**Date:** 2026-09-15  
**Status:** CANONICAL ROUTING INDEX · CURRENT-FIRST · NO DUPLICATED DOMAIN LAW BODIES

Purpose: resolve `domain → owner family → canonical owner → direct dependencies → live verification` with the smallest read set.

This file is an index only. It does not become a registry, rulebook, graph, store or semantic super-owner.

## 1. Agent entry

For every substantive task:

1. identify intent / capability / domain;
2. choose the owner family below;
3. resolve the exact canonical owner;
4. read only that owner + direct dependencies by default;
5. read relevant `work_log_current` context only;
6. verify DB/main/production appropriate to the task;
7. open Archive/history only for DRIFT, provenance, migration, recovery or explicit historical research.

Default read budget: **L1**. Escalate to L2/L3 only when cross-domain, WRITE, security, release or architecture work requires it.

## 2. Owner creation gate

Before creating a new Law / Contract / System / Store / Engine / Registry / Graph / Context system / global owner:

- resolve the existing owner first;
- default verdict: `EXTEND_EXISTING`;
- `SUPERSEDE_EXISTING` requires explicit preserved lineage;
- `GENUINELY_NEW_DOMAIN` requires proof that existing owners cannot carry the responsibility without semantic conflict.

New screens, names, examples, product homes, AI personas or implementation components do not justify new owners.

## 3. Finite owner-family hierarchy

Owner families below are routing categories only — never umbrella super-laws.

### A. FOUNDATION / GOVERNANCE / RELEASE

| Responsibility | Canonical owner |
|---|---|
| Foundation gate sequence / closure / compaction | `foundation_closure_protocol_law` |
| Live-state sync | `live_state_sync_law` |
| Live-state resolution | `live_state_resolution_law` |
| Release authorization | `deploy_on_request` |
| Work-log current/history semantics | `work_log_authority_law` |
| Capability availability | `site_flags_lock_law` |

### B. AGENT COORDINATION

| Responsibility | Canonical owner |
|---|---|
| agent task routing / owner creation / one-writer / handoff / fresh-agent entry | `inter_agent_coordination_law` |

### C. RESEARCH OS / CONTEXT / JOURNEY

| Responsibility | Canonical owner |
|---|---|
| Research OS / Research Context / Journey substrate | `docs/research-studio-v1-contract.md` |
| Research workspace behavior | `research_workspace_law` |
| adaptive semantic zones/layout | `workspace_layout_standard` |
| Research Strategy / Research Plan / temporal evidence reasoning | `research_strategy_layer_law` |

### D. RESEARCH INTAKE / SOURCE / REPRESENTATION

| Responsibility | Canonical owner |
|---|---|
| universal research intake / source orchestration | `research_intake_foundation_contract_law` |
| corpus admission | `corpus_admission_foundation_v1` |
| exact expression/source extraction | `shared_expression_extraction_contract_v1` + Intake owner |
| writer/contributor material source flow | `writer_material_home_law` under Intake |

### E. TRUTH / HUMAN GATE

| Responsibility | Canonical owner |
|---|---|
| epistemic / verification / governance / publication-access axes | `truth_axes_foundation_law` |
| Human curation Gold/Silver/Signature/Anchor semantics | `golden_entity_law` under Truth Axes |
| manual verification seal | `verify_seal_manual_only` under Truth Axes |

### F. REALITY / WORLD / TEMPORAL / RANKING

| Responsibility | Canonical owner |
|---|---|
| One Reality Graph / One Tree / relations | `reality_graph_law` |
| Cross / Method Convergence | `cross_vs_convergence_criteria` |
| World ranking / contextual prominence | `research_gold_hints_law` |
| signal vs curation boundary | `signal_vs_curation` under Truth Axes |

### G. GEMATRIA / NUMERIC / METHODS

| Responsibility | Canonical owner |
|---|---|
| deterministic Gematria calculation | `project_codex.gematria_engine` / active `gematria_engine_law` |
| Method identity / registry | `canonical_methods_registry_law` |
| Method lifecycle | `method_lifecycle` |
| execution/scanning authority | `engine_governance_registry_authority_law` |
| numeric/system rule-family routing | `project_codex.numeric_rule_family_index` |

Never use general-model arithmetic as canonical SOD1820 engine truth when engine verification matters.

### H. ELS / TEXT CIPHER

| Responsibility | Canonical owner |
|---|---|
| ELS research semantics/capability | `els_research_layer_law` |
| ONE canonical ELS engine invariant | `els_single_engine_law` under ELS owner |

### I. RAZIEL / RESEARCH INTELLIGENCE

| Responsibility | Canonical owner |
|---|---|
| Raziel companion/persona/cross-surface continuity | `raziel_companion_layer_law` |
| routing | `raziel_routing_law` under Raziel |
| response contract | `raziel_response_contract` under Raziel |
| voice | `raziel_voice_law` under Raziel |
| System Operations / Metatron recommendations | `system_suggestions_law` |

Raziel and Metatron do not create second truth/context stores.

### J. PERSON / PERSONAL / PRIVACY / ATTENTION

| Responsibility | Canonical owner |
|---|---|
| Person / group / personal-data processing | `person_foundation_contract_law` |
| Follow / notification / subscription funnel | `subscription_funnel_law` |
| entitlement/access product seam | `platform_tiers_law` |

Privacy/RLS rules are children/implementation guards of the relevant Person/Foundation owners, not parallel privacy systems.

### K. PUBLICATION / CONTENT / MEDIA / LOCALIZATION

| Responsibility | Canonical owner |
|---|---|
| publishing conventions / Post identity / legacy content protocol | `project_codex.publishing_conventions` |
| translation / source-language integrity | `content_translation_law` |
| contributor/source material | Research Intake + Research OS owners |
| share UI primitive family | `canonical_ui_components_law` under Experience |

### L. EXPERIENCE / SYSTEM FRAME / DESIGN

| Responsibility | Canonical owner |
|---|---|
| Experience lifecycle/governance | `experience_governance_foundation_v1_law` |
| global frame/navigation/orientation | `docs/sod1820-system-frame-contract-v1.md` + current addendum lineage |
| visual language / typography / public naming | `SOD1820_DESIGN_CONTRACT_V1.md` |
| canonical reusable UI primitives | `canonical_ui_components_law` |
| semantic colors | `canonical_colors_law` under Design |

Product homes such as Home, World, Heichal, Archive, My Personal Area and surfaces like Global Now do not become owners merely because they are visible destinations.

### M. TRAFFIC / SYSTEM OPERATIONS

| Responsibility | Canonical owner |
|---|---|
| traffic / analytics measurement truth | `traffic_intelligence_law` |
| system diagnostics / recommendations | `system_suggestions_law` |

## 4. Active-tree compaction contract

Every active rule must have `metadata.compaction_v1` containing exactly one routing class:

- `OWNER`
- `CHILD_OF_OWNER`
- `IMPLEMENTATION_OR_PROJECTION_RULE`
- `LEGACY_RETIRE_OR_SUPERSEDE` — historical rows should normally be inactive after retirement.

At the 2026-09-15 first pass:

- active rules: **241**;
- classified active rules: **241 / 241**;
- active rules without canonical owner: **0**;
- legacy rows retired from active routing in first pass: **8**.

The count may decrease further as unique semantics are absorbed and scoped implementation laws are archived. The target is not an arbitrary number; it is low routing ambiguity and minimal startup reads.

## 5. Archive rule

Normal routing never begins from historical rules, old work_log rows, previous Master snapshots, completed audits or superseded branches.

Archive/history is opened only for:

- DRIFT resolution;
- provenance;
- supersession/migration;
- rollback/recovery;
- explicit historical research.

## 6. One Decision → One Canonical Body

- domain semantics → owner body;
- current project state → Master pointer/status;
- sequence/priority/gates → Roadmap;
- research evidence/calculations → Research OS;
- coordination/release trace → work_log;
- superseded detail → Archive.

Other surfaces may point. They do not carry competing full semantic copies.

## 7. Release language

Never collapse:

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`.

Every current-state claim must be live-verified at the source appropriate to the task.
