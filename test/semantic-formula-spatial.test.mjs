import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import { bindPathsToStructure, deriveConvergencePaths, evaluateConvergencePaths, icosahedronStructureSpec, structureSpecFor } from "../src/lib/spatialRenderModel.js";
import { createOperationRegistry } from "../src/lib/research/numericArithmeticOperations.js";
import { FORMULA_STATUS, analyzeFormulaText } from "../src/lib/research/numericOperationTree.js";
import { buildLabRows, buildRevealSteps } from "../src/lib/spatial/labRows.js";
import { pathAriaLabel, pathEquationText, pathOperandsText, pathTagText, razielSemanticFocus, semanticSummary } from "../src/lib/spatial/pathSemantics.js";
import { buildRazielPathFocus, razielSampleQuestions } from "../src/lib/spatial/spatialLabRaziel.js";
import { createRazielRequestContextSnapshot } from "../src/lib/research/razielSessionRequest2029.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const model = (slug) => SPATIAL_MODELS.find((m) => m.slug === slug);
const derive = (m, extra = {}) => deriveConvergencePaths({ value: m.value, operations: m.spatial.operations, gematria: m.gematria, quantities: m.spatial.structuralProperties, assignments: m.spatial.assignments, ...extra });
const traceFor = (texts, state = "ready") => Object.fromEntries(texts.map((t) => [t, { state, trace: { witness: t } }]));
const verified = () => true;
const evaluateAll = (m, extra) => { const paths = derive(m, extra); return evaluateConvergencePaths(paths, traceFor(paths.flatMap((p) => p.expressions || [])), verified, extra?.registry ? { registry: extra.registry } : {}); };

test("1 · operations are not research entities: no path term, row, scene part or scene node is an operator", () => {
  for (const m of SPATIAL_MODELS) for (const p of derive(m)) {
    assert.equal(p.terms.some((t) => t.role === "operator"), false, `${m.slug}: an operator is never a term`);
    assert.equal(typeof p.operatorSymbol, "string"); assert.equal(typeof p.operationKey, "string");
  }
  const rows = buildLabRows({ paths: derive(model("raza-deshabbat-910")), spec: null, locators: [], statusLabels: {} });
  assert.equal(rows.length, 2, "910 has two derivations — the sign is a property of each, not a third row");
  for (const f of ["../src/components/gematria2029/StructureScene3D2029.jsx", "../src/components/gematria2029/IcosaScene3D2029.jsx", "../src/components/gematria2029/ConvergenceScene3D2029.jsx"]) {
    const code = read(f).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.doesNotMatch(code, /numericArithmeticOperations|NUMERIC_OPERATION_REGISTRY|role:\s*"operator"/, `${f} draws no operator`);
  }
  assert.doesNotMatch(read("../src/lib/spatial/semanticSceneCompiler.js"), /kind:\s*"operator"/);
});

test("2 · addition, subtraction, multi-factor multiplication and parentheses are understood by the models' own paths (structured and legacy text)", () => {
  const sum = evaluateAll(model("raza-deshabbat-910"));
  assert.deepEqual(sum.paths.map((p) => [p.operationKey, p.status, p.steps[0].inputs, p.steps[0].result]), [["add", "verified", [208, 702], 910], ["multiply", "verified", [70, 13], 910]]);
  assert.equal(sum.verifiedCount, 2);
  const cube = evaluateAll(model("hashgacha-pratit-1020")).paths[0];
  assert.equal(cube.status, "verified"); assert.deepEqual(cube.steps, [{ operationKey: "multiply", symbol: "×", inputs: [6, 10, 17], result: 1020 }]);
  assert.deepEqual(cube.terms.map((t) => [t.role, t.text]), [["geometry", "6"], ["quantity", "10"], ["expression", "טוב"]]);
  const legacy = deriveConvergencePaths({ value: 170, operations: [{ operationKey: "multiply", expression: "(6 + 4) × 17", result: 170 }, { operationKey: "subtract", expression: "100 − 31", result: 69 }, { operationKey: "multiply", expression: "  סוד  ×  אחד ", result: 910 }],
    gematria: [["סוד", 70], ["אחד", 13]], quantities: [] });
  assert.deepEqual(legacy.map((p) => [p.formulaStatus, p.operationKey, p.operatorSymbol]), [["supported", "multiply", "×"], ["supported", "subtract", "−"], ["supported", "multiply", "×"]]);
  assert.equal(legacy[2].phrase, "סוד", "a legacy text path still gets its expression");
});

