# Wave 2 performance integration handoff

## Boundary

This is a branch-only integration of three completed Codex performance fixes.
It does not authorize or record a PR, CI run, deployment, merge, database write,
live flag change, or Production change.

- Integration branch: `gpt/perf-unified-wave2-20261018`
- Exact immutable base: `origin/gpt/perf-unified-candidate-20261018@8f78c0c7ced835849a816a815abf05a7247ceead`
- Base remote head was re-fetched and verified before integration.
- Canonical coordination project: `linswmnnkjxvweumprav`; the bounded live
  `work_log_current` check found no active overlapping Home/Number/integration
  writer. The active coordination rule is version 17.

## Sources and rewritten integration commits

Each source head was re-fetched, matched the supplied SHA, and proved to be a
descendant of the exact base. No extra source commit existed outside these
ranges.

| Scope | Verified source head | Source commits after base | Integration commit |
| --- | --- | --- | --- |
| Number method inspector on demand | `origin/gpt/perf-number-method-lazy-20261018@4c9b9bca09d6789426ee985801fb5bd8ad633af5` | `4c9b9bca` | `fe816232f43e006f62948ed46f4e3f0eaabd8675` |
| Home biblical-video read near viewport | `origin/gpt/perf-home-video-defer-20261018@94bfa6a11be3c24690f00befbcb85916c7a7ed5b` | `94bfa6a1` | `09d340e413c11097214f2e90c364b03650dc1f16` |
| Home reserve/scroll stability | `origin/gpt/perf-home-scroll-stability-20261018@c00e283ca0e9dc754b8d8d5b508a736e651da230` | `f75912de`, `c00e283c` | `1ee3387f96d5c5bef6317062a12a8980a1b7c5e3`, `bd13ebe751a985b0892bb5eee65f63bdf2bc0e69` |

The cherry-pick order was Number, Home video, then Home scroll. Git reported no
conflict. As an independent content check, the three complete `base..source`
diffs were applied in that order to a detached base worktree. Its tree and the
pre-handoff integration tree were identical:
`7af23cb48aba44e9e47868c20164fe71133a23f0`.

## Integrated files

Number:

- `scripts/test-2029-bundle-budget.mjs`
- `src/components/number2029/NumberCore2029.jsx`
- `src/components/number2029/NumberMethodInspector2029.jsx`

Home video:

- `src/components/experience2029/DiscoveryGateways2029.jsx`
- `test/fixtures/retry-harness/stubs.js`
- `test/home-discovery-gateways-2029.test.mjs`
- `test/home-retry-2029.test.mjs`
- `test/home-settled-box-2029.test.mjs`

Home scroll/stability and its preserved evidence:

- `2029.html`
- `src/components/experience2029/sod2029.css`
- `src/components/experience2029/useSettledBox2029.js`
- `test/home-settled-box-2029.test.mjs`
- `test/home-settled-box-dom-2029.test.mjs`
- `test/scroll-return-2029.test.mjs`
- `docs/perf-evidence-20261018/home-scroll-stability/**`

`index.html` remains the exact base blob
`a47382395ad96c4dca30c0cd433907d82c413835`. No Post, System Frame, database,
migration, RLS, runtime-flag, workflow, or deployment file changed.

## Verification

- Number route, method projection, Preview projection, and locked-route code
  loading: 16/16 Node tests passed.
- Existing System Frame gate passed, including its long-task progress contract.
- Home readiness, deferred video, retry, settled-box, scroll anchor, scroll
  restoration, and return behavior: 154/154 tests passed in Chromium with no
  skips.
- Exact built Home scroll matrix: all 12 width/theme cells passed. CLS was `0`,
  the reading marker delta was `0 px`, horizontal overflow was `0 px`, and the
  sticky header stayed at `0 px`.
- Full Legacy + 2029 build passed.
- Built bundle budget: 5/5 passed. The Number opening graph is 31 extra chunks
  and 202.9 KiB gzip; `NumberMethodInspector2029` and its method depth remain
  outside that graph and inside the on-demand closure.
- Existing 2029 Number preview acceptance script passed.
- The exact-Preview browser suite passed 2/2 when built with the inherited exact
  base-candidate Preview identity. A normal build of this new branch correctly
  left Number locked and therefore failed the open-Number browser assertion
  while the quiet-Home assertion passed. This is a branch-binding release
  boundary, not a Number implementation regression.
- `git diff --check` passed.

No hosted Preview, real corpus, authenticated browser, physical phone, Firefox,
Safari, or real-user speed measurement was run for this integration. The first
attempt to install dependencies independently also met a registry `503`; the
gates above used the repository's existing complete lockfile-compatible
dependency installation.

## Readiness and remaining P0 work

The branch is structurally ready to be the isolated base for integrating
non-overlapping Claude branches after their exact heads, ancestry, file scopes,
and live writer status are rechecked. It is not a release candidate and is not
ready for hosted Number acceptance until the exact Preview branch binding is
updated in a separate bounded decision.

Remaining external Claude scopes stay separate:

1. Post media initial-route cost and its identity-preserving acceptance.
2. The side Number drawer decision/implementation (retain or reduce to the
   approved lightweight calculator plus link), with full-page Number unchanged.

Those tasks must not be folded into this three-fix integration implicitly.
