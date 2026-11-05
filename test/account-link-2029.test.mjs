import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { normalizeOffer, confirmAccountLink, ACCOUNT_LINK_ENABLED, ACCOUNT_LINK_FUNCTION } from "../src/lib/accountLink.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const strip = (sql) => sql.replace(/--.*$/gm, "");

test("dark by default: the feature flag is off and the offer normalizer accepts only a real 'offered' row", () => {
  assert.equal(ACCOUNT_LINK_ENABLED, false);
  assert.equal(normalizeOffer([]), null);
  assert.equal(normalizeOffer([{ offer_id: "x", state: "offered" }]), null);
  assert.equal(normalizeOffer([{ offer_id: "793dc271-2194-4110-b5ff-d2422d6f1c85", state: "dismissed" }]), null);
  assert.deepEqual(normalizeOffer([{ offer_id: "793dc271-2194-4110-b5ff-d2422d6f1c85", state: "offered" }]), { id: "793dc271-2194-4110-b5ff-d2422d6f1c85" });
});

test("confirm call: secondary token in Authorization, primary token in the body; only verified/already_verified count as success", async () => {
  const calls = [];
  const mk = (status, body) => async (url, init) => { calls.push({ url, init }); return { ok: status === 200, json: async () => body }; };
  assert.equal(await confirmAccountLink({ secondaryAccessToken: "S", offerId: "o", nonce: "n", primaryAccessToken: "P", fetchImpl: mk(200, { status: "verified" }) }), true);
  assert.equal(await confirmAccountLink({ secondaryAccessToken: "S", offerId: "o", nonce: "n", primaryAccessToken: "P", fetchImpl: mk(200, { status: "already_verified" }) }), true);
  assert.equal(await confirmAccountLink({ secondaryAccessToken: "S", offerId: "o", nonce: "n", primaryAccessToken: "P", fetchImpl: mk(400, { status: "rejected" }) }), false);
  assert.equal(await confirmAccountLink({ secondaryAccessToken: "S", offerId: "o", nonce: "n", primaryAccessToken: "P", fetchImpl: mk(200, { status: "weird" }) }), false);
  assert.equal(calls[0].url, ACCOUNT_LINK_FUNCTION);
  assert.equal(calls[0].init.headers.authorization, "Bearer S");
  assert.deepEqual(JSON.parse(calls[0].init.body), { offerId: "o", nonce: "n", primaryAccessToken: "P" });
});

test("migration: RLS fail-closed, no table grants, definer functions with fixed search_path, confirm is service-only, hashed nonce, append-only ledger", () => {
  const sql = read("supabase/migrations/20261105150000_account_link_offers_v1.sql"), code = strip(sql);
  assert.equal((code.match(/enable row level security/g) || []).length, 2);
  assert.doesNotMatch(code, /create policy/i, "no policies: fail closed");
  assert.match(code, /revoke all on public\.account_link_offers from public, anon, authenticated/);
  assert.match(code, /revoke all on function public\.account_link_confirm_v1\(uuid, uuid, uuid, text\) from public, anon, authenticated/);
  assert.match(code, /grant execute on function public\.account_link_confirm_v1\(uuid, uuid, uuid, text\) to service_role/);
  assert.doesNotMatch(code, /grant execute on function public\.account_link_confirm_v1[^;]*authenticated/);
  assert.equal((code.match(/security definer set search_path to 'public', 'pg_temp'/g) || []).length, 4);
  assert.match(code, /sha256\(convert_to\(nonce/); assert.match(code, /interval '10 minutes'/);
  assert.match(code, /for update/); assert.match(code, /append-only/);
  assert.match(code, /unique \(secondary_user_id\)/);
});

test("migration never touches Auth, credentials, sessions, credits, billing or notifications", () => {
  const code = strip(read("supabase/migrations/20261105150000_account_link_offers_v1.sql"));
  for (const forbidden of [/\bupdate\s+auth\./i, /\bdelete\s+from\s+auth\./i, /\binsert\s+into\s+auth\./i, /credit_ledger/i, /payment/i, /subscription/i, /notification/i, /push_/i, /profiles/i, /sessions/i, /refresh_tokens/i])
    assert.doesNotMatch(code, forbidden, String(forbidden));
});

test("seed: authorized pair only, owner-assertion basis, not under supabase/migrations", () => {
  const seed = read("docs/reviews/account-link-20261105/seed-torah-temima.sql");
  assert.match(seed, /365fb241-77ed-4a9d-98ab-4e30ab53c093/); assert.match(seed, /793dc271-2194-4110-b5ff-d2422d6f1c85/);
  assert.match(seed, /'owner_assertion'/); assert.match(seed, /on conflict \(secondary_user_id\) do nothing/);
  assert.ok(!readdirSync(new URL("../supabase/migrations/", import.meta.url)).some((n) => /account_link.*seed|torah_temima/i.test(n)));
});

test("edge function: verifies BOTH tokens with Auth, generic rejection, no admin Auth/credential operations, CORS pinned to the site", () => {
  const fn = read("supabase/functions/account-link-confirm/index.ts");
  assert.equal((fn.match(/auth\.getUser\(token\)/g) || []).length, 1); assert.match(fn, /Promise\.all\(\[verify\(secondaryToken\), verify\(primaryToken\)\]\)/);
  assert.match(fn, /secondary === primary/); assert.match(fn, /account_link_confirm_v1/);
  assert.doesNotMatch(fn, /auth\.admin|deleteUser|updateUserById|linkIdentity|signOut/);
  assert.match(fn, /access-control-allow-origin": "https:\/\/sod1820\.co\.il"/);
  assert.equal((fn.match(/const reject = \(\) => reply\(\{ status: "rejected" \}, 400\)/g) || []).length, 1);
});

test("UI: renders nothing unless enabled and an offer exists; says it is history only; Not now is recorded; final explicit consent", () => {
  const ui = read("src/components/experience2029/AccountLinkOffer2029.jsx");
  assert.match(ui, /if \(!enabled \|\| !user\?\.id \|\| !offer\) return null/);
  assert.match(ui, /איחוד היסטוריה בלבד/); assert.match(ui, /לא עכשיו/); assert.match(ui, /dismissAccountLinkOffer/);
  assert.match(ui, /disabled=\{!consent \|\| busy\}/); assert.match(ui, /היסטוריה אוחדה/);
  assert.match(read("src/components/experience2029/SystemFrame2029.jsx"), /<AccountLinkOffer2029 \/>/);
  const lib = read("src/lib/accountLink.js");
  assert.match(lib, /persistSession: false/); assert.match(lib, /shouldCreateUser: false/);
});
