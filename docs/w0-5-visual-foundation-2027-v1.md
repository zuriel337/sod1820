# SOD1820 — W0.5 Visual Foundation 2027 · Release + Closure State

Status: IMPLEMENTED · MERGED · DEPLOYED · PRODUCTION LIVE · RELEASE VERIFIED · CLOSURE IN PROGRESS

Release lineage: PR #396 → merge `1860e9d264d2e69a5786cf08920e42ad2994b69c` → Vercel Production READY on `sod1820.co.il` / `www.sod1820.co.il`.

Release evidence: `Release Visual Gate` and `Observability/SEO Build Gate` both passed against the current PR merge ref. Browser acceptance covered 320/360/390/1440, focusability, dark/light/lab projection modes, `prefers-reduced-motion`, and gallery `FIT_WHOLE_IMAGE` landscape/portrait/legacy-ratio cases. Release Visual evidence is retained by GitHub Actions artifacts.

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
- spatial/depth rendering semantics → canonical DB owner `spatial_gematria_law v4` (`lowest_sufficient_tier`, One Tree, Living Doorway); W0.5 consumes its projection boundary and does not create a second spatial system;
- W1 Adaptive Shell remains out of scope until this foundation closure set is resolved.

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

Mobile is first-class, not compressed desktop. W0.5 preserves the mandatory 320/360/390px acceptance widths and shared responsive bands for composition decisions. Breakpoints are projection hints, not device identities.

The later Adaptive Shell may change geometry across viewport/input/context, but it must consume this visual foundation rather than define a second responsive language.

### 2.6 Motion

Motion communicates state, hierarchy, orientation or atmosphere. It must not imply truth, verification or importance. Default interactive motion is short and restrained; ambient motion is optional and stoppable.

`prefers-reduced-motion` is a semantic branch of every new reusable motion primitive: no parallax, no required autoplay ambient motion, no essential information encoded only through animation.

### 2.7 Accessibility

Minimum interactive target: 44×44 CSS px for new/redesigned primary controls unless the control participates in an equivalent larger hit area. Focus must remain visible in dark/light/lab and cannot be removed merely for visual cleanliness.

Color alone is insufficient for status/truth/access meaning. Text/icon/shape or another non-color signal must accompany meaningful status. Content must remain usable at browser text zoom and narrow widths without horizontal page overflow.

The visual foundation must preserve semantic HTML, keyboard navigation, reading order and screen-reader names; CSS composition cannot reverse DOM semantics merely to achieve a visual arrangement.

### 2.8 Design tokens

`src/lib/designTokens.js` is an implementation extension under the existing Design Contract. It owns only missing cross-surface primitive families: spacing, radius, typography scale metrics, motion timing/easing/reduced-motion policy, responsive breakpoints/acceptance widths, minimum control/focus/layout metrics, direction-safe constants/helpers, and finite environment-role / visual-asset presentation states.

It explicitly does **not** own colors, fonts, chrome theme, world colors, truth/status semantics, media truth, publishing state, spatial truth, renderer authority or product capability state. Those remain with their existing owners.

### 2.9 Environment / contextual imagery

W0.5 includes a canonical environment layer under the same Design owner. Initial roles are `dark_observatory`, `light_celestial`, `research_lab`, `spatial_journey`.

Environment imagery is not wallpaper and not a second theme. Rich imagery may lead hero/entry moments and then recede as research density increases. Dark Observatory/Cosmos and light Celestial Research are projections of the same product identity.

See `docs/w0-5-visual-environment-and-asset-gate-v1.md` for responsive crop, performance, fallback and truth-boundary requirements.

### 2.10 Required visual asset gate

Every experience-bearing product, Journey, major experience or major editorial/learning experience must declare a context-appropriate visual asset before presentation-complete status. This does not mean an image per atomic node/finding/row.

Covered experiences resolve one of: curated asset, generated candidate, or canonical fallback. When no bespoke asset exists, the future owning creation/publishing workflow must automatically create an asset requirement and attempt to produce/request a candidate from the canonical visual language. Generation never implies truth/canonicality/publication.

### 2.11 Gallery full-image preservation

Gallery imagery is research-bearing visual material, not decorative crop material. Full-screen/lightbox initial state must show the **entire source image** inside the available viewport using contain-style composition: all four edges visible, no automatic crop.

This is especially mandatory for legacy gematria/gallery images, where numbers, labels, borders or contextual evidence may live near any edge. Zoom/pan/scroll may be offered as an explicit secondary interaction after the full-image view is established; the opening state is always `FIT_WHOLE_IMAGE`.

The automated Release Visual Gate now enforces this invariant against representative landscape, portrait and legacy-ratio fixtures at 320/360/390/1440.

### 2.12 2029 Progressive Spatial Readiness

W0.5 consumes active canonical `spatial_gematria_law v4` as the spatial/depth owner. The visual system is **spatial-ready by construction**, but 3D is not a mandatory decoration layer.

