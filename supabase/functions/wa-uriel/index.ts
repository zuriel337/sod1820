// wa-uriel v11 — 16.7.2026 — אימות מסירה + תור־יציאה (bot_outbox)
// v11: כל שליחה מאומתת (idMessage) לפני שמסמנים "טופל". שליחה שנכשלה נכנסת ל-bot_outbox
//      ונשלחת שוב (בלי לייצר מחדש ב-AI) עד הצלחה או תקרת ניסיונות. פותר את "הבוט נרדם".
// v9: אם כריסטינה כותבת "רזיאל:" בתחילת ההודעה — מנוע גימטריה של רזיאל עונה, לא אוריאל.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const CHRISTINA = "972507555102@c.us";
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const ZURIEL = Deno.env.get("ZURIEL_WA") || "972556651237@c.us";
const MAX_PER_HOUR = 6;
const MAX_SEND_RETRIES = 4;
const RAZIEL_TRIGGER = /^(רזיאל[,:\s]|@רזיאל)/i;

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
async function sentLastHour(): Promise<number> {
  const cutoff = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from("uriel_drafts").select("id", { count: "exact", head: true })
    .in("status", ["sent", "edited", "auto_sent"]).gte("sent_at", cutoff);
  return count || 0;
}

// === מסירה מאומתת + תור־יציאה (הפרוטוקול המשותף) ===
// מחזיר idMessage בהצלחה, null בכישלון. ראה חוק bot_delivery_law.
async function sendVerified(chatId: string, message: string): Promise<string | null> {
  try { const res: any = await waAdmin("sendMessage", { chatId, message }); return res?.result?.idMessage || res?.idMessage || null; }
  catch (e) { trace.push({ step: "send_throw", e: String(e) }); return null; }
}
async function enqueueOutbox(doneKey: string, bot: string, chatId: string, reply: string, msgIn: string) {
  try {
    await sb.from("bot_outbox").upsert({ done_key: doneKey, bot, chat_id: chatId, reply: reply.slice(0, 6000), msg_in: (msgIn || "").slice(0, 500), status: "pending" }, { onConflict: "done_key" });
    trace.push({ step: "enqueued", doneKey });
  } catch (e) { trace.push({ step: "enqueue_err", e: String(e) }); }
}
async function retryOutbox(bot: string) {
  const { data } = await sb.from("bot_outbox").select("done_key,chat_id,reply,msg_in,attempts").eq("bot", bot).eq("status", "pending").order("first_at").limit(5);
  for (const r of (data || [])) {
    const okId = await sendVerified(r.chat_id, r.reply);
    if (okId) { await sb.from("bot_outbox").update({ status: "sent", sent_msg_id: okId, last_at: new Date().toISOString() }).eq("done_key", r.done_key); trace.push({ step: "outbox_sent", doneKey: r.done_key }); }
    else {
      const { data: n } = await sb.rpc("fn_outbox_bump", { p_done_key: r.done_key });
      const attempts = typeof n === "number" ? n : (r.attempts + 1);
      if (attempts >= MAX_SEND_RETRIES) {
        await sb.from("bot_outbox").update({ status: "failed" }).eq("done_key", r.done_key);
        try { await waAdmin("sendMessage", { chatId: ZURIEL, message: `⚠️ ${bot}: כשל מסירה סופי אחרי ${attempts} ניסיונות ל-${r.chat_id}. הודעה: ${(r.msg_in || "").slice(0, 80)}` }); } catch { /* noop */ }
      }
    }
  }
}

// === מנוע רזיאל (גימטריה) ===
const SYSTEM_RAZIEL =
  "אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820.\n" +
  "חוקי ברזל:\n" +
  "1. אל תחשב גימטריה בעצמך — רק ערכים שסופקו. אל תמציא ערכים/פסוקים.\n" +
  "2. הפרד עובדה (✅ מאומת במנוע) מרמז משלים (✦ פרשנות). בלי נבואות.\n" +
  "3. חם, טקסט קצר (~8 שורות). חתום: — רזיאל · סוד 1820.";

