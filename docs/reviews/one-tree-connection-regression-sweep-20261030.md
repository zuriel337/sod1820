# One Tree connection regression sweep — 30 October 2026

Branch: `gpt/elections-world-seed-integration-20261030`.
Base: `671a8c9d60190afb19f48e8ea9d24d295985b162`.
Passive task: `ONE_TREE_CONNECTION_REGRESSION_SWEEP_20261030`, original claim
`564c3e07-2abe-4db1-b136-073781cad870`, acceptance addendum `6ee0bb6e`.
This extends existing projections and consumers, not a new tree, reader or owner.

## Reproduced defects and bounded fixes

1. **Expanded number list collapsed on selection.** After displaying all eight
   numbers in the browser fixture, opening the first reset the visible list to
   six. The existing consumer now retains the visitor's expanded list within the
   same Topic, resets it on a different Topic and still reveals exact deep links.
2. **Previous Topic data could be relabelled as the new Topic.** The Golden
   projection accepted a previous node/source context, media and prominence.
   A failing pure regression reproduced the mismatch. Topic async payloads now
   carry their requested slug and entity ref; only the matching payload is
   consumed. The pure presentation helper also rejects mismatching node/Topic
   context, while retaining the current Topic's own authored attribution.
3. **Late-loaded sources did not update the shared context map.** A real Topic
   browser fixture loaded sources and related Topics after the initial render;
   the content appeared but the Research Context section map never gained those
   entries. The Topic now updates its existing map when its bounded section
   signature changes. Explicit expression focus remains protected. Withheld
   Topic bodies no longer publish navigation entries for sections not rendered.
4. **The graph opener accepted inconsistent evidence and duplicate edges.**
   Failing regressions demonstrated mismatched source/edge IDs, malformed refs,
   unrelated endpoints and repeated edges. The existing normalizer now checks
   exact UUID edge identity, sourceRef, projected edge id, endpoint identity and
   requested anchor; identical copies are deduplicated and conflicting copies
   withheld. Rejected evidence is reported as a partial window, not proof of an
   empty graph. An unavailable anchor is explicitly unavailable. No extra read
   was introduced: the canonical reader already returns the anchor finding.
5. **Topic connection presentation had an unrelated-endpoint fallback.** Its
   pure model displayed a supplied edge even when neither endpoint was the Topic,
   and displayed duplicates. It now consumes the same existing relation normalizer
   as the World opener, preserving source refs and exact endpoints. A positive
   regression uses the unchanged canonical graph adapters, not a parallel shape.

All runtime changes stay in the existing Topic page, Topic number-entry consumer,
Topic Golden projection and World relation opener. Claude CSS and shared Frame,
Providers, Number reader/cards, graph reader and source admission are unchanged.
No data was promoted, published or reclassified, and no inactive node activated.

## Verification

- Red-before/green-after regressions were run for the list reset, wrong Topic
  payload, inconsistent/duplicate/unrelated edges and late section-map update.
- 49 focused regression, canonical-adapter, source-context, map and 1237 tests
  passed. The strengthened browser suite ran three registered tests without
  skips at 320 and 1440. It covers exact Number-sheet return, delayed Topic
  source loading/switching, map updates, withholding, pagination and new rows.
- Both Legacy and 2029 builds, the built dependency graph/lazy boundaries,
  Topic surface, hard isolation, cheap hardening, Legacy lock and diff check
  passed. Existing large-chunk and ineffective-dynamic-import warnings remain.
- The broad read-only unit sweep excludes the optional Docker/SQL write
  harness and covers World, Topic and Gallery tests. Its inherited failure is
  `worldDiscoveryStream.test.js:117`, expecting old Frame title
  `מה חדש בעולם`. Both that test and Frame are unchanged from the base; no
  assertion was removed, weakened or skipped to make this suite green.
- The previously failing World surface check expected an obsolete blanket
  `מד החיבור לעץ` label. That expectation is replaced with stronger assertions
  for the already-adopted split measures, explicit Topic-not-finding/truth
  warning, and nullable rating props. The actual review UI is unchanged and the
  complete World surface script passes; its remaining guards are intact.

