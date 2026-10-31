# Home loading continuation — branch-only handoff, 2026-10-31

Actor: GPT. Task: `HOME_LOADING_ACCEPTANCE_20261031`. Handoff to: ZURIEL.
Existing owners: Experience Governance v10 / canonical row30 loading policy,
existing Home readers and Reality/Research/Person owners. This receipt is not a
new plan, owner, deployment approval or replacement of canonical Plan37.

- Branch: `gpt/2029-home-loading-acceptance-20261031`.
- Exact base: `4cf3079342e82e73633d18a3ab37cda5479dce72`.
- Runtime implementation: `f269775e248f31f842b0e2efdc21fd09a2bb1fc9`.
- Frozen remote WIP_UNACCEPTED backup: `gpt/wip-unaccepted-home-loading-backup-20261031`
  at `9b15052c8104d63258d42dc722f3c8590bf68ff7`. Origin equality verified before
  any resumed acceptance run or draft reconciliation. It preserves the draft state,
  including its then-stale evidence counts and coordination wording. It is not acceptance.
- Delivery HEAD is the commit containing this receipt and its final test/evidence
  files. The user-facing handoff supplies its exact SHA and remote verification.
- Base origin remains4cf3079. Main remains2195c978 with eight exclusive Legacy
  commits; these were inspected and not imported into this working branch.

## Implemented and preserved

Home's existing video and Dimension Five readers now start on approach to their
own existing sections. The existing World preview reader and Home river loader
start on approach to the arrivals section. The shared hook admits once, at 256px,
or on focus/pointer intent/exact fragment; it disconnects its observer/listeners.
Primary cards establish geometry before observation. Missing IntersectionObserver
falls back to admission. No timer, polling, new cache or policy state was added.

The primary latest-post/cipher readers, nearby notable convergences, corpus pulse
and temporal verification remain immediate. The existing global ticker/Now/feed
and single Raziel Provider/session/transport remain unchanged. World projection
settlement is independent of temporal/pulse settlement, so neither overwrites the
other. Video emptiness is shown only after its admitted read has settled.

The retained River owner is respected: `RealityRiver2029.jsx` and its CSS are
unchanged. Home uses its existing pure loading renderer before mounting its
existing loader, with the same canonical Follow component. No visual system,
content, links, source/publication predicates or Legacy reader was replaced.
The Home matrix implementation/CSS remain unchanged, including 20s motion.

## Three received acceptance gaps

1. World: the real browser opens/closes the adopted source disclosure and asserts
   exact codes `f-public` and `channel_updates:source-1#a2`, including visibility.
   Public copy, public/private filters, source URL and exact return checks remain.
2. ELS: the actual JSX seed expression is evaluated over all 32 combinations of
   saved, legacy, shared and two exact-return guards, plus absent router state.
   The ordinary seed and exact matrix binding remain asserted; ELS runtime is unchanged.
3. Control Plane: checks the current containment → passive-hardening → HTML sink
   wiring. The built Post browser verifies no passive audio/video requests,
   `preload=none`, no autoplay, retained controls/URLs, and an explicit play request.
   This proves request preservation, not successful decoding/playback of real media.

The cancellation harness initially classified the destination Posts page's compact
author-filtered Dimension Five request as a late Home read. Final attribution uses
the actual Home `select=*`, exact tag, offset and limit. It also requires the
destination reader to run; no request or assertion is suppressed to hide a failure.

## Paired local measurements

See [raw measurements and request traces](home-loading-acceptance-evidence-20261031.json).
Both integrated artifacts use the same lockfile, builder, fixtures and profiles.
The clean runtime-commit rebuild has the same manifest SHA-256 as the measured artifact.

| Metric | Before 4cf3079 | After runtime f269775e |
|---|---:|---:|
| Settled Home REST requests, no scroll,390px | 27 | 19 |
| Settled Home REST requests, no scroll,1440px | 28 | 20 |
| Targeted deferred reader requests before approach, both widths | 5 | 0 |
| Mobile primary-content median | 5,744.7ms | 5,700.2ms |
| Desktop primary-content median | 826.7ms | 830.5ms |
| Mobile LCP median | 5,580ms | 5,548ms |
| Desktop LCP median | 1,016ms | 1,084ms |
| Integrated Preview eager JavaScript, default gzip | 419,411B | 419,386B |

There is a demonstrated reduction in entry request demand, not a consistent
latency improvement. Treat eager bytes as effectively unchanged. The normal
build has 421,588 B eager JS and 37,154 B recovery against 458,742 B; the required
recovery remains 12,288 B. No budget or threshold increased.

Twelve interleaved cold lab runs: three per side/profile,390px with CPU×4 and
1.6Mbps/150ms,1440px without throttle. All APIs are synthetic; external model and
product-write calls are blocked. The harness replaces the SW bootstrap in-process
on both sides with their exact built entries. It does not measure hosted SW,
real-server latency, field p75, INP or a physical phone. The existing lab script
was used unchanged except for correcting its receipt's baseline SHA in the
temporary runner; its six failure/interaction cases also passed.

## Verification

- 61 focused Node/browser-runner tests passed, 0 failed / 0 skipped. This includes
  four explicitly proposed-patch checks, not four applied-guard acceptance claims.
