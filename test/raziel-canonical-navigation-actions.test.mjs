// RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1 — one deterministic navigation resolver for the 2029 site and WhatsApp.
// Zero model calls, no URL from model output, a verified focus or a short question (never a guessed number).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  RAZIEL_NAVIGATION_ASK_NUMBER,
  RAZIEL_NAVIGATION_INTENT,
  RAZIEL_NAVIGATION_ROUTES,
  isCanonicalRazielNavigationHref,
  normalizeRazielNavigationAction,
  parseRazielNavigationRequest,
  razielFocusNumberFromCanonicalLink,
  razielFocusSubjectFromUserText,
  razielNavigationIsClarification,
  razielNavigationNeedsFocus,
  razielNavigationUrl,
  razielNavigationWhatsappText,
  razielNumberPageHref,
  razielWhatsappVerifiedFocus,
  resolveRazielNavigationAction,
  resolveRazielNavigationFollowUp,
} from "../supabase/functions/_shared/razielNavigationActions.js";
import {
  createRazielNavigationTurnSucceededAction,
  prepareRazielSessionSubmission,
  resolveRazielNavigationTurn,
  selectRazielVerifiedNumberFocus,
} from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "../src/lib/research/razielSession2029.js";
import { razielNavigationButton } from "../src/components/experience2029/razielSessionSeam2029.js";
import { numberExpressionFocusHref } from "../src/lib/research/numberExpressionFocus.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const SITE = "https://sod1820.co.il";
const focus = (number, source = "conversation") => ({ number, source });

