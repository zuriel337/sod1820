// Browser occurrence-path census: the tzofen tool has NO reachable path that promotes an occurrence to governed
// output (state / save / lens / search log / matrix marks) without a canonical server MATCH (h.v==="MATCH").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const tpl = readFileSync(root + 'tools/els/els-code.template.html', 'utf8');
const code = tpl.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('only the verifier result can set h.v="MATCH"; no other assignment promotes a hit', () => {
  const matches = [...code.matchAll(/\.v\s*=\s*[^=;\n]*"MATCH"/g)].map((m) => m[0]);
  assert.equal(matches.length, 2, matches.join(' | ')); // promoteVerified + healRun (both derived from vr.verified)
  assert.match(code, /h\.v="MATCH";else\{h\.v="MISMATCH"/);
  assert.match(code, /h\.v=vr\.ok\?\(vr\.verified\.has\(hitKey\(h\)\)\?"MATCH":"MISMATCH"\):"CANDIDATE"/);
  assert.equal([...code.matchAll(/verified\.add\(/g)].length, 1, '`verified` is only filled from the bridge reply');
  assert.match(code, /for\(const o of r\.result\.verified\|\|\[\]\)verified\.add\(/);
});

test('every st.res assignment is census-classified (verified-eager, cache-verified, or scratch+restore)', () => {
  const allowed = [
    /st\.res=res;/, // autoTerms scratch (finally-restored)
    /st\.res=save\.res;/, /st\.res=sv\.res;/, /st\.res=findAll\(item\.term,4000\);/, // scratch + restore
    /st\.res=discovered;/, // regular/search restore: verified discovery, latest-request guard below
    /st\.res=resA;/, // cross: resA from faVerified cache
    /st\.res=R\.resA;/, // cross-simple: prefetchVerified([A,B])
    /st\.res=st\.crossResCache\[z\.axis\];/, // free-cross: resCache from faVerified
    /st\.res=faMemo\(a\.term\);/, // discovery seed: lazily healed, exits gated
    /st\.res=null;/, // saved corpus/anchor mismatch: clear the result instead of substituting another hit
  ];
  const found = [...code.matchAll(/st\.res=[^;\n]*;?/g)].map((m) => m[0]);
  for (const f of found) assert.ok(allowed.some((a) => a.test(f)), `unclassified st.res assignment: ${f}`);
  assert.equal(found.length, 13, 'st.res assignment census changed - classify the new site');
  const commits = [...code.matchAll(/const discovered=await discoverVerified\((?:w|item\.term),4000(?:,operation|,null,anchor)?\);\s*if\(requestSeq!==_matrixRequestSeq\)return;([\s\S]*?)st\.res=discovered;/g)];
  assert.equal(commits.length, 2, 'search and restore reject stale verified requests before committing result, geometry and identity');
  for (const [, between] of commits) assert.doesNotMatch(between, /\bawait\b|st\.res=/, 'no async gap or intervening result commit after the epoch guard');
});

test('regular/cross/FORMS/free-cross/load prefetch no longer call the raw discovery kernels directly', () => {
  for (const re of [
    /st\.res=_slow\?/,
    /Promise\.all\(words\.map\(w=>findAllAdaptive/,
    /Promise\.all\(Tn\.map\(w=>findAllAdaptive/,
    /const r=deep\?await findAllAdaptive/,
    /st\.res=st\.scope==="tanakh"\?await findAllAdaptive/,
  ]) assert.doesNotMatch(code, re);
  assert.match(code, /await Promise\.all\(words\.map\(w=>faVerified\(w\)/);
  assert.match(code, /await Promise\.all\(Tn\.map\(w=>faVerified\(w\)/);
  assert.match(code, /const r=await discoverVerified\(p\.probe\.w,FORMS_CAP\)/);
  assert.match(code, /await prefetchVerified\(\[A,B\],operation\)/);
  assert.match(code, /await prefetchVerified\(\[axis,\.\.\.terms\]\)/);
});

test('governed exits are gated on isGov / verification', () => {
  const stateFn = code.slice(code.indexOf('function elsState()'), code.indexOf('function emitState()'));
  assert.match(stateFn, /if\(!isGov\(h\)\)return Object\.assign\(base,\{status:"candidate"/);
  assert.match(stateFn, /negative_authority:false/);
  assert.match(stateFn, /shown:shownHitsOf\(w\)\.filter\(isGov\)\.map\(hitKey\)/);
  assert.match(code, /if\(!gov\.has\(idx\)\)return;/);
  const save = code.slice(code.indexOf('function performSaveToGallery'), code.indexOf('function removeFromGallery'));
  assert.ok(save.indexOf('await healGoverned()') > 0 && save.indexOf('await healGoverned()') < save.indexOf('postHost({type:"save"'));
  assert.match(save, /if\(!isGov\(h\)\)\{/);
  assert.match(save, /filter\(isGov\)\.map\(hitKey\)/);
  assert.match(code, /if\(!hit\|\|!isInspectableHit\(hit,t\)\)\{postHost\(\{type:"lens"/);
  assert.match(code, /return isGov\(h\)\|\|target\?\.kind==="source-sequence"&&isSourceHit\(h,target.term\)/);
  assert.match(code, /sourceShown:selectedHitsOf\(st.words\[i\]\)\.filter\(h=>isSourceHit\(h,w.t\)\)\.map\(hitKey\)/);
  assert.match(code, /return isGov\(h\)\?Math\.abs\(h\.skip\):0;/);
});

test('every host message type is classified (coordinate-bearing ones are gated above)', () => {
  const types = new Set([...code.matchAll(/postHost\(\{type:"([a-z-]+)"/g)].map((m) => m[1]));
  const carrying = new Set(['save', 'lens', 'search']);
  const nonCoord = new Set(['delete', 'navigate', 'gate', 'ready', 'load-error', 'contribute', 'quality', 'engine-request', 'engine-cancel']);
  const uiAccessOnly = new Set(['onboarding-required', 'operation', 'native-save-result']);
  for (const t of types) assert.ok(carrying.has(t) || nonCoord.has(t) || uiAccessOnly.has(t), `unclassified host message type: ${t}`);
  assert.match(code, /if\(!ensureOnboarded\(\)\)\{postHost\(\{type:"onboarding-required"\}\);operationStatus\(operation,"error",[^;]+\);return;\}/,
    'native search uses the shared onboarding policy and emits UI/access-only messages before blocked searches');
  const operation = code.slice(code.indexOf('function operationStatus('), code.indexOf('function beginOperation('));
  assert.match(operation, /postHost\(\{type:"operation",kind:operation\.kind,requestId:operation\.requestId,status,\.\.\.\(message\?\{message\}:\{\} \),\s*elapsedMs:Math.max\(0,Date.now\(\)-operation.startedAt\),progress:progress\|\|null\}\)/,
    'operation acknowledges a request and its status without transmitting candidate coordinates');
  assert.doesNotMatch(operation, /positions|hitId|start_index|start:|skip:/);
  assert.ok(code.includes('function emitState()') && /postHost\(s\)/.test(code));
});

test('iframe accepts every sod-host command only from the exact parent window', () => {
  const i = code.indexOf('window.addEventListener("message"');
  const j = code.indexOf('if(EMBED){st.tier="anon"', i);
  const listener = code.slice(i, j);
  assert.ok(i > 0 && j > i, 'host message listener located');
  assert.match(listener, /d\.source!=="sod-host"\|\|e\.source!==window\.parent/);
  assert.doesNotMatch(listener, /d\.type==="engine-result"\)\{if\(e\.source!==window\.parent\)/,
    'source binding must guard every host command, not only engine-result');
});

test('sampled/local no-hit is never emitted as a canonical negative', () => {
  assert.doesNotMatch(code, /EXECUTED_EMPTY|NOT_FOUND/, 'browser source never mints canonical negative states');
  assert.match(code, /if\(!cand\.hits\.length\)\{out\.vstate="LOCAL_NO_HIT";return out;\}/);
});

test('corpus identity is injected by build.py from the exact tk-letters source', () => {
  const py = readFileSync(root + 'tools/els/build.py', 'utf8');
  assert.match(py, /hashlib\.sha256\(tk\.encode\("utf-8"\)\)\.hexdigest\(\)/);
  assert.match(py, /corpus_torah\s*=\s*corpus_tanakh\[:16\]/);
  assert.match(tpl, /CORPUS_ID=\{torah:"__CORPUS_ID_TORAH__",tanakh:"__CORPUS_ID_TANAKH__"\}/);
  const out = readFileSync(root + 'public/tzofen.html', 'utf8');
  assert.ok(out.includes('CORPUS_ID={torah:"0b022e8eef6f9c16",tanakh:"0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b"}'));
  assert.doesNotMatch(out, /__CORPUS_ID_|__TORAH_DATA__|__ELS_LOGO__/);
});

test('deterministic template -> public/tzofen.html build sync', () => {
  const before = readFileSync(root + 'public/tzofen.html');
  const r = spawnSync('python3', ['tools/els/build.py'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const after = readFileSync(root + 'public/tzofen.html');
  assert.ok(before.equals(after), 'public/tzofen.html is stale vs tools/els/els-code.template.html - run tools/els/build.py');
});
