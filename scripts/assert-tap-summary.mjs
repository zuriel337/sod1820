#!/usr/bin/env node
// Reads a node:test TAP report on stdin and exits non-zero unless its summary has exactly the expected counts.
//   node --test --test-reporter=tap <files> | tee report.tap
//   node scripts/assert-tap-summary.mjs --tests 2 --pass 2 --fail 0 --skipped 0 --todo 0 --cancelled 0 < report.tap
// A CI step that must really run its tests uses it so that a skip, a todo, a cancelled test or an empty report can never look green:
// the exit code of `node --test` alone does not fail on a skipped test.
import { readFileSync } from "node:fs";

const KEYS = ["tests", "pass", "fail", "skipped", "todo", "cancelled"];
const expected = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = String(args[i] || "").replace(/^--/, "");
  const value = Number(args[i + 1]);
  if (!KEYS.includes(key) || !Number.isInteger(value) || value < 0) {
    console.error(`assert-tap-summary: bad argument ${args[i]} ${args[i + 1]} (use --${KEYS.join(" N, --")} N)`);
    process.exit(2);
  }
  expected[key] = value;
}
if (!Object.keys(expected).length) { console.error("assert-tap-summary: no expected counts given"); process.exit(2); }

const report = readFileSync(0, "utf8");
const actual = {};
for (const key of KEYS) {
  const match = new RegExp(`^# ${key} (\\d+)\\s*$`, "m").exec(report);
  if (match) actual[key] = Number(match[1]);
}
const problems = [];
for (const [key, value] of Object.entries(expected)) {
  if (actual[key] === undefined) problems.push(`the report has no "# ${key}" line`);
  else if (actual[key] !== value) problems.push(`${key}: expected ${value}, got ${actual[key]}`);
}
if (problems.length) {
  console.error(`assert-tap-summary: FAILED (${problems.join("; ")})`);
  process.exit(1);
}
console.log(`assert-tap-summary: ok (${Object.entries(expected).map(([k, v]) => `${k}=${v}`).join(", ")})`);
