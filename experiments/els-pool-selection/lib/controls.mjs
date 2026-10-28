// EXP-12 pilot: control tiles of the same matrix. A tile is a window of the same shape as the real one (all rows the Torah has at this width, `cols` columns) at columns that do not
// overlap it; its pseudo-axis is the middle column over the same rows as the real axis. Tiles are the slots of `cols` columns that fit inside the columns every row has (the last row is
// partial), so every tile has the same number of rows as the real window; slots that overlap an excluded range are not candidates, and `n` of the rest are drawn by a seeded shuffle. The
// seed is a label fixed in the pre-registration.
import { createHash } from "node:crypto";
import { mulberry32 } from "../../els-live-reading/lib/windows.mjs";

export const seedOfLabel = (label) => parseInt(createHash("sha256").update(label, "utf8").digest("hex").slice(0, 8), 16) >>> 0;
export function controlTiles({ label, n, cols, completeCols, exclude }) {
  const slots = [];
  for (let k = 0; (k + 1) * cols <= completeCols; k += 1) {
    const c0 = k * cols, c1 = c0 + cols - 1;
    if (!exclude.some((t) => c0 <= t.c1 && t.c0 <= c1)) slots.push({ slot: k, c0, c1 });
  }
  if (slots.length < n) throw new Error(`only ${slots.length} control slots, ${n} wanted`);
  const next = mulberry32(seedOfLabel(label));
  for (let i = slots.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  return slots.slice(0, n).map((s, k) => ({ id: `t${String(k + 1).padStart(2, "0")}`, slot: s.slot, c0: s.c0, c1: s.c1 }));
}
