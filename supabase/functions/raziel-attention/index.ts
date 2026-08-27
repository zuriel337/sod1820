// 🎛️ רזיאל — עוזר Human-Gate של חדר המפקדה (Command Center Attention).
// אותו רזיאל בדיוק (fn_raziel_persona/fn_raziel_context/raziel_brain, אותה agent_user_memory
// channel='site' agent='raziel' memory_type='conversation' — אותה שיחה עם number-researcher,
// לא סוכן שני). Number Research נשאר מומחיות-בתוכו (number-researcher/index.ts, ללא-שינוי) —
// זו כניסה-מקבילה לאותו מוח, בדיוק כמו שnumber-researcher כבר-הוא כניסה-מקבילה ל-ai-analyze.
//
// תפקיד: לקבל digest חסום/דטרמיניסטי של תור-הקשב הנוכחי (נבנה בצד-לקוח מהמידע שכבר טעון ב-
// WarRoomTab — לא שאילתה נוספת כאן, לא Inbox Store חדש) + חוקים-רלוונטיים חיים (fn_raziel_relevant_rules,
// לא רשימה קשיחה) + זיכרון-שיחה, ולסייע לצוריאל לסכם/לקבץ/לתעדף/למצוא-כפילויות/לצמצם את התור —
// תמיד READ/ANALYZE/EXPLAIN/RECOMMEND. אין כאן שום קריאת-RPC שכותבת — כתיבה קורית רק כשצוריאל
// עצמו לוחץ כפתור/מקליד פקודה בצד-הלקוח (detectCommand הקיים ב-RazielRoom.jsx), לא מכאן.
//
// Pass 1C (§16-17): ה-digest שמגיע מהלקוח נושא scope מפורש — "all" (ללא פילטר) / "filtered"
// (אחרי פילטרים-פעילים) / "selected" (רק מה שצוריאל סימן-ידנית עכשיו) — שלושה היטלים על אותו
// תור-חי, לא 3 stores. fmtDigest למטה מנסח את ה-scope בפירוש כדי שרזיאל לא יטעה "כל התור" כש-
// המדובר בבחירה-ידנית מצומצמת (או להפך).
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
let MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || SB_SVC;
const H = { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }

