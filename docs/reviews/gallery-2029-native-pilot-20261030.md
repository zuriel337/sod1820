# Native gallery pilot — the existing One Tree, galleries 29 / 81

Branch: `gpt/elections-world-seed-integration-20261030`.
Base: `4037f174f1ebac4deaf4c9353f4d1f69a0ccf292`.
Task: `GALLERY_2029_NATIVE_PILOT_20261030`.
BEFORE: `bca60331-6c50-4024-85d8-a60985e2706a`.
Dependency addendum: `3a901dbd-2a20-452b-9816-a245aa65f424`.
Existing-document adjustment: `e153dda1-55d1-4953-a7be-fea13b5ad75e`.

## Ownership and document boundary

ZURIEL explicitly approved the bounded gallery seam in App2029. This is not an
AFTER or wholesale takeover of `WRITER_PERSONAL_CHAIN_20261023` / `711f7dc9`:
all Personal Area routes/imports, configuration and remaining scope are preserved.

The first proposed `/2029/gallery/:galleryId` route correctly failed the existing
route/document parity test: it had no corresponding document rewrite. Rather than
weaken that test or edit overlapping `vercel.json`, the implementation uses the
existing World document and `lock_world` boundary:

`/world?view=gallery&gallery=81&image=<public-row-uuid>#gallery-source-<uuid>`.

An App2029 lazy selector chooses this gallery mode only for `view=gallery`.
Ordinary World modes and every other route are unchanged. There is no new
document route, rewrite, menu, Frame, Provider, research store or graph.

## Implemented behavior

- Native 2029 full-image exhibition and source placard, stored-order thumbnails
  and explicit six-position windows. The whole image is preserved on mobile
  and desktop. This is a museum-inspired native pilot, not a claim of a new
  Claude-reviewed/pixel-identical final design. No Legacy gallery/admin UI import.
- Existing `getImagesByGallery` supplies candidate positions only; none of its
  raw captions/URLs is rendered. Existing `fetchGallerySourceContext` freshly
  admits each source through publication, tier and curator visibility checks.
- `topicSourceContext` remains the shared window/selection owner, reused by 1237
  and the gallery page. A deep image loads its one stored-order window, not a
  traversal of preceding images. Counts describe listed positions, not findings
  or the whole corpus. A newly listed public row is visible on reread without
  adding it to a per-page inventory.
- One exact public storage object retains its identity and all public
  occurrences. The selected occurrence supplies its own OCR, caption, tags,
  credit and position. Grouped sibling occurrences are not counted as withheld
  or as independent evidence. Conflicting, wrong-gallery and unavailable
  locators do not silently select another image.
- Stored numeric tags open the existing generic 2029 Number route. They do not
  assert an expression/method association or a graph edge.
- The same `SourceMethodResearch` control as the 1237 gate opens an explicitly
  selected span of stored OCR, then existing public canonical method profiles.
  Source snapshot, exact range, image, value, public method and known definition
  version are freshly checked before opening the existing Number page. No local
  calculation, OCR parser, alternate method Inspector or automatic promotion.
- Existing Research Context carries source/range/method/version and exact
  return. Browser Back and explicit Number return reopen the same occurrence.
  A source withdrawn during a calculation attempt is removed from the exhibit
  and thumbnails; stale calculation choices are cleared.
- Original metadata dates remain inside provenance/history details, not event
  dates. Month-only folder provenance is not expanded to a fabricated day.
- 1237 gate cards, existing generic Topic source history and World story source
  history use the native exact locator for these two galleries only. Other
  galleries retain their existing archive destinations and stated precision.

## Verification and limits

- Shared model/gate/source-links: 43 passed, no failed/skipped.
- Actual Gallery/Topic/Number components with fixture backend: 2 registered
  browser tests passed at 320 and 1440, no skips. Covers bounded deep selection,
  generic tag versus exact expression, original occurrence, exact return,
  private/changed method, changed/withdrawn source, wrong gallery and pagination.
- The selector initially accepted only 1237 `rv-source` anchors. Its same public
  snapshot validator now also accepts the actual `gallery-source` anchor;
  unrelated locators remain rejected. Test harness selection events and boolean
  details attributes were corrected, not product assertions weakened.
- Route/document parity, World/Topic surfaces, hard isolation and Legacy lock
  pass. The public-language suite has an inherited Frame source-string failure
  (2 passed / 1 failed); the failing assertion is reproduced on base4037 and
  `SystemFrame2029.jsx` is byte-identical. No shared Frame fix is claimed here.
- Both builds and final live-public/hosted acceptance are recorded below once
  complete. Existing chunk warnings are not suppressed.

This is not migration of all galleries, approval of OCR, automatic Topic/edge
creation, completion of all World source routes or publication of new material.
The existing raw candidate-list reader does not expose query errors separately
from an empty list; the UI therefore makes no authoritative empty-corpus claim.
No canonical-law rewrite was needed: this implements the existing active
source/expression/method navigation addendum to `reality_graph_law` v8.

