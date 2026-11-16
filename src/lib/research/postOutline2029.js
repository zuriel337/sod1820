// The OUTLINE of a Post for the left context rail and the mobile "הקשר" sheet (ZURIEL 17.11.2026): ONE tree, two levels, derived from the Post's own structure.
//   level 1   the sections of the Post (its headings); in a Post with proven updates, "מה התחדש" is one section
//   level 2   the units inside "מה התחדש" (each with its own title), or the sub-headings (h3) under a section — shown only under the active parent
// PURE: it receives plain descriptors (see postOutlineDom2029.js, which reads the rendered Post) and returns the items the existing progress spine renders
// ({id, label, targetId, level, parentId}). It invents nothing: a Post without enough structure returns [] and the caller keeps the existing single "הסיפור" station.
// A hand-written reading-region list (the FZ1073 flight Post and the golden calibration Post) is NOT replaced by this: the caller prefers it.
export const OUTLINE_MAX_LEVEL1 = 12;
export const OUTLINE_MAX_CHILDREN = 8;
export const OUTLINE_LABEL_MAX = 38;

const MARKS = /[✨✦👑📜🔵🟡➡️⬇️•·]+/gu;
export function outlineLabel(text, max = OUTLINE_LABEL_MAX) {
  const clean = String(text ?? "").replace(MARKS, " ").replace(/\s+/g, " ").replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trim()}…`;
}

// entries: in document order — { kind: "h2" | "h3" | "updates" | "unit" | "unit-top", id, text }; fixed: [{ id, label }] appended last (only ids that exist in the page)
export function buildPostOutline({ entries = [], fixed = [] } = {}) {
  const out = [];
  const seen = new Set();
  let parent = null;                      // the current level-1 item that may own children
  let childCount = 0;
  const add = (item) => { if (!item.id || seen.has(item.id) || !item.label) return null; seen.add(item.id); out.push(item); return item; };
  for (const entry of Array.isArray(entries) ? entries : []) {
    const label = outlineLabel(entry?.text);
    if (!entry?.id || !label) continue;
    if (entry.kind === "updates") {
      parent = add({ id: entry.id, label: "מה התחדש", targetId: entry.id, level: 1, parentId: null, kind: "updates" }); childCount = 0;
    } else if (entry.kind === "unit") {
      if (parent && parent.kind === "updates" && childCount < OUTLINE_MAX_CHILDREN) { if (add({ id: entry.id, label, targetId: entry.id, level: 2, parentId: parent.id, kind: "unit" })) childCount += 1; }
    } else if (entry.kind === "unit-top" || entry.kind === "h2") {
      parent = add({ id: entry.id, label, targetId: entry.id, level: 1, parentId: null, kind: entry.kind }); childCount = 0;
    } else if (entry.kind === "h3") {
      if (parent && parent.kind !== "updates" && childCount < OUTLINE_MAX_CHILDREN) { if (add({ id: entry.id, label, targetId: entry.id, level: 2, parentId: parent.id, kind: "h3" })) childCount += 1; }
      else if (!parent) { parent = add({ id: entry.id, label, targetId: entry.id, level: 1, parentId: null, kind: "h3" }); childCount = 0; }
    }
  }
  // too many sections: keep the first ones, never silently reorder
  let level1 = 0;
  const capped = out.filter((item) => (item.level === 1 ? (level1 += 1) <= OUTLINE_MAX_LEVEL1 : true));
  const keptIds = new Set(capped.filter((i) => i.level === 1).map((i) => i.id));
  const items = capped.filter((item) => item.level === 1 || keptIds.has(item.parentId));
  const labels = new Set(items.map((i) => i.label));
  for (const f of Array.isArray(fixed) ? fixed : []) if (f?.id && f?.label && !seen.has(f.id) && !labels.has(f.label)) { seen.add(f.id); labels.add(f.label); items.push({ id: f.id, label: f.label, targetId: f.id, level: 1, parentId: null, kind: "fixed" }); }
  // one section alone is not a tree: the caller keeps its single "הסיפור" station
  return items.filter((i) => i.level === 1).length >= 2 ? items.map(({ kind, ...item }) => item) : [];
}

// the item that should be treated as active when a child is active: its parent keeps its children open
export const outlineActiveParent = (items, activeId) => {
  const row = (items || []).find((item) => item.id === activeId);
  return row ? (row.level === 2 ? row.parentId : row.id) : null;
};
// rows to draw: every level-1 row, and the children of the active parent only
export const visibleOutlineRows = (items, activeId) => {
  const parent = outlineActiveParent(items, activeId);
  return (items || []).filter((item) => item.level !== 2 || item.parentId === parent);
};
