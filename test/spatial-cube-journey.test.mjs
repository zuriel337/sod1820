import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { bindPathsToStructure, deriveConvergencePaths, evaluateConvergencePaths, structureSpecFor } from "../src/lib/spatialRenderModel.js";
import { CUBE_JOURNEY_DOORS, SEFER_YETZIRAH_POINTERS, bookReaderAvailable, bookReaderHref, buildCubeDoorways, cubeJourneyHref, cubeReturnTarget, directionLabel, journeyVerification, readCubeJourney } from "../src/lib/spatial/cubeJourney.js";
import { buildExactReturnPatch, normalizeResearchContext } from "../src/lib/research/researchContext.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const structuresFile = JSON.parse(read("../public/book-data/sefer-yetzirah.structures.json"));
const projection = buildZviSpatialWorldProjection();
const cardOf = (slug) => projection.cards.find((c) => c.slug === slug);
const c1020 = cardOf("hashgacha-pratit-1020");
const evaluatedPath = (card, verified = true) => {
  const spec = structureSpecFor({ shapeIdentity: card.structure.shapeIdentity, regions: card.structure.regions, structuralProperties: card.quantities, gematria: card.gematria,
    cubeFaceWord: card.structure.cubeFaceWord, assignments: card.assignments, cubeLayout: card.cubeLayout });
  const derived = deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities, assignments: card.assignments });
  const word = card.structure.cubeFaceWord;
  const evaluated = evaluateConvergencePaths(derived, verified ? { [word]: { state: "ready", trace: {} } } : {}, () => verified).paths;
  return bindPathsToStructure(evaluated, spec)[0];
};
const structure = (id) => structuresFile.structures.find((s) => s.id === id);

test("the Sefer Yetzirah pointers are the source-bound structures' own: identity, structure ids, component ids, PDF pages, source refs, direction labels", () => {
  const P = SEFER_YETZIRAH_POINTERS;
  assert.equal(P.identity, structuresFile.source_identity);
  for (const [key, entry] of [["sealsSynoptic", P.sealsSynoptic], ["sealsGra", P.sealsGra]]) {
    const s = structure(entry.structureId); assert.ok(s, `${key}: structure exists`);
    assert.deepEqual(s.sources.map((x) => [x.pdf_page, x.source_ref]), [[entry.page, entry.sourceRef]], `${key}: page and source_ref are the structure's own`);
    assert.equal(s.components.length, 6);
    assert.deepEqual(s.components.map((c) => c.stable_id.split(":component:")[1]), P.directions.map((d) => d.key), `${key}: the six directions in the source's order`);
    assert.deepEqual(s.components.map((c) => c.label_he), P.directions.map((d) => d.label), `${key}: labels are the structure's`);
    for (const c of s.components) assert.deepEqual([c.source.pdf_page, c.source.source_ref], [entry.page, entry.sourceRef]);
  }
  const depths = structure(P.depths.structureId);
  assert.deepEqual(depths.sources.map((x) => [x.pdf_page, x.source_ref]), [[53, P.depths.sourceRef]]);
  for (const key of [P.depths.good, P.depths.evil]) assert.ok(depths.components.some((c) => c.stable_id === `${P.depths.structureId}:component:${key}` && c.source.pdf_page === 53), `ten-depths component ${key}`);
  assert.equal(depths.components.find((c) => c.id === "good").label_he, "עומק טוב"); assert.equal(depths.components.find((c) => c.id === "evil").label_he, "עומק רע");
  assert.equal(P.sealsSynoptic.page, 73); assert.equal(P.sealsGra.page, 175);
  assert.equal(directionLabel("east"), "מזרח"); assert.equal(directionLabel("nope"), null);
});

