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

## Semantic acceptance seam
- Replaceable 2029 presentation is **not** an acceptance contract. Local CSS class names, card geometry, grid placement and page-local component names may change without implying capability loss.
- Browser/CI acceptance for replaceable 2029 presentation must prefer stable semantic hooks: `data-experience-surface`, `data-experience-capability`, `data-experience-question`, ARIA roles/names, canonical route/identity, and user-visible action semantics.
- CSS selectors are allowed in acceptance only when testing an explicitly locked shared primitive/core, a visual property that intrinsically requires CSS, or a compatibility surface whose class is itself part of the contract.
- When a presentation primitive is intentionally superseded, update the semantic acceptance marker in the same change. Do not preserve an obsolete component merely to keep a test green.
- A semantic acceptance update must not weaken truth/access/mobile/security/failure-state assertions; it changes *how the capability is located*, not what behavior is required.
- New Golden/2029 surfaces should expose one stable `data-experience-surface` identity and bounded `data-experience-capability` markers for major replaceable capability regions before browser acceptance is added.

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


## Contextual Sidecar + Spatial Method Stage — responsive projection contract

**Human Gate:** ZURIEL · 2.10.2026  
**Owner routing:** `experience_governance_foundation_v1_law v8` + this Design Contract  
**Owner verdict:** `EXTEND_EXISTING` — no Sidecar system, no mobile-only system, no second calculator family.

### One contextual surface, three states
- **REST:** the contextual surface is quiet and cheap (S0–S1). On Post/Topic it shows a bounded map of the current content; on other surfaces it shows the current contextual summary.
- **FOCUS:** selecting a semantic object reuses the same surface for a bounded inspector. The map collapses to a compact return/orientation affordance; do not show full map + full inspector simultaneously.
- **EXPLORE:** explicit depth action opens the owning destination (Number/World/Heichal/Journey/etc.) with identity, provenance, selection and exact-return continuity.

### Desktop / mobile identity
- **Desktop:** project as the left Context Rail / Sidecar.
- **Mobile:** project the same state as a **Bottom Context Sheet**. Do not squeeze a desktop left rail into a narrow screen.
- Mobile REST is a compact cue. Mobile FOCUS opens partial-height by default so the source context remains visible above. User may expand/deepen explicitly.
- The Bottom Sheet is the mobile projection of the same contextual capability, not a popup family or a second mobile architecture.

### Performance budget
- Only one rich contextual renderer may be active at a time.
- Inactive context cards stay static/cheap and may be unmounted.
- Fetch canonical trace/detail only after semantic focus requires it.
- S2 layered depth is the default rich focus level; S3 interactive 2.5D is deliberate explore depth.
- S4 true GPU 3D is reserved for material geometry. It is never required just because the object is gematria.
- Reduced-motion / low-power / unsupported devices receive a semantic static fallback with the same actions and truth state.

### One Spatial Method Stage
A redesigned gematria explanation uses one shared Spatial Method Stage across Number Method Inspector, Post focus, Context Sidecar, mobile Bottom Sheet and bounded Golden surfaces.

Canonical input:
`expression + canonical method identity + canonical trace/result/provenance`.

The Stage selects a projection adapter; it never calculates numeric truth itself.

Default method language:
- **רגיל:** visible-letter value/body.
- **מילוי:** internal letter-name expansion.
- **מסתתר:** adjacent-letter relation / tension.
- **קדמי / משולש:** letter-potential triangle.
- **משולש מילה:** cumulative-prefix formation.

Other methods extend the same Stage through their canonical method/engine contract. Do not create a new calculator/renderer family per surface.

### Milui convergence rule
Current implementations are intentionally treated as two proofs that must converge:
- `NumberCore2029 / MethodInspector` is the stronger **interaction/home shell**: canonical trace, method tabs, Raziel, Worlds, Trace and deep actions already live there.
- `LetterAnatomyGolden2029` is the stronger **visual/anatomy proof**: it demonstrates the intended opening of Hebrew letters in spatial depth.

The final shared Milui renderer is **not a choice between them**. It combines the Number Method Inspector shell with the richer Letter Anatomy visual grammar.

However, factual Milui letter-name spelling must ultimately come from the canonical engine/method registry/trace contract. A UI-local letter-name map may remain only as transitional representation metadata; it must not become a second source of method truth.

### Cross-surface rule
Inline public gematria remains simple and readable by default. A tap/click promotes the same semantic object into the contextual Stage; deepen promotes the same object into its owning full destination. Same object, same truth/provenance, different projection depth.


## TikTok / Social Vertical Video Projection — V1

**Human Gate:** ZURIEL · 2.10.2026  
**Owner routing:** `experience_governance_foundation_v1_law v8` + this Design Contract + existing Brand/Logo locks  
**Owner verdict:** `EXTEND_EXISTING` — this is a social-video projection of the same Product Visual Language. It creates no separate Video Design Law, brand system, renderer truth source or media store.

### Purpose
Short vertical social video is a first-class projection of SOD1820, not an unrelated marketing skin. The default goal is immediate comprehension on a phone: one source/context, one focal discovery, one clear next action, then the canonical brand close.

