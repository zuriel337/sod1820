import { canonicalPostCategories, postCategoryFilterNames } from "../postCategoryIdentity.js";
import { CONTENT_SERIES_2029 } from "./contentSeries2029Identity.js";
import { PUBLIC_POST_SUPPRESSED_TAGS, hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";

const invalid = label => ({ kind: "invalid", key: "", label });
const taxonomyKind = kind => kind === "tag" || kind === "category";

// A route label selects existing Post metadata. It does not admit a Topic,
// person, source, series or Follow subject, even when those names coincide.
export function postsTaxonomyScope2029(kind, value) {
  if (!taxonomyKind(kind) || typeof value !== "string") return invalid("בחירה לא תקינה");
  const name = value.trim();
  if (!name || name.length > 160 || /[\u0000-\u001f\u007f]/.test(name)) return invalid(kind === "tag" ? "תגית לא תקינה" : "קטגוריה לא תקינה");
  if (kind === "tag") {
    if (PUBLIC_POST_SUPPRESSED_TAGS.includes(name)) return invalid("התגית אינה זמינה");
    return { kind, key: name, label: name };
  }
  const key = canonicalPostCategories([name])[0];
  const series = CONTENT_SERIES_2029.find(spec => spec.membership.some(member => member.field === "categories" && member.value === key));
  const legacyVideo = key === "וידאו";
  return { kind, key,
    label: legacyVideo ? "וידאו — סיווג ישן" : series ? `${key} — סיווג במקור` : key,
    compatibilityNote: legacyVideo
      ? "כאן מופיעים פוסטים שסווגו בעבר כווידאו. זו אינה ספריית כל הסרטונים; סוג המדיה נקבע מהמדיה עצמה."
      : series ? "זהו הסיווג השמור בפוסטים. רשימת הסדרה מציגה רק פריטים ששיוכם לסדרה הוגדר." : null,
    seriesLink: series ? { href: `/2029/posts?series=${encodeURIComponent(series.key)}`, label: `לסדרת ${series.label}` } : null,
  };
}

// Read the pathname, not React Router's already-decoded useParams value. The
// existing taxonomy URL convention maps hyphens to spaces, exactly once; it
// never tries a substring, chat-like word, category or title as a fallback.
// Encoded slashes are valid label characters (e.g. אסונות/תופעות טבע).
export function postsTaxonomyRoute2029(pathname, search = "") {
  if (typeof pathname !== "string") return null;
  const match = pathname.match(/^\/(tag|category)\/([^/?#]+)\/?$/);
  if (!match) return null;
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  if (["tag", "category", "series"].some(key => params.has(key))) return invalid("בחירה לא תקינה");
  let value;
  try { value = decodeURIComponent(match[2]).replace(/-/g, " "); }
  catch { return invalid("כתובת לא תקינה"); }
  return postsTaxonomyScope2029(match[1], value);
}

export function postsTaxonomyPage2029(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const values = params.getAll("page");
  if (!values.length) return 1;
  if (values.length !== 1 || !/^\d+$/.test(values[0])) return null;
  const page = Number(values[0]);
  return Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : null;
}

// Shared client/server query inputs. Re-resolve the owned scope rather than
// trusting caller-provided values, operators, aliases or SQL/PostgREST text.
export function postsTaxonomySelection2029(scope) {
  const resolved = postsTaxonomyScope2029(scope?.kind, scope?.key);
  if (!taxonomyKind(resolved.kind)) return null;
  const values = resolved.kind === "tag" ? [resolved.key] : postCategoryFilterNames(resolved.key);
  return {
    kind: resolved.kind, key: resolved.key,
    field: resolved.kind === "tag" ? "tags" : "categories",
    operator: resolved.kind === "tag" ? "contains" : "overlaps",
    values,
    arrayLiteral: `{${values.map(value => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`,
    publicFilter: publicPostOnlyFilter(),
  };
}

export function postMatchesTaxonomy2029(post, scope) {
  const selection = postsTaxonomySelection2029(scope);
  return Boolean(selection && post && !hasSuppressedPublicPostTag(post)
    && Array.isArray(post[selection.field]) && selection.values.some(value => post[selection.field].includes(value)));
}

// A URL/label is not evidence that a public collection exists. The caller reads
// through the anonymous boundary, supplies the exact count, and verifies rows.
// An empty title search needs a separate unfiltered public-membership witness.
// Server integrations use status for the real HTTP response, including crawlers.
export function postsTaxonomyEvidence2029({ scope, posts, total, page = 1, search = "", exists = null, error = null } = {}) {
  const result = (state, status) => ({ state, status });
  if (!postsTaxonomySelection2029(scope)) return result("missing", 404);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return result("page-missing", 404);
  if (error || !Number.isSafeInteger(total) || total < 0 || !Array.isArray(posts) || posts.length > 24 || posts.length > total
    || posts.some(post => !postMatchesTaxonomy2029(post, scope))) return result("unavailable", 503);
  if (total > 0) {
    if ((page - 1) * 24 >= total) return result("page-missing", 404);
    return posts.length ? result("ready", 200) : result("unavailable", 503);
  }
  if (!String(search).trim() || exists === false) return result("missing", 404);
  if (exists !== true) return result("unavailable", 503);
  return page > 1 ? result("page-missing", 404) : result("empty", 200);
}

// Used by the route wrapper to preserve the exact taxonomy address and anchor
// while the existing catalog updates q/page. No second history or return store.
export function postsTaxonomyLocation2029(location, params) {
  const search = params.toString();
  return { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash || "" };
}