No product DB/RLS/privacy/flags/schema/migration, publication, Edge, shared
Frame/Number/engine, blocked b30d0a4d files, main, Production or domains changed.
Broad continuation `ae17201f` and all other owners remain unaffected.

## Completed local acceptance

- Both Legacy and 2029 builds passed; existing chunk warnings remain.
- Built graph/lazy boundary passed: 146 reachable / 16 eager manifest records,
  eager JS gzip 411,476 bytes. Isolation, Topic, World, cheap hardening,
  Legacy lock and diff check passed; Preview auth/write guard 7/7 passed.
- Final World-query route browser fixture suite: 2/2 passed, no skips,
  widths320/1440. Shared source/model regressions: 43/43, no skips.
- Actual static unified build against live anonymous public data passed at
  390/1440: 1237 → exact gallery81 occurrence → canonical התגלות/קדמי/3137
  Number → explicit exact-image return, and gallery29 initial window. Whole
  images loaded; gallery did not overflow. Existing 1237 shared depth, four
  documented graph edges, Topic1118 → World finding → Back and Zvi entry passed.
  Zero page errors, model requests or blocked/escaped product writes.
- Evidence: `/tmp/gallery-2029-world-route-local-live`. Mobile and desktop
  screenshots visually inspected. Partial migration and design limits above
  remain; no claim that every gallery or source surface has been migrated.

## Protected Preview accepted

- Runtime SHA: `8a136fb188664a98dac71ed4ccc37c18d366d54b`.
- Deployment: `dpl_7EaEDdkBKWPP623VvruCPrbJ4bB3`, READY, target `null`;
  build about 15 seconds. Existing project/team and enabled SSO were verified;
  no protection setting or Production alias changed.
- https://sod1820-gd0jd0830-sod1820-s-projects.vercel.app/world?view=gallery&gallery=81
- https://sod1820-gd0jd0830-sod1820-s-projects.vercel.app/world?view=gallery&gallery=29
- Actual hosted browser acceptance passed at390/1440, including both galleries,
  exact source→התגלות/קדמי/3137 Number→exact-image return, generic source tags,
  1237 method visualization and existing World/Zvi/Topic1118 regressions. Four
  existing graph edges remained documented. Zero page errors, model requests or
  blocked/escaped product writes. Hosted screenshot was visually inspected.
- Hosted identity matched runtime SHA and branch exactly, mock-only transport,
  `product_writes=false`, `edge_deploy=false`. Worker `unifiedReadOnly=true`,
  no-store and noindex verified independently. Access link stayed in memory and
  stdin, never printed, committed or saved as browser authentication state.
- Evidence: `/tmp/gallery-2029-native-hosted-live`;
  identity/headers: `/tmp/gallery-2029-hosted-identity.log` (no credentials).
- Receipt-only follow-up changes this document, not the tested/deployed runtime.

Status: IMPLEMENTED / TESTED / PROTECTED_PREVIEW_VERIFIED.
Not merged, not Production-live; not a full gallery migration.

## Public flowing-gallery design revision — ZURIEL request

Task `GALLERY_2029_PUBLIC_FLOW_DESIGN_20261030`;
BEFORE `9c7e2c87-b9a4-4895-b675-507cda20c598`;
base `346457309366deeceb2051ee74d85cea858ac907`, same isolated branch.

The user rejected the selected-image-only research-tool presentation and asked
GPT to attempt the public design before involving Claude. No specialist was
activated. Legacy gallery code was read as a visual reference only.

- Six complete, uncropped image cards in stored order per existing public window;
  two columns on desktop, one continuous vertical sequence on mobile. No single
  oversized selected hero or thumbnail-only alternative. Pagination is labelled
  as previous/next images, not falsely advertised as appended infinite loading.
- Restrained museum warmth using the existing Design V2 palette/type tokens,
  original images, fine borders and a compact mobile introduction. Day, Parchment
  and Night remain the same theme system. SVG affordances avoid missing arrow
  glyphs in Hebrew fonts. No new asset, template purchase, dependency or font.
- Public first-level copy contains no pilot/window/OCR/raw source identifier.
  Original historical titles/captions are retained; long captions can expand.
  Initial numeric links are saved tags for browsing, not a declared calculation
  or graph edge. The fuller explanation remains under “לגלות עוד”.
- Shared `SourceMethodResearch` has an additive `publicCopy` presentation option;
  existing Topic default copy and ALL calculation/publication/range/version
  checks remain unchanged. Each card invokes the existing controller with its
  own source occurrence, rather than inheriting the first image's provenance.
- Source dates, credits, history and technical reference remain available behind
  explicit disclosure. No source/event/calculation/interpretation distinctions
  were removed merely to simplify the first-level interface.
