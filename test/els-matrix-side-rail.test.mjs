import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { foldOptions, foldOptionsFor } from "../src/lib/elsSplitMatrix.js";
import { clampZoom, fitCellPx, fitWindow, freeCellPx, letterPx } from "../src/lib/elsMatrixZoom.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("side rail is research-only: the classic and Guided matrices keep their current layout", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /const sideRail = researchProfile && !guidedProfile;/);
  assert.match(native, /\{sideRail \? <div className="els29-native-matrix-with-rail"/);
  // Exactly one rail is mounted; the non-research branch renders the matrix without it.
  assert.equal((native.match(/<MatrixSideRail /g) || []).length, 1);
  assert.equal((native.match(/<MatrixSnapshot /g) || []).length, 2);
  assert.equal((native.match(/<ElsFoldedMatrix2029 /g) || []).length, 1);
});

test("side zoom is the classic engine's zoom: it keeps fit-to-screen and the pinch never clears it", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /onZoom=\{direction => requestControl\(direction > 0 \? "zoom-in" : "zoom-out"\)\}/);
  assert.match(native, /onZoomChange=\{zoom => requestControl\("zoom-pinch", zoom\)\}/);
  const template = await read("tools/els/els-code.template.html");
  assert.match(template, /d\.action==="zoom-pinch"&&Number\.isFinite\(d\.value\)\)setZoom\(d\.value\)/);
  assert.ok((await read("public/tzofen.html")).includes('d.action==="zoom-pinch"'), "public/tzofen.html is generated from the template");
  // Presentation only: the rail never carries a search or a lens request of its own.
  const rail = native.slice(native.indexOf("function MatrixSideRail"), native.indexOf("function LineExplorer"));
  assert.doesNotMatch(rail, /requestControl|requestLens|postMessage|fetch\(/);
});

test("the matrix re-centres on the axis after every zoom and every fit change, like the classic engine", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /geometry\?\.cw, research \? state\?\.ui\?\.zoom : null, research \? state\?\.ui\?\.fit : null\]\);/);
  assert.doesNotMatch(native, /fitBox\?\.c0, fitBox/, "adding findings must not re-centre a panned matrix");
});

test("research mode only: the new cell rules, fit crop and recentring never reach the classic or Guided matrix", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  const css = await read("src/components/experience2029/elsNativeClassic2029.css");
  // Exactly one snapshot is the research one; the other keeps the original zoom call and the original cell size.
  assert.equal((native.match(/<MatrixSnapshot research /g) || []).length, 1);
  assert.match(native, /<MatrixSnapshot state=\{engineState\} onZoomChange=\{zoom => requestControl\("zoom-set", zoom\)\}/);
  assert.match(native, /: clamp\(Math\.round\(26 \* zoom\), state\?\.ui\?\.selMode \? 44 : 16, 54\);/);
  assert.match(native, /if \(!research \|\| !matrix\?\.rows\?\.length/);
  // The letter follows the cell only under .is-research; the original fixed sizes and fit rules stay for everyone else.
  assert.match(css, /\.els29-native-matrix\.is-research \.els29-native-cell\{font-size:var\(--els29-font,18px\)\}/);
  assert.match(css, /\.els29-native-cell\{[^}]*font-size:18px;/);
  assert.match(css, /\.els29-native-cell\{font-size:17px\}/);
  assert.match(css, /\.els29-native-matrix\.is-fit\{width:100%;min-width:calc\(var\(--els29-cols\) \* 20px - 2px\)\}/);
  assert.match(native, /\.\.\.\(research \? \{ "--els29-font": `\$\{letterPx\(cellPx\)\}px` \} : \{\}\)/);
  const folded = await read("src/components/experience2029/ElsFoldedMatrix2029.jsx");
  assert.match(folded, /className="els29-native-matrix is-research"/);
});

test("rail buttons are labelled distinctly from the existing zoom bar and meet the touch-target size", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /aria-label="הגדל מטריצה · פקדי צד"/);
  assert.match(native, /aria-label="הקטן מטריצה · פקדי צד"/);
  assert.match(native, /aria-label="שורות רחבות יותר"/);
  assert.match(native, /aria-label="שורות צרות יותר"/);
  const css = await read("src/components/experience2029/elsNativeClassic2029.css");
  assert.match(css, /\.els29-native-side-rail button\{width:44px;height:44px/);
  assert.match(css, /@media\(max-width:700px\)\{[^}]*els29-native-matrix-with-rail\{flex-direction:column/, "on a phone the rail lies above the matrix");
});

