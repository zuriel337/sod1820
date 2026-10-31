export default function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='gpt/2029-functional-unified-preview-20261031')return res.status(404).json({state:'unavailable'});
  if(req.method!=='GET')return res.status(405).json({state:'method_not_allowed'});
  const token=req.headers['x-vercel-oidc-token'];
  return res.status(200).json({target:'preview',serverIdentityAvailable:typeof token==='string'&&token.split('.').length===3,userAuthenticationRequired:true,production:false});
}
