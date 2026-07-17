// 🛡️ wa-michael — v3 — 17.7.2026 — גרסת בונד + פרוטוקול-מסירה (bot_delivery_law).
// חדש ב-v3: sendVerified + bot_outbox — לא נתקע אם שליחה נכשלת.
// v2: web_search, propose_message, 10 סבבי כלים. עונה רק לצוריאל. כתיבה/שליחה — רק אחרי "בצע". DDL חסום.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const ZURIEL = Deno.env.get("ZURIEL_WA") || "972556651237@c.us";
const MAX_PER_HOUR = 30;
const MAX_TOOL_LOOPS = 10;
const MAX_SEND_RETRIES = 4;

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

async function waAdmin(method: string, payload: unknown) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: "POST" });
  return data;
}
function pick(v: any): any[] { return (Array.isArray(v) ? v : (v?.result ?? [])); }
async function logBot(row: Record<string, unknown>) {
  const { error } = await sb.from("wa_bot_log").insert(row);
  if (error) trace.push({ step: "logBot", error: error.message });
}
async function alreadyDone(id: string): Promise<boolean> {
  const { data } = await sb.from("wa_bot_log").select("id").eq("msg_id", id).maybeSingle();
  return !!data;
}

// === מסירה מאומתת + תור-יציאה (bot_delivery_law) ===
async function sendVerified(chatId: string, message: string): Promise<string | null> {
  try { const res: any = await waAdmin("sendMessage", { chatId, message }); return res?.result?.idMessage || res?.idMessage || null; }
  catch (e) { trace.push({ step: "send_throw", e: String(e) }); return null; }
}
async function enqueueOutbox(doneKey: string, chatId: string, reply: string, msgIn: string) {
  try { await sb.from("bot_outbox").upsert({ done_key: doneKey, bot: "michael", chat_id: chatId, reply: reply.slice(0, 6000), msg_in: (msgIn || "").slice(0, 500), status: "pending" }, { onConflict: "done_key" }); }
  catch (e) { trace.push({ step: "enqueue_err", e: String(e) }); }
}
async function retryOutbox() {
  const { data } = await sb.from("bot_outbox").select("done_key,chat_id,reply,msg_in,attempts").eq("bot", "michael").eq("status", "pending").order("first_at").limit(5);
  for (const r of (data || [])) {
    const okId = await sendVerified(r.chat_id, r.reply);
    if (okId) { await sb.from("bot_outbox").update({ status: "sent", sent_msg_id: okId, last_at: new Date().toISOString() }).eq("done_key", r.done_key); }
    else {
      const { data: n } = await sb.rpc("fn_outbox_bump", { p_done_key: r.done_key });
      const attempts = typeof n === "number" ? n : (r.attempts + 1);
      if (attempts >= MAX_SEND_RETRIES) { await sb.from("bot_outbox").update({ status: "failed" }).eq("done_key", r.done_key); }
    }
  }
}

