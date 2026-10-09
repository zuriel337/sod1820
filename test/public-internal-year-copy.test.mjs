import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = (path) => fs.readFileSync(path, "utf8");

test("public opening message and Home branding never expose internal project year", () => {
  const countdown = source("src/components/WorldOpeningCountdown.jsx");
  const home = source("src/pages/Home2029Page.jsx");
  assert.doesNotMatch(countdown, /SOD1820 2029/);
  assert.match(countdown, /העולם החדש של SOD1820/);
  assert.doesNotMatch(home, /title="SOD1820 2029"/);
  assert.doesNotMatch(home, /title: "SOD1820 · 2029"/);
  assert.match(home, /title="SOD1820 · העולם החדש"/);
  assert.match(home, /path: "\/2029"/); // Keep internal routes stable.
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
  assert.match(numbers, /\/2029\/number/); // Internal routing remains unchanged.
});
