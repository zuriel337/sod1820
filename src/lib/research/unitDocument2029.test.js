import test from "node:test";
import assert from "node:assert/strict";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody } from "./postUnitBody2029.js";
import { docItems, itemsToBlocks, validateBlocks, restoreMissingSources, clearEditable, blocksToDoc, replaceFromText, findRepeats } from "./unitDocument2029.js";

const base = baseBodyBlocks();
const roundTrip = (blocks) => itemsToBlocks(docItems(blocks), base);

test("the unit is ONE document: protected blocks collapse into a few chips, never one field each", () => {
  const items = docItems(base);
  const chips = items.filter((item) => item.t === "chip");
  assert.equal(base.filter((b) => b.locked).length, 35);
  assert.ok(chips.length < 20, `${chips.length} chips`);
  assert.equal(chips.flatMap((c) => c.refs).length, 35, "every protected block is inside exactly one chip");
  assert.ok(chips.some((c) => c.label.includes("יניב")), "an attributed writer is one identified chip");
  assert.equal(items.filter((i) => i.t === "text").length, 54, "the 54 editorial paragraphs are the rest of the same document (60 editable blocks, 6 of them rules)");
  assert.equal(items.filter((i) => i.t === "rule").length, 6);
});

test("an untouched document round-trips to exactly the approved body", () => {
  const result = roundTrip(base);
  assert.equal(result.ok, true);
  assert.deepEqual(result.blocks.map((b) => [b.id, b.text, b.kind]), base.map((b) => [b.id, b.text, b.kind]));
  assert.equal(diffBody(base, result.blocks).changed, false);
});

test("editing, splitting, merging and retyping editorial text works; protected text never changes", () => {
  const items = docItems(base);
  const i = items.findIndex((x) => x.t === "text" && x.ref === "b8");
  items[i] = { ...items[i], text: "והנה חיבור מופלא ביותר!" };
  items.splice(i + 1, 0, { t: "text", ref: "b8", kind: "p", text: "שורה נוספת" });     // a browser copies the reference when a paragraph is split
  const j = items.findIndex((x) => x.t === "text" && x.ref === "b12");
  items[j] = { ...items[j], kind: "heading" };
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, true);
  assert.equal(result.blocks.find((b) => b.id === "b8").text, "והנה חיבור מופלא ביותר!");
  assert.equal(result.blocks.filter((b) => b.added).length, 1, "the split-off duplicate reference becomes ONE new block");
  assert.equal(result.blocks.find((b) => b.id === "b12").kind, "heading");
  const diff = diffBody(base, result.blocks);
  assert.ok(diff.ops.some((o) => o.op === "retyped" && o.id === "b12" && o.to === "heading"));
  assert.ok(!diff.ops.some((o) => base.find((b) => b.id === o.id)?.locked));
});

test("deleting a protected chip is an explicit error — never a silent revert — and can be restored in place", () => {
  const items = docItems(base).filter((x) => !(x.t === "chip" && x.label.includes("יניב")));
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === "missing_source");
  assert.ok(err && err.ids.length === 8 && /יניב/.test(err.message));
  const restored = restoreMissingSources(result.blocks, base);
  assert.equal(validateBlocks(restored, base).ok, true);
  const at = restored.findIndex((b) => b.id === "b24");
  assert.equal(restored[at - 1].id, "b23", "back where the approved text had it, after the preceding block");
  assert.deepEqual(restored.slice(at, at + 8).map((b) => b.id), ["b24", "b25", "b26", "b27", "b28", "b29", "b30", "b31"]);
});

test("a duplicated, unknown or reordered source is rejected", () => {
  const chip = docItems(base).find((x) => x.t === "chip");
  assert.ok(itemsToBlocks([...docItems(base), chip], base).errors.some((e) => e.code === "duplicate_source"));
  assert.ok(itemsToBlocks([...docItems(base), { t: "chip", refs: ["b999"] }], base).errors.some((e) => e.code === "unknown_source"));
  assert.ok(itemsToBlocks([...docItems(base), { t: "chip", refs: ["b3"] }], base).errors.some((e) => e.code === "unknown_source"), "an editorial block cannot be smuggled in as a source");
  const swapped = docItems(base);
  const a = swapped.findIndex((x) => x.t === "chip"); const b = swapped.findLastIndex((x) => x.t === "chip");
  [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
  assert.ok(itemsToBlocks(swapped, base).errors.some((e) => e.code === "source_order"));
});

test("an over-long paragraph is reported, not cut", () => {
  const items = docItems(base); items.push({ t: "text", ref: null, kind: "p", text: "א".repeat(1600) });
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "too_long"));
});

