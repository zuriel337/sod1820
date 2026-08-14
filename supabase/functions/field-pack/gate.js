// field-pack · pure access decision — shared by the edge (index.ts) and the node test.
// Plain ESM, NO Deno/network APIs, so it is unit-testable. This is the ONLY place the
// admin gate is decided; the edge performs the network lookups then calls decideAccess.
// Mirrors wa_admin_reply: unauthenticated → 401, non-admin → 403 denied, admin → allow.
export function decideAccess({ hasBearer, uid, role }) {
  if (!hasBearer || !uid) return { ok: false, status: 401, error: "unauthenticated" };
  if (role !== "admin") return { ok: false, status: 403, error: "denied" };
  return { ok: true, status: 200 };
}
