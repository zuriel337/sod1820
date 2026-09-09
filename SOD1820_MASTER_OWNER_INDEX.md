# SOD1820 — MASTER CANONICAL OWNER INDEX v1

> **STATUS:** Canonical routing index on `main` from PR #345 (`d9401650ccaf32b2fd244223e67987963e846e8b`); this branch carries an additive W0-2027 routing update pending merge. Docs-only · no product deploy required · not a new SSOT.
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

## Canonical owner map — selective live re-verification 2026-09-09

Rows whose versions were touched by W0 were re-read live from canonical Supabase / current `origin/main`; unrelated rows retain their prior routed owner and must still be live-verified before a current-state write.

| Domain / responsibility | Canonical owner | Owner type | Active/current state at verification | Canonical body / implementation pointer |
|---|---|---|---|---|
| One Reality Graph / One Tree identity + relations | `reality_graph_law` | versioned rule + codex | **v4 ACTIVE** | `nodes/edges`; `project_codex.reality_graph_law`; current `origin/main` consumers |
| Research OS / Research Context / Journey composition | `docs/research-studio-v1-contract.md` | long-form contract owner lineage | **APPROVED / MERGED v1; 2027 adaptive addendum prepared branch-only** | main owner: `docs/research-studio-v1-contract.md`; current W0 addendum on planning branch: `docs/research-studio-v1-2027-adaptive-addendum.md`; `ResearchProvider` + existing Research OS readers/stores; no parallel Context store |
| Research workspace behavior / personal-context continuity / direct-page duality | `research_workspace_law` | versioned rule | **v2 ACTIVE · DB-LIVE 2026-09-09** | v2 supersedes fixed-shell/palette presentation clauses while preserving one Research OS, context continuity, mobile/accessibility and Number/Phrase bridge semantics |
| Workspace semantic zones / adaptive layout | `workspace_layout_standard` | versioned rule | **v2 ACTIVE · DB-LIVE 2026-09-09** | semantic responsibilities = Work / You-Personal Context / Tool-Inspect; fixed 3-column geometry + no-fullscreen prohibition superseded |
| AI context assembly / Research Context Builder | `docs/research-studio-v1-contract.md` | existing Research Context owner; technical adapter is not a second owner | **CURRENT MAIN OWNER** | `metatron_context()` is the current technical context-builder adapter consumed by AI surfaces; its historical function name does not create a second Metatron identity or a parallel truth/context store |
| Research Intake / source research orchestration | `research_intake_foundation_contract_law` | versioned rule + codex | **v8 ACTIVE** | `project_codex.research_intake_foundation_contract` |
| Truth semantics: epistemic / verification / governance / publication-access | `truth_axes_foundation_law` | versioned rule + codex | **v3 ACTIVE** | canonical transition authorization + root-of-trust; `project_codex.truth_axes_foundation_v1` lineage |
| Admin Research / Human Gate workspace routing | **existing owners only:** `truth_axes_foundation_law` + `research_intake_foundation_contract_law`; presentation under Experience/System Frame | routing composition, **not a new owner** | **W0 2027 direction approved; legacy CC UI/phasing absorbed, branch docs pending merge** | Human-Gate/governance transitions = Truth owner; source/candidate intake = Intake owner; shell/layout = Experience/System Frame. Target projection: Source Inbox · Review Queue · Workbench · Candidate relation composition. Legacy CC-1..CC-4 presentation does not become a parallel future owner |
| Agent coordination / owner creation / parallel write safety | `inter_agent_coordination_law` | versioned rule | **v6 ACTIVE** | `nodes(type='rule')`; `work_log` is coordination channel |
| Work-log CURRENT/SUPERSEDED/ARCHIVED semantics | `work_log_authority_law` | versioned rule | **v2 ACTIVE** | `work_log` / current-view governance |
| Live-state verification discipline | `live_state_sync_law` | versioned rule | **v1 ACTIVE** | canonical Supabase + `origin/main` verification |
| Traffic / analytics measurement truth + arrival attribution semantics | `traffic_intelligence_law` | versioned rule + codex | **v6 ACTIVE** | canonical `fn_ti_*` / traffic read paths; reporting/view/demand semantics + attribution; bot observability boundary; Clean classifier evidence remains explicit |
| System Operations / Command intelligence (Metatron) | `system_suggestions_law` | versioned rule; `system_evolution_review_law` is reporting/review extension | **v1 ACTIVE** | system health/analytics/diagnostics/recommendations; current `WarRoomTab`/`fn_metatron_*` are implementation/projection. This is distinct from Admin Research/Human Gate and from the Research Context Builder |
| Experience governance ownership/lifecycle | `experience_governance_foundation_v1_law` | versioned rule + codex/audit | **v1 ACTIVE** | `project_codex.experience_governance_foundation_v1`; `audits/experience_governance_foundation_v1/...` |
| Product visual language / typography / public product naming for redesigned surfaces | `SOD1820_DESIGN_CONTRACT_V1.md` | long-form contract on main | **CURRENT MAIN OWNER** | design contract + theme/palette owners it references; W0.5 Visual Foundation extends existing owner rather than creating a design system owner |
| Global frame / orientation / navigation / adaptive command responsibilities | `docs/sod1820-system-frame-contract-v1.md` owner lineage | long-form contract owner lineage | **v1 CURRENT ON MAIN; 2027 adaptive v2 addendum prepared branch-only** | main history: `docs/sod1820-system-frame-contract-v1.md`; current W0 addendum: `docs/sod1820-system-frame-contract-v2-addendum.md`. Top=orientation; Global Navigation may project as desktop Sidebar/mobile drawer/command; adaptive commands may project as bottom dock/toolbars/sheets; one frame, no competing bars |
| Raziel companion / persona / cross-surface continuity | `raziel_companion_layer_law` | versioned rule; response/voice/routing laws are scoped extensions | **v1 ACTIVE** | `raziel_response_contract`, `raziel_voice_law`, `raziel_routing_law`; System Frame owns placement/invocation surfaces. Raziel is companion/persona/interface over the Research OS, not a truth store or second brain |
| Canonical reusable UI primitives / Share family | `canonical_ui_components_law` | versioned rule | **v5 ACTIVE** | canonical components named by the rule; semantic capability-state/theme consumption; Share family includes `share` + `share_story` as distinct subtypes; implementation claims must still be verified in main |
| Capability availability / open-closed-registered state | `site_flags_lock_law` | versioned rule | **v3 ACTIVE** | one capability state → many surfaces/languages; availability is separate from entitlement and object publication/access |
| Content translation / language representation rules | `content_translation_law` | versioned rule | **v2 ACTIVE** | language/locale is a projection; identity/capability state remains shared; access is not owned here |
| Follow / notifications / subscription funnel / newsletter delivery | `subscription_funnel_law` | versioned rule | **v19 ACTIVE** | `WatchButton` + canonical notification/follow infrastructure + existing delivery stores; Follow != Share != Save; Personal Relevance/Raziel recommendations do not silently create subscriptions |
| Method identity / registry | `canonical_methods_registry_law` | versioned rule | **v3 ACTIVE** | `gematria_methods` canonical Registry |
| Method research lifecycle | `method_lifecycle` | versioned rule | **v2 ACTIVE** | SOURCE_ATTESTED → REGISTERED_UNRESOLVED → RECONSTRUCTED → VERIFIED; operational gates remain separate |
| Method execution/scanning governance | `engine_governance_registry_authority_law` | versioned rule | **v1 ACTIVE** | `gematria_methods`, `v_method_states`, canonical execution/verification/scanning functions |
| Corpus admission | `corpus_admission_foundation_v1` | versioned rule + codex | **v1 ACTIVE** | `project_codex.corpus_admission_foundation_v1` |
| Person foundation / identity+roles+personal-data processing | `person_foundation_contract_law` | versioned rule + codex | **v2 ACTIVE** | `project_codex.person_foundation_contract` |
| Foundation closure protocol | `foundation_closure_protocol_law` | versioned rule + codex | **v1 ACTIVE** | `project_codex.foundation_closure_protocol_v1` |

