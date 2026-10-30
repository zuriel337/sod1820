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

Status: IMPLEMENTED / LOCAL_TESTED. Protected Preview identity follows.
