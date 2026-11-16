# Step 2: layout shifts on Community and the Home — measured, three fixes tried and rejected, decisions needed (16 November 2026)

## Field (7 days to 16.11, de-duplicated by sample id, CLS above 0.1 / above 0.25)

| page family | samples | > 0.1 | > 0.25 | top shift sources (in samples above 0.1) |
|---|---|---|---|---|
| Community | 1,004 | 196 | 100 | `div.sod29-community-thread-group` 110, `article.sod29-community-thread` 82, `div.sod29-community-replies` 66, stream tools 31, `footer.f29` 30, replies toggle 27 |
| Home | 468 | 137 | 74 | `ul.h29-live-list.rc29-list` 94, `div.rc29-src.r29` 80, chips and buttons of the same block |
| Post | 92 | 2 | 0 | (fixed by the 16.11 release) |
| Tags / categories | 42 | 1 | 1 | `footer.f29` |

## Lab method (`scratchpad/lab/cls-probe.mjs`)

- **Build and network.** The built public artifact, served by the lab server with recorded public reads.
- **Device.** Phone (Pixel 7), 4× CPU, Slow 4G-like.
- **Reader.** Scrolls in 16 wheel steps of 380 px (scrolling does not exempt a shift).
- **Recorded.** Every layout-shift entry with the elements that moved, before and after rectangles, and the element inserted just before it.

## Community: the causes, measured

Shifts on `/community/chat`, phone, branch build (main is the same):

| ~time | inserted | height | shift |
|---|---|---|---|
| 11.3 s | `section.sod29-tree-pins` above the feed (its own read, `community_tree_hints_list`) | 46 px | 0.060 |
| 12.7 s | the replies button in many threads at once, when `community_reply_counts` answers | 44 px each | 0.060 |
| 13.6 s | a root preview's loading line hides again | −56 px | 0.060 |
| 19.5 s | the "new replies" line above a thread (reading position) | 54 px | 0.056 |

Totals per load (3 runs): `/community/chat` 0.30–0.37 on main; `/community` 0.23–0.31.

### Tried and rejected (not committed)

1. **Hold the first page until the top reply counts and the pins are known (≤ 1.2 s): worse, 1.2–1.66.**
   - A reader who scrolls during the wait passes the empty reserved screen and reaches the old-chat section and the footer.
   - When the feed appears it pushes them out of view (one shift of 0.89).
   - Holding content back is wrong for a reader who scrolls.
2. **Reserve the replies button's row until the count is known.** Rejected on data:
   - 17 of the latest 40 roots have no reply, and 6 of the top 8.
   - The reserved row would collapse in most threads, which is a shift in the other direction.
3. **Start root previews 1,000 px ahead (was 200 px): no measurable change.**
   - `/community/chat` 0.23 / 0.29 / 0.23 against 0.37 / 0.30 / 0.23 on main.
   - `/community` 0.26 / 0.31 / 0.14 against 0.23 / 0.24 / 0.31.

### What would remove them (decisions for ZURIEL)

- **A. The feed page carries each root's reply count (database change, needs approval).**
  - `community_feed_page` would return `reply_count` with the row. The replies button is then known at first paint, and empty roots are filtered at first paint.
  - It also removes a whole round trip (`community_reply_counts`, Tokyo) from every Community load.
  - The client keeps the second read only as a fallback.
- **B. The pinned tree strip arrives with the feed.**
  - Either the same read, or a fixed slot for the strip whose height is known from the first paint. The slot is a design decision: when there are no pins it stays as an empty frame.
- **C. The "new replies" mark becomes part of the replies row** (an inline badge) instead of a 54 px block above the thread.
  - This is a small design change in the Community owner's scope.

## Home

- **Lab:**
  - phone 0.037 (one shift: the series section and the entry band when the reader reaches them);
  - desktop 1366×800: 0.02.
- **The field's main sources** are the "Now" list (`ul.h29-live-list`) and its source chips (`div.rc29-src`). The lab does not reproduce them in 25 seconds.
- **The likely cause is long sessions.**
  - The list refreshes while the page is open, and new items are inserted at its top.
  - The field sample is flushed at `pagehide`, so it includes every refresh during the visit.
- **Recommendation:** new items wait behind "N new updates" (inserted on the reader's click) instead of entering in place.
  - The Home "Now" list was changed today by another session (NOW_HOME_*), so this is its owner's scope. It is recommended here and not edited.

## What remains measurable after the release

The step-0 field context (build, device class, article-first, first-byte parts) makes it possible to tell these sources apart by device and release in the field.