const SYSTEM =
  "אתה מיכאל — העוזר האישי של צוריאל, מנהל המשרד של סוד 1820 בוואטסאפ. אתה מדבר רק איתו. יעיל, מדויק, בלי מלל — סוכן שמבצע.\n" +
  "\nהמערכת שאתה מנהל: רזיאל (פרשן הקבוצה, wa-christina), אוריאל (חוקר השיטה של כריסטינה, wa-uriel), גבריאל (מוכן לעמית בלייז), מטטרון (סורק התכנסויות לילי), ואתה.\n" +
  "\nהמאגר (טבלאות עיקריות):\n" +
  "• gematria_words: phrase, ragil, misratar, kadmi, miluy, gadol, siduri, all_values(int[]), is_verified, space(core/lab/private), dna_status, notes — חיפוש ערך: WHERE N = ANY(all_values)\n" +
  "• work_log: session_date, topic, what_we_did, status, open_threads — יומן העבודה (נקודת הכניסה לכל שאלת 'איפה עצרנו')\n" +
  "• convergences / metatron_desk(view): ממצאי מטטרון (kind, method, value, phrases, group_size, status)\n" +
  "• subscriber_economics(view), paid_subscribers, subscriber_payments — כסף: עלות/הכנסה/רווח פר מנוי\n" +
  "• uriel_drafts (draft_text=מה שנשלח לכריסטינה, status=auto_sent), christina_letter_combinations, christina_research_questions, christina_decomposition_rules\n" +
  "• amit_method_notes, amit_research_questions — מחקר עמית (גבריאל)\n" +
  "• posts(title, content, date, author), nodes(חוקי מערכת), wa_bot_log(לוג בוטים: action=uriel_auto/christina_auto/michael), ai_token_log(צריכת AI), michael_pending_actions\n" +
  "\nהכלים שלך:\n" +
  "• run_sql — SELECT בלבד, עד 50 שורות. העדף שאילתה אחת מקיפה (עם JOIN/אגרגציה) על פני הרבה קטנות — יש לך תקציב צעדים מוגבל.\n" +
  "• web_search — חיפוש באינטרנט (חדשות, מחירים, שער דולר, מידע עדכני).\n" +
  "• propose_write — הצעת INSERT/UPDATE/DELETE. ממתין לאישור 'בצע'.\n" +
  "• propose_message — הצעת שליחת הודעת וואטסאפ למישהו (כריסטינה: 972507555102@c.us). ממתין לאישור 'בצע'.\n" +
  "\nחוקים:\n" +
  "1. עובדות על הפרויקט — רק מהמאגר. לא מצאת — אמור זאת. ידע כללי/אינטרנט — ציין מקור.\n" +
  "2. לעולם לא DDL (CREATE/ALTER/DROP) — זה רק דרך קלוד. אם צוריאל מבקש שינוי מבנה — הפנה אותו לקלוד.\n" +
  "3. עברית ב-SQL כתיבה — dollar quoting ($c$...$c$).\n" +
  "4. תשובות קצרות לוואטסאפ, עד ~10 שורות אלא אם התבקש פירוט. מספרים ועובדות — מדויקים. חתום: — מיכאל\n" +
  "5. מונחים: מסתתר תמיד מילה-מילה; קדמי=פוטנציאל=משולש; מילוי=נשמה; רגיל=זהות.\n" +
  "6. אם לא הספקת לסיים במכסת הצעדים — סכם מה מצאת עד כה ומה נשאר לבדוק.";

const TOOLS: any[] = [
  {
    name: "run_sql",
    description: "הרצת שאילתת SELECT על מאגר סוד 1820 (קריאה בלבד, עד 50 שורות)",
    input_schema: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] },
  },
  {
    name: "propose_write",
    description: "הצעת פעולת כתיבה (INSERT/UPDATE/DELETE) שתמתין לאישור 'בצע' מצוריאל",
    input_schema: { type: "object", properties: { sql: { type: "string" }, description: { type: "string" } }, required: ["sql", "description"] },
  },
  {
    name: "propose_message",
    description: "הצעת שליחת הודעת וואטסאפ לצ'אט מסוים. תמתין לאישור 'בצע' מצוריאל לפני שתישלח",
    input_schema: { type: "object", properties: { chat_id: { type: "string" }, message: { type: "string" }, description: { type: "string" } }, required: ["chat_id", "message", "description"] },
  },
  { type: "web_search_20250305", name: "web_search" },
];

async function runTool(name: string, input: any): Promise<string> {
  if (name === "run_sql") {
    const { data, error } = await sb.rpc("fn_michael_query", { p_sql: String(input?.sql || "") });
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify(data).slice(0, 6000);
  }
  if (name === "propose_write") {
    const { data, error } = await sb.from("michael_pending_actions")
      .insert({ kind: "sql", description: String(input?.description || "").slice(0, 300), sql_text: String(input?.sql || "") })
      .select("id").maybeSingle();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ queued: true, id: data?.id, note: "ממתין ל'בצע' מצוריאל" });
  }
  if (name === "propose_message") {
    const { data, error } = await sb.from("michael_pending_actions")
      .insert({ kind: "message", description: String(input?.description || "").slice(0, 300), sql_text: "[message]", payload: { chat_id: String(input?.chat_id || ""), message: String(input?.message || "") } })
      .select("id").maybeSingle();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ queued: true, id: data?.id, note: "ממתין ל'בצע' מצוריאל" });
  }
  return JSON.stringify({ error: "unknown tool" });
}

