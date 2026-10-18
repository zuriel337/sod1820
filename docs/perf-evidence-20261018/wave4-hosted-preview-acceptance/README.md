# Wave 4 hosted Preview acceptance handoff

Date: 2026-10-18 UTC

## Exact candidate

- Integration code parent: `e8f6f061a287cfe9276057cbc11033839471023f`.
- Preview branch: `gpt/perf-unified-wave4-preview-20261018`.
- Preview source commit: `5ced63490e93225cf1de8497b1507631213a0bf7`.
- Vercel deployment: `dpl_4HiFJh9SiWFGr9trDAPHTVm8XSkw`.
- Deployment URL: `https://sod1820-apwwrm8wa-sod1820-s-projects.vercel.app`.
- Vercel state: `READY`; target is Preview (`target: null`), not Production.
- No merge, Production deployment, live flag change or live product-database write was performed.

The Preview-only commit changes `vercel.json` so this isolated branch invokes
`scripts/build-integrated-preview.mjs` and publishes `preview-deploy/dist`. The
builder requires the exact branch, `VERCEL_ENV=preview`, an exact 40-character
commit and an approved deployment hostname. It fails closed for Production.

## Hosted artifact verification

The authenticated Vercel connection fetched the deployed receipt, inventory,
worker, manifest and HTML. All of the following matched the hosted bytes:

- Receipt commit, branch, host, `buildTarget=2029` and `vercelEnv=preview`.
- `readOnly=true`, `numberReviewPreviewOpen=true`, and the only Preview override
  is `lock_number`.
- 258 unique, byte-sorted artifact records.
- Worker content SHA-256:
  `84e35e465f42eb53d8ed63f7d168c0e779acdb7eb328a28540a503ec755c871f`.
- Manifest SHA-256:
  `7588057e2d507825d8da12f72d993484b4a9114f1fbc66ea97a79bfeb344e95c`.
- HTML SHA-256:
  `ee38acadf20691c5e0698b98164b26ceb940546ec7fe93aaddc9c9d48aa3025f`.
- Inventory SHA-256:
  `58171949c857dd475852de38b0e5f00f982f493dac629e282695185ae37e1f41`.
- Receipt identity SHA-256:
  `39e199e106f805fb6b3b4f1f014a61e634629966f07483165346446bce466d33`.
- Normalized receipt SHA-256:
  `eb5134e22a748df520977a6fdbf4c961bab502b3515f19d961db205b3cc78cd5`.

The hosted paths `/`, `/world`, `/number/1820`, `/els`, and
`/post/bennett-melach-631-78` returned HTTP 200 through the authenticated Vercel
fetch. Every checked response had `X-Robots-Tag: noindex`; the hosted inventory
and read-only worker also returned HTTP 200 with their expected content types.

## Executable gates

On the exact Preview source commit:

```text
node --test \
  test/number-review-preview-browser-2029.test.mjs \
  scripts/test-integrated-preview-auth-guard.mjs \
  test/number-review-preview-2029.test.mjs \
  test/site-flags-inflight-2029.test.mjs \
  test/preview-number-build-integrity.test.mjs
```

Result: 37 passed, 0 failed, 0 skipped.

The suite uses HTTPS, real generated assets, Chromium and real service workers.
It covers first install, reload, internal navigation, browser history, a stale
unsafe same-URL worker, controller-query mismatch, a 20-second worker stall,
the exact Number reader, rejection of adjacent RPCs and all product writes,
retry isolation, malformed flag values, quiet initial Home loading, ignored
build inputs and complete artifact-inventory verification.

## Hosted browser limit

A one-hour Vercel share link was created with explicit user approval. In this
execution environment the link returned the expected 307 and set a Vercel JWT,
but the following request was rejected by Vercel with `403 Access denied`
before any application HTML or service worker loaded. The authenticated Vercel
fetch path did not have this problem and produced the exact hosted byte checks
above. Therefore hosted visual/browser acceptance is **NOT COMPLETED**; the
result is not reported as a product failure. All temporary deployment and alias
share links created for this check were revoked after testing.

## Number database acceptance

Read-only production inspection confirms that
`public.fn_number_opening_projection_2029(bigint, integer)` is not installed.
The live `fx_number_lookup_page` policy was not changed and no migration was
applied to Production.

With explicit hourly-cost approval, a disposable Supabase branch was created:

- Branch ID: `dcba1b88-a958-4562-9674-2f59eaa9c5b8`.
- Project ref: `zowptbwnmbydgsvntrrs`.
- Name: `perf-wave4-number-acceptance-20261018`.

Supabase reported `MIGRATIONS_FAILED`. The branch contained only migration
`20260606074931_create_page_content`; `gematria_words`, `site_flags`, and the
Number RPC were absent. Installing only the final Number RPC on that database
would have produced false acceptance against a non-representative schema, so no
migration was applied. The branch was deleted immediately and its removal was
verified in the parent project's branch list.

Hosted Number UI routing is open in this Preview, but real hosted Number data
acceptance is **BLOCKED** by two distinct facts:

1. the compact Number RPC is not installed in the live database; and
2. the repository migration chain cannot currently reproduce the live schema
   on a clean Supabase branch.

The migration-chain reproducibility issue must be repaired before another paid
branch is created. It must not be bypassed with invented fixtures or by writing
the new function into the live database for convenience.

## One publishing contract

Post and media ingestion already have one canonical authority tree:

- `project_codex.publishing_conventions` is the root convention;
- `POST_PUBLISHING_2029_CHAIN_V1` is the publication preflight;
- `docs/sod1820-media-ingress-storage-convention-v1.md` is subordinate; and
- `20261012125823_post_image_representations_v2.sql` defines distinct Preview
  and reading derivatives (Preview at most 480 px / 100 KB; reading at most
  1600 px / 600 KB).

Future enforcement belongs under that same tree. The remaining bypasses are
direct public Storage uploads, save paths that do not invoke the preflight,
body images and non-Post media outside the current trigger, and critical
readers that can fall back to original media. These should be closed in a
separate non-overlapping wave after Wave 4 acceptance, with private staging,
processor receipts, Preview/reading/OG derivatives, dimensions and alt text,
and no original-media fallback on critical routes. Do not create a second
publishing or image contract.

## Status

- Implemented: Wave 4 integrated code and isolated Preview packaging.
- Tested: hosted artifact identity, hosted HTTP route availability and 37/37
  real local browser/worker gates.
- Preview ready: yes, for protected review of all surfaces except real Number
  data acceptance.
- Number hosted DB acceptance: blocked.
- Hosted visual acceptance from this runner: blocked by Vercel access after the
  share-cookie redirect.
- Merge / Production / live database authorization: none.
- `work_log` AFTER: not written because the bounded authorized coordinator was
  unavailable; raw SQL was deliberately not used as a substitute.
