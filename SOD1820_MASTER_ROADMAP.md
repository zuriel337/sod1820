# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v5.4

**Date:** 9.9.2026  
**Status:** NAVIGATION / STRATEGY SSOT · EXTEND_EXISTING · HUMAN-GATE CONTROLLED

> v5.4 supersedes the v5.3 navigation order for current planning. v5.3 is preserved byte-for-byte in `docs/archive/SOD1820_MASTER_ROADMAP_v5.3_2026-08-25.md` for provenance. Historical sections below v5.3 are not deleted; they are archived rather than allowed to compete with current navigation.

## 0. What changed in v5.4

v5.4 absorbs the post-v5.3 live progress and the 2027 World / Command Room / Heichal / Raziel architecture decisions.

The roadmap is no longer organized around preserving current pages, bars, docks or legacy routes. Current UI is draft material only.

**Preserve:** capability · identity · truth semantics · provenance · Research Context · Journey/Path continuity · engine behavior · security/authorization · Human-Gate decisions · governed user research state.

**May be replaced A→Z:** layouts · page hierarchy · Navbar · Bottom Bar · Heichal presentation · Book presentation · Number presentation · Raziel shells · admin screens · drawers · launchers · interaction patterns.

Core rule: **Preserve capability and truth, not legacy interface.**

---

## 1. 2027 target shape

**One Reality Graph · One Research OS · One Adaptive Research Experience.**

The product is organized as one continuous research environment, not a collection of unrelated pages.

### World
The **World** is the knowledge space:
- entities
- relations
- findings
- topics / convergences
- persons
- posts / galleries / images
- books / sources / witnesses / passages
- ELS findings
- events / time
- journeys
- provenance
- truth / publication / access state

World owns no parallel truth system; it projects the existing Reality Graph / Research OS.

### Heichal
The **Heichal** is the deep-research mode/workspace opened inside the World against the current Research Context.

**World → Heichal → Tools**

Heichal owns no independent knowledge graph or truth store.

Tools may include:
- canonical Gematria
- registered calculation methods
- Method Trace / Inspector
- ELS / letter skips
- verse / biblical context
- reverse search
- phrase/value comparison
- numeric laws / governed operators
- book/source inspection and comparison
- future spatial / 3D research tools

Tool output returns to the World as typed research state: Calculation Fact / Trace / Finding / Candidate / Evidence / Unresolved. Tool output is not canonical truth by itself.

### Raziel
**Raziel = Global Companion.**

Raziel is not owned by World or Heichal and is not a separate search/knowledge/memory truth system. It accompanies the user across Home, Number, Book, World, Heichal, ELS, Post and Journey while consuming the same authorized Research Context.

Target states:
- collapsed presence
- companion
- deep research

Future browser/desktop companion is an extension surface over the same identity/context, not a second Raziel.

### Adaptive Shell
No present Navbar/Bottom-Bar/rail is canonical.

The 2027 shell contains five semantic layers:
1. **Research Context Spine** — subject, selection, lens/dimensions, path, tool state, return point, journey position.
2. **Raziel Companion** — globally available and context aware.
3. **Adaptive Command Surface** — may render as dock, palette, rail, toolbar or sheet according to device/task.
4. **Primary Workspace** — Number / World / Book / Heichal / ELS / Journey / content projection.
5. **Contextual Inspector** — provenance, layers, trace, relation details, Human Gate, tool output; appears only when needed.

Capability must not be coupled to a particular placement in the UI.

---

## 2. Product hierarchy / canonical navigation model

Detailed map: `docs/sod1820-product-map-2027-v1.md`.

High-level hierarchy:

