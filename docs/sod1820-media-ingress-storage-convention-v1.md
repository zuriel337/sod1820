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

## Personal hint media owner gate — 26 October 2026

Task: `CENTRAL_2029_PERSONAL_HINTS_COMBINED_BASE_AND_MEDIA_OWNER_GATE_20261026`.
Decision: **EXTEND_EXISTING; server implementation authorized on an isolated branch only**. This section extends this existing implementation convention under Person Foundation v6 and Research Intake v13; `research_item_hint` is an owner-kind discriminator, not a new domain owner.

Verified combined branch: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
Verified combined base: `83da5b2c6bb4f09df2ccaa7771122fd6805dea74`.
PR #1175 was already integrated by true merge `81a95fcadff24e9ff87108cb9053cba710e98a2f`; its complete source head `b863b6fde1304bf9c33b05011764f58a4541efd1` is an ancestor. GitHub reports the PR merged/closed. Its source branch is no longer present remotely; do not recreate or reimport it. The six named hint commits occur once in the combined ancestry.

Authorized server branch: `gpt/2029-research-item-hint-private-media-server-20261026`, opened directly from that combined base. At this checkpoint it contains this gate documentation only, not an implemented media capability, migration or deployed endpoint.

Gate verification: the combined local/remote SHA matched; all six named hint commits were verified as ancestors occurring once. The 18 focused hint-entry/return tests passed again, including actual-page Chromium return/reload and 320px light/parchment/dark with zero automatic research calls. The documentation-only branch passes `git diff --check`; no runtime/schema file was changed at this gate.

### Owner and scope

Implementation lane: existing **GPT DB/server-media writer**, consuming the Person/privacy, Workspace and Research Intake/media owners. The bounded live coordination read found no active overlapping media writer; relevant Workspace/Frame scopes were released. No specific external DB session, delivery/ACK, or live file reservation is claimed. Before implementation, the accepting DB session must recheck current ownership and record its bounded BEFORE through an authorized coordinator. The current read-only connector cannot write that record.

The server lane is authorized to edit only:

- `supabase/functions/media-upload-intent/index.ts` and `contract.mjs`.
- One new migration generated with the existing Supabase CLI workflow, for `research_items.media`, narrow server functions/guards and required grants. Do not edit applied historical migrations.
- `scripts/test-media-upload-runtime.mjs` and, if necessary, a focused helper beside that existing test.
- New focused disposable SQL acceptance under `tests/sql/`, plus a bounded local test runner when needed.
- This convention and one evidence/handoff file documenting the actual implementation/tests/rollback.

These are the approved future file scopes, not an active claim that blocks other sessions indefinitely. Frontend hint/Journey wiring, SystemFrame, ResearchProvider, `ai-analyze`, `research-run`, ELS, public contribution semantics and Legacy remain outside this server slice. A newly discovered shared-file overlap returns to central coordination before writing it.

### Approved server boundary

