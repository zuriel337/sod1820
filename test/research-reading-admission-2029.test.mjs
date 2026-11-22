import test from 'node:test';import assert from 'node:assert/strict';
import {isResearchWorkspace2029,isPersonalResearchCloudRoute2029} from '../src/lib/research/researchContext.js';
test('research is admitted on existing workspaces and aliases, not reading routes',()=>{
 for(const p of ['/world','/heichal','/היכל','/code','/els','/gematria','/2029/gematria','/2029/gematria/viral','/2029/calculator','/number/26','/2029/number/26'])assert.equal(isResearchWorkspace2029(p),true,p);
 for(const p of ['/','/2029','/post/a','/books','/book/a','/login','/auth/callback','/privacy','/%ZZ','/some-original-post'])assert.equal(isResearchWorkspace2029(p),false,p);
});


test('published findings/future Heichal does not start a research workspace', () => {
  for (const path of ['/heichal','/היכל','/findings','/research']) {
    assert.equal(isResearchWorkspace2029(path, { heichalResearch: false }), false);
  }
});

// Personal saved-library hydration is distinct from research engine admission.
// The own-account destination can load canonical cloud saves, but the generic
// profile/guest/reading routes cannot quietly start private research work.
test('only the canonical personal research route admits account-library hydration',()=>{
  assert.equal(isPersonalResearchCloudRoute2029('/2029/me/research'),true);
  assert.equal(isResearchWorkspace2029('/2029/me/research'),false);
  for(const path of ['/2029/me/profile','/2029/me/notes','/2029/me/research/other','/2029/me/research-extra','/number/776','/post','/research','/']){
    assert.equal(isPersonalResearchCloudRoute2029(path),false,path);
  }
});
