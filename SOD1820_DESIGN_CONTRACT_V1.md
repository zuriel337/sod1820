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

---

## Cross-Surface Experience Contract Delta V1 (additive — 5.9.2026)

Status: additive delta, docs-only. Human-Gate approved (`decision_ledger=1499bf8f-c584-4400-8711-2aafc33ef5b8`), authored per `work_log 7f371048` (CROSS_SURFACE_EXPERIENCE_CONTRACT_V1). Does not delete, renumber or contradict any section above; where it narrows an existing rule, the exact supersession wording is stated inline under that rule below. Introduces **zero** new systems, stores, tables or engines — every rule below extends a named existing owner.

**Corrected per GPT dual-audit (`work_log c7a608bc`, 5.9.2026), two finite clarifications, docs-only:** (A) every "supersession wording" below is an **approved forward direction**, not yet an operational rule — the live rule stays whatever the cited owner's *current* version says until a separate implementation/governance step actually changes that owner (new rule version, code change, or explicit supersession commit to the owner itself). This delta document is not self-executing. (B) a delta clause that cites a helper/test as satisfying a requirement (e.g. Privacy, below) states only that the **helper's own unit tests** pass — it is not itself acceptance evidence for a shipped surface; real acceptance requires testing the actual generated/static/public artifact that surface produces (bundle, OG, sitemap, share text), not just the helper in isolation. Both points are threaded inline below where they apply.

Goal: one shared vocabulary for *how much chrome/marketing/social surface a page shows*, reusable by any redesigned/new surface (Book Hub first), without inventing a second Shell, a second Share mechanism, a second Follow mechanism, or a second Research/save store.

### Surface Modes (new vocabulary — governs chrome policy only, never truth/identity)

A surface declares exactly one mode. Mode controls **chrome policy** (footer/share/follow/marketing density) — it never changes an entity's truth rank, access tier, or Research OS identity (`unified_graph_law` / Research OS Canonical Lock §10 are unaffected).

- **`public_content`** — today's default public shell: normal Footer, normal share placement (per Share Placement law below), contextual Follow where a real topic/event producer exists (per `subscription_funnel_law`).
- **`research_clean`** — no Footer, no floating/side share widget, no automatic marketing chrome, no global Follow gate. Share/Follow remain available only as an explicit, contextual, on-entity action (see Share Placement and Follow rules below). **Book Hub (`/book`, `/book/:slug`) declares this mode.**
- **`immersive_clean`** — Heichal/immersive experiences: no Footer, no automatic share/follow, no marketing chrome; only essential in-experience navigation/exit and explicitly designed in-experience actions. This names, in the Design Contract's own vocabulary, the chrome posture the System Frame Contract already assumes for Heichal (`docs/sod1820-system-frame-contract-v1.md` §"Heichal contract": *"Heichal is immersive projection... not replacement for conventional navigation"*).

Owner: this Design Contract (new primitive, analogous to the existing Reference Surfaces table). Extends `## Component law` ("Desktop/mobile behavior must be explicit") to also require a surface to state its **mode** explicitly. No new component/store — mode is a prop/flag a surface passes into existing chrome components (Footer, `RoyalShareWidget`, `WatchButton`), decided at implementation time, not introduced here.

### Share placement — extension, with explicit supersession wording

Owner (unchanged): `share_placement_law` (`nodes.rule_id`) + `src/lib/share.js` (`floatingShareShown(pathname)`), cited already in `## Existing-capability discovery law` above.

**Current rule (verbatim, still in force):** floating widget XOR one inline `<ShareActions/>` row, decided purely by `floatingShareShown(pathname)` — never both, never neither, no page configures this itself.

**Supersession wording (narrowing, additive) — APPROVED DIRECTION, NOT YET LIVE:** for a surface declared `research_clean` or `immersive_clean`, the binary is extended to a **tri-state**: `floating | inline | none`. Automatic **page-level** share defaults to `none` on such a surface, even if its route is not (yet) present in `floatingShareShown`'s hide-list — chrome density is now governed by Surface Mode first, by the hide-list second. This does **not** remove or edit `share.js`'s existing list or logic; it is a mode-gated exception layered on top, to be implemented (when code work is authorized) as an additional cheap check in `ShareActions` itself (e.g. a `mode` prop or a `researchCleanSurfaces` predicate consulted before rendering `none` on `research_clean`), not a second share component and not a duplicated channel list. Channels/engine remain exactly `share.js`'s existing `waHref/tgHref/fbHref/xHref/emailHref` + `ShareActions`. A **contextual** Share action on one selected real entity (e.g. "share this exact selection") may still open the same `ShareActions`/native-share engine explicitly — this is a normal capability-gated action (see Action Policy below), not automatic page chrome, so it is not blocked by the `none` default.