test("row widths: exact divisors of the skip and small multiples of it, ascending, base included", () => {
  const fifty = foldOptions(50);
  assert.deepEqual(fifty.map(option => option.width), [5, 10, 25, 50, 100, 150, 200], "divisors 5, 10 and 25 (width >= 3), the skip, and x2 x3 x4");
  assert.equal(fifty.find(option => option.width === 25).between, 1, "half width: one row between consecutive axis letters");
  assert.equal(fifty.find(option => option.width === 100).perRow, 2, "double width: two axis letters in one row");
  assert.equal(fifty.filter(option => option.base).length, 1);
  assert.equal(fifty.find(option => option.base).width, 50);
  assert.deepEqual(foldOptions(7).map(option => option.width), [7, 14, 21, 28], "a prime skip has no divisor but still widens");
  assert.deepEqual(foldOptions(1).map(option => option.width), [1], "no skip, no folding");
});

test("a layout whose axis does not fit one window is not offered", () => {
  const widths = foldOptionsFor(50, 30).map(option => option.width);
  assert.deepEqual(widths, [25, 50, 100, 150, 200], "30 letters: width 25 needs 59 rows, still offered; 5 and 10 would need far more than 61");
  assert.ok(!foldOptionsFor(50, 40).some(option => option.width === 25), "40 letters at width 25 would need 79 rows");
});

test("cell sizes follow the classic engine: zoom multiplies both the free and the fit size, the letter is the cell minus 5px", () => {
  assert.equal(clampZoom(9), 2.8);
  assert.equal(clampZoom("x"), 1);
  assert.equal(freeCellPx(80, 1), 28, "80 columns: base 720/26 -> 28");
  assert.equal(freeCellPx(80, 2), 56);
  assert.equal(freeCellPx(80, 2.8), 64, "the engine's own cap, not 54");
  assert.equal(freeCellPx(80, 0.5), 14);
  assert.equal(freeCellPx(80, 0.5, { min: 44 }), 44, "manual marking keeps a touch-sized cell");
  assert.equal(fitCellPx(18, 372, 1, 412), Math.floor((372 - 17 * 2) / 18));
  assert.equal(fitCellPx(18, 372, 2, 412), Math.floor((372 - 17 * 2) / 18) * 2, "zoom changes the fit size too");
  assert.equal(fitCellPx(2, 900, 1, 412), 46, "phone cap");
  assert.equal(fitCellPx(2, 900, 1, 1440), 58, "desktop cap");
  assert.equal(letterPx(28), 23);
  assert.ok(letterPx(2) >= 8);
});

test("fit-to-screen crops to everything marked, widened to the screen, inside the research window", () => {
  const window = { S: 50, r0: 0, r1: 40, c0: 0, cw: 50, mainCol: 20 };
  const marks = [{ i: 10 * 50 + 20, main: true }, { i: 14 * 50 + 20, main: true }, { i: 12 * 50 + 22 }];
  const box = fitWindow(window, marks, 412);
  assert.ok(box.r0 >= 8 && box.r1 <= 16, "rows hug the marks plus a margin");
  assert.ok(box.cw >= 12 && box.cw < 50, "columns filled to the screen, not the whole 50");
  assert.ok(box.c0 <= 20 && box.c0 + box.cw > 22, "the marked columns stay inside");
  assert.deepEqual(fitWindow(window, [], 412), { r0: 0, r1: 40, c0: 0, cw: 50 }, "nothing marked: the whole window");
  assert.deepEqual(fitWindow({ S: 10, r0: 0, r1: 20, c0: 0, cw: 10 }, [{ i: 55, main: true }], 1440).cw, 10, "never wider than the window");
});

test("the engine lens takes a row width and never mutates findings", async () => {
  const template = await read("tools/els/els-code.template.html");
  const lens = template.slice(template.indexOf("function matrixWindowLens"), template.indexOf("const isAnon=()"));
  assert.match(lens, /W=clampInt\(t\.width,2,/);
  assert.match(lens, /MATRIX_WINDOW_MAX_FOLD_COLS/);
  assert.match(lens, /reply\(\{ok:true,S,width:W,/);
  assert.doesNotMatch(lens, /st\.(words|res|occ)\s*=[^=]|promoteVerified|postHost\(\{type:"search/);
  assert.match(lens, /modelCalls:0,findingMutation:false,truthPromotion:false/);
});
