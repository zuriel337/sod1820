import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('2029 page, Community and account panel delegate authentication to the canonical entry',()=>{
  const projections=['src/pages/Auth2029Page.jsx','src/components/community2029/CommunitySignIn.jsx','src/components/experience2029/SystemFrame2029.jsx'];
  for(const path of projections){
    const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.match(source,/<AccountEntry2029\b/,path);
    assert.doesNotMatch(source,/\b(?:requestEmailOtp|verifyEmailOtp|signInWithPassword|signInWithGoogle|signInWithFacebook|signUpWithPassword|confirmSignupCode|resendSignupCode|requestPasswordReset|verifyRecoveryCode|setNewPassword)\s*\(/,path+' must not reimplement authentication or choose providers');
  }
  const controller=fs.readFileSync(new URL('../src/components/auth2029/AccountEntry2029.jsx',import.meta.url),'utf8');
  assert.match(controller,/methods\.oauth\.map/);
  assert.doesNotMatch(controller,/googleAvailable|facebookAvailable/);
});

test('password account entry: confirmation and reset are code-based, a failed send never looks like a success, no link is promised', () => {
  const controller = fs.readFileSync(new URL('../src/components/auth2029/AccountEntry2029.jsx', import.meta.url), 'utf8');
  const auth = fs.readFileSync(new URL('../src/lib/auth.js', import.meta.url), 'utf8');
  // The misleading promise of the previous entry is gone: an e-mail link is never offered as a way in.
  assert.doesNotMatch(controller, /אם יש בו קישור|לחצו עליו|ייתכן שהמייל בדרך|שלחו לי קוד כניסה|קוד כניסה מהמייל|כניסה עם קוד למייל/);
  // Sign-in by emailed code / magic link is no longer a method of this entry, and nothing asks the server for a redirect or creates a user by OTP.
  assert.doesNotMatch(controller, /requestEmailOtp|verifyEmailOtp|signInWithOtp|shouldCreateUser|emailRedirectTo/);
  // Every account operation goes through its dedicated helper.
  for (const helper of ['signInWithPassword', 'signUpWithPassword', 'confirmSignupCode', 'resendSignupCode', 'requestPasswordReset', 'verifyRecoveryCode', 'setNewPassword']) {
    assert.equal((controller.match(new RegExp(helper + '\\(', 'g')) || []).length >= 1, true, helper + ' is used by the entry');
  }
  // A failure is classified and shown on the same step; no status-based "maybe it was sent" shortcut survives.
  assert.match(controller, /describeAuthFailure\(failure, stage\)/);
  assert.doesNotMatch(controller, /Number\(failure\?\.status\) >= 500/);
  // "I already have a code" remains, so a mail that did arrive can still be used after a hiccup.
  assert.match(controller, /data-auth-action="have-code"/);
  assert.match(controller, /כבר קיבלתי קוד אימות/);
  assert.match(controller, /הזינו קודם את כתובת המייל שאליה נשלח הקוד/);
  // Registration never carries user metadata or a consent, and the entry tells the truth about the mailing list.
  const signUp = auth.slice(auth.indexOf('export async function signUpWithPassword'), auth.indexOf('export async function confirmSignupCode'));
  assert.doesNotMatch(signUp, /options|data\s*:|emailRedirectTo|consent|acquisition|visitor/i);
  assert.match(controller, /data-signup-updates-policy="explicit-consent-only"/);
  assert.doesNotMatch(controller, /existing-site-default|תקבלו גם עדכוני אתר/);
  assert.doesNotMatch(controller, /type="checkbox"/, 'no pre-ticked or hidden consent control on the account form');
  // Nothing changes which providers are enabled.
  assert.match(controller, /methods\.oauth\.map/);
});
