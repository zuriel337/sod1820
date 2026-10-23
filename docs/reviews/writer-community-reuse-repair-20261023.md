# Existing community author activity: writer-page repair

Branch `claude/2029-writer-community-repair-20261023`, base `07951baae4559f80464638e9e2d679588d600fe7`. Remote main independently remains `e73687221aa2ab639930643e5cc8c99666adce88`. Branch/Preview only; no merge, main/Production, product DB, RLS, security middleware or menu changes.

The user correctly identified an incomplete integration review: the existing community already has author cards/full profiles, public activity, historical likes, modern reactions and replies. The earlier writer reader's omission of those fields did not mean those capabilities were absent from the system. This correction supersedes that implication in earlier delivery notes.

## Reused implementation

- `src/lib/community/communityArchive.js`: existing `fetchPublicAuthorActivityPage`, exact contributor/account resolution and `fetchCommunityAuthorSummary` now accept an optional client. Existing community callers keep their original default. The public writer explicitly supplies the existing anonymous public client; a signed-in administrator cannot expand that reading scope. No new activity query implementation, corpus, identity matching or reaction engine.
- `src/components/community2029/CommunityLive2029.jsx`: Claude exports a controlled activity view from the existing component. It renders the same `LiveMessage`, `CommunityMessageContent`, `UserBadge` and `ReactionBar`. Optional date formatter and absent reply callback leave original callers unchanged. Embedded messages use the existing bilingual date formatter. The existing full community author page remains the destination for full conversations/replies.
- The writer's community section reads that existing author activity in pages of 20. It retains historical `reactions.likes` plus native reaction arrays through the same `ReactionBar` and `toggle_contribution_reaction`. Unconfirmed changes roll back through the existing canonical reaction mutation helper. Opening a section never sends a reaction/message.
- Exact contributor ID from the approved public identity supplies the community author key. No display-name guesses, account identity creation or source-publication-to-community conversion. Source catalogue and community counts remain separate. Full author-profile links use the already existing `/2029?preview=community&data=live&member=<authorKey>` route.
- The old incomplete community card mapping and “counts unavailable in this reader” copy are replaced. Author-wide totals render only when the existing summary/verified baseline supplies them; a loaded page's like sum is not mislabelled as a total.

## Real-data and regression evidence

- Live anonymous existing reader for Tzvi: **30 public activity items**, **20** in the first page, including one item with an existing like. Read sample **683 ms**. This is public community activity, separate from the **1,053** source publications. No new writer corpus or migrated records.
- Local built App2029 with live anonymous Supabase data renders the real source catalogue (20 recent) and the real community activity (20 items), with **no JavaScript errors** or failed public data requests. Same-origin writer overview/rank API calls are stubbed unavailable in these isolated live-data checks; they are not a claim of hosted full-stack verification.
- **121 contained Node cases pass** across contributor/private/community/reaction/Research sync/date tests. Three new cases exercise exact client/binding, native historical+modern like counts, existing summary limits and read failures.
- `npm run build` (Legacy and 2029), `npm run build:2029`, and `git diff --check` pass.
- New built-browser integration: **nine viewport/theme combinations** (320/390/1440 × day/parchment/night), same existing community rows, historical+modern likes, no overflow/runtime errors; explicit failed like rollback and confirmed retry; 20→30 pagination; existing full community profile and browser back; failed author read and retry; one shared frame. All external mutations intercepted, no live likes/messages.
- Source-route regression retains nine theme/viewport combinations, 20 recent, exact paired-image/text World occurrence, reload/back, canonical numeric author and existing Legacy editor route.

Claude visual reuse commit `94d7cead` was integrated as `6cd5dc39`. GPT owns the anonymous-client seam, exact identity projection, page-local controller, tests and this correction. Visual scope is released. Existing community baseline/identity/private-profile policy and default feed/profile behavior are preserved.

## Preview error is still a separate open issue

The reported hosted error has **not been reproduced or claimed fixed**. Authorized hosted HTTP reads returned the 2029 document and entry JavaScript; public overview/rank endpoints returned ready. Runtime logs showed only a URL-parser deprecation warning, no application exception. Automated Chromium access to protected assets was stopped at Vercel SSO, so an HTTP 200 is not treated as a hosted browser pass.

Automatic approval review rejected creating a new 23-hour shareable authentication link because it grants access to protected Preview content. No protection setting was changed and no alternative share-token workaround was attempted. Existing authenticated reading and local real-data verification continued. The exact displayed error text and affected URL have been requested from the user and remain necessary to distinguish application, middleware and Vercel access failures. Use existing Vercel account access unless separate sharing permission is given.
