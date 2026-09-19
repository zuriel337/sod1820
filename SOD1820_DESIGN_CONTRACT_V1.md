# SOD1820 DESIGN CONTRACT V1

## Purpose
One canonical visual language for the whole product. New UI must reuse tokens instead of inventing local typography, colors, radii or component language.

This contract is forward-looking: it governs new surfaces and surfaces that enter an explicit redesign pass. It does **not** authorize a repository-wide visual migration of legacy pages.

## Immersive quality floor — minimum standard for redesigned public surfaces
SOD1820 is not a flat utility site. New or explicitly redesigned public surfaces must feel authored, spatial and alive while remaining fast, readable and truth-safe.

**Minimum visual bar (default target for redesigned public UI):**
- clear visual hierarchy: brand/context → primary purpose → action → secondary navigation;
- layered depth rather than a flat card dump: environment/background, content plane, accents, and interaction states must read as distinct layers;
- restrained motion that carries atmosphere or state (glow, orbit, fade, pulse, parallax-light), never motion for its own sake;
- meaningful gold/cosmic visual identity for public SOD1820 surfaces, using canonical theme tokens rather than page-local hex palettes;
- one intentional focal moment per major surface (hero, research object, build state, discovery axis, etc.), not ten competing bright elements;
- responsive composition must be designed for mobile first-class use, not merely stacked desktop cards;
- decorative effects must degrade gracefully under `prefers-reduced-motion`, low-power/mobile contexts and narrow viewports;
- visual richness must never imply epistemic truth, verification or importance unless an existing semantic badge/owner says so.

**What this floor forbids:**
- plain unstyled grids as the final redesigned state;
- repeated generic rectangles with equal visual weight everywhere;
- neon/brand-breaking CTAs that overpower the site palette unless their semantic role explicitly requires that color;
- generated background imagery used as a substitute for real responsive layout;
- local one-off animation systems when a shared primitive can serve the same role;
- WebGL/3D simply to make a surface look “advanced”.

### Rendering / richness tiers
These tiers describe **rendering cost and visual depth**, not product truth, access tier or feature importance.

**Tier A — Canonical Rich UI (default minimum for redesigned public surfaces)**
- HTML/CSS/SVG + theme tokens + restrained CSS motion.
- Suitable for most pages, cards, hubs, footers, navigation, onboarding and account/public surfaces.
- Target: premium, immersive feel with negligible runtime cost beyond normal DOM/CSS.

**Tier B — Dynamic Canvas / lightweight spatial layer**
- Canvas 2D / OffscreenCanvas where justified, optional low-density particles/orbits/field visualizations, still DOM-first for readable UI.
- Use when many decorative or semantic moving elements would be inefficient as DOM/SVG nodes.
- Must pause when offscreen/hidden and provide a static/reduced fallback.

**Tier C — WebGL / WebGPU spatial experience**
- GPU-rendered scenes, dense graphs/glyphs, spatial research, 3D journeys and visualizations.
- Reserved for surfaces where spatial interaction or data density is itself the product capability.
- Never required for ordinary content, settings, forms, lists, standard hubs, newsletter/follow UI, or a footer.
- Must be lazy-loaded, route-scoped, bounded, lifecycle-cleaned, and have a non-WebGL fallback for unsupported/low-power contexts.

**Tier D — XR / AR / VR**
- Future experience renderer over the same Research Reality; never a second truth or graph.
- Only after Tier C semantics/performance are proven on the target capability.

**Default rule:** use the lowest tier that fully delivers the intended experience. Visual ambition is mandatory; expensive rendering is not.

## RTL alignment / navigation law
- Hebrew/RTL text groups, navigation lists, menu groups and link stacks align to the logical start (`text-align:start`; in RTL this is the right edge).
- A grid or group of columns may be centered as a composition, but the text inside each Hebrew column remains start-aligned for scanability.
- Hero statements, brand marks, numeric focal points and intentionally symmetric visual moments may be centered.
- Do not center ordinary Hebrew link lists merely for decoration.
- On narrow mobile widths, prefer fewer columns or stacked start-aligned groups over squeezed multi-column navigation.
- Use logical CSS properties (`inset-inline-*`, `margin-inline-*`, `text-align:start/end`) rather than duplicating left/right rules when possible.

