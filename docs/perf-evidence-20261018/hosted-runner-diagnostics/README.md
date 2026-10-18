# Hosted comparison runner diagnostics

Status: **NO_GO REMEDIATION IMPLEMENTED · SYNTHETIC/LOOPBACK GO · INDEPENDENT
RE-REVIEW REQUIRED · NOT HOSTED RELEASE EVIDENCE**.

This evidence-only branch hardens the runner after the independent review of
`3ba284381c3ff98f71fe60b4cf441c30c652c651`. It does not change product code,
the database, a flag, a deployment, Preview protection, CI or release state.
No protected Preview or database was accessed while producing this evidence.

## Exact scope

- Original base: `origin/gpt/perf-unified-wave3-preview-20261018` at
  `37a718f626b45112678ae2be0b963b9ddb4d5873`.
- Remediation base: `gpt/perf-hosted-runner-diagnostics-20261018` at
  `3ba284381c3ff98f71fe60b4cf441c30c652c651`.
- Runner: `../wave3-preview/tools/hosted-comparison-runner.py`.
- Tests: `../wave3-preview/tools/test_hosted_comparison_runner.py`.
- Synthetic fixtures: `../wave3-preview/tools/fixtures/`.
- Hardened runner SHA-256:
  `dbc48e87dc19b4626a810c812df67123306669883c21c7414b603ffa69689c60`.

Every receipt retains this exact runner hash.

## Target and credential gate

`validate_targets` completes before a token is read, a local server starts or
Chromium launches. Hosted targets must satisfy all of these conditions:

- the arm target is an HTTPS origin with no credentials, path, query or
  fragment;
- each arm target appears exactly in a repeated `--allow-preview-origin`
  argument;
- an `--auth-origin` is accepted only with its matching stdin token flag and
  must equal that arm's normalized origin;
- Preview auth follows redirects manually with `max_redirects=0`; each hop must
  remain on that exact HTTPS arm origin. A cross-origin redirect is rejected
  before it is requested, and neither the token nor redirect URL enters the
  receipt;
- SHA arguments are hexadecimal commit identifiers, so a free-form value cannot
  be copied into a receipt as a build identity.

Local `--dist` compatibility remains available. It creates its own exact
`127.0.0.1` origin and cannot accept Preview authentication arguments.

## Default-deny network boundary

Page traffic is denied unless it is one of the following:

1. `GET`, `HEAD` or `OPTIONS` to the exact normalized arm origin;
2. a public REST/Storage read to a database origin named explicitly with
   `--allow-db-origin`; or
3. `POST` to an existing named read-only RPC on that same explicit database
   origin.

No database origin is allowed by default. The known Production Supabase origin
is rejected even when listed unless the caller also supplies
`--allow-production-db`. This makes Production an explicit two-part decision;
the flag was not used in this task. Auth endpoints, unknown RPCs, writes,
analytics origins, other origins, non-HTTP(S) URLs, service workers and web
sockets remain blocked.

Blocked-request records contain a category, destination class, method, safe
scheme, query-key classifications and hashes. They do not retain the blocked
host, URL or path.

## Receipt privacy and diagnostic value

The request ledger continues to record start/completion/failure/pending state,
resource and initiator type, start/end time, measurement cutoff, transfer bytes,
encoded body bytes and decoded body bytes. It never records request/response
bodies, headers, cookies or query values.

Additional hardening now applies before serialization:

- only HTTP(S) schemes survive; unsupported schemes are represented without
  their URL;
- secret-like, high-entropy, UUID and long path segments are replaced by a
  deterministic fingerprint;
- only a small safe set of query-key names remains readable; suspicious and
  unknown names are fingerprinted, and all values are discarded;
- blocked requests use `[blocked-url]`, `[blocked-path]` and `[blocked-host]` in
  the network ledger;
- console, page, navigation and network failures retain a bounded category and
  fingerprint only. Free error text is never written.

Adversarial tests cover tokens in paths and query-key names, naked secrets,
`sessionid`, FTP, cross-origin redirects and error strings.

## Counterbalanced A/B acceptance

Hosted comparison mode is explicitly **counterbalanced paired A/B**. Pair order
is deterministic: `AB, BA, AB, BA...` (or its inverse with `--ab-first b`). A
pair is useful only when both arms complete the same route/profile journey.

The receipt contains `acceptance.valid`. It can be `true` only when every direct
route and Home-to-World journey, on both mobile and desktop profiles, has at
least seven complete successful pairs. A missing arm, duplicate arm or partial
pair invalidates that journey. An invalid A/B receipt is still written and the
runner exits with code 2.

Single-arm mode preserves its three-sample default and prior summary fields for
replay compatibility. Its acceptance value is `null` because it cannot support
a causal A/B release claim. A committed golden fixture protects the old CLI
defaults and legacy network/aggregate output fields.

Example hosted invocation (illustrative origins only):

```bash
python docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py \
  --origin https://arm-a.example.test \
  --allow-preview-origin https://arm-a.example.test \
  --sha aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --origin-b https://arm-b.example.test \
  --allow-preview-origin https://arm-b.example.test \
  --sha-b bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  --samples-per-arm 7 \
  --output /tmp/hosted-ab.json
```

Protected deployments add the matching `--auth-origin` and stdin-token flag for
each arm. Tokens must be piped via stdin and must never appear in arguments.

## Verification

Focused tests pass **13/13**. They cover target ordering and exact allowlists,
auth redirect containment, Production DB denial by default, default-deny
network decisions, sanitized blocked records, the full request ledger,
adversarial secrets, deterministic counterbalancing, seven-pair acceptance,
nonzero invalid-result status, arm-separated aggregation, runner hashing and
golden single-arm compatibility.

A disposable local build was then served only on loopback through the unchanged
single-arm CLI. All **10/10** samples succeeded: both profiles, all four direct
routes and Home-to-World. Every sample retained a request ledger and cutoff;
there were zero blocked requests and zero sample failures. These numbers prove
runner operation only and are not product-speed evidence.

Commands run:

```bash
python -m py_compile \
  docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py \
  docs/perf-evidence-20261018/wave3-preview/tools/test_hosted_comparison_runner.py
python -m unittest \
  docs/perf-evidence-20261018/wave3-preview/tools/test_hosted_comparison_runner.py -v
python docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py --help
python docs/perf-evidence-20261018/wave3-preview/tools/hosted-comparison-runner.py \
  --dist /tmp/sod1820-hosted-runner-loopback \
  --sha 37a718f626b45112678ae2be0b963b9ddb4d5873 \
  --samples-per-arm 1 \
  --output /tmp/hosted-runner-hardening-loopback.json
git diff --check
```

## Limits

- The hardened hosted/auth path has deterministic synthetic coverage but was not
  exercised against a protected Preview in this task.
- No external database path was exercised. A future authorized run must list
  the exact database origin and should prefer a non-Production source.
- Default denial can expose previously implicit third-party dependencies as
  blocked requests. Such a sample must be reviewed; the allowlist should not be
  widened without a concrete read-only dependency and evidence.
- Alternation reduces time-order bias but cannot equalize CDN, regional or
  database cache state. Hosted evidence still needs identical settings, exact
  arm SHAs, seven complete successful pairs per journey and independent review.
- The coordination ledger was read before the change and showed the prior scope
  released. This worker did not have an approved work-log writer, so no new
  `work_log` record was created; the central session owns that handoff.
