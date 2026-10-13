import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNumberExpressionHandoff,
  numberWindowSourceReturn,
  parseNumberExpressionFocus,
} from "./numberExpressionFocus.js";
import { buildExactReturnPatch, normalizeResearchContext } from "./researchContext.js";

const source = {
  href: "/post/pilot#source-region-calculation",
  label: "המקור",
  subject: { id: "post-1", type: "post", label: "המקור", href: "/post/pilot" },
  selection: { entityId: "calculation", entityType: "post_region", sourceRef: "post:1", locator: "#source-region-calculation" },
  lens: "reading",
  dimensions: { viewport: "calculation", readingFocus: { id: "calculation", locator: "#source-region-calculation" } },
};
const expression = "נפתלי בנט";
const crossing = { kind: "hidden_crossing", partner: "נס נתניהו", methodCount: 2 };
const fromPost = {
  subject: { id: "631", type: "number", label: "631", href: "/2029/number/631" },
  selection: { expression, method: "רגיל", resultValue: 631, sourceRef: "post:1", locator: "#source-region-calculation" },
  lens: "gematria", dimensions: { viewport: "calculation" }, returnTo: source,
};
const sourceReturn = numberWindowSourceReturn(fromPost, { href: "/post/pilot" });
const open = (overrides = {}) => buildNumberExpressionHandoff({
  context: fromPost, root: 631, expression, method: "רגיל", resultValue: 631,
  crossingPartner: crossing.partner, verifiedCrossings: [crossing], sourceReturn,
  ...overrides,
});

test("Post contextual window opens full Number with reloadable expression/method/verified crossing and exact source", () => {
  const result = open();
  assert.equal(result.context.subject.id, "631");
  assert.equal(result.context.subject.href, result.href);
  assert.deepEqual(parseNumberExpressionFocus(new URL(result.href, "https://example.test").search), {
    expression, method: "רגיל", crossingPartner: crossing.partner, explicit: true,
  });
  assert.equal(result.context.selection.focusKind, "crossing");
  assert.equal(result.context.selection.sourceRef, "post:1");
  assert.equal(result.context.dimensions.expressionFocusExplicit, true);
  assert.equal(result.context.returnTo.href, source.href);
  assert.equal(result.context.returnTo.label, "המקור");
  const restored = buildExactReturnPatch(JSON.parse(JSON.stringify(result.context)));
  assert.deepEqual(restored.subject, normalizeResearchContext(source).subject);
  assert.equal(restored.selection.locator, source.selection.locator);
  assert.equal(restored.lens, "reading");
  assert.equal(restored.dimensions.viewport, "calculation");
  assert.equal(restored.dimensions.numberHome, undefined);
});

test("World handoff keeps Number home and selected method result distinct without losing source return", () => {
  const result = open({ lens: "world", method: "מילוי", resultValue: 1634, crossingPartner: null });
  assert.equal(result.context.lens, "world");
  assert.equal(result.context.subject.id, "631", "opening World must not silently change the numeric home");
  assert.equal(result.context.selection.resultValue, 1634);
  assert.equal(result.context.selection.method, "מילוי");
  assert.equal(result.context.dimensions.numberHome, result.href);
  assert.equal(result.context.returnTo.subject.type, "post");
  assert.equal(result.context.returnTo.href, source.href);
  assert.equal(parseNumberExpressionFocus(new URL(result.href, "https://example.test").search).crossingPartner, null);
});

test("unverified, removed and cross-method-only partners never become a verified crossing focus", () => {
  for (const verifiedCrossings of [[], [{ ...crossing, partner: "אחר" }], [{ ...crossing, kind: "cross_method_intersection" }]]) {
    const result = open({ verifiedCrossings });
    assert.equal(result.context.selection.crossingPartner, null);
    assert.equal(result.context.selection.focusKind, "expression");
    assert.equal(new URL(result.href, "https://example.test").searchParams.has("cross"), false);
  }
});

test("a Number preview exit does not turn its default expression into explicit research focus", () => {
  const result = open({ expression: null });
  assert.equal(result.href, "/2029/number/631");
  assert.equal(result.context.dimensions.expressionFocusExplicit, false);
  for (const field of ["expression", "method", "resultValue", "crossingPartner", "focusKind"]) {
    assert.equal(result.context.selection[field], null);
  }
});

