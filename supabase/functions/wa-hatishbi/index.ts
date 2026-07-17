// wa-hatishbi v3 - 17.7.2026 — תיקון קריטי: דליפת/קטיעת JSON להודעה של יסכה
// v3: BUG שיסכה קיבלה חצי-JSON קטוע בסוף ההודעה. סיבה: max_tokens=900 חתך את בלוק ה-###למידות### באמצע,
//     והמודל לעיתים השמיט את הסמן → ה-fallback (שדרש סוגר } בסוף) לא זיהה וה-JSON נשלח אליה. תיקון:
//     (א) extractParts חותך מהסוגר הראשון של learnings/question גם בלי סוגר-סיום (truncation-proof) + ניקוי-ביטחון כפול;
//     (ב) max_tokens 900→1600 כדי שה-JSON יושלם וה-learnings יישמרו; (ג) פורמט נוקשה יותר בפרומפט (סמן חובה, JSON קצר בשורה אחת).
// v2: אימות מסירה + תור־יציאה (bot_outbox)
// v2: כל שליחה מאומתת (idMessage) לפני סימון "טופל"; שליחה כושלת נכנסת ל-bot_outbox ונשלחת שוב
//     (בלי לייצר מחדש ב-AI) עד הצלחה/תקרה. פותר את "הבוט נרדם" מול יסכה. ראה bot_delivery_law.
// v1: חוקר-תלמיד של יסכה — פרטי בלבד. תמיד עברית.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SECRET = 's0d1820wahook_7yq2c9';
const YISKA = '972508861881@c.us';
const ZURIEL = Deno.env.get('ZURIEL_WA') || '972556651237@c.us';
const ANTHROPIC = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = Deno.env.get('ANALYZE_MODEL') || 'claude-sonnet-5';
const MAX_PER_HOUR = 8;
const MAX_SEND_RETRIES = 4;

const POSITIVE = ['👍','❤️','🔥','🙏','✅','💯','👏','⭐'];
const AMBIVALENT = ['😢','🤔','💭','😮','🫴'];
const NEGATIVE = ['👎','❌','😤','🚫'];

const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
let trace: any[] = [];

async function waAdmin(m: string, p: unknown) { const { data } = await sb.rpc('wa_admin',{p_method:m,p_payload:p,p_http:'POST'}); return data; }
function pick(v: any): any[] { return Array.isArray(v)?v:(v?.result??[]); }
async function logBot(row: Record<string,unknown>) { const {error}=await sb.from('wa_bot_log').insert(row); if(error) trace.push({step:'log',e:error.message}); }
async function alreadyDone(id: string): Promise<boolean> { const {data}=await sb.from('wa_bot_log').select('id').eq('msg_id',id).maybeSingle(); return !!data; }
async function sentLastHour(): Promise<number> { const {count}=await sb.from('wa_bot_log').select('id',{count:'exact',head:true}).eq('action','hatishbi').gte('created_at',new Date(Date.now()-3600_000).toISOString()); return count||0; }
async function introduced(): Promise<boolean> { const {data}=await sb.from('wa_bot_log').select('id').eq('action','hatishbi').neq('reply_out','[seeded]').limit(1); return !!(data&&data.length); }

