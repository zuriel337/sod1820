import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.CARDCOM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const {
  cardcomExpirationMMYY,
  decryptCardcomToken,
  encryptCardcomToken,
  chargeCardcomSubscription,
} = await import("../server/cardcom-subscription.js");

const { default: start } = await import("../api/cardcom-subscription-start.js");
const { default: webhook } = await import("../api/cardcom-subscription-webhook.js");
const { default: renew } = await import("../api/cardcom-subscription-renew.js");
const fixtureAdmin = "11111111-1111-4111-8111-111111111111";
const fixtureRef = "SODM-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fixtureLowProfile = "synthetic-low-profile";

function response() {
  return { code: null, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

async function sandbox(run, responder) {
  const savedEnv = { ...process.env };
  const savedFetch = global.fetch;
  const calls = [];
  Object.assign(process.env, {
    SUPABASE_URL: "https://database.test", SUPABASE_ANON_KEY: "synthetic-anon",
    CARDCOM_BRIDGE_SECRET: "synthetic-bridge", CARDCOM_TERMINAL_NUMBER: "1234",
    CARDCOM_API_NAME: "synthetic-api", VERCEL_URL: "pilot.test.vercel.app",
    CARDCOM_PILOT_TOKEN_BILLING_APPROVED: "true", CRON_SECRET: "synthetic-cron",
    VERCEL_ENV: "preview", CARDCOM_PILOT_RENEWALS_ENABLED: "false",
  });
  global.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    const call = { url: String(url), init, body };
    calls.push(call);
    const data = responder ? await responder(call) : undefined;
    if (data instanceof Response) return data;
    if (data !== undefined) return Response.json(data);
    if (call.url.endsWith("/auth/v1/user")) return Response.json({ id: fixtureAdmin, email: "admin@example.invalid" });
    if (call.url.includes("/rest/v1/users?")) return Response.json([{ role: "admin" }]);
    throw new Error("Unexpected fixture request");
  };
  try { await run(calls); } finally {
    global.fetch = savedFetch;
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  }
}

const request = (body = {}) => ({ method: "POST", headers: { authorization: "Bearer synthetic-user", host: "pilot.test.vercel.app" }, body });

test("CardCom token envelope round-trips without storing plaintext", () => {
  const token = "pilot-token-value";
  const encrypted = encryptCardcomToken(token);
  assert.equal(decryptCardcomToken(encrypted), token);
  assert.notEqual(encrypted.ciphertext, token);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.tag);
});

test("CardCom token expiration converts to required MMYY", () => {
  assert.equal(cardcomExpirationMMYY({ CardMonth: 6, CardYear: 2028 }), "0628");
  assert.equal(cardcomExpirationMMYY({ TokenExDate: "20271101" }), "1127");
});

test("AES-GCM rejects a modified token, tag and a missing 256-bit key", () => {
  const encrypted = encryptCardcomToken("synthetic-provider-token");
  const bytes = Buffer.from(encrypted.ciphertext, "base64");
  bytes[0] ^= 1;
  assert.throws(() => decryptCardcomToken({ ...encrypted, ciphertext: bytes.toString("base64") }));
  assert.throws(() => decryptCardcomToken({ ...encrypted, tag: Buffer.alloc(16).toString("base64") }));
  const key = process.env.CARDCOM_TOKEN_ENCRYPTION_KEY;
  delete process.env.CARDCOM_TOKEN_ENCRYPTION_KEY;
  assert.throws(() => encryptCardcomToken("synthetic-provider-token"), /not_configured/);
  process.env.CARDCOM_TOKEN_ENCRYPTION_KEY = key;
});

test("guest and non-admin cannot create a checkout", async () => {
  for (const kind of ["guest", "member"]) await sandbox(async calls => {
    const res = response();
    await start(request(), res);
    assert.equal(res.code, kind === "guest" ? 401 : 403);
    assert.ok(calls.every(c => !c.url.includes("cardcom.solutions")));
  }, call => {
    if (call.url.endsWith("/auth/v1/user") && kind === "guest") return Response.json({}, { status: 401 });
    if (call.url.includes("/rest/v1/users?")) return [{ role: "member" }];
  });
});

test("unconfirmed terminal and unknown DB guard fail closed before checkout", async () => {
  for (const gate of ["terminal", "db"]) await sandbox(async calls => {
    if (gate === "terminal") delete process.env.CARDCOM_PILOT_TOKEN_BILLING_APPROVED;
    const res = response();
    await start(request(), res);
    assert.equal(res.code, gate === "terminal" ? 503 : 409);
    assert.ok(calls.every(c => !c.url.includes("cardcom.solutions")));
  }, call => call.url.endsWith("/membership_pilot_start_guard") ? {} : undefined);
});

