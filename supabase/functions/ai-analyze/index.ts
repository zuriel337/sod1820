import { callClaudeReliable } from "../_shared/raziel-reliability.ts";
import { selectRazielIntelligence, RAZIEL_LEVELS } from "../_shared/razielIntelligence.js";
import { whatsappSurfaceProfileText } from "../_shared/waRazielRender.ts";
// ai-analyze — ניתוח AI גנרי. fast=true → Haiku (מהיר, לכלים אינטראקטיביים); אחרת Sonnet (עומק).
// יושר: מפרש רק עובדות שסופקו, לא מחשב גימטריה, מפריד עובדה מפרשנות, בלי נבואות.
//
// 🌳 Single-Mind Trunk Closure — Phase 1 (metatron_rollout_law, metatron_single_mind_law — 30.8.2026):
//    metatron_context() is now MANDATORY, not opt-in, for every kind in the generic path below
//    (number/compare/verse/notarikon/daily_verse/discovery/research) AND for persona="raziel". No
//    body.metatron flag is required or read anymore — cost/traffic is explicitly NOT a valid reason to
//    gate Phase 1 per metatron_rollout_law (that reasoning belongs to Phase 4, the later product A/B,
//    not to trunk closure). Source of truth stays single: nodes(propagate=true) → fn_active_method_rules
//    → metatron_context → here. fail-open, always: a metatron_context failure/empty result leaves sys/facts
//    unchanged from the pre-1b baseline — no response is ever blocked by this.
//    kind="guide" is now wired too, safely: it calls metatron_context with intent="navigation", which
//    (per the Foundation Expansion Gate migration) skips the gematria rules block entirely and returns
//    canonical.capabilities from site_services instead. That capability context (title/description only,
//    no URLs) is folded into guideUser as informational background — SYSTEM_GUIDE's strict JSON contract
//    and the hardcoded allowed-route whitelist (the actual "to" values the model may output) are both
//    untouched. Reconciling that whitelist against site_services' route strings (which don't 1:1 match,
//    e.g. "/numbers" vs guide's working "/number/:n") is a separate product/routing decision — Phase-2 /
//    EXTENSION POINT, not implemented here. fail-open: guideMtx null → identical to pre-gate behavior.
//
// 🆕 מנוע נוסף (A/B): body.engine = "claude" (ברירת-מחדל) | "gemini".
//    אותו SYSTEM + אותו user-prompt לשני המנועים → השוואת פרשנות הוגנת על אותן עובדות מהמנוע.
//    Gemini משתמש ב-GEMINI_API_KEY (Edge secret, כמו ANTHROPIC_API_KEY — לא Vault).
//    אם אין מפתח למנוע המבוקש → { analysis:null, error:"not_configured" } (נפילה בחן, לא קריסה).
// .trim() — הגנה מפני רווח/שורה עודפת בסוד (הכי נפוץ; גורם ל-Google להחזיר "API key not valid").
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const GEMINI_KEY = (Deno.env.get("GEMINI_API_KEY") || "").trim();
const MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const FAST_MODEL = (Deno.env.get("CHAT_MODEL") || "claude-haiku-4-5").trim();
// אם GEMINI_MODEL לא מוגדר/שגוי → ברירת-מחדל בטוחה (מונע דגם לא-תקין בסוד).
const GEMINI_MODEL_RAW = (Deno.env.get("GEMINI_MODEL") || "").trim();
const GEMINI_MODEL = GEMINI_MODEL_RAW.startsWith("gemini") ? GEMINI_MODEL_RAW : "gemini-2.5-flash";

// 🔓 CORS: חובה לכלול את *כל* ה-headers ש-supabase-js שולח בקריאת functions.invoke
//    (בעיקר x-client-info + x-supabase-api-version), אחרת ה-preflight של הדפדפן נכשל
//    והבקשה נחסמת בשקט (עבד ב-curl אך לא בדפדפן). זו הייתה הסיבה ל«לא התקבל ניתוח».
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function logTokens(
  kind: string,
  model: string,
  usage: { input_tokens?: number; output_tokens?: number } | undefined,
  identity = "",
  trace: { traceId?: string | null; spanId?: string | null } = {},
): Promise<number | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !usage) return null;

    let user_id: string | null = null, visitor: string | null = null;
    if (identity.startsWith("u:")) user_id = identity.slice(2);
    else if (identity.startsWith("v:")) visitor = identity.slice(2);

    const hasTrace = !!(trace.traceId && trace.spanId);
    const legacyRow = {
      source: "analyze",
      kind,
      model,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      user_id,
      visitor,
    };
    const row = {
      ...legacyRow,
      trace_id: hasTrace ? trace.traceId : null,
      span_id: hasTrace ? trace.spanId : null,
    };

    const insert = async (withTrace: boolean) => {
      const suffix = withTrace ? "?on_conflict=trace_id,span_id&select=id" : "?select=id";
      const prefer = withTrace ? "resolution=ignore-duplicates,return=representation" : "return=representation";
      return await fetch(`${url}/rest/v1/ai_token_log${suffix}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: prefer },
        body: JSON.stringify(withTrace ? row : legacyRow),
      });
    };

    let r = await insert(hasTrace);
    // Trace persistence must never break the pre-existing cost log. If correlation
    // is unavailable/misconfigured, fall back to the legacy untraced insert.
    if (!r.ok && hasTrace) r = await insert(false);
    if (!r.ok) return null;

    const rows = await r.json().catch(() => []);
    const insertedId = Number(Array.isArray(rows) ? rows?.[0]?.id : rows?.id);
    if (Number.isFinite(insertedId) && insertedId > 0) return insertedId;

    // ON CONFLICT DO NOTHING can return no row. Resolve the existing idempotent row.
    if (hasTrace) {
      const q = await fetch(
        `${url}/rest/v1/ai_token_log?trace_id=eq.${trace.traceId}&span_id=eq.${trace.spanId}&select=id&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (q.ok) {
        const existing = await q.json().catch(() => []);
        const existingId = Number(existing?.[0]?.id);
        if (Number.isFinite(existingId) && existingId > 0) return existingId;
      }
    }
    return null;
  } catch {
    return null;
  }
}

type OperationalTraceHandle = {
  traceId: string;
  rootSpanId: string;
  startedAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REF_RE = /^[a-z0-9:_./-]{1,180}$/i;

function safeTraceUuid(value: unknown): string | null {
  const v = String(value || "").trim();
  return UUID_RE.test(v) ? v : null;
}


function safeOperationalRef(value: unknown): string | null {
  const v = String(value || "").trim();
  return SAFE_REF_RE.test(v) ? v : null;
}

// AI_NUMERIC_TRUTH_GUARD_START
function canonicalNumericLiteral(value) {
  const raw = String(value ?? "").trim().replace(/,/g, "").replace(/^\+/, "");
  if (!raw) return null;
  if (/^-?\d+$/.test(raw)) {
    try { return BigInt(raw).toString(); } catch { return raw; }
  }
  if (/^-?\d+\.\d+$/.test(raw)) {
    const [wholeRaw, fractionRaw] = raw.split(".");
    let whole = wholeRaw;
    try { whole = BigInt(wholeRaw).toString(); } catch { /* preserve */ }
    const fraction = fractionRaw.replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole;
  }
  return raw;
}

function numericLiterals(value) {
  const text = String(value ?? "");
  const matches = text.match(/(?<![\p{L}\p{N}_])[+-]?\d+(?:,\d{3})*(?:\.\d+)?(?![\p{L}\p{N}_])/gu) || [];
  return [...new Set(matches.map(canonicalNumericLiteral).filter(Boolean))];
}

function validateNumericOutput(output, permittedTexts = []) {
  const permitted = new Set(permittedTexts.flatMap(numericLiterals));
  const outputNumbers = numericLiterals(output);
  const invented = outputNumbers.filter((value) => !permitted.has(value));
  return Object.freeze({
    ok: invented.length === 0,
    permitted: Object.freeze([...permitted]),
    output: Object.freeze(outputNumbers),
    invented: Object.freeze(invented),
  });
}

function numericTruthRetryInstruction() {
  return "\n\nתיקון חובה: בטיוטה הקודמת הופיעה טענה מספרית שלא הייתה בחומר שסופק. כתוב מחדש בלי להוסיף שום מספר, חישוב, פירוק, סכום או ערך שלא הופיע במפורש בחומר שסופק. פרש בלבד.";
}

function numericTruthFallback() {
  return "אין לי מספיק חומר מספרי שסופק כדי להוסיף חישוב בלי להמציא. אפשר להמשיך מתוך הנתונים שכבר נמסרו בלבד.";
}
// AI_NUMERIC_TRUTH_GUARD_END

async function traceRpc(name: string, payload: Record<string, unknown>): Promise<any | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !key) return null;
    const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function beginOperationalTrace({
  body,
  identityClass,
  capability,
  surface,
  ownerRef,
  subject,
}: {
  body: any;
  identityClass: string;
  capability: string;
  surface: string;
  ownerRef: string;
  subject: string;
}): Promise<OperationalTraceHandle | null> {
  // Public ai-analyze is a trust boundary: do not let an untrusted caller choose
  // a root trace UUID and merge unrelated interactions. Client continuity may use
  // interaction_id; cross-service trace propagation will use a trusted server envelope.
  const traceId = crypto.randomUUID();
  const rootSpanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const numericSubject = /^\d{1,18}$/.test(subject) ? `number:${subject}` : null;
  const result = await traceRpc("op_trace_begin_v1", {
    p_trace_id: traceId,
    p_root_span_id: rootSpanId,
    p_context: {
      interaction_id: safeTraceUuid(body?.interaction_id),
      capability,
      surface: safeOperationalRef(surface) || "ai-analyze",
      channel: "web",
      locale: "he",
      identity_class: identityClass,
      subject_ref: numericSubject,
      owner_ref: ownerRef,
      root_name: "ai-analyze",
    },
    p_started_at: startedAt,
  });
  const returnedTraceId = safeTraceUuid(result?.trace_id) || traceId;
  const returnedRootSpanId = safeTraceUuid(result?.root_span_id) || rootSpanId;
  return result ? { traceId: returnedTraceId, rootSpanId: returnedRootSpanId, startedAt } : null;
}

async function recordOperationalSpan(
  trace: OperationalTraceHandle | null,
  {
    spanId,
    parentSpanId = null,
    kind,
    name,
    startedAt,
    endedAt,
    outcome,
    detail = {},
  }: {
    spanId: string;
    parentSpanId?: string | null;
    kind: string;
    name: string;
    startedAt: string;
    endedAt: string;
    outcome: string;
    detail?: Record<string, unknown>;
  },
) {
  if (!trace) return;
  await traceRpc("op_trace_record_span_v1", {
    p_trace_id: trace.traceId,
    p_span_id: spanId,
    p_parent_span_id: parentSpanId || trace.rootSpanId,
    p_kind: kind,
    p_name: name,
    p_started_at: startedAt,
    p_ended_at: endedAt,
    p_outcome: outcome,
    p_detail: detail,
  });
}

async function finishOperationalTrace(
  trace: OperationalTraceHandle | null,
  outcome: string,
  stopReason: string | null = null,
) {
  if (!trace) return;
  await traceRpc("op_trace_finish_v1", {
    p_trace_id: trace.traceId,
    p_root_span_id: trace.rootSpanId,
    p_outcome: outcome,
    p_ended_at: new Date().toISOString(),
    p_stop_reason: stopReason,
  });
}

async function linkOperationalAiCost(
  trace: OperationalTraceHandle | null,
  spanId: string,
  tokenLogId: number | null,
) {
  if (!trace || !tokenLogId) return;
  await traceRpc("op_trace_link_ai_cost_v1", {
    p_trace_id: trace.traceId,
    p_span_id: spanId,
    p_ai_token_log_id: tokenLogId,
  });
}


function nameLabFindingIdsFromFacts(facts: unknown): Set<string> {
  const out = new Set<string>();
  const text = String(facts || "");
  const re = /\[([^\]\n]{1,180})\]/g;
  for (const m of text.matchAll(re)) {
    const id = String(m[1] || "").trim();
    if (id) out.add(id);
  }
  return out;
}

function cleanBoundedText(value: unknown, max = 800): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function parseNameLabReflectionOutput(text: unknown, facts: unknown) {
  const raw = String(text || "").trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/, "");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const message = cleanBoundedText(parsed.message, 4000);
    if (!message) return null;
    const allowed = nameLabFindingIdsFromFacts(facts);
    const motifs = (Array.isArray(parsed.motifs) ? parsed.motifs : []).slice(0, 6).map((motif: any, index: number) => {
      const ids = [...new Set((Array.isArray(motif?.finding_ids) ? motif.finding_ids : [])
        .map((id: unknown) => String(id || "").trim())
        .filter((id: string) => id && allowed.has(id)))].slice(0, 12);
      if (!ids.length) return null;
      const frame = motif?.frame && typeof motif.frame === "object" && !Array.isArray(motif.frame)
        ? {
            essence: cleanBoundedText(motif.frame.essence, 240),
            power: cleanBoundedText(motif.frame.power, 240),
            shadow: cleanBoundedText(motif.frame.shadow, 240),
            balance: cleanBoundedText(motif.frame.balance, 240),
            action: cleanBoundedText(motif.frame.action, 240),
          }
        : {};
      return {
        key: cleanBoundedText(motif?.key, 80) || `motif-${index + 1}`,
        label: cleanBoundedText(motif?.label, 120),
        summary: cleanBoundedText(motif?.summary, 500),
        finding_ids: ids,
        frame,
      };
    }).filter(Boolean);
    return { message, motifs };
  } catch {
    return null;
  }
}

const KIND_HINT: Record<string, string> = {
  compare: "השוואת שני שמות/ביטויים. אם הם מתכנסים (ערך שווה באחת מהשיטות הזמינות) — הסבר מה המפגש מרמז. אם אין ביניהם מפגש כלל (ללא מפגש בשיטות הזמינות) — אל תציג זאת ככישלון אלא כהשלמה: שני צירים מקבילים שאינם מגבילים זה את זה בתבנית מוכרת. נהל דיאלוג בין המקבילות של כל שם (מה שהאחד שווה לו מול מה שהשני שווה לו), והתייחס לסכום שני השמות כאל נקודת-החיבור. הפרד עובדה (הערכים) מרמז (הפרשנות), הצג כהזמנה למחשבה על הדינמיקה המשותפת — לא כקביעה או נבואה.",
  notarikon: "ראשי/אמצעי/סופי תיבות: מה המילה/הצירוף שנוצר מהאותיות, והקשר האפשרי לביטוי המקור.",
  verse: "פסוק מהתורה: משמעות הפסוק בהקשרו, וכל ערך/צירוף שכבר סופק — כרמז משלים.",
  daily_verse: "פסוק יומי: מסר קצר ומעורר השראה מהפסוק, נאמן לפשט.",
  number: "מספר במערכת: משמעותו, המילים/הביטויים ששווים לו וההתכנסויות שסופקו — מה הם עשויים לרמז יחד. רמז משלים חם, לא נבואה, נאמן לעובדות שסופקו בלבד.",
  discovery: "מגלה-המקבילות: קיבלת רשימת מקבילות (ביטויים באותו ערך, מדורגים מהמפתיע לנפוץ). בחר מתוכן אחת — הכי מפתיעה ובעלת עומק — לפי: (א) הימנע ממילים בנאליות/יומיומיות; (ב) העדף ניגודיות משלימה — מקבילה שמרחיבה את השם למרחב בלתי-צפוי; (ג) העדף עולמות רוחניים/היסטוריים/תרבותיים בעלי משקל; (ד) הסבר בקצרה מדוע דווקא היא מפתיעה. כלל-ברזל: בחר אך ורק מהרשימה שסופקה — אל תמציא מקבילה. הצג כהזמנה למחשבה, לא כנבואה, ותמיד הפרד את השוויון (עובדה) מהפרשנות (רמז).",
  research: "אוסף-המחקר של החוקר: כמה ישויות שאסף יחד. מצא את החוטים האמיתיים — ערכים משותפים, קשר תמטי, התכנסות — והצע כיוון-המשך. בכנות אם אין קשר אמיתי.",
  name_lab: "מעבדת-שם: קיבלת ממצאי-מנוע (Findings) על השם כמילה/צירוף-אותיות בלבד — מילויים, אנגרמים, וריאנטים, גימטריית-הרכיב. התייחס לשם הנחקר כאל מילה/ביטוי, לא כאל אדם: אל תסיק תכונות-אופי, גורל, נבואה או קביעה על מי שנושא את השם. כל ממצא הוא תוצר-מנוע עם מגבלת-אימות משלו (ראה ההנחיה על העובדות) — לא טענת-אמת סגורה. הצע רמז/פרשנות לשוני-תרבותי על המילה עצמה, בענווה, בלי נבואות ובלי טענות אישיות.",
  contact_triage: "ניתוח דפוס UX/מוצר מצטבר. קיבלת רק נתונים אגרגטיביים ללא טקסטים אישיים. סכם מה כנראה קורה, מה לא ניתן להסיק, ומה הבדיקה/שיפור הקטן הבא שכדאי לבצע. אל תקבע שהבעיה אמיתית רק כי יש דיווחים, ואל תציע פרסום/מחקר/שינוי אוטומטי.",
};

const SYSTEM_CONTACT_TRIAGE =
  "אתה מנתח מוצר/UX פנימי של SOD1820. אתה מקבל רק אותות מצטברים ומטא-דאטה בטוחים, לא תוכן אישי גולמי.\n" +
  "חוקי ברזל:\n" +
  "1. הפרד בין Observed לבין Interpretation. דיווחים חוזרים הם אות, לא הוכחה.\n" +
  "2. אל תמציא משתמשים, טקסטים, סיבות, מספרים או מסקנות שלא הופיעו בקלט.\n" +
  "3. הצע את הבדיקה/השיפור הקטן הבא שיכול לאמת או להפריך את ההשערה.\n" +
  "4. אל תציע שינוי אוטומטי, פרסום, canonicalization או הפיכת פנייה למחקר.\n" +
  "5. עברית בלבד. 3-5 משפטים קצרים, בלי Markdown.";

const SYSTEM =
  "אתה פרשן עברי באתר גימטריה ותורה. תפקידך: לתת ניתוח מכובד ומדויק בעברית (האורך נקבע בהנחיה שבסוף בקשת-המשתמש).\n" +
  "חוקי ברזל:\n" +
  "1. אל תחשב גימטריה בעצמך — כל הערכים שסופקו כבר חושבו במנוע הרשמי. השתמש רק בהם.\n" +
  "2. הפרד תמיד עובדה (מה שסופק) מפרשנות (רמז משלים). אל תמציא ערכים, מקורות, פסוקים או עובדות.\n" +
  "3. בלי נבואות, בלי תאריכים עתידיים, בלי טענות על אנשים חיים.\n" +
  "4. אם אין קשר אמיתי בין הנתונים — אמור זאת ביושר, אל תמציא חיבור.\n" +
  "5. עברית בלבד, חם אך מדויק. בלי כותרות ובלי Markdown.";

// 🧭 מלווה-כניסה (kind="guide") — לא פרשן-גימטריה אלא נתב-ניווט. מקבל טקסט-חופשי של מבקר חדש
//    ומחזיר JSON עם יעד/ים מתוך רשימה סגורה בלבד (בלי להמציא כתובות). fast=Haiku, זול ומהיר.
const SYSTEM_GUIDE =
  "אתה מלווה-כניסה חם וידידותי באתר «סוד 1820» (גימטריה, תורה ורמזי גאולה). מבקר חדש כתב לך במילים שלו מה מביא אותו. תפקידך היחיד: לכוון אותו למקום הנכון באתר.\n" +
  "כללי ברזל:\n" +
  "1. החזר אך ורק JSON תקין ותו לא — בלי טקסט לפני/אחרי, בלי Markdown, בלי ```.\n" +
  "2. מבנה מדויק: {\"message\":\"<משפט חם אחד, עד 18 מילים>\",\"picks\":[{\"label\":\"<תווית קצרה עם אימוג'י>\",\"to\":\"<נתיב>\"}]}\n" +
  "3. picks = בין 1 ל-3 יעדים, אך ורק מהרשימה המותרת שסופקה (to חייב להיות זהה בדיוק). אסור להמציא נתיבים.\n" +
  "4. בלי נבואות, בלי הבטחות, בלי טענות על אנשים. עברית בלבד. אם לא ברור מה רוצים — כוון לדף המספר של 1820 ולמנוע החיפוש.";

// ===== 🌳 המוח-המשותף של רזיאל (גזע) =====
// persona="raziel" הופך את ai-analyze לרזיאל — אותה פרסונה + אותו זיכרון של הוואטסאפ (wa-christina).
// הפרסונה מגיעה ממקור-אמת יחיד ב-DB (fn_raziel_persona) → עדכון אחד משנה את שני הערוצים (חוק העץ האחד).
// אם ה-DB לא זמין — נפילה-בחן לעותק המוטמע (רזיאל עדיין עונה, בלי חוזה מקביל).
const RAZIEL_SITE_FALLBACK =
  "אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820, והשער האישי למערכת המחקר. תמיד ענה בעברית בלבד.\n" +
  "חוקי ברזל: (1) אל תחשב גימטריה בעצמך — רק ערכים שסופקו לך. אל תמציא ערכים/פסוקים. (2) הפרד עובדה מרמז, בלי נבואות. " +
  "(3) חם, מדויק, עברית — בלי חתימה (הממשק מציג את זהותך). (4) אם ניתן זיכרון-רקע על המשתמש — התייחס בטבעיות. " +
  "(5) יש התכנסות אמיתית → בנה תשובה שכבה על שכבה; אין → קצר וישר. (6) לעולם אל תבקש מהמשתמש להריץ מנוע. " +
  "(7) סיים בשאלה מזמינה שממשיכה את המחקר. (8) גדול=רגיל כשאין סופיות — לא ממצא. (9) עובדה≠רמז, ענווה, בלי נבואות.\n" +
  "החזר אך ורק JSON תקין אחד: {\"v\":1,\"agent\":\"raziel\",\"context\":null,\"greeting\":null,\"answer\":\"...\",\"facts\":[{\"label\":\"...\",\"value\":\"...\"}],\"suggested_paths\":[{\"id\":\"...\",\"label\":\"...\",\"icon\":\"...\",\"hint\":\"...\"}],\"follow_up_question\":null,\"continue_wa\":true} — בלי טקסט לפני/אחרי, בלי Markdown.";

