# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v5.4

**Date:** 9.9.2026  
**Status:** NAVIGATION / STRATEGY SSOT · EXTEND_EXISTING · HUMAN-GATE CONTROLLED

> v5.4 supersedes the v5.3 navigation order for current planning. v5.3 is preserved byte-for-byte in `docs/archive/SOD1820_MASTER_ROADMAP_v5.3_2026-08-25.md` for provenance.

## 0. What changed in v5.4

v5.4 absorbs post-v5.3 live progress and the 2027 World / Command Room / Heichal / Raziel architecture decisions.

The roadmap is no longer organized around preserving current pages, bars, docks or legacy routes. Current UI is draft material only.

**Preserve:** capability · identity · truth semantics · provenance · Research Context · Journey/Path continuity · engine behavior · security/authorization · Human-Gate decisions · governed user research state.

**May be replaced A→Z:** layouts · page hierarchy · Navbar · Bottom Bar · Heichal presentation · Book presentation · Number presentation · Raziel shells · admin screens · drawers · launchers · interaction patterns.

Core rule: **Preserve capability and truth, not legacy interface.**

---

## 1. 2027 target shape — the whole site is a face of the World

**One Reality Graph · One Research OS · One Adaptive Research Experience.**

SOD1820 is not a website containing a separate “World page”. The entire product is a set of context-aware projections of the same World.

**One World · Many Views.**

A Number, Book, Topic, Person, Post, ELS Finding, Journey or Home surface is a renderer/focus state over the same identity/context substrate. The user should not feel that they are jumping between disconnected mini-sites.

### World
The **World** is the knowledge space: entities, relations, findings, topics/convergences, persons, posts/galleries/images, books/sources/witnesses/passages, ELS findings, events/time, journeys, provenance and truth/publication/access state.

### Heichal
The **Heichal** is deep-research mode/workspace inside the World.

**World → Heichal → Tools → typed result → World**

Heichal owns no independent graph or truth store.

### Raziel
**Raziel = Global Companion.**

Raziel accompanies the user across all projections while consuming the same authorized Research Context. It is not a separate knowledge/search/memory truth system.

Target states: collapsed presence · companion · deep research. A future browser/desktop companion remains another surface over the same identity/context.

### My Workspace
**My Workspace = personal projection of the same Research OS.**

It is not a second research system and must not duplicate Books, Journeys, Findings, saved items or messages into parallel semantic homes.

It composes owned/personal views such as:
- research items / saved collection
- Journeys / resume state
- recent/reopen
- notifications and direct messages
- WhatsApp / connected channels
- contributions / created content
- profile / identity
- progress / researcher level
- credits / subscription / entitlements
- privacy / preferences / account settings

Multiple launchers may open My Workspace; they must all invoke the same capability/state.

### Create / Intake / Contribution
All user/admin input should converge on one semantic intake flow:

**Create / Upload / Message / Finding → Intake → Candidate/typed state → Review/Human Gate where required → World**

Do not build independent publication/research/upload truth systems per surface.

### Adaptive Global Shell
No present Navbar/Bottom-Bar/rail is canonical.

The target shell contains semantic capabilities, not sacred placements:
1. **Research Context Spine**
2. **Global Orientation Header**
3. **Raziel Companion**
4. **Adaptive Command Surface**
5. **Primary Workspace**
6. **Contextual Inspector**
7. **My Workspace entry/state**
8. **Global notifications/account access**

#### Global Orientation Header
The top surface is not a giant legacy menu. Its job is orientation and global intent:
- SOD1820 / World identity
- current focus/breadcrumb where useful
- Universal Search / Command Palette
- account/avatar / depth state where appropriate

Deep navigation belongs to search, commands, context actions, World exploration and Raziel rather than permanent menu clutter.

#### Adaptive Command Surface
The same semantic actions may render as bottom dock, palette, toolbar, rail, sheet, shortcuts or gestures depending on device/task. Capability is stable; placement is not.

---

## 2. Product hierarchy / navigation model

Detailed target map: `docs/sod1820-product-map-2027-v1.md`  
W0 macro crosswalk: `docs/w0-2027-global-shell-capability-crosswalk-v1.md`

