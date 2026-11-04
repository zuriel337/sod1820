// RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1 — the REAL wa-raziel handler, executed end to end with synthetic Supabase,
// Green API and ai-analyze. Not a source/syntax check: messages go in, WhatsApp sends and model calls come out.
import test from "node:test";
import assert from "node:assert/strict";
import { runWaRaziel, WA_SITE } from "./helpers/wa-raziel-handler.mjs";

const ASK = "לאיזה מספר תרצה שאפתח דף?";
const u = (text, ageSec) => ({ outgoing: false, text, ageSec });
const r = (text, ageSec) => ({ outgoing: true, text, ageSec });
const link = (n) => `${WA_SITE}/2029/number/${n}`;
const only = (run) => { assert.equal(run.sent.length, 1, JSON.stringify(run.sent)); return run.sent[0].message; };

test("explicit navigation wordings: one warm sentence plus one https link, zero model calls", async () => {
  for (const [text, href] of [
    ["תן לי את דף המספר 73", link(73)],
    ["פתח את המספר 337 באתר", link(337)],
    ["לינק לדף המספר 73", link(73)],
    ["רזיאל, תן לי בבקשה לינק לדף המספר 1820", link(1820)],
    ["פתח את העולם", `${WA_SITE}/world`],
  ]) {
    const run = await runWaRaziel({ incoming: { id: "in1", text } });
    const message = only(run);
    assert.match(message, /^בשמחה/u, text);
    assert.equal(message.split("\n").at(-1), href, text);
    assert.equal(run.sent[0].quotedMessageId, "in1");
    assert.equal(run.aiCalls.length, 0, `no model call: ${text}`);
    assert.deepEqual(run.otherFetches, [], `no other I/O: ${text}`);
    assert.equal(run.body.replied, 1);
    assert.equal(run.body.trace[0].model_calls, 0);
  }
});

test("continuation: the last continuous topic supplies the number (typed numeral, or a gematria value from the canonical RPC)", async () => {
  let run = await runWaRaziel({ incoming: { id: "in", text: "תן לי לינק לדף המספר באתר" }, history: [u("מה זה 73", 300), r("73 הוא מספר מעניין…", 290)] });
  assert.equal(only(run).split("\n").at(-1), link(73));
  assert.equal(run.aiCalls.length, 0);

  run = await runWaRaziel({
    incoming: { id: "in", text: "פתח לי את דף המספר" },
    history: [u("מה הגימטריה של שאול", 300), r("שאול בגימטריה שווה 337.", 290)],
    methods: { "שאול": { "רגיל": 337 } },
  });
  assert.equal(only(run).split("\n").at(-1), link(337));
  assert.deepEqual(run.methodLookups, ["שאול"], "the value comes from the existing canonical engine RPC, never from Raziel prose");
  assert.equal(run.aiCalls.length, 0);

  // Raziel's own earlier page link is a verified focus; thanks/greetings do not end the topic
  run = await runWaRaziel({ incoming: { id: "in", text: "קח אותי לביטויים של המספר הזה" }, history: [r(`בשמחה — הנה דף המספר 26. 🌳\n${link(26)}`, 400), u("תודה", 100)] });
  assert.equal(only(run).split("\n").at(-1), link(26));
});

test("an unrelated conversation ends the topic: no old number is reused, Raziel asks", async () => {
  for (const history of [
    [u("מה זה 73", 900), r("תשובה על 73", 890), u("ספר לי על הפרשה של השבוע", 300), r("זו פרשה יפה", 290)],
    [u("73", 900), r("תשובה", 890), u("מה שלומך היום ומה אתה עושה", 200)],
    [r(`${link(73)}`, 900), u("איך מכינים עוגת שוקולד טובה", 100)],
    [u("מה זה 73", 900), r("תשובה על 73", 890), u("", 100)],
  ]) {
    const run = await runWaRaziel({ incoming: { id: "in", text: "פתח לי את דף המספר" }, history });
    assert.equal(only(run), ASK);
    assert.equal(run.aiCalls.length, 0);
    assert.equal(run.methodLookups.length, 0);
  }
  // a topic older than the recency window is not a focus either
  const stale = await runWaRaziel({ incoming: { id: "in", text: "פתח לי את דף המספר" }, history: [u("מה זה 73", 8 * 3600)] });
  assert.equal(only(stale), ASK);
  // history order must not matter (Green may return either order)
  const shuffled = await runWaRaziel({ incoming: { id: "in", text: "פתח לי את דף המספר" }, history: [r("תשובה", 290), u("מה זה 73", 300)].reverse() });
  assert.equal(only(shuffled).split("\n").at(-1), link(73));
});

