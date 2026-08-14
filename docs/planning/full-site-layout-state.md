# FULL SITE UI / LAYOUT STATE MAP — SOD1820

> **actor=CLAUDE · status=read-only full-site-layout-map · date=2026-08-14**
>
> READ-ONLY snapshot of the site **as it exists today**, before any positioning changes.
> This is **not** a redesign, not a visual critique, not a code change. No WRITE, no DB, no deploy, no CSS/React edits.
> Every claim is cited `file:line`. Findings are separated into **FACT · CURRENT IMPLEMENTATION · EXPECTED/EXISTING RULE · GAP/DRIFT · UNKNOWN**.
>
> Method: 6 parallel read-only code sweeps (shell/header · routes/width · home/hero · chat/number/post · z-index/tokens · stories/admin/floating). Where two sweeps disagreed, the direct-file-read wins and the conflict is flagged.

---

## 0. THE ONE STRUCTURAL FACT EVERYTHING STACKS AGAINST

**FACT.** All page chrome + content live inside a single wrapper `<div style={{position:"relative", zIndex:1}}>` — `src/components/layout/Layout.jsx:62`. This creates **one stacking context at z-index:1**. Any child z-index (even `99999`) is trapped inside it. This is why every true full-screen overlay uses `createPortal(..., document.body)` to escape — explicitly documented at `src/components/StoryViewer.jsx:107-108`.

**CONSEQUENCE (root cause of most z-index oddities):** the `2147483000`-tier "near-INT_MAX" z-indexes are a **workaround** for this trap, not a designed scale. Keep this in mind for every z-index observation below.

---

## 1. GLOBAL SHELL

**FACT — mount chain.** `src/main.jsx:9` → `<App/>` → `src/App.jsx:226-393`. Provider stack: `AuthProvider > BrowserRouter > ResearchProvider > UserCenterProvider`.

**FACT — two route tiers.**
- **Inside `<Layout/>`** (`App.jsx:275`): the shared shell (Navbar + bars + `<main><Outlet/></main>` + Footer). This wraps all "normal content" routes. `Layout.jsx:62-91`.
- **Outside `<Layout/>`** (`App.jsx:249-274`): full-screen experiences with **no navbar/footer** — `/enter`, `/stream`, `/experience`, `/היכל`/`/heichal`, `/galaxy*`, `/research`, `/meaning-lab`, `/sulamot*`, rooms.

**CURRENT IMPLEMENTATION — persistent chrome (top→bottom, all in normal flow inside the z:1 wrapper):**
Navbar → EnglishSoonBar → CelestialPinnedBar → (CipherElulBanner) → `<main>` → Footer. `Layout.jsx:62-91`.

| Element | Component | file:line | position | z-index | height | width / max-width | mobile behavior |
|---|---|---|---|---|---|---|---|
| Header | Navbar | `Navbar.jsx:622` | **sticky** top:0 | **100** | **64** | full; inner max **1800** | burger drawer < 1040px |
| English banner | EnglishSoonBar | `EnglishSoonBar.jsx:38` | relative (in-flow) | — | minHeight 48 | full | only EN/US visitors or `?enbar=1` |
| Celestial bar | CelestialPinnedBar | `CelestialPinnedBar.jsx:55` | relative (in-flow) | — | minHeight 34 | full | global, dismissible |
| Elul banner | CipherElulBanner | mounted `Layout.jsx:78` | relative (in-flow) | — | auto | full | only `!isHome && !isHeichal` |
| Footer | Footer | `Footer.jsx:116` | relative | 1 | auto | inner max **1040** | grid 4-col collapses; hidden on `/code` |

**FACT — background layers (fixed, non-chrome):** SpaceBackground `fixed inset:0 z:0` dark-mode (`SpaceBackground.jsx:10`); VerseBackground `fixed z:0` non-home (`VerseBackground.jsx:30`); LightCityBackdrop `z:0`.

**FACT — disabled-but-in-code bars (behind `false &&`):** MaintenanceTicker (`Layout.jsx:69`), CosmicVerseBanner (`Layout.jsx:72`), LiveActivityBar (`Layout.jsx:74`). **Not rendered.**

**FACT — there is NO bottom navigation bar anywhere** (all six sweeps confirm). "Bottom collisions" are between independently-mounted fixed floating widgets, not a nav bar.

### 1.1 Content offset under the header — **MISSING RULE (by design, but undocumented)**

**FACT.** There is **no** `padding-top` / `margin-top` / spacer / `scroll-padding-top` offset applied to main content, and none is currently needed: the header is `position:sticky` (not `fixed`), so it occupies its own 64px of normal flow. `<main>` (`Layout.jsx:79`) begins immediately after; `GLOBAL_CSS` (`theme.js:74-111`) has no header-offset rule; anchor scroll uses `scrollIntoView` with no header compensation (`App.jsx:126-139`).

