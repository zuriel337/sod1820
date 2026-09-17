# SOD1820 Media Ingress / Storage Convention v1

Status: branch-only candidate. Subordinate to the live Research Intake / Representation / Person / Truth owners and the existing `AGENT_MEDIA_UPLOAD_BRIDGE_V1`; this document is an implementation convention, not a new truth/store/registry owner.

## Purpose

Give SOD1820 one forward-only physical storage convention for media from people, agents, external platforms and internal generation, without moving or rewriting legacy objects.

Source channel, series, author and destination surface are provenance/semantic relations. They do not create separate physical storage trees.

## Public / approved 2029 media

Use Supabase Storage bucket `media` for approved/public 2029 assets.

Canonical forward root:

`media/sod1820/2029/<kind>/YYYY/MM/<asset-id>/...`

`<kind>` is one of `image | video | audio | document`.

`<asset-id>` is a UUID generated once for the public asset identity. Titles, post slugs, platform names, series names and agent names are not stable storage identity.

Examples:

- Image original: `sod1820/2029/image/2026/09/<uuid>/original.png`
- Image derivative: `sod1820/2029/image/2026/09/<uuid>/derivatives/hero.avif`
- Image thumbnail: `sod1820/2029/image/2026/09/<uuid>/derivatives/thumb.webp`
- Video original: `sod1820/2029/video/2026/09/<uuid>/original.mp4`
- Video poster: `sod1820/2029/video/2026/09/<uuid>/derivatives/poster.jpg`
- Video preview: `sod1820/2029/video/2026/09/<uuid>/derivatives/preview.mp4`
- Video captions: `sod1820/2029/video/2026/09/<uuid>/captions/he.vtt`
- Audio original: `sod1820/2029/audio/2026/09/<uuid>/original.mp3`
- Document original: `sod1820/2029/document/2026/09/<uuid>/original.pdf`

The migration in this branch extends the existing `agent_upload_allowed_prefixes('media')` compatibility allowlist from historical `sod1820/agent/` to also admit `sod1820/2029/`. Existing paths remain valid.

## Private Submission Inbox for people / external source material

Live `gallery` and `media` buckets are public. Therefore unreviewed person/contributor/external submissions MUST NOT land there by default.

Use private bucket `submission-inbox` as the single binary intake boundary before review/publication.

Resolved contributor path:

`submission-inbox/sod1820/2029/contributors/<contributor-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Unresolved sender path:

`submission-inbox/sod1820/2029/unresolved/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Rules:

- `<contributor-id>` is the canonical contributor UUID, never phone/email/display-name/WhatsApp-name.
- `<submission-id>` is a UUID for the incoming submission/event; it is not automatically the later public asset-id.
- raw submitted binary is immutable at `original.<ext>`;
- if sender identity is unresolved, preserve the unresolved raw path and later link it semantically; do not move it merely for neatness;
- no public read URL is assumed;
- no anon/authenticated direct-read policy belongs on the private bucket by default.

The semantic home remains existing infrastructure (`research_contributions`, contributor/person identity, source/provenance, Research Intake). `submission-inbox` is only the private binary staging boundary, not a second contribution store.

The existing public `agent-upload` ticket flow is NOT silently extended to private inbox in this branch because its current ticket/result contract assumes a public URL. A private signed/ticketed adapter must preserve private semantics explicitly.

## What people may submit — one intake fabric

The intake system must be capable of representing these families without a separate storage/truth system per input:

- text / pasted passage / message;
- number / expression / gematria or research statement;
- date / time / event / life-event context where governed;
- person / contributor relation or attribution;
- image / screenshot / photo;
- video;
- audio / voice note / future transcript representation;
- PDF / document / book/source file;
- URL / external source / social post;
- research contribution / community submission / post contribution;
- ELS or other bounded research request (request semantics, not an uploaded media kind);
- WhatsApp/channel message and attachment;
- private research material;
- future multimodal inputs.

Not every family is a binary file. Text/number/date/person/request semantics stay in their existing domain records; only actual binary artifacts use Storage.

## One ingress fabric — all channels converge

For unreviewed material from a person/external source:

`INGRESS CHANNEL -> PRIVATE submission-inbox (when binary exists) + existing source/contribution record -> identity/provenance resolution -> review/classification -> Human Gate -> public/approved representation in media when needed`

Channels:

- Website / personal Submission Center -> governed upload -> private inbox;
- WhatsApp -> existing `channel_ingest_sources` / `wa_vip_inbox` message intake -> attachment fetch -> private inbox;
- Dropbox / Google Drive -> transport/download -> private inbox;
- ChatGPT attachment/generated file used as source material -> relay -> private inbox;
- TikTok / YouTube / Instagram / Telegram / external URL -> fetch/download -> private inbox;
- phone share / direct file upload -> governed upload -> private inbox.

Channel is provenance, not a storage tree.

For WhatsApp, existing message identity (`group_id + msg_id + sender/sender_name`) remains source identity. The downloaded attachment is a representation, not a replacement for message provenance.

Dropbox/Drive are transport unless the provider object itself is the cited source. Temporary relay URLs are not canonical provenance.

