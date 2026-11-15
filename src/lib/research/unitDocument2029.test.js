import test from "node:test";
import assert from "node:assert/strict";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, cleanGematriaItem, writeBodyDraft, resolveUnitBlocks } from "./postUnitBody2029.js";
import { docItems, itemsToBlocks, validateBlocks, restoreMissingSources, clearEditable, blocksToDoc, replaceFromText, findRepeats, wordDiff } from "./unitDocument2029.js";

const base = baseBodyBlocks();
const roundTrip = (blocks, opts) => itemsToBlocks(docItems(blocks), base, opts);
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const GX = { phrase: "השמאל גנבו הבחירות מיד הימין", methodKey: "regular", display: "full", stated: 1237, by: "yaniv-levi" };

test("the unit is ONE document: only external sources are chips (8), everything else is text in the same document", () => {
  const items = docItems(base);
  const chips = items.filter((i) => i.t === "chip");
  assert.equal(chips.length, 8);
  assert.equal(chips.flatMap((c) => c.refs).length, 13, "every protected source block is inside exactly one chip");
  assert.ok(chips.some((c) => c.label.includes("יניב")) && chips.some((c) => c.label.includes("שחר")));
  assert.equal(items.filter((i) => i.t === "text").length, 76, "paragraphs AND research data (numbers, peaks, equations, table rows) are editable text");
  assert.equal(items.filter((i) => i.t === "rule").length, 6);
});

test("an untouched document round-trips to exactly the approved body", () => {
  const result = roundTrip(base);
  assert.equal(result.ok, true);
  assert.deepEqual(result.blocks.map((b) => [b.id, b.text, b.kind]), base.map((b) => [b.id, b.text, b.kind]));
  assert.equal(diffBody(base, result.blocks).changed, false);
});

test("research data is editable: an equation, a focal number, the four numbers and a table row can be changed — and an invalid number line is an explicit error", () => {
  const edit = (ref, text) => itemsToBlocks(docItems(base).map((x) => (x.t === "text" && x.ref === ref ? { ...x, text } : x)), base);
  assert.equal(edit("b34", "גדעון איזנקוט ראש הממשלה = 1237 — הערה").blocks.find((b) => b.id === "b34").text, "גדעון איזנקוט ראש הממשלה = 1237 — הערה");
  const peak = edit("b10", "2027"); assert.equal(peak.ok, true); assert.equal(peak.blocks.find((b) => b.id === "b10").number, 2027, "the structured field follows the text");
  assert.equal(edit("b2", "2026 · 5787 · 1237 · 1159").blocks.find((b) => b.id === "b2").numbers[3], 1159);
  assert.equal(edit("b48", "חד״ש| 313").blocks.find((b) => b.id === "b48").cells[1], "313");
  assert.equal(edit("b10", "אבג").ok, false);
  assert.ok(edit("b10", "אבג").errors.some((e) => e.code === "bad_data"));
});

test("editing, splitting, merging and retyping editorial text works; source text never changes", () => {
  const items = docItems(base);
  const i = items.findIndex((x) => x.t === "text" && x.ref === "b8");
  items[i] = { ...items[i], text: "והנה חיבור מופלא ביותר!" };
  items.splice(i + 1, 0, { t: "text", ref: "b8", kind: "p", text: "שורה נוספת" });
  const j = items.findIndex((x) => x.t === "text" && x.ref === "b12");
  items[j] = { ...items[j], kind: "heading" };
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, true);
  assert.equal(result.blocks.find((b) => b.id === "b8").text, "והנה חיבור מופלא ביותר!");
  assert.equal(result.blocks.filter((b) => b.added).length, 1);
  assert.equal(result.blocks.find((b) => b.id === "b12").kind, "heading");
  assert.ok(diffBody(base, result.blocks).ops.some((o) => o.op === "retyped" && o.to === "heading"));
});

