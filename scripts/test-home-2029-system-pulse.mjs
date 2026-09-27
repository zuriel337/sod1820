import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const projection = read("src/lib/research/home2029Projection.js");
const home = read("src/pages/Home2029Page.jsx");
const css = read("src/components/experience2029/sod2029-closed.css");

assert.match(home, /data-experience-capability="home-system-pulse"/);
assert.match(home, /דופק המערכת/);
assert.match(home, /מה זז ב־SOD1820/);
assert.match(home, /ביטויים במאגר/);
assert.match(home, /תרומות השבוע/);
assert.match(home, /כותבים פעילים/);
assert.match(home, /עדכון אחרון למאגר/);
assert.match(home, /האחרון שנוסף/);

assert.match(projection, /from\("gematria_words"\)/);
assert.match(projection, /\.eq\("is_verified", true\)/);
assert.match(projection, /\.eq\("is_published", true\)/);
assert.match(projection, /is_encrypted\.is\.null,is_encrypted\.eq\.false/);
assert.match(projection, /from\("research_contributions"\)/);
assert.match(projection, /\.eq\("status", "approved"\)/);
assert.match(projection, /corpusAdded7d/);
assert.match(projection, /writers7d/);
assert.match(projection, /latestWords/);

// Known drift stays out of public Home until canonical readers exist.
for (const forbidden of ["search_log", "getRecentSearchCount", "getRealtimeNow", "admin_realtime_now", "activity_pulse"]) {
  assert.equal(projection.includes(forbidden), false, `Home pulse must not consume legacy/drift source: ${forbidden}`);
}
assert.match(projection, /searchesToday: null/);
assert.match(projection, /calculatorComputesToday: null/);
assert.match(projection, /journeysToday: null/);

// The public meter is activity, never generic audience size.
for (const forbiddenCopy of ["פעילים עכשיו", "מבקרים באתר", "אנשים באתר"]) {
  assert.equal(home.includes(forbiddenCopy), false, `Home pulse must not publish audience-size copy: ${forbiddenCopy}`);
}

assert.match(css, /\.sod29-home-system-pulse\{/);
assert.match(css, /\.sod29-home-system-pulse-grid\{/);
assert.match(css, /@media\(max-width:620px\)/);

console.log("Home 2029 System Pulse mini acceptance: PASS");
