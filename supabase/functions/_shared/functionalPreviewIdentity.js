// Extend the existing site transport with Vercel's server identity, not a client
// Origin/role claim. Supabase remains the user/permission/budget authority.
export const FUNCTIONAL_PREVIEW_IDENTITY = Object.freeze({
  issuers: ['https://oidc.vercel.com/sod1820-s-projects', 'https://oidc.vercel.com'],
  audience: 'https://vercel.com/sod1820-s-projects',
  subject: 'owner:sod1820-s-projects:project:sod1820:environment:preview',
  projectId: 'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq',
  ownerId: 'team_vtfWHZfKvdbob8gvynQb5N89',
});
const keySets = new Map();
export function functionalPreviewJwtOptions(issuer) {
  if (!FUNCTIONAL_PREVIEW_IDENTITY.issuers.includes(issuer)) throw new Error('preview_issuer_denied');
  return {
    issuer,audience:FUNCTIONAL_PREVIEW_IDENTITY.audience,subject:FUNCTIONAL_PREVIEW_IDENTITY.subject,
    algorithms:['RS256'],requiredClaims:['iss','aud','sub','exp','iat'],maxTokenAge:'2h',clockTolerance:10,
  };
}
async function verifyPlatformToken(token) {
  const {decodeJwt,createRemoteJWKSet,jwtVerify} = await import('npm:jose@6.2.13');
  const issuer = decodeJwt(token).iss;
  if (!FUNCTIONAL_PREVIEW_IDENTITY.issuers.includes(issuer)) throw new Error('preview_issuer_denied');
  if (!keySets.has(issuer)) keySets.set(issuer,createRemoteJWKSet(new URL(issuer+'/.well-known/jwks'),{timeoutDuration:5000}));
  return jwtVerify(token,keySets.get(issuer),functionalPreviewJwtOptions(issuer));
}
export async function verifyFunctionalPreviewIdentity(token,{userRef,verifyToken=verifyPlatformToken}={}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userRef||'')
      || typeof token!=='string' || token.length>16384 || token.split('.').length!==3) return false;
  try {
    const {payload}=await verifyToken(token);
    // Keep claim checks even when a test supplies an offline signature verifier.
    if(!FUNCTIONAL_PREVIEW_IDENTITY.issuers.includes(payload.iss)
      || !(Array.isArray(payload.aud)?payload.aud:[payload.aud]).includes(FUNCTIONAL_PREVIEW_IDENTITY.audience)
      || payload.sub!==FUNCTIONAL_PREVIEW_IDENTITY.subject
      || (payload.project_id!=null&&payload.project_id!==FUNCTIONAL_PREVIEW_IDENTITY.projectId)
      || (payload.owner_id!=null&&payload.owner_id!==FUNCTIONAL_PREVIEW_IDENTITY.ownerId)
      || (payload.environment!=null&&payload.environment!=='preview')) return false;
    return true;
  } catch { return false; }
}
