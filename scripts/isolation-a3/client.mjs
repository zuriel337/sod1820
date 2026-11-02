import assert from "node:assert/strict";
import fs from "node:fs";

export function validateIsolatedConfig(config) {
  const url = new URL(config?.url);
  assert.equal(url.protocol, "http:", "isolated A3 requires HTTP loopback");
  assert.equal(url.hostname, "127.0.0.1", "isolated A3 forbids remote/canonical/candidate endpoints");
  assert.ok(url.port && Number(url.port) > 1024, "isolated A3 requires an explicit unprivileged port");
  assert.equal(url.pathname, "/");
  assert.equal(url.username + url.password + url.search + url.hash, "");
  assert.match(config.runId, /^sod-a3-[a-z0-9-]+$/);
  const claims = JSON.parse(Buffer.from(String(config.anonKey).split(".")[1] || "", "base64url"));
  assert.equal(claims.iss, "sod1820-isolation-a3");
  assert.equal(claims.ref, config.runId);
  assert.equal(claims.role, "anon");
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 7200);
  return { ...config, url: url.origin };
}

export function isolatedFetch(origin, fetchImpl = globalThis.fetch) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.origin, origin, "A3 attempted outbound I/O outside its isolated gateway");
    assert.ok(/^\/(?:auth|rest|functions)\/v1(?:\/|$)/.test(url.pathname), "unexpected isolated API route");
    const response = await fetchImpl(input, { ...init, redirect: "error" });
    if (!response.ok) {
      // Bounded server error codes only; never print headers, request bodies,
      // tokens or arbitrary response payloads during isolated diagnostics.
      const detail = await response.clone().json().catch(() => ({}));
      console.error(`A3_ISOLATED_HTTP_ERROR status=${response.status} error=${String(detail.error || detail.code || "unknown").slice(0,80)}`);
    }
    return response;
  };
}

export async function createIsolatedA3Client(configPath) {
  assert.ok(configPath, "isolated config file required before SDK import");
  const stat = fs.statSync(configPath);
  assert.equal(stat.mode & 0o077, 0, "isolated config must be private (0600)");
  const config = validateIsolatedConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: isolatedFetch(config.url),
      ...(config.accessToken ? { headers: { Authorization: `Bearer ${config.accessToken}` } } : {}),
    },
  });
}