test("a source is NEVER removed by accident: missing = explicit error; an explicit removal is allowed and recorded; the canonical source is untouched", () => {
  const without = docItems(base).filter((x) => !(x.t === "chip" && x.label.includes("שחר")));
  const bad = itemsToBlocks(without, base);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.find((e) => e.code === "missing_source" && e.ids.join() === "b33,b37"));
  const restored = restoreMissingSources(bad.blocks, base);
  assert.equal(validateBlocks(restored, base).ok, true);
  const ok = itemsToBlocks(without, base, { removed: new Set(["b33", "b37"]) });
  assert.equal(ok.ok, true, "an approved removal passes validation");
  const diff = diffBody(base, ok.blocks);
  assert.deepEqual(diff.ops.filter((o) => o.op === "removed" && o.source).map((o) => o.id), ["b33", "b37"], "the diff labels them as removed SOURCES");
  const entries = entriesFromBlocks(ok.blocks, base);
  assert.deepEqual(entries.filter((e) => e.removed).map((e) => e.ref), ["b33", "b37"]);
  assert.equal(resolveBodyBlocks(entries, base).some((b) => b.id === "b33"), false, "the stored draft round-trips the explicit removal");
  assert.equal(base.find((b) => b.id === "b33").locked, true, "the approved body (the canonical text) is unchanged");
});

test("a draft that drops a source WITHOUT an explicit removal, or removes an editorial block as if it were a source, is refused (the approved body is used)", () => {
  const entries = entriesFromBlocks(base, base).filter((e) => e.ref !== "b33");
  assert.equal(resolveBodyBlocks(entries, base), base);
  const forged = entriesFromBlocks(base, base).map((e) => (e.ref === "b8" ? { ref: "b8", removed: true } : e));
  assert.equal(resolveBodyBlocks(forged, base), base);
});

test("sources can be MOVED (their representation); a duplicated or unknown source is rejected; an editorial block cannot become a source", () => {
  const items = docItems(base);
  const a = items.findIndex((x) => x.t === "chip"), b = items.findLastIndex((x) => x.t === "chip");
  [items[a], items[b]] = [items[b], items[a]];
  assert.equal(itemsToBlocks(items, base).ok, true, "reordering sources is allowed");
  const chip = docItems(base).find((x) => x.t === "chip");
  assert.ok(itemsToBlocks([...docItems(base), chip], base).errors.some((e) => e.code === "duplicate_source"));
  assert.ok(itemsToBlocks([...docItems(base), { t: "chip", refs: ["b999"] }], base).errors.some((e) => e.code === "unknown_source"));
  assert.ok(itemsToBlocks([...docItems(base), { t: "chip", refs: ["b3"] }], base).errors.some((e) => e.code === "unknown_source"));
});

test("alignment is a display preference stored by reference, separate from the text; the default is untouched", () => {
  const items = docItems(base).map((x) => (x.t === "text" && x.ref === "b8" ? { ...x, align: "center" } : x.t === "chip" && x.refs[0] === "b7" ? { ...x, align: "end" } : x));
  const result = itemsToBlocks(items, base);
  assert.equal(result.blocks.find((b) => b.id === "b8").align, "center");
  assert.equal(result.blocks.find((b) => b.id === "b7").align, "end");
  assert.equal(result.blocks.find((b) => b.id === "b7").text, base.find((b) => b.id === "b7").text, "a source's wording is untouched by alignment");
  assert.equal(base.find((b) => b.id === "b8").align, undefined, "no align = the default (right, RTL)");
  const entries = entriesFromBlocks(result.blocks, base);
  assert.deepEqual(entries.find((e) => e.ref === "b8"), { ref: "b8", align: "center" });
  assert.deepEqual(entries.find((e) => e.ref === "b7"), { ref: "b7", align: "end" });
  const back = resolveBodyBlocks(entries, base);
  assert.equal(back.find((b) => b.id === "b8").align, "center");
  assert.ok(diffBody(base, back).ops.some((o) => o.op === "aligned" && o.id === "b8" && o.to === "center"));
});

