import test from "node:test";
import assert from "node:assert/strict";
import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";

const ids = (out) => out.identity_resolution.identities.map((identity) => String(identity.value ?? identity.id ?? identity.label));

test("resolves a number pair even when human language continues after the pair", () => {
  const out = resolveRazielConversationTurn({ question: "מה ההבדל בין 337 ל 533 מצא לי קשרים" });
  assert.deepEqual(out.pair, [337, 533]);
  assert.equal(out.requested_action, "connect");
  assert.equal(out.referent_source, "explicit_current_turn");
});

test("carries the last explicit pair into a bounded follow-up without model inference", () => {
  const out = resolveRazielConversationTurn({
    question: "אתה יכול לבדוק?",
    thread: [{ role: "user", text: "מה ההבדל בין 337 ל 533 מצא לי קשרים" }],
  });
  assert.deepEqual(out.pair, [337, 533]);
  assert.equal(out.requested_action, "research");
  assert.equal(out.referential_follow_up, true);
  assert.equal(out.referent_source, "prior_user_turn");
  assert.equal(out.guards.no_model_inference, true);
});

test("carries canonical phrase identities with access and provenance intact", () => {
  const provenance = { owner: "project_codex.gematria_engine", ref: "phrase:messiah" };
  const access = { tier: "public" };
  const out = resolveRazielConversationTurn({
    question: "איזה מהממצאים חזק יותר?",
    thread: [{
      role: "user",
      text: "השווה ביניהם",
      identity_resolution: {
        explicit_text_computation: true,
        identities: [
          { type: "phrase", identity_key: "phrase:משיח", label: "משיח", provenance, access },
          { type: "phrase", identity_key: "phrase:מלך-ישראל", label: "מלך ישראל" },
        ],
      },
    }],
  });
  assert.deepEqual(ids(out), ["משיח", "מלך ישראל"]);
  assert.deepEqual(out.identity_resolution.identities[0].provenance, provenance);
  assert.deepEqual(out.identity_resolution.identities[0].access, access);
  assert.equal(out.identity_resolution.explicit_text_computation, true);
});

test("an explicit new topic does not inherit a previous number", () => {
  const out = resolveRazielConversationTurn({
    question: "מה זה גימטריה?",
    thread: [{ role: "user", text: "מה זה 776?" }],
  });
  assert.deepEqual(ids(out), []);
  assert.equal(out.referential_follow_up, false);
  assert.equal(out.referent_source, "none");
});

test("an explicit current number replaces prior referents when no anaphor is present", () => {
  const out = resolveRazielConversationTurn({
    question: "מה זה 1820?",
    thread: [{ role: "user", text: "מה ההבדל בין 337 ל 533" }],
  });
  assert.deepEqual(ids(out), ["1820"]);
  assert.equal(out.carried_identity_keys.length, 0);
  assert.equal(out.pair, null);
});

test("combines a bounded anaphor with one new explicit number", () => {
  const out = resolveRazielConversationTurn({
    question: "תבדוק את זה מול 1820",
    thread: [{ role: "user", text: "מה זה 776?" }],
  });
  assert.deepEqual(out.pair, [776, 1820]);
  assert.equal(out.referent_source, "mixed_prior_and_explicit");
});

test("uses the exact surface subject only for an explicit referential follow-up", () => {
  const out = resolveRazielConversationTurn({
    question: "תעמיק",
    surfaceSemantic: { surface: "number", subject: { type: "number", id: "787", label: "787" } },
  });
  assert.deepEqual(ids(out), ["787"]);
  assert.equal(out.referent_source, "surface_subject");
  assert.equal(out.requested_action, "research");
});

test("does not carry a surface subject into an unrelated new conversation turn", () => {
  const out = resolveRazielConversationTurn({
    question: "שלום רזיאל",
    surfaceSemantic: { surface: "number", subject: { type: "number", id: "787" } },
  });
  assert.deepEqual(ids(out), []);
  assert.equal(out.referent_source, "none");
});

test("counts, years and source quantities never become numeric research anchors", () => {
  for (const question of [
    "יש לי 2 שאלות",
    "תבדוק 3 מקורות על משיח",
    "מצא לי 2 קשרים למשיח",
    "מה הקשר בין שנת 2024 למשיח",
    "מה הקשר בין שנת 2024 ל 1820",
    "בדוק עמוד 33 במקור",
  ]) {
    const out = resolveRazielConversationTurn({ question });
    assert.deepEqual(ids(out), [], question);
  }
});

test("numeric pair grammar does not also invent a phrase identity", () => {
  const out = resolveRazielConversationTurn({ question: "מה ההבדל בין המספרים 337 ל 533" });
  assert.deepEqual(ids(out), ["337", "533"]);
  assert.deepEqual(out.identity_resolution.identities.map((identity) => identity.type), ["number", "number"]);
});

