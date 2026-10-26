# Research item hint private media — branch handoff

Task: `LIFE_JOURNEY_PRIVATE_HINT_MEDIA_AND_ENTRY_CONTINUATION_20261026`

Status: implemented and tested on an isolated branch only. This document is evidence, not deploy approval.

## Identity

- Combined base: `83da5b2c6bb4f09df2ccaa7771122fd6805dea74`
- Branch: `gpt/2029-research-item-hint-private-media-server-20261026`
- PR #1175 source `b863b6fde1304bf9c33b05011764f58a4541efd1`: verified ancestor of the base; not reimported.
- Migration: `supabase/migrations/20261026212450_research_item_hint_private_media_v1.sql`, created with pinned Supabase CLI `2.122.0`.

## Implemented boundary

- Reuses `submission-inbox`, `media-upload-intent`, TUS and `research_items`.
- Adds `research_items.media` as a server-managed JSON array of opaque object and upload-intent references.
- Adds owner-only issue, verified-readback, bind, 60-second read, detach, delete and retry actions to the existing Edge function.
- Uses HMAC receipts to bind every transient action to the authenticated user, exact hint and exact server-generated object intent.
- Adds service-only RPCs; `anon` and `authenticated` have no execute privilege. A non-owning administrator receives no hint-media exception.
- Prevents direct JSON manufacture, clearing, moving and direct deletion of a bound hint. Existing non-media hints and other research buckets retain their existing behavior.
- Prevents cross-hint, hint/contribution, channel and gallery object reuse. A detached opaque intent tombstone also prevents an outstanding upload token/receipt from recreating and rebinding the removed association. A contribution-media trigger serializes and rejects a later cross-source claim.
- Keeps detach and item deletion recoverable with unreadable `cleanup_pending` / `delete_pending` tombstones until Storage API deletion succeeds.
- Provides a service-only dry-run orphan projection. It has no cleanup executor, cron or approved retention TTL.
- Adds no table, bucket, provider, store, public gallery path, AI action, ELS action or Raziel action.

## RPC signatures and grants

The following are `SECURITY DEFINER`, use a bounded search path and grant execute only to `service_role`:

- `private_research_item_hint_media_owner_check(uuid, uuid)`
- `private_research_item_hint_media_bind(uuid, text, text, bigint, text, uuid)`
- `private_research_item_hint_media_access(uuid, uuid, uuid)`
- `private_research_item_hint_media_detach(uuid, uuid, uuid)`
- `private_research_item_hint_media_finalize(uuid, uuid, uuid)`
- `private_research_item_hint_delete(uuid, uuid)`
- `private_research_item_hint_delete_finalize(uuid, uuid)`
- `private_research_item_hint_media_cleanup_access(uuid, uuid, text, text, uuid)`
- `private_research_item_hint_media_orphan_preview(integer)`

The validation helper is pure and executable by `authenticated` and `service_role` only because PostgreSQL evaluates it from the `research_items.media` check constraint. The trigger helpers and reference counter are not client-callable.

## Privacy and failure semantics

- The JWT is resolved server-side on every request. Request-body actor/admin claims are never used.
- The application response exposes the physical path only during the already-required signed TUS upload issue. It is absent from hint persistence, read/bind/detach/delete responses, URLs, logs and telemetry.
- Signed read URLs are returned transiently with a 60-second lifetime and `Cache-Control: private, no-store`.
- An issued signed URL remains a bearer capability until its short expiry; detach does not falsely claim retroactive revocation.
- A failed binary deletion leaves the binding unreadable and produces a signed retry receipt. Deleting a hint is finalized only when every referenced Storage object is absent.
- Public `gallery`, `community_hints`, `research_contributions` and AI/research entry points receive no upload side effect.
- Principal changes cannot reuse issue/verify/bind/cleanup receipts because user id and hint id are signed and checked against the JWT on every action. UI-side abort-on-account-change remains part of the later frontend slice.

## Test evidence

- `node scripts/test-media-upload-runtime.mjs` — receipt tamper/expiry/principal/phase tests, existing upload and TUS retry compatibility, no-store and no AI/ELS/Raziel/public-gallery route assertions.
- `scripts/run-research-item-hint-private-media-sql-test.sh` — disposable PostgreSQL 15 apply/rollback, grants/RLS, owner/foreign owner/non-owning admin, forged JSON/metadata, cross-source binding, read, detach, delete, retry and dry-run retention cases.
- `scripts/test-research-sync.sql` in disposable PostgreSQL — existing Research Sync acceptance remains green.
- `node scripts/test-research-sync-provider.mjs` — existing provider/principal behavior remains green.
- Edge source parse/bundle check using esbuild with the `jsr:` dependency externalized.
- Normal build (Legacy + 2029) and the integrated Preview configuration build passed.
- Built graph passed with 51,532 gzip bytes recovered; Raziel request and Research Plan remain lazy.
- Hard isolation, cheap hardening, Legacy Production Lock, integrated Preview auth guard (5/5) and cumulative `git diff --check` passed.
- Life Journey browser checks passed at 320px, 390px and 1440px across light, parchment and dark; the slice changes no frontend code. The login/exact-return check passed at 390px and 1440px without overflow or a reload loop.

## Rollback

The focused SQL suite applies the migration inside a transaction, exercises it, rolls back, and proves both `research_items.media` and the new RPC signatures are absent afterward. No live rollback was needed because there was no live apply.

## Release state

- `LIVE_APPLY: NO`
- `EDGE_DEPLOY: NO`
- `MERGE_TO_MAIN: NO`
- `HOSTED_PREVIEW: NO`
- `PRODUCTION: NO`
