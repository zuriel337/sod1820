import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");

// Load the REAL Phase J adapter block (types stripped by Node itself) with stubbed I/O.
const block = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase J"), edge.indexOf("Deno.serve(async"));
function load(fetchImpl, spans = []) {
  const code = stripTypeScriptTypes(`type OperationalTraceHandle = any;\nconst SB_URL = "https://x.supabase.co";\nconst SB_ANON = "anon-key";\n${block}\n`) +
    "\nreturn { razielCurrentContentDescriptor, razielCurrentPostProject, razielCurrentTopicProject, runRazielCurrentContent };";
  return new Function("fetch", "recordOperationalSpan", "crypto", code)(fetchImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" });
}
const ok = (rows) => async () => ({ ok: true, status: 200, json: async () => rows });
const sem = (type, extra = {}) => ({ surface: type, subject: { type, id: "x" }, ...extra });
const postSem = (slug = "my-post") => ({ surface: "post", subject: { type: "post", label: "t" }, context: { focus: { type: "post", postSlug: slug } } });
const topicSem = (slug = "covid-1237") => ({ surface: "topic", subject: { type: "topic", id: slug, label: "t" } });

test("J: trigger only on explicit current-surface questions", () => {
  const { razielCurrentContentDescriptor: d } = load(ok([]));
  for (const q of ["מה אני קורא?", "תסביר לי את הפוסט הזה", "סכם את הפוסט הזה", "על מה הנושא הזה", "מה זה הטופיק הזה", "summarize this post", "what am I reading"]) {
    assert.equal(d(q, postSem()).trigger, true, q);
  }
  for (const q of ["מה הגימטריה של 631", "מה הפוסט האחרון באתר", "ספר לי על דוד", "", null, undefined, "חפש פוסטים על קורונה"]) {
    assert.deepEqual(d(q, postSem()), { trigger: false, kind: null, slug: null }, String(q));
  }
});

test("J: post/topic identity from surface_semantic only; forged/missing/conflicting ⇒ trigger with kind=null (no tool)", () => {
  const { razielCurrentContentDescriptor: d } = load(ok([]));
  assert.deepEqual(d("מה אני קורא", postSem("my-post")), { trigger: true, kind: "post", slug: "my-post" });
  assert.deepEqual(d("מה אני קורא", topicSem("covid-1237")), { trigger: true, kind: "topic", slug: "covid-1237" });
  const none = { trigger: true, kind: null, slug: null };
  assert.deepEqual(d("מה אני קורא", undefined), none);
  assert.deepEqual(d("מה אני קורא", {}), none);
  assert.deepEqual(d("מה אני קורא", { subject: { type: "post" } }), none);                           // no slug
  assert.deepEqual(d("מה אני קורא", sem("number")), none);                                             // not post/topic
  assert.deepEqual(d("מה אני קורא", postSem("a b")), none);                                            // malformed slug
  assert.deepEqual(d("מה אני קורא", postSem("a,b)or(x")), none);                                       // filter-injection shape
  assert.deepEqual(d("מה אני קורא", postSem("<b>x</b>")), none);                                       // no tag-strip salvage
  assert.deepEqual(d("מה אני קורא", { subject: { type: "post", id: "a" }, context: { focus: { type: "post", postSlug: "b" } } }), none); // conflict
  assert.deepEqual(d("מה אני קורא", { subject: { type: "topic", id: "t" }, context: { focus: { type: "post", postSlug: "p" } } }), none); // type mismatch
  // slug in the question text is never used
  assert.deepEqual(d("מה אני קורא my-post", undefined), none);
});

test("J: post read via anon path, exact slug, selected columns only, one row; sanitized + bounded; span has no raw body", async () => {
  const calls = [], spans = [];
  const row = { id: "1", slug: "my-post", title: "<b>כותרת</b>", excerpt: "ת".repeat(900), categories: Array.from({ length: 9 }, (_, i) => `c${i}`), tags: "a,b,c,d,e,f,g,h",
    date: "2026-01-01", modified: "2026-02-01", source: "wp",
    content: "<style>.x{}</style><script>alert('SECRET_JS')</script><!-- hid --><p>שלום\u0000\u0007 &amp; עולם</p>" + "א".repeat(9000), content_old: "LEAK", ai_addition: "LEAK" };
  const m = load(async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => [row] }; }, spans);
  const r = await m.runRazielCurrentContent({ kind: "post", slug: "my-post" }, { traceId: "t" });
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/posts\?slug=eq\.my-post&select=id,slug,title,excerpt,categories,tags,date,modified,source,content&limit=1$/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer anon-key");
  assert.ok(!/service/i.test(JSON.stringify(calls[0].init.headers)));
  assert.ok(!/SECRET_JS|LEAK|<|hid/.test(r.pack));
  assert.ok(!r.pack.includes("\u0000"));
  assert.match(r.pack, /שלום & עולם/);
  const body = r.pack.split("גוף (קטוע ל-3500 תווים): ")[1];
  assert.ok(body.length <= 3500);
  assert.equal(r.truncated, true);
  assert.ok(/תקציר: ת{500}\n/.test(r.pack));
  assert.match(r.pack, /קטגוריות: c0, c1, c2, c3, c4, c5\n/);
  assert.match(r.pack, /תגיות: a, b, c, d, e, f\n/);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].detail.output_use, "used");
  assert.ok(!JSON.stringify(spans[0]).includes("שלום"));
});

