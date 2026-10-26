# SG rate-limit runtime OIDC — isolated candidate

Status: branch-only auth-path correction; NO Production release or live DB change.

## Baseline and reproduced defect

- Live Legacy: `dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`,
  `8bc5980fe80fdee30652c8f2364608b5916180e3`.
- Candidate base: current main `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.
  Its middleware/core match the live Production source. Main is not changed.
- Branch: `gpt/sg-rate-limit-runtime-oidc-fix-20261026`.
- Coordination BEFORE: `25ac6754-05c7-4e9d-9582-2fe912cb5139`;
  diagnostic-only scope addendum `cffa95a8-cf08-45b2-9767-d172dc2efa64`.
- Bounded live Vercel log lookup at 15:35–15:50 UTC confirms
  `sg-rate-limit fail-open: missing VERCEL_OIDC_TOKEN`.
- Live policies were read: CN quarantine L2, SG quarantine L3. No policy writes.
- Live `sg-rate-limit` v1 source equals the repository copy, byte for byte.

The old accessor reads only `process.env.VERCEL_OIDC_TOKEN`. Vercel's official
`@vercel/oidc` synchronous lookup reads the platform-owned request context first,
then the environment. The missing-context branch was reproduced before the fix:
three new regression cases failed while the existing env-only fixture passed.

## Bounded correction

Extend the existing private `vercelOidcToken()` accessor using the same Edge-safe
lookup contract as `@vercel/oidc` 4.0.3 `getVercelOidcTokenSync` / `getContext`:

1. `globalThis[Symbol.for('@vercel/request-context')].get().headers` token;
2. existing environment fallback when the server context has no token.

No raw incoming Request header is read for authentication. No bearer is cached,
printed, written, returned to a client, or manually provisioned. Current-request
context takes precedence over a potentially stale environment value. No Node/CLI
credential-refresh SDK is imported into Edge middleware, and no new runtime
dependency or parallel identity/authentication system is introduced.

Missing token, network failure and backend rejection retain the existing fail-open
policy. The warning now accurately names both token sources. This task does NOT
silently convert temporary limiter failure into country blocking.

## Acceptance and invariants

- New tests execute the real unchanged SG handler with real pinned JOSE 6.2.12.
  Synthetic RSA private keys exist only in memory; fixture JWTs are not valid
  against Vercel's real JWKS. All external network routes are stubbed locally.
- Request-context-only token succeeds with no env token; stale env cannot replace
  it; rotating context tokens are read afresh. Existing env fallback still works.
- Raw client OIDC header is not accepted as server context. Wrong signature,
  owner/project/name/subject and Preview environment do not reach the bucket RPC.
- Proof precedes limiter access. CN L2, SG L3, Google/Bing/AI bypass, bad-bot block,
  original anon key, classification and SEO route behavior remain unchanged.
- Full local chain uses an owned disposable PostgreSQL17 container with no network,
  exposed port, user mount or real credential. The fixture carries the unchanged
  live RPC definition. Eight `/research` requests pass; the ninth returns429 with
  Retry-After300. The actual SQL row has count9 and epoch/300 bucket, not epoch/3600.
- The local test database is removed automatically after execution. No live
  Supabase bucket is created or modified. JOSE is a pinned dev dependency only.

Commands:

```sh
SOD_SG_LOCAL_PG=1 npm run test:cn-sg-security
npm run build:legacy
npm run build:2029
node scripts/test-legacy-production-lock.mjs
git diff --check
```

Without `SOD_SG_LOCAL_PG=1`, the Docker/SQL case is explicitly skipped, not falsely
reported as executed. The remaining cryptographic and policy tests still run.

## Protected remote runtime diagnostic

`test/fixtures/sg-oidc-preview` is a diagnostic-only Vercel root, never a root-site
route or public product surface. The build copies the exact canonical accessor
from this candidate into an ignored generated module and stamps its Git SHA/hash.
The remote Edge probe verifies its actual Vercel Preview token using public JWKS
and returns only presence/signature/scope booleans and SHA. No token leaves Vercel.
It never calls Supabase, consumes a live bucket or mounts existing site APIs.

The builder refuses Production or another Git branch. Use only a protected
`target=null` Preview with this fixture root; never a custom/public-domain alias.
Runtime results/deployment identity are recorded in the passive AFTER handoff.

## Remaining release gate

The unchanged live SG verifier deliberately accepts Production only. Do not grant
Preview tokens Production authority to manufacture a hosted 300s/429 result.
Local signed-OIDC/real-SQL acceptance and remote token availability are distinct
from a real SG Production request after deployment. That final proof still needs
a separately approved exact-SHA Legacy release and controlled/natural SG traffic.

Do not claim the Production incident fixed merely because this candidate passes.
No main merge/push, Production deployment, live function deployment, project/env,
RLS/grant/flag/strict-level/WAF/Turnstile/ASN or country-policy change is authorized.

References: Vercel Functions `getVercelOidcToken` documentation and published
`@vercel/oidc`4.0.3 synchronous accessor implementation (request context then env).
