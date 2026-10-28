import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pageLetters } from "../experiments/els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, TORAH_MD5, torahChanceModel } from "../experiments/els-live-reading/lib/metrics.mjs";
import { FAMILIES, cellOfPosition, engineParams, familyOf, linesOf, makeWindow, positionAt, skipOf } from "../experiments/els-pool-selection/lib/geometry.mjs";
import { GAP_MAX, PARALLEL_MAX, axisRelation, geometryOf, relationOf, relationsAmong } from "../experiments/els-pool-selection/lib/relations.mjs";
import { POOL_RULE, chanceExpectation, finalizePool, makeAxis, scanWindow, shortlist } from "../experiments/els-pool-selection/lib/pool.mjs";
import { controlTiles, seedOfLabel } from "../experiments/els-pool-selection/lib/controls.mjs";
import { EngineUnavailableError, confirmed, makeVerifyRpc, verifyItems } from "../experiments/els-pool-selection/lib/verify.mjs";
import { ANSWER_SCHEMA, HINT_STRUCTURE, LIMITS, SYSTEM, buildPacket, listedRelations } from "../experiments/els-pool-selection/lib/packet.mjs";
import { TILE_COUNT, TILE_LABEL, W, windows } from "../experiments/els-pool-selection/build-pools.mjs";

const DIR = fileURLToPath(new URL("../experiments/els-pool-selection/", import.meta.url));
const PAGE = fileURLToPath(new URL("../public/tzofen.html", import.meta.url));
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const poolOf = (id) => JSON.parse(readFileSync(`${DIR}data/pools/${id}.json`, "utf8"));
const letters = pageLetters(PAGE).slice(0, TORAH_LENGTH);

test("the stream of the page is the canonical Torah (md5)", () => {
  assert.equal(md5(letters), TORAH_MD5);
  assert.equal(TORAH_MD5, "0066c2431821863d258745e664d3883e");
});

test("geometry: skip of a family, window cells and positions are inverse, engine parameters of a run of cells", () => {
  assert.equal(skipOf(familyOf("D1"), W), W + 1);
  assert.equal(skipOf(familyOf("A2"), W), W - 2);
  assert.equal(skipOf(familyOf("C2"), W), 2 * W);
  assert.equal(skipOf(familyOf("R"), W), 1);
  const win = makeWindow({ width: W, r0: 0, r1: 30, c0: 162, c1: 262 });
  assert.equal(win.nRows, 31);
  assert.equal(win.nCols, 101);
  for (const [i, j] of [[1, 1], [8, 51], [31, 101]]) assert.deepEqual(cellOfPosition(win, positionAt(win, i, j)), [i, j]);
  assert.equal(cellOfPosition(win, 5), null, "outside the window");
  const down = engineParams(win, [[1, 5], [2, 5], [3, 5]]);
  assert.deepEqual([down.skip, down.dir, down.start], [W, 1, positionAt(win, 1, 5)]);
  const up = engineParams(win, [[3, 5], [2, 5], [1, 5]]);
  assert.deepEqual([up.skip, up.dir], [W, -1]);
  const diag = engineParams(win, [[1, 6], [2, 5], [3, 4]]);
  assert.deepEqual([diag.skip, diag.dir], [W - 1, 1]);
  assert.throws(() => engineParams(win, [[1, 1], [2, 1], [4, 1]]), /evenly/);
});

test("geometry: lines of a family are maximal chains of at least two cells and every cell pair keeps the family step", () => {
  const win = makeWindow({ width: W, r0: 0, r1: 4, c0: 0, c1: 5 });
  for (const family of FAMILIES) {
    const lines = linesOf(win, family);
    const seen = new Set();
    for (const line of lines) {
      assert.ok(line.cells.length >= 2);
      for (let k = 1; k < line.cells.length; k += 1) assert.deepEqual([line.cells[k][0] - line.cells[k - 1][0], line.cells[k][1] - line.cells[k - 1][1]], [family.dr, family.dc]);
      for (const [i, j] of line.cells) { assert.equal(seen.has(`${i},${j}`), false, "a cell is on one line of a family"); seen.add(`${i},${j}`); }
      const [pi, pj] = [line.cells[0][0] - family.dr, line.cells[0][1] - family.dc];
      assert.equal(pi >= 1 && pi <= win.nRows && pj >= 1 && pj <= win.nCols, false, "maximal at the start");
    }
  }
  assert.equal(linesOf(win, familyOf("R")).length, 5);
  assert.equal(linesOf(win, familyOf("C")).length, 6);
});

