import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformWithOxc } from "vite";
import { postClassification2029, postHierarchyContext2029, postFollowCandidates2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { createRazielRequestContextSnapshot, buildRazielSessionRequest } from "../src/lib/research/razielSessionRequest2029.js";

const post = over => ({ id: 5105, slug: "koach-hashtika-dim5", title: "כוח השתיקה", author: "בדרך לנצח", categories: ["מימד חמש"], tags: [], ...over });
const requestFor = patch => buildRazielSessionRequest({ question: "מה אני רואה כאן?", contextSnapshot: createRazielRequestContextSnapshot(patch) });

test("admitted series, publisher and comparison channel retain different roles through the existing request", () => {
  const row = post({ content: "PRIVATE_BODY_MUST_NOT_TRAVEL", privateWorkspace: "PRIVATE_WORKSPACE" });
  const before = JSON.stringify(row), patch = postHierarchyContext2029(row, { seriesKey: "dimension-five" });
  assert.equal(JSON.stringify(row), before);
  const request = requestFor(patch), surface = request.surfaceSemantic;
  assert.equal(request.facts, "", "surface context is never canonical tool evidence");
  assert.equal(surface.subject.type, "post");
  assert.match(surface.reading.primary, /מימד חמש: סדרת תוכן.*בדרך לנצח: מפרסם/);
  assert.ok(surface.context.reading.signals.includes("אור הגאולה: ערוץ/בית פרסום"));
  assert.ok(surface.context.reading.signals.includes("ההשוואה אינה ראיית חברות בערוץ"));
  assert.ok(surface.context.reading.signals.includes("מעקב מפורש ≠ רלוונטיות או המלצה"));
  assert.match(surface.context.reading.sourceLabel, /PLAN37 DEC-SERIES-003\+006 · posts:5105/);
  assert.equal(surface.context.navigation.sourceRef, "posts:5105");
  assert.equal(surface.context.navigation.returnTo.href, "/post/koach-hashtika-dim5#post-classification");
  assert.equal(surface.context.navigation.selection.locator, "#post-classification");
  assert.equal(surface.number, undefined);
  assert.doesNotMatch(JSON.stringify(request), /PRIVATE_BODY|PRIVATE_WORKSPACE|channel:or-geula/);
  assert.deepEqual(postFollowCandidates2029({ post: row }).map(item => item.topic), ["series:dimension-five"]);
});

test("the actual bounded server semantic composer receives the roles and their non-evidence boundary", async () => {
  const edge = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
  const snippet = edge.slice(edge.indexOf("const rzClean ="), edge.indexOf("// Compact plan metadata"));
  const { code } = await transformWithOxc(snippet, "surface.ts", { lang: "ts" });
  const compose = runInNewContext(code + ";razielSemanticSurfaceText");
  const request = requestFor(postHierarchyContext2029(post(), { seriesKey: "dimension-five" }));
  const text = compose(request.surfaceSemantic);
  assert.match(text, /לא עובדה קנונית/);
  assert.match(text, /מימד חמש: סדרת תוכן/);
  assert.match(text, /אור הגאולה: ערוץ\/בית פרסום/);
  assert.match(text, /ההשוואה אינה ראיית חברות בערוץ/);
  assert.match(text, /מעקב מפורש ≠ רלוונטיות או המלצה/);
  assert.match(text, /PLAN37 DEC-SERIES-003\+006/);
  assert.ok(text.length <= 1000);
});

test("wrong publisher, unknown series and channel-like source labels cannot invent membership", () => {
  const row = post({ author: "מפרסם אחר", categories: ["מימד חמש", "אור הגאולה"] });
  assert.equal(postHierarchyContext2029(row, { seriesKey: "dimension-five" }), null);
  assert.equal(postHierarchyContext2029(row, { seriesKey: "or-geula" }), null);
  assert.equal(postClassification2029(row).series.length, 0);
  const patch = postHierarchyContext2029(row);
  assert.match(patch.dimensions.readingFocus.primary, /לא אומת שיוך לסדרה/);
  assert.equal(postClassification2029(row).sourceCategories.find(item => item.name === "אור הגאולה").role, "source-category");
});

test("future post membership uses the same descriptors; multiple series require an explicit selection", () => {
  const future = post({ id: 990001, slug: "future-post", categories: ["מימד חמש", "סוד החשמל"] });
  assert.equal(postClassification2029(future).series.length, 2);
  assert.match(postHierarchyContext2029(future).dimensions.readingFocus.primary, /בנפרד/);
  for (const seriesKey of ["dimension-five", "sod-hashmal"]) {
    const patch = postHierarchyContext2029(future, { seriesKey });
    assert.equal(patch.selection.entityId, seriesKey);
    assert.equal(patch.dimensions.sourceRef, "posts:990001");
  }
  const writer = post({ author: "אלון לוי", categories: [], tags: ["מה קורה הבורא"] });
  assert.match(postHierarchyContext2029(writer, { seriesKey: "mah-kore-habora" }).dimensions.readingFocus.primary, /אלון לוי: כתב/);
});

test("suppressed sources and missing identities fail closed; no calculation is fabricated", () => {
  for (const over of [{ tags: ["טיוטה"] }, { tags: ["פורום"] }, { id: null }, { slug: "bad#fragment" }, { slug: "../escape" }]) {
    assert.equal(postHierarchyContext2029(post(over)), null);
  }
  const patch = postHierarchyContext2029(post());
  assert.equal(patch.dimensions.numberCoreFocus, null);
  assert.equal(patch.dimensions.postClaimBinding, null);
  assert.equal(patch.dimensions.readingFocus.number, undefined);
});
