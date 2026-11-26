// S2 (ZURIEL 26.11.2026): D03 notable skips, E03 rarity, E04 quality meter, E07 angles and parallels reach the 2029 surface
// from the engine's own outputs. This file keeps the structure honest: one computation, one Monte-Carlo trigger, one lazy
// surface, no statistical claim, and the lattice check kept beside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const engine = read('tools/els/els-code.template.html');
const built = read('public/tzofen.html');
const component = read('src/components/experience2029/ElsQualityMeter2029.jsx');
const research = read('src/components/experience2029/ElsLexiconResearch2029.jsx');
const native = read('src/components/experience2029/ElsNativeClassic2029.jsx');

test('the engine publishes the detail it already computes and the built tool matches the template', () => {
  for (const needle of ['st.lastQualityDetail=', 'qualityDetail:st.lastQualityDetail', 'quality-mc-run', 'function runQualityMC', 'angles.push(']) {
    assert.ok(engine.includes(needle), `template: ${needle}`);
    assert.ok(built.includes(needle), `public/tzofen.html: ${needle} (run python3 tools/els/build.py)`);
  }
});

test('one Monte-Carlo trigger: the Classic button and the native control share runQualityMC', () => {
  // Exactly three mentions: the definition, the pre-existing Classic save-time run, and runQualityMC (no fourth implementation).
  assert.equal((engine.match(/runMonteCarlo\(\)/g) || []).length, 3);
  assert.ok(engine.slice(engine.indexOf('function runQualityMC')).split('st._runQualityMC=runQualityMC')[0].includes('runMonteCarlo()'));
  assert.match(engine, /rb\.onclick=\(\)=>\{runQualityMC\(\);\}/);
  assert.match(engine, /d\.action==="quality-mc-run"\)\{if\(st\._runQualityMC\)st\._runQualityMC\(\);\}/);
});

test('angle classes are collected inside the scoring branches, not recomputed', () => {
  const body = engine.slice(engine.indexOf('function qualityCalc()'), engine.indexOf('function mcPoints'));
  assert.ok(body.includes('kind="vertical"') && body.includes('kind="diagonal"') && body.includes('kind="row"'));
  assert.equal((body.match(/gridStep\(/g) || []).length, 1, 'no second gridStep pass');
  assert.deepEqual([...component.matchAll(/\{ kind: "(\w+)", label:/g)].map(m => m[1]), ['vertical', 'diagonal', 'row', 'other']);
});

test('the saved quality keeps its shape: the detail is a separate, unsaved field', () => {
  const save = read('src/components/TzofenEmbed.jsx');
  assert.ok(!save.includes('qualityDetail'), 'the host never saves the detail');
  assert.match(engine, /st\.lastQuality=\{ stars, score:vScore, verified,\s+rarity: mc\?\(mc\.capped\?null:mc\.rar\):null/);
});

test('the surface computes nothing, claims no proof, is lazy and sits next to the lattice check', () => {
  assert.ok(!/from "\.\.\/\.\.\/lib\//.test(component), 'no library import: display only');
  assert.ok(!/Math\.(random|log|sqrt)|new Set\(|\.sort\(/.test(component), 'no statistics or ranking in the component');
  assert.match(component, /אינה הוכחה סטטיסטית/);
  assert.match(component, /שני המידעים נשמרים/);
  assert.match(research, /React\.lazy\(\(\) => import\("\.\/ElsQualityMeter2029\.jsx"\)\)/);
  assert.ok(!/^import ElsQualityMeter2029/m.test(research + native), 'never a static import (Speed Law)');
  assert.ok(research.includes('ElsStructureResearch2029'), 'the lattice geometry check stays');
  assert.match(native, /requestControl\("quality-mc-run"\)/);
  assert.match(native, /מודד נדירות מול 400 חלונות אקראיים/, 'Operation Visibility Law: a live indicator for the measurement');
});
