import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const css = readFileSync(new URL("../src/components/experience2029/footer2029.css", import.meta.url), "utf8");
const footer = readFileSync(new URL("../src/components/experience2029/Footer2029.jsx", import.meta.url), "utf8");
const progress = readFileSync(new URL("../src/components/CanonicalProgress.jsx", import.meta.url), "utf8");
// The one-viewport reservation must hold from the first paint, so it lives in the frame stylesheet, not with the footer that now
// loads on demand (shell weight 3/8).
const frameCss = readFileSync(new URL("../src/components/experience2029/systemFrame2029.css", import.meta.url), "utf8");

// Field RUM (events.web_vital, 5 days): footer.f29 / div.sod29-main-stage.has-context-rail are the top CLS sources on /post.
// A scroll position applied while only the loading placeholder exists clamps to the bottom of that short document, so the footer
// is in the viewport and leaves it when the content arrives. While the placeholder is the only route content the footer is not rendered.
test("the footer is hidden only while the route content is just the loading placeholder", () => {
  const rule = css.match(/\.sod29-root:has\(([^)]*)\)\s*\.f29\s*\{([^}]*)\}/);
  assert.ok(rule, "footer loading rule is present");
  assert.deepEqual(rule[1].split(",").map(selector => selector.trim()), [
    ".sod29-main-stage>.sod29-content>.sod-canonical-progress:only-child",
    ".sod29-main-stage>.sod29-content>[data-intro-symbol-only]:first-child+.sod-canonical-progress:last-child",
  ]);
  const dom = new JSDOM('<div class="sod29-root"><div class="sod29-main-stage"><main class="sod29-content"></main></div><footer class="f29"></footer></div>');
  const doc = dom.window.document, main = doc.querySelector("main");
  const loading = '<div class="sod-canonical-progress"></div>';
  const emblem = '<section data-intro-symbol-only></section>';
  const article = '<article>Article content</article>';
  try {
    for (const [html, hidden] of [[loading, true], [emblem + loading, true], [article, false],
      [emblem + article, false], [article + loading, false], [emblem + article + loading, false]]) {
      main.innerHTML = html;
      assert.equal(doc.querySelector(`.sod29-root:has(${rule[1]}) .f29`) === doc.querySelector("footer"), hidden, html);
    }
  } finally { dom.window.close(); }
  assert.equal(rule[2].trim(), "display:none");
});

test("the selectors name real elements and the existing one-viewport reservation is untouched", () => {
  assert.match(footer, /<footer className="f29"/);
  assert.match(progress, /className=\{`sod-canonical-progress /);
  assert.match(frameCss, /\.sod29-main-stage>\.sod29-content\{min-height:100vh;min-height:100dvh\}/);
  assert.doesNotMatch(css, /\.sod29-main-stage>\.sod29-content\{/, "the reservation is not tied to the on-demand footer stylesheet");
});