- Exact gallery locators, method Number navigation and Browser Back are retained.
  A changed image window returns to the gallery opening; an exact source return
  aligns that image instead. Image enlargement opens the existing original
  public image in a new tab, not a second calculator or Legacy Lightbox.

Verification: source/model regressions43/43, enhanced fixture browser2/2 at
320/1440, including non-initial-card source return, privacy and changed methods.
Both builds, graph/lazy, isolation, World/Topic, route hardening, Legacy lock and
Preview auth/write guard7/7 pass; existing chunk warnings remain. The inherited
Frame language assertion remains unchanged and outside this content-only slice.
Live-public screenshots of the public flow were inspected; final protected SHA
and theme/typography acceptance are recorded below after completion.

No App/config/Frame/Provider/reader/model/engine, blocked envelope, DB/RLS/privacy,
publication, main, Edge, Production or domain changes. This changes the pilot's
public presentation, not its evidence or admission rules and not all galleries.

### Design revision verification and hosted boundary

Runtime: `fd3124aa5b7fc70e3dc10d628cc64433f1081985`.
Protected deployment `dpl_B5CidnpiJPUD45buwUnEw3xWeBoQ`, READY, target `null`,
build about19 seconds; existing team/project and enabled SSO checked.

- https://sod1820-2dft9uoho-sod1820-s-projects.vercel.app/world?view=gallery&gallery=29
- https://sod1820-2dft9uoho-sod1820-s-projects.vercel.app/world?view=gallery&gallery=81

Local live-anonymous acceptance passed at390/1440 for both galleries, shared
1237 depth, exact source/method/Number return and all three existing presets.
Measured caption18px, controls16px, supporting kind16px; Number uses the numeric
face while Hebrew retains the UI face. Controls at least44px, one column on
mobile/two on desktop, whole images and zero horizontal overflow. Zero page
errors/model requests or blocked/escaped product writes. Local evidence:
`/tmp/gallery-public-flow-final-local`.

Important: the first full hosted regression passed the390 gallery checks and
three presets, then timed out waiting for Topic1118's “ממצאים דרך המספר” region.
The cause was not established; the public Topic view still returns its approved
row, which does not prove browser availability. Do NOT claim the full hosted
World/Zvi regression passed. App, Topic, readers, Frame and configuration are
byte-unchanged by this design cut. The full test retains its strict assertions.
An explicit `PREVIEW_GALLERY_REVIEW_ONLY=true` acceptance subset was added for
the owned gallery design; its report explicitly excludes Topic1118/Zvi and is
not a substitute for closing that open regression. No product fix was attempted
outside the design scope.

Independent hosted identity verified the exact runtime SHA/branch, mock-only
transport, product_writes=false, edge_deploy=false, unifiedReadOnly worker,
no-store/noindex and retained protection. Identity evidence:
`/tmp/gallery-public-flow-hosted-identity.log`; credentials never printed/saved.
The Preview-only transport notice is not part of this public content design.

Targeted hosted design acceptance PASSED at390/1440 for the exact deployed
runtime: both galleries, original images, exact source→canonical method Number
→exact return, all three presets, measured type/touch targets and zero overflow.
Zero page errors/model calls or blocked/escaped product writes. Screenshots of
the final Night mobile/desktop design were visually inspected. Evidence:
`/tmp/gallery-public-flow-hosted-review`; report explicitly identifies its subset.
The separate Topic1118 full-regression timeout above remains OPEN, not hidden
or reclassified as a passing test. The inherited Frame assertion also remains.

Receipt/test-scope-only follow-up changes no src/runtime/build configuration
relative to the deployed SHA. Status: IMPLEMENTED / GALLERY_TESTED /
PROTECTED_DESIGN_PREVIEW_VERIFIED, NOT FULL_WORLD_REGRESSION_ACCEPTED.
Layout remains ZURIEL's visual review, not aesthetic acceptance or Claude approval.

## Clean captions and editorial museum flow — next approved revision

Task `GALLERY_2029_CLEAN_CAPTION_STORY_FLOW_20261030`;
BEFORE `17abceb0-ef15-40bf-9656-44ff0ff0db64`;
base `2f5f84c62517c064989f35834dafcae172b4fdc8`, same isolated branch.

ZURIEL approved removing visible quote-escape artifacts and historical update
headlines, retaining source history and making the gallery feel closer to the
old museum style without importing Legacy UI or changing the original material.

The existing `presentation/contentTitle.js` owner now exports additive
`publicMediaCaption` and `publicMediaTitle`. Existing title exports/default
behavior remain unchanged. The caption adapter removes one-or-many stored quote
escapes, decodes existing supported entities and converts known formatting tags
to plain text. URL/fraction slashes, numeric brackets, equations, ordinary path
backslashes and line breaks remain; no blanket slash removal or innerHTML.
Hebrew maintenance notices use explicit Unicode-aware boundaries rather than
the old ASCII word-boundary assumptions. None becomes a public image headline.

