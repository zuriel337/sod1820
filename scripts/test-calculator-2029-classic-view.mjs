import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/CalculatorPro2029Page.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/pages/calculatorPro2029.css", import.meta.url), "utf8");

// Default view is classic; old deep links keep working; tab param only written for non-default views.
assert.match(page, /tab === "ledger" \? "ledger" : tab === "tiles" \? "tiles" : "classic"/);
assert.match(page, /if \(view !== "classic"\) next\.set\("tab", view\)/);
// Classic renders ALL methods flat, in Registry/presentation order, directly after the input (before the hero).
assert.match(page, /familyGroups\.flatMap\(\(group\) => group\.methods\)/);
assert.ok(page.indexOf("classicView : null") < page.indexOf("{hero}\n          {canonicalSelection ? (\n            <CalculatorEqualsPreview2029"), "classic grid precedes hero/equals");
// Locked gadol_equals_ragil_when_no_sofiot law is honoured, not shown as a separate finding.
assert.match(page, /GADOL_BASE\[method\.methodKey\] && !hasSofiot\(info\.expression\)/);
// Tabs: classic + families + ledger; wide/desktop mode and non-Hebrew fallback unchanged.
assert.match(page, />קלאסי</);
assert.match(page, />משפחות</);
assert.match(page, /info\.hebrewApplicable \? view : "tiles"/);
assert.match(page, /wide \|\| effectiveView === "classic" \? null/);
// No per-method network fan-out in classic (legacy "נמצאו N" counts are intentionally not reproduced).
assert.doesNotMatch(page, /getNumberLookup|fetchMethodLensProjection/);
assert.match(css, /\.sod29-calcpro-grid\.is-classic/);
console.log("Calculator 2029 classic-default view contract: PASS");
