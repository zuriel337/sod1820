# SOD1820 DESIGN CONTRACT V1

## Purpose
One canonical visual language for the whole product. New UI must reuse tokens instead of inventing local typography, colors, radii or component language.

This contract is forward-looking: it governs new surfaces and surfaces that enter an explicit redesign pass. It does **not** authorize a repository-wide visual migration of legacy pages.

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
