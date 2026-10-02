# G3→G4 Journey / Spatial Foundation Scope v1

**Date:** 2026-10-02  
**Status:** HUMAN-GATE APPROVED SCOPE · FOUNDATION EXTENSION · BRANCH-ONLY DOCUMENTED  
**Phase placement:** existing G3→G4 transition lane (“G3.5” shorthand) · **G3 remains CLOSED**  
**Canonical Supabase:** `linswmnnkjxvweumprav`

## 1. Purpose

Close the minimum substrate required for real SOD1820 journeys before broad G4 Golden acceptance, without creating a second Journey system, Spatial system, ELS engine, glyph truth store, scene truth store, or video-specific semantics.

The target is one traversable research world in which the same semantic objects can be projected as readable 2D, layered 2.5D, true Web 3D, cinematic Blender/video, and later XR without changing identity, truth or provenance.

Canonical chain:

`Research Reality / Research Context → Domain Adapter → Semantic Scene Compiler → scene.v1 → Spatial Runtime / Renderer → Journey Experience`

Journey remains a path/projection over existing identities and Research Context. Coordinates/camera/materials remain projection state.

## 2. Existing owners — EXTEND_EXISTING only

- Journey / Research Context / exact return → active `research_workspace_law v5`.
- ELS / Torah cipher research layer → active `els_research_layer_law v9`.
- One ELS execution core → active `els_single_engine_law v2`.
- Experience / Spatial projection / responsive depth → active `experience_governance_foundation_v1_law v8` + `SOD1820_DESIGN_CONTRACT_V1.md`.
- Future renderer-independent spatial runtime → `project_codex.spatial_research_runtime_vision_v1`.
- Gematria numeric truth / method identity → existing canonical Gematria engine + method-registry owners.
- Research-object / source-native identity → existing Research OS / identity owners.

No new top-level Journey/Spatial/Glyph/Scene owner is authorized by this scope.

## 3. One Hebrew letter identity — many renderers

Each Hebrew letter must have one stable semantic identity and one canonical vector-shape lineage. The same letter identity is reused across:

- ordinary Web/SVG projection;
- Gematria Method Stage;
- ELS/Torah glyph projection;
- WebGL/R3F 3D;
- Blender/cinematic rendering;
- video compositing;
- future AR/VR.

Target asset lineage:

`letter identity/codepoint → canonical vector path/SVG source → derived SDF/MSDF/texture and/or mesh/GLB LOD assets → renderer projection`

Rules:

1. Glyph geometry is representation, never numeric or textual truth.
2. Codepoint / representation identity / provenance survive every derived asset.
3. Do not use a Blender text object or AI-generated Hebrew as canonical glyph identity.
4. A derived mesh must be traceable to its vector source/asset identity.
5. Final letters preserve their own identity and explicit base-letter relationship where applicable.
6. Renderer-specific optimization may change tessellation/LOD, not letter identity.

## 4. Unified scene substrate

`scene.v1` is the renderer-independent projection contract, not a knowledge store.

Minimum scene capabilities:

- stable nodes;
- parent hierarchy;
- local transforms;
- renderer-neutral transform convention;
- object-space sockets/anchors with normals;
- connectors that reference node/socket pairs rather than detached coordinates;
- curves/splines and explicit occlusion/depth intent;
- camera/animation projection metadata where needed;
- deterministic projection signature for renderer parity;
- reduced-motion, low-power and static fallbacks;
- canonical identity refs back to trace/entity/occurrence objects.

Arithmetic truth stays in canonical traces/engines. Scene objects resolve values through identity refs and do not duplicate numeric truth.

## 5. Journey substrate

A Journey is semantic traversal state, not a saved camera-coordinate graph.

Journey v1 must preserve:

- root / subject identity;
- current semantic selection/focus;
- source projection/domain;
- target semantic identity;
- transition intent (enter / inspect / traverse / return / deepen);
- Research Context continuity;
- exact return reference;
- truth/provenance continuity;
- renderer/depth preference as projection state only;
- accessibility/reduced-motion equivalent.

Camera position, path interpolation and layout are disposable projection state. Reopening a Journey must reconstruct the semantic location from canonical identities rather than requiring old coordinates.

## 6. Depth + width traversal

The system must support both:

**Depth**
- number → expression;
- expression → method;
- method → word;
- word → letter;
- letter → representation/miluy/anatomy;
- letter/word → source/provenance;
- ELS result → exact Torah occurrence/path.

**Width**
- letter ↔ adjacent letter;
- word ↔ word;
- method ↔ method;
- result ↔ convergence;
- phrase/number ↔ related passage/source;
- Gematria object ↔ ELS/Torah object where a canonical relation exists.

A transition between domains is a Context/Journey transition over existing identities, not duplication of those identities.

## 7. Gematria ↔ Torah / ELS bridge

The first bridge must prove that a Journey can leave a Gematria scene and enter canonical Torah/ELS space without creating a second letter corpus.

Required flow shape:

`Number/Phrase → canonical method/trace → semantic letter/word target → canonical ELS capability/result bundle or Torah occurrence identity → exact verse/window/path → continue Journey → exact return`

Requirements:

