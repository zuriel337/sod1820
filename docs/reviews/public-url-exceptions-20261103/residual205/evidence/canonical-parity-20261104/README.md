# Public canonical parity — live read-only audit, 4 November 2026

Task: `PUBLIC_CANONICAL_SERVER_CLIENT_AUDIT_20261104`.
BEFORE: `b9c346a3-320f-4bf9-9216-f439d7507d49`.
Audited live product: `f4390dd356b374e839024eb235fc4a63344667de`.
Production: `dpl_48Ha5ZApCdwpK8YDHkboumGVApyS`, READY.
Origin: https://sod1820.co.il . No Vercel grant, login or private account.

This continues the existing URL inventory and calculator finding. It is not a
new historical mapping or a claim that every content item was HTTP-tested.
The audit branch starts at8a9d95b2; its previously prepared calculator metadata
fix remains separate from the audited live product and has not been deployed.

## Actual scope and evidence

* `static-scope.json`: all13 prefixed route declarations in the current App,
  classified by the existing public-reading owner. Six are public declarations:
  Home, Posts, three calculator entries and `/2029/number/:value`. Seven others
  are closed/account/preview scopes. `/2029/number` is separately an existing
  continuation. Git blobs/hashes bind the route, metadata and client sources
  to the live SHA; the local prepared adapter differs and was not substituted.
* `mobile19.json`:19 anonymous390px browser observations, including all six
  public prefix declarations, numerical/phrase/method examples, canonical
  controls and two continuations. Initial response HTML is compared with the
  hydrated document, including canonical, og:url and robots. Source artifact
  before and after is exactlyf4390dd3; all19 use the real `/sw.js`. There are
  eight canonical mismatches, six old-server-prefix repairs in the browser,
  and zero page exceptions. Observed is not the same as functionally accepted.
* `desktop3.json`: the Number mismatch, Posts reverse mismatch and Gallery404
  reproduce at1440px on the same pinned source. Gallery GET and HEAD both404,
  with noindex; HEAD has no body. No unsuccessful runner attempt was discarded.
* `browser-audit.cjs`: reusable read-only harness. It forbids model/mail/product
  mutations, beacons and sockets, and permits only inventory-approved read RPCs.
  Five attempted `lang_links_list` reads were deliberately denied in the mobile
  run. No claim is made that this secondary language data loaded successfully.
  These are metadata checks, not new personal/functional/performance acceptance.

## Confirmed findings

All canonical paths below use `https://sod1820.co.il`.

| Existing address | Initial server canonical | Hydrated client canonical | Finding |
|---|---|---|---|
| `/2029/calculator`, `/2029/gematria`, `/2029/gematria/viral` | `/2029/gematria` | `/gematria` | Previously known; still live onf439. Prepared branch-only calculator fix is not live. |
| `/2029/number/1820` | `/2029/number/1820` | `/number/1820` | Same defect in the Number alias family. Server also sends noindex/nofollow, while the admitted client is index/follow. |
| `/2029/number/משיח` | `/2029/number/משיח` | `/number/משיח` | Same defect for a phrase. Readiness confirmed against the real358 result. |
| `/2029/number/358?phrase=משיח&method=regular&…` | `/2029/number/358` | `/number/358` | Reproduces with method and exact-return/repeated-query parameters present; no address mutation. |
| `/post` and `/2029/posts` | `/post` | `/2029/posts` | Reverse defect: server is canonical, client restores the old prefix and changes index/follow to noindex/nofollow. |
| `/2029`, `/`, `/world`, `/number/1820`, `/number/משיח`, `/gematria?q=משיח`, `/books` | Approved unprefixed identity | Same identity | No canonical mismatch in these observations; not an exhaustive acceptance of their content. |
| `/2029/number?…` and `/research?tool=gematria&…` | Final `/number` or `/gematria` after308 | Same identity | Continuation and repeated query parameters retained. |
| `/2029/journey` | `/2029/journey`, noindex | Same identity, noindex | Intentionally closed control; not a public URL defect and not a reason to strip every prefix. |

**Separate HTTP/metadata defect:** `/gallery` returns404 with noindex and title
“הפוסט לא נמצא”, even though it is an admitted public Gallery route. The SPA
mounts and the worker runs; that does not make a404 response successful. The
current metadata handler has no Gallery branch/static entry and falls through
to the Post lookup. This repeated in both viewports and GET/HEAD. No gallery
records/media were changed, and metadata equality was not reported as a pass
for Gallery availability.

## Causes and bounded next repairs — not applied by this audit

1. `public-reading-deploy/api/public-document.js:86`: only Home/Posts and part
   of the calculator aliases are normalized for metadata. Number aliases fall
   into `api/og.js:825`, which still describes a Golden preview. Normalize only
   the already admitted public Number aliases to the existing `/number/…`
   metadata reader, preserving parameters, indexability admission and status.
   Keep the standalone Golden/private profiles unchanged.
2. `src/pages/Posts2029Page.jsx:144,182`: canonical and robots depend only on
   `VITE_PUBLIC_FOUNDATION_PREVIEW`; the actual public-reading profile disables
   that old preview flag. Include the existing public release condition for the
   public catalog identity/indexability, retaining filtered-query rules. The
   live source has not changed here since the accepted product ancestor.
3. `api/og.js` Gallery fallthrough: give the already existing public `/gallery`
   its proper static collection metadata, rather than a Post lookup. Unknown
   post slugs must keep404, with no weakening of media/source authorization.

No global `/2029` rewrite is proposed. Internal/admin/journey/preview scopes
retain their own identity and noindex. The audit makes no runtime, source test,
guard, DB/RLS/Auth/Edge, shared flag, main, domain or Production change. It does
not close formal G4 or change prior owner deferrals, H1 or account acceptance.
Only existing documentation/current matrix statuses are updated with this
evidence. Existing URL rows and every original source address are retained.
