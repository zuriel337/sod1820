// Exact admitted mutation of the existing newsletter pipeline. The server owns
// purpose isolation and suppression; no general subscription or delivery action.
export function interceptOpeningMail(event, authOrigin) {
  const req=event.request, url=new URL(req.url);
  if(url.origin!==authOrigin || url.pathname!=='/functions/v1/newsletter-signup') return false;
  event.respondWith((async()=>{
    const deny=()=>new Response(JSON.stringify({error:'opening_subscription_only'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    const forward=()=>fetch(new Request(req,{cache:'no-store',credentials:'omit',redirect:'error'}));
    if(req.method==='OPTIONS'&&!url.search) return forward();
    if(req.method!=='POST'||url.searchParams.size!==1||url.searchParams.get('format')!=='json')return deny();
    const raw=await req.clone().text();if(raw.length>2048)return deny();
    const b=JSON.parse(raw);
    if(!b||Array.isArray(b)||Object.keys(b).sort().join(',')!=='consent,email,purpose,source'||b.consent!==true||b.purpose!=='site-openings'||b.source!=='2029-opening-parts'||typeof b.email!=='string'||b.email.length>120||!/^\S+@[^\s@]+\.[^\s@]+$/.test(b.email))return deny();
    return forward();
  })().catch(()=>new Response(JSON.stringify({error:'opening_subscription_only'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})));
  return true;
}
