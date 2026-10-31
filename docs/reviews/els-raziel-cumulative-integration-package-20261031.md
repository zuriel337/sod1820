# ELS / Raziel cumulative integration package — 31 October 2026

Task `ELS_RAZIEL_CUMULATIVE_INTEGRATION_PACKAGE_20261031`. Actor GPT, passive
handoff to ZURIEL. This is an integration package over existing code. No feature
was rebuilt and no central branch was modified.

The single authoritative delivery manifest is
[`els-raziel-cumulative-integration-package-20261031.json`](els-raziel-cumulative-integration-package-20261031.json).
It contains all ordered full commit SHAs, parents, per-cut capabilities/files/tests,
13 dependency stages, 178 file fingerprints and target states, local imports,
shared function adaptations, server/schema requirements, evidence and remaining gaps.
This guide explains how to use that manifest; it is not a second commit list.

## Exact source and target evidence

| Role | Branch | Verified HEAD |
| --- | --- | --- |
| Frozen product source | `gpt/raziel-content-comparison-follow-handoff-20261031` | `4ea9ac370bd8a873d96dd8f4cb13c2a5515ad468` |
| Package only | `gpt/els-raziel-cumulative-integration-package-20261031` | Final package commit supplied in delivery |
| Central Books target | `gpt/2029-central-books-ahavat-integration-20261031` | `14b3b14fa09ee7c0654b1431b8792d45b61170fc` |
| World handoff target | `gpt/elections-world-seed-integration-20261030` | `d52ff6b834fbbaf69d2fa79177750c4bdf73c2ad` |

Both merge-bases are `618cbe4fe31435696640a9d9a5f93df1da074864`.
The cumulative range excludes this already-existing common ancestor and includes
**75 commits: 74 ordinary commits and one merge; 178 changed files**. Before the
last four commits, the range is the reported 70 ordinary + one merge / 169 files.
No exact nonmerge patch-equivalence was found in either target. This does not
mean their newer shared-file behavior is absent or should be overwritten.

The four final commits are included at positions 72–75. They cannot be applied
alone to a central tree missing the earlier matrix-reading/session/jobs/action
modules. The source below `cb7536c28d241c2f93fc4741288bd5ef1ffbcd58` is part of
this delivery, not an assumed dependency already integrated by someone else.

137 of the 178 changed paths are absent in each target, including documentation
and tests. 107 relative module dependencies outside the delta were checked to
exist in the common base and both targets. The four changed paths also modified
by the named targets are SystemFrame2029, razielSessionSeam2029, supabase.js and
the Preview builder. Target blob fingerprints are recorded for a fresh drift check.

## Accepting the code without replacing current central work

1. Fetch source and package branches. Recheck their exact SHAs and the chosen
   central HEAD. Read AGENTS and live ownership. The central owner chooses the
   combined target; this package has not combined Books and World itself.
2. Create an isolated branch from that approved central HEAD, preserving dirty
   work. The ordered list is provenance/dependency order, **not an automatic
   cherry-pick script**. Compare current target blobs with `FILES` first.
3. Port C01 through C13 in dependency order. For ELS-owned paths unchanged since
   the common base, use the cumulative `git diff` restricted to explicit paths.
   Review each patch before applying. Merge shared files by the functions in
   `SHARED_FILE_ADAPTATIONS`; preserve the current file and unrelated additions.
4. Merge the canonical tool template, then regenerate `public/tzofen.html` with
   the existing `tools/els/build.py`. The generated file is not an independently
   maintained engine. Preserve corpus identity and generated lexicon assets.
5. Preserve the experiment ledger additively. Source contains EXP-01..18 plus
   EXP-20 and notes; it does not contain every later Claude experiment. Keep any
   newer central/experiment records, their failures and provenance. Do not replace
   a more complete ledger with this older copy or treat its old status prose as
   the current implementation contract.
6. Run central acceptance on the combined tree and return the integrated HEAD.
   No merge to main, Preview, Edge deploy or live migration is authorized here.

