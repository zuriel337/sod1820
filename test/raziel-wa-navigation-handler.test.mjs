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

test("a numeral answers Raziel's own question, and only then", async () => {
  let run = await runWaRaziel({ incoming: { id: "in", text: "המספר 73" }, history: [u("פתח לי את דף המספר", 120), r(ASK, 110)] });
  assert.equal(only(run).split("\n").at(-1), link(73));
  assert.equal(run.aiCalls.length, 0);
  // not after some other Raziel message: it is an ordinary turn for the model
  run = await runWaRaziel({ incoming: { id: "in", text: "המספר 73" }, history: [r("שלום, אני רזיאל", 110)] });
  assert.equal(run.aiCalls.length, 1);
  assert.doesNotMatch(only(run), /sod1820\.co\.il/);
  // Pre-existing handler gate (unchanged here): a message with no Hebrew letters at all, such as a bare "73", is not processed.
  run = await runWaRaziel({ incoming: { id: "in", text: "73" }, history: [u("פתח לי את דף המספר", 120), r(ASK, 110)] });
  assert.deepEqual([run.sent.length, run.aiCalls.length, run.body.replied], [0, 0, 0]);
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
