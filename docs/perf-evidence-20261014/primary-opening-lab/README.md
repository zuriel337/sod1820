# Primary-opening lab (A/B/C) — RESULT: BLOCKED_NEEDS_MORE_CONTEXT

Parent assignment: work_log `f0d9d961-8c96-47fb-a6dc-221f55b58fe7`, task `CLAUDE_2029_PRIMARY_OPENING_LAB_20261014`.
Baseline (immutable): PR1100 head `5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75`. main at start: `12fea7a33ea2367f590050f8e499389b7e508561`.
Branch-only. No merge, deploy, main push, live DB write or shared-source edit.

## Outcome
**No A/B/C timing was produced. Nothing here is speed-closed.** Only the PR1100 control build was verified.

## What was verified
- No overlapping active writer on `experiments/primary-opening-lab-20261014/**` or `docs/perf-evidence-20261014/primary-opening-lab/**` (work_log scan). Remote lab branch did not exist; created from PR1100 head.
- `npm ci` and `npm run build` on the exact PR1100 tree: PASS. This is build-only evidence, not browser evidence.

## Genuine runtime blockers
1. **No egress to the data origin.** The sandbox proxy rejects CONNECT to `linswmnnkjxvweumprav.supabase.co` (HTTP 403, organization policy). Fresh bounded anonymous capture is therefore impossible. Production and the protected Preview host are also unreachable (curl code 000).
2. **No fixture bodies.** The assignment says to reuse the corrected RPC-complete union, but the earlier harness keeps private bodies outside git. The committed `fixture-union.json` / `baseline-fixture.json` carry hashes, status and timing only. Building a union from SQL-console rows would produce non-anonymous, non-byte-identical responses, so it was not done and not presented as a replay.
3. **No Playwright in this sandbox.** `node_modules` has no Playwright, and the harness expects `PLAYWRIGHT_DIR` and `PERF_CHROME`. Chromium exists at `/opt/pw-browsers/chromium-1194`, so this alone is solvable. It is not the blocker.

Not claimed: RECONSTRUCTED variants B and C, an earlier-experiment recovery, hosted/Israel numbers, or any isolated saving.

## To unblock (any one)
- Run this session in an environment whose egress policy allows `*.supabase.co`, or
- supply the gzipped fixture union (`--fixtures` for `scripts/perf-execution-2029/measure.mjs`) as a private artifact outside git.

Then: build A (PR1100 as is); build B and C from disposable copies with the patch recorded here; run seven interleaved cold runs per variant at 390x844 DPR2 CPU4 / 150ms RTT / 1.6MiMbps. Keep the same replay allowlist and write-blocking as `measure.mjs`.

## Proposed loading-contract delta (proposal only, no contract edited)
Split "secondary" into two independent axes that must be measured separately:
1. request scheduling: secondary reads start only after primary READY;
2. code loading: secondary module chunks are imported only when their panel opens, with explicit loading / error / retry.
Acceptance would need primary-content hash equality across A/B/C and zero fixture misses.

## Rollback
Discard branch `claude/primary-opening-lab-20261014`. It contains only this file plus the PR1100 tree.