async function rpc(fn: string, args: unknown): Promise<any> {
  try { const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function rest(path: string): Promise<any> {
  try { const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function uidFromToken(auth: string): Promise<string> {
  const tok = (auth || "").replace(/^Bearer\s+/i, "").trim();
  if (!tok || tok === SB_ANON || tok === SB_SVC) return "";
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${tok}` } });
    if (!r.ok) return "";
    const u = await r.json();
    return (u && typeof u.id === "string") ? u.id : "";
  } catch { return ""; }
}

// 🧵 אותה שיחה בדיוק כמו number-researcher (agent_user_memory, channel='site', agent='raziel',
// memory_type='conversation') — "ONE SYSTEM. ONE RAZIEL." לא שיחה נפרדת/מקבילה.
async function loadThreadFull(uid: string, limit = 40): Promise<{ history: { role: string; text: string }[]; snapshot: unknown }> {
  if (!uid) return { history: [], snapshot: null };
  const rows = await rest(`agent_user_memory?user_ref=eq.${encodeURIComponent(uid)}&channel=eq.site&agent=eq.raziel&memory_type=eq.conversation&source=eq.site&select=content,data,created_at&order=created_at.asc&limit=${limit}`);
  const history: { role: string; text: string }[] = []; let snapshot: unknown = null;
  if (Array.isArray(rows)) for (const r of rows) {
    if (r.content) history.push({ role: "user", text: r.content });
    const reply = r?.data?.reply; if (reply) history.push({ role: "assistant", text: String(reply) });
    if (r?.data?.context_snapshot) snapshot = r.data.context_snapshot;
  }
  return { history, snapshot };
}
async function saveExchange(uid: string, userMsg: string, reply: string, snapshot: unknown) {
  if (!uid || !reply) return;
  try {
    await fetch(`${SB_URL}/rest/v1/agent_user_memory`, {
      method: "POST", headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({
        user_ref: uid, channel: "site", agent: "raziel",
        memory_type: "conversation", memory_scope: "personal", visibility: "private", source: "site",
        topic: (userMsg || "(תור-קשב)").slice(0, 80),
        content: userMsg || "(תור-קשב)",
        data: { reply, context_snapshot: snapshot, mode: "attention" },
      }),
    });
  } catch { /* לא שובר את התשובה */ }
}

const FALLBACK_PERSONA = "אתה רזיאל — עוזר-המחקר וה-Human-Gate של סוד1820.";

// 🎯 זיהוי-domain גס מתוך הודעת-המשתמש → תגיות ל-fn_raziel_relevant_rules (לא קובע תוכן,
// רק עוזר לצמצם/למקד את השאילתה החיה; ה-query החופשי (ההודעה עצמה) תמיד גם-הוא נשלח).
function detectDomains(message: string): string[] {
  const m = (message || "").toLowerCase();
  const out = new Set<string>(["human", "gate", "duplicate", "rank"]); // עוגן-בסיס לכל שאלת-קשב
  if (/צופן|דילוג|els/.test(m)) out.add("els"), out.add("cipher");
  if (/מספר|גימטריה|התכנס/.test(m)) out.add("gematria"), out.add("convergence"), out.add("number");
  if (/מחקר|ממצא|מועמד|research/.test(m)) out.add("research"), out.add("intake"), out.add("convergence");
  if (/כפיל|חוזר|duplicate/.test(m)) out.add("duplicate"), out.add("convergence");
  if (/עץ|graph|גרף/.test(m)) out.add("graph"), out.add("unified");
  return Array.from(out);
}

function fmtRules(rules: any[]): string {
  if (!Array.isArray(rules) || !rules.length) return "";
  const L = ["== חוקים קנוניים רלוונטיים (nodes type='rule', חי — נשלף לפי-רלוונטיות, לא רשימה קבועה) =="];
  for (const r of rules.slice(0, 8)) L.push(`• ${r.label || r.rule_id}: ${String(r.description || "").slice(0, 350)}`);
  return L.join("\n");
}

function fmtMemory(rctx: any): string {
  const uc = rctx?.user_context; if (!uc) return "";
  const parts: string[] = [];
  if (uc.summary) parts.push("סיכום: " + String(uc.summary).slice(0, 400));
  const rc = Array.isArray(uc.recent_conversation) ? uc.recent_conversation.slice(0, 8) : [];
  if (rc.length) parts.push("נושאים אחרונים: " + rc.map((x: string) => String(x).slice(0, 60)).join(" · "));
  return parts.length ? "== מה שאתה זוכר על צוריאל ==\n" + parts.join("\n") : "";
}

// 📊 ה-digest מגיע מוכן מהלקוח (בנוי מ-buildAttentionDigest ב-src/lib/ccwork.js, מעל המידע
// שכבר טעון ב-WarRoomTab — לא שאילתה נוספת פה, לא Inbox Store). כאן רק עיצוב-לטקסט לפרומפט.
function scopeLabel(d: any): string {
  if (d?.scope === "selected") return `רק ${d.total ?? 0} הפריטים שצוריאל *בחר-ידנית עכשיו* (SELECTED) — לא כל התור/התור-המסונן. אם הוא שואל "מתוך אלה" / "בבחירה" — זה הבסיס.`;
  if (d?.scope === "filtered" && (d.filters_active || []).length) return `תור-הקשב *אחרי* הפילטרים-הפעילים (FILTERED) — לא כל האוצר. אם הוא שואל "בכלל"/"בלי פילטר" — ציין שיש פילטר פעיל.`;
  return "כל תור-הקשב הנוכחי, ללא סינון/בחירה (ALL).";
}
function fmtDigest(d: any): string {
  if (!d || typeof d !== "object") return "== תור-הקשב הנוכחי ==\n(לא סופק digest — אין לך כרגע נתוני-תור. הצע לצוריאל לפתוח את חדר המפקדה.)";
  const L: string[] = [];
  L.push(`== תור-הקשב הנוכחי (חדר המפקדה · מצב "${d.mode || "now"}") ==`);
  L.push(`🎯 scope=${d.scope || "filtered"}: ${scopeLabel(d)}`);
  L.push(`סה"כ ${d.total ?? 0} פריטים בתור${d.self_hidden ? " (חומר-עצמי של ZURIEL כבר מוסתר כברירת-מחדל)" : ""}${(d.filters_active || []).length ? " · פילטרים-פעילים: " + d.filters_active.join(",") : ""}.`);
  L.push(`מוצג לך דוגמית מפורטת של ${d.sample_count ?? 0} פריטים מתוך ה-${d.total ?? 0} — אבל הסטטיסטיקות למטה (by_source/by_tier/top_writers/top_values/כפילויות) מחושבות על **כל** ה-${d.total ?? 0}, לא רק על הדוגמית. לעולם אל תגיד שבדקת/ראית את כולם בנפרד — תגיד בפירוש שאתה מסתמך על צבירה+דוגמית.`);
  if (d.by_source) L.push("לפי-מקור: " + Object.entries(d.by_source).map(([k, v]) => `${k}=${v}`).join(" · "));
  if (d.by_tier) L.push("לפי-רובד: " + Object.entries(d.by_tier).map(([k, v]) => `${k}=${v}`).join(" · "));
  if (Array.isArray(d.top_writers) && d.top_writers.length) L.push("כתבים-מובילים: " + d.top_writers.map((w: any) => `${w.writer}(${w.count})`).join(" · "));
  if (Array.isArray(d.top_values) && d.top_values.length) L.push("מספרים/ערכים חוזרים: " + d.top_values.map((v: any) => `${v.value}(${v.count}${v.sample ? "· \"" + v.sample + "\"" : ""})`).join(" · "));
  L.push(`כפילויות-מסומנות דטרמיניסטית (טקסט-חוזר, לא ניחוש-סמנטי): ${d.duplicate_flagged_count ?? 0}.`);
  if (Array.isArray(d.sample) && d.sample.length) {
    L.push(`דוגמית (${d.sample.length} פריטים, id·מקור·רובד·כתב·ערך·כותרת-קצרה·חדש/כפול/טופל):`);
    for (const it of d.sample.slice(0, 40)) {
      L.push(`  [${it.id}] ${it.source || "—"} · ${it.tier || "—"} · ${it.writer || "—"}${it.value != null ? " · #" + it.value : ""}${it.dup ? " · ♻️כפול" : ""}${it.handled ? " · ✅טופל" : ""} — "${(it.title || "").slice(0, 70)}"`);
    }
  }
  return L.join("\n");
}

const ATTENTION_RULES =
  "\n\n== מצב-קשב · חדר המפקדה (Command Center Attention) ==\n" +
  "אתה עוזר-ה-Human-Gate של צוריאל. תפקידך: לעזור לו לעבור מתור-פריטים גדול וגולמי להחלטות-קשב קטנות ומובנות.\n" +
  "1. תמיד תתחיל מהמספר-הכולל האמיתי מה-digest (== תור-הקשב הנוכחי ==) — לעולם אל תמציא/תעריך מספרים. שים-לב ל-scope (ALL/FILTERED/SELECTED) שצוין שם — אל תערבב בין 'כל התור' לבין 'מה שנבחר-ידנית'.\n" +
  "2. סכם/קבץ/תעדף/מצא-כפילויות לפי הנתונים שסופקו בפועל (by_source/by_tier/top_writers/top_values/כפילויות-דטרמיניסטיות/הדוגמית) — לא ניחוש חופשי. אם משהו לא נתמך בנתונים — אמור זאת בכנות.\n" +
  "3. Rank, Don't Hide: אף פעם אל תציע 'להתעלם/למחוק/להסתיר' פריטים — רק לדרג/לקבץ/לתעדף לצפייה-מאוחרת-יותר. כל המלצת-עדיפות מלווה בהסבר קצר (למה זה קודם, על סמך מה).\n" +
  "4. Attention ≠ Truth: 'חשוב'/'ראשון-בתור'/'כפילות-סבירה' הן החלטות-קשב — הן *אף פעם* לא קובעות שמשהו נכון/מאושר/קנוני. אל תשתמש במילים כמו 'מאושר'/'קנוני'/'עובדה' לגבי פריט בתור.\n" +
  "5. אתה לא כותב/מוחק/ממזג/מאשר שום דבר בעצמך — אתה רק מציע. אם צוריאל מבקש פעולה מרוכזת ('תצמצם לי', 'תחלק לקבוצות של עשר') — הצע חלוקה/סדר-עבודה מפורש (רשימת-קבוצות עם id-ים/ספירה), ואמור לו בפירוש שההחלטה בפועל אצלו — כולל bulk action: תמיד תגיד לו לסמן/לבחור ולאשר בעצמו בממשק, לא 'עשיתי'.\n" +
  "6. הסבר-על-דרישה: אם שואלים 'למה?'/'על סמך מה?' — ענה עם עובדות קונקרטיות מה-digest (מקור/רובד/כתב/כמות-קשורים/דוגמית/חוק-רלוונטי אם יש) — לא 'תחושה'.\n" +
  "7. תקצר: תשובה קריאה בכמה שורות/בולטים, לא מסה. עברית בלבד, בלי JSON, בלי Markdown-כבד — טקסט רגיל עם שורות/בולטים (•) בלבד.\n" +
  "8. שאלה על מספר-ספציפי לחקירה-לעומק ('חקור לי 321', 'מה ידוע על 1820') אינה שאלת-קשב — זו כבר-מנותבת למומחה-המספרים בנפרד; אם זה מגיע אליך בטעות, הפנה בעדינות ('אפשר לפתוח את זה בחקירת-מספר — רוצה?').";

function fmtRole(profile: string): string {
  if (profile === "ZURIEL_RESEARCH") return "";
  // 🚧 Extension point (Pass 1B §10): לא נבנה עדיין — לא לבנות התנהגות-ציבורית שלמה כאן.
  return "PROFILE_NOT_SUPPORTED";
}

async function callClaude(system: string, userMsg: string, tries = 3): Promise<{ text: string; error: string | null }> {
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt === 1 ? 700 : 1600));
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1800, system, messages: [{ role: "user", content: userMsg }] }),
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        lastErr = `anthropic_${resp.status}`;
        if (resp.status === 429 || resp.status >= 500) continue;
        return { text: "", error: lastErr + ": " + (await resp.text().catch(() => "")).slice(0, 200) };
      }
      const data = await resp.json();
      const rawText = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
      if (rawText) return { text: rawText, error: null };
      lastErr = "empty_text";
    } catch (e) {
      lastErr = ctrl.signal.aborted ? "timeout" : String(e).slice(0, 120);
    } finally {
      clearTimeout(to);
    }
  }
  return { text: "", error: lastErr };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!ANTHROPIC_KEY) return json({ answer: null, error: "not_configured" });
  try {
    const body = await req.json().catch(() => ({}));
    const uid = await uidFromToken(req.headers.get("Authorization") || "");

    if (body?.op === "history") { const t = await loadThreadFull(uid); return json({ history: t.history, snapshot: t.snapshot, uid_present: !!uid }); }

    // 🔐 Admin-gate: מצב-קשב חושף תור-אדמין (WarRoom) — אסור-דליפה לנתיב-הציבורי של AskRaziel.
    // מראה (mirror) בדיוק את דפוס-הזיהוי הקיים ב-number-researcher (users?select=role).
    const roleRows = uid ? await rest(`users?id=eq.${encodeURIComponent(uid)}&select=role`) : null;
    const isAdmin = Array.isArray(roleRows) && roleRows[0]?.role === "admin";
    const profile = String(body?.profile || "ZURIEL_RESEARCH");
    if (profile === "ZURIEL_RESEARCH" && !isAdmin) return json({ answer: null, error: "admin_only" }, 403);
    const roleGate = fmtRole(profile);
    if (roleGate === "PROFILE_NOT_SUPPORTED") return json({ answer: null, error: "profile_not_supported", note: "extension point — not built this pass" }, 400);

    const message = String(body?.message || "").slice(0, 2000);
    const digest = body?.digest && typeof body.digest === "object" ? body.digest : null;

    const domains = detectDomains(message);
    const [personaRaw, rctx, relevantRules] = await Promise.all([
      rpc("fn_raziel_persona", { p_channel: "site" }),
      uid ? rpc("fn_raziel_context", { p_user_ref: uid, p_channel: "site" }) : Promise.resolve(null),
      rpc("fn_raziel_relevant_rules", { p_query: message, p_domains: domains, p_limit: 8 }),
    ]);
    const persona = (typeof personaRaw === "string" && personaRaw.trim()) ? personaRaw.trim() : FALLBACK_PERSONA;

    const memBlock = fmtMemory(rctx);
    const rulesBlock = fmtRules(relevantRules);
    const digestBlock = fmtDigest(digest);

    const dbt = await loadThreadFull(uid, 12);
    const clientHist: { role: string; text: string }[] = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const history = dbt.history.length ? dbt.history.slice(-8) : clientHist;
    const convo = history.map(h => `${h.role === "assistant" ? "רזיאל" : "צוריאל"}: ${h.text}`).join("\n");

    const SYSTEM = persona + ATTENTION_RULES;
    const userMsg =
      `${digestBlock}\n\n` +
      (rulesBlock ? rulesBlock + "\n\n" : "") +
      (memBlock ? memBlock + "\n\n" : "") +
      (convo ? `— שיחה עד כה —\n${convo}\n\n` : "") +
      `— צוריאל עכשיו —\n${message || "תעשה לי סדר בתור."}`;

    const { text: rawText, error: aiError } = await callClaude(SYSTEM, userMsg);

    const snapshot = {
      persona_source: "raziel_brain#1",
      mode: "attention", profile,
      rules_used: (relevantRules || []).map((r: any) => ({ rule_id: r.rule_id, score: r.score })),
      domains_detected: domains,
      digest_total: digest?.total ?? null, digest_sample_count: digest?.sample_count ?? null,
      digest_scope: digest?.scope ?? null,
      model: MODEL,
    };

    if (uid && rawText) await saveExchange(uid, message, rawText, snapshot);

    const answer = rawText || `רגע — נתקעתי לרגע בעיבוד התור (${aiError === "timeout" ? "לקח יותר מדי זמן" : "עומס רגעי"}). נסה שוב, או שאל אותי משהו ממוקד יותר על התור. 🌳`;

    return json({ answer, context_snapshot: snapshot, model: MODEL, persisted: !!(uid && rawText), degraded: !rawText, ai_error: rawText ? null : aiError });
  } catch (e) {
    return json({ answer: "אירעה תקלה רגעית אצלי — נסה שוב בעוד רגע. 🌳", error: String(e).slice(0, 200), degraded: true }, 200);
  }
});