test("the exploration state lives in the URL: closed-set values only, meaningful only inside, other parameters and the hash kept", () => {
  assert.deepEqual(readCubeJourney(""), { inside: false, face: null, door: null, dir: null });
  assert.deepEqual(readCubeJourney("?cube=in&face=3&door=seals&dir=east"), { inside: true, face: 3, door: "seals", dir: "east" });
  assert.deepEqual(readCubeJourney("?face=3&door=seals&dir=east"), { inside: false, face: null, door: null, dir: null }, "a face/door/direction outside the cube means nothing");
  assert.deepEqual(readCubeJourney("?cube=in&face=6&door=__proto__&dir=constructor"), { inside: true, face: null, door: null, dir: null }, "unknown values are dropped");
  assert.deepEqual(readCubeJourney("?cube=in&face=-1"), { inside: true, face: null, door: null, dir: null });
  const location = { pathname: "/world", search: "?view=explore&kind=spatial&lab=discovery", hash: "#spatial-hashgacha-pratit-1020" };
  const into = cubeJourneyHref(location, { inside: true, face: 2, door: "depths", dir: null });
  assert.equal(into, "/world?view=explore&kind=spatial&lab=discovery&cube=in&face=2&door=depths#spatial-hashgacha-pratit-1020");
  assert.deepEqual(readCubeJourney(new URL(into, "https://x.test").search), { inside: true, face: 2, door: "depths", dir: null }, "round trip");
  assert.equal(cubeJourneyHref({ ...location, search: new URL(into, "https://x.test").search }, { inside: false }), "/world?view=explore&kind=spatial&lab=discovery#spatial-hashgacha-pratit-1020", "leaving removes the state, keeps the rest");
  assert.equal(cubeJourneyHref(location, { inside: true, face: 9, door: "nope", dir: "nope" }), "/world?view=explore&kind=spatial&lab=discovery&cube=in#spatial-hashgacha-pratit-1020", "invalid values are never written");
  assert.deepEqual([...CUBE_JOURNEY_DOORS], ["verify", "number", "zvi", "seals", "gra", "depths", "next"]);
});

test("1020's doorways when the book reader is NOT in this build (the public-reading / protected Preview artifact): book doorways are link-only with an honest reason", () => {
  const doors = buildCubeDoorways({ card: c1020, path: evaluatedPath(c1020), readerAvailable: false });
  assert.deepEqual(doors.map((d) => d.id), ["verify", "number", "zvi", "seals", "gra", "depths", "next"]);
  for (const id of ["seals", "gra", "depths"]) {
    const d = doors.find((x) => x.id === id);
    assert.equal(d.state, "locked"); assert.equal(d.href, null, `${id}: no link to a reader that is not there`);
    assert.match(d.lockedReason, /בבדיקת פרסום/); assert.match(d.lockedReason, /אינו נפתח/);
    assert.equal(d.source.identity, "book:sefer-yetzirah-9perushim", `${id}: the source stays named`);
  }
  assert.equal(doors.find((x) => x.id === "seals").source.page, 73); assert.equal(doors.find((x) => x.id === "gra").source.page, 175); assert.equal(doors.find((x) => x.id === "depths").source.page, 53);
  assert.equal(bookReaderAvailable({}), false); assert.equal(bookReaderAvailable({ VITE_BOOK_PUBLICATION_REVIEW_PREVIEW: "false" }), false); assert.equal(bookReaderAvailable({ VITE_BOOK_PUBLICATION_REVIEW_PREVIEW: "true" }), true);
});

test("with the reader available: the direction is chosen AFTER entry (never auto-assigned to a face), then the exact structure/component/page opens", () => {
  const path = evaluatedPath(c1020);
  const before = buildCubeDoorways({ card: c1020, path, readerAvailable: true });
  assert.equal(before.find((d) => d.id === "seals").state, "choose"); assert.equal(before.find((d) => d.id === "seals").href, null); assert.equal(before.find((d) => d.id === "seals").source.componentId, null);
  assert.equal(before.find((d) => d.id === "depths").state, "ready");
  assert.equal(before.find((d) => d.id === "depths").href, "/2029/control?surface=sefer-yetzirah-world&experience=depths&page=53&structure=sy-structure%3Aten-depths&component=sy-structure%3Aten-depths%3Acomponent%3Agood");
  const after = buildCubeDoorways({ card: c1020, path, readerAvailable: true, dir: "east" });
  assert.equal(after.find((d) => d.id === "seals").href, "/2029/control?surface=sefer-yetzirah-world&page=73&structure=sy-structure%3Asix-seals-synoptic&component=sy-structure%3Asix-seals-synoptic%3Acomponent%3Aeast");
  assert.equal(after.find((d) => d.id === "gra").href, "/2029/control?surface=sefer-yetzirah-world&page=175&structure=sy-structure%3Asix-seals-gra-edition&component=sy-structure%3Asix-seals-gra-edition%3Acomponent%3Aeast");
  assert.equal(after.find((d) => d.id === "seals").source.ref, SEFER_YETZIRAH_POINTERS.sealsSynoptic.sourceRef);
  // the doorway set does not depend on any face: a face is never an input
  assert.deepEqual(buildCubeDoorways({ card: c1020, path, readerAvailable: true, dir: "east", face: 0 }), buildCubeDoorways({ card: c1020, path, readerAvailable: true, dir: "east", face: 5 }), "no face→direction mapping exists");
  for (const id of ["seals", "gra", "depths"]) assert.match(after.find((d) => d.id === id).projectionNote, /הקרנה|מונח|שונות/);
  assert.match(after.find((d) => d.id === "seals").projectionNote, /אינה שש החותמות/); assert.match(after.find((d) => d.id === "seals").projectionNote, /אינו מוכיח את המודל/);
  assert.match(after.find((d) => d.id === "gra").projectionNote, /בירר \/ בחר/); assert.match(after.find((d) => d.id === "gra").projectionNote, /אינה מוכרעת/);
});

