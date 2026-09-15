# SOD1820 — MASTER CANONICAL OWNER INDEX v1

> **STATUS:** Canonical routing index on `main`; current routing clarifications are merged. Docs-only · no product deploy semantics · not a new SSOT.
> **Purpose:** routing/index only. This file does not duplicate contract bodies, create a registry, or redefine authority. It is the finite owner map intended to be pointed to from `SOD1820_MASTER_STATE.md` under the already-approved Canonical-Owner Pointer Clarification.
> **Authority remains:** live canonical DB + `origin/main` + Master State > Roadmap > conversation/memory/search.

## Agent bootstrap — read the minimum necessary

1. Identify the domain/workstream.
2. Resolve its canonical owner from the table below.
3. If the owner is a versioned rule, read **only** `nodes.type='rule' AND rule_id=<owner> AND is_active=true` by default.
4. If the owner is a long-form contract, open only its current canonical `main` / `project_codex` body and any explicitly linked current addendum in the same owner lineage.
5. Verify current implementation/release state against canonical Supabase and `origin/main` before claiming EXISTING / IMPLEMENTED / MERGED / DEPLOYED / LIVE / VERIFIED.
6. Use `work_log` for coordination/provenance, not as product SSOT.
7. Open historical/inactive/superseded versions only when resolving DRIFT, provenance, supersession, migration, or a decision conflict.
8. Roadmap owns navigation/priority; it does not own or duplicate law bodies.

## Owner creation gate

Before creating any new Contract / Law / System / Store / Engine / Registry / global UI owner, obey active `inter_agent_coordination_law` and return an explicit OWNER CHECK:

- `EXTEND_EXISTING` — default when an existing owner can absorb the change.
- `SUPERSEDE_EXISTING` — only with explicit supersession and preserved history.
- `GENUINELY_NEW_DOMAIN` — burden of proof: explain why no current owner can own the responsibility.

A filename, search match, old conversation, branch, roadmap line, or inactive rule is never sufficient proof of canonical ownership.

## Canonical owner map — selective live re-verification 2026-09-15

Versioned rule rows represented below were re-read live from canonical Supabase during G2 2029 reconciliation where changed. Unchanged rows retain their prior verified state until their domain is touched. Long-form contract/implementation claims still require live verification before any current-state write.