### Master format
- Default master: **9:16 · 1080×1920 · MP4/H.264 · 30fps** unless a source/export requirement justifies another compatible encoding.
- Source footage/background may bleed edge-to-edge. **Key text, numbers, CTA and logo may not depend on the outer UI-covered edges.**
- TikTok safe area is **dynamic**, not one permanent pixel rectangle: it varies with caption length, interactive add-ons and placement. At every final export, use the current TikTok safe-zone/preview for the target placement. Do not encode one stale right/bottom margin into the brand contract.
- Current TikTok guidance checked 2.10.2026: vertical 9:16 is recommended; key text/logos must remain inside the safe zone; preview before launch is required/recommended. Platform guidance may change, so release-time verification beats this dated note.
- Existing approved video geometry remains valid when a royal/header frame is used: top royal structure **≤20%** of frame height; only decorative side descenders may reach **≤30%**; full-height decorative columns are forbidden; central content stays open.

### Default short-form story grammar
For discovery/research reels, prefer this sequence unless the story itself requires another order:

`HOOK → SOURCE/CONTEXT → FOCAL NUMBER/PHRASE → ONE CONNECTION/REVEAL → CTA → LOGO OUTRO`

- **HOOK:** first seconds must make the subject recognizable before explanation. Prefer actual source/context imagery when available.
- **SOURCE/CONTEXT:** establish what the viewer is looking at; do not begin with an unexplained wall of calculations.
- **FOCAL DISCOVERY:** one number, phrase, date or visual relation owns the frame. Supporting results appear serially, not as a simultaneous spreadsheet.
- **CONNECTION/REVEAL:** show the shortest decision-changing chain. Deep secondary axes belong to follow-up videos or the linked Post/Number/Topic.
- **CTA:** one action only. For the current pre-guide phase, the canonical CTA is a demand signal such as **“עקבו וכתבו בתגובות: אני רוצה”**. Do not promise “אשלח מדריך” or a download until that asset/landing flow actually exists.
- **LOGO OUTRO:** finish with the canonical SOD1820 Hebrew logo/lockup, clean and readable, after the CTA. The logo is a closing identity moment, not a permanent watermark that competes with the research.

Default discovery reel duration is editorial rather than a truth rule. Keep it as short as the idea permits; for the present SOD1820 teaser family, roughly **20–35 seconds** is the working target, not a platform hard limit.

### Hebrew, numbers and motion
- Hebrew overlays that carry evidence, dates, names or calculations use deterministic/native typography in the composition. Do not depend on generative-image Hebrew for factual on-screen text.
- Numeric focal points may be centered and large using the numeric/display language; explanatory Hebrew stays scanable and bounded.
- One frame should answer one visual question. Never force 363 + 75 + 718 + 1073 + 1718 + a verse + CTA into one simultaneous card merely because all belong to the same research session.
- Motion explains state/relationship: reveal, transform, converge, travel, focus or deepen. Decorative motion must not imply stronger truth.
- Real source video remains distinguishable from generated/derived backgrounds or spatial overlays. SOURCE ≠ DERIVATIVE REPRESENTATION.

### Truth / provenance boundary
- Deterministic Gematria/date calculations shown as verified must come from the canonical registered engine/Trace.
- Event facts, source claims, engine results and SOD1820 interpretation remain visually and semantically separable.
- A source label supplied by ZURIEL may be preserved as provenance/context without silently upgrading it to an independently verified fact.
- Video polish, cinematic scale, 3D depth or repetition never upgrades a hint/interpretation into evidence or fact.

### Canonical logo close
- The current 2D outro consumes the **exact approved canonical Hebrew lockup asset** under the existing Brand/Logo owner; no redraw, AI recreation or substitute spelling.
- Default outro is short and deliberate (normally about **1–2 seconds**) and occurs after the CTA/last content beat.
- The logo must remain inside the current release-time platform safe zone.
- A video may use the approved 20/30 royal-frame language earlier, but the final logo close remains the canonical identity seal.

### Planned 3D evolution — projection, not replacement of identity
The current 2D TikTok/Social contract is intentionally designed to evolve into the 3D system now being built.

- Future **3D Brand / Spatial Outro** may supersede the flat logo animation/renderer while preserving the same canonical identity, wording, proportions/recognizability, truth semantics, CTA order and safe-zone acceptance.
- 3D is a **renderer/projection layer**. It must not create a second logo identity, second brand owner, second Gematria engine or second content truth source.
- Foundation → Projection → Experience remains the order: canonical logo/identity and research truth first; 3D motion/material/camera second; TikTok/social framing third.
- The 2D outro remains a valid fallback/reference until the 3D renderer is visually accepted and release-ready. Current video production must not block on unfinished 3D.
- When the 3D language is approved, update this section additively and migrate the outro adapter; do not rewrite every video rule around a renderer implementation.

### Acceptance checklist before social release
A social-video task is not complete merely because a file rendered.

Verify at minimum:
1. 9:16/mobile framing is intentional and source media is not stretched.
2. Current TikTok safe-zone/preview passes for text, focal numbers, CTA and logo.
3. Hebrew/date/number text is readable on a phone and matches canonical calculation/source state.
4. One focal idea is understandable without reading a long caption.
5. CTA promises only a capability/asset that actually exists.
6. Canonical logo closes the piece cleanly.
7. Source vs derivative/interpretation remains distinguishable.
8. Final file is visually reviewed before publication.



## Migration
Existing components are migrated gradually. A repository-wide audit should classify legacy font usage before mass replacement; no blind search/replace.

Forward rule: **new / redesigned surfaces use the current canonical Design Contract; legacy surfaces migrate only when their workstream reaches redesign.**