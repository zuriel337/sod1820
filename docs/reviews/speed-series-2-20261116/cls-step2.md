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

## Fix A, built (16.11.2026, after ZURIEL's "לתקן"): the feed page carries each root's reply count

**What was found first (live site, read-only).**
- The public release never calls `community_reply_counts`: the read-only profile returns no counts by design (the counts reader accepts arbitrary ids).
- So a root's replies control appears only when the thread totals arrive (`community_thread_updates`, one read for the 40 roots → the controls appear in every thread at once).
- Every root also starts its two-reply preview on approach. A root without replies shows "טוען תגובות…" and then collapses.
- First page on 16.11.2026: 22 of 40 roots have replies and 18 have none (6 of the top 8). `reply_count > 0` agrees with "thread total > 1" for all 40.

**The change.**
- **Database (applied live 16.11.2026, ZURIEL's standing approval).** `supabase/migrations/20261116230000_community_feed_page_v2.sql`.
  - The first version replaced `community_feed_page` (drop and create). The database tool asks its own confirmation for that, which could not be answered. It was rewritten as an addition only.
  - `community_feed_page_v2` is a SECURITY INVOKER wrapper over the two existing public readers: `community_feed_page` for the page (unchanged) and `community_reply_counts` for the count (its own predicate). It adds no reach: a role that may not run those readers gets nothing.
  - Nothing is dropped or revoked. The file refuses to run twice; the rollback (`supabase/proposed/ROLLBACK_20261116230000_community_feed_page_v2.sql`) removes only the wrapper.
  - Live check after applying: the 40 rows are identical in order to `community_feed_page`; the 40 counts equal `community_reply_counts`; 19 roots have no reply; `community_feed_page`'s definition and rights are unchanged; anon reads it through the public API (200).
- **Worker.** Admits `community_feed_page_v2` only with exactly `COMMUNITY_PUBLIC_FIELDS + ",reply_count"`. Every wider selection and every other RPC with it is refused before the network (tested). The integrated preview worker is unchanged (pinned to its approved baseline).
- **Client.**
  - Asks for the count, and the counts render in the same update as the rows.
  - A root with 0 replies skips its preview (the existing `knownCount === 0` path). The refresh uses the page's counts instead of a second read.
  - Without the wrapper (PGRST202 / 404) or where a worker refuses it (400 / 403), the same page is read from `community_feed_page`, once per page session, and counts stay unknown as today. Any other failure is still a failure.

**Tests.**
- Local Postgres (`tests/sql/community_feed_reply_count_v1.sql`, CI `community-feed-reply-count-gate`). It covers:
  - old pages identical in both sorts and on a later page;
  - counts equal the public reader's for every kind of child (public, empty, pending, deleted with or without a live descendant, hidden, other origin, grandchild);
  - same owner, settings and execute list; PUBLIC cannot call it;
  - the rollback restores the old rows;
  - both files refuse to run out of order.
- Unit tests: client fallback and worker admission.
- Community browser tests pass on the fix.
- Shell budget: no growth against main in the same environment.

**Lab, main against the fix** (same method as above; the fix's feed response is the recorded page plus the live counts of those 40 roots; blocks A B B A, n = 4 each, Mann–Whitney):

| page | CLS per load, main (median, range) | the fix | p |
|---|---|---|---|
| `/community/chat` | 0.280 (0.191–0.310) | **0.129** (0.076–0.188) | 0.029 |
| `/community` | 0.197 (0.191–0.302) | **0.187** (0.168–0.188) | 0.029 |

| cause (sum per load) | `/community/chat` main → fix | `/community` main → fix |
|---|---|---|
| "loading replies" line appears and collapses | 0.089 → **0** | 0.053 → **0** |
| replies controls appear | 0.057 → 0.016 | 0.028 → 0.012 |
| tree pins strip (+ unattributed) | 0.064 → 0.060 | 0.060 → 0.060 |
| "new replies" line | 0.055 → 0.054 | 0.081 → 0.110 |

- The two causes this fix targets are gone (the small remainder is nested replies, whose counts still come from their own read).
- What remains is the two design items B and C.
- In the lab the "new replies" line is partly an artifact: the recorded feed is hours old while the thread updates are read live.

**Not done at the time of writing:** merge and deployment. B and C are design decisions in the Community owner's scope.

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
