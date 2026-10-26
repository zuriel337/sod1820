import test from "node:test";
import assert from "node:assert/strict";
import { filterRazielTitles, projectRazielConversation, projectSavedRazielConversations, projectRazielDossier, razielGroundingCopy, workspaceCreditBalance, workspaceResearchHref } from "./razielWorkspaceProjection2029.js";

const subject = { type: "number", id: "337", label: "שאול" };
const saved = { type: "raziel_session", id: "raziel-session:a", ref: "a", title: "שיחת שאול", view_mode: "exploratory", saved_at: "2026-10-26", context_snapshot: { subject },
  turn_count: 99, thread: [{ role: "user", text: "מה כאן?", turnId: "a" }, { role: "raziel", text: "פירוש", turnId: "a", grounding: "interpretation" },
    { role: "raziel", text: "מבט רחב", turnId: "a", viewMode: "landscape", viewModeApplied: true, question: "מה כאן?" },
    { role: "raziel", text: "לא הוחל", viewMode: "landscape", viewModeApplied: false }] };

test("conversation projection preserves exact landscape/question lineage and does not infer an AI quota", () => {
  const before = JSON.stringify(saved), result = projectRazielConversation(saved);
  assert.equal(result.questions, 1); assert.equal(result.mode, "מתפרע");
  assert.equal(result.pictures.length, 1); assert.equal(result.pictures[0].turnId, "a");
  assert.equal(result.pictures[0].question, "מה כאן?"); assert.equal(result.pictures[0].message, saved.thread[2]);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(projectRazielConversation({ turn_count: null }).questions, null);
  assert.equal(projectRazielConversation({ thread: [], viewMode: "landscape" }, true).mode, "כללי");
  const legacy = projectRazielConversation({ thread: [{ role: "user", text: "שאלה אחרת", turnId: "other" },
    { role: "raziel", text: "תמונה", viewMode: "landscape", viewModeApplied: true, turnId: "unknown" }] });
  assert.equal(legacy.pictures[0].question, "", "missing lineage stays unknown instead of guessing the nearest question");
});

test("title search is a local read over all saved conversation titles with stable date ties", () => {
  const rows = projectSavedRazielConversations([saved, { ...saved, id: "z", ref: "z", title: "אמת" }, { type: "note", title: "שאול" }]);
  assert.equal(rows.length, 2); assert.equal(filterRazielTitles(rows, " שאול ")[0].ref, "a");
  assert.equal(filterRazielTitles(rows, "אינו קיים").length, 0);
});

test("a dossier uses exact typed subject references, never matching titles, words or numbers alone", () => {
  const conversation = projectRazielConversation(saved);
  const own = { id: "note:1", ref: "1", type: "note", title: "הערה", metadata: { subject } };
  const unrelated = { id: "note:2", ref: "2", type: "note", title: "שיחת שאול 337" };
  const wrongType = { id: "phrase:337", ref: "337", type: "phrase", title: "337" };
  const result = projectRazielDossier(conversation, [conversation, projectRazielConversation({ ...saved, ref: "b", context_snapshot: { subject: { ...subject, type: "phrase" } } })],
    { saved: [own, unrelated, wrongType], cart: [own], pinned: [own] });
  assert.deepEqual(result.items, [own]); assert.equal(result.conversations.length, 1);
  assert.equal(projectRazielDossier({ ref: "empty" }, [], { saved: [unrelated] }).hasExplicitSubject, false);
});

test("source attribution, calculation and interpretation never become a verified fact by projection", () => {
  assert.match(razielGroundingCopy(saved.thread[1]), /פרשנות/);
  assert.match(razielGroundingCopy({ grounding: "sourced" }), /ייחוס/);
  assert.match(razielGroundingCopy({ grounding: "deterministic" }), /חישוב/);
  assert.match(razielGroundingCopy({ grounding: "verified" }), /ללא סיווג/);
});

test("credits preserve a known zero and unknown values stay unknown", () => {
  assert.equal(workspaceCreditBalance(0), 0); assert.equal(workspaceCreditBalance(12), 12);
  for (const value of [null, undefined, "", "0", -1, NaN, Infinity]) assert.equal(workspaceCreditBalance(value), null);
});

test("source navigation retains the exact existing locator without constructing private URLs", () => {
  assert.equal(workspaceResearchHref({ link: "/number/337?expression=known#source-4" }), "/2029/number/337?expression=known#source-4");
  assert.equal(workspaceResearchHref({ link: "/books/source?locator=12#verse-8" }), "/books/source?locator=12#verse-8");
  for (const link of ["//evil.invalid", "https://evil.invalid", "javascript:alert(1)", "/\\evil", "/\nsecret"]) assert.equal(workspaceResearchHref({ link }), null);
  assert.equal(workspaceResearchHref({ title: "private question", ref: "secret-session" }), null);
});