**GAP / DRIFT.** No single canonical **header-height token or offset rule** exists. Every element that needs to clear the header re-guesses the 64px: `top:72` (`NumberDrawer.jsx:165`), `top:74` (research rails / ArchivePage `:1638`), `top:70` (`TimelinePage.jsx:299`), `top:66` (`RiverStream.jsx:174`), `top:112` (`RevelationAxis.jsx:162`), `top:78` (chat column `legacy.jsx:4318`), and the **buggy `top:20`** (`BeitMidrashPage.jsx:763,1323`). → **MISSING RULE: `HEADER_H` constant.** Today it works because sticky needs no offset; the moment anything goes `fixed`, the guesses diverge (already visible in R5 below).

---

## 2. HEADER / STICKY BAR

**FACT.** Single header: `<nav position:sticky; top:0; z-index:100>`, inner bar `height:64`, inner content `max-width:1800; padding:0 18px`. `Navbar.jsx:622-629`. Background swaps on `scrollY>30` (`Navbar.jsx:604,624`).

**FACT — breakpoint 1040px.** `.sod-nav-desktop{display:none}` < 1040 (burger + mobile icons shown, `Navbar.jsx:901-905`); drawer hidden ≥ 1041 (`:906`); 1041–1200 hides product labels (`:891`); mobile drawer `maxHeight:80vh` (`:699`), 2-col tiles < 380px (`:862`). One nav; "mobile header" = same sticky nav with an in-nav drawer. **No separate mobile-header component.**

| | EXPECTED | ACTUAL | GAP |
|---|---|---|---|
| Height desktop | — | 64px (`Navbar.jsx:629`) | — |
| Height mobile | — | 64px (drawer expands below) | — |
| fixed or sticky | — | **sticky** top:0 | — |
| z-index | — | 100 | — |
| who gets padding-top | a canonical offset | **nobody** (sticky ⇒ none needed) | no `HEADER_H` token (§1.1) |
| content under header | never | only R5 buggy stickies (`top:20`) + R6 duplicate sticky | **real, localized** |
| multiple headers | one | one global; BUT `legacy.jsx:3766` is a second `sticky top:0 z:100` | R6 tie |
| exceptions | — | EntityPage live header `fixed top:0 z:200` (`EntityPage.jsx:1271`); routes outside Layout have no header | by-design |

---

## 3. GLOBAL WIDTH SYSTEM

**FACT — there is NO canonical width token.** `theme.js` and `src/lib/` export **no** container/max-width constant. `Layout`'s `<main>` has no max-width of its own (`Layout.jsx:79-88`); width is 100%-per-page responsibility. Every page inlines its own `maxWidth:<number>, margin:"0 auto"` with side padding folded into the same style object.

**CURRENT IMPLEMENTATION — per-route widths (all single-column unless noted):**

| Route | Component / file | max-width | side padding | layout | cite |
|---|---|---|---|---|---|
| HOME `/` (default) | HomeNewPage.jsx | content **1180**; hero-gate 1040; reality feature **1360** | `0 18px` | single-col, full-bleed feature sections | `HomeNewPage.jsx:289,306,534` |
| HOME classic `/home-classic` | HomePage.jsx | **1360** | `20px 18px 10px` | single-col | `HomePage.jsx:177` |
| CHAT `/community/chat` | SpotimChatPage (`legacy.jsx`) | **900** mobile → **1240** ≥1000px | `52px 16px 96px` | **SIDEBAR** grid `minmax(0,1fr) 320px`, gap 30 | `legacy.jsx:4297,4305,4314,4317` |
| NUMBER `/number/:phrase` | EntityPage.jsx | **920** | `30px 20px 100px` | single-col accordions | `EntityPage.jsx:1224` |
| CODE `/code` | CodePage.jsx | **full-bleed** iframe | none | full-width tool; footer hidden | `CodePage.jsx:54-72` |
| CIPHERS `/codes` | CiphersLibraryPage.jsx | **1080** | `26px 16px 90px` | grid | `CiphersLibraryPage.jsx:170` |
| OR_GEULA `/or-geula` | OrGeulaPage.jsx | **1160** | `40px 16px 72px` | grid; lightbox 900 | `OrGeulaPage.jsx:85` |
| VIDEO/CATEGORY `/category/:slug` | TaxonomyPage.jsx | **1280** | `48px 18px 90px` | single-col | `TaxonomyPage.jsx:119` |
| POST `/:slug` | PostPageBySlug (`legacy.jsx`) | **780–800** | `52px 16-24px 96px` | single-col | `legacy.jsx:4722,5043` |
| COMMUNITY `/community` | CommunityPage | **980** | `48px 20px 96px` | single-col | `placeholders.jsx:99` |
| BROADCASTS `/broadcasts` | BroadcastsPage.jsx | **1180** (embeds ForumFeed 760) | `30px 15px 90px` | single-col | `BroadcastsPage.jsx:134,204` |
| WORKSPACE/RESEARCH `/research` | ResearchPage.jsx (outside Layout) | **full-width** `.rw-stage` | `0 clamp(12,1.8vw,30)` | research shell, own scroll | `lib/research/theme.js:48` |
| BEIT-MIDRASH `/beit-midrash` | BeitMidrashPage.jsx | content **760** | per-section | single-col | `BeitMidrashPage.jsx:552` |
| HEICHAL `/heichal` | HeichalPage.jsx | **fullscreen** `fixed inset:0` | none | outside Layout | `HeichalPage.jsx:20` |
| ADMIN `/admin` | AdminPage.jsx | **100% full-bleed** | `36px clamp(14,3vw,56) 90px` | single-col, tabbed | `AdminPage.jsx:234` |
| PERSONAL `/profile` | ProfilePage.jsx | **440** redirect card | `72px 24px 120px` | thin card → opens UserCenter drawer | `ProfilePage.jsx:55` |

