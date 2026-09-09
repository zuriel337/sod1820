# SOD1820 — W0.5 Visual Environment + Required Contextual Asset Gate v1

Status: APPROVED DIRECTION BY HUMAN GATE ZURIEL · IMPLEMENTED AS W0.5 BRANCH CONTRACT · NOT MERGED · NOT DEPLOYED · NOT LIVE

This is an additive W0.5 extension under the existing owner `SOD1820_DESIGN_CONTRACT_V1.md`. It is not a new Design System, media store, image registry, theme owner or publishing system.

OWNER CHECK: `EXTEND_EXISTING`.

## 1. One Visual Tree

SOD1820 uses one visual tree from lightweight UI through spatial/3D experience. Environment imagery is a projection layer over the same semantic product/research reality; it never creates a second truth, graph or product identity.

The rendering ladder remains progressive:

- Tier A — HTML/CSS/SVG + optimized raster assets;
- Tier B — lightweight Canvas/ambient spatial effects when justified;
- Tier C — WebGL/WebGPU only where spatial interaction or data density is itself useful;
- Tier D — future XR/AR/VR projection over the same Research Reality.

Use the lowest rendering tier that fully delivers the intended experience. A richer renderer must degrade to a lower tier without losing capability, truth, provenance, identity or navigation.

## 2. Canonical Environment Families

The initial environment vocabulary is intentionally finite. It is a role vocabulary, not a set of hard-coded image files.

1. `dark_observatory` — deep navy/cosmic horizon, restrained stars/field light, gold as emitted light, research blue as interaction.
2. `light_celestial` — warm ivory/pearl, sky/cloud/light atmosphere, deep ink, muted gold, research blue; premium daylight counterpart of the same product.
3. `research_lab` — low-scenery/high-legibility mode for dense research, tools, tables, admin/Human-Gate and analytical work.
4. `spatial_journey` — richest bounded environment for Journeys, spatial research, maps/graphs/ELS or future 3D where the environment materially supports orientation or meaning.

A surface chooses an environment role according to product semantics and task density. It does not invent a local palette or background system.

## 3. Environment is a Layer, Not Wallpaper

Environment art must be compositional and performance-aware:

- hero/entry regions may carry the richest image;
- dense reading/research regions fade toward cleaner surfaces;
- imagery may never reduce text contrast or hide focus/controls;
- background art and readable content remain separate layers;
- decorative letters/verses/matrix effects are not default wallpaper;
- meaningful ELS/text/graph visuals are content and may remain prominent when they represent actual research;
- environment motion is ambient only, never required for information.

## 4. Required Contextual Visual Asset Gate

Every **experience-bearing product, Journey, major product mode, major editorial/learning experience or first-class launchable experience surface** must declare a contextual visual asset before it is considered presentation-complete.

This requirement does **not** mean every atomic node, finding, number row, source paragraph or utility control gets a bespoke generated image. Requiring one image per atomic object would create noise, cost and false visual semantics. The gate applies to experience-bearing surfaces and reusable experience identities.

Each covered experience must resolve one of:

- `curated_asset` — an approved real/curated image or illustration;
- `generated_candidate` — an automatically generated visual candidate awaiting the normal publishing/Human-Gate boundary where applicable;
- `canonical_fallback` — a role-appropriate environment fallback when a bespoke asset is not yet approved.

A covered experience may not silently render with an arbitrary local stock/background image.

## 5. Automatic Generation Requirement

When a new covered product/Journey/experience is created without a contextual asset, the future creation/publishing workflow must automatically create an **asset requirement** and attempt to produce or request a visual candidate from the canonical visual language.

The automation must derive its brief from known product context only: identity/title, environment role, product purpose, known public-safe semantic context, language/locale and visual constraints. It must not fabricate historical scenes, people, places, source evidence, truth rank, canonicality or factual claims merely to make an attractive image.

Automatic image generation is a **representation-generation step**, not a truth or publication transition:

`experience context → visual brief → generated candidate → review/selection where required → published representation`

AI may generate, rank and recommend candidates. It does not independently canonicalize research or use visual prominence to imply truth.

## 6. Asset Identity / Provenance Boundary

SOURCE/OBJECT ≠ IMAGE REPRESENTATION.

A generated/curated environment image is a representation of an experience, not the identity of the underlying Book/Journey/Number/Post/Topic and not evidence for its claims. Preserve where available:

- source or generation origin;
- prompt/brief/version provenance for generated derivatives;
- intended environment role;
- target experience identity/reference;
- crop/aspect variants as representations of the same selected asset, not new product identities;
- approval/publication state separately from research truth state.

Reuse existing media/storage/projection primitives when implementation reaches that layer. Do not introduce a parallel image truth store merely for W0.5.

## 7. Responsive Asset Contract

A selected environment must support responsive composition rather than one desktop image stretched everywhere. The implementation path must support at minimum:

- focal/safe region that survives mobile crop;
- wide/desktop and narrow/mobile crop or art-direction strategy;
- readable foreground contrast in dark and light projections;
- lazy loading for below-the-fold/rich imagery;
- optimized modern delivery format where supported;
- bounded dimensions/file weight;
- no required text baked into the image;
- static fallback when motion/3D is disabled or unsupported.

## 8. Performance Contract

The environment system is not allowed to make every page expensive.

- ordinary pages remain Tier A by default;
- heavy assets load only when the surface uses them;
- offscreen ambient animation pauses;
- `prefers-reduced-motion` removes non-essential movement;
- low-power/mobile contexts may reduce density, particles, parallax or spatial rendering;
- WebGL/WebGPU is route/capability scoped and lazy-loaded;
- a decorative failure must never block content or research capability.

## 9. Light/Dark Continuity

Dark and light are two projections of one identity, not separate brands.

Dark North Star: `Night Navy → Research Blue → Sacred Gold → Raziel Indigo`.

Light North Star: `Warm Pearl/Ivory → Deep Ink → Research Blue → Muted/Sacred Gold → restrained Raziel Indigo`.

The environment art may differ materially between day/night, but hierarchy, product identity, semantic roles and capability remain shared.

## 10. W0.5 Closure Impact

W0.5 cannot be called visually closed until the Golden Case proves:

1. at least one real dark environment and one real light counterpart;
2. environment degradation into dense research content without readability loss;
3. mobile crop/safe-area behavior at 320/360/390px;
4. reduced-motion/static fallback;
5. one contextual asset requirement flow demonstrated conceptually or in implementation without creating a parallel media system;
6. representation/truth boundary preserved;
7. performance budget remains compatible with the later Adaptive Shell.

Actual automatic asset-generation pipeline implementation may land with the creation/publishing workflow that owns the relevant product/Journey. The **requirement and extension point are Foundation NOW** so no future product can require a redesign to gain contextual imagery.

## 11. Human-Gate Decision

ZURIEL direction, 2026-09-09: the 2027 North Star includes real environmental imagery such as cosmic/night horizons and celestial/light landscapes, and future products/Journeys/major experiences should automatically require a context-appropriate image/visual asset rather than treating imagery as optional decoration.

This decision extends the existing visual tree. It does not authorize bulk generation, bulk publishing, asset replacement on legacy pages, or production release.
