import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NUMERIC_RELATION_OPERATION_CATALOG } from "../src/lib/research/numericRelationOperations.js";
import { NUMERIC_ARITHMETIC_OPERATION, NUMERIC_ARITHMETIC_OPERATION_CATALOG, NUMERIC_OPERATOR_GLYPHS, createOperationRegistry, listNumericOperations } from "../src/lib/research/numericArithmeticOperations.js";
import { FORMULA_STATUS, SEMANTIC_ROLE, analyzeFormulaText, analyzeOperationSpec, evaluateFormula, formulaTokens, parseFormulaText, resolveOperationInputs, tokenizeFormula, tokensToText } from "../src/lib/research/numericOperationTree.js";

const engine = (entries) => Object.fromEntries(Object.entries(entries).map(([text, value]) => [text, { value, state: "verified" }]));
const ctx = { expressionValues: engine({ אל: 31, רזא: 208, שבת: 702, סוד: 70, אחד: 13, טוב: 17, כתר: 620, "השגחה פרטית": 1020 }) };
const run = (text, c = ctx) => analyzeFormulaText(text, c);
const values = (r) => r.evaluation.sides.map((s) => s.value);

test("registry: operation_key is identity, the glyph is only display; same owner/shape as the existing relation catalog; gematria registry untouched", () => {
  const keys = NUMERIC_ARITHMETIC_OPERATION_CATALOG.map((r) => r.operation_key);
  assert.deepEqual(keys, ["add", "subtract", "multiply", "divide", "faces_sum", "regions_sum", "times_ten_sefirot"], "law v14 §14.3 keys + the four arithmetic operations");
  const relationShape = Object.keys(NUMERIC_RELATION_OPERATION_CATALOG[0]).sort();
  for (const row of NUMERIC_ARITHMETIC_OPERATION_CATALOG) {
    for (const k of relationShape) assert.ok(k in row, `${row.operation_key} carries the catalog field ${k}`);
    assert.equal(row.owner, NUMERIC_RELATION_OPERATION_CATALOG[0].owner); assert.equal(row.contract_owner, NUMERIC_RELATION_OPERATION_CATALOG[0].contract_owner);
    assert.equal(row.semantic_class, "derivation"); assert.equal(row.deterministic, true);
    assert.notEqual(row.operation_key, row.symbol, "a symbol is never an operation identity");
    assert.match(row.truth_boundary, /never a Gematria method/);
  }
  assert.equal(NUMERIC_RELATION_OPERATION_CATALOG.length, 6, "the existing catalog is unchanged");
  assert.equal(listNumericOperations().length, 13);
  assert.deepEqual([...new Set(listNumericOperations().map((r) => r.family))].sort(), ["arithmetic", "relation_discovery"]);
  for (const [glyph, key] of Object.entries(NUMERIC_OPERATOR_GLYPHS)) assert.ok(keys.includes(key), `${glyph} → registered ${key}`);
  assert.equal(NUMERIC_OPERATOR_GLYPHS["–"], undefined, "en dash is not an operator"); assert.equal(NUMERIC_OPERATOR_GLYPHS["־"], undefined, "maqaf is not an operator");
  assert.equal(createOperationRegistry().keyForGlyph("__proto__"), null);
});

