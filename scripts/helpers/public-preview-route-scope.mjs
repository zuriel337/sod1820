// Test-only projection of the already explicit Preview scopes in App2029.
// It never changes runtime routing or grants a canonical Production rewrite.
import assert from 'node:assert/strict';
export function productionApp2029Source(source) {
  assert.match(source,/const publicFoundationPreview = import\.meta\.env\.VITE_PUBLIC_FOUNDATION_PREVIEW === "true";/);
  const block=source.match(/\{publicFoundationPreview && <>[\s\S]*?<\/>\}/)?.[0];
  assert.ok(block,'public Foundation routes must retain their explicit Preview guard');
  const paths=[...block.matchAll(/<Route\s+path="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(paths,['/','/post','/number','/number/:value','/gallery','/:slug'],'new Foundation routes require explicit scope review');
  let result=source.replace(block,'');
  for (const [route,component] of [['/posts','Posts2029Page'],['/research','GematriaEntry2029']]) {
    const guarded=`{import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true" && <Route path="${route}" element={<${component} />} />}`;
    assert.ok(result.includes(guarded),`${route} must retain its functional-Preview build guard`);
    result=result.replace(guarded,'');
  }
  return result;
}