- reuse the one canonical ELS engine/boundary;
- reuse stable Torah occurrence identity / corpus index from the existing ELS/Torah adapter;
- no second Torah-letter table/store merely for 3D;
- ELS path and source locator remain provenance;
- 3D coordinates for Torah letters are generated projection state;
- large Torah views use batching/atlases/LOD; do not create one heavy mesh/component per corpus letter.

## 8. Web / video / Blender parity

Site and video are two renderers of the same semantic scene/Journey, not two visual grammars.

**Web:** interactive S0–S4 projection; R3F/WebGL only on explicit rich depth.  
**Blender:** imports/reconstructs the same `scene.v1` + asset refs for cinematic rendering.  
**Video:** composites/render outputs from the same scene and Journey timeline; it must not re-author Mistater/Milui semantics independently.

Parity means semantic/topology/transform/socket/camera-timeline identity within defined tolerance, not pixel-identical Web vs Blender output.

GLB/.blend/video files are derived artifacts, never semantic SSOT.

## 9. Current implementation evidence — exact state

As of 2026-10-02:

- `scene.v1` M0 hardened: **BRANCH-ONLY · PASS**, head `9e9eafab1ca87f7cd3f4a5e1c21ac64ad91d56cb`.
- M1 true Web 3D / R3F Mistater projection: **BRANCH-ONLY · PASS**, head `726d01caa8f18d2edb5398c77027db72f4bd486f`.
- M1 evidence includes lazy S4 loading, one `scene.v1`, true meshes/tube connectors, parent TRS, socket normals, orbit/touch interaction, fallback behavior and bundle separation.
- Neither M0 nor M1 is MERGED / DEPLOYED / LIVE by this document.
- Live main at scope creation: `23b2a223005a1db8d4e4d9c00749264fc6a02636`.

## 10. Dependency-ordered implementation lane

### JF-0 — Program mapping
This scope + Roadmap/Master pointers. No runtime effect.

### M0 — Unified scene.v1
Status: branch-only PASS. One renderer-independent Mistater scene with sockets/connectors and deterministic projection identity.

### M1 — True Web 3D
Status: branch-only PASS. R3F/Three.js consumes the same scene.v1 behind explicit S4 depth; S0–S2 remain truthful fallback/default.

### M2 — Blender bridge
Next dependency. Build a deterministic importer/reconstructor:

`scene.v1 + asset refs → Blender scene`

Acceptance:
- same scene id/signature;
- same node hierarchy;
- socket world positions parity within tolerance;
- same connector endpoints/curve intent;
- same glyph identity refs;
- camera rig/timeline consumes shared projection metadata where defined.

### M3 — Canonical Hebrew Glyph Asset Root
Establish the reusable Hebrew vector/glyph root and derived 3D asset pipeline. Prove at least one real Golden letter family end-to-end before mass production; then cover the full Hebrew set and finals with automated identity/asset checks.

### J1 — Journey Contract v1 implementation
Extend `research_workspace_law v5` semantics in runtime: semantic focus/transition/exact-return over the existing Research Context. No coordinate store.

### J2 — First Gematria Journey Golden
A real interactive path through Number/Phrase → method → word/letter → result/convergence → exact return, using the unified scene and shared glyph identity.

### J3 — Gematria ↔ Torah/ELS Golden bridge
Use a real canonical ELS/Torah fixture from the existing engine/occurrence layer. Prove traversal into Torah letter space and back with source/provenance intact.

### J4 — Cinematic Journey projection
Blender/video consumes the same scene + Journey semantics to produce a short real cinematic sequence. The Ofek Adank / 1237 material can become a consumer after the substrate passes, not the owner of the substrate.

### G4 acceptance
Promote only after a real/replayable Journey passes end-to-end truth, exact-return, performance, fallback, accessibility and source-provenance acceptance.

## 11. What belongs later

This transition lane closes the substrate only. Broad capability activation remains later:

- massive multi-world cinematic environments;
- full Torah universe visual polish;
- broad premium spatial access;
- advanced particle/shader systems;
- WebGPU compute where justified;
- AR/VR;
- large Journey authoring ecosystem;
- broad multimodal/voice overlays.

These do not block the minimum Journey/Spatial foundation.

## 12. Acceptance gates

A Journey/Spatial foundation slice cannot be called complete unless:

1. one semantic identity survives 2D/Web3D/Blender projection;
2. connectors remain attached through parent transforms and camera changes;
3. same `scene.v1` topology/signature is consumed by site and cinematic importer;
4. same Hebrew glyph identity is used across Web/ELS/video asset derivations;
5. Gematria values come only from canonical engine/trace;
6. ELS/Torah path uses canonical callable engine + canonical occurrence/source identity;
7. exact return restores the semantic location, not merely a URL approximation;
8. reduced-motion/low-power/no-WebGL fallbacks preserve truth and actions;
9. large-corpus rendering obeys batching/LOD performance law;
10. no parallel Journey, ELS, Scene, Glyph or Gematria truth system is introduced;
11. Human Gate remains required for publication/canonicalization and major cutover;
12. release language remains exact: DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED.

## 13. Immediate priority

The next build dependency is **M2 Blender bridge**, followed by **M3 canonical Hebrew glyph asset root**, then **J1/J2/J3** until ZURIEL can use one real end-to-end Journey.

Public-content work may continue in parallel when it does not share an active writer/scope. The purpose of this lane is to make the core experience visible soon enough to guide the large body of material that must be published, without forcing every publication to wait for the final spatial universe.
