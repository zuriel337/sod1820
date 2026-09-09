# SOD1820 — W0.5 Visual Foundation 2027 · Slice 1

Status: IMPLEMENTED ON BRANCH · NOT MERGED · NOT DEPLOYED · NOT LIVE

## 1. Scope and owner

W0.5 executes the Roadmap gate that must precede the Adaptive Shell. It extends the existing visual owner `SOD1820_DESIGN_CONTRACT_V1.md`; it does not create a parallel Design System, palette, theme store, component registry or shell.

OWNER CHECK: `EXTEND_EXISTING`.

Canonical dependency tree:

- visual/product language → `SOD1820_DESIGN_CONTRACT_V1.md`;
- content/control semantic colors → `canonical_colors_law` + `src/lib/palette.js`;
- global chrome colors → `src/lib/chromeTheme.js`;
- world/domain semantic colors → `src/lib/worlds.js`;
- typography aliases/legacy compatibility → `src/theme.js` (`F`, `T`);
- reusable shared components → `canonical_ui_components_law`;
- responsive release acceptance → `mobile_acceptance_law`;
- Raziel semantics → `raziel_companion_layer_law`; System Frame owns later placement/invocation;
- contextual environment / required visual asset semantics → additive W0.5 extension `docs/w0-5-visual-environment-and-asset-gate-v1.md` under this same Design owner;
- spatial/depth rendering semantics → canonical DB owner `spatial_gematria_law v3` (`lowest_sufficient_tier`, One Tree); W0.5 consumes its projection boundary and does not create a second spatial system;
- W1 Adaptive Shell remains out of scope until this foundation gate closes.

## 2. Visual Foundation 2027 decisions

### 2.1 Color

Keep one semantic theme tree. Components request semantic roles; surfaces do not invent local palettes. Gold remains brand language, not truth rank. Blue remains the internal research/admin interaction reference. Success/warning/danger/info/building carry stable semantic status meaning. World colors remain classification semantics and cannot be reused casually as generic UI accents.

Dark/light/lab are projections over shared semantic roles, not different products. W0.5 does not authorize a repository-wide restyle of legacy surfaces.

### 2.2 Typography

Use `F.ui`, `F.body`, `F.display`, `F.numeric` as the semantic font roles already defined by the Design Contract. New/redesigned surfaces use the 2027 type scale from `src/lib/designTokens.js`; legacy aliases remain compatibility-only.

Reading defaults target 16px body text with generous Hebrew line-height. Display typography is rare and must not replace hierarchy with oversized decoration.

### 2.3 Spacing and radius

Use a bounded 4px-based spacing scale instead of page-local arbitrary gaps. Radius is semantic and restrained: small controls/cards use small/medium radii, immersive containers may use large radii, and pills are reserved for pill semantics rather than being the default shape of every control.

### 2.4 RTL/LTR and bidirectional content

Hebrew UI uses logical flow: `start/end`, `margin-inline`, `padding-inline`, `inset-inline`, and start-aligned scanning groups. Do not fork RTL and LTR layouts unless semantics genuinely differ.

Numbers, code, URLs and mixed-script evidence may use local `dir="ltr"`/`dir="auto"` islands while the surrounding Hebrew composition remains RTL. Numeric direction must never reorder the semantic relationship between a label and its value.

### 2.5 Responsive primitives

Mobile is first-class, not compressed desktop. W0.5 preserves the existing mandatory 320/360/390px acceptance widths and introduces shared responsive bands for composition decisions. Breakpoints are projection hints, not device identities.

The later Adaptive Shell may change geometry across viewport/input/context, but it must consume this visual foundation rather than define a second responsive language.

### 2.6 Motion

Motion communicates state, hierarchy, orientation or atmosphere. It must not imply truth, verification or importance. Default interactive motion is short and restrained; ambient motion is optional and stoppable.

`prefers-reduced-motion` is a semantic branch of every new reusable motion primitive: no parallax, no required autoplay ambient motion, no essential information encoded only through animation.

### 2.7 Accessibility

