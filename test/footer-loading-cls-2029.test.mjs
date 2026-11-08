import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/components/experience2029/footer2029.css", import.meta.url), "utf8");
const footer = readFileSync(new URL("../src/components/experience2029/Footer2029.jsx", import.meta.url), "utf8");
const progress = readFileSync(new URL("../src/components/CanonicalProgress.jsx", import.meta.url), "utf8");

// Field RUM (events.web_vital, 5 days): footer.f29 / div.sod29-main-stage.has-context-rail are the top CLS sources on /post.
// A scroll position applied while only the loading placeholder exists clamps to the bottom of that short document, so the footer
// is in the viewport and leaves it when the content arrives. While the placeholder is the only route content the footer is not rendered.
test("the footer is hidden only while the route content is just the loading placeholder", () => {
  const rule = css.match(/\.sod29-root:has\(([^)]*)\)\s*\.f29\s*\{([^}]*)\}/);
  assert.ok(rule, "footer loading rule is present");
  assert.equal(rule[1], ".sod29-main-stage>.sod29-content>.sod-canonical-progress:only-child");
  assert.equal(rule[2].trim(), "display:none");
});

test("the selectors name real elements and the existing one-viewport reservation is untouched", () => {
  assert.match(footer, /<footer className="f29"/);
  assert.match(progress, /className=\{`sod-canonical-progress /);
  assert.match(css, /\.sod29-main-stage>\.sod29-content\{min-height:100vh;min-height:100dvh\}/);
});
