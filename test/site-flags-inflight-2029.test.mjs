import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exercise the exact exported production function without importing the rest of
// Supabase's live client or making any network/DB calls.
const full = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const from = full.indexOf("// 🔒 דגלי-אתר (site_flags)");
const until = full.indexOf("// 🔥 המספרים החמים באתר", from);
assert.ok(from !== -1 && until > from, "public flag reader must exist");
const snippet = full.slice(from, until).replace("export async function getSiteFlags", "async function getSiteFlags");
function fixture(supabase) {
  return new Function("supabase", snippet + "\nreturn getSiteFlags;")(supabase);
}

test("six concurrent shell lock consumers produce only one site_flags request", async () => {
  let requests = 0;
  let release;
  const supabase = {
    from: (table) => {
      assert.equal(table, "site_flags");
      return { select: (columns) => {
        assert.equal(columns, "key,enabled,message,mode");
        requests += 1;
        return new Promise((resolve) => { release = resolve; });
      } };
    },
  };
  const getSiteFlags = fixture(supabase);
  const reads = Array.from({ length: 6 }, () => getSiteFlags());
  assert.equal(requests, 1, "all simultaneous frame hooks share a single in-flight request");
  release({ data: [{ key: "lock_world", enabled: false, message: "", mode: "all" }] });
  const values = await Promise.all(reads);
  for (const value of values) assert.equal(value.lock_world.enabled, false);

  const next = getSiteFlags();
  assert.equal(requests, 2, "next page/route check refreshes flags instead of using a stale TTL");
  release({ data: [{ key: "lock_world", enabled: true, message: "", mode: "all" }] });
  assert.equal((await next).lock_world.enabled, true, "lock changes must be visible on the next request");
});

test("network failures are shared and never poison later retries", async () => {
  let requests = 0;
  const getSiteFlags = fixture({
    from: () => ({ select: async () => {
      requests += 1;
      await Promise.resolve();
      if (requests === 1) throw new Error("temporary network error");
      return { data: [{ key: "lock_books", enabled: true, mode: "all" }] };
    } }),
  });
  const first = await Promise.all([getSiteFlags(), getSiteFlags(), getSiteFlags()]);
  assert.equal(requests, 1);
  for (const value of first) assert.deepEqual(value, {});
  assert.equal((await getSiteFlags()).lock_books.enabled, true);
  assert.equal(requests, 2);
});

test("no database client means unchanged empty public flag projection", async () => {
  assert.deepEqual(await fixture(null)(), {});
});

test("open -> locked is visible on the very next check; an old pending request is not joined forever", async () => {
  let requests = 0;
  const rows = [{ key: "lock_number", enabled: false, mode: "all" }];
  const getSiteFlags = fixture({ from: () => ({ select: async () => { requests += 1; return { data: rows.map((r) => ({ ...r })) }; } }) });
  assert.equal((await getSiteFlags()).lock_number.enabled, false);
  rows[0].enabled = true;
  assert.equal((await getSiteFlags()).lock_number.enabled, true, "no TTL: the next check sees the lock");
  assert.equal(requests, 2);
});

test("a failed read returns {} and never serves an earlier open result", async () => {
  let fail = false;
  const getSiteFlags = fixture({ from: () => ({ select: async () => {
    if (fail) return { data: null, error: { message: "503" } };
    return { data: [{ key: "lock_number", enabled: false, mode: "all" }] };
  } }) });
  assert.equal((await getSiteFlags()).lock_number.enabled, false);
  fail = true;
  assert.deepEqual(await getSiteFlags(), {}, "failure must not fall back to the earlier open value");
});

test("a request pending longer than the join window is not joined by a new caller", async () => {
  let requests = 0; const releases = [];
  const realNow = Date.now; let clock = realNow();
  Date.now = () => clock;
  try {
    const getSiteFlags = fixture({ from: () => ({ select: () => { requests += 1; return new Promise((r) => releases.push(r)); } }) });
    const a = getSiteFlags(); const b = getSiteFlags();
    assert.equal(requests, 1);
    clock += 1500;
    const c = getSiteFlags();
    assert.equal(requests, 2, "stale in-flight answer is not reused");
    releases.forEach((r) => r({ data: [] }));
    await Promise.all([a, b, c]);
  } finally { Date.now = realNow; }
});
