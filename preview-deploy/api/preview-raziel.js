import { SUPABASE_URL, SUPABASE_ANON } from '../../src/lib/supabase.js';

// Same ai-analyze, same caller JWT, same budget. Platform identity never reaches
// the browser and never becomes a Supabase service-role token.
export function previewRazielHandler({fetchImpl=fetch,env=process.env}={}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    const fail=(status,error)=>res.status(status).json({error});
    if(env.VERCEL_ENV!=='preview'||!['gpt/2029-functional-unified-preview-20261031','gpt/2029-public-foundation-continuity-20261101', 'gpt/2029-public-frame-context-20261101', 'gpt/2029-community1187-unified-20261101', 'gpt/2029-number-fullpage-performance-20261101', 'gpt/2029-world-one-tree-sources-20261101', 'gpt/2029-public-world-number-acceptance-20261101'].includes(env.VERCEL_GIT_COMMIT_REF))return fail(404,'unavailable');
    if(req.method!=='POST')return fail(405,'method_not_allowed');
    const origin=req.headers.origin,host=req.headers.host;
    let site;try{site=new URL(origin);}catch{return fail(403,'origin_denied');}
    if(site.origin!==origin||site.protocol!=='https:'||site.host!==host)return fail(403,'origin_denied');
    const authorization=req.headers.authorization||'';
    if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(authorization))return fail(401,'authentication_required');
    const platform=req.headers['x-vercel-oidc-token'];
    if(typeof platform!=='string'||platform.length>16384||platform.split('.').length!==3)return fail(503,'preview_server_identity_unavailable');
    const body=req.body;
    if(!body||Array.isArray(body)||body.kind!=='research'||body.persona!=='raziel'||body.research_contract!=='public-number-research-run-v1')return fail(400,'research_contract_required');
    const raw=JSON.stringify(body);if(raw.length>48000)return fail(413,'payload_too_large');
    try {
      const auth=await fetchImpl(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_ANON,Authorization:authorization},redirect:'error'});
      if(!auth.ok)return fail(401,'authentication_required');
      const user=await auth.json();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user?.id||''))return fail(401,'authentication_required');
      // This review is admin-only. Verify with the existing caller-scoped server
      // role RPC; user_metadata, request bodies and browser UI are not authority.
      if(['gpt/2029-public-frame-context-20261101', 'gpt/2029-community1187-unified-20261101', 'gpt/2029-number-fullpage-performance-20261101', 'gpt/2029-world-one-tree-sources-20261101', 'gpt/2029-public-world-number-acceptance-20261101'].includes(env.VERCEL_GIT_COMMIT_REF)){
        const role=await fetchImpl(SUPABASE_URL+'/rest/v1/rpc/rd_is_admin',{headers:{apikey:SUPABASE_ANON,Authorization:authorization},redirect:'error'});
        if(!role.ok)return fail(503,'permission_unavailable');
        if(await role.json()!==true)return fail(403,'admin_required');
      }
      // No retry: ambiguous paid requests must never turn into a second model/batch.
      const result=await fetchImpl(SUPABASE_URL+'/functions/v1/ai-analyze',{method:'POST',headers:{apikey:SUPABASE_ANON,Authorization:authorization,'Content-Type':'application/json','x-sod-preview-identity':platform},body:raw,redirect:'error'});
      const data=await result.json();return res.status(result.status).json(data);
    } catch{return fail(502,'preview_research_transport_failed');}
  };
}
export default previewRazielHandler();
