# SOD1820 — 2027 PRODUCT MAP V1

**Status:** PRODUCT MAP / W0 INPUT · EXTEND_EXISTING · UI-NEUTRAL · NOT IMPLEMENTED  
**Roadmap:** `SOD1820_MASTER_ROADMAP.md` v5.4

## 0. Purpose

This map describes the target product architecture of SOD1820 without treating any current UI surface as sacred.

Current Number page, Books page, Bottom Bar, Navbar, Heichal, Raziel shells, admin screens and legacy launchers are drafts/reference material only.

Preserve capability, identity, truth, provenance, Research Context, Journey continuity, authorization and Human-Gate decisions. Replace presentation freely when a better 2027 interaction exists.

---

## 1. One product, not many mini-products

```text
                           ┌─────────────────────────┐
                           │    RAZIEL COMPANION     │
                           │ global/context-aware AI │
                           └────────────┬────────────┘
                                        │
┌──────────────┐      ┌────────────────▼────────────────┐      ┌────────────────┐
│   DISCOVER   │ ───▶ │          PRIMARY WORLD          │ ◀──▶ │    JOURNEYS    │
│ Search       │      │ entities · relations · findings │      │ research paths │
│ Explorer     │      │ sources · topics · provenance   │      │ save / resume  │
│ Home         │      └───────────────┬─────────────────┘      └────────────────┘
└──────────────┘                      │
                                     │ deep research
                              ┌──────▼──────┐
                              │   HEICHAL   │
                              │ research    │
                              │ workspace   │
                              └──────┬──────┘
                                     │
                      ┌──────────────┼─────────────────┐
                      │              │                 │
                  Gematria          ELS          Methods/Books/
                  engines           tool         Verse/Compare/…
                      │              │                 │
                      └──────────────┼─────────────────┘
                                     │ typed results
                              ┌──────▼──────┐
                              │ WORLD STATE │
                              │ finding /   │
                              │ evidence /  │
                              │ candidate   │
                              └─────────────┘
```

The World is where knowledge is seen and connected. Heichal is where research actions are performed. Raziel accompanies both. Journeys preserve traversal and research continuity.

---

## 2. Adaptive Research Shell

The target shell has semantic regions, not fixed legacy bars.

### A. Research Context Spine
Invisible continuity layer containing only governed context:
- subject/root
- selected entity/relation/result
- active dimensions/lens
- current path/journey position
- tool context
- exact return/reopen information

It must not become a dump of transient UI details.

### B. Raziel Companion
Global companion across the entire product.

Desktop states:
- **Presence** — tiny/collapsed
- **Companion** — persistent conversation/actions
- **Deep** — temporary expanded research workspace

Mobile:
- focused sheet/full-height companion opened without losing context

Future external surface:
- browser/desktop companion may use the same authorized context and identity; never a second memory/truth system.

### C. Adaptive Command Surface
A capability launcher that may render differently by device/context:
- command palette
- compact dock
- contextual toolbar
- side rail
- mobile sheet

No current Bottom-Bar slot count or Navbar layout is canonical.

### D. Primary Workspace
Morphs according to task while maintaining identity/context:
- focused entity/Number
- World graph/list
- Topic/Convergence
- Book/Source/Reading
- Heichal tool
- ELS
- Journey
- Post/Gallery
- timeline/event

### E. Contextual Inspector
Appears only when useful:
- identity/type
- truth/verification status
- provenance
- method/engine trace
- source loci
- layers
- contradiction/unresolved state
- access/publication
- Admin/Human-Gate actions

---

## 3. Discover layer

### Universal Search / Command Palette
Primary intent-based entry point.

Examples:
- `1820`
- `התגלות`
- `ספר הבהיר`
- `מצא קשר בין 604 ל־1820`
- `פתח ELS על 1237`

Search should route to stable identities and actions, not only keyword result pages.

### Universal Explorer
Bounded faceted discovery over the same Reality:
- entity type
- topic
- number
- source/book
- person
- time
- method
- engine
- verification/status
- provenance
- access/depth
- language
- journey membership

Explorer is discovery/navigation, not a parallel graph.

### Home
Curated discovery and orientation surface. It should not carry architecture merely because current Home widgets exist.

---

## 4. Focused projections

Focused projections answer: **“Show me this thing clearly.”**

They can all expand into the World without changing identity.

