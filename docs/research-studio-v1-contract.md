# SOD1820 Research Studio v1 — APPROVED PRODUCT/ARCHITECTURE CONTRACT

Status: APPROVED by ZURIEL Human-Gate, 2026-08-24. Reconciliation pass 2026-08-24 (same day) applied after a full READ-ONLY audit against Research DNA v1 and Master State — see §0.
Scope: product/architecture contract. No DB/schema migration, no production deploy, no canonical publication by this branch alone.

## 0. Reconciliation with prior closed contracts
This contract does not stand alone. It is written to compose with, never compete with or re-decide, the following already-CLOSED decisions:

- **Research DNA v1 Foundation Contract** (`audits/research_dna_v1_foundation_contract/RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md`, PR #166, `CONTRACT: CLOSED`): §1 (Claim/Calculation/Verification Contract — `verification_state` vocabulary), §4 (World/Method/Premium Access Law), §11 (Method Profile Contract), §27–§28 (Number Coverage, FINAL access-tier decisions).
- **`SOD1820_MASTER_STATE.md` §20 — Gate #18, Unified Judgment & Human-Gate Contract**, CLOSED 2026-08-23: Option C, "Contract-over-Consolidation" — no physical pipeline consolidation, no new Judgment system, `decision_ledger` is an append-only audit trail only, never a source of truth.
- **`convergence_one_per_value`** (locked `nodes type='rule'`): exactly one canonical convergence per value, checked across `topic_cards`, `nodes type='convergence'`, and `convergences`, before any new one is created.
- **`research_workspace_law` / `workspace_layout_standard`** (locked `nodes type='rule'`): the global research environment (3-column standard, `ResearchProvider.jsx` + `ResearchCenter.jsx`) already exists.
- **`OD-F10a` — Person-Identity Contract** (commit `687dfdc7`, approved-as-contract-only, not yet merged): `person-ref` = `person:<owner_person_id>:{self|p:<ref>}`, one logical identity shared across every lens.

Where this contract's earlier draft used different vocabulary than these closed decisions (e.g. `stage`/`status` instead of `verification_state`, "Judgment surface" without citing Gate #18, "NumberHub" as a new page, "Global Research Workspace" as if newly built), this reconciliation pass corrects the wording. **No architecture changes as a result — only accurate citation of what was already decided.**

## 1. One Research OS
SOD1820 research is one system: one Reality Graph, one global Research Workspace, one Human Gate. ELS, Gematria/Numbers, Cross, Verse, Entity/Person/Name, Reality Signals, posts/insights and AI are sources/tools inside the same Research OS, not separate products.

Core rule: input ≠ discovery ≠ finding ≠ fact ≠ interpretation ≠ canonical ≠ published.
AI may suggest and organize; it never promotes a candidate to canonical truth or publishes it.

## 2. Research Context, Lenses & Dimensions
Research begins with a **Context**, not with an engine.

- **Research Context** — the active inquiry's owner: subject/scope, active Findings, selected Dimensions, active Lens, Journey position. **Research Context is a logical/state contract over existing structures — it is not itself a table and has no new storage owner.** It may *reference* `research_objects`, a `person-ref`, a Number/Topic/Event/Entity, etc., but is never automatically identical to any one of them, and this contract does not authorize a new table/store for it.
- **Lenses** — the engines/perspectives a Context can be explored through: ELS, Number, Gematria, Entity/Graph, Sources, AI, and future adapters. A Lens is a *view* over the Context, never a competing Context of its own.
- **Dimensions** — orthogonal facets a Finding/Context can be sliced by: Method, Time, Researcher/Source, World, Topic, Provenance, Confidence, Access, relation-family, and others as adopted.

**Dimensions map onto Research DNA v1 §2's already-ratified eleven dimensions — this is not a twelfth, competing taxonomy:**

| This contract's Dimension | DNA v1 §2 dimension |
|---|---|
| Method | Method |
| Time | Temporal |
| Researcher/Source | Provenance (extended: source-as-researcher is a first-class facet, not previously named this explicitly) |
| World | Semantic (worlds/themes) |
| Topic | Research (packages/clusters) |
| Provenance | Provenance |
| Confidence | Verification (derived signal, not a new axis) |
| Access | Access |
| relation-family | (new — graph-edge-type facet, not previously named in DNA v1; extension, not replacement) |

Identity, Approval, Numeric, Quality and Interpretation (DNA v1's remaining dimensions) are not display Dimensions in this contract's sense — they stay exactly where DNA v1 already places them (envelope/identity fields, approval workflow, etc.), not reused as Lens-facing filters.

## 3. Universal research flow
The research flow is:

Discovery → Universal Findings → Investigation → Judgment

### Discovery
Sources may contribute candidates:
- manual search / command bar
- canonical ELS/cross-search
- canonical Gematria/Number engines
- Entity/Reality Graph
- verses/context
- existing research, posts and insights
- AI suggestions / Auto Terms
- future source adapters

A candidate is not a Finding until the relevant canonical engine/source verifies what can be verified, per Research DNA v1 §1's Claim/Calculation/Verification discipline (`verification_state`) — see `docs/research-universal-finding-contract.md` §1.

### Universal Findings
Verified research results are represented through one shared Finding envelope with provenance (see the companion Universal Finding Contract). Findings may originate from different engines but share a common identity/provenance shape. No engine may create a parallel Findings truth. **The envelope is a projection with references — it is not itself a storage owner** (see the companion contract's Storage Law).

### Investigation
The researcher explores the same Context through Lenses/renderers: Matrix, verses, number methods, cross-results, EntityHub/Graph, timeline, relations, layers, 3D/depth, comparisons and inspectors.

### Judgment
Evidence, claims and interpretation are shown separately. Confidence/ranking must be explainable. **Judgment is a read/projection surface over the existing pipelines (`research_objects`/`research_contributions`/`topic_cards`/`els_records`/`language_links`/`research_candidates`/`word_review_queue`) plus `decision_ledger` as an audit trail — per Gate #18/Option C, this is never a new or seventh pipeline, and `decision_ledger` is never a source of truth.** ZURIEL remains Human Gate for canonical/publishing decisions, without exception, regardless of confidence tier or contributor reputation.

## 4. Research Journey
Journey is not a separate third application, and it is not merely chronological history.

**Journey = graph navigation between Findings, within one Research Context.** A researcher moves from Finding to Finding along relations the same Context makes available — not necessarily in the order they were created, and not confined to one Lens.

Journey must preserve exact identity/provenance so the researcher can restore an exact previous research state, not an approximate re-run. The UI may expose a compact breadcrumb or a full Journey view, but the underlying structure is a graph traversal, not a log.

**Guided Journeys are presets/templates over the same state — never a new engine, system, or store.** A Guided Journey is a named path/filter over the existing Context→Lens→Finding→Journey model.

**Architectural acceptance test (coverage examples, not five products to build now):** this model must be able to express each of the following *without a special-cased system per case* — if any of them needs one, the model is wrong and needs another pass:
- Number Method Journey (same number, across gematria methods)
- Years-from-Creation Journey (a Time-dimension traversal)
- Researcher/Source Journey (e.g. material attributed to the Ari — a Researcher/Source-dimension traversal)
- Person/Life Journey (a `person-ref`-scoped traversal across Findings referencing that person)
- Name Journey (a Subject-scoped traversal across the multi-engine findings the existing NameLab/`fn_name_protocol` flow already produces for one name-as-word — key/cross/tanach/numbers/letters/notarikon/language/network/els layers)

**Name Journey ≠ Person/Life Journey.** Name Journey researches a name as a word/string across engines (no `person-ref`, no family linkage — confirmed live in `NameJourney.jsx`/`NameMultiSearch.jsx`). Person/Life Journey researches a specific identified person via `person-ref`. Both are real, distinct Journey instances over the same Context→Lens→Finding→Journey model; they may share one Research Context and connect to each other. A **Person Context may launch/reference a Name Journey** for any of that person's names — that link is a Context-level cross-reference, not a merge: neither Journey absorbs or redesigns the other.

**Name is a first-class Subject/adapter, not a Journey-shaped Finding.** The chain is `Name Subject → Name engines/lenses (key/cross/tanach/numbers/letters/notarikon/language/network/els) → individual Findings (one per engine result) → Name Journey (graph navigation across those Findings)`. Name Journey itself is never modeled as a Finding — it is the traversal, exactly like every other Journey in §4.
- News/Event Research Journey (an Event/Topic-dimension traversal)

ELS's existing promote-to-axis + breadcrumb behavior (PR #186) is **one instance** of this general model, not the model itself, and must keep working exactly as built.

## 5. Layered / 3D is first-class NOW
Layered and 3D/depth are first-class architectural capabilities, not a distant decorative future feature.

Hard rule: 2D, Layered and 3D are renderers/projections of the SAME canonical Research State / Finding State. No separate 3D engine, separate matrix truth, duplicate search or duplicate Finding store is allowed.

Every new research source/lens should expose enough stable identity, coordinates/relations and provenance to be projectable into:
- 2D / compact surface
- Layered research matrix
- 3D / depth renderer
- future Research Universe renderer

### Depth semantics
3D depth must remain extensible, mapped onto the same Dimensions defined in §2 (Method / Time / Researcher-Source / World / Topic / Provenance / Confidence / Access / relation-family). No semantic dimension is silently inferred. The selected Depth Dimension must be explicit to the researcher.

## 6. Performance contract
The largest/most powerful experience must not force the heaviest renderer on every device.

- 2D + Focus/Fit is the low-cost baseline.
- Layered/3D are on-demand renderers over the same state.
- rendering should be lazy where possible.
- large matrices should use viewport/window virtualization rather than drawing invisible cells.
- mobile/slow hardware changes rendering strategy, never research truth or available canonical data.
- Full Matrix remains available on explicit request.

## 7. Findings Workspace = the existing ResearchProvider/ResearchCenter
The Findings Workspace belongs to Research OS, not specifically to ELS — **and it is not a new build.** It already exists, locked, as `research_workspace_law` / `workspace_layout_standard`, implemented in `src/lib/research/ResearchProvider.jsx` (`cart`/`saved`/`pinned`/`history`/`collections`/`journeys`/`mode`, local-first + cloud sync to `research_items`) and `src/components/ResearchCenter.jsx` (the 3-column standard: left = you/collected, right = active-tool context, center = canvas). This contract's job is to **extend** it with the Universal Finding envelope as additional metadata carried on existing `cart`/`pinned` entries — never to replace it, fork it, or build a second Workspace page.

A Finding, wherever it flows through this Workspace, should support, where applicable:
- stable identity
- source/engine
- value/term/entity reference
- exact occurrence/location when relevant
- provenance/evidence refs
- display color/view metadata (non-canonical)
- verification state (per Research DNA v1 §1 — see companion contract)
- access/tier (inherited, never invented — see companion contract)
- actions: inspect, compare, pin/add-to-research, promote to research axis where the engine supports it, remove from current view without deleting provenance

ELS #186/#188 is therefore an ELS Lens/adapter into the existing Workspace, not the final owner of Findings and not a template for a new Workspace implementation.

## 8. Numbers are first-class entities
A number is an Entity/Hub in the same graph, not a calculator output only.

word/name → canonical Gematria methods → number → equal/related expressions → entities → verses/ELS → convergences → insights/posts/events → Journey.

**Number Page (`EntityPage.jsx`) follows Research DNA v1 §27.11's Preserve & Expand law: it grows additively, in place, and is never rebuilt or replaced.** Per the approved hybrid topology (H2): the global Workspace stays canonical and unchanged; Number Page additionally gets its own **contextual, reusable Research Surface projection** of Findings relevant to that number, positioned *alongside* the existing locked findings-area (`EntityPage` §10.4, "not to be redesigned") — never injected into it, never a replacement of it.

**Naming correction:** the `NumberDNA.jsx` component (which in fact renders curated `topic_cards`/convergence-cards and their images, not gematria methods) is renamed at the display-concept level to **"🧬 צירי ההתכנסות"**, internal target name `NumberConvergences`. "Research DNA" is reserved exclusively for Research DNA v1 as the architectural concept — no other component or label reuses "DNA" going forward.

## 9. AI discovery contract
AI/Raziel/Metatron may propose next research candidates using the current Research Context, graph, numbers, entities, existing research and tool outputs.

AI suggestions are visibly Suggestions/Candidates until verified by an appropriate source/engine — the same `stage="candidate"` state already defined in `equality_vs_convergence` (locked rule) as "🤖 קשר אפשרי." AI does not become a second calculation engine and does not silently create Facts.

## 10. ELS placement
The current ELS work (main + Draft PR #186) is preserved and repositioned as the first mature Research Surface lens:
- canonical engine/state bridge
- Matrix Snapshot
- 2D/Layered/3D renderers
- Verse layer/lens
- Findings / add-finding cross-search
- exact Finding identity
- promote-to-axis
- exact Journey restore

Do not expand ELS into a parallel general Research Workspace. New shared capabilities move upward into Research OS contracts/components. **Topic/Convergence is explicitly not part of the ELS Lens** — see the companion Universal Finding Contract's own, separate Topic/Convergence adapter mapping.

## 11. Build order after this contract
1. Universal Finding Contract.
2. Extend the existing Global Research Workspace (`ResearchProvider`/`ResearchCenter`) with the Universal Finding envelope — not a new build.
3. Discovery surface and candidate adapters (manual, graph/entity, numbers, ELS/cross, AI suggestions).
4. Integrate #186 as ELS Lens into the existing Workspace.
5. Number/Gematria Lens + Number Page contextual Research Surface projection (Preserve & Expand, §8) — not a `NumberHub` rebuild.
6. Entity/Graph Lens and relation exploration.
7. Topic/Convergence adapter — reference existing `topic_card_id`/`node_id`, never duplicate (see companion contract).
8. Judgment Surface — read/projection over the existing Gate #18 pipelines, never a new pipeline.
9. Consolidate legacy ELS capability inventory (FORMS/Split-Join, Research Journey prior-art) against this architecture; absorb only missing valuable capabilities, never raw-merge a parallel system.
10. Expand Depth Dimensions / Research Universe on the same contracts.

## 12. Non-goals / guardrails
- no second ELS engine
- no second graph
- no separate 3D truth
- no separate Findings database/store invented merely for UI convenience without schema/live-law verification
- no automatic `research_object` creation per ELS/Number/any Finding — promotion to `research_objects` stays a deliberate act, never a pin/save side-effect
- no automatic AI promotion to Fact/Canonical/Published
- no hiding weak material; rank/explain instead
- no manual gematria calculations outside canonical engine functions
- no competing Dimension taxonomy alongside Research DNA v1 §2's eleven dimensions
- no Judgment pipeline beyond the six already governed by Gate #18
- no Convergence Finding that derives/creates a new convergence instead of referencing an existing `topic_card_id`/`node_id`
- Research Context introduces no new table/store
- no production merge/deploy without explicit ZURIEL instruction

## 13. Relationship to canonical Master/Roadmap
At approval time, `SOD1820_MASTER_ROADMAP.md` v5.1 has `LAST_RECONCILED=2026-08-22` while verified main/work_log activity is newer (#185/#186/#188). Per its own freshness law it is STALE for this workstream — a `v5.2` candidate section already exists on this branch, updated by this reconciliation pass to match §0–§12 above.

This branch records the approved, reconciled contract; `SOD1820_MASTER_STATE.md`/`SOD1820_MASTER_ROADMAP.md` should be kept in sync with it before the architecture is treated as fully reflected by canonical docs. No existing historical work is deleted; prior plans remain provenance and are marked superseded/absorbed only where a direct approved replacement exists.
