// Run from outside the repo (no package.json): FB_ADMIN_KEY=k SUPABASE_URL=http://sb.test SUPABASE_SERVICE_ROLE_KEY=x ANTHROPIC_API_KEY=x DENO_NO_PACKAGE_JSON=1 deno run -A --no-check --no-config <repo>/docs/reviews/or-geula-seo-20261124/edge-harness.ts ingest|enrich
// Controlled run of the real Edge entry points (#1448). Every network call is answered by a recording fake:
// Supabase (sb.test), Green API (green.test), YouTube oEmbed and Anthropic. Nothing leaves this process.
const FN = Deno.args[0]; // "ingest" | "enrich"
const NOW = Math.floor(Date.now() / 1000);
const calls: any[] = [], patches: any[] = [], inserts: any[] = [];
let nextId = 0;
const OEMBED: Record<string, any> = {
  AbCdEfGhIjK: { title: "שיעור על סוד הגאולה — הכותרת הרשמית", thumbnail_url: "https://i.ytimg.com/vi/AbCdEfGhIjK/hqdefault.jpg" },
};
const msg = (id: string, text: string, dt: number) => ({ idMessage: id, timestamp: NOW - dt, type: "incoming", typeMessage: "textMessage",
  textMessage: text, senderId: "972500000000@c.us", senderName: "בדיקה", chatId: "harness@g.us" });
const HISTORY = [
  msg("M-YT-SHORTS", "צפו https://youtube.com/shorts/AbCdEfGhIjK", 400),
  msg("M-YT-MISSING", "https://youtu.be/ZZZZZZZZZZZ", 300),
  msg("M-CAPTION", "סוד המספר 1820 בפרשת השבוע", 200),
  msg("M-NO-TITLE", "📷 עדכון", 100),
];
const ROWS: Record<string, any> = {
  "11111111-1111-4111-8111-111111111111": { channel: "or-geula", text: "🎬 עדכון וידאו", seo_title: "שיעור מיוחד על סוד הגאולה" },
  "22222222-2222-4222-8222-222222222222": { channel: "or-geula", text: "🎬 עדכון וידאו", seo_title: null },
  "33333333-3333-4333-8333-333333333333": { channel: "or-geula", text: "רמז מדהים בפרשת השבוע", seo_title: null },
};
for (const [id, r] of Object.entries(ROWS)) Object.assign(r, { id, status: "live", image_url: "http://sb.test/storage/v1/object/public/media/a.mp4",
  thumb_url: null, speaker: null, link_url: null, topics: null, enrichment_status: "pending", created_at: new Date().toISOString(), credit: "אור הגאולה", source: null });

const J = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
globalThis.fetch = async (input: any, init: any = {}) => {
  const req = new Request(input, init), url = new URL(req.url), method = req.method;
  const body = ["POST", "PATCH"].includes(method) ? await req.clone().text() : "";
  const object = (req.headers.get("accept") || "").includes("vnd.pgrst.object");
  calls.push({ method, host: url.host, path: url.pathname });
  if (url.host === "www.youtube.com") {
    const id = new URL(url.searchParams.get("url")!).searchParams.get("v")!;
    return OEMBED[id] ? J(OEMBED[id]) : new Response("Not Found", { status: 404 });
  }
  if (url.host === "green.test") {
    if (url.pathname.includes("/getStateInstance/")) return J({ stateInstance: "authorized" });
    if (url.pathname.includes("/getChatHistory/")) return J(HISTORY);
    return J({});
  }
  if (url.host === "api.anthropic.com") return J({ error: "AI is not allowed in this harness" }, 500);
  if (url.host !== "sb.test") return new Response("blocked by harness", { status: 599 });
  const table = url.pathname.replace(/^\/rest\/v1\//, "");
  if (table === "rpc/wa_green_config") return J({ id: "1", token: "t", base: "http://green.test" });
  if (table.startsWith("rpc/")) return J(null);
  if (method === "GET" && table === "channel_ingest_sources") return J([{ id: 1, channel: "or-geula", chat_id: "harness@g.us", enabled: true,
    admin_only: false, last_run_at: new Date((NOW - 60) * 1000).toISOString(), min_ts: 0, display_name: "אור הגאולה", poll_every_min: 5 }]);
  if (method === "GET" && table === "channel_updates") {
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const row = id ? ROWS[id] : null;
    if (object) return row ? J(row) : J({ code: "PGRST116", message: "0 rows" }, 406);
    return J(row ? [row] : []);
  }
  if (method === "POST" && table === "channel_updates") {
    const id = `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`;
    inserts.push({ id, ...JSON.parse(body) });
    return object ? J({ id }, 201) : J([{ id }], 201);
  }
  if (method === "PATCH") { patches.push({ table, filter: url.search, body: JSON.parse(body || "{}") }); return new Response(null, { status: 204 }); }
  if (method === "GET") return object ? J({ code: "PGRST116" }, 406) : J([]);
  return J([], 201);
};

let handler: (req: Request) => Promise<Response> = async () => new Response("no handler");
Object.defineProperty(Deno, "serve", { value: (h: any) => { handler = typeof h === "function" ? h : h.handler; return { finished: Promise.resolve(), shutdown() {} }; } });
const module = FN === "ingest" ? "wa-channel-ingest" : "wa-video-enrich";
await import(new URL(`../../../supabase/functions/${module}/index.ts`, import.meta.url).href);

const out: any = { fn: module, results: [] };
if (FN === "ingest") {
  const res = await handler(new Request("http://edge.test/?force=1&debug=1", { headers: { "x-fb-admin-key": "k" } }));
  const json = await res.json();
  out.status = res.status; out.ingested = json.ingested;
  out.seoTrace = (json.trace || []).filter((t: any) => t.step === "or-geula-seo" || t.step === "insert-fail");
  for (const ins of inserts) out.results.push({ msg: ins.ext_msg_id, status: ins.status,
    update: patches.find(p => p.table === "channel_updates" && p.filter.includes(ins.id))?.body || null });
} else {
  for (const id of Object.keys(ROWS)) {
    patches.length = 0; const before = calls.length;
    const res = await handler(new Request("http://edge.test/", { method: "POST", headers: { "x-fb-admin-key": "k", "content-type": "application/json" },
      body: JSON.stringify({ row_id: id }) }));
    const json = await res.json();
    out.results.push({ row: id.slice(0, 8), input: { seo_title: ROWS[id].seo_title, text: ROWS[id].text }, status: res.status, result: json.results?.[0],
      written: patches.filter(p => p.table === "channel_updates").map(p => p.body),
      aiCalls: calls.slice(before).filter(c => c.host === "api.anthropic.com").length });
  }
}
out.outsideHosts = [...new Set(calls.map(c => c.host))];
console.log(JSON.stringify(out, null, 1));
Deno.exit(0);
