# Follow Center: shared-treatment review and isolated technical candidate

Status: technical candidate over Claude's released visual implementation; visual acceptance and
real-data integration remain pending. This document does not declare the writer/personal vision
complete. Task: `FOLLOW_CENTER_PREVIEW_BOUNDARY_FIX_20261025`.

## Lineage and ownership

- Integration target: `gpt/2029-central-writer-world-focus-20261025` at
  `1baf950477e6357dc1f89d87d47db15fd457fb23`.
- Source/base: `claude/follow-center-shared-color-20261025` at
  `86977fabd012f44e2300b60c227ea2d38ce0faa6`, released by AFTER `ebd54f52`.
- Technical candidate: `gpt/follow-center-preview-boundary-20261025`.
- Adopted contract `197cbab98674ab6a1e26b4013586294245bc5a29` is already an ancestor of
  the source. The original visual candidate through `6144e4b9c` is present through source
  merge `982707bf`; neither chain is applied again.
- BEFORE: `e81bb398-f2a0-454b-af5c-412d14fd13d3`; bounded refinements `b45e198b` and
  `e59f0d99`. Only controller/model correctness, fixture isolation, tests, one isolated route,
  this review and the three unchanged released consent-patch files are in the technical scope.
- No authored palette, icon geometry, CSS, layout, Auth-provider or `EmailVerify` changes.
  Claude remains the visual writer under the existing Owner Index / Design V2 owner.

The shared resolver itself follows the adopted geometry/purpose/state boundary. Existing role
values are preserved; unavailable/disabled/loading/unknown states override active treatment.
The source removes glyph-name color tables from the Follow Center. This is a shared primitive
implementation, not evidence that all existing consumers have migrated.

## Independently reproduced findings and corrections

| Source finding | Evidence and resulting behavior |
| --- | --- |
| The fixture Follow button could reach live OTP | After a synthetic Follow, the actual guest verification form attempted `POST /auth/v1/otp`. The review browser aborted it before network delivery; no email/account write occurred. The candidate supplies instance-scoped Follow I/O and a fixture-only identity callback, so no live verification form opens. |
| Global Supabase monkeypatch affected unrelated consumers | Removed `.rpc`/`.from` replacement from the Preview page. `WatchButton` keeps one controller and its existing default I/O; only the fixture instance receives an explicit adapter. Incomplete custom adapters never fall back to a live reader/writer. |
| Missing preferences appeared as zero / "עוד לא בחרת" | Missing/loading/unavailable counts now remain `null`; lifecycle labels distinguish loading and unknown. A successfully read empty list still means zero. An unresolved principal is not called a known guest. |
| The new explicit route failed isolation hardening | Source `86977fab` fails `test-2029-cheap-hardening`; the approved contract/base passes. Added only the exact `/2029/preview/follow-center` rewrite to `/2029.html` and its noindex header. The gate now passes; root/Legacy routing is unchanged. |
| Browser URL normalization could escape an internal target | The model now rejects raw/encoded backslashes, protocol-relative paths and control characters. Valid encoded Hebrew subject names remain navigable. This is validation of the existing target, not a new routing registry. |

Default Follow behavior retains existing account/topic scoping, acknowledgment, rollback and
verification flow. Adapter identity is also part of request scope, so an old fixture result cannot
settle a replacement adapter's view. The fixture disables Push and follow telemetry and never
replaces the shared Auth client. Shared frame public reads are separate from the synthetic center.

## Consent patch, integrated once

The released PR #1157 correction is copied unchanged after a no-overlap check:

| Released commit | Candidate equivalent | Stable patch ID |
| --- | --- | --- |
| `23a127448b3da8c90b9f87eb3c6b4d2b44607b89` | `6f869ab2dd47af355d1ed0e3ebc379d31adbd18a` | `09f0b1a330d7a85f2e9115a911eed096d2632dfc` |
| `a219a9f24cc1a6e49123abc7d94ed1ebc7671c49` | `54c456465756231925e94ff3418a349584d6f508` | `6f57c8593677ebd25541b979790e70e0152856e7` |

An absent or explicitly empty channel list stays empty. Existing email consent is preserved;
explicit Push / linked WhatsApp remain their existing separate paths. Persistence/consent tests
use mocked transport. No live notification preference, subscriber or consent row was changed.
The integration owner must not replay PR #1157 or #1158 after integrating this complete chain.

## Verification

The combined runtime through `54c45646` was built in both default and flag-enabled modes.
The final review commit changes documentation and the test report's fixture label only.

