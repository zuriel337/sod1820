# SOD1820 — Universal Finding Contract v1

Status: APPROVED direction by ZURIEL Human-Gate, contract slice under Draft PR #187.
Scope: shared Research OS contract only. No DB/schema migration, no production behavior change, no merge/deploy by this document alone.

## 0. Purpose
SOD1820 needs one Finding model that can carry research results from different canonical sources without creating parallel truths.

A Finding may originate from ELS, Gematria/Number, Verse, Entity/Graph, Cross/Convergence, existing research, Reality Signals, or a future adapter. AI may contribute Suggestions/Candidates, but AI is not a calculation oracle and cannot silently promote a Candidate to Finding/Fact/Canonical/Published.

Hard separation:

`input != suggestion/candidate != verified finding != evidence != claim != interpretation != canonical != published`

The contract is source-agnostic but source-truth-aware: each source remains authoritative only for the claim it can actually verify.

## 1. Universal envelope
A Research Finding is represented conceptually as:

```js
{
  v: 1,
  id,                 // stable Finding identity inside Research OS
  kind,               // els | gematria | number | verse | entity | relation | convergence | signal | research | other
  stage,              // candidate | finding | evidence | claim | interpretation
  status,             // active | dismissed_from_view | superseded | rejected | accepted_for_judgment (view/workflow, not canonical truth)

  subject: {
    type,              // word | phrase | number | verse | person | entity | event | place | image | post | research_object | ...
    key,               // canonical/stable key when one exists
    label,
    value              // source-relevant scalar or compact payload; never a replacement for provenance
  },

  source: {
    engine,            // els | gematria | graph | verse | convergence | reality | ai_suggestion | ...
    adapter,           // host adapter/version when applicable
    sourceRef,         // canonical record/engine/source reference where available
    method,            // gematria method / search mode / relation type / etc. when relevant
    corpus             // corpus identity when relevant
  },

  identity: {
    sourceIdentity,    // exact engine-native identity, preserved verbatim/structurally
    occurrence,        // exact occurrence object where applicable
    entityRef,         // graph/entity canonical reference where applicable
    relationRef        // edge/relation reference where applicable
  },

  evidence: {
    refs: [],          // source records, engine output refs, verse refs, graph edges, research refs
    facts: [],         // verified source-scoped facts only
    score: null,       // optional explainable ranking/strength, never magic truth
    confidence: null   // confidence belongs to a stated inference/claim, not to immutable engine math
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
    dimensions: {}     // optional explicit dimensions: time/method/verse/source/etc.; semantics named, never inferred
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

This is a logical contract, not an instruction to create a new database table. Storage/reuse must first be reconciled with live schema and existing ResearchProvider/research objects.

## 2. Identity law
`id` is Research-OS identity; it must never erase or replace the source-native identity.

Examples:
- ELS preserves exact `{skip,start,dir}` / engine `hitId` and corpus context.
- Gematria preserves the canonical method key/function/source and computed value.
- Number preserves the canonical number/entity key.
- Verse preserves canonical verse identity/reference and corpus position.
- Entity preserves graph node identity.
- Relation preserves the exact edge/relation identity.

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

Finding does NOT mean metaphysical/historical truth. It means "the canonical source verified this source-scoped result."

## 4. Evidence, Claim, Interpretation
Findings may support later research objects, but stages must remain explicit.

- `finding`: verified result from a source/engine.
- `evidence`: a Finding intentionally used as support for a research question/claim.
- `claim`: a proposition asserted by a researcher/source and requiring evidence/judgment.
- `interpretation`: meaning inferred from evidence/claims.

Promoting a Finding into Evidence is a research-workflow action. Promoting Evidence into Canonical truth is never automatic and remains behind ZURIEL Human Gate.

## 5. Renderer / 2D / Layered / 3D contract
Finding truth is renderer-independent.

Every Finding should expose projection hooks when its source naturally supports them. Renderers may consume:
- `projection.anchors` for matrix cells, verse positions, timeline positions, entity nodes, number nodes, etc.
- `projection.relations` for graph/depth connections.
- `projection.dimensions` for explicitly named Depth Dimensions such as verse, method, time, source/provenance, confidence class, research track or relation family.

Hard rules:
1. 2D, Layered and 3D render the SAME Finding state.
2. No renderer creates new research truth.
3. Color/opacity/z-depth/camera/selection are `view`, not identity.
4. A renderer may omit expensive projections on low-power/mobile devices without changing the Findings available to research.
5. Depth semantics must be named explicitly in UI/state; never infer that Z "means" confidence/time/etc. without an active dimension selection.

## 6. ELS adapter mapping (#186)
Current ELS work maps cleanly into the universal contract:

- `kind = "els"`
- `subject.label = finding term`
- `source.engine = "els"`
- `source.corpus = current canonical corpus/scope`
- `identity.sourceIdentity = engine hitId`
- `identity.occurrence = { skip, start, dir }`
- `projection.anchors = absolute matrix indices/positions already provided by the canonical engine snapshot`
- `view.color = existing finding color` (view only)

The existing exact-anchor Journey behavior remains required. Universalization must not regress Finding Identity/startIndex or replace the canonical ELS engine.

## 7. Gematria / Number adapter mapping
Gematria results must be produced only by canonical engine functions/registry.

A method result may map as:
- `kind = "gematria"`
- subject = the word/phrase
- `source.engine = "gematria"`
- `source.method = canonical method key`
- `subject.value = canonical computed value`
- `identity.sourceIdentity = { methodKey, normalizedSubject, value, engineVersion/sourceRef as available }`

A number itself is a separate first-class entity Finding/subject (`kind="number"`) when the research moves to the NumberHub/graph node. Do not collapse "word has value 611 by method X" and "the entity Number 611" into one identity.

## 8. Entity / Graph adapter mapping
Graph results preserve canonical node/edge identity.

Entity Finding:
- `kind = "entity"`
- `identity.entityRef = node id/key`

Relation Finding:
- `kind = "relation"`
- `identity.relationRef = exact edge id/key`
- `projection.relations` may expose the same edge for graph/3D rendering.

A graph edge proves only that the canonical graph stores that relation with its provenance/metadata. It does not make every narrative implication of that relation a Fact.

## 9. Verse / context adapter mapping
Verse/context Findings preserve exact verse/corpus identity and positions. A Verse Lens result can be Evidence/context for an ELS Finding without being merged into the ELS Finding identity.

This permits layered rendering:
- base text/ELS plane
- verse/context plane
- source/provenance plane
while keeping each Finding/evidence object distinct.

## 10. AI adapter law
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

## 11. Workspace actions
A global Findings Workspace should support source-neutral actions:
- inspect
- pin / add-to-research
- compare
- dismiss from current view (provenance retained)
- restore
- attach as evidence to a research object
- follow/open canonical subject hub
- promote to active research axis when an adapter supports exact promotion (ELS, Number, Entity, etc.)

Source-specific actions remain adapter capabilities; the Workspace must not fake unsupported operations.

## 12. Journey integration
Journey records actions/state transitions around Findings, not duplicate Findings.

Journey nodes reference stable Finding IDs/source identities and active research state. Exact restore must restore source identity/context where supported.

A Journey may traverse heterogeneous findings:

`phrase -> gematria result -> number entity -> graph entity -> verse -> ELS occurrence -> claim/evidence set`

This is one research session over one Reality Graph/Workspace.

## 13. Performance / payload law
The universal envelope must remain compact at baseline. Heavy renderer payloads are on-demand projections/lenses, not mandatory fields on every Finding/state tick.

- identity/provenance: always sufficient for correctness
- 2D/Fit: baseline projection
- verse text, heat, huge cell lists, 3D meshes, deep relation neighborhoods: request/lazy-load when needed
- virtualization is a renderer concern; it must not truncate source truth silently

## 14. Storage law
This contract does NOT authorize a new `findings` table.

Before persistence implementation:
1. inspect live schema / ResearchProvider / existing research objects
2. reuse/extend the existing canonical tree where possible
3. if schema extension is truly required, validate against live schema and governance first
4. preserve all provenance and Rank-Don't-Hide

## 15. Acceptance criteria for implementation
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

## 16. Next implementation slice
After this contract is reconciled/accepted in PR #187, the next code slice is:

**Global Research Workspace / ResearchProvider integration**

Goal: create one host-side Workspace state/API that can ingest universal Finding adapters while reusing existing canonical state/graph infrastructure. Start with ELS adapter from #186 and one Number/Gematria adapter; do not attempt every source at once.
