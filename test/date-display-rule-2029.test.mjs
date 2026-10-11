// Standing site rule (ZURIEL, 15.8.2026): record times (published/updated/arrived/approved/added) are shown as
// "לפני X" via src/lib/relativeTime2029.js (timeAgoHe), never as a calendar date. This guard fails when a 2029 UI
// file formats a date directly. Event/content dates carry `date-rule-exempt` on the same line; admin and
// reference-evidence pages are listed below with the reason.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIRS = ["src/components/experience2029", "src/components/research", "src/components/number2029", "src/components/gematria2029", "src/pages"];
const EXEMPT_FILES = new Map([
  ["src/pages/ControlPlane2029Page.jsx", "admin control plane, operational timestamps"],
  ["src/pages/HomePreview2029Page.jsx", "frozen reference preview kept as comparison evidence"],
]);
const DATE_FORMAT = /toLocaleDateString|toLocaleTimeString|new Date\([^)]*\)\.toLocaleString/;

function files(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(rel);
    return /\.(jsx|js)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [rel] : [];
  });
}

test("2029 UI shows record times as relative time, not as calendar dates", () => {
  const offenders = [];
  for (const dir of DIRS) {
    for (const file of files(dir)) {
      const is2029 = dir !== "src/pages" || /2029/.test(file);
      if (!is2029 || EXEMPT_FILES.has(file)) continue;
      fs.readFileSync(path.join(ROOT, file), "utf8").split("\n").forEach((line, index) => {
        if (DATE_FORMAT.test(line) && !line.includes("date-rule-exempt")) offenders.push(`${file}:${index + 1}`);
      });
    }
  }
  assert.deepEqual(offenders, [], "use relativeTimeLabel (src/lib/relativeTime2029.js) or mark an event date with date-rule-exempt");
});
