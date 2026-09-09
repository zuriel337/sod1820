# Bot-Resilient Experience Projection V1 — Audit & Slice Planning

**Task key:** `BOT_RESILIENT_EXPERIENCE_PROJECTION_V1`
**Type:** READ-ONLY AUDIT + PLANNING. No product code, no DB change, no rule change, no merge, no deploy.
**OWNER CHECK:** `EXTEND_EXISTING` — this document creates no analytics, share, bot, SEO, activity, navigation, graph, registry, pulse-store or recommendation owner.
**Branch:** `claude/bot-resilient-experience-audit-18ot95` — branch-only.
**Date:** 2026-09-09

Companion `work_log` rows: BEFORE `f0e775cf-9fda-448a-89b4-62a9dc980401`.

---

## 1. LIVE BOOTSTRAP

Everything below was resolved live in this session. Nothing is carried from the prompt or from agent memory (`live_state_sync_law`, `live_state_resolution_law`).

| Source | Live value |
|---|---|
| `origin/main` | `b32ce03dcdf1b285fca2c96f587624f2a924bcc2` (after `git fetch origin --prune`) |
| Local HEAD | identical to `origin/main`; 0 ahead / 0 behind; `git status --porcelain` empty |
| Branch | `claude/bot-resilient-experience-audit-18ot95` |
| Supabase | `linswmnnkjxvweumprav` — the only project read; **reads only** |
| `work_log` | read via the canonical projection `public.work_log_current` (never a raw `select *`) |
| Active rules read live | `inter_agent_coordination_law` v8 · `traffic_intelligence_law` v8 · `canonical_ui_components_law` v5 · `share_placement_law` v1 · `spatial_gematria_law` v4 · `live_state_sync_law` v1 |
| Visual foundation | W0.5 CLOSED and released (`work_log` `99b641bb`, `f1893423`); `SOD1820_DESIGN_CONTRACT_V1.md` Tiers A–D read from `origin/main` |
| Roadmap | resolved live, not pinned — `AGENT_HANDOFF.md` stopped pinning a version in PR #409 (`473e7a93`, `5c890f50`, merged `b32ce03d`) |

**Release-state vocabulary is kept separate throughout:** `DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`.

### 1.1 Live crawler evidence (14 days, `crawl_daily`)

This is measured traffic, not estimation. It is the empirical basis for every fan-out claim below.

| Bucket | Bot hits | Blocked at edge |
|---|---:|---:|
| `post/slug` | 47,312 | 1,617 |
| **`/number`** | **30,354** | **5,333** |
| `home` | 24,585 | 8,778 |
| `other` | 15,055 | 6,268 |
| `/topic` | 2,143 | 37 |
| `posts` | 1,158 | 184 |
| everything else | < 600 each | — |

Top bots: Meta 66,659 · other 18,864 (17,646 blocked) · Baidu 17,599 · **Googlebot 8,785** · ClaudeBot 2,873 · Applebot 2,736 · Bingbot 1,532 · GPTBot 905.

**≈25,000 crawler hits on `/number/*` in 14 days pass the edge unblocked.** Googlebot executes JavaScript, so a meaningful share of those become full SPA renders — which matters for every "does a bot reach this code path" question below.

---

## 2. W1 SLICE 1 RECONCILIATION

Reverified live from `work_log` AFTER row `931004d7-a23d-4dc7-af60-3f1c6c798103` and from the branch itself — **not** assumed from the prompt.

- Branch `claude/session-cccd10bb-imq10w`, head `730ef0e8`, **0 behind `origin/main`**, clean.
- State: IMPLEMENTED · COMMITTED · PUSHED · **BRANCH-ONLY**. No PR. **NOT MERGED · NOT DEPLOYED · NOT LIVE.**
- Diff vs main: 9 files, +592 / −48.
- CLAUDE has already **released** primary write on `W1_SLICE1_ADAPTIVE_SHELL_CONTEXT_SPINE_V1`. The shell surface is free.

**Answers to the four reconciliation questions:**

1. **What Shell/context slots now exist?** `src/lib/shell/slots.js` declares exactly five: `orientation` (IMPLEMENTED, admin pilot gate), `commands` (IMPLEMENTED, admin pilot gate), `globalNavigation` (SLOT_PREPARED), `raziel` (SLOT_PREPARED), `myWorkspace` (SLOT_PREPARED). It is an inert **declaration**, not a registry — no component, no store, no render.
2. **Is a future World Pulse / Activity slot naturally supported?** **Yes, and it does not exist yet.** There is no `activity`/`pulse` slot. Adding one is a purely additive entry in the same declaration file, with an honest `status`, reusing the existing spine (`shellContext.js`) — no new store, no new registry. This is the cleanest available seam and it costs nothing to leave unclaimed.
3. **Do ShareActions have a suitable canonical placement?** Placement is **already solved and must not be re-solved here.** `share_placement_law` v1 + `floatingShareShown(pathname)` in `src/lib/share.js` is the single source of truth; `ShareActions` renders itself only where the floating widget is absent. Slice 1 did not touch it and did not create a share slot. Adding one would be a *second* placement authority — rejected.
4. **Would any proposed Slice 2 work duplicate W1 capability?** No, for the candidate in §15 — it touches telemetry-write gating and indexability, not shell projection. **But see §3.1: the "Slice 2" label is already claimed.**
5. **Should the branch be consumed first?** **Recommended yes.** Slice 1 is 0 behind main and green; leaving it unmerged while a second slice starts is how base drift and duplicate spines get created. This is a Human-Gate decision (§19), not mine.

W1 Slice 1 is **not rewritten, not re-planned and not touched** by this document.

---

## 3. OWNER TREE

Every owner below was resolved live. **No new owner is proposed anywhere in this document.**

