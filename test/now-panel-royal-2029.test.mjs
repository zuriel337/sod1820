import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const jsx = read("../src/components/experience2029/NowPublications2029.jsx");
const css = read("../src/components/experience2029/nowPublications2029.css");
const centre = read("../src/components/experience2029/nowRoyalCenter2029.css");
const pulse = read("../src/components/experience2029/nowPulseLine2029.css");

// "עכשיו" in the one Royal family (ZURIEL 26.11.2026, Design V2 §14.4 / §14.13 and the 12-family map): the existing shared components, no look of its own.
test("buttons, filters, fields and status lines are the shared Royal components", () => {
  assert.doesNotMatch(jsx, /sod29-action/, "no second button look: r29-btn");
  assert.match(jsx, /className="r29-btn is-primary"/);
  assert.match(jsx, /className="r29-chip sod29-nowpub-chip"/, "the lens filters are the Royal chip");
  assert.match(jsx, /className="r29-field"[\s\S]*className="r29-input"/, "the two selects are the Royal field");
  assert.match(jsx, /htmlFor=\{`\$\{fieldId\}-series`\}/, "every field label is bound to its control");
  assert.match(jsx, /className="r29-status" data-state="loading" role="status"/);
  assert.match(jsx, /className="r29-status" data-state="error" role="alert"/);
  assert.match(jsx, /r29-badge is-pinned" data-now-pinned="true"><NavigationIcon2029 name="kingdom"/, "the pin is the Royal badge with the shared icon, not an emoji");
  assert.doesNotMatch(css, /\.sod29-nowpub-(chip|selects (label|select))\s*[{:\[]/, "no own chip/select look");
  assert.doesNotMatch(css, /\.sod29-nowpub-status p/, "no own status look");
});

test("hue comes from the Royal layer; no own hex tones; type from the V2 scale", () => {
  assert.doesNotMatch(css, /--tone\b/, "[data-tone] is mapped to --r29-hue by royal2029.css");
  assert.doesNotMatch(css + centre + pulse, /font-size\s*:\s*[0-9.]+px/, "no page-local literal font sizes (V2 §5.1)");
  assert.doesNotMatch(css + pulse, /#e8483f|#fff\b|#2f7be0|#c98a12|#12a594|#7b55e0|#e0487a|#e8742a/, "the old literal hues are gone");
});

test("structure that must not move: threads by source, order, lazy load, the measurement line", () => {
  assert.match(jsx, /data-now-threads="true"/);
  assert.match(jsx, /data-now-view=\{view\}/);
  assert.match(jsx, /const PAGE = 12/);
  assert.match(read("../src/components/experience2029/SystemFrame2029.jsx"), /const NowPublications2029 = React\.lazy\(\(\) => import\("\.\/NowPublications2029\.jsx"\)\)/, "still a lazy window");
  assert.match(pulse, /flex-wrap:nowrap;overflow:hidden;block-size:44px/, "the measurement line stays one 44px row");
});

test("targets are 44px and the window never widens", () => {
  assert.match(pulse, /\.nowpulse29-num\{position:relative;[^}]*min-inline-size:44px/);
  assert.match(pulse, /\.nowpulse29-num::after\{content:"";position:absolute;inset:-8px 0\}/, "the 28px chip is a 44px target");
  assert.match(pulse, /\.nowpulse29-more\{[^}]*min-block-size:44px;min-inline-size:44px/);
  assert.match(css, /\.sod29-nowpub>\*\{min-width:0\}/, "filters scroll inside the window");
  assert.match(css, /\.sod29-nowpub-link::after\{content:"";position:absolute;inset:-6px -4px\}/);
});
