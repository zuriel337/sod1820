import fs from 'node:fs';
const [,, aF, bF] = process.argv; const A=JSON.parse(fs.readFileSync(aF)), B=JSON.parse(fs.readFileSync(bF));
const f=(x)=>x==null?'-':Math.round(x*1000)/1000;
for (const r of Object.keys(A.routes)) { if(!B.routes[r]) continue;
  console.log('==',r);
  for (const k of ['fcp','lcp','ready','lastRestEnd','restCount','reqs','script','task','cls']) {
    const a=A.routes[r], b=B.routes[r];
    console.log(k.padEnd(12), `${f(a.median[k])} [${f(a.ranges[k][0])}–${f(a.ranges[k][1])}]`.padEnd(34), '→', `${f(b.median[k])} [${f(b.ranges[k][0])}–${f(b.ranges[k][1])}]`, k==='cls'?'':`  Δ${f(b.median[k]-a.median[k])}`);
  }
  const errs = s=>s.samples.reduce((n,x)=>n+x.errors.length+x.misses.length,0);
  console.log('errors/misses', errs(A.routes[r]), errs(B.routes[r]));
}