// ── 1. Phrase matrix (every required wording) ───────────────────────────────────────────────────────────────────────
const MATRIX = [
  // [utterance, focus, expected intent, expected href]
  ["תן לי את דף המספר 73", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/73"],
  ["פתח את המספר 337 באתר", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/337"],
  ["לינק לדף המספר 73", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/73"],
  ["תן לי לינק לדף המספר באתר", focus(73), RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/73"],
  ["פתח לי את דף המספר", focus(337), RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/337"],
  ["פתח את העולם", null, RAZIEL_NAVIGATION_INTENT.WORLD, "/world"],
  ["קח אותי לעולם", null, RAZIEL_NAVIGATION_INTENT.WORLD, "/world"],
  ["פתח את מפת המחקר", focus(73), RAZIEL_NAVIGATION_INTENT.RESEARCH_MAP, "/2029/number/73"],
  ["קח אותי לביטויים של המספר הזה", focus(73), RAZIEL_NAVIGATION_INTENT.NUMBER_EXPRESSIONS, "/2029/number/73"],
  // natural variants
  ["רזיאל, תן לי בבקשה את דף המספר 1820", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/1820"],
  ["אפשר לקבל קישור לדף המספר 73?", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/73"],
  ["אני רוצה לראות את דף המספר 718", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/718"],
  ["קחי אותי לדף המספר", focus(26), RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/26"],
  ["תפתח את המספר הזה", focus(26), RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/26"],
  ["קח אותי לביטויים של 73", null, RAZIEL_NAVIGATION_INTENT.NUMBER_EXPRESSIONS, "/2029/number/73"],
  ["פתח את מפת המחקר של 337", null, RAZIEL_NAVIGATION_INTENT.RESEARCH_MAP, "/2029/number/337"],
  ["לינק ל־73", null, RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, "/2029/number/73"],
];

test("every required wording resolves deterministically to a canonical href", () => {
  for (const [text, verified, intent, href] of MATRIX) {
    const request = parseRazielNavigationRequest(text);
    assert.ok(request, `parsed: ${text}`);
    const action = resolveRazielNavigationAction({ request, focus: verified });
    assert.equal(action.type, "navigate", text);
    assert.equal(action.intent, intent, text);
    assert.equal(action.href, href, text);
    assert.equal(action.model_calls, 0, text);
    assert.ok(isCanonicalRazielNavigationHref(action.href), text);
    assert.match(action.message, /^בשמחה/u, `warm one-liner: ${text}`);
  }
});

test("requests that are not navigation (questions, information, mixed asks, negations) fall through to Raziel", () => {
  for (const text of [
    "מה זה 73", "תן לי את המספר 73", "מה המשמעות של דף המספר", "איך פותחים את דף המספר", "אל תפתח את דף המספר 73",
    "פתח את דף המספר 73 ותסביר לי מה הוא אומר", "פתח את דף המספר 73 ו 337", "דף 73 בגמרא", "שלום", "תחקור את 73",
    "מה הלינק של דף המספר", "ביטויים של 73", "תן לי את העולם", "איפה העולם", "", null,
  ]) assert.equal(parseRazielNavigationRequest(text), null, String(text));
});

test("a missing number never opens a page: the exact short question is asked", () => {
  for (const [text, verified] of [
    ["פתח לי את דף המספר", null],
    ["תן לי לינק לדף המספר באתר", null],
    ["קח אותי לביטויים של המספר הזה", null],
    ["פתח את מפת המחקר", null],
    ["פתח את מפת המחקר של המספר הזה", null],
    ["תן לי לינק לדף המספר", { number: 0, source: "conversation" }],
    ["תן לי לינק לדף המספר", { number: 1000000, source: "conversation" }],
    ["תן לי לינק לדף המספר", { number: "73abc", source: "conversation" }],
  ]) {
    const action = resolveRazielNavigationAction({ text, focus: verified });
    assert.equal(action.type, "clarify", text);
    assert.equal(action.message, RAZIEL_NAVIGATION_ASK_NUMBER, text);
    assert.equal(action.href, undefined, text);
    assert.equal(razielNavigationWhatsappText(action, SITE), RAZIEL_NAVIGATION_ASK_NUMBER);
  }
  assert.equal(RAZIEL_NAVIGATION_ASK_NUMBER, "לאיזה מספר תרצה שאפתח דף?");
});

test("an explicit number outside 1..999999 or with a leading zero never opens a different number", () => {
  for (const text of ["פתח את דף המספר 0", "פתח את דף המספר 1000000", "פתח את דף המספר 073", "תן לי את דף המספר 99999999"]) {
    const action = resolveRazielNavigationAction({ text, focus: focus(73) });
    assert.equal(action.type, "clarify", text);
    assert.equal(action.reason, "invalid_number", text);
    assert.match(action.message, /לאיזה מספר תרצה שאפתח דף\?$/u);
  }
  // explicit wins over any focus; an ambiguous focus asks
  assert.equal(resolveRazielNavigationAction({ text: "פתח את דף המספר 5", focus: focus(73) }).href, "/2029/number/5");
  assert.equal(resolveRazielNavigationAction({ text: "פתח לי את דף המספר", focus: { ambiguous: true } }).reason, "ambiguous_number");
});

test("clarification follow-up: a bare numeral answers the question, nothing else does", () => {
  assert.equal(razielNavigationIsClarification(RAZIEL_NAVIGATION_ASK_NUMBER), true);
  assert.equal(razielNavigationIsClarification("בשמחה — הנה דף המספר 73."), false);
  assert.equal(resolveRazielNavigationFollowUp({ text: "73" }).href, "/2029/number/73");
  assert.equal(resolveRazielNavigationFollowUp({ text: "המספר 337?" }).href, "/2029/number/337");
  assert.equal(resolveRazielNavigationFollowUp({ text: "0" }).type, "clarify");
  assert.equal(resolveRazielNavigationFollowUp({ text: "מה זה 73" }), null);
  assert.equal(resolveRazielNavigationFollowUp({ text: "73 ו 74" }), null);
});

// ── 2. Canonical routes: the table is pinned to the real router and to the existing builders ───────────────────────
test("hrefs come only from the closed table, which mirrors App2029 and the existing number href builder", () => {
  const app = read("src/App2029.jsx");
  assert.match(app, /<Route path="\/2029\/number\/:value"/);
  assert.match(app, /<Route path="\/world"/);
  for (const value of [1, 73, 337, 1820, 999999]) {
    assert.equal(RAZIEL_NAVIGATION_ROUTES.number(value), `/2029/number/${value}`);
    assert.equal(razielNumberPageHref(value), numberExpressionFocusHref(value));
  }
  assert.equal(razielNumberPageHref(0), null);
  assert.equal(razielNumberPageHref(1000000), null);
  assert.equal(razielNumberPageHref("7x"), null);
  for (const bad of ["/2029/number/0", "/2029/number/073", "/2029/number/1000000", "/2029/number/7?x=1", "/number/7", "//evil.example", "https://evil.example/2029/number/7", "/world/x", "javascript:alert(1)", "", null, 7]) {
    assert.equal(isCanonicalRazielNavigationHref(bad), false, String(bad));
  }
  // the lazy submit adapter's pre-existing "open_number" shape is the same shape
  assert.match(read("src/lib/research/razielSessionRequest2029.js"), /\^\\\/2029\\\/number\\\/\(\[1-9\]\\d\{0,5\}\)\$/);
});

test("no hardcoded URL, no model/network/db call and no Preview origin inside the shared resolver", () => {
  const source = read("supabase/functions/_shared/razielNavigationActions.js");
  assert.doesNotMatch(source, /fetch\(|ANTHROPIC|ai-analyze|supabase\.|createClient|Deno\.|process\.env|import\s/);
  assert.doesNotMatch(source, /https?:\/\/(?!canonical)/);
  assert.doesNotMatch(source, /sod1820\.co\.il|preview-deploy/);
});

// ── 3. Verified conversation focus on the site ──────────────────────────────────────────────────────────────────────
const userTurn = (text, identities) => ({ role: "user", text, ...(identities ? { identity_resolution: { identities } } : {}) });
const numberId = (value) => ({ type: "number", value, identity_key: `number:${value}` });
const razielTurn = (extra = {}) => ({ role: "raziel", text: "תשובה", level: "fast", ...extra });
const calc = (expression, method, value) => ({ expression, method, value, href: `/2029/number/${value}` });
const evidence = (...calculations) => ({ calculations, findings: [] });

test("after a conversation about 73 the page of the number is 73; after שאול=337 it is 337", () => {
  const about73 = [userTurn("מה זה 73", [numberId(73)]), razielTurn()];
  assert.deepEqual(selectRazielVerifiedNumberFocus({ thread: about73 }), { number: 73, source: "conversation" });
  assert.equal(resolveRazielNavigationTurn({ question: "תן לי לינק לדף המספר באתר", state: { thread: about73 } }).href, "/2029/number/73");

  const aboutSaul = [
    userTurn("מה זה שאול", [{ type: "phrase", label: "שאול", identity_key: "phrase:שאול" }]),
    razielTurn({ evidenceSummary: evidence(calc("שאול", "רגיל", 337)) }),
  ];
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: aboutSaul } }).href, "/2029/number/337");

  // all-methods evidence: the regular-method value is the focus
  const allMethods = [razielTurn({ evidenceSummary: evidence(calc("שאול", "רגיל", 337), calc("שאול", "גדול", 337), calc("שאול", "מספר קטן", 4)) })];
  assert.equal(selectRazielVerifiedNumberFocus({ thread: allMethods }).number, 337);
});

test("the latest verified focus wins, and a page Raziel opened itself carries its number forward", () => {
  const thread = [
    userTurn("73", [numberId(73)]), razielTurn(),
    userTurn("מה זה 337", [numberId(337)]), razielTurn(),
  ];
  assert.equal(selectRazielVerifiedNumberFocus({ thread }).number, 337);
  const opened = createRazielNavigationTurnSucceededAction({
    state: razielSessionReducer(createInitialRazielSessionState(), { type: "turn_started", turn: { id: "t1", question: "פתח את המספר 1820" }, contextSnapshot: null }),
    navigation: resolveRazielNavigationAction({ text: "פתח את המספר 1820" }),
    completedAt: "2026-10-26T00:00:00.000Z",
  });
  assert.equal(selectRazielVerifiedNumberFocus({ thread: opened.patch.thread }).number, 1820);
});

test("no verified number means a question: ambiguity, unverified phrases and stale numbers never open a page", () => {
  // two subjects in the last turn
  assert.deepEqual(selectRazielVerifiedNumberFocus({ thread: [userTurn("מה הקשר בין 73 ל 337", [numberId(73), numberId(337)])] }), { ambiguous: true });
  assert.equal(resolveRazielNavigationTurn({ question: "פתח את דף המספר", state: { thread: [userTurn("מה הקשר בין 73 ל 337", [numberId(73), numberId(337)])] } }).reason, "ambiguous_number");
  // pair evidence: two regular-method values
  assert.deepEqual(selectRazielVerifiedNumberFocus({ thread: [razielTurn({ evidenceSummary: evidence(calc("א", "רגיל", 1), calc("ב", "רגיל", 2)) })] }), { ambiguous: true });
  // an expression asked after 73 whose value was not verified: do not reach back to 73
  const phraseAfter73 = [
    userTurn("73", [numberId(73)]), razielTurn(),
    userTurn("מה זה דוד", [{ type: "phrase", label: "דוד", identity_key: "phrase:דוד" }]), razielTurn(),
  ];
  assert.equal(selectRazielVerifiedNumberFocus({ thread: phraseAfter73 }), null);
  const asked = resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: phraseAfter73 } });
  assert.equal(asked.type, "clarify");
  assert.equal(asked.message, RAZIEL_NAVIGATION_ASK_NUMBER);
  // model prose in a reply is never a source: a raziel message with no evidence yields nothing
  assert.equal(selectRazielVerifiedNumberFocus({ thread: [razielTurn({ text: "המספר 999 הוא מיוחד" })] }), null);
  // empty thread, no surface
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: [] } }).message, RAZIEL_NAVIGATION_ASK_NUMBER);
});