async function razielReply(text: string): Promise<string | null> {
  if (!ANTHROPIC) return null;
  const cleanText = text.replace(RAZIEL_TRIGGER, "").trim();
  const heWords = [...new Set((cleanText.match(/[א-ת]{2,20}/g) || []).slice(0, 10))];
  const vals: Record<string, number> = {};
  for (const w of heWords) {
    try { const { data } = await sb.rpc("fn_ragil", { phrase: w }); if (typeof data === "number") vals[w] = data; } catch { /* noop */ }
  }
  const byVal: Record<number, string[]> = {};
  for (const [w, v] of Object.entries(vals)) { (byVal[v] ??= []).push(w); }
  const conv = Object.entries(byVal).filter(([, ws]) => ws.length >= 2).map(([v, ws]) => `${v}: ${ws.join(" = ")}`);
  const matches: string[] = [];
  for (const v of [...new Set(Object.values(vals))].slice(0, 3)) {
    try {
      const { data } = await sb.from("gematria_words").select("phrase").eq("ragil", v).eq("is_verified", true).limit(5);
      const ph = (data || []).map((r: any) => r.phrase).filter((p: string) => !heWords.includes(p));
      if (ph.length) matches.push(`${v} שווה גם: ${ph.slice(0,4).join(", ")}`);
    } catch { /* noop */ }
  }
  const facts = [
    Object.keys(vals).length ? `מאומת (fn_ragil): ${Object.entries(vals).map(([w,v]) => `${w}=${v}`).join(" · ")}` : "",
    conv.length ? `שוויונות: ${conv.join(" | ")}` : "",
    matches.length ? `במאגר: ${matches.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
  const user = `הודעה:\n"""\n${cleanText.slice(0, 3000)}\n"""\n\nעובדות מהמנוע:\n${facts || "(לא זוהו)"}\n\nכתוב מענה לפי חוקי הברזל.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM_RAZIEL, messages: [{ role: "user", content: user }] }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    if (d?.stop_reason === "refusal") return null;
    try { await sb.from("ai_token_log").insert({ source: "wa-uriel", kind: "raziel_pm", model: MODEL, input_tokens: d?.usage?.input_tokens||0, output_tokens: d?.usage?.output_tokens||0 }); } catch { /* noop */ }
    return (d?.content||[]).filter((c: any) => c.type==="text").map((c: any) => c.text).join("\n").trim()||null;
  } catch { return null; }
}

// === מנוע אוריאל (למידה) ===
async function optionalGematria(text: string): Promise<string> {
  const heWords = (text || "").match(/[א-ת]{2,20}/g)?.slice(0, 3) || [];
  if (!heWords.length) return "";
  const lines: string[] = [];
  for (const w of heWords) {
    try {
      const { data } = await sb.rpc("fn_all_methods", { p_word: w });
      if (data && typeof data === "object" && (data as any)["רגיל"]) {
        const d = data as Record<string, number>;
        const main = ["רגיל","מסתתר","קדמי","מילוי"].filter(k => d[k]).map(k => `${k}=${d[k]}`).join(", ");
        if (main) lines.push(`${w}: ${main}`);
      }
    } catch { /* noop */ }
  }
  return lines.length ? "גימטריה מהמנוע (לאוריאל להתייחס במילים):\n" + lines.join("\n") : "";
}

const URIEL_SYSTEM =
  "אתה אוריאל — חוקר-תלמיד מטעם סוד 1820, לומד את שיטת כריסטינה עד שתבין אותה לעומק.\n" +
  "חוקי ברזל:\n" +
  "1. אל תחשב גימטריה ואל תציג מספרים מיוזמתך. מספר שסופק — התייחס במילים בלבד.\n" +
  "2. שקף במילים שלך מה שכריסטינה הביאה — במונחים שלה (שיקוף, ניצוץ, מחברת, צלם).\n" +
  "3. סיים בשאלה אחת בלבד, רלוונטית למה ששלחה עכשיו.\n" +
  "4. עד 6 שורות. חם, עברית פשוטה. חתום: — אוריאל · סוד 1820\n" +
  "5. אם ההודעה ארוכה — בחר נקודה אחת. כפילות — אמור שקיבלת ושאל.\n" +
  "\nפורמט: קודם המענה המלא כטקסט רגיל. אחר ###למידות###\n" +
  '{"learnings":[{"word":"מילה","decomposed_form":"הצורה","interpretation":"מה למדנו"}],"question_asked":"השאלה"}';

