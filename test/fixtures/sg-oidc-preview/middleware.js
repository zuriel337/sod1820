// Remote test fixture only. Never mounted by the root site's vercel.json.
// Actual Vercel OIDC stays on Vercel: return verification booleans, NEVER a token.
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { vercelOidcToken, sourceSha } from './runtime-reader.mjs';

export const config = { matcher: ['/(.*)'] };
const jwks = createRemoteJWKSet(new URL('https://oidc.vercel.com/.well-known/jwks'));
const team = 'sod1820-s-projects';
const issuers = new Set([`https://oidc.vercel.com/${team}`, 'https://oidc.vercel.com']);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: {
  'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow, noarchive',
} });

export default async function probe() {
  const context = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  const metadata = { diagnostic_only: true, sha: sourceSha,
    context_token_present: !!context?.headers?.['x-vercel-oidc-token'],
    env_token_present: typeof process !== 'undefined' && !!process.env?.VERCEL_OIDC_TOKEN,
    supabase_calls: 0, token_returned: false };
  const token = vercelOidcToken();
  if (!token) return json({ ...metadata, token_present: false, signature_verified: false }, 503);
  try {
    const issuer = decodeJwt(token).iss;
    if (!issuers.has(issuer)) throw new Error('unexpected issuer');
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: `https://vercel.com/${team}` });
    const expected = payload.owner_id === 'team_vtfWHZfKvdbob8gvynQb5N89'
      && payload.project_id === 'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq'
      && payload.project === 'sod1820' && payload.environment === 'preview'
      && payload.sub === `owner:${team}:project:sod1820:environment:preview`;
    return json({ ...metadata, token_present: true, signature_verified: true,
      preview_scope_verified: expected }, expected ? 200 : 403);
  } catch {
    // No error object/header dump: even diagnostic failures cannot leak a token.
    return json({ ...metadata, token_present: true, signature_verified: false }, 502);
  }
}
