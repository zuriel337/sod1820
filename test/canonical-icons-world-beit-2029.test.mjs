import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const icons = read("src/components/experience2029/NavigationIcon2029.jsx");
const world = read("src/pages/World2029Page.jsx");
const kinds = read("src/components/research/WorldKnowledgeTypes2029.jsx");
const beitPage = read("src/pages/BeitMidrash2029Page.jsx");
const beitHero = read("src/components/beitMidrash2029/BeitMidrashHero.jsx");
const beitLearn = read("src/components/beitMidrash2029/BeitMidrashLearn.jsx");
const beitGuided = read("src/components/beitMidrash2029/BeitMidrashGuided.jsx");
const worldCss = read("src/pages/worldComposition2029.css");

test("one canonical family owns study, series and the central chronicle symbol", () => {
  for (const name of ["study", "series", "chronicle"]) {
    assert.match(icons, new RegExp(`\\b${name}:\\s*<>`));
    assert.match(icons, new RegExp(`\\["${name}"`));
  }
  assert.match(icons, /תיעוד אירועים ורמזים חזקים לאורך הזמן; אינו ציון אמת/);
});
test("World entry and knowledge-type locations use the shared semantic symbols", () => {
  for (const name of ["portal", "now", "graph", "community", "discovery", "journey", "scan", "chronicle"]) {
    assert.ok(world.includes(`icon: "${name}"`) || world.includes(`name="${name}"`), `World is missing ${name}`);
  }
  for (const name of ["number", "letters", "cipher", "gallery", "now", "books", "spatial"]) {
    assert.ok(kinds.includes(`icon: "${name}"`), `Knowledge types are missing ${name}`);
  }
  assert.match(world, /הסיפור המרכזי/);
  assert.match(world, /תיעוד אירועים · רמזים חזקים · מקורות מדויקים/);
  assert.match(worldCss, /sod29-world-heart-enter 420ms/);
  assert.match(worldCss, /prefers-reduced-motion:reduce/);
  assert.match(worldCss, /data-frame-reduced-motion="true"/);
  assert.doesNotMatch(worldCss.slice(worldCss.indexOf("sod29-world-heart"), worldCss.indexOf("sod29-world-entry-copy p")), /animation:[^;}]*infinite/);
});

test("Beit Midrash has its own study identity while shared concepts retain shared symbols", () => {
  assert.match(beitPage, /name="study"/);
  assert.match(beitHero, /name="study"/);
  assert.match(beitLearn, /id="start" icon="door"/);
  assert.match(beitLearn, /id="ciphers" icon="cipher"/);
  assert.match(beitLearn, /id="sources" icon="books"/);
  assert.match(beitLearn, /id="numbers" icon="number"/);
  assert.match(beitLearn, /id="paths" icon="journey"/);
  assert.match(beitGuided, /id="guided" icon="research"/);
});