**GAP / DRIFT.** Content widths are inconsistent literals: **780, 900, 920, 980, 1080, 1160, 1180, 1240, 1280, 1360, full-bleed**. The same "reading column" concept is re-typed per file. Changing "the content width" requires editing every page. → **MISSING RULE: shared container/max-width token(s).**

---

## 4. DESKTOP vs MOBILE (per key route)

**HOME** — single column both. Hero `.hn-livegate` mobile min-height `min(74vh,540px)` (`HomeNewPage.jsx:362`) → desktop ≥900px full-bleed `min(82vh,660px)` (`:431`). Lens tiles `.hn-grid6` 6→3→2 cols (`:351`). Reality master-detail `.hn-latest`: desktop = big image + 320px thumb grid; ≤760px → **column, thumbs become horizontal-scroll row, labels hidden** (`:524-529`). Ciphers row = horizontal scroll-snap (`:626`). DimensionFiveCloud desktop-only.

**CHAT** — DESKTOP ≥1000px: 2-col grid `minmax(0,1fr) 320px`, gap 30; left col = 320px **sticky story column** `top:78 max-height:calc(100vh-96px) overflow-y:auto` (`legacy.jsx:4317-4319,4356`); compact chip + mobile rail hidden (`:4315`). MOBILE <1000px: single column; story column `display:none` (`:4309`); **horizontal merged story rail at top** (`:4326`); gap tightens to 20 (`:4312`).

**NUMBER** — single 920px column both. Search bar reflows to full-width top order `-1` < 560px (`EntityPage.jsx:1231`); convergence grid `em-methods` 4→2 cols < 560px, meter stacks < 460px (`:318-323`); hub rails slide-in panels with tap-out backdrop on mobile (`EntityHubRails.jsx:44`).

**POST** — 780–800px column both. Desktop-only: side-rail ads ≥1500px (`legacy.jsx:4702-4704`) + `LandingDiscoveryStories` google-landing rail (desktop-only). Mobile-only: StickyAnchorAd bottom anchor. Hero heights clamp-responsive.

**ADMIN** — `useIsMobile(640)` (`AdminPage.jsx:160`) drives padding/font/tabs; group + sub tabs `flexWrap:wrap` desktop → `nowrap; overflow-x:auto` (horizontal scroll) mobile, touch targets `minHeight:44/38` (`:248-270`).

---

## 5. HOME (`/` → HomeNewPage.jsx — canonical)

**FACT — which component is `/`.** `App.jsx:276` → `HomeRoute` (`App.jsx:198-201`) branches: `stream==="reality" ? HomeReality : HomeNewPage`. **Default = `HomeNewPage`.** `HomePage.jsx` is only at `/home-classic` (`App.jsx:278`).

**CURRENT IMPLEMENTATION — exact top→bottom order (`HomeNewPage.jsx`):**
1. YearTicker `:287`
2. **HERO** `.hn-livegate` (1820 banner bg + search + 2 CTAs) `:441-462`
3. **Story chip** `OrGeulaStoryChip` `:468`
4. **Latest updates** `LatestUpdatesRail` `:483`
5. Forum WhatsNewCard `:487`
6. VideoGallery `:492`
7. **Writers rail** `HomeWritersRail` `:497`
8. **Or-Geula rail** `HomeOrGeulaRail` `:500`
9. TreasuresHome `:503`
10. **Reality Stream** `RealityWorld ...showHero` (`id=reality-home`) `:542`
11. Lens tiles + forum tile `:553-576`
12. NumberOfDay `:579`
13. StartHereCard `:585`
14. HomeTeasers `:588`
15. Site pulse / hot numbers (ActivityPulse, NumberBubbles, RecentNumbers…) `:592-612`
16. CrossInsightsBox `:615`
17. Ciphers/ELS row (`id=ciphers-home`, horizontal scroll) `:622-650`
18. From-the-archive card `:653`
19. OneTreeWidget `:669`
20. Beit-Midrash LIVE convergences (`id=conv-home`) `:674-704`
21. StayUpdatedCTA `:707`
22. **Dim5 rail** `DimensionFiveRail` `:712`
23. **Dim5 floating cloud** `DimensionFiveCloud` `:717` (desktop-only)
— Footer supplied by Layout `:90`.

