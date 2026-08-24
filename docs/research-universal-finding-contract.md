# SOD1820 — Universal Finding Contract v1

Status: APPROVED direction by ZURIEL Human-Gate, contract slice under Draft PR #187.
Scope: shared Research OS contract only. No DB/schema migration, no production behavior change, no merge/deploy by this document alone.

## 0. Purpose
SOD1820 needs one Finding model that can carry research results from different canonical sources without creating parallel truths.

A Finding may originate from ELS, Gematria/Number, Verse, Entity/Graph, Person, Name, Topic/Convergence, existing research, Reality Signals, or a future adapter. AI may contribute Suggestions/Candidates, but AI is not a calculation oracle and cannot silently promote a Candidate to Finding/Fact/Canonical/Published.

Hard separation:

`input != suggestion/candidate != verified finding != evidence != claim != interpretation != canonical != published`

The contract is source-agnostic but source-truth-aware: each source remains authoritative only for the claim it can actually verify. Some sources already carry their own native strength/relation vocabulary (e.g. NameLab's Evidence Law, `equality_vs_convergence`); this contract reconciles those vocabularies via §5, it does not replace or collapse them.

## 1. Universal envelope
A Research Finding is represented conceptually as:

```js
{
  v: 1,
  id,                 // stable Finding identity inside Research OS
  kind,               // els | gematria | number | verse | entity | relation | person | name | convergence | signal | research | other
  stage,              // candidate | finding | evidence | claim | interpretation
  status,             // active | dismissed_from_view | superseded | rejected | accepted_for_judgment (view/workflow, not canonical truth)

  subject: {
    type,              // word | phrase | number | verse | person | name | entity | event | place | image | post | research_object | ...
    key,               // canonical/stable key when one exists
    label,
    value              // source-relevant scalar or compact payload; never a replacement for provenance
  },

  source: {
    engine,            // els | gematria | graph | verse | name_lab | convergence | reality | ai_suggestion | ...
    adapter,           // host adapter/version when applicable
    sourceRef,         // canonical record/engine/source reference where available
    method,            // gematria method / search mode / relation type / name-lab layer / etc. when relevant
    corpus             // corpus identity when relevant
  },

  identity: {
    sourceIdentity,    // exact engine-native identity, preserved verbatim/structurally
    occurrence,        // exact occurrence object where applicable
    entityRef,         // graph/entity canonical reference where applicable
    relationRef,       // edge/relation reference where applicable
    personRef,         // person:<owner_person_id>:{self|p:<ref>} — present only when the Finding is genuinely person-scoped (see §10). Absent for Name Findings.
    topicRef           // existing topic_card_id / convergence node_id — present only for Topic/Convergence Findings (see §12); never a newly-minted id
  },

  verification: {
    claimed_expression, // what was claimed (word/phrase/method as stated), when the Finding originates from a claim rather than a direct engine call
    claimed_method,
    claimed_value,
    engine_method_tested,
    engine_result,
    verification_state  // match | mismatch | method_unknown | not_tested (DNA v1 §1 vocabulary — reused verbatim, never redefined here)
  },

  evidence: {
    refs: [],          // source records, engine output refs, verse refs, graph edges, research refs
    facts: [],         // verified source-scoped facts only
    score: null,       // optional explainable ranking/strength, never magic truth
    confidence: null   // confidence belongs to a stated inference/claim, not to immutable engine math
  },

  access: {
    // inherited from DNA v1 §4.6/§4.8 World/Method/Premium Access Law — never invented per-adapter.
    // access tier is not mathematical truth; a Method being Approved does not make it free automatically.
    tier: null,        // resolved against platform_tiers_law / method access_tier; read-only projection here
    reason: null
  },

  provenance: {
    createdBy,         // USER | ENGINE:<name> | AI:<name> | IMPORT | SYSTEM
    createdAt,
    inputRef,          // request / parent action / prior Finding when relevant
    parentFindingIds: [],
    researchSessionId: null,
    journeyNodeId: null
  },

  projection: {
    anchors: [],       // stable coordinates/indices/entity refs that renderers may project
    relations: [],     // stable relation refs/typed edges for graph/depth projection
    dimensions: {}      // DNA v1 §2's eleven named dimensions when populated (Identity, Provenance, Verification, Approval, Semantic, Research, Method, Numeric, Temporal, Access, Quality, Interpretation) — see §5 for how adapter-native vocabularies (NameLab Evidence Law, equality/convergence class) map onto these slots without inventing new ones
  },

  view: {
    color: null,
    pinned: false,
    selected: false,
    hidden: false,
    rendererHints: {}
  }
}
```

This is a logical contract, not an instruction to create a new database table. Storage/reuse must first be reconciled with live schema and existing ResearchProvider/research objects — see §18.

**Research Context is explicitly NOT part of this envelope.** Research Context (active inquiry/subject, scope, active Findings, selected Dimensions, Lens state, Journey position — defined in `research-studio-v1-contract.md` §2) is a logical/state contract that *references* Findings, `research_objects`, `personRef`, Number/Topic/Event/Entity keys, etc. It has no storage owner of its own and must never be mapped onto `research_objects` or any specific table. A Finding may carry a `provenance.researchSessionId`, but that is a session pointer, not a Context row.

## 2. Identity law
`id` is Research-OS identity; it must never erase or replace the source-native identity.

Examples:
- ELS preserves exact `{skip,start,dir}` / engine `hitId` and corpus context.
- Gematria preserves the canonical method key/function/source and computed value.
- Number preserves the canonical number/entity key.
- Verse preserves canonical verse identity/reference and corpus position.
- Entity preserves graph node identity.
- Relation preserves the exact edge/relation identity.
- Person preserves the exact `person-ref` namespace (`person:<owner_person_id>:{self|p:<ref>}`).
- Name preserves the exact NameLab engine/layer identity (see §11) — a name Finding never fabricates a `person-ref`.
- Topic/Convergence preserves the exact existing `topic_card_id`/convergence `node_id`.

Two visually identical labels are not automatically the same Finding. Identity is based on source identity + subject + relevant occurrence/context, not display text alone.

## 3. Candidate vs Finding
A Candidate is something worth checking. It can come from:
- user input
- AI suggestion
- Auto Terms
- graph neighbors
- number/equality suggestions
- cross-search term proposals
- prior research

A Candidate becomes a `stage=finding` only after the relevant source verifies the source-scoped statement.

Examples:
- AI suggests `תורה` around an ELS axis -> Candidate.
- canonical ELS cross-search finds an exact occurrence -> ELS Finding.
- canonical gematria engine computes a method value -> computational Finding/fact for that method.
- graph query returns an existing edge -> Relation Finding/evidence that the edge exists.
- NameLab returns one engine-layer result (e.g. a Tanach cross for a name) -> a Name Finding, its NameLab evidence label preserved (see §5, §11).

Finding does NOT mean metaphysical/historical truth. It means "the canonical source verified this source-scoped result."

## 4. Evidence, Claim, Interpretation
Findings may support later research objects, but stages must remain explicit.

- `finding`: verified result from a source/engine.
- `evidence`: a Finding intentionally used as support for a research question/claim.
- `claim`: a proposition asserted by a researcher/source and requiring evidence/judgment.
- `interpretation`: meaning inferred from evidence/claims.

Promoting a Finding into Evidence is a research-workflow action. Promoting Evidence into Canonical truth is never automatic and remains behind the ZURIEL Human Gate — this is a **projection of the single closed Judgment/Human-Gate contract** (Master State §20, "Gate #18," Option C: Contract-over-Consolidation), never a new or seventh judgment pipeline. `decision_ledger` remains an append-only audit trail only, not a source of truth.

## 5. Semantic crosswalk — four axes that answer different questions
Several sources already carry their own native "how strong/how classified is this" vocabulary. They are not competing versions of the same thing — each answers a different question, over a different scope, and none of them is redefined or collapsed by this contract:

| Axis | Lives in | Question it answers | Scope |
|---|---|---|---|
| `verification_state` | `verification.verification_state` (DNA v1 §1) | "Did the canonical engine recompute this specific claim, and does it match?" (`match` / `mismatch` / `method_unknown` / `not_tested`) | Any Finding carrying a computable claim (gematria/ELS/number/name-engine result) |
| research `stage`/`status` | envelope `stage`/`status` (this contract §3–4) | "Where is this Finding in the research workflow, right now?" (`candidate→finding→evidence→claim→interpretation`; `active→dismissed→superseded→rejected→accepted_for_judgment`) | Every Finding, regardless of source |
| equality/convergence relation class | `equality_vs_convergence` (locked rule) | "What kind of relationship does this numeric/topical connection represent?" (🔢 numeric equality = automatic/FACT · 🤖 AI-suggested-possible-connection = candidate-with-evidence · 👤 human-approved-convergence = topic_card) | Number/Topic relations specifically (§12) |
| evidence type/strength | `name_evidence_levels_law` (locked `nodes type='rule'`, Zuriel 27.7.2026): `direct` \| `value_match` \| `interpretive` | "How directly does this one engine-layer result establish what it claims?" | Per-engine-result, native to NameLab/name-adapter Findings (§11) |

None of these four is a substitute for another: a Name Finding can simultaneously be `verification_state=match` (the engine recomputed it), `stage=finding` (it cleared candidate), and carry NameLab's own `evidence=direct` label — three independent, compatible facts about the same Finding.

**Mapping NameLab's evidence vocabulary — decision:** `direct | value_match | interpretive` maps onto the existing DNA v1 §2 **Quality** dimension slot (`projection.dimensions.quality`) for name-kind Findings, preserved verbatim as its three-value set. It does **not** map into `verification_state` (different question — recomputation match, not directness), not into `stage`/`status` (different question — workflow position), and not into `equality_vs_convergence` (different domain — numeric/topical relation class, not per-engine result strength). This is a placement inside an existing DNA v1 dimension slot, not a new competing taxonomy, and it changes nothing about how NameLab computes or displays the label today.

## 6. Renderer / 2D / Layered / 3D contract
Finding truth is renderer-independent.

Every Finding should expose projection hooks when its source naturally supports them. Renderers may consume:
- `projection.anchors` for matrix cells, verse positions, timeline positions, entity nodes, number nodes, etc.
- `projection.relations` for graph/depth connections.
- `projection.dimensions` for explicitly named Depth Dimensions such as verse, method, time, source/provenance, confidence class, research track or relation family — the same DNA v1 §2 eleven dimensions named in §1/§5, never an ad hoc per-renderer set.

Hard rules:
1. 2D, Layered and 3D render the SAME Finding state.
2. No renderer creates new research truth.
3. Color/opacity/z-depth/camera/selection are `view`, not identity.
4. A renderer may omit expensive projections on low-power/mobile devices without changing the Findings available to research.
5. Depth semantics must be named explicitly in UI/state; never infer that Z "means" confidence/time/etc. without an active dimension selection.

## 7. ELS adapter mapping (#186)
Current ELS work maps cleanly into the universal contract:

- `kind = "els"`
- `subject.label = finding term`
- `source.engine = "els"`
- `source.corpus = current canonical corpus/scope`
- `identity.sourceIdentity = engine hitId`
- `identity.occurrence = { skip, start, dir }`
- `projection.anchors = absolute matrix indices/positions already provided by the canonical engine snapshot`
- `view.color = existing finding color` (view only)

The existing exact-anchor Journey behavior remains required. Universalization must not regress Finding Identity/startIndex or replace the canonical ELS engine. **Topic/Convergence Findings are not part of this mapping** — see §12, which is deliberately its own section, not a subsection of ELS.

## 8. Gematria / Number adapter mapping
Gematria results must be produced only by canonical engine functions/registry.

A method result may map as:
- `kind = "gematria"`
- subject = the word/phrase
- `source.engine = "gematria"`
- `source.method = canonical method key`
- `subject.value = canonical computed value`
- `identity.sourceIdentity = { methodKey, normalizedSubject, value, engineVersion/sourceRef as available }`
- when the Finding is produced against a defined Method Profile, `source.method` + `verification.*` populate from the DNA v1 §11 Method Profile Contract's 10-field shape (`method_key, display_label, family, lifecycle_state, computed_value, verification_source, definition_version, stored_vs_derived, access_tier, atomic_vs_composite`) — this contract does not redefine that shape, only references it.

A number itself is a separate first-class entity Finding/subject (`kind="number"`) when the research moves to the Number Page / graph node. Do not collapse "word has value 611 by method X" and "the entity Number 611" into one identity. The Number Page's existing "🧬 צירי ההתכנסות" (`NumberConvergences`) surface is a curated `topic_cards` view, not a gematria-method computation — see §12 for how it maps in.

## 9. Entity / Graph adapter mapping
Graph results preserve canonical node/edge identity.

Entity Finding:
- `kind = "entity"`
- `identity.entityRef = node id/key`

Relation Finding:
- `kind = "relation"`
- `identity.relationRef = exact edge id/key`
- `projection.relations` may expose the same edge for graph/3D rendering.

A graph edge proves only that the canonical graph stores that relation with its provenance/metadata. It does not make every narrative implication of that relation a Fact.

## 10. Person adapter mapping
Person Findings are scoped by the existing OD-F10a person-identity concept, absorbed here as-is — **not re-authorized for expansion**. Only what is already live/approved applies:

- `kind = "person"`
- `identity.personRef = person:<owner_person_id>:{self|p:<ref>}`
- Today only the **self** scope (`F-1a′`, `fn_upsert_self_profile`) is live. Family-member scope (`F-1b`, `parent_of`) remains explicitly NOT AUTHORIZED — blocked on OD-F9a/OD-F9b/OD-F8, unresolved by this contract and not reopened here.
- A Person Finding references a person-ref; it does not mint one. Minting/identity-resolution logic lives wherever OD-F9a eventually resolves it, not in this contract.

**A Person Context may launch/reference a Name Journey** for any of that person's known names (see `research-studio-v1-contract.md` §4) — that is a Context-level cross-reference between a Person subject and a Name subject, not a merge of the two adapters, and not a reason to attach `personRef` to Name Findings (§11 keeps `identity.personRef` absent by default).

**"ניתוח חיים" (Life Analysis, `LifeProfile.jsx`/`src/lib/research/lifeProfile.js`, live on `main` under `/research`) is a separate, already-shipped capability — not the Person adapter above and not a Finding-shaped Journey.** It computes axis/clusters/pressure-points/transitions/convergences from a Context's already-collected timeline events; it carries no `person-ref`/family linkage in its live code. A future Person Finding may reference/launch a Life Analysis view the same way a Person Context may launch a Name Journey (above), but this contract does not model Life Analysis output as Universal Findings and does not redesign its live engine/UI.

## 11. Name adapter mapping
Name is a first-class Subject/adapter in its own right, distinct from both Person (§10) and ELS (§7). It maps the already-live NameLab / `fn_name_protocol` flow (`NameJourney.jsx`, `NameMultiSearch.jsx`) into the universal contract **without redesigning it**:

- `kind = "name"`
- `subject.type = "name"`, `subject.label = the researched name-as-word`
- `source.engine = "name_lab"`
- `source.method = the NameLab layer/engine that produced this specific result` (key / cross / tanach / numbers / letters / notarikon / language / network / els — matching the live `Layer`s in `NameJourney.jsx`)
- `identity.sourceIdentity = engine-native identity for that layer` (e.g. the underlying `fn_name_in_tanach`/`fn_els_for_name`/`fn_notarikon`/`fn_name_variants` result identity, preserved verbatim per §2)
- `identity.personRef` is **absent** by default — NameLab researches a name as a word/string, not a specific identified person (confirmed: no person-ref/family linkage anywhere in the live components). It is populated only if/when a separate, later act genuinely ties a specific name occurrence to a `person-ref` — that act is not part of this contract.
- NameLab's own Evidence Law (`name_evidence_levels_law`, locked rule: `direct | value_match | interpretive`) is preserved verbatim per engine result and placed per §5's mapping decision (DNA v1 Quality dimension slot), never collapsed into `verification_state`/`stage`/`status`.
- This section covers the *live* NameLab surfaces (`NameJourney.jsx`/`NameMultiSearch.jsx`, `fn_name_protocol`). A separate, larger, already-approved vision — `name_research_center_law` ("22 investigation protocols," Zuriel 17.7.2026, several protocols already `🟢` engine-ready incl. the loaded `tanach_verses` corpus) — is NOT yet reconciled against this adapter mapping. Not resolved here; flagged for the Name/Number-DNA follow-up, not a redesign of anything live today.

**Chain of concepts (not to be flattened):** `Name Subject → Name engines/lenses (key/cross/tanach/numbers/letters/notarikon/language/network/els) → individual Findings (one per engine-layer result, each with its own `verification`/evidence-quality label) → Name Journey (graph navigation across those Findings, defined in `research-studio-v1-contract.md` §4)`. **Name Journey itself is never modeled as a Finding** — it is the traversal over Name Findings, exactly like every other Journey.

This mapping documents where a Name Finding would sit in the universal envelope; it changes nothing about NameLab's live code, RPCs, or UI.

## 12. Topic / Convergence adapter mapping
Deliberately separate from ELS (§7) and from Gematria/Number (§8) — Topic/Convergence is its own subject/adapter, not a sub-case of either:

- `kind = "convergence"`
- `identity.topicRef = existing topic_card_id` or `nodes(type='convergence').node_id` — **never a newly minted id**
- A Convergence Finding must reference an existing, already-approved `topic_cards`/convergence-node record plus its provenance; it never derives or creates a duplicate convergence.
- The relation class carried by a Convergence Finding follows `equality_vs_convergence` (§5): 🔢 numeric equality (automatic/FACT), 🤖 AI-suggested-possible-connection (candidate-with-evidence), or 👤 human-approved-convergence (the `topic_card` itself) — this is the relation-class axis, kept distinct from `verification_state` and `stage`/`status` per §5.
- The Number Page's "🧬 צירי ההתכנסות" (`NumberConvergences`, renamed from `NumberDNA` per H1) is the existing curated rendering of this adapter's Findings for one number — this contract does not add a second convergence-rendering surface.

## 13. Verse / context adapter mapping
Verse/context Findings preserve exact verse/corpus identity and positions. A Verse Lens result can be Evidence/context for an ELS Finding without being merged into the ELS Finding identity.

This permits layered rendering:
- base text/ELS plane
- verse/context plane
- source/provenance plane
while keeping each Finding/evidence object distinct.

## 14. AI adapter law
AI output enters as `stage="candidate"` unless it is merely summarizing already-referenced Findings/Evidence.

AI may:
- suggest terms/entities/numbers/relations to test
- organize/rank candidates with explainable reasons
- request canonical tools
- summarize verified results

AI may not:
- fabricate engine identities
- write a computed gematria value from memory
- mark an unverified suggestion as Finding/Fact
- set canonical/published state

## 15. Workspace actions
A global Findings Workspace should support source-neutral actions:
- inspect
- pin / add-to-research
- compare
- dismiss from current view (provenance retained)
- restore
- attach as evidence to a research object
- follow/open canonical subject hub
- promote to active research axis when an adapter supports exact promotion (ELS, Number, Entity, Name, Person, Convergence, etc.)

Source-specific actions remain adapter capabilities; the Workspace must not fake unsupported operations.

## 16. Journey integration
Journey records actions/state transitions around Findings, not duplicate Findings. **Journey = graph navigation between Findings within one Research Context** (`research-studio-v1-contract.md` §4), not chronological history.

Journey nodes reference stable Finding IDs/source identities and active research state. Exact restore must restore source identity/context where supported.

A Journey may traverse heterogeneous findings:

`phrase -> gematria result -> number entity -> graph entity -> verse -> ELS occurrence -> claim/evidence set`
`name subject -> name-engine finding (tanach layer) -> name-engine finding (els layer) -> person context (if a person-ref is later attached)`

This is one research session over one Reality Graph/Workspace. **Name Journey and Person/Life Journey remain distinct Journey instances** (see §10, §11, and `research-studio-v1-contract.md` §4) that may cross-reference each other through a shared Research Context — neither is redesigned or merged by this contract.

## 17. Performance / payload law
The universal envelope must remain compact at baseline. Heavy renderer payloads are on-demand projections/lenses, not mandatory fields on every Finding/state tick.

- identity/provenance: always sufficient for correctness
- 2D/Fit: baseline projection
- verse text, heat, huge cell lists, 3D meshes, deep relation neighborhoods: request/lazy-load when needed
- virtualization is a renderer concern; it must not truncate source truth silently

## 18. Storage law
This contract does NOT authorize a new `findings` table, and does not treat storage as an either/or choice. Three homes already exist, each with a distinct role, and this contract does not add a fourth:

1. **Source-native engine/DB is the source of truth** for its own claim — the ELS engine snapshot, the gematria function/registry result, the NameLab RPC output, the graph edge. A Finding's `identity`/`verification` blocks reference this; they never replace it.
2. **`research_items`** is Workspace membership only — cart/save/pin/Journey-reference bookkeeping (what `ResearchProvider.jsx` already reads/writes today). A Finding being in the Workspace means a `research_items` row exists; it does not mean a durable research assertion exists.
3. **`research_objects`** is the durable-assertion home — evidence/claim/interpretation, plus DNA v1 §1's `engine_verified`/`engine_detail` verification storage. A Finding is promoted here only by an explicit research-workflow action (§4), never automatically.

**The Universal Finding is an envelope/projection with refs into these three homes — it is not itself a fourth storage owner.** Concretely: **no automatic `research_object` creation per Finding.** Producing an ELS/Number/Name/Person/Convergence Finding never, by itself, writes a `research_objects` row; that only happens when a researcher/workflow explicitly promotes a Finding to evidence/claim/interpretation.

**`research_objects` is not the only domain-specific evidence/claim home.** Gate #18 (Master State §20) already names seven separate, deliberately-not-consolidated pipelines: `research_objects` / `research_contributions` / `topic_cards` / `els_records` / `language_links` / `research_candidates` / `word_review_queue`. This section's "three homes" describes the *generic* Universal-Finding-envelope pattern; a specific Finding kind promoting to evidence/claim may land in whichever of those seven pipelines already owns that domain (e.g. Convergence → `topic_cards`, per §12 — never `research_objects`), not automatically `research_objects`. Which pipeline owns which Finding kind beyond Convergence (already resolved, §12) is **not fully mapped by this contract** — flagged OPEN, not resolved here.

Before any persistence implementation:
1. inspect live schema / ResearchProvider / existing `research_items`/`research_objects` rows for the specific adapter in question
2. reuse/extend the existing canonical home for that role — never invent a parallel one
3. if schema extension is truly required, validate against live schema and governance first
4. preserve all provenance and Rank-Don't-Hide

## 19. Acceptance criteria for implementation
A future Global Research Workspace implementation is correct only if:

1. ELS Finding exact identity round-trips unchanged.
2. Gematria values come only from canonical functions/registry.
3. Entity/Relation Findings retain graph IDs/edge provenance.
4. AI suggestion is visibly Candidate before verification.
5. Clean and Pro show the same underlying Findings.
6. Switching 2D/Layered/3D does not mutate Finding truth/identity.
7. Removing/dismissing a card from the view does not delete provenance.
8. Journey can restore heterogeneous research steps without approximate label-only matching.
9. No new parallel engine, graph or truth store is introduced.
10. Judgment/Canonical/Published remain behind the human gate.
11. A Convergence Finding always references an existing `topic_card_id`/convergence `node_id`; none is ever created/duplicated by this contract's implementation.
12. No Finding creation implicitly creates a `research_objects` row (§18).
13. A Name Finding round-trips its NameLab Evidence Law label (`direct|value_match|interpretive`) unchanged, placed in the Quality dimension slot per §5, never rewritten into `verification_state`.
14. Name Journey and Person/Life Journey remain independently restorable; a Journey that crosses from one into the other preserves both sides' native identity.

## 20. Next implementation slice
After this contract is reconciled/accepted in PR #187, the next code slice is:

**Global Research Workspace / ResearchProvider integration**

Goal: create one host-side Workspace state/API that can ingest universal Finding adapters while reusing existing canonical state/graph infrastructure (per §18's three-homes model). Start with the ELS adapter from #186 and one Number/Gematria adapter; do not attempt every source at once. Person, Name, and Topic/Convergence adapters (§10–§12) are documented mappings for this contract's coverage, not commitments to build in the first slice.