Minimum interactive target: 44×44 CSS px for new/redesigned primary controls unless the control participates in an equivalent larger hit area. Focus must remain visible in dark/light/lab and cannot be removed merely for visual cleanliness.

Color alone is insufficient for status/truth/access meaning. Text/icon/shape or another non-color signal must accompany meaningful status. Content must remain usable at browser text zoom and narrow widths without horizontal page overflow.

The visual foundation must preserve semantic HTML, keyboard navigation, reading order and screen-reader names; CSS composition cannot reverse DOM semantics merely to achieve a visual arrangement.

### 2.8 Design tokens

`src/lib/designTokens.js` is an implementation extension under the existing Design Contract. It currently owns only missing cross-surface primitive families:

- spacing;
- radius;
- typography scale metrics;
- motion timing/easing/reduced-motion policy;
- responsive breakpoints/acceptance widths;
- minimum control/focus/layout metrics;
- direction-safe constants/helpers;
- finite environment-role vocabulary and visual-asset presentation states.

It explicitly does **not** own colors, fonts, chrome theme, world colors, truth/status semantics, media truth, publishing state, spatial truth, renderer authority or product capability state. Those remain with their existing owners.

### 2.9 Environment / contextual imagery

W0.5 now includes a canonical environment layer under the same Design owner. Initial roles are: `dark_observatory`, `light_celestial`, `research_lab`, `spatial_journey`.

Environment imagery is not wallpaper and not a second theme. Rich imagery may lead hero/entry moments and then recede as research density increases. The dark North Star is Observatory/Cosmos; the light North Star is Celestial Research / premium future laboratory. Both are the same product identity.

See `docs/w0-5-visual-environment-and-asset-gate-v1.md` for responsive crop, performance, fallback and truth-boundary requirements.

### 2.10 Required visual asset gate

Every experience-bearing product, Journey, major experience or major editorial/learning experience must declare a context-appropriate visual asset before presentation-complete status. This does not mean an image per atomic node/finding/row.

Covered experiences resolve one of: curated asset, generated candidate, or canonical fallback. When no bespoke asset exists, the future owning creation/publishing workflow must automatically create an asset requirement and attempt to produce/request a candidate from the canonical visual language. Generation never implies truth/canonicality/publication.

### 2.11 Gallery full-image preservation

Gallery imagery is research-bearing visual material, not decorative crop material. When a gallery image is opened in the full-screen/lightbox experience, the initial state must show the **entire source image** inside the available viewport using contain-style composition: all four edges must be visible and no automatic crop may remove source pixels.

This is especially mandatory for legacy gematria/gallery images, where numbers, labels, borders or contextual evidence may live near any edge. A portrait/tall image must not automatically switch into an initial scroll-only mode that hides part of the image. Zoom/pan/scroll may be offered as an explicit secondary interaction after the full-image view is established, but the opening state is always `FIT_WHOLE_IMAGE`.

Thumbnails/cards may still use bounded presentation rules appropriate to their surface, but any interaction described as full-screen, full-image, lightbox, inspect or enlarge must preserve the complete representation. No responsive breakpoint may silently change this invariant.

### 2.12 2029 Progressive Spatial Readiness

W0.5 adopts the active canonical `spatial_gematria_law v3` as the spatial/depth owner. The visual system is therefore **spatial-ready by construction**, but 3D is not a mandatory decoration layer.

One semantic identity may project through progressively richer representations without changing truth, route identity, Research Context, provenance or capability:

- `T0` — static 2D / fastest truthful representation;
- `T1` — responsive micro-motion and light/depth cues;
- `T2` — layered depth / CSS-SVG 2.5D-style composition;
- `T3` — richer interactive spatial projection when interaction or structure benefits from depth;
- `T4` — real WebGL/WebGPU spatial rendering only when spatial structure itself materially improves research, orientation or experience.

Canonical rule: **lowest sufficient tier wins**. A future renderer may move upward or downward according to semantic need, viewport, input mode, device capability, network/performance budget, power state and reduced-motion preference. No required information or control may exist only in T3/T4.

