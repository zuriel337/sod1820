# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v5.4

**Date:** 9.9.2026  
**Status:** NAVIGATION / STRATEGY SSOT · EXTEND_EXISTING · HUMAN-GATE CONTROLLED

> v5.4 supersedes the v5.3 navigation order for current planning. v5.3 is preserved byte-for-byte in `docs/archive/SOD1820_MASTER_ROADMAP_v5.3_2026-08-25.md` for provenance.

## 0. What changed in v5.4

v5.4 absorbs post-v5.3 live progress and the 2027 World / Heichal / Raziel architecture decisions.

The roadmap is no longer organized around preserving current pages, bars, docks or legacy routes. Current UI is draft material only.

**Preserve:** capability · identity · truth semantics · provenance · Research Context · Journey/Path continuity · engine behavior · security/authorization · Human-Gate decisions · governed user research state.

**May be replaced A→Z:** layouts · page hierarchy · Navbar · Bottom Bar · Heichal presentation · Book presentation · Number presentation · Raziel shells · admin screens · drawers · launchers · interaction patterns.

Core rule: **Preserve capability and truth, not legacy interface.**

Post-challenge reconciliation input: `docs/w0-2027-final-reconciliation-v1.md`.

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

Heichal owns no independent graph or truth store. Direct public entry to Books, Number/Phrase, ELS and other addressable products remains first-class; Heichal is never a mandatory gateway.

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

### Create / Publication / Research Intake
Do not physically collapse every kind of creation into one pipeline.

- ordinary content creation/publication stays under its existing content/publishing owners;
- social/communication actions stay in their domain;
- explicitly submitted/eligible research material enters Research Intake;
- Candidate → Review → Human Gate governs research promotion where required.

**One Tree does not mean one table, one lifecycle or one universal Inbox.**

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
9. **Global navigation capability** — presentation may be Sidebar/rail/drawer/palette according to device/task; no duplicate navigation owner.

#### Global Orientation Header
The top surface is not a giant legacy menu. Its job is orientation and global intent:
- SOD1820 / World identity
- current location + current focus
- research root/path when needed without inventing relationships
- Universal Search / Command Palette
- account/avatar / depth state where appropriate

**Orientation must never be lost.** Older path segments may compress, but current place/focus and recoverable return remain clear.

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
├─ CREATE / PUBLISH / RESEARCH INTAKE — domain-separated lifecycle, one tree
│
├─ RAZIEL — global companion/controller
│
└─ ADMIN
   ├─ Admin Research / Human Gate
   │  ├─ Source Inbox
   │  ├─ Review Queue
   │  └─ Workbench / Candidate relations
   └─ System Operations / Metatron
      ├─ analytics / traffic
      ├─ diagnostics / system state
      └─ operational intelligence
