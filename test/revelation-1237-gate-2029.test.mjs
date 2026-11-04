import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONNECTION_STATUS, CONNECTION_TARGETS, GATE_GALLERIES, GATE_PHRASES, REVIEWED_STATEMENTS, TRUMP_NOT_ELECTORS,
  TRUMP_THRESHOLD_LAYERS, buildGateProjection, buildMethodCard, classifyConnections, israelElectionsNote,
  gateMethodFocus2029, gatePublicMethodRows, gateSourcePresentation, gateSourceTextSelection, gateSourceSelectionIsCurrent,
  loadGalleryPage, loadMethodCards, splitSourceTimes, storedOrderIds, verifyReviewedStatements,
} from "../src/lib/research/revelation1237Gate2029.js";
import { ELECTIONS_ISRAEL_21_26_BUNDLE } from "../src/lib/research/electionsIsrael21_26Seed2029.js";

const profile = (key, value, extra = {}) => ({ methodKey: key, displayLabel: key, computedValue: value, mathematicalFamily: "f", definitionVersion: 1, ...extra });
const [hitgalut, vraita] = GATE_PHRASES;

test("exact spellings and methods are fixed: התגלות במסתתר, וראית את אחרי ברגיל", () => {
  assert.deepEqual([hitgalut.expression, hitgalut.methodKey], ["התגלות", "מסתתר"]);
  assert.deepEqual([vraita.expression, vraita.methodKey], ["וראית את אחרי", "רגיל"]);
  assert.deepEqual(GATE_GALLERIES.map((g) => g.wpGalleryId), [29, 81]);
});

test("a method card is confirmed only when the engine returned 1237 for that method; never computed locally", () => {
  const ok = buildMethodCard([profile("רגיל", 844), profile("מסתתר", 1237)], hitgalut);
  assert.equal(ok.status, "confirmed");
  assert.equal(ok.plainValue, 844, "the plain value stays a separate number");
  const other = buildMethodCard([profile("רגיל", 844), profile("מסתתר", 1580)], hitgalut);
  assert.equal(other.status, "different_value");
  assert.equal(other.value, 1580, "a different engine value is shown, not coerced to 1237");
  assert.equal(buildMethodCard([profile("רגיל", 844)], hitgalut).status, "unavailable");
  assert.equal(buildMethodCard([], vraita).value, null, "no value is fabricated");
  assert.equal(buildMethodCard([profile("רגיל", 1237)], vraita).plainValue, null, "plain method has no second value");
});

test("a failing reader yields 'failed', never a zero or a confirmation", async () => {
  const cards = await loadMethodCards({ fetchMethodProfile: async (text) => {
    if (text === "התגלות") throw new Error("down");
    return [profile("רגיל", 1237)];
  } });
  assert.equal(cards[0].status, "failed");
  assert.equal(cards[0].value, null);
  assert.equal(cards[1].status, "confirmed");
});

test("a gate profile opens exact shared depth using a rendered slot, not an invented authored source path", () => {
  const card = buildMethodCard([profile("מסתתר", 1237)], hitgalut);
  const focus = gateMethodFocus2029(card);
  assert.deepEqual(focus.row, { text: "התגלות", method: "מסתתר", value: 1237, sourcePath: "revelation1237.gateMethods.hitgalut" });
  assert.deepEqual(focus.origin, { key: "rv-method-hitgalut", locator: "#rv-method-hitgalut", sectionId: "rv-center", kind: "method_profile", expectedMethodVersion: 1 });
  assert.equal(gateMethodFocus2029(buildMethodCard([profile("מסתתר", 1580)], hitgalut)).row.value, 1580);
  assert.equal(gateMethodFocus2029(buildMethodCard([profile("רגיל", 0)], vraita)).row.value, 0);
  for (const changed of [{ ...card, value: null }, { ...card, value: false }, { ...card, status: "failed" },
    { ...card, methodKey: "רגיל" }, { ...card, expression: "ביטוי אחר" }, { ...card, id: "unknown" }]) assert.equal(gateMethodFocus2029(changed), null);
});

test("missing, blank or boolean method values are not coerced to zero; a real zero remains valid", () => {
  for (const absent of [null, undefined, "", "  ", false, true]) {
    assert.equal(buildMethodCard([profile("רגיל", absent)], vraita).status, "unavailable");
    assert.equal(buildMethodCard([profile("מסתתר", 1237), profile("רגיל", absent)], hitgalut).plainValue, null);
  }
  assert.equal(buildMethodCard([profile("רגיל", 0)], vraita).value, 0);
});

