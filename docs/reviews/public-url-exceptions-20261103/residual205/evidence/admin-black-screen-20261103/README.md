# CP1 — mobile black screen after password

Task: `PUBLIC_ADMIN_BLACK_SCREEN_REPAIR_20261103`.
Handoff: `NOW-CENTRAL-HANDOFF-20261103`.
BEFORE: `a87a33d4-54f7-43cf-bada-36d1f2c50eed`.
Base/remote: `fd23e9ebfaa3aaf870f4abd1077da3bb90c188bf`.
Prior hosted product: `d8ee2753482ee9c264795b19c52745da494be63a`,
`dpl_6DekQkT2ByVnPhtPbrFTYmD7bDgZ`.

## Proven defect

The owner reports a black screen after password login on mobile at the stable
protected Preview host. His screenshot does not show the path or a client stack.
The actual hosted product independently reproduces an empty body at
`/2029/control` with a **synthetic locally mocked account**, actual SDK,
application chunks and active SW. Browser error:
`Unknown SOD1820 experience surface: admin` from `SystemFrame2029`'s real
Experience Context resolver. See `before-hosted-synthetic.json` and screenshot.
The reproduction establishes a genuine reachable defect consistent with the
report, without claiming access to the owner's real session/client stack.
Runtime logs show only the Node `url.parse` deprecation warning on `/login`;
there is no evidence that the warning causes the browser crash.

## Bounded correction

* Control Plane supplies the operational frame mode `control`, already used by
  the frame to exclude automatic public feed/context readers.
* That one frame mode reuses the existing approved `heichal` inspection
  projection for visual defaults. No new surface profile, registry or engine.
* Pending verification displays a visible status instead of a blank full-height
  element. Identity/role verification and all privileged-read guards remain.
* No AuthProvider/session/network/DB/RLS/Edge/mail/credit/flag change.
  Public frame modes and Legacy/root routes retain their existing behavior.

## Verification and limits

`focused37.txt`: 37/37 CP1/auth/provider/emitted-worker permission tests, including
one new visible-loading regression. Existing identity-switch/stale-reply,
guest/loading/no-privileged-read, failure-versus-empty and refresh cases retained.
Experience Context and Legacy Production lock gates pass. `build:2029` passes.
Two test-runner setup failures were resolved without changing product/tests:
missing undeclared test helper `react-test-renderer`, then duplicate React copies
in that private helper directory. Helpers are outside the repository; production
dependencies and lockfile remain unchanged.

`hosted-admin-render.cjs` exercises the actual hosted page/shell, password→control
and reload at320/390/1440, separate reader failures, member and guest denial.
All Supabase replies are fixtures, including auth and admin reads; no real
credential/account, model or live product write is used. Its result is a render
regression test, **not real administrator acceptance**. Hosted receipt: `hosted-accepted6.json` — all six scenarios accepted on source `1bc8260adaa889d7903aaa33ef43510df09817f2`, deployment `dpl_ADnf6NL9VznxiiysCQZqoGPguJSE`, READY/targetNULL. Three admin width/reload scenarios passed initially. The other three passed a targeted retry after fixing only the harness: FrameState renders alert/strong, and public/member entry stays on a dedicated private status page instead of redirecting. Initial failures remain in `hosted-initial-with-harness-failures.json`. No runtime changes between those runs. No horizontal document overflow or browser errors in accepted cases; screenshot inspected at390. Actual live data acceptance remains unclaimed.

Owner's latest decision skips manual Google/Facebook acceptance:
`SKIPPED_BY_OWNER_NOT_TESTED`. Their unconfirmed Preview callback and strict
origin protections are unchanged. This does not assert social login passed or
disable social login on Legacy. Prior owner-reported two-account personal
acceptance remains valid. A genuine owner CP1 retry remains outstanding after
the corrected Preview is ready.

No main/site Production/domain action or fresh backup claim; prior B/D receipt,
historical H1 restore and owner's current-backup risk decision remain unchanged.


## Exact handoff Preview

https://sod1820-96jzc6z50-sod1820-s-projects.vercel.app/login?returnTo=%2F2029%2Fcontrol

The existing stable branch host also resolves to that exact deployment. The owner
can reuse his existing Vercel-protected browser session at:
https://sod1820-git-gpt-2029-public-cutover-f-7ce8ee-sod1820-s-projects.vercel.app/login?returnTo=%2F2029%2Fcontrol

Only Preview is deployed. No application Auth secret, share grant or browser
state is in these artifacts. Production remains Legacy. A future Production
creation/cutover request must be rebased onto this accepted runtime rather than
the historical B/D source; no new authorization is implied.