| Domain / responsibility | Canonical owner | Owner type | Active/current state at verification | Canonical body / implementation pointer |
|---|---|---|---|---|
| One Reality Graph / One Tree identity + relations | `reality_graph_law` | versioned rule + codex | **v7 ACTIVE · DB-LIVE 2026-09-14** | `nodes/edges`; read the live v7 body; no parallel graph/store |
| Research OS / Research Context / Journey composition | `docs/research-studio-v1-contract.md` | long-form contract owner lineage | **APPROVED / MERGED v1; 2027 adaptive addendum prepared branch-only** | main owner: `docs/research-studio-v1-contract.md`; current W0 addendum remains separately prepared until reconciled; `ResearchProvider` + existing Research OS readers/stores; no parallel Context store |
| Research workspace behavior / personal-context continuity / direct-page duality | `research_workspace_law` | versioned rule | **v2 ACTIVE · DB-LIVE 2026-09-14** | v2 supersedes fixed-shell/palette presentation clauses while preserving one Research OS, context continuity, mobile/accessibility and Number/Phrase bridge semantics |
| Workspace semantic zones / adaptive layout | `workspace_layout_standard` | versioned rule | **v2 ACTIVE · DB-LIVE 2026-09-09** | semantic responsibilities = Work / You-Personal Context / Tool-Inspect; fixed 3-column geometry + no-fullscreen prohibition superseded |
| AI context assembly / Research Context Builder | `docs/research-studio-v1-contract.md` | existing Research Context owner; technical adapter is not a second owner | **CURRENT MAIN OWNER** | `metatron_context()` is the current technical context-builder adapter consumed by AI surfaces; its historical function name does not create a second Metatron identity or a parallel truth/context store |
| Research Plan / capability selection / Temporal World Model / evidence-aware AI research | `research_strategy_layer_law` | versioned rule | **v13 ACTIVE · DB-LIVE 2026-09-14** | v13 is the current cumulative Research Strategy owner. It preserves v12 and prior Anchor Strength/Emergence, pattern/sequence, source-state, temporal/history, evidence-independence, Personal/Cohort and context-gated secondary-hint semantics, and adds secondary→Radar→temporal-emergence-wave evolution: secondary status is contextual rather than permanent; independent new lineages may justify Radar/emergence investigation; wave/acceleration/decay/reawakening are composed temporal-rank views rather than truth/lifecycle states; count-only/copied/derived activity cannot manufacture a wave; original discovery lineage survives later prominence; Human Gate remains required for governed promotion. Read only the live v13 body for current semantics; v5–v12 are provenance/history, not current routing authority |
| Cross / Method Convergence / Research Convergence routing | `cross_vs_convergence_criteria` | versioned rule | **v4 ACTIVE · DB-LIVE 2026-09-14** | read the live v4 body; no parallel convergence owner/store |
| Research Intake / source research orchestration | `research_intake_foundation_contract_law` | versioned rule + codex | **v8 ACTIVE · DB-LIVE 2026-09-14** | `project_codex.research_intake_foundation_contract`; Source Work/Edition/Textual Version/Witness/Digital Object/Locator semantic distinctions are preserved; no parallel Source registry is authorized by this pointer |
| Truth semantics: epistemic / verification / governance / publication-access | `truth_axes_foundation_law` | versioned rule + codex | **v3 ACTIVE · DB-LIVE 2026-09-14** | canonical transition authorization + root-of-trust; `project_codex.truth_axes_foundation_v1` lineage; Rank/heat/featured do not become truth |
| Admin Research / Human Gate workspace routing | **existing owners only:** `truth_axes_foundation_law` + `research_intake_foundation_contract_law`; presentation under Experience/System Frame | routing composition, **not a new owner** | **W0 2027 direction approved; legacy CC UI/phasing absorbed** | Human-Gate/governance transitions = Truth owner; source/candidate intake = Intake owner; shell/layout = Experience/System Frame. Target projection may change without creating a parallel owner |
| Agent coordination / owner creation / parallel write safety / 2029 fresh-agent entry | `inter_agent_coordination_law` | versioned rule | **v10 ACTIVE · DB-LIVE 2026-09-14** | `nodes(type='rule')`; `work_log` is coordination channel. ONE SCOPE — ONE ACTIVE WRITER; READ-ONLY challenge may run in parallel |
| Work-log CURRENT/SUPERSEDED/ARCHIVED semantics | `work_log_authority_law` | versioned rule | **v2 ACTIVE** | `work_log` / `work_log_current` governance |
| Live-state verification discipline | `live_state_sync_law` + `live_state_resolution_law` | versioned rules | **ACTIVE · DB-LIVE** | canonical Supabase + `origin/main` + production where UI/live behavior matters; refresh before write/merge/deploy |
| Agent-originated media/file upload to canonical Storage | **AGENT_MEDIA_UPLOAD_BRIDGE_V1 lineage** (`agent_upload_ticket_issue` + `agent-upload` Edge) | existing implementation lineage, **not a new owner** | **DB LIVE · EDGE LIVE (v25, incl. `mode=form`) · PRODUCTION E2E VERIFIED with a real PNG** | `supabase/migrations/20260909101500_agent_media_upload_bridge_v1.sql` · `supabase/functions/agent-upload/index.ts` · adapter `scripts/agent-upload.mjs` · pointer in `project_codex._index`. Never build a second upload/storage system |
| Traffic / analytics measurement truth + arrival attribution semantics | `traffic_intelligence_law` | versioned rule + codex | **v8 ACTIVE** | canonical `fn_ti_*` / traffic read paths; reporting/view/demand semantics + attribution; bot observability boundary |
| System Operations / Command intelligence (Metatron) | `system_suggestions_law` | versioned rule; `system_evolution_review_law` is reporting/review extension | **v1 ACTIVE** | system health/analytics/diagnostics/recommendations; current `WarRoomTab`/`fn_metatron_*` are implementation/projection. This is distinct from Admin Research/Human Gate and from the Research Context Builder |
| Experience governance ownership/lifecycle | `experience_governance_foundation_v1_law` | versioned rule + codex/audit | **v1 ACTIVE** | `project_codex.experience_governance_foundation_v1`; `audits/experience_governance_foundation_v1/...` |
| Product visual language / typography / public product naming for redesigned surfaces | `SOD1820_DESIGN_CONTRACT_V1.md` | long-form contract on main | **CURRENT MAIN OWNER · G2 naming guardrail reconciled** | current contract governs redesigned/public product language. `דף המספר` remains public Number/Phrase product; `עולם המספרים` / `עולם המספרים והגימטריה` are not formal future product/navigation names unless Human Gate explicitly renames them |
| Global frame / orientation / navigation / adaptive command responsibilities | `docs/sod1820-system-frame-contract-v1.md` owner lineage | long-form contract owner lineage | **v1 history + 2027 adaptive v2 addendum reconciled to main in G2 release** | `docs/sod1820-system-frame-contract-v2-addendum.md` is the additive supersession layer for current adaptive presentation architecture; one frame, no competing bars; historical v1 presentation examples do not override current Product Language |
| Raziel companion / persona / cross-surface continuity | `raziel_companion_layer_law` | versioned rule; response/voice/routing laws are scoped extensions | **v1 ACTIVE** | `raziel_response_contract`, `raziel_voice_law`, `raziel_routing_law`; System Frame owns placement/invocation surfaces. Raziel is companion/persona/interface over the Research OS, not a truth store or second brain |
| Canonical reusable UI primitives / Share family | `canonical_ui_components_law` | versioned rule | **v5 ACTIVE** | canonical components named by the rule; implementation claims must still be verified in main |
| Capability availability / open-closed-registered state | `site_flags_lock_law` | versioned rule | **v3 ACTIVE** | one capability state → many surfaces/languages; availability is separate from entitlement and object publication/access |
| Content translation / language representation rules | `content_translation_law` | versioned rule | **v3 ACTIVE · DB-LIVE 2026-09-14** | source-language-first witness preservation; translation/transliteration never inherit numeric results; one Concept may connect many exact language Expressions; language/locale remains a projection over shared identity |
| Follow / notifications / subscription funnel / newsletter delivery | `subscription_funnel_law` | versioned rule | **v19 ACTIVE** | `WatchButton` + canonical notification/follow infrastructure + existing delivery stores; Follow != Share != Save |
| Numeric / Gematria research routing and governed numeric-family expansion | **existing composition:** `project_codex.numeric_rule_family_index` + current numeric/method owners | routing composition, **not a new owner** | **INDEX LIVE · POINTER VERIFIED 2026-09-12** | `project_codex.numeric_rule_family_index` separates deterministic engine methods from System/ZURIEL numeric research laws and points inward to current owners; it does not calculate, canonicalize, publish, or become a second registry |
| Method identity / registry | `canonical_methods_registry_law` | versioned rule | **v5 ACTIVE · DB-LIVE 2026-09-14** | `gematria_methods` canonical Registry; current v5 includes conditional-equivalence/projection semantics already Human-Gate locked; consumers must resolve the active registry rather than hard-code method families |
| Method research lifecycle | `method_lifecycle` | versioned rule | **v2 ACTIVE** | SOURCE_ATTESTED → REGISTERED_UNRESOLVED → RECONSTRUCTED → VERIFIED; operational gates remain separate |
| Method execution/scanning governance | `engine_governance_registry_authority_law` | versioned rule | **v1 ACTIVE · DB-LIVE 2026-09-14** | `gematria_methods`, `v_method_states`, canonical execution/verification/scanning functions |
| Corpus admission | `corpus_admission_foundation_v1` | versioned rule + codex | **v1 ACTIVE** | `project_codex.corpus_admission_foundation_v1` |
| Person foundation / identity+roles+personal-data processing | `person_foundation_contract_law` | versioned rule + codex | **v5 ACTIVE · DB-LIVE 2026-09-14** | `project_codex.person_foundation_contract`; v5 carries authorized Personal/Cohort contextual research semantics and privacy boundaries. Runtime privacy challenge may remain open without reverting this owner pointer |
| Foundation closure protocol / G2 no-skip compaction gate | `foundation_closure_protocol_law` | versioned rule + gate artifact | **v5 ACTIVE · DB-LIVE 2026-09-15** | Foundation → Projection → Experience; G2 remains OPEN until all formal blockers plus `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md` pass. v5 binds Canonical Compaction · Owner Hierarchy · Active Tree Freeze and the later G3 Implementation Compaction; merge/release never equals gate closure |

