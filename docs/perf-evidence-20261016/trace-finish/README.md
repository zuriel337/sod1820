# research-run: required trace finalization

Branch `gpt/research-run-trace-finish-20261016` starts at exact
`778400b60b7eb6ea230a3ab123c149c7ad8e8e72`. Implementation commit:
`2dc84a2c4398ed7bbcf66ecd2fe97ab83b7b5a13`. This is a separate bounded product
repair authorized on 2026-10-16 (Asia/Jerusalem). PR1111 and its branch remain
unchanged. **Overall acceptance remains BLOCKED.**

Previously, successful composition returned `status: ok` and its Result Bundle
even if `op_trace_finish_v1` failed. The success path now requires a truthy
completion result before returning the Bundle. Failure returns the existing
HTTP 200 envelope `{status: "error", error: "trace_incomplete", trace_id}` with
the same original server trace ID and no Bundle. The existing RPC transport
already maps HTTP failures and thrown transport errors to null; the canonical
SQL migration also returns boolean false when no root witness can be finalized.
No transport, SQL, schema, auth, permission, retry or earlier error branch changed.

## Reproduction and affected checks

| Check | Result |
| --- | --- |
| New regression suite on byte-identical original handler at the base SHA | Expected FAIL: 3 finish cases return `ok`; 19 controls pass |
| Same suite on fixed handler | PASS, 22/22; HTTP503, thrown transport failure and boolean false all suppress Result |
| Earlier error precedence within those 22 tests | PASS, 18 cases combining failed finalization with unavailable/denied/unrecorded gate, composer exception, composer/numeric/operator span failures |
| Successful completion | PASS, actual nonempty canonical composer Result, original interaction→trace→five saved spans, finalization witnessed |
| Updated A3 through the actual Supabase client adapter | PASS, five saved spans and eleven persistence-failure cases; no live acceptance |
| Research Run contract + Operational Trace contract/runtime + replayable Golden | PASS |
| Edge package from committed source | PASS, pinned esbuild0.28.2, 21 committed sources, `verify_jwt=true`; no deploy |
| Independent inherited egress audits for these commands | All empty, including the intentionally failing old-code run |

The exact red/green output, source hashes, A3 output, contract output and packaging
receipt are retained beside this document. The old run used the handler bytes
from the base commit, verified equal before running. Only the helper/test had
been added at that point; the product source was unchanged. In both old and new
runs the helper executes the actual Edge handler, canonical composer and executors
against per-test memory. The only composition replacement is an explicitly forced
exception for the earlier-composer-failure control. Successful results are never
invented by the helper. Its finish response now matches the canonical migration's
boolean contract.

All tests ran under existing `scripts/ci-isolation/run.mjs`: native socket guard,
Node fetch guard, descendant inheritance and independent parent audit. The handler
VM has only the isolated transport and synthetic local credentials. Its origin
`http://127.0.0.1:1` is an in-memory request identity, not an actual listening
service. No product service/DB request, AI or live input acquisition ran. Startup
and passive coordination used only the explicitly authorized owner/work-log path.
The first esbuild spawn hit the managed execution sandbox's EPERM; the same
guarded command passed in the supported execution context, without changing any
guard or source. Packaging is local build verification, not deployment.

On the fixed branch, run from its root with the existing dependencies/tooling:

```bash
node scripts/ci-isolation/run.mjs -- node test/research-run-trace-finish.test.mjs
node scripts/ci-isolation/run.mjs -- node scripts/test-a3-client-correlation-live.mjs
node scripts/ci-isolation/run.mjs -- node scripts/test-research-run-contract.mjs
node scripts/ci-isolation/run.mjs -- node scripts/test-operational-trace-contract.mjs
node scripts/ci-isolation/run.mjs -- node scripts/test-operational-trace-runtime.mjs
node scripts/ci-isolation/run.mjs -- node scripts/test-replayable-golden-no-black-box.mjs
```

Packaging additionally needs the already installed pinned esbuild path in
`SOD_CI_ESBUILD`, as required by the existing isolated packager. It must run after
the product source is committed: its provenance guard rejects uncommitted bundled
sources. `package-receipt.json` binds the implementation commit and every bundled
source blob; the later evidence commit does not change those sources. Node was
24.19.0. No install hooks/dependency changes were needed.

For red reproduction in a separate temporary worktree at the exact base, copy
this branch's focused test and test helper into the same paths, provide the
existing dependencies, and run the first command above. Keep the base handler
unchanged. Expected exit is 1 with exactly the three named finish failures; a
module/setup failure is not reproduction. The regression is also invoked by
`hard-source.sh`, so a future isolated 2029 CI source step will exercise it.

## Five input blockers remain open

This repair does not acquire or change any replay fixture. The exact request
contracts and access requirements remain in the immutable
[PR1111 admission receipt](https://github.com/zuriel337/sod1820/blob/778400b60b7eb6ea230a3ab123c149c7ad8e8e72/docs/perf-evidence-20261015/ci-corpus/admission-v3/README.md#exact-remaining-retainable-inputs):

1. Complete retainable authored Bennett Golden Post input; local-only body review
   is not permission to retain/publish it for browser/CI use.
2. Verified public, account-free Home contributor attribution/identity/count
   projection preserving actual uniqueness and timestamps.
3. Number787 contribution public attribution and exact approved claims/content.
4. Separately admitted retainable public finding projection of `ai_addition`787;
   the previously rejected content read was not retried.
5. Approved retainable exact group-source card/message bodies and provenance;
   aggregate-only inspection cannot supply them.

Full performance measurements and World/Entry acceptance remain incomplete.
This round does not rerun those blocked gates, change thresholds/sample sizes,
assert overall PASS, or claim live trace-finish acceptance. PR1111's exact-head
[CI run](https://github.com/zuriel337/sod1820/actions/runs/38823036854) remains
FAIL for all three jobs, with its previously documented passing subchecks.

## Branch, release and coordination

Fresh `origin/main@503b52ef` instructions/Owner Index and live active owner versions
were checked: `system_suggestions_law`5, `research_strategy_layer_law`17,
`inter_agent_coordination_law`17 and `work_log_authority_law`2. Verdict:
EXTEND_EXISTING. Current ledger showed released PR1111 scope and no overlapping
handler/A3 writer; older unrelated performance claims were not adopted or changed.
The general Supabase connector was identified as write-capable; startup was
read-only. No additional agent/session was activated.

Passive BEFORE `a81122a0-ed79-4067-8bb3-672ebce2e845`, task
`GPT_RESEARCH_RUN_TRACE_FINISH_20261016`, to ZURIEL, dispatch NULL. AFTER releases
this same bounded scope after commit/verification; its record is reported in the
final handoff. No merge, deployment, main/integration movement, product DB/flag or
cloud permission change is authorized. All nineteen workflow definitions and
`gpt/*` deployment disablement were rechecked before a new-branch-only push.
No new PR is opened and no remote CI run is requested by this round.
