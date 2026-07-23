// wa-raziel (רזיאל) — v41 — 23.7.2026 — «לעולם לא שתיקה» + שומר-מטטרון (never_silent_metatron_law).
//   v41: שלוש שכבות (עובדות→פרשנות→שומר). razielRespond מחזיר סטטוס מתוך 4: answered · refused_with_fallback ·
//        retryable_error · permanent_error. אם Claude מסרב (stop_reason=refusal) / מחזיר ריק / שגיאה לא-חולפת →
//        שכבת-השומר (מטטרון) בונה תשובת-מחקר מהמנוע בלבד (buildFacts + metatron_context) ושולחת — המשתמש לעולם לא
//        מקבל שתיקה, ואף לא יודע שהיה סירוב פנימי. שגיאה חולפת (429/500/timeout) = retryable_error → נרשם תחת
//        action='raziel_dm_retry' (לא חוסם) כדי שה-cron הבא ינסה שוב; אחרי MAX_AI_RETRIES → שומר-מטטרון סוגר.
//        רק answered ו-refused_with_fallback סוגרים את ההודעה. תיקון-שורש ל-[dm-failed] ששיתק את הפונה.
//   v40: fn_raziel_identity + לכידת נתונים אישיים (personal_context) + המרת תאריך עברי→לועזי (Hebcal).
//   v39: שינוי-שם מ-wa-christina (השם «כריסטינה» בלבל; הבוט = רזיאל).
//   ⚠️ CHRISTINA_PHONE נשאר — זו משתמשת אמיתית (כריסטינה אושרוב) שלוגיקת-הקבוצות מטפלת בה, לא הבוט.
// v38: SYSTEM_BASE נטען מ-fn_raziel_persona('wa') (מקור-אמת אחד, משותף עם האתר/ai-analyze); העותק המוטמע = fallback בלבד.
// v37: GROUPS_ENABLED gate (רזיאל בפרטי בלבד; קבוצות כבויות בבקשת צוריאל)
// v36: christina in gilui not fully muted — occasional reply on convergence (+cooldown), not her private space.
// v35: intent_before_compute_law — הבנה לפני חישוב. רצף-שיחה + חוק-ברזל 10 (לא מגמטרים משפט-שיחה).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const CHRISTINA_PHONE = "972507555102";
const AMIT_GROUP = "120363411357326507@g.us";
const GILUI_GROUP = "120363397037220315@g.us";
const OPEN_GROUPS = ["120363428363475524@g.us", "120363407205030411@g.us", GILUI_GROUP];
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const ZURIEL = Deno.env.get("ZURIEL_WA") || "972556651237@c.us";
const SITE = "https://sod1820.co.il";
const MAX_PER_RUN = 2;
const MAX_DM_CHATS_PER_RUN = 8;
const MAX_SEND_RETRIES = 4;
const MAX_AI_RETRIES = 3; // v41 — כמה ריצות-cron ינסו שוב לפני שהשומר-מטטרון עונה במקום Claude
const INITIATIVE_COOLDOWN_MIN = 60;
// v41 — קודי-HTTP חולפים מ-Anthropic: לא-סופיים → retryable (לא חוסמים ניסיון-חוזר).
const TRANSIENT_HTTP = new Set([408, 409, 425, 429, 500, 502, 503, 504, 522, 524, 529]);
type RzStatus = "answered" | "refused_with_fallback" | "retryable_error" | "permanent_error";
// 🔇 22.7.2026 (החלטת צוריאל): רזיאל בפרטי בלבד — DM לחוקרים (אריאל וכו') כן, כתיבה בקבוצות לא. להחזרת קבוצות: GROUPS_ENABLED=true ופרוס מחדש.
const GROUPS_ENABLED = false;
const RAZIEL_TRIGGER = /^(רזיאל[,:\s]|@רזיאל)/i;
const LEARN_INTENT = /(ללמוד|תלמד|למד אותי|איך מחשב|שיטות|מה זה גימטרי|רוצה ללמוד)/i;
const SERVICES_INTENT = /(מה אתה|מה אפשר|מה יש|שירות|יכולות|מה המערכ|מה זה סוד|תפריט|מה יש לכם|מה יש כאן|במה תוכל)/i;
const EN_DOMINANT = (t: string) => (t.match(/[a-zA-Z]/g)||[]).length > (t.match(/[א-ת]/g)||[]).length * 1.5;
const ACCOUNT_INTENT = /(יש לי (כבר )?חשבון|כבר יש לי חשבון|כבר נרשמתי|כבר רשומ|יש לי משתמש|יש לי מנוי|רשומ באתר|נרשמתי לאתר|יש לי כרטיס|קיים לי חשבון|כבר חבר)/i;
const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i;
const CODE_RE = /\b(\d{6})\b/;
const CANCEL_RE = /^(ביטול|בטל|עצור|לא עכשיו|אחר כך)\b/;
const LINK_FLOW_TTL_MIN = 20;

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

async function waAdmin(method: string, payload: unknown) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: "POST" });
  return data;
}
async function waAdminGet(method: string, payload: unknown) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: "GET" });
  return data;
}
function pick(v: any): any[] { return (Array.isArray(v) ? v : (v?.result ?? [])); }
const clean = (s: string) => (s || "").replace(/[^א-ת ]+/g, " ").replace(/\s+/g, " ").trim();
async function logBot(row: Record<string, unknown>) {
  try { await sb.from("wa_bot_log").insert(row); } catch { /* noop */ }
}