One semantic identity may project through progressively richer representations without changing truth, route identity, Research Context, provenance or capability:

- `T0` — static 2D / fastest truthful representation;
- `T1` — responsive micro-motion and light/depth cues;
- `T2` — layered depth / CSS-SVG 2.5D-style composition;
- `T3` — richer interactive spatial projection when interaction or structure benefits from depth;
- `T4` — real WebGL/WebGPU spatial rendering only when spatial structure itself materially improves research, orientation or experience.

Canonical rule: **lowest sufficient tier wins**. No required information or control may exist only in T3/T4.

The same product/tool symbol remains one identity across functional icon → Signature → spatial representation. Living Doorway is a destination-owned bounded preview projection under this same tree: one doorway = one dominant preview signal; representation never invents truth or leaks access-protected content.

Spatial richness never changes truth. Depth, glow, scale, proximity, motion, particle density or camera emphasis may not imply verification, canonicality, confidence, access or importance unless a separate canonical semantic signal explicitly says so.

## 3. Migration law

Foundation → Projection → Experience.

For each redesigned surface:

1. consume existing semantic colors and typography roles;
2. consume W0.5 spacing/radius/motion/responsive/accessibility primitives;
3. consume the canonical environment role where the experience calls for an environment;
4. declare the lowest sufficient spatial presentation tier under `spatial_gematria_law v4`, with a truthful lower-tier fallback;
5. migrate shared components before page-local copies;
6. preserve legacy behavior until that surface enters an explicit redesign pass;
7. no blind mass CSS replacement;
8. verify narrow-mobile, keyboard/focus, reduced-motion, dark/light behavior, spatial degradation and environment crop/fallback before release.

## 4. Explicit non-goals

- no Adaptive Shell build in W0.5;
- no new Sidebar/Bottom Bar/Raziel placement architecture;
- no repository-wide restyle;
- no new palette/theme/media/spatial store;
- no blanket WebGL/Canvas rollout;
- no bulk image generation or legacy-asset replacement;
- no schema or Supabase product-data changes merely for Visual Foundation;
- no canonical promotion merely because presentation code exists.

## 5. Closure gate ledger

Release and closure are separate. Release is already LIVE/VERIFIED; the following ledger controls whether W0.5 may be called `CLOSED` and whether W1 may begin broadly.

1. **OPEN** — reconcile `src/theme.js` typography/readability aliases with the W0.5 scale without breaking legacy aliases.
2. **OPEN** — reconcile `palette.js` semantic roles for control/status/focus coverage and verify contrast across dark/light/lab.
3. **PARTIAL** — reduced-motion behavior is implemented and browser-verified; one shared focus-visible primitive/CSS contract still needs explicit owner-level reconciliation.
4. **OPEN** — verify logical RTL/LTR primitives on representative Hebrew + number/code/URL mixed content.
5. **PASS** — real browser acceptance at 320/360/390 and desktop passed in Release Visual Gate.
6. **PASS** — Golden Case/reference surface is live and consumes the shared foundation.
7. **PASS** — dark/light/lab projections plus reduced-motion/static fallback are browser-verified on the Golden Case.
8. **PARTIAL** — contextual visual-asset requirement and fallback semantics are defined and demonstrated in Visual Foundation/Living Doorway; automatic creation/publishing workflow handoff remains later-owner work and is not a new W0.5 media system.
9. **PARTIAL** — browser gate covers focus, narrow viewport, reduced motion, dark/light/lab; dedicated challenge for contrast, browser zoom, long Hebrew labels and mixed-bidi evidence remains open.
10. **PASS** — current `main`, canonical DB, work_log and production release state re-read after release; Human Gate release authorization recorded.
11. **PASS** — Gallery `FIT_WHOLE_IMAGE` is automated at landscape/portrait/legacy-ratio × 320/360/390/1440.
12. **PASS** — the same glyph identity is demonstrated across functional icon and Signature/depth presentation, with keyboard-focusable lower-tier controls and unchanged semantic labels/actions; true spatial tiers remain progressive rather than separate identities.

### Remaining closure set

Only the decision-changing foundation gaps remain before declaring W0.5 `CLOSED`:

- typography alias reconciliation;
- palette/status/focus contrast reconciliation;
- shared focus-visible primitive closure;
- bidi representative proof;
- focused adversarial challenge for contrast/zoom/long Hebrew/mixed-bidi.

The future automatic visual-asset generation/upload workflow is owned by the relevant creation/publishing/media path and may evolve after W0.5; W0.5 only owns the presentation requirement and truthful fallback contract.

## 6. Current verdict

`RELEASED + PRODUCTION VERIFIED · FOUNDATION CLOSURE IN PROGRESS`.

The 2029 visual/spatial foundation is live and reusable. W1 should not start broad shell construction until the remaining closure set above is reconciled, but no further visual-concept expansion is required in W0.5.
