import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const br = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const res={}; let port=5300;
for (const v of ['base','basic','off']) { const dir='var-'+v;
 const srv=http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');rs.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs)}).listen(++port);
 const pg=await br.newPage(); const set=new Set(); pg.on('request',r=>{const u=r.url();if(u.includes('127.0.0.1')&&/\/assets\/.*\.(js|css)$/.test(u))set.add(u.split('/').pop())});
 await pg.addInitScript(()=>{const of=window.fetch.bind(window);window.fetch=(i,n)=>{const u=typeof i==='string'?i:i.url;if(String((n&&n.method)||'GET')!=='GET'&&/link_identity|track_visit|ingest_event/.test(u))return Promise.resolve(new Response('null'));return of(i,n)}});
 await pg.goto(`http://127.0.0.1:${port}/world`,{waitUntil:'commit'});await pg.waitForTimeout(9000);
 res[v]=[...set].map(n=>({n:n.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/,'.$1'),gz:zlib.gzipSync(fs.readFileSync(path.join(dir,'assets',n))).length}));
 await pg.close();srv.close();}
const m=a=>new Map(a.map(x=>[x.n,x.gz]));
const B=m(res.base),S=m(res.basic),O=m(res.off);
console.log('chunks loaded: base',B.size,'basic',S.size,'off',O.size,'| total gz KB',...[B,S,O].map(x=>Math.round([...x.values()].reduce((a,b)=>a+b,0)/1024)));
for(const [name,X] of [['basic',S],['off',O]]){console.log('--',name);for(const [n,g] of B){if(!X.has(n))console.log(' GONE',n,g);else if(Math.abs(X.get(n)-g)>200)console.log(' CHANGED',n,g,'->',X.get(n))}for(const [n,g] of X)if(!B.has(n))console.log(' NEW',n,g)}
await br.close();