## Live-public acceptance and release

The existing actual-build browser test now explicitly opens 1237's graph using
the canonical reader, checks exact edge refs/deduplication and records window
status. It also retains Topic 1118 → exact World finding → Back, public Zvi source
entry, responsive checks, and page/model/write monitoring. Live and hosted
outcomes, exact source SHA and deployment are recorded on completion, not assumed
from a READY state or a synthetic browser fixture.

Final acceptance:

- Runtime source: `1d7566e9e390719d67ba99672cdcc1ffe22f0141`.
- Protected static 2029 Preview: `dpl_knyX5YKR4ZwreDBENgLG1QhxwrAp`, READY,
  target `null`; build duration approximately 15 seconds.
- https://sod1820-1dijhl50d-sod1820-s-projects.vercel.app/world
- https://sod1820-1dijhl50d-sod1820-s-projects.vercel.app/topic/1237
- Actual-build browser acceptance passed first locally, then on this exact
  hosted deployment, against live anonymous public data at 390 and 1440.
  The explicit graph window returned `ok`, four distinct existing `edge:` refs.
  Topic 1118 → exact World finding → Back and public Zvi source entry passed.
  Zero page errors, model requests or escaped product writes were observed.
- Local evidence: `/tmp/one-tree-regression-local-live-20261030`; hosted evidence:
  `/tmp/one-tree-regression-hosted-live-20261030`. Protected access uses a
  temporary link in memory and the existing static identity bootstrap; no token
  or browser authentication state is stored or committed. SSO stays enabled.
- Protected identity/worker checks confirm exact SHA, mock-only transport and
  `unifiedReadOnly=true`; no-store/noindex remain. Broad sweep: 532 passed,
  one unchanged Frame-title assertion failed, zero skipped. Focused 49 and three
  registered browser regressions passed; World surface now passes in full.
- Later receipt-only commits do not change the tested runtime source. General
  continuation `ae17201f` remains; this bounded fix scope is released in AFTER.

No product DB/RLS/schema/migration, publication, Edge, main or Production change.
The excluded `b30d0a4d` envelope files/tests/docs remain unchanged. The known `/`
Preview root bootstrap issue and stale shared Frame test remain separate; no
shell redesign or owner takeover is included. Worktrees and the untracked
`node_modules` tooling link are preserved.

## Parallel user screenshot review: Gematria gate is only partly integrated

The user supplied the 1237 method-card screenshot during this sweep and asked
whether it matches the contract. Read-only review confirmed a remaining gap in
`Revelation1237Gate2029`'s local `MethodCard`: raw mathematical-family keys and
`fn_method_profile` appear in the main view; a permanent verified badge is based
on profile value matching, not a fetched/validated step trace; and these two hero
method expressions have no existing Number-sheet/local-depth activation. The
authored equations farther down the Topic do have that activation, so their
completed integration must not be generalized to the hero method cards.

The live canonical `reality_graph_law` / `project_codex.id=18` addendum §ה was
read again and its md5 remained `854e53071f433c344349d841d10c0c44`: one existing
Inspector, exact spelling/method/version/value/checked trace and exact return.
Design V2's Number method-learning section also requires the same Number-page/
drawer trace adapter, engine-supplied steps and honest unavailable fallback.
The older branch-only G3 presentation document is supporting lineage, not a
claim of an additional active law: S1 summary is legitimate; S2/S3 depth is
progressive/on demand, not mandatory eager loading of all letter calculations.

The recommended next integration reuses that existing Number/Method explanation
path for the hero expressions, keeps technical metadata under deeper details,
and distinguishes a returned result from checked trace parity. No new engine,
presentation owner or parallel Gematria component is justified. This screenshot
question did not trigger a new visual redesign, source edit or claim that this
remaining gap has been fixed in the regression batch above.

## 31 October — current One Tree coverage audit, not a runtime change

