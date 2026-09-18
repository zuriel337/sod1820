# SOD1820 — 2029 Media Performance / Delivery Map v1

**Date:** 2026-09-19  
**Status:** IMPLEMENTATION MAP · EXTEND_EXISTING · BRANCH-ONLY  
**Canonical project:** `linswmnnkjxvweumprav`  
**Baseline main:** `ebfe9354fc54b8fc9fede2c4f1a5e737eb852861`

This document is **not** a new Media owner, Store, Registry or Truth system.

It connects the already-released 2029 media foundation, the historical Gallery/Image/Video lessons, the current cost/performance evidence and the future delivery rules into one implementation map.

Existing authority remains:

- Research Intake / privacy / provenance owners;
- Experience Governance / canonical UI owners;
- the released one-tree Media ingress/storage convention;
- Reality Graph / current media projection owners;
- `image_render_contain_law v1`;
- `system_suggestions_law v2` for operational trace/cost;
- Human Gate for destructive retention, publication and major cutover.

---

## 0. One sentence

**Keep one immutable asset identity, generate bounded reusable representations in the background, deliver only the representation appropriate to the surface, and never make a page view pay for media processing or a heavyweight original it does not need.**

---

# 1. What already exists and must be extended

## 1.1 One-tree ingress / storage is already released

PR #499 released the current 2029 media intake foundation:

- public approved media under `media/sod1820/2029/<kind>/YYYY/MM/<asset-id>/...`;
- private unreviewed binary submissions under `submission-inbox`;
- platform/source is provenance, **not** storage identity;
- resumable TUS upload runtime;
- contributor/research contribution binding through existing semantic owners;
- immutable original + dependent representations;
- no TikTok/YouTube/WhatsApp/person-specific storage roots.

Do not build Media Store 2.

## 1.2 World media projection is already released

PR #511 released native World 2029 media projection.

The current World public projection explicitly uses:

- `gallery_images.published = 1`;
- `curator_hidden IS NULL/FALSE`;
- real public representation;
- Reality Graph relation context.

This is important for later Control Plane counts: **published=1 is the current World-public media gate. Do not assume published=2 is equivalent without an owning contract.**

## 1.3 Image rendering law is already active

`image_render_contain_law v1` preserves a hard lesson from the Legacy Gallery:

> width-only Supabase render cropped images.

Observed historical specimen:

`1015×381 → width=900 → 900×381` crop behavior.

Therefore:

- canonical thumbnail rendering uses `resize=contain`;
- touched/new thumbnail surfaces must not silently replace it with crop/fill;
- flex/grid media containers need bounded width behavior rather than hiding overflow-induced cropping.

Current `src/lib/img.js` already implements this.

## 1.4 Static thumbnail preference already exists

Current `galThumb()` rule:

1. use persisted `thumb_url` when available;
2. only then fall back to Supabase render transform;
3. original remains source identity.

This is the correct direction for 2029.

## 1.5 Existing background thumbnail workers

Live cron snapshot:

- `gallery-thumbs` — every 10 minutes;
- `post-thumbs` — at :07 / :37;
- `channel-thumbs` — at :13 / :43.

These are compatibility/processing workers, not Media truth owners.

They remain until the 2029 derivative pipeline proves equivalent/better coverage and their readers no longer depend on them.

---

# 2. Historical lessons that 2029 must not relearn

## 2.1 “Make it smaller” and “make it bigger” were surface tuning, not asset identity

Legacy code accumulated many ad-hoc requested widths, including approximately:

- 160;
- 200;
- 220;
- 340;
- 460;
- 480;
- 900.

This happened because each Gallery/Rail/Contributor/Reality surface solved media density locally.

2029 should **not** continue an unbounded width vocabulary.

Instead it should converge on a small reusable representation ladder.

## 2.2 Dynamic transformation is a fallback, not the default delivery model

The site historically used Supabase Image Transformations to avoid sending full originals.

That was materially better than originals and preserved aspect ratio after the `resize=contain` correction.

But per-request transformations still have:

