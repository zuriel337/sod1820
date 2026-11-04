# Dormant public-reading Production artifact

Scope: `PUBLIC_LAUNCH_CLOSURE_THREE_LANES_20261102`, Production lane of BEFORE
`67bfdcf5-f303-4d60-a11b-58fc16bd607e`. Base source
`6cd64a79598aaa38de4596f2506beb167447bf1c`; Legacy/main remain untouched.

This implements a separate artifact from the actual existing 2029 source. It does
not promote, relabel, rebuild under a forged environment, or reuse the output of
the protected Preview. The accepted `6cd64a79` progressive numeric-font stylesheet
and all existing design/content are retained. The previous Preview remains
`dpl_Fyd6ngZYrU1NucKYr6K6AQJw7tRj`; it is not this artifact.

`node scripts/build-public-reading-production.mjs` runs the unchanged Legacy lock
and content gates, then builds the existing Vite 2029 target into
`public-reading-deploy/dist`. Every broad Preview switch is compiled false; the
existing `public-reading-20261101` profile still owns capability availability.
Only this compiler defines `__SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__=true`.
Legacy and ordinary Preview cannot gain the signed-service exception.

The build is deliberately dormant. A truthy `VERCEL` or any `VERCEL_ENV` causes an
error before compilation. `authorization.js` has `state: dormant`, null approved
SHA/deployment ID and `deploymentAuthorized() === false`. No branch, request,
query, header or environment variable activates the hosted handlers. Every
default hosted adapter fails closed. Local handler dependency injection is an
explicit synthetic test seam, not a hosted activation mechanism.

## Implemented behavior

The dedicated configuration preserves the approved anonymous readers and
closures. `api/og.js` remains the metadata/publication owner; `api/sitemap.js`
remains the XML owner. The trusted internal profile is selected by the dedicated
adapter and never by a request parameter. Legacy/default/Preview behavior is
unchanged. Production-only additions distinguish a missing published Post,
Topic, public writer or verified video (HTTP 404) from a failed source (503).
Number/phrase indexability consumes the exact existing RPCs used by Number2029,
without calculating or publishing anything. Closed/internal/unknown routes and
calculator result queries remain noindex. Historical WordPress root slugs,
percent-encoded slugs, native `/post/` addresses, aliases and `/?p=` resolve via
the existing public Post address boundary.

Only known canonical hosts are accepted. Original document alias redirects
retain the original query bytes, including repeated/encoded parameters and a
user `path` key. If the runtime only supplies an already rewritten internal URL,
the adapter serves the alias with the canonical primary URL instead of guessing
which query component was synthetic. `/posts` redirects to the existing `/post`
reader. All 92 existing root-config redirects (including durable Post/Topic
aliases and trailing-slash compatibility) are retained byte-for-value in the
dedicated configuration; the unchanged public boundary still owns their target
availability. Root never redirects to `/2029`.

The real built HTML is stored outside public `dist` at `.generated/2029.html`
and included only in the document function. Neither `index.html` nor a raw
`2029.html` can shadow document status, metadata or `/?p=` routing. Documents,
APIs, identities, XML and workers are no-store. Hashed assets are public
immutable. The robots endpoint advertises the canonical sitemap only in the
explicit authorized runtime; dormant mode disallows crawling with HTTP 503.
Indexability is not a claim that a search engine indexed any URL. Hosted Vercel
route/header/bundle acceptance remains a later gate because no deployment was
performed.

The pre-entry worker permits the existing calculator/read RPCs and reviewed
public STABLE GET readers. It validates public community field projection and
reply parent context. Models, research-run/A3, Auth mutation, credits, general
writes, newsletter signup, arbitrary same-origin API proxies and ambiguous
RPC paths are rejected before network I/O. The dedicated public writer server
bridges reuse existing projections, allow GET only, and strip caller Auth and
cookies. Canonical server RLS/Auth remains unchanged; this website boundary is
not a claim to alter access to Supabase directly.

One ten-second admission deadline covers worker registration, update, installation,
activation, readiness, page control and the exact policy/source-SHA handshake.
An already-active same-URL registration is explicitly updated before trusting
its identity, so a fresh Legacy registration cannot be mistaken for the new
guard. Failure leaves the application unimported. A later promise resolution cannot
start it after timeout. The worker never uses CacheStorage or cached fallback
HTML. All three worker URLs contain the same restrictive source, including
`/sw.js` used by existing push registration. No opt-in can replace it.

## Signed Legacy unsubscribe

The existing `UnsubscribePage` and existing HMAC-validating Edge function remain
the service. Root owns the minimal `PublicServices2029Page.jsx` compile seam;
this lane does not write that shared UI file. Preview still shows its original
informational closure. Production shows the unchanged signed service while
signup/mail/Auth/general writes remain closed.

Signed unsubscribe is a preserved, token-bound mutation, not an ordinary read.
The transport exception requires exactly GET with `e`, `t`, `format=json`, valid
bounded base64url syntax, no duplicate/extra query keys, and a real controlled
window client at this same origin's `/unsubscribe`. Its `e`/`t` must match the
open document. No background/no-client, foreign client, other page, callback,
different token, HEAD, POST or OPTIONS gets the exception. Requests omit cookies,
use no-store/no-referrer and reject redirects. The Edge server remains the HMAC
authority; the worker never pretends to validate signatures itself.

No real signed link, actual unsubscribe, signup, model call or live product write
was tested. Unit transport tests use synthetic tokens and fake fetch; local UI
acceptance uses synthetic Responses before network and independent egress denial.

## Validation and limits

Run the actual-source build, then:

```sh
node --test test/public-reading-production-artifact.test.mjs
node --test test/public-reading-production-artifact.browser.mjs
node --test test/public-reading-release-2029.test.mjs test/public-launch-seo-gates.test.mjs test/public-post-reading-boundary.test.mjs test/world-finding-share-og-2029.test.mjs
```

The generated `public-reading-artifact.json` records exact source HEAD,
sourceDirty, document/worker hashes, dormant authorization and a hashed file
inventory. It explicitly says deployed=false and productionReady=false. A build
from this isolated lane with the root-owned service seam uncommitted is honestly
sourceDirty; final acceptance must rebuild the clean integrated root SHA. Do not
present its HEAD alone as the hash of a clean deployable tree.

See [VALIDATION.md](VALIDATION.md) for results and preserved failed attempts, and
[ACTIVATION-AND-ROLLBACK.md](ACTIVATION-AND-ROLLBACK.md) for the exact remaining
guard decision and the local replacement contract. No Production deployment,
alias, merge/main push, DB/RLS/Auth/flags/credit/Cardcom/Edge change, private data
copy, backup export or recovery claim is included.
