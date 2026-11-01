// GET-only public publication verification; only POSTs are denied Preview APIs,
// with no credentials/body capable of performing a canonical product operation.
const {request}=require('@playwright/test'),fs=require('fs'),assert=require('assert/strict');
const dir=process.env.SOD_LAUNCH_HTTP_EVIDENCE;fs.mkdirSync(dir,{recursive:true});
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();
 let api;const out={sha:'cf1f8f1a35eb90c10a3a84a310f8616b2121f965',checks:[],liveProductWrites:0,models:0};
 try{const {origin,accessUrl}=JSON.parse(line);api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});await api.get(accessUrl);
 const check=(name,evidence)=>out.checks.push({name,...evidence});
 const root=await api.get(origin+'/'),html=await root.text();assert.equal(root.status(),200);
 const asset=html.match(/(?:src="|import\(')(\/assets\/[^"']+\.js)/)?.[1];assert.ok(asset);
 for(const path of ['/',asset,'/preview-readonly-sw.js','/robots.txt','/login','/privacy','/updates','/unsubscribe','/map']){
  const r=await api.get(origin+path),h=r.headers();assert.equal(r.status(),200,path);assert.match(h['x-robots-tag'],/noindex/);
  if(path===asset)assert.equal(h['cache-control'],'private, max-age=31536000, immutable');else assert.match(h['cache-control'],/no-store/);
  check('protected document/header',{path,status:r.status(),cacheControl:h['cache-control'],robots:h['x-robots-tag']});
 }
 const robots=await api.get(origin+'/robots.txt');assert.match(await robots.text(),/Disallow:\s*\//);
 const posts=require('../public-foundation-20261101/evidence/live-posts.json');
 for(const post of posts){const canonical=new URL(post.link,'https://sod1820.co.il'),path=canonical.pathname;
  const r=await api.get(origin+path+'?source=publication-acceptance&part=2&part=7'),body=await r.text();assert.equal(r.status(),200);
  const href=body.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];assert.equal(href,canonical.href);
  assert.ok(body.includes('property="og:url"')||body.includes("property='og:url'"));check('real post canonical',{id:post.id,source:post.source,path,canonical:href,status:r.status()});
 }
 const missing=await api.get(origin+'/sod-no-such-public-post-acceptance-20261101');assert.equal(missing.status(),404);check('real HTTP404',{status:404});
 const map=await api.get(origin+'/sitemap.xml');assert.equal(map.status(),200);const xml=await map.text();
 const urls=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.ok(urls.length>1000);assert.equal(new Set(urls).size,urls.length);
 for(const u of urls){const path=new URL(u).pathname;assert.equal(new URL(u).origin,'https://sod1820.co.il');assert.equal(/^\/(?:heichal|journey|2029\/journey|raziel|login|updates|unsubscribe)(?:\/|$)/.test(path),false,path);}
 for(const post of posts)assert.ok(urls.includes(new URL(post.link,'https://sod1820.co.il').href),post.link);
 check('canonical XML',{count:urls.length,unique:true,historicalAndNativePosts:true,noPrivateOrDeferredRoutes:true,indexingProven:false});
 for(const [path,body]of[['/api/contributor-self',{action:'avatar'}],['/api/preview-raziel',{kind:'research',persona:'raziel'}]]){
  const r=await api.post(origin+path,{data:body,headers:{origin}});assert.equal(r.status(),403);check('direct Preview API write denial',{path,status:403,callerCredentials:false});
 }
 out.ok=true;
 }catch(e){out.ok=false;out.error={name:e.name,message:String(e.message).split('\n').slice(0,4).join('\n').slice(0,450)};}
 finally{await api?.dispose();fs.writeFileSync(dir+'/http-publication.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));process.exitCode=out.ok?0:1;}
});