**Operational status (correction A, per `work_log c7a608bc`):** `share_placement_law` today is live and version **binary v1** — floating XOR inline, no `none` state, exactly as stated in "Current rule" above. The tri-state described in this Delta is this Design Contract's own approved forward direction for `research_clean`/`immersive_clean` surfaces; it does **not** amend, version-bump, or take effect against `share_placement_law` itself merely by existing in this document. `share_placement_law` becomes tri-state, and `ShareActions`/`share.js` actually gains a `none` path, only once that owner is separately updated (a new `share_placement_law` version + the corresponding code change) — a distinct implementation/governance step, not yet taken. Until then, any surface built today still gets the current binary floating/inline behavior from `floatingShareShown`, not `none`.

### Follow — no new mechanism; Book Follow stays an extension point

Owner (unchanged): `subscription_funnel_law` (`nodes.rule_id`, v16) + `WatchButton` — the sole Follow component sitewide, already governing topic vocabulary (`number:` / `author:` / `cat:` / `codes:new` / `stream:reality` / `topic:` / `world:mine`).

`subscription_funnel_law` v10 already retired a single-content-item Follow target (`post:<id>`/`thread:<id>` were removed entirely: *"פוסט = שער ליעדים, לא יעד"* — a post is a gateway to category/author follow, not a follow target itself). This delta explicitly folds a **Book** page under the same discipline: a Book Hub page must **not** invent a `book:<slug>` (or per-row) Follow target that mirrors the retired single-item pattern. **Book Follow remains an EXTENSION POINT, not a MUST-NOW rule** — it activates only once an actual Book update/event producer exists (e.g. a new dataset/witness landing), and only through a topic shape `subscription_funnel_law`'s own decision log approves (most likely folded into an existing family — `topic:` or `world:mine` — rather than a new one-off). No Follow code is touched by this delta.

`QuickActions`/`ToolActions` (`canonical_ui_components_law`) become **capability-aware** per Surface Mode/entity: `add_to_research | save | share | follow | ai | copy | connections | source | open` may each be enabled or omitted per context — an entity is not assumed to carry every action. This is a usage convention for the existing single component family, not a new component; one action hierarchy (primary / secondary / overflow) applies everywhere it's used.

### Research OS / save-reopen — no change, cited as-is

Owner (unchanged): `docs/research-os-canonical-lock-v1.md` + `research_items`/`user_research`/`research_objects`. This delta adds no new store. Book source-selection save already conforms (`src/lib/research/bookSelectionAdapter.js`, `work_log 81611e63`/`59642c0d`): stable `entity_type='book'`, distinct `entity_ref` per exact selection, reopenable link, metadata sufficient to reopen context — matching Canonical Lock §2's Universal Finding envelope exactly. Exact reopen (Canonical Lock §8.3) and Privacy (below) apply identically to Book selections.

### SEO / OG / sitemap boundary

Owner (unchanged): `src/lib/seo.js`, `api/og.js`, `api/card.js`, `api/sitemap.js` (cited already in `## Existing-capability discovery law`). `api/sitemap.js` already gates public indexability by an explicit publish signal (`posts` rows only, draft-tag filter) rather than by page prominence — the same discipline extends to Book: a canonical public Book/edition URL may use the existing OG/card/sitemap mechanism once it has a real public route, but a private research selection, a draft dataset row, or a synthetic/test fixture must never enter `api/card.js`, `api/og.js`'s `STATIC` map, or `api/sitemap.js`'s query set. No parallel OG/sitemap mechanism is introduced.

### Privacy — fail-closed, extends existing pattern

Owner (unchanged): the fail-closed `privacy_scope==='public'` pattern already shipped in `bookSelectionAdapter.js`'s `isPublicRow`/`buildPublicBundle` (`work_log 59642c0d`). This delta generalizes the same discipline to every public artifact a Surface Mode can produce: no private source/research payload may enter a public static bundle, a test fixture, an OG/card payload, a sitemap entry, analytics metadata, or share text.

