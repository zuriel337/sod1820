// The /number landing (ZURIEL 27.11.2026): the pure helpers, and the contracts that keep it fast, public and free of a parallel system.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  landingHref, isNumericTerm, hebrewDay, numberOfTheDay, foundationGroups, pickSurprise, crossMatches, mathFacts, FAMILY_NAMES, SEARCH_MODES,
} from "../src/lib/research/numberLanding2029.js";
import { analyzeNumberMath } from "../src/lib/research/numberMathProfile.js";
import { buildCalculator2029FastPreview } from "../src/lib/research/calculator2029FastPreview.js";
import { PUBLIC_READING_READ_RPCS } from "../public-reading-deploy/transport.js";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const ANCHORS = [{ value: 358, category: "משיח וגאולה" }, { value: 45, category: "משיח וגאולה" }, { value: 26, category: "שמות הקדושה" }, { value: 86, category: "שמות הקדושה" }, { value: 1820, category: "יסודות" }];

test("the address of a search is the number page (a number or an expression, optionally in one method)", () => {
  assert.match(landingHref("1820"), /\/number\/1820$/);
  assert.match(landingHref("שמע ישראל"), /\/number\/%D7%A9/);
  assert.match(landingHref("שמע ישראל", { method: "מילוי" }), /\?method=%D7%9E%D7%99%D7%9C%D7%95%D7%99$/);
  assert.equal(landingHref("   "), null);
  assert.equal(isNumericTerm("358"), true); assert.equal(isNumericTerm("35a"), false); assert.equal(isNumericTerm("1234567890"), false);
  assert.deepEqual(SEARCH_MODES.map(([key]) => key), ["expression", "reverse", "method", "cross"]);
});

test("the number of the day follows the Hebrew date: stable within a date, from the approved foundation numbers only", () => {
  const morning = new Date("2026-11-27T05:00:00Z"), evening = new Date("2026-11-27T17:00:00Z");
  assert.equal(hebrewDay(morning).key, hebrewDay(evening).key, "one date, one key");
  assert.match(hebrewDay(morning).label, /כסלו/);
  const a = numberOfTheDay(ANCHORS, morning), b = numberOfTheDay(ANCHORS, evening);
  assert.equal(a.value, b.value);
  assert.ok(ANCHORS.some(row => row.value === a.value));
  assert.equal(numberOfTheDay([], morning), null, "no foundation numbers, no card (nothing is invented)");
  const seen = new Set(); for (let d = 0; d < 60; d++) seen.add(numberOfTheDay(ANCHORS, new Date(Date.UTC(2026, 10, 1 + d, 12))).value);
  assert.ok(seen.size > 1, "the number changes from date to date");
});

test("foundation numbers are grouped by their approved classification; surprise picks only admitted numbers and never the one just seen", () => {
  const groups = foundationGroups(ANCHORS);
  assert.deepEqual(groups.map(g => g.category), ["משיח וגאולה", "שמות הקדושה", "יסודות"].sort((x, y) => groups.find(g => g.category === y).values.length - groups.find(g => g.category === x).values.length || x.localeCompare(y, "he")));
  assert.deepEqual(groups.find(g => g.category === "משיח וגאולה").values, [45, 358]);
  assert.equal(pickSurprise([5, 7, 9], { avoid: 7, random: () => 0.99 }), 9);
  assert.equal(pickSurprise([7], { avoid: 7 }), null);
  assert.equal(pickSurprise(null), null);
  assert.equal(pickSurprise([5, "x", NaN, 9], { random: () => 0 }), 5);
});

test("cross matching lists each shared value once, with the methods on each side", () => {
  const rows = crossMatches(buildCalculator2029FastPreview("משיח"), buildCalculator2029FastPreview("נחש"));
  assert.ok(rows.some(row => row.value === 358 && row.methodsA.length && row.methodsB.length));
  assert.equal(new Set(rows.map(row => row.value)).size, rows.length);
  assert.deepEqual(crossMatches(buildCalculator2029FastPreview("אב"), buildCalculator2029FastPreview("xyz")), []);
});

test("every mathematical family the existing profile can report has a Hebrew name here", () => {
  const unnamed = new Set();
  for (let n = 1; n < 6000; n++) for (const family of analyzeNumberMath(n).families) if (!FAMILY_NAMES[family.key]) unnamed.add(family.key);
  assert.deepEqual([...unnamed], []);
  const facts = mathFacts(analyzeNumberMath(590));
  assert.equal(facts.prime, false); assert.equal(facts.factors, "2 × 5 × 59"); assert.equal(facts.digitSum, 14);
  assert.equal(mathFacts(null), null);
});

test("the landing is a lazy page with Royal classes, no writes, no local history and no heavy static imports", () => {
  const page = read("src/components/number2029/NumberLanding2029.jsx"), lib = read("src/lib/research/numberLanding2029.js"), css = read("src/components/number2029/numberLanding2029.css");
  for (const heavy of ["supabaseApi2029", "Number2029Page", "NumberDrawer2029", "numberMathProfile", "calculator2029FastPreview", "verseGematriaSources"]) {
    assert.ok(!new RegExp(`^import[^\\n]*${heavy}`, "m").test(page), `${heavy} must be loaded on demand, not imported statically`);
  }
  assert.match(page, /lazy\(\(\) => import\("\.\/NumberLandingDiscoveries2029\.jsx"\)\)/);
  for (const source of [page, lib]) {
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), "no local search history (personal searches belong to the account, with consent)");
    assert.ok(!/\.insert\(|\.upsert\(|\.update\(|\.delete\(/.test(source), "reads only");
    assert.ok(!/rpc\(\s*["'](?:log_|save_|admin_|add_)/.test(source), "no write or log RPC");
  }
  assert.ok(!/log_search|logSearch/.test(page + lib), "what is typed is not logged");
  assert.match(page, /className="r29 nl29"/); assert.match(page, /r29-hall/); assert.match(page, /r29-btn/); assert.match(page, /r29-input/); assert.match(page, /r29-coin/);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), "no new colour: the Royal tokens carry the look");
  assert.ok(!/(?<![-\w])(?:height|block-size)\s*:\s*\d+px/.test(css), "no fixed height: a card is as tall as its content (Dense Row Law)");
});

test("the main menu leads to the full /number page; the drawer stays for callers inside pages", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.equal((frame.match(/\{ to: "\/number", label: "דף המספר", symbol: "number" \}/g) || []).length, 2, "both menus link to /number");
  assert.ok(!/action: "number-search", label: "דף המספר"/.test(frame));
  assert.match(frame, /if \(action === "number-search"\) openCommand\(\)/, "in-page callers keep the drawer");
  assert.match(frame, /item\.to === "\/number"/, "the lock follows the number feature flag like the other number entries");
  const services = read("src/pages/PublicServices2029Page.jsx");
  assert.match(services, /lazy\(\(\) => import\("\.\.\/components\/number2029\/NumberLanding2029\.jsx"\)\)/);
  assert.ok(!/function NumberEntry/.test(services), "one /number page: the thin entry form is gone");
});

test("the one reader added for surprise-me is argument-less and already granted by the database (no SQL in this change)", () => {
  assert.ok(PUBLIC_READING_READ_RPCS.includes("sitemap_numbers"));
  assert.ok(read("tests/fixtures/public-readonly-egress.cjs").includes("'sitemap_numbers'"));
  assert.ok(fs.readdirSync(new URL("../supabase/migrations/", import.meta.url)).some(name => read(`supabase/migrations/${name}`).includes("function public.sitemap_numbers")), "the function is defined by a committed migration (deploy-order contract)");
});
