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

The parent migration extends the existing `agent_upload_allowed_prefixes('media')` compatibility allowlist from historical `sod1820/agent/` to also admit `sod1820/2029/`. Existing paths remain valid.

## Private Submission Inbox for people / external source material

Live `gallery` and `media` buckets are public. Therefore unreviewed person/contributor/external submissions MUST NOT land there by default.

Use private bucket `submission-inbox` as the single binary intake boundary before review/publication.

Resolved contributor path:

`submission-inbox/sod1820/2029/contributors/<contributor-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Authenticated account that is not yet a contributor:

`submission-inbox/sod1820/2029/accounts/<user-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Unresolved external sender path:

`submission-inbox/sod1820/2029/unresolved/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Rules:

- contributor/user ids are UUIDs only, never phone/email/display-name/WhatsApp-name;
- `<submission-id>` is a UUID for the incoming submission event and is not automatically the later public asset-id;
- raw submitted binary is immutable at `original.<ext>`;
- if identity is resolved later, link semantically instead of moving the raw source merely for neatness;
- no public read URL is assumed;
- no anon/authenticated direct-read policy belongs on the private bucket by default.

The semantic home remains existing infrastructure (`research_contributions`, contributor/person identity, source/provenance, Research Intake). `submission-inbox` is only the private binary staging boundary, not a second contribution store.

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
- ELS or other bounded research request;
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

Do not create canonical roots such as `tiktok/`, `youtube/`, `whatsapp/`, `openai/`, `claude/`, `dim5/` or `<person-name>/`.

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

- DO NOT move/rename these objects just to normalize appearance;
- DO NOT continue `media/sod1820/videos` as the canonical forward root;
- NEW 2029 video, including future Dimension Five video, uses `media/sod1820/2029/video/...`;
- `מימד חמש` remains Series identity in content metadata, not a storage directory.

## Authenticated upload runtime — stacked implementation

`media-upload-intent` is the runtime seam for browser/mobile uploads. It does not decide truth, contribution meaning or publication.

Issue flow:

1. verify the caller JWT server-side;
2. resolve whether the caller is admin and whether a canonical contributor row exists;
3. validate declared file kind, MIME, extension and bounded size;
4. generate the destination path server-side; caller cannot choose arbitrary storage paths;
5. create a Supabase signed upload token with `upsert=false`;
6. return the direct Storage TUS endpoint + `x-signature` token + 6 MiB chunk contract;
7. client uploads directly to Storage, so Edge does not buffer large media;
8. caller may invoke `action=verify`; the server authorizes the exact lifecycle prefix and checks HEAD size + MIME through a short signed read URL.

Authorization:

- `scope=submission`: any authenticated account; path is contributor UUID when that identity exists, otherwise account UUID;
- `scope=public`: admin only;
- unresolved WhatsApp/external server ingestion remains a separate server-to-server adapter and is not opened to ordinary authenticated callers.

Private bucket safety envelope:

- `public=false`;
- max object size 2 GiB;
- allowlisted image/video/audio/document MIME families only;
- no anon/authenticated direct-read Storage policy;
- signed upload token grants only the generated object path;
- originals use fresh UUID paths and no overwrite.

Large video uses Supabase Storage TUS on the direct storage hostname. The browser helper `src/lib/mediaResumableUpload.js` uploads 6 MiB chunks, tracks progress and uses TUS HEAD to recover the server offset after transient errors.

## ChatGPT / agent path

Verified image transport today:

`ChatGPT file -> Dropbox temporary file -> Dropbox single-use download URL -> agent-upload mode=url -> Supabase -> read-back verification`

For already-approved/system images, the forward public destination is `media/sod1820/2029/image/...` once the parent migration is released.

For unreviewed contributor/source material, public media is never an approval shortcut.

## Video policy

Approved/public 2029 video location:

`media/sod1820/2029/video/YYYY/MM/<asset-id>/...`

Unreviewed contributor/external video first lands in the private inbox.

Transport is separate from location:

- do not send large video through the current buffered image URL relay;
- use the signed TUS upload intent for browser/mobile large video;
- preserve source container as immutable original;
- poster/preview/transcodes are derivatives;
- captions live under `captions/` for the asset, while transcript/research semantics remain under existing owners;
- platform/source/Series differences remain provenance/metadata, not folders.

## Immutability / naming

- fresh UUID per public asset;
- fresh UUID per incoming submission event;
- overwrite disabled for originals;
- corrected/replaced source receives a new identity or governed version relation;
- human titles/slugs are metadata, not storage keys.

## Generator

Use `scripts/media-path.mjs` for offline/admin path generation.

It supports:

- `--scope public` -> bucket `media`, root `sod1820/2029/...`;
- `--scope submission --contributor-id <uuid>` -> private contributor path;
- `--scope submission --user-id <uuid>` -> private authenticated account path;
- `--scope submission --unresolved` -> private unresolved path.

The runtime Edge function generates its own paths; callers never submit a trusted destination path.

## Legacy boundary

Do not migrate existing `gallery/sod1820/videos`, `media/sod1820/videos`, `media/uploads/*`, `gallery/posts/*` or other historical roots merely for cosmetic consistency. Preserve live URLs and provenance until an explicit migration is justified by a separate Human Gate.

Forward rule:

- approved/public new media -> `media/sod1820/2029/...`;
- unreviewed person/external binary -> private `submission-inbox/sod1820/2029/...`;
- source/channel/Series/author -> provenance/semantic relation, not physical root.

## Release states

Documented/implemented branch code != live runtime.

Current live facts at this branch pass:

- public image bridge (`agent-upload` v26) is live;
- Dropbox image relay is live-verified;
- PR #495 private bucket + `sod1820/2029/` allowlist are NOT live until released;
- `media-upload-intent` + TUS client helper are IMPLEMENTED ON STACKED BRANCH ONLY, not deployed;
- WhatsApp attachment fetch-to-inbox is still NOT implemented by this scope;
- promotion tooling is NOT implemented.

Do not claim branch-only upload capabilities live until the parent migration and this runtime are explicitly released and production-E2E verified.