## W0 2027 routing clarification

The 2027 program **does not create** owners named `World`, `Heichal`, `Sidebar`, `Bottom Bar`, `My Workspace`, `Global Now`, `Command Palette`, `Admin Research` or `System Operations` merely because those are product surfaces/modes.

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
- visual tokens/theme → Design + canonical color/UI owners.

**Multiple surfaces may invoke one capability; they do not become co-owners.**

## Explicitly not an owner map entry yet

Active legacy rows with **no `rule_id`** are not eligible to become canonical owners merely because `is_active=true`. They require the parallel reconciliation pass to classify them as:

- `EXTEND_EXISTING`,
- `SUPERSEDED/HISTORICAL`, or
- `GENUINELY_SEPARATE`.

Until that reconciliation lands, agents must not choose such a shadow row over an identified modern owner without live conflict analysis and Human Gate where semantics differ.

Known examples under separate reconciliation scope include legacy tracking rules, old palace-design language, WordPress/Huge-IT migration rules, and old frequency/`תדר` wording. This index does **not** change or archive them.

## Release-state law for agents

Never collapse these words:

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ PR/BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`

A branch artifact remains preserved work/provenance but is not `origin/main`. A merged artifact is not automatically deployed. A deployed artifact is not automatically semantically verified.

## Preservation law

Governance cleanup is **routing + supersession**, not deletion of history.

- Preserve prior rule/contract bodies as provenance.
- Preserve unique semantics before supersession.
- Historical owners lose **active-owner authority**, not their historical record.
- Master State points; it does not duplicate full bodies.
- `project_codex._index` is the agent entry/router; this Owner Index is the domain→owner map; neither creates a new truth store.

## Intended Master State pointer

The additive Master State pointer should state only:

> `CANONICAL OWNER INDEX v1` — routing-only index for domain → canonical owner → active/current version/status → implementation pointer. Read current owner first; history only on drift/provenance. W0 2027 adds explicit routing for Research Workspace/Layout and Admin Research while preserving existing owners; legacy CC presentation is absorbed rather than promoted as a parallel owner. Canonical body: `SOD1820_MASTER_OWNER_INDEX.md` on `main` once this branch update is merged. No authority-order change; no new registry/store/system.

No Roadmap priority change is implied by this index beyond the separately governed W0/W0.5/W1 sequence.
