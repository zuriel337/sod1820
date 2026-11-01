# PR #1187 integrated into the current unified Preview

Task `COMMUNITY_1187_UNIFIED_ACCEPTANCE_20261101` · GPT → ZURIEL.
Branch `gpt/2029-community1187-unified-20261101`.
Passive BEFORE `4548ed40-e056-4f1b-983b-f9fcf9ac9d21`, including scoped addenda.

## Exact content boundary

The verified remote product base was
`gpt/2029-public-frame-context-20261101` at
`6df07087eabd78f7d1b56438b147e2d957ff0ac8`.
The verified PR #1187 source was
`gpt/community-compact-signed-in-composer-20261101` at
`70c30e96bbbd5da8bad0a9e2acfa5c33efc58f3a`.
Their common ancestor was `d2dd882f960a329394f4a23d7b6e4a7d4c4c6fd5`.
Only source commits `90699f284fe696deb81813dc5632eb9feb870457` and
`70c30e96bbbd5da8bad0a9e2acfa5c33efc58f3a` were applied. No old Community
branch or whole old product tree was imported.

Source ownership was released by `6fdf3ac7-47a6-41f4-a3b3-7e3226979971`
and `b416df06-fcb1-4f6c-985d-e8f6c06c1e53`. Frame/Preview ownership was
released by `7fe1303f-9b9e-4a5a-b461-eecb786b4460`. The existing Person
navigation helper claim `99ab48c5` was reconciled against full historical AFTER
`6b4845f3-89bd-4c2e-9e41-3869dab37bd8`; no later overlapping claim was found.

The newer base correction in `LegacyAccountClaim.jsx` remains byte-identical.
The base's App routes, Home, World, Post, Number, personal layout, independent
context rail, hidden source Companion, shared Now/ribbon, small centered command
island, Production configuration, migrations and shared server functions remain
unchanged. `evidence/integration.json` records this comparison.

## Resulting behavior

The compact signed-in composer, verified-principal notification bell, local
photo below draft text, first two direct public replies and exact approved
legacy-chat profile signup copy are integrated. Selecting a photo does not
upload or publish it. Existing publish/upload retry and account-switch cleanup
remain in place. A failed/unknown unread count never becomes an invented zero
badge or an old account's badge.

Two focused corrections were necessary during acceptance:

1. Automatic reply previews keep observing the reading range. A focus/periodic
   refresh updates visible previews instead of every root visited during the
   session. A failed raw reply-count request remains unknown and no longer stops
   the otherwise permitted visible public reply refresh. No extra timer,
   parallel reader, cache, permission or count allowance was introduced.
2. Bell, profile and account-switch links preserve the complete local reading
   URL, including repeated query parameters and the exact message fragment.
   They reuse the existing public URL sanitizer to strip Preview grants and
   credential fragments; private routes and Auth policies are unchanged.

## Preview and permission boundary

The new exact branch inherits the accepted base's Preview bindings in the
builder and five Preview API entry points. It does not use a branch-prefix
allowlist. Its generated worker is byte-identical to the accepted base worker:
SHA-256 `989e1cc315d8b42ae1cc01c57f44bbe6cd2ff4b90b6eb4e9453090008d57f2fb`.
Existing/foreign branches retain their previous worker bytes. A Production or
unspecified-environment build of this branch is rejected.

Authorized signed-in users may use the existing governed Community publication,
replies, reactions, owned editing/deletion where the server grants them, own
avatar and verified legacy claim. These explicit actions use the **shared live
data**, subject to existing Auth/RLS/ownership checks. A photo selection stays
local until explicit publication. Raw public reply counts remain blocked by the
accepted Preview worker. Public Journey/Raziel and the cipher remain gated as
in the base; their admin and cost checks are not broadened. No live product
write, upload, email, model invocation or automatic share was used for this task.

## Acceptance and evidence

See `evidence/acceptance.json`, the sanitized logs, synthetic browser captures,
and `evidence/loading-summary.json`. These identify the tested source and distinguish
synthetic tests from real existing-public-data reads.

- Focused Node contracts: 120 passed, zero failed/skipped. They include Community
  readers/actions/media/profile ownership, stale principal, exact return,
  existing shared Auth, shared feed and new exact-branch permission negatives.
- Built-client synthetic browser acceptance: compact composer/account/notification/
  image/first-two-reply suite 20 cases; sharing/deep replies 18 cases; media,
  retry, reactions and account changes 11 cases. No live writes or models.
- The share target still must measure at least 44×44. The existing test now waits
  for the lazy stylesheet to supply its exact 44px dimensions before measuring;
  neither its threshold nor product styling was weakened.
- Source isolation/System Frame checks now require the approved base's independent
  context rail and hidden Companion, canonical framed /code gate, trusted OAuth
  delegation and explicit contextual World continuation. G4 requires preservation
  of phrase and method after reload, and framed closed Journey with zero private
  Person/family/research reads. No workflow, Production-lock check, skip or CLS
  threshold was weakened.