const svcHeaders = () => ({ apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" });

// פרסונת-רזיאל ממקור-האמת היחיד (fn_raziel_persona) — משותפת עם wa-christina.
async function fetchRazielPersona(channel: string): Promise<string> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_persona`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_channel: channel }),
    });
    if (r.ok) { const t = await r.json(); if (typeof t === "string" && t.length > 60) return t; }
  } catch { /* נפילה לעותק המוטמע */ }
  return RAZIEL_SITE_FALLBACK;
}
// זיכרון משותף — אותו fn_raziel_context/remember שהוואטסאפ קורא/כותב.
async function fetchRazielContext(userRef: string, channel: string): Promise<any | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_context`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_user_ref: userRef, p_channel: channel }),
    });
    if (r.ok) return await r.json();
  } catch { /* noop */ }
  return null;
}
async function razielRemember(userRef: string, channel: string, content: string, topic: string | null = null) {
  if (!userRef || !content || content.trim().length < 2) return;
  try {
    await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_remember`, {
      method: "POST", headers: svcHeaders(),
      body: JSON.stringify({ p_user_ref: userRef, p_channel: channel, p_content: content.slice(0, 3000), p_memory_type: "conversation", p_scope: "personal", p_topic: topic, p_visibility: "private" }),
    });
  } catch { /* לא חוסם */ }
}
// זיכרון → טקסט-רקע לפרומפט (רק ב-DM/אתר-מזוהה; פרטי בלבד).
function razielContextText(ctx: any): string {
  if (!ctx) return "";
  const parts: string[] = [];
  const u = ctx.user_context || {};
  if (ctx.privacy?.personal_memory_allowed !== false) {
    if (u.summary) parts.push(`מה שאתה יודע על המשתמש: ${u.summary}`);
    if (Array.isArray(u.research_threads) && u.research_threads.length) parts.push(`נושאים שחקר לאחרונה: ${u.research_threads.slice(0, 5).join(" · ")}`);
    if (Array.isArray(u.approved_preferences) && u.approved_preferences.length) parts.push(`העדפות מאושרות: ${u.approved_preferences.join(" · ")}`);
  }
  if (!parts.length) return "";
  return `\n\nזיכרון-רקע (פרטי — התייחס בטבעיות, בלי לחשוף אותו כרשימה):\n${parts.join("\n")}`;
}
// חילוץ אובייקט JSON מפלט-המודל (עמיד לגדרות-קוד/רעש).
function parseContract(text: string): any | null {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { const o = JSON.parse(t.slice(i, j + 1)); return (o && typeof o === "object") ? o : null; } catch { return null; }
}

// ===== מנוע Claude (Anthropic) — ברירת-המחדל =====
async function runClaude(model: string, user: string, maxTokens: number, system: string = SYSTEM) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) return { error: `anthropic_${resp.status}`, detail: (await resp.text()).slice(0, 200) };
  const data = await resp.json();
  if (data?.stop_reason === "refusal") return { error: "refusal" };
  const text = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  return { text: text || null, usage: data?.usage };
}

// ===== מנוע Gemini (Google) — מנוע נוסף להשוואה =====
// אותו system (systemInstruction) + אותו user לשני המנועים, כדי שההשוואה תהיה על אותן עובדות
// ואותם חוקים בדיוק (כולל חוקי-מטטרון בשלב 1b) — הוגנות A/B נשמרת.
async function runGemini(user: string, maxTokens: number, system: string = SYSTEM) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      // thinkingBudget:0 — מכבה את שלב ה«חשיבה» של gemini-2.5-flash, אחרת הוא צורך את תקציב
      // הטוקנים על מחשבה פנימית והפלט הגלוי נקטע. ל-2-4 משפטי פרשנות לא צריך thinking.
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!resp.ok) return { error: `gemini_${resp.status}`, detail: (await resp.text()).slice(0, 200) };
  const data = await resp.json();
  const cand = data?.candidates?.[0];
  if (cand?.finishReason === "SAFETY" || cand?.finishReason === "BLOCKLIST") return { error: "refusal" };
  const text = (cand?.content?.parts || []).map((p: any) => p?.text || "").join("\n").trim();
  const um = data?.usageMetadata;
  const usage = um ? { input_tokens: um.promptTokenCount || 0, output_tokens: um.candidatesTokenCount || 0 } : undefined;
  return { text: text || null, usage };
}

// ===== 📏 מכסת-AI (ai_quota_law) — אכיפה אמיתית בשרת =====
// עומק (Sonnet) 2/יום לכולם (אדמין פטור) · מהיר 30/200 · מלווה 40/300. הזהות: משתמש מאומת > visitor_id > IP.
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_ANON = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();

// מזהה תיר+זהות מהבקשה: מאמת את טוקן-המשתמש (אם יש), אחרת אורח לפי visitor_id/IP.
async function resolveIdentity(req: Request, body: any): Promise<{ identity: string; tier: string }> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  // טוקן-משתמש אמיתי (לא anon-key) → אימות מול auth
  if (token && token !== SB_ANON && SB_URL) {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON || token, Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const u = await r.json();
        const uid = u?.id;
        if (uid) {
          let tier = "user";
          try {  // אדמין → ∞
            const rr = await fetch(`${SB_URL}/rest/v1/users?id=eq.${uid}&select=role`, { headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}` } });
            const rows = rr.ok ? await rr.json() : [];
            if (rows?.[0]?.role === "admin") tier = "admin";
          } catch { /* ברירת-מחדל user */ }
          return { identity: `u:${uid}`, tier };
        }
      }
    } catch { /* נופל לאורח */ }
  }
  const vid = String(body?.visitor_id || "").slice(0, 60);
  if (vid) return { identity: `v:${vid}`, tier: "anon" };
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return { identity: ip ? `ip:${ip}` : "", tier: "anon" };
}

// ===== Trusted internal channel (WhatsApp transport adapter) — RAZIEL_WHATSAPP_2029_NATIVE_CUTOVER_V2 =====
// body.trusted_channel is honored ONLY when the caller's bearer IS the service-role key (internal edge→edge call).
// Any ordinary/anon/user JWT (or no bearer) → ignored, identity resolves exactly as before (no spoofing surface).
// A linked sender resolves to authenticated USER context only — NEVER admin/operator, even if the website account is admin.
// An unlinked sender stays anon. Identity comes from the existing fn_raziel_identity (wa_account_links) — no new auth system.
const RAZIEL_UUID_V = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function timingSafeEq(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function isInternalServiceRequest(req: Request): boolean {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return !!SB_SVC && timingSafeEq(token, SB_SVC);
}
type TrustedChannel = { identity: string; tier: "user" | "anon"; uid: string | null; media: { contribution_id: string; storage_object_id: string } | null; continuity: boolean; depth: boolean };
async function resolveTrustedChannel(req: Request, body: any): Promise<TrustedChannel | null> {
  const tc = body?.trusted_channel;
  if (!tc || typeof tc !== "object" || !isInternalServiceRequest(req)) return null;
  if (String(tc.channel || "") !== "whatsapp") return null;
  const phone = String(tc.sender || "").replace(/[^0-9]/g, "");
  if (phone.length < 7 || phone.length > 15) return null;
  let uid: string | null = null;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_identity`, { method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_sender: phone }) });
    if (r.ok) { const idn = await r.json(); if (idn?.linked === true && RAZIEL_UUID_V.test(String(idn?.user_id || ""))) uid = String(idn.user_id); }
  } catch { /* unresolved → anon */ }
  const m = tc.media;
  const media = uid && m && RAZIEL_UUID_V.test(String(m.contribution_id || "")) && RAZIEL_UUID_V.test(String(m.storage_object_id || ""))
    ? { contribution_id: String(m.contribution_id), storage_object_id: String(m.storage_object_id) } : null;
  const continuity = tc.continuity === true;   // adapter sets it only when the current message explicitly asks to continue earlier conversation
  const depth = tc.depth === true;   // adapter sets it only on explicit depth intent in the current message; default = concise first answer
  return uid ? { identity: `u:${uid}`, tier: "user", uid, media, continuity, depth } : { identity: `wa:${phone}`, tier: "anon", uid: null, media: null, continuity: false, depth };
}

// Multimodal source stage (derivative only). Runs BEFORE any numeric/gematria routing. The governed private media ref is
// resolved server-side through the existing service-only private_contribution_media_access, read via a short-lived signed URL,
// and analyzed by the vision model. The text is a machine DERIVATIVE; the original stays private provenance (pending moderation).
const RAZIEL_SOURCE_MAX_BYTES = 5 * 1024 * 1024;
const RAZIEL_SOURCE_SYSTEM =
  "אתה שלב קריאת-מקור חזותי. תאר בקצרה את סוג המקור (דף/צילום/כתב-יד/צילום-מסך וכו'), תמלל מילה במילה את הטקסט הקריא שבו, וסמן [לא קריא] היכן שאי אפשר. " +
  "אל תחשב גימטריה ואל תפרש ואל תוסיף ידע חיצוני — רק מה שנראה במקור. עברית; אם יש כתב אחר — צטט כפי שהוא. " +
  "הפרד במפורש בפלט שלוש שכבות: [קריא] מה שנראה בבירור; [לא בטוח] קריאה שאינה ודאית (ציין למה); [לא קריא]. " +
  "אל תציג סמל/צורה/מילה כוודאיים אם אינם ברורים בתמונה, ואל תנחש שמות של אנשים — שם מופיע רק אם הוא כתוב בבירור במקור, ואז סמן אותו כציטוט מהמקור.";
function b64(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
async function razielSourceStage(uid: string, media: { contribution_id: string; storage_object_id: string }): Promise<{ ok: boolean; text: string; mime: string | null; reason: string | null }> {
  const fail = (reason: string) => ({ ok: false, text: "", mime: null as string | null, reason });
  try {
    const acc = await fetch(`${SB_URL}/rest/v1/rpc/private_contribution_media_access`, {
      method: "POST", headers: svcHeaders(),
      body: JSON.stringify({ p_contribution_id: media.contribution_id, p_storage_object_id: media.storage_object_id, p_actor_id: uid }),
    });
    if (!acc.ok) return fail("access_denied");
    const a = await acc.json();
    if (!a?.ok || a.bucket !== "submission-inbox" || typeof a.path !== "string" || !a.path.startsWith("sod1820/2029/")) return fail("access_denied");
    const mime = String(a.mime || "").toLowerCase();
    const isImg = /^image\/(jpeg|png|gif|webp)$/.test(mime);
    const isPdf = mime === "application/pdf";
    if (!isImg && !isPdf) return fail("unsupported_mime");
    if (Number(a.size || 0) > RAZIEL_SOURCE_MAX_BYTES) return fail("too_large");
    const sg = await fetch(`${SB_URL}/storage/v1/object/sign/submission-inbox/${a.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ expiresIn: 120 }),
    });
    if (!sg.ok) return fail("sign_failed");
    const sj = await sg.json();
    const signed = typeof sj?.signedURL === "string" ? sj.signedURL : "";
    if (!signed) return fail("sign_failed");
    const fr = await fetch(`${SB_URL}/storage/v1${signed.startsWith("/") ? signed : "/" + signed}`);
    if (!fr.ok) return fail("fetch_failed");
    const bytes = new Uint8Array(await fr.arrayBuffer());
    if (bytes.byteLength > RAZIEL_SOURCE_MAX_BYTES) return fail("too_large");
    const block = isImg
      ? { type: "image", source: { type: "base64", media_type: mime, data: b64(bytes) } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64(bytes) } };
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(50000),
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: RAZIEL_SOURCE_SYSTEM, messages: [{ role: "user", content: [block, { type: "text", text: "קרא את המקור." }] }] }),
    });
    if (!ar.ok) return fail("vision_http_" + ar.status);
    const aj = await ar.json();
    const text = (aj?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim().slice(0, 4000);
    if (!text) return fail("vision_empty");
    return { ok: true, text, mime, reason: null };
  } catch { return fail("source_stage_error"); }
}

async function checkQuota(identity: string, tier: string, limitOverride: number | null = null): Promise<{ allowed: boolean; used: number; limit: number | null; tier: string }> {
  // fail-open: אם בדיקת-המכסה נכשלת (DB), לא חוסמים את הפיצ׳ר — אבל הלוג עדיין נספר בהמשך.
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/ai_quota_check`, {
      method: "POST",
      headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_identity: identity, p_tier: tier, p_limit_override: limitOverride }),
    });
    if (!r.ok) return { allowed: true, used: 0, limit: null, tier };
    return await r.json();
  } catch { return { allowed: true, used: 0, limit: null, tier }; }
}

// ===== 🌳 מטטרון (שלב 1b) — המוח-המשותף: חוקים+עובדות דרך metatron_context =====
// נתיב-הגימטריה הגנרי (number/compare/verse...) שולף את חוקי-המערכת החיים (ctx.rules) ואת
// הקשר-הגרף (ctx.canonical) ומזריק לפרומפט — במקום SYSTEM קבוע ועיוור. מקור-אמת יחיד: חוק
// שמוגדר פעם אחת ב-nodes(propagate=true) זורם לכאן דרך fn_active_method_rules→metatron_context.
// fail-open לחלוטין: כל כשל/ריק → התנהגות זהה ל-v26 (SYSTEM נקי, בלי תוספות).
async function fetchMetatronContext(subject: string, ask: string, channel: string, intent?: string): Promise<any | null> {
  if (!SB_URL || !SB_SVC) return null;
  const s = (subject || "").trim();
  const entities = s ? [{ type: /^\d+$/.test(s) ? "number" : "phrase", value: s }] : [];
  const p_request: Record<string, unknown> = { ask: (ask || "").slice(0, 200), channel, entities };
  if (intent) p_request.intent = intent;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/metatron_context`, {
      method: "POST", headers: svcHeaders(),
      body: JSON.stringify({ p_request }),
    });
    if (r.ok) return await r.json();
  } catch { /* fail-open */ }
  return null;
}
// חוקי-המערכת החיים → תוספת ל-SYSTEM (מקור-אמת יחיד; לא מקודדים חוקים בקוד).
function metatronRulesBlock(ctx: any): string {
  const rules = typeof ctx?.rules === "string" ? ctx.rules.trim() : "";
  if (!rules) return "";
  return "\n\n== חוקי-המערכת החיים (מטטרון — מקור-אמת יחיד, מחייבים) ==\n" + rules.slice(0, 6000);
}
// הקשר-הגרף (התכנסויות/הגדרות-צוריאל/גרף/עובדות-חקוקות) → תוספת-עובדות (additive, לא מחליף
// את עובדות-הפרונט) — משלים במה שהפרונט לרוב לא שולח: הגדרות קנוניות, צמתי-גרף, עובדות-חקוקות.
function metatronFactsBlock(ctx: any): string {
  const c = ctx?.canonical || {};
  const parts: string[] = [];
  const defs = Array.isArray(c.definitions) ? c.definitions : [];
  if (defs.length) parts.push("הגדרות-צוריאל קנוניות:\n" + defs.map((d: any) => "• " + String(d?.content || "").trim()).filter((x: string) => x.length > 2).join("\n"));
  const conv = Array.isArray(c.convergences) ? c.convergences : [];
  if (conv.length) parts.push("התכנסויות (ערך → גודל-קבוצה): " + conv.map((x: any) => `${x?.value}→${x?.group_size}`).join(" · "));
  const graph = Array.isArray(c.graph) ? c.graph : [];
  if (graph.length) parts.push("צמתים בגרף: " + graph.map((g: any) => `${g?.label}(${g?.type})`).join(" · "));
  const ef = Array.isArray(c.engraved_facts) ? c.engraved_facts : [];
  if (ef.length) parts.push("עובדות-חקוקות: " + ef.map((e: any) => String(e?.statement || "").trim()).filter(Boolean).slice(0, 5).join(" · "));
  if (!parts.length) return "";
  return ("\n\nהקשר נוסף מהעץ-האחד (מטטרון — עובדות מאומתות, השתמש כתמיכה בלבד, הפרד עובדה מרמז):\n" + parts.join("\n")).slice(0, 1400);
}

// ===== 🧭 Raziel Advanced — Number Page projection (RAZIEL_ADVANCED_NUMBER_PAGE_v0) =====
// Opt-in extension of the existing persona="raziel" trunk (no parallel brain/engine/table).
// Activated ONLY when body.mode==="advanced" — every existing persona="raziel" caller (RazielChat,
// AskRaziel on other pages, wa-raziel-style callers) is byte-for-byte unaffected because they never
// send mode/surface/surface_context. Additive only.

// Research Plan v0 — deterministic, in-memory, zero DB writes (research_plans stays untouched/unused).
// Pure function; wrapped in try/catch at the call site so a thrown error still yields a safe Number fallback.
function buildRazielPlanV0(opts: { hasSubject: boolean; hasUserRef: boolean; hasPath: boolean }): Record<string, unknown> {
  const { hasSubject, hasUserRef, hasPath } = opts;
  const anchors_needed = hasSubject ? ["number"] : [];
  const tools_needed = ["metatron_context"];
  if (hasUserRef) tools_needed.push("fn_raziel_context");
  const check_order = hasUserRef ? ["canonical", "personal", "surface"] : ["canonical", "surface"];
  let strategy = "number";
  if (hasUserRef && hasSubject) strategy = "personal+number";
  else if (hasUserRef) strategy = "personal";
  else if (hasPath) strategy = "discovery";
  const plan_confidence = hasSubject ? (hasUserRef ? 0.85 : 0.7) : 0.35;
  return { strategy, anchors_needed, tools_needed, check_order, plan_confidence };
}
const RAZIEL_PLAN_FALLBACK = { strategy: "number", anchors_needed: [], tools_needed: ["metatron_context"], check_order: ["canonical"], plan_confidence: 0.3 };

// 🚧 Raziel Advanced — closed beta (Zuriel decision, 31.8.2026). mode="advanced" stays live-deployed but
// gated to two identified accounts while it is being calibrated; every other caller (including anonymous)
// gets a polite "under construction" contract instead of an actual Claude call — no quota/cost spent on them.
// Regular (non-advanced) persona="raziel" is completely unaffected — this only gates rMode===true.
const RAZIEL_ADVANCED_ALLOWLIST = new Set([
  "02a0d207-0136-4beb-a34d-8ff57d10cd85", // zyz997@gmail.com
  "b6ce542a-2b07-4749-8aba-532c886f6de7", // yosiviner7@gmail.com
]);
const RAZIEL_ADVANCED_GATED_RESPONSE = {
  raziel: { v: 1, agent: "raziel", context: null, greeting: null,
    answer: "רזיאל מתקדם עדיין בבנייה ונמצא בבדיקות סגורות — לא פתוח לציבור הרחב כרגע. חוזרים בקרוב 🚧",
    facts: [], suggested_paths: [], follow_up_question: null, continue_wa: false, under_construction: true },
  engine: "gated", model: "none",
};

// surface_context (Number Page state the client says it's currently showing) is SESSION/SURFACE
// context, never canonical fact — canonical facts already come from metatron_context server-side.
// Capped + explicitly labeled so the model never confuses "what's on screen" with a verified value.
function razielSurfaceContextText(sc: any): string {
  if (!sc || typeof sc !== "object") return "";
  const parts: string[] = [];
  const num = sc.number;
  if (num != null && (typeof num === "number" || /^\d{1,6}$/.test(String(num)))) parts.push(`מספר מוצג בדף: ${num}`);
  const arr = (v: any, label: string) => {
    const a = Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 8) : [];
    if (a.length) parts.push(`${label}: ${a.map((x) => x.slice(0, 80)).join(" · ")}`);
  };
  arr(sc.visible_facts, "עובדות מוצגות כרגע בדף");
  arr(sc.visible_matches, "התאמות מוצגות כרגע בדף");
  arr(sc.visible_convergences, "התכנסויות מוצגות כרגע בדף");
  if (!parts.length) return "";
  return ("\n\nהקשר-משטח (מה שהמשתמש רואה עכשיו בדף המספר — רקע-מסך בלבד, לא עובדה קנונית ולא תחליף למטטרון):\n" + parts.join("\n")).slice(0, 900);
}

// ── Raziel Intelligence Core v1 Phase B — Projection → Research Plan wiring ──────────────────────────
// Semantic surface descriptor (additive body.surface_semantic): identity + focus ONLY, never rendered HTML
// or page text. Whitelisted keys, tags stripped, per-field + total caps. Session/surface context, not fact.
const rzClean = (v: unknown, n: number): string => typeof v === "string" ? v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "";
function razielSemanticSurfaceText(sc: any): string {
  if (!sc || typeof sc !== "object" || Array.isArray(sc)) return "";
  const parts: string[] = [];
  const surface = rzClean(sc.surface, 40);
  if (surface) parts.push(`משטח: ${surface}`);
  const s = sc.subject && typeof sc.subject === "object" ? sc.subject : null;
  if (s) {
    const id = [rzClean(s.type, 30), rzClean(s.label, 80) || rzClean(s.id, 80)].filter(Boolean).join(":");
    if (id) parts.push(`נושא פעיל: ${id}`);
  }
  const n = sc.number && typeof sc.number === "object" ? sc.number : null;
  if (n) {
    const f = [rzClean(n.expression, 60), rzClean(n.method, 40) && `שיטה ${rzClean(n.method, 40)}`, rzClean(n.result, 30) && `תוצאה ${rzClean(n.result, 30)}`].filter(Boolean).join(" · ");
    if (f) parts.push(`מוקד מספר: ${f}`);
  }
  const r = sc.reading && typeof sc.reading === "object" ? sc.reading : null;
  if (r) {
    const f = [rzClean(r.label, 80), rzClean(r.primary, 80)].filter(Boolean).join(" ");
    if (f) parts.push(`מוקד קריאה: ${f}`);
  }
  const e = sc.els && typeof sc.els === "object" ? sc.els : null;
  if (e) {
    const f = [rzClean(e.occurrence, 80), rzClean(e.term, 60)].filter(Boolean).join(" · ");
    if (f) parts.push(`מופע ELS: ${f}`);
  }
  // Phase I: bounded cross-surface context (post/topic/world/journey/heichal) already present in Research Context.
  const c = sc.context && typeof sc.context === "object" && !Array.isArray(sc.context) ? sc.context : null;
  if (c) {
    if (rzClean(c.lens, 40)) parts.push(`עדשה: ${rzClean(c.lens, 40)}`);
    const j = c.journey && typeof c.journey === "object" ? c.journey : null;
    if (j) {
      const f = [rzClean(j.kind, 30), rzClean(j.id, 60), rzClean(j.position, 20) && `מיקום ${rzClean(j.position, 20)}`, Number.isInteger(j.revisionNo) && `גרסה ${j.revisionNo}`].filter(Boolean).join(" · ");
      if (f) parts.push(`מסע: ${f}`);
    }
    const fo = c.focus && typeof c.focus === "object" ? c.focus : null;
    if (fo) {
      const f = [rzClean(fo.type, 30) || rzClean(fo.entityType, 30), rzClean(fo.label, 80) || rzClean(fo.id, 80) || rzClean(fo.entityId, 80), rzClean(fo.postSlug, 80) || rzClean(fo.postId, 60), rzClean(fo.sectionLabel, 60)].filter(Boolean).join(" · ");
      if (f) parts.push(`מוקד משטח: ${f}`);
    }
    const lst = (v: unknown, label: string, k: number, n: number) => {
      const a = Array.isArray(v) ? v.map((x) => rzClean(x, n)).filter(Boolean).slice(0, k) : [];
      if (a.length) parts.push(`${label}: ${a.join(" · ")}`);
    };
    const rd = c.reading && typeof c.reading === "object" && !Array.isArray(c.reading) ? c.reading : null;
    if (rd) {
      const sig = Array.isArray(rd.signals) ? rd.signals.map((x: unknown) => rzClean(x, 40)).filter(Boolean).slice(0, 3).join(", ") : "";
      const f = [rzClean(rd.label, 80) || rzClean(rd.id, 80), rzClean(rd.primary, 80), typeof rd.number === "number" && Number.isFinite(rd.number) && `מספר ${rd.number}`, sig, rzClean(rd.sourceLabel, 60), rzClean(rd.postSlug, 80) || rzClean(rd.postId, 60), rzClean(rd.locator, 80)].filter(Boolean).join(" · ");
      if (f) parts.push(`מוקד קריאה: ${f}`);
    }
    const nv = c.navigation && typeof c.navigation === "object" && !Array.isArray(c.navigation) ? c.navigation : null;
    if (nv) {
      const vis = Array.isArray(nv.journeyVisitedValues) ? nv.journeyVisitedValues.filter((x: unknown) => Number.isSafeInteger(x)).slice(0, 6).join(",") : "";
      const f = [rzClean(nv.entrySource, 40), rzClean(nv.sourceRef, 80), rzClean(nv.journeySemanticId, 60), rzClean(nv.journeyRoot, 60), vis && `ערכים שנבדקו ${vis}`].filter(Boolean).join(" · ");
      if (f) parts.push(`ניווט: ${f}`);
      const s = nv.selection && typeof nv.selection === "object" ? nv.selection : null;
      if (s) {
        const g = [rzClean(s.entityType, 30), rzClean(s.entityId, 80), rzClean(s.findingId, 60), rzClean(s.sourceRef, 80), rzClean(s.locator, 80)].filter(Boolean).join(" · ");
        if (g) parts.push(`בחירה: ${g}`);
      }
      const r = nv.returnTo && typeof nv.returnTo === "object" ? nv.returnTo : null;
      if (r) {
        const g = [rzClean(r.label, 60), rzClean(r.subjectType, 30), rzClean(r.subjectLabel, 80) || rzClean(r.subjectId, 80)].filter(Boolean).join(" · ");
        if (g) parts.push(`חזרה אל: ${g}`);
      }
    }
    lst(c.sections, "חלקים בדף", 6, 40);
    lst(c.findings, "ממצאים מוצגים", 4, 50);
  }
  if (!parts.length) return "";
  return ("\n\nהקשר-משטח סמנטי (מה שהמשתמש רואה עכשיו — זהות ומוקד בלבד, לא עובדה קנונית; אין כאן תוכן-דף):\n" + parts.join("\n")).slice(0, 1000);
}