### Number / Phrase
Immediate readable projection:
- identity/value
- strongest canonical/approved findings
- expressions/aliases where governed
- selected important connections
- provenance hints

Deep expansion:
**Open in World** or **Open Heichal**.

### Topic / Convergence
Browsable/rankable semantic projection over the same knowledge body.

### Person / Name
Identity-centered projection with connected findings, sources, events and journeys.

### Book / Source / Passage
Book is a World/source identity, not a Heichal tool.

Modes may include:
- library browse
- reading mode
- source map
- research mode
- passage context

Actions on the selected source/passage open Heichal.

### Post / Gallery / Image
Representation/source loci connected to semantic identities. Representation is not the semantic identity itself.

### Verse / ELS Finding
ELS occurrence/finding is an addressable research result in the World. The ELS engine used to find it belongs in Heichal.

### Event / Time
Temporal projection over the same entities/findings.

---

## 5. World

World is the shared semantic workspace.

It may render as:
- graph
- structured list
- path view
- timeline
- source view
- comparison
- future spatial view

The renderer may change without changing the underlying identity/context.

### Visibility / research layers
Independently filterable where authorized:
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
- Persons
- Posts
- Galleries / Images
- Books / Sources / Editions / Witnesses
- ELS findings
- Events / Time
- Journeys
- Raw intake streams

Default surfaces must remain calm. **Everything may exist; nothing must be visible.**

### Scale rules
- bounded server-side queries
- progressive expansion
- semantic zoom
- pagination/virtualization
- ranking
- cluster collapse
- no full graph dump

---

## 6. Heichal

Heichal is **research mode inside the World**.

It answers: **“What do I want to do to the selected research context?”**

### Tool families
- Gematria / numeric calculations
- registered methods
- Method Trace / Inspector
- ELS / letter skips
- verse/biblical context
- reverse search
- phrase/value compare
- numeric-law operators
- Book/Source inspection and comparison
- extraction/structure inspection where governed
- future spatial/3D research tools

### Heichal output envelope
Every tool result should expose a common semantic envelope where relevant:
- context/input identity
- tool/engine/method identity
- parameters
- deterministic calculation/result
- trace
- provenance/source
- timestamp/version where meaningful
- status/confidence axis where applicable
- save/add-to-research eligibility
- relationship to existing finding/candidate

Outputs may be:
- Calculation Fact
- Trace
- Evidence
- Finding
- Candidate
- Unresolved

No result silently becomes canonical/published truth.

---

## 7. Journeys / Research Paths

Journeys answer: **“What path did I take and how do I return/continue?”**

Capabilities:
- add step
- save
- resume
- branch
- exact reopen
- compare paths later
- Raziel-aware path context

Journeys reuse stable entity identities and Research Context. They do not copy knowledge into a second system.

---

## 8. Raziel

Raziel answers: **“Help me understand, navigate and operate this research environment.”**

Raziel may:
- explain selected entities/relations
- compare evidence
- change filters/layers
- open tools
- run authorized tool actions
- navigate to exact findings/sources
- propose candidates
- help construct a Journey
- surface contradictions/unresolved items

Raziel may not:
- own a parallel graph/search index/truth store
- silently canonicalize
- silently publish
- override authorization
- treat memory/chat as canonical project truth

---

## 9. Admin Research / Command Room

Admin is a deeper authorized projection of the same World, not another graph.

### Source Inbox
Raw/intake material can exist without visual pollution:
- Zvi messages
- WhatsApp/Raziel intake
- posts
- galleries
- ELS findings
- book/source extraction
- contributors
- future connectors

States may include unread/reviewed/attached/candidate/deferred/duplicate.

### Review Queue
Decision-changing items:
- relation candidate
- promotion candidate
- contradiction
- unresolved identity/method
- duplicate/merge suggestion
- publication/access decision
- attribution ambiguity

### Workbench
Research editing/composition surface.

Safe connection flow:
**Select/drag A + B → Relation Composer → Candidate → Human Gate → canonical transition if approved.**

Drag is never required; equivalent keyboard/list actions must exist.

---

## 10. Access projections

| Depth | Knowledge | Research tools | Raw/private | Human Gate controls |
|---|---|---|---|---|
| Public | curated canonical/approved | basic/public | no | no |
| Premium | richer bounded depth | richer tools | no | no |
| Deep Premium | deeper authorized approved material | advanced | no private/admin raw | no |
| Admin Research | deepest authorized | full authorized Heichal | yes where authorized | yes |