Task `WORLD_ONE_TREE_COVERAGE_AUDIT_20261031`, passive BEFORE
`b2ef7395-7823-46a1-9371-fe0d37035046`. User approved the next coverage audit,
not changes to publication, associations, privacy or the gallery design assigned
to Claude. Local base `41cde2e8ee32004b33304c5d460360b8db743ca9` and remote
`71e9cb9061870f5e8124b25eb33fd08a8a2ba5e4` have identical tree
`42f8bb04d7f5ede95620fc6ec9e03fed8b9b62e8`. Main was independently checked as
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

This extends this existing coverage receipt, not a new contract, master map,
provider, reader or runtime corpus. Plan37 remains planning; canonical18 is not
edited. Previously excluded b30 envelope files remain untouched; absence of an
old record from work_log_current is not interpreted as a release.

### Evidence levels and inventory snapshot

Final anonymous audit started `2026-10-31T04:43:53.274Z`; metadata SQL was read
through the dedicated read-only connector in the same task. Counts are a dated
snapshot, not permanent acceptance criteria.

| Scope | Snapshot | Meaning / limitation |
| --- | ---: | --- |
| Contributor research view, public + approved/canonical, read-only SQL inventory | 5,659 | Not the whole World corpus, not all independently reviewed or renderable findings |
| Same inventory counted through actual anonymous API | 5,566 | Anonymous table/view visibility; additional presentation/source-review gates still apply |
| Public-approved rows whose exact channel source is off | 93 | Accounts for the inventory/anonymous difference; not lost material or a reason to bypass RLS |
| Source-attributed Zvi rows in metadata inventory | 5,647 | Includes more than the earlier967 canonical attachment cohort; source attribution is not necessarily authorship |
| Other/unassigned-source rows | 12 | Ten wa_bot_log/deep-queue references and two gallery references; not covered by the Zvi-only number consumer |
| Governed attachments to active number nodes | 969 | 967 Zvi +2 other;265 distinct number nodes. An attachment is not a new direct finding→Topic edge |
| Rows without promoted_node_id | 4,690 | Unattached inventory; not automatically wrong or candidates approved for promotion |
| Rows sharing structured value with a declared Topic number | 1,973 across113 Topics | Numeric discovery only, never direct Topic attachment |
| Raw tree_matches metadata | 4,622 rows | Search hints/candidates, not4,622 confirmed edges |
| Approved Topics | 204 | All have stored numbers/node IDs;202 linked nodes active, two inactive |
| Topics with image_ids | 15 | Explicit stored media associations, not all gallery content and not all sources for a Topic |
| Anonymous eligible gallery catalog | 87 galleries /2,191 image rows | Strict existing public metadata/catalog filters; partial=false for the bounded overview, not image-by-image pixel/engine verification |

All969 promoted targets exist and are active, and all are number nodes. SQL
also finds118 number↔Topic edges across94 approved Topics, reachable from the
number targets of495 finding rows. These are **indirect paths through a number**,
not495 newly established direct finding-to-Topic relations. Node reuse and
multiple statements from one source must not inflate source independence.

### Actual anonymous existing-reader paths

Run the diagnostic, which permits GET/HEAD/OPTIONS to the canonical backend only:

```sh
node --use-env-proxy scripts/audit-world-one-tree-coverage-20261031.mjs
```

It contains diagnostic case vectors only, not a production routing list. It
calls existing public readers and never prints statements, names, contact
details or credentials. Final run:101 GET/HEAD requests, zero writes/RPC/model
invocations. Full log `/tmp/world-one-tree-coverage-final-20261031.log`.

- Classified Zvi reader: six bounded pages,300 distinct returned rows, hasMore
  true. No withheld flags in this sample. This is **not** a full classified
  corpus scan or proof that only300 exist.
- Exact reviewed reader:13 pages,248 returned entries, exhausted the current
  manifest with no review/source omissions. These are display-reviewed source
  statements, not248 calculations newly verified by this audit. The two checked
  windows union to548 distinct finding identities, not548 independent sources.
- One exact source occurrence returned14 findings and omittedForReview=true.
  Its page being exhausted does not make the source completely reviewed.
- Four sampled exact World finding entries were available, including two
  wa_bot_log-referenced public findings outside the source-attributed Zvi
  group. Opening such a finding is not proof that the underlying bot-log source
  has an equivalent public source-opening/number consumer.

