import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SOURCE = new URL("../src/components/experience2029/ElsMatrixProfileSwitch.jsx", import.meta.url);

test("ELS matrix profile switch is presentation-only and reuses the released v9 model", async () => {
  const source = await readFile(SOURCE, "utf8");

  assert.match(source, /els2029MatrixMode\.js/);
  assert.match(source, /normalizeElsMatrixProfile/);
  assert.match(source, /ELS_MATRIX_PROFILE\.RESEARCH/);
  assert.match(source, /ELS_MATRIX_PROFILE\.CLASSIC/);

  assert.doesNotMatch(source, /useState\s*\(/);
  assert.doesNotMatch(source, /useEffect\s*\(/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|supabase|fetch\s*\(/);
});

test("ELS matrix profile switch exposes accessible bounded controls", async () => {
  const source = await readFile(SOURCE, "utf8");

  assert.match(source, /role="group"/);
  assert.match(source, /aria-label=\{ariaLabel\}/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /data-els-matrix-profile-switch="v1"/);
  assert.match(source, /data-els-matrix-profile=/);
  assert.match(source, /type="button"/);
});

test("ELS matrix profile switch uses the existing 2029 action language and does not add CSS", async () => {
  const source = await readFile(SOURCE, "utf8");

  assert.match(source, /sod29-action primary/);
  assert.match(source, /sod29-action/);
  assert.match(source, /className="sod29-actions"/);

  assert.doesNotMatch(source, /import\s+["'][^"']+\.css["']/);
  assert.doesNotMatch(source, /<style/);
});

test("ELS matrix profile switch does not emit redundant profile changes", async () => {
  const source = await readFile(SOURCE, "utf8");

  assert.match(source, /if \(disabled \|\| selected\) return;/);
  assert.match(source, /onChange\?\.\(option\.key\)/);
});
