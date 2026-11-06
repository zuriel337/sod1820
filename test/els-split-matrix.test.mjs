import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  splitColumnGap, splitMarkMap, splitResponseMatches, splitRowStart, splitRowStartFor, splitSuggestion, splitTableRows, splitWindowRequest, toggleSplitBand,
} from "../src/lib/elsSplitMatrix.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const axis = { hitId: "16965_1_83718", term: "התשפז", skip: 16965, direction: "fwd", start: 83718, rowMin: 4, rowMax: 8, colMin: 3, colMax: 3, axis: true };
const far = { hitId: "-16965_-1_109170", term: "ימיננג", skip: 16965, direction: "back", start: 109170, rowMin: 3, rowMax: 8, colMin: 8481, colMax: 8481 };
const near = { hitId: "-5_-1_90", term: "מאשמאל", skip: 5, direction: "back", start: 90, rowMin: 4, rowMax: 4, colMin: 1, colMax: 5 };

test("table rows count occurrences per term and keep the signed skip", () => {
  const rows = splitTableRows([axis, far, { ...far, hitId: "x" }]);
  assert.equal(rows.find(row => row.hitId === far.hitId).count, 2);
  assert.equal(rows[0].signedSkip, 16965);
  assert.equal(rows[1].signedSkip, -16965);
});

test("suggestion names only a verified occurrence that shares rows but is too far in columns", () => {
  assert.equal(splitColumnGap(axis, far), 8481 - 3 - 1);
  assert.deepEqual(splitSuggestion([axis, far, near], axis.hitId, 5), { hitId: far.hitId, term: far.term, gap: 8477 });
  assert.equal(splitSuggestion([axis, near], axis.hitId, 5), null, "an occurrence inside the band needs no split");
  assert.equal(splitSuggestion([axis, { ...far, rowMin: 900, rowMax: 905 }], axis.hitId, 5), null, "no shared rows, no recommendation");
  assert.equal(splitSuggestion([far], axis.hitId, 5), null);
});

test("row window is centred on the occurrence and stays inside the corpus", () => {
  assert.equal(splitRowStart({ rowMin: 4, rowMax: 8 }, 15, 1000), 0);
  assert.equal(splitRowStart({ rowMin: 500, rowMax: 504 }, 15, 1000), 495);
  assert.equal(splitRowStart({ rowMin: 999, rowMax: 999 }, 15, 1000), 985);
});

test("several occurrences share one window when they fit, otherwise the focused one wins", () => {
  const fits = splitRowStartFor([{ rowMin: 100, rowMax: 104 }, { rowMin: 108, rowMax: 112 }], 15, 3000);
  assert.ok(fits <= 100 && fits + 14 >= 112, "both occurrences are inside the window");
  const apart = splitRowStartFor([{ rowMin: 100, rowMax: 104 }, { rowMin: 900, rowMax: 904 }], 15, 3000);
  assert.ok(apart <= 100 && apart + 14 >= 104, "the focused (first) occurrence stays visible");
  assert.equal(splitRowStartFor([], 15, 3000), 0);
});

test("bands keep the axis first and show at most two more", () => {
  const id = axis.hitId;
  assert.deepEqual(toggleSplitBand([id], id, "a"), [id, "a"]);
  assert.deepEqual(toggleSplitBand([id, "a"], id, "a"), [id]);
  assert.deepEqual(toggleSplitBand([id, "a", "b"], id, "c"), [id, "b", "c"]);
  assert.deepEqual(toggleSplitBand([], id, id), [id]);
});

test("request is bounded and a reply matches only the current request", () => {
  const request = splitWindowRequest({ axisHitId: axis.hitId, scope: "torah", bands: ["a", "b", "c", "d"], rowStart: 7, rowCount: 500, colCount: 1, columnStarts: { b: 12 }, seq: 3 });
  assert.equal(request.rowCount, 61);
  assert.equal(request.colCount, 3);
  assert.equal(request.bands.length, 3);
  assert.deepEqual(request.bands[1], { hitId: "b", c0: 12 });
  assert.equal(request.r0, 7);
  assert.equal(splitResponseMatches({ target: request }, request), true);
  assert.equal(splitResponseMatches({ target: { ...request, splitSeq: 2 } }, request), false);
  assert.equal(splitResponseMatches({ target: { ...request, scope: "tanakh" } }, request), false);
  assert.equal(splitResponseMatches(null, request), false);
});

test("a band's own occurrence wins where occurrences cross", () => {
  const map = splitMarkMap({ hitId: "own", marks: [{ hitId: "own", cells: [[0, 0]] }, { hitId: "other", cells: [[0, 0], [1, 1]] }] });
  assert.equal(map.get("0-0").hitId, "own");
  assert.equal(map.get("1-1").hitId, "other");
});

test("engine lens is read-only, bounded, axis-scoped and wired only through the existing lens channel", async () => {
  const template = await read("tools/els/els-code.template.html");
  const lens = template.slice(template.indexOf("function matrixWindowLens"), template.indexOf("const isAnon=()=>"));
  assert.ok(lens.length > 500);
  assert.match(lens, /t\.axisHitId!==hitKey\(axis\)\|\|t\.scope!==st\.scope/);
  assert.match(lens, /modelCalls:0,findingMutation:false,truthPromotion:false/);
  assert.match(lens, /isGov\(h\)&&!isSourceHit\(h,w\.t\)/);
  assert.doesNotMatch(lens, /st\.(words|res|occ)\s*=[^=]|\.push\(\{t:|promoteVerified|postHost\(\{type:"search/);
  assert.match(template, /d\.lens==="matrix-window"\)matrixWindowLens\(d\.target\|\|\{\}\)/);
  const built = await read("public/tzofen.html");
  assert.ok(built.includes("function matrixWindowLens"), "public/tzofen.html is generated from the template");
});

test("split view is research-only: mounted in the research tools, never in the classic toolstrip or the Guided profile", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /<ElsSplitMatrix2029 key=\{`split-\$\{user\?\.id \|\| "guest"\}`\} state=\{engineState\} visible=\{active && researchProfile && !guidedProfile\}/);
  assert.match(native, /result\?\.lens === "matrix-window"\) \{ setSplitResponse\(result\); return; \}/);
  assert.equal((native.match(/<ElsSplitMatrix2029/g) || []).length, 1);
  const component = await read("src/components/experience2029/ElsSplitMatrix2029.jsx");
  assert.match(component, /<CanonicalProgress compact title="טוען חלון שורות"/, "operation visibility law");
  assert.match(component, /אין להסיק ממנה שאין מופע בכל התורה/, "a local window never proves absence");
  assert.doesNotMatch(component, /supabase|fetch\(|rpc\(/, "the view reads only from the engine lens");
});
