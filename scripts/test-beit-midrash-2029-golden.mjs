import assert from "node:assert/strict";
import fs from "node:fs";

// BEIT_MIDRASH_2029_GOLDEN_V1 — static verification that the native Beit Midrash 2029 Golden
// preview is a one-tree reader over existing canonical readers, computes zero gematria locally,
// opens no second event feed, and stays isolated from App2029/vercel/public-route ownership.

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("src/pages/BeitMidrash2029Page.jsx");
const projection = read("src/lib/research/beitMidrash2029Projection.js");
const home = read("src/pages/Home2029Page.jsx");
const app2029 = read("src/App2029.jsx");
const vercelJson = read("vercel.json");

// 1. One-tree readers only — no second Registry/engine/event feed.
for (const fn of ["fetchGematriaMethodStates", "fetchNumberMethodProfile", "fetchGematriaMethodTrace", "getSystemEvents"]) {
  assert.match(page, new RegExp(fn), `BeitMidrash2029Page must consume canonical ${fn}`);
}
assert.equal(/gematria_methods["'`]?\s*\)/.test(page), false, "BeitMidrash2029Page must not query gematria_methods directly");
assert.match(page, /from "\.\.\/lib\/systemEvents\.js"/, "BeitMidrash2029Page must import the single canonical getSystemEvents module");

// 2. No local Gematria arithmetic / duplicated method tables anywhere in the new surface.
for (const src of [page, projection]) {
  assert.equal(/GEM\[/.test(src), false, "must not execute local Gematria formulas");
  assert.equal(/sumBy\(/.test(src), false, "must not execute local Gematria formulas");
  assert.equal(/from "\.\.\/lib\/gematria\.js"/.test(src), false, "must not import local METHODS/DEPTH_METHODS formula tables");
}

// 3. Projection helpers are pure — no fetch/network calls, no supabase import.
assert.equal(/supabase/i.test(projection), false, "beitMidrash2029Projection.js must stay a pure presentation layer, no direct supabase access");
assert.equal(/fetch\(/.test(projection), false, "beitMidrash2029Projection.js must not perform network calls itself");

// 4. Honest fail states — no silent fallback to invented content.
assert.match(page, /לא ניתן לטעון כרגע את רשימת השיטות/, "method registry load failure must fail honest");
assert.match(page, /אין דוגמה חיה זמינה לשיטה זו כרגע/, "missing live sample must fail honest, not fabricated");
assert.match(page, /לא ניתן להציג עקבה חיה לשיטה זו כרגע/, "missing/erroring trace must fail honest");
assert.match(projection, /never fabricates/, "resolveSelectedMethod contract must document no-fabrication guarantee");

// 5. Registered-but-inactive methods stay a distinct honest section (mirrors BeitMidrashMethodsRegistry contract).
assert.match(projection, /r\.registered === true && r\.active !== true/, "countRegisteredInactive must isolate registered-but-inactive rows only");
assert.match(page, /selectMethodMenu/, "method chip nav must come from the shared selectMethodMenu projection, not a hand-rolled filter");

// 6. Future Calculator 2029 is visibly BUILDING and imports no legacy calculator authority.
assert.match(page, /מחשבון 2029 · בבנייה/, "future Calculator 2029 must be visibly marked BUILDING, not silently absent");
assert.equal(/GematriaCalculator/.test(page), false, "must not import legacy calculator authority into the Golden preview");

// 7. Continuation into Heichal goes through the existing Research Context, not a new store.
assert.match(page, /research\.setResearchContext\?\.\(/, "opening Heichal must go through the existing Research Context, not a new context store");
assert.match(page, /navigate\("\/heichal"\)/, "must route into the existing Heichal surface");

// 7b. FINAL UX POLISH — bounded continue: reuses the existing returnTo/returnExact mechanism
//     (SystemFrame2029 "חזרה מדויקת") instead of inventing a new back-navigation store.
assert.match(page, /returnTo:\s*\{\s*href:\s*"\/2029\?golden=beit-midrash"/, "opening Heichal must preserve a returnTo back to the exact golden-preview focal");

// 7c. FINAL UX POLISH — the Heichal continuation action must never be a dead click: it is
//     honestly disabled (with a visible reason) whenever there is no method+phrase to open.
assert.match(page, /disabled=\{!canOpenHeichal\}/, "Heichal continuation button must be honestly disabled without a selected method+phrase");

// 7d. FINAL UX POLISH — compact communication summary rendered from the existing
//     getSystemEvents().communication layer only, no second feed.
assert.match(page, /topCommunication/, "System Now lane must render the compact communication summary from getSystemEvents");
assert.match(projection, /topCommunication:\s*communication\.slice\(0,\s*2\)/, "compact communication summary must be capped and sourced from the existing communication array, not invented");

// 7e. FINAL UX POLISH — preview stays canonical=/2029 and noindex (it is not its own indexable route).
assert.match(page, /path:\s*"\/2029"/, "Golden preview must canonicalize to /2029, not the ?golden= preview flag");
assert.match(page, /noindex:\s*true/, "Golden preview must stay noindex");

// 8. Semantic acceptance markers per SOD1820_DESIGN_CONTRACT_V1 (stable data-experience-* hooks).
assert.match(page, /data-experience-surface="beit-midrash"/, "page must expose one stable data-experience-surface identity");
assert.match(page, /data-experience-capability="beit-midrash-method-library"/, "method library must expose a bounded data-experience-capability marker");
assert.match(page, /data-experience-capability="beit-midrash-system-now/, "System Now lane must expose a bounded data-experience-capability marker");

// 9. Preview-flag isolation — mounted only behind ?golden=beit-midrash inside Home2029Page,
//    never wired into App2029.jsx routing or vercel.json, and default Home behavior preserved.
assert.match(home, /searchParams\.get\("golden"\)/, "Home2029Page must gate the Golden preview behind an explicit query flag");
assert.match(home, /GOLDEN_PREVIEW_KEYS/, "Home2029Page must route the flag through an explicit preview registry, not an ad-hoc branch");
assert.match(home, /if \(GoldenPreview\) return <GoldenPreview \/>;/, "Home2029Page must early-return the preview without altering the default render path");
assert.match(home, /return <Sod2029Shell surface="home"/, "default Home2029Page render (no ?golden param) must remain byte-identical in shape");
assert.equal(/BeitMidrash2029Page/.test(app2029), false, "App2029.jsx must not be touched/wired with a new Beit Midrash route by this change");
assert.equal(/beit-midrash/i.test(vercelJson), false, "vercel.json must not be touched by this change");

console.log("test-beit-midrash-2029-golden.mjs: all assertions passed");
