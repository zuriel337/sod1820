# Spatial System Definition V1 — existing-owner extension

> Status: BRANCH-ONLY DRAFT for read-only architecture challenge. Human direction approved by ZURIEL on 2026-09-07; do not call CLOSED / MERGED / DEPLOYED until specialist challenge + release gate.
>
> OWNER CHECK verdict: **EXTEND_EXISTING**. This document does not create a new Spatial law, engine, graph, store, Journey system or 3D truth owner. It refines the existing `project_codex.spatial_research_runtime_vision_v1` under `reality_graph_law`, the Research OS / Journey contracts, Experience Governance and the existing ELS / Spatial Gematria owners.

## 1. Product idea

SOD1820 has one Research Reality and many projections. Spatial/3D is not a second product database and not a separate truth system. It is a renderer/runtime over the same identity, Research Context, Findings, sources, relations and journeys already owned elsewhere.

Canonical chain:

**Research Reality / Research Context → Domain Adapter → Semantic Scene Compiler → Spatial Runtime → Renderer → Experience / Journey**

A renderer may be 2D, layered-2D, Canvas, WebGL/WebGPU or future XR. Changing renderer must not change identity, truth, provenance, calculation, publication state or Journey meaning.

## 2. Hard invariants

1. **One graph / one Research OS.** No spatial graph, no 3D entity table, no 3D Finding store.
2. **Projection state is disposable.** `x/y/z`, camera, zoom, color, particle state, layout, animation, LOD and mesh identity are projection state only.
3. **Identity survives projection.** A number, verse, person, ELS occurrence, Finding or source has the same canonical identity in flat and spatial views.
4. **Journey ≠ scene coordinates.** A Journey stores semantic traversal / reopenable Research Context, never a camera path as truth.
5. **ELS remains one engine.** Spatial ELS consumes the existing canonical corpus/engine outputs and occurrence identity; it never searches a copied Torah corpus or invents a second ELS engine.
6. **Truth-safe visuals.** Visual size/glow/centrality may express UI focus or ranking only when explicitly mapped; it must not silently promote a Candidate to Fact/Canonical.
7. **Progressive enhancement.** Spatial experience must have a readable non-WebGL fallback; mobile/low-power/reduced-motion must remain first-class.
8. **LOD is semantic, not only geometric.** Zoom changes knowledge resolution: corpus/book → section/window → occurrence/entity → representation/method/result → relation/finding → provenance/source.
9. **Batch glyphs, do not mesh every letter.** Large Torah/text fields use row/chunk/glyph-atlas/batched techniques. High-detail character geometry is local/on-demand.
10. **One shared runtime owner.** New spatial domains add adapters, not independent Canvas loops or per-page Three.js architecture.

## 3. Spatial contract layers

### A. Domain Adapter
Produces renderer-independent semantic input from an existing canonical owner.

Examples:
- Torah / ELS occurrence adapter → stable `corpusIndex`, book/verse locator, path membership.
- Reality Graph adapter → entity ids + typed relations + provenance/truth tier.
- Family adapter (future) → canonical Person identities + relationship edges; no separate family graph.
- Gematria adapter → canonical method/result lineage + spatial representation metadata.

Adapter output MUST NOT contain canonical `x/y/z`.

### B. Semantic Scene Compiler
Compiles temporary scene semantics from current Research Context.

Minimum output shape:
- `subjectId`
- `sceneNodes[]` with stable canonical refs, semantic kind, label, truth tier, optional ranking/focus metadata
- `sceneRelations[]` with typed relation + explanation
- `availableActions[]` expressed semantically (`select_node`, `follow_relation`, `show_source`, `switch_depth`, `back`, etc.)
- active `lens/depth/focus`

The compiler may derive temporary layout coordinates, but they remain disposable projection state.

### C. Spatial Runtime
Owns interaction/performance lifecycle:
- picking
- focus / back / return
- LOD transitions
- batching / glyph runtime / instancing
- camera/controller state
- pause when hidden/offscreen
- performance budget + graceful fallback
- exact reopen handoff back to Research Context

### D. Renderer
Renderer implements the same semantic scene using the lowest sufficient tier:
- Tier A: DOM/CSS/SVG
- Tier B: Canvas/lightweight spatial layer
- Tier C: WebGL/WebGPU for true spatial capability
- Tier D: future XR

Renderer owns appearance, not research truth.

## 4. One Journey contract

Spatial Journey extends the existing Journey / Research Path owner; it does not create `spatial_journeys`.

A Journey step is semantic, for example:

`start entity → follow relation → open source → switch lens → focus ELS path → inspect occurrence → open related topic → return`

Minimum durable/reopenable meaning:
- stable start identity / Research Context
- ordered semantic steps/actions
- target canonical ids / refs
- relevant lens/depth state
- provenance for any included Finding/claim
- return/reopen state

Optional presentation state (camera easing, cinematic duration, particles, temporary coordinates) may be saved as non-authoritative presentation metadata only when useful; it never becomes the Journey’s truth identity.

## 5. Four spatial depth modes

These are projection-depth labels, not new truth states:

1. **Overview** — universe/tree at a glance; large domains/clusters.
2. **Explore** — topic/family/book/cluster navigation.
3. **Investigate** — Finding, ELS path, source, methods, representations and relations.
4. **Journey** — guided semantic traversal through existing Research Context and graph.

The same content may be reopened in a different renderer/depth without duplication.

## 6. Torah / ELS letter model

The current Torah occurrence foundation is the correct direction and must be preserved:

