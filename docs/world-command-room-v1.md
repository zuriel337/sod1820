# SOD1820 — WORLD / COMMAND ROOM V1

Status: PRODUCT BLUEPRINT ONLY · EXTEND_EXISTING · NOT IMPLEMENTED · NOT MERGED · NOT DEPLOYED

## 0. Purpose
Build one simple-to-operate visual World over the existing SOD1820 Reality Graph / Research OS. This is NOT a new graph, store, engine, search system, truth lifecycle or Premium truth layer.

The World is one projection surface with multiple authorized depths:
- Public
- Premium
- Deep Premium
- Admin Research / Command Room

Access changes depth and available controls; it never changes mathematical truth or canonical identity.

Core UX principle: **Everything may exist; nothing must be visible.**

## 1. One-screen mental model
The default screen must feel calm even when the underlying graph is huge.

### Center — World Canvas
- focus entity in the middle
- nearby canonical/approved relations first
- progressive expansion, never full-graph dump
- zoom/expand/collapse by semantic family
- selected path stays visually legible

### Right — Context Inspector
For the selected entity/relation:
- identity + type
- verification / truth status
- method/engine trace when relevant
- provenance / source loci
- access/publication state
- contradictions / unresolved notes
- open in canonical Entity/Topic/Post/ELS surface

### Left — Control Rail
One compact rail with:
- Search
- Layers
- Sources
- Review
- Journeys
- Raziel
- Saved views

No permanent card farm.

### Bottom — Research Continuity
- breadcrumb/path
- Research Context
- back/forward exact reopen
- current Journey/Path position
- Save / Add to research

## 2. Visibility layers
Admin can toggle independently:
- Canonical
- Approved
- Candidate
- Unresolved
- Contradictions
- Engine-verified calculations
- Source claims
- Interpretations
- Methods / numeric laws / procedures
- Topics / Convergences
- Persons / Contributors
- Posts
- Galleries / Images
- Books / Sources
- ELS / Code findings
- Events / Time
- Journeys
- Raw intake streams

Default Admin view = Canonical + Approved + decision-changing Candidates. Raw material is hidden until requested.

## 3. Source Inbox — raw intake without visual pollution
A separate Inbox inside the same World, not a parallel knowledge system.

Sources can include:
- Zvi messages
- WhatsApp / Raziel intake
- Posts
- Galleries
- ELS findings
- book/source extraction
- contributor submissions
- future connectors

Each source item may exist without becoming a visible graph node.

Inbox states:
- unread
- reviewed
- attached to existing semantic item
- candidate relation/finding created
- ignored/deferred
- duplicate representation

Admin may hide an entire stream (for example Zvi) while preserving it in the system.

## 4. Review Queue / Human Gate
One queue for decision-changing items:
- new relation candidate
- canonical promotion candidate
- contradiction
- unresolved identity/method
- duplicate/merge suggestion
- publication/access decision
- contributor/source attribution ambiguity

Every queue item must show:
- what changed
- source/provenance
- engine evidence if any
- existing owner/semantic home
- impact if approved

Actions:
- Approve
- Reject
- Keep candidate
- Attach to existing item
- Mark unresolved
- Open in Workbench

No AI or drag gesture may silently canonicalize or publish.

## 5. Workbench
The Admin research editing surface.

### Safe relation creation
Drag entity A onto entity B → open a Relation Composer, never create a canonical edge immediately.

Composer fields:
- relation type
- direction
- claim/finding vs representation relation
- method / engine / rule application if relevant
- provenance/source
- confidence/status
- note

System assists by:
- checking existing relation before creating duplicate
- running canonical engine verification when applicable
- resolving existing semantic owner
- showing conflicts

Save result as Candidate by default.
Canonical edge requires explicit Human Gate action.

### Useful direct actions
- connect
- detach representation
- group as same semantic item
- mark duplicate locus
- open all paths between two entities
- compare evidence
- pin path
- add to Journey
- ask Raziel about selected nodes

## 6. Raziel inside the World
Raziel is a controller over the same Research Context, not a second search/knowledge system.

