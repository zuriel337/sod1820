# Emergency P0 containment — 2026-10-24

Status: branch-only implementation and dry-run evidence. No live database change,
Edge deployment, merge, `main` push, frontend Production change, publication, or
2029 cutover is authorized by this artifact.

## Verified live baseline

- Project: `linswmnnkjxvweumprav`.
- `sod_fb_call(text,jsonb,integer,boolean)` and
  `wa_add_vip_word(text,text,text)` are `SECURITY DEFINER`, owned by `postgres`,
  and executable by `PUBLIC`/`anon`/`authenticated`/`service_role`.
- Legitimate database callers are server-only; repository Edge callers of
  `wa_add_vip_word` use `service_role`.
- `gallery_posts` has RLS enabled. The two broad `true` policies expose all 15
  rows (12 published, 3 non-published) and permit anonymous insert. The existing
  published-only SELECT and admin ALL policies remain the intended boundaries.
- `journey-message` is ACTIVE v12, `verify_jwt=false`, bundle SHA-256
  `92bb2beb10177b1e1db629d83042dfd757321ce84225dec5313933486ecfbc40`.
- `capture-video-thumb` is ACTIVE v1, `verify_jwt=false`, bundle SHA-256
  `52af2b63d8453f50385eb73b42468fefe97def881779e6d4fb9364545777eb7f`.
- The live limiter dependency is
  `edge_rate_limit_check(text,integer,integer) returns jsonb`, `SECURITY DEFINER`,
  owner `postgres`, fixed empty `search_path`, and executable only by
  `postgres`/`service_role`. Definition md5:
  `c798817b541784558377442f159b1955`.
- The live sources of both Edge functions were captured through the read-only
  `get_edge_function` action before editing. Their repository baseline is
  `origin/main` at `e73687221aa2ab639930643e5cc8c99666adce88`.

## Prepared containment

1. The migration revokes client execution of the two privileged RPCs, preserves
   `service_role`, removes only the two broad gallery policies, and revokes anon
   INSERT. It contains exact-signature, owner, definition-hash, policy-hash and
   postcondition guards.
2. `journey-message` keeps `requiredEntitlement: "public"` and
   `budgetKind: "none"`. It adds bounded input parsing and reuses the existing
   atomic, service-role-only `edge_rate_limit_check` RPC. Denials return HTTP 429
   with `Retry-After`; limiter failure is fail-closed with 503. Anonymous
   identity is IP-only (platform Cloudflare address, then the final proxy hop),
   so rotating a user-agent or a client-supplied first XFF hop does not create a
   fresh bucket.
3. `capture-video-thumb` becomes an inert HTTP 410 tombstone. Its retired public
   browser writer has no current code/DB/Cron caller; the backend media-thumbs
   workflow is the active replacement.

## Branch-only verification

- Runtime containment suite: 10/10 passed, including anonymous spoof resistance,
  verified/global buckets, fail-closed behavior, HTTP/CORS and input bounds.
- Deno type-check passed for both Edge entrypoints with dependency resolution.
- PostgreSQL 16 and 17 rehearsals passed first apply and idempotent second apply.
  An extra policy and an extra EXECUTE grantee each stopped at preflight before
  mutation. Anonymous fixture visibility remained 12 published rows out of 15.
- Public material path, 2029 control plane, post publishing, Legacy Production
  lock, `git diff --check`, and both Legacy/2029 builds passed. Existing bundle
  size/dynamic-import warnings remain warnings only.
- Two independent reviews found no remaining Blocker or Medium. None of these
  checks executed the migration or deployed a function in the live project.

## Apply and verify checkpoint

Before any live action, recheck `work_log_current`, live function/policy hashes,
the limiter signature/ACL/hash, Edge versions and current `origin/main`. Apply
the database migration as one
transaction, then verify ACLs, RLS visibility as anon/non-admin/admin, and run
Supabase security advisors. Deploy one Edge function at a time, preserving
`verify_jwt=false`. The `journey-message` bundle must include
`supabase/functions/_shared/materialGate.js`. Then verify the new version is
ACTIVE and probe only the safe rejection/allowed paths.

## Rollback

- Database: prefer forward repair of a broken legitimate server caller. Do not
  automatically restore `PUBLIC`/client execution or the broad gallery policies,
  because that knowingly reopens the vulnerability. Exact prior ACL/policy
  restoration requires a separate, explicit emergency approval.
- `journey-message`: redeploy the captured v12 source (repository baseline plus
  `_shared/materialGate.js`) with `verify_jwt=false`.
- `capture-video-thumb`: redeploy the captured v1 source with `verify_jwt=false`
  only if a real caller is proven; this knowingly reopens service-role writes and
  must be followed immediately by a caller-specific authenticated replacement.
- No secret rotation is included. Rotate only if logs show evidence of misuse and
  a separate approval is granted.

The immutable repository rollback source is commit
`e73687221aa2ab639930643e5cc8c99666adce88`:

- `journey-message/index.ts`: Git blob
  `4c689a6362354710cc00c6bcf45eca41a9537576`, SHA-256
  `02709b914b1f0cd4bf9afb22a7fbaddd0ed8b47eb1194fe41313131cee991dab`.
- `_shared/materialGate.js`: Git blob
  `86da722024151c700bb332611d866ae679939189`, SHA-256
  `1f60200076d3d653d4bf09dd1772de94b3c9bb2545949c0283cc7690ff2fa8fb`.
- `capture-video-thumb/index.ts`: Git blob
  `249a3f6ac928884e3e5c5ee1816b8aa80b43555d`, SHA-256
  `4a04b583b0f10c44b1a67972e0bd584858db153cc46117c31fec3571731cad79`.