## Site chrome / pinned-header origin law
- The sticky global Navbar is part of the product viewport. It is the visual origin of page content, not an accidental layer floating above unrelated coordinates.
- Any sticky/fixed page control, drawer edge, gallery/lightbox toolbar, modal close control, anchor target or floating panel that must remain visible near the top must consume one canonical site-header offset/token; it must not guess `top: 20/66/70/72/74/...` locally.
- Normal in-flow page content continues below the sticky Navbar naturally. Additional top padding must not be added blindly just because the Navbar is sticky.
- Body-portaled overlays must make an explicit choice:
  - **chrome-aware overlay**: begins below the site header / keeps all close and primary controls below the canonical header offset;
  - **true immersive overlay**: may cover the header only when it intentionally owns the whole viewport, has a higher stacking layer, and keeps close/escape controls inside safe-area + chrome-safe bounds.
- Gallery/lightbox close controls are never allowed under the Navbar, browser safe area, or another global launcher.
- Anchor scrolling must respect the same canonical header offset via `scroll-margin-top`/`scroll-padding-top` where relevant.
- Header height/offset is one shared layout metric owned by the global layout/chrome layer; changing Navbar height requires updating the shared metric, not dozens of page-local constants.

## Typography law
- `F.ui`: navigation, controls, section titles, labels and system headings.
- `F.body`: paragraphs, explanations and long-form reading.
- `F.display`: rare brand/hero statements only.
- `F.numeric`: numbers, gematria values and code-like values only.
- Do not add literal `font-family` in new components.
- Do not use legacy aliases `F.regal/F.heading/F.royal/F.cinzel/F.mono` in new code. They remain only for backward compatibility during migration.
- The heavy Heebo heading treatment shown in the old “עדכונים אחרונים” UI is not a canonical heading style.
- Existing long-form/editorial surfaces are not mass-converted by this rule. Their reading typography is reviewed when that surface reaches redesign.

## Naming / product language law
- Public name: `היכל`, not `היכל הגילוי`.
- `דף המספר` remains the public Number/Phrase product name and `/number` remains its entry family.
- `עולם המספרים` and `עולם המספרים והגימטריה` are **not** formal future product/navigation names. They may appear only as ordinary descriptive prose when they are clearly not styled or routed as a named product/surface.
- Active navigation/build-map labels for the numeric family should use neutral descriptive wording such as `מספרים` / `מספרים וגימטריה` unless Human Gate explicitly renames the product later.
- Historical/archived references are preserved as provenance; they never override the current public product vocabulary. Before adding or restoring a public label, search the current Roadmap + this section for superseded names instead of copying text from older maps/contracts.
- The site-wide construction message describes the whole site, not only the Heichal.
- Never hard-code a lens label. Read it from `STREAMS`: `kingdom = כי לה׳ המלוכה`, `reality = קוד המציאות`.
- Before broad UI/copy changes, read `SOD1820_MASTER_ROADMAP.md` and current canonical sources.

## Build-map law
- Do not invent one engineering completion percentage.
- Public progress is expressed by named tracks and stages.
- Each track must explain in ordinary Hebrew what the visitor will actually receive.
- Internal names such as Raziel or One Tree must always be accompanied by a plain-language explanation.

## Background law
- Background image/environment and decorative text are separate layers.
- The canonical dark environment may use the existing city/cosmic background (`SpaceBackground`); a page must not add decorative Hebrew letters, verses or “matrix rain” merely as wallpaper.
- Reuse the existing light-city background primitive where applicable; do not copy the same `/city-bg.jpg` filter recipe into new surfaces.
- Letters are welcome where they carry product meaning: an ELS matrix, source text, calculation, visualization or research interaction.
- Decorative verse/letter overlays are not part of the default forward design language.
- A redesigned surface must state its background choice explicitly rather than inheriting an accidental legacy layer.

