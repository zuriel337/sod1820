import assert from "node:assert/strict";
import fs from "node:fs";

// GEMATRIA_METHOD_EXPLANATION_PROJECTION_V1 — static verification that the Beit Midrash Methods
// tab is a live Registry/Engine projection (no local method authority, no fabricated values for
// registered-but-inactive methods, honest fail states, and working deep-link identity resolution).

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("src/pages/BeitMidrashPage.jsx");
const registryTab = read("src/components/BeitMidrashMethodsRegistry.jsx");
const app = read("src/App.jsx");

// 1. No local method authority left in the page — the legacy hardcoded 23-method list is gone.
assert.equal(/\bMETHOD_INFO\b/.test(page), false, "BeitMidrashPage must not keep the legacy hardcoded METHOD_INFO map");
assert.equal(/from "\.\.\/lib\/gematria\.js"/.test(page), false, "BeitMidrashPage must not import local METHODS/DEPTH_METHODS/GEM formula tables");
assert.match(page, /BeitMidrashMethodsRegistry/, "BeitMidrashPage must render the Registry-driven Methods projection");

// 2. The projection reads only the canonical live functions — never a second Registry.
for (const fn of ["fetchGematriaMethodStates", "fetchNumberMethodProfile", "fetchGematriaMethodTrace"]) {
  assert.match(registryTab, new RegExp(fn), `BeitMidrashMethodsRegistry must use canonical ${fn}`);
}
assert.equal(/gematria_methods["'`]?\s*\)/.test(registryTab), false, "BeitMidrashMethodsRegistry must not query gematria_methods directly (read via the canonical reader only)");
// No local Gematria arithmetic (letter-value tables / manual summation) in the projection component.
assert.equal(/GEM\[/.test(registryTab), false, "BeitMidrashMethodsRegistry must not execute local Gematria formulas");
assert.equal(/sumBy\(/.test(registryTab), false, "BeitMidrashMethodsRegistry must not execute local Gematria formulas");

// 3. Active methods are primary; registered-inactive methods are a distinct, honest, value-free section.
assert.match(registryTab, /r\.active === true/, "primary methods must be filtered by live active flag");
assert.match(registryTab, /r\.registered === true && r\.active !== true/, "secondary section must be registered-but-inactive only");
const unavailableRowSrc = registryTab.slice(registryTab.indexOf("function UnavailableMethodRow"), registryTab.indexOf("export default function"));
assert.equal(/computedValue/.test(unavailableRowSrc), false, "unavailable/registered methods must never render a fabricated computed value");
assert.equal(/profileByKey/.test(unavailableRowSrc), false, "unavailable/registered methods must not consult the live-sample profile at all");

// 4. Honest fail states — no silent fallback to invented content.
assert.match(registryTab, /לא ניתן לטעון כרגע את רשימת השיטות/, "registry load failure must fail honest, not fall back to a local list");
assert.match(registryTab, /אין דוגמה חיה זמינה לשיטה זו כרגע/, "missing sample value must fail honest, not be fabricated");
assert.match(registryTab, /לא ניתן להציג עקבה חיה לשיטה זו כרגע/, "missing/erroring trace must fail honest, not be fabricated");
assert.match(registryTab, /השיטה המבוקשת לא נמצאה ברישום החי/, "an unresolved deep-link identity must fail honest, not silently no-op");

// 5. Mechanical-only structure derivation — never soul/sub invention when the registry has none.
assert.match(registryTab, /derivedFrom/, "composite structure must be derived from operator/derivedFrom");
assert.match(registryTab, /\(soul \|\| sub\) &&/, "soul/sub must only render when the registry actually has them — never invented");

// 6. Lazy trace — the explain/trace fetch must be gated behind an explicit user action, not eager.
assert.match(registryTab, /onClick=\{\(\) => onExplain\(row\.method_key\)\}/, "trace must be fetched only on an explicit explain action, not eagerly on load");
assert.equal(/useEffect\(\(\) => \{[^}]*fetchGematriaMethodTrace/.test(registryTab), false, "trace must not be fetched eagerly inside a mount effect");

// 7. Deep-link routing: /beit-midrash/:method resolves to an exact Registry identity inside BeitMidrashPage.
assert.match(app, /<Route path="\/beit-midrash\/:method" element=\{<LegacyBeitMidrashTransitionRoute \/>\} \/>/, "route must still exist");
assert.match(page, /useParams/, "BeitMidrashPage must read the :method route param");
assert.match(page, /methodRouteParam \|\| mParam/, "route param must take priority over the legacy ?m= query for exact identity resolution");
assert.match(page, /focusMethodKey=\{methodFocusKey\}/, "resolved deep-link identity must be passed into the Methods tab");

console.log("Beit Midrash Methods registry projection: PASS");
