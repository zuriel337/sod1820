import {decodeJwt,createRemoteJWKSet,jwtVerify} from 'jose';
import {FUNCTIONAL_PREVIEW_IDENTITY,functionalPreviewJwtOptions} from '../../supabase/functions/_shared/functionalPreviewIdentity.js';
const keys=new Map();
async function verifyPlatform(token){
  const issuer=decodeJwt(token).iss;
  const options=functionalPreviewJwtOptions(issuer);
  if(!keys.has(issuer))keys.set(issuer,createRemoteJWKSet(new URL(issuer+'/.well-known/jwks'),{timeoutDuration:5000}));
  const {payload}=await jwtVerify(token,keys.get(issuer),options);
  return (payload.project_id==null||payload.project_id===FUNCTIONAL_PREVIEW_IDENTITY.projectId)
    &&(payload.owner_id==null||payload.owner_id===FUNCTIONAL_PREVIEW_IDENTITY.ownerId)
    &&(payload.environment==null||payload.environment==='preview');
}
export function previewCapabilitiesHandler({env=process.env,verifyToken=verifyPlatform}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(env.VERCEL_ENV!=='preview'||!['gpt/2029-functional-unified-preview-20261031','gpt/2029-public-foundation-continuity-20261101'].includes(env.VERCEL_GIT_COMMIT_REF))return res.status(404).json({state:'unavailable'});
    if(req.method!=='GET')return res.status(405).json({state:'method_not_allowed'});
    const token=req.headers['x-vercel-oidc-token'];
    const available=typeof token==='string'&&token.length<16384&&token.split('.').length===3;
    let verified=false;
    if(available)try{verified=await verifyToken(token);}catch{}
    return res.status(200).json({target:'preview',serverIdentityAvailable:available,serverIdentityVerified:verified,userAuthenticationRequired:true,production:false});
  };
}
export default previewCapabilitiesHandler();
