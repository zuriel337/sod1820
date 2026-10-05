// node --test src/lib/research/number2029LiveGlass.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fibonacciRailModel } from "./fibonacciSequence.js";
import { humanContentTitle, decodePublicEntities } from "../presentation/contentTitle.js";
import { numberTimelineToRows, timelineVisibleCount, publicSourceLabel } from "./timeline2029.js";
import { buildWorldCards } from "../presentation/numberWorldCards.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("Fibonacci 631 sits between F15=610 and F16=987 with Zeckendorf 610+21", () => {
  const m = fibonacciRailModel("631");
  assert.equal(m.state, "between");
  assert.deepEqual(m.lower, { index: 15, value: "610" });
  assert.deepEqual(m.upper, { index: 16, value: "987" });
  assert.deepEqual(m.zeckendorf.terms.map((t) => t.term), ["610", "21"]);
  assert.equal(m.zeckendorf.sum, "631");
  assert.ok(m.cards.some((c) => c.role === "lower") && m.cards.some((c) => c.role === "upper"));
});

test("Fibonacci exact term reports its F-index", () => {
  const m = fibonacciRailModel("610");
  assert.equal(m.state, "exact");
  assert.equal(m.exactIndex, 15);
});

test("repeated / double-encoded entities render as human punctuation", () => {
  assert.equal(decodePublicEntities("&amp;quot;שלום&amp;quot;"), '"שלום"');
  assert.equal(humanContentTitle("&amp;amp;quot;א&amp;amp;quot; &amp; ב"), '"א" & ב');
  assert.equal(humanContentTitle("&quot;x&quot;"), '"x"');
  assert.equal(publicSourceLabel("a &amp;quot;b&amp;quot;"), 'a "b"');
  const rows = numberTimelineToRows([{ id: "1", at: "2026-10-01", label: "&amp;quot;כותרת&amp;quot;" }]);
  assert.equal(rows[0].label, '"כותרת"');
});

test("timeline paginates 8 then +8 up to available rows", () => {
  assert.equal(timelineVisibleCount(30, 0), 8);
  assert.equal(timelineVisibleCount(30, 1), 16);
  assert.equal(timelineVisibleCount(30, 3), 30);
  assert.equal(timelineVisibleCount(30, 9), 30);
  assert.equal(timelineVisibleCount(5, 0), 5);
});

test("timeline: real href is preserved, never fabricated; inspect affordance coexists", () => {
  const rows = numberTimelineToRows([
    { id: "a", at: "2026-10-02", label: "A", href: "/post/a" },
    { id: "b", at: "2026-10-01", label: "B" },
  ]);
  assert.equal(rows[0].href, "/post/a");
  assert.equal(rows[1].href, null);
  const tl = read("../../components/experience2029/Timeline2029.jsx");
  assert.ok(tl.includes("row.href ?") && tl.includes("onInspect"));
});

test("Number World shows only live material", () => {
  const cards = buildWorldCards(
    [{ id: "w1", label: "עולם א" }, { id: "w1b", label: "עולם ב", count: 3 }],
    [{ id: "t1", title: "ריק" }, { id: "t2", title: "עם ראיות", sources: [{}] }, { id: "t3", title: "עם ספירה", items_count: 2 }],
  );
  assert.deepEqual(cards.map((c) => c.label), ["עולם א", "עולם ב", "עם ראיות", "עם ספירה"]);
  assert.deepEqual(buildWorldCards([], [{ title: "ריק" }]), []);
  const src = read("../../components/number2029/NumberLivingWorld2029.jsx");
  assert.ok(!src.includes("עולם חי\""));
  assert.ok(src.includes("worldCards.length ? <section"));
});
