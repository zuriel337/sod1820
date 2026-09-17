# SOD1820 Media Ingress / Storage Convention v1

Status: branch-only candidate. Subordinate to the live Research Intake / Representation owners and the existing `AGENT_MEDIA_UPLOAD_BRIDGE_V1`; this document is an implementation convention, not a new truth/store/registry owner.

## Purpose

Give every agent one forward-only physical storage convention for new SOD1820 media without moving or rewriting legacy objects.

## Canonical bucket for new agent-originated 2029 media

Use Supabase Storage bucket `media`.

All new agent-originated 2029 assets live under the already-allowed transport prefix:

`media/sod1820/agent/2029/<kind>/YYYY/MM/<asset-id>/...`

`<kind>` is one of:

- `image`
- `video`
- `audio`
- `document`

`<asset-id>` is a UUID generated once for the asset identity. Titles/slugs are not identity and MUST NOT be used as the stable asset key.

Examples:

- Image original: `sod1820/agent/2029/image/2026/09/<uuid>/original.png`
- Image derivative: `sod1820/agent/2029/image/2026/09/<uuid>/derivatives/hero.avif`
- Image thumbnail: `sod1820/agent/2029/image/2026/09/<uuid>/derivatives/thumb.webp`
- Video original: `sod1820/agent/2029/video/2026/09/<uuid>/original.mp4`
- Video poster: `sod1820/agent/2029/video/2026/09/<uuid>/derivatives/poster.jpg`
- Video preview: `sod1820/agent/2029/video/2026/09/<uuid>/derivatives/preview.mp4`
- Video captions: `sod1820/agent/2029/video/2026/09/<uuid>/captions/he.vtt`
- Audio original: `sod1820/agent/2029/audio/2026/09/<uuid>/original.mp3`
- Document original: `sod1820/agent/2029/document/2026/09/<uuid>/original.pdf`

## Private submission inbox for people/contributors

Unreviewed person/contributor submissions MUST NOT land directly in `media` or `gallery`: both live buckets are public.

Use the private Supabase Storage bucket `submission-inbox` as the single physical intake boundary for files submitted by people before review/publication.

Resolved contributor path:

`submission-inbox/sod1820/2029/contributors/<contributor-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Unresolved external sender path:

`submission-inbox/sod1820/2029/unresolved/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Rules:

- `<contributor-id>` is the canonical contributor UUID, never a phone number, email, display name or WhatsApp name.
- `<submission-id>` is a UUID for the incoming submission/event, separate from later public media asset identity.
- `<kind>` is `image | video | audio | document`.
- The raw submitted binary is immutable at `original.<ext>`.
- If sender identity is unresolved at ingest time, keep the original immutable unresolved path and later link the submission semantically to the resolved contributor; do not move/rename the raw source solely for tidiness.
- No public read URL is assumed for inbox objects.
- No anon/authenticated direct-read policy belongs on this bucket by default.

The semantic home remains existing infrastructure such as `research_contributions`, contributor identity, source/provenance and Research Intake. `submission-inbox` is only the private binary staging boundary; it is not a second contribution store.

### One ingress fabric

All intake channels converge on the same private inbox before review when the material came from a person or external source and is not already approved for publication:

- Website / personal Submission Center -> governed signed/ticketed upload -> `submission-inbox`
- WhatsApp -> existing `channel_ingest_sources` / `wa_vip_inbox` message intake -> media fetch/download -> `submission-inbox`
- Dropbox / Google Drive -> temporary/direct download transport -> `submission-inbox`
- ChatGPT attachment or generated file submitted as source material -> relay transport -> `submission-inbox`
- TikTok / YouTube / Instagram / Telegram / external URL -> fetch/download -> `submission-inbox`
- Phone share / direct file upload -> governed upload -> `submission-inbox`

Channel is provenance, not a separate storage tree.

### Review / promotion boundary

Canonical flow:

`INGRESS CHANNEL -> PRIVATE SUBMISSION-INBOX -> research_contributions/source provenance -> review/classification -> Human Gate -> public/approved projection in media (when needed)`

Approval does not rewrite history. The private raw source remains source provenance; a public optimized/published representation may receive a separate public media asset-id under `media/sod1820/agent/2029/...` and be linked by the owning domain.

