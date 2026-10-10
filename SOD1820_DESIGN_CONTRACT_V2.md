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
- **☾ Night** — deep navy spatial environment.

These are three projections of the same semantic roles, not three design systems.

Legacy binary consumers may continue to read light/dark. Parchment projects as light to Legacy compatibility. New 2029 UI reads the full preset.

## 3. 2029 color identity
Primary identity colors:
- **Royal blue** — structure, primary action, active state (ZURIEL-approved refinement · 10.10.2026).
- **Violet** — depth, secondary focus, spatial glow.
- **Cyan** — discovery, focus, live research affordance.

Warm gold/brown is permitted as a restrained Parchment/environment accent and protected brand-artwork exception. It is **not** the default 2029 control/accent color.

Semantic roles, not literal colors, are consumed by components:
canvas/page, surface, surfaceSoft, surfaceRaised, textPrimary, textSecondary, accentPrimary, accentSecondary, accentDiscovery, focusRing, border, borderStrong, onAccent, building/success/warning/danger/info.

No new 2029 component hard-codes a local hex/RGBA for a canonical control/status role.

## 4. Preset reference
### Modern Day
Background #F4F7FC · Surface #FFFFFF · Primary #315DD5 · Action text #2454B8 · Secondary #7249A5 · Discovery #086C70 · Text #172B46.

### Parchment
Background #F4EDDE · Surface #FFF9EE · Primary #315DD5 · Action text #284E9F · Secondary #764B87 · Discovery #176965 · Text #312B23.

### Night
Background #080F1C · Surface #122036 · Primary #315DD5 · Action text #A8C7FF · Secondary #C2A8FA · Discovery #69DED7 · Text #F1F5FC.

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

These roles appear in backgrounds, ambient fields, protected logo moments, spatial transitions and bounded identity ornament. Under ZURIEL's 10.10.2026 refinement, compact content-intro impressions and large Signature icon frames/depth layers share the Crown's gold and sapphire family. Foreground glyphs retain their capability color. These roles must not become the default button/label/status colors and must never imply truth, verification or epistemic importance.

The full approved lockup is the visual reference, resolved only through
`brandAssets2029.js`. Its source SHA-256 is
`3f8a2a2fdc0a5a141d10b63bc633eefbd9ba2bfe7dbf7521f3984c21830dcd18`.
The raster contains highlights, shadows and gradients, not a single flat brand
color. Representative opaque source pixels selected for this projection are
gold `#F9BA3F` and sapphire `#1957D9`; these are design reference samples, not a
replacement Brand artwork specification. `palette.js` owns all runtime values:
Night gold `#F9BA3F`, Day gold `#875E13`, Parchment gold `#80570E`; sapphire
`#1957D9` supplies atmosphere/depth in all presets. Day/Parchment gold is a
contrast-adapted derivative rather than a claim of exact pixel matching.
The approved full lockup, asset path and wordmark remain unchanged. Do not crop
out the Crown or introduce per-page brand palettes. Thin ornament is decorative;
meaningful labels and controls must use readable semantic text/focus roles.

UI color and Brand artwork identity remain distinct semantic layers: Royal blue/Violet/Cyan own ordinary 2029 interaction; Sapphire/Gold enter when the experience intentionally calls for a Brand moment.

## 8. Density and simplicity
Because SOD1820 carries dense information:
- one primary focus per view;
- progressive disclosure over simultaneous panels;
- compact navigation may use icon-only projection when labels remain accessible;
- no duplicate Page Map / Context / Workspace information;
- decoration yields to reading;
- empty/rest states remain useful but quiet.

Global Chrome placement and mobile projection are locked in §11. Desktop Adaptive Dual Rail depth/choreography continues in the same System Frame owner.

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

User-directed refinement, 9 October 2026: the shared page title strip stays narrow
on desktop and mobile, including Home and Journey. Its 44px identity uses the same
SVG family as navigation; retained decorative rings fit inside the small identity
area and do not orbit continuously. Title and lead remain live, wrap naturally,
and have no fixed height or truncation. A meaningful media/spatial Hero may still
appear in the page content under the existing media and provenance rules below.
Hover, keyboard focus and press/release use bounded feedback, with both motion
preferences respected. Large Signature icons reuse the same geometry with CSS
depth; no GPU renderer is needed for ordinary interface icons.

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

## 11. Global Chrome / Mobile Projection

Global Chrome is owned by the existing System Frame. No page creates its own topbar, global navigation drawer or mobile chrome owner.

### 11.1 Mobile topbar
The persistent mobile topbar is intentionally minimal:
- inline-start / RTL right: one global navigation trigger;
- center: current surface identity (`SOD1820 / surface`) without deep subject breadcrumb;
- inline-end / RTL left: Search and My Workspace only.

Exact Return and Issue Report remain available but do not occupy permanent mobile topbar space; they project into the mobile navigation sheet or contextual surfaces.

