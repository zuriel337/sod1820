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
- The site-wide construction message describes the whole site, not only the Heichal.
- Never hard-code a lens label. Read it from `STREAMS`: `kingdom = כי לה׳ המלוכה`, `reality = קוד המציאות`.
- Before broad UI/copy changes, read `SOD1820_MASTER_ROADMAP.md` and current canonical sources.

## Build-map law
- Do not invent one engineering completion percentage.
- Public progress is expressed by named tracks and stages.
- Each track must explain in ordinary Hebrew what the visitor will actually receive.
- Internal names such as Raziel or One Tree must always be accompanied by a plain-language explanation.

## Home / internal-footer ownership law
- **Home owns the primary Cosmic Gateway and the full-strength construction/future story.** The home experience may combine brand, current build state, “what is being built now”, and future gateways such as Family Tree and future spatial/3D journeys.
- **Internal pages own the compact Royal-Cosmic System Signature footer.** It reminds the visitor that the current page belongs to a larger living system, but it must not repeat the Home hero at full strength.
- Do not duplicate the same large build percentage / future-roadmap / cosmic hero narrative at both the top of Home and the bottom of Home. Home may use a reduced footer containing navigation, social/WhatsApp, community/about/privacy and other compact meta links.
- Internal-page Footer is Tier A by default. Home Cosmic Gateway is Tier B by default and may use a **bounded Tier C progressive enhancement** only when the spatial scene itself adds product meaning and has a Tier A/B fallback.
- Home is a gateway into the same Research Reality, not a decorative fake universe. If it previews real entities/relations, keep the initial semantic payload deliberately small and read-only; never load the full graph into the hero.
- Future labels such as `עץ המשפחה`, `מסעות בתוך הצופן · תלת־ממד`, and `מסעות בתוך הרמזים · תלת־ממד` may be shown as `בקרוב` only when their future/not-yet-live state is explicit. Visual prominence must not imply implementation or release.
- This visual ownership rule does not change product priority: the Universal Explorer/World foundations remain upstream; richer Spatial/3D is a later projection per the Master Roadmap.

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