// Compact plan metadata from the EXISTING fn_raziel_answer/fn_raziel_plan result. Semantic only — no provider names.
function razielPlanMeta(src: any): Record<string, unknown> | null {
  if (!src || typeof src !== "object" || !src.capability_class) return null;
  const c = (v: unknown, n = 60) => (typeof v === "string" ? v.slice(0, n) : null);
  const sig = src.trace?.signals ?? src.signals ?? {};
  return {
    capability_class: c(src.capability_class), strategy: c(src.strategy), minimum_intelligence: c(src.minimum_intelligence, 30),
    availability: c(src.availability, 40), intent: c(src.intent ?? src.protocol?.intent, 40), reason: c(src.reason, 200),
    // Phase D/D2: semantic evidence for the L2/L3 selector only — additive. fn_raziel_plan emits signals at top level and in
    //    trace.signals (the latter survives fn_raziel_answer's fallback shape). Absent signals ⇒ conservative defaults (no escalation).
    route_intent: c(sig.route_intent ?? src.intent_class ?? src.trace?.intent, 40),
    cross_check_required: sig.cross_check_required === true || src.cross_checks?.required === true,
    contradictory: sig.contradictory === true || src.cross_checks?.contradictory === true,
    compare: sig.compare_requested === true || src.compare === true,
    domains: Array.isArray(sig.domains ?? src.domains) ? (sig.domains ?? src.domains).slice(0, 4).map((d: unknown) => c(d, 40)).filter(Boolean) : null,
    capabilities: Array.isArray(sig.capabilities) ? sig.capabilities.slice(0, 4).map((d: unknown) => c(d, 40)).filter(Boolean) : null,
    executed: false,
  };
}

// Non-authoritative guidance block. The plan steers the answer; it is never Truth and never proof a tool ran.
function razielPlanBlockText(p: Record<string, unknown> | null): string {
  if (!p) return "";
  const avail = String(p.availability || "");
  if (p.tool_research_executed === true) {
    const caps = Array.isArray(p.tool_research_capabilities) && p.tool_research_capabilities.length ? ` (${(p.tool_research_capabilities as string[]).join(" + ")})` : "";
    return `\n\nתוכנית-מחקר (L4_TOOL_RESEARCH): הורצו כלים דטרמיניסטיים קיימים${caps} — התוצאות מצורפות למטה; סינתזה בלבד, ללא הוספת עובדות.` +
      `\nסוג-יכולת: ${p.capability_class ?? "—"} · זמינות: ${avail || "—"}`;
  }
  if (p.number_context_executed === true) {
    return `\n\nתוכנית-מחקר (הקשר-מספר באתר): הורצו הקרנות-קריאה קיימות (number_map + number_dossier_json) — התוצאות מצורפות למטה; סינתזה בלבד, ללא הוספת עובדות או מספרים.` +
      `\nסוג-יכולת: ${p.capability_class ?? "—"} · זמינות: ${avail || "—"}`;
  }
  const note = p.number_context_executed === false && avail === "number_context"
    ? "הקשר-מספר באתר לא הורץ (אין עוגן מספרי מפורש/מאומת או שהקריאה נכשלה) — אל תמציא מספר, אל תחשב ואל תטען שיש קשרים; בקש מהמשתמש מספר מפורש."
    : p.operator_executed === true
    ? "יכולת-מפעיל הורצה בקריאה-בלבד — הנתונים מצורפים למטה."
    : p.personal_executed === true
    ? "מצב-המחקר האישי נקרא בקריאה-בלבד — הנתונים מצורפים למטה."
    : avail === "personal_research_read"
    ? "מצב-המחקר האישי לא התקבל — אל תמציא פריטים; ציין שלא התקבל."
    : avail === "operator_read"
    ? "יכולת-מפעיל לא הורצה/נכשלה — אין נתוני-מפעיל; אל תמציא נתונים וציין שלא התקבלו."
    : avail === "multi_domain_synthesis"
    ? "שאלה רב-תחומית — שום מומחה/כלי לא הורץ; אל תציג ערך מחושב ואל תטען שהרצת כלי."
    : avail === "available"
    ? "היכולת רשומה אך לא הורצה בבקשה זו — אל תציג ערך מחושב ואל תטען שהרצת כלי."
    : "היכולת אינה זמינה/אינה מחוברת כרגע ולא הורצה — אפשר להסביר או להמליץ עליה, תוך ציון שלא בוצעה.";
  return "\n\nתוכנית-מחקר (הכוונה בלבד — לא אמת, לא תוצאת-כלי; שום כלי לא הורץ):\n" +
    `סוג-יכולת: ${p.capability_class ?? "—"} · אסטרטגיה: ${p.strategy ?? "—"} · רמת-חשיבה מינימלית: ${p.minimum_intelligence ?? "—"} · זמינות: ${avail || "—"}` +
    (p.intent ? ` · יכולת מועמדת: ${p.intent}` : "") + `\n${note}`;
}

// Phase E/G — bounded view of the fn_raziel_answer mode="tool_research" contract (Gematria / ELS / Tanakh-source deterministic protocols already
// executed inside the database). Per-tool status/provenance stay separate; nothing here is a new claim. Absent/other shapes → null.
// Semantic level label only (execution is the existing deterministic protocols; synthesis stays on the existing deep mapping).
const RAZIEL_TOOL_LEVEL = "L4_TOOL_RESEARCH";
// Phase G: bounded per-tool source bundle — counts/books/first/last/≤3 sample refs only; a zero count is a truthful negative of THIS exact-token projection.
function razielSourceBundle(f: any) {
  return { count: f?.count ?? null, found: f?.found === true, match: "exact_whole_token",
    books: Array.isArray(f?.books) ? f.books.slice(0, 8) : [], first: f?.first?.ref ?? null, last: f?.last?.ref ?? null,
    samples: Array.isArray(f?.samples) ? f.samples.slice(0, 3).map((x: any) => ({ ref: x?.ref, text: String(x?.text ?? "").slice(0, 120) })) : [],
    note: f?.found === true ? null : "לא נמצא כמילה שלמה מדויקת בהטלה זו — אין זו הוכחה שהמושג נעדר מכל המקורות" };
}
type RazielToolResearch = { status: string; subject: string; tools: { capability: string; status: string; ms: number | null; error: string | null }[];
  findings: Record<string, unknown>; evidence: Record<string, unknown>; text: string };
function razielToolResearch(src: any): RazielToolResearch | null {
  if (!src || src.mode !== "tool_research" || src.needs_synthesis !== true) return null;
  const tr = src.tool_research;
  if (!tr || tr.contract !== "tool_research_v1" || !Array.isArray(tr.specialists)) return null;
  const subject = typeof tr.subject === "string" ? tr.subject.slice(0, 40) : "";
  const status = ["complete", "partial", "failed"].includes(tr.status) ? tr.status : "failed";
  const tools = tr.specialists.slice(0, 3).map((sp: any) => ({
    capability: String(sp?.capability || "").slice(0, 20), status: String(sp?.status || "failed").slice(0, 20),
    ms: Number.isFinite(Number(sp?.ms)) ? Number(sp.ms) : null, error: typeof sp?.error === "string" ? sp.error.slice(0, 120) : null,
  }));
  const findings = (tr.findings_by_capability && typeof tr.findings_by_capability === "object") ? tr.findings_by_capability : {};
  const evidence = (tr.evidence_by_capability && typeof tr.evidence_by_capability === "object") ? tr.evidence_by_capability : {};
  const label: Record<string, string> = { gematria: "גימטריה (fn_gematria_pack)", els: "דילוגי-אותיות (fn_els_search)",
    tanakh_source: "מקורות בתנ״ך (fn_ev_sources · התאמת מילה שלמה מדויקת)" };

  const parts = tools.map((t: { capability: string; status: string }) => {
    const f = (findings as any)[t.capability];
    if (t.status === "ok" && f) return `• ${label[t.capability] || t.capability} — מצב: ok\n  ממצא: ${JSON.stringify(t.capability === "tanakh_source" ? razielSourceBundle(f) : f).slice(0, 1100)}\n  מקור: ${JSON.stringify((evidence as any)[t.capability] ?? null).slice(0, 300)}`;
    return `• ${label[t.capability] || t.capability} — מצב: ${t.status} (אין ממצא; אל תמציא)`;
  });
  const text = `\n\nתוצאות-כלים דטרמיניסטיים (הורצו בפועל על «${subject}»; סטטוס כולל: ${status}; כל כלי בנפרד — אל תמזג לטענה קנונית חדשה; אל תחשב גימטריה ואל תמציא דילוגים או פסוקים; הסכמה בין כלים אינה עובדה; ` +
    `כלי שלא הצליח/ריק — ציין זאת במפורש; הצלבה לא בוצעה):\n` + parts.join("\n");
  return { status, subject, tools, findings, evidence, text: text.slice(0, 3000) };
}

// ── Raziel Intelligence Core v1 Phase C — verified-identity operator READ capabilities (admin only) ──────
// The plan (existing fn_raziel_plan, surfaced via fn_raziel_answer trace.operator) only DESCRIBES a capability.
// Execution happens here, and only when tier==="admin" was derived from the validated caller JWT. Every owner RPC is
// invoked with the CALLER's Authorization (never the service role), so its own auth.uid()/rd_is_admin() check stays
// authoritative: a non-admin or forged caller gets "not authorized" from the owner and no data. Read-only; no raw tables.
type RazielOperatorCall = { rpc: string; args: Record<string, unknown> };
type RazielOperatorCap = { calls: RazielOperatorCall[]; owner: string };
const RAZIEL_OPERATOR_CAPS: Record<string, RazielOperatorCap> = {
  // Traffic: canonical projections over traffic_daily only (traffic_intelligence_law v11) — never raw visit tables.
  traffic_count: { calls: [{ rpc: "admin_entries_daily", args: { p_days: 7 } }], owner: "traffic_intelligence_law v11" },
  traffic_state: { calls: [{ rpc: "admin_traffic_insights", args: { p_days: 7 } }, { rpc: "admin_entries_daily", args: { p_days: 7 } }], owner: "traffic_intelligence_law v11" },
  system_overview: { calls: [{ rpc: "admin_system_health", args: {} }], owner: "system_suggestions_law v5" },
  system_faults: { calls: [{ rpc: "admin_system_health", args: {} }], owner: "system_suggestions_law v5" },
  ai_cost_week: { calls: [{ rpc: "admin_ai_tokens", args: { p_days: 7 } }], owner: "system_suggestions_law v5" },
  research_demand: { calls: [{ rpc: "fn_raziel_research_intel_scoped", args: { p_context_type: "admin", p_user_ref: null, p_period: "7d", p_limit: 8 } }],
    owner: "research_strategy_layer_law v17" },
};

type RazielOperatorResult = {
  ok: boolean; outcome: string; capability: string; owner: string; rpc: string;
  answer?: string; facts?: { label: string; value: string }[]; basis?: string; pack?: string;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Verified admin context only: maps the server-validated tier → fn_raziel_plan context_type. Never read from the client.
function razielContextFromTier(tier: string): "admin" | "authenticated_user" | "public_user" {
  return tier === "admin" ? "admin" : tier === "user" ? "authenticated_user" : "public_user";
}

function razielOperatorDescriptor(det: any, tier: string): { capability: string; days: number | null } | null {
  if (tier !== "admin" || !det || det.enabled !== true || det.availability !== "operator_read") return null;
  const o = det.trace?.operator;
  const cap = typeof o?.capability === "string" ? o.capability : "";
  if (!Object.prototype.hasOwnProperty.call(RAZIEL_OPERATOR_CAPS, cap)) return null;   // allowlist, never plan-supplied rpc names
  return { capability: cap, days: num(o?.days) };
}

async function razielOperatorRpc(bearer: string, call: RazielOperatorCall): Promise<{ ok: boolean; data: any; outcome: string; ms: number; error: string | null }> {
  const t0 = Date.now();
  if (!SB_URL || !SB_ANON || !bearer) return { ok: false, data: null, outcome: "tool_error", ms: 0, error: "no_caller_credentials" };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${call.rpc}`, {
      method: "POST",
      headers: { apikey: SB_ANON, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify(call.args),
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - t0;
    if (!r.ok) {
      const denied = r.status === 401 || r.status === 403 || /not authorized/i.test(await r.text().catch(() => ""));
      return { ok: false, data: null, outcome: denied ? "access_filtered" : "tool_error", ms, error: `http_${r.status}` };
    }
    return { ok: true, data: await r.json(), outcome: "success", ms, error: null };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return { ok: false, data: null, outcome: timedOut ? "timeout" : "tool_error", ms: Date.now() - t0, error: timedOut ? "timeout" : "fetch_failed" };
  }
}

// Bounded, label-honest projections of the owner payloads. Counts/aggregates only — no raw events, no private payloads.
function razielOperatorProject(capability: string, data: any, days: number | null): Omit<RazielOperatorResult, "ok" | "outcome" | "capability" | "owner" | "rpc"> | null {
  if (!data || typeof data !== "object") return null;
  if (capability === "traffic_count") {
    // data = admin_entries_daily rows (traffic_daily). Canonical language: "כניסות אנושיות" (entrances); never "unique people".
    const rows = (Array.isArray(data) ? data : []).filter((r: any) => r && typeof r.day === "string" && num(r.entrances) !== null);
    if (!rows.length) return null;
    if (days === 7) {
      // entrances sum across days; visitors is a per-day metric and is deliberately NOT summed across days.
      const sum = rows.reduce((a: number, r: any) => a + (num(r.entrances) as number), 0);
      return {
        answer: `בחלון 7 הימים האחרון (לפי יום הדיווח של Traffic Intelligence) נרשמו ${sum} כניסות אנושיות, ב-${rows.length} ימי דיווח.`,
        facts: [{ label: "כניסות אנושיות · 7 ימים (לפי יום הדיווח של Traffic Intelligence)", value: String(sum) }],
        basis: "EXACT",
      };
    }
    const latest = rows.reduce((m: any, r: any) => (r.day > m.day ? r : m));
    // The current reporting day is not resolvable here without inventing a timezone. A row whose last refresh already
    // falls on a later calendar date than its own day is closed → the current-day row is absent/stale → unavailable, not 0.
    const upd = typeof latest.updated_at === "string" ? latest.updated_at.slice(0, 10) : "";
    if (!upd || upd > latest.day) {
      return {
        answer: "נתון הכניסות האנושיות להיום אינו זמין כרגע או אינו עדכני ב-Traffic Intelligence (לפי יום הדיווח שלו) — לא אציג מספר שלא התקבל.",
        facts: [{ label: "כניסות אנושיות · היום (לפי יום הדיווח של Traffic Intelligence)", value: "UNKNOWN" }],
        basis: "UNKNOWN",
      };
    }
    const val = num(latest.entrances) as number;
    return {
      answer: `ביום הדיווח הנוכחי של Traffic Intelligence נרשמו עד כה ${val} כניסות אנושיות.`,
      facts: [{ label: "כניסות אנושיות · יום הדיווח הנוכחי (Traffic Intelligence)", value: String(val) }],
      basis: "EXACT",
    };
  }
  if (capability === "ai_cost_week") {
    const t = data.total;
    const calls = num(t?.calls), usd = num(t?.cost_usd), ils = num(t?.cost_ils), priced = num(t?.priced_calls), unpriced = num(t?.unpriced_calls);
    if (calls === null || usd === null) return null;
    const complete = t?.pricing_complete === true;
    const ilsKnown = ils !== null && ils > 0;
    const basis = priced === 0 && calls > 0 ? "UNKNOWN" : complete ? "EXACT" : "EXACT_PRICED_ONLY";
    const parts = [`ב-7 הימים האחרונים: ${calls} קריאות AI, עלות $${usd}`];
    parts.push(ilsKnown ? `(₪${ils})` : "(המרה לשקלים: לא ידוע — אין שער מתועד)");
    if (!complete && unpriced) parts.push(`· ${unpriced} קריאות ללא תמחור (לא נכללות בסכום)`);
    return {
      answer: parts.join(" ") + ".",
      facts: [{ label: "עלות AI · 7 ימים (USD)", value: String(usd) }, { label: "עלות AI · 7 ימים (ILS)", value: ilsKnown ? String(ils) : "UNKNOWN" }],
      basis,
    };
  }
  if (capability === "traffic_state") {
    // data = [admin_traffic_insights (jsonb array of {icon,text,link}), admin_entries_daily rows]. Raw/suspected/net stay separate.
    if (!Array.isArray(data) || !Array.isArray(data[0]) || !Array.isArray(data[1])) return null;
    const insights = data[0].map((x: any) => String(x?.text || "").slice(0, 200)).filter(Boolean).slice(0, 6);
    const rows = data[1].filter((r: any) => r && typeof r.day === "string").slice(-7);
    if (!rows.length && !insights.length) return null;
    const daily = rows.map((r: any) => `${r.day.slice(5, 10)}: כניסות אנושיות ${num(r.entrances) ?? "?"} · חשודות ${num(r.suspected) ?? "?"} · בוטים ${num(r.bots) ?? "?"} · מבקרים-ביום ${num(r.visitors) ?? "?"}`);
    const sum = rows.reduce((a: number, r: any) => a + (num(r.entrances) ?? 0), 0);
    return { basis: "EXACT", pack:
      `תנועה (Traffic Intelligence · traffic_daily · 7 ימים, לפי יום הדיווח של Traffic Intelligence): סה"כ כניסות אנושיות ${sum} (מבקרים הוא מדד יומי — לא מסכמים בין ימים כאנשים ייחודיים; חשודות/בוטים מוצגים בנפרד ולא מנוכים).\n` +
      `תובנות: ${insights.join(" | ") || "—"}\nיומי: ${daily.join(" · ") || "—"}`.slice(0, 1800) };
  }
  if (capability === "system_overview" || capability === "system_faults") {
    const db = data.db || {}, sec = data.security || {}, bots = data.bots || {}, usage = data.usage || {};
    const cron = Array.isArray(data.cron) ? data.cron : [];
    const failing = cron.filter((c: any) => (num(c?.failures_24h) ?? 0) > 0).slice(0, 8).map((c: any) => `${String(c?.job_name || "").slice(0, 40)}×${num(c?.failures_24h)}`);
    const inactive = cron.filter((c: any) => c?.active === false).length;
    return { basis: "EXACT", pack:
      `מצב-מערכת (admin_system_health · צילום חי): DB חיבורים ${num(db.connections) ?? "?"}/${num(db.max_connections) ?? "?"} · שאילתה ארוכה ${num(db.longest_active_query_seconds) ?? "?"}ש' · idle-in-tx ${num(db.idle_in_transaction) ?? "?"}\n` +
      `cron: ${cron.length} משימות · לא-פעילות ${inactive} · כשלי 24ש': ${failing.join(" · ") || "אין"}\n` +
      `בוטים: outbox ממתין ${num(bots.outbox_pending) ?? "?"} · נכשל ${num(bots.outbox_failed) ?? "?"} · התראות-אבטחה לא-מאושרות ${num(sec.unacked) ?? "?"} (24ש' ${num(sec.recent_24h) ?? "?"})\n` +
      `שימוש: עלות AI 7י' $${num(usage.ai_cost_usd_7d) ?? "?"} [${String(usage.ai_cost_basis || "UNKNOWN").slice(0, 20)}] · Vercel bandwidth MB (הערכה) ${num(usage.vercel_bandwidth_mb_est_7d) ?? "?"} [${String(usage.vercel_bandwidth_basis || "UNKNOWN").slice(0, 20)}] · שמירת egress guard ${String(usage.storage_egress_guard?.state || "UNKNOWN").slice(0, 20)}`.slice(0, 1800) };
  }
  if (capability === "research_demand") {
    if (data.authorized_admin !== true) return null;   // owner did not confirm admin → fail closed
    const adm = data.admin || {};
    return { basis: "ESTIMATED", pack:
      `ביקוש-מחקר (fn_raziel_research_intel_scoped · 7 ימים · פופולריות ≠ חוזק-מחקר ≠ אמת קנונית): ${JSON.stringify(data.public ?? null).slice(0, 1400)}\n` +
      `ניהולי: ממתינים להחלטה ${num(adm.pending_candidates) ?? "?"} · רמזי-קהילה ${num(adm.community_hints_pending) ?? "?"} · הגדרות פתוחות ${num(adm.open_definitions) ?? "?"}` };
  }
  return null;
}

