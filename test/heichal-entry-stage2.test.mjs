import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcGem } from "../src/theme.js";
import {
  HEICHAL_ENTRY_EXAMPLES, HEICHAL_DOMAIN_GATES, projectEntryExamples, projectEntryExample, projectDomainGate, letterBreakdown, breakdownExpression,
} from "../src/lib/research/heichalEntryExamples.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const page = read("src/pages/Heichal2029Page.jsx");
const examplesView = read("src/components/heichal/HeichalEntryExamples.jsx");
const gatesView = read("src/components/heichal/HeichalDomainGates.jsx");
const helper = read("src/lib/research/heichalEntryExamples.js");

test("examples reproduce with the canonical engine function: אהבה=אחד=13 and ביאת המשיח=צירוף מקרים=776", () => {
  assert.equal(calcGem("אהבה"), 13); assert.equal(calcGem("אחד"), 13);
  assert.equal(calcGem("ביאת"), 413); assert.equal(calcGem("המשיח"), 363); assert.equal(calcGem("ביאת המשיח"), 776);
  assert.equal(calcGem("צירוף"), 386); assert.equal(calcGem("מקרים"), 390); assert.equal(calcGem("צירוף מקרים"), 776);
  const [one, two] = projectEntryExamples();
  assert.equal(one.total, 13); assert.equal(two.total, 776);
  assert.deepEqual(two.rows[0].words.map((w) => w.value), [413, 363]);
  assert.deepEqual(two.rows[1].words.map((w) => w.value), [386, 390]);
  assert.equal(two.rows[1].words[1].letters.map((l) => l.letter).join(""), "מקרים"); // final mem handled like the engine
  for (const row of [...one.rows, ...two.rows]) for (const word of row.words) assert.equal(word.letters.reduce((s, l) => s + l.value, 0), word.value);
});

test("order and activation: 13 is open and static first; 776 only after an explicit click", () => {
  assert.equal(HEICHAL_ENTRY_EXAMPLES[0].activation, "static");
  assert.equal(HEICHAL_ENTRY_EXAMPLES[1].activation, "explicit");
  assert.match(examplesView, /useState\(false\)/);
  assert.match(examplesView, /const \[secondShown, setSecondShown\] = useState\(false\)/);
  assert.match(examplesView, /secondShown && second/);
  assert.match(examplesView, /onClick=\{\(\) => setSecondShown\(true\)\}/);
  assert.doesNotMatch(examplesView, /useEffect|setTimeout|setInterval|requestAnimationFrame|autoplay/i); // static, no auto activation
});

test("fail closed: an example whose numbers do not reproduce is not rendered", () => {
  assert.equal(projectEntryExample({ key: "x", title: "x", expressions: ["אהבה", "אחד"], total: 14, activation: "static" }), null);
  assert.equal(projectEntryExample({ key: "x", title: "x", expressions: ["אהבה"], total: 13, activation: "static" }), null);
  assert.equal(projectEntryExample(null), null);
});

test("calculation fact and interpretation are separated; the equality is never proof or prediction", () => {
  const [one, two] = projectEntryExamples();
  assert.match(one.factLabel, /עובדה חשבונית/);
  assert.equal(one.interpretation, null);
  assert.equal(two.interpretation.attributedTo, "בעל האתר");
  assert.match(two.interpretation.status, /לא הוכחה סיבתית ולא תחזית/);
  assert.match(examplesView, /data-kind="interpretation"/);
  assert.match(examplesView, /פרשנות מיוחסת ל/);
});

