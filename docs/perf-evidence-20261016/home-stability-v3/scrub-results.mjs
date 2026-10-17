// Raw runner results -> the form that is committed: content text removed, gzip. Everything else (numbers, geometry, hashes, signatures, element names) is kept as it is.
//   node scrub-results.mjs <dir with *.json from run-matrix.sh> <output dir>
// Removed: the text of the anchor card (anchor.text, depart.anchorText), the hero heading (heroText), the empty-state text (emptyText), the card meta text and the markup of the card probe
// (cardsAtEnd.cards[].metaText, cardsAtEnd.probe) and the page dump of the diagnostic hook (diag.html). The private misses file (full unmapped identifiers) is never written next to the results by the runner and is not read here.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error("usage: node scrub-results.mjs <dir with raw *.json> <output dir>"); process.exit(2); }
fs.mkdirSync(output, { recursive: true });
const OMITTED = "[content text omitted]";
const scrubRun = (run) => {
  if (run.anchor && "text" in run.anchor) run.anchor.text = OMITTED;
  if (run.depart && "anchorText" in run.depart) run.depart.anchorText = OMITTED;
  if ("heroText" in run && run.heroText != null) run.heroText = OMITTED;
  if ("emptyText" in run && run.emptyText != null) run.emptyText = OMITTED;
  if (run.diag && typeof run.diag === "object" && !Array.isArray(run.diag) && "html" in run.diag) run.diag.html = OMITTED;   // the page dump of the diagnostic hook (DIAG_JS)
  if (run.cardsAtEnd) { for (const card of run.cardsAtEnd.cards || []) if ("metaText" in card) card.metaText = OMITTED; if ("probe" in run.cardsAtEnd) run.cardsAtEnd.probe = OMITTED; }
  return run;
};
let n = 0;
for (const file of fs.readdirSync(input).filter((f) => /\.json$/.test(f) && !/\.summary\.json$/.test(f))) {
  const data = JSON.parse(fs.readFileSync(path.join(input, file), "utf8"));
  if (Array.isArray(data.runs)) data.runs = data.runs.map(scrubRun);
  fs.writeFileSync(path.join(output, `${file}.gz`), zlib.gzipSync(JSON.stringify(data)));
  n++;
}
for (const file of fs.readdirSync(input).filter((f) => /\.summary\.(json|md)$/.test(f))) fs.copyFileSync(path.join(input, file), path.join(output, file));
console.log(`${n} result files scrubbed into ${output}`);