test("the surface number subject is the fallback only when the thread has no subject of its own", () => {
  const contextSnapshot = { surface: "number", subject: { type: "number", id: "718", label: "718" }, focus: {} };
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: [] }, contextSnapshot }).href, "/2029/number/718");
  const conversation = [userTurn("73", [numberId(73)]), razielTurn()];
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: conversation }, contextSnapshot }).href, "/2029/number/73");
  const nonNumberSurface = { surface: "post", subject: { type: "post", id: "post-1", label: "פוסט" }, focus: {} };
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: [] }, contextSnapshot: nonNumberSurface }).type, "clarify");
});

test("a clarification answered with a bare numeral opens that page on the next site turn", () => {
  let state = razielSessionReducer(createInitialRazielSessionState(), { type: "turn_started", turn: { id: "t1", question: "פתח לי את דף המספר" }, contextSnapshot: null });
  const clarify = resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state });
  assert.equal(clarify.type, "clarify");
  state = razielSessionReducer(state, createRazielNavigationTurnSucceededAction({ state, navigation: clarify, completedAt: "t" }));
  assert.equal(razielNavigationButton(state.thread.at(-1)), null);
  assert.equal(resolveRazielNavigationTurn({ question: "73", state }).href, "/2029/number/73");
  // an ordinary number message with no pending question stays an ordinary Raziel turn
  assert.equal(resolveRazielNavigationTurn({ question: "73", state: { thread: [] } }), null);
});