Gallery main text and reading-context labels use the readable projection. Source
history retains readable historical text PLUS an explicit verbatim disclosure
with the untouched stored name/caption. OCR, exact text ranges, method input,
number tags, source identity, ordering and calculation/visibility gates are not
normalized or rewritten. There is no product DB update or new OCR run.

The six-image sequence now uses full-width editorial rows: a larger image beside
its compact placard on desktop, stacked on mobile. Warm thin borders/shadows
frame only the image; the large outer card cabinet is removed. The introduction
and decorative space are reduced. Existing semantic themes/type, whole-image
policy, public links, source selection and precise Number return remain.

Verification so far: caption and existing title consumers12/12, source/model43/43,
fixture browser2/2 at320/1440 including escaped captions, hidden maintenance
headlines, accessible untouched originals, non-initial-card return and privacy.
Both builds, graph/lazy, World/Topic surfaces, isolation, route hardening,
Legacy lock and Preview guard7/7 pass. The browser measurement now checks display
mode before counting grid columns (a block retains its unused grid declaration);
no product assertion or security gate was relaxed.

Final live-public/hosted design acceptance follows below. This is a bounded
gallery acceptance slice, not closure of the previously documented hosted
Topic1118 timeout or inherited Frame-language assertion. No other owner scope,
App/config/Frame/provider/reader/model/engine/RLS/privacy/migration/publication/
Edge/main/Production/domain change. Legacy helpers remain untouched.

### Clean-caption revision — accepted protected Preview

- Runtime SHA: `f8b611cfb5d49cd418be553266f75e4f64c7cdcd`.
- Deployment: `dpl_G2J8kwRpL4u9RwhLsZnPeWWk3HuP`, READY, target `null`,
  build about12 seconds, existing team/project and enabled SSO verified.
- https://sod1820-8e6xwjysr-sod1820-s-projects.vercel.app/world?view=gallery&gallery=29
- https://sod1820-8e6xwjysr-sod1820-s-projects.vercel.app/world?view=gallery&gallery=81
- Local AND hosted gallery acceptance passed at390/1440, all three presets,
  readable captions, 18px body/16px controls, 44px+ targets, full uncropped images,
  no overflow, exact source→canonical method Number→source return. The actual
  historical row `d9842a5a-5313-4d32-8e58-5f07fa29b887` displays readable
  “וראית את אחרי” without stored backslashes and without the maintenance h3.
- Enhanced fixture browser2/2 at320/1440 additionally checks original stored
  notices/escaped captions remain available behind disclosure. Unit regressions
  55/55 (new caption5 + existing title consumers7 + source/model43), Preview
  guard7/7 and the build/boundary gates above passed. No failures/skips in these
  bounded batches. Existing chunk warnings remain.
- Zero page errors, model requests or blocked/escaped product writes in the
  live gallery acceptance. This explicitly excludes the previously recorded
  Topic1118/Zvi full-regression boundary; it does not close that open issue.
- Identity matched exact SHA/branch, mock-only, product_writes=false and
  edge_deploy=false. Read-only worker, no-store/noindex and protection verified.
  Access link remained in memory/stdin, never in source, logs or auth-state files.
- Evidence: `/tmp/gallery-caption-final-local`, `/tmp/gallery-caption-hosted`,
  `/tmp/gallery-caption-hosted-identity.log`. Mobile and desktop screenshots
  visually inspected. Follow-up receipt commit changes no runtime/build file.

Status: IMPLEMENTED / GALLERY_TESTED / PROTECTED_PREVIEW_VERIFIED.
Not merged or Production-live; visual acceptance still belongs to ZURIEL.

## 2026-10-31 — Historical post/part mapping and quiet contextual share

Task: `GALLERY_HISTORY_MAPPING_QUIET_SHARE_20261031`.
BEFORE: `b9143552-4f6a-4eff-bf31-dd934b4eb3c7`.
Branch: `gpt/elections-world-seed-integration-20261030`.
Base: `1b23e75ffc9542a74254db80b013cc553dc1f6c1`.
This section describes a new BRANCH-ONLY slice; earlier hosted receipts above
do not imply that this newer share UI is deployed.

### Historical source evidence, not another registry

`gallery-historical-post-mapping-20261031.json` is a read-only audit snapshot,
not imported by runtime, not a new gallery/series registry or canonical edge.
It covers all 106 gallery metadata rows and 84 explicit references from 56
eligible post representations to 56 existing galleries. Every referenced ID
resolved. Eligibility mirrors the existing World post/source predicates; the
privileged read-only audit is not proof of every anonymous destination.
Unsupported shortcode/prose references and all image placements were not fully
scanned. The other 50 gallery metadata rows are NOT declared orphaned.

The existing David14/Geula45 series is explicitly witnessed by these stored
post markers (source document TOP to BOTTOM, not a new sort):

