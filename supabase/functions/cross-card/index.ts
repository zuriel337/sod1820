// cross-card — מייצר כרטיס PNG ממותג (שפת ההיכל) לחידוש הצלבה, לשיתוף ויראלי.
// POST { id } (insight uuid) → שולף מ-insights; או POST { number, title, subtitle } לכרטיס חופשי.
// מעלה ל-Storage (gallery/cards/) ומחזיר { url }. ל-id גם מעדכן insights.card_url.
// פריסה: deploy_edge_function (verify_jwt=true). תלויות: satori (HTML→SVG) + resvg-wasm (SVG→PNG), פונטים עבריים מ-fontsource.

import satori from "https://esm.sh/satori@0.12.1";
import { html as toVNode } from "https://esm.sh/satori-html@0.3.2";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") || "https://sod1820.co.il").replace(/^https?:\/\//, "").replace(/\/$/, "");
const BUCKET = "gallery";

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

let wasmReady = false;
async function ensureWasm() {
  if (wasmReady) return;
  await initWasm(fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
  wasmReady = true;
}

let fontsCache: any[] | null = null;
async function loadFonts() {
  if (fontsCache) return fontsCache;
  const defs: [string, number, string][] = [
    ["Frank", 900, "https://cdn.jsdelivr.net/npm/@fontsource/frank-ruhl-libre@5.0.20/files/frank-ruhl-libre-hebrew-900-normal.woff"],
    ["Frank", 700, "https://cdn.jsdelivr.net/npm/@fontsource/frank-ruhl-libre@5.0.20/files/frank-ruhl-libre-hebrew-700-normal.woff"],
    ["Heebo", 400, "https://cdn.jsdelivr.net/npm/@fontsource/heebo@5.0.18/files/heebo-hebrew-400-normal.woff"],
    ["Heebo", 700, "https://cdn.jsdelivr.net/npm/@fontsource/heebo@5.0.18/files/heebo-hebrew-700-normal.woff"],
  ];
  fontsCache = await Promise.all(defs.map(async ([name, weight, url]) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`font ${url} ${res.status}`);
    return { name, weight, style: "normal", data: await res.arrayBuffer() };
  }));
  return fontsCache;
}

function esc(s: string) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function template(number: string, title: string, subtitle: string) {
  return `<div style="display:flex;width:1080px;height:1080px;background-color:#070506;padding:46px;box-sizing:border-box;font-family:Heebo;">
  <div style="display:flex;flex-direction:column;width:988px;height:988px;border:3px solid #d4af37;border-radius:30px;background-color:#0d0a0e;padding:56px;box-sizing:border-box;justify-content:space-between;">
    <div style="display:flex;width:100%;justify-content:space-between;align-items:center;">
      <div style="display:flex;font-family:Frank;font-weight:700;font-size:44px;color:#f6e27a;">♛ סוד 1820</div>
      <div style="display:flex;font-size:28px;color:#b9a98a;">כי לה׳ המלוכה</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;">
      <div style="display:flex;font-size:40px;color:#8a7a5e;letter-spacing:6px;margin-bottom:6px;">הצלבת שיטות</div>
      <div style="display:flex;font-family:Frank;font-weight:900;font-size:300px;line-height:1.05;color:#f6e27a;">${esc(number)}</div>
      <div style="display:flex;font-family:Frank;font-weight:700;font-size:50px;color:#ede4d3;margin-top:18px;max-width:840px;text-align:center;">${esc(title)}</div>
      ${subtitle ? `<div style="display:flex;font-size:34px;color:#b9a98a;margin-top:22px;max-width:820px;text-align:center;">${esc(subtitle)}</div>` : ""}
    </div>
    <div style="display:flex;flex-direction:column;width:100%;">
      <div style="display:flex;width:100%;height:2px;background-color:#d4af37;margin-bottom:22px;"></div>
      <div style="display:flex;width:100%;justify-content:space-between;align-items:center;">
        <div style="display:flex;font-size:32px;color:#9a7818;">✓ מאומת במנוע</div>
        <div style="display:flex;font-family:Frank;font-weight:700;font-size:38px;color:#d4af37;">${esc(SITE_URL)}</div>
      </div>
    </div>
  </div>
</div>`;
}

async function patchInsight(id: string, card_url: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/insights?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ card_url }),
  });
}

async function uploadPng(path: string, bytes: Uint8Array) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "image/png", "x-upsert": "true" },
    body: bytes,
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    let id: string | null = body.id || null;
    let number = body.number != null ? String(body.number) : "";
    let title = body.title || "";
    let subtitle = body.subtitle || "";

    if (id) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/insights?id=eq.${id}&select=id,title,related_numbers,related_phrases`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const rows = await r.json();
      if (!rows?.length) return json({ ok: false, error: "insight_not_found" }, 404);
      const it = rows[0];
      number = number || String((it.related_numbers || [])[0] ?? "");
      title = title || it.title || "";
      if (!subtitle) subtitle = (it.related_phrases || []).slice(0, 4).join("  ·  ");
    }
    if (!number && !title) return json({ ok: false, error: "missing number/title" }, 400);
    if (title.length > 70) title = title.slice(0, 68) + "…";
    if (subtitle.length > 90) subtitle = subtitle.slice(0, 88) + "…";

    const fonts = await loadFonts();
    const svg = await satori(toVNode(template(number, title, subtitle)) as any, { width: 1080, height: 1080, fonts });
    await ensureWasm();
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } }).render().asPng();

    const path = `cards/${id || "adhoc"}-${Date.now()}.png`;
    const url = await uploadPng(path, png);
    if (id) await patchInsight(id, url);
    return json({ ok: true, url });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
