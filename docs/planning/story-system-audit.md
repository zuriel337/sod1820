# Story System Audit — READ-ONLY

**actor=CLAUDE** · scope: audit only · **no WRITE, no migration, no DB change, no deploy, no code change.**
Window for analytics: **last 30 days**. Legend on every claim: **FACT** (verified in code/DB) · **MEASUREMENT GAP** · **INFERENCE** · **RECOMMENDATION**.

---

## 0. Components in scope (files)

| Component | File | Role |
|---|---|---|
| `StoryViewer` | `src/components/StoryViewer.jsx` | Full-screen player (portal). The one place `story_view` fires. |
| `HomeOrGeulaRail` | `src/components/HomeOrGeulaRail.jsx` | Horizontal rail of latest or-geula updates. |
| `OrGeulaStoryChip` | `src/components/OrGeulaStoryChip.jsx` | "New story" chip (whats_new, per-visitor). |
| `OrGeulaStoryColumn` (default) | `src/components/OrGeulaStoryColumn.jsx` | **DEAD** — see §3. |
| `MergedStoriesRail` (named) | same file | Chat rail (mobile) + column (desktop). |
| `LandingDiscoveryStories` (named) | same file | Post-page discovery block (very conditional). |
| `BRAND_OR_GEULA` / `BRAND_TZOFON` | same file | Brand configs (logo/ring/seenKey/trackKey). |

---

## 1. Surface Map

**FACT** — where story UI is actually rendered:

| surface | component | route | visible now? | mobile | desktop | source data | tracking (open→view→share) |
|---|---|---|---|---|---|---|---|
| Home — chip | `OrGeulaStoryChip` | `/` | only when fresh-since-last-visit | ✅ | ✅ | `channel_updates` ch=`or-geula`, limit 20, filter `created_at>seenCutoff` | click→`story_chip`; then `story_view`/item; share→`share_story` |
| Home — rail | `HomeOrGeulaRail` | `/` | **ACTIVE** (null only if no data) | ✅ | ✅ | `channel_updates` ch=`or-geula`, limit 10, `created_at desc` | click→**(untracked)**; then `story_view`/item; share (via viewer)→`share_story` |
| Chat — mobile rail | `MergedStoriesRail` | `/community/chat` (`SpotimChatPage`) | ✅ (mobile only via `.sod-chat-stories-mobile`) | ✅ | ❌ | `getVideoStories` (tzofon, `ours=true`) **+** `channel_updates` ch=`or-geula` | open→**(untracked)**; then `story_view`/item (section `tzofon` for our vids, `or-geula` for OG); share→`share_story` |
| Chat — desktop column | `MergedStoriesRail layout="column"` | `/community/chat` | ✅ (desktop only via `.sod-chat-videos`) | ❌ | ✅ | same as above | same as above |
| Or-Geula page | `OrGeulaPage` (own grid + own portal player, **not** `StoryViewer`) | `/or-geula`, `/אור-הגאולה` | ✅ | ✅ | ✅ | `channel_updates` ch=`or-geula` | mount→`view`; open→`play`; share→`share_story` |
| Video category | `HomeOrGeulaRail` | `/category/<video-cat>` (`TaxonomyPage`, `isVideoCat`) | ✅ | ✅ | ✅ | same as home rail | same as home rail |
| Post page | `LandingDiscoveryStories`→`MergedStoriesRail` | `/:slug` | only: desktop **AND** fresh-search-landing **AND** post >30d old | ❌ (desktop-gated `min-width:1000px`) | ✅ (conditional) | same as chat rail | same as chat rail |
| Broadcasts | — | `/broadcasts` | **none** | — | — | lists `or-geula` as a *channel*, no story UI | — |
| Community | — | `/community` | **none** | — | — | — | — |
| BrandTicker | — | — | renders **no** `StoryViewer` (`<StoryViewer` count = 0; comment-only) | — | — | — | — |

**INFERENCE** — the primary living story surfaces are **Home (chip + rail)**, **Chat (rail/column)**, and **/or-geula**. Broadcasts/Community have no stories.

---

## 2. `story_view` fires per item (auto-advance inflation)

**FACT** — `StoryViewer` (`StoryViewer.jsx:38-42`) fires `track(trackKey, cur.id, "story_view")` inside a `useEffect` keyed on `[idx]`. It runs on **initial item AND on every `next`/`prev` AND on auto-advance** (images auto-advance at 6s; videos on `onEnded`). `go(n)` past the last item calls `onClose` (no event).

**MEASUREMENT GAP** — `story_view` = *per-item impression inside an already-open viewer*, **not** an open and **not** a session. Auto-advance and swiping both mint extra `story_view`. Do **not** treat `story_view` as opens or as clicks. (Per instruction: `story_view` stays a **view**.)

---

## 3. Is `OrGeulaStoryColumn` mounted in chat?