const item = (id, family, cells, dir = 1) => ({ id, family, cells, dir, text: id });
const row = (i, j0, n) => Array.from({ length: n }, (_, k) => [i, j0 + k]);
const col = (j, i0, n) => Array.from({ length: n }, (_, k) => [i0 + k, j]);

test("relations: continuation, same line, parallel, crossing, near — definitions of the pre-registration", () => {
  const a = item("a", "R", row(3, 2, 4));
  assert.equal(relationOf(a, item("b", "R", row(3, 6, 4))).type, "continuation", "touching");
  assert.equal(relationOf(a, item("b", "R", row(3, 4, 4))).type, "continuation", "overlapping");
  const gap = relationOf(a, item("b", "R", row(3, 8, 3)));
  assert.deepEqual([gap.type, gap.gap], ["same_line", 2]);
  assert.equal(relationOf(a, item("b", "R", row(3, 6 + GAP_MAX + 1, 3))), null, "too far on the same line");
  const par = relationOf(a, item("b", "R", row(5, 3, 4), -1));
  assert.deepEqual([par.type, par.offset, par.same_direction], ["parallel", 2, false]);
  assert.equal(relationOf(a, item("b", "R", row(3 + PARALLEL_MAX + 1, 2, 4))), null, "beyond the parallel offset");
  assert.equal(relationOf(a, item("b", "R", row(3 + PARALLEL_MAX, 20, 4))), null, "no overlap along the line");
  const cross = relationOf(a, item("b", "C", col(4, 1, 5)));
  assert.deepEqual([cross.type, cross.shared, cross.families], ["crossing", 1, "C×R"]);
  const near = relationOf(a, item("b", "C", col(6, 4, 3)));
  assert.deepEqual([near.type, near.distance], ["near", 1]);
  assert.equal(relationOf(a, item("b", "C", col(9, 4, 3))), null);
});

test("relations: symmetric in type, deterministic order, ranked strongest first", () => {
  const items = [item("F1", "R", row(3, 2, 4)), item("F2", "R", row(3, 6, 4)), item("F3", "C", col(4, 1, 5)), item("F4", "R", row(5, 3, 4), -1), item("F5", "C", col(7, 4, 3))];
  const rels = relationsAmong(items);
  assert.equal(rels[0].type, "continuation");
  for (const r of rels) {
    const x = items.find((i) => i.id === r.a), y = items.find((i) => i.id === r.b);
    const back = relationOf(y, x);
    assert.equal(back?.type, r.type, `${r.a}-${r.b}`);
  }
  assert.deepEqual(relationsAmong(items), rels);
  const order = { continuation: 0, same_line: 1, crossing: 2, parallel: 3, near: 4 };
  for (let k = 1; k < rels.length; k += 1) assert.ok(order[rels[k - 1].type] <= order[rels[k].type]);
});

test("relation to the axis: inside / crossing / continuing / none", () => {
  const win = makeWindow({ width: W, r0: 0, r1: 20, c0: 0, c1: 20 });
  const axis = makeAxis({ win, positions: col(10, 5, 4).map(([i, j]) => positionAt(win, i, j)), term: null });
  assert.equal(axis.family, "C");
  assert.equal(axisRelation(item("x", "C", col(10, 6, 2)), axis).type, "inside");
  assert.equal(axisRelation(item("x", "R", row(6, 8, 5)), axis).type, "crossing");
  assert.equal(axisRelation(item("x", "C", col(10, 9, 3)), axis).type, "continuation");
  assert.equal(axisRelation(item("x", "R", row(1, 1, 3)), axis).type, "none");
});

