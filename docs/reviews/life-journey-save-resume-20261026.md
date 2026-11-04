# Life Journey — private save and resume consumer

Task: LIFE_JOURNEY_SAVE_RESUME_20261026

Actor: GPT · handoff to ZURIEL

Owner: existing Person Foundation v6 / Research Workspace v5

Base: `e9ba5eff9c2a5fda7c4efff0b850a08a15db52df`

Branch: `gpt/life-journey-unified-synthesis-pack-v1-20261026`

## Scope

The existing Research Context now retains the chosen map, birth-map lens and selected person as allowlisted IDs/reference-only dimensions. Refresh and exact return preserve that position; deleted/unselected/foreign references cannot become the active person. Profile name, date, birth time and place remain in the existing private Person Ledger. Temporary calculated birth charts remain session-only in the existing parent Map; they are not copied into Context or Path snapshots.

A 2029-only save/resume consumer uses the existing ResearchProvider actions and canonical Research Path RPC adapters. No Provider/runtime/engine/store or persistence format was introduced. Save success requires an exact scoped private receipt with valid Path/revision IDs and the saved family selection, map position and existing sanitized findings snapshot. An incomplete or stale `ok:true` is not a saved checkpoint. An unrelated active Path root is rejected.

An explicit repeated save queues one bounded checkpoint in the existing Path draft when navigation deduplication would otherwise return the previous revision. Failed attempts retain the draft rather than creating a separate recovery store. Provider-owned retry/revision/idempotence behavior is unchanged.

Explicit resume rejoins the existing sanitized findings snapshot with the currently authorized private Ledger. It restores the family summary and focused person/map without automatic name, source, ELS, normalized-message or birth-chart execution. This also fixes an ordering race between the Provider's Context replacement and the consumer's local result reset.

## Verified live contracts — read only

The dedicated `supabase_read_only_user` reader verified the canonical project and current coordination. Bounded scope/path checks found no overlapping live writer. No work-log or product data was written.

Existing live `fn_research_path_append_v1` derives the caller from `auth.uid()`, checks Path ownership, requires revision consistency and uses an idempotent save key. New Path state is private. Existing `fn_research_path_resume_v1(p_path_id uuid default null)` reads only the authenticated owner's Path. Existing profile/member upserts already accept the private metadata fields used by the UI; no migration is required. No live write or actual user save/resume was executed for verification.

Remote main remained `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; the approved ELS integration ancestor remains present. Main was not imported, merged or pushed.

## Preview boundary

The hosted Preview remains deliberately read-only. Its unchanged worker blocks **both** `fn_research_path_append_v1` and `fn_research_path_resume_v1`; UI controls explicitly reflect that boundary. Account save/resume is implemented on this branch and tested with a synthetic backend transport, **not enabled or verified against live account data**. Refresh/exact return through the existing session Context works independently of account checkpoint persistence.

Enabling account save/resume is a separate integration/release decision. This change does not weaken the Preview guard, modify DB/RLS/grants/site flags, or authorize live product writes.

## Verification

```sh
node --test src/lib/research/lifeJourney*.test.js src/lib/research/researchPathContinuity.test.js test/life-journey-2029-chain.test.mjs
LIFE_JOURNEY_CHART_SCREENSHOT_DIR=/tmp/life-journey-resume-20261026 node --test test/life-journey-person-context.browser.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
git diff --check
```

Results: Life Journey + continuity **69/69 PASS**; expanded browser chain **1/1 PASS**; auth/read-only guard **5/5 PASS**; normal dual build and integrated Preview build **PASS**; hard isolation, Legacy lock, built graph and diff check **PASS**. Eager gzip recovery is **75,773 bytes**, above the required 12,288. Existing chunk/deprecation warnings remain; Raziel request and Research Plan remain lazy.

Browser checks exercise denied save, incomplete receipt, valid receipt, repeated changed checkpoints, a new session with only the saved backend Path, focused child/date restoration, the family summary, finding exact return and zero automatic research on resume. The real Path adapters run against fixture transport only. Saved representations exclude raw name/date/time/place/timezone/coordinates. Controls fit 320/390/1440px, three presets and 44px targets; captures contain synthetic data only. A worker-source simulation separately confirmed both Path RPCs remain blocked without forwarding or network access.

No new Person/Journey/hint store, graph, ELS/Raziel engine, Research Context, public-source integration, migration, DB/RLS change, site flag, main merge or Production deployment.

Status: IMPLEMENTED + TESTED + branch-only PR_READY. Live account checkpoint verification remains explicitly deferred.