**EXPECTED RULE (CLAUDE.md `stream_separation_law`).** "עדכונים אחרונים" = posts; "חידושי AI" = box; Hero is a HOME experience. Reality Stream is a lens. → the composition matches the law (posts rail + AI/convergence surfaces + reality lens).

---

## 6. HERO EXCEPTIONS

**FACT — no dedicated `Hero.jsx`.** "Hero" exists in two forms:
- **(A) Page banner hero** `.hn-livegate` — **inline** in HomeNewPage only (`HomeNewPage.jsx:441`; grep `hn-livegate` → only this file). Cannot drift.
- **(B) Reality-stream hero** `RealityWorld showHero` (`RealityWorld.jsx:299-343`, prop `:24`) — the reusable one.

**Hero (B) render sites:**

| Route | Hero present? | Expected? | GAP |
|---|---|---|---|
| `/`, `/home-new`, `/בית-חדש` (HomeNewPage) | YES `:542` | yes | none |
| `/archive` (ArchivePage) | YES `ArchivePage.jsx:885` | debatable — archive **is** the reality-stream's own full gallery | **MINOR DRIFT / likely by-design → ZURIEL confirm** |
| `/home-classic` (HomePage) | NO (dead import only) | n/a | none |
| `/`,`/reality` stream=reality (HomeReality) | NO | — | none |
| NUMBER `/number/:phrase` (EntityPage) | NO (own `heroGone` hero, not home) | no home hero | **none — OK** |
| RESEARCH `/research` (ResearchHome) | NO | no home hero | **none — OK** |
| BEIT-MIDRASH `/beit-midrash` | NO (`WriterConvergenceHero` is its own) | no home hero | **none — OK** |
| HEICHAL/HALL, `/code` | NO | no home hero | **none — OK** |

**VERDICT.** Home hero is **not** leaking into NUMBER / WORKSPACE / HEICHAL / CODE. The only non-Home render of the reusable hero is `/archive`, which is plausibly intentional. **UNKNOWN:** intended-vs-accidental on `/archive` is a product decision, not determinable from code.

---

## 7. CHAT (`/community/chat` → SpotimChatPage, in `legacy.jsx:4272`)

**FACT — lives in the `legacy.jsx` monolith**, wired via `legacyRoutes.jsx:55`. Page wrapper `.sod-chat-page` `padding:52px 16px 96px`, max 900→1240px.

**CURRENT IMPLEMENTATION.**
- **Header:** a plain centered `<h1>` "דף צ'אט" + RoyalDivider (`:4333`) — **inline, NOT sticky**, scrolls away. No custom chat header.
- **Message input:** **none in our code** — the whole conversation + composer is the **Spot.IM embed** `data-spotim-module="conversation"` (`:4341`); input lives inside that iframe (not app-positioned).
- **Custom scrollbar:** `ChatScrollRail` `fixed right:6 z:60` (`ChatScrollRail.jsx:90`); native bar hidden (`:4303`).
- **DESKTOP ≥1000px:** 2-col grid; left = 320px sticky story column `MergedStoriesRail layout="column"` (`:4356`).
- **MOBILE <1000px:** single col; story column `display:none`; horizontal `MergedStoriesRail` rail at top (`:4326`).
- **Overlay:** StoryViewer (full-screen portal) from the rail.

