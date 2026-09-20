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
  "בית המדרש הישן ייסגר בקרוב",
  "ממש עולם חדש הולך להיפתח",
]) assert.equal(component.includes(phrase), true, "missing transition phrase: " + phrase);

assert.equal(app.includes('<TransitionAnnouncement context="home" />'), true);
assert.equal(app.includes('<TransitionAnnouncement context="number" />'), true);
assert.equal(app.includes('<TransitionAnnouncement context="beit" />'), true);
assert.equal(app.includes('<BeitMidrashPage />'), true);
assert.equal(app.includes('<Route path="/beit-midrash" element={<LegacyBeitMidrashTransitionRoute />} />'), true);
assert.equal(app.includes('<Route path="/beit-midrash/:method" element={<LegacyBeitMidrashTransitionRoute />} />'), true);
assert.equal(app.includes('<Route path="/number/:phrase" element={<LegacyNumberTransitionRoute />} />'), true);

const beitRedirects = (vercel.redirects || []).filter((r) =>
  r.source === "/beit-midrash" || r.source === "/beit-midrash/(.*)"
);
assert.equal(beitRedirects.length, 0, "Beit Midrash must remain directly addressable during the notice-only period");

assert.equal(world.includes('<TransitionAnnouncement context="beit" />'), false, "World must not carry the Beit handoff before public opening");
assert.equal(component.includes('{ to: "/world", label: "פתח את העולם החדש" }'), false, "transition banner must not open World yet");
assert.equal(component.includes('links: []'), true, "Beit notice must be notice-only");

assert.equal(heichal.includes("ההיכל הישן ייסגר בהדרגה"), true);
assert.equal(heichal.includes('href="/heichal"'), true);
assert.equal(heichal.includes('href="/world"'), false, "legacy Heichal notice must not open World yet");

console.log("Transition 2029 public message contract: PASS");