Minimum control target remains 44×44px. The mobile topbar target height is approximately 56–60px.

### 11.2 Mobile navigation sheet
The sheet is the mobile projection of the same global navigation tree used by desktop.
Rows use icon + live label. It is not a feed and does not add arbitrary thumbnails.
Secondary utilities may include Exact Return, My Workspace and Issue Report.

Theme control is now wired directly to the existing canonical `themeMode.js` store and may appear in Global Chrome as `יום | קלף | לילה`. Language control remains deferred until its canonical control is wired. Fake or locally-owned controls are forbidden.

### 11.3 Page Map relationship
The floating Page Map stays separate from Global Navigation:
- Global Chrome answers **where can I go in the product?**
- Page Map answers **where am I inside this surface?**

On mobile the Page Map should use a compact one-row projection and a thin progress indicator so Header + Page Map do not consume the first viewport.

### 11.4 Motion
Chrome motion is choreography, not decoration:
- immediate control response;
- bounded 180–420ms rail/sheet reveal;
- slow ambient Brand motion may continue independently;
- reduced-motion disables nonessential transitions/animations.

### 11.5 Brand lockup placement
The full approved Crown + Hebrew wordmark lockup may appear only in deliberate identity moments of Global Chrome:
- the persistent desktop Topbar owns the single visible full Brand lockup for ordinary desktop product views;
- the mobile Navigation Sheet may show the full lockup as its bounded identity moment;
- Home / approved media-Hero identity moments may use the lockup when composition allows without competing with Global Chrome.

The desktop Right Global Rail does **not** repeat a second full lockup. Its expanded top is a quiet functional navigation identity/header using live UI typography plus restrained Brand Atmosphere only. When the rail collapses, the header contracts to a neutral Home/navigation affordance. Crown-only projection remains forbidden.

The lockup is consumed through one centralized Brand asset pointer. Page-local logo URLs, crops and redraws are forbidden.

### 11.6 Theme tuning
The three user presets are live product controls now:
- יום → `light`
- קלף → `parchment`
- לילה → `dark`

The selector consumes the existing theme store and existing Design V2 palette owner. Changing colors later edits semantic palette roles at the owner, never per-page theme CSS.

The Bottom Command Island remains a separate Path/Action owner and is not redesigned by this contract section.
### 11.7 Final Global Chrome V1
Desktop Global Chrome is one persistent System Frame composition:
- **Right Global Rail:** sticky for the full viewport; expanded and collapsed states animate through one owner.
- **Topbar:** compact full Brand lockup, current surface identity, one Search / Command pill, contextual utility icons, and My Workspace projected as the authenticated user avatar.
- **Mobile:** the same navigation tree projects into the Navigation Sheet; the persistent topbar stays minimal.

Right Global Rail naming is canonical:
- בית
- העולם
- היכל
- פוסטים
- מסעות
- קהילה
- דף המספר
- ספרים ומקורות
- ELS

`דף המספר` is the canonical global label. Generic `מספרים` is not a Global Navigation label.
Because the live route is `/2029/number/:value`, selecting `דף המספר` without a value opens the canonical Search / Command projection rather than inventing a fake root route.

Desktop Brand hierarchy is singular: the Topbar owns the persistent full approved Brand lockup. The expanded Right Global Rail must not repeat it; its top is a quieter functional navigation header with restrained Brand Atmosphere. The collapsed rail uses a neutral Home/navigation affordance and must never create a crown-only logo.

Global rail expansion preference may persist locally as a presentation preference. This does not create a new navigation store or product-truth state.
## 12. Acceptance
A 2029 visual-foundation change must prove:
1. same semantics in all three presets;
2. no horizontal overflow at release mobile widths;
3. readable Hebrew and focus states;
4. reduced-motion compatibility;
5. no truth/status meaning encoded only by decoration;
6. Legacy routes are not mass-restyled accidentally;
7. no new palette/theme store or page-local color owner.

## Navigation icon family — approved 8.10.2026

Global navigation and the research action island consume `NavigationIcon2029` as their shared decorative SVG projection. Controls retain their existing accessible names, labels, routes and owners. Icons use a 24×24 viewBox, 1.8px rounded strokes and semantic currentColor; minimum touch targets remain 44×44px. Home, globe, simplified gateway, document, 123, open book, journey, people, search, clock, tools, action and return share consistent geometry. ELS uses a 3×3 matrix with the three diagonal cells highlighted; no microscopic letter text. User avatars and Raziel keep their canonical identity components.

Ordinary icons use theme text; selected controls consume the canonical accent. Sapphire/gold remain Brand atmosphere. Motion is bounded interaction feedback (180ms press/hover; a finite 320ms pointer pulse that also works on touch; ELS diagonal response up to 480ms), with no permanent loop. Both operating-system and frame reduced-motion preferences disable decorative motion. Mobile navigation retains visible live labels; collapsed desktop retains accessible names/tooltips.

