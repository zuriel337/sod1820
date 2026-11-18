// Post unit actions use the existing entry_2029 family: every action projects to an admitted body with only closed tokens.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readingActionProps } from "../src/lib/publicReadingTelemetry2029.js";

const source = readFileSync(new URL("../src/lib/postUnitActions2029.js", import.meta.url), "utf8");
const actions = Object.fromEntries([...source.matchAll(/^\s+(post_[a-z_]+): "([a-z]+)",/gm)].map((m) => [m[1], m[2]]));

test("every post action is an admitted entry_2029 event with closed fields only", () => {
  assert.ok(Object.keys(actions).length >= 5);
  for (const [action, target] of Object.entries(actions)) {
    const props = readingActionProps("entry_2029", action, { entry_surface: "post", action_id: action, target_surface: target,
      slug: "secret-post", text: "יחידה", number: 26, href: "https://example.test/x", uid: "11111111-1111-4111-8111-111111111111" });
    assert.deepEqual(props, { action_version: 1, entry_surface: "post", action_id: action, target_surface: target }, action);
  }
});

test("the module sends only the action and the target kind", () => {
  assert.match(source, /emit\("entry_2029", action, \{ props: \{ entry_surface: "post", action_id: action, target_surface: target \} \}\)/);
  assert.doesNotMatch(source, /props: \{[^}]*(slug|href|title|text)/);
});

// Wired 18.11.2026 (ZURIEL "תחבר את ספירת הלחיצות בפוסטים"): every action has a call site, and each call site loads the module on the
// click (import()), never with the Post (Speed Law §3).
const callers = {
  "../src/pages/Post2029Page.jsx": ["post_number_open"],
  "../src/components/experience2029/PostExternalSourceUnit2029.jsx": ["post_source_check_open", "post_writer_open", "post_source_open"],
  "../src/components/experience2029/PostEvidenceMedia2029.jsx": ["post_media_open"],
};
test("every post action is wired at its click, and the counter loads only on that click", () => {
  const wired = new Set();
  for (const [file, expected] of Object.entries(callers)) {
    const code = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(code, /^import[^\n]*postUnitActions2029/m, `${file} must not import the counter statically`);
    assert.match(code, /import\("\.\.\/(\.\.\/)?lib\/postUnitActions2029\.js"\)/, file);
    for (const action of expected) { assert.match(code, new RegExp(`"${action}"`), `${file}: ${action}`); wired.add(action); }
  }
  assert.deepEqual([...wired].sort(), Object.keys(actions).sort());
});
