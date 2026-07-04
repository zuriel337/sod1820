// 🧠 field-router — Edge Dispatcher v1 (Supabase, Deno).
// מקבל קלט-חיים + ערכי מנוע-הליבה (שכבר חושבו בלקוח — מקור-אמת יחיד), קורא ל-Claude
// בכמה «עדשות» במקביל, וכופה על כל אחת את הפלט האחיד. אינו מחשב גימטריה — רק מפרש.
// רוכב על ANTHROPIC_API_KEY הקיים (אותו סוד של gallery-ocr).
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ROUTER_MODEL") || "claude-sonnet-4-6";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DAILY_CAP = Number(Deno.env.get("ROUTER_DAILY_CAP") || "20");

// 🪙 רישום טוקנים — fire-and-forget ל-ai_token_log.
async function logTokens(kind: string, uid: string | null, usage: { input_tokens?: number; output_tokens?: number } | undefined) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !usage) return;
    await fetch(`${SUPABASE_URL}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "router", kind, model: MODEL, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, user_id: uid }),
    });
  } catch { /* לא חוסם */ }
}

// 🔐 GATE — מאמת משתמש מחובר + rate-limit. ללא גישה → fallback בטוח (בלי קריאה ל-Claude, בלי עלות).
async function gate(req: Request): Promise<{ ok: true; uid: string } | { ok: false; reason: string }> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "auth" };
  // אימות ה-JWT של המשתמש מול Supabase Auth
  const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!ures.ok) return { ok: false, reason: "auth" };
  const user = await ures.json();
  if (!user?.id) return { ok: false, reason: "auth" };
  // tier — אם קיימת טבלת profiles, דרוש tier≥3 (לא חוסם אם אין טבלה/שורה)
  try {
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=tier`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    if (pr.ok) { const rows = await pr.json(); if (Array.isArray(rows) && rows[0] && typeof rows[0].tier === "number" && rows[0].tier < 3) return { ok: false, reason: "tier" }; }
  } catch { /* אין profiles → לא חוסם */ }
  // rate-limit פר-משתמש ליום
  const rl = await fetch(`${SUPABASE_URL}/rest/v1/rpc/router_rate_check`, {
    method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user: user.id, p_cap: DAILY_CAP }),
  });
  if (rl.ok) { const allowed = await rl.json(); if (allowed === false) return { ok: false, reason: "rate" }; }
  return { ok: true, uid: user.id };
}

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

// 🧭 שכבת-פרשנות ל«מסע חיפוש» — צורה פשוטה: סיכום + קשרים + שאלות-המשך. עובדה ≠ הוכחה.
const JOURNEY_SHAPE = `{
  "summary": "",
  "connections": ["קשר/דפוס מהעובדות בלבד"],
  "questions": ["שאלת-המשך לחקירה"],
  "confidence": "low | medium | high"
}`;

const LENSES: Record<string, string> = {
  narrative: "נתח כסיפור-חיים ודפוסים רגשיים, אך תרגם הכל למבנה הפלט האחיד.",
  structure: "נתח מבנה בלבד — צירים, אשכולות, צפיפות-זמן וקשרים. בלי סיפור.",
  journey: "אתה שכבת-פרשנות לתוצאות חיפוש בתורה (גימטריה/דילוגים/פסוקים). סכם מה נמצא, הצע קשרים מהעובדות בלבד, והצע שאלות-המשך. אל תכריע משמעות — חקירה, לא הוכחה.",
};
const SHAPE_FOR = (lens: string) => (lens === "journey" ? JOURNEY_SHAPE : OUTPUT_SHAPE);

function parseJsonLoose(text: string): unknown {
  let s = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return null; }
}

async function callClaude(input: unknown, core: unknown, lens: string, uid: string | null): Promise<unknown> {
  const sys =
    `אתה מנוע ב«מרכז מחקר זהות». ${LENSES[lens] || ""}\n` +
    `⚠️ מנוע הליבה כבר חישב את כל ערכי הגימטריה — הם תחת "core_values". אסור לחשב/לשנות מספרים, רק לפרש.\n` +
    `החזר אך ורק JSON תקין בפורמט האחיד (בלי טקסט/Markdown):\n${SHAPE_FOR(lens)}\n` +
    `כללים: בלי ניחוש/עתידות/מיסטיקה — רק דפוסים מהנתונים. חקירה, לא הוכחה.`;
  const user = `קלט:\n${JSON.stringify(input)}\n\ncore_values:\n${JSON.stringify(core)}`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
  const data = await resp.json();
  await logTokens(lens, uid, data?.usage);
  const raw = (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  const out = parseJsonLoose(raw);
  if (!out) throw new Error("bad_json");
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY" }, 500);

    // 🔐 שער — בלי גישה מחזירים gated (הלקוח נשאר עם מנוע-הליבה בלבד, בלי עלות)
    const g = await gate(req);
    if (!g.ok) return json({ gated: true, reason: g.reason, outputs: [] });

    const body = await req.json().catch(() => ({}));
    const { input, core_values, lenses = ["narrative", "structure"] } = body || {};
    if (!input) return json({ error: "missing input" }, 400);
    // גבול גודל — מניעת ניצול
    if (JSON.stringify(input).length > 20000) return json({ error: "input too large" }, 413);

    const keys = (Array.isArray(lenses) ? lenses : ["narrative"]).filter((k: string) => LENSES[k]).slice(0, 3);
    const settled = await Promise.allSettled(keys.map((k: string) => callClaude(input, core_values, k, g.uid)));
    const outputs = settled.map((r, i) => r.status === "fulfilled"
      ? { lens: keys[i], out: r.value }
      : { lens: keys[i], error: String((r as PromiseRejectedResult).reason).slice(0, 160) });

    return json({ model: MODEL, outputs });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