`received != approved != canonical != published != public`.

## Identity / Representation rule

`original` is the preserved source binary. Optimized web files, thumbnails, posters, previews, captions and future encodes are dependent Representations of that asset; they never replace the original.

Storage path is physical location only. Canonical meaning, provenance, source identity, truth/access status and links to posts/World/Research remain owned by the existing domain owners. Do not create a parallel media registry merely to name files.

`media_map` is not repurposed as a 2029 registry; its current shape is migration-oriented.

## Ingress source classification

Source platform is provenance, not storage identity. A file downloaded from TikTok, YouTube, Instagram, WhatsApp, Telegram, Dropbox, Google Drive, ChatGPT, a browser download, a phone share action, or any future source MUST land in the same governed tree according to lifecycle and media kind.

Do not create platform-specific storage roots such as `tiktok/`, `youtube/`, `whatsapp/`, `openai/` or agent-specific folders under the 2029 root. Those would split one media system into parallel trees.

Preserve source provenance in the owning content/research record using the existing fields/contracts where applicable. Recommended logical provenance fields are:

- `source_platform` — e.g. `tiktok`, `youtube`, `instagram`, `whatsapp`, `chatgpt`, `dropbox`, `direct_upload`
- `source_url` — original source URL when known
- `source_creator` / contributor identity when known and governed by the existing Person/Contributor owners
- `source_external_id` — platform post/video/media ID when available
- `acquired_via` — e.g. `download`, `share`, `api`, `agent_upload`, `dropbox_relay`
- `acquired_at`

These are provenance semantics only; this convention does not create a new metadata table or registry.

## Immutability

- New 2029 assets use a fresh UUID and `allow_overwrite=false`.
- Do not overwrite an original in place.
- A corrected/replaced source binary receives a new asset-id or a governed version relationship in the owning domain; preserve history.
- Human-readable titles may live in metadata/content records, not in the stable storage identity.

## Current ChatGPT mobile image ingress

Current verified transport path for an already-approved/system image:

`ChatGPT attachment/generated file -> Dropbox temporary file -> Dropbox single-use temporary download URL -> agent-upload mode=url -> Supabase media canonical path -> read-back verification`

For unreviewed contributor/source material, the same transport concept must terminate in `submission-inbox` once that private ingress adapter is implemented; do not treat the existing public `media` relay as an approval shortcut.

## Other agent runtimes

Agents that hold a real local file may use `scripts/agent-upload.mjs` for the currently supported public/system media path. Future contributor/file intake must terminate in the private inbox through a governed adapter.

Do not create another uploader, bucket hierarchy, media store or agent-specific root.

## Video policy

Physical location for approved/public agent media is locked under the same tree:

`media/sod1820/agent/2029/video/YYYY/MM/<asset-id>/...`

Unreviewed contributor/external video first lands in the private submission inbox.

Transport is intentionally separate from location:

- Do NOT route large video through the current buffered image URL relay.
- For large video, use a bounded resumable/direct path (TUS / signed upload / multipart as appropriate) that lands in the correct lifecycle bucket.
- Preserve `original.mp4` (or source container) and create poster/preview/transcodes as dependent Representations.
- Captions/transcripts belong under the same asset-id when they are file representations, while research/transcript semantics remain under their existing domain owners.
- Downloaded social video and generated video use the same physical conventions. Platform/source difference is provenance, not a separate folder hierarchy.

## Legacy boundary

Do not move, rename or backfill existing objects solely to make the tree look clean. Existing roots such as `gallery/sod1820/videos`, `media/uploads/*`, `gallery/posts/*`, `media/sod1820/videos` and other historical paths remain valid provenance/compatibility until separately migrated under an explicit Human Gate.

Forward rule: new agent-originated approved media uses `media/sod1820/agent/2029/...`; unreviewed person/external submissions use private `submission-inbox/...`.

## Release states

Documented convention != deployed transport support. Current image ingress is live only for the existing public/system `agent-upload` path. The private bucket migration in this branch is not live until explicitly released. User-facing signed/ticketed inbox upload, WhatsApp media attachment fetch, large-video resumable transport and promotion tooling are separate implementation scopes and must not be claimed live merely because the storage convention is defined.