| Domain | Canonical owner (live) | This session's posture |
|---|---|---|
| Analytics interpretation, bot/human/unknown, read-models, confidence | `traffic_intelligence_law` v8 (GPT_ANALYTICS) | **READ ONLY.** Not modified, not extended. |
| Share UX, channels, modalities, share/share_story production, attributed URLs | `ShareActions.jsx` · `share.js` · `propagation.js` (GPT_SHARE), per `SHARE_ATTRIBUTION_CONTRACT_SYNC` row `1edf4edd` | **READ ONLY.** Boundaries identified only. |
| Share placement | `share_placement_law` v1 + `floatingShareShown()` | Unchanged. |
| Shared UI components | `canonical_ui_components_law` v5 | Unchanged. |
| Visual language / render tiers | `SOD1820_DESIGN_CONTRACT_V1.md` Tiers A–D (W0.5, CLOSED) | Consumed, not extended. |
| Spatial research surfaces | `spatial_gematria_law` v4 | Consumed. |
| **Indexability / SEO** | `api/sitemap.js` + `public.sitemap_numbers()` + `public.is_number_indexable()` + `src/lib/seo.js applySeo()` + `src/routes.jsx ROUTE_META` + CI gate `scripts/check-observability-seo-gate.mjs` | Audited; extension proposed **inside** these files only. |
| Edge crawler policy | `middleware.js` (classify → goodbot/ai/bot, `EXPENSIVE_PATH`, big-number gate, `log_crawl`) + `public/robots.txt` | Audited; extension proposed **inside** these files only. |
| Bot classification primitive | `isBot()` in `src/lib/events.js` (edge `vb` cookie verdict, UA fallback) | **Reused as-is.** No second bot system. |
| Shell slots | `src/lib/shell/slots.js` (W1 Slice 1, branch-only) | Additive declaration only, if authorized. |
| Inter-agent coordination | `inter_agent_coordination_law` v8 — journal only, ZURIEL never relays | Followed. |

**There is no third semantic owner in this document.** Analytics meaning stays with GPT_ANALYTICS; share/button meaning stays with GPT_SHARE; CLAUDE audits the implementation boundary.

### 3.1 ⚠️ Naming collision — the "Slice 2" label is already claimed

`work_log` row `81ef997d` (FROM=SHARE_WORKSTREAM, TO=CLAUDE) dispatches **`W1_SLICE2_CANONICAL_CONTROLS_SHARE_2029_FOUNDATION_V1`**, status `QUEUED_WRITE_ACK_REQUIRED`. It is unacked and unstarted by this session.

That dispatch owns shared-control normalization and the Share Object / intent foundation. The candidate in §15 is deliberately scoped so it **cannot** collide with it (it touches no control component, no `ShareActions`, no share telemetry production). But two things named "W1 Slice 2" is exactly the drift this project keeps paying for. **The Human Gate must sequence and rename before either is built** (§19 D1).

---

## 4. CURRENT FAN-OUT MAP

### 4.1 Route topology (`src/App.jsx`)

Two catch-alls define the addressable space:

- `/number/:phrase` → `EntityPage` → `EntityPageBase`. The parameter is a **phrase, not a number**. `/number/1820` and `/number/דוד המלך` are the same route.
- `/:slug` → `PostBySlugRoute` (1,279 published posts) — single-segment catch-all.
- `*` → `<Navigate to="/" replace />`. **There is no 404.** Every unknown URL soft-redirects to home with HTTP 200 (the SPA rewrite in `vercel.json` serves `index.html` for everything). Soft-404 at unbounded scale.

### 4.2 Addressable vs indexable — measured live

| Surface | Addressable | In sitemap | Indexable (rendered `robots` meta) |
|---|---:|---:|---|
| `/number/<digits>` 10–9999 | 9,990 | **442** (`sitemap_numbers()`) | **noindex unless admitted** — fail-closed |
| `/number/<digits>` ≥ 10000 | unbounded | 0 | noindex; **edge-blocked for bots** unless in `bigContentSet` |
| `/number/<hebrew phrase>` | **unbounded** (any string) | **0** | **`index` — always. No gate.** |
| `/<post-slug>` | 1,279 | 1,279 | index |
| `/topic/:slug` | 206 | 206 | index |
| `/codes/:slug` | 43 | 43 | index |
| `/community/researcher/:slug` | 30 (auto `r-<hash>` excluded) | ~30 | index |
| `/forum/:id` | 49 approved | 49 | index (route itself is `lock_forum`-gated for humans) |
| `/book/:slug` | 4 | 4 | index |
| `/or-geula/video/:id` | per video | video-sitemap | index |

**The number gate is genuinely good and already exists.** `EntityPageBase.jsx:669-676`:

```js
const numberNoindex = isNumber ? (searchAdmitted !== true) : false;
```

`searchAdmitted` comes from `supabase.rpc("is_number_indexable", …)`, which is defined as `exists(select 1 from public.sitemap_numbers() where value = p_value)` — a **single source of truth shared with the sitemap**, fail-closed on RPC error or pending. Structured data (`DefinedTerm`/`WebPage`) is gated by the same one decision. This is the pattern the rest of the site should copy, not replace.

### 4.3 🔴 The hole: phrase pages are ungated

`isNumber === false` ⇒ `numberNoindex === false` ⇒ **every phrase page is `index`, unconditionally**, and gets full JSON-LD.

- Verified, published phrases in `gematria_words`: **12,596 distinct**. Every one is a linked, indexable, thin-to-medium page.
- The phrase space is **not** limited to those 12,596. `/number/<any string>` renders and indexes. A crawler that finds a Hebrew string anywhere can mint an indexable URL.
- **None of these 12,596 URLs are in the sitemap.** They are indexable but undiscoverable by declaration — discovered purely by internal link-following. So the site currently says one thing in the sitemap and a different thing in the page's own robots meta.

### 4.4 Per-page link fan-out — measured from render slices

Counted from the actual `.slice(...)`/`.map(...)` calls in `EntityPageBase.jsx`:

| Block | Links emitted | Target |
|---|---:|---|
| Words "taste" `slice(tasteStart, +24)` (L1555) | ≤ 24 | `/number/<phrase>` |
| Words second band `slice(+6, +16)` (L1680) | ≤ 10 | `/number/<phrase>` |
| AI-cross atlas `slice(0,6)` × 2 phrases (L1120-1125) | ≤ 12 | `/number/<phrase>` |
| AI-cross groups `slice(0,4)` × `slice(0,5)` (L1140-1147) | ≤ 20 | `/number/<phrase>` |
| Strongest partners (L1107) | ~1–5 | `/number/<phrase>` |
| Bridges hebrew/foreign (L531-533) | ~2–10 | `/number/<phrase>` |
| Convergences (L622, 1739, 1831, 1969) | ~2–12 | `/topic/:slug` |
| Posts (L2067) + harvest (L2073) | ≤ 7 | `/<slug>` |
| Ciphers (L2159) | N | `/codes/:slug` |
| Neighbours (L2049) | N | `/number/<n>` |
| Fixed nav / CTAs | ~8 | mixed |

