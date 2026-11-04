# Public continuation consumers · 3 November 2026

Status: IMPLEMENTED and focused TESTED on branch `gpt/2029-url-services-20261103`, based on product `9d3a09689a05bd0b72ca484335c1fbce8b538170`. Route/SSR integration and browser acceptance belong to the parent implementation lane. No build, browser session, push, deployment, database mutation, send, or legacy production change was performed in this scope.

Coordination was read from the canonical dedicated read-only connector as `supabase_read_only_user`: parent BEFORE `5fbf9e75-b445-4da4-bf24-dfc485387b8f`, exclusive services addendum `33d602d1-49f4-4a48-a39b-a23fcb45a702`. `origin/main` was verified remotely as `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. The addendum covers these new page/reader/test/evidence files; shared routes, frame, metadata, configuration and existing readers were not edited.

## Implemented consumer boundary

- `PublicContinuity2029Page` accepts `kind="or-geula" | "people" | "forum" | "comments" | "contact" | "about" | "status"`. Known service states accept `{title, description, links}`; `links` can contain `[href,label]` tuples or `{href,label}` objects. The parent owns the exact known route list. This page is not a fallback for unknown routes.
- Or Geula reads a bounded 18-item page plus one next-page sentinel from its exact channel. `/or-geula/video/:id` and `?v=<id>` use the same exact occurrence reader. Source admission reuses `publicVideoSourceQuery2029("channel_update",...)` and `publicChannelToSystemItem`: `status=live`, `page_only=false`, valid unexpired source, public canonical media. No broad World redirect or unfiltered Legacy Or Geula reader is used. Credit and speaker remain attribution fields; source/occurrence identity is preserved without generating a research identity. The existing public channel redaction and 1,200-character description limit remain visible as a shortened-description note. Media starts only through native user controls; `t`, `time`, `start` and `#t=` are supported without autoplay.
- People reuse `fetchWorldPublicPeopleIndex` and its public contributor projection. There is no account/user table read or separate contributor eligibility policy. Search and paging are presentation over that index.
- Forum preserves the existing account gate from `ForumPage`. Only an exact anonymous `research_contributions` lookup for `id,status` with `status=approved` is permitted. A public approved existence produces the named forum state; absent, unapproved, wrong or invalid identity produces `not-found`. The collection performs no contribution read. No body, private account fields, Discourse, ForumFeed, seen marker, subscription, reaction or write path mounts.
- Comments remain associated with their original post. The legacy global comments catalogue was closed in `placeholders.jsx`; it is not reopened. `?p=<wp_id>` re-admits the exact parent through `publicPostOnlyFilter` and `hasSuppressedPublicPostTag`, then links through `publicPostHref` to `#post-comments`. No global comment download or OpenWeb mount is introduced. The landing distinguishes this archive from the community chat.
- Contact opens the existing System Frame `openIssueReport()` gateway only after an explicit button click. No form, submission logic or automatic send was added. The existing privacy contact `zyz997@gmail.com` is available as a user-activated mail link.
- The page uses the existing System Frame and semantic palette/type tokens, a centered bounded responsive content plane, bilingual record dates, logical spacing, accessible control labels and explicit `data-read-state` / `data-state` attributes.

## Integration API

`src/lib/publicContinuityReaders2029.js` has no top-level browser Supabase import. Server consumers inject `readRows(table, params, {signal})`. Params use PostgREST `select`, `eq.*`, `or`, and collection `order`, `offset`, `limit`. The default browser implementation obtains the existing anonymous public research client lazily and uses SELECT only.

| Export | Result |
| --- | --- |
| `loadPublicOrGeulaOccurrence2029(id, {readRows, signal, now})` | `{status: "ready" | "not-found", item}` |
| `loadPublicOrGeulaCollection2029({page, readRows, signal, now})` | `{status: "ready" | "empty" | "not-found", items, page, hasMore}` |
| `loadPublicPeopleContinuation2029({peopleReader, signal})` | `{status: "ready" | "empty", people, total}` |
| `loadPublicForumContinuation2029(id = null, {readRows, signal})` | `{status: "gated" | "not-found", exists: null | boolean}` |
| `loadPublicCommentPostContinuation2029(wpId = null, {readRows, signal})` | `{status: "scoped" | "ready" | "not-found", post: null | {title, href}}` |

All read failures throw; they are never converted into empty data. Abort is checked before and after every read and is passed to the transport. The UI discards stale requests and offers retry for failure. `publicContinuityHttpStatus2029` maps ready/empty/gated/scoped to 200, not-found to 404, and failed to 503. The parent must catch thrown transport failures as 503.

`publicContinuityPage2029(params.has("page") ? params.getAll("page") : null)` yields an integer from 1 through 1000 or `null` for invalid/duplicate values; absence yields 1. The collection returns 404 state for an empty page above 1. Or Geula links preserve repeated context, return parameters and hash through the existing public-share sanitizer while removing the conflicting `v` query identity. Query values never supply metadata titles.

## Verification

`node --test src/lib/publicContinuityReaders2029.test.js test/system-feed-public-sources-2029.test.mjs`: **19 passed**. Coverage includes exact occurrence/channel, expiry/page-only/private source rejection, public-media gates, attribution redaction, bounded stable pagination, duplicate/invalid/out-of-range pages, missing 404 versus failed 503, forum existence-only reads, suppressed parent posts, cancellation and exact context links. The new JSX passed Vite's standalone Oxc transform; this was syntax verification, not a build. `git diff --check` passed.

Anonymous REST reads, using only the repository's existing public anonymous credential and no viewer session, verified:

| Read | Result |
| --- | --- |
| New Or Geula collection helper | HTTP 200, 19 rows read, 18 displayed, next page available |
| New Or Geula exact occurrence helper, `8216a3eb-06ba-4587-a3db-8036f85ff482` | HTTP 200, ready, public media and source credit present |
| Approved forum occurrence `5d48d3fc-500a-4c80-9538-3d9caf064b91` | HTTP 200, one id/status row; gated state |
| Nonexistent forum UUID `10000000-0000-4000-8000-000000000099` | HTTP 200 with zero rows; not-found state |
| Exact public post `wp_id=839` | HTTP 200, ready canonical link to the existing post comments |
| Minimal existing people admission sample | HTTP 200, eligible public contributor fields only |

The dedicated read-only connector separately confirmed relevant policy definitions: live/unexpired channel updates; contributor visibility exclusion; approved forum rows (or the author's own rows, which an anonymous client cannot use); published historical comments. Metadata SQL was not treated as anonymous admission proof.

Browser behavior, all three themes, 320/390/desktop composition, history/refresh and HTTP status acceptance await the parent's integrated exact Preview. This scope makes no claim of that acceptance or of public forum opening.
