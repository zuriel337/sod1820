# SOD1820 Media Ingress / Storage Convention v1

Status: release candidate. Subordinate to the live Research Intake / Representation / Person / Truth owners and the existing `AGENT_MEDIA_UPLOAD_BRIDGE_V1`; this document is an implementation convention, not a new truth/store/registry owner.

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
- Video original: `sod1820/2029/video/2026/09/<uuid>/original.mp4`
- Video poster: `sod1820/2029/video/2026/09/<uuid>/derivatives/poster.jpg`
- Video captions: `sod1820/2029/video/2026/09/<uuid>/captions/he.vtt`
- Audio original: `sod1820/2029/audio/2026/09/<uuid>/original.mp3`
- Document original: `sod1820/2029/document/2026/09/<uuid>/original.pdf`

The release migration extends the existing `agent_upload_allowed_prefixes('media')` compatibility allowlist from historical `sod1820/agent/` to also admit `sod1820/2029/`. Existing paths remain valid.

## Private Submission Inbox

Live `gallery` and `media` buckets are public. Unreviewed person/contributor/external submissions therefore land in private bucket `submission-inbox` before review/publication.

Resolved contributor path:
`submission-inbox/sod1820/2029/contributors/<contributor-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Authenticated account not yet a contributor:
`submission-inbox/sod1820/2029/accounts/<user-id>/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Unresolved external sender:
`submission-inbox/sod1820/2029/unresolved/YYYY/MM/<submission-id>/<kind>/original.<ext>`

Ids are UUIDs only; raw originals are immutable; no public read URL is assumed; no anon/authenticated direct-read Storage policy belongs on the private bucket.

The semantic home remains existing infrastructure (`research_contributions`, contributor/person identity, source/provenance, Research Intake). `submission-inbox` is binary staging only, not a second contribution store.

## One intake fabric

People may contribute text, expressions/numbers, dates/events, person context, images, video, audio/voice, PDFs/documents/books, URLs/social sources, research contributions, ELS/research requests, WhatsApp messages/attachments, private research material and future multimodal inputs. Non-binary semantics stay in existing domain records; actual binaries use Storage.

All channels converge:

`INGRESS CHANNEL -> PRIVATE submission-inbox (when binary exists) + existing contribution/source record -> identity/provenance resolution -> review/classification -> Human Gate -> public/approved representation in media when needed`

WhatsApp, Dropbox, Drive, TikTok, YouTube, Instagram, Telegram, ChatGPT and phone share are provenance/transport, not separate storage trees.

## Review / promotion boundary

`received != approved != canonical != published != public`.

Private raw source stays provenance. Public/published representation receives a public asset identity under `media/sod1820/2029/...` only when governed placement needs it.

## Identity / Representation

Original binary is preserved. Optimized files, thumbnails, posters, previews, captions and transcodes are dependent Representations. Storage path is physical location only; meaning, provenance, truth/access state, Series, Post, World/Research and author identity remain owned by existing domains.

Do not create physical roots such as `tiktok/`, `youtube/`, `whatsapp/`, `openai/`, `claude/`, `dim5/` or person names.

## Dimension Five legacy boundary

Live archaeology found 39 Dimension Five posts; current media is split across `gallery/sod1820/videos/` and `media/sod1820/videos/`. Existing URLs stay untouched. Do not extend either flat legacy video root as the 2029 canonical home. New Dimension Five video uses `media/sod1820/2029/video/...`; `מימד חמש` is Series metadata, not a storage directory.

## Authenticated upload runtime

`media-upload-intent` verifies caller JWT server-side, resolves admin/contributor identity, validates kind/MIME/extension/size, generates destination path server-side, creates a non-overwriting signed upload token, and returns direct Supabase Storage TUS configuration. Client uploads directly to Storage using 6 MiB chunks and may verify resulting size/MIME through the same authenticated Edge boundary.

- `scope=submission`: authenticated account; contributor path when linked, otherwise account path.
- `scope=public`: admin only.
- caller cannot supply an arbitrary destination path.
- private bucket max object size: 2 GiB with explicit image/video/audio/document MIME allowlist.
- no service-role key is exposed.
- large and small browser/mobile uploads use the same resumable TUS transport.

## Private media binding to contributions

Private binaries bind to the existing `research_contributions` identity, not to `contribution_links` and not to a new media table. `research_contributions.media` stores only opaque `storage_object_id` plus semantic `kind`, `role`, and `visibility=private`; it does not persist private bucket paths or signed URLs.

`bind_contribution_media` validates ownership and the exact contribution-owner prefix before binding. `media-upload-intent action=read` resolves an opaque storage object id only when the caller owns the contribution or is admin, then returns a short-lived signed read URL. This prevents public contribution rows from leaking private storage paths.

## Moderation alignment

`research_contribution_law v9` is authoritative: ordinary replies/comments may be immediately approved; knowledge-bearing intents such as `חידוש`, `מקור`, `תצפית`, `תיקון`, `השערה`, and `קשר` enter pending review even for authenticated users. Trusted-contributor status may affect research maturity, but does not silently bypass moderation status. Human Gate remains separate from verification/canonical/publication.

## ChatGPT / agents

Current verified generated-image transport remains:
`ChatGPT file -> Dropbox temporary download URL -> agent-upload mode=url -> Supabase -> read-back verification`.

Approved/system images use the public 2029 root. Unreviewed source material uses the private inbox path.

## Release boundary

This package does not migrate old media, auto-publish submissions, fetch WhatsApp attachments, or promote private material to public/canonical state. Those remain separate governed actions over this same one-tree foundation.