**≈60–120 internal links per number page, of which ≈50–80 are `/number/<phrase>` URLs.**

**Boundedness verdict — honest, and better than feared:**
- Per-page fan-out **is bounded** by hard render slices. There is no unbounded per-page emission.
- The *closure* is bounded too: `max_words_one_value = 117`, `avg = 7.6`, only 1 value exceeds 100 words. The verified-phrase graph closes over ~12.6k nodes.
- **What is unbounded is the addressable space, not the emitted graph.** `/number/<arbitrary>` has no upper bound, and nothing marks such a page `noindex`.

So the correct statement is: *the graph SOD1820 links is bounded; the graph SOD1820 will index is not.*

### 4.5 Hidden-but-crawlable content

`EntityPageBase` accordions (`open` state, L688-694) default `words: true` and remember the user's choice in `localStorage`. Collapsed sections still render their links into the DOM in several branches. Because a crawler has no `localStorage`, it always sees the default state — so the crawler-visible link set is deterministic and equals the default. **Not a deception risk** (crawler sees a subset humans can also see), but it does mean collapsing a section is *not* a fan-out control. Fan-out must be controlled at retrieval, not at CSS.

---

## 5. SITEMAP / INDEXABILITY

**Owner:** `api/sitemap.js` (live, DB-driven per request, cached `s-maxage=21600`), rewritten from `/sitemap.xml` in `vercel.json`. A parallel static generator `scripts/gen-sitemap.mjs` + `.github/workflows/update-sitemap.yml` still exists — **flagged as a duplicate-logic risk**, since `api/sitemap.js` documents itself as "the same logic, live". Two implementations of one decision is exactly what `canonical_ui_components_law` forbids at the UI layer, and the same argument applies here.

**Live sitemap composition:**

| Section | Count | Gate |
|---|---:|---|
| Static top pages | 23 | hard-coded list |
| Posts | 1,279 | `tags ∌ {טיוטה, פורום}` — lifecycle signal, not a quality score |
| Numbers | **442** | `sitemap_numbers()`: gallery ∪ ≥20 distinct verified phrases ∪ approved convergence numbers, `value ≥ 10` |
| Topics | 206 | `topic_cards_public` (approved) |
| Codes | 43 | `els_records.status='published'` |
| Forum threads | 49 | approved, top-level |
| Researchers | ≤ 30 | auto `r-<hash>` profiles excluded |
| Books | 4 | `nodes.type='book' AND is_active` |
| Videos | per channel | `channel_updates` or-geula + video-primary posts |

**≈2,100 declared URLs.** That is a healthy, curated sitemap. The problem is not the sitemap — it is everything indexable that the sitemap never mentions.

### 5.1 robots.txt

`Crawl-delay: 10`, full `Disallow` for 8 commercial SEO bots, and path-level blocks on the expensive/private routes (`/admin`, `/traffic`, `/journey`, `/research`, `/reveal`, `/experience`, `/profile`, `/login`, `/auth`, `/api/`). Reinforced at the edge by `EXPENSIVE_PATH` in `middleware.js`, which 403s bots on those paths regardless of robots compliance. **This layer is sound.** Note `Crawl-delay` is ignored by Googlebot — the edge is the real control.

### 5.2 The additive four-state distinction — evaluated

The prompt proposes ADDRESSABLE / INDEX_WORTHY / DISCOVERABLE / FEATURED. **Three of the four already exist as behaviour** and need naming, not building:

| State | Meaning | Already projected by | Gap |
|---|---|---|---|
| ADDRESSABLE | the route resolves and renders | `App.jsx` route table | — |
| INDEX_WORTHY | `robots` meta allows indexing | `applySeo({noindex})` ← `is_number_indexable()` | **Not applied to phrase pages at all** |
| DISCOVERABLE | declared in `sitemap.xml` | `api/sitemap.js` | — |
| FEATURED | surfaced in a curated/prominent UI slot | `getTreasures()`, `topic_cards`, `lead_rank`, Human Gate | — |

**Verdict: do NOT create a registry.** The projection already exists; it is simply not applied uniformly. The correct move is to extend `is_number_indexable()` (or add a sibling in the same file/lineage) to answer the phrase case, and have `EntityPageBase` consult it for `isNumber === false` too. One decision function, two call sites — the pattern the number path already proves works.

**Current live inconsistency to name plainly:** a number page can be INDEX_WORTHY only if DISCOVERABLE (same source). A phrase page is INDEX_WORTHY *always* and DISCOVERABLE *never*. Those two rules were written by different decisions at different times. That is SSOT drift inside one file.

---

## 6. SHARE → ANALYTICS FEEDBACK LOOP AUDIT

Read live: `SHARE_ATTRIBUTION_CONTRACT_SYNC` (`work_log` `1edf4edd`). **Its semantics are accepted as given and are not extended here.**

### 6.1 The chain as implemented

```
Entity (number / post / video / 3D)
  → ShareActions.jsx  (channels: native, whatsapp, telegram, facebook, x, email, copy)
  → logShare(channel) → track("share", slug, "share", {platform, …})   [visitor_events]
                      → emit(...) dual-write                            [events, via ingest_event]
  → taggedShareUrl(url, channel)  →  ?rid=<visitor_id>&src=<wa|tg|fb|ig|x|email|copy|native>
  → outbound href to wa.me / t.me / facebook sharer  (target=_blank rel="noopener noreferrer")
  → recipient arrival
  → captureArrival() → track("propagation", landingKey(path), "arrival", {rid, landing})
  → Traffic Intelligence read-models (GPT_ANALYTICS)
```

`landingKey()` is correctly shared by both producer and consumer sides (the Sharing Foundation repair of 2026-09-05) — the join is sound.

### 6.2 Loops found

