# Central 2029 — ELS, private hint media and World integration

Task: `CENTRAL_2029_ELS_HINT_MEDIA_WORLD_INTEGRATION_20261026`.
Branch: `gpt/2029-central-els-hint-media-world-integration-20261026`.
Base: `d6d6e8cb40e13146c9df9b90d6904267d8090261`.
Passive BEFORE: `99a8bec5-9c5e-431c-a60a-efee099f6dc9`.

This is a branch-only integration checkpoint. Its exact final HEAD is supplied
in the handoff and passive AFTER, avoiding a self-referential commit hash.

## Composition

| Source HEAD | Missing commits | Merge commit |
| --- | ---: | --- |
| ELS `11859400c03e9ccd2cd8a43f372df876994a1c03` | 12 | `0e60474ef229b66cca16694044b7bd32314b5bfa` |
| Hint media `544084d0f27696f6bde26aae70fe8d70cff8fab3` | 2 | `f5d534353d5da94557d297f06208648c23c76f4b` |
| World `ad9b2921a148383c0e851dd158c5e55935abff83` | 71 | `39f9d9e708e621d5ec42fb1f8800caae7d742d10` |

All sources were verified against origin and merged with real two-parent,
`--no-ff` commits. Patch checks found no equivalent incoming commits. PR #1175
and `b863b6fd` were already shared ancestors and were not replayed.

World needs 71 commits / 140 paths here, rather than only the advertised last
68 commits / 113 paths: its three foundation commits `f085fea3`, `728c2412`
and `662a4d9f` were absent from the central base by both ancestry and patch.
Those commits restore the topic inventory, recent-writer ordering and public
copy/update section promised by the World handoff.

The incoming source deltas are mutually disjoint. The only overlap against the
central base, `src/lib/supabase.js`, auto-merged cleanly. Inspection preserved
central `persistAnalysis`, `getNameMultiWithoutEls` and `removeFamilyMember`,
and added World's bounded gallery review/count projection and stable ordering.
`SystemFrame2029.jsx` and `RazielSessionProvider2029.jsx` remain byte-identical
to the central base. No `ai-analyze` or `research-run` changes were introduced.

## Acceptance corrections

- Media shape validation explicitly rejects missing and JSON-null `state`.
  SQL checks exercise both the pure validator and the actual table constraint,
  including every allowed state. Owner-only access still fails closed.
- The SQL acceptance runner uses cached PostgreSQL 17 on the local Docker
  socket with no network or host ports and a read-only repository mount.
- HMAC receipt documentation now states that signed base64 JSON is readable
  and can include a transient physical path. Receipts and signed read URLs
  must not enter persisted metadata, logs or telemetry. Stored media references
  remain opaque IDs; no second media store or upload API was introduced.
- Removed incoming Markdown trailing whitespace to satisfy cumulative
  `git diff --check` without weakening that gate.
- The Life Journey browser's fixed 350ms sleep and two separate DOM counts
  intermittently missed the lazy 3D transition, even though an unchanged full
  isolated run passed. Acceptance now waits for actual 3D or its accessible
  capability fallback and checks one selector atomically. Loading indicators
  and unrelated location-status text do not satisfy it; the full-flow deadline
  and all privacy/navigation assertions remain unchanged. No journey runtime
  source changed. Narrow passive scope addendum: `5f2a4df5-82a1-4063-b6ac-d53b97631a00`.

## Verification

Evidence directory: `/workspace/artifacts/central-els-hint-media-world-20261026`.
Acceptance covers the source merges and the branch-only media correction.

- Normal Legacy + 2029 builds: PASS.
- Life Journey Preview-configuration 2029 build: PASS; no hosted deployment.
- Built graph: 48,027 gzip bytes recovered normally; 48,010 with the Preview
  configuration, both above the 12,288-byte floor. Submit adapter and Research
  Plan stay lazy.
- Hard isolation, cheap hardening, My Workspace, SystemFrame, Legacy Production
  Lock and integrated Preview auth guard (5/5): PASS.
- ELS: 29 automatic-plan tests, 187 non-browser tests and 64 real Chromium
  scenarios PASS (280 total); three executable local-PostgreSQL scenarios skip
  because local binaries are absent. The separate PostgreSQL 17 compatibility
  run exercises ELS private-save/publication isolation with the media guards.
  The engine/lexicon generator produces identical tracked output.
- Media runtime and Edge bundle: PASS. PostgreSQL 17: media apply/rollback
  50/50 assertions, Research Sync with media guards 36/36, ELS F3/private-save
  isolation PASS. Mounted Research Provider 10/10 PASS; the test-only helper
  dependencies live outside the repository and no package/lockfile changed.
- World: exact 47-file manifest 388 PASS / 0 FAIL / 1 optional PostgreSQL skip;
  its PostgreSQL rehearsal was then executed separately as described below.
  World Surface, Researcher Corpus, Public Language 3/3 and Legacy containment
  PASS. Writer-to-World real-component browser: 13 cases PASS, including nine
  viewport/theme combinations and exact source/return without live data.
- New focused World browser smoke 1/1 PASS: actual World page and public reader,
  identical guest/admin DTOs, exact-id forbidden/missing fail-closed states,
  exact Beit Midrash return, 20-to-27 writer expansion, Hebrew/Gregorian dates
  and no horizontal overflow. All external HTTP is intercepted.
- Built Raziel navigation story: 1/1 PASS, 320px and desktop, no skip.
- Life Journey: 88/88 cumulative acceptance (86 pure tests, typography browser,
  full Person-context browser). The corrected source browser test passed 1/1
  with no skips in 99.73 seconds under the unchanged 180-second full-flow limit.
  Earlier intermittent timing failures remain preserved in the evidence logs.
- World PostgreSQL rehearsal: 10/10 PASS, no skips, in a network-isolated
  disposable PostgreSQL 17 container. It proves v2-v5 stop before writes and
  exercises rollback-only replacement/negative cases; this is not a live apply.
- Broad Raziel baseline: 616/619 PASS, with exactly three existing failures
  (Phase J Post, Phase J Topic, Phase M Post golden). All three reproduce on
  unchanged `d6d6e8cb` (25/28 PASS in the two baseline files). They remain open;
  no gate was weakened and this checkpoint is not an all-green release.

## Held actions and continuation

- No live product DB, migration apply, RLS, flags, content publication, Edge
  deployment, hosted Preview, main update or Production operation.
- Media migration `20261026212450` and World migrations v2-v10 are code artifacts
  only. World v2-v5 retain HARD STOP; v6-v10 have no apply authority either.
- The six governed source corrections remain `execute=false`. The historical
  extractor rollout remains gated by the missing 378-message manifest/runner
  and owner acceptance. Integration does not authorize that rollout.
- World continuation inventory remains 2,891 routed records / 763 sources,
  330 scoped manual reviews and 2,561 not yet manually reviewed. These are
  frozen review counts, not approvals or publications. The 35 ELS records need
  canonical replay; 431 media-marker rows are not 431 unique images.
- The prior central branch stays at its checked base while the three inherited
  Raziel failures remain open. Use the isolated integration branch and its
  final handoff HEAD for review; no release acceptance is implied.