test("relation to one new number carries the prior subject", () => {
  const out = resolveRazielConversationTurn({
    question: "ומה הקשר ל־776?",
    thread: [{ role: "user", text: "מה זה 1820?" }],
  });
  assert.deepEqual(out.pair, [1820, 776]);
  assert.equal(out.referent_source, "mixed_prior_and_explicit");
  assert.equal(out.requested_action, "connect");
});

test("anaphoric comparison never creates an 'את זה' phrase and preserves text opt-in", () => {
  const out = resolveRazielConversationTurn({
    question: "תשווה את זה מול 1820",
    thread: [{
      role: "user",
      identity_resolution: {
        explicit_text_computation: true,
        identities: [{ type: "phrase", identity_key: "phrase:משיח", label: "משיח" }],
      },
    }],
  });
  assert.deepEqual(ids(out), ["1820", "משיח"]);
  assert.equal(out.identity_resolution.identities.some((identity) => identity.label === "את זה"), false);
  assert.equal(out.identity_resolution.explicit_text_computation, true);
  assert.equal(out.identity_resolution.text_calculation_allowed, true);
});

test("אפשר לבדוק is a bounded referential follow-up", () => {
  const out = resolveRazielConversationTurn({
    question: "אפשר לבדוק?",
    thread: [{ role: "user", text: "מה זה 776?" }],
  });
  assert.deepEqual(ids(out), ["776"]);
  assert.equal(out.referential_follow_up, true);
});

test("extracts an explicit phrase pair and a corpus-crossing target", () => {
  const pair = resolveRazielConversationTurn({ question: "תשווה משיח ומלך ישראל בכל השיטות" });
  assert.deepEqual(ids(pair), ["משיח", "מלך ישראל"]);
  assert.equal(pair.requested_action, "connect");

  const corpus = resolveRazielConversationTurn({ question: "מצא לי קשרים למילה משיח" });
  assert.deepEqual(ids(corpus), ["משיח"]);
  assert.equal(corpus.requested_action, "connect");
});

test("supports every canonical identity kind from a prior resolved turn", () => {
  const types = ["person", "book", "event", "place", "number", "name", "verse", "topic", "phrase", "word", "entity"];
  for (const type of types) {
    const candidate = type === "number"
      ? { type, identity_key: "number:26", value: 26, label: "26" }
      : { type, identity_key: `${type}:example`, label: `example-${type}` };
    const out = resolveRazielConversationTurn({
      question: "תבדוק את זה",
      thread: [{ role: "user", identity_resolution: { identities: [candidate] } }],
    });
    assert.equal(out.identity_resolution.primary?.type, type, type);
  }
});

test("only an actual user turn can supply prior referents", () => {
  for (const role of ["raziel", "assistant", "system", "tool", "model", undefined]) {
    const out = resolveRazielConversationTurn({
      question: "תבדוק את זה",
      thread: [{ role, text: "מה זה 776?" }],
    });
    assert.deepEqual(ids(out), [], String(role));
  }
});

test("rejects unsafe or out-of-range surface subjects", () => {
  for (const subject of [
    { type: "number", id: "0" },
    { type: "number", id: "1000000" },
    { type: "admin_secret", id: "787" },
  ]) {
    const out = resolveRazielConversationTurn({ question: "תבדוק את זה", surfaceSemantic: { subject } });
    assert.deepEqual(ids(out), []);
  }
});

test("transport projection is number-only and strips private owner fields", () => {
  const resolved = resolveRazielConversationTurn({
    question: "תבדוק את זה מול 1820",
    thread: [{
      role: "user",
      identity_resolution: {
        identities: [{
          type: "number",
          identity_key: "number:776",
          value: 776,
          label: "PRIVATE-LABEL",
          access: { tier: "admin", token: "SECRET" },
          provenance: { owner: "PRIVATE-OWNER" },
          metadata: { note: "PRIVATE-NOTE" },
        }],
      },
    }],
  });
  const projected = projectRazielConversationResolution(resolved);
  assert.deepEqual(projected.pair, [776, 1820]);
  assert.deepEqual(projected.identities, [
    { type: "number", value: 776, identity_key: "number:776" },
    { type: "number", value: 1820, identity_key: "number:1820" },
  ]);
  assert.doesNotMatch(JSON.stringify(projected), /SECRET|PRIVATE|access|provenance|metadata|label/);
  assert.ok(JSON.stringify(projected).length < 1000);
});

test("three numeric subjects require clarification instead of silently dropping one", () => {
  const resolved = resolveRazielConversationTurn({
    question: "תבדוק את זה מול 358",
    thread: [{ role: "user", text: "מה ההבדל בין 776 ל 1820" }],
  });
  assert.deepEqual(ids(resolved), ["776", "1820", "358"]);
  assert.equal(resolved.pair, null);
  assert.equal(projectRazielConversationResolution(resolved), null);
});
