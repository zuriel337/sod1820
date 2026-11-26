// node scripts/report-design-families-2029.mjs [--top=5]   (warning-only report; exit code is always 0)
import { scanDesignFamilies } from "./lib/designFamilyScan2029.mjs";
const top = Number((process.argv.find(a => a.startsWith("--top=")) || "--top=5").split("=")[1]);
const { totals, perFile } = scanDesignFamilies();
for (const [name, total] of Object.entries(totals)) {
  const files = Object.entries(perFile[name]).sort((a, b) => b[1] - a[1]);
  console.log(`${name}: ${total} in ${files.length} files`);
  for (const [file, n] of files.slice(0, top)) console.log(`    ${String(n).padStart(5)} ${file}`);
}
console.log("(candidates for review only; the button family is enforced by test/button-family-guard-2029.test.mjs)");
