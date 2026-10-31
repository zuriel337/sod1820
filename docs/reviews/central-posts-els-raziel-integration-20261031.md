# Central Posts + cumulative ELS/Raziel integration — 2026-10-31

Task: `CENTRAL_POSTS_ELS_RAZIEL_CUMULATIVE_INTEGRATION_20261031`.
BEFORE: `4afddf4c-08f6-4bba-92bc-fb8736a167bc`. Passive GPT → ZURIEL, dispatch NULL.

## Exact inputs and method

- Central branch: `gpt/2029-central-posts-els-raziel-integration-20261031`.
- Central base: `14b3b14fa09ee7c0654b1431b8792d45b61170fc` (accepted Books/earlier World base, not main).
- Posts: `gpt/posts-integrated-backgrounds-20261030` / `b65ef2109048069bce29d38e538e0abcd6d9b41e`.
- Posts real no-ff merge: `8c9e0140eec6f22e033c52caf2639e5c1e401991`, parents central base and exact Posts source.
- ELS/Raziel: `gpt/raziel-content-comparison-follow-handoff-20261031` / `4ea9ac370bd8a873d96dd8f4cb13c2a5515ad468`.
- Package: `gpt/els-raziel-cumulative-integration-package-20261031` / `70e446fab2ccc960f9f08bfd2a86194bf8b53f38`.
- ELS cumulative boundary: `618cbe4fe31435696640a9d9a5f93df1da074864`.

All three remote source SHAs reverified. A detached package checkout passed
`node scripts/verify-els-cumulative-integration-package.mjs --check-origin`:
75 ordered commits, 178 paths, 107 base imports, 13 stages, shared dependencies
and the duplicate-content historical merge proof. The independent fresh-clone
verification in the package is source evidence; it was not separately repeated here.

Posts was merged once with ancestry. ELS was transferred once as an explicit
path-restricted cumulative delta, applied with three-way index reconciliation.
It was not a whole historical-branch merge or 75 blind cherry-picks. The ordered
75-SHA provenance and each source/integration fingerprint are in the adjacent JSON.
The historical merge content already represented by side commits is received once.
The comparison fix already in Posts was reconciled with the later matrix-aware guards.
Do not use absence of ELS ancestry as permission to replay this cumulative patch.

## Shared-file resolutions and exclusions

164 of the 178 manifest paths are byte-identical to the source. Eight are adapted;
one generated HTML is rebuilt from the canonical template. The other five are
historical Preview policy/test exclusions, detailed below and in the JSON.

- SystemFrame preserves central single command bar, source/context links, Hebrew
  identity labels, header theme selector, number entry, Books/World/Post navigation
  and Preview disclosure. Adds existing-session reading activity and non-AI task
  visibility to existing actions; no second fixed bar. Outside the ELS page, its
  existing Now action opens the running/completed research workspace when present.
- Seam combines central opaque-ID/URL filtering and exact identity/section titles
  with ELS prefix/hash filtering. Genuine English names remain unchanged.
- ai-analyze combines matrix replay/planning/jobs and owned follow-up context with
  central personal-area acceptance and Posts explanatory-comparison instructions.
  `ELS_MATRIX_READING_ENABLED` defaults OFF. The source administrator default-on
  trial is deliberately not adopted. Explicitly enabled fake-transport tests retain
  replay, ownership, availability and cost assertions; absent configuration now
  has an explicit denial assertion.
- supabase.js preserves central public gallery readers and incorporates only the
  request/transport delta. Provider, Research Context and ELS engine remain single.
- `public/tzofen.html` regenerated via `python3 tools/els/build.py`; not copied as
  an older artifact. Generated lazy lexicon retained its existing contents.
- Historical ELS Preview builder overrides and `scripts/lib/matrix-raziel-preview.mjs`
  are excluded. Existing central/Posts Preview policy is retained without ELS
  write exceptions. No Preview was built or deployed for this integration.
