import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// journey-message — intentionally public Journey UX under ai_quota_law v3 / journey_ai_guard_law.
// G0 ports the live source for reproducibility. Server-side anti-regression/rate containment remains a P1 owner gap;
// do not silently convert this free experience into the generic AI quota product.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

async function logTokens(kind: string, model: string, usage: { input_tokens?: number; output_tokens?: number } | undefined) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !usage) return;
    await fetch(`${url}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "journey", kind, model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 }),
    });
  } catch { /* telemetry must not block UX */ }
}
function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[<>{}\[\]\\|`$]/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ message: null, error: "not_configured" });

    const body = await req.json().catch(() => ({}));
    const value = Number(body.value);
    const path: string[] = Array.isArray(body.path) ? body.path.filter((p: unknown) => typeof p === "string").slice(0, 20) : [];
    const world = typeof body.world === "string" ? body.world.slice(0, 300) : "";
    const meaning = typeof body.meaning === "string" ? body.meaning.slice(0, 1200) : "";
    const deep = body.depth === "deep";
    const name = cleanName(body.name);
    if (!value || path.length < 2) return json({ message: null, error: "bad_input" }, 400);

    const nameRule = name
      ? `5) אל תמציא שמות פרטיים של אנשים אחרים; מותר ורצוי לפנות אל המשתמש בשמו: «${name}» — פעם אחת, בטבעיות.`
      : "5) אל תכתוב שמות פרטיים של אנשים.";
    const baseRules = [
      "חוקים קשיחים:",
      "1) השתמש רק בביטויים ובערך שקיבלת. אל תמציא ערכים, גימטריות, מספרים או ביטויים חדשים.",
      "2) הפרד עובדה (הערך המשותף) מפרשנות (הרמז). הפרשנות רכה ומזמינה, לא קביעה.",
      "3) אל תבטיח נבואות ואל תיתן תאריכים.",
      "4) אישי, לא מטיף, בלי כותרות ובלי הקדמות.",
      nameRule,
      "החזר טקסט בלבד.",
    ];
    const system = deep
      ? ["אתה מדריך רוחני עברי בפרויקט סוד1820 (גימטריה וגאולה).", "כתוב מסר-עומק של 4-6 משפטים מתוך המסלול שסופק בלבד.", ...baseRules].join("\n")
      : ["אתה מדריך רוחני עברי בפרויקט סוד1820 (גימטריה וגאולה).", "כתוב הודעה אישית קצרה של 2-4 משפטים מתוך המסלול שסופק בלבד.", ...baseRules].join("\n");
    const user = [
      name ? `שם המשתמש: ${name}` : "",
      `הערך: ${value}`,
      `הביטויים במסלול (כולם = ${value}): ${path.join(" ← ")}`,
      world ? `השדה הדומיננטי: ${world}` : "",
      meaning ? `על המספר ${value}: ${meaning}` : "",
      deep ? "כתוב עכשיו את מסר-העומק." : "כתוב עכשיו את המסר האישי.",
    ].filter(Boolean).join("\n");

    const MODEL = "claude-haiku-4-5";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: deep ? 520 : 320, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) return json({ message: null, error: "ai_error", status: r.status }, 502);
    const data = await r.json();
    await logTokens(deep ? "deep" : "msg", MODEL, data?.usage);
    if (data?.stop_reason === "refusal") return json({ message: null, error: "refusal" });
    const text = Array.isArray(data?.content) ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text || "").join("").trim() : "";
    return json({ message: text || null });
  } catch (e) {
    return json({ message: null, error: "exception", detail: String((e as Error).message).slice(0, 180) }, 500);
  }
});