async function agentReply(text: string): Promise<string | null> {
  if (!ANTHROPIC) return null;
  const messages: any[] = [{ role: "user", content: text.slice(0, 3000) }];
  for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools: TOOLS, messages }),
    });
    if (!resp.ok) { trace.push({ step: "anthropic", status: resp.status }); return null; }
    const d = await resp.json();
    try { await sb.from("ai_token_log").insert({ source: "wa-michael", kind: "agent", model: MODEL, input_tokens: d?.usage?.input_tokens || 0, output_tokens: d?.usage?.output_tokens || 0 }); } catch { /* noop */ }
    if (d?.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: d.content });
      const results: any[] = [];
      for (const block of d.content.filter((c: any) => c.type === "tool_use")) {
        const out = await runTool(block.name, block.input);
        results.push({ type: "tool_result", tool_use_id: block.id, content: out });
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    const txt = (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    return txt || null;
  }
  return "סיכום ביניים: בדקתי כמה כיוונים ולא הספקתי לסגור — פצל את השאלה לשניים. — מיכאל";
}

async function sentLastHour(): Promise<number> {
  const cutoff = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from("wa_bot_log").select("id", { count: "exact", head: true })
    .eq("action", "michael").gte("created_at", cutoff);
  return count || 0;
}

async function handle(nowSec: number): Promise<number> {
  let hist;
  try { hist = await waAdmin("getChatHistory", { chatId: ZURIEL, count: 10 }); } catch { return 0; }
  const msgs = pick(hist).filter((m) =>
    m.type === "incoming" &&
    ["textMessage", "extendedTextMessage", "quotedMessage"].includes(m.typeMessage || "") &&
    (nowSec - Number(m.timestamp || 0)) < 3 * 3600 &&
    (m.textMessage || m.extendedTextMessage?.text || "").trim()
  ).sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));
  let n = 0;
  for (const m of msgs) {
    const msgId = "michael:" + m.idMessage;
    if (await alreadyDone(msgId)) continue;
    if ((await sentLastHour()) >= MAX_PER_HOUR) { trace.push({ step: "rate_limited" }); break; }
    const text = (m.textMessage || m.extendedTextMessage?.text || "").trim();

    let reply: string | null;
    if (/^בצע\b/.test(text)) {
      const { data: act } = await sb.from("michael_pending_actions").select("id, description")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!act) { reply = "אין פעולה ממתינה 👍 — מיכאל"; }
      else {
        const { data: res } = await sb.rpc("fn_michael_execute", { p_action_id: act.id });
        reply = `${act.description}:\n${res} — מיכאל`;
      }
    } else if (/^בטל פעולה\b/.test(text)) {
      const { data: act } = await sb.from("michael_pending_actions").select("id")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (act) { await sb.from("michael_pending_actions").update({ status: "rejected" }).eq("id", act.id); reply = "בוטל ✖️ — מיכאל"; }
      else reply = "אין פעולה ממתינה — מיכאל";
    } else {
      reply = await agentReply(text);
    }

    if (!reply) { continue; }
    const okId = await sendVerified(ZURIEL, reply);
    await logBot({ group_id: "michael", msg_id: msgId, sender: ZURIEL, sender_name: "צוריאל", text_in: text.slice(0, 500), reply_out: (okId ? reply : "[queued] " + reply).slice(0, 1000), action: "michael" });
    if (!okId) await enqueueOutbox(msgId, ZURIEL, reply, text);
    n++;
  }
  return n;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  trace = [];
  const nowSec = Date.now() / 1000;
  let replies = 0;
  try { await retryOutbox(); } catch (e) { trace.push({ src: "outbox", e: String(e) }); }
  try { replies = await handle(nowSec); } catch (e) { trace.push({ src: "handle", e: String(e) }); }
  const body: any = { replies, trace: u.searchParams.get("debug") === "1" ? trace : undefined };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
});
