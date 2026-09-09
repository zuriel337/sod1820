# SOD1820 — Visual Gallery + Number Experience 2029 V1

Status: HUMAN-GATE DESIGN DIRECTION SAVED · BRANCH ONLY · NOT MERGED · NOT DEPLOYED

Owner: `SOD1820_DESIGN_CONTRACT_V1.md`

OWNER CHECK: `EXTEND_EXISTING`.

This document preserves the design/product direction agreed by ZURIEL for Gallery, Media Viewer, Visual Search Lens projections, and future Number-page experience. It does **not** define a new Search Engine, Ranking Engine, Anchor Store, Registry, Number semantics owner, or global discovery policy.

## 1. One Tree visual principle

The same underlying representation/image keeps one identity and provenance across every projection. Only the lens changes.

`ONE TREE → Universal Discovery/Search Core → Canonical Signals + Anchor Map → Search Profiles → Visual Lens → Gallery / World / Heichal / Number Page / Reality / Raziel / Journey`

Gallery is a projection/lens, not a new search system.

## 2. Visual Search Profile boundary

The Visual Profile may consume existing signals such as:
- literal number presence;
- primary vs secondary value;
- OCR count;
- time / `occurred_at` / `stream_at`;
- recurrence;
- source/post/gallery links;
- Reality Stream status;
- treasure;
- importance;
- existing source-owned signals where available.

The Visual Profile may expose explainable ranking reasons, but must not become the owner of:
- Anchor identity/meaning;
- cross-domain search policy;
- global evidence independence;
- Raziel search semantics;
- Number dossier semantics;
- global ranking truth.

`Presence ≠ Centrality ≠ Evidence ≠ Semantic Strength ≠ Anchor Strength`.

Every ranking/result must be explainable. No opaque black-box score should be introduced by Gallery/Visual code.

If a needed signal already exists elsewhere, consume it rather than reimplementing it locally.

Do not touch or unify `number_anchors`, `number_roots`, or `metatron_anchors` from this design line.

## 3. Projection roles

### World — Visual Discovery
Immersive discovery view. Shows visually strong/current/recurring material, clusters, periods, treasures and Reality-linked representations. It is for discovery, not deep adjudication.

### Gallery — Visual Archive
Archive / collections / media view. Preserve masonry as the default archive presentation because source image ratios vary materially. Search/filter/sort may include number, time, primary/secondary, OCR presence, source/post/gallery relation, treasure, importance and Reality context.

### Heichal — Visual Research Lab
Deep research projection of the same Visual Lens. Supports combined filters, comparison, timeline, recurrence, cluster/source lineage, explainable ranking, save-to-research, Raziel handoff and exact context continuity. No second search system.

### Number Page — Visual Projection
A Number page should summarize the visual corpus around the number rather than render an unbounded gallery. Example projections: top representations, primary vs secondary, recurrence over time, strongest collections, current Reality-linked representations, and a route/action into the full Visual Lens.

### Reality Stream — Visual Now
Shows temporal/current representations and resurfacing signals. Historical strength and current Reality relevance must remain separate concepts.

### Raziel — Natural-language access
Raziel may query the same Visual Profile through the shared discovery layer. It must not invent local ranking semantics.

### Journey — Visual Context
Journey may consume one or more contextually relevant representations from the same Visual Lens without cloning them into a Journey-specific store.

## 4. Gallery 2029 design direction

Gallery remains the visual archive, not the Reality Stream.

Preserve masonry/archive browsing, but modernize the experience through:
- cleaner cards with less metadata covering the image;
- collections / periods / number lenses / source lenses;
- stronger search/filter affordances from the shared Action Family;
- one shared Media Viewer;
- contextual actions such as Share / Save / Follow / Add to Research / Raziel where semantics permit;
- secondary Research Intake CTA such as `מצאת רמז? שלח לבדיקה` / `מצאתי משהו דומה` in Gallery/Reality contexts, never auto-publish or auto-canonicalize.

Image itself remains the primary visual object. Metadata should not obscure source content.

## 5. Media Viewer 2029 — required viewing contract

The shared existing Lightbox/Viewer is extended; do not create a parallel viewer.

Initial state for every image:

**FIT · WHOLE IMAGE · ALL FOUR EDGES VISIBLE**

No image may be cropped by default merely to fill the viewport. This is especially important for legacy gematria images where every edge may contain calculation content.

Required modes:
- **FIT** — whole image visible;
- **READ** — readable-width mode for text-heavy/tall images with intentional scrolling;
- **ZOOM** — zoom/pan/100% view.