- processing cost;
- cache identity complexity;
- transformation usage;
- more provider dependence.

2029 target:

**background/material-change derivative → static immutable URL → long cache → reused across surfaces.**

Dynamic render transform remains a bounded compatibility fallback, not the primary 2029 delivery path.

## 2.3 A thumbnail must not secretly be the original

Live snapshot:

- public visible Gallery rows: **2,190**;
- missing Gallery thumb: **5**;
- `thumb_url = image_url`: **233**.

Independent size audit found those 233 rows total only about **5.3 MB**, max under ~0.8 MB, all images.

Therefore this is a **correctness/performance hygiene defect**, but it is **not** the cause of the historic 250+ GB egress incident.

The new system still forbids the pattern by contract because future originals may be heavy.

## 2.4 Video is the heavier delivery risk

Live Storage snapshot:

- total objects: **20,211**;
- total object bytes: ~**15.0 GB**;
- video objects: **625**;
- video bytes: ~**7.69 GB**;
- objects >20 MB: **155**;
- objects >50 MB: **3**;
- observed video originals include ~40–115 MB files.

A small number of unwanted raw-video fetches can dominate transfer.

## 2.5 Pre-click video loading was real Legacy debt

Legacy `BrandTicker` mounted compact video cards with `preload="metadata"`.

Cost pass released a correction:

- compact ticker does **not** mount/fetch MP4 before click;
- existing poster/thumb is used;
- no poster → local zero-network placeholder;
- actual video loads only after user opens the media.

That rule becomes global 2029 behavior.

## 2.6 Hidden client video capture is compatibility debt

Legacy `videoThumb.js` can mount/load a hidden video client-side to capture a thumbnail when a video has no poster.

This cannot be the 2029 processing model.

Target:

- poster generation is server/background media processing;
- browser page view never generates a media derivative;
- temporary client capture may remain only as bounded compatibility until server poster coverage is complete.

## 2.7 OCR is extraction, not media truth

Legacy OCR/wiring previously had paths that could create semantic relations.

2029 keeps:

- OCR/STT = Extraction/Representation;
- media original = evidence/source payload;
- semantic relation/claim = Research Intake + Truth/Human Gate.

Optimizing a file never upgrades its research meaning.

---

# 3. Current live baseline to monitor

Snapshot at map creation:

| Metric | Live |
|---|---:|
| Storage objects | 20,211 |
| Storage bytes | ~15.0 GB |
| Video objects | 625 |
| Video bytes | ~7.69 GB |
| Objects >20 MB | 155 |
| Objects >50 MB | 3 |
| Public visible Gallery | 2,190 |
| Gallery missing thumb | 5 |
| Gallery original-as-thumb | 233 |
| Channel rows with image | 440 |
| Channel missing thumb | 2 |
| Gallery thumb cron | active / every 10m |
| Post thumb cron | active / twice hourly |
| Channel thumb cron | active / twice hourly |

Historical billing evidence from the Aug11–Sep10 cycle:

- Cached Egress: **278.865 GB**;
- uncached Egress: **38.556 GB**;
- cached overage above included 250 GB was grace-discounted in that invoice.

Exact current Storage hot-object attribution is still **UNKNOWN** until provider Storage/Edge logs expose the relevant request paths/counts.

Do not call UNKNOWN zero.

---

# 4. Target 2029 media pipeline

```text
INGRESS
  ↓
private submission-inbox when unreviewed
  ↓
identity / provenance / moderation
  ↓
immutable approved original under one asset identity
  ↓
background derivative plan
  ├─ thumbnail / micro
  ├─ card
  ├─ detail
  ├─ hero
  ├─ share / OG
  ├─ video poster
  ├─ captions / transcript
  └─ video/audio transcodes when justified
  ↓
versioned immutable representations + cache
  ↓
surface chooses smallest sufficient representation
  ↓
user intent may open full/original/deep media
```

No surface owns media identity.

No channel owns storage identity.

No derivative becomes a new semantic asset.

---

# 5. Proposed canonical image representation ladder

This is an **implementation target**, not a new semantic registry.

