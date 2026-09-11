// field-pack · pure access decision — shared by the edge (index.ts) and the node test.
export function decideAccess({ hasBearer, uid, role }) {
  if (!hasBearer || !uid) return { ok: false, status: 401, error: "unauthenticated" };
  if (role !== "admin") return { ok: false, status: 403, error: "denied" };
  return { ok: true, status: 200 };
}
