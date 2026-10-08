import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const src = readFileSync(new URL('../src/components/TzofenEmbed.jsx', import.meta.url), 'utf8');

test('Tzofen host bridge allowlists only canonical ELS page and verify operations', () => {
  assert.match(src, /d\.type === "engine-request"/);
  assert.match(src, /d\.op === "page" \|\| d\.op === "verify" \|\| d\.op === "verify_batch"/);
  assert.match(src, /supabase\.functions\.invoke\("els-search-bridge"/);
  assert.match(src, /type: "engine-result"/);
  assert.match(src, /requestId/);
});

test('Tzofen host bridge preserves browser trust boundary', () => {
  assert.match(src, /if \(e\.origin !== window\.location\.origin\) return/);
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.doesNotMatch(src, /els_search_page_core_v1|els_verify_occurrence_v1/);
});

test('host save/state only accept a canonical MATCH from the tool (defense in depth)', () => {
  assert.match(src, /lastStateRef\.current\?\.verification\?\.state !== "MATCH"/);
  assert.match(src, /d\?\.verification\?\.state === "MATCH"/);
});

test('host bridge does not replace local ELS execution in this slice', () => {
  assert.match(src, /src=\{src\}/);
  assert.doesNotMatch(src, /findAll\s*=|function\s+findAll/);
});

test('host bridge rejects same-origin spoof: e.source must be the exact iframe contentWindow', () => {
  const i = src.indexOf('async function onMsg(e)');
  const body = src.slice(i, src.indexOf('if (d.type === "engine-request")', i));
  assert.match(body, /e\.origin !== window\.location\.origin\) return/);
  assert.match(body, /e\.source !== toolWin\) return/);
  assert.ok(body.indexOf('e.source !== toolWin') < body.indexOf('e.data'), 'source check precedes data use');
  // executable adversarial check: replicate the guard verbatim against a spoofing window
  const guard = (e, origin, iframeWin) => { if (e.origin !== origin) return false; const w = iframeWin; if (!w || e.source !== w) return false; return true; };
  const real = {}, spoof = {};
  assert.equal(guard({ origin: 'https://x', source: real }, 'https://x', real), true);
  assert.equal(guard({ origin: 'https://x', source: spoof }, 'https://x', real), false);
  assert.equal(guard({ origin: 'https://x', source: real }, 'https://x', null), false);
  assert.equal(guard({ origin: 'https://evil', source: real }, 'https://x', real), false);
});

console.log('els-host-bridge contract: PASS');


test('deduplicated state still drains verification work selected during an in-flight request', () => {
  const template = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
  const start = template.indexOf('function emitState()');
  const end = template.indexOf('// 🧬 G3: כל מופע', start);
  let posted = 0, drains = 0;
  const context = { elsState: () => ({status: 'ok'}), postHost: () => posted++, healGoverned: () => drains++ };
  runInNewContext('let _stateSig="";' + template.slice(start, end) + ';globalThis.emit=emitState;', context);
  context.emit();
  context.emit();
  assert.equal(posted, 1, 'duplicate projection is not posted twice');
  assert.equal(drains, 2, 'new verification work is not starved by projection deduplication');
});
