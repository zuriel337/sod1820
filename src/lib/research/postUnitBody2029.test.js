import test from "node:test";
import { YAMIN_SMOL_TEXT_20261112 } from "./fixtures/yaminSmolText20261112.js";
import assert from "node:assert/strict";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, resolveUnitBlocks, writeBodyDraft, readBodyDraft, clearBodyDraft, cleanBodyText, cleanGematriaItem, refreshData } from "./postUnitBody2029.js";

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const base = baseBodyBlocks(YAMIN_SMOL_TEXT_20261112);
const firstProse = base.find((b) => b.kind === "p" && !b.locked);

test("the approved body is split into identified blocks; ONLY external sources are protected — numbers, equations and tables are research data", () => {
  assert.ok(base.length > 60);
  assert.ok(base.every((b, i) => b.id === `b${i}`));
  const locked = base.filter((b) => b.locked);
  assert.equal(locked.length, 13);
  for (const b of locked) assert.ok(b.kind === "verse" || ["yaniv-levi", "shachar-kandro"].includes(b.group), `${b.id} ${b.kind}`);
  for (const b of base.filter((x) => ["numbers", "peak", "claim", "row"].includes(x.kind))) assert.equal(b.locked, false, `${b.id} (${b.kind}) is data, not a source`);
  assert.ok(base.filter((b) => b.group === "editorial-phrase").every((b) => !b.locked), "the site's own editorial phrase is editorial");
  assert.ok(base.some((b) => b.kind === "claim" && b.group === "shachar-kandro" && !b.locked), "a claim inside a writer's group stays editable data");
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
  assert.equal(resolveUnitBlocks(5107, "u", YAMIN_SMOL_TEXT_20261112, storage).length, base.length);
  const entries = entriesFromBlocks(base, base).map((e) => (e.ref === firstProse.id ? { ref: e.ref, text: "נערך" } : e));
  assert.equal(writeBodyDraft(5107, "u", entries, storage), true);
  assert.equal(resolveUnitBlocks(5107, "u", YAMIN_SMOL_TEXT_20261112, storage).find((b) => b.id === firstProse.id).text, "נערך");
  assert.equal(resolveUnitBlocks(5112, "u", YAMIN_SMOL_TEXT_20261112, storage).find((b) => b.id === firstProse.id).text, firstProse.text, "another post is unaffected");
  clearBodyDraft(5107, "u", storage);
  assert.equal(readBodyDraft(5107, "u", storage), null);
  assert.equal(resolveUnitBlocks(5107, "u", YAMIN_SMOL_TEXT_20261112, storage).find((b) => b.id === firstProse.id).text, firstProse.text);
});

test("F1: a gematria item keeps the exact source reference it was taken from; a malformed reference is refused; two sources with one phrase stay two items", () => {
  const item = cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full", by: "yaniv-levi", sourceRef: "channel_updates:6d40048f-b429-4208-bb34-ad36ff4ba907" });
  assert.equal(item.sourceRef, "channel_updates:6d40048f-b429-4208-bb34-ad36ff4ba907");
  assert.equal(cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full", sourceRef: "unit-block:b12" }).sourceRef, "unit-block:b12");
  assert.equal(cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full" }).sourceRef, undefined);
  for (const bad of ["javascript:alert(1)", "<b>x</b>", "a b", "x".repeat(200), "no-colon", ":id"]) assert.equal(cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full", sourceRef: bad }), null, bad);
  const a = cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full", sourceRef: "unit-block:b3" }), b = cleanGematriaItem({ phrase: "אב", methodKey: "רגיל", display: "full", sourceRef: "unit-block:b9" });
  assert.notDeepEqual(a, b);
});

test("F2: editing a writer's data line never keeps the writer's attribution; the original stays linked; editing back restores it", () => {
  const original = { kind: "claim", id: "b7", text: "גדעון איזנקוט ראש הממשלה = 1237", identity: "shachar-kandro", group: "shachar-kandro" };
  const edited = refreshData(original, "נוסח חדש = 999");
  assert.equal(edited.text, "נוסח חדש = 999");
  assert.equal(edited.identity, "editorial");
  assert.equal(edited.group, undefined);
  assert.deepEqual(edited.editedFrom, { identity: "shachar-kandro", group: "shachar-kandro", text: "גדעון איזנקוט ראש הממשלה = 1237" });
  // a second edit keeps pointing at the ORIGINAL, not at the first edit
  assert.equal(refreshData(edited, "עוד נוסח = 5").editedFrom.text, "גדעון איזנקוט ראש הממשלה = 1237");
  // editing back to the exact original restores the writer's attribution
  const back = refreshData(edited, "גדעון איזנקוט ראש הממשלה = 1237");
  assert.equal(back.group, "shachar-kandro");
  assert.equal(back.identity, "shachar-kandro");
  assert.equal(back.editedFrom, undefined);
  // an editorial line (no group) is just edited
  assert.deepEqual(refreshData({ kind: "claim", id: "b1", text: "x = 1", identity: "editorial" }, "y = 2"), { kind: "claim", id: "b1", text: "y = 2", identity: "editorial" });
});