| Post | Named parts | Source gallery IDs, top to bottom |
| --- | --- | --- |
| 1076 | 1–10 | 78,77,76,73,70,69,61,59,57,54 |
| 260 | 11–15 | 84,83,82,80,79 |
| 168 | 16–20 | 99,95,91,88,86 |
| 58 | 21–23 | 104,103,102 |
| 37 | 23–24 | 105,104 |

These groups reference 24 distinct original galleries. Part23's two post
occurrences remain intact. Display part5 is source69, part7 is source73; neither
is source5/7. Elections post906 explicitly embeds source69. No old content,
names, IDs, order, publication/privacy, URLs or graph relationships were changed.

### One quiet action, explicit coverage boundary

Existing `ShareActions` gains an opt-in `variant="icon"`: one 16px mark inside
a 44px keyboard/touch target. It reuses the existing native/copy execution and
telemetry. Default callers keep their old channel row and explicit image-file
choice; no implicit download or external sending occurs.

The existing `worldFindingShare.js` projection accepts only an explicitly
public source occurrence with matching row/provenance/placement identity and
an unsigned public storage image. It reuses the existing 29/81 exact gallery
locator or a reader-provided exact Topic source locator. The current origin is
explicit: protected Preview links never pretend to be deployed Production URLs.
No current query, auth token, OCR, caption or private Research Context is copied.

Gallery29/81 cards and the shared `CanonicalMediaFigure2029` consume the same
action. This covers eligible source cards in World/Topic/story contexts through
the existing figure. It does NOT prove every Number/Post/Projector payload has
public admission and an exact reopen target: where either is missing the action
is withheld, not a guessed link or access inferred from an image URL. No routes,
readers, Lightbox, source history, graph, Frame or Providers were changed.

### Verification

- Focused unit/contract regressions: 72/72, no skips; the mapping test also
  checks all24 original parts and preservation of both part23 occurrences.
- New real-UI fixture browser: 1/1 at320/390/1440 and dark/light/parchment;
  exact copy, native cancellation, copy failure/retry, keyboard, 16px icon,
  44px target, visible whole image, no overflow or nested buttons. Shared
  execution is real; platform dialogs/clipboard/telemetry and public thumbnail
  are fixtures. No live backend or external recipient was contacted.
- Existing Gallery/Topic→Number exact-return browser: 2/2, no skips on final
  rerun. An earlier parallel batch timed out at Gallery page.goto; isolated
  Gallery passed and the final two-test file passed without runtime changes.
- Both builds and built-graph/lazy, isolation, World/Topic surfaces, cheap
  hardening, Legacy Production lock and diff checks passed; existing chunk
  warnings remain. No test gate was weakened.
- Final fixture evidence: `/tmp/gallery-quiet-share-kFWs63`, including idle
  share-icon screenshots, visually inspected.
  An initial fixture cross-origin SVG failed ORB; the fixture now uses an
  inline synthetic thumbnail and aborts external network. No application
  image policy was changed to mask that fixture issue.

Status: IMPLEMENTED / BOUNDED_TESTED / NOT_DEPLOYED.
No product DB/RLS/migration/rule changes, source merge/renumbering, main push,
Production deployment or external WhatsApp publication.

## 2026-10-31 — Existing state-map reconciliation and current-entry tests

Task: `WORLD_TOPIC_GALLERY_STATE_MAP_RECONCILIATION_20261031`.
BEFORE: `a85d019e-6925-4c2b-af91-78806ec93293`.
Test dependency addendum: `f06ff5ba-7ad6-4bd1-8ae8-a29c8cb43440`.
Base: `e27447d85579d98d1d08048645a78089cb66fc3d`.

ZURIEL explicitly requested updating the existing status map, not another plan.
The old plan37 ownership was checked through the exact historical task: AFTER
`331c868b-518f-476b-8bc3-df0fdc82d69d` releases BEFORE `6b09f2b1` in full.
Its old BEFORE still appearing in current was not taken as permission or as a
reason to invent a release. Other later bounded plan37 scopes also had releases.
Historic `b30d0a4d` still has no AFTER for its exact task and is not overridden.

The authorized general connector updated **planning only**, `project_codex.id37`,
with expected-body MD5 CAS `34fda94a4542343d4e864646d4e98ee1`:
one current scoped note + §12.10 coverage matrix, evidence and remaining work.
New MD5: `6b16163667a74a88e8d38c5309dc74fe`; saved
`2026-10-31 00:41:20.029298+00`. Independent dedicated-readonly readback proved
the exact note/appendix, the previous full body's original order/hash and DRAFT.
No existing decisions or source evidence were removed; no active owner body or
product row changed. The Gallery NOT_MAPPED snapshot is superseded only by the
29/81 pilot, not an all-gallery rollout or a final route decision.

