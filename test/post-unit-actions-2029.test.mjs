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

test("the module sends only the action and the target kind, and nothing imports it before the speed session wires it", () => {
  assert.match(source, /emit\("entry_2029", action, \{ props: \{ entry_surface: "post", action_id: action, target_surface: target \} \}\)/);
  assert.doesNotMatch(source, /props: \{[^}]*(slug|href|title|text)/);
});
