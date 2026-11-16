import test from "node:test";
import assert from "node:assert/strict";
import { postVoiceFor, POST_VOICES } from "./postVoice2029.js";

test("source='ai' alone never makes a system voice; a reviewed identity AND no named author does", () => {
  assert.equal(postVoiceFor({ id: 5107, source: "ai", author: null, authors: null }).voice, POST_VOICES.system);
  assert.equal(postVoiceFor({ id: 4999, source: "ai", author: null, authors: null }).voice, POST_VOICES.unspecified);
  assert.equal(postVoiceFor({ id: 4999, source: "ai", author: null, authors: null }).reason, "ai_source_without_reviewed_identity");
  // a design preference cannot override attribution
  assert.equal(postVoiceFor({ id: 5107, source: "ai", author: null, authors: ["אלון לוי"] }).voice, POST_VOICES.external);
  assert.equal(postVoiceFor({ id: 5107, source: "ai", author: "מישהו", authors: null }).voice, POST_VOICES.unspecified);
});

test("named creators get the calm external finish; the Nasrallah post keeps its original style", () => {
  assert.equal(postVoiceFor({ id: 5135, source: "ai", author: "אלון לוי", authors: ["אלון לוי"] }).voice, POST_VOICES.external);
  assert.equal(postVoiceFor({ id: 92, source: "wordpress", author: null, authors: null }).voice, POST_VOICES.original);
  assert.equal(postVoiceFor({}).voice, POST_VOICES.unspecified);
  assert.equal(postVoiceFor(null).voice, POST_VOICES.unspecified);
});