```text
SOD1820
│
├─ Discover
│  ├─ Search / Command Palette
│  ├─ Explorer / Facets / Topics
│  └─ Home / curated discovery
│
├─ Focused Projections
│  ├─ Number / Phrase
│  ├─ Topic / Convergence
│  ├─ Person / Name
│  ├─ Book / Source / Passage
│  ├─ Post / Gallery / Image
│  ├─ Verse / ELS Finding
│  └─ Event / Time
│
├─ WORLD — shared knowledge space
│  ├─ relations / paths / sources / findings
│  ├─ layers / ranking / semantic zoom
│  └─ exact Research Context continuity
│
├─ HEICHAL — research mode inside World
│  └─ Tools / Engines / Inspectors
│
├─ JOURNEYS / RESEARCH PATHS
│  └─ save / resume / branch / exact reopen
│
├─ RAZIEL — global companion/controller
│
└─ ADMIN RESEARCH / COMMAND ROOM
   ├─ Source Inbox
   ├─ Review Queue
   ├─ Workbench
   ├─ Candidate relation composer
   └─ Human Gate
```

---

## 3. Placement decisions

### Number
Number is a focused projection of one entity, not a separate universe and not tied to today's Number-page layout.

Flow:
**Number → World neighborhood → Heichal / Book / ELS → Finding → World → Journey / Raziel / Human Gate.**

### Books
Book is a first-class World/source identity.

- **Books experience** = library/browse/research projection of the World.
- **Book tools** = Heichal.
- Reading mode may suppress most chrome while preserving recoverable Research Context and Raziel.

### ELS
ELS has two roles without becoming two systems:
- ELS **tool/engine** lives in Heichal.
- ELS **finding/occurrence** lives in the World as an addressable research object/finding with provenance.

Opening ELS from 1820 must inherit `Research Context = 1820` and return exactly to the originating World state.

### Explorer / Search
Explorer remains the bounded faceted discovery projection over the same Reality. It feeds World; it is not a second graph.

### Journey
Journey / Research Path is traversal and durable research continuity over the same identities and Research Context.

---

## 4. Access / depth model

Access changes what may be retrieved and which controls are available; it never changes truth.

### Public
Curated canonical/approved bounded projection, public-safe provenance.

### Premium
More exploration depth, journeys/saved research, comparison, richer provenance/facets.

### Deep Premium
Deeper authorized traversal, richer approved evidence and explicitly allowed lower-confidence material, advanced Heichal tools. Still excludes private/admin/raw.

### Admin Research / Command Room
Deepest authorized projection including private candidates, unresolved, contradictions, raw intake, Review Queue, Workbench and Candidate creation.

**Server must bound results. Never send Admin/Deep payload and hide it client-side.**

---

## 5. 2027 architecture invariants

- One Reality Graph
- One Research OS
- one stable entity identity
- no duplicate semantic homes
- provenance preserved
- representation ≠ semantic identity
- calculation fact ≠ interpretation
- access tier ≠ truth
- AI suggestion ≠ Human Gate decision
- drag/drop ≠ canonical write
- Heichal output ≠ canonical truth by itself
- Book UI ≠ separate Book knowledge system
- ELS engine ≠ separate World
- shell/UI shape ≠ capability owner
- legacy route/component ≠ architecture
- Rank / Filter / Hide; do not delete truth for visual simplicity
- bounded server-side readers; never dump the whole graph to the client
- every pointer/drag action must have keyboard/list/mobile/accessibility equivalent

---

## 6. W0 → W9 build sequence

### W0 — 2027 Product Map + Capability / Action / State / Access Closure — **ACTIVE NEXT**
Before large UI implementation:
1. capability inventory across current site
2. classify existing surfaces: `REUSE / ADAPT / REPLACE / RETIRE`
3. canonical action vocabulary (`open`, `inspect`, `compare`, `run_tool`, `add_to_research`, `connect`, `review`, `ask_raziel`, etc.)
4. state tiers: durable / shareable / ephemeral
5. surface matrix: desktop / tablet / mobile / future external companion
6. access matrix: Public / Premium / Deep / Admin
7. renderer parity: graph / list / keyboard / accessibility / mobile task view
8. failure / retry / cancellation / long-running-tool semantics
9. semantic telemetry independent of button placement
10. route / SEO / deep-link migration obligations