`SOD1820_MASTER_STATE.md` points to that existing coverage map, identifies the
branch-only evidence and older hosted SHA, and explicitly withholds site/G4/
Production closure. `SOD1820_MASTER_OWNER_INDEX.md` corrects only the verified
Experience v10 and canonical UI v11 pointers. These are not new canonical bodies.

The scoped status tests passed; the broader existing G1 static test exposed three
stale assertions. Its narrow update now resolves the current coordination row,
checks passive v17/no-GPT-ACK safety, replays all three Oct9 immutable artifact
hashes from the exact captured Git commit, retains all historical successor/
approval assertions, and rejects a current Experience pointer older than that
accepted successor. Separate new tests require the actually verified v10/v11
pointers. Historical fixture files, AGENTS.md, CLAUDE.md and Design are untouched.

Verification: current-entry + status tests **20/20**, no skips; historical exact
Git blobs available and verified. Legacy Production lock and diff check pass.
This is a STATIC routing/status acceptance, not a fresh-agent live replay or
proof that a future agent autonomously implements every missing requirement.
No runtime changed, so existing Gallery/source/Number browser acceptance is not
relabelled as a new runtime or deployment acceptance. Story carousel integration,
generic new-finding projection, novelty and final visual acceptance stay open.

Status: PLANNING_ROW_SAVED_READBACK_VERIFIED / POINTERS_RECONCILED /
STATIC_TESTED / BRANCH_ONLY. No source data, publication, graph, RLS, migrations,
main or Production changes. No Preview was deployed or switched in this slice.

## 31.10 follow-up — graph-backed story sequence

Task `STORY_TREE_SEQUENCE_RUNTIME_20261031`; BEFORE
`cc2bc142-5959-4c61-9b58-17b691ab7fda`; Topic race addendum
`a62d31ad-c1ea-43a3-9c28-9982a0f0ef8a`. Branch
`gpt/elections-world-seed-integration-20261030`, base
`509780ef4148fb51603b821a9137aff51e3e11ec`; runtime
`241ae98bbdbaa3c50353dc895d2c3b2232f7d95b`.

The shared StoryTreeSequence2029 consumes the existing pure composition and
canonical graph/public Post readers. Mounted in Anchored World and both Topic
bodies (including1237), with a real Topic context-map target. No shared Frame,
Provider, engine, publication or b30-file changes. Reads on explicit open/refresh
or exact return only: existing relationLimit50 and separate media-window policy,
at most8 exact-source lightweight Posts. SourceRef, nodeRef, exact edgeRef and
original direction survive. Graph existence alone never admits a public Post.
Default id/content reader remains compatible; additive normalized-slug lookup
rejects ambiguous variants, mixed identifiers and unsafe paths.

One story at a time, previous/next and a source Post link. Input order is not
chronology, relevance, independent evidence or a new gallery-part order. Shared
anchor does not create story-to-story relations. Partial/error/unavailable are
distinct. Back/reload re-admit exact source/edge; World restores anchor/source
Context. Refresh clears old content, ignores stale requests and accepts newly
eligible linked sources without a manual list. This is not automatic intake,
promotion, push or a corpus scan. Withdrawn selection is not silently replaced.

Regressions found and fixed: absent Topic node matched an undefined fragment;
late previous-topic calculation could finish after native URL navigation before
passive slug invalidation;1237 alternate body initially lacked the new map target.
Original negative tests retained. The existing request guard now also compares
the captured browser path, without changing calculation semantics or the engine.

Evidence:

- 68 unit/contract/scoped regression checks; focused15 replay after directional
  metadata hardening. Five registered browser checks across new sequence,
  existing Topic/Gallery Number return and quiet sharing passed, no skips.
- New browser covers320/390/1440, no eager reads, exact edge/source, previous/next,
  native/context Back/reload, newly eligible source on refresh, withdrawal,
  failed refresh, changed anchor race, missing node and restored World Context.
  Final synthetic evidence `/tmp/story-tree-browser-8s7ave`: real UI/composition,
  fixture graph/source results, not live content.
- Anonymous real default readers returned posts:5112 at root
  78fe15e1-6fc5-4641-b1cd-831a75c5bab7 via
  edge:20f3b1d0-78d2-474a-b481-85e078bc706f. Initial Node fetch failed without
  honoring the environment proxy; configured proxy enabled the same read. No
  credentials, gates or network policy changed.
- Actual integrated local build390/1440: full1237/29/81/1118/Zvi regression and
  final story replay passed. Final replay waits for the real Post body before
  Back, exact fragment and reload;0 pageerrors/model requests/blocked requests
  or observed product-write escapes. Logs `/tmp/story-tree-live-browser.log`,
  `/tmp/story-tree-final-live-browser.log`; screenshots in
  `/tmp/story-tree-final-live-20261031/`. Not a hosted Preview acceptance.
- Both builds, built graph/lazy, isolation, World/Topic, cheap hardening,
  Legacy lock and diff passed. Existing chunk-size/static-dynamic Shell import
  warnings remain. No gate was weakened.