test("pagination advances over withheld and duplicate source rows instead of displayed item count", async () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({ id: String(index), ordering: index }));
  rows.push({ ...rows[0] });
  const requests = [];
  const readers = { wpGalleryId: 29, listGalleryImages: async () => rows,
    fetchSourceContext: async ({ imageIds }) => {
      requests.push(imageIds);
      const admitted = imageIds.filter((id) => Number(id) % 2).map((galleryImageId) => ({ galleryImageId }));
      return { items: [...admitted, ...admitted] };
    } };
  const first = await loadGalleryPage(readers);
  assert.equal(first.totalListed, 8);
  assert.equal(first.items.length, 3);
  assert.equal(first.withheld, 3);
  assert.equal(first.nextOffset, 6);
  const second = await loadGalleryPage({ ...readers, offset: first.nextOffset });
  assert.deepEqual(requests, [["0", "1", "2", "3", "4", "5"], ["6", "7"]]);
  assert.equal(second.hasMore, false);
  assert.equal(second.nextOffset, 8);
});

test("gallery pages use stored order (not importance) and keep only rows the public gate re-admitted", async () => {
  const rows = [{ id: "c", ordering: 3, importance: 99 }, { id: "a", ordering: 1, importance: 0 }, { id: "b", ordering: 2, importance: 50 }];
  assert.deepEqual(storedOrderIds(rows), ["a", "b", "c"]);
  const seen = [];
  const page = await loadGalleryPage({
    wpGalleryId: 29, listGalleryImages: async () => rows,
    fetchSourceContext: async ({ imageIds }) => { seen.push(imageIds); return { items: [{ galleryImageId: "b" }, { galleryImageId: "a" }, { galleryImageId: "zzz" }] }; },
    offset: 0, limit: 2,
  });
  assert.deepEqual(seen, [["a", "b"]]);
  assert.deepEqual(page.items.map((i) => i.galleryImageId), ["a", "b"], "stored order; a row outside the requested slice is dropped");
  assert.equal(page.hasMore, true);
  assert.equal(page.totalListed, 3);
  const withheld = await loadGalleryPage({ wpGalleryId: 81, listGalleryImages: async () => rows,
    fetchSourceContext: async () => ({ items: [{ galleryImageId: "a" }] }), limit: 3 });
  assert.equal(withheld.withheld, 2, "rows withdrawn by the gate are counted as withheld, not shown");
});

test("report time, event time, archive time and final result are separate fields", () => {
  const times = splitSourceTimes({ label: "עדכון 4/10/2020", occurredAt: null, createdAt: "2026-06-12" });
  assert.equal(times.occurredAt, null, "a missing event time is not filled from the archive time");
  assert.equal(times.archivedAt, "2026-06-12");
  assert.equal(times.reportLabel, "עדכון 4/10/2020");
  assert.equal(times.result, "not_asserted");
});

test("stored gallery dates stay provenance even for gematria and mixed hint sources", () => {
  for (const imageType of ["gematria", "hint", null]) {
    const item = { imageType, occurredAt: "2020-06-01", createdAt: "2026-06-12", dateUse: "provenance_only",
      legacyPlacement: { galleryImageId: "id", imageType, occurredAt: "2020-06-01",
        dateProvenance: { occurredAt: { derivedFrom: "path" } } },
      storedNumbers: { primary: 1237, all: [1237, 3137, 0, "844", false], related: [3137, 1026] } };
    const times = splitSourceTimes(item);
    assert.equal(times.occurredAt, null);
    assert.equal(times.storedDate, "2020-06-01");
    assert.equal(times.derivedFrom, "path");
    assert.equal(times.archivedAt, "2026-06-12");
    const view = gateSourcePresentation(item);
    assert.deepEqual(view.numbers, [1237, 3137, 0, 1026]);
    assert.equal(view.history[0], item.legacyPlacement);
    assert.match(view.kindLabel, imageType === "gematria" ? /גימטריה/ : imageType === "hint" ? /רמז/ : /מקור/);
  }
});