test("gematria items are REFERENCES only: no value, letters, HTML or CSS is ever stored; several findings of the same number coexist and are never merged", () => {
  const clean = cleanGematriaItem({ ...GX, computed: 9999, html: "<b>x</b>", css: "color:red" });
  assert.deepEqual(Object.keys(clean).sort(), ["by", "display", "methodKey", "phrase", "stated"]);
  assert.equal(cleanGematriaItem({ phrase: "x", methodKey: "bad|key", display: "full" }), null);
  assert.equal(cleanGematriaItem({ phrase: "x", methodKey: "<b>", display: "full" }), null);
  assert.equal(cleanGematriaItem({ phrase: "x", methodKey: "אותיות אחרי", display: "full" }).methodKey, "אותיות אחרי", "the engine's Hebrew method names are valid");
  assert.equal(cleanGematriaItem({ phrase: "x", methodKey: "regular", display: "fancy" }), null);
  assert.equal(cleanGematriaItem({ ...GX, by: "someone-else" }), null);
  const items = docItems(base);
  const at = items.findIndex((x) => x.t === "text" && x.ref === "b42");
  items.splice(at + 1, 0, { t: "gx", item: GX, align: "center" }, { t: "gx", item: { ...GX, phrase: "גדעון איזנקוט ראש הממשלה", by: "shachar-kandro", display: "compact" } }, { t: "gx", item: { ...GX, methodKey: "mispar_siduri", display: "peak" } });
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, true);
  const gx = result.blocks.filter((b) => b.kind === "gematria");
  assert.equal(gx.length, 3);
  assert.equal(new Set(gx.map((b) => b.id)).size, 3, "three distinct items, even with the same stated number 1237");
  assert.equal(result.blocks.indexOf(gx[0]), result.blocks.findIndex((b) => b.id === "b42") + 1, "inserted exactly where it was placed");
  const entries = entriesFromBlocks(result.blocks, base);
  assert.equal(entries.filter((e) => e.kind === "gematria").length, 3);
  assert.ok(entries.every((e) => !JSON.stringify(e).includes("<") && !JSON.stringify(e).includes("9999")));
  const back = resolveBodyBlocks(entries, base);
  assert.equal(back.filter((b) => b.kind === "gematria").length, 3);
  assert.equal(back.find((b) => b.kind === "gematria").align, "center");
  assert.deepEqual(back.filter((b) => b.kind === "gematria").map((b) => b.item.display), ["full", "compact", "peak"]);
  const mem = memory(); writeBodyDraft(5107, "u", entries, mem);
  assert.equal(resolveUnitBlocks(5107, "u", undefined, mem).filter((b) => b.kind === "gematria").length, 3, "a local draft restores the items");
  assert.equal(itemsToBlocks([{ t: "gx", item: { phrase: "x" } }], base).errors.some((e) => e.code === "bad_gematria"), true);
});

test("Clear Editable Content removes editorial text AND research data but keeps every source, in order", () => {
  const cleared = clearEditable(base);
  assert.equal(cleared.length, 13);
  assert.equal(validateBlocks(cleared, base).ok, true);
});