**FACT** — `/community/chat` → `SpotimChatRoute` → `SpotimChatPage` (`legacy.jsx:4272`). `SpotimChatPage` **does render** `MergedStoriesRail` twice: mobile (`legacy.jsx:4326`, `.sod-chat-stories-mobile`) and desktop column (`legacy.jsx:4356`, `.sod-chat-videos`). → **`MergedStoriesRail` is MOUNTED & LIVE in chat.**

**FACT** — the **default export** `OrGeulaStoryColumn` (`OrGeulaStoryColumn.jsx:271`) is imported **nowhere** (only a comment mentions it in `supabase.js`). → **`OrGeulaStoryColumn` (default) = DEAD / UNMOUNTED code.** (Not fixed, per instruction.)

**FACT** — old `ChatPage` (`legacy.jsx:4098`) is **not routed** (`ChatRoute` unused in `App.jsx`) and contains **no** story component. Dead but irrelevant to stories.

---

## 4. Is `HomeOrGeulaRail` active or hidden?

**FACT** — mounted at `HomeNewPage.jsx:500` as `<HomeOrGeulaRail />` with **no** `false &&` gate. It returns `null` only when `channel_updates` (ch=`or-geula`, with image) has zero rows. → **ACTIVE / VISIBLE.** Also active on video-category pages via `TaxonomyPage`. (Not toggled, per instruction.)

---

## 5. Analytics taxonomy audit

**FACT** — event types that exist in code for story sections:

| event_type | emitted by | meaning |
|---|---|---|
| `story_view` | `StoryViewer.jsx:40` | per-item view inside viewer (see §2) |
| `story_chip` | `OrGeulaStoryChip.jsx:41` | chip click = open-from-chip (home only) |
| `share_story` | `StoryViewer.jsx:138`, `OrGeulaStoryColumn.jsx:316`, `OrGeulaPage.jsx:42` | share action |
| `play` | `OrGeulaPage.jsx:28` | open of an item on `/or-geula` (own player) |
| `view` | `OrGeulaPage.jsx:47` | `/or-geula` page mount |

**MEASUREMENT GAP** — the canonical open/nav/close taxonomy is **absent**:
- **`story_open`** (viewer opened) — **MISSING**. Home-rail (`setStory`, `HomeOrGeulaRail.jsx:57`) and chat-rail (`openItem`) opens are **untracked**; the only open-proxies are `story_chip` (chip) and `play` (or-geula). A rail open surfaces *only* as the first `story_view`, conflated with per-item views.
- **`story_impression`** (rail/chip entered viewport) — **MISSING**.
- **`story_next` / `story_prev`** — **MISSING**.
- **`story_close`** — **MISSING**.
- **`story_complete`** (reached last item) — **MISSING** (`go` past end calls `onClose` unlabeled).

**Where click/open is not measured (FACT):** Home-rail tile click, Chat-rail tile click, Chat-column card click → **no event**. Only chip and or-geula grid have an open event.

---

## 6. Source (surface) attribution

**FACT** — every story `track(...)` call passes `section` = brand `trackKey` (`or-geula` or `tzofon`) and **no `meta.surface`**. DB confirms: over 30 days, `count(*) filter (where meta ? 'surface') = 0` for all story events.

**MEASUREMENT GAP → MISSING** — we **cannot** tell whether a story open/view came from **home / chat / or-geula / broadcasts / other**. All `or-geula` `story_view` collapse into one bucket; our-video views collapse into `tzofon`. Surface attribution for stories = **MISSING**.

---

## 7. Read-only 30-day analytics

**FACT** — event volumes (section × event):

| section | event_type | events | unique visitors | surface meta |
|---|---|---|---|---|
| or-geula | story_view | **266** | **55** | 0 |
| or-geula | story_chip | 57 | 37 | 0 |
| or-geula | view (page) | 26 | 13 | 0 |
| or-geula | share_story | 19 | 9 | 0 |
| or-geula | play | 5 | 3 | 0 |
| tzofon | story_view | 28 | 6 | 0 |
| tzofon | share_story | 1 | 1 | 0 |

**INFERENCE** — open-proxies over 30d ≈ `story_chip` 57 + `play` 5 = **62 tracked opens**, vs **266** `story_view` (≈4.3 item-views per tracked open) — consistent with auto-advance inflation and untracked rail opens. 55 unique or-geula story viewers, 6 unique tzofon.

### Per-story (or-geula) — TOP 10 by `story_view`

**FACT:**