- 23 built-browser cases passed: no-scroll comparisons;320/360/390/1440 ×three
  themes; approach/return; keyboard; no-observer/reduced-motion fallback; HTTP503
  failure and reload; slow primary; unmount before settlement; fragment intent;
  actual Post passive media and explicit play. The matrix card's 20s duration and
  no horizontal overflow are checked in the twelve width/theme combinations.
- Both regular builds and the integrated Preview build passed. Built graph/lazy
  boundaries, isolation, cheap hardening, One Tree, Control Plane, Legacy lock,
  diff check and proposed `git apply --check` passed.
- The previous 677 Raziel / 435 ELS results belong to the received baseline and are
  not claimed as reruns of this batch. The entire repository is not declared green.

Reproduce with Node 24, the locked dependencies, Chromium and Playwright available
to Node (this session installed Playwright under `/tmp/sod1820-browser`, not into
the repository). Build base 4cf3079 in a separate checkout using the same
`node scripts/build-integrated-preview.mjs`, then run:

```sh
BEFORE_DIST=/path/to/base/preview-deploy/dist AFTER_DIST=preview-deploy/dist \
  OUT=/tmp/home-admission node test/home-loading-admission-2029.browser.mjs
node --test test/home-loading-preview-continuity-2029.test.mjs \
  scripts/test-integrated-preview-auth-guard.mjs
```

## Preview binding: prepared, NOT APPLIED, ownership-blocked

The proposed [two-file exact-branch patch](home-loading-preview-bindings-20261031.patch)
adds only this new branch alongside the received branch in the existing bindings.
It preserves the same explicit-turn Raziel transport, bounded Community actions,
own-avatar exception, Auth/ownership/payload checks and Production denial. Other
branches and missing/non-Preview environments gain no exception. VM comparison
proves its generated worker is byte-identical to the received branch's worker;
the self wrapper retains `previewReadOnly=true` and exact-environment behavior.

Neither `scripts/build-integrated-preview.mjs` nor
`preview-deploy/api/contributor-self.js` was changed. They must be updated together
before a new Preview can claim all received capabilities. Do not deploy this branch
with the unadapted builder and describe missing capabilities as accepted behavior.

Live current ownership still includes claim
`412a0132-0b3f-43d9-bcab-74e414e98a11`, task
`ELS_MATRIX_DISCOVERY_RAZIEL_PREVIEW_20261028`, explicitly covering the builder.
No explicit release was found in the separate post-backup check at
2026-10-31 20:04:31 UTC. AGENTS.md requires **ONE FILE / SCOPE — ONE ACTIVE
WRITER**; branch isolation is not ownership transfer. Recheck live ownership and
source hashes before applying the patch; regenerate/review it if the builder moved.
After release, apply both bindings, extend the actual guard tests to this branch,
and verify a protected exact-SHA Preview separately. No wildcard is proposed.

## Coordination and remaining gates

The dedicated canonical reader reports `supabase_read_only_user` and
`transaction_read_only=on`. Prior integration release aba15abf and current relevant
ownership were checked. The concurrent read-only continuity review dcbc84a3 was
read and incorporated. Canonical row 37 still has the received MD5
`a8dea68e59d883b296542bbf707bf217`; its Explain-Why request remains planning.

ZURIEL subsequently explicitly requested current ownership registration and a
remote backup before further work. The canonical general Supabase connector was
verified against project `linswmnnkjxvweumprav`; the work_log schema, constraints
and dispatch triggers were inspected. A passive current resumption BEFORE was
inserted and independently read back through the dedicated reader:
`e7d8ec5a-1a27-4b59-b706-02bf1b614638`, 2026-10-31 20:02:48 UTC.
This records the existing f269775e work honestly; it does not backdate ownership
or fabricate a BEFORE for earlier unlogged edits. Actor GPT, recipient ZURIEL,
WRITE scope bounded to this task, dispatch_kind/state NULL. The builder and River
owners remain excluded. The closing AFTER records exact remote results and releases
only this resumed scope. No other agent was activated or messaged.

The four previously untracked task files were inspected and preserved in the
frozen backup: this handoff; the paired evidence JSON; the proposed two-file
Preview binding patch; and its VM continuity test. The already tracked admission
test's pending changes were preserved too. All 12 task paths were checked for
private-key/provider-key/JWT patterns before backup; none were found. No env,
credential, unrelated workspace file or generated historical screenshot was added.

Next measured boundaries remain World compact source/admission (F21/F31), source-first
Post and media dimensions (F23/F34), shared ELS verse payload/offline parity (F24),
then build-attributed usable-content measurement through existing RUM (F19).
Home's notable-convergence/module fanout and pulse/temporal costs remain for measured
follow-up; adopted content was not removed to obtain a lower request count.

Native fragment scroll restoration remains baseline debt: both artifacts were
observed at scroll0 on a cold `/2029#reality-stream`. This cut admits exact-fragment
data intent but does not claim a global scroll-restoration repair. The video reader
retains its existing empty-on-error fallback and SDK retries; reload recovery is
verified, not a new error UI. Real authenticated roles, backend Raziel/ELS parity,
privacy, SEO/direct-entry, G4 and physical-mobile acceptance remain separate.

State: IMPLEMENTED / COMMITTED / TESTED / BRANCH_ONLY. Preview binding:
PROPOSED_TESTED_NOT_APPLIED_WAITING_OWNERSHIP. No merge, main push, hosted deployment,
Production/alias/domain change, Edge rollout, product DB/RLS/migration or publication.
