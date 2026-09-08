import test from "node:test";
import assert from "node:assert/strict";
import { PALETTES, controlTone, statusTone, semanticControlVars } from "./palette.js";

const MODES = ["light", "dark", "lab"];
const CONTROL_ROLES = ["primary", "secondary", "ghost", "disabled"];
const STATUS_ROLES = ["building", "success", "warning", "danger", "info"];

function assertTone(tone, label) {
  assert.ok(tone, `${label}: tone exists`);
  assert.equal(typeof tone.background, "string", `${label}: background`);
  assert.ok(tone.background.length > 0, `${label}: background non-empty`);
  assert.equal(typeof tone.color, "string", `${label}: color`);
  assert.ok(tone.color.length > 0, `${label}: color non-empty`);
  assert.equal(typeof tone.border, "string", `${label}: border`);
  assert.ok(tone.border.length > 0, `${label}: border non-empty`);
}

test("every canonical palette exposes every control and status role", () => {
  for (const mode of MODES) {
    const P = PALETTES[mode];
    assert.ok(P, `${mode}: palette exists`);
    for (const role of CONTROL_ROLES) assertTone(controlTone(P, role), `${mode}.controls.${role}`);
    for (const role of STATUS_ROLES) assertTone(statusTone(P, role), `${mode}.statuses.${role}`);
  }
});

test("building status never inherits the surrounding link color", () => {
  for (const mode of MODES) {
    const tone = statusTone(PALETTES[mode], "building");
    assert.notEqual(tone.color, "inherit", `${mode}: building text is explicit`);
    assert.notEqual(tone.background, "transparent", `${mode}: building has a readable surface`);
  }
});

test("legacy accent button aliases stay aligned with semantic primary role", () => {
  for (const mode of MODES) {
    const P = PALETTES[mode];
    const primary = controlTone(P, "primary");
    assert.equal(P.accentBtn, primary.background, `${mode}: accentBtn aliases primary background`);
    assert.equal(P.onAccent, primary.color, `${mode}: onAccent aliases primary text`);
  }
});

test("semantic CSS bridge is complete for shared class-based controls", () => {
  for (const mode of MODES) {
    const vars = semanticControlVars(PALETTES[mode]);
    for (const key of [
      "--control-primary-bg", "--control-primary-fg", "--control-primary-border", "--control-primary-focus",
      "--control-secondary-bg", "--control-secondary-fg", "--control-secondary-border", "--control-secondary-focus",
      "--control-ghost-bg", "--control-ghost-fg", "--control-disabled-bg", "--control-disabled-fg",
    ]) {
      assert.equal(typeof vars[key], "string", `${mode}: ${key}`);
      assert.ok(vars[key].length > 0, `${mode}: ${key} non-empty`);
    }
  }
});

test("unknown semantic roles fall back to an existing canonical tone", () => {
  for (const mode of MODES) {
    assertTone(controlTone(PALETTES[mode], "not-a-role"), `${mode}.control fallback`);
    assertTone(statusTone(PALETTES[mode], "not-a-role"), `${mode}.status fallback`);
  }
});