test("exploring an example is an explicit action through the EXISTING exact-expression path (no new engine / store)", () => {
  assert.match(page, /onExplore=\{\(expression\) => confirmExact\(expression, "gematria"\)\}/);
  assert.equal((page.match(/resolveExpressionFocus\(/g) || []).length, 1, "still a single explicit resolver call site");
  assert.doesNotMatch(examplesView + gatesView + helper, /resolveExpressionFocus|supabase\.(from|rpc|functions)|fetch\(|trackResearch|navigator\.share/);
});

test("domain gates show real availability from the canonical resolver; closed gates do not link", () => {
  assert.deepEqual(HEICHAL_DOMAIN_GATES.map((g) => g.key), ["gematria", "els", "books", "world", "journey", "kingdom"]);
  const gate = (key) => HEICHAL_DOMAIN_GATES.find((g) => g.key === key);
  const row = { enabled: false };
  const open = { blocked: false, publicState: "open" };
  const closed = { blocked: true, publicState: "closed" };
  const reg = { blocked: true, publicState: "registered_only" };
  const p = (key, o) => projectDomainGate(gate(key), o);
  assert.deepEqual([p("books", { lock: row, resolved: open }).state, p("books", { lock: row, resolved: open }).href], ["open", "/books"]);
  assert.deepEqual([p("books", { lock: row, resolved: closed }).state, p("books", { lock: row, resolved: closed }).href], ["closed", null]);
  assert.deepEqual([p("world", { lock: row, resolved: reg }).state, p("world", { lock: row, resolved: reg }).href], ["registered_only", null]);
  assert.equal(p("els", { flagsStatus: "loading" }).state, "checking");
  assert.equal(p("gematria", {}).href, "/2029/calculator"); // route carries no site flag
  assert.equal(gate("books").requireFlag, true); assert.equal(gate("journey").requireFlag, true); // same as the routes in App2029
  assert.equal(gate("journey").personal, true);
  assert.equal(p("kingdom", { kingdomPreview: false }).href, null);
  assert.equal(p("kingdom", { kingdomPreview: false }).state, "not_open");
  assert.equal(p("kingdom", { kingdomPreview: true }).state, "preview_only");
  assert.match(gatesView, /VITE_KINGDOM_PREVIEW === "true"/);
  assert.match(gatesView, /resolveFeatureState\(/);
  assert.equal((gatesView.match(/getSiteFlags\(/g) || []).length, 1, "one flags read for all gates");
  const app = read("src/App2029.jsx");
  for (const [flag, href] of [["lock_books", "/books"], ["lock_world", "/world"], ["lock_life_journey", "/2029/journey"]]) {
    assert.match(app, new RegExp(`path="${href}"[^\\n]*flag="${flag}"`));
  }
});

test("unknown availability is never shown as open: failed/timed-out/empty read, or an expected flag that was not returned", () => {
  const gate = (key) => HEICHAL_DOMAIN_GATES.find((g) => g.key === key);
  for (const key of ["els", "books", "world", "journey"]) {
    const unknown = projectDomainGate(gate(key), { flagsStatus: "unknown" });
    assert.equal(unknown.state, "unknown", key); assert.equal(unknown.href, null, key);
    assert.equal(unknown.stateLabel, "זמינות לא ידועה");
  }
  // flags were read, but the expected row for a non-required flag is absent: still not "open"
  assert.equal(projectDomainGate(gate("els"), { flagsStatus: "ready", lock: null, resolved: { blocked: false, publicState: "open" } }).state, "unknown");
  assert.equal(projectDomainGate(gate("world"), { flagsStatus: "ready", lock: null, resolved: { blocked: false, publicState: "open" } }).state, "unknown");
  // canonical contract for a required flag with a missing row is closed (the contract's own answer)
  assert.equal(projectDomainGate(gate("books"), { flagsStatus: "ready", lock: null, resolved: { blocked: true, publicState: "closed" } }).state, "closed");
  // defensive: ready but no resolved state -> unknown, never open
  assert.equal(projectDomainGate(gate("els"), { flagsStatus: "ready", lock: { enabled: false }, resolved: null }).state, "unknown");
  // component: empty map or rejected read -> unknown, timeout, retry, honest notice
  assert.match(gatesView, /Object\.keys\(map\)\.length \? \{ status: "ready"/);
  assert.match(gatesView, /\.catch\(\(\) => \{ if \(alive\)/);
  assert.match(gatesView, /FLAGS_TIMEOUT_MS/);
  assert.match(gatesView, /data-flags-unknown="true"/);
  assert.match(gatesView, /בדוק שוב/);
});

test("compact entry: one intro, no hero/orbit/English eyebrow, same Research Context, one Raziel", () => {
  assert.match(page, /description=\{hasContext \? "אותו עוגן, אותו רזיאל, משטח מחקר אחד\." : "כל גילוי מתחיל בשאלה\."\}/);
  assert.doesNotMatch(page, /DEEP RESEARCH ENVIRONMENT|INTENTION FIRST|ACTION FAMILIES|sod29-orbit-map|Context-Compiled Research Environment/);
  assert.doesNotMatch(page, /const ACTIONS = \[/);
  assert.equal((page.match(/shell\.openRaziel\(\)/g) || []).length >= 1, true);
  assert.doesNotMatch(page + examplesView + gatesView, /createContext|new Raziel|RazielChat|<Route/);
  // examples and gates hide while a free question is being understood
  assert.match(page, /\{!draft \? <HeichalEntryExamples/);
  assert.match(page, /\{!draft \? <HeichalDomainGates \/>/);
});

test("skip is a per-viewer UI convenience only, wrapped in try/catch; no research data is stored", () => {
  assert.match(examplesView, /try \{ return localStorage\.getItem\(SKIP_KEY\)/);
  assert.match(examplesView, /catch \{ return false; \}/);
  assert.doesNotMatch(examplesView, /setResearchContext|addToResearch|research_state/);
});

test("letterBreakdown only counts Hebrew letters", () => {
  assert.deepEqual(letterBreakdown("א-ב ג").map((l) => l.letter), ["א", "ב", "ג"]);
  assert.equal(breakdownExpression("אהבה").total, 13);
});
