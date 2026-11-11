import test from "node:test";
import assert from "node:assert/strict";
import { companionTabReducer, preferredCompanionTab } from "./companionTabPolicy2029.js";
import { extractHintClaim } from "./postSourceHintClaim2029.js";

const avail = { hasContext: true, hasSequence: true };

test("on a Post the context is preferred; elsewhere the feed", () => {
  assert.equal(preferredCompanionTab({ surface: "post", hasContext: true }), "ctx");
  assert.equal(preferredCompanionTab({ surface: "post", hasContext: false }), "feed");
  assert.equal(preferredCompanionTab({ surface: "world", hasContext: true }), "feed");
});

test("a reader's choice of updates or the event sequence is never replaced while reading", () => {
  let s = companionTabReducer({}, { type: "surface", surface: "post" }, avail);
  assert.deepEqual([s.tab, s.chosenByReader], ["ctx", false]);
  s = companionTabReducer(s, { type: "choose", tab: "feed" }, avail);
  for (const type of ["context-change", "feed-change", "sequence-change", "context-change"]) s = companionTabReducer(s, { type }, avail);
  assert.deepEqual([s.tab, s.chosenByReader], ["feed", true]);
  s = companionTabReducer(s, { type: "choose", tab: "seq" }, avail);
  s = companionTabReducer(s, { type: "context-change" }, avail);
  assert.equal(s.tab, "seq");
  assert.equal(companionTabReducer(s, { type: "choose", tab: "nonsense" }, avail).tab, "seq");
});

test("an unchosen tab follows availability; a chosen tab whose content vanished falls back without faking a choice; a new surface resets", () => {
  let s = companionTabReducer({}, { type: "surface", surface: "post" }, { hasContext: false, hasSequence: true });
  assert.equal(s.tab, "feed");
  s = companionTabReducer(s, { type: "context-change" }, avail);
  assert.equal(s.tab, "ctx");
  s = companionTabReducer(s, { type: "choose", tab: "seq" }, avail);
  s = companionTabReducer(s, { type: "sequence-change" }, { hasContext: true, hasSequence: false });
  assert.deepEqual([s.tab, s.chosenByReader], ["ctx", false]);
  s = companionTabReducer(companionTabReducer(s, { type: "choose", tab: "feed" }, avail), { type: "surface", surface: "post" }, avail);
  assert.deepEqual([s.tab, s.chosenByReader], ["ctx", false]);
});

test("an external hint claim is extracted as the SOURCE's claim only", () => {
  assert.deepEqual(extractHintClaim('566 בגימטריא: "משיח בן יוסף"\n901="ויעש הישר"'), { number: 566, phrase: "משיח בן יוסף" });
  assert.deepEqual(extractHintClaim("1237 = ״ביטוי לדוגמה״"), { number: 1237, phrase: "ביטוי לדוגמה" });
  assert.equal(extractHintClaim("סתם הודעה בלי מספר"), null);
  assert.equal(extractHintClaim(""), null);
});