test("only one main title: a second title is added as a paragraph and the reader is told", () => {
  const items = docItems(base); items.push({ t: "text", ref: null, kind: "title", text: "כותרת שנייה" });
  const result = itemsToBlocks(items, base);
  assert.equal(result.ok, true);
  assert.equal(result.blocks[result.blocks.length - 1].kind, "p");
  assert.ok(result.notices.length >= 1);
});

test("Clear Editable Content keeps every protected block in order", () => {
  const cleared = clearEditable(base);
  assert.equal(cleared.length, 35);
  assert.equal(validateBlocks(cleared, base).ok, true);
});

test("full-document copy → paste → replace is lossless; sources travel as tokens", () => {
  const text = blocksToDoc(base);
  assert.ok(/\[\[מקור b24–b31 · /.test(text) && /^# /m.test(text) && /^## /m.test(text));
  assert.ok(!text.includes("יניב לוי הביא רמז יפה"), "the protected words are not part of the editable text");
  const back = replaceFromText(text, base);
  assert.equal(back.ok, true, JSON.stringify(back.errors));
  assert.equal(diffBody(base, back.blocks).changed, false, "unchanged paragraphs keep their identity — the diff is empty");
});

test("a rewritten document keeps its sources; edited paragraphs pair with what they replace", () => {
  const text = blocksToDoc(base).replace("והנה חיבור מופלא!", "והנה חיבור מופלא — ממש!").replace("שנת הבחירות!", "זו שנת הבחירות!");
  const back = replaceFromText(text, base);
  assert.equal(back.ok, true);
  const diff = diffBody(base, back.blocks);
  assert.equal(diff.ops.filter((o) => o.op === "edited").length, 2);
  assert.equal(diff.ops.filter((o) => o.op === "added" || o.op === "removed").length, 0);
});

test("a pasted document without its sources is invalid and lists them; unknown tokens are refused", () => {
  const without = blocksToDoc(base, { withSources: false });
  const result = replaceFromText(without, base);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === "missing_source" && e.ids.length === 35));
  const forged = replaceFromText(`${blocksToDoc(base)}\n\n[[מקור b3 · מזויף]]`, base);
  assert.equal(forged.ok, false);
  assert.ok(forged.errors.some((e) => e.code === "bad_source_token"));
});

test("the resolver accepts a retyped block and the stored entries stay references", () => {
  const items = docItems(base).map((x) => (x.t === "text" && x.ref === "b12" ? { ...x, kind: "heading", text: "אבל כאן הרמז אינו נעצר." } : x));
  const result = itemsToBlocks(items, base);
  const entries = entriesFromBlocks(result.blocks, base);
  assert.deepEqual(entries.find((e) => e.ref === "b12"), { ref: "b12", kind: "heading" });
  assert.ok(entries.filter((e) => base.find((b) => b.id === e.ref)?.locked).every((e) => Object.keys(e).join() === "ref"), "protected blocks are stored as bare references");
  assert.equal(resolveBodyBlocks(entries, base).find((b) => b.id === "b12").kind, "heading");
});

test("repeated explanations are reported, never edited", () => {
  const items = docItems(base); items.push({ t: "text", ref: null, kind: "p", text: "בעל הסולם, במאמרו ״ששים רבוא נשמות״ — כך נאמר כאן." });
  const blocks = itemsToBlocks([...items, { t: "text", ref: null, kind: "p", text: "נשמה אחת, המתגלית בריבוי נשמות." }], base).blocks;
  const repeats = findRepeats(blocks);
  assert.ok(repeats.some((g) => g.kind === "same_paragraph"));
});

test("word diff marks exactly what changed", async () => {
  const { wordDiff } = await import("./unitDocument2029.js");
  const d = wordDiff("והנה חיבור מופלא!", "והנה חיבור מופלא ביותר!");
  assert.equal(d.filter((x) => x.t === "del").map((x) => x.s).join("").trim(), "מופלא!");
  assert.ok(d.some((x) => x.t === "add" && x.s.includes("ביותר")));
  assert.deepEqual(wordDiff("אבג", "אבג"), [{ t: "same", s: "אבג" }]);
});
