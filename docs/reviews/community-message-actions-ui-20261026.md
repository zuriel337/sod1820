# Shared Community message actions — 2029 integration

Task: `COMMUNITY_MESSAGE_ACTIONS_UI_INTEGRATION_20261026`.
BEFORE: `3410c400-bed4-4067-a8fe-953affc1a0cf`.
Base: `e7c9ed5a7bcd600e148d83e0b5f725b8a5287dd6` (PR #1172).
Branch: `gpt/2029-community-message-actions-ui-20261026`.
Status: implemented and locally tested; branch-only integration candidate.

## Result

An owner of a verified historical message uses the same inline editor and
delete confirmation as a native Community author. Feed, author activity and
the exact thread reached from personal replies share `LiveMessage` and one
principal-scoped request hook. No new management screen, Provider, transport,
identity binding, persistent store or model call is introduced.

The presentation restores the existing Community controls from
`15a4a95633452f4f80ebd52dd9b88d4bd3e87b88`; it does not merge that older branch.
Compatibility changes use adopted type tokens, 44px targets and the existing
bilingual date owner. This is data/action integration, not a new visual design.

- The batch capabilities RPC is the authority for edit/delete buttons. Names,
  client display pairs and account metadata grant no permission. At most 100
  IDs are requested per batch; there is no additional query for every card.
- Existing mutations and strict server-acknowledgment adapters from PR #1172
  perform all writes. No optimistic removal or invented edited timestamp.
- Failed edits retain the draft; failed deletion retains the original message.
  Missing capabilities show an unavailable/retry state and grant no controls.
- Account switching immediately masks old capabilities, patches and editors;
  pending responses cannot reintroduce the former account's draft.
- Referenced sources stay protected by the existing `source_requires_review`
  result; this does not claim a complete indirect dependency inventory.
- Deletion leaves a sanitized tombstone in the original thread. Other people's
  replies and exact-return context survive, including after Reload.
- Author activity remains the existing anonymous public reader. It now requests
  `edited_at`, so the edit marker also survives a fresh author-page load.

The existing tombstone-aware feed/context/reply/count RPCs are consumed again.
Their older joined Contributor columns are excluded by a PostgREST selection at
the API boundary. Tombstone normalization also removes any author/body/reaction
payload defensively. A valid empty or denied response is never widened through
a fallback query. Only an absent RPC uses the existing table fallback.

## Validation

- 65 focused Node tests pass: Community readers/actions/identity/navigation,
  personal writer navigation, balanced RTL and public contributor identity.
- New built Chromium test: 26 cases pass. Feed and author activity run at
  320/390/1440 × day/parchment/night; edit/cancel/focus/server acknowledgment,
  edited date after Reload, 18px editing, 44px save target and no horizontal
  overflow are checked. Personal-reply → exact thread → confirmed deletion →
  Reload → exact return runs at all three widths. Guest, missing RPC, failed
  edit/delete and pending account switch are separate negative cases.
- Existing Community/Person browser suite: 19 cases pass.
- SQL-export-backed personal replies browser suite: 18 cases pass, using the
  six-account output of the previous disposable PostgreSQL 17 acceptance run.
  Original old threads, deep paths, Reload, return and pending-account isolation
  remain intact. This run reuses that export; it does not repeat or claim a
  live database/Auth test.
- All browser traffic is intercepted. No live mutation, unexpected write or
  model request occurs. Synthetic Auth fixtures are never sent to real Auth.
- Full Legacy + 2029 build, built graph, hard isolation, cheap hardening,
  System Frame, My Workspace, Legacy Production Lock and `git diff --check`
  pass. Existing chunk/dynamic-import warnings remain.
- Built graph: 117 reachable records, seven eager records, 383,534 eager gzip
  bytes (base: 383,531; +3 bytes). Raziel submission and Research Plan remain
  lazy. No live latency or hosted end-to-end performance claim is made.

Evidence: `community-message-actions-ui-evidence-20261026/results.json` and two
representative screenshots. They show synthetic browser data, not live account
contents. Full local screenshot matrix is generated outside the repository.

## Main plan and AI placement

Current `origin/main` roadmap was read at
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`: compact v6.12, G3 closed and
G3→G4 transition / Golden preparation. This connects an existing Community ↔
Person/writer ↔ personal replies path toward cross-surface acceptance. It does
not declare G4 closed, satisfy the formal Posts-first Golden order, or authorize
a public cutover. The current Legacy Production Lock overrides historical
release language in the roadmap.

Automatic AI inspection of posted hints is **not implemented** in this slice.
The existing `classificationSeam.mjs` is a heuristic/structured-evidence gate,
not a running full-validation worker. The next bounded integration belongs to
the existing Intake / Research Planner / Truth / World owners:

1. After a new eligible public message/version is saved, use the existing
   intake/job route once. Opening, scrolling and switching accounts launch no
   model. Historical imports do not trigger a bulk backfill.
2. AI extracts a possible claim, method and source. It does not reject unusual
   phrasing as proof of invalidity or calculate authoritative numeric values.
3. Canonical engines and source/duplicate checks provide verification. Missing
   checks remain missing; model interpretation is separate from calculation.
4. Existing run/evidence and decision-ledger carriers retain the exact source
   version, author credit, coverage and outcome. Message text cannot authorize
   tools, permissions or promotion.
5. Show a short inline state on that same message, with details on demand and
   at most one contextual question when needed. No separate proposal form.
6. Promotion uses the existing approval/standing-authority path. A model result,
   like count or ordinary author role is not permission to publish to the tree.

The companion remains the existing Raziel session. This scope creates no new
AI provider, credit/quota path, membership capability or parallel research tree.

## Dependencies and open gaps

- PRs #1169–#1172 remain unmerged in the checked central candidate. Integrate
  this chain exactly once; do not cherry-pick already retained ancestors again.
- The replies reader migration from #1169 and verified action-capability
  migration from #1172 have **not** been applied live. Until separately reviewed
  and authorized, live historical editing is not claimed and the UI fails
  closed when the capability reader is missing.
- DB-owner development validation, independent security review (including
  indirect source references), actual authenticated hosted acceptance and
  central integration remain necessary. No hosted Preview was created here.
- The World published-graph candidate `77b402a8c78d5123533d5522b42e02b1a07d13b8`
  is not included. Its deterministic source projection is not an AI worker.
- Existing deep-thread indentation remains a mobile readability gap: the
  SQL-backed depth-three fixture leaves only 84px of body width at 320px and
  154px at 390px. No horizontal overflow is not sufficient readability proof.
  Resolving that presentation is a separate visual-owner slice.
- No live DB/RLS/Auth/site_flags, main/central branch, deployment, Production,
  pricing, entitlement, credit or quota changes were made in this slice.
