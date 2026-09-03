import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// GEMATRIA_RESEARCH_CALCULATOR_V1 guard: the new projection surface must never import
// calculation authority from src/lib/gematria.js (the confirmed client-side JS reimplementation
// of Gematria formulas). This is a static, offline check over the actual files on disk -- no
// network/DOM required -- so it can never silently regress.

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_FILE = join(HERE, '..', '..', 'pages', 'GematriaResearchCalculatorPage.jsx');

function collectJsxFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectJsxFiles(full, out);
    else if (/\.(jsx|js)$/.test(name) && !name.endsWith('.test.js')) out.push(full);
  }
  return out;
}

const files = [...collectJsxFiles(HERE), PAGE_FILE];

test('no new Gematria Research Calculator file imports src/lib/gematria.js', () => {
  assert.ok(files.length >= 8, `expected at least 8 files, found ${files.length}`);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const hit = /from\s+["'][^"']*\/lib\/gematria(\.js)?["']/.test(src);
    assert.equal(hit, false, `${f} imports from lib/gematria.js -- calculation authority leak`);
  }
});

test('the main calculator only calls canonical Supabase RPCs for numeric truth, never a local formula table', () => {
  const calc = readFileSync(join(HERE, 'GematriaResearchCalculator.jsx'), 'utf8');
  assert.match(calc, /gematria_method_trace/, 'must call the canonical trace RPC');
  assert.match(calc, /gematria_methods/, 'must read the live registry table for the method list');
  assert.doesNotMatch(calc, /GEM\[|fn_letter_val|fn_ragil\(/, 'must not embed any letter-value table or call a client-side calc helper');
});
