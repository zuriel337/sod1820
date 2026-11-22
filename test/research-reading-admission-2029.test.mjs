import test from 'node:test';import assert from 'node:assert/strict';
import {isResearchWorkspace2029} from '../src/lib/research/researchContext.js';
test('research is admitted on existing workspaces and aliases, not reading routes',()=>{
 for(const p of ['/world','/heichal','/היכל','/code','/els','/gematria','/2029/gematria','/2029/gematria/viral','/2029/calculator','/number/26','/2029/number/26'])assert.equal(isResearchWorkspace2029(p),true,p);
 for(const p of ['/','/2029','/post/a','/books','/book/a','/login','/auth/callback','/privacy','/%ZZ','/some-original-post'])assert.equal(isResearchWorkspace2029(p),false,p);
});


test('published Heichal reading does not start a research workspace', async () => {
  const { requestedHeichalResearch } = await import('../src/lib/heichalPublicReading2029.js');
  for (const path of ['/heichal', '/היכל', encodeURI('/היכל')]) {
    for (const isAdmin of [false, true]) {
      assert.equal(isResearchWorkspace2029(path, { heichalResearch: requestedHeichalResearch('', isAdmin) }), false);
      assert.equal(isResearchWorkspace2029(path, { heichalResearch: requestedHeichalResearch('?mode=research', isAdmin) }), isAdmin);
    }
  }
});