Expected interactions:
- pinch to zoom;
- double-tap zoom;
- +/- controls where appropriate;
- pan while zoomed;
- reset/fit;
- swipe changes image only when not zoomed; when zoomed, drag pans the image.

Closing/escape affordances must remain explicit:
- visible top close control;
- Escape on desktop;
- mobile-safe bottom close affordance;
- clear browser/back behavior where applicable;
- safe-area aware placement;
- no control may disappear against bright/dark source imagery.

Viewer quality requirements:
- body scroll lock while open + restore exact prior scroll position;
- focus trap;
- initial focus on a safe control;
- restore focus to the originating item after close;
- keyboard navigation;
- controls should avoid obscuring important image content;
- wide desktop may use side info panel;
- compact desktop/tablet may use collapsible/overlay info;
- mobile info should behave like a bottom sheet/collapsible layer so image remains first.

Viewer actions belong to the shared action/icon family already being designed.

## 6. Gallery scale and continuity

Current gallery collections can exceed one loaded page. Viewer navigation should reflect the true collection/search result sequence, not only the currently loaded client batch. When the user reaches the loaded boundary, the next bounded batch should be fetched without falsifying `x / total` position.

## 7. Number-page ideas preserved for later redesign

The current Number page already contains several valuable capability seeds that should be preserved/re-homed when the page is eventually redesigned:
- Convergence Meter;
- curated convergence axes / current Number DNA rendering;
- Hidden Cross / cross-method intersection capability;
- Giluy Treasures cross-method capability;
- visual representations;
- method relations;
- current/reality signals;
- source/topic/post relations.

Future design direction: treat the Number as the center of a multi-layer dossier/observatory rather than a flat page.

Candidate view family:
- Overview;
- DNA;
- Methods;
- Hidden Intersections;
- Visual;
- Reality;
- Timeline / Recurrence;
- Sources;
- Research.

These are views/projections over one Number identity, not separate pages or stores.

## 8. Number DNA direction

Current `NumberDNA` is effectively curated convergence cards + their images. Preserve that capability, but in a later redesign treat it as one layer inside a broader Number Dossier.

Potential dossier dimensions include identity/root meanings, curated expressions, method signatures, cross-method intersections, visual representations, recurrence, Reality, source families, timeline, topics/convergences, ELS, books/source loci, and research findings.

This design document does not assign truth authority to any of those dimensions.

## 9. Hidden Intersections direction

Preserve the existing cross-method/hidden-intersection idea as a high-value research lens. In the future it may project intersections across methods, representations, recurrence, Reality, visual/source loci and other canonical signals exposed by the shared discovery layer.

Do not localize global Anchor semantics or global search/ranking policy inside this lens.

## 10. Explainability

Every prominent result should be able to answer: `למה אני רואה את זה?`

Examples of explainable reasons:
- number is primary rather than incidental;
- literal OCR count;
- recurring across multiple time periods;
- linked to multiple independently owned source loci;
- resurfaced in Reality context;
- curated/treasure/importance state from its owner;
- returned by an existing canonical signal.

Frequency must never be presented as semantic strength by itself.

## 11. Visual/design language continuity

All surfaces inherit the Horizon + Cosmic 2029 direction and shared action family already saved under the Design owner:
- Gold = brand / premium / value;
- Sapphire = action / research;
- Purple/Indigo = Raziel / intelligence / aura;
- Glass = secondary actions;
- dark/light are two projections of one product;
- atmosphere is richest at entry/discovery and recedes in dense research surfaces.

## 12. Acceptance target for Gallery / Viewer

Future implementation acceptance should cover at least:
`320 · 360 · 390 · 430 · 768 · 1024 · 1440 · 1920`

Representative media set must include:
- square;
- portrait;
- landscape;
- extreme tall;
- extreme wide;
- legacy gematria image;
- small/old raster;
- high-resolution image.

Acceptance principle:

> No image is cropped without user intent. No control disappears. Every entry has a clear exit. Metadata never hides the research material.

## 13. Search-engine stop boundary

If implementation of the Visual Lens reaches a requirement that looks like a new global Search rule, Ranking rule, Evidence rule, Anchor rule, Search Truth rule, or shared semantic signal definition: **STOP** and hand off to the Universal Discovery/Search owner through `work_log`. Do not implement a Gallery-local substitute.

No merge/deploy is authorized by this document. Release remains explicit ZURIEL Human Gate only.