// ── 4. Site button == WhatsApp link, same truth ─────────────────────────────────────────────────────────────────────
test("the site button and the WhatsApp link are two renderings of one resolved action", () => {
  for (const [text, verified] of MATRIX) {
    const action = resolveRazielNavigationAction({ text, focus: verified });
    const site = normalizeRazielNavigationAction(action);
    const message = createRazielNavigationTurnSucceededAction({
      state: razielSessionReducer(createInitialRazielSessionState(), { type: "turn_started", turn: { id: "t", question: text }, contextSnapshot: null }),
      navigation: action,
      completedAt: "t",
    }).patch.thread.at(-1);
    const button = razielNavigationButton(message);
    assert.ok(button, text);
    assert.equal(button.href, site.href);
    assert.equal(message.text, action.message);
    const wa = razielNavigationWhatsappText(action, SITE);
    assert.equal(wa, `${action.message}\n${SITE}${button.href}`, text);
    assert.match(wa, /^[^\n]+\nhttps:\/\/sod1820\.co\.il\/(?:2029\/number\/[1-9]\d{0,5}|world)$/u, text);
  }
});

test("WhatsApp never carries a Preview, http, relative or non-canonical link", () => {
  const action = resolveRazielNavigationAction({ text: "תן לי את דף המספר 73" });
  for (const origin of ["https://sod1820-git-branch-team.vercel.app", "https://preview.sod1820.co.il", "http://sod1820.co.il", "not a url", "", "https://localhost:3000"]) {
    assert.equal(razielNavigationUrl(action.href, origin), "", origin);
    assert.equal(razielNavigationWhatsappText(action, origin), "", origin);
  }
  assert.equal(razielNavigationUrl("https://evil.example/x", SITE), "");
  assert.equal(razielNavigationUrl("/2029/number/73?x=1", SITE), "");
  assert.equal(razielNavigationUrl("/2029/number/73", SITE), `${SITE}/2029/number/73`);
  assert.match(read("supabase/functions/wa-raziel/index.ts"), /const SITE = "https:\/\/sod1820\.co\.il"/);
});

