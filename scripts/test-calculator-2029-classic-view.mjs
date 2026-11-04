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
assert.match(page, /!info\.expression \|\| info\.hebrewApplicable \? view : "tiles"/);
assert.match(page, /wide \|\| effectiveView === "classic" \? null/);
// No per-method network fan-out in classic (legacy "נמצאו N" counts are intentionally not reproduced).
assert.doesNotMatch(page, /getNumberLookup|fetchMethodLensProjection/);
assert.match(css, /\.sod29-calcpro-grid\.is-classic/);

// Classic tiles are real links to the number page (focus = typed expression, method = tile method);
// non-reportable / preview tiles stay local buttons; family/ledger views still select locally.
assert.match(page, /href=\{method\.previewOnly \|\| !isReportableValue\(method\.computedValue\)/);
assert.match(page, /numberExpressionFocusHref\(method\.computedValue, \{ expression: info\.expression, method: method\.methodKey \}\)/);
assert.match(page, /<Link to=\{href\} className=\{tileClass\}/);
// Words above the input: daily word + public wall words behind the wall's readability guard.
const words = readFileSync(new URL("../src/components/gematria2029/CalculatorWordsBar2029.jsx", import.meta.url), "utf8");
assert.match(words, /getWallRecent/);
assert.match(words, /isReadable\(phrase\)/);
assert.match(words, /calculateGematriaEnvelope/);
assert.doesNotMatch(words, /★★★/, "masked wall rows are skipped, never rendered");
assert.ok(page.indexOf("<CalculatorWordsBar2029") < page.indexOf('<form className="sod29-calcpro-command"'), "words bar sits above the input");
// Calculators keep the standard bottom chrome (no extra floating context cue on phones).
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const frameCss = readFileSync(new URL("../src/components/experience2029/systemFrame2029.css", import.meta.url), "utf8");
assert.match(page, /calmBottomChrome/);
assert.match(frame, /calm-bottom-chrome/);
assert.match(frameCss, /\.sod29-root\.calm-bottom-chrome \.sod29-surface-context-mobile-cue,\n\.sod29-root\.calm-bottom-chrome \.sod29-feed-chip\{display:none!important\}/);
assert.match(frame, /onClick=\{openAttention\}/, "the same world feed stays reachable from the island (בעולם)");
const { dailyWordFor, DAILY_WORDS } = await import("../src/lib/dailyWord.js");
assert.equal(dailyWordFor(new Date(2026, 10, 5)), DAILY_WORDS[5 % DAILY_WORDS.length]);
assert.equal(dailyWordFor(new Date(2026, 10, 5)), dailyWordFor(new Date(2027, 2, 5)), "same day-of-month → same word, no randomness");
// The command row must stay scoped: ".sod29-calcpro-bar" is also the (grid) method-bar row, and the
// unscoped rule used to turn the controls row into a 124px/1fr/74px grid (tabs, status and "מתקדם" on 3 rows).
assert.match(css, /\.sod29-calcpro-command \.sod29-calcpro-bar \{\s*display: flex;\s*grid-template-columns: none;/);
assert.doesNotMatch(css, /^\.sod29-calcpro-bar \{\s*display: flex;/m, "no unscoped flex rule that the grid method-bar rule can override");
assert.doesNotMatch(page, /זהה גם/, "tiles no longer carry the 'same in another method' wording");
console.log("Calculator 2029 classic-default view contract: PASS");
