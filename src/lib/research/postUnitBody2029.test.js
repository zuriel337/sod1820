import test from "node:test";
import assert from "node:assert/strict";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, resolveUnitBlocks, writeBodyDraft, readBodyDraft, clearBodyDraft, cleanBodyText } from "./postUnitBody2029.js";

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const base = baseBodyBlocks();
const firstProse = base.find((b) => b.kind === "p" && !b.locked);

test("the approved body is split into identified blocks; sources, quotes, numbers and equations are locked", () => {
  assert.ok(base.length > 60);
  assert.ok(base.every((b, i) => b.id === `b${i}`));
  for (const b of base) {
    if (b.group) assert.equal(b.locked, true, `${b.kind} inside ${b.group} must be locked`);
    if (["verse", "numbers", "peak", "claim", "row"].includes(b.kind)) assert.equal(b.locked, true);
  }
  assert.ok(base.some((b) => b.kind === "p" && !b.locked), "there is editorial prose to edit");
  assert.ok(base.filter((b) => b.group === "yaniv-levi").every((b) => b.locked));
});

test("no draft = the approved body; the text of every block is the approved text", () => {
  const same = resolveBodyBlocks(entriesFromBlocks(base, base), base);
  assert.deepEqual(same.map((b) => b.text), base.map((b) => b.text));
  assert.equal(diffBody(base, same).changed, false);
});

test("editing prose, adding and moving work; locked blocks keep their text whatever the draft says", () => {
  const entries = entriesFromBlocks(base, base).map((e) => (e.ref === firstProse.id ? { ref: e.ref, text: "  פסקה ערוכה  " } : e));
  const lockedId = base.find((b) => b.locked && b.kind === "verse").id;
  entries.splice(entries.findIndex((e) => e.ref === lockedId), 1, { ref: lockedId, text: "ניסיון לשנות ציטוט" });
  entries.splice(3, 0, { add: true, kind: "p", text: "פסקה חדשה" });
  const blocks = resolveBodyBlocks(entries, base);
  assert.equal(blocks.find((b) => b.id === firstProse.id).text, "פסקה ערוכה");
  assert.equal(blocks.find((b) => b.id === lockedId).text, base.find((b) => b.id === lockedId).text, "a locked quotation is never changed");
  assert.equal(blocks[3].text, "פסקה חדשה");
  const diff = diffBody(base, blocks);
  assert.ok(diff.ops.some((o) => o.op === "edited" && o.id === firstProse.id));
  assert.ok(diff.ops.some((o) => o.op === "added" && o.text === "פסקה חדשה"));
  assert.ok(!diff.ops.some((o) => o.id === lockedId));
});

test("a draft that removes a locked block, repeats a ref, uses an unknown ref or holds markup-only/empty text fails closed to the approved body", () => {
  const all = entriesFromBlocks(base, base);
  const lockedId = base.find((b) => b.locked).id;
  assert.equal(resolveBodyBlocks(all.filter((e) => e.ref !== lockedId), base), base);
  assert.equal(resolveBodyBlocks([...all, { ref: all[0].ref }], base), base);
  assert.equal(resolveBodyBlocks([...all, { ref: "nope" }], base), base);
  assert.equal(resolveBodyBlocks(all.map((e) => (e.ref === firstProse.id ? { ref: e.ref, text: "   " } : e)), base), base);
  assert.equal(resolveBodyBlocks("not-an-array", base), base);
});

test("text is plain: control characters are dropped and length is capped; nothing is treated as markup", () => {
  assert.equal(cleanBodyText("a\u0000b"), "ab");
  assert.equal(cleanBodyText("x".repeat(5000)).length, 1500);
  const blocks = resolveBodyBlocks(entriesFromBlocks(base, base).map((e) => (e.ref === firstProse.id ? { ref: e.ref, text: "<img src=x onerror=alert(1)>" } : e)), base);
  assert.equal(blocks.find((b) => b.id === firstProse.id).text, "<img src=x onerror=alert(1)>", "kept as literal text; the builder renders text nodes only");
});

test("the browser-local draft round-trips, is per post+unit, and clears back to the approved body", () => {
  const storage = memory();
  assert.equal(resolveUnitBlocks(5107, "u", undefined, storage).length, base.length);
  const entries = entriesFromBlocks(base, base).map((e) => (e.ref === firstProse.id ? { ref: e.ref, text: "נערך" } : e));
  assert.equal(writeBodyDraft(5107, "u", entries, storage), true);
  assert.equal(resolveUnitBlocks(5107, "u", undefined, storage).find((b) => b.id === firstProse.id).text, "נערך");
  assert.equal(resolveUnitBlocks(5112, "u", undefined, storage).find((b) => b.id === firstProse.id).text, firstProse.text, "another post is unaffected");
  clearBodyDraft(5107, "u", storage);
  assert.equal(readBodyDraft(5107, "u", storage), null);
  assert.equal(resolveUnitBlocks(5107, "u", undefined, storage).find((b) => b.id === firstProse.id).text, firstProse.text);
});
