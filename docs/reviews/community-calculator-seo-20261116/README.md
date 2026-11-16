# Community calculator: effective-address SEO

Branch only, based on main `d1f1e3252100afe14719a4eeb96c791dd29b7d51`.
No backend, calculator engine, permission, import, Post/editor or live changes.

The calculator serializes edits with native `history.replaceState`. React Router's
`location.search` does not change for that call. The previous SEO effect watched
that stale search, so typing in the bare calculator left `index, follow` on the
query-bearing address. Reloading the same address changed it to `noindex, nofollow`,
while the server already specified `noindex, follow`.

The effect now follows the existing `returnHref` after serialization, retaining
the bare canonical and generic title/description. The bare page stays indexable;
input-bearing addresses are `noindex, follow` both while editing and on reload.
No calculation, sharing or return-state semantics change.

A mounted real-component regression failed on main and passes with the change.
Runtime, continuity and robots suites: 18/18. The runtime test is already in CI.

Baseline browser audit at 390px and 1440px: eight steps per width, all passed:
bare entry, אור = 207, comparison with רז = 207, reload, number-link navigation,
Back with inputs retained, Hebrew-date sunset conversion, two baby-name cards.
The real built app and worker used public-read fixtures with zero cache misses.
Number-page secondary reads were blocked locally, so that step proves the target
address and return continuity, not the full number dossier. No write or AI call
was sent to production. Candidate browser/CI evidence is attached to the PR.

This fix is independent of #1367's forward-navigation reset and Claude's #1358.
A release needs approval of the exact integrated head and deployment separately.
