// 🤖 wa-christina (רזיאל) — v19 — 17.7.2026 — + פרוטוקול-מסירה (bot_delivery_law)
// v19: sendVerified + bot_outbox — שליחה שנכשלת נשלחת שוב, לא אובדת.
// קבוצות: סוד 1820 + 0000 סאלי + עמית צוריאל וגבריאל (120363411357326507)
// בקבוצת עמית: רק על "raziel:" + raziel_access. אנגלית => מפנה לגבריאל.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const CHRISTINA_PHONE = "972507555102";
const AMIT_GROUP = "120363411357326507@g.us";
const OPEN_GROUPS = [
  "120363428363475524@g.us", // סוד 1820
  "120363407205030411@g.us", // 0000 סאלי
];
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const ZURIEL = Deno.env.get("ZURIEL_WA") || "972556651237@c.us";
const MAX_PER_RUN = 2;
const MAX_SEND_RETRIES = 4;
const RAZIEL_TRIGGER = /^(רזיאל[,:\s]|@רזיאל)/i;
const EN_DOMINANT = (t: string) => (t.match(/[a-zA-Z]/g)||[]).length > (t.match(/[א-ת]/g)||[]).length * 1.5;

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
let trace: any[] = [];

async function waAdmin(method: string, payload: unknown) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: "POST" });
  return data;
}
function pick(v: any): any[] { return (Array.isArray(v) ? v : (v?.result ?? [])); }
const clean = (s: string) => (s || "").replace(/[^א-ת ]+/g, " ").replace(/\s+/g, " ").trim();
async function logBot(row: Record<string, unknown>) {
  try { await sb.from("wa_bot_log").insert(row); } catch { /* noop */ }
}
async function alreadyDone(msgId: string): Promise<boolean> {
  const { data } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).eq("action", "christina_auto").maybeSingle();
  return !!data;
}
async function hasRazielAccess(sender: string): Promise<boolean> {
  const { data } = await sb.from("wa_vip_senders").select("raziel_access").eq("sender", sender).maybeSingle();
  return data?.raziel_access === true;
}

// === מסירה מאומתת + תור-יציאה (bot_delivery_law) ===
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
      const { data: n } = await sb.rpc("fn_outbox_bump", { p_done_key: r.done_key });
      const attempts = typeof n === "number" ? n : (r.attempts + 1);
      if (attempts >= MAX_SEND_RETRIES) { await sb.from("bot_outbox").update({ status: "failed" }).eq("done_key", r.done_key); }
    }
  }
}

async function ragil(p: string): Promise<number | null> {
  try { const { data } = await sb.rpc("fn_ragil", { phrase: p }); return typeof data === "number" ? data : null; } catch { return null; }
}
async function buildFacts(text: string): Promise<string> {
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
  return [
    Object.keys(vals).length ? `מילים וערכן: ${Object.entries(vals).map(([w,v])=>`${w}=${v}`).join(" · ")}` : "",
    conv.length ? `שוויונות: ${conv.join(" | ")}` : "",
    matches.length ? `במאגר: ${matches.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}

const SYSTEM_RAZIEL =
  `אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820. תמיד ענה בעברית בלבד.
חוקי ברזל:
1. אל תחשב גימטריה בעצמך — רק ערכים שסופקו. אל תמציא ערכים/פסוקים.
2. הפרד עובדה (✅) מרמז (✦). בלי נבואות.
3. חם, קצר, עברית. חתום: — רזיאל · סוד 1820.`;

async function razielRespond(text: string, chatId: string, quotedId?: string): Promise<boolean> {
  const cleanText = text.replace(RAZIEL_TRIGGER, "").trim();
  if (!cleanText) return false;
  const facts = await buildFacts(cleanText);
  const user = `הודעה:\n\"\"\"\n${cleanText.slice(0,4000)}\n\"\"\"\n\nעובדות:\n${facts||"(לא זוהו)"}\n\nכתוב מענה לפי חוקי הברזל.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:MODEL,max_tokens:900,system:SYSTEM_RAZIEL,messages:[{role:"user",content:user}]}),
    });
    if (!resp.ok) return false;
    const d = await resp.json();
    if (d?.stop_reason==="refusal") return false;
    try { await sb.from("ai_token_log").insert({source:"wa-christina",kind:"raziel_reply",model:MODEL,input_tokens:d?.usage?.input_tokens||0,output_tokens:d?.usage?.output_tokens||0}); } catch { /* noop */ }
    const reply = (d?.content||[]).filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n").trim();
    if (!reply) return false;
    const payload: any = { chatId, message: reply };
    if (quotedId) payload.quotedMessageId = quotedId;
    const okId = await sendVerified(payload);
    if (!okId) await enqueueOutbox("raziel:"+(quotedId||chatId), chatId, reply, cleanText); // נכשל → יישלח שוב
    return true;
  } catch { return false; }
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

    // קבוצת עמית: רק ענה לטריגר "raziel:" + raziel_access
    if (isAmitGroup) {
      const triggering = RAZIEL_TRIGGER.test(text);
      if (!triggering) {
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[amit-group: gabriel handles]",action:"christina_auto"});
        continue;
      }
      const allowed = await hasRazielAccess(snd);
      if (!allowed) {
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[no raziel_access]",action:"christina_auto"});
        continue;
      }
      const cleanQ = text.replace(RAZIEL_TRIGGER,"").trim();
      if (EN_DOMINANT(cleanQ)) {
        const redirectMsg = `שאלת אנגלית — גבריאל המומחה בגשרי-שפה יענה לך יותר טוב.\n— רזיאל · סוד 1820`;
        const okId = await sendVerified({chatId,message:redirectMsg,quotedMessageId:msgId});
        if (!okId) await enqueueOutbox("raziel:"+msgId, chatId, redirectMsg, text);
        await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:redirectMsg,action:"christina_auto"});
        n++; continue;
      }
      const ok = await razielRespond(text, chatId, msgId);
      await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:ok?"[sent]":"[failed]",action:"christina_auto"});
      if (ok) n++; continue;
    }

    // קבוצות פתוחות: כריסטינה מושתקת אלא אם קוראת לרזיאל
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
    const cleanText = RAZIEL_TRIGGER.test(text) ? text.replace(RAZIEL_TRIGGER,"").trim() : text;
    const ok = await razielRespond(cleanText, chatId, msgId);
    if (!ok) { await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[no reply]",action:"christina_auto"}); continue; }
    await logBot({group_id:"group",msg_id:msgId,sender:snd,sender_name:sname,text_in:text.slice(0,500),reply_out:"[sent]",action:"christina_auto"});
    n++;
  }
  return n;
}

Deno.serve(async(req)=>{
  const u=new URL(req.url);
  if (u.searchParams.get("s")!==SECRET) return new Response("forbidden",{status:403});
  trace=[]; const nowSec=Date.now()/1000; let n=0;
  try { await retryOutbox(); } catch(e){ trace.push({src:"outbox",e:String(e)}); }
  for (const g of OPEN_GROUPS) { try { n+=await handleGroup(g,nowSec); } catch(e){ trace.push({group:g,e:String(e)}); } }
  try { n+=await handleGroup(AMIT_GROUP,nowSec); } catch(e){ trace.push({group:"amit",e:String(e)}); }
  return new Response(JSON.stringify({replied:n,trace:u.searchParams.get("debug")==="1"?trace:undefined}),{headers:{"Content-Type":"application/json"}});
});