## Truth-safe visual language
- Visual prominence must not silently imply truth rank.
- `published`, `verified`, `canonical`, `personal`, `research`, `candidate` and `coming soon` are distinct meanings and must not be collapsed into one visual badge.
- Personal/unverified material must be visibly distinguishable from system/verified material without being treated as false or hidden.
- Existing canonical badges/components remain the owner of their semantics; do not invent local substitutes.

## Component law
- Reuse theme tokens and canonical components.
- Desktop/mobile behavior must be explicit.
- Global banners/tickers are exceptional; construction status belongs in the home build-map.
- New visual primitives should be added to the theme/design system before being copied across pages.
- Any Tier B/C visual primitive intended for reuse across more than one surface must have one shared owner/component and one lifecycle/performance policy; do not duplicate animation/render loops per page.

## Long-running task feedback law

**Human Gate:** ZURIEL · 19.9.2026  
**Owner routing:** `experience_governance_foundation_v1_law` → `canonical_ui_components_law`  
**Canonical primitive:** `src/components/CanonicalProgress.jsx`

A user-facing operation that takes perceptible time must have a living presence. SOD1820 must never leave the user staring at a dead screen, a frozen button or an unexplained spinner while real work continues.

- **One canonical progress presence.** New/2029 surfaces consume `CanonicalProgress` directly or through a canonical wrapper such as `FrameState(kind="loading")`. Do not create ELSProgress, BookSpinner, AIThinkingBar, ResearchLoader or another parallel progress component.
- **No fake percentage.** A percentage may appear only when the engine/workflow supplies real `progress` or real `current/total`. Elapsed time is never converted into invented completion. Unknown work stays explicitly indeterminate.
- **No fake ETA.** Do not guess “עוד 10 שניות”. An ETA may be shown only when an owning runtime supplies a real estimate, and it must be presented as an estimate rather than a promise.
- **Show what is happening.** After a wait becomes meaningful, the progress presence may expand to named operational phases such as “קורא מקורות”, “בודק מטריצה”, “מחבר ממצאים” or “מכין תצוגה”. These labels must come from known workflow/engine stages or truthful projection state.
- **Operational stages ≠ model chain-of-thought.** “מה קורה עכשיו” exposes safe, user-relevant workflow facts. It never exposes hidden reasoning, private scratchpad, internal prompts or model chain-of-thought.
- **Long wait becomes useful time.** An operation expected to be long, or one that remains active past the long-wait threshold, may open a contextual “בינתיים” layer: already-completed partial results, source/context cards, a short explanation of the method, or safe navigation/actions. Waiting content is explicitly contextual and must never masquerade as the still-pending result.
- **ELS / deep research / batch work requirement.** ELS scans, deep graph/research scans, large source processing, media/OCR ingestion and other knowingly expensive workflows must expose domain-safe phase events to the canonical progress primitive when their runtime is implemented. A generic spinner is not the target state for these workflows.
- **Background/minimize/cancel are capability-dependent.** Offer “הקטן והמשך ברקע” or Cancel only when the owning job/runtime really supports persistence/cancellation. UI copy may not promise background work that would stop on navigation.
- **Stable geometry is mandatory.** Loading → ready transitions reserve enough layout space to avoid unnecessary CLS. Do not insert/remove a transient loading row in a way that pushes already-painted content. Prefer a stable slot whose copy/state changes.
- **Accessibility is semantic, not decorative.** Use `aria-busy`, polite live status, a real `progressbar` when applicable, keyboard-safe controls and `prefers-reduced-motion`. Motion cannot be the only indication of progress.
- **One semantic component, localization-ready copy.** Visible waiting copy may be injected/adapted through the existing `content_translation_law` path; locale never forks the progress component or changes operational truth.
- **Truth remains unchanged.** A beautiful/active waiting experience does not upgrade a Finding, Claim, Evidence or result. Partial/contextual material remains visibly separate from the pending answer.
- **Migration rule.** This is forward law for 2029/new/redesigned surfaces. Legacy loaders migrate when their owning surface enters an explicit redesign or when the loader itself is being materially changed; no blind repository-wide replacement.