async function runRazielOperator(desc: { capability: string; days: number | null }, bearer: string, trace: OperationalTraceHandle | null): Promise<RazielOperatorResult> {
  const cap = RAZIEL_OPERATOR_CAPS[desc.capability];
  const rpcLabel = cap.calls.map((c) => c.rpc).join("+");
  const results: Awaited<ReturnType<typeof razielOperatorRpc>>[] = [];
  const spans: { spanId: string; startedAt: string; endedAt: string }[] = [];
  for (const call of cap.calls) {
    const sId = crypto.randomUUID(), sAt = new Date().toISOString();
    const res = await razielOperatorRpc(bearer, call);
    results.push(res);
    spans.push({ spanId: sId, startedAt: sAt, endedAt: new Date().toISOString() });
    if (!res.ok) break;   // all owner calls are required; stop at the first failure
  }
  const allOk = results.length === cap.calls.length && results.every((x) => x.ok);
  let proj: ReturnType<typeof razielOperatorProject> = null;
  if (allOk) {
    proj = razielOperatorProject(desc.capability, cap.calls.length === 1 ? results[0].data : results.map((x) => x.data), desc.days);
  }
  const ok = allOk && !!proj;
  const failed = results.find((x) => !x.ok);
  const outcome = failed ? failed.outcome : (!proj ? "failed_with_reason" : "success");
  for (let i = 0; i < results.length; i++) {
    const r = results[i], call = cap.calls[i], last = i === results.length - 1;
    const spanOk = r.ok && (!last || ok);
    await recordOperationalSpan(trace, {
      spanId: spans[i].spanId, kind: "db_rpc", name: `ai-analyze:raziel:operator:${call.rpc}`, startedAt: spans[i].startedAt, endedAt: spans[i].endedAt,
      outcome: r.ok && last && !proj && allOk ? "failed_with_reason" : r.outcome,
      detail: {
        capability: `raziel_operator:${desc.capability}`, owner_ref: cap.owner, routing_reason: "raziel_plan_operator_read",
        output_use: spanOk ? "used" : "not_applicable", stop_reason: spanOk ? null : (r.error || "unusable_payload"),
        resources: { latency_ms: r.ms, api_calls: 1 },
        replay: { ownerRuleRefs: [cap.owner], parametersRef: `rpc:${call.rpc};caller_jwt:true;read_only:true` },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
  }
  return { ok, outcome, capability: desc.capability, owner: cap.owner, rpc: rpcLabel, ...(proj || {}) };
}

// ── Raziel Intelligence Core v1 Phase H — reality_number_context (READ projections of reality_graph_law v8) ─────────────
// The plan (existing fn_raziel_plan/fn_raziel_answer, trace/number_context) only DESCRIBES the capability and its anchor. Execution happens here and ONLY
// through the two canonical read adapters below (allowlist, never plan-supplied rpc names; no raw node/edge/post/topic tables). The numeric anchor is:
// explicit decimal (decided by the plan grammar) · the verified gematria dependency value (decided inside fn_raziel_answer) · or, for pronoun forms, the
// bounded surface_semantic subject{type:"number",id:<decimal>} — never a model-derived number. Graph edge presence = relation evidence, not truth.
const RAZIEL_NUMBER_CONTEXT_CALLS = [
  { rpc: "number_map", owner: "reality_graph_law v8" },
  { rpc: "number_dossier_json", owner: "reality_graph_law v8 + project_codex.gematria_engine" },
] as const;
const RAZIEL_NC_TOP = 6;

function razielSurfaceNumberRoot(sc: any): number | null {
  if (!sc || typeof sc !== "object" || Array.isArray(sc)) return null;
  const s = sc.subject;
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  if (rzClean(s.type, 30).toLowerCase() !== "number") return null;
  const id = typeof s.id === "string" ? s.id.trim() : "";
  if (!/^[0-9]{1,6}$/.test(id)) return null;   // raw id must already be a pure decimal — never label/expression/result, no tag-stripped salvage
  const n = Number(id);
  return n >= 1 ? n : null;
}

function razielNumberContextDescriptor(det: any, surfaceSemantic: any): { number: number; anchor: string; mode: "deterministic" | "synthesis" } | null {
  if (!det || det.enabled !== true || det.availability !== "number_context") return null;
  const nc = det.number_context;
  if (!nc || nc.contract !== "number_context_v1") return null;
  const anchor = String(nc.anchor || "");
  const mode = nc.mode === "deterministic" ? "deterministic" : "synthesis";
  let n: number | null = null;
  if (anchor === "explicit") n = num(nc.number);
  else if (anchor === "gematria_dependency") n = det.mode === "tool_research" && nc.dependency?.verified === true ? num(nc.number) : null;
  else if (anchor === "surface_root") n = razielSurfaceNumberRoot(surfaceSemantic);
  if (n === null || !Number.isInteger(n) || n < 1 || n > 999999) return null;   // fail closed: no anchor → no tool
  return { number: n, anchor, mode };
}

type RazielNcItem = { ref?: string; label: string; relation?: string; weight?: number };
type RazielNumberContext = { ok: boolean; number: number; anchor: string; mode: string; outcome: string; answer?: string; pack?: string;
  facts?: { label: string; value: string }[]; counts?: Record<string, number>; refs?: Record<string, number> };

const ncText = (v: unknown, n: number): string => (typeof v === "string" ? v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");

function razielNumberContextProject(n: number, map: any, dossier: any): Omit<RazielNumberContext, "ok" | "number" | "anchor" | "mode" | "outcome"> | null {
  const mapOk = !!map && typeof map === "object" && !Array.isArray(map);
  const dosOk = !!dossier && typeof dossier === "object" && !Array.isArray(dossier);
  if (!mapOk && !dosOk) return null;
  const neigh = mapOk && map.neighbors && typeof map.neighbors === "object" ? map.neighbors : {};
  const cats = ["post", "topic", "entity", "event", "convergence", "number"];
  const item = (x: any): RazielNcItem | null => {
    const label = ncText(x?.label ?? x?.ref, 100);
    if (!label) return null;
    return { ...(typeof x?.ref === "string" ? { ref: ncText(x.ref, 200) } : {}), label,
      ...(typeof x?.relation === "string" ? { relation: ncText(x.relation, 30) } : {}), ...(num(x?.weight) !== null ? { weight: num(x.weight) as number } : {}) };
  };
  const top: Record<string, RazielNcItem[]> = {};
  const counts: Record<string, number> = {};
  for (const c of cats) {
    const arr = Array.isArray(neigh[c]) ? neigh[c] : [];
    const cnt = num(map?.counts?.[c]);
    counts[c] = cnt !== null ? cnt : arr.length;
    top[c] = arr.slice(0, RAZIEL_NC_TOP).map(item).filter(Boolean) as RazielNcItem[];
  }
  const dPosts: string[] = dosOk && Array.isArray(dossier.posts) ? dossier.posts.filter((p: unknown) => typeof p === "string").map((p: string) => ncText(p, 100)).filter(Boolean) : [];
  const dTopics: string[] = dosOk && Array.isArray(dossier.topics) ? dossier.topics.map((p: any) => ncText(typeof p === "string" ? p : (p?.label ?? p?.title), 100)).filter(Boolean) : [];
  const dMethods = dosOk && Array.isArray(dossier.methods)
    ? dossier.methods.slice(0, RAZIEL_NC_TOP).map((m: any) => ({ method: ncText(m?.method, 30),
        n: Array.isArray(m?.phrases) ? m.phrases.length : 0,
        phrases: Array.isArray(m?.phrases) ? m.phrases.slice(0, RAZIEL_NC_TOP).map((p: unknown) => ncText(p, 60)).filter(Boolean) : [] })).filter((m: any) => m.method)
    : [];
  const dDefs = dosOk && Array.isArray(dossier.definitions) ? dossier.definitions.length : 0;   // count only — definitions are never widened here
  const dReality = dosOk ? num(dossier.reality) : null;
  const counted = { posts_map: counts.post, topics_map: counts.topic, entities: counts.entity, events: counts.event, convergences: counts.convergence, numbers: counts.number,
    posts_dossier: dPosts.length, topics_dossier: dTopics.length, methods: dosOk && Array.isArray(dossier.methods) ? dossier.methods.length : 0, definitions: dDefs };
  const bundle = { number: n, source: { number_map: mapOk ? "ok" : "unavailable", number_dossier_json: dosOk ? "ok" : "unavailable" }, counts: counted,
    map: Object.fromEntries(cats.map((c) => [c, top[c]])),
    dossier: { posts: dPosts.slice(0, RAZIEL_NC_TOP), topics: dTopics.slice(0, RAZIEL_NC_TOP), methods: dMethods, reality: dReality, definitions: dDefs },
    note: "נוכחות קשת בגרף = ראיית-קשר בלבד, לא פירוש ולא אמת קנונית; מוצגים עד 6 פריטים לקטגוריה (שמות/הפניות בלבד, בלי גוף-פוסט)" };
  const parts: string[] = [];
  const add = (label: string, c: number) => { if (c > 0) parts.push(`${label} ${c}`); };
  add("פוסטים", Math.max(counted.posts_map, counted.posts_dossier)); add("טופיקים", Math.max(counted.topics_map, counted.topics_dossier));
  add("ישויות", counted.entities); add("אירועים", counted.events); add("התכנסויות", counted.convergences); add("מספרים קשורים", counted.numbers);
  const lab = (a: RazielNcItem[]) => a.map((x) => x.label).join(" · ");
  const lines = [parts.length ? `המספר ${n} באתר (קשרי גרף ותיק-מספר קיימים): ${parts.join(" · ")}.` : `לא נמצאו קשרים ידועים למספר ${n} בהקרנות הקיימות של האתר (אין זו הוכחה שאינו מופיע במקומות אחרים).`];
  if (top.post.length) lines.push(`פוסטים: ${lab(top.post)}`);
  else if (dPosts.length) lines.push(`פוסטים (תיק-מספר): ${dPosts.slice(0, RAZIEL_NC_TOP).join(" · ")}`);
  if (dTopics.length) lines.push(`טופיקים: ${dTopics.slice(0, RAZIEL_NC_TOP).join(" · ")}`);
  if (top.entity.length) lines.push(`ישויות (יחס): ${top.entity.map((x) => `${x.label}${x.relation ? ` [${x.relation}]` : ""}`).join(" · ")}`);
  if (top.event.length) lines.push(`אירועים (יחס): ${top.event.map((x) => `${x.label}${x.relation ? ` [${x.relation}]` : ""}`).join(" · ")}`);
  const answer = lines.join("\n").slice(0, 1400);
  const facts = parts.map((p) => { const i = p.lastIndexOf(" "); return { label: p.slice(0, i), value: p.slice(i + 1) }; });
  return { answer, facts, counts: counted as unknown as Record<string, number>, refs: { post: top.post.length, topic: dTopics.length ? Math.min(dTopics.length, RAZIEL_NC_TOP) : top.topic.length,
    entity: top.entity.length, event: top.event.length }, pack: JSON.stringify(bundle).slice(0, 2600) };
}

async function runRazielNumberContext(desc: { number: number; anchor: string; mode: string }, trace: OperationalTraceHandle | null): Promise<RazielNumberContext> {
  const results: Awaited<ReturnType<typeof razielOperatorRpc>>[] = [];
  const spans: { spanId: string; startedAt: string }[] = [];
  for (const c of RAZIEL_NUMBER_CONTEXT_CALLS) {
    const sAt = new Date().toISOString();
    // public read projections (anon-executable, publication filtering inside the owner function); anon key only — never the service role
    results.push(await razielOperatorRpc(SB_ANON, { rpc: c.rpc, args: { n: desc.number } }));
    spans.push({ spanId: crypto.randomUUID(), startedAt: sAt });
  }
  const anyOk = results.some((r) => r.ok);
  const proj = anyOk ? razielNumberContextProject(desc.number, results[0].ok ? results[0].data : null, results[1].ok ? results[1].data : null) : null;
  const ok = anyOk && !!proj;
  for (let i = 0; i < results.length; i++) {
    const r = results[i], c = RAZIEL_NUMBER_CONTEXT_CALLS[i];
    const used = r.ok && ok;
    await recordOperationalSpan(trace, {
      spanId: spans[i].spanId, kind: "db_rpc", name: `ai-analyze:raziel:number_context:${c.rpc}`, startedAt: spans[i].startedAt, endedAt: new Date().toISOString(),
      outcome: r.ok && !proj ? "failed_with_reason" : r.outcome,
      detail: {
        capability: `raziel_number_context:${c.rpc}`, owner_ref: c.owner, routing_reason: "raziel_plan_number_context",
        output_use: used ? "used" : "not_applicable", stop_reason: used ? null : (r.error || "unusable_payload"),
        resources: { latency_ms: r.ms, api_calls: 1 },
        result_refs: used && proj ? { counts: proj.counts, bounded_refs: proj.refs } : null,
        replay: { ownerRuleRefs: [c.owner], parametersRef: `rpc:${c.rpc};anchor:${desc.anchor};read_only:true` },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
  }
  const failed = results.find((x) => !x.ok);
  return { ok, number: desc.number, anchor: desc.anchor, mode: desc.mode, outcome: ok ? (failed ? "partial" : "success") : (failed ? failed.outcome : "failed_with_reason"), ...(proj || {}) };
}

// ── Raziel Intelligence Core v1 Phase L — bounded READ-only external live-state verifier (verified admin only) ──────────────────────────────
// Replaces the Phase K fixed "not connected" answer. Unauthenticated PUBLIC GitHub REST only for the public repo (no token, no Authorization header, no env
// secret, never the caller JWT, no Vercel API). Evidence follows the post-deploy-canary workflow / deploy_on_request v3: a LIVE_VERIFIED claim needs the latest
// Production deployment status = success AND commit-status context sod1820/post-deploy-canary = success on that EXACT production SHA. Any fetch failure,
// rate-limit or shape mismatch ⇒ NOT_VERIFIED (UNKNOWN); nothing is inferred from work_log. Bounded: 1 + 1 + ≤10 + 1 = ≤13 calls, 4s timeout each.
// The caller (runRazielCoordination) is reached only through razielCoordDescriptor, which returns null for any non-admin tier ⇒ non-admin = zero calls.
const RAZIEL_GH_REPO = "zuriel337/sod1820";
const RAZIEL_GH_TIMEOUT_MS = 4000;
const RAZIEL_GH_MAX_DEPLOYMENTS = 10;
const RAZIEL_GH_CANARY_CONTEXT = "sod1820/post-deploy-canary";
const RAZIEL_GH_OWNER = "live_state_resolution_law v2 + deploy_on_request v3";
const RAZIEL_GH_HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "sod1820-raziel-live-state" };
const RAZIEL_GH_SHA = /^[0-9a-f]{40}$/;

type RazielGhRes = { ok: boolean; status: number | null; data: any; ms: number; outcome: string; error: string | null };

async function razielGhGet(
  path: string, endpointClass: string, trace: OperationalTraceHandle | null,
): Promise<RazielGhRes> {
  const spanId = crypto.randomUUID(), startedAt = new Date().toISOString(), t0 = Date.now();
  let status: number | null = null, data: any = null, outcome = "success", error: string | null = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${RAZIEL_GH_REPO}/${path}`, {
      method: "GET", headers: RAZIEL_GH_HEADERS, signal: AbortSignal.timeout(RAZIEL_GH_TIMEOUT_MS),
    });
    status = res.status;
    if (!res.ok) { outcome = status === 403 || status === 429 ? "provider_error" : "failed_with_reason"; error = status === 403 || status === 429 ? "rate_limited_or_forbidden" : `http_${status}`; }
    else { try { data = await res.json(); } catch { outcome = "failed_with_reason"; error = "bad_json"; } }
  } catch (e) {
    const timedOut = (e as any)?.name === "TimeoutError" || (e as any)?.name === "AbortError";
    outcome = timedOut ? "timeout" : "failed_with_reason"; error = timedOut ? "timeout" : "fetch_failed";
  }
  const ms = Date.now() - t0;
  await recordOperationalSpan(trace, {
    spanId, kind: "network", name: `ai-analyze:raziel:external_http:${endpointClass}`, startedAt, endedAt: new Date().toISOString(), outcome,
    detail: {
      capability: "raziel_live_external_state", owner_ref: RAZIEL_GH_OWNER, routing_reason: "raziel_plan_operator_read",
      output_use: outcome === "success" ? "used" : "not_applicable", stop_reason: error,
      resources: { latency_ms: ms, api_calls: 1 },
      replay: { ownerRuleRefs: [RAZIEL_GH_OWNER], parametersRef: `external_http:github_rest;endpoint_class:${endpointClass};status:${status ?? "none"};read_only:true;auth:none` },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });
  return { ok: outcome === "success", status, data, ms, outcome, error };
}

type RazielLiveState = {
  verdict: "LIVE_VERIFIED" | "NOT_VERIFIED"; reason: string | null; main_sha: string | null; production_sha: string | null; parity: boolean | null;
  deployment_state: string | null; deployment_time: string | null; canary_state: string | null; canary_time: string | null;
};

async function razielLiveExternalState(trace: OperationalTraceHandle | null): Promise<RazielLiveState> {
  const st: RazielLiveState = { verdict: "NOT_VERIFIED", reason: null, main_sha: null, production_sha: null, parity: null,
    deployment_state: null, deployment_time: null, canary_state: null, canary_time: null };
  const fail = (reason: string) => { st.reason = reason; return st; };

  const main = await razielGhGet("commits/main", "github_main_head", trace);
  if (main.ok && RAZIEL_GH_SHA.test(String(main.data?.sha ?? ""))) st.main_sha = main.data.sha;
  else if (main.ok) return fail("main_shape_mismatch"); else return fail(`main:${main.error}`);

  const deps = await razielGhGet(`deployments?environment=Production&per_page=${RAZIEL_GH_MAX_DEPLOYMENTS}`, "github_deployments", trace);
  if (!deps.ok) return fail(`deployments:${deps.error}`);
  if (!Array.isArray(deps.data)) return fail("deployments_shape_mismatch");

  let prodSha: string | null = null;
  for (const d of deps.data.slice(0, RAZIEL_GH_MAX_DEPLOYMENTS)) {
    if (!Number.isSafeInteger(d?.id) || !RAZIEL_GH_SHA.test(String(d?.sha ?? ""))) return fail("deployments_shape_mismatch");
    const s = await razielGhGet(`deployments/${d.id}/statuses?per_page=1`, "github_deployment_status", trace);
    if (!s.ok) return fail(`deployment_status:${s.error}`);
    if (!Array.isArray(s.data)) return fail("deployment_status_shape_mismatch");
    const latest = s.data[0];
    if (latest && latest.state === "success") {
      prodSha = d.sha; st.deployment_state = "success";
      st.deployment_time = typeof latest.created_at === "string" ? latest.created_at.slice(0, 25) : null;
      break;
    }
  }
  if (!prodSha) return fail("no_successful_production_deployment");
  st.production_sha = prodSha;
  st.parity = st.main_sha === prodSha;

  const comb = await razielGhGet(`commits/${prodSha}/status`, "github_combined_status", trace);
  if (!comb.ok) return fail(`combined_status:${comb.error}`);
  if (!comb.data || !Array.isArray(comb.data.statuses)) return fail("combined_status_shape_mismatch");
  const canaries = comb.data.statuses.filter((x: any) => x && x.context === RAZIEL_GH_CANARY_CONTEXT);
  if (!canaries.length) { st.canary_state = "missing"; return fail("canary_missing"); }
  const ts = (x: any) => { const t = Date.parse(x?.updated_at || x?.created_at || ""); return Number.isNaN(t) ? 0 : t; };
  const c = canaries.reduce((a: any, b: any) => (ts(b) >= ts(a) ? b : a));
  st.canary_state = typeof c.state === "string" && /^(success|failure|error|pending)$/.test(c.state) ? c.state : "unknown";
  st.canary_time = typeof (c.updated_at || c.created_at) === "string" ? String(c.updated_at || c.created_at).slice(0, 25) : null;
  if (st.canary_state !== "success") return fail(`canary_${st.canary_state}`);
  st.verdict = "LIVE_VERIFIED";
  return st;
}

function razielLiveExternalAnswer(st: RazielLiveState): string {
  const sh = (s: string | null) => (s ? s.slice(0, 8) : "—");
  const lines = [
    `אימות חי חיצוני (GitHub ציבורי בלבד, קריאה בעת השאלה · ${RAZIEL_GH_OWNER}):`,
    `main: ${sh(st.main_sha)} · production: ${sh(st.production_sha)} · התאמה main==production: ${st.parity === null ? "לא ידוע" : st.parity ? "כן" : "לא (main מקדים/שונה מהפרודקשן)"}`,
    `פריסת Production: ${st.deployment_state || "לא אומתה"}${st.deployment_time ? ` · ${st.deployment_time}` : ""}`,
    `קנרי post-deploy-canary: ${st.canary_state || "לא אומת"}${st.canary_time ? ` · ${st.canary_time}` : ""}`,
    st.verdict === "LIVE_VERIFIED"
      ? `בסיס: LIVE_VERIFIED — פריסת Production הצליחה והקנרי הצליח על ה-SHA המדויק של הפרודקשן.`
      : `בסיס: NOT_VERIFIED (לא ידוע) — ${st.reason || "ראיה חסרה"}. לא הוסק דבר מיומן-התיאום.`,
  ];
  return lines.join("\n");
}

// ── Raziel Intelligence Core v1 Phase K — operator coordination / attention READ (verified admin only) ──────────────
// Extends the Phase C operator path (same descriptor discipline, same CALLER-JWT owner RPCs, never the service role). The plan only DESCRIBES the
// capability; owner RPCs re-check admin themselves. work_log is Coordination/Provenance: every answer says what the coordination ledger REPORTS
// (COORDINATION_REPORTED) and never claims merge/deploy/production. The owner rows are projected here to allowlisted, bounded fields
// (max rows, truncated text, no links/ids/open-thread text/raw payloads). External live verification is Phase L (razielLiveExternalState).
const RAZIEL_COORD_CAPS: Record<string, RazielOperatorCap> = {
  work_now: { calls: [{ rpc: "get_work_log_current", args: {} }], owner: "inter_agent_coordination_law v13" },
  work_active: { calls: [{ rpc: "get_work_log_current", args: {} }], owner: "inter_agent_coordination_law v13" },
  work_ready: { calls: [{ rpc: "get_work_log_current", args: {} }], owner: "inter_agent_coordination_law v13" },
  work_today: { calls: [{ rpc: "get_work_log_current", args: {} }], owner: "inter_agent_coordination_law v13" },
  agents_status: { calls: [{ rpc: "admin_agents_dashboard", args: {} }], owner: "system_suggestions_law v5" },
  attention: { calls: [{ rpc: "admin_command_center", args: {} }, { rpc: "get_work_log_current", args: {} }, { rpc: "admin_system_health", args: {} }],
    owner: "system_suggestions_law v5 + inter_agent_coordination_law v13" },
  live_external_state: { calls: [], owner: "live_state_resolution_law v2" },   // no RPC: Phase L bounded external verifier (razielLiveExternalState)
};
const RAZIEL_COORD_MAX_ROWS = 12;
const RAZIEL_AGENTS_MAX_ROWS = 10;
const RAZIEL_COORD_TRUTH = "מקור: יומן-התיאום (work_log) — Coordination/Provenance בלבד (COORDINATION_REPORTED), לא LIVE_VERIFIED; מצב מיזוג/פריסה/פרודקשן לא אומת מהיומן.";

function razielCoordDescriptor(det: any, tier: string): { capability: string; days: number | null } | null {
  if (tier !== "admin" || !det || det.enabled !== true || det.availability !== "operator_read") return null;
  const cap = typeof det.trace?.operator?.capability === "string" ? det.trace.operator.capability : "";
  if (!Object.prototype.hasOwnProperty.call(RAZIEL_COORD_CAPS, cap)) return null;   // allowlist, never plan-supplied rpc names
  return { capability: cap, days: null };
}

const coordText = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/https?:\/\/\S+/gi, "").replace(/[A-Za-z0-9_\-]{32,}/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "";

type RazielWorkRow = { task_key: string; topic: string; status: string; from_actor: string; to_actor: string; assignment_mode: string;
  release_authorization_state: string; created_at: string; summary: string; _dispatch_state: string };

// Allowlisted projection of work_log_current rows. Dropped here: ids, dispatch URLs/sessions/errors/context, open_threads, owners, raw payloads.
function razielWorkLogRows(data: any): RazielWorkRow[] | null {
  if (!Array.isArray(data)) return null;
  return data.filter((r: any) => r && typeof r === "object").map((r: any) => ({
    task_key: coordText(r.task_key, 120), topic: coordText(r.topic, 120), status: coordText(r.status, 60), from_actor: coordText(r.from_actor, 20),
    to_actor: coordText(r.to_actor, 20), assignment_mode: coordText(r.assignment_mode, 20),
    release_authorization_state: coordText(r.release_authorization_state, 80), created_at: coordText(r.created_at, 40),
    summary: coordText(r.what_we_did, 240), _dispatch_state: coordText(r.dispatch_state, 30),
  }));
}
const WORK_ACTIVE_STATES = ["QUEUED", "FIRE_REQUESTED", "SESSION_STARTED", "CLAIMED", "RETRY_WAIT"];
const isWorkActive = (r: RazielWorkRow) => WORK_ACTIVE_STATES.includes(r._dispatch_state) || /CLAIMED_WRITE|WRITE_SCOPE_OPEN|ASSIGNED|ACK_REQUIRED|QUEUED/i.test(r.status);
const isWorkReady = (r: RazielWorkRow) => /READY_TO_DEPLOY|RELEASE_AUTHORIZED/i.test(r.status);
const isWorkDeferred = (r: RazielWorkRow) => r._dispatch_state === "DEFERRED" || /BLOCKED|WAITING|AWAITING|ממתין/i.test(r.status);
const coordDay = (iso: string): string => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); };
const workLine = (r: RazielWorkRow, withSummary: boolean) =>
  `• ${r.task_key || r.topic || "—"} · ${r.status || "—"} · ${r.from_actor || "?"}→${r.to_actor || "?"} · ${r.assignment_mode || "—"} · ${r.release_authorization_state || "—"} · ${r.created_at.slice(0, 16)}` +
  (withSummary && r.summary ? `\n  ${r.summary}` : "");

function razielWorkProject(capability: string, rows: RazielWorkRow[], withSummary = false): { lines: string[]; total: number } {
  const today = coordDay(new Date().toISOString());
  const pick = capability === "work_today" ? rows.filter((r) => coordDay(r.created_at) === today)
    : capability === "work_ready" ? rows.filter((r) => isWorkReady(r) || isWorkDeferred(r))
    : rows.filter(isWorkActive);   // work_now / work_active
  return { lines: pick.slice(0, RAZIEL_COORD_MAX_ROWS).map((r) => workLine(r, withSummary)), total: pick.length };
}

function razielCoordProject(capability: string, datas: any[]): Omit<RazielOperatorResult, "ok" | "outcome" | "capability" | "owner" | "rpc"> | null {
  if (capability === "agents_status") {
    const d = datas[0];
    if (!Array.isArray(d)) return null;
    const rows = d.filter((r: any) => r && typeof r === "object").slice(0, RAZIEL_AGENTS_MAX_ROWS).map((r: any) => ({
      agent: coordText(r.agent, 40), role: coordText(r.role, 80), reg: r.is_registered_bot === true, d1: num(r.calls_1d), d30: num(r.calls_30d), last: coordText(r.last_activity, 16) }));
    const lines = rows.map((r) => `• ${r.agent} · ${r.role || "—"} · ${r.reg ? "בוט רשום" : "לא רשום"} · קריאות 24ש' ${r.d1 ?? "?"} · 30י' ${r.d30 ?? "?"} · פעילות אחרונה ${r.last || "—"}`);
    return { basis: "LIVE_DB_READ", answer: `סוכנים (admin_agents_dashboard · קריאת DB חיה בעת השאלה; עד ${RAZIEL_AGENTS_MAX_ROWS}):\n${lines.join("\n") || "לא נמצאו סוכנים."}`,
      facts: [{ label: "סוכנים מוצגים", value: String(rows.length) }] };
  }
  if (capability === "attention") {
    const [cc, wl, health] = datas;
    const rows = razielWorkLogRows(wl);
    if (!cc || typeof cc !== "object" || !rows) return null;
    const c = cc.counters || {};
    const demand = (Array.isArray(cc.top_demand) ? cc.top_demand : []).slice(0, 5).map((t: any) => `${coordText(t?.label || t?.key, 40)}(${num(t?.visits) ?? "?"})`);
    const disc = (Array.isArray(cc.recent_discoveries) ? cc.recent_discoveries : []).slice(0, 5).map((x: any) => `${coordText(String(x?.value ?? ""), 20)}·${num(x?.group_size) ?? "?"}·${coordText(x?.kind, 20)}`);
    const sys = health && typeof health === "object" ? razielOperatorProject("system_faults", health, null)?.pack : null;
    const ready = rows.filter(isWorkReady).length, blocked = rows.filter(isWorkDeferred).length;
    return { basis: "MIXED_DB_READ_AND_COORDINATION_REPORTED", pack:
      `מרכז-פיקוד (admin_command_center · ספירות בלבד): המלצות ממתינות ${num(c.recommendations_pending) ?? "?"} · פערי-ביקוש ${num(c.demand_gaps) ?? "?"} · הגדרות פתוחות ${num(c.zuriel_definitions) ?? "?"} · ` +
      `רמזי-קהילה ${num(c.hints_pending) ?? "?"} · טיוטות-מסע ${num(c.journey_drafts) ?? "?"} · התכנסויות חדשות 7י' ${num(c.convergences_new_7d) ?? "?"}\n` +
      `ביקוש מוביל: ${demand.join(" · ") || "—"}\nגילויים אחרונים: ${disc.join(" · ") || "—"}\n` +
      `יומן-התיאום (דיווח בלבד, לא אומת): מוכנות-לפריסה לפי היומן ${ready} (מונה היומן: ${num(c.worklog_ready_deploy) ?? "?"}) · חסומות/ממתינות/נדחות ${blocked} · פעילות ${rows.filter(isWorkActive).length}\n` +
      `${sys ? sys : "מצב-מערכת: לא התקבל."}\n${RAZIEL_COORD_TRUTH}`.slice(0, 1800) };
  }
  // work_now / work_active / work_ready / work_today
  const rows = razielWorkLogRows(datas[0]);
  if (!rows) return null;
  const { lines, total } = razielWorkProject(capability, rows);
  const title = capability === "work_ready" ? "מוכן/ממתין/נדחה" : capability === "work_today" ? "מה השתנה היום ביומן" : "משימות פעילות";
  return { basis: "COORDINATION_REPORTED", answer: `${title} (לפי יומן-התיאום; מוצגות ${lines.length} מתוך ${total}):\n${lines.join("\n") || "אין פריטים תואמים ביומן."}\n${RAZIEL_COORD_TRUTH}`,
    facts: [{ label: `${title} · לפי היומן`, value: String(total) }] };
}

async function runRazielCoordination(desc: { capability: string; days: number | null }, bearer: string, trace: OperationalTraceHandle | null): Promise<RazielOperatorResult> {
  const cap = RAZIEL_COORD_CAPS[desc.capability];
  const rpcLabel = cap.calls.map((c) => c.rpc).join("+") || "none";
  if (!cap.calls.length) {
    // Phase L: bounded public external verifier; the caller JWT (bearer) is deliberately NOT passed — nothing credentialed leaves the function.
    const st = await razielLiveExternalState(trace);
    return { ok: true, outcome: st.verdict === "LIVE_VERIFIED" ? "success" : "degraded_fallback", capability: desc.capability, owner: cap.owner, rpc: "external_public_read",
      answer: razielLiveExternalAnswer(st), basis: st.verdict === "LIVE_VERIFIED" ? "LIVE_VERIFIED" : "EXTERNAL_NOT_VERIFIED",
      facts: [{ label: "main", value: st.main_sha ? st.main_sha.slice(0, 8) : "—" }, { label: "production", value: st.production_sha ? st.production_sha.slice(0, 8) : "—" },
        { label: "main==production", value: st.parity === null ? "unknown" : String(st.parity) }, { label: "canary", value: st.canary_state || "unknown" }] };
  }
  const results: Awaited<ReturnType<typeof razielOperatorRpc>>[] = [];
  const spans: { spanId: string; startedAt: string; endedAt: string }[] = [];
  for (const call of cap.calls) {
    const sId = crypto.randomUUID(), sAt = new Date().toISOString();
    const res = await razielOperatorRpc(bearer, call);
    results.push(res);
    spans.push({ spanId: sId, startedAt: sAt, endedAt: new Date().toISOString() });
    if (!res.ok) break;   // all owner calls are required; stop at the first failure
  }
  const allOk = results.length === cap.calls.length && results.every((x) => x.ok);
  const proj = allOk ? razielCoordProject(desc.capability, results.map((x) => x.data)) : null;
  const ok = allOk && !!proj;
  const failed = results.find((x) => !x.ok);
  const outcome = failed ? failed.outcome : (!proj ? "failed_with_reason" : "success");
  for (let i = 0; i < results.length; i++) {
    const r = results[i], call = cap.calls[i], last = i === results.length - 1;
    const spanOk = r.ok && (!last || ok);
    await recordOperationalSpan(trace, {
      spanId: spans[i].spanId, kind: "db_rpc", name: `ai-analyze:raziel:operator:${call.rpc}`, startedAt: spans[i].startedAt, endedAt: spans[i].endedAt,
      outcome: r.ok && last && !proj && allOk ? "failed_with_reason" : r.outcome,
      detail: {
        capability: `raziel_operator:${desc.capability}`, owner_ref: cap.owner, routing_reason: "raziel_plan_operator_read",
        output_use: spanOk ? "used" : "not_applicable", stop_reason: spanOk ? null : (r.error || "unusable_payload"),
        resources: { latency_ms: r.ms, api_calls: 1 },
        replay: { ownerRuleRefs: [cap.owner], parametersRef: `rpc:${call.rpc};caller_jwt:true;read_only:true` },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
  }
  return { ok, outcome, capability: desc.capability, owner: cap.owner, rpc: rpcLabel, ...(proj || {}) };
}

// ── Raziel Intelligence Core v1 Phase L — personal research continuity READ (authenticated user only) ───────────────
// Reads ONLY the existing owner RPCs research_state_snapshot_v1 (auth.uid principal check) and fn_research_path_resume_v1 (owner-only latest path) with
// the CALLER JWT — never the service role, never a client-supplied user id: the uid passed is the one validated from that same JWT in resolveIdentity.
// Anonymous/public → descriptor null → zero personal RPC calls. Projection is allowlisted + bounded here (counts + max 6 items per bucket; type/ref/id/title/
// link only; no arbitrary metadata, provenance, representation or private payload). Basis PERSONAL_RESEARCH_STATE — the user's own saved state, not Fact/Canonical.
// No writes, no appends, no remembers.
const RAZIEL_PERSONAL_OWNER = "research_workspace_law v5 + research_strategy_layer_law v17";
const RAZIEL_PERSONAL_CAPS = ["personal_saved", "personal_now", "personal_recent", "personal_pinned", "personal_structure", "personal_resume", "personal_continue"];
const RAZIEL_PERSONAL_MAX_ITEMS = 6;
const RAZIEL_PERSONAL_TRUTH = "מקור: מצב-המחקר האישי שלך (PERSONAL_RESEARCH_STATE) — מה ששמרת/פתחת, לא עובדה ולא קנוני.";
const RAZIEL_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function razielPersonalDescriptor(det: any, tier: string, uid: string | null): { capability: string } | null {
  if ((tier !== "user" && tier !== "admin") || !uid || !RAZIEL_UUID_RE.test(uid)) return null;
  if (!det || det.enabled !== true || det.availability !== "personal_research_read") return null;
  const cap = typeof det.trace?.personal?.capability === "string" ? det.trace.personal.capability : "";
  return RAZIEL_PERSONAL_CAPS.includes(cap) ? { capability: cap } : null;   // allowlist, never plan-supplied rpc names
}

type RazielPersonalItem = { type: string; ref: string; id: string; title: string; link: string };
const persTxt = (v: unknown, n: number): string => coordText(typeof v === "number" ? String(v) : v, n);
const persLink = (v: unknown): string => (typeof v === "string" && /^\/(?!\/)[^\s]{0,199}$/.test(v) ? v : "");   // internal navigation links only
function razielPersonalItem(it: any): RazielPersonalItem | null {
  if (!it || typeof it !== "object" || Array.isArray(it)) return null;
  const out = { type: persTxt(it.type ?? it.entityType ?? it.kind, 30), ref: persTxt(it.ref ?? it.entity_ref, 80), id: persTxt(it.id, 80),
    title: persTxt(it.title ?? it.label ?? it.name, 100), link: persLink(it.link ?? it.url) };
  return out.title || out.ref || out.id ? out : null;
}
const razielPersonalBucket = (v: unknown): { count: number; items: RazielPersonalItem[] } | null => {
  if (!Array.isArray(v)) return null;
  return { count: v.length, items: v.map(razielPersonalItem).filter((x): x is RazielPersonalItem => !!x).slice(0, RAZIEL_PERSONAL_MAX_ITEMS) };
};
const persLine = (x: RazielPersonalItem) => `• ${x.title || x.ref || x.id}${x.type ? ` · ${x.type}` : ""}${x.link ? ` · ${x.link}` : ""}`;
const persBucketText = (label: string, b: { count: number; items: RazielPersonalItem[] }) =>
  `${label}: ${b.count}${b.items.length ? ` (מוצגים ${b.items.length})\n${b.items.map(persLine).join("\n")}` : ""}`;

// snapshot → { saved,cart,pinned,history,collections,journeys: {count,items≤6} }; collections/journeys keep title/type/count labels only.
function razielPersonalSnapshot(data: any): Record<string, { count: number; items: RazielPersonalItem[] }> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const out: Record<string, { count: number; items: RazielPersonalItem[] }> = {};
  for (const k of ["saved", "cart", "pinned", "history", "collections", "journeys"]) {
    const b = razielPersonalBucket(data[k]);
    if (!b) return null;
    out[k] = b;
  }
  return out;
}

// resume → bounded identity + ≤6 most recent steps (navigation identity only). Identity comes from the canonical writer shape
// (identity_metadata.root_type/root_ref/root_label — buildResearchPathIdentityMetadata) plus ONLY these allowlisted fields of the owner-returned
// representation.context: subject type/id/label/href, lens, journey id/kind/position. The rest of representation / provenance / dimensions /
// selection / access / metadata is never forwarded.
type RazielPersonalPathT = { found: boolean; subject: string; subjectType: string; subjectRef: string; subjectLink: string; lens: string; journey: string; journeyKind: string; journeyPosition: string; revision: number | null; total: number; steps: RazielPersonalItem[] };
const persObj = (v: unknown): any => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
function razielPersonalPath(data: any): RazielPersonalPathT | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const empty: RazielPersonalPathT = { found: false, subject: "", subjectType: "", subjectRef: "", subjectLink: "", lens: "", journey: "", journeyKind: "", journeyPosition: "", revision: null, total: 0, steps: [] };
  if (data.ok === false) return data.error === "not_found" || data.error === "no_revision" ? empty : null;
  if (data.ok !== true) return null;
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const idm = persObj(data.identity_metadata);
  const ctx = persObj(persObj(data.representation).context);
  const subj = persObj(ctx.subject), jr = persObj(ctx.journey);
  return { found: true,
    subject: persTxt(idm.root_label || idm.root_ref || subj.label || subj.id, 80), subjectType: persTxt(idm.root_type || subj.type, 30), subjectRef: persTxt(idm.root_ref || subj.id, 80),
    subjectLink: persLink(subj.href), lens: persTxt(ctx.lens, 60), journey: persTxt(jr.id, 80), journeyKind: persTxt(jr.kind, 30), journeyPosition: persTxt(jr.position, 30),
    revision: num(data.revision_no), total: steps.length,
    steps: steps.slice(-RAZIEL_PERSONAL_MAX_ITEMS).map(razielPersonalItem).filter((x): x is RazielPersonalItem => !!x) };
}

const persPathText = (p: RazielPersonalPathT) => !p.found ? "לא נמצא מסלול-מחקר שמור."
  : `המסלול האחרון שלך${p.subject ? ` · נושא: ${p.subject}${p.subjectType ? ` (${p.subjectType})` : ""}${p.subjectLink ? ` ${p.subjectLink}` : ""}` : ""}${p.lens ? ` · עדשה: ${p.lens}` : ""}${p.journey ? ` · מסע: ${p.journey}${p.journeyKind ? ` (${p.journeyKind})` : ""}${p.journeyPosition ? ` @${p.journeyPosition}` : ""}` : ""} · ${p.total} צעדים (מוצגים ${p.steps.length} אחרונים)` +
    `${p.steps.length ? "\n" + p.steps.map(persLine).join("\n") : ""}`;

function razielPersonalProject(capability: string, datas: any[]): Omit<RazielOperatorResult, "ok" | "outcome" | "capability" | "owner" | "rpc"> | null {
  const basis = "PERSONAL_RESEARCH_STATE";
  if (capability === "personal_resume") {
    const p = razielPersonalPath(datas[0]);
    return p ? { basis, answer: `${persPathText(p)}\n${RAZIEL_PERSONAL_TRUTH}`, facts: [{ label: "צעדים במסלול האחרון", value: String(p.total) }] } : null;
  }
  const snap = razielPersonalSnapshot(datas[0]);
  if (!snap) return null;
  const c = (k: string) => snap[k].count;
  if (capability === "personal_saved") return { basis, answer: `${persBucketText("שמרת", snap.saved)}\n${persBucketText("בסל", snap.cart)}\n${RAZIEL_PERSONAL_TRUTH}`,
    facts: [{ label: "פריטים שמורים", value: String(c("saved")) }] };
  if (capability === "personal_pinned") return { basis, answer: `${persBucketText("מוצמד", snap.pinned)}\n${RAZIEL_PERSONAL_TRUTH}`, facts: [{ label: "פריטים מוצמדים", value: String(c("pinned")) }] };
  if (capability === "personal_recent" || capability === "personal_now") return { basis, answer: `${persBucketText(capability === "personal_now" ? "בחקירה עכשיו (לפי ההיסטוריה האחרונה)" : "נחקר לאחרונה", snap.history)}\n${RAZIEL_PERSONAL_TRUTH}`,
    facts: [{ label: "פריטי היסטוריה", value: String(c("history")) }] };
  if (capability === "personal_structure") return { basis, answer: `${persBucketText("אוספים", snap.collections)}\n${persBucketText("מסעות", snap.journeys)}\n${RAZIEL_PERSONAL_TRUTH}`,
    facts: [{ label: "אוספים", value: String(c("collections")) }, { label: "מסעות", value: String(c("journeys")) }] };
  if (capability === "personal_continue") {
    const p = razielPersonalPath(datas[1]);   // a missing latest path is not fatal for the saved-state synthesis
    return { basis, pack: (`מצב-מחקר אישי (PERSONAL_RESEARCH_STATE; ספירות + עד ${RAZIEL_PERSONAL_MAX_ITEMS} פריטים לקטגוריה):\n` +
      ["saved:שמורים", "pinned:מוצמד", "history:היסטוריה", "collections:אוספים", "journeys:מסעות"].map((x) => { const [k, l] = x.split(":"); return persBucketText(l, snap[k]); }).join("\n") +
      `\n${p ? persPathText(p) : "מסלול אחרון: לא התקבל."}\n${RAZIEL_PERSONAL_TRUTH}`).slice(0, 2400) };
  }
  return null;
}

async function runRazielPersonal(desc: { capability: string }, bearer: string, uid: string, trace: OperationalTraceHandle | null): Promise<RazielOperatorResult> {
  const cap = desc.capability;
  const calls: RazielOperatorCall[] = cap === "personal_resume" ? [{ rpc: "fn_research_path_resume_v1", args: {} }]
    : cap === "personal_continue" ? [{ rpc: "research_state_snapshot_v1", args: { p_expected_user_id: uid } }, { rpc: "fn_research_path_resume_v1", args: {} }]
    : [{ rpc: "research_state_snapshot_v1", args: { p_expected_user_id: uid } }];
  const results: Awaited<ReturnType<typeof razielOperatorRpc>>[] = [];
  const spans: { spanId: string; startedAt: string; endedAt: string }[] = [];
  for (const call of calls) {
    const spanId = crypto.randomUUID(), startedAt = new Date().toISOString();
    const res = await razielOperatorRpc(bearer, call);
    results.push(res);
    spans.push({ spanId, startedAt, endedAt: new Date().toISOString() });
    if (!res.ok && call.rpc === "research_state_snapshot_v1") break;   // snapshot is required; the optional latest-path leg of personal_continue may fail
  }
  const required = results.slice(0, 1);
  const allOk = required.every((x) => x.ok);
  const proj = allOk ? razielPersonalProject(cap, results.map((x) => (x.ok ? x.data : null))) : null;
  const ok = allOk && !!proj;
  const failed = required.find((x) => !x.ok);
  const outcome = failed ? failed.outcome : (!proj ? "failed_with_reason" : "success");
  for (let i = 0; i < results.length; i++) {
    const r = results[i], call = calls[i];
    const spanOk = r.ok && ok;
    await recordOperationalSpan(trace, {
      spanId: spans[i].spanId, kind: "db_rpc", name: `ai-analyze:raziel:personal:${call.rpc}`, startedAt: spans[i].startedAt, endedAt: spans[i].endedAt,
      outcome: r.ok && !proj && allOk ? "failed_with_reason" : r.outcome,
      detail: {
        capability: `raziel_personal:${cap}`, owner_ref: RAZIEL_PERSONAL_OWNER, routing_reason: "raziel_plan_personal_research_read",
        output_use: spanOk ? "used" : "not_applicable", stop_reason: spanOk ? null : (r.error || "unusable_payload"),
        resources: { latency_ms: r.ms, api_calls: 1 },
        replay: { ownerRuleRefs: [RAZIEL_PERSONAL_OWNER], parametersRef: `rpc:${call.rpc};caller_jwt:true;read_only:true` },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
  }
  return { ok, outcome, capability: cap, owner: RAZIEL_PERSONAL_OWNER, rpc: calls.map((c) => c.rpc).join("+"), ...(proj || {}) };
}

// ── Raziel Intelligence Core v1 Phase J — on-demand READ of the CURRENT Post / Topic (Publication/Representation, NOT Fact/Canonical) ──────
// Runs only for an explicit current-surface question AND an exact slug already present in the bounded surface_semantic identity (never inferred from the
// question text, never a search). Public/anon path only (existing anon SELECT on posts + topic_cards_public) — never the service role, no new store/router/agent.
const RAZIEL_CC_BODY_MAX = 3500, RAZIEL_CC_EXCERPT_MAX = 500, RAZIEL_CC_ARR_MAX = 6;
const RAZIEL_CC_QUESTION = [
  /(?:^|\s)(?:מה|על\s+מה)\s+(?:ש?אני\s+)?(?:קורא|קוראת)(?:\s|$|[?!.])/,
  /(?:הסבר|תסביר|תסבירי|סכם|תסכם|סכמי|סיכום|תן\s+סיכום)(?:\s+לי)?(?:\s+את)?\s+(?:ה)?(?:פוסט|מאמר|דף|נושא|טופיק|כתבה)\s+(?:הזה|הזאת|הנוכחי|הנוכחית)/,
  /(?:מה|על\s+מה)\s+(?:זה\s+)?(?:ה)?(?:פוסט|מאמר|דף|נושא|טופיק|כתבה)\s+(?:הזה|הזאת|הנוכחי|הנוכחית)/,
  /\b(?:summari[sz]e|explain)\s+(?:this|the\s+current)\s+(?:post|topic|page|article)\b|\bwhat\s+(?:am\s+i\s+reading|is\s+this\s+(?:post|topic|page))\b/i,
];
const razielCcSlug = (v: unknown): string | null => typeof v === "string" && /^[\p{L}\p{N}][\p{L}\p{N}_.%-]{0,79}$/u.test(v) ? v : null;
const razielCcText = (v: unknown, n: number): string =>
  (typeof v === "string" || typeof v === "number" ? String(v) : "").slice(0, 80000)
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0*39;/g, "'")
    .replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const razielCcList = (v: unknown, n: number): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => razielCcText(x, n)).filter(Boolean).slice(0, RAZIEL_CC_ARR_MAX);

// {trigger:false} → no tool, no note. {trigger:true,kind:null} → fail closed (identity missing/mismatched). Identity comes ONLY from surface_semantic.
function razielCurrentContentDescriptor(question: unknown, sc: any): { trigger: boolean; kind: "post" | "topic" | null; slug: string | null } {
  const q = typeof question === "string" ? question.slice(0, 300) : "";
  if (!q || !RAZIEL_CC_QUESTION.some((re) => re.test(q))) return { trigger: false, kind: null, slug: null };
  const none = { trigger: true, kind: null, slug: null };
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null);
  const s = obj(sc), subj = obj(s?.subject), ctx = obj(s?.context), focus = obj(ctx?.focus), reading = obj(ctx?.reading);
  const types = new Set([subj?.type, focus?.type, focus?.entityType].filter((t) => typeof t === "string" && t).map((t) => String(t).toLowerCase()));
  if (types.size !== 1) return none;
  const kind = [...types][0];
  if (kind !== "post" && kind !== "topic") return none;
  const raw = kind === "post"
    ? [focus?.postSlug, reading?.postSlug, subj?.type === "post" ? subj?.id : null]
    : [subj?.type === "topic" ? subj?.id : null, focus?.type === "topic" ? focus?.id : null, focus?.entityType === "topic" ? focus?.entityId : null];
  const present = raw.filter((x) => x != null && x !== "");
  const slugs = new Set(present.map(razielCcSlug));
  if (slugs.size !== 1 || slugs.has(null)) return none;   // missing, malformed or conflicting identity ⇒ fail closed
  return { trigger: true, kind, slug: [...slugs][0] as string };
}

type RazielCurrentContent = { ok: boolean; kind: "post" | "topic"; outcome: string; pack?: string; bodyChars?: number; truncated?: boolean };

function razielCurrentPostProject(row: any): { pack: string; bodyChars: number; truncated: boolean } | null {
  if (!row || typeof row !== "object") return null;
  const title = razielCcText(row.title, 200), body = razielCcText(row.content, 1e6);
  if (!title && !body) return null;
  const clipped = body.slice(0, RAZIEL_CC_BODY_MAX);
  const lines = [`סוג: פוסט (פרסום/ייצוג — לא עובדה קנונית)`, `כותרת: ${title}`, `slug: ${razielCcText(row.slug, 80)}`];
  const ex = razielCcText(row.excerpt, RAZIEL_CC_EXCERPT_MAX); if (ex) lines.push(`תקציר: ${ex}`);
  const cats = razielCcList(row.categories, 40), tags = razielCcList(row.tags, 40);
  if (cats.length) lines.push(`קטגוריות: ${cats.join(", ")}`);
  if (tags.length) lines.push(`תגיות: ${tags.join(", ")}`);
  const dt = razielCcText(row.date, 30), md = razielCcText(row.modified, 30), src = razielCcText(row.source, 80);
  if (dt) lines.push(`תאריך: ${dt}`); if (md) lines.push(`עודכן: ${md}`); if (src) lines.push(`מקור: ${src}`);
  if (clipped) lines.push(`גוף (קטוע ל-${RAZIEL_CC_BODY_MAX} תווים): ${clipped}`);
  return { pack: lines.join("\n"), bodyChars: clipped.length, truncated: body.length > clipped.length };
}

function razielCurrentTopicProject(row: any): { pack: string; bodyChars: number; truncated: boolean } | null {
  if (!row || typeof row !== "object") return null;
  const title = razielCcText(row.title, 200);
  if (!title) return null;
  const nums = (v: unknown) => (Array.isArray(v) ? v : []).filter((x) => Number.isSafeInteger(x)).slice(0, RAZIEL_CC_ARR_MAX).join(", ");
  const lines = [`סוג: נושא/טופיק (פרסום/ייצוג — לא עובדה קנונית)`, `כותרת: ${title}`];
  const sub = razielCcText(row.subtitle, 200); if (sub) lines.push(`כותרת-משנה: ${sub}`);
  const n = nums(row.numbers), h = nums(row.highlight_numbers);
  if (n) lines.push(`מספרים: ${n}`); if (h) lines.push(`מספרי-הדגשה: ${h}`);
  // Source-authored public findings only: allowlisted keys, underscore-prefixed (internal) keys never read.
  const f = row.findings && typeof row.findings === "object" && !Array.isArray(row.findings) ? row.findings as Record<string, unknown> : null;
  const fl: string[] = [];
  if (f) {
    const hd = razielCcText(f.headline, 200); if (hd) fl.push(`כותרת-ממצאים: ${hd}`);
    const sm = razielCcText(f.summary, 600); if (sm) fl.push(`סיכום: ${sm}`);
    const bl = razielCcList(f.bullets, 220); if (bl.length) fl.push(`נקודות: ${bl.join(" | ")}`);
    const cv = razielCcText(f.caveat, 300); if (cv) fl.push(`הסתייגות: ${cv}`);
  }
  const body = fl.join("\n");
  const clipped = body.slice(0, RAZIEL_CC_BODY_MAX);
  if (clipped) lines.push(`ממצאים (קטוע ל-${RAZIEL_CC_BODY_MAX} תווים):\n${clipped}`);
  return { pack: lines.join("\n"), bodyChars: clipped.length, truncated: body.length > clipped.length };
}

async function runRazielCurrentContent(desc: { kind: "post" | "topic"; slug: string }, trace: OperationalTraceHandle | null): Promise<RazielCurrentContent> {
  const spanId = crypto.randomUUID(), startedAt = new Date().toISOString(), t0 = Date.now();
  const table = desc.kind === "post" ? "posts" : "topic_cards_public";
  const select = desc.kind === "post" ? "id,slug,title,excerpt,categories,tags,date,modified,source,content" : "id,slug,title,subtitle,numbers,highlight_numbers,findings";
  let outcome = "success", err: string | null = null, proj: ReturnType<typeof razielCurrentPostProject> = null;
  if (!SB_URL || !SB_ANON) { outcome = "tool_error"; err = "no_caller_credentials"; }
  else {
    try {
      // anon key only (existing public SELECT); exact slug equality; one row; no listing/search.
      const r = await fetch(`${SB_URL}/rest/v1/${table}?slug=eq.${encodeURIComponent(desc.slug)}&select=${select}&limit=1`, {
        headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) { outcome = r.status === 401 || r.status === 403 ? "access_filtered" : "tool_error"; err = `http_${r.status}`; }
      else {
        const rows = await r.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row || row.slug !== desc.slug) { outcome = "failed_with_reason"; err = "not_found"; }
        else { proj = desc.kind === "post" ? razielCurrentPostProject(row) : razielCurrentTopicProject(row); if (!proj) { outcome = "failed_with_reason"; err = "unusable_payload"; } }
      }
    } catch (e) { outcome = (e as Error)?.name === "TimeoutError" ? "timeout" : "tool_error"; err = outcome === "timeout" ? "timeout" : "fetch_failed"; }
  }
  const ok = !!proj;
  await recordOperationalSpan(trace, {
    spanId, kind: "db_rpc", name: `ai-analyze:raziel:current_surface_content:${desc.kind}`, startedAt, endedAt: new Date().toISOString(), outcome,
    detail: {
      capability: `raziel_current_surface_content:${desc.kind}`, owner_ref: "raziel_companion_layer_law v3 + project_codex.publishing_conventions", routing_reason: "raziel_current_surface_question",
      output_use: ok ? "used" : "not_applicable", stop_reason: ok ? null : err,
      resources: { latency_ms: Date.now() - t0, api_calls: 1 },
      result_refs: ok ? { kind: desc.kind, body_chars: proj!.bodyChars, truncated: proj!.truncated } : null,   // counts only — never the raw body
      replay: { ownerRuleRefs: ["project_codex.publishing_conventions"], parametersRef: `table:${table};read_only:true;anon:true` },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });
  return { ok, kind: desc.kind, outcome, ...(proj ? { pack: proj.pack, bodyChars: proj.bodyChars, truncated: proj.truncated } : {}) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let activeTrace: OperationalTraceHandle | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const engine = String(body?.engine || "claude").toLowerCase() === "gemini" ? "gemini" : "claude";
    if (engine === "claude" && !ANTHROPIC_KEY) return json({ analysis: null, engine, error: "not_configured" });
    if (engine === "gemini" && !GEMINI_KEY) return json({ analysis: null, engine, error: "not_configured" });

    const kind = String(body?.kind || "").slice(0, 40);
    const subject = String(body?.subject || "").slice(0, 300);

    // 🧭 kind="guide" — מלווה-כניסה (נתב ניווט). מסלול נפרד לגמרי מנתיב-הגימטריה:
    //    SYSTEM ייעודי, מודל מהיר (Haiku), רשימת-יעדים סגורה, פלט JSON. מכסה קלה (אנטי-לולאה).
    // 🌳 Foundation Expansion Gate (30.8.2026): קורא metatron_context({intent:"navigation"}) — סוגר את
    //    ה-STOP CONDITION הקודם בלי לשבור את חוזה-ה-JSON-הקשיח. intent="navigation" מכבה אצל
    //    metatron_context את חוקי-המערכת (fn_active_method_rules — לא רלוונטיים לניווט ומסוכנים לפורמט
    //    הקשיח) ומחזיר canonical.capabilities מ-site_services (המרשם הקנוני הקיים, אותו ש-wa-raziel
    //    servicesText() כבר קורא). ה-capabilities *מוזרקים בפועל* ל-guideUser כרקע-בלבד (כותרת+תיאור,
    //    בלי URL) — לא רק ל-context_version. SYSTEM_GUIDE ורשימת-היעדים המותרים (routes) לא נגעו —
    //    ה-"to" עדיין חייב לבוא מ-routes בדיוק. התאמת routes מול site_services (למשל "/numbers" מול
    //    "/number/:n") היא החלטת-מוצר נפרדת, לא Foundation patch; EXTENSION POINT מדווח, לא מומש כאן.
    //    fail-open מלא: guideMtx=null → guideCaps=[] → guideCapsContext="" → guideUser זהה למצב הקודם.
    if (kind === "guide") {
      if (engine !== "claude" || !ANTHROPIC_KEY) return json({ analysis: null, error: "not_configured" });
      const ask = String(body?.subject || body?.facts || "").slice(0, 400).trim();
      if (!ask) return json({ analysis: null, error: "empty" });
      const { identity, tier } = await resolveIdentity(req, body);
      if (tier === "anon" || tier === "user") {   // אנטי-לולאה בלבד, נדיב
        const q = await checkQuota(`${identity}:g`, tier, tier === "anon" ? 40 : 300);
        if (!q.allowed) return json({ analysis: null, error: "quota", surface: "guide", tier: q.tier, used: q.used, limit: q.limit,
          message: "עברת את מכסת המלווה היומית — אבל כל הכלים פתוחים לך למטה." });
      }
      activeTrace = await beginOperationalTrace({
        body,
        identityClass: tier,
        capability: "ai-analyze:guide",
        surface: "site-guide",
        ownerRef: "ai_analyze_contract v2 + system_suggestions_law v3",
        subject: "",
      });
      const guideContextSpanId = crypto.randomUUID();
      const guideContextStartedAt = new Date().toISOString();
      const guideMtx = await fetchMetatronContext(ask, ask, "site-guide", "navigation");
      const guideContextEndedAt = new Date().toISOString();
      await recordOperationalSpan(activeTrace, {
        spanId: guideContextSpanId,
        kind: "db_rpc",
        name: "metatron_context",
        startedAt: guideContextStartedAt,
        endedAt: guideContextEndedAt,
        outcome: guideMtx ? "success" : "degraded_fallback",
        detail: {
          capability: "context_compiler",
          owner_ref: "research_strategy_layer_law v15",
          output_use: guideMtx ? "used" : "rejected",
          resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(guideContextEndedAt) - Date.parse(guideContextStartedAt)) },
          cost: { certainty: "not_billable" },
          replay: { ownerRuleRefs: ["research_strategy_layer_law v15"] },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      const guideMtxVersion = guideMtx?.context_version ?? null;
      // הקשר-יכולות מ-metatron_context (site_services, לא ה-routes הקבועים) — מידע-רקע בלבד, לא רשימת-יעד:
      // כותרת+תיאור בלבד, בלי URL, כדי שהמודל לא יבלבל בין "capability" מ-metatron ל-"to" המותר מלמעלה.
      const guideCaps = Array.isArray(guideMtx?.canonical?.capabilities) ? guideMtx.canonical.capabilities : [];
      const guideCapsContext = guideCaps.length
        ? "\n\nהקשר-יכולות נוסף מהמערכת (רקע-בלבד — לא רשימת-יעדים; ה-\"to\" חייב תמיד להיות מתוך «רשימת היעדים המותרים» למעלה בדיוק):\n" +
          guideCaps.slice(0, 14).map((c: any) => `• ${c?.title || ""} — ${c?.description || ""}`).filter((l: string) => l.length > 4).join("\n")
        : "";
      const routes =
        "רשימת היעדים המותרים (to — מתי לבחור):\n" +
        "/number — יש לו מספר / שם / מילה / ביטוי קונקרטי לבדוק (מנוע החיפוש הראשי)\n" +
        "/number/1820 — סקרן «מה זה 1820» או חדש לגמרי ורוצה טעימה\n" +
        "/סוד-1820 — רוצה קודם להבין מה זה האתר בכלל (פוסט המבוא)\n" +
        "/research?tool=gematria — רוצה לחשב גימטריה במחשבון\n" +
        "/research?tool=els — דילוגי-אותיות / הצופן התנ\"כי\n" +
        "/research?tool=verse — לחפש ביטוי/ערך בתוך פסוקי התורה\n" +
        "/world — רוצה לראות התכנסויות, מקורות והקשרים בעולם המחקר\n" +
        "/research — רוצה את כל הכלים / להעמיק בלי יעד מסוים\n" +
        "/archive?tab=reality — לראות רמזים מהמציאות / חדשות\n" +
        "/join — רוצה להצטרף / להירשם / וואטסאפ / קהילה\n" +
        "/members — מנוי מתקדם (בני ההיכל)\n" +
        "/post — לקרוא מאמרים ורמזים";
      const guideUser = `${routes}${guideCapsContext}\n\nמה שהמבקר כתב: "${ask}"\n\nהחזר JSON בלבד לפי הכללים.`;
      const guideModelSpanId = crypto.randomUUID();
      const guideModelStartedAt = new Date().toISOString();
      const out = await runClaude(FAST_MODEL, guideUser, 320, SYSTEM_GUIDE);
      const guideModelEndedAt = new Date().toISOString();
      const guideModelOutcome = out.error ? "provider_error" : "success";
      await recordOperationalSpan(activeTrace, {
        spanId: guideModelSpanId,
        parentSpanId: guideContextSpanId,
        kind: "model_call",
        name: "ai-analyze:guide:model",
        startedAt: guideModelStartedAt,
        endedAt: guideModelEndedAt,
        outcome: guideModelOutcome,
        detail: {
          capability: "ai-analyze:guide",
          owner_ref: "ai_analyze_contract v2",
          intelligence_level: "fast",
          provider: "anthropic",
          model: FAST_MODEL,
          routing_reason: "guide_fast_model",
          output_use: out.error ? "not_applicable" : "used",
          stop_reason: out.error || null,
          resources: {
            input_tokens: out.usage?.input_tokens ?? null,
            output_tokens: out.usage?.output_tokens ?? null,
            api_calls: 1,
            latency_ms: Math.max(0, Date.parse(guideModelEndedAt) - Date.parse(guideModelStartedAt)),
          },
          cost: { certainty: "unknown" },
          replay: {
            ownerRuleRefs: ["ai_analyze_contract v2", "system_suggestions_law v3"],
            parametersRef: "guide:max_tokens:320",
          },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      if (out.error) {
        await finishOperationalTrace(activeTrace, guideModelOutcome, out.error);
        return json({ analysis: null, error: out.error, detail: out.detail, trace_id: activeTrace?.traceId || null });
      }
      const guideTokenLogId = await logTokens(
        "guide",
        FAST_MODEL,
        out.usage,
        identity,
        { traceId: activeTrace?.traceId, spanId: guideModelSpanId },
      );
      await linkOperationalAiCost(activeTrace, guideModelSpanId, guideTokenLogId);
      await finishOperationalTrace(activeTrace, "success");
      return json({ analysis: out.text, engine: "claude", model: FAST_MODEL, context_version: guideMtxVersion, trace_id: activeTrace?.traceId || null });
    }

    // ===== 🌳 persona="raziel" — המוח-המשותף (רזיאל באתר = רזיאל בוואטסאפ) =====
    // מחזיר את חוזה raziel_response_contract (v1). קול+זיכרון ממקור-האמת היחיד. תאימות-לאחור:
    // אם המודל לא החזיר JSON תקין — נופל למחרוזת {analysis} והפרונט עוטף כ-{answer}.
    if (String(body?.persona || "").toLowerCase() === "raziel") {
      if (engine !== "claude" || !ANTHROPIC_KEY) return json({ analysis: null, error: "not_configured" });
      const rFacts = String(body?.facts || "").slice(0, 3500);
      const rSubject = subject;
      const rPath = String(body?.path || "").slice(0, 40);
      const rCtxHint = String(body?.context || "").slice(0, 600);
      const rAgain = !!body?.again;
      // 🧭 Advanced-mode gate — opt-in only (RAZIEL_ADVANCED_NUMBER_PAGE_v0). Absent/false → every line
      // below this block behaves exactly as before (rMode false ⇒ no plan, no surface block, kind="raziel").
      const rMode = String(body?.mode || "").toLowerCase() === "advanced";
      const rSurface = String(body?.surface || "").slice(0, 40);
      const rSurfaceCtx = rMode && body?.surface_context && typeof body.surface_context === "object" ? body.surface_context : null;
      if (!rSubject && !rFacts) return json({ analysis: null, error: "empty" });

      // 🧠 5B — deterministic-first (תלוי הגדרה פעילה, לא קבוע בקוד). fail-open מלא.
      //    כשההגדרה הפעילה מחזירה mode=deterministic ללא צורך בסינתזה — התשובה מהמנוע הדטרמיניסטי
      //    (fn_raziel_answer), Claude לא נקרא ואין צריכת-מכסה; אחרת נופל למסלול Claude שלמטה.
      let rPlanMeta: Record<string, unknown> | null = null;   // Phase B — reused plan (non-authoritative)
      // Phase C: identity is resolved ONCE, BEFORE planning, from the validated JWT (never a client flag). The same result
      // feeds the quota check below (no duplicate lookup). context_type/user_ref passed to the plan are derived from it.
      const rTrusted = await resolveTrustedChannel(req, body);   // null unless an internal service-role request carries trusted_channel (never client-spoofable)
      const { identity, tier } = rTrusted ? { identity: rTrusted.identity, tier: rTrusted.tier } : await resolveIdentity(req, body);
      const rCtxType = razielContextFromTier(tier);
      const rVerifiedRef = identity.startsWith("u:") ? identity.slice(2) : null;
      const rBearer = tier === "admin" && !rTrusted ? (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim() : "";
      const rUserBearer = !rTrusted && (tier === "user" || tier === "admin") ? (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim() : "";   // trusted channel carries the service key, never forwarded as a user JWT   // Phase L: same validated caller JWT
      let rPersDesc: { capability: string } | null = null;   // Phase L
      let rPersPack = "";
      let rOpDesc: { capability: string; days: number | null } | null = null;
      let rCoordDesc: { capability: string; days: number | null } | null = null;   // Phase K
      let rToolRes: RazielToolResearch | null = null;
      let rDet: any = null;   // Phase H: the fn_raziel_answer result (descriptor source for number_context)
      // Multimodal source stage FIRST (trusted internal path only). When a source is attached, caption/subject words never fall
      // straight into deterministic gematria/ELS routing — the visual read is a derivative and numeric research is user-driven later.
      let rSource: { ok: boolean; text: string; mime: string | null; reason: string | null } | null = null;
      if (rTrusted?.media && rTrusted.uid) rSource = await razielSourceStage(rTrusted.uid, rTrusted.media);
      try {
        if (rSubject && SB_URL && SB_SVC && !rTrusted?.media) {
          const detR = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_answer`, {
            method: "POST", headers: svcHeaders(),
            body: JSON.stringify({ p_question: rSubject, p_context_type: rCtxType, p_user_ref: rVerifiedRef, p_visitor: String(body?.visitor_id || "") }),
          });
          if (detR.ok) {
            const det = await detR.json();
            rPlanMeta = razielPlanMeta(det);
            rOpDesc = razielOperatorDescriptor(det, tier);   // admin-verified + flag-enabled + allowlisted capability only
            rCoordDesc = razielCoordDescriptor(det, tier);   // Phase K: admin-verified coordination/attention capability only
            rPersDesc = rTrusted ? null : razielPersonalDescriptor(det, tier, rVerifiedRef);   // Phase L: authenticated + verified uid + enabled + allowlisted capability only
            rToolRes = razielToolResearch(det);               // Phase E: deterministic Gematria+ELS already executed in the DB
            rDet = det;
            if (!rPlanMeta && !(det && det.mode === "deterministic")) {
              // flag/disabled answer carries no plan → reuse the existing read-only fn_raziel_plan
              try {
                const pR = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_plan`, {
                  method: "POST", headers: svcHeaders(),
                  body: JSON.stringify({ p_question: rSubject, p_context_type: rCtxType, p_user_ref: rVerifiedRef }),
                });
                if (pR.ok) rPlanMeta = razielPlanMeta(await pR.json());
              } catch { /* fail-open: no plan block */ }
            }
            if (det && det.enabled === true && det.mode === "deterministic" && det.needs_synthesis === false) {
              const dFacts = Array.isArray(det.facts) ? det.facts.map((f: any) => ({ label: f.label, value: f.value })) : [];
              return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: det.answer || "",
                facts: dFacts, suggested_paths: [], follow_up_question: null, continue_wa: true,
                deterministic: true, source_of_truth: det.source_of_truth || null, trace: det.trace || null,
                // Phase F: bounded tanakh_source contract (count/books/first/last/samples) passes through verbatim; no model call.
                source_result: det.intent === "tanakh_source" && det.source_result ? det.source_result : null },
                engine: "deterministic", model: "none", intelligence_level: "deterministic" });
            }
            // Phase F: unsupported source phrase / no clean subject → fail closed with the deterministic clarification (no model, no guess).
            if (det && det.enabled === true && det.mode === "needs_clarification" && det.intent === "tanakh_source" && det.needs_synthesis === false) {
              const msg = [det.reason, det.recommendation].filter((s: unknown) => typeof s === "string" && s).join(" ");
              return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: msg,
                facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true,
                deterministic: true, source_of_truth: null, trace: det.trace || null, source_result: null },
                engine: "deterministic", model: "none", intelligence_level: "deterministic" });
            }
          }
        }
      } catch { /* fail-open → מסלול Claude הישן */ }

      // Phase D — minimum-sufficient intelligence (raziel_routing_law v2). intelligence_level=fast/deep is a USER REQUEST, not
      //    authority: explicit deep may raise to ≥L3; explicit fast never lowers below the plan minimum. Selection uses semantic
      //    plan metadata only (never tier/admin/length). L2_FAST→FAST_MODEL, L3_DEEP→MODEL. Decided AFTER the deterministic path
      //    (0 tokens) and before quota/model. Smart routing stays OFF — this reads existing plan metadata only.
      if (rToolRes) rPlanMeta = { ...(rPlanMeta || {}), tool_research_executed: true, tool_research_status: rToolRes.status,
        tool_research_capabilities: rToolRes.tools.map((t) => t.capability) };
      const rSel = selectRazielIntelligence({ plan: rPlanMeta, requested: body?.intelligence_level });
      // Tool research: synthesis over verified tool outputs always uses the existing deep mapping (never tier/request driven).
      const rFast = rSel.selected_level === RAZIEL_LEVELS.L2 && !rToolRes;
      const rLevel = rFast ? "fast" : "deep";
      const rModel = rFast ? FAST_MODEL : MODEL;
      const rSelMeta = { requested_level: rSel.requested_level, selected_level: rSel.selected_level, escalation_reason: rSel.escalation_reason,
        ...(rToolRes ? { selected_level: RAZIEL_LEVELS.L3, semantic_level: RAZIEL_TOOL_LEVEL, synthesis_intelligence: RAZIEL_LEVELS.L3, escalation_reason: "tool_research_synthesis" } : {}) };
      // מכסת-AI (ai_quota_law v3) — מהיר: אותו דפוס-מכסה מהיר הקיים (זהות :f · אנונימי 30 · מחובר 200 · אדמין ∞);
      //    עמוק: מסלול המכסה הרגיל/עמוק הקיים (3/15/100/אדמין ∞ לפי ai_quota_check).
      const rBudgetIdentity = rFast && (tier === "anon" || tier === "user") ? `${identity}:f` : identity;
      const rLimitOverride = rFast ? (tier === "anon" ? 30 : tier === "user" ? 200 : null) : null;
      const q = await checkQuota(rBudgetIdentity, tier, rLimitOverride);
      if (!q.allowed) {
        return json({ analysis: null, error: "quota", surface: "raziel", intelligence_level: rLevel, tier: q.tier, used: q.used, limit: q.limit,
          message: rFast ? "הגעת למכסת השיחות המהירות עם רזיאל להיום. המכסה מתחדשת מחר." : "הגעת למכסת שיחות-רזיאל המעמיקות להיום. המכסה מתחדשת מחר." });
      }

      const userRef = rVerifiedRef;  // זיכרון = למשתמש מזוהה בלבד

      // 🚧 סגור לבדיקות (closed beta) — רק mode="advanced", רק לשני החשבונות באלוולט. שאר הבקשות
      // (כולל אנונימי) מקבלות תשובת "בבנייה" נעימה בלי לצרוך Claude/מכסה. מסלול-רזיאל הרגיל לא מושפע.
      if (rMode && !(userRef && RAZIEL_ADVANCED_ALLOWLIST.has(userRef))) {
        return json(RAZIEL_ADVANCED_GATED_RESPONSE);
      }

      activeTrace = await beginOperationalTrace({
        body,
        identityClass: tier,
        capability: rMode ? "ai-analyze:raziel:advanced" : "ai-analyze:raziel",
        surface: rSurface || "raziel-site",
        ownerRef: "raziel_companion_layer_law + ai_analyze_contract v2",
        subject: rSubject,
      });

      // Phase C — operator READ (admin only). L0 questions answer straight from the owner projection (no model, no tokens);
      // broad questions get a bounded owner pack for the existing L2_FAST synthesis. Any failure → no admin data, ordinary synthesis.
      let rOpPack = "";
      if (rOpDesc) {
        const op = await runRazielOperator(rOpDesc, rBearer, activeTrace);
        const opMeta = { capability: op.capability, owner: op.owner, outcome: op.outcome, basis: op.basis ?? null };
        rPlanMeta = { ...(rPlanMeta || {}), operator: opMeta, operator_executed: op.ok };
        if (op.ok && op.answer) {
          await finishOperationalTrace(activeTrace, "success");
          return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: op.answer,
            facts: op.facts || [], suggested_paths: [], follow_up_question: null, continue_wa: true,
            deterministic: true, source_of_truth: `${op.owner} · ${op.rpc}`, basis: op.basis, operator: opMeta },
            engine: "deterministic", model: "none", intelligence_level: "deterministic", plan_meta: rPlanMeta, trace_id: activeTrace?.traceId || null });
        }
        if (op.ok && op.pack) rOpPack = op.pack;
      }

      // Phase K — coordination / attention READ (admin only): same discipline as Phase C, projections bounded + labeled COORDINATION_REPORTED.
      if (!rOpDesc && rCoordDesc) {
        const op = await runRazielCoordination(rCoordDesc, rBearer, activeTrace);
        const opMeta = { capability: op.capability, owner: op.owner, outcome: op.outcome, basis: op.basis ?? null };
        rPlanMeta = { ...(rPlanMeta || {}), operator: opMeta, operator_executed: op.ok };
        if (op.ok && op.answer) {
          await finishOperationalTrace(activeTrace, "success");
          return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: op.answer,
            facts: op.facts || [], suggested_paths: [], follow_up_question: null, continue_wa: true,
            deterministic: true, source_of_truth: `${op.owner} · ${op.rpc}`, basis: op.basis, operator: opMeta },
            engine: "deterministic", model: "none", intelligence_level: "deterministic", plan_meta: rPlanMeta, trace_id: activeTrace?.traceId || null });
        }
        if (op.ok && op.pack) rOpPack = op.pack;
      }

      // Phase L — personal research continuity READ (authenticated only): caller JWT + the uid validated from it; L0 answers without a model; projection bounded + labeled PERSONAL_RESEARCH_STATE.
      if (!rOpDesc && !rCoordDesc && rPersDesc && rVerifiedRef) {
        const op = await runRazielPersonal(rPersDesc, rUserBearer, rVerifiedRef, activeTrace);
        const opMeta = { capability: op.capability, owner: op.owner, outcome: op.outcome, basis: op.basis ?? null };
        rPlanMeta = { ...(rPlanMeta || {}), personal: opMeta, personal_executed: op.ok };
        if (op.ok && op.answer) {
          await finishOperationalTrace(activeTrace, "success");
          return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: op.answer,
            facts: op.facts || [], suggested_paths: [], follow_up_question: null, continue_wa: true,
            deterministic: true, source_of_truth: `${op.owner} · ${op.rpc}`, basis: op.basis, personal: opMeta },
            engine: "deterministic", model: "none", intelligence_level: "deterministic", plan_meta: rPlanMeta, trace_id: activeTrace?.traceId || null });
        }
        if (op.ok && op.pack) rPersPack = op.pack;
      }

      // Phase E — one operational db_rpc/tool span per deterministic protocol (already executed in fn_raziel_answer; no re-run here).
      //    output_used + failures preserved per tool; a partial result is explicit, never filled in.
      if (rToolRes) {
        const nowMs = Date.now();
        for (const t of rToolRes.tools) {
          const okT = t.status === "ok";
          const endedAt = new Date(nowMs).toISOString();
          await recordOperationalSpan(activeTrace, {
            spanId: crypto.randomUUID(), kind: "db_rpc", name: `ai-analyze:raziel:tool:${t.capability}`,
            startedAt: new Date(nowMs - Math.max(0, Math.round(t.ms ?? 0))).toISOString(), endedAt,
            outcome: okT ? "success" : "failed_with_reason",
            detail: {
              capability: `raziel_tool:${t.capability}`,
              owner_ref: t.capability === "tanakh_source" ? "raziel_routing_law v2 + corpus_admission_foundation_v1" : "raziel_routing_law v2 + research_strategy_layer_law v17",
              routing_reason: "raziel_plan_multi_domain_tool_research", semantic_level: RAZIEL_TOOL_LEVEL,
              output_use: okT ? "used" : "not_applicable", stop_reason: okT ? null : (t.error || t.status),
              resources: { latency_ms: t.ms, api_calls: 1 },
              replay: { ownerRuleRefs: ["raziel_routing_law v2"], parametersRef: `rpc:fn_raziel_protocol;intent:${t.capability};read_only:true` },
              privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
            },
          });
        }
      }

      // Phase H — reality_number_context. Anchor comes from the plan (explicit / verified gematria dependency) or the bounded surface root; no anchor ⇒ no tool.
      //    L0 (listing/counts) answers straight from the owner projections (no model, no tokens); synthesis gets a bounded pack. Failure ⇒ ordinary synthesis, no claims.
      let rNcPack = "";
      const rNcDesc = razielNumberContextDescriptor(rDet, body?.surface_semantic);
      if (rDet && rDet.availability === "number_context") rPlanMeta = { ...(rPlanMeta || {}), number_context_executed: false };
      if (rNcDesc) {
        const nc = await runRazielNumberContext(rNcDesc, activeTrace);
        rPlanMeta = { ...(rPlanMeta || {}), number_context_executed: nc.ok, number_context: { number: nc.number, anchor: nc.anchor, outcome: nc.outcome } };
        if (nc.ok && rNcDesc.mode === "deterministic" && !rToolRes && nc.answer) {
          await finishOperationalTrace(activeTrace, "success");
          return json({ raziel: { v: 1, agent: "raziel", context: null, greeting: null, answer: nc.answer, facts: nc.facts || [], suggested_paths: [],
            follow_up_question: null, continue_wa: true, deterministic: true,
            source_of_truth: "reality_graph_law v8 · number_map + number_dossier_json", number_context: { number: nc.number, anchor: nc.anchor, counts: nc.counts } },
            engine: "deterministic", model: "none", intelligence_level: "deterministic", plan_meta: rPlanMeta, trace_id: activeTrace?.traceId || null });
        }
        if (nc.ok && nc.pack) rNcPack = nc.pack;
      }

      // Phase J — current Post/Topic content READ. Explicit current-surface question + exact slug in surface_semantic only; identity missing/mismatched ⇒ fail closed (no tool).
      let rCcPack = "";
      const rCcDesc = razielCurrentContentDescriptor(rSubject, body?.surface_semantic);
      if (rCcDesc.trigger) {
        if (rCcDesc.kind && rCcDesc.slug) {
          const cc = await runRazielCurrentContent({ kind: rCcDesc.kind, slug: rCcDesc.slug }, activeTrace);
          rPlanMeta = { ...(rPlanMeta || {}), current_content_read: { kind: cc.kind, ok: cc.ok, outcome: cc.outcome } };
          rCcPack = cc.ok && cc.pack ? cc.pack : "";
          if (!cc.ok) rCcPack = "UNAVAILABLE";
        } else {
          rPlanMeta = { ...(rPlanMeta || {}), current_content_read: { kind: null, ok: false, outcome: "identity_unavailable" } };
          rCcPack = "UNAVAILABLE";
        }
      }

      const [persona, ctx] = await Promise.all([
        fetchRazielPersona(rTrusted ? "wa" : "site"),
        userRef ? fetchRazielContext(userRef, rTrusted ? "wa" : "site") : Promise.resolve(null),
      ]);
      // Source focus: an attached source is answered from the source + current ask only; personal memory joins only on an explicit continuity cue.
      const ctxText = rTrusted?.media && !rTrusted.continuity ? "" : razielContextText(ctx);

      // 🌳 מטטרון בתוך רזיאל — Single-Mind Trunk Closure (30.8.2026): מנדטורי, לא opt-in. חוקי-המערכת
      //    החיים נכנסים לפרסונה, והקשר-הגרף (הגדרות/התכנסויות/צמתים) לעובדות, בכל תשובת-רזיאל (אתר=וואטסאפ,
      //    אותו דפוס). fail-open מלא: כשל/ריק ב-metatron_context → rzSys=persona בדיוק כמו קודם.
      let rzSys = persona;
      let rzMtxFacts = "";
      let rzMtxVersion: unknown = null;
      if (rSubject) {
        const mtx = await fetchMetatronContext(rSubject, rSubject, "site-raziel");
        if (mtx) { rzSys = persona + metatronRulesBlock(mtx); rzMtxFacts = metatronFactsBlock(mtx); rzMtxVersion = mtx.context_version ?? null; }
      }

      // 🧭 Research Plan v0 (advanced-only, deterministic, zero DB writes) — FAIL-OPEN: any throw
      // falls back to a plain Number-strategy plan rather than blocking the response.
      let rPlan: Record<string, unknown> | null = null;
      if (rMode) {
        try { rPlan = buildRazielPlanV0({ hasSubject: !!rSubject, hasUserRef: !!userRef, hasPath: !!rPath }); }
        catch { rPlan = RAZIEL_PLAN_FALLBACK; }
      }
      const surfaceText = rMode ? razielSurfaceContextText(rSurfaceCtx) : "";
      // Phase B: bounded semantic surface (any persona=raziel request) + non-authoritative plan block.
      const semText = razielSemanticSurfaceText(body?.surface_semantic);
      const planText = razielPlanBlockText(rPlanMeta) + (rPersPack
        ? "\n\nמצב-מחקר אישי של המשתמש (קריאה-בלבד מהבעלים עם ה-JWT שלו; PERSONAL_RESEARCH_STATE — לא עובדה/קנוני; המלץ להמשך רק על בסיס הפריטים כאן, אל תמציא פריטים ואל תחשב):\n" + rPersPack
        : "") + (rOpPack
        ? "\n\nנתוני-מפעיל (קריאה-בלבד ממקור הבעלים, אומתו כאדמין; השתמש רק במספרים כאן, אל תמציא ואל תחשב מעבר; שמור על תוויות EXACT/ESTIMATED/UNKNOWN):\n" + rOpPack
        : "");

      const toolText = (rToolRes ? rToolRes.text : "") + (rNcPack
        ? "\n\nהקשר-מספר באתר (קריאה-בלבד מ-number_map + number_dossier_json; נוכחות קשת = ראיית-קשר ולא פירוש; השתמש רק בפריטים כאן, אל תמציא פוסטים/טופיקים/מספרים, אל תחשב; ללא גוף-פוסט):\n" + rNcPack
        : "") + (rCcPack === "UNAVAILABLE"
        ? "\n\nתוכן הדף הנוכחי אינו זמין כרגע (אין זהות-משטח מדויקת או שהקריאה נכשלה) — אל תמציא ואל תנחש תוכן; אמור זאת בקצרה וענה כרגיל."
        : rCcPack
        ? "\n\nתוכן הדף הנוכחי (קריאה-בלבד, פרסום/ייצוג — לא עובדה קנונית ולא ראיה; סכם/הסבר רק מה שכתוב כאן, אל תחשב מספרים ואל תוסיף טענות; אל תצטט את הגוף במלואו):\n" + rCcPack
        : "");
      const sourceText = rTrusted?.media
        ? (rSource?.ok
          ? "\n\nניתוח-מקור חזותי (נגזרת-מכונה מהמקור הפרטי ששלח המשתמש; המקור עצמו נשמר כ-provenance פרטי וממתין למודרציה — אינו עובדה, אינו קנוני ואינו פורסם; ייתכנו טעויות קריאה. אל תחשב גימטריה ואל תציג ערכים לטקסט הזה; אפשר להציע לבדוק מילה מסוימת אם המשתמש מעוניין. בתשובה הפרד בבהירות בין: מה שנקרא בבירור מהמקור, קריאה לא בטוחה, ופרשנות שלך; אל תציג כוודאי דבר שסומן [לא בטוח]/[לא קריא]. פנה למשתמש בלשון ניטרלית — אל תקרא לו בשם ואל תסיק שם מטקסט המקור או מזיכרון; התמקד במקור ובשאלה הנוכחית בלבד. ענה בטקסט טבעי קצר בתוך שדה answer):\n" + rSource.text + "\n"
          : "\n\nהמשתמש שלח מקור (תמונה/מסמך) ונשמר פרטית וממתין למודרציה, אך קריאתו החזותית לא זמינה כרגע — אמור זאת בקצרה, אל תמציא תוכן ואל תנחש מה כתוב.\n")
        : "";
      const user =
        (rSubject ? `הנושא הנוכחי: ${rSubject}\n` : "") +
        (rFacts ? `\nעובדות מאומתות מהמנוע (השתמש רק באלה, שבץ אותן ב-facts[]):\n${rFacts}\n` : "\n(לא סופקו עובדות-מנוע — אל תמציא ערכים; ענה על המשמעות והצע כיוון.)\n") +
        rzMtxFacts +
        surfaceText +
        semText +
        planText +
        toolText +
        sourceText +
        (rPath ? `\nהמשתמש בחר את מסלול-המחקר: "${rPath}". ענה עליו ב-answer, והצע 0-2 מסלולי-המשך חדשים.\n` : "") +
        (rCtxHint ? `\nהקשר-הגעה: ${rCtxHint}\n` : "") +
        (rAgain ? "\nזו בקשה לקריאה *נוספת* — הבא זווית/רובד אחר ממה שכבר נאמר.\n" : "") +
        ctxText +
        (rTrusted ? whatsappSurfaceProfileText(rTrusted.depth) : "") +
        `\n\nכתוב את מענה-רזיאל לפי חוקי הברזל והחוזה. החזר JSON בלבד.`;

      const razielModelSpanId = crypto.randomUUID();
      const razielModelStartedAt = new Date().toISOString();
      // מעטפת-reliability הקנונית (retry/timeout/backoff) — רק לקריאת-המודל של persona=raziel. never_silent:
      //    ה-guardian מחזיר JSON חוקי לפי חוזה-התשובה של רזיאל (לעולם לא null/ריק).
      const rel = await callClaudeReliable({
        apiKey: ANTHROPIC_KEY, model: rModel, system: rzSys, user, maxTokens: 1600,
        buildFallback: (reason) => JSON.stringify({
          v: 1, agent: "raziel", context: null, greeting: null,
          answer: reason === "timeout" || reason === "overload"
            ? "אני עמוס לרגע ולא הצלחתי לחשוב על זה עד הסוף — נסה שוב בעוד רגע. 🌳"
            : "לא הצלחתי לענות על זה כרגע — נסה לנסח שוב או נסה שוב בעוד רגע. 🌳",
          facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true, degraded: true,
        }),
      });
      const out = { text: rel.text, usage: rel.usage };
      const razielModelEndedAt = new Date().toISOString();
      const razielModelOutcome = rel.degraded ? "provider_error" : "success";
      await recordOperationalSpan(activeTrace, {
        spanId: razielModelSpanId,
        kind: "model_call",
        name: "ai-analyze:raziel:model",
        startedAt: razielModelStartedAt,
        endedAt: razielModelEndedAt,
        outcome: razielModelOutcome,
        detail: {
          capability: rMode ? "ai-analyze:raziel:advanced" : "ai-analyze:raziel",
          owner_ref: "raziel_companion_layer_law + ai_analyze_contract v2",
          intelligence_level: rLevel,
          ...rSelMeta,
          provider: "anthropic",
          model: rModel,
          routing_reason: rMode ? "raziel_advanced" : "raziel_default",
          plan: rPlanMeta,
          tool_research: rToolRes ? { status: rToolRes.status, tools: rToolRes.tools.map((t) => ({ capability: t.capability, status: t.status })) } : null,
          semantic_surface: !!semText,
          output_use: rel.degraded ? "fallback_guardian" : "used",
          stop_reason: rel.degraded ? rel.reason : null,
          resources: {
            input_tokens: out.usage?.input_tokens ?? null,
            output_tokens: out.usage?.output_tokens ?? null,
            api_calls: rel.attempts,
            latency_ms: Math.max(0, Date.parse(razielModelEndedAt) - Date.parse(razielModelStartedAt)),
          },
          cost: { certainty: "unknown" },
          replay: {
            ownerRuleRefs: ["raziel_companion_layer_law", "ai_analyze_contract v2"],
            parametersRef: `raziel:max_tokens:1600;level:${rLevel};mode:${rMode ? "advanced" : "baseline"}`,
            continuationRef: rAgain ? safeTraceUuid(body?.interaction_id) : null,
          },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      if (rel.degraded) await finishOperationalTrace(activeTrace, razielModelOutcome, rel.reason || "degraded");
      // 📊 Telemetry — Advanced Raziel is distinguishable from the baseline "raziel" kind (and from
      // generic AI Analysis, logged under kind="number"/etc. elsewhere) using the existing ai_token_log
      // primitive only — no new analytics table. A path/again request on an advanced call is logged as
      // a distinct "…_followup" kind so a deeper-research action can be told apart from the first ask.
      const rzKind = rMode ? (rPath || rAgain ? `raziel_advanced_followup:${rSurface || "number_page"}` : `raziel_advanced:${rSurface || "number_page"}`) : "raziel";
      const razielTokenLogId = await logTokens(
        rzKind,
        rModel,
        out.usage,
        identity,
        { traceId: activeTrace?.traceId, spanId: razielModelSpanId },
      );
      await linkOperationalAiCost(activeTrace, razielModelSpanId, razielTokenLogId);
      // כתיבת-זיכרון (fire-and-forget) — אותו fn_raziel_remember של הוואטסאפ.
      if (userRef && rSubject && !rTrusted) { try { await razielRemember(userRef, "site", rSubject, rSubject.slice(0, 80)); } catch { /* noop */ } }   // WA adapter already remembers inbound DMs

      const contract = parseContract(out.text || "");
      if (contract) {
        contract.v = 1; contract.agent = "raziel";
        if (rTrusted?.media) contract.source_stage = { executed: true, ok: !!rSource?.ok, reason: rSource?.reason ?? null, derivative: true, moderation: "pending" };   // additive; numeric routing skipped for attached sources
        contract.intelligence_selection = rSelMeta;      // Phase D — additive: requested/selected/escalation_reason
        if (rPlanMeta) contract.plan_meta = rPlanMeta;   // additive — lets Explain-Why say why L0 vs L2
        if (contract.continue_wa == null) contract.continue_wa = true;
        // Advanced-only additive fields — never present on the baseline persona="raziel" response,
        // so existing consumers (which don't read them) are unaffected. Debug/telemetry only; the
        // truth law still holds — plan/context_sources describe HOW the answer was built, not facts.
        if (rMode) {
          contract.plan = rPlan;
          contract.context_sources = { canonical: !!rzMtxVersion, personal: !!(userRef && ctx), surface: !!surfaceText };
        }
        if (!rel.degraded) await finishOperationalTrace(activeTrace, "success");
        return json({ raziel: contract, engine: "claude", model: rModel, intelligence_level: rLevel, intelligence_selection: rSelMeta, degraded: rel.degraded || undefined, context_version: rzMtxVersion, trace_id: activeTrace?.traceId || null });
      }
      // נפילה-בחן: מחרוזת → הפרונט עוטף כ-{answer}.
      if (!rel.degraded) await finishOperationalTrace(activeTrace, "success");
      return json({ analysis: out.text, engine: "claude", model: rModel, intelligence_level: rLevel, intelligence_selection: rSelMeta, plan_meta: rPlanMeta || undefined, degraded: rel.degraded || undefined, context_version: rzMtxVersion, trace_id: activeTrace?.traceId || null });
    }

    const isCollection = kind === "research";
    const facts = String(body?.facts || "").slice(0, isCollection ? 3500 : 2000);
    const again = !!body?.again;
    if (!subject && !facts) return json({ analysis: null, engine, error: "empty" });

    // 📏 מכסת-AI (ai_quota_law) — רק ה-AI *העמוק* (Sonnet, ברירת-מחדל) תחת מכסת 3/יום.
    // ה-AI המהיר (fast=Haiku, דפי-מספר/מחשבון) = מסלול-חינם נדיב (אנטי-לולאה בלבד).
    // מסר-המסע (journey-message) לא עובר כאן כלל → נשאר חינם.
    const isDeep = !body?.fast;
    const { identity, tier } = await resolveIdentity(req, body);
    if (kind === "contact_triage" && tier !== "admin") {
      return json({ analysis: null, engine, error: "forbidden" }, 403);
    }
    activeTrace = await beginOperationalTrace({
      body,
      identityClass: tier,
      capability: `ai-analyze:${kind || "analyze"}`,
      surface: String(body?.surface || "ai-analyze"),
      ownerRef: "system_suggestions_law v3 + ai_analyze_contract v2",
      subject,
    });

    // G3 server-authoritative execution gate: availability + entitlement + budget
    // are resolved together on the server before any model call. The server caller
    // supplies policy inputs; final G5 allocation/pricing is deliberately not owned here.
    const gateSpanId = crypto.randomUUID();
    const gateStartedAt = new Date().toISOString();
    const verifiedUserRef = identity.startsWith("u:") ? identity.slice(2) : null;
    const verifiedVisitor = identity.startsWith("v:") ? identity.slice(2) : null;
    const budgetIdentity = !isDeep && (tier === "anon" || tier === "user") ? `${identity}:f` : identity;
    const budgetLimitOverride = isDeep ? null : tier === "anon" ? 30 : tier === "user" ? 200 : null;
    const gate = await traceRpc("fn_capability_execution_gate_v1", {
      p_capability: `ai-analyze:${kind || "analyze"}`,
      p_flag_key: null,
      p_required_entitlement: "public",
      p_user_ref: verifiedUserRef,
      p_visitor: verifiedVisitor,
      p_identity: budgetIdentity,
      p_budget_kind: "ai_quota",
      p_budget_tier: tier,
      p_budget_limit_override: budgetLimitOverride,
    });
    const gateEndedAt = new Date().toISOString();
    const gateAllowed = gate?.allowed === true;

    await recordOperationalSpan(activeTrace, {
      spanId: gateSpanId,
      kind: "db_rpc",
      name: "fn_capability_execution_gate_v1",
      startedAt: gateStartedAt,
      endedAt: gateEndedAt,
      outcome: !gate ? "failed_with_reason" : gateAllowed ? "success" : "access_filtered",
      detail: {
        capability: `ai-analyze:${kind || "analyze"}`,
        owner_ref: "site_flags_lock_law v3 + platform_tiers_law v4 + ai_quota_law v3",
        output_use: "not_applicable",
        stop_reason: !gate ? "gate_unavailable" : gateAllowed ? null : "gate_denied",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(gateEndedAt) - Date.parse(gateStartedAt)) },
        cost: { certainty: "not_billable" },
        replay: { ownerRuleRefs: ["site_flags_lock_law v3", "platform_tiers_law v4", "ai_quota_law v3"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });

    // Unlike trace persistence, the execution gate is a safety boundary and fails closed.
    if (!gate) {
      await finishOperationalTrace(activeTrace, "failed_with_reason", "gate_unavailable");
      return json({
        analysis: null,
        engine,
        error: "gate_unavailable",
        message: "בדיקת הגישה והתקציב אינה זמינה כרגע. נסו שוב בעוד רגע.",
        trace_id: activeTrace?.traceId || null,
      }, 200);
    }

    if (!gateAllowed) {
      const availabilityAllowed = gate?.availability?.allowed !== false;
      const entitlementAllowed = gate?.entitlement?.allowed !== false;
      const budgetAllowed = gate?.budget?.allowed !== false;
      const gateError = !availabilityAllowed ? "availability" : !entitlementAllowed ? "entitlement" : !budgetAllowed ? "quota" : "access";
      await finishOperationalTrace(activeTrace, "access_filtered", gateError);

      if (gateError === "quota") {
        const q = gate?.budget || {};
        return json({
          analysis: null,
          error: "quota",
          surface: isDeep ? "deep" : "fast",
          tier: q.tier || tier,
          used: q.used ?? null,
          limit: q.limit ?? null,
          message: isDeep
            ? "הגעת ל-2 ניתוחי-ה-AI המעמיקים שלך להיום. הניתוח המהיר עדיין פתוח — והמכסה המעמיקה מתחדשת מחר."
            : tier === "anon"
              ? "הגעת למכסת ה-AI המהיר היומית (נדיבה). הירשמו בחינם להמשך חלק ולשמירת ההיסטוריה."
              : "הגעת למכסת ה-AI המהיר היומית. המכסה מתחדשת מחר.",
          trace_id: activeTrace?.traceId || null,
        });
      }

      return json({
        analysis: null,
        error: gateError,
        message: gateError === "availability"
          ? (gate?.availability?.message || "היכולת אינה זמינה כרגע.")
          : "הגישה ליכולת הזו אינה זמינה לחשבון הנוכחי.",
        trace_id: activeTrace?.traceId || null,
      }, 200);
    }

    // G3 Replayable Golden: the existing ai-analyze path now emits an explicit
    // bounded Research/Action Plan span. This is trace/provenance only: it does not
    // create a second planner/router or change tool/model selection.
    const planSpanId = crypto.randomUUID();
    const planRef = `ai-analyze-plan-v1:${kind || "analyze"}:${isDeep ? "deep" : "fast"}`;
    const planStartedAt = new Date().toISOString();
    const planEndedAt = new Date().toISOString();
    await recordOperationalSpan(activeTrace, {
      spanId: planSpanId,
      parentSpanId: gateSpanId,
      kind: "router_plan",
      name: "ai-analyze:research-plan",
      startedAt: planStartedAt,
      endedAt: planEndedAt,
      outcome: "success",
      detail: {
        capability: `ai-analyze:${kind || "analyze"}`,
        owner_ref: "research_strategy_layer_law v15 + ai_analyze_contract v2",
        plan_ref: planRef,
        routing_reason: "minimum_sufficient_intelligence",
        output_use: "used",
        resources: { latency_ms: Math.max(0, Date.parse(planEndedAt) - Date.parse(planStartedAt)) },
        cost: { certainty: "not_billable" },
        replay: {
          inputRef: /^\d{1,18}$/.test(subject) ? `number:${subject}` : null,
          ownerRuleRefs: ["research_strategy_layer_law v15", "ai_analyze_contract v2", "system_suggestions_law v3"],
          parametersRef: `kind:${kind || "analyze"};depth:${isDeep ? "deep" : "fast"}`,
          searchBoundsRef: "metatron_context->model->synthesis",
          idempotencyKey: safeTraceUuid(body?.interaction_id),
        },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    let contextSpanId = planSpanId;

    // ✨ ניתוח עמוק ממוזג ארוך (החלטת צוריאל 14.7): כשהלקוח שולח long=true — אין תקרת-משפטים,
    //    והתקציב מורם. אינרטי לגמרי בלי הדגל (לקוח ישן → התנהגות זהה להיום).
    const wantLong = !!body?.long;
    const hint = KIND_HINT[kind] || "ניתוח כללי של הנתון שסופק.";
    const lengthRule = wantLong
      ? "כתוב ניתוח מלא ומעמיק — אין הגבלת אורך. פְּתח במשמעות חמה וישירה, ואז העמק ושזור את ההתכנסויות/ההצלבות כהעשרה; תן לרעיון לנשום. אל תמתח באופן מלאכותי ואל תחזור על עצמך — עומק אמיתי, לא אריכות."
      : (isCollection ? "כתוב סינתזה שמחברת בין פריטי האוסף — עד 6 משפטים." : "2-4 משפטים.");
    // 🌳 Single-Mind Trunk Closure — Phase 1 (metatron_rollout_law): מנדטורי לכל kind שמגיע לכאן
    // (number/compare/verse/notarikon/daily_verse/discovery/research ואחרים) — לא opt-in, בלי body.metatron,
    // בלי חריג ל-research. מקור-אמת יחיד: nodes(propagate=true) → fn_active_method_rules → metatron_context.
    // fail-open מלא: כשל/ריק ב-metatron_context → sys=SYSTEM, mtxFacts="" — בדיוק כמו לפני 1b (אף תשובה לא נחסמת).
    // Phase 2 (ביטול-כפילויות) וPhase 4 (A/B מוצר למשתמשים) נשארים שלבים נפרדים — לא בוצעו כאן.
    let sys = kind === "contact_triage" ? SYSTEM_CONTACT_TRIAGE : SYSTEM;
    let mtxVersion: unknown = null;
    let mtxFacts = "";
    if (kind !== "contact_triage") {
      const mtxSpanId = crypto.randomUUID();
      const mtxStartedAt = new Date().toISOString();
      const mtx = await fetchMetatronContext(subject, subject || facts.slice(0, 120), body?.fast ? "site-analyze-fast" : "site-analyze");
      const mtxEndedAt = new Date().toISOString();
      await recordOperationalSpan(activeTrace, {
        spanId: mtxSpanId,
        parentSpanId: planSpanId,
        kind: "db_rpc",
        name: "metatron_context",
        startedAt: mtxStartedAt,
        endedAt: mtxEndedAt,
        outcome: mtx ? "success" : "degraded_fallback",
        detail: {
          capability: "context_compiler",
          owner_ref: "research_strategy_layer_law v15",
          plan_ref: planRef,
          output_use: mtx ? "used" : "rejected",
          resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(mtxEndedAt) - Date.parse(mtxStartedAt)) },
          cost: { certainty: "not_billable" },
          replay: { ownerRuleRefs: ["research_strategy_layer_law v15"] },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      contextSpanId = mtxSpanId;
      if (mtx) {
        sys = SYSTEM + metatronRulesBlock(mtx);
        mtxFacts = metatronFactsBlock(mtx);
        mtxVersion = mtx.context_version ?? null;
      }
    }

    // G3_NAMELAB_NORMALIZED_REFLECTION_RUNTIME_V1 truth fix (ai_analyze_contract v2, same
    // contract): name_lab facts are engine Findings/outputs, each with its own explicit
    // verification_state — never described as universally-verified truth like every other kind.
    const factsPrefix = kind === "name_lab"
      ? "ממצאי-מנוע (Findings) על השם כמילה — לכל ממצא מגבלת-אימות מפורשת משלו, לא עובדת-אמת אוניברסלית (השתמש רק באלה, ואל תסיק מהן על אדם):"
      : kind === "contact_triage"
        ? "אותות מצטברים מהמערכת (ללא טקסט משתמש גולמי; השתמש רק באלה):"
        : "עובדות מאומתות מהמנוע (השתמש רק באלה):";
    const structuredNameReflection = kind === "name_lab" && body?.operation === "normalized_reflection";
    const structuredReflectionInstruction = structuredNameReflection
      ? "\nמצב normalized_reflection: החזר JSON תקין בלבד, בלי Markdown ובלי טקסט מסביב. מבנה: " +
        '{"message":"מסר פרשני עמוק אך לא אישי/נבואי","motifs":[{"key":"slug","label":"מוטיב בעברית","summary":"סיכום","finding_ids":["רק מזהים שמופיעים בסוגריים המרובעים בחומר"],"frame":{"essence":"מהות","power":"כוח","shadow":"צל/סיכון","balance":"איזון","action":"כיוון מעשי"}}]}. ' +
        "מותר 1-6 motifs. כל motif חייב להישען על finding_ids שסופקו. אל תמציא מזהים. קלף/טארוט אינו חלק מהשלב הזה."
      : "";
    const user =
      `סוג הניתוח: ${hint}\n\n` +
      (subject ? `הנושא: ${subject}\n` : "") +
      (facts ? `${factsPrefix}\n${facts}\n` : "") +
      mtxFacts +
      (again ? "\nזו בקשה לקריאה *נוספת* — הבא זווית/רובד אחר ממה שכבר נאמר." : "") +
      structuredReflectionInstruction +
      `\nכתוב ניתוח בעברית לפי חוקי הברזל. ${lengthRule}`;

    const maxTokens = wantLong ? 3200 : (isCollection ? 650 : 400);
    const model = engine === "gemini" ? GEMINI_MODEL : (body?.fast ? FAST_MODEL : MODEL);
    // Input-bound provenance guard only: subject/facts may originate at the caller boundary.\n    // This guard prevents NEW numeric literals in model output; it does not certify caller facts as true.\n    const permittedNumericTexts = [subject, facts, mtxFacts];
    const callSelectedModel = (prompt) => engine === "gemini"
      ? runGemini(prompt, maxTokens, sys)
      : runClaude(model, prompt, maxTokens, sys);

    const modelSpanId = crypto.randomUUID();
    const modelStartedAt = new Date().toISOString();
    const out = await callSelectedModel(user);
    const modelEndedAt = new Date().toISOString();
    const firstGuard = out.error
      ? { ok: true, invented: [] }
      : validateNumericOutput(out.text || "", permittedNumericTexts);
    const modelOutcome = out.error
      ? (out.error === "refusal" ? "failed_with_reason" : "provider_error")
      : firstGuard.ok ? "success" : "failed_with_reason";

    await recordOperationalSpan(activeTrace, {
      spanId: modelSpanId,
      parentSpanId: contextSpanId,
      kind: "model_call",
      name: "ai-analyze:model",
      startedAt: modelStartedAt,
      endedAt: modelEndedAt,
      outcome: modelOutcome,
      detail: {
        capability: `ai-analyze:${kind || "analyze"}`,
        owner_ref: "ai_analyze_contract v2",
        plan_ref: planRef,
        intelligence_level: isDeep ? "deep" : "fast",
        provider: engine === "gemini" ? "google" : "anthropic",
        model,
        routing_reason: body?.engine ? "caller_selected_engine" : "default_engine",
        output_use: out.error ? "not_applicable" : firstGuard.ok ? "used" : "rejected",
        stop_reason: out.error || (firstGuard.ok ? null : "numeric_truth_guard_untrusted_literal"),
        retry_ordinal: 0,
        resources: {
          input_tokens: out.usage?.input_tokens ?? null,
          output_tokens: out.usage?.output_tokens ?? null,
          api_calls: 1,
          latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)),
        },
        cost: { certainty: "unknown" },
        replay: {
          ownerRuleRefs: ["ai_analyze_contract v2", "system_suggestions_law v3", "truth_axes_foundation_law v3"],
          parametersRef: planRef,
          searchBoundsRef: `max_tokens:${maxTokens};numeric_truth_guard:v1`,
          continuationRef: again ? safeTraceUuid(body?.interaction_id) : null,
        },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });

    if (out.error) {
      await finishOperationalTrace(activeTrace, modelOutcome, out.error);
      return json({ analysis: null, engine, model, error: out.error, detail: out.detail, trace_id: activeTrace?.traceId || null });
    }

    const firstTokenLogId = await logTokens(
      kind || "analyze",
      model,
      out.usage,
      identity,
      { traceId: activeTrace?.traceId, spanId: modelSpanId },
    );
    await linkOperationalAiCost(activeTrace, modelSpanId, firstTokenLogId);

    let finalOut = out;
    let finalModelSpanId = modelSpanId;
    let fallbackUsed = false;

    if (!firstGuard.ok) {
      const retrySpanId = crypto.randomUUID();
      const retryStartedAt = new Date().toISOString();
      const retryOut = await callSelectedModel(user + numericTruthRetryInstruction());
      const retryEndedAt = new Date().toISOString();
      const retryGuard = retryOut.error
        ? { ok: false, invented: [] }
        : validateNumericOutput(retryOut.text || "", permittedNumericTexts);
      const retryOutcome = retryOut.error
        ? (retryOut.error === "refusal" ? "failed_with_reason" : "provider_error")
        : retryGuard.ok ? "success" : "failed_with_reason";

      await recordOperationalSpan(activeTrace, {
        spanId: retrySpanId,
        parentSpanId: modelSpanId,
        kind: "model_call",
        name: "ai-analyze:model-truth-retry",
        startedAt: retryStartedAt,
        endedAt: retryEndedAt,
        outcome: retryOutcome,
        detail: {
          capability: `ai-analyze:${kind || "analyze"}`,
          owner_ref: "ai_analyze_contract v2 + truth_axes_foundation_law v3",
          plan_ref: planRef,
          intelligence_level: isDeep ? "deep" : "fast",
          provider: engine === "gemini" ? "google" : "anthropic",
          model,
          routing_reason: "numeric_truth_guard_retry",
          escalation_reason: "untrusted_numeric_literal",
          output_use: retryOut.error ? "not_applicable" : retryGuard.ok ? "used" : "rejected",
          stop_reason: retryOut.error || (retryGuard.ok ? null : "numeric_truth_guard_untrusted_literal"),
          retry_ordinal: 1,
          resources: {
            input_tokens: retryOut.usage?.input_tokens ?? null,
            output_tokens: retryOut.usage?.output_tokens ?? null,
            api_calls: 1,
            latency_ms: Math.max(0, Date.parse(retryEndedAt) - Date.parse(retryStartedAt)),
          },
          cost: { certainty: "unknown" },
          replay: {
            ownerRuleRefs: ["ai_analyze_contract v2", "truth_axes_foundation_law v3", "system_suggestions_law v3"],
            parametersRef: planRef,
            searchBoundsRef: `max_tokens:${maxTokens};numeric_truth_guard:v1;retry:1`,
            idempotencyKey: safeTraceUuid(body?.interaction_id),
          },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });

      const retryTokenLogId = await logTokens(
        kind || "analyze",
        model,
        retryOut.usage,
        identity,
        { traceId: activeTrace?.traceId, spanId: retrySpanId },
      );
      await linkOperationalAiCost(activeTrace, retrySpanId, retryTokenLogId);

      finalModelSpanId = retrySpanId;
      if (!retryOut.error && retryGuard.ok) {
        finalOut = retryOut;
      } else {
        finalOut = { text: numericTruthFallback() };
        fallbackUsed = true;
      }
    }

    const synthesisSpanId = crypto.randomUUID();
    const synthesisStartedAt = new Date().toISOString();
    const responseRef = activeTrace ? `trace:${activeTrace.traceId}:response` : null;
    const reflectionInterpretation = structuredNameReflection
      ? parseNameLabReflectionOutput(finalOut.text, facts)
      : null;
    // Structured reflection is fail-closed: malformed/truncated JSON must never become the frozen
    // user-facing message. Legacy operations keep the exact historical finalOut.text behavior.
    const responseBody = {
      analysis: structuredNameReflection ? (reflectionInterpretation?.message || null) : finalOut.text,
      reflection_interpretation: reflectionInterpretation,
      engine,
      model,
      metatron: true,
      context_version: mtxVersion,
      trace_id: activeTrace?.traceId || null,
    };
    const synthesisEndedAt = new Date().toISOString();
    await recordOperationalSpan(activeTrace, {
      spanId: synthesisSpanId,
      parentSpanId: finalModelSpanId,
      kind: "synthesis",
      name: "ai-analyze:synthesis",
      startedAt: synthesisStartedAt,
      endedAt: synthesisEndedAt,
      outcome: fallbackUsed ? "degraded_fallback" : "success",
      detail: {
        capability: `ai-analyze:${kind || "analyze"}`,
        owner_ref: "ai_analyze_contract v2 + system_suggestions_law v3",
        plan_ref: planRef,
        output_use: "used",
        fallback_reason: fallbackUsed ? "numeric_truth_guard" : null,
        resources: { latency_ms: Math.max(0, Date.parse(synthesisEndedAt) - Date.parse(synthesisStartedAt)) },
        cost: { certainty: "not_billable" },
        replay: {
          inputRef: /^\d{1,18}$/.test(subject) ? `number:${subject}` : null,
          ownerRuleRefs: ["ai_analyze_contract v2", "system_suggestions_law v3", "truth_axes_foundation_law v3"],
          sourceBundleRef: `span:${finalModelSpanId}`,
          resultBundleRef: responseRef,
          exactReturnRef: responseRef,
          idempotencyKey: safeTraceUuid(body?.interaction_id),
        },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    await finishOperationalTrace(activeTrace, fallbackUsed ? "degraded_fallback" : "success", fallbackUsed ? "numeric_truth_guard_fallback" : null);
    return json(responseBody);
  } catch (e) {
    await finishOperationalTrace(activeTrace, "failed_with_reason", "unhandled_exception");
    return json({ analysis: null, error: String(e).slice(0, 200), trace_id: activeTrace?.traceId || null }, 200);
  }
});
