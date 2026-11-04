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
- The signed TUS upload issue necessarily exposes its server-generated physical path for the transient upload transport. HMAC issue/binding/cleanup receipts are signed base64 JSON, not encrypted or opaque capabilities; their payload includes that path. They must remain transient and must not be persisted in hint records, metadata or browser storage, or written to logs or telemetry. Persisted `research_items.media` contains only opaque object/intent ids and bounded semantic fields; signed read URLs are also transient.
- Signed read URLs are returned transiently with a 60-second lifetime and `Cache-Control: private, no-store`.
- An issued signed URL remains a bearer capability until its short expiry; detach does not falsely claim retroactive revocation.
- A failed binary deletion leaves the binding unreadable and produces a signed retry receipt. Deleting a hint is finalized only when every referenced Storage object is absent.
- Public `gallery`, `community_hints`, `research_contributions` and AI/research entry points receive no upload side effect.
- Principal changes cannot reuse issue/verify/bind/cleanup receipts because user id and hint id are signed and checked against the JWT on every action. UI-side abort-on-account-change remains part of the later frontend slice.

## Test evidence

- `node scripts/test-media-upload-runtime.mjs` — receipt tamper/expiry/principal/phase tests, existing upload and TUS retry compatibility, no-store and no AI/ELS/Raziel/public-gallery route assertions.
- `scripts/run-research-item-hint-private-media-sql-test.sh` — disposable cached PostgreSQL 17 apply/rollback, grants/RLS, owner/foreign owner/non-owning admin, forged JSON/metadata, cross-source binding, read, detach, delete, retry and dry-run retention cases. The runner explicitly selects the local Docker socket, refuses image pulls, uses `--network none`, exposes no host ports and mounts the repository read-only.
- `scripts/test-research-sync.sql` in disposable PostgreSQL — existing Research Sync acceptance remains green.
- `node scripts/test-research-sync-provider.mjs` — existing provider/principal behavior remains green.
- Edge source parse/bundle check using esbuild with the `jsr:` dependency externalized.
- Normal build (Legacy + 2029) and the integrated Preview configuration build passed.
- Built graph passed with 51,532 gzip bytes recovered; Raziel request and Research Plan remain lazy.
- Hard isolation, cheap hardening, Legacy Production Lock, integrated Preview auth guard (5/5) and cumulative `git diff --check` passed.
- Life Journey browser checks passed at 320px, 390px and 1440px across light, parchment and dark; the slice changes no frontend code. The login/exact-return check passed at 390px and 1440px without overflow or a reload loop.

## Rollback

The focused SQL suite applies the migration inside a transaction, exercises it, rolls back, and proves both `research_items.media` and the new RPC signatures are absent afterward. No live rollback was needed because there was no live apply.

## Central acceptance correction and fresh isolated checks

The media JSON validator now explicitly rejects missing and JSON-null `state` instead of allowing SQL's unknown value through its invalid-row filter. Six added SQL assertions cover missing/null/unknown rejection, all four valid lifecycle states, and actual table-constraint rejection of missing/null state. The latter run as the fixture table owner, so they prove the check constraint itself works independently of the server-managed trigger. No function grants, RLS policies or media action semantics were changed by this correction.

Fresh acceptance after this correction:

- Existing media upload/TUS/receipt runtime acceptance passed.
- The expanded private-media SQL apply/rollback suite passed all 50 assertions on cached PostgreSQL 17.11.
- The complete existing Research Sync SQL fixture passed all 36 assertions with the media migration installed before its first user write. Fixture prerequisites were composed outside the repository; the original synchronization assertions were unchanged.
- Both existing ELS suites passed with the media schema/guards installed: public-save/private-draft isolation (F3 S1/S2), and private-save/ownership/publication compatibility.
- The existing mounted ResearchProvider suite passed 10/10 with one consistent React 19.3.0 test installation. Test-only helpers used an isolated temporary npm prefix and resolver; application dependencies and lockfiles were untouched.
- The Edge source bundled successfully with esbuild 0.28.2 and the `jsr:` dependency externalized. This is a parse/bundle check, not a deployed Edge or live authorization claim.

All SQL checks used disposable containers selected through the local Docker socket, `--pull=never`, `--network none`, no host ports and read-only source/evidence mounts. The containers were stopped and removed. Logs and generated compatibility fixtures are under `/workspace/artifacts/central-els-hint-media-world-20261026/media/`. No live Supabase call executed these migrations, SQL fixtures or media actions.

## Release state

- `LIVE_APPLY: NO`
- `EDGE_DEPLOY: NO`
- `MERGE_TO_MAIN: NO`
- `HOSTED_PREVIEW: NO`
- `PRODUCTION: NO`
