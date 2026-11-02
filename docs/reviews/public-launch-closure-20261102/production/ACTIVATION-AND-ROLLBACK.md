# Remaining activation and rollback gate

Release recommendation: `BLOCKED_BY(exact integrated artifact acceptance,
separate guard approval, recovery acceptance, exact cutover authorization)`.
Implemented/configured/locally tested does not mean deployed or live.

## Separate guard-approval delta

The root `vercel.json`, root `package.json`, `CORE_PUBLIC_LAUNCH_2029=false`,
`scripts/test-legacy-production-lock.mjs`, current Preview builder/guards and
canonical aliases are unchanged by this lane. The original lock passes. It
has not been weakened, skipped or edited in the proposed artifact.

The concrete dormant files are reviewable now. A future activation requires a
separate explicit ZURIEL authorization for the guard change. Its bounded delta
must name the clean integrated source SHA, approved candidate/deployment identity
and intended target; replace the unconditional dormant hosted-build/adapter
denials with exact artifact/target validation; reject all other SHA/deployment/
host combinations; and retain read-only transport, capability closures and
canonical RLS/Auth. No query/header/env-only broad bypass is an acceptable
activation. A protected candidate review must remain noindex and protected.
The resulting exact artifact/deployment is then reviewed before the separate
**2029 Production cutover** decision naming its exact SHA and deployment ID.
The currently accepted `6cd` Preview is not that Production artifact.

Any required amendment to `legacy-production-lock` itself additionally requires
ZURIEL's separate explicit approval under AGENTS.md. The artifact's existence,
a local green build, main integration, generic release approval or Vercel READY
is not that approval. No such approval or amendment is claimed here.

Before cutover, verify the actual current canonical aliases and approved Legacy
deployment live. The emergency literal pin and subsequent documented Legacy
ticker releases differ; never infer an approved rollback target from either a
stale adapter literal or this document. Record the freshly observed exact
deployment/aliases and obtain the required action authorization.

## Concrete code/traffic rollback contract

The Production bootstrap registers `/sw.js` at scope `/` with
`updateViaCache:none`, replacing the same-scope Legacy push worker. All artifact
worker names are no-store and byte-identical. It does not cache HTML, API data,
identities or assets through CacheStorage. Runtime rollback therefore does not
require deletion of a data cache or disabling the public profile globally.

The build copies the actual current `public/sw.js` into
`dist/rollback/legacy-sw.js` and records its SHA-256. That copy is an inspection
receipt, not a root-scope script URL to register in Production. An authorized
rollback returns traffic to the freshly verified approved Legacy deployment,
whose root `/sw.js` contains the Legacy worker. A same-scope registration update
installs that exact script; its existing skipWaiting/clients.claim replace the
reading guard. Refresh/opening the Legacy document then runs Legacy code.

The local functional test begins with the actual Legacy worker, loads the actual
compiled 2029 template and waits for the exact Production policy/SHA handshake,
verifies a synthetic POST is blocked, reloads under the current worker, switches
the server back to the byte-exact Legacy worker and performs an actual browser
registration update/controller replacement. Only after replacement may the
synthetic POST reach the local fixture. This is a browser lifecycle/transport
test, not an actual alias rollback or evidence of Production recovery time.

Old already-open tabs can still display the old document until refreshed.
Before an authorized rollback is accepted, verify fresh and returning public
contexts, `/sw.js` bytes and controller replacement against the exact restored
deployment. No automatic rollback, alias mutation or service-worker unregister
against a live user is part of this task.

## Data recovery remains independent

Website/worker rollback does not restore database rows or media bytes. No data
backup was obtained, no private media copied, no isolated restore run, and no
RPO/RTO measured by this lane. The preserved signed unsubscribe mutation uses
the existing server; rolling website code back does not reverse it. Follow the
existing [recovery prerequisites](../../public-reading-release-20261101/RECOVERY.md)
and the separate recovery lane's live-read audit. Local synthetic fixtures,
worker replacement and Git snapshots cannot close database/media disaster
recovery or the original full A3 gate.