test("3 · gematria values come from the canonical engine only: declared values never verify, an unconfirmed expression leaves the path unverified", () => {
  const m = model("raza-deshabbat-910"), paths = derive(m);
  const none = evaluateConvergencePaths(paths, {}, verified); assert.deepEqual(none.paths.map((p) => p.status), ["pending", "pending"]);
  const failed = evaluateConvergencePaths(paths, { רזא: { state: "ready", trace: {} }, שבת: { state: "ready", trace: {} }, סוד: { state: "error" }, אחד: { state: "ready", trace: {} } }, verified);
  assert.deepEqual(failed.paths.map((p) => p.status), ["verified", "unavailable"], "each path is judged by ITS expressions");
  const refuted = evaluateConvergencePaths(paths, traceFor(["רזא", "שבת", "סוד", "אחד"]), (trace, { expression }) => expression !== "שבת");
  assert.deepEqual(refuted.paths.map((p) => p.status), ["unavailable", "verified"]);
  for (const f of ["../src/lib/research/numericOperationTree.js", "../src/lib/spatial/pathSemantics.js", "../src/lib/spatial/labRows.js"]) assert.doesNotMatch(read(f), /gematria_method_trace|fetchGematriaMethodTraceRaw|\.rpc\(/, `${f} never calls the engine`);
});

test("4 · every geometric or source quantity keeps its origin (and a missing origin is stated, not invented)", () => {
  for (const m of SPATIAL_MODELS) for (const p of derive(m)) for (const t of p.terms.filter((x) => x.role === "geometry" || x.role === "quantity")) assert.ok(t.origin && t.origin.length > 0, `${m.slug} ${p.id}: quantity ${t.text} has an origin`);
  const ico = derive(model("keter-esrimon-620"))[0];
  assert.deepEqual(ico.terms.map((t) => [t.role, t.text, t.origin ?? null]), [["geometry", "20", "icosahedron geometry"], ["expression", "אל", null]]);
  const cube = derive(model("hashgacha-pratit-1020"))[0];
  assert.equal(cube.terms[1].origin, "מקור המודל (assignment)", "the repetitions per face are a source assignment, not geometry");
  const noOrigin = deriveConvergencePaths({ value: 620, operations: [{ operationKey: "multiply", inputs: [{ ref: "quantity:faces" }, { ref: "expression:אל" }], result: 620 }], gematria: [["אל", 31]], quantities: [{ key: "faces", value: 20 }] })[0];
  assert.equal(semanticSummary(noOrigin).parts.find((p) => p.role === "quantity").origin, "לא צוין מקור");
});

test("5 · an unsupported formula is shown as unsupported — never verified, never counted, never a failed check", () => {
  const paths = deriveConvergencePaths({ value: 60, operations: [{ operationKey: "multiply", expression: "6 פאות × 10 «טוב» = 60", result: 60 }, { operationKey: "divide", expression: "620 ÷ 7", result: 60 }, { operationKey: "multiply", expression: "(6+4) × 17 = 170 = 170", result: 60 }],
    gematria: [["טוב", 17]], quantities: [] });
  assert.deepEqual(paths.slice(0, 2).map((p) => [p.formulaStatus, p.unsupportedCode]), [["unsupported", "implicit_operation"], ["unsupported", "non_integer_division"]]);
  const ev = evaluateConvergencePaths(paths, {}, verified);
  assert.deepEqual(ev.paths.slice(0, 2).map((p) => p.status), ["unsupported", "unsupported"]); assert.equal(ev.verifiedCount, 0);
  assert.notEqual(ev.paths[0].status, "inconsistent");
  const rows = buildLabRows({ paths: ev.paths, spec: null, locators: [], statusLabels: {} });
  assert.equal(rows[0].counted, false); assert.equal(rows[0].summary.supported, false);
  assert.match(semanticSummary(ev.paths[0]).reason, /אין פעולה בין הרכיבים/);
  assert.match(razielSemanticFocus(ev.paths[0]).primary, /^נוסחה שאינה נתמכת — לא אומתה/);
  assert.match(read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx"), /unsupported: "הנוסחה אינה נתמכת — מוצגת בלי אימות"/);
  const wrong = deriveConvergencePaths({ value: 620, operations: [{ operationKey: "multiply", inputs: [{ ref: "quantity:faces" }, { ref: "expression:אל" }], result: 621 }], gematria: [["אל", 31]], quantities: [{ key: "faces", value: 20, provenance: "g" }] });
  assert.equal(evaluateConvergencePaths(wrong, traceFor(["אל"]), verified).paths[0].status, "inconsistent", "an EVALUATED mismatch is inconsistent");
});

test("6 · missing information never becomes geometry: an unsupported or unresolved path binds to no part", () => {
  const spec = structureSpecFor({ shapeIdentity: "icosahedron", structuralProperties: [{ key: "faces", value: 20, provenance: "icosahedron geometry" }], gematria: [["אל", 31]], cubeFaceWord: "אל" });
  const bad = deriveConvergencePaths({ value: 620, operations: [{ operationKey: "multiply", expression: "20 פאות × 31", result: 620 }], gematria: [["אל", 31]], quantities: [{ key: "faces", value: 20, provenance: "icosahedron geometry" }] });
  assert.deepEqual(bindPathsToStructure(evaluateConvergencePaths(bad, {}, verified).paths, spec).map((p) => [p.part, p.geometric]), [["relation", false]]);
  assert.equal(icosahedronStructureSpec({ shapeIdentity: "icosahedron", structuralProperties: [{ key: "faces", value: 20 }], gematria: [], faceWord: "אל" }), null, "no declared word value → no solid");
  const unresolved = deriveConvergencePaths({ value: 620, operations: [{ operationKey: "multiply", inputs: [{ ref: "quantity:nope" }, { ref: "expression:אל" }], result: 620 }], gematria: [["אל", 31]], quantities: [] })[0];
  assert.deepEqual([unresolved.formulaStatus, unresolved.unsupportedCode], ["unsupported", "unresolved_input"]);
});

test("7 · a change in the shared representation is reflected by every consumer (rows, tags, aria, Raziel, shelf) — and no consumer hand-writes a sign", () => {
  const custom = createOperationRegistry({ multiply: { symbol: "∙", spoken: "פעמים" } });
  const m = model("keter-esrimon-620"), paths = evaluateAll(m, { registry: custom }).paths, [p] = paths;
  assert.equal(p.operatorSymbol, "∙");
  assert.equal(pathEquationText(p, { numeric: true, registry: custom }), "31 ∙ 20 = 620");
  assert.equal(pathTagText(p, custom), "∙ 20"); assert.equal(pathOperandsText(p, { numeric: true, registry: custom }), "31 ∙ 20");
  assert.match(pathAriaLabel(p, "אומת", custom), /אל 31, פעמים 20, שווה 620/);
  assert.equal(buildLabRows({ paths, spec: null, locators: [], statusLabels: {} })[0].tag, "∙ 20");
  assert.match(razielSemanticFocus(p, { registry: custom }).primary, /אל \(31, מנוע\) ∙ 20 \(גיאומטריה\) = 620/);
  const projection = buildZviSpatialWorldProjection().cards;
  assert.deepEqual(projection.find((c) => c.slug === "raza-deshabbat-910").operationsView.map((o) => o.text), ["רזא (208) + שבת (702) = 910", "סוד (70) × אחד (13) = 910"]);
  // no consumer draws a sign itself: the symbol always comes from the registry through pathSemantics / tokens
  for (const f of ["../src/components/gematria2029/SpatialConvergenceStage2029.jsx", "../src/components/gematria2029/SpatialLabDirections2029.jsx", "../src/components/gematria2029/ConvergenceScene3D2029.jsx", "../src/components/gematria2029/StructureScene3D2029.jsx", "../src/components/gematria2029/IcosaScene3D2029.jsx", "../src/components/gematria2029/SpatialLabPanel2029.jsx", "../src/lib/spatial/spatialLabRaziel.js", "../src/lib/spatial/labRows.js"]) {
    const code = read(f).split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("{/*")).join("\n");
    assert.doesNotMatch(code, /[×÷−]/, `${f} must not hard-code an operator sign`);
    assert.doesNotMatch(code, /[`"'][^`"']*\d?\}?\s=\s\$\{[^`]*[`"']|\$\{[^}]*\}\s=\s\$\{path\.result\}|\}\s=\s\{(?:focus|path|row)\./, `${f} must not hard-code the equality sign of a formula`);
  }
});

test("8 · the 3060 and 620 models are not broken: same equations, same bindings, same verified count", () => {
  const a = evaluateAll(model("yesharim-cube-3060"));
  assert.deepEqual(a.paths.map((p) => pathEquationText(p, { numeric: true })), ["510 × 6 = 3060", "612 × 5 = 3060", "17 × 180 = 3060", "765 × 4 = 3060", "1020 × 3 = 3060"]);
  assert.deepEqual(a.paths.map((p) => p.status), ["verified", "verified", "verified", "no_phrase", "verified"]); assert.equal(a.verifiedCount, 4, "765 stays unverified (law §14.6)");
  assert.deepEqual(a.paths.map((p) => [p.phrase, p.operand, p.quantity, p.quantityKey]), [["ישר", 510, 6, "cube_faces"], ["ברית", 612, 5, "pentagon_outer_parts"], ["טוב", 17, 180, "inner_good_units"], [null, 765, 4, "inner_triangles"], ["השגחה פרטית", 1020, 3, "patriarch_count"]]);
  const b = evaluateAll(model("keter-esrimon-620")); assert.equal(pathEquationText(b.paths[0], { numeric: true }), "31 × 20 = 620"); assert.equal(pathTagText(b.paths[0]), "× 20"); assert.equal(b.verifiedCount, 1);
  assert.deepEqual(buildRevealSteps(buildLabRows({ paths: b.paths, spec: null, locators: [], statusLabels: {} })[0]).map((s) => s.kind), ["text", "engine", "quantity", "operation", "result"]);
});

test("9 · Hebrew expressions, operation signs, spaces and punctuation in the models' own formula lines (structure[]): supported lines are consistent, prose is NOT passed off as a formula", () => {
  let supported = 0, unsupported = 0;
  for (const m of SPATIAL_MODELS) {
    const declared = Object.fromEntries(m.gematria.map(([t, v]) => [t, { value: v, state: "verified" }])); // the MODEL's own declared values (internal consistency, not engine truth)
    for (const line of m.structure) {
      const r = analyzeFormulaText(line, { expressionValues: declared });
      if (r.status === FORMULA_STATUS.UNSUPPORTED) { unsupported += 1; continue; }
      // a line is a formula we can state only when every expression in it is DECLARED by the model; an undeclared multi-word run ("על כל פאה «אל»") is a sentence, never verified
      if (r.status === FORMULA_STATUS.NO_PHRASE) { const undeclared = r.evaluation.sides.flatMap((s) => s.leaves).filter((l) => l.role === "expression" && l.state === "missing"); assert.ok(undeclared.length > 0, `${m.slug}: "${line}" lacks a declared expression`); unsupported += 1; continue; }
      supported += 1; assert.equal(r.status, FORMULA_STATUS.VERIFIED, `${m.slug}: "${line}" must be consistent with the model's declared values`);
    }
  }
  assert.ok(supported >= 10 && unsupported >= 5, `a real corpus mixes formulas and prose (${supported} formulas / ${unsupported} prose)`);
  assert.equal(analyzeFormulaText("6 פאות × 10 «טוב» = 60").status, FORMULA_STATUS.UNSUPPORTED);
  assert.equal(analyzeFormulaText("SOURCE CLAIM: «מטעמים» מופיעה 6 פעמים").status, FORMULA_STATUS.UNSUPPORTED);
  assert.equal(analyzeFormulaText("רזא (208) + שבת (702) = 910", { expressionValues: { רזא: { value: 208, state: "verified" }, שבת: { value: 702, state: "verified" } } }).status, FORMULA_STATUS.VERIFIED);
});

test("Raziel: the semantic structure travels in the EXISTING bounded fields (roles + origins), survives the real normalizer, and the questions name the sign and the sources", () => {
  const card = buildZviSpatialWorldProjection().cards.find((c) => c.slug === "keter-esrimon-620");
  const [path] = evaluateAll(model("keter-esrimon-620")).paths;
  const focus = buildRazielPathFocus({ card, path: { ...path, part: "solid" }, partInfo: { label: "עשרימון", note: null }, statusLabel: null });
  assert.deepEqual(Object.keys(focus).sort(), ["numberCoreFocus", "readingFocus"]);
  const snap = createRazielRequestContextSnapshot({ lens: "research", subject: { type: "zvi_card", id: card.slug, label: card.title } }, { numberFocus: focus.numberCoreFocus, readingFocus: focus.readingFocus });
  assert.equal(snap.focus.reading.primary, "כפל: אל (31, מנוע) × 20 (גיאומטריה) = 620");
  assert.match(snap.focus.reading.label, /^עשרימון · כפל · מנוע: אל=31 · 20 גיאומטריה: icosahedron geometry$/);
  assert.equal(snap.focus.number.expression, "אל"); assert.equal(snap.focus.number.method, "רגיל"); assert.equal(snap.focus.number.result, 31);
  assert.ok(snap.focus.reading.primary.length <= 160 && snap.focus.reading.label.length <= 120);
  assert.deepEqual(razielSampleQuestions(path, 620).slice(0, 4), ["למה יש כאן סימן כפל?", "מה המקור של המספר 20?", "איזה ערכים מחושבים בגימטריה ואילו מגיעים מהגיאומטריה?", "איך מגיעים ל־620?"]);
  const add = evaluateAll(model("raza-deshabbat-910")).paths;
  assert.equal(razielSampleQuestions(add[0], 910, { pathsCount: 2 })[0], "למה יש כאן סימן חיבור?");
  assert.ok(razielSampleQuestions(add[0], 910, { pathsCount: 2 }).includes("מה ההבדל בין שני מסלולים?"));
  assert.equal(razielSemanticFocus(add[0]).primary, "חיבור: רזא (208, מנוע) + שבת (702, מנוע) = 910");
});
