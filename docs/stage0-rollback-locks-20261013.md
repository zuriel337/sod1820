# Stage 0 — rollback capability containment

Scope: branch-only correction from production rollback `99249526e91f1d720fae1aa43e82bbbe51ee5c45`. The live product flags and data are unchanged. World, ELS and existing public content retain their baseline routes and renderers. No Home/Posts rollout, URL migration or production promotion is included.

Reference work: `49d72cd10801956b3af6fe99711ba68aad287ffe` is retained in local branch `reference/g4-49d72cd1` and the existing PR #1082 history. No merge or cherry-pick of #1082 was performed. In particular, `/numbers` still belongs to `lock_convergence_tree`; Forum remains reversible through `lock_forum`, rather than adopting the broader rollout's redirects/retirement.

## Changes

- Apply the existing `Locked` component before mounting Number, Books, Heichal, Journey and the Numbers hub; cover their existing aliases and both document roots. Harden existing Forum, Research and Cross wrappers, including the Hebrew Cross alias.
- Opt-in `requireFlag`: missing, failed or malformed availability reads remain closed; wait for auth resolution; reread on navigation and never borrow the previous route's open state. Known `all`/`anon` modes retain admin/registered access. Missing truth is closed even for an admin. Existing consumers that do not opt in retain their behavior.
- Blocked routes set `noindex, nofollow` and restore preceding robots metadata on exit. Existing public pages retain their SEO owner.
- Project the existing `site_flags` into `/sitemap.xml` and crawler metadata. Closed/registered-only/unknown capabilities are omitted from public discovery. Resolve availability before capability metadata queries; no-store avoids caching a formerly open projection. This is a route projection, not a new flag store or capability registry.
- Add only missing search-crawler rewrites and a temporary `/heichal.html` → `/heichal` redirect, closing the old static document bypass. Existing Book redirects stay unchanged.

## Before/after (anonymous visitor; current live flags)

| Routes | Rollback baseline | Stage 0 candidate |
|---|---|---|
| `/number`, `/number/:phrase`, `/2029/number/:value` | Page could mount despite `lock_number`; legacy metadata indexable | Gate before content mount; crawler noindex; removed from sitemap |
| `/numbers` | Hub not wrapped; sitemap already partly filtered | Gate using **lock_convergence_tree**; crawler/sitemap agree |
| `/books`, `/book/:slug`, Book aliases | Library/book content exposed despite `lock_books` | Gate before content/handoff; crawler noindex; omitted from sitemap |
| `/heichal`, `/היכל` | Research UI exposed despite `lock_heichal` | Gate before research UI; crawler noindex; omitted from sitemap |
| `/heichal.html` | Old standalone HTML bypass | 307 to `/heichal` with query preserved by Vercel |
| `/journey`, `/journey-beta`, `/מסע`, `/2029/journey` | Ungated entrypoints | `lock_life_journey` gate; crawler noindex; omitted from sitemap |
| `/forum`, `/forum/:id` | UI locked; metadata/discovery still advertised | Fail-closed UI plus matching crawler/sitemap state |
| `/cross`, `/הצלבה` | English wrapped, Hebrew alias unwrapped | Both use `lock_cross`; crawler/sitemap agree |
| `/research` | Registered-only existing gate | Same access policy, fail closed on missing flag; anonymous discovery excluded |
| `/world`, `/els`, `/code`, `/codes/*` | Public baseline | Existing routes/renderers retained; published cipher content preserved |
| `/`, `/post`, `/post/*`, legacy post slugs, `/topic/*`, `/community/chat` | Public baseline | Existing routes/renderers retained |

## Validation

- `npm ci --ignore-scripts`, then `npm run build`: PASS for both isolated documents (existing large-chunk warnings remain).
- `node --test scripts/test-stage0-containment.mjs`: 6 suites PASS, including 114 closed/error crawler combinations, route aliases, open/closed/unknown sitemap states and public URL preservation.
- `PLAYWRIGHT_MODULE=<installed playwright/index.mjs> node scripts/test-stage0-lock-browser.mjs`: controlled real React/Router/Chromium test; no live database reads or writes. Covers pending flags/auth, malformed/missing flags, anonymous/registered/admin states, cross-capability navigation, same-capability refresh on navigation and robots cleanup.
- Existing regression scripts: `test:2029-server-seo-ai`, `test:2029-cheap-hardening`, `test:legacy-research-containment`, and `node scripts/test-2029-isolation.mjs`: PASS. Fixtures/assertions now explicitly account for the new availability gate without relaxing their original content and document-isolation checks.
- `git diff --check`: PASS.

Preview HTTP/browser observations must be attached to the exact resulting commit SHA in the work-log handoff. A preview build is not production. Authenticated cases above use controlled identities; this does not claim live administrator login testing. No claim of instant flag propagation to an already idle page, server-side authorization changes, complete G4 closure, performance optimization, or all-site Golden validation is made.