The same product/tool symbol must remain recognizably the same identity across small functional icon → Signature icon → spatial representation. Gematria, ELS, Books, Journey, World, Raziel and future tools must not invent separate 3D identities or parallel icon systems when they gain depth.

Spatial richness never changes truth. Depth, glow, scale, proximity, motion, particle density or camera emphasis may not imply verification, canonicality, confidence, access or importance unless a separate canonical semantic signal explicitly says so.

W0.5 itself remains lightweight: its job is to guarantee the projection seams, motion/depth vocabulary, fallbacks and identity continuity needed by future spatial renderers. It does not bulk-enable WebGL on ordinary pages.

## 3. Migration law

Foundation → Projection → Experience.

For each redesigned surface:

1. consume existing semantic colors and typography roles;
2. consume W0.5 spacing/radius/motion/responsive/accessibility primitives;
3. consume the canonical environment role where the experience calls for an environment;
4. declare the lowest sufficient spatial presentation tier under `spatial_gematria_law v3`, with a truthful lower-tier fallback;
5. migrate shared components before page-local copies;
6. preserve legacy behavior until that surface enters an explicit redesign pass;
7. no blind mass CSS replacement;
8. verify narrow-mobile, keyboard/focus, reduced-motion, dark/light behavior, spatial degradation and environment crop/fallback before release.

## 4. Explicit non-goals for Slice 1

- no Adaptive Shell build;
- no new Sidebar/Bottom Bar/Raziel placement architecture;
- no repository-wide restyle;
- no new palette/theme/media/spatial store;
- no font package installation;
- no blanket WebGL/Canvas rollout; T3/T4 implementation stays capability- and evidence-gated;
- no bulk image generation or legacy-asset replacement;
- no schema or Supabase product-data changes;
- no canonical promotion merely because branch code exists.

## 5. Closure gates still required before W0.5 can be called CLOSED

1. Reconcile `src/theme.js` typography/readability tokens with the W0.5 scale without breaking legacy aliases.
2. Reconcile `palette.js` semantic roles for control/status/focus coverage and verify dark/light/lab contrast.
3. Define one shared focus-visible primitive/CSS contract and reduced-motion base behavior.
4. Verify logical RTL/LTR primitives on representative Hebrew + number/code mixed content.
5. Verify responsive primitives at 320/360/390 and at least one tablet/desktop width on a real reference surface.
6. Apply the foundation to one bounded Golden Case/reference surface before declaring the token model sufficient.
7. Prove one real dark environment + one light counterpart on the Golden Case, with mobile-safe crop, readable dense-content fallback and reduced-motion/static fallback.
8. Demonstrate the contextual visual-asset requirement without creating a parallel media system; actual generation pipeline may land with the later owning creation/publishing workflow.
9. Run a decision-changing foundation challenge: contrast, zoom, long Hebrew labels, mixed bidi evidence, keyboard-only navigation, reduced motion, narrow viewport, light/dark/lab, rich-environment failure/fallback.
10. Re-read live main/work_log/DB before closure; Human Gate remains required for canonical/release promotion.
11. Verify the shared gallery/lightbox path opens representative landscape, portrait and legacy gematria images with `FIT_WHOLE_IMAGE` at 320/360/390 and desktop, with all four source-image edges visible before any zoom/pan interaction.
12. Verify one representative identity can degrade cleanly from Signature/depth presentation to functional/static presentation without changing label, action, semantic identity, truth/provenance meaning or keyboard accessibility.

## 6. Slice 1 verdict

`FOUNDATION IN PROGRESS`.

The owner tree is resolved and the missing cross-surface primitive families now have a bounded implementation home. The North Star now includes a governed contextual Environment Layer, required visual-asset gate for experience-bearing products/Journeys, full-image preservation for gallery research representations, and explicit 2029 Progressive Spatial Readiness consuming canonical `spatial_gematria_law v3`. This is sufficient to continue Golden Case reconciliation, but not sufficient to start the broad Adaptive Shell or to call W0.5 closed.
