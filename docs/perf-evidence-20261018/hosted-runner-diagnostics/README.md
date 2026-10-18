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
- Redirect-parser remediation base:
  `d05a5d1d15542c2838a05413d42192f08cce37b4`.
- Runner: `../wave3-preview/tools/hosted-comparison-runner.py`.
- Tests: `../wave3-preview/tools/test_hosted_comparison_runner.py`.
- Synthetic fixtures: `../wave3-preview/tools/fixtures/`.
- Hardened runner SHA-256:
  `6f2f4f31ce6336b39923e7cb1a9b1f24ae5f5a4e6bebc93cea77b4f1e392ca0e`.

Every receipt retains this exact runner hash.

## Target and credential gate

`validate_targets` completes before a token is read, a local server starts or
Chromium launches. Hosted targets must satisfy all of these conditions:

- the arm target is an HTTPS origin with no credentials, path, query or
  fragment;
- each arm target appears exactly in a repeated `--allow-preview-origin`
  argument;
- paired A/B arms must use two different normalized origins. An arm or auth
  origin cannot be the known Production database origin or any origin listed
  with `--allow-db-origin`; the arm and database sets must be disjoint;
- an `--auth-origin` is accepted only with its matching stdin token flag and
  must equal that arm's normalized origin;
- Preview auth follows redirects manually with `max_redirects=0`. A Location is
  accepted only as one leading-slash origin-relative path or an absolute HTTPS
  URL with a parser-stable ASCII authority. Raw or encoded backslashes/slashes
  and controls, whitespace, scheme-relative or ambiguous schemes, fragments,
  userinfo, Unicode authorities and nonmatching ports/origins fail closed. The
  normalized origin must equal the arm on every hop before the next GET. This
  avoids the `urllib`/WHATWG differential where backslashes can be interpreted
  as authority separators by Chromium. Neither the token nor redirect URL
  enters the receipt;
- TLS verification remains enabled for every hosted and local browser context;
- before sampling and again in every sample, the runner fetches the canonical
  same-origin `/preview-build.json` with automatic redirects disabled. It
  requires `application/json`, a bounded JSON object, the exact 40-character
  expected commit, `buildTarget:"2029"`, `readOnly:true`, and a 64-character
  manifest hash. A missing marker, a mutable marker, a commit mismatch, an
  invalid contract, or a 200 HTML SPA fallback fails closed. CLI SHA values are
  only expected inputs; they are never accepted as proof on their own.

The marker is a repository build-artifact contract, not a new assumption in
this runner. `scripts/build-integrated-preview.mjs:82-84` writes it,
`preview-deploy/package.json:4` invokes that builder, and
`scripts/perf-execution-2029/hosted.mjs:19-21` consumes it. The builder commit
`d7f7f7c00ae9b0bc366ed47c4e77a89177863021` is an ancestor of the reviewed
Wave3 base `6124db8d7ddac82654a09c49abf8ed60fe999d47`. This task did not access the
current protected Preview, so availability and values on that deployment remain
unverified until an authorized hosted run.

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
the flag was not used in this task. The known Production origin can never be an
arm even with that acknowledgement. Auth endpoints, unknown RPCs, writes,
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
- every host is replaced by a deterministic fingerprint. Every path segment
  outside a narrow literal allowlist is fingerprinted, including short opaque
  values; only a small safe set of query-key names remains readable, while all
  other names are fingerprinted and all values are discarded;
- initiators retain only type, host/path fingerprints and numeric source
  positions. An initiator URL is never serialized. Boundary metadata also
  fingerprints database and analytics hosts;
- blocked requests use `[blocked-url]`, `[blocked-path]` and `[blocked-host]` in
  the network ledger;
- console, page, navigation and network failures retain a bounded category and
  fingerprint only. Free error text is never written;
- a local `--dist` path is represented only by its SHA-256 fingerprint. LCP
  element IDs and class names are omitted, and local SPA file resolution uses a
  real filesystem boundary, including resolved symlinks.

Adversarial tests cover tokens in paths and query-key names, naked secrets,
`sessionid`, FTP, cross-origin redirects, raw/mixed/encoded slash and backslash
forms, whitespace and controls, userinfo, Unicode/IDNA hosts, ports and error
strings.

## Counterbalanced A/B acceptance

Hosted comparison mode is explicitly **counterbalanced paired A/B**. Pair order
is deterministic: `AB, BA, AB, BA...` (or its inverse with `--ab-first b`). A
pair is useful only when both arms complete the same route/profile journey.

The receipt contains `acceptance.valid`. It can be `true` only when every direct
route and Home-to-World journey, on both mobile and desktop profiles, has at
least seven complete successful pairs. Both samples in every accepted pair must
carry a valid canonical build identity, and every sample for an arm must retain
one consistent commit/manifest tuple. A missing arm, duplicate arm, partial
pair, absent identity or mutable deployment alias invalidates the evidence. An
invalid A/B receipt is still written and the runner exits with code 2.

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

Focused tests pass **23/23**. They cover target ordering and exact allowlists,
arm/database separation, auth redirect containment and parser differentials,
strict hosted TLS, canonical build identity and 200 SPA fallback rejection,
Production DB denial by default, default-deny network decisions, sanitized
blocked records and boundary metadata, the full request ledger, adversarial
secrets, filesystem-bound local routing, deterministic counterbalancing,
seven-pair and immutable-build acceptance, nonzero invalid-result status,
arm-separated aggregation, runner hashing and golden single-arm compatibility.

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
  exercised against a protected Preview in this task. Hosted evidence is
  invalid unless that Preview serves the canonical marker with the expected
  commit and a stable manifest hash.
- No external database path was exercised. A future authorized run must list
  the exact database origin and should prefer a non-Production source.
- Default denial can expose previously implicit third-party dependencies as
  blocked requests. Such a sample must be reviewed; the allowlist should not be
  widened without a concrete read-only dependency and evidence.
- Alternation reduces time-order bias but cannot equalize CDN, regional or
  database cache state. Hosted evidence still needs identical settings,
  canonical build receipts, seven complete successful pairs per journey and
  independent review.
- The coordination ledger was read before the change and showed the prior scope
  released. This worker did not have an approved work-log writer, so no new
  `work_log` record was created; the central session owns that handoff.
