# Personal hints — central integration acceptance, 26 October 2026

Task: `INTEGRATE_PERSONAL_HINTS_ONE_TREE_ENTRY_20261026`.
Actor: GPT; passive handoff to ZURIEL.

## Integration

- Target: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
- Verified target base: `ea5736aba4aa9bca052beee87fe17015cb5ede14`.
- Source: `gpt/2029-personal-hints-one-tree-entry-20261026` / draft PR #1175.
- Source head: `b863b6fde1304bf9c33b05011764f58a4541efd1`.
- True merge: `81a95fcadff24e9ff87108cb9053cba710e98a2f`; first parent is the target base, second parent is the source head. There were no conflicts.
- Complete source range: 29 commits / 181 paths, including the released Workspace, Follow and Life Journey dependencies. The `5f2810e7` Workspace slice and all four private-hint commits occur once in the ancestry. No cherry-pick or separate PR #1174 adoption was performed.

The canonical read-only connection returned `supabase_read_only_user`. Bounded current-ledger checks resolved the relevant Workspace/Frame owners to their later releases rather than treating historical BEFORE records as active. No overlapping active writer was found. The read-only connector cannot record a BEFORE/AFTER; no live journal write is claimed. This document records the bounded integration and handoff without creating a new coordination system.

## Bounded correction found during acceptance

The supplied route page accepted its sanitized exact return only when the path started with `/2029`. Canonical World, Post and other App2029 routes also use unprefixed paths, so valid returns were lost. The existing `personalReturnHref` now supports an explicit `native2029` option for this consumer; its compatibility callers retain their previous behavior. The actual Life Journey page uses that option. Legacy `/profile`, external targets and malformed paths remain rejected.

Regression coverage mounts the actual LifeJourney2029Page and PersonJourney with synthetic boundary adapters. World/Post query and hash survive the Router-state handoff and reload, while the hints destination remains exactly `/2029/journey?focus=hints`. Opening, navigating and returning execute zero AI, Raziel, ELS, name/date or matrix operations. Existing hints continue to use `research_items`, bucket `hint`, owner-scoped reads and explicit capture/investigation/explanation actions.

## Fresh verification

- Focused private-hint entry, return sanitizer and two Chromium stories: 18/18 passed, no skips. The 320px private-hint view passed light/parchment/dark; the actual route-page story covers World/Post return, reload and rejected targets.
- Life Journey, Workspace, profile, notification, Follow and related source/browser checks: 172/172 passed, no skips. This includes the full Person/Name/Date browser story and Design V2 browser checks.
- Built actual-App Workspace acceptance: 14 scenarios passed, including nine viewport/theme combinations, guest/account transitions, stale hydration, saved conversations, exact source return, known zero and unavailable state. No page errors, model calls, unexpected writes, private telemetry or live requests. A first concurrent run timed out on synthetic touch scrolling; an unchanged isolated rerun passed the full suite. The timeout is not counted as a pass.
- Research Sync Runtime/Recovery/hardening: 72/72 passed. Mounted real React Provider: 10/10 passed.
- Research Sync actual migration/adversarial SQL: 36 assertions passed, including RLS, principal isolation, atomic rollback, duplicate batches and separate hint writes.
- Follow category/series SQL: 44 checks and changed-preimage rejection passed.
- Both SQL runs used disposable PostgreSQL 17.11 containers with `--network none`, no host ports and read-only repository mounts. Cached Docker Official Image: `postgres:17-bookworm`, image `sha256:e4bdd2f9eeabc0f516e1fa42c4acea97ae571f20877982ac082921b205a52618`, digest `postgres@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27`. Both containers were removed.
- Legacy and 2029 builds passed. Built graph passed: 130 reachable / 15 eager records; 407,210 eager JavaScript gzip bytes, 51,532 bytes recovered against the unchanged 12,288-byte requirement. Raziel submission and Research Plan remain lazy.
- System Frame, My Workspace, hard isolation, cheap hardening, public language 3/3, Preview Auth Guard 5/5, Legacy containment, Legacy Production Lock and whitespace checks passed.

## Existing failures and release limits

The broad Raziel run passed 591/594. Adding the separate four-test ELS consumer file gives 594/598, with the same four existing failures: J Post, J Topic, M Post golden and the bounded ELS consumer. Independent execution of the same 32-test diagnostic set on both the original base and integrated source returned identical 28 pass / 4 fail results. These failures have not been hidden or repaired in this integration.

Remote Research Sync run `40395213735` failed before checkout while pulling `public.ecr.aws/docker/library/postgres:17` with `toomanyrequests: Data limit exceeded`. The local cached-PostgreSQL run above completes its SQL and mounted-provider coverage; it is not a claim that remote CI became green. Remote ELS run `40395213804` fails on the same existing bounded ELS consumer.

Remote Public Core run `40395213817` passed 12/13 and failed the pre-existing account-card geometry assertion (desktop width 836 against a maximum of 520). Independent actual-App browser probes on both the original base and merged source at 1440px returned identical measurements: avatar 44px, account text 674.171875px, card 836px. Both relevant Workspace CSS files are byte-identical. This remains an inherited G4 release gap; no visual change or gate relaxation is part of the hints integration.

No deployment, hosted Preview, main push/merge, Production, Edge Function release, live migration, product DB/RLS, flags, publication, permission or privacy change was performed. The inherited Follow migration remains a file only. Missing live Community readers continue to fail closed. All integration and correction scopes are released at final handoff; no next slice is automatically activated.