**Acceptance correction (correction B, per `work_log c7a608bc`):** `bookSelectionAdapter.js`'s `isPublicRow`/`buildPublicBundle` passing their own `node --test` unit tests (synthetic fixtures) is necessary but **not sufficient** evidence that a shipped Book surface is privacy-safe. The helper only proves it filters correctly *when given* a row; it does not by itself prove that every real generated/static/public artifact a Book surface actually emits — the static dossier bundle (`/book-data/<slug>.tables.json` or its successor), `api/card.js`/`api/og.js`'s rendered payload, `api/sitemap.js`'s entry set, and any share text — was actually built by *routing through* that helper rather than bypassing it. Release acceptance for Book (and for any other entity family reusing this pattern) must include a test against the **actual produced artifact**, not only against the helper in isolation: e.g. fetch/inspect the real static bundle or OG/card response for a book with a private-scoped row and assert the private content is absent from it. This test does not exist yet and is not run by this delta; it is a required gate before any Book `research_clean` surface with real (non-synthetic) private-scoped data ships.

### Vocabulary / typography / color / translation — cited, not duplicated

- **Public Hebrew vocabulary**: extends `## Naming / product language law` above. Stable public terms: היכל (not היכל הגילוי, already stated above) · לגלות · לחקור · ספרים ומקורות (already the System Frame Contract's own nav family name for Books, see `docs/sod1820-system-frame-contract-v1.md` §"Ancient books become explorable knowledge spaces") · המחקר שלי · מקור · מחקר ונתונים · קשרים · מצב המחקר · הוסף למחקר · המשך. Internal terms (Dossier / Projection / Research Object / Dataset / Canonical) stay internal/advanced vocabulary, per the existing rule that a governance-document name is not proof of a public-facing name.
- **Typography**: no new rule — `## Typography law` above already governs; new Book/Research code uses `F.ui`/`F.body`/`F.numeric` roles only, never a literal `font-family`, per the existing law.
- **Colors**: no new rule — `## Admin / Command theme law` and `src/lib/palette.js`'s existing semantic tokens (`ink`/`accent`/`accentText`/success-warning-danger roles, plus the existing `lab` palette already used for research-workspace-styled surfaces) are the owner. This delta only **locks the requirement**, already implicit in Truth-safe visual language above, that gold never encodes truth/verification and that an AI-accent may be visually distinct from the brand-gold accent. No hex/radius/shadow values are selected here — those remain `GOLDEN_PREVIEW_HUMAN_GATE`, unchanged.
- **Translation**: owner (unchanged) `content_translation_law` + `src/lib/seo.js`. No translation is built now. This delta only states an identity discipline needed so translation can later attach without breaking Follow/Save: **Identity ≠ Language ≠ URL ≠ Display Name** (already the exact wording locked in `subscription_funnel_law` v12 for Follow topics) extends to Book identity — `bookEntityRef`/`selectionRef` are already language-neutral (keyed on `identity_key`/`source_ref`, never on a display label), so a future `content_translation_law` rollout can add `he/en/ar/...` projections of a Book's title/content without minting new entity refs or breaking saved selections.

### Access / premium / mobile / analytics — cited, not duplicated

- **Access tiers** (`platform_tiers_law`, referenced in `CLAUDE.md`) are orthogonal to this delta: a Surface Mode and an access tier are independent axes — `research_clean` chrome density says nothing about which tier can view the surface, and no duplicate free/premium page or store is introduced.
- **Mobile/a11y**: `research_clean`/`immersive_clean` surfaces remain bound by the same mobile-first acceptance already required project-wide (`research_workspace_law`'s "מובייל-ראשון" clause) — removing Footer/marketing chrome must not remove keyboard/touch/focus safety.
- **Analytics**: measurement (existing GA4/Clarity/Meta CAPI per `active_systems_map`) stays active even when visual chrome is removed; a page must not keep unwanted Share/Follow UI merely to keep producing engagement events — track actions from the canonical components themselves (`ShareActions`/`WatchButton`/`QuickActions`), which already emit trackable events regardless of visibility mode.

### Confirmation

New systems/stores/tables/engines introduced by this delta: **0**. Every rule above extends a named existing owner (cited inline). No code, CSS, `App.jsx`, `Layout`, `share.js`, `QuickActions`, or `WatchButton` file is touched by this delta — Surface Mode, the Share tri-state, and capability-aware `QuickActions` are named contracts for a **future**, separately-gated implementation pass, not implemented here.
