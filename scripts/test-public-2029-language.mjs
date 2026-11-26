// PUBLIC_2029_LANGUAGE_CUTOVER_V1 — static acceptance: public 2029 surfaces must not carry
// internal/research/developer labels in reader-visible copy; Heichal stays untouched.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const PUBLIC_FILES = [
  "src/components/experience2029/SystemFrame2029.jsx",
  "src/pages/Home2029Page.jsx",
  "src/pages/World2029Page.jsx",
  "src/pages/Posts2029Page.jsx",
  "src/pages/Post2029Page.jsx",
  "src/pages/Number2029Page.jsx",
  "src/pages/Topic2029Page.jsx",
  "src/components/experience2029/ConvergenceGolden2029.jsx",
  "src/components/experience2029/MistaterTensionGolden2029.jsx",
  "src/components/experience2029/RegularVerseGolden2029.jsx",
  "src/components/experience2029/TriangleMethodGolden2029.jsx",
];
const FORBIDDEN = [
  "Research Path · ", "Context Inspector", "Contextual Sidecar", "Golden Journey", "Golden Preview",
  "GOLDEN 2029", "DISCOVERY WORLD", "DISCOVER · NOW", "PUBLIC PROJECTION", "WIREFRAME",
  "fallback ל־Legacy", "2029 projection", "trace קנוני", "הקשר Research Context", "אותו Research Context",
  "חיפוש / פקודה",
];

test("public 2029 copy has no forbidden internal labels", () => {
  for (const file of PUBLIC_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const bad of FORBIDDEN) assert.ok(!src.includes(bad), `${file} still contains "${bad}"`);
  }
});

test("public header and command input expose accessible search labels", () => {
  const src = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
  // The adopted single bar opens the same search capability. A historical
  // surface-dependent source expression is no longer the accessibility contract.
  assert.match(src, /<input[\s\S]*?aria-label="חיפוש"/);
  assert.match(src, /className="sod29-header-search"[^>]*onClick=\{openSiteSearch\}[^>]*aria-label="חיפוש באתר"/);
  assert.ok(!src.includes("<small>פקודה</small>"));
});

test("Heichal page copy is untouched", () => {
  const src = fs.readFileSync("src/pages/Heichal2029Page.jsx", "utf8");
  assert.ok(src.includes("Context-Compiled Research Environment"));
});

// PUBLIC_LANGUAGE_LAW_V2 (ZURIEL 26.11.2026): a reader never sees a version name, "Legacy", an "old"/"new" system, a developer note, a technical name or a message meant for the admin.
// Dates and natural wording say what changed; a comparison between systems is never the wording. Applies to the reader-visible text of the Home, /stats and the discovery section.
const VISIBLE_FILES = [
  "src/pages/Stats2029Page.jsx",
  "src/components/experience2029/DiscoveryCenter2029.jsx",
  "src/components/experience2029/HomeComposition2029.jsx",
  "src/lib/research/discoveryCenter2029.js",
];
const FORBIDDEN_VISIBLE = [
  /legacy/i, /מערכת (?:ישנה|חדשה|קודמת)/, /אתר (?:ישן|חדש|קודם)/, /(?:האתר|המערכת) (?:הישנ[הה]|החדש[הה]|הקודמ[תה])/, /גרסה (?:ישנה|חדשה|קודמת)/, /גרסת/,
  /\bv\d+\b/i, /\bjetpack\b/i, /\bTODO\b|\bFIXME\b/, /הערת (?:מפתח|פיתוח)/, /\bZURIEL\b/, /\bsandbox\b|\bdebug\b|\bfallback\b/i,
  /\b[a-z]+(?:_[a-z0-9]+){1,}\b/,   // a technical (snake_case) name
];
function visibleStrings(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1").split("\n").filter(line => !/^\s*import\s/.test(line)).join("\n");
  const out = [];
  for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) if (/[֐-׿]/.test(m[2])) out.push(m[2]);
  for (const m of code.matchAll(/>([^<>{}]*[֐-׿A-Za-z][^<>{}]*)</g)) out.push(m[1].trim());
  return out;
}
test("reader-visible text has no version names, Legacy, old/new system wording, developer notes or technical names", () => {
  for (const file of VISIBLE_FILES) {
    for (const text of visibleStrings(fs.readFileSync(file, "utf8"))) {
      for (const rule of FORBIDDEN_VISIBLE) assert.ok(!rule.test(text), `${file}: "${text}" matches ${rule}`);
    }
  }
});
test("the featured-discovery control is for the admin only and never reaches the public", () => {
  const src = fs.readFileSync("src/components/experience2029/DiscoveryCenter2029.jsx", "utf8");
  assert.match(src, /const admin = isAdmin === true && Boolean\(user\?\.id\)/);
  assert.match(src, /admin && !\(model\.featured\?\.id === item\.id[^?]*\? <ChooseFeatured/);
  const stats = fs.readFileSync("src/pages/Stats2029Page.jsx", "utf8");
  assert.match(stats, /admin=\{false\}/, "/stats never carries the admin control");
});
test("/stats keeps every existing measure and draws the approved order", () => {
  const src = fs.readFileSync("src/pages/Stats2029Page.jsx", "utf8");
  const order = ["stats29-site", "stats29-weekly", "stats29-hot", "stats29-sections", "stats29-discoveries", "stats29-writers", "stats29-bots", "stats29-since"];
  const at = order.map(id => src.indexOf(`aria-labelledby="${id}"`));
  assert.ok(at.every(index => index > 0), "every block exists");
  assert.deepEqual([...at].sort((a, b) => a - b), at, "the order: trends and windows, hot now, sections, discoveries and contributions, writers, crawlers, cumulative since 2015");
  for (const label of ["צפיות בדפים", "צפיות שלא סווגו", "פעולות במחשבון", "חיפושים בצופן התנ״כי", "דפים שהוגשו למנועי חיפוש ובינה מלאכותית", "הודעות בקהילה", "תרומות מחקר שאושרו", "פוסטים חדשים", "צפנים חדשים", "ביטויים חדשים במאגר", "ביטויים מאומתים במאגר", "פוסטים באתר", "צפנים שפורסמו", "התכנסויות שאושרו", "צפיות בדפים מאז תחילת המדידה", "חישובי גימטריה שנרשמו"]) assert.ok(src.includes(label), `the measure "${label}" is still there`);
});
