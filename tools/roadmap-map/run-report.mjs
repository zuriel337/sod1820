// One-off reporting script (not part of the library) — prints parse coverage
// stats for the canonical Roadmap file, for a human to review Stage-1 output.
// Usage: node tools/roadmap-map/run-report.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseRoadmap, summarizeCoverage } from "./roadmapParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = path.join(__dirname, "..", "..", "SOD1820_MASTER_ROADMAP.md");

const text = readFileSync(ROADMAP_PATH, "utf8");
const vm = parseRoadmap(text);
const cov = summarizeCoverage(vm);

console.log("=== COVERAGE ===");
console.log(JSON.stringify(cov, null, 2));

console.log("\n=== META ===");
console.log(JSON.stringify(vm.meta, null, 2));

console.log("\n=== ACTIVE_NOW ===");
console.log(JSON.stringify(vm.active_now, null, 2));

console.log("\n=== WORKSTREAM IDS ===");
console.log(vm.workstreams.map((w) => w.id).join(", "));

console.log("\n=== GATES (number, status, confidence) ===");
for (const g of vm.open_human_gates) {
  console.log(`#${g.number}\t${g.status}\t${g.status_confidence}\t${g.title || "(no title)"}`);
}

console.log("\n=== DEPENDENCY EDGES ===");
for (const e of vm.dependency_edges) {
  console.log(`${e.from} -> ${e.to}`);
}

console.log("\n=== ALL WARNINGS ===");
console.log(JSON.stringify(vm.warnings, null, 2));

console.log(`\n=== TOTAL WARNINGS: ${vm.warnings.length} ===`);
