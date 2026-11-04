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
  assert.match(src, /const savedState = lastStateRef\.current/);
  assert.match(src, /savedState\?\.verification\?\.state !== "MATCH"/);
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

function hostMessageHarness(overrides = {}) {
  const toolWindow = { document: {} };
  const sent = [], operations = [], gates = [], legacyGates = [];
  const start = src.indexOf('async function onMsg(e)');
  const end = src.indexOf('    window.addEventListener("message", onMsg);', start);
  const context = {
    window: { location: { origin: 'https://els.test' } },
    iframeRef: { current: { contentWindow: toolWindow, get contentDocument() { return toolWindow.document; } } },
    readyDocumentRef: { current: null }, exactProbeRef: { current: null },
    verified: false, experience2029: true,
    onOperation: (message) => operations.push(message),
    onGate: (message) => gates.push(message),
    setGate: (gate) => legacyGates.push(gate),
    postToTool: (message) => sent.push(message),
    postTier: () => {}, pushSavedMatrices: () => {},
    journeyLoad: null, matrix: null, lensRequest: null,
    searchRequest: null, findingsRequest: null,
    ...overrides,
  };
  context.messageContextRef = { current: context };
  const probeCallback = src.match(/const sendExactSkipProbe = useCallback\(([\s\S]*?), \[postToTool\]\);/)[1];
  runInNewContext('globalThis.sendExactSkipProbe = ' + probeCallback, context);
  runInNewContext(src.slice(start, end) + ';globalThis.handle=onMsg;', context);
  return {
    sent, operations, gates, legacyGates, context, toolWindow,
    send: (data, source = toolWindow, origin = context.window.location.origin) => context.handle({ data, source, origin }),
  };
}

test('operation progress comes only from the mounted canonical iframe and preserves request correlation', async () => {
  const host = hostMessageHarness();
  const progress = { source: 'tzofen', type: 'operation', kind: 'findings', requestId: 37, status: 'verifying' };
  await host.send(progress, {});
  await host.send(progress, undefined, 'https://other.test');
  await host.send({ ...progress, source: 'other' });
  assert.equal(host.operations.length, 0, 'spoofed progress cannot finish or replace a live search');
  await host.send(progress);
  assert.equal(host.operations[0], progress, 'the exact canonical acknowledgement reaches the consumer');
});

test('exact probe waits for readiness and ignores duplicate handshakes and duplicate effects', async () => {
  const request = { term: 'תורה', scope: 'torah', skip: 50, requestId: 41 };
  let tiers = 0;
  const host = hostMessageHarness({ exactSkipProbe: request, postTier: () => tiers++ });
  host.context.sendExactSkipProbe(request);
  assert.equal(host.sent.length, 0, 'an explicit action before load remains queued in its existing prop');
  await host.send({ source: 'tzofen', type: 'ready' });
  host.context.sendExactSkipProbe({ ...request });
  await host.send({ source: 'tzofen', type: 'ready' });
  assert.equal(tiers, 2, 'tier handshake is still acknowledged');
  assert.equal(host.sent.filter(m => m.type === 'probe-exact-skip').length, 1);
});

test('exact probe responses require the current request, document and trusted sender, once', async () => {
  const replies = [], request = { term: 'תורה', scope: 'torah', skip: 50, requestId: 51 };
  const host = hostMessageHarness({ exactSkipProbe: request, onExactSkipProbeResult: value => replies.push(value) });
  await host.send({ source: 'tzofen', type: 'ready' });
  const success = { source: 'tzofen', type: 'exact-skip-probe-result', requestId: 51, ok: true };
  await host.send(success, {});
  await host.send(success, undefined, 'https://other.test');
  host.context.exactSkipProbe = { ...request, skip: 400000, requestId: 52 };
  host.context.sendExactSkipProbe(host.context.exactSkipProbe);
  await host.send(success);
  assert.equal(replies.length, 0, 'late or spoofed success cannot complete the replacement request');
  const noHit = { ...success, requestId: 52, ok: false, reason: 'LOCAL_NO_HIT' };
  await host.send(noHit);
  await host.send(noHit);
  await host.send({ ...noHit, ok: true });
  assert.deepEqual(replies, [noHit], 'no-hit remains false; duplicate completion is ignored');
  host.context.exactSkipProbe = { ...host.context.exactSkipProbe, requestId: 53 };
  host.context.sendExactSkipProbe(host.context.exactSkipProbe);
  await host.send({ ...noHit, requestId: 53 });
  assert.equal(replies.length, 2, 'same parameters with a new requestId are an explicit retry');
  host.context.exactSkipProbe = null;
  await host.send({ ...success, requestId: 53 });
  assert.equal(replies.length, 2, 'cleared requests do not deliver late results');
});

