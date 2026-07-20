// 🧪 wa-mora — בוט המורה של «מעבדה להבנת משמעות» בוואטסאפ.
// מאזין → מבין → עונה, ולומד: טוען זיכרון-לומד (lab_learner+lab_progress) לפני כל תשובה.
// מבודד לגמרי: action=lab_mora, קבוצה מ-lab_wa_config, שולח דרך wa_admin (רזיאל לא נגוע).
// polling מ-pg_cron, מוגן ?s=SECRET. לולאת-הלמידה (עדכון הזיכרון) = lab-reflect.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const FAST_MODEL = Deno.env.get("CHAT_MODEL") || "claude-haiku-4-5";
const ACTION = "lab_mora";
const MAX_PER_RUN = 3;

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

async function waAdmin(method: string, payload: unknown) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: "POST" });
  return data;
}
function pick(v: any): any[] { return Array.isArray(v) ? v : (v?.result ?? []); }
const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();

const SYSTEM =
  "אתה המורה של «מעבדה להבנת משמעות», מדבר בקבוצת-וואטסאפ עם צוריאל (התלמיד המרכזי) ומאיה (יועצת-אורחת).\n\n" +
  "השאלה המאחדת: «איך בני אדם יוצרים משמעות מתוך העולם?»\n\n" +
  "שיטה (חובה):\n" +
  "1. מורה אדפטיבי, לא מרצה. צעד אחד בכל פעם, לא ממהרים.\n" +
  "2. מושג חדש = להסביר במילים פשוטות עם דוגמה. אסור לזרוק מונחים באנגלית/שמות-חוקרים בלי להסביר קודם.\n" +
  "3. שלוש רמות — לסמן איזו טענה: לשונית / קוגניטיבית / מחקרית (נמדד מול השערה).\n" +
  "4. להפריד עובדה (נמדד/מאומת) מהשערה. כשמתאים — לחבר ל-SOD1820 (קשרי מילה↔אות↔מספר, תפיסת דפוסים), בכנות.\n" +
  "5. מאיה = יועצת-אורחת: כשהיא מעירה/מתקנת מושג — להודות ולשלב.\n" +
  "6. קיבלת «זיכרון-מעבדה» (מה הלומד כבר יודע, המיקוד, הבא בתור) — התאם אליו: אל תלמד מחדש מה שכבר הובן, בנה מעליו. אל תחשוף את הזיכרון כרשימה.\n\n" +
  "פורמט: זו וואטסאפ — תשובה קצרה וברורה (עד ~6 משפטים), עברית בלבד, חמה ואנושית, בלי Markdown ובלי כותרות. עדיף לסיים בשאלה קצרה שמזמינה להמשך.\n" +
  "⚠️ אם ההודעה האחרונה לא דורשת תשובה (סתם אישור/סמיילי/שיחה בין המשתתפים שלא מופנית אליך) — החזר בדיוק את המחרוזת: [[skip]]";

async function loadMemory(): Promise<string> {
  try {
    const { data: L } = await sb.from("lab_learner").select("summary,level,focus,open_questions").eq("id", 1).maybeSingle();
    const { data: P } = await sb.from("lab_progress").select("concept_key,status");
    const { data: C } = await sb.from("lab_curriculum").select("concept_key,title");
    const title: Record<string, string> = {}; for (const c of (C || [])) title[(c as any).concept_key] = (c as any).title;
    const understood = (P || []).filter((p: any) => p.status === "understood").map((p: any) => title[p.concept_key] || p.concept_key);
    const inprog = (P || []).filter((p: any) => p.status === "introduced" || p.status === "practiced").map((p: any) => title[p.concept_key] || p.concept_key);
    if (!L) return "";
    const parts: string[] = [];
    if (L.summary) parts.push(`על הלומד: ${L.summary}`);
    if (L.level) parts.push(`רמה: ${L.level}`);
    if (L.focus) parts.push(`מיקוד נוכחי: ${L.focus}`);
    if (understood.length) parts.push(`כבר הובן (אל תלמד מחדש — בנה מעליהם): ${understood.join(" · ")}`);
    if (inprog.length) parts.push(`בתהליך: ${inprog.join(" · ")}`);
    if (L.open_questions?.length) parts.push(`שאלות פתוחות: ${(L.open_questions as string[]).join(" | ")}`);
    return parts.length ? `\n\n[זיכרון-המעבדה — להתאמה בלבד, אל תחשוף כרשימה]\n${parts.join("\n")}` : "";
  } catch { return ""; }
}

