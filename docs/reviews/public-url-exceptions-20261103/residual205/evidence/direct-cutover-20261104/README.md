# 2029 — live Production cutover, 4 November2026

**LIVE:** https://sod1820.co.il

- Product source: `1bc8260adaa889d7903aaa33ef43510df09817f2`.
- Production deployment: `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A`, READY.
- Immutable host: https://sod1820-2z0mg4j21-sod1820-s-projects.vercel.app .
- Source branch: `gpt/2029-public-cutover-final-preparation-20261103`.
- Previous live Legacy: `dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2`,
  source `d1837efcf5a978d10a514010f3695680f231e116`, retained.
- BEFORE: `9dc02d7b-ab75-43e1-b43e-13a5468d233c`.

## Authorization and actual operations

ZURIEL explicitly approved the direct **2029 Production cutover** question
pinning the source and accepted PreviewADnf6NL9, without separate protected
Production staging and allowing the new Production ID to be assigned on create.
The owner wrote “תחליף את האתר וכל הדפים”, “קדימה תעשה” and selected
“מאשר פרסום ישיר עכשיו”. Restore of the exact previous Legacy on opening failure
was included. This supersedes the earlier no-domain staging instruction for
this release only; it is not standing permission to publish another source.

The canceled CLI OAuth session was stopped after the owner could not open the
page and challenged that path. No task auth.json/credential was created. Its
scope30e31d2e was released. No key/password was requested or copied.

Existing Vercel MCP created the Production deployment from real pinned GitSource
and the already approved public-production-candidate build command; no file
upload, fake Git/environment, guard change or source edit. The three canonical
bindings remained on Legacy after READY, so six functional checks ran on the
new actual Production host before traffic changed. Then the three aliases
were explicitly reassigned, preserving their null redirect configuration:
`sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app`.
No native promote, project-settings PATCH, DNS, main push/merge, shared flag,
DB/RLS/Auth/Edge/mail change or product test write occurred. Existing project
SSO settings were preserved. The static artifact calls its mode
`public-production-candidate` and retains dormant authorization booleans by
its existing contract; the real deployment target is Production and the live
traffic switch is the separately authorized operation recorded here.

## Measured acceptance, not inferred coverage

* `production-host-accepted6.json`: six actual-source anonymous browser flows
  at390/1440, real SW and public data. Home/series/disabled public research dock,
  old Post→Number/Phrase→exact history return, World/calculator/Auth/guest admin
  denial all passed on the new Production host. No model/mail/product writes.
* `live-browser-accepted6.json`: six corresponding anonymous canonical-domain
  cases passed. Home, public series, old canonical, number/expression calculation,
  exact return, World, calculator358, safe Auth return and guest admin denial.
  Google/Facebook buttons are enabled on the canonical origin; no OAuth provider
  flow or real account action was initiated. No page errors or overflow.
* The canonical first run passed four cases and had two **harness** failures:
  the new broad expectation incorrectly demanded index on calculator search
  results. Existing `test/public-reading-production-artifact.test.mjs:147`
  requires noindex for these queries; accounts/admin also remain noindex. Only
  those two affected cases were retried after correcting expectations. The
  initial failure and retry receipts are preserved. No runtime was changed.
* `live-http-accepted24.json`: GET/HEAD of12 representative URLs, including
  public home/world/posts/calculator/number/privacy, updates/chat, XML/robots,
  and a genuinely nonexistent404. Public documents index; calculator search,
  updates/chat and missing/private pages retain source-defined noindex.
  The initial test mistakenly expected updates/chat to index;20 passed and the
  four affected checks passed a targeted contract-corrected retry. Both initial
  and retry receipts are retained. No server/metadata change was made to pass.
* `alias-http.json`: www and vercel.app return308 to the main canonical host,
  retaining both repeated query parameters. All three Vercel bindings were
  independently read back at the exact new deployment/source.
* Canonical root and artifact returned200 through the connected backend and
  anonymously in the browser. Root metadata is index/follow with canonical
  `https://sod1820.co.il`; sitemap/robots are live, with no Preview URLs in XML.
  This does not assert Google indexing or HTTP acceptance of every33,667
  inventory record. Original source addresses and accepted URL policies remain.
* Runtime log sampling returned Node DEP0169/url.parse deprecation warnings;
  they are not evidence of an application exception. No frontend page exception
  was observed in accepted browser cases. No broad performance run was repeated.

A setup run initially lacked a sparse-checkout RPC inventory file; the existing
tracked directory was materialized, without changing the test/data contract.
This was not a deployment failure. The local release guard passed before create
and again after documentation edits; no application/test/server/package/worker
source was edited during the cutover.

## Preserved limits and unfinished work

Previous owner-reported two-account personal continuity and admin opening
acceptance are retained for the same product code. No new private Production
account verification, admin trace drilldown, model or financial operation is
claimed. Social login execution remains owner-skipped. Positive real-address
newsletter registration/removal has not been automatically exercised; B/D20/10
remain deployed, existing preferences unchanged, no bulk/test email.

Public service availability stays exactly as in the approved candidate. Personal
owned operations have their separate verified-account gate. General community
publishing/likes/legacy-account claim remain blocked for non-admin by this
profile's existing action ceiling; public community reading remains available.
The new research systems retain their accepted public/admin gates. The cutover
neither opens these writes nor claims they were accepted. These limits must not
be described as a fully accepted ordinary-user community-write workflow.

The195 known historical audio/post recoveries and recent chat import remain
explicitly deferred. H1 historical restore is accepted; current DB backup
freshness and media coverage remain unverified under the owner's accepted risk.
Deployment and bounded checks do not close full Isolation or the formal G4 stage.

## Return plan — traffic and SW, separately from data

Retain the previous Legacy deployment above. To restore traffic under a fresh
incident/release authorization, reassign only the same three aliases to that
exact Legacy ID, then verify canonical HTML, API/service paths, real worker
update and account-owned operations. Do not clear users' browser storage,
unregister every worker, delete research journals, reset DB or undo S2/B/D.
The existing worker update/normal refresh mechanism is the first return path;
verify it rather than claiming alias movement alone restores client caches.
No live rollback was executed merely to test it. A frontend rollback is not a
DB/media restore. Future main commits are not the deployed source; release from
an exact accepted source with explicit authorization.

## Documentation

Doc37§12.45, Master State, Roadmap, the existing URL plan/coverage and matrix
(F00/F26/F27/F30/F32 only), four-completions and bootstrap adapters were synced.
Historical Legacy pin/CLI proposal records are preserved and marked superseded
for this deployment. No new source-of-truth registry, rule or feature-flag system.
