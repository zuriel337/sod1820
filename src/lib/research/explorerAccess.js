// ── UNIVERSAL_EXPLORER_V1_SLICE6_PROGRESSIVE_DEPTH_ACCESS ──
// Thin projection over EXISTING auth/access owners only. This module owns no permission state,
// fetches no data, and never decides truth/publication/canonicality. It answers one UI question:
// "which existing identity depth is present right now?" while keeping the current Explorer's
// public data surface unchanged until an owner-backed deeper capability actually exists.
//
// Existing owners cross-walked live before this slice:
// - Supabase Auth session / AuthContext.verified => registered identity
// - users.role / AuthContext.isAdmin => admin identity
// - users.tier / AuthContext.isMember => member identity recognition
// - subscribe_gate_law => free email-verified gate, explicitly NOT paid membership
// Paid entitlement lifecycle is not live enough today to authorize new Explorer data/tools.
// Therefore member/admin identity may be represented here, but does NOT itself unlock a new
// Explorer reader, truth state, publication state, or previously-public content.

export const EXPLORER_DEPTH = Object.freeze({
  PUBLIC: "L0_PUBLIC",
  REGISTERED: "L1_REGISTERED",
  PREMIUM: "L2_PREMIUM",
  ADMIN: "L3_ADMIN",
});

const COPY = Object.freeze({
  [EXPLORER_DEPTH.PUBLIC]: "עומק ציבורי · כל מה שכבר ציבורי נשאר פתוח",
  [EXPLORER_DEPTH.REGISTERED]: "משתמש רשום · זהות קיימת בלי נעילת תוכן חדשה",
  [EXPLORER_DEPTH.PREMIUM]: "בן ההיכל מזוהה · עומק Premium נוסף טרם מופעל ב־Explorer",
  [EXPLORER_DEPTH.ADMIN]: "מנהל מזוהה · ה־Explorer לא טוען כאן מידע ניהולי נוסף",
});

/**
 * Resolve the highest EXISTING identity depth. Precedence is admin > member > registered > public.
 * This is a presentation projection, not authorization: no capability below may widen access.
 */
export function resolveExplorerDepth({ verified = false, isMember = false, isAdmin = false } = {}) {
  const depth = isAdmin
    ? EXPLORER_DEPTH.ADMIN
    : isMember
      ? EXPLORER_DEPTH.PREMIUM
      : verified
        ? EXPLORER_DEPTH.REGISTERED
        : EXPLORER_DEPTH.PUBLIC;

  return Object.freeze({
    depth,
    label: COPY[depth],

    // Slice 6 invariant: preserve the complete Slice-5 public surface for EVERY identity tier.
    // Access ≠ Truth. A stronger identity never changes list/rank/calculation/publication state.
    publicListsVisible: true,
    publicRoutesVisible: true,
    publicTopicDetailVisible: true,

    // Registered identity is real and may support existing user-state continuity elsewhere, but
    // Slice 6 does not invent a registered-only Explorer dataset/tool just to fill L1.
    registeredIdentity: Boolean(verified || isMember || isAdmin),

    // Explicitly FALSE until a real existing owner-backed capability is cross-walked and reused.
    // Recognizing users.tier='member' is not the same thing as proving paid entitlement lifecycle.
    premiumDepthEnabled: false,

    // Admin identity is real, but this slice does not add governance/provenance readers or expose
    // server/admin data through Explorer. Doing so would require a separate security/RLS review.
    adminInspectionEnabled: false,
  });
}
