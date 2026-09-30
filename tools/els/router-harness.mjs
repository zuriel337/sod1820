// Loads the ADAPTIVE_CAPPED_V1 router verbatim from an els-code template (no re-implementation) and runs it in Node
// against the canonical tk-letters. Used by test/els-adaptive-router.test.mjs and tools/els/bench-router.mjs.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url).pathname;
export const letters = readFileSync(root + 'tools/els/data/tk-letters.txt', 'utf8');

export function loadRouter(tplPath = root + 'tools/els/els-code.template.html', { scopeLen = letters.length, scope = 'tanakh' } = {}) {
  const tpl = readFileSync(tplPath, 'utf8');
  const fnSrc = (name, isAsync = false) => {
    const key = `${isAsync ? 'async ' : ''}function ${name}(`;
    const i = tpl.indexOf(key);
    if (i < 0) throw new Error('missing ' + name);
    let d = 0;
    for (let k = tpl.indexOf('{', i); k < tpl.length; k++) { if (tpl[k] === '{') d++; else if (tpl[k] === '}' && --d === 0) return tpl.slice(i, k + 1); }
    throw new Error('unbalanced ' + name);
  };
  const grab = (re) => { const m = tpl.match(re); if (!m) throw new Error('missing const ' + re); return m[0]; };
  const names = ['lb', 'fwdSetup', 'fwdScan', 'fwd', 'scopeRange', 'fwdDisperse', 'fwdDisperseTopUp', 'findAll', 'vdc', 'fwdLaneScan',
    'stratProbeInit', 'stratProbeRun', 'adChoose'];
  for (const opt of ['probeAdd', 'laneDone', 'stratCollect']) if (tpl.includes(`function ${opt}(`)) names.push(opt);
  const code = [
    `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};const norm=s=>{let o="";for(const c of s||"")if(c>="א"&&c<="ת")o+=(FIN[c]||c);return o;};`,
    `const scopeN=()=>${scopeLen};const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;const st={scope:${JSON.stringify(scope)}};`,
    grab(/const AD_POLICY="[^"]+",AD_BANDS=\d+,AD_PROBE_PAIRS=\d+,AD_PROBE_PAIRS_EXT=\d+;/),
    grab(/const DISPERSE_SEG=\d+;/), grab(/const DISPERSE_RESERVE_FRAC=[\d.]+,DISPERSE_RESERVE_MAX=\d+;/),
    tpl.includes('const AD_COLLECT_CHUNK=') ? grab(/const AD_COLLECT_CHUNK=\d+;/) : '',
    // sync stand-in for the Worker-pool kernel (Node has no pool): identical results, used only by the anchor path
    'async function findAllAdaptive(raw,cap){return findAll(raw,cap);}',
    ...names.map((n) => fnSrc(n)), fnSrc('routedDiscover', true),
    'this.api={routedDiscover,stratProbeInit,stratProbeRun,adChoose,findAll,norm,hitKey,AD_PROBE_PAIRS,AD_PROBE_PAIRS_EXT,AD_BANDS,stratCollect:typeof stratCollect==="function"?stratCollect:null};',
  ].join('\n');
  const ctx = vm.createContext({ T: letters.slice(0, scopeLen).split('') });
  vm.runInContext(code, ctx);
  return ctx.api;
}
