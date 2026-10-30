# ELS lexicon and structure protected Preview

Actor GPT · recipient ZURIEL · task ELS_LEXICON_STRUCTURE_PREVIEW_20261030.
Explicit user request: include the implemented additions in Preview.
Base `bbd98735d0902f9c1626ba442119899d4c168c9b`, verified local and remote.
Branch `gpt/els-lexicon-structure-preview-20261030` is isolated from that base.

## Bounded BEFORE

Read AGENTS, CLAUDE, owner routing, Preview worker/builder and tests. Canonical
Supabase connection is `supabase_read_only_user`; relevant live latest-per-task
ownership and active scopes checked. No overlapping Preview writer found;
the active Gallery scope explicitly excludes config/ELS/Frame/Providers.
This document is the passive coordination receipt, not a live work_log write.

Only the exact named branch is added to the existing reading/account Preview
allowlists. The generated worker is byte-identical to the previous approved
account Preview. No new model, server, transport or permissions. A stale test
that assumed the original activation branch was first in a Set now checks its
explicit membership; all denial/authorization assertions remain.

The feature base contains Research-only explicit lexical scan and structure/
snapshot comparison. Classic is unchanged. Dictionary loading is explicit.
Local lexical results are temporary, not durable background jobs. Existing
Fable and account paths are retained, not redeployed or exercised with paid AI.

## Predeployment verification

- Preview/activation/account guards plus exact lexical unit tests: 31/31.
- Integrated Preview build, ordinary Legacy and 2029 builds: pass, real packages.
- Built dependency graph/budget, isolation, hardening, Legacy Production lock,
  git diff check: pass.
- Feature-base acceptance: Native 52/52 and focused 41/41, recorded in
  `els-explicit-lexicon-scan-20261030.md`; no feature runtime changes in this cut.
- Additional current-branch browser and hosted acceptance recorded below after completion.

## Release boundary

Vercel project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, team
`team_vtfWHZfKvdbob8gvynQb5N89`; protected Preview only, no target=production,
promotion, alias reassignment, project settings, Edge deploy, migration or product DB write.
Previous deployment `dpl_FcsDSryQaULMZQ6kZ41cvvSTgkkb` remains historical.

Before deployment all four aliases (`sod1820.co.il`, `www.sod1820.co.il`,
`sod1820.vercel.app`, `sod1820-sod1820-s-projects.vercel.app`) point to
`dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`. This already differs from the historical
AGENTS pin; do not repair or reassign aliases. Remote main is unchanged at
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

Preview retains the existing live Supabase client and narrowly admitted
authenticated actions. It is **not** an isolated AI/backend environment.
Hosted smoke must not initiate models, save records or mutate live product data.

## Protected Preview AFTER

Runtime SHA `fb9a2bf8278f09da9e0ba005463d024cc4ebc3b7` deployed to
`dpl_Apyh7Z2ucZEALdZxnwtwD85VTvWt`, target **null / Preview**, status READY.
URL `https://sod1820-gv8on8e8t-sod1820-s-projects.vercel.app/code?mode=research`.
The temporary share link is delivered privately in the user conversation and
is intentionally not committed. Deployment protection remains enabled.

- Hosted `preview-identity.json` returns 200 and exact runtime SHA/branch,
  the unchanged account/reading transport and `edge_deploy:false`.
- Current branch real-tool browser: 3/3 (structures, explicit lexical scan,
  cancellation), no skips, 320/390/1440 in three presets. Exact replay/admission
  uses declared verification fixtures and actual canonical corpus/tool, not live writes.
- Built global Raziel responsive browser: 1/1, twelve width/preset combinations,
  mixed Hebrew/English, keyboard/touch, no automatic AI, one fixture submit.
- Hosted Chromium: nine width/preset combinations, both disclosures present and
  open, global Raziel window in viewport, no page horizontal overflow or page errors.
  Zero model requests and zero dynamic dictionary/verse-word-list requests from opening,
  mode entry or reload. All non-GET/HEAD/OPTIONS requests blocked by test harness;
  no live login, save, paid AI or scan was exercised in this smoke.
- Screenshots inspected at 320/day and 1440/day. Browser API identity read uses
  the existing browser proxy path; the harness does not print protection cookies.
- Four production/default aliases re-read after deployment: unchanged at
  `dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`; remote main unchanged at the SHA above.

Later receipt/test-only commit does not change the deployed runtime. Files in this cut:
`scripts/lib/matrix-raziel-preview.mjs`, two existing Preview tests, hosted smoke
`test/els-lexicon-structure-preview.browser.mjs`, and this receipt. No source UI,
engine, server, DB/RLS, model, account policy or experiment ledger edits.

Status: IMPLEMENTED / TESTED / PROTECTED PREVIEW READY, not merged/Production.
Scope released with this passive AFTER to ZURIEL only; no live work_log write claimed.