test("missing or invalid Number roots do not become zero; real zero is addressable", () => {
  for (const root of [null, undefined, "", " ", false, true, [], {}, -1, 1.2, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(open({ root }), null, String(root));
  }
  assert.equal(open({ root: 0, expression: null }).href, "/2029/number/0");
  assert.equal(open({ resultValue: null }).context.selection.resultValue, null);
});

test("capturing the underlying World source ignores unrelated stale return targets", () => {
  const context = {
    subject: { id: "image-1", type: "image", label: "תמונה", href: "/world#world-discovery-image-1" },
    selection: { sourceRef: "image:1", locator: "#world-discovery-image-1" },
    lens: "world", dimensions: { viewport: "images", filter: "photos" }, returnTo: source,
  };
  const snapshot = numberWindowSourceReturn(context, { href: "/world?source=gallery", locator: context.selection.locator });
  const result = open({ context, sourceReturn: snapshot });
  assert.equal(result.context.returnTo.href, "/world?source=gallery#world-discovery-image-1");
  assert.equal(result.context.returnTo.subject.id, "image-1");
  assert.equal(result.context.returnTo.selection.sourceRef, "image:1");
  assert.equal(result.context.returnTo.dimensions.filter, "photos");
});

test("a newly selected source locus supersedes an older return on the same Post", () => {
  const current = { ...fromPost, selection: { ...fromPost.selection, locator: "#source-region-new", sourceRef: "post:1:new" } };
  for (const options of [
    { href: "/post/pilot#source-region-new" },
    { href: "/post/pilot#source-region-calculation", locator: "#source-region-new" },
  ]) {
    const snapshot = numberWindowSourceReturn(current, options);
    assert.equal(snapshot.href, "/post/pilot#source-region-new");
    assert.equal(snapshot.selection.locator, "#source-region-new");
    assert.equal(snapshot.selection.sourceRef, "post:1:new");
    assert.equal(snapshot.subject.type, "post");
    assert.equal(snapshot.label, "המקור");
  }
});

test("Shell captures a World source before Number replaces its subject and selection", () => {
  const world = {
    subject: { id: "image-1", type: "image", label: "תמונת המקור", href: "/world#image-1" },
    selection: { sourceRef: "image:1", locator: "#image-1" },
    lens: "world", dimensions: { viewport: "gallery" },
  };
  const captured = numberWindowSourceReturn(world, { href: "/world#image-1" });
  const numberContext = { ...world, subject: fromPost.subject, selection: fromPost.selection, lens: "gematria" };
  const result = open({ context: numberContext, sourceReturn: captured, lens: "world" });
  const restored = buildExactReturnPatch(result.context);
  assert.equal(restored.subject.type, "image");
  assert.equal(restored.subject.label, "תמונת המקור");
  assert.equal(restored.selection.sourceRef, "image:1");
  assert.equal(restored.selection.locator, "#image-1");
  assert.equal(restored.dimensions.viewport, "gallery");
});

test("current Path revision and fork survive window departure and exact return", () => {
  const captured = { ...source, journey: { id: "path-A", kind: "research_path", revisionNo: 1 }, dimensions: { ...source.dimensions, journey2029Active: true, journey2029Mode: "old" } };
  for (const id of ["path-A", "path-B"]) {
    const context = { ...fromPost, journey: { id, kind: "research_path", revisionNo: 3, position: 2, pendingSteps: [] }, dimensions: { journey2029Active: true, journey2029Mode: "organic" } };
    const result = open({ context, sourceReturn: captured });
    assert.deepEqual(result.context.journey, normalizeResearchContext(context).journey);
    const restored = buildExactReturnPatch(result.context);
    assert.equal(restored.journey.id, id);
    assert.equal(restored.journey.revisionNo, 3);
    assert.equal(restored.dimensions.journey2029Mode, "organic");
    assert.equal(restored.selection.sourceRef, "post:1");
  }
});

test("cleared or deactivated Path is never resurrected by the window's captured source", () => {
  const journey = { id: "path-A", kind: "research_path", revisionNo: 1 };
  const captured = { ...source, journey, dimensions: { journey2029Active: true, journey2029Mode: "organic" } };
  for (const context of [
    { ...fromPost, journey: null },
    { ...fromPost, journey, dimensions: { journey2029Active: false } },
  ]) {
    const result = open({ context, sourceReturn: captured });
    const restored = buildExactReturnPatch(result.context);
    assert.equal(restored.journey, null);
    assert.notEqual(restored.dimensions.journey2029Active, true);
    assert.equal(restored.dimensions.journey2029Mode, undefined);
  }
});
