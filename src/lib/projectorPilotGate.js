// TEMPORARY rollout gate (PROJECTOR_GOLDEN_POSTS_PILOT_GATE_V1).
// Visibility/mount/layout only: the Contextual Sidecar (desktop) and Bottom Context Sheet (mobile)
// render only on the current routed Post surface when the post is a Golden pilot post.
// Projection infrastructure, Research Context state and findings semantics are untouched.
export const PROJECTOR_PILOT_POST_IDS = Object.freeze(["5112", "92"]);

const ROUTE_RE = /^\/post\/([^/]+)\/?$/;

function routeSlug(pathname) {
  const m = ROUTE_RE.exec(String(pathname || "").split(/[?#]/)[0]);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

function hrefPath(href) {
  return String(href || "").split(/[?#]/)[0];
}

// Fail-closed: any missing/contradictory signal => false.
export function isProjectorPilotVisible({ surface, pathname, context } = {}) {
  if (surface !== "post") return false;
  const slug = routeSlug(pathname);
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
  if (readingId && reading.postSlug) return String(reading.postSlug) === slug;
  if (subjectId && subject.href) return hrefPath(subject.href) === `/post/${encodeURI(slug)}` || hrefPath(subject.href) === `/post/${slug}`;
  return false;
}