| Structured number | Returned by the existing Zvi number reader | Coverage meaning |
| --- | ---: | --- |
| 14 | 1 | Exact structured-value path, not all textual/gallery references to14 |
| 45 | 0 | Empty in this reader, not absence from the World or galleries |
| 456 | 0 | Same boundary; no automatic1456 derivation or text/OCR fallback |
| 1118 | 10 | Existing through-number route works without per-Topic finding lists |
| 1237 | 0 | Zvi number path empty; the1237 Topic/media/graph paths below still work |
| 1820 | 13 | Existing structured-value route works; not a direct Topic relation |

Topic source-context reads re-admitted six source objects for1237 and three for
2701-bereshit. Both Topics are approved while their stored graph anchors remain
inactive. The explicit graph reader returned respectively four and three exact
edge refs: an inactive requested anchor is intentionally retained by that reader,
so successful graph opening is **not** evidence of an active node. No node was
activated. Topic gapfill-1118 has an active anchor, no declared gallery images
and one returned graph edge; the independent numeric findings path is populated.

Flight root `78fe15e1-6fc5-4641-b1cd-831a75c5bab7` returned ready with source
`posts:5112`, one examined story and no current-window omission. The existing
carousel is connected; it does not manufacture additional stories merely to
make a carousel longer. This audit is reader-level, not a new browser acceptance.

### Reproduced cross-surface field-loss defect — not fixed here

`fetchWorldAllResearchProjection()` selects research objects without
`promoted_node_id`, although its own `documentedTreeAttachment()` requires that
field to corroborate the stored governance target. The exact World finding
reader selects it correctly. Current consumer tracing found the former in
`BeitMidrash2029Page`, **not** the default current World source list.

The anonymous audit replays an actual public canonical record
`0084ddda-7a5e-467e-9422-2f31378ec3a4` through the unchanged pure projection:
complete fields yield documentedTreeConnected=true; omitting the field yields
false. No metadata, source or relationship was edited. This is a real
cross-surface consistency defect, but not a claim that all World links fail.
The runtime/consumer owner check and bounded regression fix are a separate slice.

### Prioritized continuation — extend existing owners only

1. **Shared discovery coverage:** design the next bounded extension of the
   existing consumer/readers to cover eligible non-Zvi research and already
   public media sources, while keeping findings, tagged source images, exact
   source occurrences and direct/via-number relations distinct. Do not simply
   remove the Zvi filter, admit every approved row or turn OCR/tag matches into
   findings/edges. Preserve manifests and fail-closed live-source checks.
2. **Cross-surface consistency:** fix the reproduced missing-field seam under
   its owner with exact-source/identity/negative regressions, without changing
   DB or granting a direct Topic attachment.
3. **Inactive-anchor review:** keep1237/2701 source/media access separate from
   graph activation. Review intended lifecycle with Human Gate; no automatic
   activation from approved Topic status or successful edge reads.
4. **Novelty, viewed/resume and explained research measures:** still follow-up
   under the existing contracts, not completed by this inventory, an engine
   flag, a count of mentions or the gallery's transient scroll progress.
5. **Intake/destination:** existing source arrival is not automatic eligibility,
   source→finding extraction or candidate promotion. Preserve review queues and
   private material. No product data or publication change is authorized here.

### Verification and handoff boundary

43 existing public-finding/Zvi/number/content/story tests passed without skips;
diagnostic syntax check, live anonymous run, Legacy Production lock and diff
check passed. The initial non-Zvi sample predicate was corrected to include
NULL contributor IDs; final four-entry result above includes those rows.
No runtime/UI/CSS changed, no Preview rebuilt/deployed, no Post/Claude gallery/
Frame/provider/engine or b30 scope acquired. Source data, graph, publication,
RLS, canonical contract, main and Production are unchanged. Final branch/HEAD
and scoped release belong to the passive task AFTER.

## 31 October — all-source finding discovery, bounded runtime implementation

