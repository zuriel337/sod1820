// 🧠 field-router — Edge Dispatcher v1 (Supabase, Deno).
// מקבל קלט-חיים + ערכי מנוע-הליבה (שכבר חושבו בלקוח — מקור-אמת יחיד), קורא ל-Claude
// בכמה «עדשות» במקביל, וכופה על כל אחת את הפלט האחיד. אינו מחשב גימטריה — רק מפרש.
// רוכב על ANTHROPIC_API_KEY הקיים (אותו סוד של gallery-ocr).
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ROUTER_MODEL") || "claude-sonnet-4-6";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: CORS });

const OUTPUT_SHAPE = `{
  "core_axis": "",
  "clusters": [{ "name": "", "events": [], "strength": 0 }],
  "timeline_pressure": [{ "period": "", "intensity": 0 }],
  "relationships_graph": [{ "node_a": "", "node_b": "", "relation": "" }],
  "summary": "",
  "insight_level": "low | medium | high"
}`;

const LENSES: Record<string, string> = {
  narrative: "נתח כסיפור-חיים ודפוסים רגשיים, אך תרגם הכל למבנה הפלט האחיד.",
  structure: "נתח מבנה בלבד — צירים, אשכולות, צפיפות-זמן וקשרים. בלי סיפור.",
};

function parseJsonLoose(text: string): unknown {
  let s = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return null; }
}

async function callClaude(input: unknown, core: unknown, lens: string): Promise<unknown> {
  const sys =
    `אתה מנוע ב«מרכז מחקר זהות». ${LENSES[lens] || ""}\n` +
    `⚠️ מנוע הליבה כבר חישב את כל ערכי הגימטריה — הם תחת "core_values". אסור לחשב/לשנות מספרים, רק לפרש.\n` +
    `החזר אך ורק JSON תקין בפורמט האחיד (בלי טקסט/Markdown):\n${OUTPUT_SHAPE}\n` +
    `כללים: בלי ניחוש/עתידות/מיסטיקה — רק דפוסים מהנתונים. כל פריט = node/edge, ומתחבר לציר הראשי (השם).`;
  const user = `קלט:\n${JSON.stringify(input)}\n\ncore_values:\n${JSON.stringify(core)}`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  const out = parseJsonLoose(raw);
  if (!out) throw new Error("bad_json");
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY" }, 500);
    const body = await req.json().catch(() => ({}));
    const { input, core_values, lenses = ["narrative", "structure"] } = body || {};
    if (!input) return json({ error: "missing input" }, 400);
    // גבול גודל — מניעת ניצול
    if (JSON.stringify(input).length > 20000) return json({ error: "input too large" }, 413);

    const keys = (Array.isArray(lenses) ? lenses : ["narrative"]).filter((k: string) => LENSES[k]).slice(0, 3);
    const settled = await Promise.allSettled(keys.map((k: string) => callClaude(input, core_values, k)));
    const outputs = settled.map((r, i) => r.status === "fulfilled"
      ? { lens: keys[i], out: r.value }
      : { lens: keys[i], error: String((r as PromiseRejectedResult).reason).slice(0, 160) });

    return json({ model: MODEL, outputs });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