test("checkout ignores a client price and uses only the 2029 return route", async () => sandbox(async calls => {
  const res = response();
  await start(request({ amount: 999, operation: "ChargeOnly" }), res);
  assert.equal(res.code, 200);
  const payload = calls.find(c => c.url.endsWith("/LowProfile/Create")).body;
  assert.equal(payload.Amount, 4);
  assert.equal(payload.Document.Products[0].UnitCost, 4);
  assert.equal(payload.Operation, "ChargeAndCreateToken");
  assert.match(payload.SuccessRedirectUrl, /^https:\/\/pilot\.test\.vercel\.app\/2029\/membership-pilot\?/);
  assert.match(payload.FailedRedirectUrl, /\/2029\/membership-pilot\?/);
  assert.ok(!JSON.stringify(payload).includes("CardNumber"));
  assert.ok(calls.some(c => c.url.endsWith("/membership_pilot_register")));
}, call => {
  if (call.url.endsWith("/membership_pilot_start_guard")) return { allowed: true };
  if (call.url.endsWith("/LowProfile/Create")) return { ResponseCode: 0, LowProfileId: fixtureLowProfile, Url: "https://secure.cardcom.solutions/fixture" };
  if (call.url.endsWith("/membership_pilot_register")) return { status: "pending" };
}));

test("unrelated Vercel host and malicious payment URLs are not accepted", async () => {
  await sandbox(async calls => {
    const req = request(); req.headers.host = "unrelated.vercel.app";
    const res = response(); await start(req, res);
    assert.equal(res.code, 500);
    assert.ok(calls.every(c => !c.url.includes("cardcom.solutions")));
  }, call => call.url.endsWith("/membership_pilot_start_guard") ? { allowed: true } : undefined);
  for (const url of ["https://evil.test/", "https://user:password@secure.cardcom.solutions/", "http://secure.cardcom.solutions/"])
    await sandbox(async calls => {
      const res = response(); await start(request(), res);
      assert.equal(res.code, 502);
      assert.ok(!calls.some(c => c.url.endsWith("/membership_pilot_register")));
    }, call => {
      if (call.url.endsWith("/membership_pilot_start_guard")) return { allowed: true };
      if (call.url.endsWith("/LowProfile/Create")) return { ResponseCode: 0, LowProfileId: fixtureLowProfile, Url: url };
    });
});

function verifiedPayment(overrides = {}) {
  return { ResponseCode: 0, TerminalNumber: 1234, LowProfileId: fixtureLowProfile,
    ReturnValue: fixtureRef, Operation: "ChargeAndCreateToken",
    TranzactionInfo: { ResponseCode: 0, TerminalNumber: 1234, Amount: 4, CoinId: 1, TranzactionId: "9007199254740993" },
    TokenInfo: { Token: "synthetic-provider-token", CardMonth: 6, CardYear: 2028 }, ...overrides };
}

test("webhook trusts GetLpResult, not redirect/body amounts or success", async () => {
  for (const change of [
    { Amount: 999, TranzactionInfo: { ResponseCode: 0, TerminalNumber: 1234, Amount: 999, CoinId: 1 } },
    { Operation: "ChargeOnly" }, { TerminalNumber: 999 }, { ReturnValue: "wrong-ref" },
    { LowProfileId: "wrong-id" }, { TokenInfo: {} }, { ResponseCode: null },
    { TranzactionInfo: { ResponseCode: null, TerminalNumber: 1234, Amount: 4, CoinId: 1 } },
  ]) await sandbox(async calls => {
    const res = response();
    await webhook(request({ LowProfileId: fixtureLowProfile, success: true, Amount: 4, Token: "untrusted" }), res);
    assert.equal(res.code, 200);
    assert.notEqual(res.body.active, true);
    assert.ok(calls.some(c => c.url.endsWith("/LowProfile/GetLpResult")));
    assert.ok(!calls.some(c => c.url.endsWith("/membership_pilot_activate")));
  }, call => {
    if (call.url.endsWith("/membership_pilot_webhook_lookup")) return { known: true, status: "pending", subscription_id: fixtureAdmin, provider_ref: fixtureRef };
    if (call.url.endsWith("/LowProfile/GetLpResult")) return verifiedPayment(change);
  });
});