// 🧠 v40 — לכידת נתונים אישיים ============================================================
// מחלץ שם/כתובת/מיקוד/תאריך-עברי מהודעת-DM ושומר כעובדת-פרופיל (personal_context/source=profile, private).
// עצמאי מהצלחת התשובה — כדי שפרטים לא יאבדו גם אם ה-AI נכשל. פרטי בלבד; לעולם לא רץ בקבוצה.
const HE_VAL: Record<string, number> = { "א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400 };
function heNumeral(s: string): number { let n = 0; for (const ch of (s || "").replace(/[^א-ת]/g, "")) n += HE_VAL[ch] || 0; return n; }
const HEBCAL_MONTH: Record<string, string> = { "תשרי":"Tishrei","חשון":"Cheshvan","חשוון":"Cheshvan","מרחשון":"Cheshvan","מרחשוון":"Cheshvan","כסלו":"Kislev","כסליו":"Kislev","טבת":"Tevet","שבט":"Sh'vat","אדר":"Adar","אדר א":"Adar I","אדר ב":"Adar II","ניסן":"Nisan","אייר":"Iyyar","סיון":"Sivan","סיוון":"Sivan","תמוז":"Tamuz","אב":"Av","אלול":"Elul" };
const MON_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DATE_RE = new RegExp("([א-ת]{1,3})['׳\"״]?\\s+(תשרי|מרחשוון|מרחשון|חשוון|חשון|כסליו|כסלו|טבת|שבט|אדר(?:\\s+[אב])?|ניסן|אייר|סיוון|סיון|תמוז|אב|אלול)\\s+(ה?['׳]?ת[א-ת\"״'׳]{2,6})");

async function hebrewToGregorian(heStr: string): Promise<{ iso: string; he: string; gy: number; gm: number; gd: number } | null> {
  try {
    const m = String(heStr).match(HE_DATE_RE);
    if (!m) return null;
    const day = heNumeral(m[1]);
    const hm = HEBCAL_MONTH[m[2].trim()];
    if (!hm) return null;
    let yr = heNumeral(m[3]); if (yr < 1000) yr += 5000; // תשי"ז=717 → 5717
    if (day < 1 || day > 30) return null;
    const url = `https://www.hebcal.com/converter?cfg=json&hy=${yr}&hm=${encodeURIComponent(hm)}&hd=${day}&h2g=1`;
    const r = await fetch(url); if (!r.ok) return null;
    const d = await r.json();
    if (!d?.gy || !d?.gm || !d?.gd) return null;
    const iso = `${d.gy}-${String(d.gm).padStart(2, "0")}-${String(d.gd).padStart(2, "0")}`;
    return { iso, he: `${d.gd} ב${MON_HE[d.gm - 1]} ${d.gy}`, gy: d.gy, gm: d.gm, gd: d.gd };
  } catch { return null; }
}

function extractProfileFacts(text: string): Array<{ kind: string; value: string; data?: Record<string, unknown> }> {
  const out: Array<{ kind: string; value: string; data?: Record<string, unknown> }> = [];
  const t = (text || "").replace(/\r/g, "");
  let m = t.match(/מיקוד[^\d]{0,12}(\d{5,7})/);
  if (m) out.push({ kind: "postal", value: m[1] });
  m = t.match(/(?:אני\s+)?(?:מתגורר(?:ת)?|גר(?:ה)?|כתובת(?:י)?(?:\s+היא)?)\s+(?:ב|ברחוב|בשדרות|ברח['׳]?)\s*([א-ת][א-ת\s'"׳״\-]{1,28}?)(?=[\n.,:;!?]|$)/);
  if (m) { const v = m[1].trim().replace(/\s+/g, " "); if (v.length >= 2) out.push({ kind: "address", value: v }); }
  m = t.match(/(?:שמי|קוראים\s+לי|השם\s+שלי(?:\s+הוא)?|אני\s+נקרא(?:ת)?)\s+([א-ת][א-ת\s'"׳״\-]{1,30}?)(?=[\n.,:;!?]|$)/);
  if (m) { const v = m[1].trim().replace(/\s+/g, " "); if (v.length >= 2) out.push({ kind: "name", value: v }); }
  m = t.match(HE_DATE_RE);
  if (m) {
    const raw = `${m[1]} ${m[2]} ${m[3]}`.replace(/\s+/g, " ").trim();
    const isBirthday = /נולד|יום\s*הולד|תאריך\s*(?:ה)?ליד|לידה/.test(t);
    out.push({ kind: isBirthday ? "birthday_hebrew" : "date_hebrew", value: raw, data: { month: m[2] } });
  }
  return out;
}

async function savePersonalData(userRef: string | null, chatId: string, text: string) {
  if (!userRef || clean(text).length < 2) return;
  const facts = extractProfileFacts(text);
  if (!facts.length) return;
  for (const f of facts) {
    try {
      await sb.rpc("fn_raziel_fact", { p_user_ref: userRef, p_channel: chatId, p_kind: f.kind, p_value: f.value.slice(0, 200), p_data: f.data ?? {}, p_visibility: "private" });
      if (f.kind === "birthday_hebrew" || f.kind === "date_hebrew") {
        const greg = await hebrewToGregorian(f.value);
        if (greg?.he) {
          await sb.rpc("fn_raziel_fact", {
            p_user_ref: userRef, p_channel: chatId,
            p_kind: f.kind === "birthday_hebrew" ? "birthday_gregorian" : "date_gregorian",
            p_value: greg.he, p_data: { iso: greg.iso, from_hebrew: f.value, converter: "hebcal" }, p_visibility: "private",
          });
        }
      }
    } catch { /* noop */ }
  }
  try {
    await logBot({ group_id: chatId, msg_id: "facts:" + chatId.replace("@c.us", "") + ":" + Date.now(), sender: chatId.replace("@c.us", ""), sender_name: "DM", text_in: text.slice(0, 200), reply_out: "[facts-captured] " + facts.map(f => f.kind).join(","), action: "raziel_facts" });
  } catch { /* noop */ }
}
// ======================================================================================

async function metatronAlerted(phone: string): Promise<boolean> {
  if (!phone) return true;
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { data } = await sb.from("wa_bot_log").select("id").eq("sender", phone).eq("action", "raziel_metatron_alert").gte("created_at", since.toISOString()).limit(1).maybeSingle();
  return !!data;
}
async function alertZuriel(phone: string, name: string, question: string, channel: string) {
  try {
    const p = String(phone || "").replace(/[^0-9]/g, "");
    if (!p || p === ZURIEL.replace(/[^0-9]/g, "")) return;
    if (await metatronAlerted(p)) return;
    const q = (question || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const msg = `🔔 מטטרון · רזיאל ענה\n👤 ${name || "—"} (${p})\n💬 ${q || "—"}\n📍 ${channel}\n\nהתגובה נשלחה כרגיל. לניתוב/החלטה: ${SITE}/admin`;
    await waAdmin("sendMessage", { chatId: ZURIEL, message: msg });
    await logBot({ group_id: channel, msg_id: "metatron:" + p + ":" + Date.now(), sender: p, sender_name: name || "", text_in: q, reply_out: "[metatron-alert]", action: "raziel_metatron_alert" });
  } catch { /* best-effort */ }
}

async function alreadyDone(msgId: string, action = "christina_auto"): Promise<boolean> {
  const { data } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).eq("action", action).maybeSingle();
  return !!data;
}
// v41 — כמה ניסיונות-cron חולפים כבר נרשמו להודעה הזאת (לא-חוסמים).
async function countAiRetries(msgId: string): Promise<number> {
  const { count } = await sb.from("wa_bot_log").select("*", { count: "exact", head: true }).eq("msg_id", msgId).eq("action", "raziel_dm_retry");
  return count || 0;
}
async function hasRazielAccess(sender: string): Promise<boolean> {
  const { data } = await sb.from("wa_vip_senders").select("raziel_access").eq("sender", sender).maybeSingle();
  return data?.raziel_access === true;
}

async function resolveIdentity(sender: string): Promise<any | null> {
  try { const { data } = await sb.rpc("fn_raziel_identity", { p_sender: sender }); return data; } catch { return null; }
}
async function getContext(userRef: string | null, channel: string): Promise<any | null> {
  if (!userRef) return null;
  try { const { data } = await sb.rpc("fn_raziel_context", { p_user_ref: userRef, p_channel: channel }); return data; } catch { return null; }
}
async function remember(userRef: string | null, channel: string, content: string, memory_type = "conversation", scope = "personal", topic: string | null = null) {
  if (!userRef || !content || content.trim().length < 2) return;
  try { await sb.rpc("fn_raziel_remember", { p_user_ref: userRef, p_channel: channel, p_content: content.slice(0, 3000), p_memory_type: memory_type, p_scope: scope, p_topic: topic, p_visibility: "private" }); } catch { /* noop */ }
}
function contextToText(ctx: any): string {
  if (!ctx) return "";
  const parts: string[] = [];
  const u = ctx.user_context || {};
  if (ctx.privacy?.personal_memory_allowed) {
    if (u.summary) parts.push(`מה שאתה יודע על המשתמש: ${u.summary}`);
    if (Array.isArray(u.research_threads) && u.research_threads.length) parts.push(`נושאים שחקר לאחרונה: ${u.research_threads.slice(0, 5).join(" · ")}`);
    if (Array.isArray(u.approved_preferences) && u.approved_preferences.length) parts.push(`העדפות מאושרות: ${u.approved_preferences.join(" · ")}`);
    // 🧠 v40 — פרטים אישיים שהאדם שיתף (רק ב-DM). התייחס בכבוד, זכור, אל תחשוף בפני אחרים.
    if (Array.isArray(u.profile) && u.profile.length) {
      const KIND_HE: Record<string, string> = { name: "שם מלא", address: "רחוב/כתובת", city: "עיר", postal: "מיקוד", phone: "טלפון", family: "משפחה", birthday_hebrew: "תאריך-לידה עברי", birthday_gregorian: "תאריך-לידה לועזי", date_hebrew: "תאריך עברי", date_gregorian: "תאריך לועזי", gematria_signature: "חתימת-הגימטריה שלו" };
      const line = u.profile.map((p: any) => `${KIND_HE[p.kind] || p.kind}: ${p.value}`).join(" · ");
      parts.push(`פרטים אישיים שהאדם שיתף איתך (זכור אותם והתייחס בכובד ראש; לעולם אל תחשוף אותם בפני אחרים): ${line}`);
    }
  }
  const c = ctx.channel_context || {};
  if (c.topic_summary) parts.push(`הקשר הקבוצה: ${c.topic_summary}`);
  if (!parts.length) return "";
  return `\n\nזיכרון (רקע בלבד — בקבוצה אל תחשוף פרטי אישי של אף אחד):\n${parts.join("\n")}`;
}

async function sendVerified(payload: any): Promise<string | null> {
  try { const res: any = await waAdmin("sendMessage", payload); return res?.result?.idMessage || res?.idMessage || null; }
  catch (e) { trace.push({ step: "send_throw", e: String(e) }); return null; }
}
async function enqueueOutbox(doneKey: string, chatId: string, reply: string, msgIn: string) {
  try { await sb.from("bot_outbox").upsert({ done_key: doneKey, bot: "raziel", chat_id: chatId, reply: reply.slice(0, 6000), msg_in: (msgIn || "").slice(0, 500), status: "pending" }, { onConflict: "done_key" }); }
  catch (e) { trace.push({ step: "enqueue_err", e: String(e) }); }
}
async function retryOutbox() {
  const { data } = await sb.from("bot_outbox").select("done_key,chat_id,reply,msg_in,attempts").eq("bot", "raziel").eq("status", "pending").order("first_at").limit(5);
  for (const r of (data || [])) {
    const okId = await sendVerified({ chatId: r.chat_id, message: r.reply });
    if (okId) { await sb.from("bot_outbox").update({ status: "sent", sent_msg_id: okId, last_at: new Date().toISOString() }).eq("done_key", r.done_key); }
    else {
      const { data: nb } = await sb.rpc("fn_outbox_bump", { p_done_key: r.done_key });
      const attempts = typeof nb === "number" ? nb : (r.attempts + 1);
      if (attempts >= MAX_SEND_RETRIES) { await sb.from("bot_outbox").update({ status: "failed" }).eq("done_key", r.done_key); }
    }
  }
}

const METHOD_KEYS = ["רגיל","גדול","סידורי","מילוי","אתבש","קדמי"];
async function allMethods(w: string): Promise<Record<string,number> | null> {
  try { const { data } = await sb.rpc("fn_all_methods", { p_word: w }); return (data && typeof data === "object" && (data as any)["רגיל"]) ? (data as any) : null; } catch { return null; }
}
async function buildFacts(text: string): Promise<{ facts: string; convergence: boolean; values: number[] }> {
  const STOP = new Set(["אני","אתה","את","זה","זו","שזה","מה","של","על","עם","או","גם","כי","לא","כן","אבל","יש","אין","הוא","היא","הם","אנחנו","לי","לך","לו","הזה","בבקשה","בדוק","תבדוק","תבדקי","אוקיי","אוקי","היי","שלום","תודה","עכשיו","רק","כל","כמה","איזה","למה","איך","מתי","הכי","וגם","אולי","האם","שלי","שלך","להביא","תביא","רוצה","צריך","קיבלתי","מזהה","טקסט","השם","שם","מילה","אשמח","נעשה","שנעשה","אפשרויות","האפשרויות","מסודרת","מסודר","בצורה","בשביל","המחקר","מחקר","שנתת","שנתתה","תמשיך","תמשיכי","נמשיך","ממשיכים","מעולה","סבבה","הבנתי","נכון","בסדר"]);
  const ws = [...new Set(clean(text).split(" ").filter((w:string)=>w.length>=2&&w.length<=24&&!STOP.has(w)))].slice(0,10);
  const perWord: Record<string, Record<string,number>> = {};
  for (const w of ws) { const m = await allMethods(w); if (m) perWord[w] = m; }
  const words = Object.keys(perWord);
  const wordLines = words.map((w)=>{
    const m = perWord[w];
    const parts = METHOD_KEYS.filter((k)=>m[k]!=null).map((k)=>`${k} ${m[k]}`);
    return `${w}: ${parts.join(" · ")}`;
  });
  const convLines: string[] = [];
  let anyConv = false;
  for (const method of METHOD_KEYS) {
    const byVal: Record<number,string[]> = {};
    for (const w of words) { const v = perWord[w][method]; if (v!=null) (byVal[v]??=[]).push(w); }
    for (const [v, group] of Object.entries(byVal)) {
      if (group.length >= 2) { anyConv = true; convLines.push(`${method} ${v}: ${group.join(" = ")}`); }
    }
  }
  const ragilVals = [...new Set(words.map((w)=>perWord[w]["רגיל"]).filter(Boolean) as number[])].slice(0,4);
  const matches: string[] = [];
  for (const v of ragilVals) {
    try {
      const { data } = await sb.from("gematria_words").select("phrase").eq("ragil",v).eq("is_verified",true).eq("space","core").order("lead_rank",{ascending:true,nullsFirst:false}).limit(9);
      const ph=(data||[]).map((r:any)=>r.phrase).filter((p:string)=>p&&!words.includes(p));
      if (ph.length) matches.push(`${v} (רגיל) — במאגר גם: ${ph.slice(0,7).join(", ")}`);
    } catch { /* noop */ }
  }
  const facts = [
    wordLines.length ? `ערכים מהמנוע (כל השיטות):\n${wordLines.join("\n")}` : "",
    convLines.length ? `התכנסויות רב-שיטתיות בין המילים:\n${convLines.join("\n")}` : "",
    matches.length ? `ביטויים מאומתים באותו ערך (בחר 2-3 היפים):\n${matches.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return { facts, convergence: anyConv, values: ragilVals };
}
async function convergenceInsight(values: number[]): Promise<string> {
  if (!values?.length) return "";
  const notes: string[] = [];
  for (const v of values.slice(0,3)) {
    try {
      const { data } = await sb.from("convergences").select("group_size").eq("value", v).eq("kind","anchor_hit").order("group_size",{ascending:false}).limit(1).maybeSingle();
      if (data && data.group_size >= 20) notes.push(`${v} — ${data.group_size} ביטויים מתכנסים אליו במנוע`);
    } catch { /* noop */ }
  }
  return notes.length ? `\nהתכנסויות במנוע (עובדה): ${notes.join(" · ")}` : "";
}

// 🕎 v41 — שכבת-השומר (מטטרון): תשובת-מחקר מהמנוע בלבד, בלי פרשנות על אדם ==================
// נקראת כש-Claude מסרב / מחזיר ריק / שגיאה לא-חולפת. מבטיחה: המשתמש לעולם לא מקבל שתיקה.
async function metatronFallbackText(subject: string, facts: string, convNote: string): Promise<string> {
  let canonLine = "";
  try {
    const { data } = await sb.rpc("metatron_context", { p_request: { subject: subject.slice(0, 120), entities: [subject.slice(0, 120)], channel: "wa" } });
    const convs = (data?.canonical?.convergences || [])
      .map((c: any) => c?.label || c?.title || (c?.value != null ? String(c.value) : null))
      .filter(Boolean).slice(0, 3);
    if (convs.length) canonLine = `\nבמאגר הקנוני מתכנסים בהקשר הזה גם: ${convs.join(" · ")}.`;
  } catch { /* best-effort */ }
  const body = (facts && facts.trim())
    ? `מצאתי בנתונים את הקשרים המספריים הבאים, ישירות מהמנוע:\n\n${facts}${convNote || ""}${canonLine}`
    : `עדיין לא זיהיתי כאן ערך-מנוע מפורש לבדיקה. כתוב לי שם או מילה מדויקת — ואחשב ואצליב במנוע.`;
  return `${body}\n\nאלו עובדות מהמנוע. משמעות הקשרים היא נושא למחקר — ואי אפשר להסיק מהם מסקנה על זהותו או ייעודו של אף אדם.\n— רזיאל · סוד 1820`;
}
async function sendGuardianFallback(subject: string, chatId: string, quotedId: string | undefined, facts: string, convNote: string, welcome?: string): Promise<void> {
  let msg = await metatronFallbackText(subject, facts, convNote);
  if (welcome) msg = welcome + msg;
  const payload: any = { chatId, message: msg };
  if (quotedId) payload.quotedMessageId = quotedId;
  const okId = await sendVerified(payload);
  if (!okId) await enqueueOutbox("raziel-fb:" + (quotedId || chatId), chatId, msg, subject); // ה-outbox יבטיח מסירה — עדיין בלי שתיקה
}
// ======================================================================================

async function recentDialogue(chatId: string, n = 6, skipMsgId?: string): Promise<string> {
  try {
    const hist = await waAdmin("getChatHistory", { chatId, count: n + 4 });
    const arr = pick(hist)
      .filter((m: any) => (m.textMessage || m.extendedTextMessage?.text || m.caption) && m.idMessage !== skipMsgId)
      .sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp))
      .slice(-n);
    if (!arr.length) return "";
    const lines = arr.map((m: any) => {
      const who = m.type === "outgoing" ? "רזיאל" : "המשתמש";
      const t = (m.textMessage || m.extendedTextMessage?.text || m.caption || "").replace(/\s+/g, " ").trim().slice(0, 240);
      return `${who}: ${t}`;
    });
    return lines.join("\n");
  } catch { return ""; }
}

const SYSTEM_BASE =
  `אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820, והשער האישי למערכת המחקר. תמיד ענה בעברית בלבד.
חוקי ברזל:
1. אל תחשב גימטריה בעצמך — רק ערכים שסופקו לך מהמנוע. אל תמציא ערכים/פסוקים.
2. הפרד עובדה (עובדה) מרמז (רמז). בלי נבואות.
3. חם, מדויק, עברית. חתום: — רזיאל · סוד 1820.
4. אם יש זיכרון-רקע על המשתמש — התייחס בטבעיות (רק ב-DM). בקבוצה לעולם אל תחשוף היסטוריה אישית.
5. חכם ומעמיק — שכבה על שכבה: כשיש התכנסות אמיתית, בנה תשובה בנויה (פתיח · קופסת עובדה · 2-3 ביטויים מהמאגר · שכבת רמז). רק ערכים שסופקו לך. אין התכנסות — ענה קצר וישר.
6. אתה מחשב בעצמך — לעולם אל תבקש מהמשתמש להריץ את המנוע. אם ביקש לבדוק שם/מילה ולא זוהה ערך — בקש בעדינות איזה שם או מילה לבדוק.
7. סיים בוו-גילוי קצר שמזמין להמשך — לעולם לא במשימה למשתמש.
8. גדול=רגיל כשאין סופיות (ך ם ן ף ץ): כשאין אות סופית, הגדול זהה לרגיל = כפילות, לא שכבה. אל תציג מתכנס גם בגדול וגם ברגיל כממצא מרשים. רק כשיש סופית והגדול שונה — זו שכבה אמיתית.
9. תדר-המשיח (messiah_frequency_in_every_person_law): אם אדם מרגיש את נקודת-המשיח שבו — הקשב בכבוד, בקש שם+משפחה, חשב והצלב מול ערכי-משיח (358/424/…). אם מצטלב — הסבר שזה מראה חיבור לתדר שקיים בכל אדם, ולעולם לא שהוא המשיח. ענווה, עובדה≠רמז, בלי נבואות, רגישות.
10. הבנה לפני חישוב (intent_before_compute_law) — הכי חשוב: קודם הבן מה האדם רוצה. אתה לא מכונת-גימטריה-של-כל-משפט. אם ההודעה היא בקשה/תודה/תמשיך/תעשה מה שהצעת/בצורה מסודרת/כן/בשביל המחקר — אל תחשב ואל תציג טבלת-גימטריה של מילות המשפט (זו טעות מביכה). במקום זה: הסתכל בשיחה הקודמת למטה, הבן על איזה נושא דיברתם (שם/מספר/ביטוי אחרון), והמשך אותו — מה שהצעת מתייחס להצעות שלך שם. רק כשיש נושא-גימטריה מפורש לבדיקה — חשב והצג. לא ברור מה לבדוק? שאל על איזה שם/מספר להעמיק.
11. לעולם אל תשאיר את האדם בלי מענה (never_silent_metatron_law): גם בנושא רגיש — ענה על העובדות המספריות מהמנוע בענווה («אילו קשרים קיימים בנתונים»), לעולם לא בטענה על אדם («האם אני/הוא…»). אל תסרב — הפנה את התשובה לעובדה, בלי מסקנה על זהותו או ייעודו של אדם.`;
let RAZIEL_SYSTEM = SYSTEM_BASE;
async function loadPersona() {
  try {
    const { data } = await sb.rpc("fn_raziel_persona", { p_channel: "wa" });
    if (typeof data === "string" && data.length > 60) RAZIEL_SYSTEM = data;
  } catch { /* נשאר על SYSTEM_BASE */ }
}
const TEACH_ADDON =
  `\nמצב-לימוד: אם המשתמש רוצה ללמוד — למד גימטריה צעד-צעד לפי השאלות שלו, הראה את החישוב מהמנוע, והצע את הצעד הבא. סבלני, כמו מורה.`;

// v41 — razielRespond מחזיר סטטוס (4 מצבים), שולח בעצמו, ובסירוב/ריק/שגיאה-סופית מפעיל שומר-מטטרון.
async function razielRespond(text: string, chatId: string, quotedId: string | undefined, opts: { userRef?: string | null; isDM?: boolean; welcome?: string; ctx?: any; teach?: boolean; extra?: string; lastAttempt?: boolean } = {}): Promise<{ status: RzStatus }> {
  const cleanText = text.replace(RAZIEL_TRIGGER, "").trim();
  if (!cleanText) return { status: "permanent_error" };
  const { facts, values } = await buildFacts(cleanText);
  const convNote = await convergenceInsight(values);
  const ctx = opts.ctx ?? (opts.userRef ? await getContext(opts.userRef, chatId) : null);
  const ctxText = contextToText(ctx);
  const dialogue = await recentDialogue(chatId, 6, quotedId);
  const dialogueBlock = dialogue ? `שיחה קודמת (הקשר — כך תדע למה הכוונה בתמשיך/מה שהצעת, ומה הנושא הפעיל):\n${dialogue}\n\n` : "";
  const wantsLearn = opts.teach && LEARN_INTENT.test(cleanText);
  const system = RAZIEL_SYSTEM + ((opts.teach) ? TEACH_ADDON : "");
  const user = `${dialogueBlock}ההודעה הנוכחית:\n"""\n${cleanText.slice(0,4000)}\n"""\n\nערכי-מנוע אפשריים למילות ההודעה (intent_before_compute_law — רלוונטי רק אם ההודעה מבקשת לבדוק נושא-גימטריה מפורש. אם ההודעה שיחתית/בקשה/תמשיך/תודה — התעלם מהם לחלוטין, אל תציג טבלת-ערכים, והמשך את הנושא מהשיחה הקודמת):\n${facts||"(לא זוהו ערכים)"}${convNote}${ctxText}${opts.extra||""}${wantsLearn?"\n\nהמשתמש רוצה ללמוד — למד לפי מצב-לימוד.":""}\n\nכתוב מענה לפי חוקי הברזל — קודם הבן כוונה (חוק 10), ורק אז אולי גימטריה.`;
  const guardian = () => sendGuardianFallback(cleanText, chatId, quotedId, facts, convNote, opts.welcome);
  // שכבת-הפרשנות (Claude) — רק על העובדות שכבר חושבו.
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:MODEL,max_tokens:1500,system,messages:[{role:"user",content:user}]}),
    });
  } catch (e) {
    trace.push({ step: "ai_throw", e: String(e) });
    if (opts.lastAttempt) { await guardian(); return { status: "refused_with_fallback" }; }
    return { status: "retryable_error" };
  }
  if (!resp.ok) {
    trace.push({ step: "ai_http", st: resp.status });
    if (TRANSIENT_HTTP.has(resp.status) && !opts.lastAttempt) return { status: "retryable_error" };
    await guardian(); return { status: "refused_with_fallback" }; // סופי/מוצו-ניסיונות → שומר עונה, בלי שתיקה
  }
  let d: any;
  try { d = await resp.json(); }
  catch { if (opts.lastAttempt) { await guardian(); return { status: "refused_with_fallback" }; } return { status: "retryable_error" }; }
  const refused = d?.stop_reason === "refusal";
  let reply = refused ? "" : (d?.content||[]).filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n").trim();
  if (refused || !reply) {
    // 🕎 Claude סירב/החזיר ריק — מטטרון מחליט: תשובת-מחקר מהמנוע בלבד. המשתמש לא יודע שהיה סירוב.
    await guardian();
    return { status: "refused_with_fallback" };
  }
  try { await sb.from("ai_token_log").insert({source:"wa-raziel",kind:"raziel_reply",model:MODEL,input_tokens:d?.usage?.input_tokens||0,output_tokens:d?.usage?.output_tokens||0}); } catch { /* noop */ }
  if (opts.welcome) reply = opts.welcome + reply;
  const payload: any = { chatId, message: reply };
  if (quotedId) payload.quotedMessageId = quotedId;
  const okId = await sendVerified(payload);
  if (!okId) await enqueueOutbox("raziel:"+(quotedId||chatId), chatId, reply, cleanText);
  return { status: "answered" };
}
const rzOk = (s: RzStatus) => s === "answered" || s === "refused_with_fallback";

async function initiativeBudget(chatId: string): Promise<boolean> {
  const since = new Date(Date.now() - INITIATIVE_COOLDOWN_MIN*60*1000).toISOString();
  const { data } = await sb.from("wa_bot_log").select("id").eq("group_id", chatId).eq("action", "raziel_initiative").gte("created_at", since).limit(1).maybeSingle();
  return !data;
}

async function handleGroup(chatId: string, nowSec: number): Promise<number> {
  const isAmitGroup = chatId === AMIT_GROUP;
  let hist; try { hist=await waAdmin("getChatHistory",{chatId,count:20}); } catch { return 0; }
  const msgs = pick(hist).filter((m)=>{
    const typ=m.typeMessage||""; const ok=["textMessage","extendedTextMessage","quotedMessage","imageMessage"].includes(typ);
    return m.type==="incoming"&&ok&&(nowSec-Number(m.timestamp||0))<3*3600;
  }).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
  let n=0;
  for (const m of msgs.slice(-MAX_PER_RUN)) {
    const msgId=m.idMessage; if (!msgId||await alreadyDone(msgId)) continue;
    const snd=m.senderId||chatId; const sname=m.senderName||"";
    const sphone=String(snd).replace(/[^0-9]/g,"");
    const text=m.textMessage||m.extendedTextMessage?.text||m.caption||""; const isImg=m.typeMessage==="imageMessage";
    const isChristina=String(snd).includes(CHRISTINA_PHONE);
    if (!isImg && clean(text).length>=2) { const id = await resolveIdentity(snd); await remember(id?.user_ref ?? null, chatId, text, "conversation", "personal"); }
    if (isAmitGroup) {
      const triggering = RAZIEL_TRIGGER.test(text);
      if (!triggering) { await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[amit-group: gabriel handles]",action:"christina_auto"}); continue; }
      const allowed = await hasRazielAccess(snd);
      if (!allowed) { await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[no raziel_access]",action:"christina_auto"}); continue; }
      const cleanQ = text.replace(RAZIEL_TRIGGER,"").trim();
      if (EN_DOMINANT(cleanQ)) {
        const redirectMsg = `שאלת אנגלית — גבריאל המומחה בגשרי-שפה יענה לך יותר טוב.\n— רזיאל · סוד 1820`;
        const okId = await sendVerified({chatId,message:redirectMsg,quotedMessageId:msgId});
        if (!okId) await enqueueOutbox("raziel:"+msgId, chatId, redirectMsg, text);
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:redirectMsg,action:"christina_auto"}); n++; continue;
      }
      const r = await razielRespond(text, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
      const ok = rzOk(r.status);
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[sent]":"[failed]",action:"christina_auto"});
      if (ok) { await alertZuriel(sphone, sname, text, "קבוצת עמית"); n++; } continue;
    }
    if (isChristina && chatId !== GILUI_GROUP) {
      const invoking = RAZIEL_TRIGGER.test(text);
      if (!invoking) { await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[muted: uriel handles christina]",action:"christina_auto"}); continue; }
      const allowed = await hasRazielAccess(snd);
      if (!allowed) { await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[no raziel_access]",action:"christina_auto"}); continue; }
    }
    if (isImg&&!clean(text)) {
      try { await waAdmin("sendMessage",{chatId:ZURIEL,message:`🔔 ${sname||snd} שלח/ה תמונה.`}); } catch { /* noop */ }
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,action:"christina_auto",text_in:"[image]",reply_out:"[notified zuriel]"}); n++; continue;
    }
    if (clean(text).length<2) continue;
    const triggered = RAZIEL_TRIGGER.test(text);
    if (triggered) {
      const cleanText = text.replace(RAZIEL_TRIGGER,"").trim();
      const r = await razielRespond(cleanText, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
      const ok = rzOk(r.status);
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[sent]":"[no reply]",action:"christina_auto"});
      if (ok) { await alertZuriel(sphone, sname, text, "קבוצה"); n++; } continue;
    }
    if (await initiativeBudget(chatId)) {
      const { convergence } = await buildFacts(text);
      if (convergence) {
        const r = await razielRespond(text, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
        const ok = rzOk(r.status);
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[initiative]":"[init-failed]",action:"raziel_initiative"});
        if (ok) { await alertZuriel(sphone, sname, text, "קבוצה (יזום)"); n++; continue; }
      }
    }
    await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[silent: remembered]",action:"christina_auto"});
  }
  return n;
}

async function answersToday(chatId: string): Promise<number> {
  const since = new Date(); since.setUTCHours(0,0,0,0);
  const { count } = await sb.from("wa_bot_log").select("*", { count: "exact", head: true })
    .eq("group_id", chatId).eq("action", "raziel_dm").in("reply_out", ["[dm-sent]", "[dm-fallback]"]).gte("created_at", since.toISOString());
  return count || 0;
}
async function touchReferral(phone: string) {
  try { await sb.rpc("fn_bot_referral_touch", { p_phone: phone, p_source: "raziel" }); } catch { /* noop */ }
}
async function ownedNumbers(): Promise<Set<string>> {
  const since = new Date(Date.now() - 30*24*3600*1000).toISOString();
  const { data } = await sb.from("wa_bot_log").select("sender").in("action",["uriel_auto","hatishbi","michael"]).gte("created_at", since).limit(2000);
  const s = new Set<string>();
  for (const r of (data||[])) { const p = String((r as any).sender||"").replace(/[^0-9]/g,""); if (p) s.add(p); }
  return s;
}
async function unlimitedNumbers(): Promise<Set<string>> {
  const { data } = await sb.from("raziel_unlimited").select("phone");
  return new Set((data||[]).map((r:any)=>String(r.phone).replace(/[^0-9]/g,"")));
}
async function quotaOverrides(): Promise<Map<string,number>> {
  const m = new Map<string,number>();
  try {
    const { data } = await sb.from("raziel_quota").select("phone,daily_quota");
    for (const r of (data||[])) { const p=String((r as any).phone).replace(/[^0-9]/g,""); const q=Number((r as any).daily_quota); if (p && q>0) m.set(p, q); }
  } catch { /* noop */ }
  return m;
}
async function servicesText(): Promise<string> {
  try {
    const { data } = await sb.from("site_services").select("title,description,icon,url,wow").eq("active",true).order("sort");
    if (!data?.length) return "";
    const lines = data.map((s:any)=> `${s.icon||"•"} ${s.title}${s.wow?" ✨":""} — ${s.description}${s.url?` (${SITE}${s.url})`:""}`);
    return "\n\nשירותי המערכת:\n" + lines.join("\n");
  } catch { return ""; }
}

function authClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
}
async function clearLinkFlow(phone: string) { try { await sb.from("raziel_link_flow").delete().eq("phone", phone); } catch { /* noop */ } }
async function getLinkFlow(phone: string): Promise<any | null> {
  const { data } = await sb.from("raziel_link_flow").select("*").eq("phone", phone).maybeSingle();
  if (!data) return null;
  if ((Date.now() - new Date((data as any).updated_at).getTime()) / 60000 > LINK_FLOW_TTL_MIN) { await clearLinkFlow(phone); return null; }
  return data;
}
async function setLinkFlow(phone: string, state: string, email?: string | null, attempts = 0) {
  try { await sb.from("raziel_link_flow").upsert({ phone, state, email: email ?? null, attempts, updated_at: new Date().toISOString() }, { onConflict: "phone" }); } catch { /* noop */ }
}
async function startEmailOtp(email: string): Promise<boolean> {
  try { const { error } = await authClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } }); return !error; } catch { return false; }
}
async function subscribeToNewsletter(email: string, name: string | null = null): Promise<boolean> {
  const e = (email || "").trim().toLowerCase();
  if (!e || !EMAIL_RE.test(e)) return false;
  try {
    const { data: exists } = await sb.from("subscribers").select("id").eq("email", e).maybeSingle();
    if (exists) return false;
    await sb.from("subscribers").insert({ email: e, name, source: "raziel", active: true });
    return true;
  } catch { return false; }
}
async function verifyEmailOtpAndLink(phone: string, email: string, code: string): Promise<{ ok: boolean; subscribed: boolean }> {
  try {
    const { data, error } = await authClient().auth.verifyOtp({ email, token: code.replace(/[^0-9]/g, ""), type: "email" });
    const uid = (data as any)?.user?.id;
    if (error || !uid) return { ok: false, subscribed: false };
    const nowIso = new Date().toISOString();
    await sb.from("wa_account_links").upsert({ phone, user_id: uid, verified_at: nowIso, welcomed_at: nowIso }, { onConflict: "phone" });
    const subscribed = await subscribeToNewsletter(email.toLowerCase());
    return { ok: true, subscribed };
  } catch { return { ok: false, subscribed: false }; }
}

async function handleAllDMs(nowSec: number, policy: any): Promise<number> {
  let hist; try { hist = await waAdminGet("lastIncomingMessages", {}); } catch { return 0; }
  const goLive = policy?.go_live_at ? Math.floor(new Date(policy.go_live_at).getTime() / 1000) : null;
  const owned = await ownedNumbers();
  const unlimited = await unlimitedNumbers();
  const overrides = await quotaOverrides();
  const dms = pick(hist).filter((m:any)=> String(m.chatId||"").endsWith("@c.us") && (nowSec - Number(m.timestamp||0) < 3*3600));
  const byChat: Record<string, any> = {};
  for (const m of dms) { const c=m.chatId; if (!byChat[c] || Number(m.timestamp) > Number(byChat[c].timestamp)) byChat[c]=m; }
  let n = 0;
  for (const chatId of Object.keys(byChat).slice(0, MAX_DM_CHATS_PER_RUN)) {
    const m = byChat[chatId];
    const msgId = m.idMessage; if (!msgId || await alreadyDone(msgId, "raziel_dm")) continue;
    const text = m.textMessage || m.extendedTextMessageData?.text || "";
    if (clean(text).length < 1) continue;
    const phone = chatId.replace("@c.us","");
    if (owned.has(phone)) continue;
    const idn = await resolveIdentity(chatId);
    if (!idn) continue;
    let linked = idn?.linked === true;
    let userRef = idn?.user_ref || ("wa:"+phone);
    if (!linked) {
      const { data: lr } = await sb.from("wa_account_links").select("user_id").eq("phone", phone).maybeSingle();
      if ((lr as any)?.user_id) { linked = true; userRef = String((lr as any).user_id); }
    }

    // 🧠 v40 — לכידת נתונים אישיים מכל הודעת-DM (עצמאי מהצלחת התשובה, פרטי בלבד). לפני השער/הניתוב.
    try { await savePersonalData(userRef, chatId, text); } catch { /* noop */ }

    if (!linked) {
      if (!policy?.answer_everyone) continue;
      if (goLive === null || Number(m.timestamp||0) <= goLive) continue;
    }

    const regUrlLink = policy.register_url || (SITE + "/login?src=raziel");
    if (!linked) {
      const flow = await getLinkFlow(phone);
      if (flow && CANCEL_RE.test(text.trim())) {
        await clearLinkFlow(phone);
        const msg = `בסדר גמור, עצרנו את החיבור. אפשר להמשיך לחקור חופשי, ולחבר מתי שתרצה. במה נתחיל?\n— רזיאל · סוד 1820`;
        const okId = await sendVerified({ chatId, message: msg }); if (!okId) await enqueueOutbox("raziel-link:"+msgId, chatId, msg, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM-anon", text_in: text.slice(0,500), reply_out: "[link-cancel]", action: "raziel_dm" });
        continue;
      }
      if (flow?.state === "awaiting_email") {
        const em = (text.match(EMAIL_RE) || [])[0];
        let msg: string;
        if (em) {
          const sent = await startEmailOtp(em.toLowerCase());
          if (sent) { await setLinkFlow(phone, "awaiting_code", em.toLowerCase()); msg = `מצוין, שלחתי קוד בן 6 ספרות למייל ${em}. מה הקוד?\n— רזיאל · סוד 1820`; }
          else { await clearLinkFlow(phone); msg = `לא הצלחתי למצוא חשבון עם ${em}. אם יש מייל אחר — שלח אותו. להרשמה: ${regUrlLink}\n— רזיאל · סוד 1820`; }
        } else {
          msg = `כדי לחבר את הוואטסאפ לחשבון — מה המייל שאיתו נרשמת? (או ביטול)\n— רזיאל · סוד 1820`;
        }
        const okId = await sendVerified({ chatId, message: msg }); if (!okId) await enqueueOutbox("raziel-link:"+msgId, chatId, msg, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM-anon", text_in: text.slice(0,500), reply_out: "[link-email]", action: "raziel_dm" });
        continue;
      }
      if (flow?.state === "awaiting_code") {
        const code = (text.match(CODE_RE) || [])[1];
        const otherEmail = (text.match(EMAIL_RE) || [])[0];
        let msg: string; let outcome = "[link-code]";
        if (code && flow.email) {
          const res = await verifyEmailOtpAndLink(phone, flow.email, code);
          if (res.ok) {
            await clearLinkFlow(phone);
            const nl = res.subscribed ? "\nוצירפתי אותך גם לעדכוני המייל של סוד 1820." : "";
            msg = `מחובר! מעכשיו אתה מזוהה — בלי הגבלה, וכל המחקר נשמר.${nl}\nאז ספר לי: איזה מספר, שם או רמז מסקרן אותך?\n— רזיאל · סוד 1820`;
            outcome = "[link-ok]";
          } else {
            const att = (flow.attempts || 0) + 1;
            if (att >= 4) { await clearLinkFlow(phone); msg = `הקוד לא הסתדר. אפשר לנסות שוב מאוחר יותר, או לחבר דרך האתר: ${regUrlLink}\n— רזיאל · סוד 1820`; outcome = "[link-fail]"; }
            else { await setLinkFlow(phone, "awaiting_code", flow.email, att); msg = `הקוד לא תואם. נסה שוב — מה 6 הספרות? (או ביטול)\n— רזיאל · סוד 1820`; outcome = "[link-code-retry]"; }
          }
        } else if (otherEmail) {
          const sent = await startEmailOtp(otherEmail.toLowerCase());
          if (sent) { await setLinkFlow(phone, "awaiting_code", otherEmail.toLowerCase()); msg = `שלחתי קוד חדש ל-${otherEmail}. מה 6 הספרות?\n— רזיאל · סוד 1820`; }
          else { await clearLinkFlow(phone); msg = `לא מצאתי חשבון עם ${otherEmail}. להרשמה: ${regUrlLink}\n— רזיאל · סוד 1820`; }
          outcome = "[link-email]";
        } else {
          msg = `כמעט שם. שלחתי קוד בן 6 ספרות למייל שלך — מה הקוד? (או ביטול)\n— רזיאל · סוד 1820`;
        }
        const okId = await sendVerified({ chatId, message: msg }); if (!okId) await enqueueOutbox("raziel-link:"+msgId, chatId, msg, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM-anon", text_in: text.slice(0,500), reply_out: outcome, action: "raziel_dm" });
        continue;
      }
      if (!flow && ACCOUNT_INTENT.test(text)) {
        await setLinkFlow(phone, "awaiting_email");
        const msg = `מעולה, בוא נחבר את הוואטסאפ לחשבון הקיים שלך — מה המייל שאיתו נרשמת? אשלח קוד קצר לאימות.\n— רזיאל · סוד 1820`;
        const okId = await sendVerified({ chatId, message: msg }); if (!okId) await enqueueOutbox("raziel-link:"+msgId, chatId, msg, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM-anon", text_in: text.slice(0,500), reply_out: "[link-start]", action: "raziel_dm" });
        continue;
      }
    }

    if (policy.en_to_gabriel && EN_DOMINANT(text)) {
      const msg = "English question — Gabriel is our language-bridge expert. שאל בעברית ואשמח לעזור.\n— רזיאל · סוד 1820";
      const okId = await sendVerified({ chatId, message: msg });
      if (!okId) await enqueueOutbox("raziel-en:"+msgId, chatId, msg, text);
      await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM", text_in: text.slice(0,500), reply_out: "[en-gabriel]", action: "raziel_dm" });
      continue;
    }

    const anonLimit = overrides.get(phone) ?? policy.free_per_day_anon;
    if (!linked && policy.after_gate !== "unlimited" && !unlimited.has(phone)) {
      const used = await answersToday(chatId);
      if (used >= anonLimit) {
        const regUrl = policy.register_url || (SITE + "/login?src=raziel");
        const gate = `הגעת ל-${anonLimit} השאלות היומיות. כדי להמשיך בלי הגבלה ולשמור את המחקר — הצטרף: ${regUrl}\n— רזיאל · סוד 1820`;
        await touchReferral(phone);
        const okId = await sendVerified({ chatId, message: gate });
        if (!okId) await enqueueOutbox("raziel-gate:"+msgId, chatId, gate, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM", text_in: text.slice(0,500), reply_out: "[dm-gate]", action: "raziel_dm" });
        continue;
      }
    }

    const { data: last } = await sb.from("wa_bot_log").select("created_at").eq("group_id", chatId).eq("action", "raziel_dm").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const ctx = await getContext(userRef, chatId);
    let welcome = "";
    if (!last) {
      welcome = linked
        ? "ברוך שובך. נמשיך לחקור — איזה רעיון, מספר או שם מסקרן אותך היום?\n\n"
        : `ברוך הבא. אני רזיאל, השער למערכת המחקר של SOD1820. ספר לי מה מסקרן אותך — מספר, שם, פסוק או רמז — ונחקור יחד.\n(לא-רשומים: ${anonLimit} שאלות ביום; הרשמה: ${policy.register_url || (SITE+"/login?src=raziel")})\n\n`;
      if (!linked) await touchReferral(phone);
    } else {
      const hrs = (Date.now() - new Date((last as any).created_at).getTime()) / 3.6e6;
      if (hrs > 6) {
        const lastThread = ctx?.user_context?.research_threads?.[0];
        welcome = lastThread ? `שלום שוב. בפעם הקודמת עסקנו ב: ${String(lastThread).slice(0,80)}.\n\n` : "שלום שוב.\n\n";
      }
    }
    const extra = SERVICES_INTENT.test(text) ? await servicesText() : "";
    // v41 — ניסיון-חוזר עד MAX_AI_RETRIES; בניסיון האחרון razielRespond מפעיל שומר-מטטרון במקום להשאיר retryable.
    const priorRetries = await countAiRetries(msgId);
    const res = await razielRespond(text, chatId, msgId, { userRef, isDM: true, welcome, ctx, teach: policy.teach_mode, extra, lastAttempt: priorRetries + 1 >= MAX_AI_RETRIES });
    const nm = linked ? "DM" : "DM-anon";
    if (res.status === "retryable_error") {
      // 🔄 שגיאה חולפת — לא סוגרים את ההודעה (action נפרד), כדי שה-cron הבא ינסה שוב.
      await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: nm, text_in: text.slice(0,500), reply_out: `[dm-retry ${priorRetries+1}/${MAX_AI_RETRIES}]`, action: "raziel_dm_retry" });
      continue;
    }
    const label = res.status === "answered" ? "[dm-sent]" : res.status === "refused_with_fallback" ? "[dm-fallback]" : "[dm-error]";
    await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: nm, text_in: text.slice(0,500), reply_out: label, action: "raziel_dm" });
    if (rzOk(res.status)) {
      n++;
      await remember(userRef, chatId, text, "conversation", "personal");
      await alertZuriel(phone, idn?.name || (linked ? "משתמש מזוהה" : "פונה חדש"), text, res.status === "refused_with_fallback" ? "פרטי (DM · שומר-מטטרון)" : "פרטי (DM)");
    }
  }
  return n;
}

async function sendProactiveWelcomes(): Promise<number> {
  const { data: links } = await sb.from("wa_account_links").select("phone").is("welcomed_at", null).limit(10);
  let n = 0; const now = new Date().toISOString();
  for (const l of (links || [])) {
    const phone = (l as any).phone as string; if (!phone) continue;
    const chatId = phone + "@c.us";
    const { data: prior } = await sb.from("wa_bot_log").select("id").eq("group_id", chatId).eq("action", "raziel_dm").limit(1).maybeSingle();
    if (prior) { await sb.from("wa_account_links").update({ welcomed_at: now }).eq("phone", phone).is("welcomed_at", null); continue; }
    const { data: claimed } = await sb.from("wa_account_links").update({ welcomed_at: now }).eq("phone", phone).is("welcomed_at", null).select("phone");
    if (!claimed || !claimed.length) continue;
    const msg = `ברוך הבא. אני רזיאל. חיברת את הוואטסאפ לחשבון שלך בסוד 1820 — ומכאן אני השער למערכת המחקר. ספר לי מה מסקרן אותך — מספר, שם, פסוק או רמז — ונחקור יחד.\n— רזיאל · סוד 1820`;
    const okId = await sendVerified({ chatId, message: msg });
    if (okId) { await logBot({ group_id: chatId, msg_id: "welcome:"+phone, sender: phone, sender_name: "DM", text_in: "[link]", reply_out: "[proactive-welcome]", action: "raziel_dm" }); n++; }
    else { await enqueueOutbox("raziel-welcome:"+phone, chatId, msg, "[link]"); }
  }
  return n;
}

Deno.serve(async(req)=>{
  const u=new URL(req.url);
  if (u.searchParams.get("s")!==SECRET) return new Response("forbidden",{status:403});
  trace=[]; const nowSec=Date.now()/1000; let n=0;
  const { data: policy } = await sb.from("raziel_dm_policy").select("*").eq("id",1).maybeSingle();
  const pol = policy || { answer_everyone:true, free_per_day_anon:3, after_gate:"invite_link", scope:"smart", teach_mode:true, en_to_gabriel:true };
  try { await loadPersona(); } catch(e){ trace.push({src:"persona",e:String(e)}); }
  try { await retryOutbox(); } catch(e){ trace.push({src:"outbox",e:String(e)}); }
  try { n+=await sendProactiveWelcomes(); } catch(e){ trace.push({src:"welcome",e:String(e)}); }
  try { n+=await handleAllDMs(nowSec, pol); } catch(e){ trace.push({src:"dm",e:String(e)}); }
  if (GROUPS_ENABLED) {
    for (const g of OPEN_GROUPS) { try { n+=await handleGroup(g,nowSec); } catch(e){ trace.push({group:g,e:String(e)}); } }
    try { n+=await handleGroup(AMIT_GROUP,nowSec); } catch(e){ trace.push({group:"amit",e:String(e)}); }
  }
  return new Response(JSON.stringify({replied:n,trace:u.searchParams.get("debug")==="1"?trace:undefined}),{headers:{"Content-Type":"application/json"}});
});
