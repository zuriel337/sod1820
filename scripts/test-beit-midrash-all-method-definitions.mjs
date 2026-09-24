import assert from "node:assert/strict";
import fs from "node:fs";
import { methodMechanicalDefinition } from "../src/lib/research/beitMidrashMethodDefinition.js";

const labels = new Map([["מילוי גדול","מילוי גדול"],["רגיל","רגיל"]]);

const composite = methodMechanicalDefinition(
  { method_key:"מילוי בלבד גדול", display_label:"מילוי בלבד גדול", execution_kind:"composite_engine", operator:"diff", derived_from:["מילוי גדול","רגיל"] },
  { sub:null, soul:null, mathematicalFamily:null, executionKind:"composite_engine", operator:"diff", derivedFrom:["מילוי גדול","רגיל"], dependencyRules:[] },
  labels
);
assert.match(composite.what, /שיטה מורכבת/);
assert.equal(composite.structure, "מילוי בלבד גדול = מילוי גדול − רגיל");

const conditional = methodMechanicalDefinition(
  { method_key:"רגיל", display_label:"רגיל", execution_kind:"sql_function" },
  { sub:"חיבור ערכי האותיות", soul:"המהות הגלויה", mathematicalFamily:"base_additive", dependencyRules:[{type:"conditional_equivalence",to:"גדול",condition:"no_final_letters"}] },
  new Map([["גדול","גדול"]])
);
assert.equal(conditional.what, "חיבור ערכי האותיות");
assert.match(conditional.dependencies[0], /כשאין אותיות סופיות/);
assert.equal(conditional.interpretation, "המהות הגלויה");

const contextual = methodMechanicalDefinition(
  { method_key:"אות רבתי", display_label:"אות רבתי · אלפים", execution_kind:"context_activated" },
  { sub:null, soul:null, mathematicalFamily:"extended_letter_values", dependencyRules:[] },
  new Map()
);
assert.ok(contextual.what);
assert.ok(contextual.structure);

const component = fs.readFileSync("src/components/BeitMidrashMethodsRegistry.jsx", "utf8");
assert.match(component, /מה השיטה עושה/);
assert.match(component, /איך היא בנויה/);
assert.match(component, /מתי צריך להיזהר מספירה כפולה/);
assert.match(component, /רעיון מחקרי/);
assert.doesNotMatch(component, /תת-קטגוריה:/);
assert.doesNotMatch(component, /נשמה:/);
assert.doesNotMatch(component, /METHODS|DEPTH_METHODS|gematria\.js/);

console.log("PASS Beit Midrash all-method definition projection");
