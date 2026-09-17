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

## Identity / Representation rule

`original` is the preserved source binary. Optimized web files, thumbnails, posters, previews, captions and future encodes are dependent Representations of that asset; they never replace the original.

Storage path is physical location only. Canonical meaning, provenance, source identity, truth/access status and links to posts/World/Research remain owned by the existing domain owners. Do not create a parallel media registry merely to name files.

`media_map` is not repurposed as a 2029 registry; its current shape is migration-oriented.

## Ingress source classification

Source platform is provenance, not storage identity. A file downloaded from TikTok, YouTube, Instagram, WhatsApp, Telegram, Dropbox, Google Drive, ChatGPT, a browser download, a phone share action, or any future source MUST land in the same canonical tree according to media kind.

Do not create platform-specific storage roots such as `tiktok/`, `youtube/`, `whatsapp/`, `openai/` or agent-specific folders under the 2029 root. Those would split one media system into parallel trees.

Preserve source provenance in the owning content/research record using the existing fields/contracts where applicable. Recommended logical provenance fields are:

- `source_platform` — e.g. `tiktok`, `youtube`, `instagram`, `whatsapp`, `chatgpt`, `dropbox`, `direct_upload`
- `source_url` — original source URL when known
- `source_creator` / contributor identity when known and governed by the existing Person/Contributor owners
- `source_external_id` — platform post/video/media ID when available
- `acquired_via` — e.g. `download`, `share`, `api`, `agent_upload`, `dropbox_relay`
- `acquired_at`

These are provenance semantics only; this convention does not create a new metadata table or registry.

Examples:

- TikTok video downloaded on a phone -> `media/sod1820/agent/2029/video/2026/09/<asset-id>/original.mp4`, with TikTok URL/creator/post ID preserved in the owning record.
- YouTube Short downloaded by an agent -> same `video/.../<asset-id>/original.*` tree, not a `youtube/` directory.
- WhatsApp photo -> `image/.../<asset-id>/original.jpg`, with message/source context preserved outside the path.
- ChatGPT-generated visual -> `image/.../<asset-id>/original.png`, with `source_platform=chatgpt`/generation provenance where relevant.

## Immutability

- New 2029 assets use a fresh UUID and `allow_overwrite=false`.
- Do not overwrite an original in place.
- A corrected/replaced source binary receives a new asset-id or a governed version relationship in the owning domain; preserve history.
- Human-readable titles may live in metadata/content records, not in the stable storage identity.

## Current ChatGPT mobile image ingress

Current verified path:

`ChatGPT attachment/generated file -> Dropbox temporary file -> Dropbox single-use temporary download URL -> agent-upload mode=url -> Supabase media canonical path -> read-back verification`

After the Supabase object is verified, Dropbox is transport only and the temporary copy may be deleted according to normal cleanup policy.

For image ingress, verify before completion:

- Storage object exists
- expected size
- expected MIME
- SHA-256 when available
- public URL read-back succeeds when the target is public

## Other agent runtimes

Agents that hold a real local file may use `scripts/agent-upload.mjs`; when no explicit path is required, prefer the canonical path generator added by this convention.

Do not create another uploader, bucket hierarchy, media store or agent-specific root.

## Video policy

Physical location is locked now under the same tree:

`media/sod1820/agent/2029/video/YYYY/MM/<asset-id>/...`

Transport is intentionally separate from location:

- Do NOT route large video through the current buffered image URL relay.
- For large video, use a bounded resumable/direct path (TUS / signed upload / multipart as appropriate) that still lands in this same tree.
- Preserve `original.mp4` (or source container) and create poster/preview/transcodes as dependent Representations.
- Captions/transcripts belong under the same asset-id when they are file representations, while research/transcript semantics remain under their existing domain owners.
- Downloaded social video and generated video use the same physical tree. Platform/source difference is provenance, not a separate folder hierarchy.

## Legacy boundary

Do not move, rename or backfill existing objects solely to make the tree look clean. Existing roots such as `gallery/sod1820/videos`, `media/uploads/*`, `gallery/posts/*`, `media/sod1820/videos` and other historical paths remain valid provenance/compatibility until separately migrated under an explicit Human Gate.

Forward rule: new agent-originated 2029 media uses only the canonical root above.

## Release states

Documented convention != deployed transport support. Image ingress is already live through `agent-upload` v26; this convention must be merged before it becomes the repository-wide operational instruction. Video resumable transport remains a separate implementation scope.
