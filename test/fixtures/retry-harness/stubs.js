// Stand-ins for the readers behind Home (bundled by test/home-retry-2029.test.mjs in place of the real modules, which reach for a database): every call is logged in
// window.__calls, and window.__plan[name] is a list of outcomes consumed one per call ("ok" | "empty" | "fail"; an empty list means "ok").
const calls = (window.__calls = window.__calls || []);
const outcome = (name) => { const plan = (window.__plan = window.__plan || {}); const list = (plan[name] = plan[name] || []); return list.length ? list.shift() : "ok"; };
const later = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
const post = (category, index) => ({ id: `${category}-${index}`, slug: `${category}-${index}`, title: `פוסט ${category} ${index}`, categories: [category], home_hidden: false, thumb_url: null, modified: "2026-10-01T10:00:00Z" });

export const supabase = null;
export async function getPostsFromSupabase() { return []; }
export async function getLatestPostCards({ limit = 2 } = {}) {
  calls.push("latest"); const o = outcome("latest"); await later();
  if (o === "empty" || o === "fail") return [];                       // the real reader swallows its errors: failed and empty look the same
  return Array.from({ length: Math.min(limit, 4) }, (_, i) => ({ id: i + 1, slug: `latest-${i + 1}`, title: `עדכון אחרון ${i + 1}`, poster: null, modified: "2026-10-01T10:00:00Z" }));
}
export async function getCategoryVideos(category) {
  calls.push("videos"); const o = outcome("videos"); await later();
  if (o === "empty" || o === "fail") return [];                       // swallows its errors too
  return [{ slug: "video-1", title: "סרטון אחד", video_url: "x.mp4" }, { slug: "video-2", title: "סרטון שני", video_url: "y.mp4" }];
}
export async function fetchHomePostCards2029({ category }) {
  calls.push(`posts:${category}`); const o = outcome(`posts:${category}`); await later();
  if (o === "fail") throw new Error("read failed");                   // this reader throws
  if (o === "empty") return { posts: [] };
  return { posts: [post(category, 1), post(category, 2), post(category, 3)] };
}
export async function getMatrixLibraryPage() {
  calls.push("matrices"); const o = outcome("matrices"); await later();
  if (o === "fail") throw new Error("library_unavailable");
  if (o === "empty") return { rows: [] };
  return { rows: [{ id: 1, title: "מטריצה אחת", skip_distance: 7 }, { id: 2, title: "מטריצה שתיים", skip_distance: 11 }] };
}
export const savedMatrixWorkspaceHref = (row) => `/els?matrix=${row.id}`;
export async function runtimeOff() { return false; }
export async function isRuntimeSwitchOn() { return true; }
export function readFrozenSnapshot() { return null; }
export function saveFrozenSnapshot() {}
export async function fetchExplorerFacetPage() {
  calls.push("notable"); const o = outcome("notable"); await later();
  if (o === "fail") throw new Error("notable failed");
  if (o === "empty") return { cards: [] };
  return { cards: Array.from({ length: 4 }, (_, i) => ({ id: `n${i}`, label: `התכנסות ${i + 1}`, href: `/topic/n${i}`, numbers: [], quality: 1, meterScore: 1, highlightNumbers: [], approvedAt: "2020-01-01T00:00:00Z" })) };
}
export default function NothingToDraw() { return null; }
