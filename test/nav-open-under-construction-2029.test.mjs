import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The World and the cipher stay open and are marked "בבנייה" in the menu and the footer (ZURIEL 18.11.2026).
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../src/components/experience2029/Footer2029.jsx", import.meta.url), "utf8");

test("the World and every cipher entry in the menu are open links marked as under construction", () => {
  assert.match(frame, /\{ to: "\/world", label: "העולם", symbol: "world", building: true \}/);
  assert.match(frame, /\{ to: "\/els", label: "ELS · הצופן התנ״כי", symbol: "els", building: true \}/);
  assert.match(frame, /\{ to: "\/code", label: "ELS · הצופן התנ״כי", symbol: "els", building: true \}/);
  // The mark is rendered inside the NavLink (still a link), never as the disabled pending button.
  assert.match(frame, /<span className="sod29-nav-copy">\{item\.label\}<\/span>\s*\{\/\*[^*]*\*\/\}\s*\{item\.building \? <span className="sod29-nav-building">בבנייה<\/span> : null\}\s*<\/NavLink>/);
});

test("the footer keeps both links and adds the same mark", () => {
  assert.match(footer, /const OPEN_UNDER_CONSTRUCTION = new Set\(\["world", "els"\]\);/);
  assert.match(footer, /<Link className="f29-link" to=\{item\.href\}>\{item\.label\}<\/Link>\{badge\}\{building\}/);
});