**FACT — mounted vs dead (critical):**
- **LIVE on chat:** only `MergedStoriesRail` (named export). `legacy.jsx:5` imports `{MergedStoriesRail, LandingDiscoveryStories}`.
- **DEAD:** `OrGeulaStoryColumn` **default export** (`OrGeulaStoryColumn.jsx:280`) — **imported nowhere in `src`** (all sweeps confirm). Global dead code.
- **DEAD:** `SpotimComments` (`legacy.jsx:4369`) — defined, never rendered.
- `HomeOrGeulaRail` is **not** on chat (it's Home + Taxonomy).

---

## 8. NUMBER (`/number/:phrase` → EntityPage.jsx:564)

**CURRENT IMPLEMENTATION.** Single centered work column `max-width:920; padding:30px 20px 100px` (`:1224`) inside a `Shell` (`minHeight:100vh`). Vertical accordion stack — **no multi-column desktop layout**.
- **Top row** `.ep-toprow`: back-link, calculator link, reader/research mode switch (👁️/🔬), **search form** (`:1240-1266`). Search reflows full-width top `order:-1` < 560px (`:1231`).
- **Sticky element:** on-scroll bar `fixed top:0 z:200`, only when `heroGone && showBody` (`:1269`), with section chips.
- **Hero:** the number's **own** identity block (kicker + big number + convergence ring) `:1297` — controlled by `heroRef`/`heroGone` (`:586,587`).
- **Research surface:** `EntityHubRails` (`:1294`) — two collapsible rails (user world / research engines), **closed by default**, mobile = slide-in with backdrop.
- **Content accordions:** convergence/DNA meter, intel, number map, equal words, gallery, posts/cross-refs, roots/all-methods, then `Discourse` comments (`:1764-1997`).

**GAP CHECK — does the Home Hero render here? NO.** EntityPage imports/renders no HomePage/HomeReality/HomeNewPage/RealityStream. Grep `Hero` → only `heroGone`/`heroRef` (its own). **The number page is a clean, separate work environment. No drift.**

---

## 9. WORKSPACE / ADMIN (`/admin` → AdminPage.jsx) — *do not change (owned by another session)*

**CURRENT IMPLEMENTATION (state only, no proposals).**
- **Root** `:234`: `rtl, width:100%, maxWidth:100%, margin:0`, padding desktop `36px clamp(14,3vw,56) 90px` / mobile `22px 12px 80px`, `overflowX:hidden`. **Full-bleed single column, tab-switched — NOT a multi-column dashboard.**
- **Access gate** `:229` short-circuits non-admins.
- **Header** `:236`: centered title + "✍️ פוסט חדש" pill.
- **PulseBar** KPI strip `:245` (component `:179`): `repeat(auto-fit,minmax(148px,1fr))`, 6 clickable KPI tiles, 30s refresh.
- **Two-level tab nav (NOT sticky/fixed):** 8 group tabs `:248`, sub-tabs `:259`; desktop `flexWrap:wrap` / mobile `nowrap; overflow-x:auto`; touch `minHeight:44/38`. 50 tab keys `:86-136`.
- **Content** `:273-321`: flat `{tab==="x" && <XTab/>}` — one tab at a time in the single column (`els` stacks two).
- **Cards:** shared `card` style `:155`; tabs use inner grids + own `maxHeight; overflow-y:auto` scroll containers.
- **Fixed elements are tab-local** (e.g. WarRoom action bar `fixed bottom:28 left:50% z:999` `:1453`), not page chrome.
- **Mobile:** `useIsMobile(640)` `:160`.

---

## 10. POST PAGES (`/:slug` → PostPageBySlug, `legacy.jsx:4436`)

**CURRENT IMPLEMENTATION — top→bottom.** Root `<div data-theme={postMode}>` per-post light/dark. Content column `max-width:800; padding:52px 16px 96px` (`:4722`).
1. Ads (legacy WP posts only): StickyAnchorAd (mobile), SideRailAd ×2 (desktop ≥1500px) `:4702`
2. Hero/media: MatrixRain fx **or** post image hero (clamp-responsive) `:4706-4721`
3. Back button `:4723`
4. Admin edit bar (admin) `:4729`
5. Post header: category chips, `<h1>`, "🔥 חם השבוע", author card, dates, RoyalDivider `:4786-4852`
6. **`LandingDiscoveryStories`** `:4856` — **near the top**, desktop-only + google-landing + post>30d only
7. AiVerifiedDisclaimer / AiAdditionBox (conditional) `:4857`
8. Post content `.sod-post-content` with inline `PostImageCarousel` + auto-linked numbers `:4865`
9. OneTreeWidget (if `data-sod-onetree`) `:4887`
10. SiteChangelog / UpdatesBox signup (marker-gated) `:4892-4900`
11. PostGalleryLinks + Lightbox `:4902`
12. Tags row `:4904`
13. ~~bottom share~~ **DEAD** `{false && …}` `:4918`
14. PopularPrayersBox (prayer posts) `:4952`
15. **PostFollowBox** (follow by category+author) `:4961`
16. Cipher link + **Discourse** comments (only if `cipher_slug`) `:4967`
17. Collapsed WordPress comments archive (if any) `:4983`
— then global Footer.

**FACT — what is at the BOTTOM of a post today:** Tags → (dead share) → PopularPrayersBox(prayer only) → PostFollowBox → cipher+Discourse(cipher only) → collapsed WP comments → Footer.

**FACT — explicitly ABSENT on post pages:** "ראו גם"/related content (only a CSS comment `:2202`); Reality Stream / HomeReality; live Spot.IM comments (`SpotimComments` dead); no dedicated bottom "latest updates" (the only "latest" is the top-of-post desktop landing rail).

---

## 11. STORY — CURRENT PLACEMENT (instrumented v1)

**FACT — canonical viewer `StoryViewer` (`StoryViewer.jsx`):** `createPortal(ui, document.body)` (`:172`); overlay `fixed inset:0 zIndex:2147483000 background:#000` (`:110`); inner stage `maxWidth:480; margin:0 auto; height:100%` (`:113`) — same desktop/mobile (desktop = black letterbox sides). Locks body scroll (`:98`); tap zones L/C/R; image auto-advance 6000ms; video/YT advance on end.

| Surface | Component | file:line | form | desktop | mobile | viewer entry/surface |
|---|---|---|---|---|---|---|
| **HOME** | OrGeulaStoryChip | mount `HomeNewPage.jsx:468` | chip/card, max **660** | same | same | `surface=HOME entry=chip` |
| **HOME** | HomeOrGeulaRail | mount `HomeNewPage.jsx:500` | horizontal rail, ~160×160 tiles | same | same | `surface=HOME entry=rail` |
| **CHAT** | MergedStoriesRail (mobile) | `legacy.jsx:4326` | horizontal rail, 66px circles | hidden ≥1000px | shown | `surface=CHAT entry=rail` |
| **CHAT** | MergedStoriesRail (desktop) | `legacy.jsx:4356` | 320px **sticky column** `top:78` | shown ≥1000px | hidden | `surface=CHAT entry=column` |
| **OR_GEULA_PAGE** | OrGeulaPage grid+lightbox | `OrGeulaPage.jsx:106,141` | grid `minmax(230,1fr)` + own portal lightbox `z:2147483000` | same | same | `surface=OR_GEULA_PAGE entry=grid/deeplink` |
| **VIDEO_CATEGORY** | HomeOrGeulaRail | `TaxonomyPage.jsx:153` | same as HOME rail | same | same | `surface=VIDEO_CATEGORY entry=rail` |
| **POST_PAGE** | LandingDiscoveryStories → MergedStoriesRail | `legacy.jsx:4856` | bordered card w/ rail | **desktop-only** + landing-gated | effectively hidden | `surface=POST_PAGE entry=rail` |

**FACT.** Instrumentation is runtime-verified (separate `story-system-audit.md` PART IV + runtime-verification work_log). This section is layout-only; **no story change requested or made.**

---

## 12. OVERLAP / Z-INDEX AUDIT — actual collision risks

**FACT — z-index has no scale.** Three disjoint clusters: normal `0–400`, overlay `840–10000` (wildly spaced), near-INT_MAX `2147483000–…601`. Every value is a literal. Full sorted inventory captured (Navbar 100 · NumberDrawer 140/150 · LiveChannelFeed FAB 150 · UserCenter 4000/4001 · DimensionFiveFeed 5200 · SitePromoPopup 9400 · RoyalShareWidget 9999 · UpdateBanner 99999 · portals 2147483000+).

**REAL collision risks (not just a list):**

- **R2 — right-bottom corner is contested (real, currently managed).** NumberDrawer launcher (`right:18 bottom:28 z:140`) vs LiveChannelFeed FAB (`right:14 bottom:16 z:150`) — collision **avoided only** by `Layout.jsx:94` `hideLauncher={liveChrome||…}` on home/chat. **Any new route mounting both re-introduces overlap.** Same corner also hosts RoyalShareWidget panel (z:9999). No shared corner-offset system.
- **R3 — full-width bottom bars stack blindly (real).** StickyAnchorAd (`bottom:0 z:850`), PushPrompt (z:300), InstallPrompt (z:950), UpdateBanner (z:99999) are all `fixed bottom:0 full-width`. If two fire together they overlap with no coordination. The anchor ad lifts `.psf-wrap` via `body.sod-anchor-on` but does **not** lift page-level action bars → clash.
- **R4 — bottom-center toasts tie (real).** AiQuotaToast (`z:3500`) and ProfileNudge (`z:3500`) share the same corner **and** the same z → simultaneous overlap resolved by DOM order, not intent.
- **R5 — under-header sticky (real, localized to BeitMidrash).** BeitMidrash asides `position:sticky; top:20` (`BeitMidrashPage.jsx:763,1323`) pin 20px from top while the header is z:100/h64 → their top ~20–64px band paints **behind the header**. Should be `top:~72` like NumberDrawer. Contrast TimelinePage (`top:70`) / ArchivePage (`top:74`) which clear it correctly.
- **R6 — duplicate z:100 sticky (real).** `legacy.jsx:3766` is `sticky top:0 z:100`, identical to header → tie in the 0–64 band on any legacy route rendering both.
- **R7 — "rooms" z:50 vs header z:100 (real for Layout-wrapped rooms).** Fullscreen room overlays use `fixed inset:0 z:50` (GalaxyRoom/RoomEnter/RoomsExperience/GalaxyPage). Inside the z:1 wrapper the **header (z:100) paints over the "fullscreen" room**. Mitigated only because these routes are declared **outside** Layout (§1) — safe today, fragile if ever moved under Layout.
- **R8 — portal overlays tie at INT_MAX.** StoryViewer/BrandTicker/OrGeula/Gallery all `2147483000`; if two open together (e.g. StoryViewer + a BrandTicker modal) they tie. The INT_MAX values are a **workaround** for the §0 stacking trap, not a designed tier system.
- **R9 — horizontal-overflow risks.** `HintRoomPage.jsx:302` `width:100vw` (scrollbar-present desktop → horizontal scroll); research `.rw-sheet` off-canvas `left:-100%` (`theme.js:337`) can transiently widen layout if not clipped; several `min(px,100vw)` fixed panels.
- **R10 — research shell double-scroll.** `.rw` is `height:100vh; overflow-y:auto` (`theme.js:34`) — its own scroll container, so its sticky `.rw-head`/`.rw-subbar` pin to the shell, not the window. On research routes (outside Layout, no global header) this is fine; risk only if ever nested under Layout.

**DOWNGRADED (reconciliation): R1** — an earlier sweep flagged UpdatesBar bubble (z:945) vs DimensionFiveCloud (z:3500) overlapping at right-bottom. But **UpdatesBar is commented out** at `App.jsx:243` (not mounted). DimensionFiveCloud **is** mounted (Home only, `HomeNewPage.jsx:717`, desktop-only). → **R1 not currently active** (no live second widget in that exact slot); watch if UpdatesBar is ever re-enabled.

---

## 13. DESIGN TOKENS / GLOBAL RULES — what exists vs missing

| Axis | Canonical token? | Where |
|---|---|---|
| Color (raw `C` + semantic `PALETTES`) | ✅ **Yes** (fully systematized, via `usePalette()`) | `theme.js:4-24`, `palette.js:10-70,81` |
| Font family (`F.*`) | ✅ Yes (low variety — most → 'Heebo') | `theme.js:31-38` |
| Type roles (`T.eyebrow/micro/body/lead`) | 🟡 Partial/new, barely applied | `theme.js:42-47` |
| Global CSS base (`html 16.5px`, readability floor) | ✅ Yes | `theme.js:74-111` |
| Research sub-tokens (`RW.radius=16`, `RW.tap=44`, `--r/--acc`) | ✅ Yes but **scoped to /research only** | `lib/research/theme.js:4-26` |
| **z-index scale** | ❌ **Missing** — magic literals | — |
| **Header height** | ❌ **Missing** — `64` literal + scattered offset guesses | `Navbar.jsx:629` |
| **Container / max-width** | ❌ **Missing** — per-page literals | — |
| **Breakpoints** | ❌ **Missing** — ~25 bespoke thresholds | — |
| **Spacing scale** | ❌ **Missing** — raw padding/gap literals | — |
| **Border-radius (global)** | ❌ Missing (only research has `--r`) | — |
| **Button sizing** | ❌ Missing (color-only in palette) | — |
| **Card spacing / shadow / elevation** | ❌ Missing (color-only) | — |

**UNKNOWN:** whether any global `:root{}` CSS-var file exists outside `src/` (e.g. `index.html`/`index.css`) — not inspected; all found token systems are JS-object based.

---

## 14. PAGE WIDTH MATRIX

| ROUTE | DESKTOP WIDTH | MOBILE | HEADER | HERO | SIDEBAR | STICKY | NOTES |
|---|---|---|---|---|---|---|---|
| `/` HOME | 1180 (feat 1360) | full | global | **A+B** | no | chip/rails in-flow | canonical HomeNewPage |
| `/home-classic` | 1360 | full | global | no | no | — | HomePage (not `/`) |
| `/community/chat` CHAT | 1240 | 900 | global | no | **yes 320** | story col `top:78` | legacy.jsx; Spot.IM embed |
| `/number/:phrase` NUMBER | 920 | full | global | own | no (hub rails) | on-scroll bar `top:0 z:200` | clean work env; no home hero |
| `/code` CODE | full-bleed | full | global | no | no | tool bottom-bar z:30 | footer hidden |
| `/codes` CIPHERS | 1080 | full | global | no | no | — | library grid |
| `/or-geula` OR_GEULA | 1160 | full | global | no | no | portal lightbox | grid + own player |
| `/category/:slug` VIDEO/CAT | 1280 | full | global | no | no | — | HomeOrGeulaRail (video cats) |
| `/:slug` POST | 780–800 | full | global | media | ads ≥1500 | anchor ad (mobile) | legacy.jsx; landing rail top |
| `/community` COMMUNITY | 980 | full | global | no | no | — | placeholder |
| `/broadcasts` BROADCASTS | 1180 | full | global | no | no | — | embeds ForumFeed 760 |
| `/research` WORKSPACE | full-width shell | full | **none** | no | rails | shell `.rw-head/.subbar` | **outside Layout** |
| `/beit-midrash` | 760 | full | global | no | asides | **buggy `top:20` (R5)** | asides pin behind header |
| `/heichal` HALL | fullscreen | fullscreen | **none** | no | no | fixed inset:0 | outside Layout |
| `/admin` ADMIN | 100% | full | global | no | no | tab-local only | full-bleed tabbed |
| `/profile` PERSONAL | 440 card | full | global | no | no | — | opens UserCenter drawer |

---

## 15. SUMMARY

### 15.1 Things that already work — DO NOT TOUCH
1. **Sticky header model** — `sticky top:0 z:100 h:64` needs no content offset; solid (`Navbar.jsx:622`).
2. **In-flow sub-bars** (English / Celestial / Elul) push content down, never overlap (`Layout.jsx:65-78`).
3. **NUMBER page is a clean separate work environment** — no home-hero leak (`EntityPage.jsx`). Correct per `research_workspace_law`.
4. **Home hero is HOME-only** (banner A inline; reality B only on Home + intentional `/archive`).
5. **Color/palette token system** — the one fully-systematized axis (`palette.js` + `usePalette`). Reuse it, don't fork.
6. **Story instrumentation v1** — runtime-verified, layout stable across 7 surfaces (§11). Do not re-open.
7. **Fullscreen experiences declared outside Layout** — the reason rooms/heichal/research don't fight the header (§1). Keep that boundary.

### 15.2 Things that look UNDEFINED (missing rules, not bugs)
1. **No `HEADER_H` token** — 64px re-guessed as `72/74/70/66/78/112/20` across the app (§1.1, §13).
2. **No container/max-width token** — 11 different content widths hardcoded per page (§3, §13).
3. **No z-index scale** — magic literals in 3 disjoint bands; INT_MAX tier is a workaround (§0, §12, §13).
4. **No breakpoint / spacing / radius / button / shadow scales** (§13).
5. **Canonical page-width/offset lives nowhere** — changing "the site column" = editing every page.

### 15.3 Real layout problems (localized, low-blast-radius)
1. **R5 — BeitMidrash sticky asides `top:20` paint behind the z:100 header** (`BeitMidrashPage.jsx:763,1323`). Concrete visual bug.
2. **R6 — duplicate `sticky top:0 z:100`** at `legacy.jsx:3766` ties with the header.
3. **R4 — AiQuotaToast + ProfileNudge share corner AND z:3500** → overlap on simultaneous show.
4. **R2 — right-bottom FAB corner over-subscribed** (NumberDrawer/LiveChannelFeed/RoyalShareWidget), collision avoided only by an ad-hoc `hideLauncher` guard.
5. **R3 — full-width bottom bars (ad/push/install/update) stack with no coordinator.**
6. **R9 — `width:100vw` on `HintRoomPage.jsx:302`** = horizontal-scroll risk.

### 15.4 Existing exceptions (by-design, noted for the record)
- Routes **outside Layout** (no header/footer): `/research`, `/heichal`, `/enter`, `/stream`, galaxy/experience/rooms (§1).
- `/code` and `/admin` are **full-bleed**; `/code` hides the Footer (`Layout.jsx:90`).
- `/profile` is a **440px redirect card**, not a real page — the personal area is the **UserCenter left drawer** (z:4000/4001).
- EntityPage has its **own** `fixed top:0 z:200` header (not the global nav).
- `DimensionFiveCloud` is **Home-only + desktop-only** (`HomeNewPage.jsx:717`), not global.

### 15.5 Needs ZURIEL decision
1. **`/archive` rendering the reality-stream hero** — intentional (archive = reality's own gallery) or trim to Home-only? (§6)
2. Whether to introduce **canonical tokens** (`HEADER_H`, container width, z-index scale, breakpoints) before the upcoming positioning work — this is the lever that makes "move X" a one-line change instead of an N-file edit. (Design decision, not done here.)
3. **Dead code disposition** (record only): `OrGeulaStoryColumn` default export, `SpotimComments`, post bottom-share `{false&&}`, disabled Layout bars — leave, or clean in a later pass?

### 15.6 NEXT ACTION
- This document is **read-only current state**. No redesign, no fixes, no tokens created, no code/DB/deploy touched.
- **Recommended next step (on ZURIEL's word):** pick the smallest safe win — either (a) codify a `HEADER_H` + shared container token as the foundation for the positioning work, or (b) fix the one concrete visual bug **R5** (BeitMidrash `top:20`→`top:72`). Both are isolated and reversible. Await ZURIEL's choice of what moves first before any WRITE.