test("the three example families: 620, 910, 1020 are understood with their roles", () => {
  const a = run("20 × 31 = 620"); assert.equal(a.status, FORMULA_STATUS.VERIFIED); assert.deepEqual(values(a), [620, 620]);
  assert.deepEqual(a.tokens.map((t) => [t.role, t.text]), [["value", "20"], ["operator", "×"], ["value", "31"], ["relation", "="], ["result", "620"]]);
  const b = run("208 + 702 = 910"); assert.equal(b.status, FORMULA_STATUS.VERIFIED); assert.deepEqual(b.evaluation.sides[0].steps, [{ operationKey: "add", symbol: "+", inputs: [208, 702], result: 910 }]);
  const c = run("6 × 10 × 17 = 1020"); assert.equal(c.status, FORMULA_STATUS.VERIFIED);
  assert.equal(c.formula.sides[0].operands.length, 3, "three factors are ONE multiplication, not a two-factor parse");
  assert.deepEqual(c.evaluation.sides[0].steps, [{ operationKey: "multiply", symbol: "×", inputs: [6, 10, 17], result: 1020 }]);
  const words = run("רזא (208) + שבת (702) = 910"); assert.equal(words.status, FORMULA_STATUS.VERIFIED);
  assert.deepEqual(words.evaluation.sides[0].leaves.map((l) => [l.role, l.text, l.value]), [["expression", "רזא", 208], ["expression", "שבת", 702]]);
});

test("subtraction, negative numbers, parentheses, precedence and exact division", () => {
  assert.deepEqual([run("100 − 31"), run("100 - 31"), run("100-31")].map((r) => values(r)[0]), [69, 69, 69]);
  assert.equal(values(run("-5 + 8"))[0], 3); assert.equal(values(run("3 × -2"))[0], -6); assert.equal(values(run("5 - -3"))[0], 8);
  assert.equal(values(run("(6+4) × 17"))[0], 170); assert.equal(values(run("2 + 3 × 4"))[0], 14); assert.equal(values(run("(2 + 3) × 4"))[0], 20);
  assert.equal(values(run("10 - 2 - 3"))[0], 5, "subtraction nests left to right"); assert.equal(values(run("8 ÷ 2 ÷ 2"))[0], 2);
  assert.equal(values(run("620 ÷ 20"))[0], 31); assert.equal(values(run("12 / 3"))[0], 4);
  assert.equal(tokensToText(run("(2+3) × 4").tokens), "(2 + 3) × 4");
  assert.equal(tokensToText(run("-5 + 8").tokens), "−5 + 8", "a negative number is a number with its own sign, shown with the minus sign");
});

test("an operator is never a number or an entity: the sign has a role and a key; '=' is a relation with a kind", () => {
  const r = run("20 × 31 = 620");
  const op = r.tokens.find((t) => t.role === SEMANTIC_ROLE.OPERATOR); assert.deepEqual([op.key, op.text, op.a11y], ["multiply", "×", "סימן כפל"]);
  assert.equal(r.tokens.filter((t) => t.role === SEMANTIC_ROLE.VALUE || t.role === SEMANTIC_ROLE.RESULT).every((t) => /^\d+$/.test(t.text)), true, "no operator glyph is ever a numeric token");
  assert.equal(run("20 × 31 = 620").tokens.find((t) => t.role === "relation").kind, "arithmetic_equality");
  assert.equal(run("כתר = 620").tokens.find((t) => t.role === "relation").kind, "value_equality", "an expression equal to a number is a different relation");
  assert.equal(run("אל = 31").evaluation.equalities[0].kind, "value_equality");
  assert.equal(run("208 + 702 = 910 = 910").evaluation.equalities.length, 2, "an equality chain is several relations");
});

test("unsupported is not inconsistent, and an unsupported formula is never shown as verified", () => {
  for (const [text, code] of [["620 ÷ 7", "non_integer_division"], ["5 ÷ 0", "division_by_zero"], ["6 פאות × 10 «טוב» = 60", "implicit_operation"], ["רזא-שבת", "ambiguous_dash"], ["20 – 31", "ambiguous_dash"], ["20 ־ 31", "ambiguous_dash"],
    ["(6+4)17", "unexpected_token"], ["20 × 31.5", "non_integer"], ["1,020 × 2", "thousands_separator"], ["20 × (31", "unbalanced_parentheses"], ["20 ×", "incomplete"], ["", "empty"], ["20 + abc", "unknown_character"], ["99999999999999 × 99999999999999", "too_large"]]) {
    const r = run(text); assert.equal(r.status, FORMULA_STATUS.UNSUPPORTED, text); assert.equal(r.code, code, text); assert.deepEqual(r.tokens, [], "no tokens are projected for an unsupported formula");
  }
  const wrong = run("20 × 31 = 621"); assert.equal(wrong.status, FORMULA_STATUS.INCONSISTENT, "an evaluated mismatch IS inconsistent");
  assert.notEqual(FORMULA_STATUS.UNSUPPORTED, FORMULA_STATUS.INCONSISTENT);
});

