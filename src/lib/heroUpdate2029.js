// Pure rules for the Home main item (no network): which tags are numbers and what counts as a REAL update.
const DAY = 86400000;
export const UPDATE_WINDOW_DAYS = 14;

export function postNumbers(tags) {
  const out = [];
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag))) { const n = Number(tag); if (!out.includes(n)) out.push(n); }
  }
  return out;
}

/** A real update = the stored modified time is more than a day after publishing and inside the window. */
export function realUpdate(row, now = Date.now()) {
  const published = row?.date ? new Date(row.date).getTime() : NaN;
  const modified = row?.modified ? new Date(row.modified).getTime() : NaN;
  if (!Number.isFinite(published) || !Number.isFinite(modified)) return null;
  if (modified - published < DAY || now - modified > UPDATE_WINDOW_DAYS * DAY) return null;
  return { kind: "post-modified", at: row.modified, key: `${row.slug}:post-modified:${row.modified}` };
}
