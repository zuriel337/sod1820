# Returned first-page readiness and scroll intent

Base: `3da93559352f605059dca231c2e152745701b061`, verified against the remote product branch before writing.
Branch: `gpt/2029-doc37-returned-page-readiness-20261102`.
Coordination: scoped extension of `d57137fb-1305-455f-a7f0-a984dfd9c0a2`; parent remains sole integrator and Preview deployer.

The parent’s exact 3da browser run accepted page2 and the full return sequence at CLS 0.03461 mobile / 0.04415 desktop. A distinct page1 reload at the saved scroll position still shifted when its public source arrived: CLS 0.44035 mobile / 0.13280 desktop. In the mobile trace, the first visible card moved from y175.8125 to y740.78125 at t2756.8 with no recent input. The retained diagnostic is `final-approved-series-3da9/series.json`.

The page now captures whether this arrival is a POP with a valid positive saved viewport. Validation is extracted unchanged from the existing Posts-only history helper and reused by restoration. The marker is stable for the current entry key, exact URL and navigation type; later scroll tracking cannot change its readiness rule. A scrolled return/reload of page1 waits for the already-required mixed ordering before mounting the catalog, pagination and Follow footer. Fresh/top page1 remains incremental. No content cache, extra request, artificial blank height or query-policy change was added. Source/access/rank failures still show the available Posts with the existing truthful failure state.

Readiness tradeoff: a scrolled page1 return now waits for source/rank completion, just as page2 already does. This protects the visible card from a late insertion; it is not a claimed speed improvement. It does not delay a fresh top-of-page visit or block usable Posts after a failed source read.

Separately, the real-wheel diagnostic (`return-wheel-diagnostic-3da9/return-faults.json`) recorded input at y170 followed by continued native smooth motion to y925. The helper had correctly canceled its own y2500 replay. On input only, the helper now stops its correction and interrupts native motion by scrolling instantly to the current coordinates on the same validated history entry. The input’s default action remains enabled. Timer, route change and cleanup do not scroll; global CSS and native `history.scrollRestoration` are unchanged. Actual-browser wheel acceptance is still required before declaring that symptom resolved.

Validation:

- Against unchanged 3da source, the focused regression set had 15 passes and 4 failures: deep page1 exposed 24 provisional cards, the held-page precondition failed, and input left native motion running.
- After the change, 38 focused tests pass, none fail or skip. They cover the actual page with deferred readers, deep return/reload, stable arrival markers, fresh/top/wrong-entry behavior, source and rank failures, cancellation/stale pages, source privacy/admission and mixed pagination.
- The helper tests model in-flight native animation, retain default wheel behavior, reject another entry, and ensure no subsequent replay. This controlled model is not browser proof.
- `git diff --check` and helper syntax validation pass. No browser benchmark, live write, model call, deployment, shared setting or main change was performed by this lane.

Reproduce the focused checks:

```sh
node --test test/doc37-mixed-page-readiness.test.mjs test/doc37-posts-history-return.test.mjs test/doc37-series-layout-stability.test.mjs test/content-series-approved-source-2029.test.mjs test/content-series-mixed-pagination-2029.test.mjs
node --check src/lib/research/postsCatalogViewport2029.js
git diff --check
```

The parent must verify this integrated candidate with the real service worker on mobile and desktop: direct fresh page1, exact deep return/reload, later-page back/forward, delayed and failed source completion, and real wheel cancellation. The existing CLS threshold remains 0.1. Prior 3da GitHub gates apply to that SHA, not automatically to this change.
