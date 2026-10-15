# Automatic CI live-write incident

The automatically triggered shared CI violated this task's no-test-writes boundary. Local cold measurements and focused tests had their guards installed before navigation, but the existing shared workflow contains a separate unguarded Node live probe. I should have inspected that probe before opening the PR. This is a recorded incident, not a fully compliant execution or an overall CI PASS.

PR1110 triggered [run 38783045975](https://github.com/zuriel337/sod1820/actions/runs/38783045975) at exact head `92570c7391ef1c7345ae2430d916a71f9e07d8fd`. The pre-existing [workflow step at line288](https://github.com/zuriel337/sod1820/blob/92570c7391ef1c7345ae2430d916a71f9e07d8fd/.github/workflows/2029-isolation-gate.yml#L288) invokes [test-a3-client-correlation-live.mjs:20](https://github.com/zuriel337/sod1820/blob/92570c7391ef1c7345ae2430d916a71f9e07d8fd/scripts/test-a3-client-correlation-live.mjs#L20), which calls live `research-run`. That Edge path begins and records operational traces with service RPCs before returning; the browser fixture guard cannot intercept a separate Node SDK invocation.

Confirmed by matching the CI log to bounded read-only canonical DB queries:

- Interaction `512d8784-6ddf-4367-b247-7be5fff363e4`, trace `0488019d-0547-4ec1-8fb1-151d8b0be43b`.
- One `op_trace_roots` row for `number:878` / `heichal`, outcome `success`, at 2026-10-15 18:08:14.824443 UTC.
- Five `op_trace_spans` rows, through 18:08:19.364508 UTC.
- This is the confirmed minimum, not an exhaustive audit of every shared CI side effect. Do not claim the live database remained unchanged.

On discovery I submitted cancellation and verified all three jobs (`hard-isolation`, `navigation-replay`, `performance-replay`) completed with conclusion `cancelled`. The live A3 step had already completed successfully before cancellation. No remote overall gate PASS is claimed. See `raw/ci-cancellation.json`, `raw/ci-live-probe.txt` and `raw/ci-live-trace-readonly.json`.

I did not delete/tag the trace or perform cleanup writes. Product code, schemas, permissions, switches, shared workflow and test source are unchanged. Main/integration refs were not moved and no deployment was created. The evidence-only final commit uses `[skip ci]` to prevent repeating this known live-write path. It does not alter numerical thresholds or hide a performance regression; local focused/replay/extension/image/build gates remain recorded separately.

Follow-up under the existing CI/release and System Operations owners: isolate or block write-capable Node probes and browser telemetry before rerunning this workflow under a no-product-write assignment; use disposable/test targets or reviewed fixtures. Audit `tests/entry-learn-2029.spec.cjs` as well: its storage egress guard is not a general analytics/write guard. Do not rerun the shared workflow unchanged merely to obtain green checks. This task did not edit those out-of-scope files, grant permissions, create a second guard system or activate another session.