- Three tests that exclusively depend on excluded historical Preview exceptions
  are not imported: `els-fable-preview-activation`, `matrix-raziel-preview`, and
  `raziel-account-preview`. The latter's two independent saved-sync/map assertions
  are retained unchanged in `test/raziel-saved-sync-2029.test.mjs`.
- Two source test/helper trailing blank lines were removed; no assertion changed.
- Native browser acceptance follows the current central More menu for global search
  and exact tool return. It reveals the collapsed matrix display-options region
  before checking that Fit is disabled during pending verification. Same engine
  counts, stale-completion, canonical denial, touch size and identity assertions remain.
- A restrictive integration adaptation registers this exact new central branch in
  the existing static Preview read-only guard, with its existing negative auth/Person/
  ELS-write tests extended to that branch. A fresh live owner scan found no overlap;
  the existing BEFORE scope was extended explicitly. This closes a branch-identity
  gap without granting a Preview action or importing historical write exceptions.

## Actual verification

- Raziel non-browser: **668 total, 658 pass, 10 fail, zero skips**.
- ELS non-browser final: **440 total, 428 pass, 7 fail, 5 skips** (local PostgreSQL
  integration prerequisites unavailable; no live DB substituted).
- Posts/Follow/personal-area selection: **164 total, 163 pass, zero fail, 1 skip**.
- Central public-label/personal-area preservation: **13/13**.
- Default-off/shared server route: **8/8**, includes explicit-enable single-batch
  replay/recovery and missing-config rejection. External services are declared fakes.
- Legacy build and 2029 build: PASS with real dependencies, no stubs.
- Built graph/lazy: PASS, eager JS gzip **437,834 bytes**, **20,908 bytes recovered**
  above required 12,288 floor. Submit adapter/resolver and Research Plan remain lazy.
- Hard isolation, cheap hardening, Legacy Production lock and public language: PASS.
- Integrated Preview Auth Guard: **9/9**, including current central branch read-only denial.
- Full affected Browser rerun: **79/79**, zero failures/skips/cancellations,
  with `ELS_NATIVE_CACHE_DIR=/tmp/central-els-native-acceptance-cache` and serial
  test-file execution. Actual ELS tool/native corpus and built global app are used;
  model/auth/backend responses are declared intercepted fixtures, never paid calls.
  Includes 320/360/390/768/1440 where applicable, three presets, exact returns,
  manual selection/cross/continuation, reading jobs/cards, cancellation/principal
  isolation, account save→ACK→fresh-browser restore, and Posts→global Raziel.
- Follow Center Browser: **38 cases**, zero failures/errors/unexpected requests/live writes.
- Existing central single-command-bar Browser: **121 cases**, zero failures/page
  errors/model requests, all declared surfaces and presets; telemetry intercepted.
- Committed-source `package:ai-analyze`: PASS, **15 committed sources**, verify_jwt=true.

The earlier full Browser attempt was **76/79**. Two tests were adapted to the
accepted central More menu and collapsed Fit control; their original behavior
assertions were retained. The third timeout occurred at the tool-ready precondition
before the phrase search; isolated central and clean source runs both passed.
The final full 79-case rerun above passed with the existing separate-cache option.
This is one successful full acceptance run, not proof that all future harness
flakiness or real-device/network problems are eliminated.

Full browser logs: `/tmp/central-els-browser-acceptance.log`; earlier attempt:
`/tmp/central-els-browser-final.log`. Independent unit selections overlap and must
not be added into a synthetic global test total. Baseline/performance/source overlap
and preservation details are in `central-baselines-performance-audit-20261031.md`.
The current branch matches `gpt/*` automatic-deployment denial in vercel.json;
pushing this branch is not a hosted deployment.

The 17 old static source-shape failure titles were independently reproduced in a
clean source-package checkout (116 tests: 99 pass / 17 fail). The same selection on
central base 14b3b14 passes 116/116. Thus these are carried source-suite debt entering
the new central branch, not pre-existing failures on that central base. They are
not waived or described as a fully green suite. No assertions/budgets weakened.
Failure families: Raziel Phase B/C/D/I/K/L (10), ELS classic-faithful-port (4),
research-bar, semantic-surface, visual-representation (1 each).

