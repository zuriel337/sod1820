import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {publicReadingContinuation,publicReadingPath} from '../../../src/lib/publicReadingRelease2029.js';
const inventory=JSON.parse(readFileSync('docs/reviews/url-continuity-plan-20261103/url-inventory.json'));
const redirects=JSON.parse(readFileSync('public-reading-deploy/vercel.json')).redirects;
const decode=s=>{try{return decodeURIComponent(s)}catch{return s}};
const counts={}, families={}, redirectTargetStates={};const exceptions=[];let changed=0;
for(const row of inventory.rows){
 let kind='template_or_unresolved',u;
 if(row.url.startsWith('/')&&!row.url.includes('/:')){
  u=new URL(row.url,'https://sod1820.co.il');const seen=new Set();let redirected=false;
  for(let step=0;step<12;step++){
   const key=u.pathname+u.search;if(seen.has(key))throw Error('redirect loop: '+row.url);seen.add(key);
   let target=null;
   for(const r of redirects){
    if(['/(.+)/','/books/(.*)'].includes(r.source)){
      const re=new RegExp('^'+r.source+'$');if(re.test(u.pathname)){target=u.pathname.replace(re,r.destination);break;}
    }else if(decode(r.source)===decode(u.pathname)){target=r.destination;break;}
   }
   target??=publicReadingContinuation(u.pathname,u.search,u.hash);
   if(!target)break;
   const next=new URL(target,u.origin);if(!next.search)next.search=u.search;
   u=next;redirected=true;
  }
  const state=publicReadingPath(u.pathname,{search:u.search});
  const staticPath=resolve('public-reading-deploy/dist','.'+u.pathname);
  const staticFile=staticPath.startsWith(resolve('public-reading-deploy/dist')+'/')&&existsSync(staticPath)&&/\.[a-z0-9]{2,5}$/i.test(u.pathname);
  if(redirected){redirectTargetStates[state]=(redirectTargetStates[state]||0)+1;if(state==='missing')exceptions.push({url:row.url,family:row.family,redirectTarget:u.pathname,redirected:true});}
  kind=redirected?'redirected':staticFile||state==='public'?'direct_route_candidate':state==='post-lookup'?'post_lookup_required':['closed','service-closed'].includes(state)?'building_or_held':state==='account'?'account':'unhandled_by_adapter';
  if(kind==='unhandled_by_adapter')exceptions.push({url:row.url,family:row.family});
 }
 counts[kind]=(counts[kind]||0)+1;
 families[row.family]??={};families[row.family][kind]=(families[row.family][kind]||0)+1;
}
const out={candidateBase:'3f23b26f1bf877484244eada5c1f7622eff967cb',records:inventory.rows.length,unit:'collected URL strings/templates, not deduplicated existing public documents',automaticClassificationComplete:true,liveHttpAcceptanceComplete:false,networkRequests:0,counts,families,redirectTargetStates,notes:['Redirected includes literal hosting redirects and both existing regex redirects plus canonical application aliases.','Direct route candidates still need item/publication/source acceptance.','Post lookup is unverified identity, not accepted coverage.','Building includes deliberately private/closed/held routes; not all are public launch deferrals.','Unhandled may be a real asset, private/missing URL or a broken continuation; no blanket 404 waiver.'],unhandled:exceptions};
writeFileSync('docs/reviews/public-acceptance-closure-20261103/address-counts.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({records:out.records,counts}));
