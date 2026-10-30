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

Status: tested branch, deployment pending.
