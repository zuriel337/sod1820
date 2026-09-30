import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createMaterialGate } from "../_shared/materialGate.js";

// journey-message — intentionally public Journey UX under ai_quota_law v3 / journey_ai_guard_law.
// G0 ports the live source for reproducibility. Server-side anti-regression/rate containment remains a P1 owner gap;
// do not silently convert this free experience into the generic AI quota product.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
// G3 D2: canonical server capability gate + Operational Trace before provider spend (service role only).
// Journey stays a FREE public experience: budget_kind "none" — availability/entitlement only, no ai_quota.
const mg = createMaterialGate({
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
});
const CAPABILITY = "journey-message:msg";
const OWNER_REF = "ai_quota_law v3 + journey_ai_guard_law + platform_tiers_law v5";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

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

    // Gate BEFORE the provider call; fails closed. Public contract preserved (guests allowed).
    const caller = await mg.resolveCaller(req, body);
    const trace = await mg.beginTrace({
      capability: CAPABILITY, surface: "journey", ownerRef: OWNER_REF,
      identityClass: caller.tier, rootName: "journey-message", subjectRef: Number.isSafeInteger(value) && value > 0 ? `number:${value}` : null,
    });
    const g = await mg.runGate(trace, { capability: CAPABILITY, caller, requiredEntitlement: "public", budgetKind: "none" });
    if (g.state === "unavailable") return json({ message: null, error: "gate_unavailable", trace_id: trace?.traceId || null });
    if (g.state === "denied") return json({ message: null, error: g.denial, trace_id: trace?.traceId || null });

    const out = await mg.providerSpan(trace, {
      capability: CAPABILITY, name: "journey-message:model", ownerRef: OWNER_REF, model: MODEL,
      source: "journey", kind: deep ? "deep" : "msg", caller,
      run: async () => {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: MODEL, max_tokens: deep ? 520 : 320, system, messages: [{ role: "user", content: user }] }),
        });
        if (!r.ok) return { error: "ai_error", status: r.status };
        const data = await r.json();
        if (data?.stop_reason === "refusal") return { error: "refusal", usage: data?.usage };
        const text = Array.isArray(data?.content) ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text || "").join("").trim() : "";
        return { text, usage: data?.usage };
      },
    });
    await mg.finishTrace(trace, out.error ? "provider_error" : "success", out.error || null);
    if (out.error === "ai_error") return json({ message: null, error: "ai_error", status: (out as any).status }, 502);
    if (out.error === "refusal") return json({ message: null, error: "refusal" });
    return json({ message: out.text || null });
  } catch (e) {
    return json({ message: null, error: "exception", detail: String((e as Error).message).slice(0, 180) }, 500);
  }
});