test("scan: finds a word along every family in both readings, maximal per reading, engine parameters consistent", () => {
  const win = makeWindow({ width: W, r0: 0, r1: 7, c0: 0, c1: 7 });
  const grid = Array.from({ length: 8 }, () => Array(8).fill("א"));
  const put = (cells, word) => cells.forEach(([i, j], k) => { grid[i - 1] = [...grid[i - 1]]; grid[i - 1][j - 1] = word[k]; });
  put(row(2, 2, 4), "שלומ"); // R forward
  put(col(7, 1, 4).reverse(), "ברית"); // C, read upward (reverse reading)
  put([[4, 1], [5, 2], [6, 3], [7, 4]], "תורה"); // D1
  const rows = grid.map((r) => r.join(""));
  const lexicon = new Map([["שלומ", { g: true }], ["ברית", { g: true }], ["תורה", { t: 4 }]]);
  const found = scanWindow({ win, grid: rows, lexicon, chance: null });
  const by = Object.fromEntries(found.map((f) => [f.text, f]));
  assert.deepEqual([by["שלומ"].family, by["שלומ"].dir, by["שלומ"].skip], ["R", 1, 1]);
  assert.deepEqual([by["ברית"].family, by["ברית"].dir, by["ברית"].skip], ["C", -1, W]);
  assert.deepEqual([by["תורה"].family, by["תורה"].dir, by["תורה"].skip], ["D1", 1, W + 1]);
  for (const f of found) assert.equal(f.positions.map((p) => letters[p] ?? "").length, f.text.length);
  // maximal: a lexicon word contained in a longer lexicon word at the same reading is not listed separately
  const grid2 = rows.slice();
  grid2[3] = "אאאשלומת";
  const lex2 = new Map([["שלומ", { g: true }], ["שלומת", { g: true }]]);
  const maximal = scanWindow({ win, grid: grid2, lexicon: lex2, chance: null }).filter((f) => f.family === "R" && f.dir === 1 && f.cells[0][0] === 4);
  assert.deepEqual(maximal.map((f) => f.text), ["שלומת"]);
  const every = scanWindow({ win, grid: grid2, lexicon: lex2, chance: null, maximal: false }).filter((f) => f.family === "R" && f.dir === 1 && f.cells[0][0] === 4);
  assert.deepEqual(every.map((f) => f.text).sort(), ["שלומ", "שלומת"]);
});

test("chance expectation: none for the plain text row, falls with length, uses the Torah's own letter frequencies", () => {
  const model = torahChanceModel(letters, md5);
  assert.equal(chanceExpectation(model, "אורניום", 1), null);
  const e4 = chanceExpectation(model, "שלומ", 10101), e5 = chanceExpectation(model, "שלומת", 10101), e9 = chanceExpectation(model, "שלומתשלומ", 10101);
  assert.ok(e4 > 0.1 && e4 < 1000, `E(4 letters) ${e4}`);
  assert.ok(e9 < e5 && e5 < e4, "longer words are rarer at the same skip");
  assert.ok(chanceExpectation(model, "שלומ", 5) > e4, "a smaller skip leaves more start positions and counts the same letters");
  assert.equal(chanceExpectation(model, "שלומ", 200000), 2 * Math.max(0, model.N - 3 * 200000) * 0 + 0, "no start position fits");
});

