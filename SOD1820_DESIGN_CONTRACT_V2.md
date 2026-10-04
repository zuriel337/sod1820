# SOD1820 DESIGN CONTRACT V2

**Human Gate:** ZURIEL · 4.10.2026  
**Owner:** experience_governance_foundation_v1_law v8 → canonical_colors_law / canonical_ui_components_law / Brand Core  
**Verdict:** SUPERSEDE_EXISTING for the 2029 web product visual foundation. V1 remains historical/Legacy provenance.

## 1. Product goal
SOD1820 2029 is information-dense. The visual system must reduce cognitive load, not add ornament for its own sake. Foundation → Projection → Experience remains the order.

The target is one modern product that can project into three visual presets without changing product semantics, information architecture, truth, provenance, access, or navigation identity.

## 2. One theme tree
There is one canonical theme store and one semantic palette owner.

User presets:
- **☀ Modern Day** — cool, bright, contemporary.
- **📜 Parchment** — warm editorial / ancient-book atmosphere.
- **☾ Night** — deep indigo spatial environment.

These are three projections of the same semantic roles, not three design systems.

Legacy binary consumers may continue to read light/dark. Parchment projects as light to Legacy compatibility. New 2029 UI reads the full preset.

## 3. 2029 color identity
Primary identity colors:
- **Indigo** — structure, primary action, active state.
- **Violet** — depth, secondary focus, spatial glow.
- **Cyan** — discovery, focus, live research affordance.

Warm gold/brown is permitted as a restrained Parchment/environment accent and protected brand-artwork exception. It is **not** the default 2029 control/accent color.

Semantic roles, not literal colors, are consumed by components:
canvas/page, surface, surfaceSoft, surfaceRaised, textPrimary, textSecondary, accentPrimary, accentSecondary, accentDiscovery, focusRing, border, borderStrong, onAccent, building/success/warning/danger/info.

No new 2029 component hard-codes a local hex/RGBA for a canonical control/status role.

## 4. Preset reference
### Modern Day
Background #F5F8FF · Surface #FFFFFF · Primary #3949C8 · Secondary #7655E8 · Discovery #168DA5 · Text #18204A.

### Parchment
Background #F5EDDD · Surface #FFF9EC · Primary #43306E · Secondary #68418C · Warm discovery #B88A45 · Text #30251F.

### Night
Background #080D1D · Surface #10182D family · Primary #5465FF · Secondary #9B6CFF · Discovery #50D6E8 · Text #F4F5FF.

Exact component mixtures come from the palette owner; page-local copies are forbidden.

## 5. Typography V2
2029 must not use the Legacy “small old-site” visual language.

Semantic typefaces:
- **UI / controls / navigation / system headings:** Rubik.
- **Body / long-form Hebrew reading:** Noto Sans Hebrew.
- **Display / hero:** Rubik.
- **Numeric / calculation / code-like values:** IBM Plex Mono with canonical fallbacks.

No font binary is stored in the repo. Runtime loading/fallback must remain web-safe and Hebrew-capable.

Readability floor for redesigned 2029:
- micro / metadata: **14px minimum**
- ordinary UI: **16px**
- body: **18px**
- lead: **21px**
- section title: **28px target**
- focal display: **46px target**, responsive as needed
- controls remain at least 44×44px

User-meaningful text below 14px is forbidden in redesigned shared 2029 chrome. Exceptions require an explicit non-text/decorative role.

## 6. Environment is not theme
Research Lab, Journey, Heichal and future spatial contexts are environment projections over the selected preset.

Research Lab may become more blue/research-clean in any preset:
Modern Day + Lab, Parchment + Lab, Night + Lab.

An environment must never force a fourth theme or silently override the user preference unless a Human-Gate accessibility/safety reason explicitly says so.

## 7. Brand boundary
The approved canonical Crown + Hebrew wordmark remain protected artwork under Brand Core. Their blue-sapphire + gold identity is preserved.

The surrounding product UI does not inherit those colors as default control colors. Instead, the palette owner exposes three **Brand Atmosphere** roles:
- `brandSapphire` — blue-sapphire environmental/identity light;
- `brandGold` — restrained royal-gold environmental/identity accent;
- `brandGlow` — non-semantic atmospheric glow.

