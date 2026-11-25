import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Preview retains its development labels. Public readers see open destinations and genuine closed states.
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../src/components/experience2029/Footer2029.jsx", import.meta.url), "utf8");

test("the menu applies construction badges to preview and respects the World and cipher locks", () => {
  // The right-hand rail is the 11.11.2026 rail again (ZURIEL 25.11.2026): its rows carry no "building" flag of their own. The mark is set below, at
  // run time, from the release profile, exactly as before (a Preview shows it; the public release does not).
  assert.match(frame, /\{ to: "\/world", label: "העולם", symbol: "world" \}/);
  assert.match(frame, /\{ to: "\/els", label: "ELS · הצופן התנ״כי", symbol: "els" \}/);
  assert.match(frame, /\{ to: "\/code", label: "ELS · הצופן התנ״כי", symbol: "els" \}/);
  assert.ok(frame.includes('item.label === "העולם" ? { ...item, locked: worldLocked, building: !PUBLIC_READING_RELEASE }'));
  assert.ok(frame.includes('(item.to === "/els" || item.to === "/code") ? { ...item, locked: elsFeature.loading || (elsFeature.blocked && !elsFeature.adminViewAllowed), building: !PUBLIC_READING_RELEASE }'));
  // The mark is rendered inside the NavLink (still a link), never as the disabled pending button.
  assert.match(frame, /<span className="sod29-nav-copy">\{item\.label\}<\/span>\s*\{\/\*[^*]*\*\/\}\s*\{item\.building \? <span className="sod29-nav-building">בבנייה<\/span> : null\}\s*<\/NavLink>/);
});

test("the public footer keeps open links clear of development labels and leaves closed destinations disabled", () => {
  assert.ok(footer.includes('!PUBLIC_READING_RELEASE && OPEN_UNDER_CONSTRUCTION.has(item.id)'));
  assert.ok(footer.includes('if (state === "closed")'));
  assert.match(footer, /const OPEN_UNDER_CONSTRUCTION = new Set\(\["world", "els"\]\);/);
  assert.match(footer, /<Link className="f29-link" to=\{item\.href\}>\{item\.label\}<\/Link>\{badge\}\{building\}/);
});
