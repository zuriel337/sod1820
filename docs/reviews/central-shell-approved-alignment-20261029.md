# Central Preview shell: approved-contract alignment

Task: `CENTRAL_2029_SHELL_APPROVED_ALIGNMENT_20261029`.
Branch: `gpt/2029-central-shell-alignment-20261029`.
Base: `346e3b169ed3f9bf589c3050ab19c0ae7d0e728f`, the existing central hosted Preview.
BEFORE: `607ab5cb-3a99-46c8-80fd-1c02fba3f55e`.

## Authority and ownership

ZURIEL explicitly requested this session to align the central Preview shell with
the already approved design, subject to no conflicting writer. Current-view
claims were checked against bounded history for their exact task keys: the older
Raziel/integration frame scopes were released. The writer-personal chain released
its frame scope in `08d51316-174a-4842-98ab-bf4aa6a1b5be`; a later bounded
WatchButton release did not reclaim it. No World, Home, Topic, Post or Books page
was edited, including the elections session's active Topic connection.

References: Design V2 sections 8.1/11.8 and System Frame addendum sections
3.4/3.5.3. Keep one right global rail, one left Companion and one bottom command
island with the existing Raziel session. This is a bounded implementation of
approved behavior, not a new shell or blanket change in visual authority.

## Result

- An explicit Updates/Context choice survives a subject change within the mounted
  frame. A new principal resets that transient choice. No persistent store added.
- Number navigation opens the existing Command search without choosing 1820 for
  the user; the existing Number maintenance lock remains effective.
- Both public source shortcuts retain their source query and target the actual
  source map. The shell finishes anchor navigation after that lazy section mounts.
- Meaningful Companion text uses at least 14px; existing tokens, icons, controls,
  rail composition, 44px targets and quiet/hints/open Raziel behavior are preserved.
- The exact new branch is permitted by the existing static Preview builder, with
  mock-only Raziel and the central guard blocking Person creation and ELS traces.

## Verification

24 focused Companion/Preview/auth/preference cases; 656 broad Raziel cases;
Legacy and 2029 builds; built graph and lazy adapter/Research Plan; isolation;
System Frame; cheap hardening; Legacy lock; diff check.

Chromium fixture mounts the actual Auth/Research/Frame components and the actual
World source view. Fifteen width/theme combinations (320/390/980/1100/1440 x
Day/Parchment/Night) passed. Additional checks passed for both filtered source
shortcuts, their real section being in the viewport, and Number lock at 390/1440.
No model request, external product mutation or browser page error occurred.
Existing built-App Companion browser check also passed for desktop and 320px.

The fixture uses synthetic public data; it is not evidence of live backend or
authenticated/private-content acceptance. Evidence is retained outside the
checkout under `/workspace/artifacts/central-shell-alignment-20261029`.

Hosted SHA/deployment/alias verification and the final scope release are recorded
in the AFTER entry. Only the central Preview alias may be updated. Main, live
Legacy domains, product data, RLS, Edge Functions and payments are outside scope.