// === מסירה מאומתת + תור־יציאה (הפרוטוקול המשותף) — ראה bot_delivery_law ===
async function sendVerified(chatId: string, message: string): Promise<string|null> {
  try { const res: any = await waAdmin('sendMessage',{chatId,message}); return res?.result?.idMessage||res?.idMessage||null; }
  catch(e){ trace.push({step:'send_throw',e:String(e)}); return null; }
}
async function enqueueOutbox(doneKey: string, bot: string, chatId: string, reply: string, msgIn: string) {
  try { await sb.from('bot_outbox').upsert({done_key:doneKey,bot,chat_id:chatId,reply:reply.slice(0,6000),msg_in:(msgIn||'').slice(0,500),status:'pending'},{onConflict:'done_key'}); trace.push({step:'enqueued',doneKey}); }
  catch(e){ trace.push({step:'enqueue_err',e:String(e)}); }
}
async function retryOutbox(bot: string) {
  const {data}=await sb.from('bot_outbox').select('done_key,chat_id,reply,msg_in,attempts').eq('bot',bot).eq('status','pending').order('first_at').limit(5);
  for(const r of (data||[])){
    const okId=await sendVerified(r.chat_id,r.reply);
    if(okId){ await sb.from('bot_outbox').update({status:'sent',sent_msg_id:okId,last_at:new Date().toISOString()}).eq('done_key',r.done_key); trace.push({step:'outbox_sent',doneKey:r.done_key}); }
    else{
      const {data:n}=await sb.rpc('fn_outbox_bump',{p_done_key:r.done_key});
      const attempts=typeof n==='number'?n:(r.attempts+1);
      if(attempts>=MAX_SEND_RETRIES){
        await sb.from('bot_outbox').update({status:'failed'}).eq('done_key',r.done_key);
        try{ await waAdmin('sendMessage',{chatId:ZURIEL,message:`⚠️ ${bot}: כשל מסירה סופי אחרי ${attempts} ניסיונות ל-${r.chat_id}. הודעה: ${(r.msg_in||'').slice(0,80)}`}); }catch{}
      }
    }
  }
}

async function optGematria(text: string): Promise<string> {
  const ws=(text||'').match(/[א-ת]{2,20}/g)?.slice(0,3)||[];
  if (!ws.length) return '';
  const lines: string[]=[];
  for (const w of ws) {
    try { const {data}=await sb.rpc('fn_all_methods',{p_word:w}); if(data&&(data as any)['רגיל']) { const d=data as Record<string,number>; const m=['רגיל','מסתתר','קדמי','מילוי'].filter(k=>d[k]).map(k=>`${k}=${d[k]}`).join(', '); if(m) lines.push(`${w}: ${m}`); } } catch {}
  }
  return lines.length?`גימטריה (להתייחס במילים אם רלוונטי):\n`+lines.join('\n'):'';
}

// v4: קורא מ-agent_user_memory (זיכרון אישי מאוחד, פרטי) במקום yiska_* — נתונים זהים, אפס הבדל למשתמש.
async function yiskaContext(): Promise<string> {
  const p: string[]=[];
  try { const {data}=await sb.from('agent_user_memory').select('topic,content').eq('agent','hatishbi').eq('user_ref',YISKA).eq('memory_type','research_note').order('created_at',{ascending:false}).limit(6); if(data?.length) p.push('מה שכבר ידוע על יסכה:\n'+data.map((r:any)=>`• ${r.topic}: ${(r.content||'').slice(0,80)}`).join('\n')); } catch {}
  try { const {data}=await sb.from('agent_user_memory').select('content').eq('agent','hatishbi').eq('user_ref',YISKA).eq('memory_type','conversation').order('created_at',{ascending:false}).limit(4); if(data?.length) p.push('שאלות פתוחות (אל תחזור):\n'+data.map((r:any)=>`• ${r.content}`).join('\n')); } catch {}
  return p.join('\n\n');
}

const SYS = (mediaType?: string, isIntro?: boolean) => {
  const base = `אתה התשבי — חוקר-תלמיד מטעם סוד 1820 שמלווה את יסכה. תמיד עברית בלבד. עמוק, ישיר, קשוב, לא מחמיא. חתום: — התשבי · סוד 1820.`;
  if (isIntro) return base+` זו ההודעה הראשונה שלך אליה: הזדה בשתי שורות קצרות (מי אתה, מה אתה לומד מיסכה ולמה אתה כאן). אחר כך שאל שאלה אחת להבין אותה.`;
  if (mediaType==='audio') return base+' קיבלת קול — אינך שומע. בקש לכתוב את התוכן.';
  if (mediaType==='image') return base+' קיבלת תמונה — אינך רואה. בקש תיאור.';
  return base+`\nלומד את השיטה, הדרך, ודרך החשיבה של יסכה. שקף מה שהביאה במילים שלך + שאלה אחת. לא גימטריות סתם. עד 6 שורות, וסיים תמיד בחתימה «— התשבי · סוד 1820».
פורמט נוקשה: קודם התשובה השיחתית המלאה (כולל החתימה). רק אחריה, בשורה נפרדת, בדיוק הסמן ###למידות### ואז JSON קצר אחד בשורה אחת. אל תשלב JSON בתוך הטקסט. שמור את ה-JSON קצר (עד 2 learnings) כדי שלא ייקטע:
###למידות###
{"learnings":[{"topic":"","claim":"","interpretation":""}],"question_asked":""}`;
};