// v13: קורא מ-agent_user_memory (זיכרון אישי מאוחד) במקום christina_* — נתונים זהים, אפס הבדל למשתמש.
async function buildContext(text: string): Promise<string> {
  const parts: string[] = [];
  const { data: md } = await sb.from("agent_user_memory").select("topic,content,data,created_at")
    .eq("agent", "uriel").eq("user_ref", CHRISTINA).eq("memory_type", "method_discovery");
  const rows = md || [];
  const rules = rows.filter((r: any) => r.data?.subtype === "letter_rule").sort((a: any, b: any) => String(a.topic).localeCompare(String(b.topic)));
  if (rules.length) parts.push("מפתח האותיות שלה:\n" + rules.map((r: any) => `${r.topic}=${(r.content || "").slice(0, 60)}`).join(" | "));
  const combos = rows.filter((r: any) => r.data?.subtype === "word_decomposition").sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 8);
  if (combos.length) parts.push("פירוקים אחרונים:\n" + combos.map((r: any) => `• ${r.topic} = ${r.data?.decomposed_form || ""}: ${(r.content || "").slice(0,120)}`).join("\n"));
  const { data: q } = await sb.from("agent_user_memory").select("content,created_at")
    .eq("agent", "uriel").eq("user_ref", CHRISTINA).eq("memory_type", "conversation").order("created_at", { ascending: false }).limit(6);
  if (q?.length) parts.push("שאלות שכבר נשאלו (אל תחזור):\n" + q.map((r: any) => `• ${r.content}`).join("\n"));
  const gem = await optionalGematria(text); if (gem) parts.push(gem);
  return parts.join("\n\n");
}
function recentThread(msgs: any[], uptoTs: number): string {
  const prev = msgs.filter((m) => Number(m.timestamp) < uptoTs).slice(-4);
  if (!prev.length) return "";
  return "הקשר:\n" + prev.map((m) => {
    const who = m.type === "incoming" ? "כריסטינה" : "אוריאל";
    return `[${who}]: ${(m.textMessage||m.extendedTextMessage?.text||"").slice(0,400)}`;
  }).join("\n---\n");
}
function extractParts(rawOut: string): { reply: string; learnings: any[]; question: string | null } | null {
  let c0 = rawOut.replace(/```json|```/g, "").trim();
  const MARK = "###למידות###";
  let jsonStr = "";
  const idx = c0.indexOf(MARK);
  if (idx >= 0) { jsonStr = c0.slice(idx + MARK.length).trim(); c0 = c0.slice(0, idx).trim(); }
  else { // fallback: strip a trailing learnings/question JSON גם אם המודל השמיט את הסמן (מונע דליפת JSON להודעה)
    const m = c0.match(/\{[\s\S]*"(?:learnings|question_asked)"[\s\S]*\}\s*$/);
    if (m) { jsonStr = m[0]; c0 = c0.slice(0, m.index).trim(); }
  }
  const reply = c0.trim();
  let learnings: any[] = []; let question: string | null = null;
  if (jsonStr) {
    try { const p = JSON.parse(jsonStr);
      if (Array.isArray(p?.learnings)) learnings = p.learnings;
      if (p?.question_asked) question = String(p.question_asked);
    } catch { /* noop */ }
  }
  if (!reply || reply.length < 25 || reply.startsWith("{")) return null;
  return { reply, learnings, question };
}
async function urielReply(text: string, thread: string): Promise<{ reply: string; learnings: any[]; question: string | null } | null> {
  if (!ANTHROPIC) return null;
  const ctx = await buildContext(text);
  const user = `ההודעה האחרונה של כריסטינה:\n"""\n${text.slice(0, 3500)}\n"""\n\n${thread ? thread + "\n\n" : ""}${ctx ? ctx + "\n\n" : ""}כתוב לפי הפורמט.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, system: URIEL_SYSTEM, messages: [{ role: "user", content: user }] }),
    });
    if (!resp.ok) { trace.push({ step: "anthropic", status: resp.status }); return null; }
    const d = await resp.json();
    if (d?.stop_reason === "refusal") return null;
    try { await sb.from("ai_token_log").insert({ source: "wa-uriel", kind: "auto_reply", model: MODEL, input_tokens: d?.usage?.input_tokens||0, output_tokens: d?.usage?.output_tokens||0 }); } catch { /* noop */ }
    const rawOut = (d?.content||[]).filter((c: any) => c.type==="text").map((c: any) => c.text).join("\n").trim();
    trace.push({ step: "raw_len", n: rawOut.length, stop: d?.stop_reason });
    return extractParts(rawOut);
  } catch (e) { trace.push({ step: "throw", e: String(e) }); return null; }
}
async function saveLearnings(learnings: any[], question: string | null) {
  for (const l of learnings.slice(0, 5)) {
    if (!l?.word) continue;
    try { await sb.rpc("fn_mem_add", { p_user: CHRISTINA, p_agent: "uriel", p_memory_type: "method_discovery", p_content: String(l.interpretation||"").slice(0,800), p_topic: String(l.word).slice(0,100), p_visibility: "private", p_source: "wa", p_data: { decomposed_form: String(l.decomposed_form||"").slice(0,300), subtype: "word_decomposition" } }); } catch { /* noop */ }
  }
  if (question) { try { await sb.rpc("fn_mem_add", { p_user: CHRISTINA, p_agent: "uriel", p_memory_type: "conversation", p_content: question.slice(0,500), p_visibility: "private", p_source: "wa" }); } catch { /* noop */ } }
}

async function autoReply(nowSec: number): Promise<number> {
  let hist;
  try { hist = await waAdmin("getChatHistory", { chatId: CHRISTINA, count: 12 }); } catch { return 0; }
  const all = pick(hist).sort((a,b) => Number(a.timestamp)-Number(b.timestamp));
  const incoming = all.filter((m) => m.type==="incoming" && ["textMessage","extendedTextMessage","quotedMessage"].includes(m.typeMessage||"") && (nowSec-Number(m.timestamp||0))<3*3600 && (m.textMessage||m.extendedTextMessage?.text||"").trim());
  const fresh: any[] = [];
  for (const m of incoming) if (!(await alreadyDone("uriel:"+m.idMessage))) fresh.push(m);
  if (!fresh.length) return 0;
  const latest = fresh[fresh.length-1];
  for (const m of fresh.slice(0,-1)) await logBot({ group_id:"uriel", msg_id:"uriel:"+m.idMessage, sender:CHRISTINA, sender_name:"כריסטינה", text_in:(m.textMessage||m.extendedTextMessage?.text||"").slice(0,500), reply_out:"[skipped]", action:"uriel_auto" });
  if ((await sentLastHour())>=MAX_PER_HOUR) { trace.push({step:"rate_limited"}); return 0; }
  const text = latest.textMessage||latest.extendedTextMessage?.text||"";
  const doneKey = "uriel:"+latest.idMessage;

  // v9: אם ההודעה מתחילה ב"רזיאל:" — רזיאל עונה, לא אוריאל
  if (RAZIEL_TRIGGER.test(text)) {
    const reply = await razielReply(text);
    if (reply) {
      const okId = await sendVerified(CHRISTINA, reply);
      await logBot({ group_id:"uriel", msg_id:doneKey, sender:CHRISTINA, sender_name:"כריסטינה", text_in:text.slice(0,500), reply_out:(okId?reply:"[queued] "+reply).slice(0,1000), action:"uriel_raziel_pm" });
      if (!okId) await enqueueOutbox(doneKey, "uriel", CHRISTINA, reply, text);
      try { await waAdmin("sendMessage", { chatId:ZURIEL, message:`🔮 כריסטינה קראה לרזיאל בפרטי:\n<<${text.slice(0,80)}>>\n\nרזיאל: ${reply.slice(0,300)}` }); } catch { /* noop */ }
      return 1;
    }
    return 0;
  }

  const out = await urielReply(text, recentThread(all, Number(latest.timestamp)));
  if (!out?.reply) {
    const cutoff = new Date(Date.now()-3600_000).toISOString();
    const { data: rf } = await sb.from("wa_bot_log").select("id").eq("action","uriel_fail_alert").gte("created_at",cutoff).limit(1);
    if (!rf?.length) {
      try { await waAdmin("sendMessage",{chatId:ZURIEL,message:`⚠️ אוריאל מתקשה:\n${text.slice(0,150)}…`}); } catch { /* noop */ }
      await logBot({group_id:"uriel",msg_id:"uriel-fail-"+Date.now(),sender:CHRISTINA,action:"uriel_fail_alert",text_in:text.slice(0,300),reply_out:"[fail]"});
    }
    return 0;
  }
  const okId = await sendVerified(CHRISTINA, out.reply);
  await sb.from("uriel_drafts").upsert({christina_msg_id:latest.idMessage,incoming_text:text.slice(0,2000),draft_text:out.reply,status:okId?"auto_sent":"queued",sent_at:okId?new Date().toISOString():null,sent_msg_id:okId},{onConflict:"christina_msg_id"});
  await saveLearnings(out.learnings,out.question);
  await logBot({group_id:"uriel",msg_id:doneKey,sender:CHRISTINA,sender_name:"כריסטינה",text_in:text.slice(0,500),reply_out:(okId?out.reply:"[queued] "+out.reply).slice(0,1000),action:"uriel_auto"});
  if (!okId) await enqueueOutbox(doneKey, "uriel", CHRISTINA, out.reply, text);
  try { await waAdmin("sendMessage",{chatId:ZURIEL,message:`🕯️ אוריאל ענה לכריסטינה:\n\nהיא: <<${text.slice(0,120)}>>\n\nאוריאל: ${out.reply}`}); } catch { /* noop */ }
  return 1;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s")!==SECRET) return new Response("forbidden",{status:403});
  trace=[];
  const nowSec=Date.now()/1000; let replies=0;
  try { await retryOutbox("uriel"); } catch(e){ trace.push({src:"outbox",e:String(e)}); }
  try { replies=await autoReply(nowSec); } catch(e){ trace.push({src:"auto",e:String(e)}); }
  return new Response(JSON.stringify({replies,trace:u.searchParams.get("debug")==="1"?trace:undefined}),{headers:{"Content-Type":"application/json"}});
});
