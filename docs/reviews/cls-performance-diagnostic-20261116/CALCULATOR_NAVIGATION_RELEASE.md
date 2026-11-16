# Calculator and navigation — published 16 November 2026

ZURIEL authorized the reviewed combined release with `תעלה`. PR #1369 was squashed to `ea7257598a5217b9a8de308cca1194ec4a027fbf`, including the already merged #1367 navigation and calculator robots changes. The merged tree `db4f7b76449028499b911a626971fae180dbabe5` equals reviewed head `577b90a4efced46b440c04d244df0ca498548366` exactly.

Production deployment: `dpl_4i7djNA8y61CN6iiskzdPDmHWFmP`, READY, exact source above. All three aliases (`sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app`) were assigned and read back. The live public artifact independently reports the exact source and deployment, `public-production-candidate`, and unchanged application source. Its `sourceDirty` refers solely to Vercel materializing the selected nested configuration at the root; JSON equivalence is recorded in the artifact.

The rollback target read immediately before publication was `dpl_EFNqJ27phRRhWQsC6fGTo9zELVRU`. No rollback was needed.

## Evidence

- PR gates: 13/13 on the reviewed head. Independent local review: 36/36 tests and 2/2 built-artifact browser cases at 390 and 1280 pixels. Post-merge release/compatibility workflow `43784585600` passed.
- Automatic [Post-Deploy Canary run 43784690426](https://github.com/zuriel337/sod1820/actions/runs/43784690426) passed on its first attempt, with seven checks and the unchanged 15,000 ms request limit. No gate override, threshold change or rerun.
- Live `/code` serves the new entry. Both the entry and calculator chunk were downloaded and their SHA-256 hashes equal the live artifact manifest; the calculator chunk contains the new wording.
- Live calculator document: HTTP 200, the new title, `index, follow`, and the bare canonical URL. The populated query URL returns `noindex, follow` with the same bare canonical.
- Live sitemap: HTTP 200, 16,796 entries. The calculator appears exactly once with content lastmod `2026-11-16`.
- The two attempted stock headless Chromium checks received HTTP 403 on the initial document and never reached the calculator. This is not a passing live browser test. Existing `middleware-core.js` classifies `headless` as a blocked bot (lines 186, 198, 336, 359). No identity spoofing or protection change was attempted. No browser product writes were sent. The local mounted browser results remain separate evidence; a normal user-browser post-release check remains unverified here.

The interactive calculator and navigation behavior were tested locally, not re-proven in a live browser. No claim is made about Google recrawling/ranking, reduced field LCP/CLS, existing open tabs, authenticated users, or all possible scroll causes.

## Scope and continuity

This publication contains the reviewed calculator SEO, Royal styling, all-methods grid, and global route scroll repair. It does not add server-rendered post bodies, CDN policy changes, delayed analytics, #1358 editor work, or new product database/Edge/flag changes. Previous deployed work is an ancestor of the resulting main.

The deployment request, merge/alias proof, HTTP/asset/sitemap results, browser failures and canary result are in [data/calculator-navigation-release](data/calculator-navigation-release). The earlier `POST_MERGE_DEPLOYMENT_REQUEST.md` is historical preparation for #1367 alone and is superseded by this completed combined release.
