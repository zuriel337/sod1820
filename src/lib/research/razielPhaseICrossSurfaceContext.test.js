import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRazielSurfaceContext } from "./razielSurfaceContext.js";
import { normalizeResearchContext } from "./researchContext.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const mod = read("./razielSurfaceContext.js");
const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
const semFn = edge.slice(edge.indexOf("function razielSemanticSurfaceText"), edge.indexOf("function razielPlanMeta"));

const ctx = (subject, extra = {}) => normalizeResearchContext({ subject, ...extra });

test("I: Post/Topic/World/Heichal subjects pass via existing subject + surfaceFocus, bounded and tag-stripped", () => {
  for (const type of ["post", "topic", "world", "heichal"]) {
    const c = ctx({ type, id: "x1", label: "t" }, {
      lens: "reading",
      dimensions: {
        surfaceFocus: { type, label: "<b>" + "ש".repeat(200) + "</b>", postSlug: "my-post", sectionLabel: "פתיחה" },
        surfaceSections: Array.from({ length: 12 }, (_, i) => ({ label: `סעיף ${i}` })),
        surfaceFindings: Array.from({ length: 8 }, (_, i) => ({ label: `ממצא ${i}` })),
      },
    });
    const out = buildRazielSurfaceContext(c);
    assert.equal(out.lens, "reading");
    assert.equal(out.focus.type, type);
    assert.ok(out.focus.label.length <= 80 && !/[<>]/.test(out.focus.label));
    assert.equal(out.focus.postSlug, "my-post");
    assert.equal(out.sections.length, 6);
    assert.equal(out.findings.length, 4);
  }
});

test("I: Journey identity is carried (kind/id/position/revisionNo)", () => {
  const out = buildRazielSurfaceContext(ctx({ type: "journey", id: "j1" }, { journey: { id: "j1", kind: "path", position: 3, revisionNo: 2 } }));
  assert.deepEqual(out.journey, { kind: "path", id: "j1", position: "3", revisionNo: 2 });
});

test("I: absent data stays absent — no fetch, no invention", () => {
  assert.equal(buildRazielSurfaceContext(null), null);
  assert.equal(buildRazielSurfaceContext(ctx({ type: "post", id: "p" })), null);
});

test("I: never forwards body/html/raw discovery/private workspace keys", () => {
  const out = buildRazielSurfaceContext(ctx({ type: "post", id: "p" }, {
    dimensions: { surfaceFocus: { type: "post", html: "<p>x</p>", body: "secret", rawDiscovery: "r", workspace: "w" }, privateWorkspace: "p", body: "b" },
  }));
  assert.deepEqual(Object.keys(out), ["focus"]);
  assert.deepEqual(Object.keys(out.focus), ["type"]);
  assert.doesNotMatch(mod, /innerHTML|outerHTML|supabase|fetch\(|document\.|useEffect/);
});

test("I: SystemFrame wires it into existing surface_semantic only; no new read/provider call on open; Number/ELS/transcript intact", () => {
  assert.match(chat, /buildRazielSurfaceContext\(context\)/);
  assert.match(chat, /out\.context = surfaceContext/);
  assert.doesNotMatch(chat, /useEffect/);
  assert.match(chat, /out\.number = /);
  assert.match(chat, /out\.els = /);
  assert.match(chat, /turns\.slice\(-2\)/);
  assert.match(chat, /slice\(0, 600\)/);
});

test("I: edge renders the context block inside the existing capped semantic text; no new route or DB read", () => {
  assert.match(semFn, /sc\.context/);
  assert.match(semFn, /slice\(0, 1000\)/);
  assert.doesNotMatch(semFn, /fetch\(|rpc\/|from\(/);
  assert.doesNotMatch(semFn, /innerHTML|outerHTML|pageText|html/i);
});

test("I-fix: Post readingFocus survives bounded (max3 signals, number, tags stripped)", () => {
  const out = buildRazielSurfaceContext(ctx({ type: "post", id: "p" }, {
    dimensions: { readingFocus: { id: "r1", label: "<i>תבנית</i>", primary: "אמת", signals: ["a", "b", "c", "d", "e"], number: 441, sourceLabel: "מקור", postId: "p9", postSlug: "slug", locator: "פרק א", href: "/x", body: "no" } },
  }));
  assert.deepEqual(out.reading, { id: "r1", label: "תבנית", primary: "אמת", sourceLabel: "מקור", postId: "p9", postSlug: "slug", locator: "פרק א", number: 441, signals: ["a", "b", "c"] });
});

test("I-fix: World/Journey navigation values survive; visited capped to 6 safe integers", () => {
  const out = buildRazielSurfaceContext(ctx({ type: "world", id: "w" }, {
    selection: { entityType: "finding", entityId: "e1", findingId: "f1", sourceRef: "s1", locator: "l1", expression: "ignored" },
    returnTo: { href: "/back", label: "חזרה", subject: { type: "post", id: "p1", label: "פוסט" } },
    dimensions: { entrySource: "world", sourceRef: "ref-1", journeySemanticId: "js1", journeyRoot: "root", journeyVisitedValues: [1, 2, 3, 4, 5, 6, 7, 8, 1.5, "x"] },
  }));
  assert.deepEqual(out.navigation.journeyVisitedValues, [1, 2, 3, 4, 5, 6]);
  assert.equal(out.navigation.entrySource, "world");
  assert.equal(out.navigation.sourceRef, "ref-1");
  assert.equal(out.navigation.journeySemanticId, "js1");
  assert.equal(out.navigation.journeyRoot, "root");
  assert.deepEqual(out.navigation.selection, { entityType: "finding", entityId: "e1", findingId: "f1", sourceRef: "s1", locator: "l1" });
  assert.deepEqual(out.navigation.returnTo, { label: "חזרה", subjectType: "post", subjectId: "p1", subjectLabel: "פוסט" });
  assert.equal(JSON.stringify(out).includes("/back"), false);
});

test("I-fix: absent reading/navigation stays absent; unsafe integers dropped", () => {
  const out = buildRazielSurfaceContext(ctx({ type: "post", id: "p" }, { lens: "x", dimensions: { journeyVisitedValues: [1e300, "a"] } }));
  assert.deepEqual(Object.keys(out), ["lens"]);
});

test("I-fix: edge renders reading/navigation inside capped non-evidence text; no new reads", () => {
  assert.match(semFn, /c\.reading/);
  assert.match(semFn, /c\.navigation/);
  assert.match(semFn, /לא עובדה קנונית/);
  assert.match(semFn, /slice\(0, 1000\)/);
  assert.doesNotMatch(semFn, /fetch\(|rpc\/|from\(/);
});
