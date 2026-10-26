import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createMaterialGate } from "../_shared/materialGate.js";

// journey-message — intentionally public Journey UX under ai_quota_law v3 / journey_ai_guard_law.
// Abuse containment reuses the existing atomic edge limiter. It is operational protection only:
// the Journey remains free/public and is not converted into the generic paid AI quota product.
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
  beginTrace: (args: Record<string, unknown>) => Promise<any>;
  runGate: (trace: any, args: Record<string, unknown>) => Promise<any>;
  providerSpan: (trace: any, args: Record<string, unknown>) => Promise<any>;
  finishTrace: (trace: any, outcome: string, stopReason?: string | null) => Promise<void>;
};

// G3 D2: canonical server capability gate + Operational Trace before provider spend (service role only).
// Journey stays a FREE public experience: budget_kind "none" — availability/entitlement only, no ai_quota.
// materialGate is shared JavaScript without a declaration file; keep the cast at this one boundary.
const mg = createMaterialGate({
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
} as any) as unknown as JourneyMaterialGate;
const CAPABILITY = "journey-message:msg";
const OWNER_REF = "ai_quota_law v3 + journey_ai_guard_law + platform_tiers_law v5";
const RATE_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_ANON = 12;
const RATE_LIMIT_VERIFIED = 40;
const RATE_LIMIT_GLOBAL = 120;
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_PATH_ITEMS = 20;
const MAX_PATH_ITEM_CHARS = 160;

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, ...extraHeaders } });

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

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

function networkIdentity(req: Request): string {
  const cloudflare = String(req.headers.get("cf-connecting-ip") || "").trim();
  const forwarded = String(req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Prefer the platform-injected Cloudflare address. Otherwise use the last
  // proxy hop, not the client-controlled first XFF value. Do not include UA:
  // rotating it must not create a fresh anonymous bucket.
  const ip = cloudflare || forwarded.at(-1) || "unknown";
  return `anon:${ip}`;
}

function retryAfterSeconds(windowSeconds = RATE_WINDOW_SECONDS): number {
  const supplied = Number(windowSeconds);
  const safeWindow = Number.isFinite(supplied) && supplied > 0
    ? Math.min(RATE_WINDOW_SECONDS, Math.max(60, Math.floor(supplied)))
    : RATE_WINDOW_SECONDS;
  const seconds = Math.floor(Date.now() / 1000);
  return Math.max(1, safeWindow - (seconds % safeWindow));
}

async function enforceRateLimit(req: Request, caller: any): Promise<
  { state: "allowed" } |
  { state: "denied"; retryAfter: number } |
  { state: "unavailable" }
> {
  const verified = caller?.verified === true && typeof caller?.userRef === "string";
  const identity = verified ? `user:${caller.userRef}` : networkIdentity(req);
  const identityKey = await sha256(`journey-message|identity|${identity}`);
  const globalKey = await sha256("journey-message|global");
  const identityLimit = verified ? RATE_LIMIT_VERIFIED : RATE_LIMIT_ANON;

  const identityDecision = await mg.serviceRpc("edge_rate_limit_check", {
    p_key_hash: identityKey,
    p_window_seconds: RATE_WINDOW_SECONDS,
    p_limit: identityLimit,
  });
  if (!identityDecision || typeof identityDecision.allowed !== "boolean") {
    return { state: "unavailable" };
  }
  if (!identityDecision.allowed) {
    return { state: "denied", retryAfter: retryAfterSeconds(identityDecision.window_seconds) };
  }

  const globalDecision = await mg.serviceRpc("edge_rate_limit_check", {
    p_key_hash: globalKey,
    p_window_seconds: RATE_WINDOW_SECONDS,
    p_limit: RATE_LIMIT_GLOBAL,
  });
  if (!globalDecision || typeof globalDecision.allowed !== "boolean") {
    return { state: "unavailable" };
  }
  if (!globalDecision.allowed) {
    return { state: "denied", retryAfter: retryAfterSeconds(globalDecision.window_seconds) };
  }

  return { state: "allowed" };
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

    // Atomic server-side containment BEFORE trace/gate/provider spend. The limiter key is a hash;
    // raw IP, user id and user-agent are never persisted in the rate-limit bucket.
    const caller = await mg.resolveCaller(req, body);
    const rate = await enforceRateLimit(req, caller);
    if (rate.state === "unavailable") {
      return json({ message: null, error: "rate_limit_unavailable" }, 503);
    }
    if (rate.state === "denied") {
      return json(
        { message: null, error: "rate_limited", retry_after_seconds: rate.retryAfter },
        429,
        { "Retry-After": String(rate.retryAfter) },
      );
    }

    // Gate BEFORE the provider call; fails closed. Public contract preserved (guests allowed).
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
