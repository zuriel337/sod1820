# SOD1820 — Full System Inventory & Legacy-to-Research-OS Master Map

**Status:** READ-ONLY audit. Zero code/schema/UI changes made. No merges, no deploys.
**Scope:** Full-repo + full-DB inventory across 16 domains, per Zuriel's request (GPT strategy/CLAUDE build session).
**Live verification anchor (bootstrap, confirmed before any conclusion):**

| Check | Result |
|---|---|
| `git fetch origin --prune` | clean |
| `origin/main` SHA | `3d5bc684c75bc89e6192f0a7dd3c7d0e60f9f0fa` |
| Last-known reference (handed in) | `3d5bc684c75bc89e6192f0a7dd3c7d0e60f9f0fa` |
| Drift vs. last-known ref | **0 commits — none** |
| Supabase project | `linswmnnkjxvweumprav` (canonical, only one used) |
| Open PRs at audit time | 16 (see §6, §9 — several are directly in-scope and unmerged) |
| `nodes` active rules | ~250 (`type='rule', is_active`) |
| `project_codex` rows | 30, led by `_index` |

This document was assembled by 7 parallel read-only research passes (Gematria/Numeric, ELS/Spatial, Topic-Convergence/Reality-Graph, Research-OS/Intake, Sources/Identity/Time, Personal/Metatron/Raziel, Discovery/Admin-Governance), each independently grepping the repo and querying live Supabase. Where two passes independently converged on the same fact (e.g. the Universal Finding contract shape, confirmed identically by three separate agents), that is noted as **cross-confirmed**.

---

## 0. Headline live finding: DB drift happened *during this audit itself*

Domain G's agent was hand ed row counts from an earlier query in this same session and, ~20 minutes later, queried live again. Several counts had already changed:

| Table | Count at audit start | Count ~20min later |
|---|---|---|
| `decision_ledger` | 11 | 14 |
| `site_flags` | 0 | 3 |
| `discoveries` | 0 | 16 |
| `system_suggestions` | 2 | 5 |
| `scan_runs` / `scan_terms` | 0 / 0 | 2 / 286 |

This is a **live, real-time confirmation of `live_state_sync_law`'s Parallel-Agent-Drift risk**: other agents/processes are writing to this database concurrently with this audit. It is reported here per that law's requirement, not silently reconciled. It also means: **treat every row-count in this document as a snapshot from 2026-08-31 during this session, not a permanent fact.**

---

## 1. SYSTEM MASTER MAP (hierarchy)

```
SOURCE / INPUT
  ├─ posts (1279), gallery_images (2618), channel_updates (1807, WA/broadcast), video_transcripts (24)
  ├─ contributors (29), research_contributions (389), community_hints (3)
  └─ ELS corpus (tools/els/data/tk-letters.txt), tanach_verses (23204)
       │
       ▼
EXTRACTION
  ├─ research-extract Edge Fn (LLM-classifies into fact|relation|observation|hypothesis|question)
  ├─ gallery-ocr / wa-ocr (Anthropic OCR)
  ├─ video-transcribe + video_translate() (STT external, Claude translates only)
  └─ shared_expression_extraction_contract_v1 (single method, all sources — CLOSED, enforced)
       │
       ▼
ENGINE / CALCULATION / DISCOVERY
  ├─ Gematria: src/lib/gematria.js (JS) + gematria_api(text) RPC (SQL) — dual, kept in parity
  ├─ Engine Governance Registry: 7-state ladder (gematria_methods.active/in_engine/scannable/...)
  ├─ Composite methods: fn_composite_calc (SQL, governed, gated OFF) + compositeMethods.js (JS, unwired) — DRIFTING PAIR
  ├─ ELS: public/tzofen.html (single canonical engine, verified no parallel implementation)
  ├─ Spatial/3D: spatialModels.js + spatialRenderModel.js + GematriaCube.jsx (real, nav-exposed, narrow scope)
  ├─ Numeric Router: designed on unmerged PR#206, DB-side RPCs already live
  └─ deepAnalysis.js collectionConvergences (cross-method convergence detection)
       │
       ▼
UNIVERSAL FINDING  ◄── canonical contract: src/lib/research/universalFinding.js (makeUniversalFinding)
  ├─ PRODUCERS (confirmed, exactly 3 today — matches task's own hypothesis, verified live):
  │    1. canonicalGematria.js  (gematria_api → Finding)
  │    2. topicConvergence.js   (topic_cards+nodes+edges → Finding, merged 2026-08-31, freshest capability in repo)
  │    3. elsStateToUniversalFindings (same file as #1's contract — ELS → Finding)
  ├─ CONSUMERS: FindingSurface.jsx (renderer), useUniversalWorkspace.js (wired, not yet mounted anywhere)
  └─ Test contract: test/universal-finding-truth-contract.test.mjs (~30 checks, enforces PR1-PR4 "never fabricate")
       │
       ▼
RESEARCH OS / WORKSPACE
  ├─ ResearchProvider.jsx (global SPA state) — local-first, cloud sync via `user_research` (98 rows, blob)
  ├─ research_items (8054 rows) — per-item canonical save rows (hint/searched/library/favorite)
  │     ⚠ user_research vs research_items: two tables for "research state," reconciliation undocumented
  ├─ research_objects (579 rows) — intake/candidate ledger, kind∈{fact,relation,observation,hypothesis,question}
  │     ⚠ research_objects.kind vocabulary ≠ universalFinding.stage vocabulary — NO mapping function found
  └─ decision_ledger (14 rows) — the only Human-Gate decision record; "seen ≠ approved"
       │
       ▼
RELATIONS / CONVERGENCE
  ├─ convergences (8917 rows), relation_evidence (132), theme_links (131), anchor_families (2)
  ├─ 3 method-token vocabularies coexist (db_column-only / Hebrew method_key / free-text) — CLOSED as EXTENSION POINT by WS_CROSS_ENGINE gate, not reopened here
  └─ research_gold_hints_law: 3-layer promotion (raw engine → verified Gold → public)
       │
       ▼
ONE TREE / REALITY GRAPH
  ├─ nodes (5955) / edges (5137) — unified graph, type-aware identity invariants (MF-G1, CLOSED 2026-08-30)
  ├─ Writers: get_or_create_entity_node / upsert_edge / graph_wire_all / graph_wire_number (SECURITY DEFINER)
  │     — ACL gap (anon-executable) found + CLOSED same day (MF-G2, 2026-08-30)
  ├─ graph_privacy_foundation_law — space∈{core,lab,private}; writers not yet space-aware (0 private nodes exist today, so latent not urgent)
  └─ entities/entity_links/entity_types (0 rows) — deliberately deferred by rule, NOT dead-by-accident; nodes.type='entity' (710) is the live substitute
       │
       ▼
HUMAN GATE
  ├─ WarRoomTab.jsx (2745 lines) — the real Command Center, already past CC-1 (reads+writes via pre-approved RPCs)
  ├─ admin_command_center RPC — the single canonical aggregator command_center_law names
  ├─ RazielRoom.jsx — Number-Researcher candidate lens (research_candidates, 42 rows, LIVE for this lens only)
  └─ decision_ledger — sole write target for actual (non-"seen") decisions
       │
       ▼
CANONICAL
  ├─ nodes/edges promotion via admin_research_review(p_decision='canonicalize')
  └─ topic_cards status='approved' → convergence node/edges
       │
       ▼
PUBLISHED / VISIBLE / ACCESSIBLE
  └─ posts, EntityPage.jsx (§10.4, canonical findings UI — untouched), /archive, /code, /research
```

