import test from "node:test";
import assert from "node:assert/strict";
import { resolveTopicExpressionFocus2029 } from "../src/lib/research/topicExpressionFocus2029.js";

const profileReader = async () => [{methodKey:"רגיל",displayLabel:"רגיל",computedValue:358},{methodKey:"מילוי",displayLabel:"מילוי",computedValue:878},{methodKey:"מסתתר",computedValue:1237}];
test("authored single method and value retain expression, source path and exact destination",async()=>{
  const r=await resolveTopicExpressionFocus2029({phrase:"משיח",value:878,methodLabel:"מילוי",sourcePath:"findings[3]"},{profileReader});
  assert.equal(r.status,"ready"); assert.equal(r.focus.method,"מילוי"); assert.equal(r.focus.root,878);
  assert.equal(r.sourcePath,"findings[3]"); assert.equal(r.claimStatus,"profile_match_trace_not_checked");
});
test("missing method with a numeric claim or a multi-expression row never guesses",async()=>{
  let called=0; const reader=async()=>{called++;return profileReader()};
  assert.equal((await resolveTopicExpressionFocus2029({phrase:"משיח",value:878,note:"מילוי"},{profileReader:reader})).status,"needs_method");
  assert.equal((await resolveTopicExpressionFocus2029({phrase:"משיח = עולם הפוך",value:878,methodLabel:"מילוי"},{profileReader:reader})).status,"needs_exact_expression");
  assert.equal(called,0);
});
test("unregistered mixed methods or value mismatch are explicitly unavailable",async()=>{
  for(const row of [{phrase:"משיח",value:878,methodLabel:"רגיל/מילוי"},{phrase:"משיח",value:358,methodLabel:"מילוי"}])
    assert.equal((await resolveTopicExpressionFocus2029(row,{profileReader})).status,"method_unavailable_or_value_mismatch");
});
test("plain phrase with no numeric claim may use existing regular-first focus",async()=>{
  const r=await resolveTopicExpressionFocus2029({text:"משיח",sourcePath:"findings.phrases[0]"},{profileReader});
  assert.equal(r.status,"ready"); assert.equal(r.focus.root,358); assert.equal(r.claimStatus,"no_authored_numeric_claim");
});
test("profile failure and real zero are distinguished from absence",async()=>{
  assert.equal((await resolveTopicExpressionFocus2029({phrase:"א",value:0,methodLabel:"מסתתר"},{profileReader:async()=>[{methodKey:"מסתתר",computedValue:0}]})).focus.root,0);
  assert.equal((await resolveTopicExpressionFocus2029({phrase:"א",methodLabel:"רגיל"},{profileReader:async()=>{throw Error("offline")}})).status,"profile_unavailable");
});