test("no number: the short question, never a guessed or wrong page", async () => {
  for (const text of ["פתח לי את דף המספר", "תן לי לינק לדף המספר באתר", "קח אותי לביטויים של המספר הזה", "פתח את מפת המחקר", "פתח את דף המספר 0", "פתח את דף המספר 1000000"]) {
    const run = await runWaRaziel({ incoming: { id: "in", text } });
    const message = only(run);
    assert.doesNotMatch(message, /https?:\/\//, text);
    assert.ok(message.endsWith(ASK), text);
    assert.equal(run.aiCalls.length, 0, text);
  }
});

const silent = (run, label) => {
  assert.deepEqual([run.sent.length, run.aiCalls.length, run.body.replied, run.methodLookups.length], [0, 0, 0, 0], label);
  assert.deepEqual(run.otherFetches, [], label);
};

test("numeral-only entry gate: page request without a number → clarification → \"73\" → canonical link, 0 model calls", async () => {
  const ask = await runWaRaziel({ incoming: { id: "q1", text: "פתח לי את דף המספר" } });
  assert.equal(only(ask), ASK);
  assert.equal(ask.aiCalls.length, 0);
  const answer = await runWaRaziel({ incoming: { id: "q2", text: "73" }, history: [u("פתח לי את דף המספר", 120), r(ask.sent[0].message, 110)] });
  const message = only(answer);
  assert.match(message, /^בשמחה/u);
  assert.equal(message.split("\n").at(-1), link(73));
  assert.equal(answer.sent[0].quotedMessageId, "q2");
  assert.equal(answer.aiCalls.length, 0);
  assert.deepEqual(answer.otherFetches, []);
  assert.equal(answer.body.trace[0].model_calls, 0);
  // surrounding whitespace and the range edges are canonical numerals too
  for (const [text, n] of [[" 73 ", 73], ["1", 1], ["999999", 999999]]) {
    const run = await runWaRaziel({ incoming: { id: "q", text }, history: [r(ASK, 60)] });
    assert.equal(only(run).split("\n").at(-1), link(n), text);
    assert.equal(run.aiCalls.length, 0, text);
  }
});

test("numeral-only entry gate: leading zero, zero and out-of-range values are dropped exactly as before — no link, no Raziel, no model", async () => {
  for (const text of ["00073", "073", "0", "000", "1000000", "999999999999", "1234567"]) {
    silent(await runWaRaziel({ incoming: { id: "q", text }, history: [u("פתח לי את דף המספר", 120), r(ASK, 110)] }), text);
  }
});

test("numeral-only entry gate: \"73\" without a clarification right before it never starts anything", async () => {
  const cases = {
    "no history": [],
    "another Raziel message": [r("שלום, אני רזיאל", 110)],
    "clarification older than the window": [r(ASK, 8 * 3600)],
    "the page link itself": [r(`בשמחה — הנה דף המספר 5. 🌳\n${link(5)}`, 110)],
    "other Raziel message after the clarification": [r(ASK, 200), r("עוד משהו מרזיאל", 100)],
  };
  for (const [label, history] of Object.entries(cases)) silent(await runWaRaziel({ incoming: { id: "q", text: "73" }, history }), label);
});

test("numeral-only entry gate: any user message between the clarification and the numeral cancels the context", async () => {
  const between = {
    "unrelated Hebrew message": u("מה שלומך היום", 60),
    "another page request": u("פתח לי את דף המספר", 60),
    "captionless media": { outgoing: false, text: "", ageSec: 60 },
    "a numeral": u("5", 60),
  };
  for (const [label, message] of Object.entries(between)) {
    silent(await runWaRaziel({ incoming: { id: "q", text: "73" }, history: [u("פתח לי את דף המספר", 120), r(ASK, 110), message] }), label);
  }
});

test("ordinary Hebrew messages behave as before (model once, no link) — the numeral rule does not touch them", async () => {
  for (const [text, history] of [
    ["מה זה 73", []],
    ["המספר 73", [r("שלום, אני רזיאל", 110)]],
    ["המספר 73", [r(ASK, 110), u("מה שלומך היום", 60)]],     // unrelated message cancels the clarification for Hebrew wording too
    ["תודה רבה על העזרה", [r(ASK, 110)]],
  ]) {
    const run = await runWaRaziel({ incoming: { id: "q", text }, history });
    assert.equal(run.aiCalls.length, 1, `${text} / ${history.length}`);
    assert.doesNotMatch(only(run), /sod1820\.co\.il/, text);
  }
  // Hebrew wording of the answer still resolves while the question is the message right before it
  const answer = await runWaRaziel({ incoming: { id: "q", text: "המספר 73" }, history: [u("פתח לי את דף המספר", 120), r(ASK, 110)] });
  assert.equal(only(answer).split("\n").at(-1), link(73));
  assert.equal(answer.aiCalls.length, 0);
});

test("everything that is not an explicit navigation request still reaches the model exactly once", async () => {
  for (const text of ["מה זה 73", "תן לי את המספר 73", "איך פותחים את דף המספר", "פתח את דף המספר 73 ותסביר לי מה הוא אומר", "פתח את מפת המחקר ותסביר"]) {
    const run = await runWaRaziel({ incoming: { id: "in", text }, history: [u("מה זה 73", 300)] });
    assert.equal(run.aiCalls.length, 1, text);
    assert.doesNotMatch(only(run), /sod1820\.co\.il/, text);
  }
});

test("a link is never taken from model output, and the origin is the production site only", async () => {
  const run = await runWaRaziel({
    incoming: { id: "in", text: "מה זה 73" },
    aiText: "הנה https://evil.example/2029/number/9 ו־https://sod1820-git-x.vercel.app/2029/number/9",
  });
  // ordinary path: the prose is untouched, and no navigation link/focus was minted from it
  const follow = await runWaRaziel({ incoming: { id: "in2", text: "פתח לי את דף המספר" }, history: [u("מה זה 5", 400), r(run.sent[0].message, 390)] });
  assert.equal(only(follow).split("\n").at(-1), link(5));
  assert.doesNotMatch(only(follow), /evil\.example|vercel\.app/);
});
