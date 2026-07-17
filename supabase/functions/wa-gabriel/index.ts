// wa-gabriel v12 — 17.7.2026 — extractParts מוקשח באמת מפני קטיעת-JSON (אותו bug שקרה ליסכה) + max_tokens 800→1400
// v12: ה-fallback הישן דרש סוגר } בסוף → JSON קטוע דלף להודעה. עכשיו חותך מתחילת ה-JSON גם בלי סוגר + ניקוי כפול.
// wa-gabriel v11 — מומחה-השפות של סוד1820 (agent_research_team_law) + אימות מסירה (bot_delivery_law)
// v11: המשימה = מומחה-השפות של המערכת (עמית + שמעון), המשכיות ממקור-אמת אחד (agent_research_stats),
//      + sendVerified/outbox כמו אוריאל/התשבי (שלא יירדם), + extractParts מוקשח.
// v9: reactions, fallback, zero missed messages
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SECRET = 's0d1820wahook_7yq2c9';
const GROUP = '120363411357326507@g.us';
const AMIT = '972534567963';
const ZURIEL_PHONE = '972556651237';
const ANTHROPIC = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = Deno.env.get('ANALYZE_MODEL') || 'claude-sonnet-5';
const MAX_PER_HOUR = 20;
const MAX_SEND_RETRIES = 4;

const POSITIVE = ['👍','❤️','🔥','🙏','✅','💯','👏','⭐','🌟','💓'];
const AMBIVALENT = ['😢','🤔','💭','😮','🫴'];
const NEGATIVE = ['👎','❌','😤','🚫','😞'];

const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
let trace: any[] = [];

async function waAdmin(method: string, payload: unknown) {
  const { data } = await sb.rpc('wa_admin', { p_method: method, p_payload: payload, p_http: 'POST' });
  return data;
}
function pick(v: any): any[] { return Array.isArray(v) ? v : (v?.result ?? []); }
async function logBot(row: Record<string, unknown>) {
  const { error } = await sb.from('wa_bot_log').insert(row);
  if (error) trace.push({ step: 'logBot', error: error.message });
}
async function alreadyDone(id: string): Promise<boolean> {
  const { data } = await sb.from('wa_bot_log').select('id').eq('msg_id', id).maybeSingle();
  return !!data;
}
async function sentLastHour(): Promise<number> {
  const { count } = await sb.from('wa_bot_log').select('id', { count: 'exact', head: true })
    .eq('action', 'gabriel').gte('created_at', new Date(Date.now() - 3600_000).toISOString());
  return count || 0;
}

// === מסירה מאומתת + תור־יציאה (bot_delivery_law) ===
async function sendVerified(chatId: string, message: string, quotedMessageId?: string): Promise<string|null> {
  try { const res: any = await waAdmin('sendMessage', quotedMessageId ? { chatId, message, quotedMessageId } : { chatId, message }); return res?.result?.idMessage || res?.idMessage || null; }
  catch (e) { trace.push({ step: 'send_throw', e: String(e) }); return null; }
}
async function enqueueOutbox(doneKey: string, chatId: string, reply: string, msgIn: string) {
  try { await sb.from('bot_outbox').upsert({ done_key: doneKey, bot: 'gabriel', chat_id: chatId, reply: reply.slice(0,6000), msg_in: (msgIn||'').slice(0,500), status: 'pending' }, { onConflict: 'done_key' }); trace.push({ step: 'enqueued', doneKey }); }
  catch (e) { trace.push({ step: 'enqueue_err', e: String(e) }); }
}
async function retryOutbox() {
  const { data } = await sb.from('bot_outbox').select('done_key,chat_id,reply,msg_in,attempts').eq('bot','gabriel').eq('status','pending').order('first_at').limit(5);
  for (const r of (data||[])) {
    const okId = await sendVerified(r.chat_id, r.reply);
    if (okId) { await sb.from('bot_outbox').update({ status:'sent', sent_msg_id: okId, last_at: new Date().toISOString() }).eq('done_key', r.done_key); }
    else {
      const { data: n } = await sb.rpc('fn_outbox_bump', { p_done_key: r.done_key });
      const attempts = typeof n === 'number' ? n : (r.attempts + 1);
      if (attempts >= MAX_SEND_RETRIES) {
        await sb.from('bot_outbox').update({ status: 'failed' }).eq('done_key', r.done_key);
        try { await waAdmin('sendMessage', { chatId: ZURIEL_PHONE + '@c.us', message: `⚠️ גבריאל: כשל מסירה סופי אחרי ${attempts} ניסיונות. הודעה: ${(r.msg_in||'').slice(0,80)}` }); } catch {}
      }
    }
  }
}

