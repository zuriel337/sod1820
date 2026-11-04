import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
const mount = read("src/components/experience2029/RazielSessionMount2029.jsx");

test("the personal area exposes one explicit companion action over the existing session", () => {
  const start = frame.indexOf("const requestPersonalAreaCompanion");
  const end = frame.indexOf("const openSavedConversation", start);
  const handler = frame.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(handler, /submitPersonalAreaCompanion\(\{/);
  assert.match(handler, /capability: "personal_overview"/);
  assert.match(handler, /focus: "current_step"/);
  assert.match(handler, /opaqueRefs: \[\]/);
  assert.match(handler, /onRaziel\(\)/);
  assert.doesNotMatch(handler, /evidencePack|hint|family|birth|signed|\bELS\b|calculator|fetch|transport|askRaziel/i);
  assert.match(frame, /data-raziel-explicit-action="submit-personal-area-companion"/);
  assert.match(frame, /עזור לי בצעד הבא/);
});

test("opening the existing conversation remains deterministic", () => {
  const start = frame.indexOf('data-raziel-explicit-action="open-existing-conversation"');
  const block = frame.slice(Math.max(0, start - 260), start + 220);
  assert.ok(start >= 0);
  assert.match(block, /onClick=\{onRaziel\}/);
  assert.doesNotMatch(block, /submitPersonalAreaCompanion|submit\(|transport|askRaziel/);
});

test("pending requests and principal changes stay owned by the existing provider", () => {
  assert.match(provider, /if \(inFlightRef\.current \|\| stateRef\.current\.busy\) return \{ ok: false, error: "turn_pending" \}/);
  assert.match(provider, /activeRequestRef\.current\?\.abort\(\)/);
  assert.match(provider, /if \(!mountedRef\.current\) return \{ ok: false, error: "session_unmounted" \}/);
  assert.match(mount, /<RazielSessionProvider2029 key=\{principalKey\}/);
  assert.equal((frame.match(/RazielSessionProvider2029/g) || []).length, 1);
});

test("the canonical hints route remains a closed exact-return destination", () => {
  assert.match(frame, /new URLSearchParams\(\{ focus: "hints" \}\)/);
  assert.match(frame, /go\(`\/2029\/journey\?\$\{params\.toString\(\)\}`[^]*state: \{ sodReturnTo2029: currentHref \}/);
  assert.doesNotMatch(frame, /hint_id|person-ref|signed_url/i);
});
