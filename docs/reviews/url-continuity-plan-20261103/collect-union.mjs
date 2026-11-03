// Evidence artifact only. This classifier is NOT imported by application routing.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {publicReadingPath} from '../../../src/lib/publicReadingRelease2029.js';
import {publicPostHref} from '../../../src/lib/publicPostUrls.js';
const dir=path.dirname(fileURLToPath(import.meta.url)),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const db=read('db-census.json'),routes=read('source-routes.json'),posts=db.datasets.posts.rows;
const decoded=s=>{try{return decodeURIComponent(s)}catch{return s}};
const postPaths=new Set(posts.map(p=>decoded(new URL(publicPostHref(p),'https://sod1820.co.il').pathname).replace(/\/$/,'')));
const postAliasPaths=new Set(posts.flatMap(r=>[decoded('/'+r.slug),decoded('/post/'+r.slug)]));
function family(p,u){
 if(p==='/2029'&&u.searchParams.get('preview')==='community')return 'F09';
 if(postPaths.has(p)||postAliasPaths.has(p)||p==='/post/:slug'||(p==='/'&&u.searchParams.has('p')))return 'F01';
 if(p==='/')return 'F00';
 if(/^\/category\/וידאו\/?$/.test(p))return 'F05';
 if(/^\/category\//.test(p))return 'F03';if(/^\/tag\//.test(p))return 'F04';
 if(['/chat','/דף-צאט-ראשי','/community/chat'].includes(p))return 'F07';if(p==='/community')return 'F06';
 if(p==='/community/comments'||/^\/forum(?:\/|$)/.test(p))return 'F10';
 if(p==='/community/calculator')return 'F15';if(p==='/community/whatsapp')return 'F11';
 if(['/community/researchers','/members'].includes(p))return 'F12';
 if(p==='/community/researcher/me'||/^\/2029\/me\//.test(p)||p==='/profile')return 'F25';
 if(/^\/(?:community\/researcher|researcher)\//.test(p)||p==='/888')return 'F13';
 if(/^\/(?:number|topic)(?:\/|$)/.test(p)||/^\/2029\/number\//.test(p))return 'F16';
 if(/^\/(?:gematria|גימטריה|2029\/(?:gematria|calculator))(?:\/|$)/.test(p))return 'F14';
 if(/^\/(?:gallery|archive|gallery-updates)$/.test(p))return 'F17';
 if(/^\/(?:or-geula|אור-הגאולה)(?:\/|$)/.test(p))return 'F18';if(/^\/video\//.test(p))return 'F19';
 if(/^\/codes(?:\/|$)/.test(p))return 'F20';
 if(/^\/(?:code|els|lab\/els|tzofen.html)(?:\/|$)/.test(p))return 'F21';
 if(/^\/(?:books?|book.html)(?:\/|$)/.test(p))return 'F22';
 if(/^\/(?:heichal|היכל|journey|raziel|2029\/(?:journey|raziel)|beit-midrash|research)(?:\/|$)/.test(p))return 'F23';
 if(['/privacy','/unsubscribe','/updates'].includes(p))return 'F27';
 if(['/contact','/צור-קשר','/about'].includes(p))return 'F24';
 if(['/login','/auth/callback','/join','/welcome'].includes(p))return 'F26';
 if(['/early-access','/melech-hamisparim/718','/whatsapp/kod-hametsiut','/tiktok/melech'].includes(p))return 'F28';
 if(['/credits','/buy'].includes(p))return 'F29';
 if(/^\/(?:admin|edit|editor|control|traffic|reports|2029\/control)(?:\/|$)/.test(p))return 'F30';
 if(p.endsWith('/embed/')||p.endsWith('/embed')||/\.html$/.test(p))return 'F33';
 if(/^\/(?:api|wp-content|wp-includes|uploads|assets|images|audio|wp-json)(?:\/|$)/.test(p)||/\.(?:xml|txt|png|jpg|jpeg|css|js|svg|woff2|pdf|mp4|mp3|wav)$/.test(p))return 'F32';
 if(/^\/(?:post|posts|2029\/posts)\/?$/.test(p))return 'F02';
 if(['/name','/שם','/name-lab','/מעבדת-השם','/spatial','/verse','/language','/cross'].some(x=>p===x||p.startsWith(x+'/')))return 'F31';
 if(['/world','/map','/2029'].includes(p))return 'F00';
 if(/^\/(?:start|whats-new|broadcasts|timeline|numbers|theme|stream|enter|reality|experience|sulamot|galaxy|rooms)(?:\/|$)/.test(p))return 'F34';
 return 'UNRESOLVED';
}
const all=new Map(),omitted=[];
function add(raw,evidence,kind='observed-url'){
 if(!raw)return;try{
  const u=new URL(raw,'https://sod1820.co.il');if(!['sod1820.co.il','www.sod1820.co.il','sod1820.vercel.app'].includes(u.hostname)||!['http:','https:'].includes(u.protocol))return;
  if([...u.searchParams.keys()].some(k=>/token|signature|password|email|^e$|^t$|^code$|_vercel_share/i.test(k))){omitted.push({source:evidence,reason:'sensitive-query-not-exported'});return;}
  const url=u.pathname+u.search+u.hash,p=decoded(u.pathname).replace(/\/$/,'')||'/';
  const r=all.get(url)||{url,decodedPath:decoded(u.pathname),family:family(p,u),currentPolicy:publicReadingPath(u.pathname),kinds:[],evidence:[]};
  if(!r.kinds.includes(kind))r.kinds.push(kind);if(!r.evidence.includes(evidence))r.evidence.push(evidence);all.set(url,r);
 }catch{omitted.push({source:evidence,reason:'invalid-url'});}
}
for(const u of read('live-sitemap.json').urls)add(u,'live sitemap.xml 2026-11-03');
for(const r of read('source-links.json').links)add(r.url,r.source+':'+r.line,'source-literal');
for(const p of posts){add(publicPostHref(p),'DB public posts id='+p.id,'canonical-post');if(p.link)add(p.link,'DB public posts.link id='+p.id,'stored-link');}
for(const r of db.datasets.internal_links.rows)add(r.path,'DB published content href; occurrences='+r.link_occurrences+'; examples='+r.example_post_ids.join(','),'content-href-query-fragment-redacted');
for(const r of db.datasets.media_links.rows)add(r.path,'DB public HTML '+r.attribute,'content-resource');
for(const r of db.datasets.public_contributor_slugs.rows)add('/community/researcher/'+encodeURIComponent(r.slug),'DB public-eligible contributor','public-metadata-candidate');
for(const r of db.datasets.galleries.rows)if(r.wp_gallery_id!=null)add('/gallery?gallery='+r.wp_gallery_id,'DB historical wp_gallery_id '+r.wp_gallery_id,'identity-not-publicity-proof');
for(const r of routes.redirectsPublication){add(r.source,'public-reading-deploy/vercel.json redirect source','redirect-pattern');add(r.destination,'public-reading-deploy/vercel.json redirect destination','redirect-target');}
for(const r of read('db-recognized-traffic.json').rows)add(r.path,'retained '+r.source+' observed '+r.first_at+'..'+r.last_at,'recognized-traffic-path');
for(const r of routes.legacyRoutes)add(r.pattern,'live Legacy App.jsx:'+r.line,'route-template');
for(const r of routes.routes2029)add(r.pattern,'App2029.jsx:'+r.line,'route-template');
const rows=[...all.values()].sort((a,b)=>a.url.localeCompare(b.url)),familyCounts={},policyCounts={};for(const r of rows){familyCounts[r.family]=(familyCounts[r.family]||0)+1;policyCounts[r.currentPolicy]=(policyCounts[r.currentPolicy]||0)+1;}
const report={sourceSha:routes.sourceSha,kind:'URL planning inventory; no runtime routing source of truth',completeSiteCoverage:false,notHttpAcceptance:true,normalization:'Original URL retained; decode-once/trailing-slash only for diagnostic family grouping. Never changes runtime URLs.',omitted,summary:{rows:rows.length,familyCounts,policyCounts},rows};
fs.writeFileSync(path.join(dir,'url-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
