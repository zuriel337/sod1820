// A5 regression: notification_prefs_guest_get_v1 is anon-only (EXECUTE for anon; it also raises when auth.uid() is
// not null). The Supabase SDK attaches the stored member JWT to every request, so a visitor-id-only read issued
// while a member session exists (AuthContext still loading / verifying) was a guaranteed 403 "permission denied
// for function". getNotificationPrefs must call the guest RPC only for a real guest and read the member's own
// row (existing RLS-scoped notification_prefs path) when a member session exists.
// Every client method is stubbed; there is no network and the DB is never touched.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mock } from "node:test";
import { getNotificationPrefs, supabase } from "../src/lib/supabase.js";

const MEMBER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000a2";
const VISITOR = "11111111-1111-4111-8111-111111111111";
const ROW = Object.freeze({ topics: ["number:1820"], channels: ["push"], email: null, intensity: "normal", muted_until: null });
const GUEST_ROW = Object.freeze({ topics: ["cat:x"], channels: [], email: "guest@example.invalid", intensity: null, muted_until: null });

// session: undefined => no session; a user id => member session (its JWT rides every request); "throw" / "error" => the
// session lookup itself fails while the caller is really a guest.
function harness({ session, memberRow = ROW, memberError = null, rpcResult = { data: GUEST_ROW, error: null } } = {}) {
  const calls = { getSession: 0, from: [], eq: [], rpc: [] };
  const mocks = [
    mock.method(supabase.auth, "getSession", async () => {
      calls.getSession += 1;
      if (session === "throw") throw new Error("storage unavailable");
      if (session === "error") return { data: { session: null }, error: new Error("session lookup failed") };
      return { data: { session: session ? { user: { id: session } } : null }, error: null };
    }),
    mock.method(supabase, "from", (table) => {
      calls.from.push(table);
      return { select: (cols) => { calls.select = cols; return { eq: (col, val) => { calls.eq.push([col, val]); return { maybeSingle: async () => ({ data: memberRow, error: memberError }) }; } }; } };
    }),
    mock.method(supabase, "rpc", async (name, args) => {
      calls.rpc.push([name, args]);
      // Faithful to the server: a member JWT on the anon-only guest function is rejected.
      if (session === MEMBER || session === OTHER) return { data: null, error: Object.assign(new Error("permission denied for function notification_prefs_guest_get_v1"), { code: "42501", status: 403 }) };
      return rpcResult;
    }),
    mock.method(globalThis, "fetch", async () => { throw new Error("live network forbidden"); }),
  ];
  return { calls, restore: () => mocks.forEach((m) => m.mock.restore()) };
}

async function withHarness(opts, fn) {
  const h = harness(opts);
  try { await fn(h.calls); } finally { h.restore(); }
}

test("guest (no session): visitorId goes to the guest RPC only, shape unchanged", () => withHarness({ session: undefined }, async (calls) => {
  const out = await getNotificationPrefs({ visitorId: VISITOR });
  assert.deepEqual(out, GUEST_ROW);
  assert.deepEqual(calls.rpc, [["notification_prefs_guest_get_v1", { p_visitor: VISITOR }]]);
  assert.deepEqual(calls.from, [], "guests never read the table");
}));

test("guest with no stored row resolves to null", () => withHarness({ session: undefined, rpcResult: { data: null, error: null } }, async (calls) => {
  assert.equal(await getNotificationPrefs({ visitorId: VISITOR }), null);
  assert.equal(calls.rpc.length, 1);
}));

test("member session + visitorId only (the 403 race): member row is read, guest RPC is never called", () => withHarness({ session: MEMBER }, async (calls) => {
  const out = await getNotificationPrefs({ visitorId: VISITOR });
  assert.deepEqual(out, ROW);
  assert.deepEqual(calls.rpc, [], "no anon-only RPC with a member JWT");
  assert.deepEqual(calls.from, ["notification_prefs"]);
  assert.equal(calls.select, "topics, channels, email, intensity, muted_until", "same columns as the guest RPC payload");
  assert.deepEqual(calls.eq, [["user_id", MEMBER]], "scoped to the session's own user id, never the visitor id");
}));

test("member session + visitorId and no stored row resolves to null", () => withHarness({ session: MEMBER, memberRow: null }, async (calls) => {
  assert.equal(await getNotificationPrefs({ visitorId: VISITOR }), null);
  assert.deepEqual(calls.rpc, []);
}));

test("explicit userId: member path, no session probe, no guest RPC", () => withHarness({ session: MEMBER }, async (calls) => {
  assert.deepEqual(await getNotificationPrefs({ userId: MEMBER }), ROW);
  assert.equal(calls.getSession, 0, "an explicit member identity needs no session lookup");
  assert.deepEqual(calls.rpc, []);
  assert.deepEqual(calls.eq, [["user_id", MEMBER]]);
}));

test("explicit userId wins over a supplied visitorId and over a different session user", () => withHarness({ session: OTHER }, async (calls) => {
  assert.deepEqual(await getNotificationPrefs({ userId: MEMBER, visitorId: VISITOR }), ROW);
  assert.deepEqual(calls.rpc, []);
  assert.deepEqual(calls.eq, [["user_id", MEMBER]]);
}));

test("member read errors still throw (callers keep their loadFailed handling)", () => withHarness({ session: MEMBER, memberRow: null, memberError: new Error("boom") }, async () => {
  await assert.rejects(() => getNotificationPrefs({ visitorId: VISITOR }), /boom/);
  await assert.rejects(() => getNotificationPrefs({ userId: MEMBER }), /boom/);
}));

test("guest RPC errors still throw", () => withHarness({ session: undefined, rpcResult: { data: null, error: new Error("guest rpc down") } }, async () => {
  await assert.rejects(() => getNotificationPrefs({ visitorId: VISITOR }), /guest rpc down/);
}));

test("a failing session lookup is treated as guest (previous behaviour), never as a crash", async () => {
  for (const session of ["throw", "error"]) {
    await withHarness({ session }, async (calls) => {
      assert.deepEqual(await getNotificationPrefs({ visitorId: VISITOR }), GUEST_ROW, session);
      assert.equal(calls.rpc.length, 1, session);
      assert.deepEqual(calls.from, [], session);
    });
  }
});

test("no identity: null, nothing is called", () => withHarness({ session: MEMBER }, async (calls) => {
  assert.equal(await getNotificationPrefs({}), null);
  assert.equal(await getNotificationPrefs(), null);
  assert.deepEqual([calls.getSession, calls.from.length, calls.rpc.length], [0, 0, 0]);
}));

test("the fix is client-side only: no migration grants the guest getter to authenticated", () => {
  const dir = path.resolve(new URL("../supabase/migrations", import.meta.url).pathname);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/^\s*--.*$/gm, "");
    for (const stmt of sql.split(";")) {
      if (!/grant\s+execute\s+on\s+function\s+public\.notification_prefs_guest_(get|save)_v1/i.test(stmt)) continue;
      assert.doesNotMatch(stmt, /\bauthenticated\b/i, `${file}: guest getter/saver must stay anon-only`);
    }
  }
});