test("J: topic read via topic_cards_public anon; projection allowlists findings and drops internal underscore keys", async () => {
  const calls = [], spans = [];
  const row = { id: "t1", slug: "covid-1237", title: "קורונה", subtitle: "תת", numbers: [1237, 450, 1, 2, 3, 4, 5, 6], highlight_numbers: [1237],
    findings: { headline: "<i>כותרת</i>", bullets: Array.from({ length: 9 }, (_, i) => `נק${i}`), caveat: "זהירות", _do_not_publish: "false", _internal_note: "INTERNAL", _raw: { x: "INTERNAL" }, private_notes: "INTERNAL" } };
  const m = load(async (url, init) => { calls.push(url); return { ok: true, status: 200, json: async () => [row] }; }, spans);
  const r = await m.runRazielCurrentContent({ kind: "topic", slug: "covid-1237" }, { traceId: "t" });
  assert.ok(r.ok);
  assert.match(calls[0], /\/rest\/v1\/topic_cards_public\?slug=eq\.covid-1237&select=id,slug,title,subtitle,numbers,highlight_numbers,findings&limit=1$/);
  assert.ok(!/INTERNAL|_internal|_raw|_do_not_publish|private_notes/.test(r.pack));
  assert.match(r.pack, /מספרים: 1237, 450, 1, 2, 3, 4\n/);
  assert.match(r.pack, /נקודות: נק0 \| נק1 \| נק2 \| נק3 \| נק4 \| נק5\n?/);
  assert.ok(!/נק6/.test(r.pack));
  assert.ok(!/<i>/.test(r.pack));
  const big = m.razielCurrentTopicProject({ title: "t", findings: { summary: "ש".repeat(5000), bullets: Array(6).fill("ב".repeat(300)), headline: "ה".repeat(500) } });
  assert.ok(big.pack.split("ממצאים (קטוע ל-3500 תווים):\n")[1].length <= 3500);
});

test("J: draft/public boundary not widened — unknown slug / non-public row / http error fail closed; no service role in the adapter", async () => {
  for (const impl of [ok([]), ok([{ slug: "other", title: "x" }]), async () => ({ ok: false, status: 401, json: async () => [] }), async () => { throw new Error("boom"); }]) {
    const spans = [];
    const r = await load(impl, spans).runRazielCurrentContent({ kind: "topic", slug: "s" }, { traceId: "t" });
    assert.equal(r.ok, false);
    assert.equal(r.pack, undefined);
    assert.equal(spans[0].detail.output_use, "not_applicable");
  }
  assert.ok(!/SB_SVC|svcHeaders|SERVICE_ROLE/.test(block));
  // no table other than the two existing public ones, no listing / search / ilike
  assert.deepEqual([...new Set([...block.matchAll(/rest\/v1\/\$\{?(\w+)/g)].map((x) => x[1]))], ["table"]);
  assert.ok(!/ilike|\bor=|like\.|\/rpc\/|search/i.test(block.replace(/ai-analyze:raziel:current_surface_content/g, "").replace(/\/\/[^\n]*/g, "")));
  assert.match(block, /const table = desc\.kind === "post" \? "posts" : "topic_cards_public"/);
});

test("J: wired — fires only when triggered, identity from body.surface_semantic, fail-closed note, Phase A-I intact", () => {
  const wire = edge.slice(edge.indexOf("// Phase J — current Post/Topic content READ"), edge.indexOf("const [persona, ctx] = await Promise.all"));
  assert.match(wire, /razielCurrentContentDescriptor\(rSubject, body\?\.surface_semantic\)/);
  assert.match(wire, /if \(rCcDesc\.trigger\)/);
  assert.match(wire, /rCcDesc\.kind && rCcDesc\.slug/);
  assert.match(edge, /תוכן הדף הנוכחי אינו זמין/);
  assert.match(edge, /rCcPack === "UNAVAILABLE"/);
  assert.equal([...edge.matchAll(/runRazielCurrentContent\(/g)].length, 2);   // definition + the single call site
  for (const k of ["runRazielNumberContext(", "razielToolResearch(", "razielSemanticSurfaceText(", "runRazielOperator("]) assert.ok(edge.includes(k), k);
});