| # | story (text, trimmed) | date | views | uniq | shares | share% of uniq |
|---|---|---|---|---|---|---|
| 1 | מסר חזק - למה כל הסבל הזה בעולם | 08-09 | 49 | 33 | 4 | 12.1 |
| 2 | אחד החזקים!!!! הרב רפאל רובין | 08-06 | 39 | 22 | 1 | 4.5 |
| 3 | הגילוי המטלטל! ...הרב מאיר א׳ | 08-05 | 26 | 14 | 2 | 14.3 |
| 4 | 😱מה זה דיבוק??? ...הילולה | 08-09 | 25 | 15 | 3 | 20.0 |
| 5 | הישראלי הכי אחי ❤️ ...גאולה שלמה | 08-04 | 16 | 10 | 2 | 20.0 |
| 6 | *(orphaned — no channel_update row)* | — | 10 | 7 | 0 | 0 |
| 7 | מסר חזק-בשביל מה צריך עוד מלחמה? | 08-04 | 10 | 5 | 3 | **60.0** |
| 8 | *(orphaned — no channel_update row)* | — | 9 | 4 | 0 | 0 |
| 9 | *(orphaned — no channel_update row)* | — | 8 | 8 | 0 | 0 |
| 10 | לנער הזה לא ציפיתי... | 08-03 | 8 | 4 | 1 | 25.0 |

### Per-story — BOTTOM (tail)

**FACT** — a long tail of items at **1 view / 1 unique / 0 shares** (e.g. `🎬 עדכון וידאו` placeholders, `📷 עדכון`, and older 07-24/07-27/07-28 items). Newest items (`המלך בשדה … עגלה אדומה שלישית`, 08-14; `🎬 עדכון וידאו`, 08-13) sit near the bottom with 5 and 1 views respectively despite being surfaced first by the rail (see §10).

**MEASUREMENT GAP** — 3 top-tail slugs (`34d9b9d1…`, `14ae3d4a…`, `9334def0…`, **27 views total**) have `story_view` events but **no matching `channel_updates` row** (expired/deleted). Views are retained; the content that earned them is gone → per-story history is lossy for removed/expired updates.

---

## 8. Per-story completeness

**FACT** — for each surviving or-geula story we have: `slug` (=channel_updates uuid), `created_at`, `text`, `is_video`, `views`, `unique viewers`, `shares`. **INFERENCE** — a meaningful **share-rate per unique viewer** is derivable (shown above). The best *engagement* (share%) items are #7 (60%) and #4/#5 (20%), which are **not** the highest-view items.

---

## 9. CTR

**FACT / per instruction** — there is no universal, surfaced **open** event and no **impression** event. Therefore:

> **CTR לא ניתן לחישוב מהנתונים הקיימים.**
> (`story_view` is a per-item view, not an open; rail opens are untracked; there is no rail/chip impression event.)

---

## 10. Rank problem — "new ≠ winner"

**FACT** — `HomeOrGeulaRail` orders by `created_at desc` (`HomeOrGeulaRail.jsx:23`); the chip leads with `fresh[0]` (newest). No engagement/performance signal enters ranking anywhere.

**INFERENCE** — the top performer (`מסר חזק - למה כל הסבל`, 49 views, 08-09) is **not** what the rail shows first; the rail leads with the newest low-view items (08-14 = 5 views, 08-13 = 1 view). **NEW is winning the slot, not TRENDING/TOP.**

**RECOMMENDATION (do NOT build now)** — in a future change, separate three lenses instead of one `created_at desc` list:
- **NEW** — recency (current behavior), for "what just dropped".
- **TRENDING** — views/shares within a short rolling window (e.g. 72h), velocity-weighted.
- **TOP PERFORMING** — all-time (or 30d) views + share-rate.
This needs a real `story_open`+surface taxonomy (§5–6) first, otherwise ranking rides on inflated `story_view`.

---

## Summary ledger

- **FACT:** Live story surfaces = Home (chip+rail), Chat (rail+column), /or-geula, video-category rail, conditional post-page block. Broadcasts/Community = none.
- **FACT:** `MergedStoriesRail` IS mounted in chat; default `OrGeulaStoryColumn` and old `ChatPage` are dead code.
- **FACT:** `HomeOrGeulaRail` is ACTIVE.
- **MEASUREMENT GAP:** `story_view` inflated by auto-advance; no `story_open`/`impression`/`next`/`prev`/`close`/`complete`; rail opens untracked; **surface attribution = MISSING (0/all)**; 27 views orphaned from deleted updates.
- **INFERENCE:** ~62 tracked opens vs 266 `story_view`; NEW ranks above TRENDING/TOP.
- **RECOMMENDATION:** future — surfaced open taxonomy + NEW/TRENDING/TOP separation. Not now.

---

## NEXT ACTION

**One action only:** Design (not build) a story event taxonomy spec that adds a real **`story_open` with `meta.surface`** (home-rail / home-chip / chat-rail / chat-column / or-geula / post) at every open site, keeps `story_view` as a per-item view but flags auto-advance separately, and adds `story_next` / `story_close` / `story_complete`. Bring that spec back for approval **before** any code, DB, or ranking change.
