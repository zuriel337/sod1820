import assert from "node:assert/strict";
import fs from "node:fs";
import { handle, normalizeChats, matchesQuery, annotate, kindOf } from "../supabase/functions/wa-groups-list/core.ts";

// ---- pure helpers ----
assert.equal(kindOf("120363@g.us"), "group");
assert.equal(kindOf("120363@newsletter"), "channel");
assert.equal(kindOf("972501234567@c.us"), null);

const contacts = { http_status: 200, result: [
  { id: "1@g.us", name: "תורת הרמז", type: "group" },
  { id: "2@g.us", name: "", type: "group" },
  { id: "972501234567@c.us", name: "Person", type: "user" },
  { id: "3@newsletter", name: "ערוץ", type: "channel" },
] };
const chats = { http_status: 200, result: [{ id: "2@g.us", name: "בליז 888" }, { id: "1@g.us", name: "" }, { id: "4@g.us", name: "אחרת" }] };
const items = normalizeChats(contacts, chats);
assert.deepEqual(items.map((i) => i.id).sort(), ["1@g.us", "2@g.us", "3@newsletter", "4@g.us"]);
assert.equal(items.find((i) => i.id === "2@g.us").name, "בליז 888"); // empty name filled from the other list
assert.equal(items.find((i) => i.id === "1@g.us").name, "תורת הרמז"); // non-empty name is kept
assert.ok(!items.some((i) => i.id.endsWith("@c.us"))); // private chats never listed

assert.ok(matchesQuery({ id: "x", name: "בליז 888", kind: "group" }, "בליז888"));
assert.ok(matchesQuery({ id: "x", name: "בליז 888", kind: "group" }, " בליז "));
assert.ok(!matchesQuery({ id: "x", name: "תורת הרמז", kind: "group" }, "בליז"));
assert.ok(matchesQuery({ id: "x", name: "anything", kind: "group" }, ""));

const ann = annotate(items, { ingest: [{ chat_id: "1@g.us", channel: "torat-haremez", enabled: true }], botConfig: [{ group_id: "__ALL__", enabled: false }] });
assert.equal(ann.find((i) => i.id === "1@g.us").in_ingest_sources, true);
assert.equal(ann.find((i) => i.id === "1@g.us").ingest_channel, "torat-haremez");
assert.equal(ann.find((i) => i.id === "4@g.us").in_ingest_sources, false);
assert.equal(ann[0].bot_config_all_enabled, false);

// ---- handler ----
const fakeSb = (ingest = [], cfg = []) => ({
  from: (t) => ({ select: async () => ({ data: t === "channel_ingest_sources" ? ingest : cfg }) }),
});
const mkReq = (method = "POST", body, url = "https://x/functions/v1/wa-groups-list") =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

// non-admin is refused and the provider is never called
let calls = [];
const spy = async (_sb, method, payload, http) => { calls.push({ method, payload, http }); return method === "getContacts" ? contacts : chats; };
let res = await handle(mkReq("POST", {}), { requireAdmin: async () => null, waAdmin: spy });
assert.equal(res.status, 403);
assert.equal(calls.length, 0);

// admin: read-only GET list methods only, with and without a query
calls = [];
res = await handle(mkReq("POST", { query: "בליז" }), { requireAdmin: async () => fakeSb([{ chat_id: "1@g.us", channel: "torat-haremez", enabled: true }, { chat_id: "9@g.us", channel: "gone", enabled: true }]), waAdmin: spy });
assert.equal(res.status, 200);
let out = await res.json();
assert.deepEqual(calls.map((c) => c.method).sort(), ["getChats", "getContacts"]);
assert.ok(calls.every((c) => c.http === "GET" && c.payload === null));
assert.equal(out.ok, true);
assert.equal(out.complete, true);
assert.equal(out.found, true);
assert.deepEqual(out.matches.map((m) => m.id), ["2@g.us"]);
assert.deepEqual(out.totals, { groups: 3, channels: 1 });
assert.deepEqual(out.ingest_sources_missing_from_provider, [{ chat_id: "9@g.us", channel: "gone" }]);

// query with no match is an explicit found:false, not an empty ambiguity
res = await handle(mkReq("POST", { query: "לא קיים" }), { requireAdmin: async () => fakeSb(), waAdmin: spy });
out = await res.json();
assert.equal(out.found, false);
assert.deepEqual(out.matches, []);

// GET with ?query= works too
res = await handle(mkReq("GET", undefined, "https://x/f?query=%D7%91%D7%9C%D7%99%D7%96"), { requireAdmin: async () => fakeSb(), waAdmin: spy });
assert.equal((await res.json()).found, true);

// partial provider failure is reported, never presented as complete
const half = async (_s, method) => method === "getContacts" ? { http_status: 500, result: "boom" } : chats;
out = await (await handle(mkReq("POST", {}), { requireAdmin: async () => fakeSb(), waAdmin: half })).json();
assert.equal(out.ok, true);
assert.equal(out.complete, false);
assert.equal(out.provider.getContacts, "http_500");

// total provider failure fails closed (502), no "empty list" that could read as "in no groups"
const down = async () => ({ ok: false, error: "GREEN_API_ID/GREEN_API_TOKEN missing from vault" });
res = await handle(mkReq("POST", {}), { requireAdmin: async () => fakeSb(), waAdmin: down });
assert.equal(res.status, 502);
out = await res.json();
assert.equal(out.ok, false);
assert.equal(out.items, undefined);

// method guard
assert.equal((await handle(mkReq("DELETE"), { requireAdmin: async () => fakeSb(), waAdmin: spy })).status, 405);

// ---- static contract: read-only, no secrets, no writes ----
const src = fs.readFileSync("supabase/functions/wa-groups-list/core.ts", "utf8").replace(/^\s*\/\/.*$/gm, "");
assert.doesNotMatch(src, /sendMessage|sendFile|leaveGroup|addGroupParticipant|removeGroupParticipant|createGroup|updateGroup|setGroup/);
assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/);
assert.doesNotMatch(src, /GREEN_API_TOKEN|wa_green_config|api\.green-api/);
const idx = fs.readFileSync("supabase/functions/wa-groups-list/index.ts", "utf8");
assert.match(idx, /role !== "admin"/);

console.log("wa-groups-list: all checks passed");
