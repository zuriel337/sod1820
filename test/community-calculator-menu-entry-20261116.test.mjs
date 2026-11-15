// Contract: the community calculator ("מחשבון הקהילה", /community/calculator) is a direct item of the global menu, beside the professional calculator.
//
// Why this exists (16.11.2026): the page, its route, sitemap entry and canonical all survived the 2029 cutover, but its menu entry lived in the
// Legacy menu (src/routes.jsx "מחשבון קהילתי", Navbar direct item added 22.7.2026) and was removed with it. The 2029 frame listed only the
// professional calculator, so no page of the site led to a working, indexed page and visitors reported the calculator as gone. Nothing checked
// that a live destination is reachable from the menu.
//
// Reads the navigation lists exactly as SystemFrame2029.jsx defines them (the same technique as navigation-symbols-distinct-2029.test.mjs, which
// additionally renders every symbol through the real icon component) and asks the REAL public-reading router whether the destination is open.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicReadingPath } from "../src/lib/publicReadingRelease2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFile(join(root, file), "utf8");
const frameSource = await read("src/components/experience2029/SystemFrame2029.jsx");
const LIST_NAMES = ["HOME_NAV", "DIRECT_NAV", "CORE_HOME_NAV", "CORE_DIRECT_NAV"];

/** The text of `const NAME = [ ... ];` as written in the frame (each list ends on a line that is just `];`). */
function listLiteral(name) {
  const header = `const ${name} = [`;
  const start = frameSource.indexOf(header);
  assert.notEqual(start, -1, `${name} is defined in SystemFrame2029.jsx`);
  const end = frameSource.indexOf("\n];", start);
  assert.notEqual(end, -1, `${name} ends with a line that is just "];"`);
  return frameSource.slice(start + `const ${name} = `.length, end + 3);
}

function navigationLists(publicFoundationPreview) {
  const body = LIST_NAMES.map((name) => `const ${name} = ${listLiteral(name)};`).join("\n");
  return new Function("publicFoundationPreview", `${body}\nreturn { ${LIST_NAMES.join(", ")} };`)(publicFoundationPreview);
}

for (const publicFoundationPreview of [true, false]) {
  const build = publicFoundationPreview ? "public foundation build" : "default build";

  test(`${build}: the menu lists the community calculator right after the professional calculator`, () => {
    const { DIRECT_NAV } = navigationLists(publicFoundationPreview);
    const professional = DIRECT_NAV.findIndex((item) => item.to === "/gematria");
    assert.notEqual(professional, -1, "the professional calculator is still in the menu");
    const entry = DIRECT_NAV[professional + 1];
    assert.equal(entry?.to, "/community/calculator", "the next item is the community calculator");
    assert.equal(entry.label, "מחשבון הקהילה", "named as the page names itself (title, share text, site map)");
    assert.equal(entry.symbol, "communityCalculator", "with its own picture");
    assert.notEqual(entry.symbol, DIRECT_NAV[professional].symbol, "the two calculators never share a picture");
    assert.equal(DIRECT_NAV.filter((item) => item.to === "/community/calculator").length, 1, "listed once");
  });

  test(`${build}: the professional calculator and the Community entry are unchanged`, () => {
    const { HOME_NAV, DIRECT_NAV } = navigationLists(publicFoundationPreview);
    assert.deepEqual(DIRECT_NAV.find((item) => item.to === "/gematria"), { to: "/gematria", label: "מחשבון גימטריה", symbol: "calculator" });
    assert.deepEqual(HOME_NAV.find((item) => item.label === "קהילה"), { to: "/community/chat", label: "קהילה", symbol: "community" });
  });
}

test("the menu entry leads to a declared route that the public router leaves open", async () => {
  const app = await read("src/App2029.jsx");
  assert.match(app, /<Route path="\/community\/calculator" element=\{<CommunityCalculator2029Page \/>\} \/>/, "the route renders the community calculator page");
  assert.equal(publicReadingPath("/community/calculator"), "public", "a visitor is not shown a closed or missing page");
  assert.equal(publicReadingPath("/community/calculator", { search: "?w=%D7%90%D7%9E%D7%AA" }), "public", "a shared link with a word stays public");
});

test("the label in the menu is the name the page gives itself", async () => {
  const page = await read("src/pages/CommunityCalculator2029Page.jsx");
  const siteMap = await read("src/pages/PublicServices2029Page.jsx");
  assert.match(page, /מחשבון הקהילה/);
  assert.match(siteMap, /\["\/community\/calculator", "מחשבון הקהילה"\]/, "the site map already uses the same label for the same address");
});

test("the picture is defined and catalogued once", async () => {
  const icons = await read("src/components/experience2029/NavigationIcon2029.jsx");
  assert.equal((icons.match(/^\s*communityCalculator: </gm) || []).length, 1, "one shape");
  assert.equal((icons.match(/\["communityCalculator","מחשבון הקהילה","ניווט",/g) || []).length, 1, "one catalogue row");
});
