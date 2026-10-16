# Central-session media repair handoff

The user confirms the original corpus, manifest and receipts remain available in
the central environment at `/workspace/private-perf-20261016`. Their absence in
this worker environment does not require reconstructing the private collection.
The central session will run the full original World/Entry acceptance on the
final fetched SHA, using the existing corpus plus genuinely captured new public
request responses. Full browser acceptance is NOT_RUN in this follow-up.

## Exact code and existing evidence

Base: `129056338c8d5cd10d6a124953c51f62bd39084a`.
Implementation: `8e485a8ede585593b3ec7d5a708032263861152e`.
Previously fully verified local head: `c85debd40266bdf55d801938819f866fbe7804da`.
Branch: `gpt/numeric-media-publication-20261016`.
Final remote head and final isolated verification are recorded in the passive
AFTER/session handoff. This follow-up changes only this evidence directory.

Product blob `8256786d6967b38a395b5ebd058834c1761eb3a4` and synthetic-test blob
`f18ce21a5263fd3109c95b27af9d9164451608e8` are unchanged from `c85debd4`.
Byte-identical base source plus the same test: 8 passing controls and 5 expected
publication failures. Fixed source: 13/13 passing. The adjacent old/fixed logs
and `evidence.json` preserve that proof. The earlier 132-case/build/graph/source
verification and independent empty egress audit are tied to their exact SHA;
do not treat them as central World/Entry, authenticated or remote-CI acceptance.

## Changed requests and additional public inputs

Only two GET request families change, for each numeric value `N` actually used:

| Family | Membership | Window | Count request |
| --- | --- | --- | --- |
| primary | `primary_value=eq.N` | `limit=24` | no `Prefer: count=exact` |
| secondary | `all_values=cs.{N}` | `limit=40` | `Prefer: count=exact` |

Both now include **`published=eq.1`**, as a server filter before count/window.
Both retain `curator_hidden=not.is.true`, `min_tier=eq.0`,
`order=importance.desc.nullslast,occurred_at.desc.nullslast,created_at.desc`.
Their unchanged projection is:

```text
id,name,description,image_url,thumb_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance
```

`changed-requests.json` contains both full parameter templates and the two exact
observed new 878 URLs, normalized fixture-key variants, headers and response
metadata. It contains no row payloads or credentials.

For every distinct old numeric-media signature in the central corpus and
`source/publication-blocked-keys.json`, capture the corresponding new GET with
the publication filter and the actual observed headers. Freeze its genuine
status, content type, response bytes and `Content-Range`; preserve exact numeric
secondary totals rather than deriving them from the 40-row response window.
Preserve existing response objects and prior snapshot versions.

The eight intentionally unmapped signatures mentioned in the canonical handoff
are not present here, so this worker does not claim to enumerate their specific
values/header variants. The two request families above cover the product change;
the central blocked-key manifest and observed corrected requests supply the exact
finite list. Deduplicate by the runner's actual signature rules, not just `N`.
`policy.cjs` decodes URL escapes in fixture keys; also preserve the header suffix
where that runner includes it. The acquisition receipt's raw URL string is not
automatically a runner-compatible key.

Two genuine anonymous public responses were already captured locally at
2026-10-16 03:36 UTC for 878. Primary returned 16 rows with `Content-Range: 0-15/*`;
secondary returned 29 with `Content-Range: 0-28/29`. Their hashes and timestamps
are in the sanitized request metadata. Raw bytes and original receipts remain
worker-local in `work/public-media/` and are not in Git or the branch. If the
central session cannot privately access these local files, recapture these two
public requests only; do not reconstruct the private corpus. These are observed
counts from that capture, not permanent expected values for later live data.

Never insert filtered payloads under old unfiltered keys, fabricate empty success,
change rejected responses into success, enable a live replay fallback, lower
thresholds or upload private corpus/screenshots/DOM/raw reports publicly.

## Safe branch publication; PR remains blocked

Fresh trigger review covered all 18 workflows at current main `503b52ef` and all
19 at candidate `c85debd4`. Neither tree has push/create/workflow_run/check_suite/
check_run triggers; both explicitly disable Vercel deployment for `gpt/*`.
There is no local pre-push hook. Publishing only the previously absent owned
branch therefore does not invoke the live Number workflow. No PR or workflow
dispatch is requested. The previous broader no-push decision is superseded only
for this verified branch-only action; the PR blocker remains.

A PR targeting `gpt/research-run-trace-finish-20261016` would match the Number
owner gate, whose ordinary browser requests lack the required frozen-input and
network boundary. Do not open that PR until its execution is separately made
safe. Central acceptance must use the existing isolated runner and independent
audit. No merge, deployment, product DB/RLS/permissions/live flags, calculator or
HomeV2 changes belong to this task.

Passive follow-up BEFORE: `5f97edbc-7539-4a2b-83c5-e6bd503f3718`, TO=ZURIEL,
dispatch kind/state NULL. The final passive AFTER releases only this handoff
scope and records the verified remote head and remaining central/PR gates.
