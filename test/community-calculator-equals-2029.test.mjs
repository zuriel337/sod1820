import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMMUNITY_CALCULATOR_METHODS, communityEqualsSelection, communityEqualsChosen, communityEqualsShareText, COMMUNITY_EQUALS_LIMIT } from "../src/lib/research/communityCalculatorEquals2029.js";
import { buildCalculatorShareUrl, parseCalculatorShareState } from "../src/lib/research/calculator2029Viral.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the community calculator has four methods and no more; the rest is one link to the professional calculator", () => {
  assert.deepEqual([...COMMUNITY_CALCULATOR_METHODS], ["רגיל", "מילוי", "מסתתר", "גדול"]);
  const page = read("src/pages/CommunityCalculator2029Page.jsx");
  const methods = page.slice(page.indexOf("function MethodResults"), page.indexOf("function RelatedPhrases"));
  assert.match(methods, /CORE_METHODS\.map\(key => result\.all\.find/);
  assert.doesNotMatch(methods, /showAll|onShowAll/);
  assert.match(methods, /to=\{`\/gematria\?q=\$\{encodeURIComponent\(expression\)\}`\}/);
  assert.match(page, /selectCommunityCalculatorResult\(communityRows,/, "a method outside the four is never the selected one");
});

test("three matches first, more on request; the name itself and repeats are left out; the visitor's choice wins while it is still a match", () => {
  const rows = ["שילה", "ערב יום טוב", "אל שדי", " אל שדי ", "אלהים אחרים", "", "משה", "השם"].map(phrase => ({ phrase }));
  const selection = communityEqualsSelection(rows, "שילה");
  // names and single words first; "אלהים אחרים" is never offered on a personal card
  assert.deepEqual(selection.top.map(row => row.phrase), ["משה", "השם", "אל שדי"]);
  assert.deepEqual(selection.more.map(row => row.phrase), ["ערב יום טוב"]);
  assert.equal(selection.total, 4);
  assert.equal(selection.top.length, COMMUNITY_EQUALS_LIMIT);
  assert.equal(communityEqualsChosen(selection, "ערב יום טוב").phrase, "ערב יום טוב");
  assert.equal(communityEqualsChosen(selection, "").phrase, "משה");
  assert.equal(communityEqualsChosen(selection, "אלהים אחרים").phrase, "משה", "an excluded phrase in a link is never chosen");
  assert.equal(communityEqualsChosen(communityEqualsSelection([], "שילה"), "משה"), null);
});

test("the share text: שילה = 345, כמו משה; the method is named when it is not the regular one; nothing without a result", () => {
  assert.equal(communityEqualsShareText({ name: " שילה ", value: 345, phrase: "משה" }), "שילה = 345 בגימטריה, כמו משה. ומה השם שלכם שווה?");
  assert.equal(communityEqualsShareText({ name: "שילה", value: 345 }), "שילה = 345 בגימטריה. ומה השם שלכם שווה?");
  assert.equal(communityEqualsShareText({ name: "שילה", value: 469, methodKey: "מילוי", methodLabel: "מילוי" }), "שילה = 469 בגימטריה בשיטת מילוי. ומה השם שלכם שווה?");
  for (const bad of [{ name: "", value: 14 }, { name: "דוד", value: 0 }, { name: "דוד", value: "x" }, {}]) assert.equal(communityEqualsShareText(bad), "");
});

test("the link is the site's existing calculator share link: the recipient gets the same expression, method, value and match", () => {
  const url = buildCalculatorShareUrl({ expression: "שילה", methodKey: "רגיל", resultValue: 345 }, { discovery: { phrase: "משה", value: 345 }, shareId: "a1b2c3d4e5f60718", baseUrl: "https://sod1820.co.il/gematria" });
  const state = parseCalculatorShareState(new URL(url).search);
  assert.deepEqual({ ...state }, { isShared: true, expression: "שילה", methodKey: "רגיל", resultValue: 345, discoveryPhrase: "משה", shareId: "a1b2c3d4e5f60718" });
  // a match of another value never travels
  assert.equal(parseCalculatorShareState(new URL(buildCalculatorShareUrl({ expression: "שילה", methodKey: "רגיל", resultValue: 345 }, { discovery: { phrase: "דוד", value: 14 }, shareId: "x1" })).search).discoveryPhrase, null);
});

test("the card: same-method verified matches from the existing reader, a choice, what is sent, the existing share event without the typed text", () => {
  const page = read("src/pages/CommunityCalculator2029Page.jsx");
  const card = read("src/components/gematria2029/CommunityEqualsCard2029.jsx");
  assert.match(page, /\{!r2 && selected && <Suspense fallback=\{null\}><CommunityEqualsCard2029 /, "one name only: a comparison keeps its own result");
  assert.match(page, /lazy\(\(\) => import\("\.\.\/components\/gematria2029\/CommunityEqualsCard2029\.jsx"\)\)/, "loaded when there is a result, not with the page");
  assert.match(card, /collectVerifiedLookupMatches\(packet\.rows, \{ expression: name, methodKey, value: Number\(value\) \}\)/, "same method, verified");
  assert.match(card, /pickEqualsPreview\(/);
  assert.match(card, /role="radiogroup"/);
  assert.match(card, /data-share-preview/);
  assert.match(card, /data-share-disclosure="community-equals"/);
  assert.match(card, /FINDING_NOT_SENT/);
  assert.match(card, /buildCalculatorShareUrl\(/);
  assert.match(card, /useMethodLedger\(matches\.ready && !selection\.total \?/, "no match: the letters of the calculation, from the engine");
  const event = card.slice(card.indexOf('emit("calculator_2029", "share_created"'));
  assert.match(event, /surface: "community"/);
  assert.doesNotMatch(event.slice(0, event.indexOf("})")), /expression:|name\b(?!\.length)/, "the typed text is not part of the measurement");
  assert.doesNotMatch(card, /recordSiteActivity|startSiteActivity|recordCommunity|runAi|askRaziel|addWallWord|gematria_wall/, "no new metric, no AI, no public list write");
  // the opening and the recipient's own calculation are measured by the existing shared-result page
  const shared = read("src/pages/Calculator2029Page.jsx");
  for (const name of ["shared_result_opened", "new_compute_from_share", "share_created"]) assert.match(shared, new RegExp(`"${name}"`));
});

test("the preview a recipient sees names the match only when the corpus confirms it", () => {
  const og = read("api/og.js");
  const branch = og.slice(og.indexOf("The match the sharer chose (d)"), og.indexOf("} else if (w && Number.isFinite(nq) && !productionReading)"));
  assert.match(branch, /verified && sd && sd !== sq && ragil\(sd\) === sv && communityCardSuitable\(sd\)/);
  assert.match(branch, /is_verified=eq\.true&is_published=eq\.true/);
  assert.match(branch, /rows\[0\]\?\.phrase === sd/);
  assert.match(branch, /כמו \$\{sd\}/);
});

test("two names together: the pair is the two names with a space (its regular value is the sum), the meetings are counted in the four methods", async () => {
  const { communityPairExpression, communityPairShareText, communityPairMeetings } = await import("../src/lib/research/communityCalculatorEquals2029.js");
  assert.equal(communityPairExpression(" דוד ", "מיכל"), "דוד מיכל");
  assert.equal(communityPairExpression("דוד", " "), "");
  assert.equal(communityPairShareText({ first: "דוד", second: "מיכל", value: 114, phrase: "מים" }), "דוד ומיכל ביחד = 114 בגימטריה, כמו מים. ומה אתם שווים ביחד?");
  assert.equal(communityPairShareText({ first: "דוד", second: "מיכל", value: 114 }), "דוד ומיכל ביחד = 114 בגימטריה. ומה אתם שווים ביחד?");
  assert.equal(communityPairShareText({ first: "דוד", value: 114 }), "");
  const a = [{ key: "רגיל", value: 14 }, { key: "מילוי", value: 30 }, { key: "מסתתר", value: 9 }, { key: "גדול", value: 14 }, { key: "אתבש", value: 5 }];
  const b = [{ key: "רגיל", value: 14 }, { key: "מילוי", value: 31 }, { key: "מסתתר", value: 9 }, { key: "גדול", value: 15 }, { key: "אתבש", value: 5 }];
  assert.deepEqual(communityPairMeetings(a, b), { meet: ["רגיל", "מסתתר"], total: 4 }, "a method outside the four never counts");
  assert.deepEqual(communityPairMeetings([], b), { meet: [], total: 4 });
  // the share link of a pair restores: the engine's regular value of "דוד מיכל" is 14 + 100
  const { buildCalculatorShareUrl, parseCalculatorShareState } = await import("../src/lib/research/calculator2029Viral.js");
  const state = parseCalculatorShareState(new URL(buildCalculatorShareUrl({ expression: communityPairExpression("דוד", "מיכל"), methodKey: "רגיל", resultValue: 114 }, { shareId: "p1" })).search);
  assert.equal(state.expression, "דוד מיכל"); assert.equal(state.resultValue, 114); assert.equal(state.isShared, true);
});

test("the page: \"שני שמות\" mode with the four-method meetings and the pair card; the old all-methods count is gone", () => {
  const page = read("src/pages/CommunityCalculator2029Page.jsx");
  assert.match(page, /\["compare", "שני שמות", "research"\]/);
  assert.match(page, /communityPairMeetings\(r1\.all, r2\.all\)/);
  assert.match(page, /row=\{\{ key: "רגיל", value: r1\.value \+ r2\.value \}\} pair=\{\{/);
  assert.doesNotMatch(page, /model\.compat\.total|model\.compat\.count/);
  const card = read("src/components/gematria2029/CommunityEqualsCard2029.jsx");
  assert.match(card, /pair \? "מה אתם שווים ביחד\?" : "למי אתם שווים\?"/);
  assert.match(card, /mode: pair \? "pair" : "single"/);
});

test("the search wording leads with names, keeps \"מחשבון גימטריה\" at the front and makes no promise of prediction", async () => {
  const { COMMUNITY_CALCULATOR_SEO, COMMUNITY_CALCULATOR_FAQ } = await import("../src/lib/research/communityCalculatorSeo2029.js");
  for (const text of [COMMUNITY_CALCULATOR_SEO.title, COMMUNITY_CALCULATOR_SEO.heading, COMMUNITY_CALCULATOR_SEO.description]) assert.ok(text.startsWith("מחשבון גימטריה"), text);
  assert.match(COMMUNITY_CALCULATOR_SEO.title, /לשמות/);
  assert.match(COMMUNITY_CALCULATOR_SEO.description, /שמות|שם/);
  const pair = COMMUNITY_CALCULATOR_FAQ.find(item => /שני שמות/.test(item.q));
  assert.match(pair.a, /לא ניבוי/);
});

test("a personal card never offers the reviewed negative phrases, and never mistakes a longer word for one", async () => {
  const { communityCardSuitable, communityEqualsSelection } = await import("../src/lib/research/communityCalculatorEquals2029.js");
  for (const phrase of ["בלעם הרשע בימינו", "גיהנום", "השטן נחש", "מלאך המות", "בלע המות לנצח", "עבודה זרה", "אלהים אחרים", "הנחש הקדמון", "ארור המן", "קבר", "ויצר הרע"])
    assert.equal(communityCardSuitable(phrase), false, phrase);
  for (const phrase of ["משה", "נשמת כל חי", "שמות בני ישראל", "חכמת יהוה", "הכרת הטוב", "קודם כל תשובה", "עץ הדעת טוב", "אהבה", "חמל"])
    assert.equal(communityCardSuitable(phrase), true, phrase);
  // lead rank first, then fewer words, then the reader's order
  const ordered = communityEqualsSelection([{ phrase: "בית יער הלבנון" }, { phrase: "גיהנום" }, { phrase: "אור", leadRank: null }, { phrase: "תורה ומצוות", leadRank: 1 }, { phrase: "שלום" }], "x");
  assert.deepEqual([...ordered.top, ...ordered.more].map(row => row.phrase), ["תורה ומצוות", "אור", "שלום", "בית יער הלבנון"]);
});
