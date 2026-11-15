# Historical URL release — independent review, 15 November 2026

Prepared under the existing publishing/URL and Experience owners. This is release evidence, not a new contract, registry or source of product truth.

Base: `3843af126f21ae58cf033fe808eaa2821b7a3362`. Observed live deployment: `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj`, from `4b9a8687eea94afcf2466046708903b512d44f38`. No merge to main, deployment, alias change, SQL or permissions change was performed by this review. The passive journal update is separate from product changes.

## One reviewable code package

The five source branches are preserved unchanged. Their exact heads merge without conflicts into this review branch. They must not then be merged a second time as a separate release path.

| Source | Pinned head | Included behavior |
| --- | --- | --- |
| #1349 | `b7ab5a985d8343119e071615f2de1b006f456a2b` | WordPress canonical uses the served, slash-free path; stored post identity and native `/post/` routing stay intact |
| #1350 | `2e624529de28d67ccde7c0d671c232fc79c17829` | Sitemap researcher identity uses numeric code or actual slug |
| #1351 | `82179da9e8fd90d87d4393297e76c3642eefc2fd` | Server taxonomy canonical uses hyphens for spaces |
| #1352 | `1565e87c820e061cd88a7dfce2acb08018452498` | 496 redirect destinations omit the extra trailing slash |
| #1353 | `a8d5abc326c69f3f623819077cefe436cd260eb5` | Existing alias routes survive the edge legitimacy gate |

Independent additions are confined to the Posts taxonomy page, its existing UI test, CI wiring, an offline audit control and these review documents. No new destination, data store, law, permission, consent rule or content restoration is introduced.

## Findings and resolution

**R-URL-1 — server/client canonical disagreement, fixed here.** The mounted `Posts2029Page` issued the original spaced pathname to `applySeo` during loading and after reading the taxonomy. That would undo #1351 after hydration. Both calls now use the same hyphen representation as the server. Four new mounted-component regressions (tag/category × literal/encoded space) fail before the fix and pass after it. The exact visited route, query, pagination, search and anchor are retained; existing noindex decisions are unchanged. This tests the real component's effects, not just a copied normalizer.

**R-URL-2 — four supplied regression files absent from CI, fixed here.** An explicit step in the existing `release-contracts-2029` job runs the four source PR test files and the mounted taxonomy suite: 24 tests, zero skipped. No job name, threshold, timeout, required check or workflow permissions change.

**R-URL-3 — tracking 403 is contaminated by the audit transport.** The source audit explicitly calls `context.route(...track_..., route.abort())`. The real worker wraps a failed upstream fetch as `403 {error: public_reading_operation_denied}`. An offline Chromium control with the built worker and identical request returned **204 → 403 → 204** when that audit abort was absent, present and removed. Normal requests reached only the local fixture; aborted requests did not. The host resolver blocks all non-fixture domains. See `track-visit-control.json` and `node scripts/audit-track-visit-interception.mjs` (ordinary review build required). Live catalog inspection also found anonymous EXECUTE available on `track_visit(text,text,text,text,boolean)`. No live tracking RPC was invoked. This removes the audit 403 as proof of a production permission defect; it does not prove every real user's measurement succeeds.

**R-URL-4 — sitemap repair is not historical alias repair.** #1350 removes the bad `/community/researcher/panzer` location from the sitemap and emits `/community/researcher/israel-panzer`. It does not add a redirect for the former address. That former address remains a known-identity follow-up; do not mark both broken historical addresses repaired merely because the sitemap becomes valid. `/WORLD` is addressed by #1353.

## Independent checks and scope of evidence

- Parsed the supplied classified CSV at evidence head `e49199bbd813f1b0e7f60faf4d98e90370d24903`: **15,052 rows**, with 12,862 direct OK, 1,287 redirected OK, 751 undecidable, 112 intentionally unavailable, 38 temporarily closed and 2 broken. This agrees with its summary. The **26,775 unsent URLs remain unverified**. The reported 99.4% impressions / 100% clicks apply only to the supplied Search Console performance corpus, not to indexing or the whole 15-year history.
- Mechanically compared all Vercel redirect objects: **exactly 496** changed, and only the destination's trailing slash. Sources, query strings, permanence/other properties and all non-redirect configuration are identical. This is construction evidence; it is not 496 additional live URL checks.
- Ran the new five-file CI command locally: **24/24**. Related Post, taxonomy, frame, source, workflow reference, analytics and worker regressions: **79/79**. G1: **51/51**. Route legitimacy: PASS. None skipped.
- No second live crawl was started. Browser content/Google indexing and real post-release behavior are not newly claimed by this review. The offline tracking browser control is separate from the mounted React taxonomy regression.
- Source PR CI and this combined branch's CI are different evidence. Check this PR's current head; do not substitute the five individually green heads. The final CI result is recorded in the PR and passive journal to avoid changing the commit after verification.

## Release boundaries

See [release-request.md](release-request.md). The W0 canonical change needs the user's explicit decision. Existing merged #1345 is also carried by any deployment of this branch; it changes manual GA page identity and starts the admitted Post background earlier. Therefore a measurement discontinuity at release cannot be attributed to the slash change alone. GA Enhanced Measurement duplication remains a separate setting proposal (#1347), and GA sync preview (#1348) remains an unmerged Edge package. #1346's parallel reader improvement is also separate.

Unknown destinations, the 38 temporary closures, `?p=` decisions, local saved-link comparison keys, the old `panzer` alias, Page Indexing evidence, source display/history links and unresolved product decisions remain visible follow-ups. Nothing in this package closes or deletes them.
