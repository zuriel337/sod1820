# Performance continuation — 15 October 2026

Central task: `GPT_PERF_WAVE2_INTEGRATION_20261015`.
BEFORE: `02b54549-7d36-4d55-bc76-43df7158f47d`, passive TO=ZURIEL.
Original candidate: `5c147e4a2db97ac035227f7c6d15787849f61f6e`.
Integration starts from reviewed World-anchor branch
`a1f7cd0b08674daf89c98a666fc9676efca80998`.
Branch: `gpt/perf-wave2-integration-20261015`.

## Full Number page acceptance

The existing full-page Number suite was actually run on exact
`a1f7cd0b08674daf89c98a666fc9676efca80998` in an isolated worktree.
`npm run build:2029` passed; 55/55 unit/contract tests and 8/8 browser tests passed,
with no failures, skips, retries or flaky cases. The product tree was unchanged.
The machine receipt is `number-acceptance.json`.

Node 24.19.0, Playwright 1.55.0 and system Chromium 151.0.7922.173;
package-lock SHA256 `b33e43bc391edaf257042fb088501c8a1cebd3e47b2e80ef3dd567edad202ff5`.
A fresh lockfile installation resolved a missing dependency in the preinstalled
environment; no manifest or dependency changes were made. Test duration 77.5s is
runner duration, not a performance result. No network/CPU throttling was applied.

Covered: full `/number/:value` from mobile/desktop menus instead of the drawer;
0 versus invalid input; expression/method links and reload; rejection of a forged
crossing; responsive 320/390/980/1440 layout; revisiting 1237; usable core during
stalled depth; honest depth-failure behavior; Back/Forward with one in-flight
lookup. The verifier's fake identities are unit fixtures, not browser identities.

Number/World locks were opened only by browser-local `site_flags` interception.
Other data came from anonymous public reads under the existing write guard;
Storage assets used placeholders. The live `lock_number` stayed enabled, and
`fx_number_lookup_page` stayed OFF. No RPC installation or live data change.

Still open: actual recognized admin/member/guest access with live flags,
complete method-switch/list-continuation/source journeys, exact scroll after late
depth, three themes, physical phone, latency/INP/CLS and full response/error parity.
This is functional local acceptance, not hosted, real-auth or performance acceptance.
The successful tests do not justify an unrelated Number code change.

## Home stability specialist

The explicitly authorized remote Claude task was launched through the existing
canonical `work_log_assign_agent` transport, not a replacement dispatcher.
Assignment `b61173e8-fe36-4a22-9984-66c2f4db0010`, task
`CLAUDE_PERF_HOME_STABILITY_20261015`; exact base is the reviewed A commit above.
Provider returned HTTP 200 and session
`cse_01YWvJjJmoyEvoMfVVq88YUL`; canonical state subsequently reached `CLAIMED`
with worker `claude-code-routine` and a fresh lease. One activation attempt.

Its scope is Home/Discovery visual stability and unique tests/evidence only.
World/Topic, readers, permissions, live flags, shared scroll restoration,
main/shared/candidate branches and deployments are excluded. Completion and
branch output must be verified separately; startup is not implementation proof.

At 13:26:05 UTC, the coordinator applied one bounded lease-only/context update to
this exact assignment, preserving its CLAIMED state, worker, session and attempt1.
The previous expiry was 13:30:44.898873; the new expiry is 13:56:05.071641 UTC.
Live recovery would otherwise re-fire an expired claim without checking whether
the provider session had stopped. The exact compare-and-set required the original
unexpired lease and absence of completion/supersession/AFTER. Live trigger review
confirmed that changing only lease/context cannot dispatch a new session.
This is explicitly a coordinator grace period, not a worker heartbeat or proof of
coding progress. No global recovery setting/function/cron was changed. The original
worker retains its canonical finish path; there was no second launch.

The original task completed at 13:26:21 UTC on that same attempt/session; its
lease and owner were released normally. Passive AFTER
`3e8a80cb-c971-4fa1-b2f8-5516eab737b7` reports **FAIL / BLOCKER**, not accepted work.
Diagnostic branch `claude/perf-home-stability-20261015`, head
`6710eb362bd90de75917d2861df602e6d84159e8`, contains code
`1f2b4cdb09f29a3ab4c6e52d8e73266f39937c59` and evidence. Its phone loading
min-heights did not meet CLS<=0.1 in any retained sample. Sequential rather than
interleaved arms and fixture misses also invalidate comparative acceptance;
reported medians 2.34 and 1.37 are diagnostics, not a proven percentage gain.
Required late-arrival, interaction, width and theme coverage was not completed.
This patch is **NOT_ADOPTED** and is not an integration input. Dispatcher
COMPLETED means the worker finished; it does not mean the product passed.