test("verified enrollment keeps exact transaction ID, stores only AES envelope and is replay-safe", async () => sandbox(async calls => {
  const res = response(); await webhook(request({ LowProfileId: fixtureLowProfile }), res);
  assert.equal(res.body.active, true);
  const activation = calls.find(c => c.url.endsWith("/membership_pilot_activate")).body;
  assert.equal(activation.p_transaction_id, "9007199254740993");
  assert.equal(decryptCardcomToken({ ciphertext: activation.p_token_ciphertext, iv: activation.p_token_iv, tag: activation.p_token_tag }), "synthetic-provider-token");
  assert.ok(!JSON.stringify(activation).includes("synthetic-provider-token"));
  assert.ok(!JSON.stringify(res.body).includes("token"));
}, call => {
  if (call.url.endsWith("/membership_pilot_webhook_lookup")) return { known: true, status: "pending", subscription_id: fixtureAdmin, provider_ref: fixtureRef };
  if (call.url.endsWith("/LowProfile/GetLpResult")) return verifiedPayment();
  if (call.url.endsWith("/membership_pilot_activate")) return { status: "active", already: false };
}));

test("already-active callback does not call Cardcom or activate again", async () => sandbox(async calls => {
  const res = response(); await webhook(request({ LowProfileId: fixtureLowProfile }), res);
  assert.equal(res.body.already, true);
  assert.equal(calls.length, 1);
}, () => ({ known: true, status: "active" })));

test("renewal requires CRON_SECRET and cannot run in Preview or without production approval", async () => {
  for (const kind of ["no-secret", "preview", "production-disabled"]) await sandbox(async calls => {
    if (kind === "no-secret") delete process.env.CRON_SECRET;
    if (kind === "production-disabled") process.env.VERCEL_ENV = "production";
    const res = response(); await renew({ method: "GET", headers: { authorization: "Bearer synthetic-cron" } }, res);
    assert.equal(res.code, kind === "no-secret" ? 401 : 403);
    assert.equal(calls.length, 0);
  });
});

test("approved Production renewal charges exactly ILS4 once and settles the same idempotency key", async () => {
  let claims = 0;
  await sandbox(async calls => {
    process.env.VERCEL_ENV = "production";
    process.env.CARDCOM_PILOT_RENEWALS_ENABLED = "true";
    const res = response();
    await renew({ method: "GET", headers: { authorization: "Bearer synthetic-cron" } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { ok: true, processed: 1 });
    const charge = calls.find(c => c.url.endsWith("/Transactions/Transaction"));
    const settle = calls.find(c => c.url.endsWith("/membership_pilot_settle_renewal"));
    assert.equal(charge.body.Amount, 4);
    assert.equal(charge.body.ExternalUniqTranId, "M1234567890122601010000");
    assert.equal(settle.body.p_external_uniq_tran_id, charge.body.ExternalUniqTranId);
    assert.equal(settle.body.p_success, true);
    assert.equal(settle.body.p_transaction_id, "9007199254740993");
  }, call => {
    if (call.url.endsWith("/membership_pilot_claim_due")) {
      claims += 1;
      if (claims > 1) return { found: false };
      const token = encryptCardcomToken("synthetic-provider-token");
      return {
        found: true,
        subscription_id: fixtureAdmin,
        external_uniq_tran_id: "M1234567890122601010000",
        amount_ils: 4,
        token_ciphertext: token.ciphertext,
        token_iv: token.iv,
        token_tag: token.tag,
        expiration_mmyy: "0628",
        billing_name: "Synthetic member",
        billing_email: "member@example.invalid",
      };
    }
    if (call.url.endsWith("/Transactions/Transaction")) return { ResponseCode: 0, TranzactionId: "9007199254740993" };
    if (call.url.endsWith("/membership_pilot_settle_renewal")) return { status: "active" };
  });
});

test("renewal helper refuses any amount other than 4 before provider I/O", async () => sandbox(async calls => {
  await assert.rejects(chargeCardcomSubscription({ amount: 3, token: "synthetic", externalId: "M123" }), /amount_must_be_four/);
  assert.equal(calls.length, 0);
}));

test("renewal retry uses the same ExternalUniqTranId and fixed ILS4", async () => sandbox(async calls => {
  const args = { amount: 4, token: "synthetic-provider-token", expirationMMYY: "0628", externalId: "M1234567890122601010000" };
  for (let i = 0; i < 2; i++) await chargeCardcomSubscription(args);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.ExternalUniqTranId, calls[1].body.ExternalUniqTranId);
  assert.equal(calls[0].body.Amount, 4);
  assert.equal(calls[0].body.ExternalUniqTranIdResponse, true);
}, () => ({ ResponseCode: 0, TranzactionId: "9007199254740993" })));

