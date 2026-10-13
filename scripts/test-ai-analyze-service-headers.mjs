import assert from "node:assert/strict";
import test from "node:test";
import { supabaseServiceHeaders } from "../supabase/functions/_shared/supabaseServiceHeaders.js";

const request = (key, extra = {}) => new Request("https://fixture.invalid/rest/v1/rpc/fixture", {
  method: "POST", headers: supabaseServiceHeaders(key, extra), body: "{}",
});

test("legacy server JWT sends matching apikey and Bearer without losing transport headers", () => {
  const key = "synthetic-legacy-service-jwt";
  const sent = request(key, { "Content-Type": "application/json", Prefer: "return=representation", "X-Trace-Id": "fixture-trace" });
  assert.equal(sent.headers.get("apikey"), key);
  assert.equal(sent.headers.get("authorization"), `Bearer ${key}`);
  assert.equal(sent.headers.get("content-type"), "application/json");
  assert.equal(sent.headers.get("prefer"), "return=representation");
  assert.equal(sent.headers.get("x-trace-id"), "fixture-trace");
});

test("modern server secret and public keys use apikey without a fabricated Bearer", () => {
  for (const key of ["sb_secret_SYNTHETIC_ONLY", "sb_publishable_SYNTHETIC_ONLY"]) {
    const sent = request(key, { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" });
    assert.equal(sent.headers.get("apikey"), key);
    assert.equal(sent.headers.has("authorization"), false);
    assert.equal(sent.headers.get("content-type"), "application/json");
    assert.equal(sent.headers.get("prefer"), "resolution=ignore-duplicates,return=representation");
  }
});

test("an explicit caller JWT supplied by a server/SDK callback stays authoritative", () => {
  const callerJWT = "synthetic-authenticated-caller-jwt";
  const callerHeaders = new Headers({ Authorization: `Bearer ${callerJWT}`, "Content-Type": "application/json", "X-Client-Info": "fixture-sdk" });
  for (const key of ["sb_secret_SYNTHETIC_ONLY", "sb_publishable_SYNTHETIC_ONLY", "synthetic-legacy-service-jwt"]) {
    const sent = request(key, callerHeaders);
    assert.equal(sent.headers.get("apikey"), key);
    assert.equal(sent.headers.get("authorization"), `Bearer ${callerJWT}`);
    assert.equal(sent.headers.get("x-client-info"), "fixture-sdk");
  }
  assert.equal(callerHeaders.has("apikey"), false, "the caller's Headers object is not mutated");
});

test("a server/SDK default Bearer containing the opaque key is removed", () => {
  for (const key of ["sb_secret_SYNTHETIC_ONLY", "sb_publishable_SYNTHETIC_ONLY"]) {
    const sent = request(key, { Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
    assert.equal(sent.headers.get("apikey"), key);
    assert.equal(sent.headers.has("authorization"), false);
    assert.equal(sent.headers.get("content-type"), "application/json");
  }
});

test("lowercase and tuple caller headers preserve the original authenticated context", () => {
  const authorization = "Bearer synthetic-user-jwt";
  const sent = request("sb_secret_SYNTHETIC_ONLY", [["authorization", authorization], ["prefer", "return=minimal"]]);
  assert.equal(sent.headers.get("authorization"), authorization);
  assert.equal(sent.headers.get("prefer"), "return=minimal");
});
