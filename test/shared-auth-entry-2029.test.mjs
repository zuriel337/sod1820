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

test('sign-in by e-mail code never strands the person without a place to type the code', () => {
  const controller = fs.readFileSync(new URL('../src/components/auth2029/AccountEntry2029.jsx', import.meta.url), 'utf8');
  // A 5xx from the code request still opens the code step (the mail may have been sent even if the server reported a failure).
  assert.match(controller, /catch \(failure\) \{[\s\S]{0,400}action === "email" && Number\(failure\?\.status\) >= 500[\s\S]{0,200}setStep\("code"\)/);
  assert.match(controller, /ייתכן שהמייל בדרך/);
  // "I already have a code" is offered on the e-mail step and asks for the address first.
  assert.match(controller, /data-auth-action="have-code"/);
  assert.match(controller, /כבר קיבלתי קוד/);
  assert.match(controller, /הזינו קודם את כתובת המייל שאליה נשלח הקוד/);
  // Nothing changes which providers are enabled or what the server is asked to do.
  assert.equal((controller.match(/requestEmailOtp\(/g) || []).length, 1);
});