1. Reuse private `submission-inbox` and the existing `media-upload-intent` endpoint/TUS transport. Live inspection confirms the bucket is private. Do not create a bucket, media table, store, provider or parallel endpoint.
2. `owner_kind=research_item_hint` must resolve an existing `research_items` row with `bucket='hint'` and `user_id` equal to the server-authenticated caller before issuing or binding an upload. Never trust actor/owner ids or admin claims from the request body or editable user metadata. Personal hints remain owner-only; the contribution-reviewer/admin exception is not inherited.
3. Authorize a branch-only proposal for `research_items.media jsonb not null default '[]'::jsonb`, using the existing contribution-media array pattern. Live inspection confirms `research_items.media` is absent while `research_contributions.media` exists. Each attachment stores an opaque `storage_object_id` plus bounded semantic fields such as `kind`, `role`, and `visibility='private'`. Persist no storage path, bucket URL, signed URL or upload token in hint records/metadata, browser storage, logs or telemetry.
4. The new media field is server-managed. Existing hint rows permit owner-scoped direct DML, so merely adding a JSON column and relying on row ownership is insufficient. The DB implementation must prove that direct INSERT/UPDATE, whole-row replacement, forged JSON or metadata and existing sync operations cannot manufacture, clear, move or reassign a media binding. Preserve existing non-media hint behavior and unrelated grants/RLS.
5. Bind/read/detach/delete revalidate the exact row, caller, hint bucket, attachment and private Storage object each time. An account/contributor path prefix alone is not authorization. The server must prove issuance and the owner-kind/item association through the existing carriers/receipt mechanism, prevent cross-kind/research-item/contribution rebinding and fail closed for missing or uncertain linkage. No public submission or `community_hints` row may be created as an upload side effect.
6. Binding requires actual size/MIME read-back and the declared-file limits; transport completion is not a verified receipt. Use idempotent binding and concurrency checks. Current issue/verify and contribution-media behavior must continue to work. Generic prefix-based verification must not expose signed read access to an unbound private-hint object or bypass its semantic owner.
7. Return a short-lived signed read URL only after the owner/binding check, reusing the existing 60-second read lifetime and private/no-store response handling. The URL is transient response data. TUS necessarily receives its server-generated destination transiently; the no-path rule concerns application persistence and disclosure, not Storage's own physical object name or the upload transport.
8. Detach/delete immediately prevent new signed reads and new bindings for the removed association. An already issued signed URL remains a bearer capability until its short expiry; do not claim instant revocation of such URLs. Binary deletion uses the Storage API, with idempotent retry, dependency checks and recoverable failure behavior; never delete only `storage.objects` metadata.
9. An unbound orphan has no user-readable media result. Failed uploads/binds, explicit detach, item deletion, account transitions and retries must not make it public or attach it to a different owner. Opening, issuing, uploading, verifying, binding, reading and deleting must invoke zero AI/ELS/Raziel operations. `uploadHintImage` and public `gallery` are not part of this private route.

### Retention decision

Research Intake v13 §§13.2–13.13 and the existing retention crosswalk apply. There is no established private-inbox orphan TTL or generic orphan executor to claim as active. Do not revive the retired `storage-cleanup-oneoff` function.

The authorized branch may prepare a reference-aware dry-run and tested retry/deletion plan over the existing owners. A candidate requires proof of no current hint, contribution, channel/source or provenance reference; no in-flight bind/upload/retry; and expiry of outstanding upload capabilities. The existing signed-upload token lasts 7,200 seconds, so object age alone or a detach flag is not sufficient. Recheck dependencies at execution to prevent a bind/delete race. Protect load-bearing originals and unknown dependencies.

No arbitrary deletion interval, purge cron, live executor, automatic cleanup or new retention store is authorized. Exact class-specific retention timing and live cleanup require separately approved operational evidence and a dry-run report. Until then the implementation must keep cleanup disabled/dry-run-only, with orphans unreadable and failed deletions eligible for bounded idempotent retry. No product data is deleted at this gate.

### Required acceptance and handoff

- Disposable Postgres RLS/grants tests: owner A success; anon, owner B, stale principal and non-owning admin denial; forged actor/JWT metadata; wrong item/bucket/kind; direct JSON/metadata/whole-row tampering; cross-kind/cross-source binding rejection.
- Upload tests: MIME/extension/size limits, incomplete/mismatched objects, verified receipt, duplicate bind/retry and unchanged existing public/contribution behavior.
- Read/delete tests: opaque references only; no persisted path/URL; unbound-orphan denial; ownership recheck; signed URL expiry; detach/delete concurrency and retry; delete/recreate and existing upload-token races; no orphan leaks on principal changes.
- Retention tests: no guessed TTL, dry-run-only default, active upload/token protection, dependency/provenance preservation, cross-owner/source safety and recheck immediately before any candidate executor operation.
- Apply and roll back the proposed migration only in a disposable database. Prove preservation of existing text/date hints, `research_items` sync buckets and contribution media. Run media runtime tests, Research Sync SQL/provider tests, both builds, hard isolation, Legacy Production Lock and cumulative `git diff --check` as applicable to the actual changed files.
- Return branch/Base/HEAD, exact migration path, RPC signatures/grants, security and negative-case results, rollback proof, any remaining blocker and explicit `LIVE_APPLY/MAIN/PREVIEW/PRODUCTION: NO`.

The existing personal entry remains `/2029/journey?focus=hints`; exact return stays in Router state and personal hints stay in `research_items` bucket `hint`, separate from `community_hints`. This gate adds no frontend upload control or automatic research action. All live apply, Edge deployment, hosted Preview, main merge and Production remain unauthorized.