**LOOP-S1 — Attributed URLs leak into the crawlable web. CONFIRMED, MEDIUM.**
`ShareActions` renders real `<a href="https://wa.me/?text=…https://sod1820.co.il/x?rid=ABC&src=wa">` anchors with `rel="noopener noreferrer"` — **no `nofollow`**. Any crawler that reaches a share surface can parse our own attributed URL out of the sharer query string. When it then fetches `…?rid=ABC&src=wa`:
- `captureArrival()` fires (rid present, not the crawler's own id) → an **`arrival` event attributed to visitor ABC that no human produced**;
- `via()` in `events.js` resolves `src=wa` → the same fabricated arrival is classified as *WhatsApp-sourced* in the `events` pipeline too.
This is attribution poisoning, not merely volume. Mitigation is cheap and belongs to **GPT_SHARE** (`rel="nofollow"` on sharer anchors) — handed off, not decided here.

**LOOP-S2 — Query-parameter URL multiplication. CONFIRMED, LOW.**
`?rid=&src=` mint unlimited distinct URLs for one canonical page. `applySeo()` sets `canonical` to the clean path, so index bloat is contained. Crawl-budget waste is not.

**LOOP-S3 — Share count → prominence → crawlable links. CONFIRMED PATH, currently LOW.**
`post_share_counts` feeds `PopularPrayersBox` ("most shared"). Share events are written by `track()` into `visitor_events`, which **has no `is_bot` column and no bot gate**. A bot cannot easily click a share button, so exploitation is unlikely today — but the *mechanism* (unclassified share telemetry → ranked public surface → new crawlable links) is live and would be inherited by any future share-driven ranking. `SHARE_ATTRIBUTION_CONTRACT_SYNC` already declares `post_share_counts` "presentation-only, not Traffic Intelligence truth"; that declaration is correct and should be preserved when the Share 2029 foundation lands.

**LOOP-S4 — Share credit award. NOT REACHABLE by bots today.**
`trackShare()` calls `supabase.rpc("award_share_credit")`, capped server-side at 3/day and a no-op for anonymous visitors. Note `ShareActions` deliberately calls `track()` and **not** `trackShare()` — so the canonical share component does not award credit at all. Worth preserving explicitly when Share 2029 unifies the paths, or the credit path silently widens.

### 6.3 What is *not* a loop

Outbound sharer links go to external hosts. They waste crawl budget; they do not feed back. No self-feeding loop exists on the share path itself — the loops are all on the **arrival** side.

---

## 7. ACTIVITY / PULSE SELF-FEEDING RISKS

### 7.1 The structural finding

**Bot classification exists on the analytics path and is absent from the prominence path.**

| Table | Written by | `is_bot` column | Bot gate | Feeds public prominence? |
|---|---|---|---|---|
| `events` | `emit()` → `ingest_event` | ✅ yes | ✅ **rows dropped entirely** | no (analytics only) |
| `visitor_events` | `track()` | ❌ none | ❌ none | yes — share counts, section stats |
| `search_log` | `logSearch()` | ❌ none | ❌ none | **yes — Hot Numbers** |
| `page_views` | `logView()` | ❌ none | ❌ none | view counters (currently paused) |

Live confirmation of the `events` guard, from `pg_proc`:

```sql
-- public.ingest_event(..., p_is_bot boolean default false)
if coalesce(p_is_bot,false) then return; end if;
...
insert into events (..., is_bot, ...) values (..., false, ...);
```

**Two consequences the Analytics owner needs to know (handed off, not decided here):**
1. `events.is_bot` is `false` for **all 244,741 rows, all-time** — not because no bots arrive, but **by construction**: bot rows are discarded before insert and the column is hard-coded `false`. `events.is_bot` therefore carries no information and must never be read as "0% bot traffic".
2. **Two overloads of `ingest_event` coexist** — the older 13-arg signature has **no** bot guard and no `is_bot` in its insert. Any caller resolving to the old overload bypasses the drop entirely.

### 7.2 Signal-by-signal table

| Signal | Source | Classifier | Bot can drive? | Unknown can drive? | Adds public links? | Alters indexability? | Crawl loop? |
|---|---|---|---|---|---|---|---|
| **🔥 Hot Numbers** (`HomeNewPage` L657-667) | `search_log` 7d, `getHotNumbers` | **none** | **YES** | **YES** | **YES** — `/number/<n>` chips on the home page | no | **YES — LOOP-A1** |
| Activity Pulse (home) | RPC | n/a | — | — | no | no | **no** — paused by `PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1` |
| Activity Pulse (non-home) | RPC | none | yes | yes | no (kinds only, no content) | no | no |
| Recent Numbers (home) | live views | n/a | — | — | — | — | **no** — returns `null` on home |
| Recent Searches | `search_log` | none | yes | yes | **no — admin-only for the public** | no | no |
| Number view counter | `page_views` | none | yes (10–9999) | yes | no | no | no — display paused |
| River hot numbers (`RiverStream`) | `search_log` heat | none | yes | yes | yes, in-page | no | weak |
| Research Center hot chips | `search_log` | none | yes | yes | yes | no | weak (`/research` is edge-blocked for bots) |
| Share counts (`PopularPrayersBox`) | `post_share_counts` | none | not in practice | yes | yes | no | LOOP-S3 |
| Reality Pulse | `gallery_images.primary_value` + `occurred_at` | **content, not traffic** | **no** | **no** | curated | no | **no** |
| Treasures / convergences / `lead_rank` | Human Gate curation | n/a | **no** | **no** | yes | yes (sitemap) | **no** |

### 7.3 LOOP-A1 — the one live self-feeding loop

```
crawler renders /number/216  (Googlebot executes JS; ~25k unblocked /number hits per 14d)
  → EntityPageBase useEffect → logSearch(term, value)    → INSERT search_log   (no bot gate)
  →                            logView("number", value)  → INSERT page_views   (no bot gate)
  → getHotNumbers(7d) reads search_log
  → HomeNewPage renders <Link to="/number/216"> in NumberBubbles   [public, crawlable]
  → crawler follows the chip from the home page (24,585 home hits / 14d)
  → back to step 1
```

Every arrow is live code on `origin/main`. `logSearch` is session-guarded via `sessionStorage` and `logView` likewise — but a stateless crawler has no `sessionStorage`, so **the guard that limits humans does not limit crawlers at all**. `page_views` is skipped only for `value > 9999`; the entire 10–9999 range, which is what crawlers actually walk, is recorded.

Live search_log volume: 12,545 rows in 7 days, 79,327 all-time. Current top values by 7-day count: 216 (110), 450 (108), 98 (90), 776 (80), 140 (73), 57 (70), 1820 (67), 80 (62), 1111 (62). **Whether that ranking is human-authentic is an interpretation question that belongs to GPT_ANALYTICS, not to me** — I report only that the write path is unclassified and that ~25k crawler renders of `/number/*` occurred in the same window.

**The precedent for the fix already exists in the codebase.** `src/lib/journeyGuard.js` opens with:

```js
if (isBot()) { /* block, log, do not fire */ }
```

using `isBot()` from `src/lib/events.js` — the edge `vb`-cookie verdict with UA fallback. It was added in 07/2026 after bots fired ~1,222 journey AI messages in a week. That is the same primitive, the same reasoning, one layer away from where it is still missing. **Extending it is `EXTEND_EXISTING`; building a bot system is not needed and is explicitly out of scope.**

### 7.4 The proposed invariant — evaluated against live code

| Proposed invariant | Verdict against live code |
|---|---|
| Clean Human may contribute to visible Pulse | **Not achievable today** — no prominence writer knows whether the writer is human. |
| Unknown may be observed, never independently promote | **Violated** — `search_log` treats unknown as human by default. |
| Bot/anomaly = telemetry only, never a prominence driver | **Violated at exactly one live surface: Hot Numbers.** Everything else is either paused, admin-only, content-derived or Human-Gated. |
| Country alone is never human proof | **Held.** `vc` cookie is a `props` dimension only; it never gates promotion. |
| GA4 global anomaly never auto-promotes | **Held.** GA4 (`api/ga-insights.js`) is admin-dashboard-only; no public surface reads it. |

**I accept the invariant set, with one correction of emphasis:** the failure is not distributed across the product. It is one surface. The right response is a narrow, provable fix — not a pulse architecture.

`traffic_intelligence_law` v8 is **not** modified, proposed for modification, or reinterpreted by this document.

---

## 8. PREFETCH / AUTO-EXPANSION RISKS

Searched: `prefetch`, `preload`, `rel=prefetch`, eager route loading, `IntersectionObserver`, infinite scroll, auto-next, recursive API calls, background related-content fetch, route generation loops.

| Mechanism | Location | Class |
|---|---|---|
| `<link rel="prefetch">` / `rel="preload"` | **none found anywhere** | **SAFE** |
| Route prefetching / eager chunk loading | none — `React.Suspense` + lazy routes, load-on-navigate | **SAFE** |
| Reveal-on-scroll IO | `HomeNewPage` L175-184 | **SAFE** — adds a CSS class, `unobserve`s immediately, disabled under `prefers-reduced-motion`; **fetches nothing** |
| Sticky-nav IO | `EntityPageBase` L~760 | **SAFE** — boolean state only |
| River pass-tracking IO | `RiverStream` L93 | **SAFE** — visual state only |
| **Infinite scroll** | `GalleryPage` L66-83, `rootMargin: 600px` → `loadMore()` | **BOUNDED** — bounded by `total`, page-sized, and `/gallery` is `lock_galleries` (`mode='all'`) so bots get nothing; **would become RISK if the lock is lifted without a bot gate** |
| Manual load-more | `ExplorerPreviewPage` L424 | **SAFE** — explicit click |
| Number bundle fetch | `getEntityBundle` (`supabase.js` L1858+) | **BOUNDED** — every branch has an explicit `.limit()`; `phrases` `.limit(500)`, galleries 24/40, events 18, posts 3 |
| Journey AI auto-fire | `journeyGuard.js` | **BOUNDED** — 1 per root per session, hard cap 5, **explicit `isBot()` gate** |
| Recursive/route-generation loops | none found | **SAFE** |
| Related-content background fetch | `getBundle` only, on explicit navigation | **SAFE** |

**Nothing in this category is HIGH-RISK.** `getBundle`'s `.limit(500)` on phrases is the largest single payload; only 1 value in the DB exceeds 100 phrases, so it is over-provisioned rather than dangerous. Worth tightening opportunistically, not worth a slice.

---

## 9. BOT-RESILIENT EXPERIENCE INVARIANTS

The core principle offered was **RICH FOR HUMANS · BOUNDED FOR CRAWLERS**. The prompt asked me to challenge it against live code rather than accept it.

**Challenge: as stated, the principle is wrong in one respect and misleading in another.**

1. **"Bounded for crawlers" implies bots and humans should receive different content.** That is cloaking, and Google penalises it. The site already gets this right: `middleware.js` differentiates on *cost and access* (403 on `EXPENSIVE_PATH`, 403 on empty big numbers), never on *content*, and `/api/og` serves social bots a card — a representation, not a different truth.
2. **Fan-out is not actually the live problem.** Per-page emission is hard-sliced; the linked graph closes over ~12.6k verified phrases; there is no prefetch cascade and no recursive expansion. Believing "we have a fan-out problem" would send the next slice at the wrong target.

**The live problems are two, and neither is fan-out:**
- **(A) An indexability gap** — phrase pages are `index` with no gate, while the number path next to them has an exemplary fail-closed gate sharing one source of truth with the sitemap.
- **(B) An unclassified write path** — the prominence-feeding tables have no bot gate, while the analytics table has a hard one.

**Restated invariants — what I would actually hold the code to:**

- **I1. Same truth for everyone.** Bots and humans get the same content at the same URL. Differentiation is permitted on *cost*, *access* and *representation* — never on facts.
- **I2. One indexability decision per entity class, fail-closed.** Exactly one function decides; the sitemap and the page's `robots` meta both consult it; uncertainty means `noindex,follow`. **The number path already implements this. It is the pattern; nothing new is needed.**
- **I3. Prominence requires classification.** Any surface whose ranking is driven by observed traffic must read from a source with a bot verdict. No verdict ⇒ no promotion. Telemetry may still be written; it just may not rank.
- **I4. Depth is earned by interaction, not by identity.** Server bounds each response. Interaction increases *retrieval*, never *truth*.
- **I5. Curation outranks traffic.** Human-Gated FEATURED (treasures, convergences, `lead_rank`) is never overridden by an activity signal. Already held.
- **I6. Presentation carries no epistemic weight.** Glow, depth and motion may not imply verification, canonicity or importance unless backed by canonical semantic data (`spatial_gematria_law` §"verified finding vs interpretive layer").

---

## 10. GLASS / SPATIAL PROJECTION

Per `SOD1820_DESIGN_CONTRACT_V1.md` (W0.5, CLOSED): **Tier A** canonical rich UI (default minimum) · **Tier B** dynamic canvas / lightweight spatial · **Tier C** WebGL/WebGPU · **Tier D** XR/AR/VR (only after Tier C is proven).

**Lowest sufficient tier wins.** Mapping the bounded information this audit concerns:

| Information | Sufficient tier | Why not higher |
|---|---|---|
| Orientation / current focus (W1 Slice 1) | **A** | Text and state. Motion adds nothing. |
| Indexability state (ADDRESSABLE/INDEX_WORTHY/…) | **A**, admin-only | Diagnostic. Never a public visual. |
| Activity / pulse, if ever surfaced | **A**, with **B** allowed for a single shared liveness primitive | Contract §114: a Tier B/C primitive reused across surfaces needs **one owner and one lifecycle/perf policy**. A second animation loop per surface is forbidden. |
| Number / entity relationships | **A** today; **C** only where `spatial_gematria_law` already governs | Depth must be earned by a proven need, not by novelty. |

**Two statements to keep on the record:**

1. **Glass, 3D and motion are presentation. They do not bound bots.** A WebGL surface is *more* crawl-hostile only by accident (bots skip the canvas), and relying on that is cloaking by omission. Protection comes from retrieval limits, indexability decisions and edge policy — §5, §7, §9. Never from the render tier.
2. **Visual intensity must not encode epistemic status.** A brighter, deeper or more animated number must not read as *more true*, *more canonical*, *more human-verified* or *more important* unless a canonical semantic field says so. Today's Hot Numbers bubble sizing does exactly the thing I6 forbids: it derives visual weight from unclassified traffic, and a reader cannot tell that from looking at it.

---

## 11. WORLD PULSE PLACEMENT

**Recommendation: do not place it yet, and do not build a capability for it in the next slice.**

Reasoning from live state, not from preference:

- The one public traffic-driven visual ranking that exists (Hot Numbers) is **currently unsafe** by I3. Building more projections of a capability whose input is unclassified multiplies the defect.
- `PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1` is **live on main right now** and has already paused Activity Pulse and Recent Numbers on the home page. Someone deliberately turned public traffic surfaces down. Turning a bigger one up mid-experiment would fight that decision.
- W1 Slice 1's `slots.js` has **no** activity slot, and adding one is cheap and additive **later**. Nothing is lost by waiting; a premature slot invites a premature store.

**When it is eventually placed**, the shape below is what the existing owners already support — recorded now so it is not re-derived:

- **One capability, context-specific projections:** Home → world activity · `/number/:n` → activity around this number · `/topic/:slug` → around the topic · `/book/:slug` → around the source · My Workspace → personal attention · Admin → operational.
- **One slot** in `src/lib/shell/slots.js` (declaration only), **one component**, **one lifecycle/perf policy** (contract §114), rendered through props per surface — `canonical_ui_components_law` v5.
- **Input must satisfy I3.** No bot verdict on the source ⇒ that source may be observed, never ranked publicly.
- **Not a dashboard.** A projection, in the shell, reading one classified source.

---

## 12. SHARE INTEGRATION BOUNDARY

GPT_SHARE owns the UX. This section states **only** where the implementation boundary falls, per the sync contract.

**Already correct — do not rebuild:**
- One capability: `ShareActions.jsx` (`canonical_ui_components_law` v5).
- One placement authority: `floatingShareShown(pathname)` (`share_placement_law` v1) — pages declare nothing.
- One attribution producer: `taggedShareUrl()` → `rid` + `src` (`propagation.js`).
- One landing normaliser used by both sides: `landingKey()`.
- One OG representation path: `/api/card` → `/api/og`, routed by UA in `vercel.json`.

**Boundary conditions this audit adds (implementation-level, no new semantics):**

- **B1.** Every new canonical route needs a branch in `api/og.js`, or it silently gets no share image. Not optional; it is how the existing OG owner works.
- **B2.** Share anchors are outbound links to third-party sharers and currently carry no `rel="nofollow"` (LOOP-S1). **Handed to GPT_SHARE.** It is a one-attribute change in `ShareActions.jsx` and it closes a real attribution-poisoning path.
- **B3.** `ShareActions` calls `track()` and *not* `trackShare()` — so the canonical share component does **not** award share credit. Whether Share 2029 unifies them is a GPT_SHARE + Human-Gate decision with a credit-economics consequence; it must not happen by accident during a refactor.
- **B4.** Share telemetry lands in `visitor_events`, which has **no bot verdict** (§7.1). If Share 2029 introduces any share-driven ranking, it inherits LOOP-S3. **This is a coordination item for GPT_SHARE + GPT_ANALYTICS**, not something this session decides.
- **B5.** Any *new* share telemetry field or subtype goes through `SHARE_ATTRIBUTION_CONTRACT_SYNC` to GPT_ANALYTICS first, per row `1edf4edd`. **This document proposes none.**

**No share UX, channel, modality or event semantics are designed, altered or recommended here.**

---

## 13. PREMIUM READINESS

Live tier model: `platform_tiers_law` levels 0–5, `profiles.tier`, RLS per tier, `Sod Credits`. Payment integration is **not** built (Hyp not integrated; `/members` is a "coming soon" placeholder; credits are manual/admin-approved).

Compatibility of the boundaries proposed here with Public / Registered / Premium / Deep Premium:

- **Entitlement and interaction-earned expansion are orthogonal, and must stay so.** *Interaction* decides **how much** is retrieved. *Entitlement* decides **what may be retrieved at all**. Collapsing them produces either a paywall that leaks or an interaction model that discriminates.
- **No duplicate premium pages.** A number is `/number/:n` for everyone. Depth varies; identity, URL and canonical do not. Consistent with `unified_graph_law` and the "draw once, reference everywhere" rule.
- **Never send-then-hide.** Client-side hiding of a paid payload is both a leak and a `robots`/cloaking hazard. The server must bound the response. `getEntityBundle`'s existing `.limit()` discipline is the right shape; the existing gate at `EntityPageBase` L1061 (`/login?next=…`) already withholds *retrieval*, not merely display.
- **No different truth.** A premium reader may see more relations. They may not see *contradictory* ones.
- **No hidden-graph leakage.** Relation counts, teaser chips and "N more" labels must not enumerate gated entities. Worth an explicit check when tiers are actually enforced — **not** part of the candidate slice.
- **Indexability is tier-independent.** Only public-tier content may be INDEX_WORTHY. Today this is trivially satisfied (no paid content ships); it must be re-asserted the moment tier 2+ content exists.

**Verdict: the boundaries in §9 are premium-compatible and require no premium work now.**

---

## 14. DRIFT

Reported, not resolved. Nothing here is fixed from memory (`live_state_sync_law`).

| # | Type | Drift | Evidence |
|---|---|---|---|
| **D1** | Coordination | **Two different tasks are both named "W1 Slice 2."** `work_log` `81ef997d` (SHARE_WORKSTREAM → CLAUDE, `W1_SLICE2_CANONICAL_CONTROLS_SHARE_2029_FOUNDATION_V1`, QUEUED) vs. the W1 Slice 1 AFTER, which names "desktop Sidebar projection of Global Navigation" as the Slice 2 candidate, vs. this audit's candidate. | `work_log` `81ef997d`, `931004d7` |
| **D2** | SSOT | **Duplicate sitemap logic.** `api/sitemap.js` (live) and `scripts/gen-sitemap.mjs` + `.github/workflows/update-sitemap.yml` (static) both claim to compute the sitemap. `api/sitemap.js` says "same logic, live". Two implementations of one decision. | files on `origin/main` |
| **D3** | SSOT | **Indexability rule is internally inconsistent.** Number pages: fail-closed, one source shared with the sitemap. Phrase pages next to them: always `index`, never in the sitemap. One file, two philosophies. | `EntityPageBase.jsx:669-676` |
| **D4** | DB / semantics | **`events.is_bot` is always `false` by construction** (bot rows dropped, column hard-coded), so 0/244,741 is not evidence about bot volume. **And two `ingest_event` overloads coexist** — the older 13-arg signature has no bot guard. → **GPT_ANALYTICS** | `pg_proc`, live |
| **D5** | Implementation | **`PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1` is incomplete.** It paused `ActivityPulse` and `RecentNumbers` on the home page and the number-page view counter, but **not** the Hot Numbers bubbles — the one remaining public, traffic-driven, link-generating surface. Likely an oversight; it is the exact locus of LOOP-A1. | `ActivityPulse.jsx`, `RecentNumbers.jsx`, `HomeNewPage.jsx:657` |
| **D6** | Implementation | **No 404 anywhere.** `<Route path="*">` → `<Navigate to="/">`; the SPA rewrite returns HTTP 200 for every URL. Unbounded soft-404s. | `App.jsx`, `vercel.json` |
| **D7** | Test infra | 8 test files under `test/` fail on pristine `origin/main`, and **no workflow runs `test/` at all**. Already reported in the Slice 1 AFTER; re-confirmed, still open. | `work_log` `931004d7` |

---

## 15. EXACT SLICE 2 CANDIDATE

> **Naming:** because of **D1**, this candidate is **not** called "Slice 2". Proposed key:
> **`BOT_RESILIENT_PROMINENCE_AND_INDEXABILITY_V1`**.
> Sequencing against the SHARE workstream's queued slice is a Human-Gate decision (§19 D1).

**One coherent slice. Two changes that share one root cause: a decision that exists in one place and is missing one layer away.**

### Part A — Bot gate on the prominence-writing path (closes LOOP-A1)

**Root cause:** `isBot()` already exists (`src/lib/events.js`) and is already used as a hard gate one layer away (`journeyGuard.js`). It was never applied to the writers that feed public ranking.

1. In `src/lib/supabase.js`, gate `logSearch()` and `logView()` on the existing `isBot()` — same import, same primitive, same pattern as `journeyGuard.js`. **No new bot system, no new table, no new column, no schema change.**
2. Record each suppression through the **existing** logging path used by `journeyGuard` so the suppression is measurable rather than invisible.
3. **Explicitly excluded: `track()` / `visitor_events`.** That is share-telemetry production and belongs to GPT_SHARE + GPT_ANALYTICS (§12 B4). Touching it here would cross an owner boundary.

*Result:* Hot Numbers becomes human-derived. `traffic_intelligence_law` is untouched — `events` never received bot rows in the first place.

### Part B — Extend the existing indexability decision to phrase pages (closes D3)

4. Extend the **existing** indexability source of truth to answer the phrase case — one function, in the `sitemap_numbers()` / `is_number_indexable()` lineage, with an explicit admission rule (proposed: a phrase is INDEX_WORTHY iff it is `is_verified AND is_published` in `gematria_words` **and** its value is itself admitted; anything else `noindex,follow`). **Human-Gate input required on the rule** (§19 D2) — I will not invent the admission threshold.
5. In `EntityPageBase.jsx`, have the `isNumber === false` branch consult it, exactly as the numeric branch already does. Same fail-closed default, same coupling to `showEntityLd`.
6. **No sitemap change.** Admitted phrases stay out of the sitemap unless the Human Gate says otherwise; this slice only stops the site from indexing pages it never declared.

### Explicitly NOT in this slice

World Pulse capability or slot · any share/control component · any `ShareActions`/`share.js`/`propagation.js` edit · `rel="nofollow"` on sharers (**GPT_SHARE**, §12 B2) · `traffic_intelligence_law` · any read-model or dashboard · the duplicate sitemap generator (D2) · the missing 404 (D6) · `visitor_events` classification (D4) · any Glass/spatial work · any premium/tier work.

### Acceptance criteria

- A request carrying a bot verdict writes **zero** rows to `search_log` and `page_views`; a browser session writes exactly what it writes today.
- Hot Numbers renders from human-only input; the component itself is unchanged.
- A phrase page that is not admitted emits `noindex,follow` and no entity JSON-LD; an admitted one is byte-identical to today.
- `is_number_indexable()` behaviour for numbers is **unchanged** — proved by test, not asserted.
- `npm run build` green; `node scripts/check-observability-seo-gate.mjs` green (no new gap, baseline unchanged).
- New tests: bot-gate behaviour, phrase-admission fail-closed, number-path non-regression.
- Branch only. No merge, no deploy, no release.

### Why these two belong in one slice

Both are the same defect in two layers: **a correct, fail-closed decision exists for numbers and was never extended to the adjacent case.** §7 fixes it on the write path, §5 on the index path. They touch disjoint files, share one test run, and neither can be validated meaningfully without the other's context. Splitting them would produce two slices that each re-derive the same live state.

---

## 16. FILES THAT WOULD CHANGE

*If — and only if — the candidate is authorised. Nothing was changed in this session.*

| File | Change |
|---|---|
| `src/lib/supabase.js` | `isBot()` guard in `logSearch()` and `logView()` (~6 lines + 1 import) |
| `src/pages/EntityPageBase.jsx` | phrase branch consults the extended admission decision (~10 lines, mirroring the existing numeric branch) |
| Supabase function in the `is_number_indexable` lineage | additive phrase-admission function; **no schema change, no table, no column** |
| `test/` | 3 new test files (bot gate · phrase admission fail-closed · number non-regression) |
| `docs/` | slice implementation record under this document's lineage |

Estimated product-code delta: **< 25 lines**, plus tests. That is the point — the decision already exists; only its reach is short.

---

## 17. FILES THAT MUST NOT CHANGE

- `src/components/ShareActions.jsx` · `src/lib/share.js` · `src/lib/propagation.js` — **GPT_SHARE**
- `src/lib/tracking.js` (`track`, `trackShare`) — share-telemetry production, **GPT_SHARE + GPT_ANALYTICS**
- `public.ingest_event`, `events`, every Traffic Intelligence read-model, the bot classifier's semantics — **GPT_ANALYTICS**; `traffic_intelligence_law` v8 is not to be edited
- `middleware.js` — edge policy is sound as-is; no change is needed for this slice
- `api/sitemap.js`, `public.sitemap_numbers()` — the sitemap's declared set is unchanged
- `src/lib/shell/*`, `OrientationHeader.jsx`, `LayoutCore.jsx`, `BottomBar.jsx` — W1 Slice 1, branch-only, not rewritten
- `src/pages/HomeNewPage.jsx`, `NumberBubbles*` — the Hot Numbers **component** is correct; only its input is fixed
- `public/robots.txt` · `vercel.json`
- Everything under `tools/els/`, `public/tzofen.html` — `els_single_engine_law`

---

## 18. CLAUDE VERDICT

### **REQUIRED** — Part A (bot gate on `search_log` / `page_views`)

LOOP-A1 is live, every arrow is verifiable on `origin/main`, and ~25,000 unblocked crawler renders of `/number/*` in 14 days supply it. It publicly misrepresents what humans are researching — which is a truthfulness problem on a site whose entire premise is evidentiary honesty — and it silently corrupts the input to any future activity/pulse capability. The fix reuses an existing primitive that already guards an adjacent path. Cost is a handful of lines; the cost of leaving it is paid into every downstream signal.

### **REQUIRED** — Part B (phrase-page indexability)

12,596 verified phrase pages are indexable with no gate, beside a numeric path with an exemplary fail-closed one; and `/number/<any string>` mints indexable URLs without bound. This is a single inconsistency inside a single file, and the correct decision function already exists. Leaving it means the sitemap and the pages tell Google two different stories.

### **USEFUL, not now** — `rel="nofollow"` on share anchors (LOOP-S1)

Real attribution poisoning, trivially fixed — but it lives in `ShareActions.jsx`, which **GPT_SHARE** owns and has a queued slice against. Handed off, not taken.

### **NOT NEEDED** — World Pulse capability, fan-out limiting, a new registry, Glass/spatial work

- Per-page fan-out is already hard-sliced; there is no prefetch cascade and no recursive expansion. Building fan-out limits would be solving a problem the code does not have.
- ADDRESSABLE / INDEX_WORTHY / DISCOVERABLE / FEATURED is already projected by existing owners; it needs **naming**, not a registry.
- World Pulse should not be built while its only possible input is unclassified, and while `PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1` is deliberately holding public traffic surfaces down.
- Render tier does not bound bots and must not be used as if it does.

### On the stated core principle

**RICH FOR HUMANS · BOUNDED FOR CRAWLERS** is directionally right but, taken literally, invites cloaking and points at the wrong defect. The formulation I would hold the code to:

> **Same truth for everyone. Retrieval bounded by interaction. Prominence bounded by classification. Indexability decided once, fail-closed.**

---

## 19. HUMAN-GATE DECISIONS NEEDED

- **D1 — Sequencing and naming (blocking).** Two tasks are both "W1 Slice 2": the SHARE workstream's queued `W1_SLICE2_CANONICAL_CONTROLS_SHARE_2029_FOUNDATION_V1` (`work_log` `81ef997d`), and this candidate. Which runs first, and does this one take the name `BOT_RESILIENT_PROMINENCE_AND_INDEXABILITY_V1`? **No implementation should start before this is answered.**
- **D2 — Phrase admission rule (blocking for Part B).** Proposed: INDEX_WORTHY iff `is_verified AND is_published` **and** the value is itself admitted. Anything else `noindex,follow`. This is an editorial threshold, and I will not invent it.
- **D3 — Sitemap declaration for admitted phrases.** Keep them out (this candidate's default), or declare them and gain ~12.6k sitemap URLs? An SEO strategy call, not a technical one.
- **D4 — Consume W1 Slice 1 first?** It is 0 behind main, green, branch-only, with no PR. Merge before starting anything else, or continue stacking?
- **D5 — Widen the Orientation Header past the admin pilot?** Still open from the Slice 1 AFTER.
- **D6 — Is D5 (Hot Numbers left un-paused) an oversight in `PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1`?** If it was deliberate, Part A's justification changes and should be re-argued.
- **D7 — Duplicate sitemap generator (D2 in §14).** Retire `scripts/gen-sitemap.mjs` + its workflow, or formally demote it to a fallback? Not in this candidate either way.
- **D8 — No 404 (D6 in §14).** Worth its own future slice, or accepted?

---

## RELEASE STATE

**READ-ONLY AUDIT COMPLETE · PLANNING DOCUMENT ONLY**
NO PRODUCT CODE CHANGE · NO DB CHANGE (beyond the two `work_log` coordination rows) · NO RULE CHANGE · NO MERGE · NO DEPLOY · NO LIVE CHANGE.

Implementation of §15 requires explicit authorisation and the resolution of §19 D1 and D2.
