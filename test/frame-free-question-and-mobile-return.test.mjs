import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isFreeQuestionContext, contextSubjectRef, ENTRY_INTENT_FREE_QUESTION } from "../src/lib/research/freeQuestionContext.js";
import { resolveContextActions, resolveContextTools, CONTEXT_ACTION_KIND } from "../src/lib/research/contextualCapabilities.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const frameCss = read("src/components/experience2029/systemFrame2029.css");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const Q = "איפה מופיע פה אל פה במקרא?";
const questionContext = (extra = {}) => ({
  subject: { id: Q, type: "phrase", label: Q, href: "/heichal" },
  selection: { entityId: Q, entityType: "phrase" },
  dimensions: { entryIntent: ENTRY_INTENT_FREE_QUESTION, entryQuestion: Q, ...extra },
});

test("free question predicate: only while the subject IS the question", () => {
  assert.equal(isFreeQuestionContext(questionContext()), true);
  assert.equal(isFreeQuestionContext(questionContext({ entryExactExpression: true })), false);
  assert.equal(isFreeQuestionContext({ ...questionContext(), subject: { id: "פה אל פה", type: "phrase", label: "פה אל פה" } }), false);
  assert.equal(isFreeQuestionContext({ ...questionContext(), subject: { id: Q, type: "number", label: Q } }), false);
  assert.equal(isFreeQuestionContext({ subject: { id: "363", type: "number" } }), false);
  assert.equal(isFreeQuestionContext(null), false);
  assert.match(contextSubjectRef(questionContext()), /^שאלה חופשית: /);
  assert.equal(contextSubjectRef({ subject: { id: "363", type: "number", label: "363" } }), "number:363");
  assert.equal(contextSubjectRef(null), "");
});

test("frame turns a free question into a 'question' target: no number/gematria action in any contextual list", () => {
  assert.match(frame, /function targetFromContext\(context\) \{\n  \/\/ A free question is a question[^\n]*\n  if \(isFreeQuestionContext\(context\)\) \{\n    return \{ id: "free-question", type: "question"/);
  const target = { id: "free-question", type: "question", label: Q };
  for (const surface of ["heichal", "world", "system", "number"]) {
    assert.ok(!resolveContextActions({ surface, target }).some((a) => a.kind === CONTEXT_ACTION_KIND.CAPABILITY), `actions ${surface}`);
    assert.ok(!resolveContextTools({ surface, target }).some((a) => a.kind === CONTEXT_ACTION_KIND.CAPABILITY), `tools ${surface}`);
  }
  // the same target as a phrase WOULD offer the number capability (this is the defect being closed)
  assert.ok(resolveContextActions({ surface: "heichal", target: { ...target, type: "phrase" } }).some((a) => a.capability === "number"));
});

test("frame never saves, researches, focuses, shares or opens number for a question", () => {
  assert.match(frame, /if \(!normalized \|\| normalized\.type === "question"\) return null; \/\/ a free question is never an item to save or research/);
  assert.match(frame, /if \(normalizeTarget\(subject\)\?\.type === "question"\) return; \/\/ never run a capability on a free question/);
  assert.match(frame, /if \(normalized\?\.type === "question"\) return; \/\/ a question is not a number\/expression/);
  assert.match(frame, /if \(!normalized \|\| normalized\.type === "question"\) return;\n/);
  assert.match(frame, /\{isQuestion \? null : <div className="sod29-panel-actions-grid">/);
  assert.match(frame, /\{isQuestion \? null : <div className="sod29-canonical-share" data-share-owner="ShareActions">/);
  assert.match(frame, /שאלה חופשית · לא ביטוי לחישוב/);
  assert.doesNotMatch(frame, /\$\{context\??\.subject\.type\}:\$\{context\??\.subject\.label/); // never prints "phrase:<question>"
  assert.match(rail, /question: "שאלה חופשית"/);
});

test("exact return is reachable where the header return is hidden (<=980px): Action panel, same handler", () => {
  assert.match(frame, /onReturnExact = null,/);
  assert.match(frame, /data-exact-return="panel" onClick=\{onReturnExact\}/);
  assert.match(frame, /onRaziel=\{openRaziel\} razielLocked=\{razielLocked\} go=\{go\} onReturnExact=\{returnExact\} \/>/);
  assert.match(frame, /onReturnExact && context\?\.returnTo\?\.href/); // only when there is a stored destination
  assert.match(frameCss, /\.sod29-panel-return\{[^}]*min-block-size:44px/);
  assert.match(frameCss, /@media\(min-width:981px\)\{\.sod29-panel-return\{display:none\}\}/);
  // the header control stays the desktop owner and is untouched
  assert.match(frame, /className="sod29-header-return" type="button" onClick=\{returnExact\}/);
});