test("shortlist: ids are neutral (by position), the axis letters themselves are not offered, tier A attaches to the axis", () => {
  const pool = poolOf("real");
  const ids = pool.items.map((i) => i.id);
  assert.deepEqual(ids, ids.slice().sort());
  assert.equal(new Set(ids).size, ids.length);
  const order = pool.items.map((i) => [i.cells[0][0], i.cells[0][1]]);
  for (let k = 1; k < order.length; k += 1) assert.ok(order[k - 1][0] < order[k][0] || (order[k - 1][0] === order[k][0] && order[k - 1][1] <= order[k][1]), "ordered by first cell");
  const axisSet = new Set(pool.axis.cells.map((c) => c.join(",")));
  for (const it of pool.items) {
    assert.notEqual(it.cells.every((c) => axisSet.has(c.join(","))), true, `${it.id} is not entirely on the axis`);
    if (it.tier === "A") assert.ok(["crossing", "continuation"].includes(it.axis.type), `${it.id} tier A is attached to the axis`);
  }
  const tiers = Object.fromEntries(["A", "B", "C"].map((t) => [t, pool.items.filter((i) => i.tier === t).length]));
  assert.ok(tiers.A <= POOL_RULE.tierACap && tiers.B <= POOL_RULE.tierBCap);
  assert.ok(pool.items.length <= POOL_RULE.K);
});

test("control tiles: seeded, deterministic, equal shape, disjoint from the real window and from each other", () => {
  const all = windows();
  assert.equal(all.length, TILE_COUNT + 1);
  assert.deepEqual(windows(), all);
  assert.equal(seedOfLabel(TILE_LABEL), seedOfLabel(TILE_LABEL));
  assert.notEqual(seedOfLabel(TILE_LABEL), seedOfLabel(`${TILE_LABEL}-other`));
  for (const [k, w] of all.entries()) {
    assert.equal(w.c1 - w.c0, 100);
    assert.equal(w.r1 - w.r0, 30);
    for (const o of all.slice(k + 1)) assert.equal(w.c0 <= o.c1 && o.c0 <= w.c1, false, `${w.id}/${o.id}`);
  }
  assert.equal(controlTiles({ label: "x", n: 3, cols: 10, completeCols: 100, exclude: [{ c0: 0, c1: 29 }] }).every((t) => t.c0 >= 30), true);
  assert.throws(() => controlTiles({ label: "x", n: 99, cols: 10, completeCols: 100, exclude: [] }), /control slots/);
});

test("committed pools: window md5 equals the canonical table, every item reads its letters, every item is engine-confirmed, relations recompute identically", () => {
  const canonical = JSON.parse(readFileSync(`${DIR}review/window-md5-canonical.json`, "utf8"));
  assert.equal(canonical.torah_md5, TORAH_MD5);
  assert.equal(canonical.windows.length, TILE_COUNT + 1);
  for (const w of canonical.windows) {
    const pool = poolOf(w.id);
    assert.equal(pool.md5_window, w.md5_window, `${w.id} window md5`);
    const win = makeWindow({ width: W, ...pool.window });
    const grid = Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join("")).join("");
    assert.equal(md5(grid), w.md5_window, `${w.id} page copy = canonical`);
    assert.ok(pool.items.length >= 250 && pool.items.length <= POOL_RULE.K);
    const seen = new Set();
    for (const it of pool.items) {
      assert.ok(!seen.has(it.id)); seen.add(it.id);
      assert.ok(["MATCH", "PLAIN_TEXT_ROW"].includes(it.verify), `${w.id}/${it.id} ${it.verify}`);
      const spelled = [...it.text].map((_, k) => letters[it.start + it.dir * it.skip * k]).join("");
      assert.equal(spelled, it.text, `${w.id}/${it.id} reads its letters`);
      assert.equal(it.skip, skipOf(familyOf(it.family), W), `${w.id}/${it.id} skip is the family's`);
      assert.deepEqual(it.cells.map(([i, j]) => positionAt(win, i, j)).slice(0, 2), [it.start, it.start + it.dir * it.skip].slice(0, it.cells.length > 1 ? 2 : 1));
      assert.ok(it.text.length >= POOL_RULE.minLen && it.text.length <= POOL_RULE.maxLen);
    }
    const ids = new Set(pool.items.map((i) => i.id));
    for (const r of pool.relations) assert.ok(ids.has(r.a) && ids.has(r.b));
  }
  const real = poolOf("real");
  const again = finalizePool(real.items.map((i) => ({ ...i, geo: undefined })));
  assert.equal(again.relations.length, real.relations.length);
  assert.deepEqual(again.relations.map((r) => [r.id, r.a, r.b, r.type]), real.relations.map((r) => [r.id, r.a, r.b, r.type]));
});