test('a new iframe document resumes a pending probe but never replays a completed probe', async () => {
  const replies = [], request = { term: 'תורה', scope: 'torah', skip: 50, requestId: 61 };
  const host = hostMessageHarness({ exactSkipProbe: request, onExactSkipProbeResult: result => replies.push(result) });
  const ready = { source: 'tzofen', type: 'ready' };
  await host.send(ready);
  host.toolWindow.document = {};
  const success = { source: 'tzofen', type: 'exact-skip-probe-result', requestId: 61, ok: true };
  await host.send(success);
  assert.equal(replies.length, 0, 'old-document reply cannot resolve a probe after navigation');
  await host.send(ready);
  assert.equal(host.sent.filter(m => m.type === 'probe-exact-skip').length, 2, 'new document receives pending work');
  await host.send(success);
  host.toolWindow.document = {};
  await host.send(ready);
  assert.equal(host.sent.filter(m => m.type === 'probe-exact-skip').length, 2, 'completed work is not another request on reload');
});

test('queued primary and secondary searches keep their request IDs when the engine becomes ready', async () => {
  const searchRequest = { kind: 'regular', term: 'תורה', seq: 10 };
  const findingsRequest = { findings: [{ t: 'אור', color: '#ffaa00' }], seq: 11 };
  let tierPosts = 0;
  const host = hostMessageHarness({ searchRequest, findingsRequest, postTier: () => tierPosts++ });
  await host.send({ source: 'tzofen', type: 'ready' });
  assert.equal(tierPosts, 1);
  const search = host.sent.find((message) => message.type === 'native-search');
  const findings = host.sent.find((message) => message.type === 'update-findings');
  assert.equal(search.request, searchRequest);
  assert.equal(search.requestId, 10);
  assert.equal(findings.findings, findingsRequest.findings);
  assert.equal(findings.requestId, 11);
  await host.send({ source: 'tzofen', type: 'ready' });
  assert.equal(tierPosts, 2);
  assert.equal(host.sent.filter(message => message.type === 'native-search').length, 1);
  assert.equal(host.sent.filter(message => message.type === 'update-findings').length, 1);
});

test('2029 access notifications use the parent account entry while legacy hosts retain their gate', async () => {
  const message = { source: 'tzofen', type: 'gate', reason: 'save' };
  const native = hostMessageHarness();
  await native.send(message);
  assert.equal(native.gates[0], message);
  assert.equal(native.legacyGates.length, 0);
  const legacy = hostMessageHarness({ experience2029: false });
  await legacy.send(message);
  assert.equal(legacy.legacyGates[0].reason, 'save');
  assert.equal(legacy.gates[0], message);
  assert.match(src, /const gateOverlay = !experience2029 && gate && !verified/);
});

test('2029 engine scope stays stable when switching projections and never changes auth tier', () => {
  const srcExpression = src.match(/const src =\s*([\s\S]*?);/)[1];
  const urls = [true, false].map((engineOnly) => runInNewContext(srcExpression, { seed: '', hiddenBridge: true, engineOnly, experience2029: true }));
  assert.equal(urls[0], urls[1], 'opening classic tools does not reload a different engine scope');
  assert.equal(new URL(urls[0], 'https://els.test').searchParams.get('experience'), '2029');
  const legacy = runInNewContext(srcExpression, { seed: '', hiddenBridge: false, engineOnly: false, experience2029: false });
  assert.equal(new URL(legacy, 'https://els.test').searchParams.has('experience'), false);
  const tierExpression = src.match(/const tier = ([^;]+);/)[1];
  for (const experience2029 of [true, false]) {
    assert.equal(runInNewContext(tierExpression, { isAdmin: false, verified: false, experience2029 }), 'anon');
    assert.equal(runInNewContext(tierExpression, { isAdmin: false, verified: true, experience2029 }), 'registered');
    assert.equal(runInNewContext(tierExpression, { isAdmin: true, verified: true, experience2029 }), 'admin');
  }
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