Existing planning map only: append§12.11, CAS expected
`6b16163667a74a88e8d38c5309dc74fe`, saved
`9c7a7994390f135f6ec0779acd561c5f`. Dedicated readonly verified exact append,
entire preserved prefix hash/order and DRAFT. Canonical18 remains unchanged at
`05b73b416ab47804c9a0c807250b16f7`; no parallel owner or master.

IMPLEMENTED / TESTED / BRANCH ONLY, not hosted/site-final. Old f8b611cf Preview
unchanged; no main/Production/Edge/RLS/migration/product writes. Not every root
necessarily has multiple stories (live1073 has one); windows remain bounded.
Generic finding-to-Topic, novelty/seen, explained meter, intake routing,
all-gallery rollout and final cross-surface design remain open in plan37.

## 31.10 continuation — existing public gallery flow beyond29/81

Task `GALLERY_2029_PUBLIC_EXPANSION_20261031`; BEFORE
`ffe18e2a-6a3e-4ddf-9241-1596cec507e8`. Base
`fef7d4de6d2d2a93c8da1926672076303b6c761c`; runtime
`1ebd49358fe9dbf3c31dafb25530328581920754` on the same continuation branch.
Old apparent source-context ownership has exact AFTER554b90e7; shared Supabase
ownership df6dca6d has exact AFTER9069d0c0 releasing every claimed path. Fresh
bounded overlap check found no foreign writer. b30 scope remains excluded.

Same document, UI, styles, source reader and occurrence model; no catalog/store,
parallel gallery reader, migration, graph edge or automatic source promotion.
The locator accepts any valid positive historical gallery ID, not just29/81.
This is navigational capability, never permission. Exact public source/occurrence
admission remains mandatory. Invalid limit/offset/ID fails before any read.
Existing getImagesByGallery adds opt-in publicSourceOnly/throwOnError options:
2029 opts in; original caller fields, filters, order and error defaults unchanged.
2029 no longer treats a failed listing as a successfully empty gallery. A held
calculation also checks native route identity before continuing to Number.

Stored ordering controls each gallery window; no gallery merge, number rewrite
or date/importance reordering. Existing historical mapping remains evidence, not
a runtime series registry. Part5 is gallery69, part7 gallery73. Live metadata
for the24 historical14/45 parts was checked:102/103/104 returned0 public images
under the explicit source predicate. Nothing was published to fill those gaps.
ShareActions automatically uses the same precise gallery occurrence URL beyond
the pilot where public admission permits; no new share component or context leak.
Existing Post/Archive HTML/links remain untouched (not automatically rewritten).

Verification:

- 72 scoped unit/contract/source/caption/gate/story regressions pass,0 skips;
  new tests cover valid previously-unlisted IDs, exact order/window/membership,
  private/draft/hidden/wrong-gallery denial, pre-read bound validation, empty
  versus failed listing, Legacy defaults and optional strict source-list flags.
- Existing registered gallery and Topic/Number browser tests2/2 pass320/1440.
  Gallery test now includes69/73 exact selection, number tag/return/reload,
  strict reader arguments and failed-list clear/retry. Not a live backend test.
- Actual integrated local build with live anonymous public readers at390/1440:
  galleries69/73/105 exact image at index7 -> original six-image window ->
  real Number page -> Back -> exact image -> reload. All six samples passed,
  plus empty public102 at both widths.0 pageerrors/model/blocked requests and
  no observed product writes. Screenshots `/tmp/gallery-expansion-live-20261031/`;
  report `/tmp/gallery-expansion-live-browser.log`. No all106 browser claim.
- Legacy +2029 builds and built graph/lazy, isolation, World/Topic surface,
  hardening, Legacy Production lock and diff check pass. Eager gzip417396 bytes;
  existing chunk/static-dynamic import warnings remain; no gate weakened.

Plan37 §12.12 is a dated status append, not a new contract: CAS expected
`9c7a7994390f135f6ec0779acd561c5f`, new
`df72132b708c640239555dd4e4025866`; dedicated readonly verifies exact append,
previous full-prefix hash and DRAFT. Canonical18 unchanged at
`05b73b416ab47804c9a0c807250b16f7`. MasterState points here, not a duplicate map.

BRANCH_IMPLEMENTED / TESTED / NOT_DEPLOYED. Old hosted Preview unchanged;
no main/Production/Edge/product DB/RLS/migration/source changes. Still open:
2029 gallery catalog/series navigation based on live source references, broader
gallery/browser coverage, old Post links not yet connected to2029, hosted Preview
acceptance and final visual acceptance. Other One Tree gaps stay open.

## 31.10 follow-up — exact image steps; Posts session explicitly reserved

