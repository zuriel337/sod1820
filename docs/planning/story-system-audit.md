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

> **Status update:** PART I audit **approved** by Zuriel as a read-only finding. The NEXT ACTION above is **extended** by **PART II** below (design-only). No WRITE / DB / code / deploy performed.

---
---

# PART II — Story Event Taxonomy → Foundation for Audience Intelligence

**actor=CLAUDE · status=design only.** No WRITE, no DB change, no code change, no deploy.
Long-term purpose (Zuriel): let events reveal **content-world affinity**, not classify people. **CONTENT WORLD = behavioral signal, not a user label. AFFINITY ≠ IDENTITY.** No person is labelled "or-geula user" / "dim5 user" / "researcher" — that is a *future inference on enough data*, not a stored attribute.

## Design principles (binding)
- **Reuse the existing analytics only.** Everything rides on `visitor_events` (visitor-level) and its existing dual-write to `events` (person-level via `emit`→`ingest_event`, `src/lib/events.js`). **No new table, no parallel event store, no new engine, no ranking.**
- **Additive only.** `visitor_events.meta` and `events.props` are **jsonb** → new keys need **no migration/ALTER**.
- **`story_open ≠ story_view`.** `story_view` stays a **per-item view**. Auto-advance must be distinguishable from a user action.

---

## 1. Canonical Story Event Taxonomy

`event_type` values (all under a story context). "Repeat?" = can fire more than once per open session.

