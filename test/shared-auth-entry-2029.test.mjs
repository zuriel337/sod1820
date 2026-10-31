import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('2029 page, Community and account panel delegate authentication to the canonical entry',()=>{
  const projections=['src/pages/Auth2029Page.jsx','src/components/community2029/CommunitySignIn.jsx','src/components/experience2029/SystemFrame2029.jsx'];
  for(const path of projections){
    const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.match(source,/<AccountEntry2029\b/,path);
    assert.doesNotMatch(source,/\b(?:requestEmailOtp|verifyEmailOtp|signInWithPassword|signInWithGoogle|signInWithFacebook)\s*\(/,path+' must not reimplement authentication or choose providers');
  }
  const controller=fs.readFileSync(new URL('../src/components/auth2029/AccountEntry2029.jsx',import.meta.url),'utf8');
  assert.match(controller,/methods\.oauth\.map/);
  assert.doesNotMatch(controller,/googleAvailable|facebookAvailable/);
});