- Six focused Node entrypoints pass: treatment resolver, Follow Center model, palette roles,
  accent-text contrast, follow identity and the consent/client-adapter regressions. This runner
  reports six file units; it is not a claim of six total assertions or a full-repository suite.
- Browser matrix: 43 Follow Center cases plus interaction negatives. It checks the same glyph
  active as a followed stream and unavailable as Push, role/state contrast, loading/error/guest
  states, keyboard, reduced motion and narrow layouts. Follow confirmation, the identity action,
  missing fixture writer and unavailable fixture reader are exercised with external writes
  blocked. Test mode is explicitly synthetic center fixtures with public frame reads.
- Existing default `WatchButton` browser review passes its normal/mini/checkbox/gate variants,
  including unknown state, missing acknowledgment, confirmed retry and scope switching.
- Production lock, cheap route isolation, World surface, public-language and Legacy-containment
  gates pass. `git diff --check` is clean.
- `npm run build` passes for Legacy and 2029; its default 2029 entry excludes the gated fixture
  route. `VITE_FOLLOW_CENTER_PREVIEW=true npm run build:2029` passes separately.
- Local bundler timings: Legacy 3.37s, default 2029 2.18s, flagged 2029 3.06s. These are local
  build timings, not hosted page latency, delivery performance or Core Web Vitals measurements.

Independent evidence/logs are under `/workspace/artifacts/follow-center-shared-review-86977fab/`
and `/workspace/artifacts/follow-center-preview-boundary-20261025/`. The former preserves the
blocked OTP attempt and incorrect unavailable-state screenshot. No write reached the external
service during that negative check. Source-committed images are historical source evidence, not
new exact-HEAD hosted acceptance. Existing source-tracked `work/evidence/` files are retained;
this review's own generated artifacts are outside the checkout.

## Protected Preview and integration boundary

The only Preview configuration addition is nonsecret `VITE_FOLLOW_CENTER_PREVIEW=true`, target
`preview`, scoped to git branch `gpt/follow-center-preview-boundary-20261025` in the existing
project. It does not apply to other branches or Production. The exact final SHA, deployment ID,
URL and ownership release are recorded in the review PR and passive AFTER to ZURIEL, avoiding a
self-referential commit hash in this file. Protection, aliases and global variables are unchanged.

A READY deployment and matching SHA prove artifact provenance. A Vercel login redirect is not
an application browser test; hosted authenticated flows are not claimed without that access.
This remains a clearly marked synthetic Preview, not the connected personal Follow Center.
The PR stays draft until the remaining visual work and acceptance are complete.

## Next bounded Claude pass under the already adopted contract

No additional product approval is needed to apply existing Design V2 text floors, SVG usage,
semantic treatment or state precedence to a 2029 variant. After this scope is released, Claude
must check current ownership and open a fresh BEFORE over the exact candidate HEAD:

1. Upgrade the canonical `WatchButton` through its existing `variant`/2029 seam. Preserve the
   default Legacy appearance, controller, account isolation and fixture I/O boundary. Replace
   meaningful 11.5/13.5px labels and emoji in the 2029 presentation with existing type tokens
   and approved SVG geometry. Current specimen diagnostics still report these source defects;
   the passing 43-case center matrix explicitly does not assert that the specimen meets V2.
2. Evaluate actual `ShareActions` in its authorized 2029 placement and consume shared roles.
   The Preview-only `force` specimen is not permission to defeat the existing placement law
   elsewhere or add another share implementation.
3. Migrate a bounded representative writer, community and personal consumer to the shared
   resolver/component seams. `IconTile2029` is available where appropriate; consumers need
   not acquire decorative tiles merely to use `treatmentVars`. No glyph/kind color taxonomy,
   copied local palette, new theme state or broad Legacy restyling.
4. Verify three presets at 320/390/1440, unavailable/disabled/loading/unknown precedence,
   text/icon contrast, keyboard/focus/reduced motion, return context and confirmed/failed
   actions. Record exact consumers and actual fixtures/live reads; do not label regressions on
   unchanged consumers as evidence of migration.

Claude activation is unavailable in this environment (`SPECIALIST_DISPATCH_UNAVAILABLE`).
This is a passive review/handoff to ZURIEL, not a dispatched agent job. After the visual pass and
ZURIEL's visual acceptance, GPT can connect the adopted center to existing authorized readers
and mutations in a separate bounded scope. No new store, consent engine or delivery channel.

No main/central merge, Production, DB/RLS change, real-data center wiring, publication,
identity merge, notification sending, billing/credits or private-data release is part of this slice.
