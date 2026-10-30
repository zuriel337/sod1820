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
