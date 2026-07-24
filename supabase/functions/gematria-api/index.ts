// gematria-api — 🔓 API ציבורי ללקוחות (external customers) למנוע-הגימטריה של SOD1820.
//
// עיקרון-על (gematria_engine_law): הפונקציה הזו *לא* מחשבת גימטריה. כל חישוב מתבצע במנוע
//   הרשמי בתוך ה-DB (fn_ragil / gem_calc / kadmi_gadol_calc), מרוכז בפונקציית ה-SQL
//   public.gematria_api(text). ה-Edge כאן = שכבת-תעבורה בלבד: CORS · אימות-מפתח (אופציונלי) ·
//   תיעוד-שימוש · עיצוב-תשובה. מקור-אמת יחיד = ה-DB. אין כאן מפות-אותיות ולא לוגיקת-גימטריה.
//
// ⚙️ config (Supabase → Edge Function settings):
//   verify_jwt = false  (public — לקוחות חיצוניים ללא טוקן Supabase).
//   GEMATRIA_API_REQUIRE_KEY = "1" → מחייב x-api-key תקין (טבלת api_keys). ברירת-מחדל: פתוח.
//
// 🔓 CORS: חייב לכלול את כל ה-headers ש-supabase-js שולח (x-client-info + x-supabase-api-version),
//   וכן x-api-key (מפתח-הלקוח שלנו) — אחרת preflight של הדפדפן נכשל בשקט (ראה חוזה ai-analyze).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info, x-supabase-api-version, x-api-key",
  "Access-Control-Max-Age": "86400",
};

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const REQUIRE_KEY = ["1", "true", "yes"].includes(
  (Deno.env.get("GEMATRIA_API_REQUIRE_KEY") || "").trim().toLowerCase(),
);

const svcHeaders = () => ({
  apikey: SB_SVC,
  Authorization: `Bearer ${SB_SVC}`,
  "Content-Type": "application/json",
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

// שֵם-תצוגה עברי לכל שיטה (לנוחות הלקוח). קדמי מוצג כ«קדמי · משולש» (מוסכמה באתר).
const METHOD_HE: Record<string, string> = {
  ragil: "רגיל",
  miluy: "מילוי",
  misratar: "מסתתר",
  kadmi: "קדמי · משולש",
  gadol: "גדול",
  siduri: "סידורי",
  atbash: "אתבש",
  albam: "אלבם",
  kadmi_gadol: "משולש גדול",
};

// ===== המרת מספר → ראשי-תיבות עבריים (מנצפ״ך). עיצוב-תצוגה בלבד, לא חישוב-גימטריה. =====
// מקור: hebrewNumeral ב-src/lib/gematria.js — שמור מסונכרן. 542→מב״ך · 683→פג״ם · 231→רל״א.
const NUM_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const NUM_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const NUM_HUND_BASE = ["", "ק", "ר", "ש", "ת"];
const NUM_HUND_FINAL: Record<number, string> = { 5: "ך", 6: "ם", 7: "ן", 8: "ף", 9: "ץ" };
function hebTensUnits(r: number): string {
  if (r === 15) return "טו";
  if (r === 16) return "טז";
  return (NUM_TENS[Math.floor(r / 10)] || "") + (NUM_ONES[r % 10] || "");
}
function hebUnder1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  if (h >= 5) return hebTensUnits(r) + NUM_HUND_FINAL[h];
  return (NUM_HUND_BASE[h] || "") + hebTensUnits(r);
}
function gershayim(s: string): string {
  if (!s) return s;
  if (s.length === 1) return s + "׳";
  return s.slice(0, -1) + "״" + s.slice(-1);
}
function hebrewNumeral(num: number): string {
  const n = Number(num);
  if (!n || n < 1 || n >= 1000000) return "";
  const parts: string[] = [];
  let rest = n;
  if (rest >= 1000) { parts.push(gershayim(hebUnder1000(Math.floor(rest / 1000)))); rest %= 1000; }
  if (rest > 0) parts.push(gershayim(hebUnder1000(rest)));
  return parts.join(" ");
}

// תיעוד עצמי — GET מחזיר את מדריך-השימוש (customers hitting the URL in a browser).
const DOCS = {
  service: "SOD1820 Gematria API",
  version: "1.0",
  description:
    "Compute Hebrew gematria for any word or phrase across 9 methods, using the official SOD1820 engine.",
  endpoint: "POST /functions/v1/gematria-api",
  request: {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "<your key> (only if key-gating is enabled)",
    },
    body: { text: "משיח בן דוד", methods: "(optional) array to filter, e.g. [\"ragil\",\"atbash\"]" },
  },
  methods: METHOD_HE,
  response_example: {
    status: "success",
    input: "משיח בן דוד",
    value: 424,
    hebrew_numeral: "תכ״ד",
    distance_from_1820: 1396,
    methods: { ragil: 424, miluy: 2286, misratar: 656 },
  },
  notes: [
    "value = the primary (ragil) gematria value.",
    "distance_from_1820 = 1820 − value (1820 is the heart of the SOD1820 system).",
    "Only Hebrew letters are counted; other characters are ignored.",
  ],
};

