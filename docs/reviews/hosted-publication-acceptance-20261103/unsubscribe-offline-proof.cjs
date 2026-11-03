// Offline diagnostic for the exact deployed v9 source; no real credentials or network.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { transformSync } = require("esbuild");
const root = path.resolve(__dirname, "../../..");
const source = fs.readFileSync(path.join(root, "supabase/functions/newsletter-unsubscribe/index.ts"), "utf8");
const sourceSha256 = crypto.createHash("sha256").update(source).digest("hex");
assert.equal(sourceSha256, "13101bb6374057625d05414d216af2eab173c7fb4ad45d39f6f075578bc1d2c4");
const importLine = 'import { createClient } from "jsr:@supabase/supabase-js@2";';
assert.ok(source.includes(importLine));
const js = transformSync(source.replace(importLine, "const createClient = globalThis.fixtureClient;"), { loader: "ts", target: "es2022" }).code;
(async () => {
  const cases = ["sdk_error", "exception", "zero_matched_rows", "bad_signature"];
  const results = [];
  for (const name of cases) {
    let handler, attempts = 0, networkCalls = 0;
    const fixtureKey = crypto.randomBytes(32).toString("hex");
    const address = "owner@example.invalid";
    const token = crypto.createHmac("sha256", fixtureKey).update(address).digest("base64url");
    const context = {
      URL, Request, Response, TextEncoder, TextDecoder, Date, Uint8Array,
      crypto: crypto.webcrypto,
      btoa: s => Buffer.from(s, "binary").toString("base64"),
      atob: s => Buffer.from(s, "base64").toString("binary"),
      fetch: () => { networkCalls++; throw new Error("NETWORK_FORBIDDEN"); },
      Deno: { env: { get: key => key === "NEWSLETTER_SECRET" ? fixtureKey : key === "SUPABASE_URL" ? "https://fixture.invalid" : "" }, serve: fn => { handler = fn; } },
      fixtureClient: () => ({ from: table => {
        assert.equal(table, "subscribers");
        return { update: values => {
          assert.equal(values.active, false);
          return { eq: async (key, value) => {
            assert.equal(key, "email"); assert.equal(value, address); attempts++;
            if (name === "exception") throw new Error("fixture failure");
            return name === "sdk_error" ? { data: null, error: { message: "fixture error" }, count: 0 } : { data: [], error: null, count: 0 };
          } };
        } };
      } })
    };
    vm.runInNewContext(js, context, { timeout: 2000 });
    const uri = new URL("https://fixture.invalid/unsubscribe");
    uri.searchParams.set("e", Buffer.from(address).toString("base64url"));
    uri.searchParams.set("t", name === "bad_signature" ? "invalid-fixture" : token);
    uri.searchParams.set("format", "json");
    const res = await handler(new Request(uri));
    const body = await res.json();
    assert.equal(networkCalls, 0);
    assert.equal(attempts, name === "bad_signature" ? 0 : 1);
    assert.equal(body.ok, name !== "bad_signature");
    results.push({ case: name, httpStatus: res.status, reportedSuccess: body.ok, fakeUpdateAttempts: attempts, actualNetworkCalls: networkCalls, persistedRows: 0 });
  }
  process.stdout.write(JSON.stringify({
    diagnostic: "REPRODUCED_UNSUBSCRIBE_FALSE_SUCCESS_NOT_ACCEPTANCE",
    checkedSourceSha256: sourceSha256, fixtureOnly: true, liveWrites: false,
    sourceParity: "Exact source independently matched deployed newsletter-unsubscribe v9 on 2026-11-03",
    cases: results
  }, null, 2) + "\n");
})().catch(err => { process.stderr.write(String(err.message) + "\n"); process.exitCode = 1; });