async function teacherReply(userText: string, fast: boolean): Promise<string | null> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: fast ? FAST_MODEL : MODEL, max_tokens: fast ? 500 : 700, system: SYSTEM, messages: [{ role: "user", content: userText }] }),
  });
  if (!resp.ok) return null;
  const d = await resp.json();
  if (d?.stop_reason === "refusal") return null;
  try { await sb.from("ai_token_log").insert({ source: "wa-mora", kind: "lab_reply", model: fast ? FAST_MODEL : MODEL, input_tokens: d?.usage?.input_tokens || 0, output_tokens: d?.usage?.output_tokens || 0 }); } catch { /* noop */ }
  const t = (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  return t || null;
}

async function alreadyDone(msgId: string): Promise<boolean> {
  const { data } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).eq("action", ACTION).maybeSingle();
  return !!data;
}
async function logBot(row: Record<string, unknown>) { try { await sb.from("wa_bot_log").insert({ ...row, action: ACTION }); } catch { /* noop */ } }
async function logLab(role: string, author: string, content: string) {
  try { await sb.from("lab_messages").insert({ thread: "main", role, author, content: (content || "").slice(0, 6000) }); } catch { /* noop */ }
}

async function run() {
  const { data: cfg } = await sb.from("lab_wa_config").select("*").eq("id", 1).maybeSingle();
  if (!cfg || !cfg.enabled || !cfg.group_id) return { skipped: "no-config" };
  const chatId = String(cfg.group_id);
  const mode = cfg.mode || "active";
  const fast = cfg.fast === true;
  const nowSec = Date.now() / 1000;

  let hist; try { hist = await waAdmin("getChatHistory", { chatId, count: 25 }); } catch { return { err: "history" }; }
  const all = pick(hist).filter((m: any) => {
    const typ = m.typeMessage || "";
    const ok = ["textMessage", "extendedTextMessage", "quotedMessage"].includes(typ);
    return m.type === "incoming" && ok && (nowSec - Number(m.timestamp || 0) < 3 * 3600);
  }).sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));

  const textOf = (m: any) => m.textMessage || m.extendedTextMessage?.text || m.extendedTextMessageData?.text || "";
  let memory = ""; let memLoaded = false;
  let n = 0;
  for (const m of all.slice(-MAX_PER_RUN)) {
    const msgId = m.idMessage; if (!msgId || await alreadyDone(msgId)) continue;
    const text = textOf(m); const sname = m.senderName || ""; const snd = m.senderId || chatId;
    if (clean(text).length < 2) { await logBot({ group_id: chatId, msg_id: msgId, sender: snd, sender_name: sname, text_in: text.slice(0, 500), reply_out: "[skip:short]" }); continue; }

    await logLab("user", sname || "חברותא", text);

    if (mode === "listen") { await logBot({ group_id: chatId, msg_id: msgId, sender: snd, sender_name: sname, text_in: text.slice(0, 500), reply_out: "[listen]" }); continue; }

    if (!memLoaded) { memory = await loadMemory(); memLoaded = true; }   // טעינת זיכרון פעם אחת לריצה
    const recent = all.filter((x: any) => nowSec - Number(x.timestamp || 0) < 3 * 3600).slice(-12);
    const transcript = recent.map((x: any) => `${x.senderName || "חבר"}: ${clean(textOf(x))}`).filter((l: string) => l.length > 3).join("\n");
    const userPrompt = `זו שיחה בקבוצת-הלימוד (אתה המורה). ההיסטוריה האחרונה:\n${transcript}${memory}\n\nענה כמורה להודעה האחרונה, לפי השיטה ובהתאם לזיכרון.`;
    const reply = await teacherReply(userPrompt, fast);

    if (reply && reply.replace(/\s/g, "") !== "[[skip]]" && !reply.includes("[[skip]]")) {
      const res: any = await waAdmin("sendMessage", { chatId, message: reply, quotedMessageId: msgId });
      const okId = res?.result?.idMessage || res?.idMessage || null;
      if (okId) await logLab("assistant", "claude", reply);
      await logBot({ group_id: chatId, msg_id: msgId, sender: snd, sender_name: sname, text_in: text.slice(0, 500), reply_out: okId ? "[sent]" : "[send-failed]" });
      if (okId) n++;
    } else {
      await logBot({ group_id: chatId, msg_id: msgId, sender: snd, sender_name: sname, text_in: text.slice(0, 500), reply_out: "[skip]" });
    }
  }
  return { replied: n };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!ANTHROPIC) return new Response(JSON.stringify({ err: "not_configured" }), { headers: { "Content-Type": "application/json" } });
  try { const r = await run(); return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } }); }
  catch (e) { return new Response(JSON.stringify({ err: String(e).slice(0, 200) }), { headers: { "Content-Type": "application/json" } }); }
});
