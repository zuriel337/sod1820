# G2 P0-7 — number-researcher Edge root-of-trust containment

Status: **LIVE GAP VERIFIED · CONTAINMENT DELTA PINNED · DEPLOY BLOCKED BY RELEASE GATE**

Canonical project: `linswmnnkjxvweumprav`
Verified 2026-09-13.

## Live fact

Supabase Edge Function `number-researcher` is ACTIVE at **v11**, `verify_jwt=false`, live bundle SHA-256:

`de1c3de543553772204cc087acd8fadd895a01a1062367a02b5a9ecf8c3fce82`

The live function initializes its PostgREST/RPC header set with `SUPABASE_SERVICE_ROLE_KEY` and uses that service-role header for its generic `rpc()` helper. A public request can therefore cause `fn_number_dossier` to execute under service-role authority. The canonical `fn_number_dossier` distinguishes public vs privileged projection from JWT/service context; service-role calls enter `projection_scope='internal_authorized'`.

This is the P0-7 boundary from the live containment register: transport is public (`verify_jwt=false`) while a research read is elevated to service-role authority.

## Git/live drift

`origin/main` at `fa154d67` does **not** contain the exact v11 live function body. The repository copy is older than the live Edge deployment. Therefore the old repo file MUST NOT be used as the deployment source for this containment: doing so risks reverting live Raziel capabilities.

Before deployment, implementation must start from the **live v11 body**, not the stale main copy.

## Minimal containment delta — no new system

1. Preserve the live v11 body and all current capabilities.
2. Enable Edge JWT verification for the deployment (`verify_jwt=true`) so raw unauthenticated transport is rejected. This is defense-in-depth only; it is not sufficient by itself because the project anon credential is public by design.
3. Introduce a caller-scoped RPC helper using the incoming request `Authorization` token (or the project anon credential for the anonymous site path), not `SUPABASE_SERVICE_ROLE_KEY`.
4. Route `fn_number_dossier` through that caller-scoped helper. This reuses the existing canonical RPC's own public/internal projection boundary; no `v2`, no parallel dossier, no duplicate truth logic.
5. Keep service-role authority only for narrowly justified server-side operations that already verify the caller identity/scope (for example private memory persistence after `uidFromToken`). Do not use service role merely to make public research reads succeed.
6. Verify negative path: anonymous/project-anon request never receives `projection_scope='internal_authorized'`, internal-only anchors/evidence/decisions/candidates, or other privileged dossier material.
7. Verify positive path: normal public Raziel number research still receives `projection_scope='public'`; authenticated owner memory remains owner-scoped; admin behavior is tested separately.

## Release rule

No Edge deployment is authorized by this artifact. SOD1820 release law requires explicit ZURIEL authorization (for example `תעלה`). Until that authorization and a live v12+ verification occur, P0-7 remains **OPEN / BLOCKED_RELEASE** and Gate A is not fully closed.

## DAG consequence

Do not perform P0-C Person lifecycle WRITE while P0-7 remains live-open. Read-only preparation is allowed, but the containment DAG requires Gate A root-of-trust closure before advancing the writer.
