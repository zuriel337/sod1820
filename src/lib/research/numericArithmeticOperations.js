// src/lib/research/numericArithmeticOperations.js — the NUMERIC OPERATION REGISTRY of research_intake_foundation_contract_law §6.10 / §14.3.
//
// EXTEND_EXISTING: this is the sibling of numericRelationOperations.js (same owner research_strategy_layer_law, same contract_owner, same entry shape:
// operation_key / version / executor_ref / semantic_class "derivation" / truth_boundary). That file registers RELATION-DISCOVERY operations over a set of
// numbers; this one registers ARITHMETIC operations used to state a derivation ("20 × 31 = 620"). The existing catalog is untouched (its test pins it).
//
// The law's rules, implemented here and nowhere else:
//  - every mathematical operation has an explicit `operation_key` that is DISTINCT from the glyph shown to a person (the glyph is `symbol`);
//  - two visually identical symbols with different meaning are two operation_keys and are never merged;
//  - an operation is never a gematria method and never creates one (gematria_methods stays gematria-only);
//  - the result of an operation is an explicit mathematical derivation, not an engine fact; phrase values used as operands come from the canonical engine.
// No database change, no new table: this is a code registry (the DB-stored form `meta.ext.numeric_op` remains a separate Human-Gate decision).
import { NUMERIC_RELATION_OPERATION_CATALOG } from "./numericRelationOperations.js";

export const NUMERIC_ARITHMETIC_OPERATION = Object.freeze({
  ADD: "add",
  SUBTRACT: "subtract",
  MULTIPLY: "multiply",
  DIVIDE: "divide",
  FACES_SUM: "faces_sum",
  REGIONS_SUM: "regions_sum",
  TIMES_TEN_SEFIROT: "times_ten_sefirot",
});

const entry = (operationKey, displayLabel, symbol, symbolLabel, spec) => Object.freeze({
  spoken: spec.spoken || displayLabel, // how the operation is read aloud / in a sentence ("כפול", "ועוד") — data, not a hard-coded word in a component
  operation_key: operationKey,
  version: 1,
  display_label: displayLabel,
  symbol,                // what a person sees — NOT the identity
  symbol_label: symbolLabel, // accessible name of the glyph
  arity: Object.freeze({ min: spec.min ?? 2, max: spec.max ?? 2 }),
  commutative: Boolean(spec.commutative),
  associative: Boolean(spec.associative),
  base_operation: spec.base || null,        // registered derived operations evaluate through their base operation
  fixed_operand: spec.fixed ?? null,        // e.g. times_ten_sefirot: the second factor is the ten sefirot, declared by the law
  owner: "research_strategy_layer_law",
  contract_owner: "research_intake_foundation_contract_law",
  semantic_class: "derivation",
  deterministic: true,
  executor_ref: `numeric-arithmetic:${operationKey}`,
  input_kind: "operation_tree",
  truth_boundary: "explicit mathematical derivation over declared inputs; never a Gematria method, an engine fact, independent evidence, a canonical claim or publication by itself",
});

export const NUMERIC_ARITHMETIC_OPERATION_CATALOG = Object.freeze([
  entry(NUMERIC_ARITHMETIC_OPERATION.ADD, "חיבור", "+", "סימן חיבור", { min: 2, max: 16, commutative: true, associative: true, spoken: "ועוד" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.SUBTRACT, "חיסור", "−", "סימן חיסור", { min: 2, max: 2, spoken: "פחות" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.MULTIPLY, "כפל", "×", "סימן כפל", { min: 2, max: 16, commutative: true, associative: true, spoken: "כפול" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.DIVIDE, "חילוק", "÷", "סימן חילוק", { min: 2, max: 2, spoken: "חלקי" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.FACES_SUM, "סכום פאות", "+", "סימן חיבור", { min: 2, max: 16, commutative: true, associative: true, base: "add", spoken: "ועוד" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.REGIONS_SUM, "סכום אזורים", "+", "סימן חיבור", { min: 2, max: 16, commutative: true, associative: true, base: "add", spoken: "ועוד" }),
  entry(NUMERIC_ARITHMETIC_OPERATION.TIMES_TEN_SEFIROT, "כפול עשר ספירות", "×", "סימן כפל", { min: 1, max: 1, base: "multiply", fixed: 10, spoken: "כפול" }),
]);

// The glyphs a person may TYPE for an operation → its operation_key. Only these are operators; a dash, an en dash, a maqaf, a slash inside text, a middle
// dot between words etc. are never read as an operator unless listed here AND in an operand position (the parser enforces the position rules).
export const NUMERIC_OPERATOR_GLYPHS = Object.freeze({
  "+": "add",
  "−": "subtract", // U+2212 MINUS SIGN
  "-": "subtract", // hyphen-minus (operator only between operands, see the parser)
  "×": "multiply",
  "*": "multiply",
  "x": "multiply",
  "X": "multiply",
  "·": "multiply",
  "⋅": "multiply",
  "÷": "divide",
  "/": "divide",
});

export function createOperationRegistry(overrides = {}) {
  const rows = new Map(NUMERIC_ARITHMETIC_OPERATION_CATALOG.map((row) => [row.operation_key, Object.freeze({ ...row, ...(overrides[row.operation_key] || {}) })]));
  return Object.freeze({
    get: (key) => rows.get(key) || null,
    has: (key) => rows.has(key),
    base: (key) => { const row = rows.get(key); return row?.base_operation ? rows.get(row.base_operation) : row || null; },
    symbol: (key) => rows.get(key)?.symbol ?? null,
    symbolLabel: (key) => rows.get(key)?.symbol_label ?? null,
    spoken: (key) => rows.get(key)?.spoken ?? null,
    keyForGlyph: (glyph) => (Object.hasOwn(NUMERIC_OPERATOR_GLYPHS, glyph) ? NUMERIC_OPERATOR_GLYPHS[glyph] : null),
    list: () => [...rows.values()],
  });
}

export const NUMERIC_OPERATION_REGISTRY = createOperationRegistry();
export const numericArithmeticOperation = (key) => NUMERIC_OPERATION_REGISTRY.get(key);
export const operationSymbol = (key, registry = NUMERIC_OPERATION_REGISTRY) => registry.symbol(key);

// One view over both operation families (relation discovery + arithmetic): a single list with the family named, so nothing needs to guess which is which.
export function listNumericOperations() {
  return [
    ...NUMERIC_RELATION_OPERATION_CATALOG.map((row) => ({ ...row, family: "relation_discovery" })),
    ...NUMERIC_ARITHMETIC_OPERATION_CATALOG.map((row) => ({ ...row, family: "arithmetic" })),
  ];
}
