# SOD1820 — WORLD / COMMAND ROOM V1

Status: PRODUCT BLUEPRINT ONLY · EXTEND_EXISTING · NOT IMPLEMENTED · NOT MERGED · NOT DEPLOYED

## 0. 2027 TARGET POSTURE
This blueprint now assumes that every current UI surface is a draft, including the current Number page, Books page, Bottom Bar, Heichal, Navbar, Raziel shells, admin screens and page-specific navigation. Existing UI is reference material only, not a preservation constraint.

What must be preserved across redesign:
- canonical identity
- truth/lifecycle semantics
- provenance
- Research Context continuity
- Journey/Path continuity
- engine capability and exact calculation behavior
- security/authorization boundaries
- Human Gate decisions
- user research state where governed

What may be replaced from A to Z:
- layout
- routes where migration/SEO continuity is safely handled
- navigation model
- bars/docks/rails
- panel structure
- page hierarchy
- visual language
- interaction patterns
- legacy drawers/launchers
- current Heichal and Books presentation

Target principle: **preserve capability, truth, identity, provenance and decisions — not legacy interface.**

The goal is not a 2022-style website with more widgets. The goal is a 2027-grade adaptive Research OS experience: one continuous, context-aware workspace that can render as page, graph, library, tool workspace, journey, companion surface or future spatial view without creating parallel systems.

## 1. Purpose
Build one simple-to-operate visual World over the existing SOD1820 Reality Graph / Research OS. This is NOT a new graph, store, engine, search system, truth lifecycle or Premium truth layer.

The World is one projection surface with multiple authorized depths:
- Public
- Premium
- Deep Premium
- Admin Research / Command Room

Access changes depth and available controls; it never changes mathematical truth or canonical identity.

Core UX principle: **Everything may exist; nothing must be visible.**

## 2. 2027 interaction model — one adaptive shell, not stacked legacy chrome
Do not preserve today's Navbar + Bottom Bar + page bars + Heichal nav + Raziel dock by default. Those are drafts.

The target shell is adaptive and role/context aware. At any moment it should expose only the minimum controls needed for the current task.

### Persistent layers
1. **Research Context Spine** — the invisible continuity owner: current subject, selection, path, lens, tool state, return position and journey position.
2. **Raziel Companion** — globally available, context-aware, collapsible, never a separate truth/search system.
3. **Command Surface** — a single adaptive action surface that may render as bottom dock, command palette, side rail or compact toolbar depending on device/context. It replaces the assumption that today's Bottom Bar shape is canonical.
4. **Primary Workspace** — the central content: focused page, World, Heichal tool, Book, ELS, Journey, etc.
5. **Contextual Inspector** — appears only when needed for provenance, layers, relation details, Human Gate or tool outputs.

The shell should support desktop, tablet, mobile and future external surfaces without inventing new product semantics for each device.

## 3. One-screen mental model
The default screen must feel calm even when the underlying graph is huge.

### Center — Primary Workspace / World Canvas
- one dominant focus
- nearby canonical/approved relations first
- progressive expansion, never full-graph dump
- zoom/expand/collapse by semantic family
- selected path stays visually legible
- can morph between graph, structured list, timeline, source view, comparison and tool result without changing identity/context

### Contextual Inspector
For the selected entity/relation/result:
- identity + type
- verification / truth status
- method/engine trace when relevant
- provenance / source loci
- access/publication state
- contradictions / unresolved notes
- Human Gate actions when authorized
- open in canonical Entity/Topic/Post/Book/ELS surface

### Adaptive Command Surface
The command surface may expose, according to context:
- Search / command palette
- Here / current context
- Layers
- Sources
- Heichal
- Review
- Journeys
- Save/Add to research
- Raziel
- Notifications/Now
- Personal workspace

No fixed slot count is sacred. The current 5-slot Bottom Bar is explicitly a draft.

## 4. Visibility layers
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

## 5. Source Inbox — raw intake without visual pollution
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

Admin may hide an entire stream while preserving it in the system.

## 6. Review Queue / Human Gate
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

## 7. Workbench
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

## 8. Raziel — global companion, not a page
Raziel is globally available across SOD1820, not owned by World or Heichal and not confined to /research.

Desktop target:
- persistent presence at one side
- collapsed / companion / deep-research modes
- same Raziel across Home, Number, Book, World, Heichal, ELS, Post and Journey
- reads current Research Context, selection, active tool, visible layers and current path

Mobile target:
- invoked from the adaptive command surface or gesture
- opens as a focused sheet/full-height companion without losing context

Future extension:
- same companion identity/context may later project into a browser extension or desktop companion, if built; this must remain a surface over the same authorized context, not a second Raziel memory/truth system.

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

Raziel can propose navigation, filters, comparison, tool execution and candidate actions. It cannot independently promote/canonicalize/publish.

## 9. Access projections
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
- more approved evidence and explicitly-allowed lower-confidence material
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

## 10. Visual/interaction language
Goal: sophisticated underneath, effortless above.

Rules:
- one dominant focus at a time
- progressive disclosure
- semantic zoom
- labels only when useful
- clusters collapse automatically
- status conveyed with icon/line treatment + text, not color alone
- mobile = task/path projection rather than forcing a giant graph
- no giant default hairball
- no permanent card farm
- keyboard-first command palette on desktop
- pointer/drag where useful, never required for accessibility
- instant exact reopen of meaningful workspace state
- transitions should preserve orientation rather than feel like unrelated page loads

Recommended relation treatments:
- canonical: solid
- approved: solid lighter
- candidate: dashed
- unresolved: dotted + ?
- contradiction: explicit warning marker
- representation/same-source locus: thin/secondary

Actual palette remains owned by canonical UI/theme owners.