ZURIEL explicitly reports a concurrent Posts session. This gallery lane MUST NOT
edit Post pages, components, renderers, extraction, publishing or Post data. This
reservation applies even if the other session has not yet registered its task.
BEFORE `4989fd26-0b82-4862-b1be-490cad70d6bb`, task
`GALLERY_EXACT_IMAGE_STEPS_POSTS_BOUNDARY_20261031`; base
`3324cad890e35a6ffd44581153f2e8a68149473f` on the same continuation branch.

Implemented only the independent gallery seam: existing
loadPublicGallerySourceWindow returns previous/next EXACT image locators after
admitting the current selection. Uses its existing stored-order list (no extra
reader or list). Gallery2029Page projects those through existing link styles.
Crossing a six-image window selects and reads the destination window through
the same public occurrence gate. A locator never admits destination content;
withdrawn/ambiguous current source has no image-step projection. No wrapping,
ID arithmetic, importance sorting, new chronology or tree edge is introduced.
The existing multi-image gallery layout and whole-window pager remain intact.

Series integration boundary (not an alternate series contract or parser):

- Existing PostGalleryLinks privately extracts Huge-IT/data-sod associations and
  renders Legacy links. It is read-only evidence here; no export/refactor/copy.
- Cross-gallery series navigation remains pending. Consume source-qualified
  ordered occurrences from the Posts owner when that seam exists, not the audit
  JSON as a runtime inventory. Preserve exact post source identity/slug, original
  wp_id where Huge-IT suffix resolution needs it, marker locator/order and every
  repeated occurrence. Do not infer order from numeric gallery IDs or titles.
- Each gallery destination uses gallerySourceHref2029 and existing public
  re-admission. Gallery links/source associations do not become graph edges.
  Parts5/7 remain69/73; shared104 in different Post contexts must stay distinct.
- Post updates and source withdrawal require fresh eligibility; no stale list
  grants access. No promise that cross-gallery series navigation is live yet.

Verification:34 focused source/gallery/share tests pass, including first/last,
window5->6, conflicting importance order and withdrawn-source denial. Existing
browser acceptance covers69/73 at320/1440, image7->6->5->6->Back->5->reload,
alongside previous exact Number return, source withdrawal and list failure.
Both builds, graph/lazy, isolation, World/Topic, hardening and Legacy lock pass;
no gate weakened. Browser fixtures use the real Gallery component and source
model with backend fixtures: no fresh live-anonymous or hosted image-step
acceptance is claimed. No CSS, Post, Frame/Provider/engine, DB/RLS/migration,
Edge/main/Production or source publication changes. No new hosted Preview.
Evidence `/tmp/gallery-steps-browser.log`. Final SHA/tests in passive AFTER.

## 31.10 hosted Preview — exact continuation SHA

ZURIEL explicitly requested continuing and a link. Task
`ELECTIONS_WORLD_GALLERY_PREVIEW_LINK_20261031`, BEFORE
`38e34bcd-0c80-4bb3-acbc-0a5fcc54433e`. Exact remote/runtime SHA
`1a7a7fe048db11df82f7cb967f662fbe5f14d395`, same continuation branch.
Deployment `dpl_6Ta54KuFe6RogXtqsFk2CdtbdSBJ`, READY, target=null (Preview),
project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, existing team unchanged.

URL: https://sod1820-1bn0qxgtm-sod1820-s-projects.vercel.app/world?view=gallery&gallery=69

SSO retained; authorized temporary share access generated for the user's link.
Share credential/cookies are not stored here or in evidence logs. Same existing
static preview-deploy builder/read-only worker/mock-only Raziel; no backend
deployment, source edit, Post-session change or Production domain action.
Initial API target='preview' was rejected without creating a deployment; current
API docs define omitted target as Preview. Corrected request omitted target and
returned target=null; never requested production/staging/promotion/alias changes.

Hosted acceptance390/1440, actual public anonymous source readers:69/73/105
exact source, original six-image window, Number page/Back/reload;102 empty public
window. Six positive samples passed,0 pageerrors/model/blocked requests or
observed product writes. Separate hosted smoke verifies exact preview-identity
SHA, mock-only/product_writes=false/edge_deploy=false, no-store/noindex headers,
unifiedReadOnly=true worker, gallery69 previous7->6->5 then next6->Back5->reload
across the page boundary at both widths, no overflow/errors/blocked requests.
Fresh auth-guard7/7 and Legacy Production lock pass; exact local integrated build
passes. Logs `/tmp/gallery-hosted-20261031.log`,
`/tmp/one-tree-hosted-smoke-20261031.log`; screenshots
`/tmp/gallery-hosted-20261031/`. Not all galleries/site/server APIs accepted.

This supersedes only the previous NOT_DEPLOYED label for the included bounded
slices. Cross-gallery series navigation remains pending the Posts source seam;
ongoing work of the separate Posts session is NOT imported by this deployment.
No main, Production, Edge, DB/RLS/migration/publication change. This receipt's
later documentation-only commit is not a different deployed runtime SHA.
