// 🤖 wa-christina (רזיאל) — v23 — 17.7.2026 — שער ציבורי חכם: DM לכולם + מדיניות + לימוד גימטריה
// v23: handleAllDMs (lastIncomingMessages → כל שולח) · raziel_dm_policy (מי·מה·כמה·למה) ·
//      ליבת-חוכמה: עוגן-מנוע(buildFacts)+יודע-הגרף(convergences)+זוכר(context)+מנתב(EN→גבריאל) ·
//      מכסה 3/יום לאנונימי→שער-הרשמה · מצב-לימוד (מלמד שיטות לפי השאלות).
// v22: welcome יזום על קישור + שומר «לא לשלוח למי שכבר דיברנו איתו».
// v20: DM-concierge + קבוצות היברידי + זיכרון פסיבי + הקשר (פרטיות אכופה). v19: sendVerified + bot_outbox.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const CHRISTINA_PHONE = "972507555102";
const AMIT_GROUP = "120363411357326507@g.us";
const OPEN_GROUPS = ["120363428363475524@g.us", "120363407205030411@g.us"];
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const ZURIEL = Deno.env.get("ZURIEL_WA") || "972556651237@c.us";
const SITE = "https://sod1820.co.il";
const MAX_PER_RUN = 2;
const MAX_DM_CHATS_PER_RUN = 8;   // תקרת-עלות: כמה צ'אטים חדשים לטפל בכל ריצה
const MAX_SEND_RETRIES = 4;
const INITIATIVE_COOLDOWN_MIN = 60;
const RAZIEL_TRIGGER = /^(רזיאל[,:\s]|@רזיאל)/i;
const LEARN_INTENT = /(ללמוד|תלמד|למד אותי|איך מחשב|שיטות|מה זה גימטרי|רוצה ללמוד)/i;
const EN_DOMINANT = (t: string) => (t.match(/[a-zA-Z]/g)||[]).length > (t.match(/[א-ת]/g)||[]).length * 1.5;

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
async function alreadyDone(msgId: string, action = "christina_auto"): Promise<boolean> {
  const { data } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).eq("action", action).maybeSingle();
  return !!data;
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

