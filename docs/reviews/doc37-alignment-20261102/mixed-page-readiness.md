# Mixed-series later-page readiness

Base: `32d0719a9ad2ae97ea6ef1d6ac1a01ce041babb5`.
Branch: `gpt/2029-doc37-mixed-page-readiness-20261102`.
Coordination: scoped extension of `d57137fb-1305-455f-a7f0-a984dfd9c0a2`.

The exact32d browser attribution identifies page2 assignment, not the now-passing history return, as the remaining shift. A provisional24-Post page became a corrected24-item page after one predecessor Post was inserted at the top: document height18598→18546, scrollY1251 unchanged, first visible article y258.875 moved out of view, shift0.445803 without recent input. The retained parent diagnostic is `series-cls-diagnostic-32d0/series.json`.

For a page offset `o>0`, the source's global rank can require Posts`[o−1..o+22]`, Posts`[o..o+22]` plus the source, or Posts`[o..o+23]`. Until its rank/predecessor completion resolves, the preliminary24 are not known to be members of that page. The page now shows the existing meaningful loading state during this assignment. It mounts the final catalog, pagination and Follow footer together. This adds no artificial height, cache, request or reader gate.

Page1 remains incremental: it has no predecessor case, and the first23 Posts retain membership. Its already-readable Posts still appear while the source/rank is pending, preserving the accepted behavior. A failed/access-filtered source or failed rank releases the available Post-only page with the existing failure notice; pending and failed states do not become a successful empty list. Stale-page completion and canceled readers remain discarded.

Readiness tradeoff: later mixed pages now wait for their already-required source/rank/predecessor work before presenting their card list. There is no request reduction or claimed speed gain. They no longer display an incorrect provisional page and move its first visible card afterward. Source failure preserves readable Posts rather than blocking the whole catalog.

Five actual-page React regressions were run before the fix: page1 availability passed and four later-page cases failed on premature24-card display. After the fix all five pass. Combined with existing source/privacy/pagination/layout tests:23 pass,0 fail,0 skipped. The actual page/effects are used with controlled deferred readers; these are not hosted browser or CLS measurements. `git diff --check` passes. Final mobile/desktop Preview CLS and navigation acceptance belongs to the parent integrator.

Only `Posts2029Page.jsx`, the focused regression and this receipt changed. The passed history helper, public readers, query/permission policy, CSS, Home, Video, XML and shared infrastructure are unchanged. No deployment or live data write occurred in this lane.