The old source title failure was already fixed in the unified base. Additional
old tests expected mounted Companion/old OAuth/old unframed tool or Journey
markup and a Number URL that discarded phrase/method. The focused assertions
were aligned with already-approved behavior and retained negative boundaries.

GitHub dispatch is restricted to reviewed, nondeploying workflows using local
or disposable fixtures: G4, ELS, Research Sync, Community Reaction Visibility
and Legacy Production Lock. Exact remote SHA, run links/conclusions, protected
deployment identity and post-deployment results are recorded in the final passive
AFTER and user handoff. This document does not claim a pending run passed.

**Full Isolation and live A3 remain OPEN.** The unchanged complete workflow
unconditionally invokes `scripts/test-a3-client-correlation-live.mjs` against
the canonical live `research-run`. It was not dispatched, skipped around or
reported green. Safe isolated components are recorded separately.

## Performance interpretation

The controlled comparison uses actual compiled 6df07087 and integrated clients,
40 synthetic public roots with three direct replies each, a 120ms synthetic read
delay, 4× CPU throttle, 390px/1440px, and four counterbalanced pairs per width.
It checks the same 0.1 CLS ceiling, two automatic direct replies only, visible
refresh on raw-count denial, no offscreen refresh, errors, writes or models.
An additional count-ready case verifies the other existing refresh path.

Median results (four runs per cell, CPU throttled 4×; synthetic transport):

| Width | Client | First root | Initial reply reads | Reply reads after scroll + refresh | Reply payload | Initial/main-thread total | Initial CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 | 6df07087 | 1710.5ms | 0 | 0 | 0 | 1.5142s / 1.7814s | 0.0462 |
| 390 | integrated | 1758.5ms | 2 | 14 + 2 | 11198 bytes | 1.8010s / 3.2693s | 0 |
| 1440 | 6df07087 | 1726.0ms | 0 | 0 | 0 | 1.5377s / 1.8037s | 0.0235 |
| 1440 | integrated | 1807.5ms | 2 | 14 + 2 | 11198 bytes | 1.8019s / 3.4496s | 0 |

The automatic replies do add measurable CPU work: approximately 19% more at
mobile entry and 84% more across this complete scrolling workload, which renders
28 additional replies. Mobile first-root median differs by +48ms; four pairs
cannot establish statistical significance. There is no offscreen refresh in
any of the 16 final flows. The count-ready correction check refreshes three
in-range roots, zero offscreen. This is a bounded improvement over the supplied
source's 14 refreshed roots/11 offscreen, not an assertion of zero added cost.

The original source implementation reproducibly refreshed 14 roots after the
same mobile scroll, 11 outside the current reading range. The focused fix
refreshes only the roots in range. Initial automatic previews add genuine read
work relative to the base; the detailed request/byte/CPU/timing results are not
presented as a general speedup or a field-network benchmark. These app-level
synthetic timings exclude the accepted worker's additional public-parent
verification request per reply page, actual server latency and cellular/network
variation. They cannot prove production capacity or statistical significance.

## Safe Isolation components, separately from the full gate

The unchanged workflow's 38 safe commands and one supplementary mocked A3
command were executed locally. After resolving a missing local executable by
using the already installed **same pinned esbuild 0.28.2**, 37/39 commands pass
(36/38 workflow commands plus the supplementary command's 29 mocked tests).
The ordinary dual build, artifact graph, HTML isolation, source isolation and
System Frame checks pass. A canonical-network fail-and-audit preload records
zero attempted canonical requests; this is not represented as a Docker
network-none or full A3 environment.

Two source-only assertions still fail and are separately reproduced on the
unchanged exact 6df07087 base: Entry Learn expects an old `/post/slug` literal
instead of the approved exact legacy/new reading helper, and cheap-hardening
compares the old route/rewrite set before the public-foundation Preview split.
The relevant product sources and these two scripts are unchanged by this task.
They were not skipped or weakened to obtain a green Isolation result. Logs and
the per-command matrix are retained in `evidence/safe-components/`.

## Remaining real-account acceptance

Real-account bell count, delivery and mark-read behavior, actual account switch,
real upload/publication/edit/delete/reaction/legacy binding, and real Google/
Facebook completion were not exercised. Synthetic tests do not certify those
live operations. No provider settings were changed. Existing prior social-login
configuration/acceptance remains open. A real user can test permitted explicit
actions knowing that they affect shared live data.

No main merge/push, source/evidence branch movement, Production deployment,
promotion, alias change, shared database/Auth/RLS/Edge change, reset or deletion.
Only this branch is saved remotely and deployed as a protected Preview.

## Final post-deployment receipt (evidence branch only)

The product remains dbbe91de46d21a37110664dc732473de6d9cc6ca on its original
remote branch. [Final results](final-results.md) record all completed GitHub
runs, actual public Preview reads and the independently reproduced ELS failure.
This evidence-only branch is not a new product baseline.
