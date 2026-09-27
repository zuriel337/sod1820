import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const projection = read("src/lib/research/home2029Projection.js");
const home = read("src/pages/Home2029Page.jsx");
const css = read("src/components/experience2029/sod2029-closed.css");
const og = read("api/og.js");

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



// Enrichment stays projection-only: reuse existing Calculator Fast Preview and World owners.
assert.match(home, /buildCalculator2029FastPreview/);
assert.match(home, /data-experience-capability="home-gematria-fast-core"/);
assert.match(home, /תשע שיטות נדלקות מיד/);
assert.match(home, /טרם אומת במנוע/);
assert.match(home, /\/2029\/gematria\?q=/);
assert.equal(/from "\.\.\/lib\/gematria\.js"/.test(home), false, "Home must not own a duplicate Gematria engine");

assert.match(projection, /fetchWorldLandingContributorProjection/);
assert.match(projection, /fetchWorldDiscoveryStream/);
assert.match(projection, /worldPreview/);
assert.match(home, /data-experience-capability="home-world-discovery"/);
assert.match(home, /data-experience-capability="home-researchers"/);
assert.match(home, /חדש במחקר/);
assert.match(home, /חוקרים וכותבים/);
assert.match(home, /\/topic\//);
assert.match(home, /\/researcher\//);

assert.match(css, /\.sod29-home-mini-gematria\{/);
assert.match(css, /\.sod29-home-mini-gematria-grid\{/);
assert.match(css, /\.sod29-home-world-preview\{/);
assert.match(css, /\.sod29-home-world-preview-grid\{/);

// Public naming must consume canonical presentation language, never internal/deprecated labels.
for (const forbiddenPublicCopy of ["מפגש", "מפגשים", "Connected Golden", "Fast Core", "Fast Preview"]) {
  assert.equal(home.includes(forbiddenPublicCopy), false, `Home 2029 must not expose deprecated/developer copy: ${forbiddenPublicCopy}`);
}
assert.match(home, /התכנסויות ציבוריות/);
assert.match(home, /גימטריה · חישוב מיידי/);
assert.match(home, /שכבת התצוגה המהירה/);
assert.equal(projection.includes('["קדמי", "kadmi"]'), false, "Home treasure projection must not expose internal קדמי label");
assert.match(projection, /\["משולש", "kadmi"\]/);
assert.equal(og.includes("רגיל · מסתתר · קדמי"), false, "Public OG copy must not expose internal קדמי label");
assert.match(og, /רגיל · מסתתר · משולש/);

console.log("Home 2029 System Pulse + enrichment acceptance: PASS");
