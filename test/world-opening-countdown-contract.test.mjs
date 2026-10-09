import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const countdown = read("src/components/WorldOpeningCountdown.jsx");
const home = read("src/pages/HomeNewPage.jsx");
const map = read("src/pages/NavigationCenterPage.jsx");
const model = read("src/lib/knowledgeMap.js");

test("the four-day announcement has a fixed Jerusalem deadline, never a per-visit reset", () => {
  assert.match(countdown, /WORLD_OPENING_AT = "2026-10-13T13:40:00\+03:00"/);
  assert.equal(
    Date.parse("2026-10-13T13:40:00+03:00") - Date.parse("2026-10-09T13:40:00+03:00"),
    4 * 24 * 60 * 60 * 1000,
  );
  assert.match(countdown, /Math\.max\(0, Date\.parse\(WORLD_OPENING_AT\) - now\)/);
  assert.match(countdown, /clearInterval\(tick\)/);
  assert.match(countdown, /prefers-reduced-motion/);
  assert.match(countdown, /to="\/map"/);
});

test("legacy home projects the countdown without a new route or opening gate", () => {
  assert.match(home, /import WorldOpeningCountdown from/);
  assert.match(home, /<WorldOpeningCountdown\s*\/>/);
  assert.doesNotMatch(countdown, /site_flags|unlock|setFlag|updateSiteFlag/);
});

test("the canonical public build map reflects the human-closed G3 gate", () => {
  assert.match(model, /id:"G3", label:"מימוש תשתיות 2029", state:"closed", closedAt:"2026-10-01"/);
  assert.match(model, /id:"G3\.5", label:"מוכנות תרחישי אמת ומעבר ל־G4", state:"active"/);
  assert.match(model, /id:"G4", label:"חוויית הזהב הראשונה", state:"pending"/);
  assert.match(map, /FIRST_STAGE_RELEASE_GATES\.map/);
  assert.match(map, /שעון ההכרזה אינו פותח יכולות אוטומטית/);
});
