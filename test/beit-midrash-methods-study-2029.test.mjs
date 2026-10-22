import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
import path from "node:path";
const pageOnly = read("src/pages/BeitMidrash2029Page.jsx");
const partsDir = "src/components/beitMidrash2029";
const page = [pageOnly, ...fs.readdirSync(partsDir).map((name) => read(path.join(partsDir, name)))].join("\n");
const css = read("src/pages/beitMidrash2029.css");
const app = read("src/App.jsx");
const app2029 = read("src/App2029.jsx");

// The first 2029 slice is a projection over existing canonical readers, not a new registry or engine.
for (const reader of [
  "fetchGematriaMethodStates",
  "fetchNumberMethodProfile",
  "fetchGematriaMethodTrace",
  "methodMechanicalDefinition",
]) {
  assert.match(page, new RegExp(reader), `the methods study slice must consume ${reader}`);
}
assert.match(page, /MethodTraceExplanation2029/, "the slice must reuse the existing 2029 method explanation projection");
assert.doesNotMatch(page, /\.from\(["'`]gematria_methods["'`]\)/, "the page must not query gematria_methods directly");
assert.doesNotMatch(page, /from ["']\.\.\/lib\/supabase\.js["']/, "the page must not own a Supabase query path");
assert.doesNotMatch(page, /METHOD_INFO|DEPTH_METHODS|calcGem|GEM\[/, "the page must not define or execute local Gematria authority");

// Identity stays canonical and independent of /2029; the calculator remains a separate tool.
assert.match(pageOnly, /data-canonical-route=\{manifest\.identity\.canonicalRoute\}/, "the canonical Beit Midrash route comes from the learning manifest");
assert.match(page, /`\/beit-midrash\/\$\{encodeURIComponent\(key\)\}`/, "method links must keep their canonical deep-link identity");
assert.match(page, /destinations/, "the calculator hand-off comes from the manifest destinations");
assert.match(page, /\/2029\/calculator\?q=/, "method lessons must hand practice to the canonical calculator");
assert.doesNotMatch(page, /\/2029\/beit-midrash/, "Beit Midrash must not be nested under /2029");
assert.doesNotMatch(page, /\/2029\/world|navigate\(["']\/world|<Navigate/, "the methods slice must not route Beit Midrash into World");
assert.match(app, /<Route path="\/beit-midrash" element=\{<LegacyBeitMidrashTransitionRoute \/>\}/, "the existing compatibility route must remain intact alongside preview wiring");
assert.match(app2029, /const BeitMidrash2029Page = lazy\(/, "App2029 must lazy-load the native Beit Midrash surface");
assert.match(app2029, /path="\/beit-midrash"[\s\S]*?<BeitMidrash2029Page \/>/, "App2029 must own the canonical Beit Midrash route");
assert.match(app2029, /path="\/beit-midrash\/:method"[\s\S]*?<BeitMidrash2029Page \/>/, "App2029 must preserve canonical method deep links");

// Availability is not presented as research approval, and failures remain honest.
assert.match(page, /אינו אישור מחקרי, פרסום או חותמת אמת/, "active state must not be presented as research approval");
assert.match(page, /לא מוצגת רשימה מקומית חלופית/, "registry failure must not fall back to copied content");
assert.match(page, /לא הומצאו צעדים חלופיים/, "trace failure must not fabricate an explanation");
assert.match(page, /Promise\.allSettled/, "registry and profile failures must be represented independently");
assert.match(page, /צעדים נטענים רק לאחר בקשה מפורשת/, "the canonical trace must stay lazy");

// Visual rules: semantic theme roles only, responsive layout, accessible controls and reduced motion.
assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu, "the 2029 slice must not create a local color palette");
assert.doesNotMatch(css, /rgba?\(/u, "the 2029 slice must consume semantic color roles");
assert.doesNotMatch(css, /--s29-(?:font-mono|accent-discovery|warning|success)(?=[),])|--s29-focus(?=[),])/u, "the slice must use existing System Frame token names");
assert.match(css, /min-height:44px/, "primary controls must meet the 44px target");
assert.match(css, /@media\(max-width:620px\)/, "the slice must include the narrow mobile projection");
assert.match(css, /prefers-reduced-motion:reduce/, "the slice must honor reduced motion");

console.log("PASS Beit Midrash 2029 methods study slice");