Access ≠ Truth.

Authorization is server-side and data-bounding, not client hiding.

---

## 11. Device / renderer matrix

### Desktop
Can support concurrent context:
- primary workspace
- Raziel companion
- inspector
- command surface

### Tablet
Two-pane/adaptive modes; panels collapse contextually.

### Mobile
Task-first projection:
- one primary task at a time
- sheets for Raziel/Inspector/commands
- World primarily path/list/cluster views rather than forced giant graph

### Keyboard / accessibility
Any graph-only gesture must have:
- list alternative
- keyboard action
- visible focus
- accessible status text

Status cannot rely only on color.

---

## 12. State tiers

W0 must classify state before implementation.

### Durable
User/system research state that must survive sessions according to owner/governance, e.g. saved research/Journeys/candidates.

### Shareable / reopenable
State that can be encoded/reopened safely when appropriate:
- entity focus
- bounded facets
- selected path/window
- exact ELS locus
- return point

### Ephemeral
UI-only state that should not pollute Research Context:
- panel width
- hover state
- temporary animation
- transient open menus

---

## 13. Canonical action vocabulary — W0 target

The experience should converge on semantic actions independent of surface placement:

- `search`
- `open`
- `focus`
- `inspect`
- `expand`
- `filter`
- `compare`
- `run_tool`
- `open_heichal`
- `open_world`
- `add_to_research`
- `save_path`
- `resume_path`
- `connect`
- `propose_candidate`
- `review`
- `approve`
- `reject`
- `ask_raziel`
- `return_exact`

Telemetry should track semantic actions, not only button IDs.

---

## 14. Legacy surface crosswalk rule

No current surface is automatically preserved.

Each current capability/UI encountered in W0 receives one disposition:
- **REUSE** — already matches target semantics and quality
- **ADAPT** — capability/structure useful, new shell/presentation
- **REPLACE** — preserve capability but rebuild experience
- **RETIRE** — redundant/dead/legacy with no required capability

Externally addressable routes require SEO/deep-link migration analysis before retirement.

---

## 15. Golden Slice — 1237 / התגלות

First complete proof:

```text
Search 1237
  ↓
Focused 1237 projection
  ↓
World neighborhood / התגלות / findings
  ↓
Source loci: post / gallery / book
  ↓
Heichal
  ├─ Gematria / Method Trace
  └─ ELS
       ↓
Typed result / evidence / finding
       ↓
World
  ↓
Journey
  ↓
Raziel explains / compares
  ↓
Exact return
  ↓
Admin: Candidate → Human Gate
```

Must work as:
- desktop experience
- mobile task projection
- keyboard/list alternative

No fake demo data.

---

## 16. Example — 1820

User opens 1820.

1. Focused Number projection gives immediate high-value information.
2. “World” expands connections to phrases/topics/persons/books/posts/ELS findings.
3. User opens Book source; Research Context remains 1820.
4. User opens Heichal on the selected book passage or on 1820.
5. ELS/Gematria/Method tools run using that context.
6. Result returns as typed Finding/Evidence/Candidate.
7. User adds sequence to Journey.
8. Raziel can explain the current path.
9. Exact return restores the prior 1820 World state.

This is one continuous product, not navigation between disconnected mini-sites.

---

## 17. W0 closure checklist

W0 is not complete until all are explicit:

- [ ] complete capability inventory
- [ ] REUSE / ADAPT / REPLACE / RETIRE crosswalk
- [ ] semantic action vocabulary
- [ ] durable/shareable/ephemeral state rules
- [ ] desktop/tablet/mobile surface matrix
- [ ] Public/Premium/Deep/Admin access matrix
- [ ] graph/list/keyboard/accessibility parity contract
- [ ] long-running tool failure/retry/cancel rules
- [ ] semantic telemetry vocabulary
- [ ] route/SEO/deep-link migration obligations
- [ ] independent architecture challenge PASS

After W0: W1 Adaptive Shell + W2 1237 Golden Slice.

---

## 18. Non-negotiables

- One Tree
- One Reality Graph
- One Research OS
- Human Gate remains decision owner
- Foundation → Projection → Experience
- no product semantics duplicated because of device/UI
- no “2027” effect created by visual novelty while architecture remains page-fragmented
- no legacy UI preserved merely because it exists
- no capability lost merely because its old UI is retired
