# Research actions under verified admin access

Implementation on `gpt/2029-admin-full-access-auth-20261103`, based on product
`c8e05790fe68c8f548e22a7c02e5094ddc5b8755`. Central task/ownership:
`PUBLIC_LAUNCH_ADMIN_FULL_ACCESS_AUTH_20261103`, BEFORE
`aa4a757e-4dcc-467c-b902-4521b17dc4ef`. This is source implementation and isolated
acceptance, not evidence of live administrator operations or a deployment.

## Changes

- `ResearchProvider` uses the existing verified AuthContext admin projection to
  admit private research reads, explicit saves, saved-path resume/fork, and the
  existing ELS operation. Public/member operations remain closed. Claiming an
  admin role in user metadata, or an admin boolean without a principal, grants
  no access through this provider.
- Context, source position, and exact-return navigation remain usable locally.
  The runtime remains keyed by principal; role revalidation does not remount it
  or discard work. A different account receives its own runtime before render.
- Access loss invalidates asynchronous reads/acknowledgements and stale action
  callbacks. It preserves the immutable pending request and durable journal.
  An already-sent operation cannot be retroactively undone; its uncertain
  result remains subject to the existing request identity and server receipt.
- In the public-reading build, login and route/history observations do not
  replay queued writes. Explicit editing/saving, confirmed conflict recovery,
  or explicit retry enables the existing synchronization queue. Restoring
  permission suspends replay until a new explicit action. Legacy's default
  synchronization behavior is unchanged.
- Tracking, AI behavior signals, and journey telemetry remain disabled in the
  public-reading build, including for admin. ELS execution still requires an
  explicit invocation. No model, payment, mail, or server test write was made.

## Read verification

Canonical read-only metadata inspection on 2026-11-03:

| Existing function | Definition MD5 | Observation |
| --- | --- | --- |
| `fn_research_path_resume_v1(uuid)` | `1d66e721422670ed464c32c683b5ca82` | STABLE; own-principal saved-path reader |
| `research_state_snapshot_v1(uuid)` | `1200ad352c3b8da762659e090cff059a` | Existing advisory transaction lock and SELECTs; inspected live definition contains no data mutation |

These functions were inspected, not invoked with a real user's private data.
Their existing JWT/expected-principal checks and server permissions were not
changed.

## Acceptance

- `node --test src/lib/research/researchSyncRuntime.test.js src/lib/research/researchSyncRecovery.test.js test/doc37-research-reading-access.test.mjs test/doc37-runtime-admission.test.mjs`: **51 passed**, no skips.
- `node scripts/test-research-path-resumability-runtime.mjs`: acceptance PASS,
  including **6 continuity cases**.
- Scoped `git diff --check`: PASS.
- Actual Provider is compiled with the release constant enabled and mounted
  under React StrictMode. Auth/router/network boundaries use isolated fixtures.
  Tests cover member/guest denial, admin read-only startup, explicit save/path
  operations, account switching, role loss/regain, late results, exact return,
  and absence of automatic model/telemetry activity. They are not a substitute
  for hosted real-admin acceptance.

Files owned by this internal subtask: `ResearchProvider.jsx`,
`researchSyncRuntime.js`, `researchSyncRuntime.test.js`,
`test/doc37-research-reading-access.test.mjs`, and this report. No independent
commit, push, shared setting change, database write, or deployment.

Central integration must still verify authenticated transport admission for
the existing read/write RPCs and the ELS adapter, and complete the hosted
administrator session check. No public role or shared site flag was opened.
