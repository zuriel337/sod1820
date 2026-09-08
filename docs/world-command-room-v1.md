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
- open in canonical Entity/Topic/Post/Book/ELS surface

### Left — Control Rail
One compact rail with:
- Search
- Layers
- Sources
- Heichal
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
- Books / Sources / Editions / Witnesses
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
- “Open the Heichal for 1820 and run the relevant tools.”
- “Show the book/source path behind this claim.”

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
- selected Heichal tools where entitlement allows
- still excludes private/admin-only/raw material

### Admin Research
- deepest authorized projection
- private candidates/unresolved/contradictions/raw streams
- Review Queue
- Workbench
- Heichal full research-tool access
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
4. Open sources: posts + gallery loci + book/source loci where available
5. Open Heichal in the same Research Context
6. Inspect calculation methods / trace
7. Run/open associated ELS/code finding where available
8. preserve Research Context
9. add selected sequence to Journey/Path
10. return exactly to 1237 World state
11. Admin toggles Candidates/Raw and sees deeper material without polluting default view
12. create one Candidate relation through Workbench and verify it remains non-canonical until Human Gate

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
- real entity/findings/topics/sources/methods/books where present
- bounded graph expansion
- existing readers only

### Slice W3 — Heichal projection + tool continuity
- Heichal opens inside the World, never as a second knowledge system
- current World focus becomes Heichal Research Context automatically
- tools consume the selected entity/path/context
- results return as Finding/Candidate/Evidence with provenance
- ELS exact-reopen and return continuity preserved
- no engine duplication

### Slice W4 — Books as first-class World projection
- Book is a stable World entity, not merely a tool result
- Books page is the browse/library projection over canonical Book identities
- Book detail opens inside the same World/Research Context
- Book → edition/witness/source → passage/block → finding/relation paths remain traceable
- Heichal can run research tools against a selected book/source/passage when supported
- findings return to the World; books do not become a parallel knowledge graph

### Slice W5 — Admin visibility + Inbox/Review projection
- raw stream filters
- candidate/unresolved/contradiction visibility
- no write yet

### Slice W6 — Workbench Candidate relation
- drag/drop or connect gesture
- relation composer
- duplicate check
- Candidate-only write
- Human Gate required for canonical transition

### Slice W7 — Raziel Context Adapter
- selected entities/path/layers/Heichal state exposed as current Research Context
- Raziel navigation/filter/research/tool commands

### Slice W8 — Premium depth projections
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
- Heichal tool output != canonical truth by itself
- Book page != separate book knowledge system
- ELS engine != separate World
- Rank/Filter/Hide; do not delete truth to simplify the screen
- bounded readers; never dump the whole graph to the client

## 12. Ownership / architecture verdict
OWNER CHECK: **EXTEND_EXISTING**.

The Command Room is a composition/projection/workbench over existing owners. No new Graph, Truth Store, Journey system, Search engine, Method system, Book graph or Raziel knowledge store is authorized by this blueprint.

Foundation → Projection → Experience.

## 13. Canonical hierarchy — World → Heichal → Tools
This hierarchy is explicit and architectural:

**WORLD = knowledge space**
- entities
- relations
- findings
- topics/convergences
- persons
- posts/galleries
- books/sources
- ELS findings
- journeys
- provenance
- truth/access state

**HEICHAL = research/tool workspace inside the World**
The Heichal is not another World and does not own knowledge. It is the place where tools are opened against the current Research Context.

**TOOLS live inside Heichal**, for example:
- canonical gematria calculator
- all registered/executable gematria methods
- Method Trace / Inspector
- ELS / letter skips
- verse search / biblical context
- reverse search
- phrase/value comparison
- numeric laws / governed operators
- book/source inspection tools
- source comparison
- future spatial/3D research tools

Flow invariant:
**World focus → open Heichal → run tool → result returns to World as typed research state.**

A tool may produce:
- Calculation Fact
- Trace
- Finding
- Candidate
- Evidence
- Unresolved result

It may not silently create canonical/published truth.

## 14. Books placement
Books have two simultaneous but non-conflicting roles:

### A. Books page = Library / browse projection of the World
The Books page is where a user browses the Book universe comfortably: books, source families, available research, editions/witnesses when modeled, and entry points into specific passages/blocks/findings.

It is therefore **not inside Heichal**. A Book is knowledge/source identity and belongs in the World.

Mental model:
**World → Books projection → Book detail → passage/source/finding → related entities.**

### B. Book tools = inside Heichal
When the user wants to DO something to a book/source/passage — compare, search, run a method, inspect structure, trace extraction, inspect a source witness, or launch a supported research engine — that action belongs to Heichal.

Mental model:
**Book selected in World → Heichal opens with that Book/Passage as Research Context → tool runs → result returns to Book/World.**

This preserves the key separation:
- Book = source/knowledge identity
- Books page = browse projection
- Heichal = research action workspace
- Tool = computation/inspection capability
- Result = typed research output returning to the same World

## 15. Number-page relation to World / Heichal / ELS / Books
The Number page remains a focused projection of one numeric entity, not a replacement for the World.

For a number such as 1820:
- top layer: identity, strongest canonical/approved findings and relations
- middle: its World neighborhood — expressions, topics, persons, posts, galleries, books/sources, events, journeys
- deep research action: **Open Heichal**

From Heichal the user can:
- calculate across methods
- inspect Method Trace
- run ELS
- inspect verses
- inspect Books/Sources connected to 1820
- compare expressions
- perform reverse search

ELS launched from the Number page must inherit `Research Context = 1820` and return the exact occurrence/finding to the same World state.

A Book opened from the Number page must likewise preserve `Research Context = 1820`; navigating into the Book does not break the path. The user can inspect the source, then return exactly to the number and its prior World state.

The intended experience is therefore one continuous loop:
**Number → World neighborhood → Book/Source or Heichal Tool → Finding → World → Journey / Human Gate / Raziel.**