test("a stored or spoofed message can only render a button for a canonical href", () => {
  const good = { role: "raziel", navigationAction: { href: "/2029/number/73", label: "פתח את דף המספר 73", intent: "number_page" } };
  assert.deepEqual(razielNavigationButton(good), { href: "/2029/number/73", label: "פתח את דף המספר 73", intent: "number_page" });
  for (const href of ["https://evil.example", "//evil.example", "/2029/number/0", "/admin", "javascript:alert(1)", "/2029/number/73/extra"]) {
    assert.equal(razielNavigationButton({ ...good, navigationAction: { ...good.navigationAction, href } }), null, href);
  }
  assert.equal(razielNavigationButton({ ...good, role: "user" }), null);
  assert.equal(razielNavigationButton({ role: "raziel", navigationAction: { href: "/world", label: "" } }), null);
  assert.equal(normalizeRazielNavigationAction({ ...good.navigationAction, version: "x" }), null);
});

// ── 5. Zero model calls ─────────────────────────────────────────────────────────────────────────────────────────────
test("site: a navigation turn is prepared without a request, so the transport is never reached", () => {
  for (const [text, verified] of MATRIX) {
    const thread = verified ? [userTurn(String(verified.number), [numberId(verified.number)]), razielTurn()] : [];
    const prepared = prepareRazielSessionSubmission({
      question: text,
      state: { ...createInitialRazielSessionState(), thread },
      researchContext: null,
      startedAt: "2026-10-26T00:00:00.000Z",
      createTurnId: () => "turn-nav",
    });
    assert.ok(prepared.navigation, text);
    assert.equal(prepared.request, null, text);
    assert.equal(prepared.navigation.model_calls, 0, text);
  }
  // continuations/deepening of a previous answer are never treated as navigation
  const again = prepareRazielSessionSubmission({
    question: "פתח את דף המספר 73", again: true, state: createInitialRazielSessionState(), researchContext: null,
    startedAt: "t", createTurnId: () => "t",
  });
  assert.ok(again.request);
  assert.equal(again.navigation, undefined);
  // ordinary questions still build the canonical request
  const ordinary = prepareRazielSessionSubmission({ question: "מה זה 73", state: createInitialRazielSessionState(), researchContext: null, startedAt: "t", createTurnId: () => "t" });
  assert.ok(ordinary.request);
});

