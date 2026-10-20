# CN/SG security completion evidence — 2026-10-21

Status: **BRANCH_ONLY · TESTED · NOT MERGED · NOT DEPLOYED**

## Exact live baseline

- Vercel project: `sod1820` (`prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`)
- Latest READY Production deployment inspected: `dpl_5p8fyoBMVYMH9DBFun6WSorUfevK`
- Production Git SHA: `d6150a82bb275129dca33908aa7313e4e1f3528e`
- `origin/main` at inspection: the same SHA
- PR #1139: Draft, head `c2258152ee9aa95bc88cfccf1355ab03e2f9e528`, base `6ef3ec2d6c139cd06af628b20ac2d5c3fb776a70`

The original PR branch predates four media files on current `main`. Its two scoped commits were replayed onto the exact current baseline instead of using the stale branch tree.

## Reproduced defect

No JWT value is recorded here.

- The JWT embedded in Production `middleware.js` had fingerprint `373179fbc3d0` (SHA-256 prefix) and decoded public claims `iss=supaase`, `ref=linswmnnkjxvweumprav`, `role=anon`.
- A read-only request matching `sgPolicy()` returned HTTP **401** with `Invalid API key`.
- The canonical edge/browser anon JWT already used by `middleware-core.js` and the other clients had fingerprint `67575e798a37` and claims `iss=supabase`, the same project ref and `role=anon`.
- The same read-only policy request with the canonical key returned HTTP **200**.
- Live policy state was read, not changed: CN = `quarantine` L2; SG = `quarantine` L3.

Therefore the reported typo was real, and PR #1139's statement that the inspected key already had `iss=supabase` was incorrect.

## Edge limiter provenance

The live Supabase project reports `sg-rate-limit` ACTIVE at version 1 with `verify_jwt=false`. The function verifies the Vercel Production OIDC token itself before calling `public.edge_rate_limit_check`.

The deployed function source was absent from `origin/main`. Its exact source was restored to `supabase/functions/sg-rate-limit/index.ts`:

- deployed source SHA-256: `a85eae2d4301d9ccb13deec29f652285b007342ed89df8abdfeacd963e3ecb26`
- restored source SHA-256: `a85eae2d4301d9ccb13deec29f652285b007342ed89df8abdfeacd963e3ecb26`

The live DB function remains unchanged. Read-only inspection found:

- `public.edge_rate_limit_check(text, integer, integer)`
- `SECURITY DEFINER`, fixed empty `search_path`
- EXECUTE limited to `postgres` and `service_role`
- backing table `private.edge_rate_limit_buckets` is owned by `postgres`, grants no table privileges to public roles, and has a unique primary index on `(key_hash, bucket)`
- live migration history includes `20260915081701 sg_unknown_rate_limit_v1`

The corresponding historical SQL file is not present in the repository. This remains provenance debt; no reconstructed migration was invented in this security patch.

## Branch changes

1. Preserve PR #1139's browser-first SG policy lookup.
2. Remove the duplicate/broken JWT from `middleware.js`; reuse the canonical key exported by `middleware-core.js`.
3. Guard the public claims and prevent another wrapper-local JWT literal.
4. Restore the exact deployed `sg-rate-limit` source.
5. Add isolated runtime coverage for:
   - non-browser SG bypass of the wrapper policy fetch;
   - SG quarantine before proof;
   - proof before limiter;
   - 300-second limits and expensive-path cap 8;
   - limiter refusal becoming HTTP 429;
   - CN L2 remaining outside the SG limiter;
   - Production-only Vercel OIDC checks and the actual Edge handler's RPC mapping.

## Verification

- `npm ci` — PASS
- `npm run test:cn-sg-security` — PASS
- `node scripts/test-route-legitimacy-2029.mjs` — PASS
- `npm run build` — PASS for Legacy and 2029
- `git diff --check` — PASS

The HTTP 429 chain was executed with isolated network and identity fixtures. A live limiter request was intentionally not sent because it would write a Production rate bucket and requires a real Production OIDC token. No Production, policy, RLS, permission, database, Edge Function or deployment change was made.
