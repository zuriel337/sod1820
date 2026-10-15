# PR1111 continuation: UDP fixed; full acceptance still blocked by inputs

Continuation from exact `da86e7e06771391e1b8003461e349fbc7204488f`, following
the [central review at f63268a3](https://github.com/zuriel337/sod1820/blob/f63268a36243eecb249a945ae46812d1a201c66c/docs/perf-consolidation-handoff-20261015.md).
Same branch/PR1111 and target `gpt/perf-cold-measurement-20261015` at
`8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`. Integration remains
`14e239b47e5ec6b95eaad4e1b368520512642217`; main remains
`503b52ef169b6e51f967187491398d153090aa45`.

**This is a partial completion, not acceptance of the three full gates.** No
complete reviewed frozen input was recovered. No source payload was copied,
recaptured, uploaded or replaced with empty responses. Full replay and browser
acceptance must remain blocked rather than pass with missing data.

## UDP regression and local verification

`network-guard.c` now checks the peer before connected-datagram `write` and
`writev`, at transmission time. Packetless UDP `connect` remains usable by
Chromium route detection; ordinary file writes retain their behavior. The
native preload is a cooperative test boundary, not protection from hostile
native code. All three GitHub jobs retain the loopback-only network namespace.

- Historical control uses the exact old guard from `da86e7e0`, both APIs and
  IPv4/IPv6 local traps only: each trap receives one packet, outer exit 0,
  audit 0 bytes. This reproduces the review defect without contacting production.
- Fixed guard: four forbidden peer cases have zero trap hits, child exit 0
  after swallowing EACCES, and outer exit 1 with `CI_EGRESS_FAILURE`.
- Four unguarded local controls and four explicitly registered peer controls
  deliver the expected single packet. Packetless connect and ordinary file
  write/writev pass. Total: 14 UDP tests.
- Full `hard-source.sh` passed locally under the updated native/Node boundary,
  audit 0 bytes. It includes actual-handler A3 (five saved in-memory spans,
  nine persistence-failure cases), production build/budgets, all existing
  source gates, PR1110 measurement tests, four Chromium measurement tests,
  17 existing Node/curl/browser/worker/beacon/teardown egress controls and
  the 36 existing image/source fidelity tests. This host run does not claim
  the GitHub network namespace was available locally.
- Final focused run: 28/28 (14 UDP, 11 snapshot contract, 3 configuration),
  audit 0 bytes. The extra catalog contract test was added after the full
  source run and passed in this final focused run.

Raw logs and JSON receipts are under `raw/`. Reproduce the historical control
from the repository root with `node docs/perf-evidence-20261015/ci-isolation-completion/reproduce-old-udp.mjs`.
The ordinary tests run with `node --test test/ci-isolation/udp-write.test.mjs`.
All trap destinations are ephemeral local IPv4/IPv6 UDP or HTTP listeners.
A3 uses the real SDK and handler with per-test memory, never a live trace table.
Live A3 acceptance is **NOT_RUN**. The known product trace-finish defect is
unchanged and still detected by the independent stored witness.

## Input recovery, provenance and precise blocker

See `input-provenance.json` and `raw/input-inventory.json` for hashes, source
dates, availability and privacy classification. The inventory tool emits only
counts, endpoint classes and field names; it does not publish identities or bodies.

The exact PR1110 private snapshot (`224ebd7b…001c6c9f`) is absent from this
workspace. Both reviewer-local Topic snapshots are also absent; their paths
and known hashes are recorded without claiming they were read here. A bounded
workspace search found the two identical committed scroll snapshots only.
Existing incident-run artifact metadata and the old upload paths were checked:
they contain reports/screenshots, and the old workflow explicitly excluded
upstream fixture bodies. No approved complete restricted artifact source was
identified. The existing repository is public.

The available scroll input has 106 responses, 20 legacy MD5 request keys, no
header signatures, neither complete required primary post, no
`fn_number_lookup`, and 18/18 image bodies containing UTF8 replacement bytes.
Its bodies also contain `wa_names`, `dossier_settings`, author/owner user fields
and internal post fields. Existing publication of this file does not authorize
republishing those bodies. A matching digest cannot repair missing arguments,
headers or destroyed binary bytes.

Read-only live catalog inspection checked relation policies, the public Topic
view and named RPC definitions. No live HTTP/RPC capture was run and no content
rows were exported from that inspection. An anon-readable table or a STABLE
function declaration alone does not establish that every returned field may
be republished or that all called functions lack external effects. It is not
used as blanket approval for live capture.

Required next input is either a complete reviewed/retainable public corpus or
an immutable complete input from an **existing approved restricted mechanism**,
staged before the offline phase. It must supply all consumed responses for:

- Performance: Home/World/full seventh-to-tenth Post, original 1586px JPEG and
  original native 768px rendition bytes, trace data and all deferred reads;
  all 16 image cases and the delayed/failed-extension scenario.
- Navigation: both immutable builds' request union, complete request arguments
  and prefer/range/accept-profile signatures, catalog 0/3, 0/9, 0/25 and 2/23
  with exact totals and matching order, full Post and selected Topic/Number
  navigation, Back/forward/revisit and catalog failure/retry/return data.
- Browser: authored Bennett Post and verified 631 focus/trace, all World/Entry
  requests, Topics 888 and 98, canonical Number results (including 98, 1237,
  596, 1118, 358, 878, 1326 and 631), rich/medium/sparse anchor data, published
  media, books/ELS and the existing loading/error/private-gating scenarios.

These requirements preserve the original functional assertions, row volumes,
seven samples per compared route and all performance ceilings. A dedicated
synthetic corpus would need its own declared experiment and cannot be labeled
live-data parity. No such substitute was supplied here.

## Preflight and CI status

`snapshot-contract.cjs` adds minimum semantic coverage checks and canonical
binary/base64 validation. Manifest entries now bind the source hash/date/access,
privacy review, coverage reference and compressed SHA. Navigation header
signatures remain distinct. Catalog validation checks nonempty 2/8/24 ordering,
continuation rows and exact totals. Every full isolated gate repeats this
preflight internally. This is a minimum check; complete runtime gates and
unmapped-request failures still determine full acceptance.

Negative tests reject hash corruption, missing provenance/review/coverage,
empty/corrupt responses, structurally valid incomplete inputs for each gate,
lost header signatures, reordered catalog rows/conflicting counts, and damaged
image bytes. Tests use small synthetic **unit inputs only**, never gate fixtures.

Local workflow-equivalent preflight attempts for performance, navigation and
browser each exit 1 before any application/browser connection because
`test/fixtures/ci-2029/manifest.json` and the complete reviewed snapshots are
not provisioned. **Zero matched performance/navigation samples; zero of the
16 image cases and full World/Entry data-dependent cases were executed.**

Before publication all 19 workflow definitions were inspected. Only the
2029 Isolation Gate matches this PR target and change set. There are no push,
pull_request_target or workflow_run handlers; main-only gates do not match.
Its workflow definition comes from the PR merge ref and all three jobs check
out the exact PR head. Dependency setup disables application lifecycle hooks;
all application/build/test execution remains inside the namespace boundary.
The unchanged Vercel `gpt/*` rule disables deployments. See `trigger-review.json`.

This committed evidence records local/pre-push results. The exact new SHA's
remote result is linked in the updated PR1111 description and passive AFTER;
no rerun of either old run is authorized or needed. A source-step PASS must
not be relabeled as three-job PASS. No merge/deployment/product change occurred.

Passive coordination: BEFORE `318062ce-52bc-4e5d-af60-62c59e6fed40`, task
`GPT_PR1111_CI_COMPLETION_20261015`, to ZURIEL, dispatch fields NULL. AFTER
releases this scope after recording the exact remote result.
