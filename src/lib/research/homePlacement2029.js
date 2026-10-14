// HOME 2029 placement invariant: one canonical Post identity = at most one Home card.
// Category controls topic placement. Tags never grant membership in a Home gateway.
// Other surfaces (World, Search, Post, Archive) continue to link to the same identity.
function nonempty(value) { return value == null ? "" : String(value).trim(); }

export function homePostKeys(row) {
  if (!row || typeof row !== "object") return [];
  const keys = [];
  const ref = nonempty(row.sourceRef || row.source_ref);
  const refId = /^posts:(\d+)$/.exec(ref)?.[1];
  const numeric = refId || (/^(?:post:)?\d+$/.test(nonempty(row.id))
    ? nonempty(row.id).replace(/^post:/, "") : "");
  if (numeric) keys.push(`post:${numeric}`);
  const slug = nonempty(row.slug);
  if (slug) keys.push(`slug:${decodeSafe(slug)}`);
  const href = nonempty(row.href || row.link_url || row.link);
  if (href) {
    const match = /^\/?post\/([^/?#]+)(?:[/?#]|$)/.exec(href.replace(/^https?:\/\/[^/]+\//, ""));
    if (match) keys.push(`slug:${decodeSafe(match[1])}`);
  }
  return [...new Set(keys)];
}

function decodeSafe(value) { try { return decodeURIComponent(value); } catch { return value; } }

export function claimHomeItems(rows, reserved = new Set(), limit = Infinity) {
  const out = [];
  const seen = reserved instanceof Set ? new Set(reserved) : new Set(reserved || []);
  if (limit <= 0) return { items: out, reserved: seen };
  for (const row of Array.isArray(rows) ? rows : []) {
    const keys = homePostKeys(row);
    if (keys.length && keys.some(key => seen.has(key))) continue;
    if (keys.length) keys.forEach(key => seen.add(key));
    out.push(row);
    if (out.length >= limit) break;
  }
  return { items: out, reserved: seen };
}

export function reserveHomePost(reserved, row) {
  const next = new Set(reserved || []);
  homePostKeys(row).forEach(key => next.add(key));
  return next;
}