| event_type | fires when | measures | once / repeat | auto vs user | key payload (beyond visitor_id + ts) |
|---|---|---|---|---|---|
| `story_impression` | a story tile/chip/card scrolls into view (IntersectionObserver), **before** any open | reach / exposure of the rail item | repeat, **deduped** once per (story_id, surface, session) | neither (passive) | story_id, surface, entry, content_world, index |
| `story_open` | the viewer is opened for a story (**the missing metric**) | true opens | repeat (per open action) | **user** | story_id, surface, entry (`chip`/`rail`/`column`/`grid`/`deeplink`), content_world, start_index |
| `story_view` | an item becomes the current item inside an open viewer (**keep current semantics**) | per-item view within a session | repeat (once per item shown) | **both** — see `advance` | story_id, surface, content_world, index, **`advance`** (`open`/`user_next`/`user_prev`/`auto`) |
| `story_next` | user deliberately advances (tap-right / arrow / "next" button) | intentional forward nav | repeat | **user only** (auto-advance does **not** fire this) | from_story_id, to_story_id, surface, content_world, from_index, to_index |
| `story_prev` | user goes back (tap-left / arrow) | intentional backward nav | repeat | **user only** | from_story_id, to_story_id, surface, content_world, from_index, to_index |
| `story_close` | viewer closed (✕ / backdrop / Esc) before completion | exits + (optional) dwell | once per open session | **user** | story_id (last shown), surface, content_world, index, items_seen, `reason` (`x`/`backdrop`/`esc`), optional `session_ms` |
| `story_complete` | advanced past the last item (reached the end) | full consumption | once per open session (if completed) | **auto or user** → record `trigger` | surface, content_world, items_count, `trigger` (`auto`/`user`), optional `session_ms` |
| `story_share` | share action from tile or viewer (**unifies today's `share_story`**) | amplification | repeat | **user** | story_id, surface, content_world, index, `channel` (`whatsapp`/`copy`/`native`/…) |

**Rule:** exactly one `story_open` per open; then ≥1 `story_view` (first has `advance:"open"`); `next`/`prev` fire **only** on user nav (and each also produces the resulting item's `story_view` with the matching `advance`); auto-advance produces **only** a `story_view` with `advance:"auto"` (never `story_next`); the session ends with **either** `story_close` **or** `story_complete`.

---

## 2. Canonical Surface Taxonomy

Only surfaces that **actually exist today** (§1 of Part I). `meta.surface` ∈:

| surface | route(s) | components today | `entry` sub-field |
|---|---|---|---|
| `HOME` | `/` | `OrGeulaStoryChip`, `HomeOrGeulaRail` | `chip` / `rail` |
| `CHAT` | `/community/chat` | `MergedStoriesRail` (mobile rail + desktop column) | `rail` / `column` |
| `OR_GEULA_PAGE` | `/or-geula`, `/אור-הגאולה` | `OrGeulaPage` own grid+player | `grid` / `deeplink` (`?v=`) |
| `VIDEO_CATEGORY` | `/category/<video-cat>` | `HomeOrGeulaRail` via `TaxonomyPage` | `rail` |
| `POST_PAGE` | `/:slug` | `LandingDiscoveryStories`→`MergedStoriesRail` (conditional) | `rail` |

**Rules:** `surface` is canonical; component nuance goes in `entry` (so HOME-chip vs HOME-rail, CHAT-rail vs CHAT-column stay distinguishable **without** inventing surfaces). **Do not mint a surface that is not built.** Broadcasts / Community have **no** story surface today → not listed.

---

## 3. Content World taxonomy

`meta.content_world` ∈ the 9 worlds (behavioral signals, **not** identities):
`OR_GEULA` · `DIM5` · `CIPHERS` · `GEMATRIA` · `NUMBERS` · `REALITY` · `RESEARCH` · `AI` · `COMMUNITY`.

**Key reuse (FACT):** the site **already** emits a `section` on every `track()` call, and those values are effectively proto-content-worlds. Observed `section`s include: `or-geula`, `dim5`, `tzofon`, `reality_hint`, `reality-stream`, `number`, `gematria`, `els`/`els_challenge`, `codes-library`/`codes-research`, `research`, `beit-midrash`, `forum`/`forum-thread`, `community`, `ai`, `video`, `home`…

**Proposal (no new table):** a **read-only normalization map** `section → content_world` (a `CASE`/lookup used at query time, or a tiny stored function later — *not now*). Draft mapping:

| content_world | source `section`s (examples) |
|---|---|
| `OR_GEULA` | `or-geula` |
| `DIM5` | `dim5` |
| `CIPHERS` | `tzofon`, `codes-library`, `codes-research`, `els`, `els_challenge` |
| `GEMATRIA` | `gematria`, `verse-gematria`, `spatial-gematria`, `beit-midrash` |
| `NUMBERS` | `number` |
| `REALITY` | `reality_hint`, `reality-stream`, `home_reality`, `stream_switch` |
| `RESEARCH` | `research` |
| `AI` | `ai` |
| `COMMUNITY` | `forum`, `forum-thread`, `community` |

For story events specifically: `content_world = OR_GEULA` (or-geula channel) or `CIPHERS` (tzofon "צפונות" videos). **OPEN QUESTION:** confirm tzofon→`CIPHERS` vs the newer מימד-חמש Shorts (`section=dim5`→`DIM5`) — see Open Questions.

**Store it explicitly** in `meta.content_world` on new events (uniform, self-describing) **and** keep `section` for back-compat, so cross-world analysis never depends on re-deriving from inconsistent `section` strings.

---

## 4. Event payload proposal

No schema change. Reuse the existing `track(section, slug, event_type, meta)` (`src/lib/tracking.js`) which already writes `visitor_events` **and** dual-writes to `events` via `emit`.

```
track(
  section,              // back-compat bucket: "or-geula" | "tzofon" | (or unified "story")
  storyId,              // → visitor_events.slug  (channel_updates uuid, or "vid:<slug>")
  "story_open",         // canonical event_type from §1
  {
    content_world: "OR_GEULA",     // §3 canonical enum
    surface:       "HOME",         // §2 canonical enum
    entry:         "rail",         // sub-surface: chip|rail|column|grid|deeplink
    index:         0,              // position in the set
    advance:       "open",         // story_view/next/prev only: open|user_next|user_prev|auto
    channel:       null,           // story_share only
    session_ms:    null            // story_close/complete only (optional)
  }
)
```

Resulting `visitor_events` row: `visitor_id, section, slug(=story_id), event_type, meta(jsonb: the above), created_at`. The parallel `events` row (via `emit`) additionally carries person/session/country/device/via/bot from `identity.js` — **already built**, no change needed.

---

## 5. Identity / visitor linkage

- **Now:** `visitor_id` (anon, `localStorage 'sod_vid'`, `getVisitorId()`), present on every `visitor_events` row → affinity is computed **per visitor_id**.
- **Later (already wired):** the `events` dual-write carries a person id (`getSodId()` in `identity.js`) + `sessionId`, so once enough logged-in signal exists, affinity can roll up **per person** without any new plumbing.
- **No PII, no labels.** Linkage is for aggregation only. **AFFINITY ≠ IDENTITY.**

---

## 6. Auto-advance distinction

The single most important measurement fix. Encoded in **`meta.advance`** on `story_view` (and mirrored by whether `story_next`/`story_prev` fired):

| situation | events emitted |
|---|---|
| viewer opens on item i | `story_open` + `story_view{index:i, advance:"open"}` |
| image 6 s timeout / video `onEnded` → i+1 | `story_view{index:i+1, advance:"auto"}` **only** |
| user taps "next" / arrow-right → i+1 | `story_next{from:i,to:i+1}` + `story_view{index:i+1, advance:"user_next"}` |
| user taps "prev" → i−1 | `story_prev` + `story_view{index:i−1, advance:"user_prev"}` |
| past last item | `story_complete{trigger: auto|user}` |
| ✕/backdrop/Esc | `story_close{reason}` |

→ "engaged views" (`advance in user_next/user_prev/open`) become separable from "passive auto-advance", so `story_view` totals stop overstating attention.

---

## 7. Future Affinity compatibility (design only — no weights)

Shape only, to prove the taxonomy is sufficient. **Do not compute or store affinity now.**

```
visitor_id
  → events (visitor_events, all sections)
  → normalize section → content_world (§3)
  → per (visitor_id, content_world): counts of opens / engaged_views / shares / completes
  → [FUTURE] weighted affinity score per world   ← weights NOT decided
```

Illustrative (weights deliberately absent):

```
visitor X → { OR_GEULA: {opens:6, shares:2, complete:3},
              DIM5:     {opens:1, shares:0, complete:0},
              REALITY:  {opens:4, shares:1, complete:2} }
→ FUTURE: affinity(OR_GEULA) > affinity(REALITY) > affinity(DIM5)   // once weights approved
```

**AFFINITY ≠ IDENTITY** — this is "what behavior clusters", never "who this person is".

---

## 8. Migration considerations

- **Purely additive.** New `event_type` names + new `meta` keys on jsonb → **no ALTER, no migration, no backfill required.**
- **Back-compat name mapping** (analysis handles old + new during transition):
  - `share_story` ≡ `story_share`
  - `story_chip` ≡ `story_open` (`entry:"chip"`, `surface:"HOME"`)
  - `play` (or-geula) ≡ `story_open` (`surface:"OR_GEULA_PAGE"`)
  - legacy `story_view` (no `advance`) → treat as `advance:"unknown"`.
- **Historical rows** lack `surface`/`content_world` → derive `content_world` from `section` via §3 map; `surface` = `unknown` for pre-instrumentation events (do **not** guess).
- Optional (later, read-only): a `section→content_world` SQL function/view for convenience — **not** a table, **not** now.

---

## 9. What is missing today (FACT)

`story_open`, `story_impression`, `story_next`, `story_prev`, `story_close`, `story_complete`, explicit `meta.surface`, explicit `meta.content_world`, `meta.index`, and the `advance` flag. Home-rail & chat-rail opens are entirely untracked; surface attribution is 0/all; `/or-geula` opens use a different name (`play`) than `story_view`.

## 10. What should NOT be built yet

Ranking (NEW/TRENDING/TOP) · any dashboard · an audience/affinity table or engine · affinity **weights** · **user labels / "types of people"** · a new event table · a parallel analytics system · any change to `/or-geula`'s own player beyond instrumentation. **None** until the measurement layer is approved and shipped.

---

## Ledger

- **FACT:** all needed storage already exists — `visitor_events.meta` (jsonb) + `events`/`emit` person pipeline; `section` already encodes proto-content-worlds; nothing new is required structurally.
- **FACT:** today only `story_view`/`story_chip`/`share_story`/`play`/`view` exist; no surface, no open, no auto/user split.
- **INFERENCE:** adding `story_open`+`surface`+`content_world`+`advance` is sufficient to (a) fix opens vs views, (b) attribute by surface, and (c) later compute per-world affinity — all on the existing store.
- **RECOMMENDATION:** adopt §1–§4 enums; keep `section` for back-compat and add `content_world` in meta; unify `share_story`→`story_share` and map `story_chip`/`play`→`story_open`; instrument every open site (home rail, chip, chat rail/column, /or-geula, video-cat, post-page) with `emit`, additively.
- **OPEN QUESTIONS:**
  1. Keep `section` per-world (`or-geula`/`tzofon`) **or** move to a single `section:"story"` with `content_world` in meta?
  2. tzofon "our videos" → `CIPHERS`, while the מימד-חמש **Shorts** (`section=dim5`) → `DIM5` — confirm the split.
  3. `story_impression` scope: per-tile vs per-rail, and the dedup window (once per session? per surface?).
  4. Route `/or-geula`'s own player **through `StoryViewer`** (one instrumented component) or instrument it in place?
  5. Capture `session_ms` (dwell) on `close`/`complete` now, or defer?

## NEXT ACTION — what needs Zuriel's approval **before any WRITE**

Approve (or amend) **only these decisions** — nothing is coded until then:
1. The **canonical enums**: 8 `story_*` event names (§1), 5 surfaces (§2), 9 content worlds (§3).
2. Storing `surface` / `content_world` / `entry` / `index` / `advance` in **`visitor_events.meta` (jsonb) + `events.props`** — **no schema change**.
3. The **back-compat mapping** (`share_story`→`story_share`, `story_chip`/`play`→`story_open`) — keep old rows readable.
4. The 5 **Open Questions** above (esp. #1 section strategy, #2 CIPHERS-vs-DIM5, #4 /or-geula unification).

On written approval → next phase is **instrumentation only** (additive `emit`/`track` calls in the existing components), then verify rows land in `visitor_events`. **No** ranking, dashboard, audience system, or table — each remains separately gated.