test("engine confirmation: MATCH required, an unanswered engine is an error (never 'not verified'), skip 1 is checked against the stream only", async () => {
  const start = 100, term = letters.slice(100, 104);
  const rows = await verifyItems([{ key: "plain", term, start, skip: 1, dir: 1 }], { torah: letters, rpc: async () => { throw new Error("must not be called for skip 1"); } });
  assert.deepEqual(rows[0], { key: "plain", letters_match: true, state: "PLAIN_TEXT_ROW" });
  assert.equal(confirmed(rows[0]), true);
  const els = await verifyItems([{ key: "e", term: "אב", start: 0, skip: 5, dir: 1 }], { torah: letters, rpc: async () => ({ verification_state: "MISMATCH" }) });
  assert.equal(confirmed(els[0]), false);
  const wrong = await verifyItems([{ key: "w", term: "תתתת", start: 0, skip: 3, dir: 1 }], { torah: letters, rpc: async () => ({ verification_state: "MATCH" }) });
  assert.equal(wrong[0].letters_match, false);
  assert.equal(confirmed(wrong[0]), false, "the letters of the stream decide too");
  const calls = [];
  const rpc = makeVerifyRpc({ anonKey: "k", retries: 1, sleep: async () => {}, fetchImpl: async (_url, init) => { calls.push(JSON.parse(init.body)); return { ok: false, status: 503, text: async () => "down" }; } });
  await assert.rejects(rpc({ term: "אב", skip: 5, dir: 1, start: 3 }), EngineUnavailableError);
  assert.equal(calls.length, 2, "one retry on a server error");
  assert.deepEqual(calls[0], { p_term: "אב", p_scope: "torah", p_skip: 5, p_dir: 1, p_start: 3 });
  assert.throws(() => makeVerifyRpc({ anonKey: "" }), EngineUnavailableError);
});