Task `ONE_TREE_ALL_SOURCE_FINDING_DISCOVERY_20261031`; passive BEFORE
`6dc7b172-6a43-479d-8bb0-0840ee5a5698`. Local base
`c9ae8892927362807b78b48f4898310858fe7de2`; remote base
`cd8c1555ed62057cf7c8dddd6fb6ea17d5f48548`, identical tree
`2199ed09114447f2ef7e86a2c21862ade6da2fa3`. Main independently verified as
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. No other branch was imported.

### What is implemented, without a new research corpus or visual redesign

- Extended existing `worldPublicFindingReader.js` with
  `fetchWorldPublicFindingsPage`: anonymous, public approved/canonical finding
  discovery by structured number, literal statement text, exact source and
  optional explicitly selected source-contributor ID. No implicit Zvi filter.
- Reused existing presentation/review guards from the historical Zvi reader.
  A classified research role or exact reviewed fingerprint is still required;
  `approved` alone does not admit arbitrary material. The historical 248-entry
  review manifest remains limited to its exact identities, not universal review.
- Re-admit channel sources through their live anonymous owner; gallery sources
  through `fetchGallerySourceContext`; Post sources through
  `fetchPublicWorldPostSource(includeContent:false)`. Gallery reads batch at12;
  Post concurrency is at most4. Unknown source families and bot-log sources are
  withheld, not made public by the finding status. Gallery/Post exact-finding
  opening now repeats source admission, rather than trusting an earlier list.
- Same universal finding ID, full stored source occurrence ref and honest route
  precision survive projection. Post routes are Post-level, not an unverified
  paragraph anchor. Non-Zvi channel sources without a supported source-home
  locator do not receive a fabricated Zvi link; their finding details remain
  available. Nothing creates or promotes a graph relation.
- The existing Number public-findings component and Topic number lens now use
  this shared discovery reader. Historical component/module filenames remain
  compatibility names; there is no second generic visual component or Provider.
- The existing World sources view has an all-source findings entry using the
  same card component. Its existing search input filters finding text, or the
  structured value for a plain nonnegative integer. Query `q` is preserved in
  the URL and exact finding return. Typing itself triggers no finding read.
  The existing contributor-specific Zvi entry is preserved.
- Pages examine at most25 rows by default (maximum50), with stable keyset
  cursors bound to the filter. An empty withheld page can still have a next
  page; it is not displayed as an empty corpus. No scan-all on page open,
  new cache/store/registry, model call or product write was added.

### Current counts and real public checks

A fresh complete scan of the pre-existing Zvi display readers on31 October
returned5,081 classified findings and248 exact-reviewed findings, disjoint,
for5,329 distinct loadable identities. The earlier967 count is an attachment
cohort, not the display ceiling. SQL inventory remains5,647 public approved/
canonical Zvi-source-attributed rows; actual anonymous inventory5,554. These
are different denominators, not independent-evidence counts or engine results.

Bounded live check of the new reader at `2026-10-31T05:14:47.480Z` made17
GET/HEAD requests, zero writes/RPC/model calls. Existing number paths returned
14→1,1118→10,1820→13; text `התגלות`→10. The latter two reported material
omitted for review. One exact source returned9; a general first page returned
24 with a next page and a review omission. These are query windows, not totals.

Two existing canonical gallery findings are public at the finding layer, but
their source images have `published=NULL,min_tier=5`. Both were withheld by
actual anonymous source admission. Seven other-source bot-log extractions lack
a supported public source adapter; three bot-log cleanup outputs additionally
lack a research display role. No source/privacy/publication was changed to
force these rows into the result set. Positive non-Zvi/channel/gallery/Post
admission and later intake were verified with synthetic public-source fixtures,
not by inserting production records.

### Verification and remaining boundaries

- Focused public/number/Topic/World suites:56/56, no skips. Browser tests use
  the actual Topic number lens and World sources component at320 and1440:
  non-Zvi result, explicit-only read, text filter, query return, source return,
  pagination, stale response rejection and newly available material.
- Existing Number browser:320/390/1440 × three themes; no errors, writes,
  model calls or unexpected reads. This is functional, not final visual adoption.
- Both builds, World surface, Topic surface, built graph/lazy, isolation,
  cheap hardening, Legacy Production lock and `git diff --check` passed.
