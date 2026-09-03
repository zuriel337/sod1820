// Tests for identity.js — ensureIdentity() (IDENTITY_UNIFICATION_V1, Alt 1 "Central Bootstrap").
// Run with: node --test src/lib/identity.test.js
// No jsdom in this repo (mirrors engagement.test.js convention: full dependency injection / minimal
// hand-rolled mocks). src/lib/supabase.js exports a REAL Supabase client with hardcoded production
// credentials — we never let a real network call happen; instead we monkey-patch `.rpc` on the
// imported singleton before each scenario. identity.js keeps module-level mutable state (_sodId,
// _seeded), so each scenario re-imports it via a cache-busted dynamic import (?t=N) — this reuses
// the SAME ./supabase.js singleton (query string only busts identity.js's own cache key) while
// giving each scenario a clean getSodId()/seedLegacyOnce() slate, matching how a real fresh
// browser tab behaves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "./supabase.js";

// ── minimal in-memory Storage (Web Storage API subset actually used by identity.js/visitorId.js) ──
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

// ── minimal document.cookie jar (supports the exact get/set pattern identity.js uses) ──
function makeCookieJar() {
  let jar = new Map();
  return {
    get cookie() {
      return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(v) {
      const first = String(v).split(";")[0];
      const i = first.indexOf("=");
      if (i === -1) return;
      jar.set(first.slice(0, i), first.slice(i + 1));
    },
  };
}

// Node 22 defines `navigator`/`document` as getter-only experimental globals — plain assignment
// throws ("has only a getter"). Use defineProperty so tests can freely override them.
function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true, enumerable: true });
}

function installGlobals() {
  setGlobal("localStorage", makeStorage());
  setGlobal("sessionStorage", makeStorage());
  setGlobal("document", makeCookieJar());
  setGlobal("navigator", { userAgent: "node-test-agent" });
  // Node 22 already provides a global `crypto.randomUUID`; keep it if present.
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== "function") {
    let n = 0;
    setGlobal("crypto", { randomUUID: () => `test-uuid-${++n}-${Date.now()}` });
  }
}

async function flush(n = 6) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

// records every supabase.rpc call and lets each scenario script canned responses per rpc name
function installRpcMock(responses = {}) {
  const calls = [];
  supabase.rpc = async (name, params) => {
    calls.push({ name, params });
    const h = responses[name];
    if (typeof h === "function") return h(params);
    if (h) return h;
    return { data: null, error: null };
  };
  return calls;
}

let importCounter = 0;
function freshIdentityModule() {
  importCounter += 1;
  return import(`./identity.js?t=${importCounter}`);
}

function linkIdentityCalls(calls) {
  return calls.filter((c) => c.name === "link_identity");
}
function conflictEventCalls(calls) {
  return calls.filter((c) => c.name === "ingest_event" && c.params?.p_event_type === "legacy_identity_conflict");
}

// ── 1. Fresh visitor: nothing in storage — both identities minted, then bridged ──
test("ensureIdentity: fresh visitor mints sod_id + sod_vid and bridges them", async () => {
  installGlobals();
  const calls = installRpcMock();
  const { ensureIdentity, getSodId } = await freshIdentityModule();

  ensureIdentity();
  await flush();

  const sodId = localStorage.getItem("sod_id");
  const sodVid = localStorage.getItem("sod_vid");
  assert.ok(sodId, "sod_id must be minted");
  assert.ok(sodVid, "sod_vid must be minted");
  assert.notEqual(sodId, sodVid, "freshly-minted ids are independent (no accidental collision)");
  assert.equal(getSodId(), sodId);

  const bridges = linkIdentityCalls(calls).filter((c) => c.params.p_kind === "legacy_seed" && c.params.p_legacy_id === sodVid);
  assert.ok(bridges.length >= 1, "must attempt to bridge the new sod_vid to the new sod_id");
  assert.equal(bridges[0].params.p_sod_id, sodId);
  assert.equal(sessionStorage.getItem("sod_identity_bridged"), sodVid, "bridge guard set after successful bridge");
});

// ── 2. Returning visitor with sod_vid only: getSodId()'s own adoption logic (pre-V1, unchanged)
//    picks it up as sod_id — the two coincide, so ensureIdentity has nothing to bridge. ──
test("ensureIdentity: returning visitor with only sod_vid — adopted as sod_id, no bridge needed", async () => {
  installGlobals();
  localStorage.setItem("sod_vid", "VID-ONLY-1");
  const calls = installRpcMock();
  const { ensureIdentity, getSodId } = await freshIdentityModule();

  ensureIdentity();
  await flush();

  assert.equal(getSodId(), "VID-ONLY-1", "getSodId() adopts the legacy sod_vid value (existing behavior)");
  const bridges = linkIdentityCalls(calls).filter((c) => c.params.p_legacy_id && c.params.p_legacy_id !== c.params.p_sod_id);
  assert.equal(bridges.length, 0, "sod_id === sod_vid after adoption — nothing to bridge");
  assert.equal(sessionStorage.getItem("sod_identity_bridged"), null, "guard not set — ensureIdentity returned early");
});

