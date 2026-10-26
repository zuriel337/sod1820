import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { getMyNotifications, getUnreadCount, markNotificationRead, markAllRead } from "../src/lib/notifications.js";

const ID = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const AT = "2026-10-25T12:00:00.000Z";
const STRICT = { strict: true };

// Use the actual Supabase/PostgREST client. Only HTTP is substituted; no request
// reaches a service, and an unexpected endpoint/method fails the test.
async function withTransport(response, run) {
  const calls = [];
  const unexpected = [];
  const fetch = mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co" || url.pathname !== "/rest/v1/user_notifications"
      || !["GET", "HEAD", "PATCH"].includes(request.method)) {
      unexpected.push(request.method + " " + url.pathname);
      throw new Error("Unexpected network request blocked");
    }
    calls.push({ method: request.method, url, prefer: request.headers.get("prefer") || "",
      body: request.method === "PATCH" ? await request.json() : null });
    if (response.networkError) throw new Error("Synthetic offline transport");
    const status = response.status || 200;
    const headers = { "content-type": "application/json", ...(response.range ? { "content-range": response.range } : {}) };
    return new Response(status === 204 || response.data === undefined ? null : JSON.stringify(response.data), { status, headers });
  });
  try { await run(calls); assert.deepEqual(unexpected, []); }
  finally { fetch.mock.restore(); }
}

await test("strict list distinguishes unavailable/malformed data from a known empty inbox", async () => {
  for (const data of [null, {}, { rows: [] }]) {
    await withTransport({ data }, async () => {
      await assert.rejects(getMyNotifications(30, STRICT));
    });
  }
  await withTransport({ data: [] }, async (calls) => {
    assert.deepEqual(await getMyNotifications(30, STRICT), []);
    assert.equal(calls[0].url.searchParams.get("limit"), "30");
    assert.equal(calls[0].method, "GET");
  });
});

await test("strict list preserves actual records without deriving a global count", async () => {
  const rows = [{ id: ID, title: "עדכון בדיקה", source_topic: "number:1820", read_at: null }];
  await withTransport({ data: rows }, async () => assert.deepEqual(await getMyNotifications(7, STRICT), rows));
});

await test("strict read permission/network failures reject; default list keeps its compatibility fallback", async () => {
  for (const response of [{ status: 403, data: { message: "Synthetic permission failure" } }, { networkError: true }]) {
    await withTransport(response, async () => {
      await assert.rejects(getMyNotifications(30, STRICT));
      assert.deepEqual(await getMyNotifications(), []);
    });
  }
});

await test("strict unread count retains measured zero and positive counts", async () => {
  for (const count of [0, 7]) {
    await withTransport({ range: `*/${count}` }, async (calls) => {
      assert.equal(await getUnreadCount(STRICT), count);
      assert.equal(calls[0].method, "HEAD");
      assert.match(calls[0].prefer, /count=exact/);
      assert.equal(calls[0].url.searchParams.get("read_at"), "is.null");
    });
  }
});

await test("strict unread count rejects missing, invalid and unsafe counts", async () => {
  for (const range of [null, "*/-1", "*/NaN", "*/9007199254740992"]) {
    await withTransport({ range }, async () => await assert.rejects(getUnreadCount(STRICT)));
  }
});

await test("strict unread permission/network failures never become zero", async () => {
  for (const response of [{ status: 403, data: { message: "Synthetic permission failure" } }, { networkError: true }]) {
    await withTransport(response, async () => {
      await assert.rejects(getUnreadCount(STRICT));
      assert.equal(await getUnreadCount(), 0);
    });
  }
});

await test("strict single read confirms only the returned marked ID with a minimal projection", async () => {
  await withTransport({ data: [{ id: ID, read_at: AT, private_payload: "must not escape" }] }, async (calls) => {
    assert.deepEqual(await markNotificationRead(ID, STRICT), { ok: true, markedIds: [ID] });
    assert.equal(calls.length, 1, "one explicit mutation, no automatic retry/readback");
    const call = calls[0];
    assert.equal(call.method, "PATCH");
    assert.equal(call.url.searchParams.get("id"), `eq.${ID}`);
    assert.equal(call.url.searchParams.get("read_at"), "is.null");
    assert.equal(call.url.searchParams.get("select"), "id,read_at");
    assert.match(call.prefer, /return=representation/);
    assert.deepEqual(Object.keys(call.body), ["read_at"]);
    assert.ok(Number.isFinite(Date.parse(call.body.read_at)));
  });
});

await test("strict mark-all returns exactly confirmed rows, not a blanket clear instruction", async () => {
  await withTransport({ data: [{ id: ID, read_at: AT }, { id: OTHER, read_at: AT }] }, async (calls) => {
    assert.deepEqual(await markAllRead(STRICT), { ok: true, markedIds: [ID, OTHER] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.searchParams.get("read_at"), "is.null");
    assert.equal(calls[0].url.searchParams.has("id"), false);
    assert.equal(calls[0].url.searchParams.get("select"), "id,read_at");
  });
});

await test("a confirmed zero-row mutation is a no-op and confirms no local notification", async () => {
  await withTransport({ data: [] }, async () => {
    assert.deepEqual(await markNotificationRead(ID, STRICT), { ok: true, markedIds: [] });
    assert.deepEqual(await markAllRead(STRICT), { ok: true, markedIds: [] });
  });
});

await test("strict mutations reject permission errors, no acknowledgment and malformed read evidence", async () => {
  const responses = [
    { status: 403, data: { message: "Synthetic permission failure" } },
    { networkError: true }, { status: 204 }, { data: null }, { data: {} },
    { data: [{ id: ID, read_at: null }] }, { data: [{ id: ID, read_at: "invalid" }] },
    { data: [{ read_at: AT }] }, { data: [{ id: ID, read_at: AT }, { id: ID, read_at: AT }] },
  ];
  for (const response of responses) {
    await withTransport(response, async () => {
      await assert.rejects(markNotificationRead(ID, STRICT));
      await assert.rejects(markAllRead(STRICT));
    });
  }
  await withTransport({ data: [{ id: OTHER, read_at: AT }] }, async () => await assert.rejects(markNotificationRead(ID, STRICT)));
});

await test("invalid strict single-ID input rejects before any request", async () => {
  await withTransport({ data: [] }, async (calls) => {
    for (const id of [null, undefined, "", {}, []]) await assert.rejects(markNotificationRead(id, STRICT));
    assert.equal(calls.length, 0);
  });
});

await test("default mutation signatures keep their void/error-swallowing compatibility behavior", async () => {
  for (const response of [{ status: 204 }, { status: 403, data: { message: "Synthetic denied" } }, { networkError: true }]) {
    await withTransport(response, async (calls) => {
      assert.equal(await markNotificationRead(ID), undefined);
      assert.equal(await markAllRead(), undefined);
      assert.equal(await markNotificationRead(null), undefined);
      for (const call of calls) {
        assert.equal(call.url.searchParams.has("select"), false);
        assert.doesNotMatch(call.prefer, /return=representation/);
      }
    });
  }
});