test("the cube's own doorways: verification from the engine-verified path, its Number page, its Zvi calculation, and the related model 3060 (which exists and carries 1020 × 3)", () => {
  const doors = buildCubeDoorways({ card: c1020, path: evaluatedPath(c1020), readerAvailable: false, lab: "lab" });
  const verify = doors.find((d) => d.id === "verify");
  assert.equal(verify.state, "ready"); assert.deepEqual([verify.verification.word, verify.verification.value, verify.verification.verified, verify.verification.method], ["טוב", 17, true, "רגיל"]);
  assert.match(verify.label, /טוב.*17/);
  assert.equal(doors.find((d) => d.id === "number").href, "/2029/number/17");
  const next = doors.find((d) => d.id === "next");
  assert.equal(next.href, "/world?view=explore&kind=spatial&lab=lab#spatial-yesharim-cube-3060"); assert.equal(next.label, "המשך ל־3060");
  const c3060 = cardOf("yesharim-cube-3060"); assert.ok(c3060, "the related model exists"); assert.ok(c3060.operations.some((o) => o.expression === "1020 × 3" && o.result === 3060), "and carries 1020 × 3");
  const unverified = buildCubeDoorways({ card: c1020, path: evaluatedPath(c1020, false), readerAvailable: false }).find((d) => d.id === "verify");
  assert.notEqual(unverified.state, "ready"); assert.equal(unverified.verification.verified, false, "an unverified path is never shown as verified");
  assert.equal(journeyVerification(null).verified, false);
  // 612 / 1254 have no registered book pointers: no invented doorway
  for (const slug of ["emunah-cube-612", "matamim-cube-1254"]) {
    const card = cardOf(slug), ids = buildCubeDoorways({ card, path: evaluatedPath(card), readerAvailable: true }).map((d) => d.id);
    assert.deepEqual(ids, ["verify", "number", "zvi"], `${slug} gets only its own doorways`);
  }
});

test("exact return: the Research Context's EXISTING returnTo carries the same page, face and door, and the existing normalizer/patch accept it", () => {
  const location = { pathname: "/world", search: "?view=explore&kind=spatial&lab=museum&cube=in&face=2", hash: "#spatial-hashgacha-pratit-1020" };
  const target = cubeReturnTarget({ location, card: c1020, state: { inside: true, face: 2, door: null, dir: "east" }, doorId: "seals" });
  assert.equal(target.href, "/world?view=explore&kind=spatial&lab=museum&cube=in&face=2&door=seals&dir=east#spatial-hashgacha-pratit-1020");
  assert.equal(target.label, "חזרה לקובייה 1020 · פאה 3");
  assert.deepEqual(readCubeJourney(new URL(target.href, "https://x.test").search), { inside: true, face: 2, door: "seals", dir: "east" });
  const context = normalizeResearchContext({ subject: { id: "number:17", type: "number", label: "17", href: "/2029/number/17" }, returnTo: target });
  assert.equal(context.returnTo.href, target.href); assert.equal(context.returnTo.selection.entityType, "spatial_face"); assert.equal(context.returnTo.selection.locator, "#cube-door-seals");
  assert.equal(context.returnTo.subject.id, "spatial:hashgacha-pratit-1020");
  const patch = buildExactReturnPatch(context); assert.equal(patch.returnTo, null); assert.equal(patch.subject.id, "spatial:hashgacha-pratit-1020"); assert.equal(patch.selection.locator, "#cube-door-seals");
  const noFace = cubeReturnTarget({ location, card: c1020, state: { inside: true, face: null } }); assert.equal(noFace.label, "חזרה לקובייה 1020");
});

test("no new store, contract or calculator: the journey module is pure, reads only existing owners, and the book reader is only linked", () => {
  const code = read("../src/lib/spatial/cubeJourney.js").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /from "(react|three|@react-three|@supabase)|fetch\(|supabase|localStorage|sessionStorage|Math\.(random|sqrt)/);
  assert.doesNotMatch(code, /\bparseInt\(|\beval\(|new Function/);
  const imports = [...code.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(imports, ["../research/numberPageAddress.js"], "the only dependency is the existing Number address owner");
  assert.ok(SPATIAL_MODELS.find((m) => m.slug === "hashgacha-pratit-1020"));
});