### Compact research introduction implementation
World, Heichal, Topic, Books, ELS and Calculator use the shared compact System Frame intro (explicit none remains none). Existing copy stays live and unchanged. A 44px identity tile consumes the navigation SVG family beside a 24–30px heading; no orbit/rings, fixed height, truncation or large decorative media. Content follows directly. Day/Parchment/Night consume semantic panel/text/accent roles. One-shot entry (280ms copy, 420ms icon, 620ms fading edge light) honors both reduced-motion preferences. Home, story media and Journey retain their separate approved Hero behavior. The topbar preserves orientation when the intro scrolls away.

### Number method learning and Spatial M3 continuation — implementation projection

Branch implementation, 9.10.2026; extends the existing Experience/Method Registry/engine owners and `spatial_research_runtime_vision_v1`. The M0–M3 lineage through `ce4858a2` is reconciled with current main. Its historical V1 addendum remains provenance; V2 controls palette, typography, icons and motion. This section does not activate a new method or publish an engine/source definition.

- Number page and contextual Number drawer use the same inspector, method list and trace presentation adapter. Learn explains the current expression using the existing registry definition, engine-supplied steps, component dependencies and separately labelled interpretation. Number entry orientation uses the existing Learn runtime.
- Letter/substitution ledgers, adjacent differences, cumulative prefixes (per-word and full phrase, including reverse order), position weights and composite traces have explicit presentations. Composite component order and identity are preserved. Missing values remain missing; zero is displayed only when supplied. Context-required methods never expose an unactivated numeric result.
- A verified result alone is insufficient for step rendering: expression, method, verification and the required step shape must agree. Unknown or incomplete shapes keep an explicit fallback. Presentation never invents a numeric intermediate, result, source attribution or method identity.
- Milui variants share the existing Letter Anatomy projection. Current spelling metadata, including illustrative second-level spelling, remains `ui_transitional_unverified`: numeric parity does not confer spelling authority. A future canonical spelling field requires the existing engine/Registry owner; this implementation makes no live RPC or formula change.
- The bounded 2D method stage and existing lazy S4 renderer consume the same 27 M3 vector assets. Codepoints remain identity; geometry remains representation. The manifest's `SOURCE_GAP` source gate remains unchanged. Selection of this implementation lineage does not silently approve a new canonical font or logo.
- `NavigationIcon2029` owns shared vector geometry. ResearchIcon is a compatibility wrapper; SignatureResearchIcon adds bounded CSS depth from the same geometry. Existing navigation silhouettes remain intact. No independent large-icon drawing set or perpetual decorative animation.
- Default explanation remains S2; the inherited Mistater S4 action is explicit and lazy, uses the same scene/sockets/trace and returns to the static view on failure. Both reduced-motion settings apply. General method coverage does not imply every method has a GPU renderer. Corpus-wide ELS SVG/atlas work remains separate and requires measured performance; no per-letter Torah DOM rollout.
- Acceptance covers real engine trace shapes, contextual/null/stale negatives, method switching, desktop/mobile, all three presets, reduced motion, SVG lineage and the lazy S4/fallback boundary. A local tested branch is not a merged or live release.

### Shared content color/action projection — 10 October 2026

User-approved color-role mapping extends the same V2 palette: Day/Night borders
become less chromatic; primary numeric identity remains indigo, discovery uses
its existing cyan (warm discovery in Parchment), and spatial Signature icons use
secondary violet. Shared content actions use the same NavigationIcon2029 geometry:
share, copy, save, check and add. Social channel marks retain CHANNELS brand identity.
V2 successText/dangerText live in palette.js; success color requires a successful
copy or save outcome, with text and accessible status retained. Save state denotes
an item in the existing research library, not publication or cloud-sync completion.
The original ShareActions and ResearchProvider remain behavior owners. Legacy
QuickActions/DocActions are not silently replaced by this bounded 2029 projection.


## Royal color and shared press refinement · 10.10.2026

ZURIEL approved the reviewed royal-color direction and requested touch feedback in bars.
EXTEND_EXISTING: this updates V2 references, not Brand artwork or a second palette.
Primary fills use royal blue with onAccent white; action text uses the separate
accentText role for contrast. Default button gradients stay within blue, never
ending in violet. Violet is reserved for spatial depth/secondary focus. Discovery
and share use cyan/teal in all three presets, including Parchment. Gold/champagne
remains restrained identity ornament (including a thin content-intro impression),
never a verification signal or the default control color. Lab alters surfaces
while preserving these control meanings. Legacy palette values remain unchanged.

Shared SVG-bearing controls respond to pointer pressure and keyboard focus.
Feedback is finite, transform/opacity based, does not intercept navigation or
scrolling, and respects both OS and frame reduced-motion preferences. Disabled
controls do not move. Shared icon feedback must not require a second global
listener, navigation store, or animation engine. Whole-frame layout, palette
context propagation and command-island typography remain with the existing
SystemFrame owner; this refinement does not claim those gaps closed.
