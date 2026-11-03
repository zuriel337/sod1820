import{readFileSync,writeFileSync,existsSync}from'node:fs';import{execFileSync}from'node:child_process';import{resolve}from'node:path';import assert from'node:assert/strict';
import{publicReadingPath,publicReadingContinuation}from'../../../src/lib/publicReadingRelease2029.js';
import{publicPostHref,decodePostSlug,postAddressSlug}from'../../../src/lib/publicPostUrls.js';
import{publicReadingCapability}from'../../../src/lib/publicReadingRelease2029.js';
const old=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','6c140d82:src/lib/publicReadingRelease2029.js'])).toString('base64'));
const baselineConfig=JSON.parse(execFileSync('git',['show','6c140d82:public-reading-deploy/vercel.json']));const config=JSON.parse(readFileSync('public-reading-deploy/vercel.json'));
const inventory=JSON.parse(readFileSync('docs/reviews/url-continuity-plan-20261103/url-inventory.json'));
const census=JSON.parse(readFileSync('docs/reviews/url-continuity-plan-20261103/db-census.json')).datasets.posts.rows;
const unhandled=JSON.parse(readFileSync('docs/reviews/public-acceptance-closure-20261103/address-counts.json')).unhandled;
const proof=JSON.parse(readFileSync(new URL('./evidence/attachment-bindings.json',import.meta.url)));
const norm=path=>decodePostSlug(path).replace(/\/+$/,'')||'/';const proofBy=new Map(proof.map(x=>[x.sourcePath,x]));
const bySlug=new Map();for(const p of census){const key=decodePostSlug(p.slug);assert.ok(!bySlug.has(key));bySlug.set(key,p);}
function trace(value,rules,adapter){let u=new URL(value,'https://sod1820.co.il');const chain=[],seen=new Set();
 for(let i=0;i<15;i++){const key=u.pathname+u.search+u.hash;assert.ok(!seen.has(key),'loop:'+value);seen.add(key);let target=null;
 for(const r of rules){if(['/(.+)/','/books/(.*)'].includes(r.source)){const re=new RegExp('^'+r.source+'$');if(re.test(u.pathname)){target=u.pathname.replace(re,r.destination);break;}}else if(norm(r.source)===norm(u.pathname)){target=r.destination;break;}}
 target??=adapter(u.pathname,u.search,u.hash);if(!target)break;
 const next=new URL(target,u.origin);if(!next.search)next.search=u.search;if(!next.hash)next.hash=u.hash;
 chain.push({from:key,to:next.pathname+next.search+next.hash});u=next;
 }return{url:u,chain};}