`git diff --check` on the ELS/integration change passes. A full delta check against
14b3b14 flags CRLF line endings in two unchanged-from-Posts audit evidence CSVs:
`audits/posts-one-tree-20261031/CALCULATION_OCCURRENCES.csv` and `POSTS_MAP.csv`.
Their exact evidence bytes are preserved rather than silently rewriting the audit.
This full-base whitespace check remains a disclosed open item.

## Latest request: personal relevance — authorized interface audit

The existing consumer is `runRazielPersonal` in ai-analyze (Workspace v5 / Strategy
v17). It currently reads only `research_state_snapshot_v1` and
`fn_research_path_resume_v1` with the verified caller JWT. It does not consume Follow
or measured content activity. No new personal consumer is claimed as implemented.

Live metadata was checked read-only on canonical `linswmnnkjxvweumprav`; no private
preference rows or events were read. Explicit Follow already has a lawful owner:
`notification_prefs`, whose SELECT RLS is `user_id = auth.uid()`, plus existing
FollowCenter `readFollows` and `follow_subject_state`. `topics` and `updated_at`
exist. A timestamp on the whole preference row must not be invented as the time
of each individual Follow, and no email/channel/contact data belongs in model context.

The missing dependency is an authorized **current-principal, bounded content-activity
read** under existing Person / Traffic / Personal Relevance owners:

- `events`: RLS enabled; authenticated SELECT is not granted.
- `visitor_events`: authenticated SELECT policy is admin-only (`rd_is_admin()`),
  not a private user-history reader.
- Existing `activity_pulse`, `recent_number_opens`, `fn_ti_surface_activity` expose
  system aggregates, not this user's content history. Aggregate audiences cannot
  substitute for individual preference. No matching personal activity reader was
  found in the repository or targeted live routine metadata search.

A suitable existing-owner interface must resolve principal from caller auth,
check permission before joining Person/traffic identity, bound the time window
and item count, filter revoked/private sources, identify source and observation
window, and report missing/error/partial coverage distinctly from measured empty.
It must distinguish opens from confirmed reading; absence is unknown. Follow,
observed interest and recommendation remain separate. Account changes/revocation
must discard in-flight context before composition. An explicit Follow is not
consent to a delivery channel. No inferred weights, automatic subscription,
audience store, new Provider or service-role access to personal traffic is added.

Until that interface is verified, connecting both signals is **BLOCKED_BY_AUTHORIZED
ACTIVITY_READER**, not complete. No DB/RLS changes are authorized in this integration.

## Continuation base rules

Use the final pushed HEAD of this branch as the continuation base. The runtime
integration commit is `37db7b61b2c57939a5eded4ae18db16b87737a93`; later commits record
acceptance/test routing and restrictive guard registration, not a second ELS import.
Fetch and verify the exact final SHA before creating an isolated continuation branch.
Do not start again at 4ea9ac37 or replay the ordered 75 commits. Retain the default-off
experimental path and existing one Provider, chat, transport and canonical engine.
A source-only test pass or the old hosted preview is not proof this new SHA is deployed.

## Remaining release limits

- Historical source test debt above; live model quality and real-account cross-device
  sync remain unproven by synthetic browser coverage.
- Client owned ELS follow-ups require a compatible server/receipt before release.
  Schema/jobs metadata and existing deployments do not prove current source parity.
- The jobs migration is code only here; no live migration replay.
- Posts series-only SQL remains separately reviewable and unapplied; do not run
  the older combined category migration. Core category-name drift and real Auth /
  Follow accounts remain separate release gaps.
- Latest World d52ff6b8/Home-card delivery is not silently imported. Books already
  in the starting central baseline are retained. No ticker delivery is added here.

MERGE_TO_MAIN: NO · HOSTED_PREVIEW: NO · EDGE_DEPLOY: NO · PRODUCTION: NO · DB_RLS: NO.
