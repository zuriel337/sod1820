# Exact Post taxonomy · scoped implementation · 3 November 2026

Base product: `9d3a09689a05bd0b72ca484335c1fbce8b538170`.
Branch: `gpt/2029-url-tags-20261103`.
Root coordinator supplied the canonical read-only verification and BEFORE registration `5fbf9e75-b445-4da4-bf24-dfc485387b8f`; this lane writes no journal or database records. The root granted the additional, narrow taxonomy allowlist in `postsCatalogViewport2029.js`.

Implemented and tested locally. Route registration, the server document response, browser acceptance and release remain root integration work. This is not a deployment, production approval, source remapping or claim that P0-A as a whole is accepted.

## Product delta

- `/tag/:slug` and `/category/:slug` render the existing `Posts2029Page` through the new `PostsTaxonomy2029Page` wrapper. The wrapper must be mounted by the integrator. `/2029/posts?tag=<exact label>` also uses the same reader; existing category and series query entry points continue to work.
- Tags select the exact `posts.tags` array member. Categories select the existing canonical category names/aliases from `postCategoryIdentity.js`. Only the already approved `רמזי הגאולה` → `רמזים חזקים` category equivalence is used. Tag and category namespaces remain separate.
- The same Post cards carry their existing image, excerpt, date, source credit and `publicPostHref` address. Each rendered Post retains its `posts:<id>` source identity. No Post becomes a Topic, person, independent finding, channel source or inferred Follow target. Direct taxonomy entries add no Follow UI; the pre-existing catalog category/series Follow reader is untouched.
- Taxonomy identity, a centered bounded search area, scoped title search, active filter text, pagination, and distinct missing/empty-search/error recovery states use the existing Posts tokens and content plane. The card grid and media dimensions are unchanged. The design consumes Design V2 §8.2 and the accepted Posts presentation; it does not recreate Legacy taxonomy UI.
- Query changes retain the exact pathname, other query parameters and hash. The existing viewport restore/cancel/tracking algorithm is unchanged; its supported entry list now includes exact one-segment tag/category routes.
- `וידאו` remains its exact stored Post category, with the existing explanation and existing Post media. No extra channel rows are inferred from that label. Existing series membership and mixed source pagination are unchanged.

## Server and route integration

Mount `src/pages/PostsTaxonomy2029Page.jsx` for both `/tag/:slug` and `/category/:slug`. Preserve the route owner's explicitly supported chat aliases before mounting the general tag route; this adapter does not copy Legacy's broad substring `/chat/i` exception.

Use the pure module `src/lib/research/postsTaxonomy2029Route.js` in server document handling. It imports only the existing category identity, series descriptors and public Post boundary; it has no browser/client/network initialization.

| Export | Use |
| --- | --- |
| `postsTaxonomyRoute2029(pathname, search = "")` | Parse the raw pathname once. Returns a tag/category scope, an invalid scope, or `null` for a different route. A pathname selection rejects query `tag`, `category` or `series` overrides. |
| `postsTaxonomyScope2029(kind, value)` | Resolve a direct label. Category aliases reuse the existing owner; suppressed tags are invalid. |
| `postsTaxonomyPage2029(search = "")` | Return page 1 when absent, the bounded positive page number, or `null` for malformed/duplicated/out-of-bounds page input. Invalid input must remain 404 until explicit navigation. |
| `postsTaxonomySelection2029(scope)` | Re-resolve the scope and return `{ kind, key, field, operator, values, arrayLiteral, publicFilter }`, or `null`. `field` is `tags`/`categories`; `operator` is `contains`/`overlaps`. |
| `postMatchesTaxonomy2029(post, scope)` | Verify exact membership plus the trimmed suppressed-tag boundary on each returned row. |
| `postsTaxonomyEvidence2029({ scope, posts, total, page = 1, search = "", exists = null, error = null })` | Derive the response state/status from a verified anonymous result. A label/route alone does not establish public existence. |
| `postsTaxonomyLocation2029(location, params)` | Retain pathname/hash when changing query parameters. Used by the React wrapper. |

For raw PostgREST, use `arrayLiteral` with `cs` for a tag or `ov` for a category and apply `publicFilter` at the same time. Do not interpolate raw labels into filter grammar. The SDK's array overload joins values without quoting; labels such as `ארה"ב`, commas, braces, backslashes and a literal `NULL` require the escaped array literal. The client uses that literal for these cases; a controlled SDK transport test verifies the actual URL.

Match the **raw** pathname before decoding its label. `/category/אסונות%2Fתופעות-טבע` is an existing category with a slash in its name. Decoding the whole pathname before segment matching would reject it. A real extra path segment is not accepted. The historical hyphen-to-space taxonomy convention is retained, without prefix, substring or title fallbacks. Query `tag` values select their exact label directly.

| Evidence state | HTTP status | Meaning |
| --- | --- | --- |
| `ready` | 200 | Exact public Post members and a valid count/page. |
| `empty` | 200 | The title search has no matches and a separate unfiltered public membership witness exists; first page only. |
| `missing` | 404 | Invalid/suppressed taxonomy, unknown label, or a label with no public members. |
| `page-missing` | 404 | The requested page lies beyond the exact count or is invalid. |
| `unavailable` | 503 | Failed/malformed/unverified result, mismatched or suppressed rows, or missing public-existence evidence. |

The client `fetchPostsCatalog2029` returns `{ posts, total, taxonomy: { state, status } }` for taxonomy selections. A non-empty ordinary result adds no request. A zero-match title search reads at most one unfiltered public member, with the same taxonomy/public filters. An out-of-range PostgREST response reads the exact count with the same filters. Failures remain failures; no error is converted into a missing collection.

The server must use these states for **real HTTP responses** for browser and crawler documents. Client `noindex`/empty copy alone does not satisfy that requirement. Server result rows must preserve the same source identity/credit/public address as the client. Taxonomy does not certify source truth or research acceptance.

## Focused verification

15 new tests pass:

```sh
node --test test/posts-taxonomy-2029.test.mjs test/posts-taxonomy-ui-2029.test.mjs
```

These cover encoded Hebrew, encoded slash, one-time decoding, category alias identity, namespace conflicts, no substring fallback, exact membership, public exclusion, quote-safe PostgREST URLs, stable bounded pagination, public existence for empty searches, HTTP evidence states, cancellation, exact history return, the actual page/router search and pagination transitions, source credit/media/address reuse, no new Follow, and loading/empty/error recovery.

54 existing focused tests also pass across these two commands:

```sh
node --test test/post-classification-2029.test.mjs test/post-category-identity.test.mjs test/posts-follow-targets-2029.test.mjs test/content-series-mixed-pagination-2029.test.mjs test/doc37-posts-history-return.test.mjs test/doc37-mixed-page-readiness.test.mjs
node --test test/follow-category-series-alignment.test.mjs test/post-content-interest-2029.test.mjs
```

The React state tests compile only the test component using the existing test approach. They do not run a production/full build or browser. No remote read, live sending, model call, database write, server/shared/Auth/Edge change, push, merge or deployment was performed by this lane.

Root-scheduled acceptance still needs the mounted routes and server statuses, then 320px/390px/desktop visual checks against accepted Posts, including long label/filter text, card media, pagination/search reset and Post → browser-back exact return. Check known tag/category, the existing renamed category, encoded slash/quotes, unknown and draft-only labels, page overflow, empty title search, and an unavailable reader. There is no new full performance pass requested by this delta.
