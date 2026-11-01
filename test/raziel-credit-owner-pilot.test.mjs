import test from 'node:test';
import assert from 'node:assert/strict';
import { isRazielCreditPilot as allowed, RAZIEL_CREDIT_PILOT_USER_ID as owner } from '../supabase/functions/_shared/razielCreditPilot.js';
test('only enabled verified owner admin can be metered',()=>{
  assert.equal(allowed({enabled:true,verifiedUserId:owner,verifiedRole:'admin'}),true);
  for(const enabled of[false,undefined,'on',1])assert.equal(allowed({enabled,verifiedUserId:owner,verifiedRole:'admin'}),false);
  for(const verifiedRole of['user','anon',undefined])assert.equal(allowed({enabled:true,verifiedUserId:owner,verifiedRole}),false);
  for(const verifiedUserId of[undefined,'','11111111-1111-4111-8111-111111111111'])assert.equal(allowed({enabled:true,verifiedUserId,verifiedRole:'admin'}),false);
  assert.equal(allowed({enabled:true,user_id:owner,role:'admin'}),false);
});