// ── 3. Returning visitor with sod_id only: sod_vid does not exist yet — visitorId.js mints it
//    on first read, and ensureIdentity bridges it immediately. ──
test("ensureIdentity: returning visitor with only sod_id — sod_vid created on demand and bridged", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-ONLY-1; path=/";
  const calls = installRpcMock();
  const { ensureIdentity, getSodId } = await freshIdentityModule();

  assert.equal(getSodId(), "SID-ONLY-1");
  assert.equal(localStorage.getItem("sod_vid"), null, "sod_vid must not exist before ensureIdentity runs");

  ensureIdentity();
  await flush();

  const sodVid = localStorage.getItem("sod_vid");
  assert.ok(sodVid, "ensureIdentity's read of getVisitorId() must have created sod_vid");
  const bridges = linkIdentityCalls(calls).filter((c) => c.params.p_sod_id === "SID-ONLY-1" && c.params.p_legacy_id === sodVid);
  assert.ok(bridges.length >= 1);
  assert.equal(sessionStorage.getItem("sod_identity_bridged"), sodVid);
});

// ── 4. Both ids exist and differ: real bridge case (the common "identity gap" scenario) ──
test("ensureIdentity: sod_id and sod_vid both exist and differ — bridged via link_identity", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-2; path=/";
  localStorage.setItem("sod_vid", "VID-2");
  const calls = installRpcMock();
  const { ensureIdentity, getSodId } = await freshIdentityModule();

  assert.equal(getSodId(), "SID-2");

  ensureIdentity();
  await flush();

  const bridges = linkIdentityCalls(calls).filter((c) => c.params.p_sod_id === "SID-2" && c.params.p_legacy_id === "VID-2" && c.params.p_kind === "legacy_seed");
  assert.ok(bridges.length >= 1, "at least one legacy_seed bridge SID-2 <- VID-2 must have been sent");
  assert.equal(sessionStorage.getItem("sod_identity_bridged"), "VID-2");
});

// ── 5. Refresh (same tab-session, called twice): second call is a no-op via the session guard ──
test("ensureIdentity: calling twice in the same tab-session does not re-bridge", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-3; path=/";
  localStorage.setItem("sod_vid", "VID-3");
  const calls = installRpcMock();
  const { ensureIdentity } = await freshIdentityModule();

  ensureIdentity();
  await flush();
  const countAfterFirst = linkIdentityCalls(calls).length;
  assert.ok(countAfterFirst >= 1);

  ensureIdentity(); // simulates a page refresh within the same tab-session
  await flush();
  const countAfterSecond = linkIdentityCalls(calls).length;
  assert.equal(countAfterSecond, countAfterFirst, "second call must be a no-op (session guard hit)");
});

// ── 6. Login: stitchLogin coexists with ensureIdentity's bridge, does not interfere ──
test("stitchLogin: fires its own link_identity(kind='login') independent of ensureIdentity's bridge", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-4; path=/";
  localStorage.setItem("sod_vid", "VID-4");
  const calls = installRpcMock();
  const { ensureIdentity, stitchLogin, getSodId } = await freshIdentityModule();

  ensureIdentity();
  await flush();
  stitchLogin("user-42");
  await flush();

  const loginCalls = linkIdentityCalls(calls).filter((c) => c.params.p_kind === "login");
  assert.equal(loginCalls.length, 1);
  assert.equal(loginCalls[0].params.p_user_id, "user-42");
  assert.equal(loginCalls[0].params.p_sod_id, getSodId());
  // the legacy_seed bridge from ensureIdentity must still be present, untouched by login
  assert.ok(linkIdentityCalls(calls).some((c) => c.params.p_kind === "legacy_seed"));
});

// ── 7. Network / Supabase failure: must never throw or block, and must retry next tab-session ──
test("ensureIdentity: rpc rejection (network/Supabase failure) never throws and leaves the guard unset", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-5; path=/";
  localStorage.setItem("sod_vid", "VID-5");
  installRpcMock({ link_identity: () => Promise.reject(new Error("network down")) });
  const { ensureIdentity } = await freshIdentityModule();

  assert.doesNotThrow(() => ensureIdentity());
  await flush();

  assert.equal(sessionStorage.getItem("sod_identity_bridged"), null, "guard must stay unset on failure — retried next tab-session");
});

// ── 8. Deliberate identity conflict (23505): documented via existing events pipeline,
//    never auto-fixed, never auto-merged, never mutates the visitor's own sod_id. ──
test("ensureIdentity: a 23505 conflict is logged as legacy_identity_conflict and never auto-resolved", async () => {
  installGlobals();
  document.cookie = "sod_id=SID-6; path=/";
  localStorage.setItem("sod_vid", "VID-ALREADY-TAKEN");
  const calls = installRpcMock({
    link_identity: () => ({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } }),
  });
  const { ensureIdentity, getSodId } = await freshIdentityModule();

  ensureIdentity();
  await flush();

  const conflicts = conflictEventCalls(calls);
  assert.equal(conflicts.length, 1, "exactly one conflict event must be logged");
  assert.equal(conflicts[0].params.p_sod_id, "SID-6");
  assert.equal(conflicts[0].params.p_surface, "identity");
  assert.equal(conflicts[0].params.p_props.legacy_id, "VID-ALREADY-TAKEN");
  assert.equal(conflicts[0].params.p_props.kind, "legacy_seed");
  // no auto-fix: the visitor keeps their own sod_id, nothing merges it into anything else
  assert.equal(getSodId(), "SID-6");
  assert.equal(localStorage.getItem("sod_id"), "SID-6");
  // the guard is still set (we do not want to hammer link_identity every tab-session for a
  // conflict that will not resolve itself) — matches the .then() ordering in ensureIdentity
  assert.equal(sessionStorage.getItem("sod_identity_bridged"), "VID-ALREADY-TAKEN");
});
