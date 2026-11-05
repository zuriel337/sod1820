import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL(name, import.meta.url), "utf8");

// Phone keyboards keep a word "in composition" until it is committed, and the
// draft state is not updated meanwhile. The placeholder must follow the real
// content at once, otherwise "הוסף תגובה" stays on top of the typed letters.
test("the placeholder follows the real editor content during composition", () => {
  const source = read("./CommunityRichText2029.jsx");
  assert.match(source, /const syncEmpty = \(\) =>[^\n]*setAttribute\("data-empty", String\(!editor\.textContent\)\)/);
  assert.match(source, /onInput=\{\(\) => \{[^}]*syncEmpty\(\)/);
  assert.match(source, /onCompositionStart=\{\(\) => \{[^}]*syncEmpty\(\)/);
  assert.match(source, /onCompositionUpdate=\{syncEmpty\}/);
  assert.match(source, /onCompositionEnd=\{\(\) => \{[^}]*syncEmpty\(\)/);
});

// The typist sees their own indicator on every keystroke, before and regardless
// of the (throttled, sender-excluded) broadcast.
test("the typist is marked locally before the throttled broadcast", () => {
  const source = read("./useCommunityTyping2029.js");
  const local = source.indexOf("tracker.current.mark(key.current, clean, now)");
  const broadcast = source.indexOf("shouldSendTyping(lastSent.current, now)");
  assert.ok(local > 0 && broadcast > local, "own marking must run before the broadcast throttle");
  assert.match(source, /self: false/);
});