These roles may appear in backgrounds, ambient fields, protected logo moments, spatial transitions and rare identity ornament. They must not become the default button/label/status colors and must never imply truth, verification or epistemic importance.

UI color and Brand artwork identity remain distinct semantic layers: Indigo/Violet/Cyan own ordinary 2029 interaction; Sapphire/Gold enter when the experience intentionally calls for a Brand moment.

## 8. Density and simplicity
Because SOD1820 carries dense information:
- one primary focus per view;
- progressive disclosure over simultaneous panels;
- compact navigation may use icon-only projection when labels remain accessible;
- no duplicate Page Map / Context / Workspace information;
- decoration yields to reading;
- empty/rest states remain useful but quiet.

Exact top-bar/sidebar placement is a separate architecture decision after this foundation is visually accepted.

## 9. Migration
- 2029 migrates through shared tokens/components first.
- Legacy remains Legacy until its own redesign pass.
- `theme.js` is compatibility/Legacy; new 2029 visual semantics come from palette.js + designTokens.js.
- `chromeTheme.js` remains Legacy/global chrome owner until the future chrome architecture pass; do not create a second chrome palette.
- The existing theme store is extended, never forked.
- Research truth/calculation owners are untouched by visual migration.

## 10. Hero / Intro Projection Contract

Hero is a projection, not a new system, store or media owner.

### 10.1 Where Hero is appropriate
- **Home:** media-led Hero is allowed and preferred when there is a strong current story/image/video.
- **Post:** story/media Hero is allowed when the post has canonical media; otherwise use typographic presentation rather than inventing imagery.
- **Journey / major experience:** spatial Hero is allowed when spatial presentation materially serves the experience.
- **Number:** no generic system Hero. The number/expression itself is the focal identity.
- **World:** no large generic Hero. Use a compact Surface Intro only.
- **Heichal:** no large generic Hero. Use a compact Entry/Research intro only.
- **Topic / Books / tools:** default to compact or no Hero unless the surface has a specific approved reason.

The system must not force a large decorative Hero onto every route.

### 10.2 Canonical Hero projection types
Only three visual projection types are recognized:
- `media` — canonical image/video is the focal layer.
- `spatial` — bounded motion/depth/orbit for Journey or exceptional immersive experience.
- `typographic` — live title/lead/signals when no canonical media is appropriate.

Compact Surface Intro is not a fourth Hero type; it is ordinary System Frame orientation.

### 10.3 Canonical slots
When Hero exists, it consumes bounded slots:
- media asset reference;
- focal point / safe crop;
- eyebrow;
- live title;
- live lead;
- signals / numbers;
- one primary action;
- optional secondary action;
- optional canonical Brand lockup;
- media provenance / source identity where applicable.

Title, lead, numbers and actions remain live accessible UI. Required text is not baked into generated imagery.

### 10.4 Media and Brand ownership
Hero never invents a page-local media store or hard-coded image URL owner.
It consumes existing canonical media/provenance owners and canonical Brand assets.
If suitable media is unavailable, projection falls back to typographic/compact presentation rather than manufacturing unrelated imagery.

The protected SOD1820 Crown + Hebrew wordmark is consumed only through Brand Core. No page may substitute an arbitrary logo asset or retype/redraw the protected wordmark.

### 10.5 Motion / visual density
Spatial/orbit/particle presentation is exceptional, not default decoration.
Use at most one meaningful ambient motion focus per view.
Prefer transform/opacity motion; preserve reduced-motion behavior.
Large blur/backdrop/shadow stacks must not be multiplied merely for spectacle.

The content remains the hero of information-dense surfaces.

## 11. Acceptance
A 2029 visual-foundation change must prove:
1. same semantics in all three presets;
2. no horizontal overflow at release mobile widths;
3. readable Hebrew and focus states;
4. reduced-motion compatibility;
5. no truth/status meaning encoded only by decoration;
6. Legacy routes are not mass-restyled accidentally;
7. no new palette/theme store or page-local color owner.
