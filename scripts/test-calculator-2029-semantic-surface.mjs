import fs from "node:fs";
import assert from "node:assert/strict";
import { resolveExperienceContext } from "../src/lib/experienceContext.js";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");

// Calculator2029Page must project through the existing canonical Number semantic
// surface, not a bespoke "calculator" surface unknown to the Experience Context
// resolver (this previously threw "Unknown SOD1820 experience surface: calculator"
// and blocked the Release Visual Gate).
assert.match(page, /<Sod2029Shell[\s\S]*?surface="number"/);
assert.doesNotMatch(page, /surface="calculator"/);

// Route/visibility/engine contract must be unchanged by the surface fix.
assert.match(page, /path:\s*"\/2029\/gematria"/);
assert.match(page, /noindex:\s*true/);
assert.match(page, /fetchNumberMethodProfile/);
assert.match(page, /data-experience-surface="calculator-2029"/);

// The exact resolver call SystemFrame2029 makes for this page must not throw and
// must yield the canonical Number surface profile.
const context = resolveExperienceContext({ surface: "number", locale: "he" });
assert.equal(context.surface, "number");
assert.equal(context.experience.question, "מה המספר הזה מראה?");
assert.equal(context.experience.truthSafe, true);

// Regression guard: the surface value the page used to pass must still be
// rejected by the resolver, so a future revert is caught immediately.
assert.throws(
  () => resolveExperienceContext({ surface: "calculator" }),
  /Unknown SOD1820 experience surface: calculator/,
);

console.log("test-calculator-2029-semantic-surface: OK");