## W0 2027 routing clarification

The 2027/2029 program **does not create** owners named `World`, `Heichal`, `Sidebar`, `Bottom Bar`, `My Workspace`, `Global Now`, `Command Palette`, `Admin Research` or `System Operations` merely because those are product surfaces/modes.

Route by responsibility:

- identity/relations → Reality Graph owner;
- Research Context/Journey → Research Studio/Research OS owner;
- workspace behavior/layout → active `research_workspace_law` / `workspace_layout_standard`;
- truth/Human Gate → Truth Axes;
- research source/candidate intake → Research Intake;
- companion semantics → Raziel owner;
- global placement/navigation/orientation → System Frame + Experience Governance;
- personal research/attention/account → their existing personal/follow/account owners;
- system operational intelligence → Metatron/System Suggestions owner;
- visual tokens/theme/product naming → Design + canonical color/UI owners.

**Multiple surfaces may invoke one capability; they do not become co-owners.**

## G2 mandatory compaction binding — 2026-09-15

Human Gate has made **Canonical Compaction · Owner Hierarchy · Active Tree Freeze** a mandatory no-skip precondition for formal G2 closure. The canonical semantic binding lives in active `foundation_closure_protocol_law v5`; detailed acceptance lives at `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`.

This binding requires, at minimum: 0 material orphan active laws; 100% active-rule classification; finite owner-family hierarchy; Master compact-current form with preserved historical snapshot; Roadmap limited to navigation/priority/gates/sequence/open decisions; bounded current work-log routing; One Decision → One Canonical Body; anti-inflation admission discipline; fresh-agent acceptance; and preserved provenance. A second G3 Implementation Compaction is also mandatory at the end of G3.