```

Cross-cutting, not separate worlds:
- Notifications / Global Now / Personal Attention
- Account / Access / Billing
- Language / Localization
- Follow / Share
- Research Context
- Search / Commands
- Provenance / Truth / Access

---

## 3. Placement decisions

### Home
Home becomes a calm gateway/orientation projection of the World, not an architectural dumping ground of widgets.

### Number / Phrase
Number/Phrase is **World focused on a numeric or expression identity**, not a separate universe.

**CONNECT NOW · REDESIGN LATER.**

The final Number/Phrase redesign is deliberately deferred until the broader 2027 system is visible enough to make the composition decision with evidence. During W1–W9, the existing Number/Phrase core may remain recognizable while it is progressively connected to the new Shell, World, Journeys, Raziel, Books, ELS, My Workspace, language/access and exact-return infrastructure.

Signature capabilities explicitly preserved while presentation remains redesignable:
- stable direct Number/Phrase route and SEO continuity;
- vitality/pulse — explainable “how alive is this number in the system”, never a truth score;
- convergence snapshot/map;
- method switching as real active research state;
- downstream dynamic update when method changes;
- cross-method equality/intersections / governed hidden intersections;
- AI number analysis, integrated into the one Raziel experience rather than becoming a second AI identity;
- Discovery Engine findings/output contract;
- sources / relations / Books / ELS / Posts / Galleries / Events / World connections;
- save/add-to-research/Journey/return continuity.

Historical S10.4 visual locking is superseded at planning level; the **Discovery Engine output-target capability is not removed**. It must be re-homed into the future Number/Phrase renderer.

### Books
Book is a first-class World/source identity. Library/reading/source-map are renderers. Books remain directly addressable products with SEO; Heichal is optional deep research. Reading mode may suppress most chrome while preserving recoverable Context/Raziel.

### ELS
ELS remains a directly addressable public product/tool. The ELS engine/tool belongs to Heichal when used in deep research; ELS finding/occurrence belongs to the World. Exact context/reopen continuity is mandatory.

### Explorer / Search
Bounded discovery over the same Reality; never a second graph.

### Journey
Traversal/durable research continuity over the same identities and Research Context.

### My Workspace
Personal projection only. “My books”, “my findings”, “my journeys”, “my collection” are views over canonical owners, not duplicate stores created for UI convenience.

### Notifications / Now / Inbox
One hierarchy must distinguish:
- **Global Now** — what is new in SOD1820;
- **Personal Attention** — personal notifications/messages/account attention;
- **Research Source Inbox** — authorized raw research intake requiring processing/review.

Different surfaces may present them, but they must not become competing inbox semantics.

### Account / Access
Profile, identity, credits, subscription/entitlements, channels, privacy and preferences belong to My Workspace/account projection, not to World truth.

### Language
`change_language` is a global shell capability. Locale changes representation and direction (RTL/LTR) while preserving identity, Research Context, Journey position and orientation wherever the underlying content supports that locale.

---

## 4. Access / depth model

Access changes what may be retrieved and which controls are available; it never changes truth.

- **Public:** curated canonical/approved bounded projection.
- **Registered:** own account/personal state plus capabilities allowed by current owners.
- **Premium:** richer bounded depth, journeys/saved research, comparison, richer provenance/facets where entitled.
- **Deep Premium:** deeper authorized approved material and advanced Heichal tools; no private/admin/raw.
- **Admin Research:** deepest authorized projection including private candidates/unresolved/contradictions/raw and Human-Gate controls.

Availability, caller entitlement, object publication/access, privacy and truth are separate dimensions.

**Server must bound results. Never send Admin/Deep payload and merely hide it client-side. Raziel receives only caller-authorized context.**

---

## 5. 2027 invariants

- One Tree
- One Reality Graph
- One Research OS
- One World, many views
- one stable entity identity
- direct SEO/product routes remain valid where explicitly retained
- Heichal is optional deep research, not a mandatory gateway
- no duplicate semantic homes
- personal projection ≠ personal duplicate truth store
- notification surface ≠ notification owner
- launcher ≠ capability owner
- provenance preserved
- representation ≠ semantic identity
- calculation fact ≠ interpretation
- access tier ≠ truth
- AI suggestion ≠ Human Gate decision
- HOT / vitality / activity ≠ truth
- drag/drop ≠ canonical write
- Heichal output ≠ canonical truth by itself
- shell/UI shape ≠ capability owner
- legacy route/component ≠ architecture
- content publication ≠ research promotion
- Rank / Filter / Hide; do not delete truth for visual simplicity
- bounded server-side readers; never dump the whole graph to the client
- every pointer/drag action has keyboard/list/mobile/accessibility equivalent
- unknown/inaccessible/deprecated deep link resolves honestly; never silently substitutes unrelated Home content

---

## 6. W0 → W9 build sequence

### W0 — Product Map + Capability / Action / State / Access Closure — **ACTIVE RECONCILIATION**

Independent architecture challenge delivered: work_log `d3c26a5c-1a01-47b9-9147-a94430c65f3c` — **PASS WITH CONDITIONS · OWNER CHECK=EXTEND_EXISTING**.

Remaining finite W0 closure set:
1. six-area owner-reconciliation delta: System Frame · Research Studio · research_workspace_law · workspace_layout_standard · legacy Command Center chain · Master State S10.4 Number output-target split;
2. exact route/alias/SEO ledger, including root-post slug collision policy and honest terminal projection;
3. identity addressability matrix;
4. personal capability owner matrix;
5. content publication vs Research Intake matrix;
6. cross-cutting map: Follow / Share / Language / Onboarding / Legal-Privacy / Install-Push;
7. access/privacy/ownership/entitlement/role/Human-Gate authority matrix;
8. action execution + cost/credit/retry/idempotency semantics;
9. exact-reopen adapter/state-reference map;
10. semantic telemetry + first-surface performance budgets;
11. v5.3 open-workstream/gate carry-forward table;
12. Number/Phrase bridge contract: connect now, final redesign later.

W0 is a specification/owner gate. Executable Golden proof belongs to later slices when code exists.

**No large Shell build before remaining W0 closure set passes.**

### W0.5 — Visual Foundation 2027
Before broad new UI construction, reconcile the existing Design Contract/tokens for the 2027 experience: color roles, dark/light strategy, typography, spacing, radius, motion, focus/accessibility, Raziel treatment, truth-safe status language, RTL/LTR and responsive primitives. Extend existing design owners; do not create a parallel palette/design system.

### W1 — Adaptive Shell + Research Context
Global shell, persistent orientation header, global navigation projection, adaptive command surface, companion slot, My Workspace entry, contextual inspector, responsive behavior, exact reopen, honest terminal states, language-ready/access-ready structure.

### W2 — Golden 1237 / התגלות World composition
Real entity/findings/topics/sources/books/methods, bounded expansion, no fake demo.

### W3 — Heichal + Tool continuity
World/direct focus enters deep research without losing context. Tool results return to World with typed provenance.

### W4 — Books 2027 projection
Library + Book reading/research views + source/passages + optional Heichal bridge; direct SEO routes remain first-class.

### W5 — Admin Research / Human Gate 2027
Source Inbox + Review Queue + research visibility over the same World. Legacy CC-1..CC-4 presentation/phasing is **ABSORBED**, not a parallel future UI program. Preserve valid Human-Gate/truth/provenance/security capabilities.

### W6 — Workbench Candidate relations + System Operations composition
Connect → Relation Composer → Candidate → Human Gate, plus coherent System Operations/Metatron placement without conflating system intelligence with research truth.

### W7 — Raziel Context Adapter / Global Companion
One Raziel across the whole experience, using current selection/path/layers/tool state. Existing AI analysis capabilities become Raziel-aware projections where appropriate; AI outage never removes manual navigation/tools.

### W8 — Premium / Deep depth projections
After live access/entitlement/security reconciliation only. Same identities/routes/context; deeper server-authorized projections, no Premium duplicate site.

### W9 — Multi-surface continuity
Mobile task projections, PWA/install refinements, future browser/desktop companion; same identity/context.

### Post-W9 / evidence gate — Number/Phrase final redesign
Once the broader Shell, World, Journeys, Books, ELS and Raziel experience is visible enough, redesign Number/Phrase as a product-level experience while preserving its signature capabilities and re-homed Discovery Engine output contract. ZURIEL may move this earlier only when sufficient product evidence exists.

### Later
Spatial/3D renderer, richer collaboration, advanced graph layouts, advanced abuse/rate controls — projections over the same Research State.

---

## 7. Golden Slice acceptance test

First executable proof remains **1237 / התגלות**, but it is a later implementation acceptance, not a W0 specification gate:

Search/Command → Focused 1237 → World → source/book → compatible existing tool/reader → typed result/read state → Journey/return → Raziel context seam.

Candidate writes, full Admin Human-Gate flow, paid depth and advanced Raziel orchestration have their own later gates and are not required to fake a first preview.

The same core task must work on desktop, mobile task mode and keyboard/list alternative.

---

## 8. Live foundation posture

Consume rather than duplicate:
- Explorer P3 closed/live as bounded discovery substrate
- Journey/Research Path Foundation closed; current live `research_paths` population remains early and must not be overclaimed
- ELS continuity released/live
- Post/Gallery preservation closure complete for selected preservation objective
- security authorization floor closed; reverify for future Premium/Admin writes
- Raziel governance/routing exists; implementation gaps belong in W7
- existing user research state is substantial and must survive My Workspace/Shell migration

Roadmap is navigation. Reverify current state against live DB + `origin/main` + Master State/work_log before WRITE/release.

---

## 9. Human-Gate reconciliation decisions after independent challenge

1. **Number S10.4:** presentation may be superseded; Discovery Engine output-target capability must be re-homed. Final Number redesign is deferred while connections are built now.
2. **Legacy CC-1..CC-4:** absorbed into 2027; do not maintain a parallel future Admin UI program. Preserve valid underlying capabilities/boundaries.
3. **v5.3 carry-forward:** open workstreams/gates and DO-NOT-BUILD-YET conditions must be classified and carried forward before v5.4 is released as navigation SSOT.

Exact reconciliation body: `docs/w0-2027-final-reconciliation-v1.md`.

---

## 10. Immediate next action

**NEXT = finish the finite W0 owner/spec reconciliation package.**

Do not expand the vision again unless a new finding can change a decision.

Exact next work:
- prepare the six-area existing-owner reconciliation delta with preserved history;
- build the v5.3 carry-forward classification table;
- complete route/addressability/personal/publication-access/action-cost/exact-reopen/telemetry matrices;
- then W0 PASS review;
- then Visual Foundation 2027;
- then W1 implementation on a fresh current-main base.

Do not start broad UI reconstruction before W0 PASS. Do not merge/deploy without explicit ZURIEL authorization.

---

## 11. Authority / coordination

- Canonical Supabase project: `linswmnnkjxvweumprav`
- Live truth: DB + `origin/main` + Master State
- Roadmap = navigation
- Human Gate = ZURIEL
- GPT / CLAUDE coordinate via `work_log`
- no overlapping WRITE scope
- implemented ≠ merged ≠ deployed ≠ live ≠ verified

**OWNER VERDICT: EXTEND_EXISTING.**

Foundation → Projection → Experience.