async function bridgesFor(word: string, value: number | null): Promise<string[]> {
  const found: string[] = [];
  try { const { data } = await sb.rpc('fn_gabriel_bridges_for', { p_word: word, p_value: null }); for (const b of data||[]) found.push(`${b.hebrew}↔${b.foreign_word}(${b.method}=${b.value})`); } catch {}
  if (value) { try { const { data } = await sb.rpc('fn_gabriel_bridges_for', { p_word: null, p_value: value }); for (const b of data||[]) { const s=`${b.hebrew}↔${b.foreign_word}(${b.method}=${b.value})`; if (!found.includes(s)) found.push(s); } } catch {} }
  return found.slice(0, 4);
}
async function buildFacts(text: string): Promise<string> {
  if (!/\d{2,}|[a-zA-Z]{3,}/.test(text)) return '';
  const lines: string[] = [], blines: string[] = [];
  for (const w of [...new Set((text.match(/[a-zA-Z]{3,20}/g)||[]))].slice(0,3)) { for (const b of await bridgesFor(w,null)) if (!blines.includes(b)) blines.push(b); }
  for (const n of [...new Set((text.match(/\b\d{2,4}\b/g)||[]).map(Number))].slice(0,2)) {
    try { const { data } = await sb.from('gematria_words').select('phrase').contains('all_values',[n]).eq('is_verified',true).eq('space','core').limit(5); if (data?.length) lines.push(`${n}=${data.map((r:any)=>r.phrase).join('=')}`) } catch {}
    for (const b of await bridgesFor('',n)) if (!blines.includes(b)) blines.push(b);
  }
  return [lines.length?'מאגר:\n'+lines.join('\n'):'', blines.length?'גשרי-שפה:\n'+blines.join('\n'):''].filter(Boolean).join('\n\n');
}

async function context(): Promise<string> {
  const p: string[] = [];
  // מקור-אמת אחד — מה כבר יש לנו (חי)
  try {
    const { data } = await sb.from('agent_research_stats').select('label,value,detail').eq('agent','gabriel').order('sort');
    if (data?.length) p.push('מצב המחקר הנוכחי (חי, ממאגר משותף — אל תמציא מספרים):\n' + data.map((r:any)=>`• ${r.label}: ${r.value ?? r.detail ?? ''}`).join('\n'));
  } catch {}
  try { const { data } = await sb.from('amit_method_notes').select('topic,claim').order('created_at',{ascending:false}).limit(6); if (data?.length) p.push('מה שכבר למדנו יחד (עמית):\n'+data.map((r:any)=>`• ${r.topic}: ${(r.claim||'').slice(0,80)}`).join('\n')); } catch {}
  try { const { data } = await sb.from('amit_research_questions').select('question_text').eq('open_thread',true).order('asked_at',{ascending:false}).limit(4); if (data?.length) p.push('שאלות פתוחות (אל תחזור):\n'+data.map((r:any)=>`• ${r.question_text}`).join('\n')); } catch {}
  return p.join('\n\n');
}

function extractParts(raw: string): { reply: string; learnings: any[]; question: string | null } | null {
  let c0 = raw.replace(/```json|```/g,'').trim();
  const MARK = '###למידות###';
  // מזהה תחילת בלוק-JSON — גם אם נקטע (בלי סוגר }) → מונע דליפת חצי-JSON להודעה (bug שקרה ליסכה/hatishbi)
  const JSON_START = /\{\s*"(?:learnings|question_asked)"/;
  let jsonStr = '';
  const idx = c0.indexOf(MARK);
  if (idx>=0) { jsonStr = c0.slice(idx+MARK.length).trim(); c0 = c0.slice(0,idx).trim(); }
  else { const jm = c0.match(JSON_START); if (jm && jm.index!==undefined) { jsonStr = c0.slice(jm.index); c0 = c0.slice(0,jm.index).trim(); } }
  const reply = c0.replace(new RegExp(MARK+'[\\s\\S]*$'),'').replace(new RegExp(JSON_START.source+'[\\s\\S]*$'),'').trim();
  let learnings: any[]=[], question: string|null=null;
  if (jsonStr) { try { const p=JSON.parse(jsonStr); if (Array.isArray(p?.learnings)) learnings=p.learnings; if (p?.question_asked) question=String(p.question_asked); } catch {} }
  if (!reply||reply.length<8) return null;
  return { reply, learnings, question };
}

async function aiReply(prompt: string, system: string): Promise<string|null> {
  if (!ANTHROPIC) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:1400,system,messages:[{role:'user',content:prompt}]}),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.stop_reason==='refusal') return null;
    try { await sb.from('ai_token_log').insert({source:'wa-gabriel',kind:'reply',model:MODEL,input_tokens:d?.usage?.input_tokens||0,output_tokens:d?.usage?.output_tokens||0}); } catch {}
    return (d?.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n').trim()||null;
  } catch { return null; }
}

