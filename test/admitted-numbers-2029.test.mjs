// S-62 stage 1 (staged branch): the admitted-number decision and the shared anchor read. The decision source stays the same public function; the
// memo may only change HOW OFTEN it is read, never what it answers: complete sets only, today's single read when traffic is quiet or the set is not
// provably complete, and the same freshness bound as the words of a number page.
import test from "node:test";
import assert from "node:assert/strict";
import { ADMITTED_NUMBERS, numberIndexable2029, readAdmittedNumbers2029, _resetAdmittedNumbersForTests } from "../src/lib/admittedNumbers2029.js";
import { numberAnchorRows2029, _resetNumberAnchorsForTests } from "../public-reading-deploy/first-words.js";

const URL_BASE = "https://example.supabase.co";
const headers = { apikey: "k", Authorization: "Bearer k" };
const ALL = [...Array.from({ length: 1000 }, (_, i) => 10 + i), 1067, 2500, 78100]; // 1,003 numbers: more than one page of 1,000

// PostgREST as measured live: at most pageSize rows per request, offset and limit as query parameters, an exact total in Content-Range.
function server({ values = ALL, failPage = -1, noTotal = false, mismatch = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, offset: Number(u.searchParams.get("offset")), limit: Number(u.searchParams.get("limit")), prefer: init.headers?.Prefer });
    const offset = Number(u.searchParams.get("offset")), page = offset / ADMITTED_NUMBERS.pageSize;
    if (page === failPage) return new Response("[]", { status: 500 });
    const rows = values.slice(offset, offset + ADMITTED_NUMBERS.pageSize).map(value => ({ value, priority: "0.6", lastmod: "2026-11-24" }));
    const total = mismatch ? values.length + 5 : values.length;
    const end = offset + rows.length - 1;
    return new Response(JSON.stringify(rows), { status: 206, headers: noTotal ? {} : { "content-range": rows.length ? `${offset}-${end}/${total}` : `*/${total}` } });
  };
  return { fetchImpl, calls };
}
const reads = () => { const log = []; return { log, perKey: async () => { log.push(1); return true; } }; };
const settle = () => new Promise(resolve => setTimeout(resolve, 10));

test("the whole set is read in complete pages with an exact total, never a partial set", async () => {
  const { fetchImpl, calls } = server();
  const set = await readAdmittedNumbers2029({ supabaseUrl: URL_BASE, headers, fetchImpl });
  assert.equal(set.size, ALL.length);
  assert.ok(set.has(78100) && set.has(1067) && !set.has(1066 + 1000), "numbers beyond the first 1,000 rows are in the set");
  assert.deepEqual(calls.map(c => [c.offset, c.limit]), [[0, 1000], [1000, 1000]]);
  assert.equal(calls[0].prefer, "count=exact", "the first page asks for the exact total");
  assert.equal(calls[1].prefer, undefined);
  for (const bad of [{ failPage: 1 }, { noTotal: true }, { mismatch: true }]) {
    const s = server(bad);
    await assert.rejects(readAdmittedNumbers2029({ supabaseUrl: URL_BASE, headers, fetchImpl: s.fetchImpl }), /admitted_numbers/, JSON.stringify(bad));
  }
});

test("quiet traffic is exactly today's behaviour: one read per call, the set is never read", async () => {
  _resetAdmittedNumbersForTests();
  const { fetchImpl, calls } = server(), { log, perKey } = reads();
  let t = 1000;
  for (let i = 0; i < ADMITTED_NUMBERS.burstLookups - 1; i += 1) { t += 1000; assert.equal(await numberIndexable2029(10 + i, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t }), true); }
  await settle();
  assert.equal(log.length, ADMITTED_NUMBERS.burstLookups - 1, "every quiet call made its own single read");
  assert.equal(calls.length, 0, "the set was not read");
  // calls spread over more than the window never count as a burst
  _resetAdmittedNumbersForTests();
  for (let i = 0; i < 6; i += 1) { t += ADMITTED_NUMBERS.burstWindowMs; await numberIndexable2029(10, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t }); }
  await settle();
  assert.equal(calls.length, 0);
});

test("a crawl is answered from the set: after the burst the decision costs no read, and it is the same decision", async () => {
  _resetAdmittedNumbersForTests();
  const { fetchImpl, calls } = server(), { log, perKey } = reads();
  let t = 5000;
  const ask = value => { t += 100; return numberIndexable2029(value, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t }); };
  for (let i = 0; i < ADMITTED_NUMBERS.burstLookups; i += 1) await ask(10 + i);
  await settle();
  assert.equal(calls.length, 2, "one background read of the set, two pages");
  const before = log.length;
  assert.equal(await ask(78100), true, "an admitted number above the first 1,000 rows is indexable");
  assert.equal(await ask(1068), false, "a number that is not in the set is not indexable");
  assert.equal(await ask(10), true);
  assert.equal(log.length, before, "no single read after the set is ready");
  assert.equal(calls.length, 2, "and no further read of the set while it is fresh");
});

