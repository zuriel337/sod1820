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
The approved canonical Crown + Hebrew wordmark remain protected artwork under Brand Core. Their asset colors may remain a heritage exception.

The surrounding product UI does not need to inherit the logo palette. UI color and Brand artwork identity remain distinct semantic layers.

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

## 10. Acceptance
A 2029 visual-foundation change must prove:
1. same semantics in all three presets;
2. no horizontal overflow at release mobile widths;
3. readable Hebrew and focus states;
4. reduced-motion compatibility;
5. no truth/status meaning encoded only by decoration;
6. Legacy routes are not mass-restyled accidentally;
7. no new palette/theme store or page-local color owner.
