# Hosted comparison runner diagnostics

Status: **IMPLEMENTED AND SYNTHETICALLY TESTED · TOOLING ONLY · NOT RUN ON A
HOSTED PREVIEW · NOT RELEASE EVIDENCE**.

This change closes the evidence gap recorded by the Wave 3 receipt: the runner
now retains a sanitized ledger for every network request seen before the
measurement cutoff, including requests that are still pending. It also adds a
deterministic alternating hosted A/B mode. No product source, database, flag,
deployment, Preview protection, CI workflow or release state was changed.

## Exact baseline and files

- Base: `origin/gpt/perf-unified-wave3-preview-20261018` at
  `37a718f626b45112678ae2be0b963b9ddb4d5873`.
- Work branch: `gpt/perf-hosted-runner-diagnostics-20261018`.
- Updated runner:
  `../wave3-preview/tools/hosted-comparison-runner.py`.
- Focused test:
  `../wave3-preview/tools/test_hosted_comparison_runner.py`.
- Synthetic CDP event fixture:
  `../wave3-preview/tools/fixtures/network-events.json`.
- Runner SHA-256:
  `972cc39ac40f4c7bee04640d600d647727fa95fc96549203a80f33044440116f`.

The runner also writes its own SHA-256 into every new receipt and prints it in
the final console record. This makes a receipt self-identifying without relying
on a manually copied hash.

## Request ledger

Each successful sample keeps the existing aggregate fields and adds:

- `measurement_window.start_ms`, `usable_ms`, `cutoff_ms`, and the actual
  post-usable observation duration;
- started, completed, failed and pending request counts;
- `network_requests`, ordered by start time, with sanitized URL and path,
  query-key names only, method, resource type, sanitized initiator, HTTP status,
  state, start/end/duration and completion phase;
- transfer bytes from CDP `loadingFinished.encodedDataLength`, encoded body
  bytes from `dataReceived.encodedDataLength`, and decoded body bytes from
  `dataReceived.dataLength`.

`request_count` and `transfer_bytes` retain their prior settled-request meaning
for compatibility. The new `request_started_count`, `request_completed_count`,
`request_failed_count` and `request_pending_count` expose the measurement-window
effect directly.

The capture covers HTTP/network requests; `data:` and `blob:` resources are not
network transfers and remain excluded. It never records request or response bodies, request headers, auth
headers or cookies. URL credentials and fragments are removed. Query parameter
values are discarded before a request enters the receipt; only sorted parameter
names remain. LCP URLs, page paths, network-failure text and console/page error
URLs pass through the same sanitizer. Share tokens remain stdin-only and are not
written to the receipt.

## CLI compatibility and alternating A/B mode

Existing invocations remain valid. Single-arm mode still defaults to three
samples per route/profile and preserves the existing top-level receipt and
summary fields. `--samples-per-arm` can override that count.

Hosted A/B mode uses the existing `--origin` and `--sha` as arm A and adds
`--origin-b` plus `--sha-b` for arm B. It requires at least seven samples per
arm. Pair order alternates deterministically as `AB, BA, AB, BA...`; `--ab-first
b` reverses the pattern. Each run records its arm, per-arm sample number, pair
number and position, and aggregation remains separated by arm.

Example with public loopback-style origins:

```bash
python docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py \
  --origin https://a.example.test \
  --sha aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --origin-b https://b.example.test \
  --sha-b bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  --samples-per-arm 7 \
  --output /tmp/hosted-ab.json
```

For protected deployments, pass the matching `--auth-origin` and
`--auth-origin-b`. Arm A can read one token line with `--share-token-stdin`;
arm B can read a second line with `--share-token-b-stdin`. Tokens must be piped
through stdin and must never be placed in command arguments or receipts.

## Verification

The focused synthetic suite passes **5/5** and proves:

1. URL credentials, fragments and query values do not survive sanitization.
2. Seven-sample A/B scheduling is balanced and exactly reproducible.
3. Completed, failed and pending requests survive the cutoff with resource and
   initiator type, byte counters and completion phase.
4. A/B summaries do not combine the two arms.
5. The reported runner hash equals the exact file bytes.

A disposable loopback build then exercised the unchanged single-arm CLI with
one sample across both profiles, all four direct routes and Home→World:
**10/10 samples succeeded**. The generated receipt contained a ledger and
measurement cutoff for every sample, reported the exact runner hash above, and
contained none of the synthetic query values. The temporary build and receipt
remain under `/tmp` and are not evidence about product speed.

Commands run:

```bash
python -m py_compile docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py
python -m unittest docs/perf-evidence-20261018/wave3-preview/tools/test_hosted_comparison_runner.py -v
python docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py --help
git diff --check
```

No protected Preview was accessed, no bypass was created, no CI was run, and no
external network measurement was performed in this task.

## Limits

- This does not reconstruct the two unidentified late Mobile Home requests in
  the old Wave 3 receipts. It makes future runs diagnosable.
- CDP transfer bytes include protocol overhead according to Chromium's
  `encodedDataLength`; encoded/decoded body counters come from data events and
  may differ from transfer bytes. All three are retained deliberately.
- Query values are intentionally unavailable, so value-specific cache-key
  diagnosis requires a separate private investigation that must not enter a
  receipt.
- Alternation reduces time-order bias but does not control CDN, database or
  regional cache state. A hosted result still needs identical browser/network
  settings, both arms in the same run, at least seven successful samples per
  arm, and honest failure reporting.
- Default single-arm mode remains a compatibility/replay mode. Its three-sample
  default is not sufficient for a new causal A/B release claim.
