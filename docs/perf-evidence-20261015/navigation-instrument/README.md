# Navigation replay instrumentation repair — 15 October 2026

Implemented and tested on isolated branch `gpt/perf-navigation-instrument-20261015`,
from exact `0578641f239a045105ee689a4008767aebb788d0`, under the central refreshed
claim `02b54549-7d36-4d55-bc76-43df7158f47d`.

This repairs measurement instrumentation. It is not a product speed improvement
or a passing navigation performance result. The previous CI failure remains
unresolved until the unchanged gate runs again with this runner on both arms.

## Defect and bounded change

The request interceptor awaited `page.evaluate(() => performance.now())` before
starting the fixed fixture delay and fulfilling the response. A busy renderer
could therefore postpone mock network responses. Using the same defective
runner on both builds did not eliminate that coupling to renderer load.

`reads[].at` now records the controller's monotonic `performance.now()` without
contacting the renderer. It is a process-local request observation, not browser
time, and must not be subtracted from renderer timestamps. No consumer in the
navigation comparator uses it: comparisons use request keys, body hashes and
counts. The report describes both clocks explicitly.

The original `readyMs` endpoint and observation window remain unchanged:
renderer timestamp immediately before invoking the action, content-ready check,
two animation frames, then the ready timestamp; observations continue through
the existing 800ms settling window. This includes Playwright's action queue; it
is not a trusted DOM click timestamp. A separate `controllerActionToReadyMs`
records action invocation through that same endpoint using one controller clock.
It does not replace the existing gate metric or feed its thresholds.

`profile.navigationInstrumentation = "controller-read-clock-v2"` makes the
existing profile-equality guard reject comparisons between old and corrected
reports. Both arms of the existing workflow use the runner from HEAD, including
the historical `0825b326` baseline build. The comparator, thresholds, baseline,
workflow, fixture identity/policy and all product code are unchanged.

## Verification

`node --test test/perf-navigation-2029.test.mjs`: **8/8 passed**.

- All six original comparison/guard tests still pass.
- Mixed legacy/v2 profiles fail in either direction; two v2 profiles pass.
- A behavioral test executes the actual production `page.route` callback in an
  isolated VM with `page.evaluate` deliberately blocked. The known synthetic
  fixture fulfills through the existing 150ms timer while that renderer promise
  is still blocked, preserving status, body and hash. It makes no live requests.

Negative control: the same eight tests against the original `0578641f` runner
produce seven passes and the expected blocked-renderer test failure. Thus the
new test catches the original defect rather than merely inspecting source text.
Its registration markers only extract the real callback; behavior is executed.
See `fixed-tests.txt` and `baseline-negative-control.txt`.

Syntax and `git diff --check` pass. An independent bounded source review found no
material issue. Node v24.19.0 satisfies the repository's >=24.9.0 <25 engine range.

## Prior CI failure and remaining check

Run `38744231965`, navigation job `116453533250`, compared baseline
`0825b326ea0fd9faa57b41d0d48bdadada9f3c7f` to `0578641f` and failed solely on
`/world/actual-click` exceeding the existing matched 10% + 100ms allowance.
Printed samples reported zero runtime errors and fixture misses. The precise
failure is preserved in `previous-ci-failure.txt`; source-log provenance is in
`provenance.json`. This defect does **not** prove that failure was artificial.

The workflow uploads `nav-results`, not `nav-fixtures.gz` or the built trees.
The coordinator also received HTTP 403 downloading the results artifact, so
exact prior medians were unavailable. A local paired product replay using the
same frozen CI input could not be performed. No fresh live snapshot or full
local benchmark was substituted. The paired original/fixed callback diagnostic
above is synthetic regression verification, not browser performance evidence.

Next: rerun the existing CI workflow with this corrected runner on both builds.
A real World navigation regression may still fail and must then be investigated
without relaxing the current guard.