**Gate:** independent architecture challenge after W0. No large Shell build before PASS.

### W1 — Adaptive Shell + Research Context
One global shell, command surface, companion slot, contextual inspector, responsive behavior, exact reopen.

### W2 — Golden 1237 / התגלות World composition
Real entity/findings/topics/sources/books/methods, bounded expansion, no fake demo.

### W3 — Heichal + Tool continuity
World focus enters Heichal without losing context. Tool results return to World with typed provenance.

### W4 — Books 2027 projection
Library + Book reading/research views + source/passages + Heichal bridge.

### W5 — Admin visibility / Source Inbox / Review Queue
Candidate/unresolved/contradiction/raw layers with Human-Gate review.

### W6 — Workbench Candidate relations
Connect/drag → Relation Composer → Candidate by default → Human Gate for canonical transition.

### W7 — Raziel Context Adapter / Global Companion
Raziel reads selected entities/path/layers/tool state and can navigate/filter/run authorized research actions without owning parallel truth.

### W8 — Premium / Deep depth projections
Only after live access/entitlement/security reconciliation. Bounded server-side reads.

### W9 — Multi-surface continuity
Mobile task projections, PWA/install refinements, future browser/desktop companion extension points; same identity/context.

### Later
Spatial/3D renderer, richer collaboration, advanced graph layouts, premium anti-scraping/rate budgets — always projections over the same Research State.

---

## 7. Golden Slice acceptance test

The first real product proof remains **1237 / התגלות**.

Required end-to-end proof:
1. enter 1237 from search/command
2. view strongest identity/findings + התגלות
3. expand World relations/topics
4. open posts/gallery/book/source loci
5. open Heichal without losing context
6. inspect canonical calculation method/trace
7. open/run ELS where available
8. capture a typed finding/evidence result
9. add path to Journey
10. exact return to the prior 1237 World state
11. ask Raziel about current selection/path
12. Admin can reveal Candidate/Raw separately
13. create one Candidate relation and prove it stays non-canonical until Human Gate
14. same core task works on desktop + mobile task projection + keyboard/list alternative

PASS means the architecture can extend to 1820, 358, persons, books, events and future types without a new product system.

---

## 8. Live foundation / sequencing posture at v5.4

Do not reopen completed Foundation merely because the Experience is being redesigned.

Known lower-skeleton progress to consume rather than duplicate:
- Universal Explorer P3 product closure already achieved and should be reused as bounded discovery substrate.
- Journey / Research Path Foundation is closed; build projections/adapters over it rather than creating new journey storage.
- ELS continuity is released/live; consume exact-reopen / Research Context continuity rather than creating a new ELS-side context system.
- Post/Gallery legacy preservation work has reached finite preservation closure; do not reopen the entire corpus absent a decision-changing clue.
- Security authorization floor was separately closed; future Premium/Admin work must still reverify active security/access contracts live.
- Raziel governance/routing exists; implementation gaps remain and belong in W7, not in a parallel Raziel system.

Roadmap is navigation; current-state claims must still be reverified against live DB + `origin/main` + Master State/work_log before WRITE or release.

---

## 9. Immediate next action

**NEXT = W0.**

Produce and challenge the 2027 Product Map / capability-action-state-access crosswalk before implementing a large shell.

Do not start broad UI reconstruction, 3D, Premium, or a site-wide Raziel integration before W0 closes.

After W0 PASS: build W1 + W2 as a bounded branch-only 1237 vertical slice. Merge/deploy only on explicit ZURIEL release authorization.

---

## 10. Authority / coordination

- Canonical Supabase project: `linswmnnkjxvweumprav`
- Live truth for current state: DB + `origin/main` + Master State
- Roadmap = navigation, not runtime truth
- Human Gate = ZURIEL
- GPT / CLAUDE coordinate directly through `work_log`
- no overlapping WRITE scope
- implemented ≠ merged ≠ deployed ≠ live ≠ verified

**OWNER VERDICT: EXTEND_EXISTING.**

Foundation → Projection → Experience.
