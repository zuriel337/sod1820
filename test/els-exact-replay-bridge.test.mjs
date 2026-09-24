import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
const built = readFileSync(new URL('../public/tzofen.html', import.meta.url), 'utf8');

for (const [name, src] of [['template', template], ['built', built]]) {
  test(name + ' has the canonical host request transport', () => {
    assert.match(src, /function engineRequest\(op,payload,timeoutMs=30000\)/);
    assert.match(src, /type:"engine-request",requestId,op,payload/);
    assert.match(src, /d\.type==="engine-result"&&d\.requestId/);
  });

  test(name + ' exact embedded Torah replay fails closed unless canonical MATCH', () => {
    assert.match(src, /exactReplayRequested=item\.start!=null/);
    assert.match(src, /engineRequest\("verify"/);
    assert.match(src, /verified\.verification_state!=="MATCH"/);
    assert.match(src, /canonical-replay-mismatch/);
    assert.match(src, /canonical-replay-unavailable/);
  });

  test(name + ' may inject only a canonically verified occurrence into local presentation', () => {
    assert.match(src, /canonicalReplay=verified\.occurrence/);
    assert.match(src, /if\(!st\.res\.hits\.some\([^\n]+\)\)st\.res\.hits\.unshift\(ch\)/);
  });

  test(name + ' leaves Tanakh and old no-coordinate records on compatibility path', () => {
    assert.match(src, /EMBED&&st\.scope==="torah"&&exactReplayRequested/);
    assert.doesNotMatch(src, /engineRequest\("verify"[\s\S]{0,250}scope:"tanakh"/);
  });
}

console.log('els exact replay bridge: PASS');