- Neighbor suite:32/33. Existing gallery static test forbids any `.delete(`,
  including unchanged URLSearchParams/Set deletes. Public-language suite2/3:
  unchanged Frame no longer contains its expected exact conditional literal.
  Both stale assertions were traced to unchanged base files, not weakened.
- Canonical18 already requires contributor-independent One Tree projection;
  it was not rewritten. Plan37 remains planning, not implementation evidence.
- **Not complete:** the owned shared Frame command still routes into Number,
  not full statement search. No Frame/Provider/Posts/River/ELS/Books edits,
  graph-edge inference, OCR/text-to-number derivation or semantic/fuzzy search.
  Existing gallery/OCR/Post/source-work searches remain their own source-owner
  capabilities; this change searches admitted findings, not every raw source.
  Full source-family coverage, source navigation for other contributors, direct
  Topic/Post relations and the previously identified general-list field-loss
  defect remain separate work. New findings appear on the next eligible read,
  not via a new push/novelty service. No claim of every search wired everywhere.
- Branch-only; no new Preview or hosted UI acceptance, merge, main push,
  Production, DB/RLS/migration, live publication or source reassignment.
  Claude's active River design, Posts and shared Frame scopes remain untouched.
  Exact final local/remote commits and limited release are recorded in AFTER.

## 31 October — approved exact Claude river snapshot integration

ZURIEL explicitly approved combining Claude snapshot
`45e0ad16d56ff31d3ca5e07bcdebf38f36f73f46` with our latest findings work
and deploying a protected Preview, with visual ownership retained by Claude.
Passive BEFORE `19e4f741-5e01-421b-94cf-59047c5d2038`, task
`CLAUDE_RIVER_EXACT_INTEGRATION_PREVIEW_20261031`. This is a bounded Human Gate
integration permission, not a fabricated release of Claude's `Not released`
source branch/visual scope.

Local base `57103909ed9925645c26cea6a86ab87897a583ca`, remote base
`c7686ee90cbf7c883138c7dedb303b97fb42be4f`, identical tree
`3c711f200f9e062d0aa7189acc189252296cc9a0`. The exact five-file delta from
Claude against shared base `cd8c1555ed62057cf7c8dddd6fb6ea17d5f48548`
does not intersect our all-source findings delta. Imported all five files;
hashes match Claude exactly, including JSX/CSS, frame browser test, real-data
harness and Claude's gallery receipt. No visual edits, reader replacement,
privacy change or unrelated branch import.

Only our existing integrated browser check was adapted to read the date kind
from the compact pill's accessible label. It additionally waits for actual
photo loading and asserts End=max scroll and the last selected item, rather
than accepting any positive scroll. No check was weakened. Claude's raw
real-data harness is retained byte-for-byte, but not run against live services:
its separate touch context lacks the independent network guard. Verification
uses the actual full static app + existing read-only/mock-only worker and an
additional browser network guard for every context.

Initial local verification:15/15 river/all-source tests; seven auth-guard
tests; normal integrated build; Legacy lock/isolation/built graph. Full app
on real anonymous data at390/1440 returned seven photos, typed dates and
historical gallery names, correct End position, stable selection geometry,
exact gallery occurrence opening and Back. Real local fonts are used. The
local dirty-build identity is not presented as a hosted commit acceptance;
the hosted final SHA must be checked separately after commit and deployment.

The existing actual integration branch is already in the builder's closed
read-only and mock-only allowlists. No builder/test guard edit or ELS ownership
transfer is needed. No source branch identity is spoofed. Target remains the
existing project's Preview, with SSO preserved and only temporary scoped access;
no Production, aliases, main, DB/RLS, live publication or other owner changes.
Final deployment ID/SHA, hosted browser result and scoped release belong in AFTER.

## 31 October — World story, Gallery stream and canonical Follow entry chain

ZURIEL approved the three entry-composition corrections in one chain. Passive
BEFORE `c24e1ce7-535a-4dac-9d35-c3ecb0c81ff0`, mobile visibility addendum
`b372c8ce-b753-400b-8cfb-0f28986692a3`, task
`WORLD_GALLERY_STORY_ENTRY_FOLLOW_CHAIN_20261031`. Local base
`a10bd229f06e06733fa03f21464818f4acccee79`, remote base
`fba5cf573d69acd57e0f01845b7b4141a4a2835d`, same tree
`12fbeb00deac663a5816ae6b869393a55295b47f`.