A bounded follow-up was then assigned through the same existing transport:
`CLAUDE_PERF_HOME_STABILITY_V2_20261015`, assignment
`e96a8635-42cd-44ef-8094-7c0846101905`, fresh branch
`claude/perf-home-stability-v2-20261015` from exact A1. It must first repair fixture
and observation validity, attribute an actual Back-time geometry event, then test
one minimal in-scope Home fix. OldB is excluded. This assignment is distinct from
a retry of the completed task; no overlapping Home writer remains. Its final
result and lease state must be checked in the canonical ledger before integration.

## Read-only preview correction

The existing static preview worker incorrectly rejected the current guest
preference reader. Its exact `notification_prefs_guest_get_v1` entry is now
allowed. Live catalog inspection confirmed a SELECT-only implementation and
dependencies (definition MD5 `85297f26950ce8d964e2a3fca5e48148`), matching the
existing migration. No function or grant was changed or installed.

The existing worker VM test now checks the real generated source: the reader
passes through, while guest-save, table writes, telemetry, foreign-host RPC and
unknown RPCs stay blocked. All four guard tests pass. The speculative name
`public_enrichment_batch` appears in an old harness allowlist but has no current
function/caller; it was not added. Existing-account auth behavior is unchanged.

The previous candidate deployment is a native 2029 preview, but does not contain
the read-only builder's marker/worker. Its missing marker URL returns HTML with
HTTP 200, which is not provenance proof. A new review preview must use the
committed `preview-deploy/` recipe and verify actual JSON, guarded bootstrap and
both identical JS workers. This correction is confined to the review artifact.

## Topic import experiment — not integrated

`gpt/perf-topic-import-20261015` tests an optional WorldSourceStory lazy import on
top of A1. Corrected retained measurements used seven interleaved pairs in each
native and integrated-preview profile, plus seven source-enabled story pairs.
All retained ordinary-topic requests and full settled identities matched (159
reads/sample); source-story requests/identity matched (60 reads/sample), and the
actual method Stage plus failed-import/reload path worked. However ordinary
World-to-Topic median changes were -28.3ms native (95% interval -225.3..+77.0) and
-51.4ms integrated (-652.4..+135.4). Neither establishes an improvement. Story
complete-ready changed 7000.6→7337.2ms (+4.8%, interval -151.7..+1526.8ms);
Back/story non-regression remains uncertain. Smaller bytes are not time evidence.
The final true-profile cold-World series also observed5675.3→6094.2ms (+7.4%,
interval +135.5..+836.4); this is an observed lab regression, with cause unproven,
and strengthens the decision to leave the experiment out.

Decision: **NOT_ADOPTED**; retain the experiment and corrected evidence on its
own branch, without more measurement rounds. No Topic product change is present
in this integration. Earlier renderer-clock-blocked and unsettled-identity runs
are diagnostic/excluded, not acceptance samples. Detailed receipts and exclusions
belong to the experiment's own report; none of its purported gains are combined
with other historical improvements.

## Integration checks before review deployment

At root code/document head `0adc023f`, full `npm run build` (Legacy + 2029) passed.
The following all passed on the actual generated dist: scroll restore15/15,
World/Topic native surface guards, source isolation, built dependency graph121
reachable records, bundle budgets5/5 with no skipped cases, route legitimacy,
and actual preview worker/auth guards4/4. World remains37 chunks/260.1KB gz
within the existing265KB/37-chunk limit; no budget changed. Subsequent report-only
commits do not alter the product/build/test inputs. Build emits existing large
chunk warnings; no release performance target is inferred from successful builds.

## Release boundary

This integration is branch-only. Production/main, existing candidate and shared
integration refs are unchanged. Rejected World unsplit and boot-modulepreload
experiments are not integration inputs. Exact-SHA verification and a new review
preview do not authorize Production release or open the Number live gate.
