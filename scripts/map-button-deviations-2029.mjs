// node scripts/map-button-deviations-2029.mjs [--write-baseline] [--lower]
//   no flag: print the map of button looks outside the Royal family.
//   --write-baseline / --lower: record the counts (ZURIEL decision; --lower only ever lowers them).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { scanButtonFamily } from "./lib/buttonFamilyScan2029.mjs";

const BASELINE = new URL("./button-family-baseline-2029.json", import.meta.url);
const scan = scanButtonFamily();
const counts = Object.fromEntries(Object.entries(scan).map(([file, items]) => [file, items.length]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
if (process.argv.includes("--write-baseline") || process.argv.includes("--lower")) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")).files : {};
  const next = {};
  for (const [file, n] of Object.entries(counts)) next[file] = process.argv.includes("--lower") && old[file] != null ? Math.min(old[file], n) : n;
  writeFileSync(BASELINE, JSON.stringify({ note: "Button looks outside the Royal family (royal2029.css). A ratchet: counts may only go down; a new file or a higher count fails test/button-family-guard-2029.test.mjs. Raising it is a ZURIEL decision.", total: Object.values(next).reduce((a, b) => a + b, 0), files: next }, null, 1) + "\n");
  console.log("baseline written", Object.keys(next).length, "files");
} else {
  for (const [file, n] of Object.entries(counts)) console.log(String(n).padStart(3), file);
  console.log("total", Object.values(counts).reduce((a, b) => a + b, 0), "in", Object.keys(counts).length, "files");
}