- Gallery catalog starts with the existing admitted Reality Stream, before the
  historical collections. The named, unchanged Claude river view uses the same
  canonical selector/admission and exact source routes. Its Follow is attributed
  to `gallery_catalog_2029`, not the Home wrapper's source. Only one stream Follow
  is rendered. Content filters hide the unrelated stream; sorting alone does not.
  Gallery names, memberships, historical order and authored dates are unchanged.
- World START opens with the existing real public flight story before navigation.
  Connections keeps its existing story. No generic decorative Hero was added.
  A real mobile screenshot exposed an old shared rule hiding the flight image.
  A START-wrapper-only override in World composition restores the image; the
  shared story stylesheet and other surfaces are untouched. The browser test now
  requires visible, decoded media with actual dimensions, not DOM presence alone.
- The World linked-topic Follow callsite now selects the same canonical 2029
  WatchButton variant as the river/contributor controls. Existing target, noPush,
  consent and controller remain unchanged. This is not a global controls redesign.
  Search wording describes the actual Number/expression command capability.

Verification:27/27 focused tests,56/56 findings/source regressions,7/7 Preview
auth guards; Follow, World, Topic, graph/lazy, isolation, hardening, normal builds,
integrated build and Legacy lock pass. The share test fixture now supplies its
existing public Post source for current source re-admission; no gate was weakened.
Full static application on live anonymous data passes at320/390/1440:seven stream
images,87 galleries in this snapshot, real flight image first, same first stream
source as Home, one Follow, exact source open/Back and filter exclusion. No browser
errors or model calls; attempted telemetry/Follow reads remain blocked by Preview.
Local dirty-build identity is not hosted SHA acceptance. Final deployment identity,
hosted verification and scoped release are recorded in AFTER after deployment.

Claude River JSX/CSS and canonical Follow controller/styles remain byte-identical.
No Posts, Frame/Provider, builder/ELS, b30 projection, DB/RLS, privacy, source
reassignment, publication, main or Production changes. Existing visual ownership
and broad continuation are not released. Final visual adoption remains ZURIEL's.

## 31 October — Gallery recent-activity default, distinct from source chronology

ZURIEL approved a recent-activity default so a collection containing a newly added
stream photo also rises in the catalog, without moving that photo to another
collection. BEFORE `16f6750d-0582-46a1-9c65-ff06cf8c51e5`, task
`GALLERY_RECENT_ACTIVITY_DEFAULT_20261031`. Local base
`f42241be61776c2fab99b08c5c96cf44a027a7ce`, remote base
`c3d772cce8a173257425b924c7353d4e9c7f6cf3`, identical tree
`72bea7e59d5618a7deafc517ee539787befa8a50`.

This consumes active `reality_stream_law` stream_at semantics and canonical18's
existing distinction between source updates, arrivals and events. No separate
contract, store, reader or graph identity is introduced; canonical18 is unchanged.
The approved default is a presentation choice alongside the preserved authored
and historical lenses, not a rewrite of historical ordering or dates.

- Existing public-only overview additionally selects `source,stream_at`, with
  its publication/tier/hidden/membership gates, pagination and partial coverage
  unchanged. Legacy overview branch and session cache are unchanged.
- Default `sort=activity` ranks each gallery by its latest qualifying authored
  update or explicit source=update arrival. It inspects all admitted catalog
  entries, not only the bounded12-item stream window. Invalid/missing arrival,
  archive creation and event dates cannot fabricate activity. Stable ties and
  unknown-last behavior are explicit. Active filters restrict eligible rows.
- Authored-date sorts and original/name sorts remain available, including old
  saved URLs. Image ordering, gallery membership, historical names, source
  locators and original photo-date badges are preserved. Existing source open,
  Back and reading-next navigation consume the same selected ordering.
- Catalog copy labels arrivals as `נוסף לזרם` separately from `עדכון המקור האחרון`.
  Date range/year filters still mean authored source updates, explained in UI.

