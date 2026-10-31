# SOD1820 — unified working baseline and performance handoff, 2026-10-31

This is a continuation receipt under the existing owners and canonical Plan37,
not a second plan or authorization for a release. ZURIEL requested the Community
delta, planning reconciliation, historical performance review and a clean
consolidated working branch. Do not rebuild or re-import the delivered systems.

## Exact continuation

- Branch: `gpt/2029-unified-performance-consolidation-20261031`.
- Starting base: `d2dd882f960a329394f4a23d7b6e4a7d4c4c6fd5`.
- The delivery HEAD is the commit containing this receipt. The full SHA, verified
  origin SHA, protected deployment ID/URL and hosted results are recorded in the
  final ZURIEL handoff and passive work_log AFTER for
  `UNIFIED_2029_PERFORMANCE_CONSOLIDATION_20261031`.
- Read AGENTS.md, CLAUDE.md and Owner Index, verify live coordination and that exact
  remote SHA before continuing. A newer branch tip requires a read-only delta
  check; never reset another writer's work.
- Stable fallback: branch `gpt/2029-unified-community-latest-integration-20261031`
  at the starting base. Its protected Preview was
  `dpl_8pmCjLPwqdw3ZibRXwoLdcHj8dYC`; it remains a historical baseline, not proof
  that this performance cut was deployed.

## What is already consolidated

The base already contains the received Books/Ahavat and spatial contract,
cumulative ELS/Raziel package, regression repair, Posts, World/Topics/Galleries,
Claude's dark Home matrix card, pinned global ticker, and latest Community delta.
Their exact source receipts are linked from
`community-latest-unified-integration-20261031.md` and
`central-unified-end-to-end-preview-20261031.md`. Do not replay their source
branches because a cherry-picked/adapted source is not a direct ancestor.

Preserve the Home card's **20-second** motion, pause/visibility/reduced-motion
behavior and dark panel in all three presets. Preserve the existing ticker,
SystemFrame, source identities, one ELS engine, one global Raziel Provider/session,
Research Context and transport. Ahavat stays open without being declared complete.
Community keeps its one top counter, dated OpenWeb snapshot, exact share links,
parent-chain checks and bottom conversation.

## This technical cut

1. Restored historical F13's dependency boundary over the **current** canonical
   story implementation. Legacy retains its static viewer; 2029 requests the same
   viewer only on explicit opening. A stable selection in the existing Companion
   survives peek/slim remounts while loading. Slow/error/cancel/close/reload paths
   are handled. The existing ContactGateway is also requested only on opening its
   existing PanelShell. No second feed, media store, viewer or modal system.
2. Restored F18 narrowly: share only a **pending** public site_flags request in one
   2029 navigation/principal scope. Discard it after success/failure; refresh and
   navigation are fresh, stale scope state is masked, and no permission TTL or
   policy resolver was added. Legacy's unscoped reads remain independent.
3. Restored F20's reviewed lazy Realtime implementation from exact historical
   `5de4d5772bbf2624d9f6195c00216d49df2d04d1`. Supabase/Realtime SDK remains
   **2.116.0**, with one Supabase/Auth client and its existing token callback.
   The alias applies only to the 2029 build. The finite repository-consumer guard
   and actual SDK/Chromium loopback tests remain mandatory.
4. Found and restored F10's missing `published=1` filter before both numeric media
   windows and exact counts in getEntityBundle, for **2029 only**. Negative
   fixtures cover unpublished, hidden and private media; no publication, DB/RLS
   change or Legacy query change occurred.

## Plan, audit and measured evidence

Canonical `public.project_codex.id=37` received additive section12.14. Independent
readonly readback proved the exact previous text plus the addition; title, slug,
DRAFT and historical decisions were preserved. First readback MD5:
`96fba6b6ce15ba0cbd5f4bcf6eef1913`. Planning claim4ce0b4a4 was released in
`d17e60b6-9494-4734-8e39-cbc60329aaa8`. Any later dated performance receipt in the
same row supplements that snapshot rather than rewriting it.

Read [the 34-group review](unified-performance-consolidation-20261031.md), its
[full fingerprints/journal evidence](unified-performance-consolidation-20261031.json)
and [the paired local measurement](unified-performance-evidence-20261031.json).
The historical handoff has **34 groups / 55 commits**, not a verified62. All groups
are classified individually; absent filenames or ancestry alone are not loss.

| Current build metric, same mandatory gate/default gzip | Before | After |
|---|---:|---:|
| Normal eager JavaScript | 442,195 B | 421,607 B |
| Preview eager JavaScript | 439,710 B | 419,411 B |
| 2029 entry recovery against458,742 B | 16,547 B | 37,135 B |

The required recovery stays12,288 B; no budget increased. Raziel submit adapter,
Research Plan, StoryViewer, ContactGateway and Phoenix remain outside the eager
entry. Local Home fixtures show **10→1 policy reads**, with no new polling.

Twelve paired cold lab runs (three/side at390 CPU×4/1.6Mbps/150ms and1440 without
throttle) plus six functional/failure cases passed. APIs were synthetic and all
external writes/models blocked. The local harness substitutes the exact built
entry for the SW bootstrap **in-process only**; hosted SW/permission testing is
separate. Static assets fell, but timing did not consistently improve:

