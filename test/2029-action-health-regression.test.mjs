import test from "node:test";
import assert from "node:assert/strict";
import {evaluateActionHealth} from "../scripts/2029-action-health-regression.mjs";

test("missing metrics are UNKNOWN rather than a zero-failure success",()=>{
  assert.equal(evaluateActionHealth({action:"personal.save",current:null}).status,"UNKNOWN");
  assert.equal(evaluateActionHealth({action:"personal.save",current:{started:4,serverAck:4}}).status,"UNKNOWN");
});
test("UI success without server receipt is a release-blocking failure",()=>{
  const r=evaluateActionHealth({action:"personal.save",current:{started:10,serverAck:3,uiConfirmed:8,reloadChecks:0,reloadVerified:0}});
  assert.equal(r.status,"FAIL");
  assert.equal(r.reason,"CLIENT_SUCCESS_WITHOUT_SERVER_ACK");
});
test("lost persistence after reload is a failure even if sync returned success",()=>{
  const r=evaluateActionHealth({action:"personal.save",current:{started:30,serverAck:30,uiConfirmed:30,reloadChecks:5,reloadVerified:4}});
  assert.equal(r.reason,"RELOAD_PERSISTENCE_MISMATCH");
});
test("statistically scoped failure rate rise becomes an actionable alert",()=>{
  const r=evaluateActionHealth({action:"personal.save",previous:{started:100,explicitFailures:1},current:{started:100,serverAck:92,uiConfirmed:90,explicitFailures:9,reloadChecks:20,reloadVerified:20}});
  assert.equal(r.reason,"FAILURE_RATE_INCREASED_AT_LEAST_5PP");
});
test("healthy aggregate is cautiously OBSERVED_OK not an absolute promise",()=>{
  const r=evaluateActionHealth({action:"personal.save",current:{started:100,serverAck:100,uiConfirmed:100,explicitFailures:0,reloadChecks:20,reloadVerified:20}});
  assert.equal(r.status,"OBSERVED_OK");
});
test("impossible counts are UNKNOWN rather than safe",()=>{
  const r=evaluateActionHealth({action:"personal.save",current:{started:3,serverAck:7}});
  assert.equal(r.status,"UNKNOWN");
});