async function handleReaction(emoji: string, quotedMsgId: string, snd: string): Promise<string|null> {
  const isZuriel = snd.includes(ZURIEL_PHONE);
  let category = 'ambivalent';
  if (POSITIVE.some(e=>emoji.includes(e))) category='positive';
  else if (NEGATIVE.some(e=>emoji.includes(e))) category='negative';
  if (category==='positive') {
    try { await sb.from('amit_method_notes').update({verified_by_amit:true}).eq('source','group_chat').order('created_at',{ascending:false}).limit(1); } catch {}
    return null;
  }
  if (category==='ambivalent') return `${emoji} — נגע לך? או שמשהו לא מדויק?\n— גבריאל · סוד 1820`;
  return `ראיתי ${emoji} — מה היה לא נכון? אשמח לתקן.\n— גבריאל · סוד 1820`;
}

const SYS_GABRIEL = (isZuriel: boolean, mediaType?: string) => {
  const base = `אתה גבריאל — מומחה-השפות של סוד1820, הזיכרון-הלשוני של המערכת. תמיד עברית בלבד. חתום: — גבריאל · סוד 1820.`;
  if (mediaType==='audio') return base+' קיבלת קול — אינך שומע. בקש לכתוב את התוכן.';
  if (mediaType==='image') return base+' קיבלת תמונה — אינך רואה. בקש תיאור.';
  if (isZuriel) return base+' צוריאל כתב. ענה קצר.';
  return base+'\nאתה מכיר את שיטות הגימטריה בעברית ואת שיטות חישוב-האותיות באנגלית (Ordinal/Reduction/Reverse), ובעתיד רוסית/יוונית/לטינית. אתה עובד צמוד עם עמית (בונה מנוע גשרי-השפה) ועם שמעון חיימוב (חוקר-שפות).\nדבר כמי שכבר עבד איתם: הסתמך על "מצב המחקר הנוכחי" שניתן לך (מספרים חיים) — אל תתחיל מאפס ואל תמציא מספרים. אמור בבירור מה כבר יש ומה עדיין חסר.\nהלב = קשרים בין-לשוניים (עברית↔אנגלית↔רוסית); גימטריה עברית = שכבת-תמיכה, לא סתם.\nשקף + שאלה אחת ממוקדת שמקדמת את המחקר. עד 6 שורות. ###למידות### JSON בסוף.';
};

async function saveLearnings(learnings: any[], question: string|null) {
  for (const l of learnings.slice(0,4)) {
    if (!l?.topic) continue;
    try { await sb.rpc('fn_record_amit_note',{p_topic:String(l.topic).slice(0,100),p_claim:String(l.claim||'').slice(0,500),p_interpretation:String(l.interpretation||'').slice(0,800),p_languages:Array.isArray(l.languages)?l.languages:null,p_source:'group_chat'}); } catch {}
  }
  if (question) { try { await sb.rpc('fn_add_amit_question',{p_question:question.slice(0,500)}); } catch {} }
}

function recentThread(msgs: any[], uptoTs: number): string {
  const prev = msgs.filter(m=>Number(m.timestamp)<uptoTs).slice(-3);
  if (!prev.length) return '';
  return 'הקשר:\n'+prev.map(m=>{
    const snd=String(m.senderId||''); const who=snd.includes(AMIT)?'עמית':snd.includes(ZURIEL_PHONE)?'צוריאל':'גבריאל';
    const typ=m.typeMessage||''; const body=typ==='audioMessage'?'[קול]':typ==='imageMessage'?'[תמונה]':typ==='reactionMessage'?`[${m.extendedTextMessageData?.text||'reaction'}]`:(m.textMessage||m.extendedTextMessage?.text||'').slice(0,200);
    return `[${who}]: ${body}`;
  }).join('\n---\n');
}