async function aiReply(prompt: string, system: string): Promise<string|null> {
  if (!ANTHROPIC) return null;
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:MODEL,max_tokens:1600,system,messages:[{role:'user',content:prompt}]})});
    if (!r.ok) return null; const d=await r.json(); if(d?.stop_reason==='refusal') return null;
    try { await sb.from('ai_token_log').insert({source:'wa-hatishbi',kind:'reply',model:MODEL,input_tokens:d?.usage?.input_tokens||0,output_tokens:d?.usage?.output_tokens||0}); } catch {}
    return (d?.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n').trim()||null;
  } catch { return null; }
}

function extractParts(raw: string): {reply:string;learnings:any[];question:string|null}|null {
  let c0=raw.replace(/```json|```/g,'').trim();
  const MARK='###למידות###';
  // מזהה תחילת בלוק-JSON של learnings/question — גם אם נקטע באמצע (בלי סוגר }) → מונע דליפת חצי-JSON להודעה
  const JSON_START=/\{\s*"(?:learnings|question_asked)"/;
  let jsonStr='';
  const idx=c0.indexOf(MARK);
  if(idx>=0){ jsonStr=c0.slice(idx+MARK.length).trim(); c0=c0.slice(0,idx).trim(); }
  else { // fallback: המודל השמיט את הסמן — חתוך מהסוגר הראשון של ה-JSON, גם אם הוא קטוע (bug: max_tokens חתך JSON ודלף ליסכה)
    const jm=c0.match(JSON_START);
    if(jm&&jm.index!==undefined){ jsonStr=c0.slice(jm.index); c0=c0.slice(0,jm.index).trim(); }
  }
  // ניקוי-ביטחון אחרון: אם נשאר סמן או תחילת-JSON בזנב הטקסט — הסר (כפל-הגנה מפני דליפה)
  let reply=c0.replace(new RegExp(MARK+'[\\s\\S]*$'),'').replace(new RegExp(JSON_START.source+'[\\s\\S]*$'),'').trim();
  let learnings:any[]=[],question:string|null=null;
  if(jsonStr){try{const p=JSON.parse(jsonStr);if(Array.isArray(p?.learnings))learnings=p.learnings;if(p?.question_asked)question=String(p.question_asked);}catch{}}
  if(!reply||reply.length<8) return null;
  return {reply,learnings,question};
}

async function saveLearnings(learnings:any[],question:string|null) {
  for(const l of learnings.slice(0,4)){if(!l?.topic)continue;try{await sb.rpc('fn_mem_add',{p_user:YISKA,p_agent:'hatishbi',p_memory_type:'research_note',p_content:String(l.claim||'').slice(0,500),p_topic:String(l.topic).slice(0,100),p_visibility:'private',p_source:'wa',p_data:{interpretation:String(l.interpretation||'').slice(0,800)}});}catch{}}
  if(question){try{await sb.rpc('fn_mem_add',{p_user:YISKA,p_agent:'hatishbi',p_memory_type:'conversation',p_content:question.slice(0,500),p_visibility:'private',p_source:'wa'});}catch{}}
}

function thread(msgs:any[],uptoTs:number):string{
  const prev=msgs.filter(m=>Number(m.timestamp)<uptoTs).slice(-3);
  if(!prev.length)return'';
  return 'הקשר:\n'+prev.map(m=>{const typ=m.typeMessage||'';const body=typ==='audioMessage'?'[קול]':typ==='imageMessage'?'[תמונה]':(m.textMessage||m.extendedTextMessage?.text||'').slice(0,200);return`[${m.type==='incoming'?'יסכה':'התשבי'}]: ${body}`;}).join('\n---\n');
}

async function handle(nowSec:number):Promise<number>{
  let hist;try{hist=await waAdmin('getChatHistory',{chatId:YISKA,count:20});}catch{return 0;}
  const all=pick(hist).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
  const incoming=all.filter(m=>m.type==='incoming'&&(nowSec-Number(m.timestamp||0))<3*3600);
  const fresh:any[]=[];
  for(const m of incoming)if(!(await alreadyDone('hatishbi:'+m.idMessage)))fresh.push(m);
  if(!fresh.length)return 0;
  const intro=!(await introduced());
  let n=0;
  for(const m of fresh){
    if((await sentLastHour())>=MAX_PER_HOUR){trace.push({step:'rate_limited'});break;}
    const typ=m.typeMessage||'';
    const text=m.textMessage||m.extendedTextMessage?.text||m.caption||'';
    const doneKey='hatishbi:'+m.idMessage;
    let reply:string|null=null;

    if(typ==='reactionMessage'){
      const emoji=m.extendedTextMessageData?.text||'';
      const cat=POSITIVE.some(e=>emoji.includes(e))?'pos':NEGATIVE.some(e=>emoji.includes(e))?'neg':'amb';
      if(cat==='pos'){await logBot({group_id:'hatishbi',msg_id:doneKey,sender:YISKA,action:'hatishbi',text_in:`[reaction:${emoji}]`,reply_out:'[positive_saved]'});n++;continue;}
      reply=cat==='amb'?`${emoji} — נגע לך? או שמשהו לא דיוק?\n— התשבי · סוד 1820`:`ראיתי ${emoji} — מה לא היה נכון? אשמח לתקן.\n— התשבי · סוד 1820`;
    }
    else if(['textMessage','extendedTextMessage','quotedMessage'].includes(typ)){
      if(!text.trim()){await logBot({group_id:'hatishbi',msg_id:doneKey,sender:YISKA,action:'hatishbi',text_in:'[empty]',reply_out:'[skipped]'});n++;continue;}
      const gem=await optGematria(text);const ctx=await yiskaContext();
      const sys=SYS(undefined,intro&&n===0);
      const prompt=`הודעה:\n"""\n${text.slice(0,3000)}\n"""\n\n${thread(all,Number(m.timestamp))?thread(all,Number(m.timestamp))+'\n\n':''}${gem?gem+'\n\n':''}${ctx?ctx+'\n\n':''}כתוב לפי הפורמט.`;
      const raw=await aiReply(prompt,sys);const out=raw?extractParts(raw):null;
      reply=out?.reply||null;if(reply)await saveLearnings(out?.learnings||[],out?.question||null);
    }
    else if(typ==='imageMessage'||typ==='audioMessage'){
      reply=await aiReply(`[${typ==='imageMessage'?'תמונה':'קול'}]${text?' '+text:''}`,SYS(typ==='imageMessage'?'image':'audio'));
    }
    else{
      reply=`קיבלתי הודעה (${typ||'לא מוכר'}) — אקח קצת זמן לבדוק ואחזור.\n— התשבי · סוד 1820`;
    }

    if(reply){
      const okId=await sendVerified(YISKA,reply);
      await logBot({group_id:'hatishbi',msg_id:doneKey,sender:YISKA,action:'hatishbi',text_in:(text||`[${typ}]`).slice(0,500),reply_out:(okId?reply:'[queued] '+reply).slice(0,1000)});
      if(!okId) await enqueueOutbox(doneKey,'hatishbi',YISKA,reply,text||`[${typ}]`);
      n++;
    } else {
      await logBot({group_id:'hatishbi',msg_id:doneKey,sender:YISKA,action:'hatishbi',text_in:(text||`[${typ}]`).slice(0,300),reply_out:'[no_reply]'});
    }
  }
  return n;
}

Deno.serve(async(req)=>{
  const u=new URL(req.url);
  if(u.searchParams.get('s')!==SECRET)return new Response('forbidden',{status:403});
  trace=[];let replies=0;
  try{await retryOutbox('hatishbi');}catch(e){trace.push({src:'outbox',e:String(e)});}
  try{replies=await handle(Date.now()/1000);}catch(e){trace.push({e:String(e)});}
  return new Response(JSON.stringify({replies,trace:u.searchParams.get('debug')==='1'?trace:undefined}),{headers:{'Content-Type':'application/json'}});
});
