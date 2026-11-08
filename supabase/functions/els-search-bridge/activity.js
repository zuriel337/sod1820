// ELS search-activity descriptor (traffic_intelligence_law v12 draft; ELS source of record = op_trace spans).
//
// Pure and dependency-free so Node tests can import it. It NEVER receives or returns the search term, any
// result, coordinates, user id or IP. It only classifies the call so the Operational Trace can count searches
// without a second store:
//   - `origin`      server-derived: a request carrying `stage` comes from the adaptive scanner (automatic);
//   - `search_start` server-derived: a `page` call without a continuation cursor opens a search;
//   - `search_id`   optional client correlation (random UUID per UI search) for flows whose search is a group of
//                   verify_batch calls (Classic mode), validated here, never trusted for anything but grouping;
//   - `search_kind` optional client hint from a closed enum, a label only.
export const ELS_SEARCH_KINDS = Object.freeze(["regular", "cross", "forms"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function elsActivityDescriptor(op, body, cursorCount) {
  const stage = body?.stage;
  const scanner = stage !== undefined && stage !== null && stage !== "";
  const searchId = typeof body?.search_id === "string" && UUID_RE.test(body.search_id.trim()) ? body.search_id.trim().toLowerCase() : null;
  return Object.freeze({
    schema: 1,
    origin: scanner ? "scanner" : "interactive",
    search_start: op === "page" && cursorCount === 0,
    search_kind: ELS_SEARCH_KINDS.includes(body?.search_kind) ? body.search_kind : "unspecified",
    search_id: searchId,
  });
}
