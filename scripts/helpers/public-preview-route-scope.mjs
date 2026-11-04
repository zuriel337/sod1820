// Test-only projection of the already explicit Preview scopes in App2029.
// It never changes runtime routing or grants a canonical Production rewrite.
import assert from 'node:assert/strict';
export function productionApp2029Source(source) {
  assert.match(source,/const publicFoundationPreview = import\.meta\.env\.VITE_PUBLIC_FOUNDATION_PREVIEW === "true" \|\| PUBLIC_READING_RELEASE;/);
  const block=source.match(/\{publicFoundationPreview && <>[\s\S]*?<\/>\}/)?.[0];
  assert.ok(block,'public Foundation routes must retain their explicit Preview guard');
  const paths=[...block.matchAll(/<Route\s+path="([^"]+)"/g)].map(m=>m[1]);
  // These exact additions were already accepted by Doc37's public URL
  // continuity package. Keep the fixture closed: any extra route still fails.
  assert.deepEqual(paths,['/','/post','/verified','/number','/number/:value','/gallery','/gematria',
    '/tag/:slug','/category/:slug','/community','/community/calculator','/community/researchers','/members',
    '/community/comments','/forum','/forum/:id','/or-geula','/or-geula/video/:id','/contact','/codes','/codes/:slug','/:slug'],
    'new Foundation routes require explicit scope review');
  let result=source.replace(block,'');
  for (const [route,component,guard] of [['/posts','Posts2029Page','import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true"'],
    ['/research','GematriaEntry2029','(import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true" || PUBLIC_READING_RELEASE)']]) {
    const guarded=`{${guard} && <Route path="${route}" element={<${component} />} />}`;
    assert.ok(result.includes(guarded),`${route} must retain its explicit accepted build guard`);
    result=result.replace(guarded,'');
  }
  return result;
}