- canonical ELS/Torah corpus is reused read-only;
- stable occurrence identity is `corpusIndex`;
- letter locator/book/verse/path membership are semantic occurrence data;
- glyph position on screen/space is projection state;
- glyph runtime may batch rows/chunks for 100 / 1K / 10K+ scale;
- ELS path highlight is annotation over occurrences, not a new letter identity;
- zoom path: corpus/book summary → chunk/window → occurrence detail;
- clicking an occurrence may open exact source / verse / ELS path / related Research Context.

**Do not “re-sort the letters” into a new database.** Future work should strengthen adapters, LOD, exact reopen and journey semantics over the existing occurrence identity.

## 7. Target experiences mapped to the same runtime

### Home — Cosmic Gateway
Home is the farthest, lightest projection of the same system, not a separate fake universe.

Default: Tier B rich/cosmic gateway. On capable devices a bounded Tier C scene may progressively enhance it with a very small number of real semantic nodes/relations. It must never load the whole graph on Home.

Home can preview:
- current system/world focus
- a few real entities/topics
- build state
- future gateways

CTA can transition toward `/world` / Explorer when that product is ready. Home must remain fast and have Tier A/B fallback.

### World / Universal Explorer
The World remains Explorer-first per Roadmap. Spatial is a later renderer of Explorer state, not a replacement for P1–P5 work. Any future 3D mode consumes the same facets, identity, ranking and Research Context.

### Journey inside the cipher
Recommended first spatial Golden Case after definition:

**canonical Torah corpus → real occurrence identities → one real ELS path → spatial scene → semantic Journey → exact source/reopen → return to Research Context**

Keep it bounded. Prove one end-to-end path before broad cinematic work.

### Journey inside hints / relations
Reality Graph adapter supplies entities + edges + Finding provenance; scene/compiler/runtime are reused. No hint-specific 3D graph.

### Family Tree
Future family experience is a projection over canonical Person identity + relationship edges. It must not introduce a second family/person store. Privacy/access rules remain authoritative regardless of spatial view.

### Spatial Gematria
Existing `spatial_gematria_law` remains the domain owner for number→structure→form research. Its Three.js components should gradually consume/reuse the shared semantic/runtime primitives where that reduces duplicate lifecycle code, without losing its verified-vs-interpretive separation.

## 8. Home/Footer cross-surface rule

- **Home owns the primary Cosmic Gateway / construction story.**
- **Internal pages own the compact Royal-Cosmic System Signature footer.**
- Do not duplicate the full-strength hero/build/future story in both places.
- Footer stays Tier A by default; Home may use Tier B and bounded Tier C progressive enhancement.
- Future teaser copy may name Family Tree / 3D cipher journeys / 3D hint journeys as `בקרוב` only when clearly marked future/not-yet-live.

## 9. Performance floor

Before public Tier C release, prove at least:
- bounded initial scene payload
- no one-mesh-per-letter strategy at corpus scale
- route-scoped/lazy 3D bundle
- disposal of textures/geometries/listeners on unmount
- pause/offscreen/hidden behavior
- mobile fallback
- `prefers-reduced-motion` behavior
- WebGL unavailable fallback
- predictable navigation/back/reopen
- no semantic loss when switching renderer

Performance target is architectural first; FPS numbers are acceptance evidence, not canonical truth.

## 10. Existing implementation inventory (current main, verified before this draft)

Already present and to be reused/reconciled, not replaced blindly:
- `src/lib/spatial/torahCorpusSource.js`
- `src/lib/spatial/torahOccurrenceAdapter.js`
- `src/lib/spatial/semanticSceneCompiler.js`
- `src/components/spatial/TorahOccurrenceScene.jsx` (dev/admin)
- `src/lib/spatialModels.js`
- `src/components/GematriaCube.jsx`
- `src/pages/Gematria3DPage.jsx`
- existing R3F/Drei surfaces: Galaxy / Rooms / NumberTree / ConvergenceGalaxy / Gematria-related scenes

Legacy visual surfaces are capability references, not automatically the canonical runtime architecture. Reuse useful render primitives only after owner/lifecycle reconciliation.

## 11. Build sequence

This definition does not change the Master Roadmap priority. Recommended sequence:

1. **Definition / challenge now** — close ownership, Journey semantics, letter identity, LOD, performance/fallback law.
2. **Continue Universal Explorer priorities P1–P5.**
3. **Shared Spatial Runtime hardening** only where it directly supports an approved Golden Case; avoid broad rewrite.
4. **Golden Case: bounded ELS Journey** using current occurrence adapter and exact-reopen foundations.
5. **Reuse adapters** for Reality Graph hint journey and Family Tree.
6. **Richer World/3D journeys** at Roadmap P6.
7. **XR** only after Tier C semantics/performance prove stable.

## 12. Explicitly not authorized by this definition

- no new schema/table/store/registry
- no parallel graph
- no second ELS engine or Torah corpus
- no mass letter ingestion
- no new canonical coordinate fields
- no automatic Finding/canonical promotion from visual prominence
- no replacement of Universal Explorer priorities with full 3D
- no public route/deploy from this document alone
- no family/privacy model change
- no WebGL in ordinary forms/settings/footer just for appearance

## 13. Acceptance gate for definition closure

Before calling Spatial System Definition V1 CLOSED:

- [ ] read-only specialist architecture challenge completed
- [ ] no owner overlap / parallel contract detected
- [ ] ELS single-engine and occurrence identity preserved
- [ ] existing Journey/Research Context owner preserved
- [ ] Home/Footer/World relationship does not contradict Design Contract/Roadmap
- [ ] performance/LOD/fallback rules are explicit
- [ ] exact reopen / return semantics are preserved
- [ ] Human Gate accepts any material changes after challenge

After closure, the implementation Golden Case is still separately release-gated.
