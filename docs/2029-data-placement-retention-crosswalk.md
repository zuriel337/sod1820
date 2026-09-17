# SOD1820 2029 — Data Placement & Retention Crosswalk

Status: implementation companion to `research_intake_foundation_contract_law v11`.

This file is a pointer/implementation map, not a new owner, registry, store, or source of truth. Live domain owners and live DB/code win if this document drifts.

## Core rule

One Tree does **not** mean one SQL table.

- Raw/source material stays with its source/ingress owner when provenance or replay requires it.
- Atomic shared research lives in `research_objects`.
- Qualified stable identity/relation lives in the canonical domain/Reality owner.
- Personal workspace state stays in `research_items` / authorized `user_research`.
- UI surfaces consume governed adapters / Result Bundles instead of inventing feature-local stores.

## Current crosswalk

| Physical store | 2029 role | Crosswalk state | New 2029 semantic writes? |
|---|---|---|---|
| `research_objects` | atomic shared Research OS | KEEP_OWNER | yes, through governed intake/identity rules |
| `research_object_revisions` | additive research history | KEEP_OWNER | yes, where owner contract requires revision lineage |
| `nodes` / `edges` | canonical Reality Graph | KEEP_OWNER | only qualified identity/relation promotion |
| `persons` / `identity_edges` | Person identity fabric | KEEP_OWNER | through Person owner only |
| `research_items` / `user_research` | personal workspace/state | KEEP_OWNER | personal state only |
| `posts` / `post_revisions` | authored/publication source | KEEP_OWNER | through Post owner |
| `gematria_words` / `gematria_methods` | Gematria expression/method authority | KEEP_OWNER | through Gematria owners only |
| `research_contributions` | community/research contribution input pipeline | KEEP_OWNER | yes as contribution input, never as replacement Truth store |
| `channel_updates` | source ingress + active broadcast/media surface | KEEP_SOURCE | source/runtime writes only; extracted meaning routes to Research OS |
| `gallery_images` | media representation + historical placement + active gallery/media surface | KEEP_SOURCE | media/source placement only; research meaning routes through adapters |
| `wa_bot_log` | raw WhatsApp interaction/provenance + timeline input | KEEP_SOURCE / HYBRID OPERATIONAL | raw interaction only; research meaning routes to Research OS |
| `wa_deep_queue` | WhatsApp processing queue + historical timeline input | COMPATIBILITY / HUMAN_REVIEW | operational only; no new semantic authority |
| `wa_vip_inbox` | raw VIP-author source intake | KEEP_SOURCE | source intake only |
| `wa_msg_ext` | WhatsApp metadata/dedup index | OPERATIONAL_RUNTIME | operational only |
| `wa_message_status` | delivery/stuck/reply state | OPERATIONAL_RUNTIME | operational only |
| `contributor_content` | legacy contributor presentation silo | REVIEW_FOR_RETIREMENT | no new 2029 semantic authority |
| `gematria_wall` | live/high-volume purpose not yet reconciled to a canonical 2029 owner | NEEDS_ADJUDICATION | do not expand until owner is resolved |
| `raw_gematria` | historical/high-volume raw store without proven current semantic owner | NEEDS_ADJUDICATION | do not expand until owner is resolved |

## Retention safety

Logical control classes (not DB enums):

- `PROVENANCE_PROTECTED`
- `ACTIVE_SOURCE`
- `BOUNDED_RUNTIME`
- `PURGE_CANDIDATE`
- `HUMAN_REVIEW`

Age, `done`, `hidden`, or another terminal operational status is never sufficient for deletion.

The required destructive flow is always:

`PREVIEW / DRY RUN -> dependency + provenance proof -> explicit governed PURGE`

The current implementation intentionally provides **only** the preview/health half through `public.admin_retention_preview()`. There is no delete RPC and no purge cron in this package.

## Current WhatsApp calibration

- `wa_bot_log`: direct Research OS `source_ref` references exist; historical timeline consumers also read it.
- `wa_deep_queue`: all current rows are terminal, but live code still reads completed rows for historical timeline/context, and Research OS can reference individual rows. Therefore terminal != purge-safe.
- `wa_vip_inbox`: raw VIP-author source material feeds extraction/attribution; protected by default until downstream typed provenance is sufficient for replay.
- `wa_msg_ext`: metadata/dedup only, no message text; candidate for future bounded retention after reader/audit proof and a separate duration decision.
- `wa_message_status`: operational state; future bounded cleanup may be possible, but no duration is guessed here.
- `channel_updates`: active source/product surface with Research OS provenance references; no blanket cleanup.

## Control Center contract

The Admin/Command Center should project, not own, retention state. It may show:

- row count and growth,
- oldest/newest row,
- placement role,
- retention class,
- protected/reference count,
- unknown-dependency count,
- cleanup preview,
- why an item/table is protected.

Any future `Purge` action remains separately Human-Gated and must be reference-aware, idempotent, auditable, privacy-safe, and recoverable.
