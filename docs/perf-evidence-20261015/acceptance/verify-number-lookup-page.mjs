// Post-install acceptance for fn_number_lookup_2029_page (R3). READ-ONLY: only calls the two lookup RPCs.
// Identities: GUEST (public anon key) and MEMBER (a signed-in NON-admin user; pass its access token in MEMBER_ACCESS_TOKEN,
// never commit it). Exit codes: 0 PASS · 2 NOT_INSTALLED (PGRST202) · 1 FAIL.
//   node docs/perf-evidence-20261015/acceptance/verify-number-lookup-page.mjs
//   MEMBER_ACCESS_TOKEN=... node docs/perf-evidence-20261015/acceptance/verify-number-lookup-page.mjs
import { SUPABASE_URL, SUPABASE_ANON } from "../../../src/lib/supabasePublicConfig.js";

export const CASES = [26, 92, 300, 1820, 5112, 99999];
const rpcRequest = (baseUrl, anon) => async (token, name, body) => {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, { method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${token || anon}`, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
  let json = null; try { json = await response.json(); } catch { /* empty */ }
  return { status: response.status, json };
};

export async function verifyIdentity(label, token, request) {
  const out = { identity: label, checks: [], verdict: "PASS" };
  const add = (name, ok, detail) => { out.checks.push({ name, ok, detail }); if (!ok && out.verdict === "PASS") out.verdict = "FAIL"; };
  if (label === "member") {
    const who = await request(token, "rd_is_admin", {});
    if (who.status !== 200 || who.json !== false) { add("identity is a signed-in NON-admin", false, who); return out; }
    add("identity is a signed-in NON-admin", true, "rd_is_admin=false");
  }
  const probe = await request(token, "fn_number_lookup_2029_page", { p_value: null, p_limit: 1, p_after_bid_id: null });
  if (probe.json?.code === "PGRST202") { out.verdict = "NOT_INSTALLED"; add("function exists for this identity", false, probe.json.code); return out; }
  add("function executable for this identity (NULL probe 200 + empty)", probe.status === 200 && Array.isArray(probe.json) && probe.json.length === 0, { status: probe.status, code: probe.json?.code });
  if (out.verdict !== "PASS") return out;
  for (const value of CASES) {
    const first = await Promise.all([request(token, "fn_number_lookup", { p_value: value, p_limit: 20, p_after_bid_id: null }), request(token, "fn_number_lookup_2029_page", { p_value: value, p_limit: 20, p_after_bid_id: null })]);
    add(`value ${value}: first page identical (ordered, all fields) and HTTP 200`, first[0].status === 200 && first[1].status === 200 && JSON.stringify(first[0].json) === JSON.stringify(first[1].json), { rows: first[1].json?.length ?? null });
    const cursor = first[0].json?.[4]?.bid_id;
    if (cursor) {
      const next = await Promise.all([request(token, "fn_number_lookup", { p_value: value, p_limit: 20, p_after_bid_id: cursor }), request(token, "fn_number_lookup_2029_page", { p_value: value, p_limit: 20, p_after_bid_id: cursor })]);
      add(`value ${value}: cursor page identical`, next[0].status === 200 && next[1].status === 200 && JSON.stringify(next[0].json) === JSON.stringify(next[1].json), { rows: next[1].json?.length ?? null });
    }
  }
  return out;
}

export async function main({ baseUrl = SUPABASE_URL, anon = SUPABASE_ANON, memberToken = process.env.MEMBER_ACCESS_TOKEN, request = rpcRequest(baseUrl, anon) } = {}) {
  const results = [await verifyIdentity("guest", null, request)];
  if (memberToken) results.push(await verifyIdentity("member", memberToken, request));
  else results.push({ identity: "member", verdict: "NOT_RUN", checks: [], note: "MEMBER_ACCESS_TOKEN not provided" });
  const verdict = results.some((r) => r.verdict === "FAIL") ? "FAIL" : results.some((r) => r.verdict === "NOT_INSTALLED") ? "NOT_INSTALLED" : results.some((r) => r.verdict === "NOT_RUN") ? "INCOMPLETE" : "PASS";
  return { verdict, results };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await main();
  console.log(JSON.stringify(summary, null, 1));
  process.exit(summary.verdict === "PASS" ? 0 : summary.verdict === "NOT_INSTALLED" ? 2 : 1);
}