The source's one merge is `4d9700ed6981f426ad8ef0b7f40c8d070e9eda58`, parents
`679e46c39819a99c7272ed50c58a983c3efb7f4e` and
`82491eb4acbcbec7b9c63b28aeb557ed594a54ed`. Its first-parent patch is exactly
equivalent to the side range `63e430113..82491eb4`: stable patch ID
`8e0d1d7be3a5c929f7594081b923643a465f8ba5`. Adopt the side branch's two commits
(positions 20–21) once; retain the merge as provenance. Applying those commits
and then `cherry-pick -m 1` of the merge duplicates the same layer.

## Shared-file decisions that protect the central version

- **SystemFrame2029:** transfer activity projections, same-session scan progress,
  exact-return/cancel controls, truthful saved/account status and responsive chat
  rules into the current Companion/Workspace/Command Island. Preserve the central
  one-bar composition, Books navigation, World source links, theme header, Preview
  disclosure and user tab choice. The older source `IntroResearchContext2029`
  spans must not replace World handoff's clickable exact-source/current/previous links.
- **RazielSessionProvider2029:** extend existing submit with the two closed ELS
  actions, progress hooks, cancel ref and request-aware normalization. Keep one
  Provider/thread, principal isolation and the lazy request builder.
- **ResearchProvider:** add `useElsResearchOperation` inside the existing principal
  owner; observe only trusted current iframe state before history dedup. Preserve
  cloud/path sync. Non-AI tasks remain transient; the durable Fable jobs stay in
  their existing server repository.
- **razielSessionRequest2029:** transfer bounded matrix/action validation, exact
  phrase/scope/occurrence, owned reading UUID and stale-selection guards. Keep
  canonical navigation, one-shot Bundle gates, companion and saved continuations.
- **supabase.js:** adapt `askRaziel` only. Keep one invoke route, lazy polling and
  matching server receipts. Preserve the central gallery public-source readers,
  cache/coverage/error semantics and all other helpers.
- **ai-analyze:** adapt closed planning/reading branches, replay, durable receipt
  and owned-result projection inside the existing handler and gates. Keep every
  other persona, numeric/source/companion route and safe server action registry.
  The content-comparison fix comes through the same shared question gate.

The manifest also identifies reducer/saved-message/seam/CSS adaptations. Prefer
the newer central `publicContextLabel`, `contextDisplayTitle`,
`contextDisplayPosition` and `contextNavigationItems2029`, extending only missing
ELS cases. No second label system, context, session, transport or engine.

## Historical Preview and activation changes

Ten commits are marked `HISTORICAL_PREVIEW_ONLY`; mixed commits have explicit
per-file policies. Their old exact branch allowlists, live-backend worker forwards,
private-sync exemptions, notices and deployment IDs are historical evidence.
The current central Preview policy must remain authoritative. This package does
not add a new allowlisted branch or produce a Preview.

`e20e1d08355cbfb9d985e78e221692d260b9c37d` also changed ai-analyze's operational
default to `on` for a bounded administrator trial when the environment value is
absent. That activation is **not an essential runtime dependency**. Review it
separately and retain explicit central enablement; do not inherit default-on by
copying the old handler. Original historical acceptance of that default is not
proof of current central release permission.

## Server and schema compatibility

Canonical search, replay and the existing bridge/core must remain compatible.
Ordinary occurrence questions need a compatible server receipt. Fable uses the
same ai-analyze route, canonical Torah stream and verifier, plus the existing
private technical jobs table/RPCs. Client presentation context is at most 12×20;
the paid reading's 33×41 window is rebuilt from the canonical server stream.
UI currently requests cap25; shared experimental defaults still include cap60.
The client build setting `VITE_ELS_MATRIX_READING_MODE` defaults to off unless it
is explicitly `preview` or `on`; the server and current Preview forwarding policy
are separate requirements.

The existing migration is
`supabase/migrations/20261029125427_els_matrix_reading_durable_jobs.sql`.
It is delivered as code only. At **2026-10-31 09:24:41 UTC**, canonical read-only
metadata shows the jobs table with RLS, no policies, no anon/authenticated SELECT,
and all six named RPCs with SECURITY INVOKER, empty search_path and service-only
execution. No private rows were read. This proves existence/observed ACL, not
source-definition parity, migration-history parity or the deployed Edge version.
Do not rerun its non-idempotent CREATE TABLE against existing objects.