The goal is to collapse the Legacy 160/200/220/340/460/480/900 scatter into a small reusable set.

## M0 — micro

Target width: ~**192 px**

Use for:

- compact story circles;
- mini rails;
- tiny contributor/media hints;
- dense mobile rows.

## M1 — card

Target width: ~**480 px**

Use for:

- standard Gallery/World cards;
- search/result media cards;
- home/research rails.

## M2 — detail

Target width: ~**960 px**

Use for:

- opened lightbox initial view;
- detail panels;
- contributor hero inside normal viewport.

## M3 — hero

Target width: ~**1440 px**

Use for:

- large desktop/hero;
- high-density detail when justified.

## MS — share

Target output appropriate to canonical share/OG contract, normally around the existing social-card class (for example 1200×630 where the share owner requires it).

Share representation is separate from gallery thumbnail selection.

## Rules for every image representation

- preserve original;
- `resize=contain` / no accidental crop;
- never upscale a tiny source merely to satisfy a nominal class;
- generate only representations materially needed;
- modern compressed representation may be preferred where the pipeline supports it, but source format compatibility remains explicit;
- immutable derivative URL or versioned identity;
- width/quality/profile changes create a new representation/version, not silent byte replacement;
- `srcset/sizes` may project the same bounded classes; it must not create dozens of ad-hoc transforms;
- original loads only for explicit deep/full-resolution intent.

---

# 6. Surface delivery rules

## Gallery / World / Search / Rails

Default:

- M0 or M1;
- lazy image load;
- static derivative first;
- dynamic `thumb()` compatibility fallback only;
- never raw video;
- never full-resolution original.

## Detail / Lightbox

Default:

- M2 first;
- M3/full only when viewport/zoom/deep intent justifies it;
- zoom may upgrade representation intentionally;
- do not download full original merely because modal opened.

## Research source / evidence inspection

May expose original download/view because exact source representation can be evidential.

That is an explicit research action, not the card default.

## Admin / Control Plane

Use tiny derivatives for previews.

Operational UI never downloads raw media simply to display a row.

---

# 7. Video delivery contract

## 7.1 Card/list/rail

Before explicit user intent:

- **no MP4/WebM source request**;
- render poster/thumbnail only;
- if poster missing, render zero-network placeholder;
- no hidden `<video>`;
- no `preload=metadata` as a substitute for poster.

## 7.2 Opened player

After explicit intent:

- assign/load video source;
- default `preload="none"` unless the owning immersive surface has a measured reason otherwise;
- player may request metadata/content after open;
- only one active autoplaying immersive video at a time;
- autoplay, where intentionally used, must be muted/visible/experience-owned and not a generic gallery behavior.

## 7.3 Poster

Poster is a first-class dependent representation of the video asset.

Target:

- server/background generation;
- immutable/versioned;
- card/detail sizes can reuse the image ladder;
- missing-poster backlog visible in Control Plane.

## 7.4 Large video / transcode

Large originals are preserved but should not automatically be public delivery files.

A video becomes a transcode candidate when, for example:

- source is >20 MB;
- source bitrate/resolution materially exceeds the user-facing need;
- repeated egress proves the raw original is expensive;
- device/mobile performance requires a bounded profile.

Exact bitrate/profile ladders belong to implementation and measurement, not to asset identity.

Initial target should support at least a mobile-efficient delivery representation while preserving the original.

Adaptive streaming/CDN may be added later **under the same asset identity** if measured video traffic justifies it; it must not become Video System 2.

## 7.5 Captions / transcript

Captions/transcripts stay linked representations:

- language identity explicit;
- timing/version provenance preserved;
- Dimension Five and future video flows reuse this same rule.

---

# 8. Video SEO / sharing boundary

Current Legacy behavior includes two different needs:

1. Google video sitemap uses direct `video:content_loc` to the video asset.
2. social `api/og.js` has `og:video` support.

2029 must not treat those as one requirement.

Target separation:

- **search/video indexing** may expose the canonical delivery URL when required by the SEO owner;
- **social/share preview** defaults to lightweight image/poster + canonical landing page unless a platform-specific video share is intentionally selected;
- crawler delivery is observable egress;
- share preview must not silently cause heavyweight video fetches merely to decorate a link.

Do not remove video SEO blindly for cost.

---

# 9. Cache / CDN / egress rules

## Immutable asset rule

Originals and immutable derivatives should use long-lived cache identity where safe.

Changing bytes requires a new versioned representation/path/identity reference.

## Measure three states

Provider usage:

- `EXACT` — provider gives authoritative metric;
- `ESTIMATED` — internally calculated;
- `UNKNOWN` — provider data unavailable.

Never convert UNKNOWN to zero.

## Hot asset attribution

Desired chain:

`surface → media reference → derivative/original → request count → bytes → cache state → provider cost`

When provider logs cannot supply response bytes:

- retain request/path/cache counts where available;
- join with known Storage object/derivative size for bounded estimate;
- mark it ESTIMATED.

---

# 10. Background processing contract

Processing can run on:

- ingest;
- approval/publication;
- original/material representation change;
- explicit backfill;
- version/profile change.

Processing must **not** run merely because someone opened a page.

Every processor needs:

- asset id;
- source representation version;
- requested derivative profile;
- idempotency;
- max attempts;
- outcome/failure reason;
- output size/MIME/hash;
- processing duration;
- trace/span;
- retry/backlog visibility.

---

# 11. 2029 Control Plane — Media / Sources health lens

The second Claude session already built branch-only `admin_system_health()`.

Before release, reconcile its media slice with this map and the canonical public gate.

Required media health projection:

### Inventory

- total objects/bytes by public/private lane and media kind;
- images/videos/audio/documents;
- large-object buckets (>20 MB, >50 MB or future owner thresholds).

### Derivative coverage

- public Gallery rows with missing thumb;
- public Gallery rows where thumb points to original;
- videos with missing poster;
- oversized public-delivery originals;
- derivatives missing for currently used surface class;
- processing backlog/failures/oldest pending.

### Worker health

- gallery/post/channel thumb worker active state;
- last success/failure;
- items processed;
- repeated no-op polling;
- future video poster/transcode worker state.

### Delivery / cost

- cached/uncached egress EXACT/ESTIMATED/UNKNOWN;
- hot assets when provider evidence exists;
- cache hit/miss where available;
- original-vs-derivative request ratio;
- bytes served by kind/representation when measurable.

### Retention

Reuse `admin_retention_preview()`.

No Media Cleanup Store.

### Important reconciliation with Claude branch

Claude's branch-only Control Plane migration currently comments/assumes a public Gallery set that may include `published IN (1,2)`.

Current released World 2029 projection explicitly uses **published=1**.

Before Control Plane migration can be released, its Gallery-public health count must either:

- use the current owning World/publication contract (`published=1` + not hidden), or
- resolve a stronger live publication owner proving another value.

Do not ship the assumption.

---

# 12. Migration / implementation waves

## Wave A — Delivery hygiene now

- no list/card raw video;
- static thumbnail/poster first;
- original only on explicit deep intent;
- reuse `galThumb`/canonical media helper rather than hand-building URLs;
- preserve `resize=contain`;
- remove page-view derivative generation when server coverage exists.

## Wave B — Standard image profiles

- implement M0/M1/M2/M3/Share profiles under existing asset identity;
- generate/backfill only currently public/needed assets first;
- update 2029 World/Number/Books/Post/Journey cards to request profile by semantic surface role, not arbitrary pixel width;
- keep Legacy compatibility fallback during cutover.

## Wave C — Video posters

- server/background poster processor;
- bind poster representation to asset;
- backfill public videos first;
- remove hidden client video capture once coverage + rollback acceptance passes.

## Wave D — Video delivery transcodes

- inventory bitrate/resolution/duration/size;
- prioritize repeatedly served or >20 MB public videos;
- create bounded mobile/web delivery representation;
- keep original immutable;
- compare egress/latency before broad rollout.

## Wave E — Provider/CDN strategy