Examples:
- “What connects 604 to 1820?”
- “Show only David + ELS + gematria.”
- “Which visible relations are still candidates?”
- “Why is this edge unresolved?”
- “Find the shortest verified path between these nodes.”
- “Hide raw Zvi messages for this session.”
- “Open the exact ELS occurrence behind this finding.”

Raziel can propose navigation, filters, comparison and candidate actions. It cannot independently promote/canonicalize/publish.

## 7. Access projections
### Public
- curated canonical/approved projection
- bounded depth
- public-safe provenance
- no private/raw/admin controls

### Premium
- more exploration depth
- Journeys, saved research, comparison and richer provenance
- more facets and cross-navigation

### Deep Premium
- deeper graph traversal
- more approved evidence and lower-confidence material where explicitly allowed
- advanced method/provenance views
- still excludes private/admin-only/raw material

### Admin Research
- deepest authorized projection
- private candidates/unresolved/contradictions/raw streams
- Review Queue
- Workbench
- safe Candidate relation creation
- system state/diagnostics where authorized

Server authorization must bound the data returned; do not ship full Admin/Deep payload and hide it in client UI.

## 8. Visual language
Goal: sophisticated underneath, effortless above.

Rules:
- one dominant focus at a time
- progressive disclosure
- semantic zoom
- labels only when useful
- clusters collapse automatically
- status conveyed with icon/line treatment + text, not color alone
- mobile = list/path projection rather than forcing a giant graph
- no giant default hairball

Recommended relation treatments:
- canonical: solid
- approved: solid lighter
- candidate: dashed
- unresolved: dotted + ?
- contradiction: explicit warning marker
- representation/same-source locus: thin/secondary

These are UX semantics only; canonical UI tokens own actual palette.

## 9. Golden Slice — 1237 / התגלות
WORLD V1 is proven through one end-to-end real slice, not a fake demo.

Flow:
1. Enter 1237
2. See התגלות + other owned expressions/projections
3. Expand Findings / Topic-Convergence
4. Open sources: posts + gallery loci
5. Inspect calculation methods / trace
6. Open associated ELS/code finding where available
7. preserve Research Context
8. add selected sequence to Journey/Path
9. return exactly to 1237 World state
10. Admin toggles Candidates/Raw and sees deeper material without polluting default view
11. create one Candidate relation through Workbench and verify it remains non-canonical until Human Gate

PASS means the same architecture can extend to 1820, 358, persons, books, events and future entity types without a new World system.

## 10. Build slices
### Slice W1 — Shell + Context
- World route/shell
- canvas/list renderer
- focus entity
- layers rail
- inspector
- exact reopen via existing Research Context

### Slice W2 — Golden 1237 composition
- real entity/findings/topics/sources/methods
- bounded graph expansion
- existing readers only

### Slice W3 — Admin visibility + Inbox/Review projection
- raw stream filters
- candidate/unresolved/contradiction visibility
- no write yet

### Slice W4 — Workbench Candidate relation
- drag/drop or connect gesture
- relation composer
- duplicate check
- Candidate-only write
- Human Gate required for canonical transition

### Slice W5 — Raziel Context Adapter
- selected entities/path/layers exposed as current Research Context
- Raziel navigation/filter/research commands

### Slice W6 — Premium depth projections
- only after live entitlement/access owner reconciliation
- bounded server-side reads
- no full graph dump

### Later
- spatial/3D renderer
- richer collaborative research
- advanced graph layouts
- premium anti-scraping/rate budgets

## 11. Non-negotiable invariants
- One Reality Graph
- One Research OS
- one stable entity identity
- no duplicate semantic homes
- provenance preserved
- representation != semantic identity
- calculation fact != interpretation
- access tier != truth
- AI suggestion != Human Gate decision
- drag/drop != canonical write
- Rank/Filter/Hide; do not delete truth to simplify the screen
- bounded readers; never dump the whole graph to the client

## 12. Ownership / architecture verdict
OWNER CHECK: **EXTEND_EXISTING**.

The Command Room is a composition/projection/workbench over existing owners. No new Graph, Truth Store, Journey system, Search engine, Method system or Raziel knowledge store is authorized by this blueprint.

Foundation → Projection → Experience.