const lookup=inventory.rows.filter(x=>{if(!x.url.startsWith('/')||x.url.includes('/:'))return false;const t=trace(x.url,baselineConfig.redirects,old.publicReadingContinuation);if(t.chain.length)return false;const p=resolve('public-reading-deploy/dist','.'+t.url.pathname);if(existsSync(p)&&/\.[a-z0-9]{2,5}$/i.test(t.url.pathname))return false;return old.publicReadingPath(t.url.pathname,{search:t.url.search})==='post-lookup';});
assert.equal(lookup.length,2140);assert.equal(unhandled.length,469);
const sourceMap=new Map(inventory.rows.map(x=>[x.url,x]));const rows=[];
for(const [cohort,inputs]of[['post_lookup',lookup],['unhandled',unhandled]])for(const x of inputs){
 const original=sourceMap.get(x.url)||x;const t=trace(x.url,config.redirects,publicReadingContinuation),path=norm(new URL(x.url,'https://sod1820.co.il').pathname),finalPath=norm(t.url.pathname);
 const row={sourceUrl:x.url,cohort,family:x.family,evidence:original.evidence||[],sourceKinds:original.kinds||[],chain:t.chain,finalUrl:t.url.pathname+t.url.search+t.url.hash,status:'pending_decision',reason:'unproven_source_identity',launchImpact:'source-specific acceptance pending',httpEvidence:'not independently requested for every URL'};
 const p=bySlug.get(postAddressSlug(t.url.pathname));const binding=proofBy.get(path);
 if(binding){row.status='resolved';row.reason='exact_public_post_anchor_and_media';row.postId=binding.postId;row.mediaHref=binding.mediaHref;row.sourceWitnessPostIds=binding.witnessPostIds;row.launchImpact='none for mapped identity; representative hosted acceptance';assert.equal(p?.id,binding.postId);assert.equal(t.url.searchParams.get('sourceAttachment'),path);}
 else if(cohort==='post_lookup'&&p){row.status='resolved';row.reason=publicPostHref(p).startsWith('/post/')?'exact_modern_post_root_alias':'exact_legacy_post_identity';row.postId=p.id;row.canonical=publicPostHref(p);row.launchImpact='none for admitted snapshot identity; per-URL HTTP not claimed';}
 else if(/\/embed$/.test(path)&&p){row.status='resolved';row.reason='same_post_embed_representation';row.postId=p.id;row.canonical=publicPostHref(p);row.launchImpact='external iframe embedding remains governed by CSP';}
 else if(path==='/category/סוד-האותיות/גלריות-גימטריה'){row.status='resolved';row.reason='exact_saved_nested_category';row.launchImpact='none; existing exact public category reader';}
 else if(publicReadingCapability(finalPath)){row.status='intentionally_closed';row.reason=['/research-viewer','/2029/control','/editor','/traffic','/numbers-report','/stream'].includes(finalPath)?'private_role_gated_surface':'known_deferred_capability';row.launchImpact='existing launch boundary; does not retire a ready public feature';if(/\/videos\//.test(finalPath)){row.status='resolved';row.reason='exact_external_source_link_state';row.launchImpact='Facebook access external; no video playback claim';}}
 else if(['/','/world','/number','/verified'].includes(finalPath)&&t.chain.length||path==='/verified'){row.status='resolved';row.reason=path==='/verified'?'existing_verified_flag_collection':'exact_existing_route_alias';row.launchImpact='none for route adapter';}
 else if(['/*','/$1','/SLUG'].includes(path)||path.startsWith('/data/user/')){row.status='invalid';row.reason=path.startsWith('/data/user/')?'device_private_cache_path':'template_artifact_not_a_document';row.launchImpact='none; proper404 retained';}
 else if(path.startsWith('/wp-content/plugins/gallery-images/')||path==='/wp-json/wp/v2/posts'){row.status='intentionally_closed';row.reason=path.startsWith('/wp-json')?'unsupported_wordpress_api':'retired_gallery_plugin_dependency';row.launchImpact='source plugin dependencies already removed; proper resource404';}
 else if(path.startsWith('/audio/')){row.reason='historical_audio_bytes_location_missing';row.launchImpact='historical audio unavailable; not main text, no false binary200';}
 else if(/\/videos\//.test(path)){row.reason='external_embed_or_link_without_exact_absolute_source';row.launchImpact='external video-source continuation pending; data-href is not necessarily navigation';}
 else if(cohort==='post_lookup'){row.reason='no_exact_admitted_post_identity';row.launchImpact=(original.kinds||[]).some(k=>k.includes('content'))?'unresolved public-content link; source recovery required':'source-only reference; no public destination established';}
 rows.push(row);
}
assert.equal(rows.length,2609);assert.equal(new Set(rows.map(x=>x.sourceUrl)).size,2609);
const counts={},groups={};for(const r of rows){counts[r.status]=(counts[r.status]||0)+1;const key=r.cohort+':'+r.reason;groups[key]??={status:r.status,reason:r.reason,count:0,sourceUrls:[]};groups[key].count++;groups[key].sourceUrls.push(r.sourceUrl);}
const out={baseSha:'6c140d825eb617ef8126f87f3b97a739c846bdba',units:'original URL strings preserved, never dropped during deduplication',coverage:'complete reconciliation of frozen469+2140; exact identity/adapter evidence is not full per-URL hosted acceptance',counts,groups:Object.values(groups),rows};
writeFileSync(new URL('./reconciliation.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({counts,groups:Object.values(groups).map(({sourceUrls,...x})=>x)},null,2));