async function ragil(p: string): Promise<number | null> {
  try { const { data } = await sb.rpc("fn_ragil", { phrase: p }); return typeof data === "number" ? data : null; } catch { return null; }
}
async function buildFacts(text: string): Promise<{ facts: string; convergence: boolean; values: number[] }> {
  const ws = [...new Set(clean(text).split(" ").filter((w:string)=>w.length>=2&&w.length<=24))].slice(0,16);
  const vals: Record<string,number> = {};
  for (const w of ws) { const v=await ragil(w); if (v) vals[w]=v; }
  const byVal: Record<number,string[]> = {};
  for (const [w,v] of Object.entries(vals)) { (byVal[v]??=[]).push(w); }
  const conv = Object.entries(byVal).filter(([,ws2])=>ws2.length>=2).map(([v,ws2])=>`${v}: ${ws2.join(" = ")}`);
  const topVals = [...new Set(Object.values(vals))].slice(0,4);
  const matches: string[] = [];
  for (const v of topVals) {
    try {
      const { data } = await sb.from("gematria_words").select("phrase").eq("ragil",v).order("lead_rank",{ascending:true,nullsFirst:false}).order("is_verified",{ascending:false}).limit(6);
      const ph=(data||[]).map((r:any)=>r.phrase).filter((p:string)=>p&&!ws.includes(p));
      if (ph.length) matches.push(`${v} שווה גם ל: ${ph.slice(0,5).join(", ")}`);
    } catch { /* noop */ }
  }
  const facts = [
    Object.keys(vals).length ? `מילים וערכן: ${Object.entries(vals).map(([w,v])=>`${w}=${v}`).join(" · ")}` : "",
    conv.length ? `שוויונות: ${conv.join(" | ")}` : "",
    matches.length ? `במאגר: ${matches.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
  return { facts, convergence: conv.length > 0, values: topVals };
}
// יודע-הגרף: התכנסויות חזקות מהמנוע (מטטרון) לערכים שעלו
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

const SYSTEM_BASE =
  `אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820, והשער האישי למערכת המחקר. תמיד ענה בעברית בלבד.
חוקי ברזל:
1. אל תחשב גימטריה בעצמך — רק ערכים שסופקו לך מהמנוע. אל תמציא ערכים/פסוקים.
2. הפרד עובדה (✅) מרמז (✦). בלי נבואות.
3. חם, מדויק, עברית. חתום: — רזיאל · סוד 1820.
4. אם יש זיכרון-רקע על המשתמש — התייחס בטבעיות (רק ב-DM). בקבוצה לעולם אל תחשוף היסטוריה אישית.
5. חכם ורחב: חבר בין המילה, ערכה, ביטויים שווים והתכנסויות שסופקו — צייר תמונה, אל תזרוק מספר יבש.`;
const TEACH_ADDON =
  `\nמצב-לימוד: אם המשתמש רוצה ללמוד — לַמֵּד גימטריה צעד-צעד לפי השאלות שלו. הסבר איזו שיטה השתמשת (רגיל=כל אות ערכה; מספר קטן; מילוי; אתבש), הראה את החישוב מהמנוע, והצע את הצעד הבא ("רוצה שנבדוק ביטוי שני?"). סבלני, כמו מורה.`;

async function razielRespond(text: string, chatId: string, quotedId: string | undefined, opts: { userRef?: string | null; isDM?: boolean; welcome?: string; ctx?: any; teach?: boolean } = {}): Promise<boolean> {
  const cleanText = text.replace(RAZIEL_TRIGGER, "").trim();
  if (!cleanText) return false;
  const { facts, values } = await buildFacts(cleanText);
  const convNote = await convergenceInsight(values);
  const ctx = opts.ctx ?? (opts.userRef ? await getContext(opts.userRef, chatId) : null);
  const ctxText = contextToText(ctx);
  const wantsLearn = opts.teach && LEARN_INTENT.test(cleanText);
  const system = SYSTEM_BASE + ((opts.teach) ? TEACH_ADDON : "");
  const user = `הודעה:\n"""\n${cleanText.slice(0,4000)}\n"""\n\nעובדות מהמנוע:\n${facts||"(לא זוהו ערכים — אם המשתמש רק מברך/שואל כללי, ענה בחום ובלי להמציא)"}${convNote}${ctxText}${wantsLearn?"\n\nהמשתמש רוצה ללמוד — לַמֵּד לפי מצב-לימוד.":""}\n\nכתוב מענה לפי חוקי הברזל.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:MODEL,max_tokens:900,system,messages:[{role:"user",content:user}]}),
    });
    if (!resp.ok) return false;
    const d = await resp.json();
    if (d?.stop_reason==="refusal") return false;
    try { await sb.from("ai_token_log").insert({source:"wa-christina",kind:"raziel_reply",model:MODEL,input_tokens:d?.usage?.input_tokens||0,output_tokens:d?.usage?.output_tokens||0}); } catch { /* noop */ }
    let reply = (d?.content||[]).filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n").trim();
    if (!reply) return false;
    if (opts.welcome) reply = opts.welcome + reply;
    const payload: any = { chatId, message: reply };
    if (quotedId) payload.quotedMessageId = quotedId;
    const okId = await sendVerified(payload);
    if (!okId) await enqueueOutbox("raziel:"+(quotedId||chatId), chatId, reply, cleanText);
    return true;
  } catch { return false; }
}

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
      const ok = await razielRespond(text, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[sent]":"[failed]",action:"christina_auto"});
      if (ok) n++; continue;
    }
    if (isChristina) {
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
      const ok = await razielRespond(cleanText, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[sent]":"[no reply]",action:"christina_auto"});
      if (ok) n++; continue;
    }
    if (await initiativeBudget(chatId)) {
      const { convergence } = await buildFacts(text);
      if (convergence) {
        const ok = await razielRespond(text, chatId, msgId, { userRef: (await resolveIdentity(snd))?.user_ref, ctx: await getContext("group", chatId) });
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[initiative]":"[init-failed]",action:"raziel_initiative"});
        if (ok) { n++; continue; }
      }
    }
    await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[silent: remembered]",action:"christina_auto"});
  }
  return n;
}

async function answersToday(chatId: string): Promise<number> {
  const since = new Date(); since.setUTCHours(0,0,0,0);
  const { count } = await sb.from("wa_bot_log").select("*", { count: "exact", head: true })
    .eq("group_id", chatId).eq("action", "raziel_dm").eq("reply_out", "[dm-sent]").gte("created_at", since.toISOString());
  return count || 0;
}