test("gematria values come only from the engine map; text is a claim; missing/pending/unavailable never verify", () => {
  assert.equal(run("רזא + שבת = 910").status, FORMULA_STATUS.VERIFIED);
  assert.equal(run("רזא + שבת = 910", { expressionValues: {} }).status, FORMULA_STATUS.NO_PHRASE, "no engine value → the text value is not trusted");
  assert.equal(run("רזא + שבת = 910", { expressionValues: { רזא: { value: 208, state: "pending" }, שבת: { value: 702, state: "verified" } } }).status, FORMULA_STATUS.PENDING);
  assert.equal(run("רזא + שבת = 910", { expressionValues: { רזא: { value: 208, state: "unavailable" }, שבת: { value: 702, state: "verified" } } }).status, FORMULA_STATUS.UNAVAILABLE);
  const lying = run("רזא (209) + שבת (702) = 911"); assert.equal(lying.status, FORMULA_STATUS.INCONSISTENT); assert.equal(lying.evaluation.findings[0].code, "annotation_mismatch");
  assert.equal(run("רזא + שבת = 911").status, FORMULA_STATUS.INCONSISTENT, "the engine decides, the declared result is checked");
});

test("ambiguity rules: '(' after an expression is a value annotation, at an operand start it groups; dashes inside text are never operators", () => {
  const annotated = parseFormulaText("שבת (702) + רזא (208)"); assert.equal(annotated.ok, true); assert.equal(annotated.formula.sides[0].operands[0].declaredValue, 702);
  assert.equal(parseFormulaText("שבת (702 + 1)").ok, false, "grouping after an expression is not accepted");
  assert.equal(parseFormulaText("(6+4) × 17").formula.sides[0].operands[0].kind, "group");
  assert.equal(tokenizeFormula("בראשית א׳־ד׳").ok, false);
  assert.equal(tokenizeFormula("100 − 31").tokens[1].key, "subtract");
});

test("Hebrew, spaces and punctuation: spacing, trailing punctuation, bidi marks, niqqud, guillemets, Latin x", () => {
  for (const text of ["20×31=620", "  20  ×  31  =  620  ", "20 × 31 = 620.", "20 x 31 = 620", "20 X 31 = 620", "20 * 31 = 620", "20 · 31 = 620", "‏20 × 31 = 620‎", "אֵל = 31", "«אל» = 31", "«אל» × 20 = 620"]) {
    const r = run(text); assert.equal(r.status, FORMULA_STATUS.VERIFIED, text);
  }
  assert.equal(run("השגחה פרטית = 1020").status, FORMULA_STATUS.VERIFIED, "a multi-word expression is one expression");
  assert.equal(run("השגחה פרטית × 3").evaluation.sides[0].value, 3060);
});