Missing schema yields `reading_job_storage_unavailable` and no new paid batch.
Unknown/lost dispatch stays locked; it is not permission to pay again. An old
handler that ignores the new fields fails the client's receipt check. Availability,
admin, model, cost acknowledgment and explicit environment policy remain gates.
The manifest lists the exact prerequisites and refusal behavior for each capability.

There is no worker/cron to guarantee collection after a closed tab. Explicit return
collects durable Fable work; non-AI tasks do not survive Reload/account switch.
Global Raziel remains busy while a reading is followed. Saved conversation identity
does not yet rebind Frame focus automatically. Discovery quality, E statistics,
cost/FX inconsistencies and later Claude prompt improvements remain as documented.

## Tests and remote-delivery evidence

The manifest keeps test results attached to their actual source cut. In particular:

- Latest source regression: **743 total / 733 pass / 10 fail**, zero skips. All ten
  failing source-assertion titles reproduced on its clean base. Nine new routing
  tests pass. Built chat Browser and 38 Follow cases pass.
- Earlier ELS follow-up: 189 focused and 100 shared tests pass; broad ELS is
  **444 / 433 pass / 7 baseline fail / 4 local-Postgres skips**. The mocked-clock
  reading harness instability is recorded, not claimed fixed by a serial pass.
- Exact-ready repair's historical full Native acceptance is 67/67 at that cut.
  It is not represented as a newly rerun full Native result at SOURCE_HEAD.
- Actual final-source Legacy/2029 builds and bundle/lazy/isolation/hardening/Legacy
  lock passed in their receipts without stubs. Earlier stub-based evidence is
  separately identified. No sums across overlapping historical suites.

No product suite, browser, build, local SQL or paid model was rerun merely to
produce this documentation package. The read-only package verifier checks graph,
parents/order, all path/blob fingerprints, dependency closure, merge equivalence,
scope and optional origin/fresh-fetch proof. The central session must rerun the
required acceptance after its actual merge-by-function work.

A fresh bare fetch from GitHub at depth100 included all 75 required commits, the
common prerequisite and every source blob for the 178 paths; fsck connectivity
passed and no missing objects were found. Remote source HEAD remains exact.
The temporary verification directory is not the handoff. The origin branches
carry the data, so no inaccessible local bundle is required.

Fetch all four named branches so the verifier also has both target snapshots;
this does not switch or reset an existing worktree:

```sh
git fetch origin \
  gpt/raziel-content-comparison-follow-handoff-20261031 \
  gpt/els-raziel-cumulative-integration-package-20261031 \
  gpt/2029-central-books-ahavat-integration-20261031 \
  gpt/elections-world-seed-integration-20261030
```

Use a separate checkout/worktree of the exact package commit for the audit,
leaving the central working directory intact. From that package checkout,
before central integration:

```sh
node scripts/verify-els-cumulative-integration-package.mjs --check-origin
```

Package verification passed with both `--check-origin` and the independent fresh
remote copy: 75 commits, 178 source/target file fingerprints, 107 existing base
imports, 13 ordered capability stages, the merge duplicate-content proof and zero
product changes. `node --check`, Legacy Production lock and diff check also pass.

The verifier intentionally rejects a product-changed checkout: run it on the
source/package branch, not after central integration. To repeat the independent
remote-object proof, initialize a separate bare temporary repository, fetch the
source branch to `refs/heads/verified-source` at depth100, then pass its absolute
path with `--remote-copy=<path>`. Both targets already contain the common ancestor;
history earlier than it is an explicit prerequisite, not a missing delivery.

## Ownership and next handoff

Dedicated canonical read-only coordination was checked before writing; no claim
overlaps these three new package files. Existing World/Home/Follow writers and
all central product files remain untouched. No live BEFORE/AFTER was written:
the connector is read-only. The existing authorized coordinator can record this
passive receipt to ZURIEL with dispatch NULL. No ownership of product files is
retained or released by this documentation task.

Return after central work: CENTRAL_BRANCH, CENTRAL_BASE_SHA, CENTRAL_HEAD,
which slices were applied/equivalent/excluded, shared-function resolutions,
schema/server readiness, precise tests/failures and remaining gaps. That exact
integrated HEAD is the continuation base for ELS.