| Lab median | Before | After |
|---|---:|---:|
| Mobile primary content | 5,865 ms | 5,830 ms |
| Desktop primary content | 771 ms | 809 ms |
| Mobile LCP | 5,668 ms | 5,640 ms |
| Desktop LCP | 920 ms | 1,056 ms |

Do not claim a site-wide latency gain, INP, physical-device result or field p75.
The mobile LCP target remains open. Existing October RUM has207 document samples,
no build identity and no usable-content field; it cannot attribute gains to this
SHA. The existing admin analytics has Web Vitals but not usable-content output.
W0 execution/telemetry remains a specification, not a new implemented system.

## Validation and honest limits

- 49 targeted policy/publication/shortcut/guard/Realtime tests passed, including
  14 adapter lifecycle cases and two installed-SDK/browser loopback cases.
- Raziel:677 passed. Current accepted ELS selection:435 passed, five local
  PostgreSQL prerequisites skipped. These selections overlap; do not sum them.
- Canonical report emitter, contextual learn, Web Vitals core, research-run
  contract and packages passed. Packaging is not Edge deployment or live source
  acceptance.
- Both regular builds, integrated Preview build, content contract, graph/lazy,
  isolation, cheap hardening, Legacy lock and diff check passed.
- Community/share:18 browser cases; count:17 cases including320/360/390/1440 and
  three presets. UI-carry:18 theme and17 Community cases. Personal chain:90
  captures,10 flows and six refresh/ack checks, with zero page errors.
  Authenticated positives/ownership/account switches are fixture evidence, not
  claims of live writes or successful real-account model output.

When rerunning the personal-chain browser, set
`WRITER_PERSONAL_OUT=/tmp/unified-personal-evidence` so its default does not rewrite
historical tracked screenshots. This run's generated images/report were preserved
under `/tmp/unified-perf-writer-evidence-20261031`; only this run's generated
historical-file replacements were restored to the original git blobs.

Three additional acceptance checks fail identically in the untouched d2dd base
and this candidate. They remain explicit **BASELINE_ACCEPTANCE_GAPS**:

1. `test/central-els-hint-media-world-2029.browser.test.mjs`, combined World case:
   expects raw `channel_updates:source-1#a2` in visible public copy. Preserve exact
   provenance and verify its proper inspector location before adapting the test.
2. `test/code-page-els-launch-gate.test.mjs`, active2029 case: expects an older
   literal initialSeed JSX shape. The current accepted ELS suite is separate.
3. `scripts/test-2029-control-plane.mjs`: expects a direct
   `hardenPassiveMediaHtml(post.content || "")` call in Post2029Page. Current Post
   goes through postReadingHtml2029. Audit passive media behavior through the
   actual path before treating this as merely a stale assertion.

Do not call the entire repository green, weaken these checks to clear a dashboard
or treat reproduced baseline failures as introduced by this cut. The initial
mistaken161-file historical selection was stopped; the correct66-file ELS
selection above was run separately.

## Next focused performance work

Use the existing canonical plan and audit references, then scope the next writer:

1. Home below-fold videos/discovery/World projection admission (F17/F27–F30),
   measured against unchanged adopted presentation. Separate unnecessary reads
   from any product decision to remove visible pulse/time content.
2. World compact source/card reader, and light admission without importing the
   full discovery chain (F21/F31); exact source/full timeline/return/retry remain.
3. Post source before optional verifications/depth, passive media and known exact
   image dimensions/renditions (F23/F34). Never defer the readable source itself.
4. ELS verse-display payload (F24) with current corpus integrity, exact context,
   deterministic publication and offline/standalone parity. The artifact is shared
   with Legacy: resolve that scope before changing it; never copy old HTML.
5. Build-attributed usable-content measurements through the existing RUM/events
   owner (F19), without a second analytics store or public audience counters.

G4/Golden acceptance, representative authenticated roles, privacy, live backend
compatibility, SEO/direct-entry/crawler routes and physical mobile acceptance
remain distinct gates. No final site-wide cutover approval is implied.

## Live boundaries and ownership

The Preview keeps the same exact-branch reviewed capabilities as d2dd:
explicit canonical chat to the existing server; governed Community actions,
own-avatar and existing verified legacy claim. General profile/product writes,
Matrix jobs/planning/grounding with an unmatched server, migrations and Edge
rollout remain blocked. Other Preview branches receive no new blanket permission.
`product_writes=true` describes those narrow manual exceptions truthfully.

Live ai-analyze was last observed asv90 and lacks the newest central ELS grounding
contract. A UI Preview is not proof of backend/source parity or a real authenticated
model reply. Do not deploy ai-analyze/research-run/WhatsApp, change live flags,
create personal activity/audience stores or reuse historical SQL approvals.

No main/Production release, reassignment of Production aliases/custom domains or
Legacy runtime release occurred.
The last independently observed live Legacy anchor is
`dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`, SHA
`8bc5980fe80fdee30652c8f2364608b5916180e3`; do not automatically roll back to the
older emergency anchor in bootstrap files. CORE_PUBLIC_LAUNCH_2029 staysfalse.

All bounded source/Preview/planning ownership is released by the final passive
AFTER, with to_actor=ZURIEL and dispatch fieldsNULL. Recheck live records before
the next edit. Source branches, other dirty worktrees and their preserved evidence
were not reset, force-pushed, deleted or imported automatically.
