# SOD1820 — MASTER CANONICAL OWNER INDEX v1

> **STATUS:** MERGED TO `main` via PR #345 (`d9401650ccaf32b2fd244223e67987963e846e8b`) · docs-only · no product deploy required · not a new SSOT.
> **Purpose:** routing/index only. This file does not duplicate contract bodies, create a registry, or redefine authority. It is the finite owner map intended to be pointed to from `SOD1820_MASTER_STATE.md` under the already-approved Canonical-Owner Pointer Clarification.
> **Authority remains:** live canonical DB + `origin/main` + Master State > Roadmap > conversation/memory/search.

## Agent bootstrap — read the minimum necessary

1. Identify the domain/workstream.
2. Resolve its canonical owner from the table below.
3. If the owner is a versioned rule, read **only** `nodes.type='rule' AND rule_id=<owner> AND is_active=true` by default.
4. If the owner is a long-form contract, open only its current canonical `main` / `project_codex` body.
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

## Canonical owner map — live-verified 2026-09-07

| Domain / responsibility | Canonical owner | Owner type | Active/current state at verification | Canonical body / implementation pointer |
|---|---|---|---|---|
| One Reality Graph / One Tree identity + relations | `reality_graph_law` | versioned rule + codex | **v4 ACTIVE** | `nodes/edges`; `project_codex.reality_graph_law`; current `origin/main` consumers |
| Research OS / Research Context / Journey composition | `docs/research-studio-v1-contract.md` | long-form contract on main | **APPROVED / MERGED** | `ResearchProvider` + existing Research OS readers/stores; no parallel Context store |
| AI context assembly / Research Context Builder | `docs/research-studio-v1-contract.md` | existing Research Context owner; technical adapter is not a second owner | **CURRENT MAIN OWNER** | `metatron_context()` is the current technical context-builder adapter consumed by AI surfaces; its historical function name does not create a second Metatron identity or a parallel truth/context store |
| Research Intake / source research orchestration | `research_intake_foundation_contract_law` | versioned rule + codex | **v8 ACTIVE** | `project_codex.research_intake_foundation_contract` |
| Truth semantics: epistemic / verification / governance / publication-access | `truth_axes_foundation_law` | versioned rule + codex | **v1 ACTIVE** | `project_codex.truth_axes_foundation_v1` |
| Agent coordination / owner creation / parallel write safety | `inter_agent_coordination_law` | versioned rule | **v5 ACTIVE** | `nodes(type='rule')`; `work_log` is coordination channel |
| Work-log CURRENT/SUPERSEDED/ARCHIVED semantics | `work_log_authority_law` | versioned rule | **v2 ACTIVE** | `work_log` / current-view governance |
| Live-state verification discipline | `live_state_sync_law` | versioned rule | **v1 ACTIVE** | canonical Supabase + `origin/main` verification |
| Traffic / analytics measurement truth + arrival attribution semantics | `traffic_intelligence_law` | versioned rule + codex | **v5 ACTIVE** | canonical `fn_ti_*` / traffic read paths; forward-only attribution vocabulary (`tagged_attributable`, `referrer_attributable`, `true_direct_candidate`, `unknown_origin`); Clean classifier unchanged |
| System / Command intelligence (Metatron) | `system_suggestions_law` | versioned rule; `system_evolution_review_law` is reporting/review extension | **v1 ACTIVE** | Command Room / `WarRoomTab`; live `fn_metatron_status/gaps/recommend/weekly/scan/...` family. Metatron is one system-intelligence identity for ZURIEL; it is not the Research Context Builder and not a truth store |
| Experience governance ownership/lifecycle | `experience_governance_foundation_v1_law` | versioned rule + codex/audit | **v1 ACTIVE** | `project_codex.experience_governance_foundation_v1`; `audits/experience_governance_foundation_v1/...` |
| Product visual language / typography / public product naming for redesigned surfaces | `SOD1820_DESIGN_CONTRACT_V1.md` | long-form contract on main | **CURRENT MAIN OWNER** | design contract + theme/palette owners it references |
| Global navigation / context rail / bottom-control responsibilities | `docs/sod1820-system-frame-contract-v1.md` | long-form contract on main | **CURRENT MAIN OWNER** | global frame/nav/context/control composition; implementation verified separately in code |
| Raziel companion / persona / cross-surface continuity | `raziel_companion_layer_law` | versioned rule; response/voice/routing laws are scoped extensions | **v1 ACTIVE** | `raziel_response_contract`, `raziel_voice_law`, `raziel_routing_law`; System Frame owns placement/invocation surfaces. Raziel is companion/persona/interface over the Research OS, not a truth store or second brain |
| Canonical reusable UI primitives / Share family | `canonical_ui_components_law` | versioned rule | **v3 ACTIVE** | canonical components named by the rule; Share family includes `share` + `share_story` as distinct subtypes |
| Method identity / registry | `canonical_methods_registry_law` | versioned rule | **v3 ACTIVE** | `gematria_methods` canonical Registry |
| Method research lifecycle | `method_lifecycle` | versioned rule | **v2 ACTIVE** | SOURCE_ATTESTED → REGISTERED_UNRESOLVED → RECONSTRUCTED → VERIFIED; operational gates remain separate |
| Method execution/scanning governance | `engine_governance_registry_authority_law` | versioned rule | **v1 ACTIVE** | `gematria_methods`, `v_method_states`, canonical execution/verification/scanning functions |
| Corpus admission | `corpus_admission_foundation_v1` | versioned rule + codex | **v1 ACTIVE** | `project_codex.corpus_admission_foundation_v1` |
| Person foundation / identity+roles+personal-data processing | `person_foundation_contract_law` | versioned rule + codex | **v2 ACTIVE** | `project_codex.person_foundation_contract` |
| Foundation closure protocol | `foundation_closure_protocol_law` | versioned rule + codex | **v1 ACTIVE** | `project_codex.foundation_closure_protocol_v1` |
| Content translation / language representation rules | `content_translation_law` | versioned rule | **v1 ACTIVE** | identity remains language-independent; projection/localization extends existing owner |
| Follow / notifications / subscription funnel / newsletter delivery | `subscription_funnel_law` | versioned rule | **v17 ACTIVE** | `WatchButton` + canonical notification/follow infrastructure + existing `newsletter_campaigns`/`newsletter_sends`/`email_events`/`subscribers`; legacy MailPoet re-engagement uses the same pipeline |

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

> `CANONICAL OWNER INDEX v1` — routing-only index for domain → canonical owner → active/current version/status → implementation pointer. Read current owner first; history only on drift/provenance. Legacy active rows without `rule_id` are excluded from ownership until reconciled. Canonical body: `SOD1820_MASTER_OWNER_INDEX.md` on `main` (PR #345). No authority-order change; no new registry/store/system.

No Roadmap priority change is implied by this index.
