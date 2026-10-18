import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = (path) => fs.readFileSync(path, "utf8");

test("homepage no longer renders the opening countdown or announcement", () => {
  const legacyHome = source("src/pages/HomeNewPage.jsx");
  const map = source("src/pages/NavigationCenterPage.jsx");
  assert.doesNotMatch(legacyHome, /WorldOpeningCountdown|sod-world-opening|העולם החדש עומד להיפתח/);
  assert.equal(fs.existsSync("src/components/WorldOpeningCountdown.jsx"), false);
  assert.match(legacyHome, /<LatestUpdatesRail /);
  assert.match(legacyHome, /to="\/map"/);
  assert.doesNotMatch(map, /שעון ההכרזה/);
  assert.match(map, /מצב הבנייה של SOD1820/);
});

test("new Home branding still hides the internal version from public titles", () => {
  const home = source("src/pages/Home2029Page.jsx");
  assert.doesNotMatch(home, /title="SOD1820 2029"/);
  assert.doesNotMatch(home, /title: "SOD1820 · 2029"/);
  assert.match(home, /title=\{CORE_PUBLIC_LAUNCH_2029 \? "SOD1820" : "SOD1820 · העולם החדש"\}/);
  assert.match(home, /path: "\/"/);
  assert.doesNotMatch(home, /path: "\/2029"/);
});

test("public build model and core page SEO do not brand as 2029", () => {
  const build = source("src/lib/knowledgeMap.js");
  const books = source("src/pages/Books2029Page.jsx");
  const numbers = source("src/pages/Number2029Page.jsx");
  const video = source("src/pages/Video2029Page.jsx");
  const researcher = source("src/pages/Researcher2029Page.jsx");
  assert.doesNotMatch(build, /label:"מודל 2029/);
  assert.doesNotMatch(books, /ב־SOD1820 2029/);
  assert.doesNotMatch(numbers, /דף המספר 2029/);
  assert.doesNotMatch(video, /title="וידאו · SOD1820 2029"/);
  assert.doesNotMatch(researcher, /RESEARCHER CORPUS · 2029/);
  assert.match(numbers, /\/number\//);
  assert.doesNotMatch(numbers, /\/2029\/number/); // Public routes must not expose the internal codename.
});
