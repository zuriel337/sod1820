import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createMaterialGate } from "../_shared/materialGate.js";

// journey-message — Journey UX under ai_quota_law v3 / journey_ai_guard_law.
// M0-B (ZURIEL, 12.11.2026): this is a PAID AI call and runs only for a verified signed-in user
// (Supabase session JWT verified server-side). A guest receives 401 sign_in_required before any limiter,
// trace, gate or provider I/O. Abuse containment reuses the existing atomic edge limiter (per account
// 40/hour + global 120/hour, unchanged) plus a global daily cap over ai_quota_check; any limiter failure
// fails CLOSED. The Journey budget stays "none" (it is not converted into the generic ai_quota product).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Retry-After",
  "Content-Type": "application/json",
};

type JourneyCaller = {
  userRef: string | null;
  visitor: string | null;
  identity: string;
  tier: string;
  verified: boolean;
};

type JourneyMaterialGate = {
  serviceRpc: (name: string, args: Record<string, unknown>) => Promise<any>;
  resolveCaller: (req: Request, body?: Record<string, unknown>) => Promise<JourneyCaller>;
  paidAiLimits: (caller: JourneyCaller, options: Record<string, unknown>) => Promise<any>;
  beginTrace: (args: Record<string, unknown>) => Promise<any>;
  runGate: (trace: any, args: Record<string, unknown>) => Promise<any>;
  providerSpan: (trace: any, args: Record<string, unknown>) => Promise<any>;
  finishTrace: (trace: any, outcome: string, stopReason?: string | null) => Promise<void>;
};

// G3 D2: canonical server capability gate + Operational Trace before provider spend (service role only).
// Journey budget_kind stays "none" — availability/entitlement only, no per-account ai_quota row.
// materialGate is shared JavaScript without a declaration file; keep the cast at this one boundary.
const mg = createMaterialGate({
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
} as any) as unknown as JourneyMaterialGate;
const CAPABILITY = "journey-message:msg";
const OWNER_REF = "ai_quota_law v3 + journey_ai_guard_law + platform_tiers_law v5";
const RATE_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_VERIFIED = 40;
const RATE_LIMIT_GLOBAL = 120;
const DAILY_CAP_GLOBAL = 500;
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_PATH_ITEMS = 20;
const MAX_PATH_ITEM_CHARS = 160;

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, ...extraHeaders } });

async function readBoundedJson(req: Request): Promise<
  { ok: true; body: Record<string, unknown> } |
  { ok: false; error: "payload_too_large" | "bad_json" }
> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return { ok: false, error: "payload_too_large" };
  }

  if (!req.body) return { ok: true, body: {} };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel("payload_too_large").catch(() => undefined);
        return { ok: false, error: "payload_too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: "bad_json" };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "bad_json" };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: "bad_json" };
  }
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[<>{}\[\]\\|`$]/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ message: null, error: "method_not_allowed" }, 405);
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ message: null, error: "not_configured" });

    const payload = await readBoundedJson(req);
    if (!payload.ok) {
      return json({ message: null, error: payload.error }, payload.error === "payload_too_large" ? 413 : 400);
    }
    const body = payload.body;
    const value = Number(body.value);
    const path: string[] = Array.isArray(body.path)
      ? body.path
        .filter((p: unknown) => typeof p === "string")
        .map((p: string) => p.trim().slice(0, MAX_PATH_ITEM_CHARS))
        .filter(Boolean)
        .slice(0, MAX_PATH_ITEMS)
      : [];
    const world = typeof body.world === "string" ? body.world.slice(0, 300) : "";
    const meaning = typeof body.meaning === "string" ? body.meaning.slice(0, 1200) : "";
    const deep = body.depth === "deep";
    const name = cleanName(body.name);
    if (!Number.isSafeInteger(value) || value <= 0 || path.length < 2) {
      return json({ message: null, error: "bad_input" }, 400);
    }

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

    // Signed-in only, then atomic server-side containment BEFORE trace/gate/provider spend. Limiter keys
    // are server-keyed hashes; raw user ids are never persisted in a rate-limit bucket.
    const caller = await mg.resolveCaller(req, body);
    if (!caller.verified) return json({ message: null, error: "sign_in_required" }, 401);
    const rate = await mg.paidAiLimits(caller, {
      scope: "journey-message",
      accountLimit: RATE_LIMIT_VERIFIED, accountWindowSeconds: RATE_WINDOW_SECONDS,
      globalLimit: RATE_LIMIT_GLOBAL, globalWindowSeconds: RATE_WINDOW_SECONDS,
      globalDailyCap: DAILY_CAP_GLOBAL,
    });
    if (rate.state === "refused") return json({ message: null, error: "sign_in_required" }, 401);
    if (rate.state === "unavailable") {
      return json({ message: null, error: "rate_limit_unavailable" }, 503);
    }
    if (rate.state === "denied") {
      return json(
        { message: null, error: rate.bucket === "global_daily" ? "daily_cap_reached" : "rate_limited", retry_after_seconds: rate.retryAfter },
        429,
        { "Retry-After": String(rate.retryAfter) },
      );
    }

    // Gate BEFORE the provider call; fails closed.
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
