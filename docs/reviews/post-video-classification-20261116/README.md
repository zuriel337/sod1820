# Real media classification for posts — POST_VIDEO_CLASSIFICATION_PLAN_CHECK_20261116 (branch only)

Scope: PLAN37 §32.1–32.5, section ה of the unified plan. No DB, Edge, ACL, migration, RPC or new store. Read-only use of existing public views.

## What was mapped (read-only, live DB `linswmnnkjxvweumprav`, 16.11.2026)
| Reader | Source | Public? | State |
|---|---|---|---|
| `video_media_placements_v1` | posts (not draft/forum-tagged), `channel_updates` (status live), `home_videos` | anon SELECT granted | **cheap**: one request returns the playable post placements (≈800 rows). Carries `source_type`, `source_id`, `asset_key`, `video_kind`, `updated_at`, `needs_review`. |
| `video_media_assets_v1` | the same, grouped per asset (`public_id` = md5(`asset_key`)) | anon SELECT granted | **heavy**: paging/counting it hits `statement timeout` (HTTP 500, code 57014); `IN` lookup for 24 keys works. Used only for the identity pages of the 24 assets on screen. |
| `/video/:assetId` (`Video2029Page` → `publicVideo2029Reading`) | re-admits one asset through its current public source | yes | the item page; kept as the target of every asset card. |
| `videoSemanticMap` / `ContextualVideoLayer2029` | research rows | admin only | unchanged. |
| posts list / `postsCatalog2029Projection` | `posts` table, categories/tags | yes | had **no** media dimension (only the legacy category). |

Real numbers: 2,212 post placements; **1,380 are not playable** (`gdrive` / `legacy_external`, `needs_review`) and are not listed; **768 distinct playable videos** appear in **495 public posts**; the legacy category "וידאו" holds **243** posts. So the legacy category is NOT the video set: it is both incomplete and not media-derived.

## What was built
- `src/lib/research/postsVideoLibrary2029.js`: `postsMediaScope2029`, `fetchPostsWithVideoPage2029` ("פוסטים עם וידאו": exact count, 24/page), `fetchVideoLibraryPage2029` ("כל הסרטונים": one card per asset with its appearances), `fetchVideoPublicIds2029` (best effort, after the list). Every post is re-admitted through `publicPostOnlyFilter` + `hasSuppressedPublicPostTag`; no category or tag filter anywhere.
- `Posts2029Page`: `?media=video` (posts) and `?media=video&view=videos` (all videos), noindex, with a named scope switch and the existing `/or-geula` entrance; the list page shows "סוג המדיה: פוסטים עם וידאו | כל הסרטונים".
- `/category/וידאו` keeps its entrance and its exact result set; reader wording; links to the two real views.
- `postClassification2029`: `media-type` item ("מדיה: וידאו") read from the post body (same patterns as the view), shown by the shared `PostCategories2029`.
- Tests: `postsVideoLibrary2029.test.js` (fake client), `test/posts-video-library-2029.test.mjs`, additions to `test/post-classification-2029.test.mjs`; wired into `live-contracts-2029.yml`.

## Stated limits (to the reader and here)
- "All videos" lists videos that appear in **public posts**. Videos that exist only as channel updates (e.g. Or HaGeula) or home videos are not listed until they pass the same public gate; their own readers/entrances remain (`/or-geula`). Not claimed as "all videos on the site".
- A post whose only video is `gdrive`/`legacy_external` is not "with video" here (needs review in the existing view).
- Counts are of the placements read at that moment (5-minute client cache).

## Not done / needs a decision
- Combining the media filter with text search or series/category filters in one list (no support in the existing catalog query; not faked).
- Channel / home videos in the library: needs a re-admission reader per source (a narrow, separate change; no DB change is proposed here).
- "Show more by this classification" from the item/section panel: the media chip links to the list; the panel wiring is the next step.
