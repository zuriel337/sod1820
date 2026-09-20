import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx","utf8");
const component = fs.readFileSync("src/components/TransitionAnnouncement.jsx","utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json","utf8"));
const heichal = fs.readFileSync("public/heichal.html","utf8");
const beit = fs.readFileSync("src/pages/BeitMidrashTransitionPage.jsx","utf8");

for (const phrase of [
  "אחרי 15 שנה הגיע הזמן להתחדש",
  "דף המספר הישן מתחדש",
  "בית המדרש הישן נסגר — התוכן ממשיך",
  "ממש עולם חדש הולך להיפתח",
]) assert.equal(component.includes(phrase), true, "missing transition phrase: " + phrase);

assert.equal(app.includes('<TransitionAnnouncement context="home" />'), true);
assert.equal(app.includes('<TransitionAnnouncement context="number" />'), true);
assert.match(app, /path="\\/beit-midrash".*BeitMidrashTransitionPage/s);
assert.equal(app.includes('<Route path="/number/:phrase" element={<LegacyNumberTransitionRoute />} />'), true);

const genericBeitRedirects = (vercel.redirects || []).filter((r) =>
  ["/beit-midrash","/beit-midrash/(.*)"].includes(r.source) && !r.has
);
assert.equal(genericBeitRedirects.length, 0, "generic Beit→World redirects must stay removed while transition notice is live");

const calcContinuity = (vercel.redirects || []).filter((r) =>
  r.source === "/beit-midrash" && Array.isArray(r.has)
);
assert.ok(calcContinuity.length >= 4, "calculator-intent redirects must remain preserved");

assert.equal(beit.includes("noindex: true"), true);
assert.equal(beit.includes('path: "/beit-midrash"'), true);

assert.equal(heichal.includes("ההיכל הישן ייסגר בהדרגה"), true);
assert.equal(heichal.includes('href="/heichal"'), true);
assert.equal(heichal.includes('href="/world"'), true);

console.log("Transition 2029 public message contract: PASS");
