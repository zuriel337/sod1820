# Isolated A3 correlation acceptance

The original A3 assertions now execute against real disposable PostgreSQL 17,
GoTrue, PostgREST and Supabase Edge Runtime services. The real research-run source
and its canonical executors are bundled from the current checkout without source
changes. A transparent Node gateway forwards API requests to those services; it
does not supply fixture responses.

The [sanitized receipt](isolated-receipt.json) records two original A3 invocations:
one anonymous visitor and one synthetic user created and verified by real GoTrue.
Both returned `status=ok`. Each exact client interaction ID reached a finalized
PostgreSQL trace with root, successful capability gate, composer, numeric and
numeric_operators spans. Trace rows survived an actual database container restart.
Caller trace-table reads were denied. Invalid JWTs were rejected by Auth,
PostgREST and Edge before the A3 calls.

This closes the A3 step on the recorded source. It does **not** alone pass the
complete `.github/workflows/2029-isolation-gate.yml` workflow. The original source
Isolation assertions pass separately; the root integrator owns the combined
candidate's remaining source, build, dependency-graph and browser acceptance.

## Rerun on the integrated checkout

Use the existing project dependencies with esbuild **0.28.2**, a working managed
Docker daemon, and the five digest-pinned images listed in the receipt. If images
are absent, pull those exact references using the managed daemon's supported
proxy/CA configuration. Do not install dependencies into a shared node_modules
link. Then, from the repository root:

```sh
node --test tests/isolation-a3/client.test.mjs
node scripts/test-2029-isolation.mjs --with-isolated-a3 --receipt /tmp/a3-integrated-receipt.json
```

The second command runs every original source Isolation assertion and the real
local A3 stack. It rebuilds the handler and original A3 CLI from that checkout,
records its HEAD and input hashes, and cleans only its uniquely labeled resources.
It does not execute the rest of the original workflow. Default A3 invocation
retains its historical live client; do not run that default against Production.
An isolated invocation selects `SOD_A3_MODE=isolated` and a private local config
before any canonical SDK import. Partial isolated configuration fails closed.

## Isolation and data boundaries

Every service joins one uniquely named Docker `--internal` network. Network and
proxy environment inspection occurs before A3. Runtime proxy variables are
explicitly blank using `--env`; Docker appends proxy defaults after `--env-file`,
so an env-file alone is insufficient. All requested host publication binds to
127.0.0.1. The original A3 CLI runs on gateway-container loopback because this
managed daemon's host loopback is not reachable from the executor. Runtime
services have no external network attachment or default route. TCP probes to
canonical Supabase, a model host, an email host and a public IP must fail. This
network boundary also denies Candidate and other external destinations.

JWT signing secrets, service-role tokens, DB passwords and synthetic Auth data
are independently generated locally. Private files stay in a fresh 0700 /tmp
directory or owned disposable volumes. No Production/Candidate JWT, provider key,
user row or private media is copied. The actual gate uses budget_kind=none; the
receipt verifies no model/provider spans, all costs not_billable, and zero AI
token/quota writes. Signup auto-confirms locally; SMTP targets localhost port1,
external email/SMS hooks are disabled, and network egress is denied.

The content corpus is intentionally empty. The compatible test-only schema has
only columns needed by these original functions, with RLS on every exposed table.
It is not a complete canonical schema, backup or restore. Numeric reads execute
the actual SQL against empty tables; the actual fn_zero_scale definition carries
its own version. Other operator rule versions remain unattested and are never
invented. No production content correctness, recovery RPO/RTO or private-data
restore claim follows from this test.

Schema provenance is the unchanged trace/gate migrations, exact extracted
repository numeric function bodies, and the schema-only read-only definitions in
scripts/isolation-a3/{entitlement,live-schema-functions,zero-scale}.sql, obtained
on 2026-11-02 by the root coordinator. No live source or migration was modified.

## Failed startup attempts

[Startup history](startup-history.json) preserves all fourteen failed development
runs and their fixes, including read-only Docker copy, initialization readiness,
Auth schema ownership/search_path, managed-daemon bind/loopback visibility,
expected JWT denial status and duplicate Docker proxy defaults. Those runs are
FAIL, not partial A3 passes. The first genuine pass was
`sod-a3-mvz386xu-b82ff2`; the latest acceptance receipt is authoritative for this
lane's tested source. Raw diagnostics stay private outside Git.