// === שער ציבורי: DM מכל שולח, לפי raziel_dm_policy ===
async function handleAllDMs(nowSec: number, policy: any): Promise<number> {
  let hist; try { hist = await waAdminGet("lastIncomingMessages", {}); } catch { return 0; }
  const goLive = policy?.go_live_at ? Math.floor(new Date(policy.go_live_at).getTime() / 1000) : null;
  const dms = pick(hist).filter((m:any)=> String(m.chatId||"").endsWith("@c.us") && (nowSec - Number(m.timestamp||0) < 3*3600));
  // הודעה אחרונה לכל צ'אט (עלות: תשובה אחת לצ'אט לריצה)
  const byChat: Record<string, any> = {};
  for (const m of dms) { const c=m.chatId; if (!byChat[c] || Number(m.timestamp) > Number(byChat[c].timestamp)) byChat[c]=m; }
  let n = 0;
  for (const chatId of Object.keys(byChat).slice(0, MAX_DM_CHATS_PER_RUN)) {
    const m = byChat[chatId];
    const msgId = m.idMessage; if (!msgId || await alreadyDone(msgId, "raziel_dm")) continue;
    const text = m.textMessage || m.extendedTextMessageData?.text || "";
    if (clean(text).length < 1) continue;
    const phone = chatId.replace("@c.us","");
    const idn = await resolveIdentity(chatId);
    const linked = idn?.linked === true;
    const userRef = idn?.user_ref || ("wa:"+phone);

    // 🛡️ מקושר — תמיד מטופל (כמו v22). לא-מקושר — רק אם הציבורי הופעל (go-live) והודעה חדשה (לא בקלוג).
    if (!linked) {
      if (!policy?.answer_everyone) continue;
      if (goLive === null || Number(m.timestamp||0) <= goLive) continue;
    }

    // ניתוב אנגלית → גבריאל
    if (policy.en_to_gabriel && EN_DOMINANT(text)) {
      const msg = "English question — Gabriel is our language-bridge expert. שאל בעברית ואשמח לעזור, או פנה לגבריאל.\n— רזיאל · סוד 1820";
      const okId = await sendVerified({ chatId, message: msg });
      if (!okId) await enqueueOutbox("raziel-en:"+msgId, chatId, msg, text);
      await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM", text_in: text.slice(0,500), reply_out: "[en→gabriel]", action: "raziel_dm" });
      continue;
    }

    // מכסה: אנונימי מעל free_per_day → שער-הרשמה
    if (!linked && policy.after_gate !== "unlimited") {
      const used = await answersToday(chatId);
      if (used >= policy.free_per_day_anon) {
        const gate = policy.after_gate === "block"
          ? `הגעת ל-${policy.free_per_day_anon} השאלות היומיות 🙏 כדי להמשיך — הירשם באתר ${SITE}\n— רזיאל · סוד 1820`
          : `הגעת ל-${policy.free_per_day_anon} השאלות היומיות 🙏\nכדי להמשיך בלי הגבלה ולשמור את היסטוריית המחקר שלך — הצטרף באתר ${SITE} וחבר את הוואטסאפ.\nמחר נמשיך בכל מקרה 🙏\n— רזיאל · סוד 1820`;
        const okId = await sendVerified({ chatId, message: gate });
        if (!okId) await enqueueOutbox("raziel-gate:"+msgId, chatId, gate, text);
        await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: "DM", text_in: text.slice(0,500), reply_out: "[dm-gate]", action: "raziel_dm" });
        continue;
      }
    }

    // welcome (פעם ראשונה / חזרה אחרי 6ש') — עם הזמנה ללימוד ולהרשמה לאנונימי
    const { data: last } = await sb.from("wa_bot_log").select("created_at").eq("group_id", chatId).eq("action", "raziel_dm").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const ctx = await getContext(userRef, chatId);
    let welcome = "";
    if (!last) {
      welcome = linked
        ? "שלום 🙏 שמח שחזרת. שאל אותי כל מילה או ביטוי — או בקש «תלמד אותי גימטריה».\n\n"
        : `שלום 🙏 אני רזיאל, השער למחקר של סוד 1820. שאל אותי כל מילה ואחשב לך את הגימטריה מהמנוע — או כתוב «תלמד אותי גימטריה» ונתחיל צעד-צעד.\n(לא-רשומים: ${policy.free_per_day_anon} שאלות ביום; להרשמה מלאה — ${SITE})\n\n`;
    } else {
      const hrs = (Date.now() - new Date((last as any).created_at).getTime()) / 3.6e6;
      if (hrs > 6) {
        const lastThread = ctx?.user_context?.research_threads?.[0];
        welcome = lastThread ? `שלום שוב 🙏 בפעם הקודמת עסקנו ב: ${String(lastThread).slice(0,80)}.\n\n` : "שלום שוב 🙏\n\n";
      }
    }
    const ok = await razielRespond(text, chatId, msgId, { userRef, isDM: true, welcome, ctx, teach: policy.teach_mode });
    await logBot({ group_id: chatId, msg_id: msgId, sender: phone, sender_name: linked?"DM":"DM-anon", text_in: text.slice(0,500), reply_out: ok ? "[dm-sent]" : "[dm-failed]", action: "raziel_dm" });
    if (ok) { n++; await remember(userRef, chatId, text, "conversation", "personal"); }
  }
  return n;
}

// === welcome יזום על קישור — פעם אחת, ולא למי שכבר דיברנו איתו ===
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
    const msg = `שלום 🙏 חיברת את הוואטסאפ לחשבון שלך בסוד 1820.\nאני רזיאל — השער למערכת המחקר. שאל אותי כל מילה ואחשב לך את הגימטריה, או בקש «תלמד אותי גימטריה».\nבמה נתחיל?\n— רזיאל · סוד 1820`;
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
  try { await retryOutbox(); } catch(e){ trace.push({src:"outbox",e:String(e)}); }
  try { n+=await sendProactiveWelcomes(); } catch(e){ trace.push({src:"welcome",e:String(e)}); }
  try { n+=await handleAllDMs(nowSec, pol); } catch(e){ trace.push({src:"dm",e:String(e)}); }
  for (const g of OPEN_GROUPS) { try { n+=await handleGroup(g,nowSec); } catch(e){ trace.push({group:g,e:String(e)}); } }
  try { n+=await handleGroup(AMIT_GROUP,nowSec); } catch(e){ trace.push({group:"amit",e:String(e)}); }
  return new Response(JSON.stringify({replied:n,trace:u.searchParams.get("debug")==="1"?trace:undefined}),{headers:{"Content-Type":"application/json"}});
});