## 11. Golden Slice — 1237 / התגלות
WORLD V1 is proven through one end-to-end real slice, not a fake demo.

Flow:
1. Enter 1237 from search/command/page
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
13. ask Raziel to explain/compare the selected path without losing state

PASS means the same architecture can extend to 1820, 358, persons, books, events and future entity types without a new World system.

## 12. Build slices — capability-first, legacy-UI-neutral
### W0 — 2027 Shell Definition + Legacy Capability Crosswalk
- enumerate current capabilities that must survive
- explicitly classify each current UI surface as REUSE / ADAPT / REPLACE / RETIRE
- do not preserve current Navbar/Bottom Bar/Heichal/Book layout by default
- define Research Context Spine + adaptive command surface + Raziel companion contracts

### W1 — Adaptive Shell + Context
- one global shell
- exact reopen via existing Research Context
- command palette/action surface
- companion slot
- contextual inspector slot
- responsive behavior

### W2 — Golden 1237 World composition
- real entity/findings/topics/sources/methods/books where present
- bounded graph expansion
- existing readers only

### W3 — Heichal projection + tool continuity
- Heichal opens inside the World/workspace, never as a second knowledge system
- current World focus becomes Heichal Research Context automatically
- tools consume selected entity/path/context
- results return as Finding/Candidate/Evidence with provenance
- ELS exact-reopen and return continuity preserved
- no engine duplication

### W4 — Books as first-class World projection
- Book is a stable World entity
- Books becomes a 2027 library/research projection, not preservation of today's page
- Book detail may render as reading mode, source map, research view or contextual panel depending on task
- Book → edition/witness/source → passage/block → finding/relation paths remain traceable
- clean reading mode may intentionally suppress most chrome while keeping Raziel/context recoverable
- Heichal can run supported research tools against selected book/source/passage

### W5 — Admin visibility + Inbox/Review
- raw stream filters
- candidate/unresolved/contradiction visibility
- Human Gate review surfaces

### W6 — Workbench Candidate relation
- drag/drop or connect gesture
- relation composer
- duplicate check
- Candidate-only write
- Human Gate required for canonical transition

### W7 — Raziel Context Adapter
- selected entities/path/layers/Heichal state exposed as current Research Context
- Raziel navigation/filter/research/tool commands
- one companion across the whole site

### W8 — Premium depth projections
- live entitlement/access owner reconciliation first
- bounded server-side reads
- no full graph dump

### W9 — Multi-surface continuity
- mobile task views
- optional installable/PWA refinements
- future browser/desktop companion extension points
- same identity/context, no parallel knowledge system

### Later
- spatial/3D renderer
- richer collaborative research
- advanced graph layouts
- premium anti-scraping/rate budgets

## 13. Non-negotiable invariants
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
- shell/UI shape != canonical capability owner
- legacy route/component != architecture
- Rank/Filter/Hide; do not delete truth to simplify the screen
- bounded readers; never dump the whole graph to the client

## 14. Ownership / architecture verdict
OWNER CHECK: **EXTEND_EXISTING**.

The Command Room is a composition/projection/workbench over existing owners. No new Graph, Truth Store, Journey system, Search engine, Method system, Book graph or Raziel knowledge store is authorized by this blueprint.

Foundation → Projection → Experience.

## 15. Canonical hierarchy — World → Heichal → Tools
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

**HEICHAL = research/tool mode inside the World**
The Heichal is not another World and does not own knowledge. It is the research mode/workspace opened against the current Research Context.

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

## 16. Books placement
Books have two simultaneous but non-conflicting roles:

### A. Books = Library / browse projection of the World
The Books experience is where a user browses the Book universe: books, source families, available research, editions/witnesses when modeled, and entry points into passages/blocks/findings.

It is therefore not inside Heichal. A Book is knowledge/source identity and belongs in the World.

Mental model:
**World → Books projection → Book detail → passage/source/finding → related entities.**

### B. Book tools = inside Heichal
When the user wants to DO something to a book/source/passage — compare, search, run a method, inspect structure, trace extraction, inspect a witness, or launch a supported research engine — that action belongs to Heichal.

Mental model:
**Book selected in World → Heichal opens with that Book/Passage as Research Context → tool runs → result returns to Book/World.**

The present Book page UI is explicitly non-canonical and may be fully replaced.

## 17. Number relation to World / Heichal / ELS / Books
The Number experience is a focused projection of one numeric entity, not a replacement for the World and not tied to today's Number page layout.

For a number such as 1820:
- immediate layer: identity + strongest relevant findings
- expand: World neighborhood — expressions, topics, persons, posts, galleries, books/sources, events, journeys
- deep action: open Heichal in-place or as a workspace transformation

From Heichal the user can:
- calculate across methods
- inspect Method Trace
- run ELS
- inspect verses
- inspect Books/Sources connected to 1820
- compare expressions
- perform reverse search

ELS launched from Number context inherits `Research Context = 1820` and returns the exact occurrence/finding to the same World state.

A Book opened from Number context likewise preserves `Research Context = 1820` and exact return position.

The intended experience is one continuous loop:
**Number → World neighborhood → Book/Source or Heichal Tool → Finding → World → Journey / Human Gate / Raziel.**

## 18. Legacy migration rule
Current UI must be mined for proven capabilities, not treated as a visual contract.

Before replacing any existing surface:
1. inventory its real capabilities and live users/data paths;
2. map each capability to the new shell/World/Heichal/Inspector/Companion surface;
3. preserve exact-reopen, identity, provenance and auth semantics;
4. provide route/SEO compatibility where externally addressable;
5. only then retire or redirect the legacy UI.

No legacy interface receives preservation priority merely because it is complex, old or already implemented.