```text
SOD1820 / ADAPTIVE GLOBAL SHELL
│
├─ DISCOVER
│  ├─ Universal Search / Command
│  ├─ Explorer / Facets / Topics
│  └─ Home / curated World gateway
│
├─ FOCUSED WORLD PROJECTIONS
│  ├─ Number / Phrase
│  ├─ Topic / Convergence
│  ├─ Person / Name
│  ├─ Book / Source / Passage
│  ├─ Post / Gallery / Image
│  ├─ Verse / ELS Finding
│  └─ Event / Time
│
├─ WORLD — shared semantic workspace
│
├─ HEICHAL — research mode inside World
│  └─ Tools / Engines / Inspectors
│
├─ JOURNEYS / RESEARCH PATHS
│
├─ MY WORKSPACE — personal projection
│  ├─ research / saved / resume
│  ├─ notifications / messages / channels
│  ├─ contributions / created content
│  └─ profile / progress / credits / access / settings
│
├─ CREATE / INTAKE / CONTRIBUTION
│
├─ RAZIEL — global companion/controller
│
└─ ADMIN RESEARCH / COMMAND ROOM
   ├─ Source Inbox
   ├─ Review Queue
   ├─ Workbench
   └─ Human Gate
```

Cross-cutting, not separate worlds:
- Notifications / Now
- Account / Access / Billing
- Research Context
- Search / Commands
- Provenance / Truth / Access

---

## 3. Placement decisions

### Home
Home becomes a calm gateway/orientation projection of the World, not an architectural dumping ground of widgets.

### Number
Number is **World focused on a Number/Phrase**, not a separate universe.

**Number → World neighborhood → Heichal / Book / ELS → Finding → World → Journey / Raziel / Human Gate.**

### Books
Book is a first-class World/source identity. Library/reading/source-map are renderers. Actions on a selected book/passage open Heichal. Reading mode may suppress most chrome while preserving recoverable Context/Raziel.

### ELS
ELS engine/tool belongs to Heichal. ELS finding/occurrence belongs to the World. Exact context/reopen continuity is mandatory.

### Explorer / Search
Bounded discovery over the same Reality; never a second graph.

### Journey
Traversal/durable research continuity over the same identities and Research Context.

### My Workspace
Personal projection only. “My books”, “my findings”, “my journeys”, “my collection” are views over canonical owners, not duplicate stores created for UI convenience.

### Notifications / Inbox
One hierarchy must distinguish:
- personal notifications/messages
- global/system updates / Now
- research/source intake requiring review

Different surfaces may present them, but they must not become three competing inbox semantics.

### Account / Access
Profile, identity, credits, subscription/entitlements, channels, privacy and preferences belong to My Workspace/account projection, not to World truth.

---

## 4. Access / depth model

Access changes what may be retrieved and which controls are available; it never changes truth.

- **Public:** curated canonical/approved bounded projection.
- **Premium:** richer depth, journeys/saved research, comparison, richer provenance/facets.
- **Deep Premium:** deeper authorized approved material and advanced Heichal tools; no private/admin/raw.
- **Admin Research:** deepest authorized projection including private candidates/unresolved/contradictions/raw and Human-Gate controls.

**Server must bound results. Never send Admin/Deep payload and merely hide it client-side.**

---

## 5. 2027 invariants

- One Tree
- One Reality Graph
- One Research OS
- One World, many views
- one stable entity identity
- no duplicate semantic homes
- personal projection ≠ personal duplicate truth store
- notification surface ≠ notification owner
- launcher ≠ capability owner
- provenance preserved
- representation ≠ semantic identity
- calculation fact ≠ interpretation
- access tier ≠ truth
- AI suggestion ≠ Human Gate decision
- drag/drop ≠ canonical write
- Heichal output ≠ canonical truth by itself
- shell/UI shape ≠ capability owner
- legacy route/component ≠ architecture
- Rank / Filter / Hide; do not delete truth for visual simplicity
- bounded server-side readers; never dump the whole graph to the client
- every pointer/drag action has keyboard/list/mobile/accessibility equivalent