The 14–15.9 Human-Gate decision index is preserved at `audits/g2-p0-containment/G2_2029_DAILY_RECONCILIATION_20260914_15_V1.md`. It is a bounded decision index, not a new SSOT.

## G2 2029 upper-layer inheritance rule

Human Gate has explicitly locked **zero upper-layer inheritance** for the 2029 redesign. Current/legacy Topic, Convergence page, Gallery split, Journey UI/model, Number layout, Collector, World/category labels and similar upper-layer interfaces are migration/provenance evidence only unless a capability independently qualifies under its canonical owner. Preserve capability, identity, truth, provenance, history, privacy and Human decisions; do not preserve legacy interface authority merely because it is live.

## Explicitly not an owner map entry yet

Active legacy rows with **no `rule_id`** are not eligible to become canonical owners merely because `is_active=true`. They require reconciliation as `EXTEND_EXISTING`, `SUPERSEDED/HISTORICAL`, or `GENUINELY_SEPARATE`. Until then, agents must not choose a shadow row over an identified modern owner without live conflict analysis and Human Gate where semantics differ.

## Release-state law for agents

Never collapse these words:

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ PR/BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`

A branch artifact remains preserved work/provenance but is not `origin/main`. A merged artifact is not automatically deployed. A deployed artifact is not automatically semantically verified. A G2 merge to main does not itself declare G2 CLOSED.

## Preservation law

Governance cleanup is **routing + supersession**, not deletion of history.

- Preserve prior rule/contract bodies as provenance.
- Preserve unique semantics before supersession.
- Historical owners lose **active-owner authority**, not their historical record.
- Master State points; it does not duplicate full bodies.
- `project_codex._index` is a routing/context pointer only; this Owner Index is the domain→owner map; neither creates or replaces project truth, and neither may become a parallel SSOT.

### Active-tree documentation end-state

The long-term documentation target is a **small active spine**, not a small repository history. After bounded reconciliation at stable gate/program boundaries, normal agent startup should encounter only active routing/owners/addenda/live operational pointers. Superseded contracts, audits, old W/G checkpoints, drafts, research notes and migration evidence remain preserved in archive/provenance locations and are read only for DRIFT, history, migration, recovery or explicit source research.

Do not stop active Foundation/Projection work for a bulk documentation move while semantics are still changing. Keep routing clean now; archive physically in finite closure passes later. Do not create parallel `MASTER`, `FINAL`, owner maps or documentation registries to summarize the pile.

## Intended Master State pointer

The additive Master State pointer should state only:

> `CANONICAL OWNER INDEX v1` — routing-only index for domain → canonical owner → active/current version/status → implementation pointer. Read current owner first; history only on drift/provenance. Canonical body: `SOD1820_MASTER_OWNER_INDEX.md` on `main`. No authority-order change; no new registry/store/system.

No Roadmap priority change is implied by the Owner Index itself. The G2 compaction gate is separately binding through `foundation_closure_protocol_law v5` and the mandatory gate artifact above.
