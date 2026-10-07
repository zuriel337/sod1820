// TEMPORARY rollout gate (PROJECTOR_GOLDEN_POSTS_PILOT_GATE_V1).
// Visibility/mount/layout only: the Contextual Sidecar (desktop) and Bottom Context Sheet (mobile)
// render only on the current routed Post surface when the post is a Golden pilot post.
// Projection infrastructure, Research Context state and findings semantics are untouched.
export const PROJECTOR_PILOT_POST_IDS = Object.freeze(["5112", "92"]);

const ROUTE_RE = /^\/post\/([^/]+)\/?$/;

// One representation for every slug we compare: fully decoded. A DB slug may be stored
// percent-encoded (Post 92 Hebrew slug) while the router hands us the decoded segment; both
// must normalize to the same string. Malformed encoding => null (fail closed).
export function normalizePostSlug(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let out = raw;
  try {
    // Bounded repeated decode handles single- and double-encoded stored slugs.
    for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(out); i += 1) out = decodeURIComponent(out);
  } catch {
    return null;
  }
  return out.normalize("NFC") || null;
}

function stripQuery(value) {
  return String(value || "").split(/[?#]/)[0];
}

function postRouteSlug(pathOrHref) {
  const m = ROUTE_RE.exec(stripQuery(pathOrHref));
  return m ? normalizePostSlug(m[1]) : null;
}

// Fail-closed: any missing/contradictory signal => false.
export function isProjectorPilotVisible({ surface, pathname, context } = {}) {
  if (surface !== "post") return false;
  const slug = postRouteSlug(pathname);
  if (!slug) return false;
  const reading = context?.dimensions?.readingFocus || null;
  const subject = context?.subject || null;
  const subjectIsPost = subject?.type === "post";
  const readingId = reading?.postId != null && reading.postId !== "" ? String(reading.postId) : null;
  const subjectId = subjectIsPost && subject.id != null ? String(subject.id) : null;
  if (readingId && subjectId && readingId !== subjectId) return false;
  const postId = readingId || subjectId;
  if (!postId || !PROJECTOR_PILOT_POST_IDS.includes(postId)) return false;
  // Stale-context guard: the context must belong to the post currently routed.
  if (readingId && reading.postSlug) return normalizePostSlug(reading.postSlug) === slug;
  if (subjectId && subject.href) return postRouteSlug(subject.href) === slug;
  return false;
}
