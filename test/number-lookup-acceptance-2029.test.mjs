import test from "node:test";
import assert from "node:assert/strict";
import { main, verifyIdentity } from "../docs/perf-evidence-20261015/acceptance/verify-number-lookup-page.mjs";

const rows = (value) => Array.from({ length: 20 }, (_, i) => ({ bid_id: `b${value}-${i}`, phrase: `p${i}` }));
const fakeRequest = ({ installed = true, memberIsAdmin = false, memberDenied = false, drift = false } = {}) => async (token, name, body) => {
  if (name === "rd_is_admin") return { status: 200, json: memberIsAdmin };
  if (name === "fn_number_lookup_2029_page") {
    if (!installed) return { status: 404, json: { code: "PGRST202" } };
    if (token && memberDenied) return { status: 403, json: { code: "42501" } };
    if (body.p_value == null) return { status: 200, json: [] };
    return { status: 200, json: body.p_value === 99999 ? [] : drift && body.p_value === 300 ? rows(body.p_value).reverse() : rows(body.p_value) };
  }
  return { status: 200, json: body.p_value === 99999 ? [] : rows(body.p_value) };
};

test("R3 both identities PASS when the function is installed and results are identical", async () => {
  const summary = await main({ memberToken: "member-jwt", request: fakeRequest() });
  assert.equal(summary.verdict, "PASS");
  assert.deepEqual(summary.results.map((r) => [r.identity, r.verdict]), [["guest", "PASS"], ["member", "PASS"]]);
});
test("R3 missing function is reported as NOT_INSTALLED, not as a pass", async () => {
  const summary = await main({ memberToken: "member-jwt", request: fakeRequest({ installed: false }) });
  assert.equal(summary.verdict, "NOT_INSTALLED");
});
test("R3 a member without execute permission fails (permission errors are not hidden)", async () => {
  const summary = await main({ memberToken: "member-jwt", request: fakeRequest({ memberDenied: true }) });
  assert.equal(summary.verdict, "FAIL");
  assert.equal(summary.results[1].identity, "member");
});
test("R3 an admin token is rejected as the member identity", async () => {
  const result = await verifyIdentity("member", "admin-jwt", fakeRequest({ memberIsAdmin: true }));
  assert.equal(result.verdict, "FAIL");
});
test("R3 any difference in order or content fails the guest identity", async () => {
  const summary = await main({ request: fakeRequest({ drift: true }) });
  assert.equal(summary.results[0].verdict, "FAIL");
});
test("R3 without a member token the result is INCOMPLETE, never PASS", async () => {
  const summary = await main({ memberToken: undefined, request: fakeRequest() });
  assert.equal(summary.verdict, "INCOMPLETE");
});