test("full-document copy → paste → replace is lossless: sources, data, alignment and gematria items travel as plain text", () => {
  const items = docItems(base);
  items.splice(items.findIndex((x) => x.t === "text" && x.ref === "b42") + 1, 0, { t: "gx", item: GX, align: "center" });
  items.find((x) => x.t === "text" && x.ref === "b8").align = "center";
  const blocks = itemsToBlocks(items, base).blocks;
  const text = blocksToDoc(blocks);
  assert.ok(/\[\[מקור b24–b26 · /.test(text) && /^# /m.test(text) && /^#C /m.test(text) && /^#P /m.test(text) && /^\{מרכז\} /m.test(text));
  assert.ok(/\[\[גימטריה \| השמאל גנבו הבחירות מיד הימין \| regular \| full \| 1237 \| yaniv-levi\]\]/.test(text));
  assert.ok(!text.includes("יניב לוי הביא רמז יפה"), "source words are not part of the editable text");
  const back = replaceFromText(text, base);
  assert.equal(back.ok, true, JSON.stringify(back.errors));
  assert.equal(diffBody(base, back.blocks).count, diffBody(base, blocks).count, "the same change comes back");
  assert.equal(back.blocks.filter((b) => b.kind === "gematria").length, 1);
});

test("a rewritten document keeps sources; edited paragraphs pair with what they replace", () => {
  const text = blocksToDoc(base).replace("והנה חיבור מופלא!", "והנה חיבור מופלא — ממש!").replace("שנת הבחירות!", "זו שנת הבחירות!");
  const back = replaceFromText(text, base);
  assert.equal(back.ok, true);
  const diff = diffBody(base, back.blocks);
  assert.equal(diff.ops.filter((o) => o.op === "edited").length, 2);
  assert.equal(diff.ops.filter((o) => o.op === "added" || o.op === "removed").length, 0);
});

test("a pasted document without its sources is invalid; with an explicit [[הסרת מקור …]] it is valid; forged tokens are refused", () => {
  const without = blocksToDoc(base, { withSources: false });
  const result = replaceFromText(without, base);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "missing_source" && e.ids.length === 13));
  const explicit = replaceFromText(`${without}\n\n[[הסרת מקור b7]]\n\n[[הסרת מקור b24–b26]]\n\n[[הסרת מקור b28–b31]]\n\n[[הסרת מקור b33]]\n\n[[הסרת מקור b37]]\n\n[[הסרת מקור b65]]\n\n[[הסרת מקור b71]]\n\n[[הסרת מקור b75]]`, base);
  assert.equal(explicit.ok, true, JSON.stringify(explicit.errors));
  assert.equal(explicit.removed.size, 13);
  assert.equal(replaceFromText(`${blocksToDoc(base)}\n\n[[מקור b3 · מזויף]]`, base).ok, false);
  assert.equal(replaceFromText(`${blocksToDoc(base)}\n\n[[הסרת מקור b3]]`, base).ok, false, "an editorial block cannot be 'removed' as a source");
});

test("the resolver accepts a retyped block and stored entries stay references", () => {
  const items = docItems(base).map((x) => (x.t === "text" && x.ref === "b12" ? { ...x, kind: "heading" } : x));
  const entries = entriesFromBlocks(itemsToBlocks(items, base).blocks, base);
  assert.deepEqual(entries.find((e) => e.ref === "b12"), { ref: "b12", kind: "heading" });
  assert.ok(entries.filter((e) => base.find((b) => b.id === e.ref)?.locked).every((e) => Object.keys(e).join() === "ref"), "a source is stored as a bare reference");
});

test("repeated explanations are reported, never edited; gematria items are not 'repeats'", () => {
  const items = docItems(base); items.push({ t: "text", ref: null, kind: "p", text: "נשמה אחת, המתגלית בריבוי נשמות." }, { t: "gx", item: GX }, { t: "gx", item: GX });
  const repeats = findRepeats(itemsToBlocks(items, base).blocks);
  assert.ok(repeats.some((g) => g.kind === "same_paragraph"));
  assert.ok(repeats.every((g) => !g.ids.some((id) => /^n\d+$/.test(id) && false)));
});

test("word diff marks exactly what changed", () => {
  const d = wordDiff("והנה חיבור מופלא!", "והנה חיבור מופלא ביותר!");
  assert.equal(d.filter((x) => x.t === "del").map((x) => x.s).join("").trim(), "מופלא!");
  assert.ok(d.some((x) => x.t === "add" && x.s.includes("ביותר")));
  assert.deepEqual(wordDiff("אבג", "אבג"), [{ t: "same", s: "אבג" }]);
});

test("a saved / copied document round-trips even after a source was removed from the unit (explicit removal lines)", () => {
  const without = itemsToBlocks(docItems(base).filter((x) => !(x.t === "chip" && x.label.includes("שחר"))), base, { removed: new Set(["b33", "b37"]) });
  assert.equal(without.ok, true);
  const text = blocksToDoc(without.blocks, { base });
  assert.ok(/\[\[הסרת מקור b33\]\]/.test(text) && /\[\[הסרת מקור b37\]\]/.test(text));
  const back = replaceFromText(text, base);
  assert.equal(back.ok, true, JSON.stringify(back.errors));
  assert.deepEqual([...back.removed].sort(), ["b33", "b37"]);
  assert.equal(diffBody(base, back.blocks).count, diffBody(base, without.blocks).count);
  assert.equal(replaceFromText(blocksToDoc(without.blocks), base).ok, false, "without the base the removal is not written (so the editor always passes it)");
});
