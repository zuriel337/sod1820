# Number completion checkpoint — not release acceptance

Task: `PUBLIC_WORLD_NUMBER_ACCEPTANCE_20261101`.
Branch: `gpt/2029-public-world-number-acceptance-20261101`.
Inherited remote Number work: `351c81c1d658de46117781155b232df577cc41d4`.
Comparison product: `7649e46c199ade990fd75ea8400f60f93522ef82`.
World delta still awaiting integration: `b2f18b366bc80628a5b83a7749a49f355caee0a9`.

The existing full-page Number reader now preserves the server's saved Legacy
ordering, uses responsive header geometry, and opens expression/method rows in
their canonical full pages. Connection returns target the exact selected row.
No model is invoked by these reading actions. No engine, rank or stored data is
created or changed. Explicit expression/method addresses take precedence over
the editorial default.

The final Number check found that the typed return action serialized harmless
query encoding (`%20` to `+`). The return helper now preserves the actual query
only when its pairs equal the credential-sanitized query; credential-bearing
queries still use the sanitized result. Tests include repeated parameters,
mixed space encodings and an encoded credential key.

Validation at this checkpoint:

- 54 focused Node tests passed before the final return-helper correction;
  the 10 directly affected Number order/projection/return/source tests passed
  again after that correction.
- The 14-case browser run had 12 passes, including five widths, connection-row
  navigation, enlarged prose, failure/retry and stale-response rejection.
  Its two exact-return failures were then reproduced, corrected in the helper
  and rerun successfully at 390 and 1440 pixels. This is not a claim that the
  earlier 14-case run was entirely green.
- A complete matched first/repeat Number timing run is in progress. It uses the
  actual two compiled clients and immutable real public responses, a modeled
  150 ms/1.6 Mb/s/4x CPU mobile profile, three counterbalanced pairs, and the
  same explicit operand. Results and CLS limitations must be recorded before
  final acceptance; request counts alone are not evidence of faster loading.
- Builder and `git diff --check` passed. Current local build uses the accepted
  Number branch's flags; new unified-branch Preview bindings are not yet added.

All browser traffic uses an independent deny-default public-read barrier.
This is not a real-account write, OAuth, paid model or native service-worker
acceptance. The prior Home CLS concern remains open for attribution and repair
in the unified public task. No main, Production, shared settings or live
product-data changes were made.

The personal Follow/Activity task, including its newly assigned
`razielPhaseMCrossSurfaceGolden.test.js` expectation, is explicitly outside this
public task's write scope. No personal server/test logic is changed here.
