import test from "node:test";
import assert from "node:assert/strict";
import { createInflightReadFetch2029 } from "../src/lib/inflightReadFetch2029.js";

function stub() {
  const calls = [];
  const gates = [];
  const baseFetch = (url, init = {}) => new Promise((resolve, reject) => {
    const call = { url, init, aborted: false };
    calls.push(call);
    init.signal?.addEventListener("abort", () => { call.aborted = true; reject(new DOMException("Aborted", "AbortError")); });
    gates.push(() => resolve(new Response(JSON.stringify({ n: calls.indexOf(call) }), { status: 200, headers: { "content-type": "application/json" } })));
  });
  return { calls, gates, baseFetch };
}
const H = (auth = "Bearer anon") => ({ apikey: "anon", Authorization: auth, Accept: "application/json" });
const tick = () => new Promise((r) => setImmediate(r));

test("concurrent identical reads share one request and every caller can read the body", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  const a = f("https://x/rest/v1/posts?select=id", { headers: H() });
  const b = f("https://x/rest/v1/posts?select=id", { headers: H() });
  const c = f("https://x/rest/v1/posts?select=id", { headers: H() });
  assert.equal(s.calls.length, 1);
  s.gates[0]();
  const bodies = await Promise.all([a, b, c].map(async (p) => (await p).json()));
  assert.deepEqual(bodies, [{ n: 0 }, { n: 0 }, { n: 0 }]);
});
test("it is not a cache: a read after the response arrived goes to the network", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  const a = f("https://x/a", { headers: H() }); s.gates[0](); await a; await tick();
  const b = f("https://x/a", { headers: H() });
  assert.equal(s.calls.length, 2); s.gates[1](); await b;
});
test("different credentials, URL, method, or cache policy are never shared", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  f("https://x/a", { headers: H() }); f("https://x/a", { headers: H("Bearer user-token") });
  f("https://x/b", { headers: H() }); f("https://x/a", { headers: H(), cache: "no-store" });
  f("https://x/a", { method: "POST", headers: H(), body: "{}" }); f("https://x/a", { method: "POST", headers: H(), body: "{}" });
  assert.equal(s.calls.length, 6);
});
test("HEAD reads are shared; the shared request is separate from GET", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  f("https://x/a", { method: "HEAD", headers: H() }); f("https://x/a", { method: "HEAD", headers: H() }); f("https://x/a", { headers: H() });
  assert.equal(s.calls.length, 2);
});
test("one caller aborting does not cancel the others; all aborting cancels the request", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  const c1 = new AbortController(), c2 = new AbortController();
  const a = f("https://x/a", { headers: H(), signal: c1.signal });
  const b = f("https://x/a", { headers: H(), signal: c2.signal });
  c1.abort();
  await assert.rejects(a, { name: "AbortError" });
  assert.equal(s.calls[0].aborted, false);
  s.gates[0](); assert.deepEqual(await (await b).json(), { n: 0 });

  const d1 = new AbortController(), d2 = new AbortController();
  const x = f("https://x/z", { headers: H(), signal: d1.signal }); const y = f("https://x/z", { headers: H(), signal: d2.signal });
  d1.abort(); d2.abort();
  await assert.rejects(x, { name: "AbortError" }); await assert.rejects(y, { name: "AbortError" });
  assert.equal(s.calls[1].aborted, true);
  // a new read after total abort starts a fresh request
  f("https://x/z", { headers: H() }); assert.equal(s.calls.length, 3);
});
test("an already aborted signal rejects immediately without a request; failures reach every caller", async () => {
  const s = stub(); const f = createInflightReadFetch2029({ baseFetch: s.baseFetch });
  const dead = new AbortController(); dead.abort();
  await assert.rejects(f("https://x/a", { headers: H(), signal: dead.signal }), { name: "AbortError" });
  assert.equal(s.calls.length, 0);
  const fail = createInflightReadFetch2029({ baseFetch: () => Promise.reject(new TypeError("network")) });
  const [p, q] = [fail("https://x/a", { headers: H() }), fail("https://x/a", { headers: H() })];
  await assert.rejects(p, TypeError); await assert.rejects(q, TypeError);
});
test("supabase.js wires it only for the 2029 build", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  assert.match(src, /typeof __SOD_2029_BUILD__ !== 'undefined' && __SOD_2029_BUILD__/);
  const vite = await readFile(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.match(vite, /__SOD_2029_BUILD__: JSON\.stringify\(is2029\)/);
});
