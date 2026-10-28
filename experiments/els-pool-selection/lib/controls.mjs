// EXP-12 pilot: control tiles of the same matrix. A tile is a window of the same shape as the real one (all rows the Torah has at this width, `cols` columns) at columns that do not
// overlap it; its pseudo-axis is the middle column over the same rows as the real axis. Tiles stay inside the columns that every row has (the last row is partial), so every tile has
// the same number of rows as the real window. The seed is a label fixed in the pre-registration.
import { createHash } from "node:crypto";
import { mulberry32 } from "../../els-live-reading/lib/windows.mjs";

export const seedOfLabel = (label) => parseInt(createHash("sha256").update(label, "utf8").digest("hex").slice(0, 8), 16) >>> 0;
export function controlTiles({ label, n, cols, completeCols, exclude }) {
  const next = mulberry32(seedOfLabel(label));
  const out = [];
  let guard = 0;
  while (out.length < n) {
    if ((guard += 1) > 10_000) throw new Error("could not place the control tiles");
    const c0 = Math.floor(next() * (completeCols - cols + 1));
    const c1 = c0 + cols - 1;
    if ([...exclude, ...out].some((t) => c0 <= t.c1 && t.c0 <= c1)) continue;
    out.push({ id: `t${String(out.length + 1).padStart(2, "0")}`, c0, c1 });
  }
  return out;
}
