// node --test src/lib/research/commandContextResolver2029.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyCommandQuery, resolveCommandRoute, buildDateRepresentations, expressionToNumberTarget,
  assessTemporal, buildDateContextProjection, fetchDateContext, DATE_SOURCE_CAP,
} from "./commandContextResolver2029.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("date classifier supports required forms", () => {
  for (const q of ["7.10", "7/10"]) { const c = classifyCommandQuery(q); assert.equal(c.intent, "date"); assert.equal(c.kind, "day_month"); assert.equal(c.key, "7.10"); }
  for (const q of ["7.10.2023", "7/10/2023", "2023-10-07"]) { const c = classifyCommandQuery(q); assert.equal(c.kind, "full_date"); assert.equal(c.iso, "2023-10-07"); }
  assert.equal(classifyCommandQuery("31.2").intent, "phrase");
  assert.equal(classifyCommandQuery("3.14").intent, "phrase");
});

test("7.10 is not routed to number capability; 718 stays numeric; phrases unchanged", () => {
  assert.equal(resolveCommandRoute("7.10").capability, "date");
  assert.equal(resolveCommandRoute("7.10").target.type, "date");
  const n = resolveCommandRoute("718");
  assert.equal(n.capability, "number"); assert.equal(n.target.type, "number"); assert.equal(n.target.id, "718");
  const p = resolveCommandRoute("משיח");
  assert.equal(p.capability, "number"); assert.equal(p.target.type, "phrase");
  assert.equal(resolveCommandRoute("x".repeat(121)), null);
});

test("full date resolves to iso", () => {
  assert.equal(resolveCommandRoute("2023-10-07").classification.iso, "2023-10-07");
});

test("representation action hands expression to NumberDrawer without hardcoded result", () => {
  const reps = buildDateRepresentations(classifyCommandQuery("7.10"), { locale: "he" });
  const phrase = reps.find((r) => r.kind === "human_date_phrase");
  assert.equal(phrase.expression, "שביעי באוקטובר");
  assert.equal(phrase.actionLabel, "חשב את התאריך כמילים");
  const t = expressionToNumberTarget(phrase);
  assert.equal(t.type, "phrase"); assert.equal(t.label, "שביעי באוקטובר");
  for (const k of ["method", "resultValue", "expression", "number"]) assert.equal(t[k], undefined);
  assert.ok(!JSON.stringify(phrase).includes("718"));
  assert.equal(buildDateRepresentations(classifyCommandQuery("7.10"), { locale: "en" }).length, 0);
  const heb = buildDateRepresentations(classifyCommandQuery("7.10"), { sourcedHebrewDates: ["כ״ב בתשרי תשפ״ד"] });
  assert.ok(heb.some((r) => r.kind === "hebrew_date" && r.actionLabel !== phrase.actionLabel));
});

test("PublishedAt != OccurredAt and uncertainty surfaced", () => {
  const a = assessTemporal({ publishedAt: "2023-10-09", occurredAt: "2022-12-18", occurredSource: "auto_from_post" });
  assert.equal(a.differ, true); assert.equal(a.uncertain, true);
  assert.equal(assessTemporal({ publishedAt: "2023-10-09" }).uncertain, true);
  assert.equal(assessTemporal({ occurredAt: "2023-10-07", occurredSource: "curated" }).uncertain, false);
});

test("projection: no auto Event identity, hub pointer first, bounded, mismatched dates excluded", async () => {
  const date = classifyCommandQuery("7.10");
  const posts = [87, 149, 233, 174].map((id) => ({ id, title: `p${id}`, date: "2023-10-09" }));
  const axis = { all: [
    { source: "event", id: "e1", label: "Oct 7", occurred_at: "2023-10-07", hebrew_date: "כ״ב בתשרי" },
    { source: "event", id: "e2", label: "Other", occurred_at: "2022-12-18" },
  ] };
  const proj = await fetchDateContext(date, { checkAxisData: async () => axis, searchPosts: async () => posts });
  assert.equal(proj.mintsIdentity, false);
  assert.equal(proj.events.length, 1); assert.equal(proj.events[0].identity, "candidate_only");
  assert.equal(proj.posts[0].id, 233); assert.equal(proj.posts[0].curatedHub, true);
  assert.ok(proj.connections.length <= DATE_SOURCE_CAP);
  assert.deepEqual(proj.hebrewDates, ["כ״ב בתשרי"]);
  assert.ok(proj.representations.some((r) => r.kind === "hebrew_date"));
  assert.equal(buildDateContextProjection({ intent: "number" }), null);
});

test("wiring: date route precedes number, non-date flow kept, exact-return untouched", () => {
  const src = read("../../components/experience2029/SystemFrame2029.jsx");
  const i = src.indexOf("const route = resolveCommandRoute(commandQuery)");
  assert.ok(i > 0);
  const block = src.slice(i, i + 700);
  assert.ok(block.indexOf('route.capability === "date"') < block.indexOf("targetFromSelectedText(commandQuery)"));
  assert.ok(!block.slice(0, block.indexOf("targetFromSelectedText")).includes("setEphemeralSelection"));
  assert.ok(!/NumberDrawer2029[^\n]*dateQuery/.test(src));
  assert.ok(src.includes("returnTo: context?.returnTo") || src.includes("returnExact"));
});
