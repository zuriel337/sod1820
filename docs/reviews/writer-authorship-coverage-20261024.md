# 2029 writer authorship coverage — bounded continuation

Status: implemented on an isolated continuation branch; central integration and
the World focus dependency below remain separate. No live product data, privacy,
publication, identity, RLS or schema was changed.

## Base and integration boundary

- Branch: `gpt/writer-authorship-coverage-20261024`.
- Exact base: `de27c6ea2e4f8474dd0f379c9bd60b36654344ad` on
  `gpt/2029-central-world-fast-reader-integration-20261024`.
- ZURIEL confirmed the prior writer slice was integrated patch-equivalently:
  `85e2f966` → `40fe60f06`, `20f24ea5` → `d7b585906`.
  Neither original commit was cherry-picked again.
- Checked main remains `e73687221aa2ab639930643e5cc8c99666adce88`.
- During closure the central branch advanced to
  `09d3dbb1fe149aa41377ec87b81849b4bd271e37` (Raziel lazy-submit split).
  Its changed paths do not overlap this slice. This continuation retains the
  explicitly approved base above; no rebase or additional integration was made.
- Coordination BEFORE: `66476d6c-d37c-4779-a539-4cd38e1eaf7f`.

## Implemented behavior

The existing publication reader shares one bounded anonymous contributor inventory
across its name-based source families. Exact canonical names and registered aliases
must resolve uniquely to the same existing public contributor. Collisions, including
with a returned private/locked contributor, do not establish authorship. Inventory
failure/truncation remains unavailable rather than becoming a fabricated zero.
There is no identity merge, new writer registry, copied corpus or account creation.

Public, published ciphers can match the explicit source-author credit even when
another account uploaded them. Original owner IDs and credits remain unchanged.
Existing account-owned materials remain reachable, with a separate upload basis;
account ownership alone does not label them as authored findings. The public model
shows these as uploaded sources. Publication does not imply verification or strength.

The Tzvi loader still calls `fetchContributorSourceCatalogProjection("tzvi-opoc")`.
It additionally requests only post metadata from the shared publication reader.
Native `posts:<id>` references join the paginated full catalogue without changing
the canonical reader's exact `recentItems` or its twenty-item initial display.
Community activity remains separate. Image/text pairing and source refs survive.
Post cards reference the existing World source selection with the exact native ID.

World already consumes this same publication reader. Its reduced identity input
now resolves the same registered aliases and account binding through the anonymous
inventory; no World implementation file was edited.

## Anonymous live readback — 24 October 2026

| Writer | Public result |
| --- | --- |
| Neria Deutsch | 6 credited ciphers, including the 2 uploaded by another account; 2 posts |
| Tzvi | 1,053 source publications + 5 native posts; 20 recent source publications unchanged |
| Yaniv Levi | 30 ciphers; 7 posts; 32 contribution rows |
| Avraham Hirsch | 18 ciphers |
| Aharon Bochnik | 14 ciphers |
| Ariel Ben Moshe | 0 public catalogue items |

These are source-family counts, not a combined count of independent findings.
The World reader independently returned Neria's 6 ciphers and Tzvi's 5 posts.
Initial reader observations were approximately 1.59–2.88 seconds. A measured Tzvi
read used 10 requests, including the existing paged source reads, one shared
attribution inventory read and one post read; representative general reads used
13. No per-card query or full research-object query was made. These are network
observations, not a repeatable performance benchmark or hosted-browser result.

## Complete post-credit map within the public post inventory

The anonymous reader returned 1,309 posts and 19 nonempty author/coauthor credits.
894 posts had neither a named primary author nor a named coauthor. That absence
does not prove 894 missing human authors. A source appearing in both primary and
coauthor fields is counted once per credit.

| Existing source credit | Posts | Mapping result |
| --- | ---: | --- |
| ציון סיבוני | 22 | Existing contributor `zion-siboni` |
| יניב לוי | 7 | Existing contributor `yaniv-levi` |
| שמעון חיימוב | 2 | Existing contributor `shimon-haimov` |
| נריה דויטש | 2 | Existing contributor `neria-deutsch` |
| סלי מור | 2 | Existing contributor `sali-mor` |
| ישראל פנצ׳ר | 2 | Existing contributor `israel-panzer` |
| בדרך לנצח | 32 | Existing contributor `baderech-lanetzach` |
| צבי | 5 | Registered alias of `tzvi-opoc` |
| המערכת | 1 | Existing canonical system byline |
| מערכת כי לה׳ המלוכה | 3 | Existing canonical system byline |
| SOD1820 | 6 | Existing canonical system byline |
| אלון לוי | 12 | No exact contributor/registered alias resolved |
| הרב ווינטרוב זצ"ל | 7 | No exact contributor/registered alias resolved |
| הרב יקותיאל דטבריה | 1 | No exact contributor/registered alias resolved |
| יעקב קירש | 1 | No exact contributor/registered alias resolved |
| הרב לוי סודרי | 1 | No exact contributor/registered alias resolved |
| מזכה הרבים | 303 | Source/section credit; no contributor inferred |
| סוד החשמל | 7 | Source/publication credit; no contributor inferred |
| מדריך לריפוי 10 הספירות | 2 | Unresolved source credit; no person inferred |