Only after exact/estimated hot-path evidence:

- decide whether Supabase remains optimal for heavy video delivery;
- if a dedicated streaming/CDN provider is justified, keep one SOD asset identity and store provider delivery reference as representation infrastructure;
- migration never changes Post/World/Series/source identity.

## Wave F — Legacy retirement

Retire only after consumer proof:

- old flat video roots stop receiving new 2029 writes;
- obsolete thumb workers/capture code retire only when all readers consume canonical representations;
- legacy files may remain addressable for provenance/compatibility;
- no mass rewrite merely for folder aesthetics.

---

# 13. Performance acceptance gates

A media-enabled 2029 surface is not complete until:

## Image cards

- no unexpected original fetch;
- correct contain/no crop;
- bounded derivative size;
- no layout overflow;
- lazy/non-blocking behavior;
- same asset identity preserved.

## Video cards

- zero video bytes before intent;
- poster/placeholder only;
- source starts only after explicit open/play or owning immersive rule;
- closing/unmounting stops unnecessary transfer.

## Gallery

- no N+1 media metadata calls when projection can batch;
- initial viewport has bounded media request count/bytes;
- pagination/virtualization for long collections;
- thumbnails are reusable, not generated by scroll.

## Processing

- idempotent;
- retryable;
- observable;
- no silent fallback to original for a failed derivative;
- failure displays bounded placeholder/state.

## Cost

- provider egress state visible as EXACT/ESTIMATED/UNKNOWN;
- no surface can create unbounded transform variants;
- no crawler/share behavior silently multiplies raw-video transfer;
- top media cost is attributable to asset/surface when provider evidence permits.

---

# 14. Gallery UX rules that improve performance without degrading the experience

- visual density may change by screen size; asset identity does not;
- use CSS layout to change card size, not new bespoke image transforms for every breakpoint;
- virtualize/paginate long galleries rather than mounting thousands of media nodes;
- reserve dimensions/aspect container to prevent layout shift;
- full-resolution zoom is an explicit action;
- avoid duplicate hidden copies of the same image/video for animation/layout tricks;
- carousels preload at most the bounded next/previous representation, not the entire collection;
- off-screen video stays unloaded;
- reduced-motion/low-power mode must not require a separate media asset tree.

---

# 15. What not to do

Do **not**:

- create a new Gallery DB/store just for 2029;
- create a Video Store separate from Media identity;
- create storage roots per source platform/person/Series;
- convert thumbnail URL into semantic identity;
- delete originals after optimization;
- use width-only rendering that breaks `resize=contain`;
- let every component choose arbitrary transform widths;
- generate poster/thumb from hidden video on every client/page view;
- autoplay all gallery videos;
- preload video metadata in compact cards;
- treat OCR as verified semantic relation;
- mass-migrate legacy paths without a consumer/release reason;
- hide provider usage uncertainty;
- downgrade Supabase compute merely because media was optimized — DB memory/IO is a separate measured gate.

---

# 16. Current next actions

1. Ratify this map as the media delivery/navigation target without creating a new owner.
2. Reconcile Claude Control Plane branch media metrics with `published=1` and the metrics in §11.
3. Build a focused I/O optimization pass separately for DB/Traffic; do not conflate DB IO with media egress.
4. Inventory public videos by size, poster coverage and current consumer surface.
5. Build server-side poster coverage before deleting Legacy client capture.
6. Standardize image profiles and update **new/touched 2029 surfaces first**.
7. Obtain provider Storage hot-path evidence before any storage/CDN migration decision.
8. Only then decide whether heavy video delivery should remain on Supabase or use a dedicated delivery provider under the same asset identity.

---

# 17. Completion condition

Media Foundation is performance-complete when a future surface can ask:

> “Give me this asset as micro/card/detail/hero/share/poster/video-delivery”

and the system can return one bounded, versioned, cacheable representation without:

- inventing a new media identity;
- scanning/mutating semantic truth;
- doing media processing during page view;
- fetching a heavier representation than the surface requires;
- losing provenance;
- hiding the operational cost.
