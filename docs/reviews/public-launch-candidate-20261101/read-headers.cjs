const {request}=require('@playwright/test'),fs=require('fs');
(async()=>{const cfg=JSON.parse(fs.readFileSync(0,'utf8'));const api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});
try{await api.get(cfg.accessUrl);const r=await api.get(cfg.origin+'/');const html=await r.text();const asset=html.match(/(?:src=\"|import\(')(\/assets\/[^\"']+\.js)/)?.[1];const out=[];
for(const p of ['/',...(asset?[asset]:[]),'/preview-readonly-sw.js','/robots.txt']){const s=await api.get(cfg.origin+p);const h=s.headers();out.push({path:p,status:s.status(),cacheControl:h['cache-control'],robots:h['x-robots-tag'],contentType:h['content-type']});}console.log(JSON.stringify(out));}
finally{await api.dispose();}})().catch(e=>{console.error(e.name);process.exitCode=1});
