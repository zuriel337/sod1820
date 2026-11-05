// Contract: the bottom command bar is ONE row (ZURIEL 5.11.2026, on the Bible code page).
// On desktop the tool-mode bar (ELS and the other tool pages) lifted the Raziel orb 14px above the other four controls, so the orb and its
// "בבנייה" tag read as a second row. The five controls must share one centre line: nothing may offset the orb vertically inside the island.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dir = new URL("../src/components/experience2029/", import.meta.url);
const FILES = [
  "systemFrame2029-unified-bar.css",
  "systemFrame2029-command-island-polish.css",
  "systemFrame2029.css",
  "systemToolDock2029.css",
  "previewVisualCalibration2029.css",
  "myWorkspace2029.css",
];
const rulesOf = (file) => {
  const code = readFileSync(new URL(file, dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...code.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ file, selector: m[1].trim().replace(/\s+/g, " "), body: m[2] }));
};
const ALL = FILES.flatMap(rulesOf);

// A vertical offset that moves the orb off the row. A symmetric negative margin (margin-block: -6px) only lets a bigger orb sit in a
// smaller row and keeps its centre; what moves the centre is an asymmetric margin, a negative top / block-start inset, or a translateY.
function liftsOrb(body) {
  const decl = {};
  for (const m of body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) decl[m[1]] = m[2].replace(/\s*!important/, "").trim();
  const neg = (v) => typeof v === "string" && /^-\s*\d/.test(v);
  if (decl["margin-block"]) {
    const [start, end = start] = decl["margin-block"].split(/\s+/);
    if (start !== end && (neg(start) || neg(end))) return true;
  }
  const start = decl["margin-top"] ?? decl["margin-block-start"];
  const end = decl["margin-bottom"] ?? decl["margin-block-end"];
  if (neg(start) && start !== end) return true;
  if (neg(end) && end !== start) return true;
  if (neg(decl["inset-block-start"]) || neg(decl.top)) return true;
  return /translateY\(\s*-\s*\d|translate\s*:\s*[^;]*\s-\d/.test(body);
}

test("nothing lifts the Raziel orb off the row of the bottom bar", () => {
  const orbRules = ALL.filter((r) => /\.sod29-raziel-orb(?![\w-])/.test(r.selector) && !/construction-badge|reading-badge|orb-core|orb-label/.test(r.selector));
  assert.ok(orbRules.length >= 8, "the orb rules were found");
  const lifted = orbRules.filter((r) => liftsOrb(r.body)).map((r) => `${r.file}: ${r.selector}`);
  assert.deepEqual(lifted, [], "no rule may lift the orb above (or push it below) the centre line of the other controls");
});

test("the orb keeps its own box and a zero block margin inside the unified bar", () => {
  const rule = ALL.find((r) => r.file === "systemFrame2029-unified-bar.css" && r.selector === ".sod29-root.native-frame .sod29-command-island.is-unified-bar .sod29-raziel-orb.compact");
  assert.ok(rule, "the unified-bar orb rule exists");
  assert.match(rule.body, /margin-block:\s*0;/);
  assert.match(rule.body, /width:\s*48px;/);
  assert.match(rule.body, /height:\s*48px;/);
});

test("the old desktop lift is gone and the detector would have caught it", () => {
  assert.equal(/margin-block:\s*-14px 0/.test(readFileSync(new URL("systemFrame2029-unified-bar.css", dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")), false);
  // negative controls: the shapes of lift the detector must flag, and the ones it must leave alone
  for (const body of ["margin-block: -14px 0;", "margin-top: -7px;", "transform: translateY(-7px);", "inset-block-start: -4px;", "top: -3px;", "translate: 0 -6px;", "margin-block: 0 -9px;"]) assert.equal(liftsOrb(body), true, body);
  for (const body of ["margin-block: 0;", "margin-block: -6px;", "margin-block:-3px;", "margin-top: -3px; margin-bottom: -3px;", "inset-block-end: -1px;", "transform: translateX(50%);", "margin: 0 !important;"]) assert.equal(liftsOrb(body), false, body);
});