**Default timing behavior of the canonical primitive:** ordinary presence immediately occupies its reserved geometry; after ~3s it may explain the live phase/stages; after ~12s it may expose the long-wait companion. A domain that already knows an operation is expensive may request the long form from the start. These thresholds tune presentation only; they never fabricate operational state.

## Existing-capability discovery law
Before adding a new cross-surface Experience capability, verify whether a canonical or scoped-canonical primitive already exists and extend it instead of rebuilding it.

Known owners to check first:
- day/night state: `src/lib/themeMode.js`
- route-aware theme support: `src/lib/lightRoutes.js`
- semantic page palettes: `src/lib/palette.js`
- Navbar/Footer chrome theme: `src/lib/chromeTheme.js`
- world/domain colors: `src/lib/worlds.js`
- sharing: `ShareActions` + `src/lib/share.js`
- research actions/context: existing `QuickActions`, Research event bus and `ResearchProvider`
- number detail drawer: `NumberDrawer` + `src/lib/numberDrawer.js`
- verification semantics: `VerifiedBadge`
- waiting/progress presence: `CanonicalProgress` (real progress only; indeterminate otherwise; safe operational phases; long-wait companion)
- ELS: `TzofenEmbed` → `public/tzofen.html` / `tools/els` — one engine, many projections
- SEO / OG: existing `src/lib/seo.js`, `api/card.js`, `api/og.js`
- site/maintenance gating: existing site-flags / `MaintenanceLock` path

A component name appearing in an older governance document is not proof that the component is implemented or mounted. Live code + mount path remain authoritative for implementation status.

## Admin / Command theme law
- `/admin` is one internal product surface, not a dark-gold shell containing unrelated light islands.
- The whole admin surface must participate in the existing canonical light/dark theme flow; do not create an Admin-only theme store or second palette.
- Admin chrome — KPI tiles, group tabs, subtabs, control cards and Command Room shell — must derive from the existing admin/theme owner and semantic roles: background, surface, ink, muted, accent, border, success, warning and danger.
- Legacy variable names such as `--adm-gold*` may remain temporarily as compatibility aliases, but their names do not authorize gold as the default color for every control.
- The **light-blue / blue language already used by Command Room is the internal visual reference accent** for redesigned admin/research interaction. Gold is a restrained brand accent, not a truth or importance signal.
- Green = success/approved, red = error/rejected/danger, amber = waiting/attention. Metric categories may use a distinct color only when the color carries stable meaning.
- Visual prominence never changes truth/governance rank. HOT/important/selected UI must not look “truer” merely because it is brighter.
- `AdminPage` remains the owner of the legacy `--adm-*` compatibility variables; `/admin` joins the canonical route-aware theme flow through `lightRoutes.js`.
- Transitional CSS bridges are allowed only to migrate legacy inline colors by consuming the existing variables; they must not redeclare a competing admin palette.

## Reference surfaces
Reference surfaces are examples for **new work**, not commands to restyle every legacy page immediately.

| Surface | Status | Background | Typography | Product role | Notes |
| --- | --- | --- | --- | --- | --- |
| Home | Reference Surface #1 | canonical city/cosmic environment, no decorative letter wallpaper | `F.ui` + `F.body` roles | public entry + build map | establishes the forward visual direction |
| `/codes` | Reference Surface #2 | canonical environment; ELS letters only when they are meaningful content | `F.ui` + `F.body` roles | gateway to discover / search / research in the ELS world | published, community and personal-unverified lenses remain truth-distinct |
| `/admin` | Internal Reference Surface | theme-aware research/admin environment | semantic admin/research roles | human command + operations | Command Room light-blue language is the forward accent reference; one coherent light/dark shell |
| `/codes/:slug` | Next reference candidate | TBD in its redesign pass | forward roles | single research-object / cipher surface | do not redesign implicitly as part of the library page |
| Legacy surfaces | Transitional | existing behavior until their workstream reaches redesign | existing | preserved capability | no blind migration |

## Migration
Existing components are migrated gradually. A repository-wide audit should classify legacy font usage before mass replacement; no blind search/replace.

Forward rule: **new / redesigned surfaces use the current canonical Design Contract; legacy surfaces migrate only when their workstream reaches redesign.**