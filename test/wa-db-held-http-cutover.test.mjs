import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const fnDir = "supabase/functions";
const migration = fs.readFileSync("supabase/migrations/20261001073507_g3_wa_db_held_http_cutover_v1.sql", "utf8");
const helperSrc = fs.readFileSync(`${fnDir}/_shared/waGreen.ts`, "utf8");

// 1. static: no active Edge caller uses sb.rpc(wa_admin)
for (const d of fs.readdirSync(fnDir)) {
  const p = path.join(fnDir, d, "index.ts");
  if (!fs.existsSync(p)) continue;
  assert.doesNotMatch(fs.readFileSync(p, "utf8"), /rpc\(\s*["']wa_admin["']/, `${d} still rpc(wa_admin)`);
}

// 2. config seam ACL: service_role only, no client grants, no secrets in git
assert.match(migration, /revoke all on function public\.wa_green_config\(\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.wa_green_config\(\) to service_role/);
assert.doesNotMatch(migration.replace(/--.*$/gm, ""), /grant execute on function public\.wa_green_config\(\) to (anon|authenticated|public)/i);
assert.doesNotMatch(helperSrc + migration, /Bearer\s+[A-Za-z0-9]{20,}/);

// 3. health-watch: no provider HTTP, fail-closed local heartbeat
assert.match(migration, /refusing blind rewrite/);
assert.match(migration, /still references wa_admin/);
assert.match(migration, /'no_fresh_ingest'/);

// 4. helper behaviour (Node strips TS types natively)
const mod = await import(new URL("../supabase/functions/_shared/waGreen.ts", import.meta.url));

const mkSb = (cfg, inserts) => (mod.resetWaGreenConfigCache(), {
  rpc: async () => ({ data: cfg, error: null }),
  from: (t) => ({ insert: async (r) => { inserts.push([t, r]); return { error: null }; } }),
});
const cfg = { id: "111", token: "TOK", base: "https://x.test/" };
const res = (status, body) => ({ status, text: async () => body });

// GET
{ let seen; const r = await mod.waAdmin(mkSb(cfg, []), "getStateInstance", {}, "GET", { fetchImpl: async (u, o) => { seen = [u, o]; return res(200, '{"stateInstance":"authorized"}'); } });
  assert.equal(seen[0], "https://x.test/waInstance111/getStateInstance/TOK"); assert.equal(seen[1].method, "GET");
  assert.equal(r.http_status, 200); assert.equal(r.result.stateInstance, "authorized"); }
// POST + sendMessage transcript
{ const ins = []; let seen; const r = await mod.waAdmin(mkSb(cfg, ins), "sendMessage", { chatId: "c", message: "hi", quotedMessageId: "q" }, "POST", { fetchImpl: async (u, o) => { seen = o; return res(200, '{"idMessage":"1"}'); } });
  assert.equal(seen.method, "POST"); assert.equal(JSON.parse(seen.body).message, "hi");
  assert.equal(ins.length, 1); assert.equal(ins[0][0], "bot_transcripts"); assert.equal(ins[0][1].http_status, 200); assert.equal(ins[0][1].meta.quoted, "q"); assert.equal(r.http_status, 200); }
// non-sendMessage: no transcript
{ const ins = []; await mod.waAdmin(mkSb(cfg, ins), "getChatHistory", { chatId: "c" }, "POST", { fetchImpl: async () => res(200, "[]") }); assert.equal(ins.length, 0); }
// error + token redaction
{ const r = await mod.waAdmin(mkSb({ ...cfg, token: "T2" }, []), "m", {}, "POST", { fetchImpl: async () => { throw new Error("fail https://x.test/waInstance111/m/T2"); } });
  assert.equal(r.ok, false); assert.doesNotMatch(JSON.stringify(r), /T2/); }
// timeout
{ const r = await mod.waAdmin(mkSb({ ...cfg, token: "T3" }, []), "m", {}, "POST", { timeoutMs: 20, fetchImpl: (u, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("x"), { name: "AbortError" })))) });
  assert.equal(r.ok, false); assert.match(r.error, /timeout/); }
// missing config
{ mod.resetWaGreenConfigCache(); const r = await mod.waAdmin({ rpc: async () => ({ data: null, error: null }) }, "m", {}, "POST", { fetchImpl: async () => { throw new Error("must not fetch"); } });
  assert.equal(r.ok, false); assert.match(r.error, /missing from vault/); }

console.log("PASS wa db-held http cutover contract");