test("2029-only routing, lazy loading, guarded scheduled renewals and Legacy lock stay intact", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const app2029 = await readFile(new URL("../src/App2029.jsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/MembershipPilotPage.jsx", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.doesNotMatch(app, /MembershipPilot|membership-pilot/);
  assert.match(app2029, /lazy\(\(\) => import\("\.\/pages\/MembershipPilotPage.jsx"\)\)/);
  assert.match(app2029, /path="\/2029\/membership-pilot"/);
  assert.equal(config.rewrites.find(r => r.source === "/2029/membership-pilot").destination, "/2029.html");
  assert.ok(config.headers.find(r => r.source === "/2029/membership-pilot").headers.some(h => h.key === "X-Robots-Tag" && h.value.includes("noindex")));
  assert.ok(config.headers.findIndex(r => r.source === "/2029/membership-pilot") > config.headers.findIndex(r => r.source === "/(.*)"), "pilot no-store/no-referrer must override general headers");
  assert.deepEqual(config.crons?.find(r => r.path === "/api/cardcom-subscription-renew"), {
    path: "/api/cardcom-subscription-renew", schedule: "15 6 * * *",
  });
  assert.match(page, /loading: authLoading/);
  assert.match(page, /principal.current !== userId/);
  assert.match(page, /target.origin !== "https:\/\/secure.cardcom.solutions"/);
  assert.doesNotMatch(page, /theme\.js|console\.|type="password"/);
  assert.equal(spawnSync(process.execPath, ["scripts/test-legacy-production-lock.mjs"], { cwd: new URL("../", import.meta.url), encoding: "utf8" }).status, 0);
});

test("real PostgreSQL migration, RLS, negative, replay, cancellation and rollback tests", async t => {
  const container = process.env.CARDCOM_PILOT_TEST_CONTAINER;
  if (!container) return t.skip("Set CARDCOM_PILOT_TEST_CONTAINER to a disposable network-isolated PostgreSQL17 container");
  const inspect = spawnSync("docker", ["inspect", "--format", "{{.HostConfig.NetworkMode}}", container], { encoding: "utf8" });
  assert.equal(inspect.stdout.trim(), "none", "SQL tests must not target a networked/live database");
  const sql = await readFile(new URL("../tests/sql/cardcom_membership_pilot_v1.sql", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261026120150_cardcom_membership_pilot_v1.sql", import.meta.url), "utf8");
  const upgrade = await readFile(new URL("../supabase/migrations/20261029154256_cardcom_membership_pilot_4ils_monthly_v1.sql", import.meta.url), "utf8");
  const hash = createHash("sha256").update("synthetic-bridge-only").digest("hex");
  const applied = migration.replaceAll("b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea", hash);
  const run = spawnSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: sql.replace("-- APPLY_PILOT_MIGRATION_HERE", () => applied + "\n" + upgrade.replaceAll("b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea", hash)), encoding: "utf8", maxBuffer: 1024 * 1024,
  });
  assert.equal(run.status, 0, run.stderr + "\n" + run.stdout);
  assert.match(run.stdout, /CARDCom SQL ACCEPTANCE PASS/);
});

test("pilot is fixed to ILS 4, admin-only, token-based, scheduled and idempotent", async () => {
  const start = await readFile(new URL("../api/cardcom-subscription-start.js", import.meta.url), "utf8");
  const renew = await readFile(new URL("../server/cardcom-subscription.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261026120150_cardcom_membership_pilot_v1.sql", import.meta.url), "utf8");
  const upgrade = await readFile(new URL("../supabase/migrations/20261029154256_cardcom_membership_pilot_4ils_monthly_v1.sql", import.meta.url), "utf8");

  assert.match(start, /Operation:\s*"ChargeAndCreateToken"/);
  assert.match(start, /Amount:\s*4/);
  assert.match(start, /verifySupabaseAdmin/);
  assert.match(renew, /ExternalUniqTranId:/);
  assert.match(renew, /ExternalUniqTranIdResponse:\s*true/);
  assert.match(upgrade, /amount_ils\s*=\s*4\.00/);
  assert.match(upgrade, /'renewal',\s*4\.00,\s*'pending'/);
  assert.match(migration, /role\s*=\s*'admin'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /private\.cardcom_subscription_credentials/);
  assert.match(migration, /membership_subscription_pilots_user_created_idx/);
  assert.match(migration, /membership_subscription_pilots_due_idx/);
  assert.match(migration, /membership_subscription_pilot_charges_subscription_idx/);
  assert.match(migration, /if v_charge\.status <> 'pending'/);
  assert.doesNotMatch(migration, /service_role/i);
});