test("structured inputs: the model's own references become the same tree (620, 1020, literal without expression)", () => {
  const model = { gematria: [["אל", 31], ["טוב", 17]], structuralProperties: [{ key: "faces", value: 20, provenance: "icosahedron geometry" }, { key: "cube_faces", value: 6, provenance: "cube geometry" }, { key: "units", value: 4, provenance: "source diagram" }],
    assignments: [{ target: "each_face", expression: "טוב", repetitionsPerPart: 10, value: 17 }] };
  const ico = analyzeOperationSpec({ operationKey: "multiply", inputs: [{ ref: "quantity:faces" }, { ref: "expression:אל" }], result: 620 }, model, ctx);
  assert.equal(ico.status, FORMULA_STATUS.VERIFIED);
  assert.deepEqual(ico.tokens.map((t) => [t.role, t.text]), [["geometry", "20"], ["operator", "×"], ["expression", "אל"], ["relation", "="], ["result", "620"]]);
  assert.equal(ico.tokens[0].origin, "icosahedron geometry");
  const cube = analyzeOperationSpec({ operationKey: "multiply", inputs: [{ ref: "quantity:cube_faces" }, { ref: "assignment:each_face.repetitionsPerPart" }, { ref: "expression:טוב" }], result: 1020 }, model, ctx);
  assert.equal(cube.status, FORMULA_STATUS.VERIFIED); assert.deepEqual(cube.tokens.filter((t) => t.role !== "operator").map((t) => t.role), ["geometry", "quantity", "expression", "relation", "result"]);
  const bare = analyzeOperationSpec({ operationKey: "multiply", inputs: [{ ref: "literal:765" }, { ref: "quantity:units" }], result: 3060 }, model, ctx);
  assert.equal(bare.status, FORMULA_STATUS.NO_PHRASE, "a value with no expression is never verified (765 × 4)");
  assert.equal(analyzeOperationSpec({ operationKey: "multiply", inputs: [{ ref: "quantity:faces" }, { ref: "expression:אל" }], result: 619 }, model, ctx).status, FORMULA_STATUS.INCONSISTENT);
  assert.equal(analyzeOperationSpec({ operationKey: "convergence", inputs: [{ ref: "expression:אל" }], result: 31 }, model, ctx).code, "unknown_operation", "'convergence' is a relation between operations, not an operation");
  assert.equal(resolveOperationInputs({ operationKey: "multiply", inputs: [{ ref: "quantity:missing" }, { ref: "expression:אל" }] }, model).code, "unresolved_input");
  assert.equal(resolveOperationInputs({ operationKey: "multiply", inputs: [{ ref: "weird:1" }, { ref: "expression:אל" }] }, model).code, "unknown_input_ref");
  assert.equal(analyzeOperationSpec({ operationKey: "times_ten_sefirot", inputs: [{ ref: "expression:אל" }], result: 310 }, model, ctx).status, FORMULA_STATUS.VERIFIED, "times_ten_sefirot = ×10 with the law's fixed operand");
  assert.equal(analyzeOperationSpec({ operationKey: "faces_sum", inputs: [{ ref: "expression:אל" }, { ref: "expression:טוב" }], result: 48 }, model, ctx).status, FORMULA_STATUS.VERIFIED);
});

test("a change in the shared registry is a change in every rendering (symbols come from the registry, not from callers)", () => {
  const custom = createOperationRegistry({ [NUMERIC_ARITHMETIC_OPERATION.MULTIPLY]: { symbol: "∙" } });
  const parsed = parseFormulaText("20 × 31 = 620", custom).formula;
  assert.equal(tokensToText(formulaTokens(parsed, null, { registry: custom })), "20 ∙ 31 = 620");
  assert.equal(tokensToText(formulaTokens(parsed, null)), "20 × 31 = 620");
});

test("deterministic and closed: no eval, no Function, no AI, no network, no engine call in the parser/evaluator", () => {
  for (const f of ["../src/lib/research/numericOperationTree.js", "../src/lib/research/numericArithmeticOperations.js"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.doesNotMatch(src, /\beval\s*\(|new Function|fetch\(|rpc\(|supabase|Math\.random|gematria_method_trace|import\(/);
  }
  const a = run("6 × 10 × 17 = 1020"), b = run("6 × 10 × 17 = 1020"); assert.deepEqual(a.tokens, b.tokens); assert.deepEqual(a.evaluation, b.evaluation);
  assert.equal(evaluateFormula(parseFormulaText("2 + 3").formula).sides[0].value, 5);
});