test("an explicit stored OCR selection keeps its exact range and cannot be replayed against changed or private source", () => {
  const item = { galleryImageId: "id", sourceRef: "gallery_images:id", imageUrl: "https://example.test/image.png",
    access: { scope: "public" }, intrinsic: { extraction: { text: "טקסט: התגלות סוף" } } };
  const selected = gateSourceTextSelection(item, { start: 5, end: 13, slotKey: "rv-source-gallery-id" });
  assert.equal(selected.expression, "התגלות");
  assert.equal(item.intrinsic.extraction.text.slice(selected.origin.selectionStart, selected.origin.selectionEnd), "התגלות");
  assert.equal(gateSourceSelectionIsCurrent(item, selected.origin), true);
  const gallery = gateSourceTextSelection(item, { start: 5, end: 13, slotKey: "gallery-source-id" });
  assert.equal(gallery.expression, "התגלות");assert.equal(gallery.origin.locator, "#gallery-source-id");
  assert.equal(gateSourceSelectionIsCurrent(item, gallery.origin), true);
  assert.equal(gateSourceTextSelection(item, { start: 5, end: 13, slotKey: "unrendered-slot" }), null);
  for (const changed of [{ ...item, access: { scope: "private" } }, { ...item, sourceRef: "other" },
    { ...item, imageUrl: "https://example.test/replaced.png" }, { ...item, intrinsic: { extraction: { text: "שונה" } } }, null]) {
    assert.equal(gateSourceSelectionIsCurrent(changed, selected.origin), false);
  }
  for (const range of [{ start: -1, end: 8 }, { start: 8, end: 8 }, { start: 0, end: 99 }, { start: 0.5, end: 5 }]) {
    assert.equal(gateSourceTextSelection(item, { ...range, slotKey: "rv-source-gallery-id" }), null);
  }
});

test("public method depth keeps canonical identity, equal-value methods and zero; conflicting or unavailable rows are withheld", () => {
  const row = (key, value, extra = {}) => profile(key, value, { requiredEntitlement: "public", lifecycleActive: true, ...extra });
  const rows = gatePublicMethodRows([row("רגיל", 844), row("גדול", 844), row("קדמי", 3137, { displayLabel: "משולש" }),
    row("מסתתר", 0), row("פרטי", 999, { requiredEntitlement: "private" }), row("לא ידוע", 999, { requiredEntitlement: null }),
    row("כבוי", 999, { lifecycleActive: false }), row("חסר", null), row("כפול", 1), row("כפול", 2)]);
  assert.deepEqual(new Set(rows.map((r) => r.methodKey)), new Set(["רגיל", "גדול", "קדמי", "מסתתר"]));
  assert.equal(rows.find((r) => r.methodKey === "קדמי").displayLabel, "משולש");
  assert.equal(rows.find((r) => r.methodKey === "מסתתר").computedValue, 0);
});