test("site provider: the navigation branch returns before the only transport call and never reuses the quota-bearing path", () => {
  const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
  const submit = provider.slice(provider.indexOf("const submit = useCallback"), provider.indexOf("const setViewMode = useCallback"));
  const nav = submit.indexOf("if (navigation)");
  const transport = submit.indexOf("await transport(request)");
  assert.ok(nav > 0 && nav < transport);
  assert.match(submit.slice(nav, transport), /return \{ ok: true, navigation \}/);
  assert.doesNotMatch(submit.slice(nav, transport), /transport\(/);
  assert.equal((submit.match(/await transport\(request\)/g) || []).length, 1);
  // the resolver lives in the lazy submit chunk only
  assert.doesNotMatch(provider, /razielNavigationActions/);
  assert.doesNotMatch(read("src/lib/research/razielSession2029.js"), /razielNavigationActions/);
  assert.match(read("src/lib/research/razielSessionRequest2029.js"), /_shared\/razielNavigationActions\.js/);
});

test("wa-raziel: navigation is answered before any ai-analyze/Anthropic call and with no model path of its own", () => {
  const source = read("supabase/functions/wa-raziel/index.ts");
  const start = source.indexOf("async function razielCoreRespond");
  const body = source.slice(start);
  assert.ok(body.indexOf("respondWithNavigation(cleanText, chatId, quotedId)") > 0);
  assert.ok(body.indexOf("respondWithNavigation(cleanText, chatId, quotedId)") < body.indexOf("beginRazielTrace"));
  assert.ok(body.indexOf("respondWithNavigation(cleanText, chatId, quotedId)") < body.indexOf("/functions/v1/ai-analyze"));
  // guarded to non-source turns
  assert.match(body.slice(0, body.indexOf("beginRazielTrace")), /if \(!hasSource\)/);
  const fnStart = source.indexOf("// ── RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1");
  const nav = source.slice(fnStart, start);
  assert.doesNotMatch(nav, /ai-analyze|api\.anthropic|ANTHROPIC|razielCoreRespond|rpc\("(?!fn_all_methods)/);
  assert.doesNotMatch(nav, /fetch\(/);
  // the only data read is the canonical engine RPC already used by this file
  assert.match(nav, /allMethods\(subject\.label\)/);
  // links are built by the shared builder from SITE only
  assert.match(nav, /razielNavigationWhatsappText\(action, SITE\)/);
  assert.doesNotMatch(nav, /https?:\/\//);
});

// ── 6. WhatsApp verified focus helpers ──────────────────────────────────────────────────────────────────────────────
test("WhatsApp focus comes from typed numerals, short gematria questions or a canonical page link Raziel sent", () => {
  assert.deepEqual(razielFocusSubjectFromUserText("73"), { kind: "number", value: 73 });
  assert.deepEqual(razielFocusSubjectFromUserText("מה זה 73?"), { kind: "number", value: 73 });
  assert.deepEqual(razielFocusSubjectFromUserText("המספר 337"), { kind: "number", value: 337 });
  assert.deepEqual(razielFocusSubjectFromUserText("מה הגימטריה של שאול?"), { kind: "expression", label: "שאול" });
  assert.deepEqual(razielFocusSubjectFromUserText("בדוק את שאול המלך"), { kind: "expression", label: "שאול המלך" });
  for (const text of ["שלום", "תודה", "מה זה דף המספר", "מה זה מפת המחקר", "תן לי את דף המספר 73", "פתח את המספר 73", "מה הקשר בין 73 ל 337", "0", "1000000", "ספר לי על המלך דוד ועל בניו ועל כל מה שקרה", ""]) {
    assert.equal(razielFocusSubjectFromUserText(text), null, text);
  }
  assert.equal(razielFocusNumberFromCanonicalLink(`בשמחה — הנה דף המספר 73. 🌳\n${SITE}/2029/number/73`, SITE), 73);
  assert.equal(razielFocusNumberFromCanonicalLink(`${SITE}/2029/number/73?focus=%D7%A9`, SITE), 73);
  assert.equal(razielFocusNumberFromCanonicalLink("https://evil.example/2029/number/73", SITE), null);
  assert.equal(razielFocusNumberFromCanonicalLink(`${SITE}/2029/number/0`, SITE), null);
  assert.equal(razielFocusNumberFromCanonicalLink(`${SITE}/2029/number/73`, "http://sod1820.co.il"), null);
  assert.equal(razielNavigationNeedsFocus(parseRazielNavigationRequest("פתח את דף המספר 73")), false);
  assert.equal(razielNavigationNeedsFocus(parseRazielNavigationRequest("פתח לי את דף המספר")), true);
});

test("WhatsApp focus rejects nested foreign URLs and non-canonical number paths", () => {
  for (const text of [
    `${SITE}/2029/number/73/extra`,
    `${SITE}.evil.invalid/2029/number/73`,
    `https://evil.invalid/redirect?next=${SITE}/2029/number/73`,
    `${SITE}/2029/number/073`, `${SITE}/2029/number/1000000`,
  ]) assert.equal(razielFocusNumberFromCanonicalLink(text, SITE), null, text);
  assert.equal(razielFocusNumberFromCanonicalLink(`${SITE}/2029/number/337?source=chat#result`, SITE), 337);
});

test("the actual WhatsApp history adapter selects the newest focus regardless of API ordering", async () => {
  const source = read("supabase/functions/wa-raziel/index.ts");
  const historyAdapter = source.slice(source.indexOf("async function recentChatNewestFirst"), source.indexOf("async function respondWithNavigation"));
  const now = Math.floor(Date.now() / 1000);
  const rows = [
    { idMessage: "old", timestamp: now - 30, type: "incoming", textMessage: "73" },
    { idMessage: "new", timestamp: now - 10, type: "incoming", textMessage: "337" },
    { idMessage: "expired", timestamp: now - 7 * 3600, type: "incoming", textMessage: "999" },
    { idMessage: "current", timestamp: now, type: "incoming", textMessage: "פתח את דף המספר" },
  ];
  for (const history of [rows, [...rows].reverse(), [rows[1], rows[3], rows[0], rows[2]]]) {
    let modelOrEngineCalls = 0;
    const adapter = vm.runInNewContext(`${historyAdapter}\n({recentChatNewestFirst,verifiedNavigationFocus});`, {
      waAdmin: async () => history, pick: value => value, Date,
      NAV_FOCUS_WINDOW_SEC: 6 * 3600, NAV_FOCUS_MESSAGES: 12, SITE,
      razielFocusNumberFromCanonicalLink, razielFocusSubjectFromUserText, razielWhatsappVerifiedFocus,
      allMethods: async () => { modelOrEngineCalls += 1; throw new Error("unexpected engine call"); },
    });
    const messages = await adapter.recentChatNewestFirst("fixture-chat", "current");
    assert.deepEqual(Array.from(messages, item => item.text), ["337", "73"]);
    const selected = await adapter.verifiedNavigationFocus("fixture-chat", "current");
    assert.equal(selected.number, 337);
    assert.equal(modelOrEngineCalls, 0);
  }
});
test("the thread renders the button from the validated seam helper and offers no research one-shots on a navigation answer", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /razielNavigationButton\(m\)\.href/);
  const oneShots = read("src/components/experience2029/RazielOneShotActions2029.jsx");
  assert.match(oneShots, /if \(latestRaziel\?\.navigationAction \|\| latestRaziel\?\.navigationClarify\) return null;/);
  assert.ok(oneShots.indexOf("useState") < oneShots.indexOf("latestRaziel?.navigationAction"), "early return stays after every hook");
  assert.match(read("src/components/experience2029/systemFrame2029.css"), /\.sod29-raziel-nav-action \.sod29-action \{[^}]*overflow-wrap: anywhere/);
});

// ── Adaptation over the personal-area companion base ────────────────────────────────────────────────────────────────
import {
  RAZIEL_PERSONAL_AREA_COMPANION_ACTION,
  RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT,
} from "../src/lib/research/razielSessionRequest2029.js";

test("owner decision: 'מפת המחקר' never resolves to /world; only an explicit request for the world does", () => {
  const withNumber = resolveRazielNavigationAction({ text: "פתח את מפת המחקר", focus: focus(73) });
  assert.equal(withNumber.href, "/2029/number/73");
  const without = resolveRazielNavigationAction({ text: "פתח את מפת המחקר", focus: null });
  assert.equal(without.type, "clarify");
  assert.equal(without.message, RAZIEL_NAVIGATION_ASK_NUMBER);
  for (const text of ["פתח את מפת המחקר", "קח אותי למפת המחקר", "לינק למפת המחקר"]) {
    const action = resolveRazielNavigationAction({ text, focus: null });
    assert.notEqual(action.href, "/world", text);
  }
  assert.equal(resolveRazielNavigationAction({ text: "פתח את העולם" }).href, "/world");
  assert.equal(resolveRazielNavigationAction({ text: "קח אותי לעולם", focus: focus(73) }).href, "/world");
  assert.equal(razielNavigationNeedsFocus(parseRazielNavigationRequest("פתח את העולם")), false);
});

test("precedence: the personal-area companion action and every continuation are decided before navigation", () => {
  const companion = {
    id: RAZIEL_PERSONAL_AREA_COMPANION_ACTION,
    capability: "hint_review",
    focus: "checked_hint",
    opaqueRefs: ["journey:journey_AbC12345"],
  };
  const base = { state: { ...createInitialRazielSessionState(), thread: [userTurn("73", [numberId(73)]), razielTurn()] }, researchContext: null, startedAt: "t", createTurnId: () => "t" };
  // a navigation-looking question can never turn a companion action into navigation
  const viaCompanion = prepareRazielSessionSubmission({ ...base, question: "פתח את דף המספר 73", companionAction: companion });
  assert.equal(viaCompanion.navigation, undefined);
  assert.equal(viaCompanion.request.companionAction.id, RAZIEL_PERSONAL_AREA_COMPANION_ACTION);
  assert.equal(viaCompanion.request.subject, RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT);
  // an invalid companion action fails closed instead of falling back to navigation
  assert.equal(prepareRazielSessionSubmission({ ...base, question: "פתח את דף המספר 73", companionAction: { id: "other" } }), null);
  // continuation / deepen / one-shot / view-mode override
  for (const extra of [{ again: true }, { continuationTurnId: "turn-1" }, { viewModeOverride: "landscape" }]) {
    const prepared = prepareRazielSessionSubmission({ ...base, question: "פתח את דף המספר 73", ...extra });
    assert.equal(prepared?.navigation, undefined, JSON.stringify(extra));
    assert.ok(prepared?.request, JSON.stringify(extra));
  }
  // only an ordinary explicit request is routed
  const ordinary = prepareRazielSessionSubmission({ ...base, question: "פתח את דף המספר 73" });
  assert.equal(ordinary.navigation.href, "/2029/number/73");
  assert.equal(ordinary.request, null);
  // the provider keeps one transport boundary, the abort controller, and the companion entry
  const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
  for (const needle of ["new AbortController()", "activeRequestRef.current?.abort()", "submitPersonalAreaCompanion", "companionAction,", "if (!mountedRef.current) return { ok: false, error: \"session_unmounted\" }"]) {
    assert.ok(provider.includes(needle), needle);
  }
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
});

test("private companion turns and unrelated messages never supply a navigation focus", () => {
  const companionThread = [
    { role: "user", text: RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT },
    razielTurn({ evidenceSummary: evidence(calc("שם פרטי", "רגיל", 4242)) }),
  ];
  assert.equal(selectRazielVerifiedNumberFocus({ thread: [userTurn("73", [numberId(73)]), razielTurn(), ...companionThread] }), null);
  assert.equal(resolveRazielNavigationTurn({ question: "פתח לי את דף המספר", state: { thread: companionThread } }).type, "clarify");
  // an unrelated user message (no resolved subject) ends the stretch even when an older turn had a number
  const unrelated = [userTurn("73", [numberId(73)]), razielTurn(), { role: "user", text: "ספר לי על הפרשה" }, razielTurn()];
  assert.equal(selectRazielVerifiedNumberFocus({ thread: unrelated }), null);
  // a navigation request keeps the topic
  const withNav = [userTurn("73", [numberId(73)]), razielTurn(), { role: "user", text: "תן לי את דף המספר" }, razielTurn()];
  assert.equal(selectRazielVerifiedNumberFocus({ thread: withNav }).number, 73);
});

test("WhatsApp focus is pure: continuous topic only (shared by the handler)", () => {
  const turn = (outgoing, text) => ({ outgoing, text });
  assert.deepEqual(razielWhatsappVerifiedFocus([turn(false, "מה זה 73"), turn(true, "תשובה")], SITE), { kind: "number", value: 73 });
  assert.equal(razielWhatsappVerifiedFocus([turn(false, "ספר לי על הפרשה"), turn(false, "מה זה 73")], SITE), null);
  assert.equal(razielWhatsappVerifiedFocus([turn(false, "מה שלומך היום"), turn(true, `${SITE}/2029/number/9`)], SITE), null);
  assert.deepEqual(razielWhatsappVerifiedFocus([turn(false, "תודה"), turn(true, `${SITE}/2029/number/9`)], SITE), { kind: "number", value: 9 });
  assert.deepEqual(razielWhatsappVerifiedFocus([turn(false, "מה הגימטריה של שאול"), turn(true, "337")], SITE), { kind: "expression", label: "שאול" });
  assert.equal(razielWhatsappVerifiedFocus([turn(false, "ספר לי על שאול"), turn(true, "337")], SITE), null, "a generic 'tell me about' is not a gematria subject");
  assert.equal(razielWhatsappVerifiedFocus([], SITE), null);
  assert.equal(razielWhatsappVerifiedFocus([turn(false, ""), turn(false, "מה זה 73")], SITE), null,
    "captionless incoming media ends an older numerical topic");
});

test("handler tests execute the real wa-raziel source", () => {
  const helper = read("test/helpers/wa-raziel-handler.mjs");
  assert.match(helper, /supabase\/functions\/wa-raziel\/index\.ts/);
  assert.match(helper, /runInNewContext/);
  assert.match(read("test/raziel-wa-navigation-handler.test.mjs"), /runWaRaziel/);
});
