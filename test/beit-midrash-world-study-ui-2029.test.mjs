import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveExperienceContext } from "../src/lib/experienceContext.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/pages/BeitMidrash2029Page.jsx");
const css = read("src/pages/beitMidrash2029.css");
const app = read("src/App2029.jsx");
const numberLivingWorld = read("src/components/number2029/NumberLivingWorld2029.jsx");
const dir = new URL("../src/components/beitMidrash2029/", import.meta.url);
const parts = Object.fromEntries(fs.readdirSync(dir).map((name) => [name, fs.readFileSync(new URL(name, dir), "utf8")]));
const ui = [page, ...Object.values(parts)].join("\n");

test("System Frame recognizes Beit Midrash as an independent 2029 learning surface", () => {
  const experience = resolveExperienceContext({ surface: "beit-midrash", locale: "he" });
  assert.equal(experience.surface, "beit-midrash");
  assert.equal(experience.experience.question, "איך לומדים ומבינים את השיטה?");
  assert.equal(experience.experience.truthSafe, true);
  assert.match(page, /<Sod2029Shell[\s\S]*?introVariant="none"/);
  assert.equal((page.match(/<BeitMidrashHero\b/g) || []).length, 1);
});

test("guided examples come from one World load handed to the learning contract", () => {
  assert.equal((page.match(/fetchWorldAllResearchProjection\(\)/g) || []).length, 1);
  assert.match(page, /buildBeitMidrashLearningProjection\(\{\s*worldProjection: world\.projection/);
  assert.match(page, /guidedExamples/);
  assert.doesNotMatch(ui, /fetchWorldFindingReviewPage|worldFindingReviewClient|useAuth|isAdmin/);
  assert.doesNotMatch(ui, /\.from\s*\(|\.rpc\s*\(|WorldAllResearchTable|createContext|createStore/);
  assert.doesNotMatch(ui, /buildBeitMidrashWorldSections|filterWorldAllResearchRows|clusterWorldResearchRows|compareWorldResearchStrength/);
  assert.doesNotMatch(ui, /\.sort\s*\(|\.dedup|new Set\(|localStorage|sessionStorage/);
});

test("public Beit Midrash copy keeps research-room vocabulary out of the page", () => {
  for (const forbidden of [
    "ממצא מחקר", "איכות ראיות", "ביטחון", "מצב אימות", "סקירת מנהל", "טריאז", "מאגר ממצאים", "תצוגת מנהל",
  ]) {
    assert.ok(!ui.includes(forbidden), `UI contains ${forbidden}`);
  }
  // English terms are checked as visible text only (identifiers such as the projection builder are code).
  assert.doesNotMatch(ui, /[>"'`][^<>"'`{}]*\b(?:Projection|Research|Triage)\b[^<>"'`{}]*[<"'`]/);
  assert.doesNotMatch(ui, /searchTerms|search_terms|מונחי חיפוש/);
  assert.doesNotMatch(ui, /triage|evidenceQuality|independentSourceCount|linkedTopicRating|treeMatches/);
});

test("source fidelity: sourceRef, occurrences and verified links only", () => {
  const guided = parts["BeitMidrashGuided.jsx"];
  assert.match(guided, /example\.sourceRef/);
  assert.match(guided, /example\.occurrences\.length > 1/);
  assert.match(guided, /example\.occurrences\.map/);
  assert.match(guided, /example\.sourceHref \?/);
  assert.match(guided, /href=\{example\.canonicalFindingHref\}/);
  assert.match(guided, /לפתיחת הגילוי המלא/);
  assert.match(guided, /to=\{example\.returnHref\}/);
  assert.match(guided, /mapCallout\.href/);
});

test("learn, discover, participate hierarchy with one map CTA and gated destinations", () => {
  assert.match(page, /id="bm-discover"/);
  assert.match(page, /id="bm-participate"/);
  assert.match(parts["BeitMidrashLearn.jsx"], /id="bm-learn"/);
  assert.match(parts["BeitMidrashParticipate.jsx"], /destination\.href/);
  assert.match(parts["BeitMidrashParticipate.jsx"], /aria-disabled="true"/);
  assert.doesNotMatch(parts["BeitMidrashParticipate.jsx"], /<form|<input|<textarea/);
  assert.doesNotMatch(ui, /lni-|LegacyNewsletterInvite|role="dialog"|aria-modal/);
  assert.match(parts["BeitMidrashParticipate.jsx"], /openIssueReport/);
  assert.match(parts["BeitMidrashParticipate.jsx"], /VITE_KINGDOM_PREVIEW/);
  assert.match(parts["BeitMidrashLearn.jsx"], /numberGuideConcepts/);
  assert.match(parts["BeitMidrashLearn.jsx"], /selectedNumberConcept/);
  assert.match(parts["BeitMidrashLearn.jsx"], /className="bm-number-lesson"/);
  assert.doesNotMatch(parts["BeitMidrashLearn.jsx"], /\/2029\/number\/1820/);
  assert.match(parts["BeitMidrashLearn.jsx"], /path\.steps\.map/);
});

test("Number page points to lessons without copying its calculation adapters", () => {
  assert.match(numberLivingWorld, /to="\/beit-midrash\?section=numbers"/);
  assert.match(numberLivingWorld, /concept=fibonacci#number-concept-fibonacci/);
  assert.match(numberLivingWorld, /id="number-fibonacci"/);
  assert.equal((numberLivingWorld.match(/fibonacciRailModel\(/g) || []).length, 1);
});

test("shared App2029 owns both canonical Beit Midrash routes without redirecting them to World", () => {
  assert.match(
    app,
    /const BeitMidrash2029Page = lazy\(\s*\(\) => import\("\.\/pages\/BeitMidrash2029Page\.jsx"\)\s*\);/,
  );
  const routeElements = new Map(
    [...app.matchAll(
      /<Route\s+path="(\/beit-midrash(?:\/:method)?)"\s+element=\{([^}]+)\}\s*\/>/g,
    )].map((match) => [match[1], match[2].trim()]),
  );

  assert.equal(routeElements.get("/beit-midrash"), "<BeitMidrash2029Page />");
  assert.equal(routeElements.get("/beit-midrash/:method"), "<BeitMidrash2029Page />");
  assert.equal(routeElements.size, 2);
  for (const element of routeElements.values()) {
    assert.doesNotMatch(element, /Navigate|World2029Page|\/world/);
  }
});

test("CSS uses semantic roles, covers phone/desktop, targets, focus and reduced motion", () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu);
  assert.doesNotMatch(css, /rgba?\(/u);
  assert.match(css, /var\(--s29-page\)/);
  assert.match(css, /var\(--s29-brand-gold/);
  assert.match(css, /data-frame-theme-preset="dark"/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("typography consumes only the 2029 type contract", () => {
  assert.doesNotMatch(css, /--bm-serif|Georgia|Times New Roman|\bserif\b/i);
  assert.doesNotMatch(css, /Rubik|Noto Sans|IBM Plex|Roboto|Arial|Helvetica|system-ui|monospace/i);
  const families = [...css.matchAll(/font-family:\s*([^;}]+)/g)].map((match) => match[1].trim());
  assert.ok(families.length > 8);
  for (const family of families) {
    assert.match(family, /^var\(--s29-font-(?:body|display|ui|numeric)\)$/, `local font-family: ${family}`);
  }
  assert.doesNotMatch(css, /(?:^|[;{\s])font:\s*(?!inherit)/m, "no font shorthand that could bypass the tokens");
  assert.match(css, /\.sod29-midrash\{[^}]*font-family:var\(--s29-font-body\)/);
  assert.match(css, /var\(--s29-type-display\)/);
  assert.doesNotMatch(css, /font-size:\d+px/);
});