Verification:41/41 focused tests and7/7 Preview auth guards; both normal builds,
integrated build, World/Topic, built graph/lazy, cheap hardening, isolation and
Legacy lock pass. Full local static-app checks on public live data at320/390/1440
show David24 (technical gallery105) first by activity; the actual source timestamp
is2026-10-04T14:41:48.678998+00:00. Date/original selection, source open/Back and
filtering pass with87 galleries/seven stream photos in this snapshot; zero page
errors/model requests. A local test initially lacked the explicit mock-only build
variant; rebuilding with the actual allowlisted branch fixed its missing identity
file without editing the builder. Browser checks wait for controlled-select
rendering and scope arrival assertions to card copy, not authored cover badges.
Final hosted checks additionally assert no overflow, preserved sort on Back and
capture the first gallery card, against the exact final remote SHA.

No Claude River visual/controller edits, Posts, Frame, Providers, builder/ELS,
b30, DB/RLS, product writes, privacy, publication, main or Production changes.
Protected Preview identity/results and limited AFTER release are recorded after
deployment; local dirty-build identity is not presented as hosted acceptance.

## 31 October — Activity cover and exact latest-photo entry

Human Gate:ZURIEL approved the latest-stream cover/exact-photo entry while keeping
historical gallery ordering. BEFORE `bf831c34-8958-44f0-81fe-36ff1a96314e`, task
`GALLERY_ACTIVITY_COVER_EXACT_ENTRY_20261031`. Local base04b4582862666e1e395b1f8311e08b88bb65d4ea,
remote basec0a103be2090f65464b488a9fe6446e35015bb51.

The same public catalog builds a sanitized source-envelope cover only for eligible
source=update rows with a valid arrival. The latest matching stream occurrence is
selected independently of the gallery's authored-date activity winner. Activity
view uses that photo as cover and its exact occurrence URL as the whole-card
link, labelled `פתיחת התמונה האחרונה`. A separate sibling link opens the whole
gallery; anchors are not nested. Other sort modes retain the historical cover
and gallery entry. All source/date roles, stored order, filters, source re-admission
and exact reading locators remain unchanged. New/withdrawn rows are re-projected
on the existing refresh; no pinned list, new store, reader, provider or graph.

Focused tests cover latest vs historical, filtering, withdrawn/private rows,
signed URLs and same-gallery occurrence identity. The actual-app browser checks
add latest-photo cover/link identity, exact opening and Back with activity sort.
Tests/builds and final protected hosted SHA acceptance are recorded in AFTER.
No River/CSS redesign, Posts, Frame, engines, DB/RLS/product writes, publication,
main or Production changes. Existing tree/time contracts are consumed unchanged.

## 31 October — exact Claude shared-treatment color snapshot

ZURIEL identified that Preview still used Claude45e0ad1 rather than his later
color-role work. Fresh remote inspection confirmed510bd8b20f5918432b3ce0e83e9432e35c1510b4.
BEFORE27f0906d-9024-48a6-b92e-a5817f91281b, task
CLAUDE_RIVER_COLOR_EXACT_INTEGRATION_20261031. User-authorized exact integration
does not release Claude's visual ownership or import his whole branch.

Imported exact River JSX/CSS and associated fixture/real-data tests from510bd8b20.
Number tags use shared identity treatment, actions/selection action treatment,
share discovery treatment. Gold remains decorative on frames/handle/rail. Phone
wrapping/tray/date fixes included in that exact snapshot. No local color redesign
or shared palette/controller changes. The existing parity check now pins510bd8b20;
canonical Follow remains byte-identical to its prior accepted base. Existing
activity sorting, latest-photo cover/exact link and source re-admission retained.

Claude's synthetic fixture tests all3presets/widths and checks exact resolver
outputs. The actual-app integration additionally compares resolved role variables
in Home and Gallery; identity/action may share foreground while backgrounds differ.
Raw real-data harness retained for provenance, not run against live services due
to its broader independent request guard. No unrelated Showcase/calculator work
imported. Final tests/protected hosted SHA and scoped release belong in AFTER.