The `buildContributorAuthorCoverage` review projection derives this resolution
from supplied public credits and existing contributor rows. It creates no stored
map or automatic contributor. Existing `contributorHref` remains authoritative
for numeric/code URLs; the table uses slugs only as review identifiers.

The public cipher inventory contained 112 published/public rows and 17 distinct
author-credit strings: 76 rows under 9 resolved contributor credits, 18 rows under
3 system-credit strings, and 18 rows under 5 unresolved credit strings. The latter
include `yacovmonheit` (14), `yaalatchenki1988` (1), `a7134000` (1), `nakadav` (1),
and `אורח` (1). A source credit is not automatically a new author account.
No private/hidden cipher was included or republished.

## Remaining central dependency — exact World focus

`WorldPeopleSources2029.jsx` currently renders the first 12 material rows and does
not reveal an off-page `focusedSourceRef`. Tzvi's five posts reached the World
reader at positions 621, 623, 824, 837 and 846 in this observation. The writer
catalogue can reach all five, but following an exact World reference does not yet
guarantee that its card becomes visible without repeated loading.

The central owner must reveal/focus the exact referenced row while keeping a
bounded number of rendered cards. A focused-item exception alongside the current
page is sufficient; rendering hundreds of preceding cards is not required. Scroll
and keyboard focus must occur after the asynchronous row is rendered. Acceptance:
open a Tzvi `posts:<id>` reference directly, see the matching source card and its
original article link, and preserve the return path. This branch does not claim
that end-to-end navigation is fixed and does not edit the owned World surface.

## Verification and scope

Changed files (10):

- `src/lib/research/contributorAuthorAttribution.js`
- `src/lib/research/contributorAuthorAttribution.test.js`
- `src/lib/research/contributorPublicationCatalog.js`
- `src/lib/research/contributorPublicationCatalog.test.js`
- `src/components/contributor2029/loadPublicContributor2029.js`
- `src/components/contributor2029/publicContributor2029Model.js`
- `src/components/contributor2029/publicSourceCatalog2029Model.js`
- `src/components/contributor2029/publicSourceCatalog2029.test.js`
- `test/writer-authorship-coverage-2029.browser.py`
- `docs/reviews/writer-authorship-coverage-20261024.md`

- Twelve relevant Node test files passed, including the World people/source reader
  and negative attribution/privacy cases.
- Both builds and the existing Legacy Production lock passed.
- Twenty local browser cases passed: 320/390/1440 × light/parchment/dark × two
  writer scenarios, plus two seeded-admin-session regressions. Actual 2029 writer
  components consumed synthetic anonymous HTTP fixtures. Tzvi pagination/reload,
  five post refs, six Neria ciphers, overflow and JavaScript errors were checked.
  No product mutations/full research reads occurred. This is not a hosted Preview
  or authenticated-account test, and does not verify the central World focus fix.
- Browser command: `python test/writer-authorship-coverage-2029.browser.py`.
  It starts/stops its own Vite server with a temporary isolated dependency cache
  and HMR disabled, avoiding interference from other worktrees sharing dependencies.
  `WRITER_COVERAGE_PORT` overrides port 5188;
  `WRITER_COVERAGE_EXTERNAL_SERVER=1` allows an already running server.
- `git diff --check` passed.

No changes to `ContributorReadingController2029.jsx`, writer design components or
CSS, World components, news/channel_updates, Research Intake/source envelopes,
App routes, auth/providers, migrations, DB/RLS, site flags, subscription or credits.
`WRITER_PUBLIC_SOURCE_PROVEN_MANIFEST_20261023` remains untouched. The 573 pending
research rows, orphan-cipher attribution, persistent privacy guard and full Legacy
corpus reconciliation remain separate. Missing contributor identities are reported,
not created under this branch-only authorization. No main, Production or deployment.
