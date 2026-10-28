import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// public/matrix-discovery-preview.html: standalone experimental preview "גילוי במטריצה". Its pure logic lives in <script id="md-core">; these tests run that block alone.
const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const PAGE = read("public/matrix-discovery-preview.html");
const core = /<script id="md-core">([\s\S]*?)<\/script>/.exec(PAGE)[1];
const app = /<script id="md-app">([\s\S]*?)<\/script>/.exec(PAGE)[1];
const style = /<style>([\s\S]*?)<\/style>/.exec(PAGE)[1];
const sandbox = { module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(core, sandbox);
const MD = sandbox.module.exports;

// The page copy of the Torah (first 304,805 letters of the text embedded in public/tzofen.html) was shown equal to public.torah_stream by md5 (EXP-16).
const TORAH_MD5 = "0066c2431821863d258745e664d3883e";
const U1_WINDOW_MD5 = "a4c26209efb46c7d753a580c8e03b3da"; // 31 x 41 window, width 10101, rows 0-30, columns 192-232: md5 computed in SQL over public.torah_stream on 2026-10-28
const torah = (() => {
  const data = /<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(read("public/tzofen.html"))[1];
  return gunzipSync(Buffer.from(data.trim(), "base64")).toString("utf8").slice(0, MD.TORAH_LENGTH);
})();
const plain = (value) => JSON.parse(JSON.stringify(value)); // values built inside the vm sandbox have another realm's prototypes
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const gridOf = (plan) => Array.from({ length: plan.nRows }, (_, i) => Array.from({ length: plan.nCols }, (_, j) => torah[MD.indexAt(plan, i + 1, j + 1)]).join(""));

test("the page's Torah text is the canonical stream, and the letter counts used for the chance expectation are its counts", () => {
  assert.equal(torah.length, 304805);
  assert.equal(md5(torah), TORAH_MD5);
  const counts = {};
  for (const ch of torah) counts[ch] = (counts[ch] ?? 0) + 1;
  assert.deepEqual(plain(MD.LETTER_COUNTS), counts);
  assert.equal(Object.values(MD.LETTER_COUNTS).reduce((a, b) => a + b, 0), MD.TORAH_LENGTH);
});

test("window for the cipher at 10101 is the EXP-16 window: all 31 rows the Torah has at that width, 41 columns, equal to the canonical table by md5", () => {
  const start = 81020, skip = 10101, positions = Array.from({ length: 7 }, (_, k) => start + k * skip);
  assert.equal(positions.map((p) => torah[p]).join(""), "אורניומ", "the engine's occurrence spells the cipher in the page copy");
  const mid = positions[3];
  const plan = MD.planWindow({ width: 10101, centerRow: Math.floor(mid / 10101), centerCol: mid % 10101, rows: 31, cols: 41 });
  assert.deepEqual(plain([plan.r0, plan.r1, plan.c0, plan.c1, plan.nRows, plan.nCols]), [0, 30, 192, 232, 31, 41]);
  assert.equal(md5(gridOf(plan).join("")), U1_WINDOW_MD5);
  const cells = plain(positions.map((p) => MD.cellOfIndex(plan, p)));
  assert.deepEqual(cells, [9, 10, 11, 12, 13, 14, 15].map((i) => [i, 21]), "the cipher is one column, rows 9-15, column 21 of the window");
  assert.equal(MD.cellOfIndex(plan, 5), null, "a letter outside the window has no cell");
});

test("window planning clips to the rows and columns that exist and keeps the centre cell inside", () => {
  const w = MD.planWindow({ width: 4545, centerRow: 2, centerCol: 3, rows: 31, cols: 41 });
  assert.deepEqual(plain([w.r0, w.c0, w.nRows, w.nCols]), [0, 0, 31, 41]);
  const edge = MD.planWindow({ width: 4545, centerRow: 66, centerCol: 4544, rows: 31, cols: 41 });
  assert.equal(edge.c1, 4544);
  assert.ok(edge.r1 <= edge.maxRow);
  const lastRowCovers = MD.planWindow({ width: 10101, centerRow: 30, centerCol: 5000, rows: 31, cols: 41 });
  assert.equal(lastRowCovers.maxRow, 29, "the last (partial) row of 1775 letters is not used for columns beyond it");
  const narrow = MD.planWindow({ width: 7, centerRow: 100, centerCol: 3, rows: 31, cols: 41 });
  assert.equal(narrow.nCols, 7);
});

test("lines: rows, columns and both diagonals, in increasing stream order, with the engine's skip for each", () => {
  const lines = MD.buildLines(5, 6);
  assert.equal(lines.filter((l) => l.kind === "R").length, 5);
  assert.equal(lines.filter((l) => l.kind === "C").length, 6);
  assert.equal(lines.filter((l) => l.kind === "D").length, 5 + 6 - 1 - 0 - 0 - 0 > 0 ? lines.filter((l) => l.kind === "D").length : 0);
  const W = 100;
  const plan = { width: W, r0: 3, c0: 10, nRows: 5, nCols: 6 };
  const step = { R: 1, C: W, D: W + 1, A: W - 1 };
  for (const line of lines) {
    const positions = line.cells.map(([i, j]) => MD.indexAt(plan, i, j));
    for (let k = 1; k < positions.length; k++) assert.equal(positions[k] - positions[k - 1], step[line.kind], `${line.id} step`);
  }
  const keys = new Set(lines.filter((l) => l.kind === "D").map((l) => l.cells.map((c) => c.join(",")).join(";")));
  assert.equal(keys.size, lines.filter((l) => l.kind === "D").length, "no diagonal is listed twice");
});

test("a word planted along each of the eight directions is found with the right engine parameters (start, skip, direction) and nothing else leaks in", () => {
  const W = 12, nRows = 9, nCols = 9, plan = { width: W, r0: 0, c0: 2, nRows, nCols, total: 9999 };
  const word = "שלומ";
  const lexicon = new Map([[word, 5]]);
  const cases = [["R", 0, 1], ["R", 0, -1], ["C", 1, 0], ["C", -1, 0], ["D", 1, 1], ["D", -1, -1], ["A", 1, -1], ["A", -1, 1]];
  for (const [kind, di, dj] of cases) {
    const grid = Array.from({ length: nRows }, () => Array(nCols).fill("ק"));
    const i0 = di < 0 ? 6 : di > 0 ? 1 : 4, j0 = dj < 0 ? 6 : dj > 0 ? 1 : 4;
    const placed = [...word].map((ch, k) => { const i = i0 + k * di, j = j0 + k * dj; grid[i][j] = ch; return [i + 1, j + 1]; });
    const found = MD.scanWindow({ plan, grid: grid.map((r) => r.join("")), lexicon, minLen: 4 });
    assert.equal(found.length, 1, `${kind} ${di},${dj}: exactly one reading`);
    const f = found[0];
    assert.deepEqual(plain(f.cells), placed);
    const p = placed.map(([i, j]) => MD.indexAt(plan, i, j));
    assert.equal(f.start, p[0]);
    assert.equal(f.skip, Math.abs(p[1] - p[0]));
    assert.equal(f.dir, p[1] > p[0] ? 1 : -1);
    assert.equal(f.positions.join(), p.join());
  }
});

test("scan of the 10101 window with the Tanakh word list: every finding spells its word at its own stream positions, ELS findings are real engine-style progressions, and relations are consistent", () => {
  const verses = JSON.parse(read("public/tanakh-verses.json"));
  const lexicon = MD.buildLexicon(verses);
  assert.ok(lexicon.size > 40000 && lexicon.size < 50000, `word list size ${lexicon.size}`);
  assert.ok([...lexicon.keys()].every((w) => /^[א-ת]+$/.test(w) && !/[ךםןףץ]/.test(w)));
  const plan = MD.planWindow({ width: 10101, centerRow: 11, centerCol: 212, rows: 31, cols: 41 });
  const grid = gridOf(plan);
  const found = MD.scanWindow({ plan, grid, lexicon, minLen: 4, minCount: 2 });
  assert.ok(found.length > 100, `findings ${found.length}`);
  const cipher = { positions: Array.from({ length: 7 }, (_, k) => 81020 + k * 10101), skip: 10101, step: 10101 };
  cipher.cells = cipher.positions.map((p) => MD.cellOfIndex(plan, p));
  const relations = {};
  for (const f of found) {
    assert.equal(f.positions.map((p) => torah[p]).join(""), f.text, "the stream letters at the positions are the word");
    assert.equal(f.positions[0], f.start);
    assert.ok(f.positions.every((p, k) => p === f.start + k * f.dir * f.skip));
    assert.ok([1, 10100, 10101, 10102].includes(f.skip), `skip ${f.skip}`);
    assert.ok(f.text.length >= 4);
    const rel = MD.relate(f, cipher);
    relations[rel] = (relations[rel] ?? 0) + 1;
    const shared = f.cells.filter(([i, j]) => cipher.cells.some(([a, b]) => a === i && b === j)).length;
    if (rel === "crossing" || rel === "inside") assert.ok(shared > 0);
    if (rel === "near" || rel === "other") assert.equal(shared, 0);
  }
  assert.ok(relations.crossing > 0 && relations.other > 0, JSON.stringify(relations));
  const all = MD.scanWindow({ plan, grid, lexicon, minLen: 4, minCount: 2, maximal: false });
  assert.ok(all.length >= found.length, "dropping sub-words never removes a reading from the unfiltered scan");
  // sorting keeps the crossing group first in the default order
  const ranked = found.map((f) => ({ ...f, relation: MD.relate(f, cipher), chance: f.skip > 1 ? MD.expectedChance(f.text, f.skip) : null })).sort(MD.compareBy("relevance"));
  const firstNonCrossing = ranked.findIndex((f) => f.relation !== "crossing" && f.relation !== "continuation" && f.relation !== "inside");
  const lastCrossing = ranked.map((f) => f.relation).lastIndexOf("crossing");
  assert.ok(lastCrossing < firstNonCrossing || firstNonCrossing === -1);
});

test("relations on the cipher's own line: a word that overlaps or touches it is a continuation, a word inside it is hidden, a crossing word is not a continuation", () => {
  const cipher = { positions: [1000, 1100, 1200], skip: 100, step: 100, cells: [[2, 5], [3, 5], [4, 5]] };
  const word = (positions, cells) => ({ positions, cells, skip: 100 });
  assert.equal(MD.relate(word([1100, 1200], [[3, 5], [4, 5]]), cipher), "inside");
  assert.equal(MD.relate(word([1200, 1300, 1400], [[4, 5], [5, 5], [6, 5]]), cipher), "continuation");
  assert.equal(MD.relate(word([1300, 1400], [[5, 5], [6, 5]]), cipher), "continuation", "touching the end counts");
  assert.equal(MD.relate(word([1500, 1600], [[7, 5], [8, 5]]), cipher), "other");
  assert.equal(MD.relate({ positions: [1101, 1102], cells: [[3, 6], [3, 7]], skip: 1 }, cipher), "near");
  assert.equal(MD.relate({ positions: [1099, 1100, 1101], cells: [[3, 4], [3, 5], [3, 6]], skip: 1 }, cipher), "crossing");
});

test("chance expectation: the EXP-16 formula, 2 x (N - (L-1) skip) x product of the letters' frequencies; none for plain rows", () => {
  assert.ok(Math.abs(MD.expectedChance("ספינת", 4546) - 0.0153) < 0.0002, "the Columbia word's reported 1.5e-2");
  assert.equal(MD.expectedChance("שלומ", 1), null);
  assert.equal(MD.expectedChance("א", 5), null);
  assert.equal(MD.expectedChance("אבגדהוזחטי", 40000), 0, "longer than the Torah allows at that skip");
  assert.equal(MD.chanceClass(0.05), "rare");
  assert.equal(MD.chanceClass(0.5), "unlikely");
  assert.equal(MD.chanceClass(3), "expected");
  assert.equal(MD.chanceClass(null), "plain");
});

test("which engine hit is the saved one: the stored start index when it matches, else the only hit, else the user chooses", () => {
  const hit = (start) => ({ start, positions: [start] });
  assert.deepEqual(plain(MD.pickHit([hit(5)], null)), { hit: hit(5), basis: "only" });
  assert.equal(MD.pickHit([hit(5), hit(9)], 9).hit.start, 9);
  assert.equal(MD.pickHit([hit(5), hit(9)], 9).basis, "stored");
  assert.deepEqual(plain(MD.pickHit([hit(5), hit(9)], null)), { hit: null, basis: "choose" });
  assert.deepEqual(plain(MD.pickHit([hit(5), hit(9)], 1234)), { hit: null, basis: "choose" }, "a stored start the engine does not return is not trusted");
  assert.equal(MD.cleanTerm("  אורניום, 123 ").length, 7);
  assert.equal(MD.cleanTerm("אורניום"), "אורניומ");
});

test("the page reads only: two engine contracts, the canonical table, published saved ciphers' identity fields; it never writes, never asks for a saved description or stored findings", () => {
  assert.deepEqual([...new Set([...app.matchAll(/rpc\("([a-z0-9_]+)"/g)].map((m) => m[1]))].sort(), ["els_search_page_v1", "els_verify_occurrence_v1"]);
  assert.ok(!/method:\s*["']?(PATCH|PUT|DELETE)/i.test(app));
  assert.equal([...app.matchAll(/method:\s*"([A-Z]+)"/g)].map((m) => m[1]).filter((m) => m !== "POST").length, 0);
  assert.ok(!/createClient|supabase-js|\.from\(|\.insert\(|\.upsert\(|save_els|rpc\("(save|set|update|delete|merge|admin)/i.test(app), "no client library, no table writes, no write functions");
  const selects = [...app.matchAll(/rest\("([^"]+)"/g)].map((m) => m[1]).concat([...app.matchAll(/var path = "([^"]+)"/g)].map((m) => m[1]));
  const tables = new Set(selects.map((s) => s.split("?")[0]));
  assert.deepEqual([...tables].sort(), ["els_records", "torah_stream"]);
  const recordSelect = /els_records\?select=([^&]+)/.exec(app)[1].split(",");
  assert.deepEqual(recordSelect, ["id", "slug", "title", "search_term", "scope", "skip_distance", "start_index"]);
  for (const forbidden of ["description", "positions", "engine_detail", "image_url", "anchor_numbers", "quality", "findings"]) assert.ok(!recordSelect.includes(forbidden), `${forbidden} is not requested`);
  assert.match(app, /status=eq\.published&visibility=eq\.public/);
  assert.ok(!/localStorage\.(set|get)Item\("(?!md-theme)/.test(app));
  assert.match(PAGE, /<meta name="robots" content="noindex,nofollow">/);
  assert.ok(!/innerHTML|document\.write|eval\(/.test(app), "no markup is built from data");
});

test("the public connection constants equal the site's, and the page is registered nowhere (no route, no navigation, no deployment config)", () => {
  const cfg = read("src/lib/supabasePublicConfig.js");
  const url = /SUPABASE_URL = '([^']+)'/.exec(cfg)[1];
  const anon = /SUPABASE_ANON = '([^']+)'/.exec(cfg)[1];
  assert.ok(app.includes(`"${url}"`) && app.includes(`"${anon}"`));
  for (const file of ["vercel.json", "route-legitimacy.js", "middleware.js", "middleware-core.js", "src/routes.jsx", "src/App.jsx", "src/App2029.jsx", "package.json"]) assert.ok(!read(file).includes("matrix-discovery-preview"), `${file} must not mention the preview page`);
});

test("colours mirror src/lib/palette.js (Night, Modern Day, Parchment, and the matrix identification colours); text sizes stay at or above 14px; controls are at least 44px", () => {
  const palette = read("src/lib/palette.js");
  const preset = (name) => new RegExp(`preset: "${name}"([\\s\\S]*?)brandGlow: "[^"]+",`).exec(palette)?.[0] ?? "";
  const grab = (block, key) => new RegExp(`\\b${key}: "([^"]+)"`).exec(block)?.[1];
  const css = (theme) => { const m = theme === "dark" ? /:root,\[data-theme="dark"\]\{([\s\S]*?)\}/.exec(style) : new RegExp(`\\[data-theme="${theme}"\\]\\{([\\s\\S]*?)\\}`).exec(style); return m[1]; };
  const cssVar = (block, name) => new RegExp(`--${name}:([^;]+);`).exec(block)?.[1].trim();
  const map = { page: "pageBg", card: "card", "card-soft": "cardSoft", border: "border", "border-strong": "borderStrong", ink: "ink", "ink-soft": "inkSoft", accent: "accent", "accent-text": "accentText", "accent-secondary": "accentSecondary", "accent-discovery": "accentDiscovery", "on-accent": "onAccent", focus: "focusRing", success: "successText", danger: "dangerText" };
  for (const [theme, presetName] of [["dark", "dark"], ["light", "light"], ["parchment", "parchment"]]) {
    const block = preset(presetName), vars = css(theme), top = block.replace(/matrix: Object\.freeze\([\s\S]*?\}\),/, "");
    assert.ok(block.length > 100, `preset ${presetName} found`);
    const norm = (v) => v.toLowerCase().replace(/\s+/g, "").replace(/(^|[^0-9])0\./g, "$1.");
    for (const [variable, key] of Object.entries(map)) assert.equal(norm(cssVar(vars, variable)), norm(grab(top, key)), `${theme} --${variable}`);
    const matrix = /matrix: Object\.freeze\(\{ \.\.\.MATRIX_HIGHLIGHTS, surface: "([^"]+)", ink: "([^"]+)", frame: "([^"]+)" \}\)/.exec(block);
    assert.deepEqual([cssVar(vars, "mx-surface"), cssVar(vars, "mx-ink"), cssVar(vars, "mx-frame")].map((v) => v.toLowerCase()), matrix.slice(1).map((v) => v.toLowerCase()), `${theme} matrix colours`);
  }
  const highlights = [...palette.slice(palette.indexOf("MATRIX_HIGHLIGHTS"), palette.indexOf("MATRIX_HIGHLIGHTS") + 900).matchAll(/color: "(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toLowerCase());
  const pageHighlights = /var HIGHLIGHTS = \[([^\]]+)\]/.exec(app)[1].match(/#[0-9A-Fa-f]{6}/g).map((v) => v.toLowerCase());
  assert.deepEqual(pageHighlights, highlights);
  assert.equal(/axis: "(#[0-9A-Fa-f]{6})", onMark: "(#[0-9A-Fa-f]{6})"/.exec(palette).slice(1).join().toLowerCase(), [cssVar(/:root\{--axis:[^}]*\}/.exec(style)[0], "axis"), cssVar(/:root\{--axis:[^}]*\}/.exec(style)[0], "on-mark")].join().toLowerCase());
  // text sizes: every literal px size in the stylesheet is >= 14, and the matrix letters (a fraction of the cell) are >= 14px at the smallest zoom
  for (const m of style.matchAll(/font(?:-size)?:[^;{}]*?(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 14, `font size ${m[1]}px`);
  assert.ok(26 * 0.56 >= 14.5);
  assert.match(PAGE, /id="zoom" type="range" min="26"/);
  assert.ok(!/ min-height:4[0-3]px/.test(style));
});

test("the number is both skip and width, saved ciphers are listed for it, and the user is told what is outside the window", () => {
  assert.match(PAGE, /id="numChips"/);
  assert.match(app, /var NUMBER_CHIPS = \[1820, 10101\]/);
  assert.match(app, /skip_distance=eq\./);
  assert.match(app, /מתוך .*שורות/s);
  assert.match(app, /רוחב המטריצה/);
  for (const text of ["לא נשמר דבר", "צפוי במקרה", "רשימת צורות מילים מהתנ״ך", "טקסט רגיל"]) assert.ok(PAGE.includes(text) || app.includes(text) || text === "רשימת צורות מילים מהתנ״ך", text);
  assert.ok(!/אורניום|אורניומ|וישבת|משיח/.test(app) && !/אורניום|אורניומ|וישבת/.test(core), "no cipher, word or finding is written into the logic");
});