---

## 6. W0 → W9 build sequence

### W0 — Product Map + Capability / Action / State / Access Closure — **ACTIVE NEXT**
Before large UI implementation:
1. complete capability inventory across current site
2. classify existing surfaces: `REUSE / ADAPT / REPLACE / RETIRE`
3. canonical semantic action vocabulary
4. state tiers: durable / shareable / ephemeral
5. surface matrix: desktop / tablet / mobile / future external companion
6. access matrix: Public / Premium / Deep / Admin
7. renderer parity: graph / list / keyboard / accessibility / mobile task view
8. failure / retry / cancellation / long-running-tool semantics
9. semantic telemetry independent of button placement
10. route / SEO / deep-link migration obligations
11. global shell capability ownership: Header / Command / Raziel / Inspector / My Workspace / Notifications
12. personal-domain one-tree crosswalk: research/saved/journeys/messages/contributions/profile/credits/access/settings
13. intake/contribution one-tree crosswalk

**Gate:** independent architecture challenge after W0. No large Shell build before PASS.

### W1 — Adaptive Shell + Research Context
Global shell, orientation header, command surface, companion slot, My Workspace entry, contextual inspector, responsive behavior, exact reopen.

### W2 — Golden 1237 / התגלות World composition
Real entity/findings/topics/sources/books/methods, bounded expansion, no fake demo.

### W3 — Heichal + Tool continuity
World focus enters Heichal without losing context. Tool results return to World with typed provenance.

### W4 — Books 2027 projection
Library + Book reading/research views + source/passages + Heichal bridge.

### W5 — Admin visibility / Source Inbox / Review Queue
Candidate/unresolved/contradiction/raw layers with Human-Gate review.

### W6 — Workbench Candidate relations
Connect → Relation Composer → Candidate → Human Gate.

### W7 — Raziel Context Adapter / Global Companion
One Raziel across the whole experience, using current selection/path/layers/tool state.

### W8 — Premium / Deep depth projections
After live access/entitlement/security reconciliation only.

### W9 — Multi-surface continuity
Mobile task projections, PWA/install refinements, future browser/desktop companion; same identity/context.

### Later
Spatial/3D renderer, richer collaboration, advanced graph layouts, premium anti-scraping/rate budgets — projections over the same Research State.

---

## 7. Golden Slice acceptance test

First proof remains **1237 / התגלות**:

Search/Command → Focused 1237 → World → sources/books → Heichal → Method/ELS → typed result → Journey → Raziel → exact return → Admin Candidate → Human Gate.

The same core task must work on desktop, mobile task mode and keyboard/list alternative.

---

## 8. Live foundation posture

Consume rather than duplicate:
- Explorer P3 closed/live as bounded discovery substrate
- Journey/Research Path Foundation closed
- ELS continuity released/live
- Post/Gallery preservation closure complete for selected preservation objective
- security authorization floor closed; reverify for future Premium/Admin writes
- Raziel governance/routing exists; implementation gaps belong in W7

Roadmap is navigation. Reverify current state against live DB + `origin/main` + Master State/work_log before WRITE/release.

---

## 9. Immediate next action

**NEXT = finish W0 macro→detailed crosswalk.**

The macro architecture now explicitly includes the whole-site-as-World principle, Global Orientation Header, My Workspace, Notifications/Inbox hierarchy, Account/Access and Create/Intake/Contribution.

Next W0 pass: inventory actual current capabilities and owners in detail, classify each surface `REUSE / ADAPT / REPLACE / RETIRE`, then run independent architecture challenge.

Do not start broad UI reconstruction before W0 PASS.

---

## 10. Authority / coordination

- Canonical Supabase project: `linswmnnkjxvweumprav`
- Live truth: DB + `origin/main` + Master State
- Roadmap = navigation
- Human Gate = ZURIEL
- GPT / CLAUDE coordinate via `work_log`
- no overlapping WRITE scope
- implemented ≠ merged ≠ deployed ≠ live ≠ verified

**OWNER VERDICT: EXTEND_EXISTING.**

Foundation → Projection → Experience.
