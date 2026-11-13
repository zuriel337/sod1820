// M0-E: contact-notify sends the owner notice only within the limiter buckets, fails closed, and never hard-codes a recipient.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handle, LIMITS } from "../supabase/functions/contact-notify/core.js";

const form = { name: "בודק", email: "visitor@example.invalid", subject: "שאלה", message: "תוכן" };
function deps({ limiter = "allow", counts = new Map(), provider = 200 } = {}) {
  const sent = [];
  return {
    sent, counts,
    resendKey: "synthetic-provider-key", to: "owner@example.invalid", from: "SOD <news@example.invalid>", secret: "synthetic-service-key",
    serviceRpc: async (name, args) => {
      assert.equal(name, "edge_rate_limit_check");
      if (limiter === "down") return null;
      const n = (counts.get(args.p_key_hash) || 0) + 1;
      counts.set(args.p_key_hash, n);
      return { allowed: n <= args.p_limit, window_seconds: args.p_window_seconds };
    },
    fetch: async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response("{}", { status: provider }); },
  };
}
const post = (body, ip = "203.0.113.9") => new Request("https://fn.example/contact-notify", { method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": ip, "x-forwarded-for": "198.51.100.1, " + ip }, body: JSON.stringify(body) });

test("a valid form sends one notice to the configured recipient", async () => {
  const d = deps();
  const res = await handle(post(form), d);
  assert.equal(res.status, 200);
  assert.equal(d.sent.length, 1);
  assert.deepEqual(d.sent[0].body.to, ["owner@example.invalid"]);
  assert.equal(d.sent[0].body.reply_to, "visitor@example.invalid");
  assert.match(d.sent[0].body.html, /&lt;|תוכן/);
});

test("per-address limit: the sixth send in an hour from one platform address is refused, a fake first XFF hop does not help", async () => {
  const d = deps();
  const statuses = [];
  for (let i = 0; i < LIMITS.perAddressPerHour + 1; i++) statuses.push((await handle(post(form), d)).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal(d.sent.length, LIMITS.perAddressPerHour);
});

test("global limit holds across addresses", async () => {
  const d = deps();
  let ok = 0;
  for (let i = 0; i < LIMITS.globalPerHour + 5; i++) if ((await handle(post(form, `203.0.113.${i + 10}`), d)).status === 200) ok++;
  assert.equal(ok, LIMITS.globalPerHour);
});

test("fails closed: limiter down, missing recipient or provider key -> no e-mail", async () => {
  const down = deps({ limiter: "down" });
  assert.equal((await handle(post(form), down)).status, 503);
  assert.equal(down.sent.length, 0);
  const noTo = { ...deps(), to: "" };
  assert.equal((await handle(post(form), noTo)).status, 503);
  const noKey = { ...deps(), resendKey: "" };
  assert.equal((await handle(post(form), noKey)).status, 503);
});

test("invalid input is refused before any limiter or provider call; HTML is escaped", async () => {
  const d = deps();
  assert.equal((await handle(post({ ...form, email: "nope" }), d)).status, 400);
  assert.equal((await handle(post({ ...form, message: "" }), d)).status, 400);
  assert.equal(d.counts.size, 0);
  const x = deps();
  await handle(post({ ...form, message: "<script>x</script>" }), x);
  assert.doesNotMatch(x.sent[0].body.html, /<script>/);
});

test("no recipient address or personal data is hard-coded in the function source", () => {
  for (const f of ["core.js", "index.ts"]) {
    const src = readFileSync(new URL(`../supabase/functions/contact-notify/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /[A-Za-z0-9._%+-]+@(?!sod1820\.co\.il)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, f);
  }
});