---

## 2. CAPABILITY REGISTRY (condensed — full 10-field crosswalk per capability is in the underlying domain research and can be expanded on request)

### Gematria / Numeric (Domain A)
| Capability | Live Owner | Action Class |
|---|---|---|
| Atomic Gematria Engine (JS) | `src/lib/gematria.js` | ALREADY CONNECTED |
| Atomic Gematria Engine (SQL) + `gematria_api` | `gematria_methods`, `fn_ragil` etc. | ALREADY CONNECTED |
| Engine Governance Registry (7-state ladder) | `engine_governance_registry_authority_law`, `gematria_methods` cols | ALREADY CONNECTED (full method scan never run) |
| Composite Methods (SQL, governed) | `fn_composite_calc` | MUST FOUNDATION NOW (activation gate open) |
| Composite Research Transforms (JS, unwired) | `src/lib/research/compositeMethods.js` | LEGACY SURFACE ONLY / retire-or-merge |
| bidim (atomic fact substrate) | `bidim` view (348,261 rows) | ALREADY CONNECTED, flagged fragile |
| Gematria → Universal Finding adapter | `canonicalGematria.js` | ALREADY CONNECTED |
| Deep/Collective Convergence detection | `src/lib/deepAnalysis.js` | ALREADY CONNECTED |
| Topic/Convergence → Universal Finding | `src/lib/research/topicConvergence.js` | ALREADY CONNECTED (newest capability in repo) |
| Number Essence Anchor | `number_anchors` (0 rows) + `getNumberAnchor()` | MUST FOUNDATION NOW (half-frozen inconsistency) |
| Numeric Research Router + Sequence Lens | PR#206 branch only, not on main | MUST FOUNDATION NOW (stale rebase, design already correct) |
| Number-lens RPCs (DB side) | `fn_number_lookup`, `fn_number_dossier`, etc. | EXTENSION POINT NOW (ready, waiting on #206) |
| NumberTree feature | `src/features/numbertree/NumberTree.jsx` | CANDIDATE FOR RETIREMENT (unrouted, 0-row tables) |
| Number Sets (saved hints) | `number_sets` (0 rows, live code path) | LATER (functioning, unadopted) |
| Orphaned schema-only tables | `digit_language`, `number_readings`, `number_series`, `number_products`, `calculator_anchors`, `news_gematria` | UNKNOWN — NEEDS EVIDENCE / disposition decision |

### ELS / Spatial (Domain B)
| Capability | Live Owner | Action Class |
|---|---|---|
| ELS canonical engine | `public/tzofen.html` (built from `tools/els/`) | STABLE, single-instance verified |
| `els_records` | table (125 rows) | STABLE |
| Universal Finding bridge (ELS) | `elsStateToUniversalFindings()` | EXTEND (single consumer so far) |
| engine_detail reproducibility envelope | `buildEngineDetail()` in `TzofenEmbed.jsx` | KNOWN GAP, documented in code |
| `els_finds` | table (0 rows, RLS granted, 0 code refs) | DEAD — confirm intent or drop |
| `els_settings` | table (0 rows, read by legacy.jsx) | LOW RISK, verify defaults |
| Spatial Gematria model layer | `src/lib/spatialModels.js` | LIVE, narrow scope |
| Spatial render engine | `spatialRenderModel.js` + `GematriaCube.jsx` | LIVE and nav-exposed (`/spatial-gematria`) |
| `spatial_research_runtime_vision_v1` | project_codex doc, priority 90 | VISION DOC ONLY — explicitly not authorized to build |

### Topic/Convergence + Reality Graph (Domain C)
| Capability | Live Owner | Action Class |
|---|---|---|
| topic_cards | table (212 rows) | STABLE, freshly bridged |
| nodes/edges graph | tables (5955/5137) | FOUNDATION CLOSED (identity invariant fixed 30.8) |
| Canonical graph writers | 4 SECURITY DEFINER fns | FOUNDATION CLOSED (ACL gap fixed 30.8) |
| graph_privacy_foundation_law | `fn_graph_space_is_public` | EXTENSION POINT (conditional MUST before 1st private node) |
| Universal Finding envelope contract | `universalFinding.js` | STABLE CANON |
| Topic/Convergence UF adapter | `topicConvergence.js` | NEW, merged 31.8 (see §0 for a work_log/git sequencing note) |
| Canonical Gematria adapter | `canonicalGematria.js` | RECENTLY REPAIRED |
| WS-CROSS-ENGINE Foundation Gate | audit, not code | **CLOSED — do not re-audit** (14/14 axes sufficient) |
| entities/entity_links/entity_types | tables (0 rows) | Deliberately deferred by rule, not abandoned |
| research_object_identity_invariant_law | `fn_research_source_uid`/`fn_research_claim_uid` | STABLE, closed 29.8 |

### Research OS + Intake/Corpus (Domain D)
| Capability | Live Owner | Action Class |
|---|---|---|
| Universal Finding envelope | `universalFinding.js` | FOUNDATION (closed, M1 truth contract) |
| UF truth-contract test suite | `test/universal-finding-truth-contract.test.mjs` | FOUNDATION-VERIFIED |
| ResearchProvider / `useResearch()` | `ResearchProvider.jsx` | MUST FOUNDATION NOW (reconcile vs. `research_items`) |
| `useUniversalWorkspace()` | `useUniversalWorkspace.js` | EXTENSION (built, unmounted) |
| Canonical Gematria adapter | `canonicalGematria.js` | FOUNDATION (closed 31.8) |
| Topic/Convergence adapter | `topicConvergence.js` | FOUNDATION (adapter closed, consumer surface open) |
| `FindingSurface.jsx` renderer | component | FOUNDATION |
| `research_objects` + Discovery Control Center | `discovery.js` | **MUST FOUNDATION NOW** (dual vocabulary vs. UF `stage`) |
| `research_object_identity_invariant_law` | rule + unique index | FOUNDATION-CLOSED |
| `research-extract` edge function | Edge Fn | FOUNDATION |
| `shared_expression_extraction_contract_v1` | rule | FOUNDATION (closed 26.8) |
| `corpus_admission_foundation_v1` / lifecycle law | rule + RLS fixes | **MUST FOUNDATION NOW** (self-documented promotion-gap: approved words never leave the queue) |
| `foundation_closure_protocol_law` | meta-process rule | PROCESS-FOUNDATION |
| `research_gold_hints_law` | 3-layer pipeline | FOUNDATION |
| `research_candidates` | table (42 rows) | CONFIRMED DEAD (superseded by `research_objects`+`decision_ledger`) — but see Domain G note: still live for RazielRoom lens |
| `decision_ledger` | table | FOUNDATION (core mechanism); reason-codes/reevaluations thin |

### Sources/Content + Identity + Time (Domain E)
| Capability | Live Owner | Action Class |
|---|---|---|
| Posts | `posts` (1279) | mature/stable |
| Gallery / Reality Stream | `gallery_images` (2618); `galleries`/`gallery_posts`/`gallery_collections` (0 rows, dormant) | mature; dormant siblings flagged |
| Video/Transcription | `video_transcripts` (24) | extension-point (low rollout vs. rule scope) |
| WhatsApp/Channel broadcast | `channel_updates` (1807) | mature/automated |
| Contributors | `contributors` (29) | stable |
| Books/corpora/source refs | none found as distinct entity | **possible Foundation gap** (sourcing is inline only) |
| Visitor identity graph | `persons`(69385)/`identity_edges`(72790)/`sod_id_registry`(65902) | **confirmed analytics identity, not biblical persons** — FOUNDATION SUFFICIENT for v1 |
| `agent_identity` | table (4 rows) | stable, system-role registry, not user identity |
| users vs profiles | tables | **already resolved** — profiles is canonical economy identity |
| Subscribers | `subscribers` (914) | stable |
| Time/Events split | `events_2026_*` (analytics) vs. `nodes.type='event'`(120)/`type='year'`(12) (historical) | historical system real but under-populated |

### Personal Research + Metatron/Raziel/AI (Domain F, read-only)
| Capability | Live Owner | Action Class |
|---|---|---|
| `person_foundation_contract` | project_codex doc | inventory-only, sufficient for stated scope |
| `persons` (dual-use: analytics + Life Journey anchor) | table | inventory-only, flagged scope-overlap |
| `research_objects` (personal ledger role) | table | inventory-only |
| `user_notes`/`user_research` | tables | inventory-only, appear orphaned from Metatron pipeline specifically |
| `metatron_context` | SQL fn, SECURITY DEFINER | **confirmed genuinely live**, byte-identical to migration (file's own "pending approval" comment is stale) |
| `ai-analyze` Edge Fn | Edge Fn v32+ | inventory-only, Guide-wiring gap found+fixed same PR |
| `wa-raziel` Edge Fn | Edge Fn v47 | 2 self-flagged duplication spots, deliberately deferred to Phase-2 |
| `agent_user_memory` | table (913 rows) | single bridged access path enforced, no direct client bypass |
| `raziel_config` | table (1 row) | **confirmed disconnected island** — several sub-blocks self-tagged `not_wired` |
| `raziel_mind_architecture` | project_codex doc | spec ahead of implementation, self-documented gap |
| RAZIEL_ADVANCED_NUMBER_PAGE_v0 | PR#259/#260, merged | live-gated, allowlist path never smoke-tested with real login |

### Discovery/Search + Admin/Governance (Domain G)
| Capability | Live Owner | Action Class |
|---|---|---|
| WarRoomTab (Command Center) | `WarRoomTab.jsx` (2745 lines) | KEEP/EXTEND — already past CC-1 |
| `admin_command_center` RPC | RPC | KEEP — the canonical aggregator |
| CommandCenterNextPage (PR#218) | unmerged branch | **CHALLENGE — needs scope decision before merge** (risk of 2nd aggregator) |
| `decision_ledger` | table | KEEP |
| `research_candidates` | table (42 rows) | CLARIFY (contradictory self-documentation, live for one lens) |
| `research_objects` | table (579 rows) | KEEP |
| `discoveries`/`discovery_events`/`contribution_events` | tables | VERIFY (no direct client-code reference found) |
| `recommendations` | table (25 rows) | KEEP |
| `system_suggestions` | table (5 rows) | CLARIFY (naming overlap w/ `recommendations`, legitimately distinct) |
| `scan_runs`/`scan_terms`/`hot_research_nodes` | tables | **INVESTIGATE — orphaned live data, zero code owner in repo** |
| `site_flags` | table (3 rows) | KEEP, confirmed live |
| `site_services` | table (14 rows) | VERIFY (no client-side reference found; may be server-only) |
| `search_log` | table (64,865 rows) | VERIFY (likely raw query log, not a discovery engine) |
| RazielRoom / NumberResearcher | component | KEEP |
| RoadmapCommandCenter.jsx | component | NOTE — naming collision with "Command Center," functionally unrelated (roadmap doc viewer) |

---

## 3. UNIVERSAL FINDING COVERAGE MATRIX

**Canonical envelope** (`src/lib/research/universalFinding.js`, cross-confirmed independently by 3 separate research passes):
```
{v:1, id, kind, stage(null|candidate|finding|evidence|claim|interpretation), status,
 subject:{type,key,label,value},
 source:{engine,adapter,sourceRef,method,corpus},
 identity:{sourceIdentity,occurrence,entityRef,relationRef},
 verification:{claimed_expression,claimed_method,claimed_value,engine_method_tested,
               engine_result,verification_state(null|match|mismatch|method_unknown|not_tested)},
 evidence:{refs[],facts[],score,confidence},
 access:{tier,reason},
 provenance:{createdBy,createdAt,inputRef,parentFindingIds,researchSessionId,journeyNodeId},
 projection:{anchors[],relations[],dimensions{}},
 view:{color,pinned,selected,hidden,rendererHints{}}}
```
Governing invariant (PR1–PR4, `truth_axes_foundation_law`): **absent semantic state stays `null`, never defaulted/inferred.** Enforced by `TypeError` on invalid values in JS; the test suite (`test/universal-finding-truth-contract.test.mjs`, ~30 checks) documents 4 prior fabrications that were found and removed (stage→"finding" default, status→"active" default, createdBy→"SYSTEM" default, verification_state→"not_tested" inferred-from-absence).

| Capability | Produces UF today? | Adapter | Source-native identity preserved? | Verification honest? | Provenance sufficient? | Exact restore possible? | Missing piece |
|---|---|---|---|---|---|---|---|
| Gematria | **Yes** | `canonicalGematria.js` | Yes (`entityRef:null`, pure engine mirror) | Yes (`not_tested`, no fabricated "match") | Yes | Yes | none — closed |
| ELS | **Yes** | `elsStateToUniversalFindings()` | Yes | Yes | Yes, but `engine_detail`'s `form:null` on FORMS-panel transition is a known documented gap | Mostly (documented gap above) | reproducibility envelope edge case |
| Topic/Convergence | **Yes** | `topicConvergence.js` | Yes (`node:<id>`/`edge:<id>` refs) | Yes (`stage/status/verification` deliberately null — editorial ≠ epistemic) | Yes | Yes | none — closed |
| Numeric/Sequence research | **No** (designed only) | `numericLensMap` (PR#206, unmerged) | Designed correctly (reuses `makeUniversalFinding`) | Designed honest | Designed sufficient | N/A — not merged | **merge/rebase only**, design is sound |
| Research OS intake (`research_objects`) | **No** (write-side not bridged) | none found | Has own identity invariant (`fn_research_source_uid`) but not mapped to UF `stage` | N/A | Yes at row level | Yes at row level | **vocabulary mapping to UF `stage`/`verification_state`** |
| Personal/Metatron facts (`metatron_context.personal/collective`) | **No** | none — Metatron reads canonical/personal facts directly, does not emit UF envelopes | N/A | N/A | N/A | N/A | not designed to be a UF producer; is a retrieval/context layer, not a finding-source |
| Discovery/Admin candidates (`recommendations`, `system_suggestions`) | **No** | none | N/A | N/A | Human-Gate exists via RPC, but not UF-shaped | N/A | not currently in scope of the UF contract |

**Confirmed: exactly 3 live UF producers today (Gematria, ELS, Topic/Convergence)** — matching the task brief's own hypothesis, verified live rather than assumed.

---

## 4. ONE TREE COVERAGE MATRIX

| Source type | Graph-native? | Projects into graph? | References graph only? | Disconnected? | Must NOT auto-enter graph |
|---|---|---|---|---|---|
| Numbers | Yes (`nodes.type='number'`, 2122 rows) | — | — | — | — |
| Images (gallery) | Yes (`nodes.type='image'`, 2029, near 1:1 with `gallery_images`) | — | — | — | — |
| Entities (golden/silver) | Yes (`nodes.type='entity'`, 710) | — | — | `entities`/`entity_links`/`entity_types` tables (0 rows) exist but are the deferred-by-rule *ontology reference*, not the live entity store | — |
| Posts | Partial (306 of 1279 posts have a mirrored node) | Partial | — | Most posts referenced via URL, not graph-projected | — |
| Rules (`nodes.type='rule'`) | Yes (294) | — | — | — | — |
| Convergences | Yes (219, via `sync_convergence` from `topic_cards`) | — | — | — | — |
| Events | Yes but sparse (120) | — | — | Historical/biblical events under-populated vs. content volume | — |
| Years | Yes but sparse (12) | — | — | same as above | — |
| Videos/transcripts | **No** | **No** | — | Confirmed gap — videos live under posts/channel_updates, no `nodes.type='video'` | not urgent, but a real gap |
| Research objects (candidates) | No (pre-graph layer by design) | Yes, on Human-Gate approval only (`admin_research_review`) | — | — | **Must NOT auto-enter** — this is the correct, deliberate gate |
| Personal/visitor identity (`persons`, `identity_edges`) | **No** | **No** | — | Entirely separate infra (analytics identity resolution), not part of the content graph | **Must NOT enter graph** — different truth domain by design |
| Metatron/Raziel memory (`agent_user_memory`) | **No** | Documented promotion path exists (`conversation→personal_memory→candidate→evidence→decision→tree`) but confirmed **0 nodes sourced_from_memory** — path unused | — | Yes | Must not auto-enter; promotion requires the Candidate→Evidence→Decision path, none observed yet |

---

## 5. LEGACY CAPABILITY PRESERVATION MAP

| Legacy surface | Truth already has a canonical owner? | What to preserve | Disposition |
|---|---|---|---|
| Old ElsGrid.jsx / features/els/Els.jsx / lib/els/* / SearchJourney.jsx / lib/research/torah.js | Yes — `public/tzofen.html` | Nothing further — **confirmed removed from disk, law holds** | Already correctly retired |
| WordPress-era post content | Yes — `posts` table, `clean_content_law` scopes legacy CSS to `:not(.clean)` | The historical content itself | Preserve as-is, no action |
| `hugeit_migration`/`manual` gallery collections | Yes — `gallery_images` is canonical | Present as "museum collections" in Reality Stream UI, not merged into the stream | Already correctly preserved |
| `compositeMethods.js` (JS composite reimplementation) | Yes — `fn_composite_calc` (SQL) is the governed owner | The *concept* (4 composite method definitions) | **Retire the JS file or wire it to call the SQL RPC** — currently a silent parallel implementation |
| `research_candidates` | Yes — `research_objects` + `decision_ledger` is the canonical flow | Nothing — genuinely superseded for the general case | **But do not delete**: still the live data source for RazielRoom's Number-Researcher lens — reconcile the comment, don't reap the table |
| `visitor_identity` table (0 rows) | Yes — `sod_id`/`persons`/`identity_edges` triad | Nothing — appears to be an earlier, unused parallel identity table | Confirm dormant, candidate for eventual drop (not urgent) |
| `galleries`/`gallery_posts`/`gallery_collections` (0 rows) | Yes — `gallery_images` + graph | Nothing | Candidate for eventual drop (not urgent) |
| `NumberTree.jsx` reading `number_roots`/`number_branches` | Unclear — no canonical owner confirmed, feature is simply unrouted | Decide: revive with real data, or retire | Needs an explicit decision, not a silent default |
| Digit-language "sentence" tables (`digit_language`, `number_readings`, `number_series`, `number_products`, `calculator_anchors`, `news_gematria`) | No confirmed owner; 0 rows, 0 code refs | Unknown — may be earlier planning artifacts | Needs an explicit disposition decision |

---

## 6. DISCONNECTED ISLANDS

Valuable, real, but not yet connected into the unified Research OS / graph:

1. **`raziel_config`** — a genuinely well-specified declarative architecture (routing contract, epistemics quartet, reliability envelope) where multiple sub-blocks are self-tagged `"wiring_status":"not_wired"`. Only `shared.knowledge.source="metatron_context"` matches live behavior.
2. **`useUniversalWorkspace()`** — a correctly-built adapter hook over `ResearchProvider`, with no confirmed page-level consumer yet.
3. **`els_finds`** — RLS-granted, zero rows, zero code references anywhere in `src/`.
4. **`number_anchors`** — client helper hard-frozen to `null` (explicit Zuriel-deferral comment), but `api/og.js` still queries the same table directly — an inconsistent half-freeze.
5. **`scan_runs`/`scan_terms`** — 2 and 286 live rows respectively, with **zero code in the entire repo** that creates, reads, or writes them (only a one-line mention in a migration's doc-comment). This is orphaned *live* data, not premature schema — something outside this repo's current `main` wrote it.
6. **`site_services`** — 14 rows, referenced only in a migration's documentation comment; no client-side (`src/`) code reads it. May be server-only (edge functions), unverified this pass.
7. **Historical Time/Event/Year graph** — real (`nodes.type='event'`=120, `type='year'`=12) but small relative to site content volume (1279 posts, 2618 images) — present, not a gap, but sparse.
8. **Numeric Research Router** (PR#206) — fully designed, correctly reuses the canonical UF contract, but stranded on a branch 126 commits behind `main`.
9. **`user_notes`/`user_research`** — orphaned from the Metatron/Raziel context pipeline specifically (not read by `metatron_context`), even though `user_research` *is* wired into `ResearchProvider`'s cloud sync — two different connection axes, worth distinguishing.
10. **Books/corpora/source-citation entity** — no dedicated entity type exists; sourcing is inline in post content only. Possible genuine Foundation gap if a citable-source entity is ever needed.

---

## 7. DUPLICATION / DRIFT MAP

| Pair | Nature | Status |
|---|---|---|
| `fn_composite_calc` (SQL, governed, gated off) vs. `compositeMethods.js` (JS, unwired) | Same 4 composite methods, two independent, non-communicating implementations | Neither is live to users — dormant drift, not yet user-visible |
| `user_research` (98 rows, provider-state blob) vs. `research_items` (8054 rows, per-item canonical rows) | Two persistence tables for "research state," reconciliation undocumented beyond a one-line code comment | `research_workspace_law` names `research_items` as unifying, but the live provider-sync path still runs through `user_research` |
| `research_objects.kind` (fact/relation/observation/hypothesis/question) vs. `universalFinding.stage` (candidate/finding/evidence/claim/interpretation) | Two independently-governed epistemic-type vocabularies, no mapping function found | Real risk as more UF adapters get built on top of `research_objects` reads |
| `recommendations` table/tab vs. `system_suggestions` table/tab | Similarly named, legitimately distinct per differing rule_ids (`SIGNAL≠DISCOVERY` vs. `system_evolution_review_law`) | Not a bug, but confusing naming worth a doc note |
| `admin_command_center` RPC / WarRoomTab vs. PR#218's new `admin_attention_feed_v1/v2` RPCs + `CommandCenterNextPage.jsx` | Both compute "what needs human attention," through different RPCs and a different route (`/research-viewer` vs. `warroom` tab) | Unmerged, admin-only preview — but merging as-is creates two parallel attention aggregators, contradicting `command_center_law`'s explicit "extend, don't rebuild" clause |
| `research_candidates` called "dead code" in `WarRoomTab.jsx:99` while actively read/written by `RazielRoom.jsx` in the same file | Contradictory self-documentation, not a real functional conflict | Low-risk; fix the comment before a future agent deletes a live queue |
| 3 method-token vocabularies (`convergences.method` Latin-only / `bidim`+dispatch Hebrew / `relation_evidence` mixed free-text, 45/132 unmatched) | Pre-existing, already surfaced | **CLOSED as EXTENSION POINT by the WS_CROSS_ENGINE gate (2026-08-30) — not reopened here** |
| Multiple unmerged "Research OS front-end" PRs exploring the same Foundation in parallel: #226 (Research Studio), #215 (Research Viewer), #188 (Research Workspace, itself stacked on #186), #213 (Post 5084 dashboard teaser) | `main` already contains a hardened, corrected version of ideas from PR#226 (two fabrications — `verification_state:"match"`, `stage:"finding"` default — were found and stripped before adoption) | **Live re-fabrication risk**: merging any of these branches as-is, without rebasing against `main`'s current `universalFinding.js` contract, would likely reintroduce exactly the fabrications that were deliberately removed |
| ~25 unmerged ELS branches vs. 3 open ELS PRs | Active, recent (mid-to-late August), unconsolidated parallel exploration on top of a single canonical engine | Not abandoned, but a real stability risk given `els_single_engine_law`'s "single instance" claim |

---

## 8. FOUNDATION GAP LIST (MUST FOUNDATION NOW — exact items)

Ordered by the audit's own prioritization law (existing isolated capability → truth/provenance-loss risk → identity-break risk → foundation dependency → cross-domain leverage → only then projection value):

1. **Corpus admission lifecycle promotion gap** (`corpus_admission_lifecycle_law`, self-documented). `resolve_word_review(approve)` → `wa_add_word()` sets `gematria_words.is_verified=false` **permanently** — there is no live mechanism that promotes an approved word out of the review queue. A human approval decision currently has **no durable effect** on the row it approved. *Why delaying causes redesign risk:* every future corpus-admission surface built on top of "is this word verified?" will silently disagree with the actual human decision, and untangling it later means re-deriving which of the backlog's approvals were "real" from `decision_ledger`/audit trails rather than from the row itself.
2. **`research_objects.kind` ↔ `universalFinding.stage` vocabulary gap.** No mapping function found between the DB-native epistemic-type enum written by `research-extract` and the UF envelope's `stage` enum that adapters are expected to emit. *Why delaying causes redesign risk:* multiple open PRs (#226, #215, #188) are actively trying to build Research-OS UI surfaces on exactly this boundary; each is likely inventing its own ad-hoc mapping right now, which becomes very expensive to reconcile once several such surfaces exist.
3. **`scan_runs`/`scan_terms` orphaned live data** (2 / 286 rows, zero code ownership anywhere in the current `main`). *Why now, not later:* per `live_state_sync_law`'s DB-Drift / Parallel-Agent-Drift categories, live rows nobody in the current codebase claims are exactly the kind of untracked write that erodes trust in every future live-state check — cheap to investigate (who/what wrote them), expensive to leave unresolved while more agents run concurrently.
4. **Numeric Router merge/rebase** (PR#206). The design is already correct (reuses the canonical UF contract, zero envelope duplication) and its DB dependencies are already live on `main` — the only blocker is 126 commits of staleness. *Why now:* this is the single highest-leverage connection in the whole audit — a fully-designed capability stranded purely by git hygiene, not by any open design question.
5. **`ResearchProvider`/`user_research` vs. `research_items` reconciliation.** *Why now, not later:* more research-facing surfaces are actively being proposed (open PRs #226/#215/#188/#213) — each will need to know which table is authoritative for "what did the user save," and an undocumented split invites each PR to guess differently.
6. **`compositeMethods.js` (JS) vs. `fn_composite_calc` (SQL) reconciliation.** *Why now:* both are currently dormant (composite methods are gated `active=false`), which is the cheapest possible moment to pick one canonical implementation — before either gets activated and real traffic depends on it.
7. **`number_anchors` half-freeze inconsistency** (`getNumberAnchor()` hard-frozen to `null`, but `api/og.js` still queries the table directly). *Why now:* small, contained, but a latent silent-failure surface (OG image generation could behave differently from the rest of the site) that gets harder to notice the longer it's inconsistent.

**Total MUST FOUNDATION NOW: 7 items**, all bounded, all with a clear closing action, none requiring new schema/engine/store.

---

## 9. PRIORITIZED CONNECTION QUEUE

1. Fix the corpus-admission lifecycle promotion gap (§8.1) — smallest, highest provenance-integrity value.
2. Investigate `scan_runs`/`scan_terms` provenance (§8.3) — cheap, protects trust in all future live-state audits.
3. Define the `research_objects.kind` ↔ `universalFinding.stage` mapping (§8.2), even if the initial mapping is intentionally partial/documented-as-incomplete — better than zero mapping while PRs #226/#215/#188 are active.
4. Rebase and merge the Numeric Router (PR#206) (§8.4) — design is done, this is pure connection work.
5. Reconcile `compositeMethods.js` vs. `fn_composite_calc` (§8.6) — cheapest while both are dormant.
6. Fix the `number_anchors` half-freeze (§8.7).
7. **Before merging PR#218** (Command Center vNext): make an explicit Human-Gate scope decision — extend `admin_command_center`/`WarRoomTab`, or justify a second aggregator in writing. Do not let it merge silently as a parallel surface.
8. Document/reconcile `user_research` vs. `research_items` (§8.5) with a short comment or codex note.
9. Triage the ~25 unmerged ELS branches — at minimum resolve the #186→#188 stacked-PR dependency before calling ELS Foundation fully stable.
10. Fix the `research_candidates` "dead code" comment in `WarRoomTab.jsx:99` (cheap, prevents accidental deletion of RazielRoom's live queue).
11. *(Only after 1–10)* Decide disposition of the fully-orphaned schema tables (`digit_language`, `number_readings`, `number_series`, `number_products`, `calculator_anchors`, `news_gematria`, `els_finds`, `visitor_identity`, `galleries`/`gallery_posts`/`gallery_collections`, `NumberTree.jsx`) — retire or seed, explicitly, rather than silent carry-forward.

---

## 10. DO-NOT-BUILD LIST

- **A second ELS engine.** `els_single_engine_law` holds on disk, verified — do not resurrect `ElsGrid.jsx`/`features/els/Els.jsx`/`lib/els/*`/`SearchJourney.jsx`/`lib/research/torah.js`.
- **A second Universal Finding envelope/contract shape.** `src/lib/research/universalFinding.js` is the single canonical shape, test-enforced.
- **A second admin Command Center / attention aggregator.** `admin_command_center` RPC + `WarRoomTab.jsx` is canonical; PR#218 needs a scope decision, not a silent parallel merge.
- **A third composite-gematria implementation.** Reconcile the existing two (`fn_composite_calc` SQL vs. `compositeMethods.js` JS) — do not add a new one.
- **A second graph/entity-type ontology parallel to `nodes`/`edges`.** `entities`/`entity_links`/`entity_types` are deliberately deferred by `reality_graph_law` v2, not an invitation to build a competing store.
- **Raziel/Metatron expansion.** Per explicit task instruction — this audit is inventory-only for that domain; `raziel_config`'s unwired sections are extension points, not a build queue.
- **3D/Spatial subsystem expansion.** `spatial_research_runtime_vision_v1` explicitly states "this is NOT authorization to build a 3D subsystem now."
- **A second candidate/discovery queue reviving `research_candidates` as a general mechanism.** It is confirmed dead for the general case and superseded by `research_objects`+`decision_ledger` — but it is still the live backing store for RazielRoom's Number-Researcher lens specifically, so don't fork a replacement for that lens either without an explicit decision.
- **Reviving `visitor_identity`, `galleries`/`gallery_posts`/`gallery_collections`, or `NumberTree.jsx`** without an explicit disposition decision — they are dormant, not proven abandoned-by-accident.
- **Re-auditing the WS_CROSS_ENGINE Foundation Gate** (14/14 axes, closed 2026-08-30) or the graph-identity/graph-writer-ACL fixes (MF-G1/MF-G2, closed 2026-08-30) — per the No-Redundant-Audit rule, unless new live evidence changes the verdict.

---

## FINAL VERDICT

**CURRENT SYSTEM:** A mature, actively-developed Research/Knowledge OS with ~90 distinct live capabilities inventoried across 16 domains, governed by ~250 active DB-encoded rules and a small set of load-bearing Foundation contracts (Universal Finding envelope, graph identity invariants, corpus admission, engine governance registry, shared expression extraction). The system is under heavy concurrent development — drift was observed happening *during this very audit* (§0).

**CONNECTED:** The core truth pipeline works end-to-end for 3 domains today — Gematria, ELS, and Topic/Convergence all produce honest, null-safe Universal Findings that trace back to source-native identities and (for Topic/Convergence and partially Gematria) into the unified `nodes`/`edges` graph. Graph identity and graph-writer security were both real gaps, found and closed within the last 48 hours of repo history (2026-08-30). The admin Human-Gate (`WarRoomTab`/`admin_command_center`) is real, already past the originally-planned CC-1 read-only stage, and routes every canonicalization decision through pre-approved RPCs — no bypass found.

**DISCONNECTED:** Numeric research (designed, stranded on a stale branch), `raziel_config` (declared, mostly unwired), `useUniversalWorkspace` (built, unmounted), `research_objects`' write-side (not yet UF-shaped), and a handful of orphaned-but-real live tables (`scan_runs`/`scan_terms`, `els_finds`, `number_anchors`'s inconsistent freeze).

**MUST FOUNDATION NOW:** exact count = **7** (§8): corpus-admission lifecycle promotion gap; `research_objects.kind`↔UF `stage` vocabulary gap; `scan_runs`/`scan_terms` orphaned-data investigation; Numeric Router merge; `user_research` vs. `research_items` reconciliation; `compositeMethods.js` vs. `fn_composite_calc` reconciliation; `number_anchors` half-freeze fix.

**EXTENSION POINT NOW:** graph_privacy_foundation_law writer space-awareness (before the first private node is ever written); wiring `useUniversalWorkspace` into an actual page; PR#218 scope decision; ELS branch/PR consolidation; `els_finds`/`els_settings` disposition; `research_candidates` comment fix.

**LATER:** Spatial/3D expansion; books/corpora/source-citation entity type; historical Time/Event/Year graph enrichment; disposition of fully-orphaned schema tables; `raziel_config` wiring roadmap.

**FOUNDATION SUFFICIENT / NOT SUFFICIENT:** **SUFFICIENT to continue the Foundation integration program**, conditioned on closing the 7 MUST-FOUNDATION-NOW items above before adding further Research-OS UI surfaces — several of which (PRs #226/#215/#188/#213) are already queued and would otherwise build on the two open vocabulary/lifecycle gaps (§8.1, §8.2) that this audit found.

**NEXT ACTION (single, precise):** Close the corpus-admission lifecycle promotion gap — design and implement the missing mechanism that moves an approved word from `resolve_word_review(approve)` to `gematria_words.is_verified=true`, per `corpus_admission_lifecycle_law`'s own self-documented gap. This is the smallest, most bounded, highest provenance-integrity fix on the list, requires no new schema, and directly serves a rule that already names the exact defect.

**WHAT NOT TO DO NOW:** Do not merge PR#218 (Command Center vNext) as-is without a Human-Gate scope decision. Do not merge the stale Research-OS PRs (#226/#215/#188/#213) verbatim — rebase against `main`'s current `universalFinding.js` first, or they will likely reintroduce fabrications already found and removed. Do not expand Raziel/Metatron. Do not build a 3D/Spatial subsystem. Do not seed the orphaned schema-only tables without an explicit disposition decision. Do not brute-force-merge the ~25 ELS branches without a deliberate consolidation pass.

*Foundation → Projection → Experience. Preserve capability, truth and provenance — not necessarily the legacy interface.*

---
---

# ADDENDUM — MULTILINGUAL / ENGLISH FOUNDATION READINESS

**Added:** same session, same branch, `origin/main` re-verified unchanged at `3d5bc684c7...` (0 drift since the audit above). **Scope:** does the canonical architecture already support Hebrew+English (and beyond) without duplicate entities/graph/Findings, identity break, provenance loss, a second English research system, or a foreseeable schema redesign? **Not in scope:** translating the site now, building any English UX, expanding Raziel/Metatron. READ-ONLY — no code/schema/DB changes made.

Assembled from 5 parallel live research passes (Identity/Representations/Person-Name-Year-Event; Universal Finding/Graph/Topic; Gematria/ELS/Search; Sources-Provenance/Claims/Publication; Routing/Metatron/RTL), each independently grepping the repo and querying live Supabase, plus one pre-existing sibling document found on disk: `docs/planning/he-en-seo-readiness-audit.md` (2026-08-14), which independently corroborates the central finding below.

## The one root cause behind almost every gap

**Four independent research passes converged on the same fact, unprompted, from different angles:** SOD1820's canonical entity identity is keyed by **`(type, label)`**, and `label` is a raw Hebrew-text string — not a stable id with the label as one attached representation.

Live, enforced proof — `supabase/migrations/20260830093000_mfg1_graph_identity_invariant.sql` (applied 2026-08-30):
```sql
-- A. image -> source-native identity (gallery_image_id) — CORRECT, label is not identity here.
CREATE UNIQUE INDEX nodes_identity_image_uidx ON public.nodes ((metadata->>'gallery_image_id')) WHERE type = 'image' ...;
-- B. rule -> versioned identity (rule_id, rule_version) — CORRECT.
CREATE UNIQUE INDEX nodes_identity_rule_uidx ON public.nodes (rule_id, rule_version) WHERE type = 'rule' ...;
-- C. EVERY OTHER TYPE -> label IS the identity.
CREATE UNIQUE INDEX nodes_identity_canonical_uidx ON public.nodes (type, label) WHERE type NOT IN ('image', 'rule');
```
Index C covers `entity` (710 rows), `convergence` (219), `event` (120), `year` (12), `word`/`phrase` — every type that matters for multilingual content. Its own migration already solved the identity/representation split correctly for `image` and `rule`, but never made the same decision for the rest, because at write-time there were zero cross-language label collisions forcing the question.

**This one constraint propagates outward into every other gap found:**
- **`topic_cards`** has exactly one `title text` column, no `lang`, and is FK'd 1:1 into a `nodes(type='convergence')` row bound by index C — an English title cannot be added without either destroying the Hebrew original or minting a second, duplicate node for "the same" topic.
- **`universalFinding.js`**'s `subject:{key,label,...}` has no `lang` field, and in 2 of the 3 live producers (ELS, and by pattern likely Gematria) `key` and `label` are set to the *literal same Hebrew string* — `universalFindingId()` hashes `subject.key` into the Finding's own id, so an English-language Finding about the same subject would compute a different id, i.e. a different "identity."
- **Slug/URL generation** (`toSlug()` in `src/lib/format.js`, and the live SQL function `els_slugify()`) both pass Hebrew characters straight through with no transliteration — `/topic/:slug`, `posts.slug`, and `/codes/:slug` are all literally the Hebrew title itself, so the canonical URL identity is language-dependent too (only `/number/:n` is language-neutral, since numbers are already language-free).

**Everything else in this addendum is either a real-but-secondary gap, or already fine.**

## MULTILINGUAL READINESS MATRIX

| # | Gate | Capability | Status | Classification | Reason |
|---|---|---|---|---|---|
| 1 | IDENTITY | Node/entity canonical identity (`nodes_identity_canonical_uidx`) | **NOT READY** | **MUST FOUNDATION NOW** | Live enforced unique index makes Hebrew label the identity for `entity`/`convergence`/`event`/`year`/`word` nodes; every English-labeled node minted today becomes a permanent duplicate, not a representation |
| 2 | REPRESENTATIONS | `word_aliases` (7 rows: canonical/translation/transliteration typed) | **PARTIAL** | EXTENSION POINT NOW | Schema shape is already correct (`alias`, `alias_norm`, `lang`, `alias_type`, `is_primary`, `verified`) — but `node_id` is **NULL on all 7 rows**; only wired to `gematria_words.word_id`, not to the graph |
| 2 | REPRESENTATIONS | `language_links` (0 rows, live `/languages` UGC feature) | **PARTIAL** | LATER | Admin UI + approve/reject flow already live; no `node_id` column at all; 0 submissions so far — real but early |
| 2 | REPRESENTATIONS | `translit_suggestions` (27 rows), `xlang_calibration` (21,263 rows) | N/A | LATER | Confirmed these are input-normalization aids and a gematria cross-language *research* dataset respectively — not identity/representation stores, no action needed |
| 3 | UNIVERSAL FINDING | `subject:{key,label,value}` envelope | **NOT READY** | **MUST FOUNDATION NOW** | No `lang` field anywhere in the envelope; `key`/`label` are the same literal string in 2 of 3 live producers; `universalFindingId()` hashes `key` — a translated Finding about the same subject gets a different id |
| 4 | ONE TREE / GRAPH | `nodes`/`edges` identity model | **PARTIAL** (type-dependent) | **MUST FOUNDATION NOW** | `image`/`rule` types already correctly separate identity from label (proven pattern to copy); every other type does not. `edges` themselves are language-agnostic — clean |
| 5 | TOPIC/CONVERGENCE | `topic_cards` | **NOT READY** | EXTENSION POINT NOW *(blocked on #1/#4 landing first)* | Single `title text`, no `lang`; adding a language needs either destructive overwrite or a duplicate node (per #4). Bounded, human-curated table (212 rows) — cheap to fix once node identity is fixed |
| 6 | GEMATRIA | Calculation engine (JS `src/lib/gematria.js` + SQL `fn_ragil` etc.) | **READY** | — | Hebrew-only letter maps at 3 independent layers (JS, SQL, `gematria_methods` registry); non-Hebrew input silently reduces to `0`, never miscalculated. Translation/transliteration/operand/display are 4 cleanly separated concepts (`word_aliases`, `src/lib/translit.js`, resolved-Hebrew-only calc calls, `src/lib/englishGematria.js` kept fully separate with its own provenance tags) |
| 7 | ELS | Canonical engine (`public/tzofen.html`) + `els_records` | **READY** | — | Single Hebrew Torah corpus, zero English/translation code paths found inside the engine; `engine_detail`/positions are built strictly from engine state, never from human-readable `title`/`description` fields — corpus-native identity cannot leak |
| 8 | SOURCES/PROVENANCE | `content_translation_law` §4 (generic entity-translation table) | **PARTIAL** | EXTENSION POINT NOW | `video_transcripts` is a real, working, correctly-separated implementation (original vs. translated rows, `translated_by`/`model` provenance, never overwrites source) — but this pattern was **never extended to posts or entities**; no `post_translations`/`entity_translations` table exists; `posts` (1279 rows) has zero `lang`/translation columns |
| 9 | SEARCH/DISCOVERY | `chat_search_facts()` (AI-chat RAG over posts) + 19-file Hebrew-only regex pattern | **PARTIAL** | EXTENSION POINT NOW (flagged as the one "fix before claiming readiness" item) | `fn_en_search()` (gematria-specific) correctly pre-resolves English→Hebrew via `word_aliases` before calculating — the right pattern. But `chat_search_facts()` strips every non-Hebrew character from query tokens before search, so an English query silently returns zero text matches (safe failure mode — no fabricated results — but a real gap); the same `[^א-ת]` stripping recurs in ~19 files repo-wide |
| 10 | RESEARCH OBJECTS/CLAIMS | `research_objects.parent_id` / `universalFinding.js` `provenance.parentFindingIds` | **NOT READY** | EXTENSION POINT NOW → **becomes MUST FOUNDATION NOW if #8 is built first** | No `lang` column on `research_objects`; `parent_id`/`parentFindingIds` exist and are the right *shape* of hook but carry no typed "translation-of" semantics — an English claim about an existing Hebrew claim would land as an indistinguishable new row today |
| 11 | PERSON/NAME/YEAR/EVENT | `contributors`, `nodes` types `entity`/`event`/`year` | **NOT READY** | **MUST FOUNDATION NOW** (same root cause as #1) | Single `display_name`/`label` text fields, no `lang` column anywhere; `persons` table is visitor-identity infra with no name field at all (unrelated to this gate despite the name) |
| 12 | URL/SLUG/ROUTING | `toSlug()` (topics/posts), `els_slugify()` (ciphers) | **NOT READY** for topic/post/cipher · **READY** for `/number/:n` | EXTENSION POINT NOW *(policy decision needed, tightly coupled to #1)* | Slugs are the raw Hebrew string with only whitespace→dash, no transliteration — canonical URL identity is language-dependent for 3 of 4 route families. Only numeric routes are already migration-safe |
| 13 | PUBLICATION | `posts` verification fields (`verified`, `verify_level`, `convergence_score`, etc.) | **PARTIAL** (architecturally sound, unbuilt/unexercised) | LATER | These fields live as scalar attributes of one `posts` row, not duplicated per language — so canonical truth state is *already* structurally independent of translation-publication state, by construction. Would need zero rework if `post_translations` is FK'd to `posts.id` per the `video_transcripts` template |
| 14 | AI/METATRON/RAZIEL | `metatron_context()` SQL fn + `ai-analyze` Edge Fn (read-only, no expansion proposed) | **NOT READY** | EXTENSION POINT NOW | Zero `lang`/`locale` field anywhere in input or output; operates purely in Hebrew today. Both are free-form JSON already, so adding an optional `lang` key later is additive, not breaking — no action taken here per scope |
| 15 | RTL/LTR | Site-wide `dir="rtl"`, CSS `direction:` rules (101 files) | **READY** (correctly scoped) | LATER | Confirmed confined to CSS/display layer and one outbound email template; no DB column stores pre-reversed/pre-wrapped text; `<html lang="he" dir="rtl">` is a one-line static attribute — the only thing a future English mode touches structurally |

## ENGLISH BLOCKERS (must close before starting English implementation)

1. **Decouple canonical node/entity identity from the Hebrew label** — fix `nodes_identity_canonical_uidx` (currently `(type,label)`) to a stable, language-independent key for `entity`/`convergence`/`event`/`year`/`word` types, following the pattern already proven correct for `image` (`gallery_image_id`) and `rule` (`rule_id,rule_version`). Every downstream item depends on this.
2. **Add a `lang` field to the Universal Finding envelope and stop conflating `subject.key` with `subject.label`** in the 3 live producers (Gematria/ELS/Topic-Convergence) — cheapest to do now, while there are only 3 producers, before more Research-OS UI surfaces (already-open PRs #226/#215/#188) start emitting Findings with the current ambiguous contract.
3. **Decide and apply a slug/URL policy** consistent with #1 — either the Hebrew slug stays the permanent canonical identity forever (English content displays at the same URL), or identity moves to an id/uuid with the slug becoming a non-identity friendly alias. Must be decided before any English-titled topic/post/cipher is created.
4. **Fix `chat_search_facts()`'s Hebrew-only query stripping** (and, ideally, standardize the ~19-file pattern) to pre-resolve non-Hebrew query terms via `word_aliases`, the way `fn_en_search()` already correctly does for gematria — otherwise English search silently returns nothing, which will read as "the site doesn't support English" even after content exists.
5. **Wire `word_aliases.node_id`** (currently NULL on all 7 live rows) to the fixed node identity from #1, so "given this entity, what are its representations" becomes a real, queryable relationship instead of a dangling table.

## ENGLISH PREPARATION PLAN (Foundation-first order)

1. Close Blocker #1 (node identity key) — schema decision + migration + backfill.
2. Close Blocker #3 (slug/URL policy) in the same pass as #1 — they're one architectural decision, not two.
3. Close Blocker #2 (Universal Finding `lang` field + `key`≠`label`) — small, contained, do it before more UF-producing surfaces ship.
4. Close Blocker #5 (wire `word_aliases.node_id`) — now that node identity is stable, this becomes a straightforward backfill + FK.
5. Build `post_translations`/`entity_translations` on the proven `video_transcripts` template (Gate 8), FK'd to `posts.id`/`nodes.id` — reuse the pattern, don't invent a new one.
6. Add a typed `translation_of` relation to `research_objects` and document the `parentFindingIds` convention for Universal Finding (Gate 10) — needed as soon as #5 goes live, otherwise translated claims silently duplicate.
7. Close Blocker #4 (`chat_search_facts` + the 19-file pattern) — can happen in parallel with 5-6, no dependency.
8. *(Only after 1-7)* Add `lang` to `metatron_context`/`ai-analyze` if/when Raziel multilingual support is explicitly authorized (out of scope here) · begin actual English content/translation work · English-facing RTL/LTR UI polish (already safe, per Gate 15) · decide English route strategy per the policy chosen in step 2.

## DO NOT TRANSLATE YET

- **Do not create English-titled `topic_cards`, `posts`, `els_records`, or `nodes` rows** until Blocker #1 (identity) and #3 (slug policy) land — every one created today mints a permanent duplicate rather than a representation.
- **Do not bulk-populate `word_aliases`/`language_links`** until Blocker #5 (node_id wiring) lands — new rows would be orphaned exactly like the current 7.
- **Do not build `post_translations`/`entity_translations`** before the identity/slug policy (Blockers #1/#3) is decided — the FK target needs to be stable first.
- **Safe to proceed any time, no blocker:** Gematria (Gate 6) and ELS (Gate 7) are already correctly isolated — English display/glossing work on top of them carries no identity risk. RTL/LTR UI polish (Gate 15) is pure CSS, safe today. `metatron_context`/`ai-analyze` can gain a `lang` parameter additively whenever Raziel multilingual support is separately authorized.

## FINAL VERDICT — MULTILINGUAL FOUNDATION

**MULTILINGUAL FOUNDATION: NOT SUFFICIENT** to begin English implementation — but the gap is narrow, well-bounded, and does not require new schema/engine/store philosophy, only a corrected identity-key decision applied consistently.

**Exact MUST FOUNDATION NOW items:** 3 — (1) node/entity canonical identity decoupled from Hebrew label (`nodes_identity_canonical_uidx`), (2) Universal Finding `subject` envelope gains a `lang` field and stops conflating `key`/`label`, (3) the same identity fix applied to `contributors`/other Hebrew-only-labeled entity tables. (Slug/URL policy and `topic_cards` are listed as EXTENSION POINT NOW rather than a 4th independent MUST, because they are the *same* architectural decision as #1 applied to two more surfaces, not a separate design problem.)

**Everything else — representation-layer wiring, search pre-resolution, translation-of claim typing, the generic post-translation table, RTL/LTR, Metatron's `lang` field — is EXTENSION POINT NOW or LATER, and none of it blocks continuing the rest of the Foundation integration program** (§8-9 of the main audit above remain the general priority list; this addendum's 3 MUST items should be sequenced alongside them, ideally before or alongside Blocker-adjacent item §8.5 from the main audit, since both concern `nodes`/graph-identity integrity).

**This confirms, with live evidence, the exact risk the request named up front:** without this fix, the system would eventually build duplicate entities, a duplicate graph (Hebrew-labeled vs. English-labeled nodes for the same real thing), duplicate Findings (different `subject.key` per language), and identity/provenance loss — not because of a missing feature, but because one already-correct pattern (source-native identity, proven for `image`/`rule` nodes) was never extended to the rest of the graph. The fix is a known-good pattern, not a new design.

*ONE RESEARCH OS · ONE TREE · ONE IDENTITY · MANY LANGUAGES · MANY REPRESENTATIONS.*
*Foundation → Projection → Experience.*