## Review / promotion boundary

`received != approved != canonical != published != public`.

Approval does not rewrite history. The private raw source stays source provenance. A public optimized/published representation gets a public asset identity under `media/sod1820/2029/...` and is linked by the owning domain.

## Identity / Representation

`original` is the preserved source binary for that storage identity. Optimized web files, thumbnails, posters, previews, captions and transcodes are dependent Representations; they do not replace the original.

Storage path is physical location only. Meaning, source identity, provenance, truth/access state, Series membership, Post linkage, World/Research linkage and author identity remain owned by existing domain owners.

`media_map` is not repurposed as a 2029 registry; its live schema is migration-oriented.

## Source / Series / Author are metadata, not directories

Do not create canonical roots such as:

- `tiktok/`
- `youtube/`
- `whatsapp/`
- `openai/`
- `claude/`
- `dim5/`
- `<person-name>/`

Preserve source platform, source URL, external message/post ID, source creator/contributor, acquisition method/time and Series membership through existing provenance/content owners.

A TikTok video that belongs to the `מימד חמש` Series still physically lives under the generic `video/.../<asset-id>/` family. Series membership belongs to Post/content semantics, not Storage identity.

## Dimension Five live archaeology — preserve, do not extend as the new root

Live calibration on 2026-09-17 found:

- 39 posts tagged/categorized `מימד חמש`;
- 30 contain an MP4 reference;
- 29 contain VTT references;
- `gallery/sod1820/videos/`: 131 objects, ~372 MB, including 29 MP4 + 59 VTT + 36 images;
- `media/sod1820/videos/`: 19 objects, ~247 MB, including 11 MP4 + 6 VTT + 2 images;
- newer Dimension Five posts often point MP4 to `media/sod1820/videos`, while some subtitles remain under `gallery/sod1820/videos`; older posts are heavily rooted in `gallery/sod1820/videos`.

Decision:

- DO NOT move/rename these objects just to normalize appearance; live post URLs would be at risk and the paths are valid provenance/compatibility.
- DO NOT continue `media/sod1820/videos` as the canonical forward root; it is a flat legacy family already mixed with the historical split.
- NEW 2029 video, including future Dimension Five video, uses `media/sod1820/2029/video/...`.
- `מימד חמש` remains Series identity in content metadata, not a storage directory.

## ChatGPT / agent path

Verified image transport today:

`ChatGPT file -> Dropbox temporary file -> Dropbox single-use download URL -> agent-upload mode=url -> Supabase -> read-back verification`

For already-approved/system images, the forward public destination is `media/sod1820/2029/image/...` once this migration is released.

For unreviewed contributor/source material, the transport must terminate in private `submission-inbox` once the private adapter is implemented; public media is never an approval shortcut.

## Video policy

Approved/public 2029 video location:

`media/sod1820/2029/video/YYYY/MM/<asset-id>/...`

Unreviewed contributor/external video first lands in the private inbox.

Transport is separate from location:

- do not send large video through the current buffered image URL relay;
- use bounded resumable/direct transport (TUS/signed upload/multipart as appropriate) while landing in the same lifecycle tree;
- preserve source container as immutable original;
- poster/preview/transcodes are derivatives;
- captions live under `captions/` for the asset, while transcript/research semantics remain under existing owners;
- platform/source/Series differences remain provenance/metadata, not folders.

## Immutability / naming

- fresh UUID per public asset;
- fresh UUID per incoming submission event;
- `allow_overwrite=false` for originals;
- corrected/replaced source receives a new identity or governed version relation;
- human titles/slugs are metadata, not storage keys.

## Generator

Use `scripts/media-path.mjs` for canonical path generation.

It supports:

- `--scope public` -> bucket `media`, root `sod1820/2029/...`;
- `--scope submission --contributor-id <uuid>` -> private contributor path;
- `--scope submission --unresolved` -> private unresolved path.

This generator creates paths only. It does not authorize upload, publication or promotion.

## Legacy boundary

Do not migrate existing `gallery/sod1820/videos`, `media/sod1820/videos`, `media/uploads/*`, `gallery/posts/*` or other historical roots merely for cosmetic consistency. Preserve live URLs and provenance until an explicit migration is justified by a separate Human Gate.

Forward rule:

- approved/public new media -> `media/sod1820/2029/...`;
- unreviewed person/external binary -> private `submission-inbox/sod1820/2029/...`;
- source/channel/Series/author -> provenance/semantic relation, not physical root.

## Release states

Documented convention != deployed runtime.

Current live facts at this branch pass:

- public image bridge (`agent-upload` v26) is live;
- Dropbox image relay is live-verified;
- `submission-inbox` bucket is NOT live until migration release;
- `sod1820/2029/` ticket allowlist extension is NOT live until migration release;
- private user upload adapter is NOT implemented;
- WhatsApp attachment fetch-to-inbox is NOT implemented by this convention;
- large-video resumable transport is NOT implemented;
- promotion tooling is NOT implemented.

Do not claim those later capabilities live merely because their destination/contract is defined.
