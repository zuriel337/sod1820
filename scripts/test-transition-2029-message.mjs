import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx","utf8");
const component = fs.readFileSync("src/components/TransitionAnnouncement.jsx","utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json","utf8"));
const heichal = fs.readFileSync("public/heichal.html","utf8");
const world = fs.readFileSync("src/pages/World2029Page.jsx","utf8");

for (const phrase of [
  "אחרי 15 שנה הגיע הזמן להתחדש",
  "דף המספר הישן מתחדש",
  "בית המדרש הישן נסגר — התוכן ממשיך",
  "ממש עולם חדש הולך להיפתח",
]) assert.equal(component.includes(phrase), true, "missing transition phrase: " + phrase);

assert.equal(app.includes('<TransitionAnnouncement context="home" />'), true);
assert.equal(app.includes('<TransitionAnnouncement context="number" />'), true);
assert.equal(app.includes('<Route path="/beit-midrash" element={<Navigate to="/world" replace />} />'), true);
assert.equal(app.includes('<Route path="/beit-midrash/:method" element={<Navigate to="/world" replace />} />'), true);
assert.equal(app.includes('<Route path="/number/:phrase" element={<LegacyNumberTransitionRoute />} />'), true);

const genericBeitRedirects = (vercel.redirects || []).filter((r) =>
  ["/beit-midrash","/beit-midrash/(.*)"].includes(r.source) && !r.has
);
assert.equal(genericBeitRedirects.length, 2, "canonical Beit→World redirects must remain active");
assert.ok(genericBeitRedirects.every((r) => r.destination === "/world" && r.permanent === true));

const calcContinuity = (vercel.redirects || []).filter((r) =>
  r.source === "/beit-midrash" && Array.isArray(r.has)
);
assert.ok(calcContinuity.length >= 4, "calculator-intent redirects must remain preserved");

assert.equal(world.includes('<TransitionAnnouncement context="beit" />'), true);
assert.equal(heichal.includes("ההיכל הישן ייסגר בהדרגה"), true);
assert.equal(heichal.includes('href="/heichal"'), true);
assert.equal(heichal.includes('href="/world"'), true);

console.log("Transition 2029 public message contract: PASS");
