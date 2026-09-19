#!/usr/bin/env node
import {
  canonicalMethodPublicLabel,
  sortMethodsByCanonicalOrder,
  formatTanakhRef,
  formatVerseGematriaSuffix,
} from "../src/lib/presentation/canonicalPresentation.js";

let pass = 0;
let fail = 0;
const failures = [];

function eq(label, actual, expected) {
  if (actual === expected) pass++;
  else {
    fail++;
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

eq("קדמי public label", canonicalMethodPublicLabel({ method_key: "קדמי", display_label: "קדמי · משולש" }), "משולש");
eq("משולש גדול public label", canonicalMethodPublicLabel({ method_key: "משולש גדול", display_label: "קדמי גדול · משולש גדול" }), "משולש גדול");
eq("legacy alias fallback", canonicalMethodPublicLabel("קדמי · משולש"), "משולש");

const ordered = sortMethodsByCanonicalOrder([
  { method_key: "אתבש", display_label: "אתבש", sort_order: 8 },
  { method_key: "רגיל", display_label: "רגיל", sort_order: 1 },
  { method_key: "קדמי", display_label: "קדמי · משולש", sort_order: 4 },
]).map((row) => row.method_key);
eq("method order follows Registry sort_order", ordered.join("|"), "רגיל|קדמי|אתבש");

eq("structured Tanakh ref", formatTanakhRef({ book: "ישעיהו", chapter: 53, verse: 5 }), "ישעיהו נ״ג, ה׳");
eq("raw Tanakh ref", formatTanakhRef("ישעיהו 60:1"), "ישעיהו ס׳, א׳");
eq("chapter-only ref", formatTanakhRef("תהלים 23"), "תהלים כ״ג");
eq("unparseable source preserved", formatTanakhRef("book:hebrewbooks:5635#p62"), "book:hebrewbooks:5635#p62");
eq("verse gematria suffix", formatVerseGematriaSuffix(358), " = 358");

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) {
  for (const item of failures) console.log("  - " + item);
  process.exit(1);
}
console.log("Canonical presentation checks passed.");
