import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ZURIEL 25.11.2026: the menu that opens from "פתח ניווט" is the 11.11.2026 menu (two compact groups from the rail lists). The long public-discovery menu
// (22.11.2026) stays in the repository, switched off by ONE flag; its data and the site map page are untouched.
const frame = readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");

test("the expanded public menu is switched off by one named flag and never lazy-imported while it is off", () => {
  assert.match(frame, /export const PUBLIC_EXPANDED_MENU = false;/);
  assert.match(frame, /PUBLIC_EXPANDED_MENU && PUBLIC_READING_RELEASE \? React\.lazy\(\(\) => import\("\.\/PublicMenuSections2029\.jsx"\)\) : null/);
});

test("with the flag off the navigation is exactly the two compact 11.11 groups, in both the rail and the opened menu", () => {
  const nav = frame.slice(frame.indexOf("function FrameNavigation("), frame.indexOf("function NavGroup("));
  assert.match(nav, /title="בתים מרכזיים" items=\{home\}/);
  assert.match(nav, /title="גילוי וכלים" items=\{direct\}/);
  assert.match(nav, /if \(!expanded \|\| !PublicMenuSections2029\) return compact;/);
});

test("the rail lists are the 11.11 lists (PR 1555) and the discovery data is still there for the site map", () => {
  for (const name of ["HOME_NAV", "DIRECT_NAV", "CORE_HOME_NAV", "CORE_DIRECT_NAV"]) assert.match(frame, new RegExp(`const ${name} =`));
  assert.ok(readFileSync("src/lib/publicMap2029.js", "utf8").includes("publicMapGroups2029"));
  assert.ok(readFileSync("src/components/experience2029/PublicMenuSections2029.jsx", "utf8").includes("publicMapGroups2029"));
});
