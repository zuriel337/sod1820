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
  assert.match(guided, /example\.canonicalFindingHref/);
  assert.doesNotMatch(guided, /admin=1|\/world\?finding=/, "the finding route is only ever the verified one the contract returns");
  assert.match(guided, /publicWorldSourceHref\(example\.contributor\)/);
  assert.match(guided, /findingHref \? </, "no verified route, no finding link");
  assert.match(guided, /לפתיחת הגילוי המלא בעולם/);
  assert.match(guided, /לעמוד המקור בעולם/);
  assert.match(guided, /updateResearchContext/);
  assert.match(guided, /returnTo/);
  assert.match(guided, /findingId: example\.sourceId/);
  assert.match(guided, /sourceRef: example\.sourceRef/);
  assert.match(guided, /publicContributorHref\(example\.contributor\)/);
  assert.match(guided, /to=\{contributorHref\}\s+onClick=\{rememberWorldContext\}/,
    "the contributor link records context without replacing its own destination");
  assert.doesNotMatch(guided, /to=\{contributorHref\}\s+onClick=\{rememberAndOpenWorld\}/,
    "the contributor link must not be intercepted by World navigation");
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

test("lesson visual pass: centred rail, flat structure and calm motion", () => {
  const flow = parts["BeitMidrashLessonFlow.jsx"].replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(flow, /fetch|useEffect|reduce\(|parseInt|Number\(|gematria|\bcalc/i, "illustration only lays out values the lesson already has");
  assert.match(css, /\.bm-methods-layout\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.bm-method-nav\.is-rail\{/);
  assert.doesNotMatch(css, /grid-template-columns:minmax\(2\d\dpx,\s*\d+px\) minmax\(0,1fr\)/, "no fixed side column for methods or number topics");
  assert.match(css, /\.bm-lesson\{[^}]*margin-inline:auto/);
  assert.match(css, /\.bm-lesson\{[^}]*box-sizing:border-box/);
  // Every keyframe animation lives under no-preference and moves only opacity / transform / stroke.
  const motion = css.slice(css.indexOf("Lesson illustration"));
  assert.match(motion, /@media\(prefers-reduced-motion:no-preference\)\{[^@]*animation:/);
  for (const frames of css.matchAll(/@keyframes[^{]+\{((?:[^{}]|\{[^}]*\})*)\}/g)) {
    assert.doesNotMatch(frames[1], /width|height|margin|padding|top|left|inset|font/, "keyframes must not change layout");
  }
  assert.match(css, /--s29-warm-accent/);
  assert.doesNotMatch(css, /animation:[^;}]*infinite/, "no endless motion");
  assert.match(parts["BeitMidrashSection.jsx"], /"נקודות מפגש"/);
  assert.match(parts["BeitMidrashSection.jsx"], /"מתרגלים ומשתתפים"/);
});

test("illustrations are presentational: no data, reader or calculation, decorative ones hidden", () => {
  const illustrations = parts["BeitMidrashIllustrations.jsx"].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  // The strip may keep the chosen step in view (useEffect/useRef); nothing here may hold state, fetch or calculate.
  assert.doesNotMatch(illustrations, /fetch|useState|localStorage|import .*lib\/|Number\(|parseInt|gematria/i);
  assert.match(illustrations, /data-illustration="fibonacci-spiral"/);
  assert.match(illustrations, /aria-hidden="true"/);
  assert.match(illustrations, /<ol ref=\{list\} className="bm-reading-trail"/);
  assert.match(illustrations, /המחשה בלבד/);
  assert.match(parts["BeitMidrashLearn.jsx"], /selectedNumberConcept\.id === "fibonacci"/);
  assert.match(parts["BeitMidrashLearn.jsx"], /<PathTrail steps=\{path\.steps\?\.length\}/);
  assert.doesNotMatch(parts["BeitMidrashGuided.jsx"].match(/function GuidedCard[\s\S]*?\n\}\n/)[0], /MeetingIllustration/, "never inside an example card");
});
test("loading uses a skeleton with the lesson's own minimum heights", () => {
  assert.match(parts["BeitMidrashMethods.jsx"], /function MethodsSkeleton/);
  assert.match(parts["BeitMidrashMethods.jsx"], /role="status" aria-busy="true"/);
  assert.doesNotMatch(css, /data-pending|min-height:1\d{3}px/, "no giant reserved blank");
  assert.match(css, /\.bm-lesson>header\{min-height:294px/);
});

test("reading lessons render manifest lessons without score, storage or copying", () => {
  const learn = parts["BeitMidrashLearn.jsx"];
  assert.match(learn, /manifest\.sourceReadingLesson/);
  assert.match(learn, /manifest\.cipherReadingLesson/);
  assert.match(learn, /focusedSourceStep/);
  assert.match(learn, /focusedCipherStep/);
  assert.match(page, /focusedSourceStep=\{place\.sourceStepId\}/);
  assert.match(page, /focusedCipherStep=\{place\.cipherStepId\}/);
  for (const field of ["step.check", "step.boundary", "step.body", "lesson.exercise.prompt", "lesson.exercise.explanation", "lesson.continuation"]) {
    assert.ok(learn.includes(field), field);
  }
  assert.equal((learn.match(/function ReadingLesson/g) || []).length, 1, "one shared reading lesson shape");
  assert.match(learn, /איך בודקים\?/);
  assert.match(learn, /הגבול שחשוב לזכור/);
  assert.match(learn, /type="radio"/);
  assert.match(learn, /<details>[\s\S]*להסבר/);
  assert.doesNotMatch(learn, /useState|useEffect|localStorage|sessionStorage|fetch|correctOptionId|ניקוד|נכון!|שגוי/);
  // Lesson copy is never duplicated into the component.
  for (const copy of ["קובעים את הטקסט", "מוצאים את המקום המדויק", "ריבוי ניסיונות", "הופעות שחוזרות לאותו מקום"]) assert.ok(!learn.includes(copy), `no copied lesson text: ${copy}`);
  assert.match(parts["BeitMidrashIllustrations.jsx"], /aria-current=\{step\.id === focusedId \? "step"/);
  assert.match(parts["BeitMidrashIllustrations.jsx"], /data-illustration="skip-reading"/);
  assert.doesNotMatch(parts["BeitMidrashIllustrations.jsx"].replace(/\/\/.*$/gm, ""), /\bels\b|search|letters\[|charAt|split\(/i, "the skip drawing never reads or computes ELS data");
  assert.match(css, /\.bm-reading-step\{/);
  assert.match(css, /\.bm-reading-trail\{[^}]*overflow-x:auto/);
  assert.doesNotMatch(css, /\.bm-source-(?:lesson|step|trail|exercise)/, "reading lesson styles are shared");
});

test("1820 presentation is a pure view over the contract and one shared diamonds read", () => {
  const view = parts["BeitMidrashSod1820Presentation.jsx"].replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(view, /presentation\.slides|const \{ slides/);
  assert.match(view, /selectedSlide: slide/);
  assert.match(view, /diamonds\.map/);
  assert.doesNotMatch(view, /useState|fetch|supabase|curationProjection|Number\(|\.sort\(|\.filter\(|new Set|new Map|localStorage|sessionStorage/, "no reader, state, ranking or de-duplication in the view");
  assert.doesNotMatch(view, /diamonds\s*=\s*\[|d-1|label: "/, "no hard-coded diamond list");
  assert.doesNotMatch(view, /מקור אומת|ציון אמת|מצב אימות|איכות ראיות|ממצא מחקר/);
  assert.match(view, /approvalPolicy\.label/);
  assert.match(view, /ArrowLeft: nextSlide, ArrowRight: previousSlide/, "right-to-left arrows");
  assert.match(view, /aria-current=\{item\.id === slide\.id \? "step"/);
  assert.match(view, /aria-roledescription="מצגת"/);
  assert.equal((page.match(/fetchCurationCatalog2029\(\)/g) || []).length, 1, "one diamonds read in the page");
  assert.match(page, /if \(!presentationOpen\) return undefined;[\s\S]*fetchCurationCatalog2029\(\)/, "read only while the presentation is open");
  assert.match(page, /curationCatalog: catalog\.data/);
  assert.match(page, /where\.pathId === "sod1820" && where\.lessonId === "sod1820"/);
  assert.match(css, /\.bm-presentation\{/);
  assert.match(css, /\.bm-slide\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
});