async function handle(nowSec: number): Promise<number> {
  let hist; try { hist=await waAdmin('getChatHistory',{chatId:GROUP,count:25}); } catch { return 0; }
  const all = pick(hist).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
  const incoming = all.filter(m=>{
    const snd=String(m.senderId||'');
    return m.type==='incoming' && (snd.includes(AMIT)||snd.includes(ZURIEL_PHONE)) && (nowSec-Number(m.timestamp||0))<3*3600;
  });
  const fresh: any[]=[];
  for (const m of incoming) if (!(await alreadyDone('gabriel:'+m.idMessage))) fresh.push(m);
  if (!fresh.length) return 0;
  let n=0;
  for (const m of fresh) {
    if ((await sentLastHour())>=MAX_PER_HOUR) { trace.push({step:'rate_limited'}); break; }
    const snd=String(m.senderId||''); const isZuriel=snd.includes(ZURIEL_PHONE);
    const typ=m.typeMessage||'';
    const doneKey='gabriel:'+m.idMessage;
    let reply: string|null=null;
    let savedLog=false;

    if (typ==='reactionMessage') {
      const emoji=m.extendedTextMessageData?.text||'';
      const quotedId=m.quotedMessage?.stanzaId||'';
      reply=await handleReaction(emoji,quotedId,snd);
      if (!reply) { await logBot({group_id:'gabriel',msg_id:doneKey,sender:snd,action:'gabriel',text_in:`[reaction:${emoji}]`,reply_out:'[positive_reaction_saved]'}); n++; savedLog=true; }
    }
    else if (['textMessage','extendedTextMessage','quotedMessage'].includes(typ)) {
      const text=m.textMessage||m.extendedTextMessage?.text||'';
      if (!text.trim()) { await logBot({group_id:'gabriel',msg_id:doneKey,sender:snd,action:'gabriel',text_in:'[empty]',reply_out:'[skipped]'}); n++; savedLog=true; }
      else {
        const facts=await buildFacts(text); const ctx=await context();
        const sys=SYS_GABRIEL(isZuriel);
        const thread=recentThread(all,Number(m.timestamp));
        const prompt=`הודעה:\n"""\n${text.slice(0,3000)}\n"""\n\n${thread?thread+'\n\n':''}${facts?facts+'\n\n':''}${ctx?ctx+'\n\n':''}כתוב לפי הפורמט.`;
        const raw=await aiReply(prompt,sys);
        const out=raw?extractParts(raw):null;
        reply=out?.reply||null;
        if (reply&&!isZuriel) await saveLearnings(out?.learnings||[],out?.question||null);
      }
    }
    else if (typ==='imageMessage'||typ==='audioMessage') {
      const media=typ==='imageMessage'?'image':'audio';
      const caption=m.caption||m.fileMessageData?.caption||'';
      const sys=SYS_GABRIEL(isZuriel,media);
      reply=await aiReply(`[${media}]${caption?' '+caption:''}`,sys);
    }
    else {
      reply=`קיבלתי הודעה (${typ||'לא מוכר'}) — אקח קצת זמן לבדוק ואחזור.\n— גבריאל · סוד 1820`;
    }

    if (!savedLog) {
      if (reply) {
        const okId=await sendVerified(GROUP,reply,m.idMessage);
        await logBot({group_id:'gabriel',msg_id:doneKey,sender:snd,action:'gabriel',text_in:(m.textMessage||m.extendedTextMessage?.text||`[${typ}]`).slice(0,500),reply_out:(okId?reply:'[queued] '+reply).slice(0,1000)});
        if (!okId) await enqueueOutbox(doneKey,GROUP,reply,(m.textMessage||m.extendedTextMessage?.text||`[${typ}]`));
        n++;
      } else {
        await logBot({group_id:'gabriel',msg_id:doneKey,sender:snd,action:'gabriel',text_in:`[${typ}]`,reply_out:'[no_reply]'});
      }
    }
  }
  return n;
}

Deno.serve(async(req)=>{
  const u=new URL(req.url);
  if (u.searchParams.get('s')!==SECRET) return new Response('forbidden',{status:403});
  trace=[]; let replies=0;
  try { await retryOutbox(); } catch(e){ trace.push({src:'outbox',e:String(e)}); }
  try { replies=await handle(Date.now()/1000); } catch(e){ trace.push({e:String(e)}); }
  return new Response(JSON.stringify({replies,trace:u.searchParams.get('debug')==='1'?trace:undefined}),{headers:{'Content-Type':'application/json'}});
});
