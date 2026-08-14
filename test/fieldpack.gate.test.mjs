// Tests the field-pack admin gate (the SAME decideAccess the edge runs).
// admin → allow · non-admin → 403 denied · unauthenticated → 401. Run: node test/fieldpack.gate.test.mjs
import { decideAccess } from "../supabase/functions/field-pack/gate.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// unauthenticated
let r = decideAccess({ hasBearer: false, uid: "", role: "" });
ok(!r.ok && r.status === 401 && r.error === "unauthenticated", "no bearer → 401 unauthenticated");
r = decideAccess({ hasBearer: true, uid: "", role: "" });
ok(!r.ok && r.status === 401, "bearer but no resolved uid → 401");

// non-admin (authenticated but role != admin)
r = decideAccess({ hasBearer: true, uid: "u1", role: "user" });
ok(!r.ok && r.status === 403 && r.error === "denied", "authenticated non-admin → 403 denied");
r = decideAccess({ hasBearer: true, uid: "u1", role: "" });
ok(!r.ok && r.status === 403, "authenticated no role → 403 denied");
r = decideAccess({ hasBearer: true, uid: "u1", role: "member" });
ok(!r.ok && r.status === 403, "member is not admin → 403");

// admin
r = decideAccess({ hasBearer: true, uid: "u1", role: "admin" });
ok(r.ok && r.status === 200 && !r.error, "admin → allow");

// client cannot escalate: role only comes from server lookup, so a forged uid without admin role stays denied
r = decideAccess({ hasBearer: true, uid: "attacker", role: "user" });
ok(!r.ok, "forged uid without admin role stays denied");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (field-pack gate)`);
process.exit(fail === 0 ? 0 : 1);