const sections = (text) => text.split(/\n(?=## )/);

test("packet: fixed prose is the same in every arm, the axis is named only in the named arm, no tier or strength reaches the model", () => {
  const pool = poolOf("real");
  const blind = buildPacket({ pool, arm: { named: false, hint: null } });
  const named = buildPacket({ pool, arm: { named: true, hint: null } });
  const hinted = buildPacket({ pool, arm: { named: false, hint: "structure" } });
  assert.equal(blind.system, named.system);
  assert.equal(blind.prose.what, named.prose.what);
  assert.equal(blind.prose.task, named.prose.task);
  assert.equal(blind.user.includes(pool.axis.term), false, "the unnamed arm never shows the axis phrase");
  assert.equal(named.user.includes(pool.axis.term), true);
  assert.equal(named.user.split(pool.axis.term).length - 1, 1, "the phrase is stated once, as data");
  assert.equal(blind.user.includes(HINT_STRUCTURE), false);
  assert.equal(hinted.user.includes(HINT_STRUCTURE), true);
  assert.equal(hinted.user, `${blind.user}\n\n${HINT_STRUCTURE}`, "the hint is the only difference");
  // the item lines carry id, text, family+direction, cells, E, axis relation, context — and never the tier
  const lines = blind.user.split("\n").filter((l) => /^F\d{3}\|/.test(l));
  assert.equal(lines.length, pool.items.length);
  for (const l of lines) assert.equal(l.split("|").length, 8);
  assert.equal(/tier|דרג|קבוצה A|קבוצה B/.test(blind.user), false);
  assert.deepEqual(Object.keys(ANSWER_SCHEMA.properties), ["groups", "singles", "phrases", "continuations", "chance_note"]);
  assert.equal(ANSWER_SCHEMA.additionalProperties, false);
  assert.ok(LIMITS.groups > 0 && SYSTEM.length > 0);
});

test("packet: only the registered relations are listed, each relation line names ids that are in the pool, listed ids are returned for the validator", () => {
  const pool = poolOf("real");
  const listed = listedRelations(pool);
  assert.ok(listed.length > 0 && listed.length < pool.relations.length);
  const ids = new Set(pool.items.map((i) => i.id));
  for (const r of listed) {
    assert.ok(ids.has(r.a) && ids.has(r.b));
    if (r.type === "parallel") assert.ok(r.offset <= 3 && r.overlap >= 3);
    if (r.type === "near") assert.ok(pool.items.find((i) => i.id === r.a).text.length >= 5 && pool.items.find((i) => i.id === r.b).text.length >= 5);
  }
  const packet = buildPacket({ pool, arm: { named: false, hint: null } });
  assert.equal(packet.listedRelationIds.size, listed.length);
  const relLines = packet.user.split("\n").filter((l) => /^R\d{4}\|/.test(l));
  assert.equal(relLines.length, listed.length);
});

test("independence: the experiment code never imports or reads the saved comparison, and never contains a word of it", () => {
  const files = [];
  const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = `${dir}${e.name}`; if (e.isDirectory()) { if (!["data", "review", "evaluation", "controls", "runs"].includes(e.name)) walk(`${p}/`); } else if (e.name.endsWith(".mjs")) files.push(p); } };
  walk(DIR);
  assert.ok(files.length >= 8);
  const sources = files.map((f) => [f, readFileSync(f, "utf8")]);
  for (const [f, text] of sources) assert.equal(/evaluation\/|saved-cipher-u1|compare-saved|saved-cipher/.test(text.replace(/\/\/.*$/gm, "")), false, `${f} does not touch the saved comparison`);
  const evaluation = `${DIR}evaluation/saved-cipher-u1.json`;
  if (existsSync(evaluation)) {
    const saved = JSON.parse(readFileSync(evaluation, "utf8"));
    const words = [...new Set(JSON.stringify(saved).match(/[א-ת]{3,}/g) ?? [])];
    const packet = buildPacket({ pool: poolOf("real"), arm: { named: true, hint: "structure" } });
    const prose = [SYSTEM, packet.prose.what, packet.prose.task, HINT_STRUCTURE].join("\n");
    for (const [f, text] of sources) for (const w of words) if (w !== poolOf("real").axis.term) assert.equal(text.includes(w), false, `${f} contains the saved word ${w}`);
    for (const w of words) if (w !== poolOf("real").axis.term) assert.equal(prose.includes(w), false, `the instruction prose contains the saved word ${w}`);
  }
});

// ---- metrics and the offline evaluation of the saved cipher (no model) ----
import { collinearPairs, compactGroups, rankOfPair, rankedPairs, similarGroups } from "../experiments/els-pool-selection/lib/metrics.mjs";

const miniPool = () => {
  const items = [
    { id: "F001", text: "אבגד", family: "C", dir: 1, skip: W, cells: col(5, 1, 4), E: 10, tier: "A", axis: { type: "crossing" } },
    { id: "F002", text: "הוזח", family: "C", dir: 1, skip: W, cells: col(5, 7, 4), E: 10, tier: "A", axis: { type: "crossing" } },
    { id: "F003", text: "טיכל", family: "C", dir: -1, skip: W, cells: col(6, 8, 4).reverse(), E: 5, tier: "B", axis: { type: "none" } },
    { id: "F004", text: "מנסעפצ", family: "R", dir: 1, skip: 1, cells: row(2, 3, 6), E: null, tier: "C", axis: { type: "none" } },
  ];
  return { id: "mini", items, relations: relationsAmong(items).map((r, k) => ({ id: `R${k + 1}`, ...r })) };
};

test("metrics: tight groups need same-line gap <= 2 or parallel offset <= 1 with overlap >= 3; crossings do not chain a pool together", () => {
  const pool = miniPool();
  const groups = compactGroups(pool, { minSize: 2 });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].ids, ["F001", "F002", "F003"]);
  assert.equal(collinearPairs(pool).length, 1, "F001-F002 are on one column with 2 empty cells between them");
  assert.equal(collinearPairs(pool)[0].gap, 2);
  assert.deepEqual(compactGroups(pool, { minSize: 4 }), []);
});