test("freshness: fresh, then used once while it refreshes, then never used past the stale bound", async () => {
  _resetAdmittedNumbersForTests();
  let values = [10, 11, 12], t = 0;
  const calls = [];
  const fetchImpl = async url => { calls.push(1); const rows = values.map(value => ({ value })); return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": `0-${rows.length - 1}/${rows.length}` } }); };
  const { log, perKey } = reads();
  const ask = value => numberIndexable2029(value, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t });
  for (let i = 0; i < ADMITTED_NUMBERS.burstLookups; i += 1) { t += 10; await ask(10); }
  await settle();
  assert.equal(calls.length, 1);
  values = [10, 11];                         // number 12 stops being admitted (hidden)
  t += ADMITTED_NUMBERS.freshMs - 1000;      // still fresh: the kept answer
  assert.equal(await ask(12), true);
  assert.equal(calls.length, 1);
  t += 2000;                                 // stale: the kept answer once more, one background read replaces it
  assert.equal(await ask(12), true);
  await settle();
  assert.equal(calls.length, 2);
  assert.equal(await ask(12), false, "the hidden number is gone after the refresh");
  const logBefore = log.length;
  t += ADMITTED_NUMBERS.staleMs + 1;         // past the bound: never used, the single read answers
  assert.equal(await ask(11), true);
  assert.equal(log.length, logBefore + 1);
});

test("a failing set read is never retried inside the backoff, and every call still gets today's single read", async () => {
  _resetAdmittedNumbersForTests();
  const calls = [], { log, perKey } = reads();
  const fetchImpl = async () => { calls.push(1); return new Response("{}", { status: 500 }); };
  let t = 0;
  for (let i = 0; i < 40; i += 1) { t += 1000; assert.equal(await numberIndexable2029(10, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t }), true); }
  await settle();
  assert.equal(log.length, 40, "all 40 calls made their own single read");
  assert.ok(calls.length <= 1, "the failing read was tried once within 40 seconds, not 38 times");
});

test("the single read keeps its own failure: the decision never invents an answer", async () => {
  _resetAdmittedNumbersForTests();
  const perKey = async () => { throw new Error("indexability-source-unavailable"); };
  await assert.rejects(numberIndexable2029(10, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl: async () => new Response("{}", { status: 500 }) }), /indexability-source-unavailable/);
});

test("one number anchor read is shared by everyone asking at the same moment, and nothing is remembered beyond it", async () => {
  _resetNumberAnchorsForTests();
  const urls = [];
  const fetchImpl = async url => { urls.push(String(url)); return new Response(JSON.stringify([{ fact: "f", hint: "h" }]), { status: 200 }); };
  const [a, b] = await Promise.all([numberAnchorRows2029(1015, fetchImpl), numberAnchorRows2029(1015, fetchImpl)]);
  assert.deepEqual(a, [{ fact: "f", hint: "h" }]);
  assert.equal(a, b, "the same answer object");
  assert.equal(urls.length, 1);
  assert.match(urls[0], /number_anchors\?value=eq\.1015&select=fact,hint&limit=1/);
  await new Promise(resolve => setTimeout(resolve, 1700));
  await numberAnchorRows2029(1015, fetchImpl);
  assert.equal(urls.length, 2, "the next request reads it again (a changed or hidden anchor is never served from memory)");
  _resetNumberAnchorsForTests();
  const failing = async () => new Response("{}", { status: 500 });
  await assert.rejects(numberAnchorRows2029(7, failing), /first_words_source_unavailable/);
});

test("a set that changes between two pages is never used: the pages do not add up, the single read answers, and the next read of the set is not tried inside the backoff", async () => {
  _resetAdmittedNumbersForTests();
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    const offset = Number(new URL(url).searchParams.get("offset"));
    const rows = (offset === 0 ? ALL.slice(0, 1000) : [...ALL.slice(1000), 99999]).map(value => ({ value }));
    return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": `${offset}-${offset + rows.length - 1}/${ALL.length}` } });
  };
  await assert.rejects(readAdmittedNumbers2029({ supabaseUrl: URL_BASE, headers, fetchImpl }), /admitted_numbers_incomplete/);
  const { log, perKey } = reads();
  let t = 0;
  for (let i = 0; i < 10; i += 1) { t += 1000; await numberIndexable2029(10, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t }); }
  await settle();
  assert.equal(log.length, 10, "all ten calls were answered by the single read; a partial set never answered one");
});

test("a hidden number: a quiet instance stops saying indexable at once, a crawled instance within the stale bound, and never from a partial set", async () => {
  _resetAdmittedNumbersForTests();
  let admitted = new Set([10, 11, 12]), t = 0;
  const fetchImpl = async () => { const rows = [...admitted].map(value => ({ value })); return new Response(JSON.stringify(rows), { status: 206, headers: { "content-range": `0-${rows.length - 1}/${rows.length}` } }); };
  const perKey = async () => admitted.has(12);
  const ask = () => numberIndexable2029(12, { perKey, supabaseUrl: URL_BASE, headers, fetchImpl, now: () => t });
  t += 1; assert.equal(await ask(), true);
  admitted.delete(12);
  t += 1; assert.equal(await ask(), false, "a quiet instance reads the one number every time: the hidden number is not indexable at once");
  for (let i = 0; i < ADMITTED_NUMBERS.burstLookups; i += 1) { t += 1; await ask(); }
  await settle();
  t += 1; assert.equal(await ask(), false, "the set it reads after the change no longer has the number");
  admitted.add(12);                           // published again: the kept set is used for FRESH, then replaced
  t += ADMITTED_NUMBERS.freshMs + 1; await ask(); await settle();
  t += 1; assert.equal(await ask(), true, "and is admitted again within the stale bound");
});