// אימות מפתח-לקוח (אופציונלי). קורא ל-RPC api_key_verify אם קיים.
// graceful: אם ה-RPC חסר/נכשל → כאשר REQUIRE_KEY כבוי מתייחסים כפתוח; כשדלוק → חוסמים בבטחה.
async function verifyKey(key: string): Promise<{ ok: boolean; customer?: string; reason?: string }> {
  if (!REQUIRE_KEY) return { ok: true };
  if (!key) return { ok: false, reason: "missing_api_key" };
  if (!SB_URL || !SB_SVC) return { ok: false, reason: "auth_not_configured" };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/api_key_verify`, {
      method: "POST",
      headers: svcHeaders(),
      body: JSON.stringify({ p_key: key }),
    });
    if (!r.ok) return { ok: false, reason: "auth_not_configured" };
    const v = await r.json(); // { valid: bool, customer: text }
    if (v?.valid) return { ok: true, customer: v?.customer };
    return { ok: false, reason: "invalid_api_key" };
  } catch {
    return { ok: false, reason: "auth_not_configured" };
  }
}

// תיעוד-שימוש (fire-and-forget) — נספר רק אם ה-RPC קיים; לא חוסם את התשובה.
async function logUsage(customer: string | undefined, key: string, inputLen: number) {
  if (!SB_URL || !SB_SVC) return;
  try {
    await fetch(`${SB_URL}/rest/v1/rpc/api_usage_log`, {
      method: "POST",
      headers: svcHeaders(),
      body: JSON.stringify({ p_customer: customer || null, p_key: key || null, p_input_len: inputLen }),
    });
  } catch { /* לא חוסם */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // GET → מדריך-שימוש (self-documenting).
  if (req.method === "GET") return json(DOCS);

  if (req.method !== "POST") {
    return json({ status: "error", error: "method_not_allowed", allow: "GET, POST" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? body?.query ?? "").slice(0, 500).trim();
    if (!text) {
      return json({ status: "error", error: "empty", message: "Provide a 'text' field with a Hebrew word or phrase." }, 400);
    }

    // אימות-מפתח (אם דלוק).
    const apiKey = (req.headers.get("x-api-key") || "").trim();
    const auth = await verifyKey(apiKey);
    if (!auth.ok) {
      const code = auth.reason === "auth_not_configured" ? 503 : 401;
      return json({ status: "error", error: auth.reason, message: "A valid x-api-key is required for this API." }, code);
    }

    // 🧮 החישוב — מהמנוע הרשמי בלבד (SQL public.gematria_api → fn_ragil/gem_calc/...).
    if (!SB_URL || !SB_SVC) return json({ status: "error", error: "engine_not_configured" }, 503);
    const r = await fetch(`${SB_URL}/rest/v1/rpc/gematria_api`, {
      method: "POST",
      headers: svcHeaders(),
      body: JSON.stringify({ p_text: text }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 200);
      return json({ status: "error", error: "engine_error", detail }, 502);
    }
    const data = await r.json(); // { input, value, distance_from_1820, methods:{...} }

    // סינון שיטות (אופציונלי): body.methods = ["ragil","atbash",...]
    let methods: Record<string, number> = data?.methods || {};
    if (Array.isArray(body?.methods) && body.methods.length) {
      const wanted = new Set(body.methods.map((m: unknown) => String(m)));
      methods = Object.fromEntries(Object.entries(methods).filter(([k]) => wanted.has(k)));
    }

    // תוויות עבריות רק לשיטות שהוחזרו.
    const methods_he: Record<string, string> = {};
    for (const k of Object.keys(methods)) methods_he[k] = METHOD_HE[k] || k;

    logUsage(auth.customer, apiKey, text.length); // fire-and-forget

    return json({
      status: "success",
      input: data?.input ?? text,
      value: data?.value ?? 0,
      hebrew_numeral: hebrewNumeral(data?.value ?? 0),
      distance_from_1820: data?.distance_from_1820 ?? (1820 - (data?.value ?? 0)),
      methods,
      methods_he,
      // תאימות לסקיצה המקורית: שדה answer קריא-לאדם.
      answer: `הביטוי «${data?.input ?? text}» = ${data?.value ?? 0} בגימטריה רגילה (מנוע SOD1820).`,
    });
  } catch (e) {
    return json({ status: "error", error: String(e).slice(0, 200) }, 500);
  }
});