test("gate source number links use the existing 2029 address helper, not the legacy document handoff", () => {
  const source = readFileSync(new URL("../src/components/research/Revelation1237Gate2029.jsx", import.meta.url), "utf8");
  assert.match(source, /to=\{numberExpressionFocusHref\(value\)\}/);
  assert.doesNotMatch(source, /to=\{`\/number\//);
});

test("a reviewed statement counts only while the live caption still contains the exact text", () => {
  const spec = REVIEWED_STATEMENTS.find((s) => s.id === "david-14");
  const item = { galleryImageId: spec.galleryImageId, description: "עד עכשיו ראינו 14 = דוד כעת אנו רואים 1237 = התגלות (מסתתר)", label: "x", createdAt: "2026-06-12" };
  assert.equal(verifyReviewedStatements([item]).length, 1);
  assert.equal(verifyReviewedStatements([{ ...item, description: "טקסט אחר" }]).length, 0, "an edited caption withdraws the statement");
  assert.equal(verifyReviewedStatements([{ ...item, galleryImageId: "other" }]).length, 0, "another image never inherits it");
});

test("only evidence makes a tree relation: shared source, statement and candidate are not edges", () => {
  const context = { links: { topics: [{ slug: "india-axis", href: "/topic/india-axis#x" }] } };
  const statements = [{ id: "david-14", galleryImageId: "g" }];
  const rows = classifyConnections({ context, statements, treeRelations: [] });
  const by = Object.fromEntries(rows.map((r) => [r.id, r.status]));
  assert.equal(by["david-14"], "source_statement");
  assert.equal(by.india, "shared_source");
  assert.equal(by.meron, "candidate");
  assert.equal(by["geula-45"], "candidate", "an identical number (45) is never a relation");
  assert.ok(!rows.some((r) => r.status === "tree"));
  const withEdge = classifyConnections({ context, statements, treeRelations: [{ slug: "meron", edgeRef: "edge:1" }, { slug: "trump" }] });
  assert.equal(withEdge.find((r) => r.id === "meron").status, "tree");
  assert.equal(withEdge.find((r) => r.id === "trump").status, "candidate", "a relation without edgeRef/governanceRef is dropped");
  assert.equal(CONNECTION_TARGETS.find((t) => t.id === "meron").sensitive, true);
  assert.deepEqual(Object.keys(CONNECTION_STATUS), ["tree", "source_statement", "shared_source", "candidate"]);
});

test("Trump: report, calculation and interpretation stay separate and 1,237 is not the electors count", () => {
  assert.deepEqual(Object.keys(TRUMP_THRESHOLD_LAYERS), ["report", "calculation", "interpretation"]);
  assert.match(TRUMP_THRESHOLD_LAYERS.report.text, /2016/);
  assert.match(TRUMP_THRESHOLD_LAYERS.report.text, /1,237/);
  assert.match(TRUMP_THRESHOLD_LAYERS.report.text, /צירי ועידה/);
  assert.doesNotMatch(TRUMP_THRESHOLD_LAYERS.report.text, /אלקטור/);
  assert.match(TRUMP_THRESHOLD_LAYERS.calculation.text, /אין כאן חישוב גימטרי/);
  assert.match(TRUMP_THRESHOLD_LAYERS.interpretation.text, /פרשנית/);
  assert.match(TRUMP_NOT_ELECTORS, /אינו מספר האלקטורים/);
});

test("Israel elections: read from the owner bundle as an interpretation, not as the topic's parent", () => {
  const note = israelElectionsNote(ELECTIONS_ISRAEL_21_26_BUNDLE);
  assert.equal(note.lane, "interpretation");
  assert.match(note.text, /1,237/);
  assert.equal(israelElectionsNote({ evidence: { interpretation: [{ id: "historical-1237-bennett", statement: "x", accessTier: "private" }] } }), null);
});

test("unified contract: one source keeps all its occurrences; no finding or tree edge is invented", () => {
  const item = (mediaId, ordering) => ({ mediaId, label: "t", imageUrl: "https://x/y.jpg", sourceIdentity: { ref: "storage-object:https://x/y.jpg" },
    occurrences: [{ mediaId, legacyPlacement: { wpGalleryId: 29, ordering } }, { mediaId: `${mediaId}-b`, legacyPlacement: { wpGalleryId: 57, ordering: 3 } }] });
  const projection = buildGateProjection({ sourceItems: [item("m1", 47)] });
  assert.equal(projection.sources.length, 1);
  assert.equal(projection.occurrences.length, 2);
  assert.equal(projection.findings.length, 0);
  assert.equal(projection.treeRelations.length, 0);
  assert.equal(projection.metrics.corpusSources, 1, "occurrences never inflate the source count");
});

test("isolation: gate files import no reader of their own and make no writes; CSS is scoped to .rv", () => {
  const files = ["src/lib/research/revelation1237Gate2029.js", "src/components/research/Revelation1237Gate2029.jsx"];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /supabase|\.from\(["']|\.rpc\(|\bfetch\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/i, file);
    assert.doesNotMatch(text, /(from|import)\s*\(?\s*["'][^"']*(SystemFrame|App2029|beit|legacy)/i, file);
  }
  const css = readFileSync(new URL("../src/components/research/revelation1237Gate2029.css", import.meta.url), "utf8");
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").split("{").slice(0, -1).map((c) => c.split("}").pop().trim()).filter((x) => x && !x.startsWith("@") && !/^(from|to|\d+%)/.test(x));
  for (const selector of selectors) for (const part of selector.replace(/\([^)]*\)/g, "()").split(",")) assert.match(part.trim(), /\.rv|^:root\[data-theme-preset/, `unscoped selector: ${part}`);
});

test("hero keeps accessible structure: heading under the shell h1, spoken numeral, no raster dependency", () => {
  const jsx = readFileSync(new URL("../src/components/research/Revelation1237Gate2029.jsx", import.meta.url), "utf8");
  assert.equal((jsx.match(/<h1[ >]/g) || []).length, 0, "the 2029 shell already owns the page h1");
  assert.match(jsx, /<h2 className="rv-h">/);
  assert.match(jsx, /aria-label="אלף מאתיים שלושים ושבע"/);
  assert.match(jsx, /className="rv-sky" aria-hidden="true"/);
  const css = readFileSync(new URL("../src/components/research/revelation1237Gate2029.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /url\((?!#)/, "no external image is bundled; --rv-hero-image is a slot");
  assert.match(css, /prefers-reduced-motion: reduce/);
});
