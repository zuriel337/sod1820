// prints a comparison table from raw/<stage>.json  (usage: node summarize.mjs s0 s3 s4 ...)
import fs from 'node:fs';
const st = process.argv.slice(2); const R = {}; for (const s of st) { try { R[s] = JSON.parse(fs.readFileSync(process.env.RAWDIR + '/' + s + '.json')); } catch { } }
const cl = (s, step) => { const a = (R[s]?.raw || []).map(r => r.steps?.[step]?.cls).filter(x => x != null); if (!a.length) return '-'; const sorted = [...a].sort((x, y) => x - y); return `${sorted[Math.floor(sorted.length / 2)].toFixed(2)} bad${a.filter(x => x > 0.1).length}/${a.length}`; };
const g = (s, step, f) => { if (f === 'cls') return cl(s, step); const v = R[s]?.stages?.[step]?.[f]; return v ? `${Math.round(v.med)}[${v.range?.join('-')}]` : '-'; };
const row = (title, step, f) => console.log(title.padEnd(28), st.map(s => (R[s] ? g(s, step, f) : '-').padEnd(16)).join(''));
console.log(''.padEnd(28), st.map(s => `${s}(n${R[s]?.runs})`.padEnd(16)).join(''));
console.log('coldHome READY (after load)'.padEnd(28), st.map(s => R[s] ? `${Math.round(R[s].coldHome.med)}[${R[s].coldHome.range}]`.padEnd(16) : '-').join(''));
for (const [t, step] of [['tap Home->Post', 'toPost'], ['browser back ->Home', 'backHome'], ['menu tap ->World', 'toWorld'], ['back World->Home', 'backFromWorld'], ['forward ->World', 'forwardWorld']]) { row(t + ' READY ms', step, 'ms'); row(t + ' block ms', step, 'block'); row(t + ' CLS', step, 'cls'); }
row('tap evMax (Post)', 'toPost', 'evMax'); row('tap evMax (World)', 'toWorld', 'evMax');
for (const s of ['scrollHome', 'scrollPost', 'scrollWorld']) { row(s + ' jank>50', s, 'jank50'); row(s + ' p95 frame', s, 'p95'); row(s + ' CLS', s, 'cls'); row(s + ' block', s, 'block'); }
row('backHome y restored', 'backHome', 'yRestored'); row('forwardWorld y restored', 'forwardWorld', 'yRestored');
console.log('errors', st.map(s => `${s}:${JSON.stringify([R[s]?.errors?.runsWithError, R[s]?.errors?.pageErrors, R[s]?.errors?.unmappedRpc?.length, Math.max(...(R[s]?.errors?.missesPerRun || [0]))])}`).join(' '));
console.log('failure', st.map(s => `${s}:${R[s]?.failure?.afterFailedChunk?.blankPage === false ? 'noblank' : 'BLANK'}/${R[s]?.failure?.afterFailedChunk?.hasRetryOrMessage}`).join(' '));
