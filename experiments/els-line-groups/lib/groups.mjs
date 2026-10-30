// Fixed-size groups of lines, chosen by position only. Nothing here reads a letter.
import { GROUP_SIZE } from "./plan.mjs";
import { SAVED_LINE_IDS } from "./selection.mjs";

/** `ids` = the product's canonical line ids in order. Consecutive chunks of GROUP_SIZE; a shorter last chunk is never used. */
export function chunk(ids, size = GROUP_SIZE) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) chunks.push({ index: chunks.length + 1, ids: ids.slice(i, i + size) });
  return chunks.filter((c) => c.ids.length === size);
}

/**
 * Groups to run, in the order they are run. Rule, fixed in advance:
 *  1. the SAVED groups are the full chunks that contain at least one saved line id (SAVED_LINE_IDS), in canonical order;
 *  2. for each saved group, in that order, its CONTROL is the next full chunk after it in canonical order (cyclic) that contains no saved line id and was not already taken;
 *  3. the run order interleaves them: saved 1, control 1, saved 2, control 2, ... so that a budget stop always leaves matched pairs.
 */
export function selectGroups(ids, saved = SAVED_LINE_IDS, size = GROUP_SIZE) {
  const chunks = chunk(ids, size);
  const savedSet = new Set(saved);
  const hasSaved = (c) => c.ids.some((id) => savedSet.has(id));
  const savedChunks = chunks.filter(hasSaved);
  const taken = new Set(savedChunks.map((c) => c.index));
  const controls = savedChunks.map((s) => {
    const after = [...chunks.filter((c) => c.index > s.index), ...chunks.filter((c) => c.index < s.index)];
    const next = after.find((c) => !hasSaved(c) && !taken.has(c.index));
    if (!next) throw new Error(`no control chunk left for chunk ${s.index}`);
    taken.add(next.index);
    return next;
  });
  const out = [];
  savedChunks.forEach((s, k) => {
    out.push({ id: `G${String(s.index).padStart(2, "0")}`, role: "saved_lines", index: s.index, ids: s.ids });
    out.push({ id: `G${String(controls[k].index).padStart(2, "0")}`, role: "control", index: controls[k].index, ids: controls[k].ids, control_of: `G${String(s.index).padStart(2, "0")}` });
  });
  return out;
}