test("metrics: registered pair score orders by relation priority, then letters, then E; a relation outside the scored types has no rank", () => {
  const pool = miniPool();
  const all = rankedPairs(pool);
  const priority = { continuation: 0, crossing: 1, parallel: 2 };
  for (let k = 1; k < all.length; k += 1) assert.ok(priority[all[k - 1].type] <= priority[all[k].type]);
  assert.equal(rankOfPair(pool, "F001", "F002"), null, "same_line is not a scored type");
  assert.equal(rankedPairs(pool, { elsOnly: true }).every((p) => p.a !== "F004" && p.b !== "F004"), true, "plain-text rows are not ELS pairs");
  assert.deepEqual(similarGroups(pool), { PP: 1, PPA: 0, PXA: 0 }, "F003 parallel to F002 at offset 1 (PP); neither is tier A on both sides");
});

test("diagnostic pool D1: the real pool plus the forced items, nothing else changed in format; forced ids stay outside the pool file", () => {
  const real = poolOf("real"), d1 = poolOf("real-d1");
  const forced = JSON.parse(readFileSync(`${DIR}evaluation/d1-forced-ids.json`, "utf8")).forced;
  assert.equal(d1.items.length, real.items.length + forced.length);
  assert.equal(d1.diagnostic, true);
  const keys = (it) => Object.keys(it).sort().join(",");
  assert.equal(new Set([...real.items, ...d1.items].map(keys)).size, 1, "every item has the same fields");
  assert.equal(JSON.stringify(d1).includes("forced"), false, "the pool file never says which items were added");
  const realKeys = new Set(real.items.map((i) => `${i.text}|${i.start}|${i.skip}|${i.dir}`));
  const d1Keys = new Map(d1.items.map((i) => [`${i.text}|${i.start}|${i.skip}|${i.dir}`, i]));
  for (const k of realKeys) assert.ok(d1Keys.has(k), "every item of the real pool is in D1");
  for (const f of forced) assert.equal(d1.items.find((i) => i.id === f.id).text, f.text);
  for (const it of d1.items) assert.ok(["MATCH", "PLAIN_TEXT_ROW"].includes(it.verify));
  const blindPacket = buildPacket({ pool: d1, arm: { named: true, hint: null } });
  assert.equal(blindPacket.user.split("\n").filter((l) => /^F\d{3}\|/.test(l)).length, d1.items.length);
  assert.equal(/diagnostic|forced|saved/.test(blindPacket.user), false);
});

test("saved-cipher evaluation: every located occurrence spells its word in the canonical stream, and the pair lies on one arithmetic line of the stream", () => {
  const located = JSON.parse(readFileSync(`${DIR}evaluation/locate-saved-result.json`, "utf8"));
  const analysis = JSON.parse(readFileSync(`${DIR}evaluation/analyse-saved-result.json`, "utf8"));
  const win = makeWindow({ width: W, ...poolOf("real").window });
  for (const w of located.words) for (const o of w.occurrences) {
    const positions = o.cells.map(([i, j]) => positionAt(win, i, j));
    assert.equal(positions.map((p) => letters[p]).join(""), w.text, `${w.text} at ${o.first}`);
    assert.equal(Math.abs(positions[1] - positions[0]), o.skip);
  }
  assert.equal(analysis.sameLineLetters.length, 1);
  const line = analysis.sameLineLetters[0];
  assert.equal(line.gap, 2);
  assert.equal(line.whole_ascending.length, 10);
  const firstStart = located.words.find((w) => w.text === line.first.split("#")[0]).occurrences[Number(line.first.split("#")[1]) - 1].start;
  assert.equal([...line.whole_ascending].every((ch, k) => letters[firstStart + k * line.step] === ch), true, "ten letters in one arithmetic progression of the canonical stream");
});
