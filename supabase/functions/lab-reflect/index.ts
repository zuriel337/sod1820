// lab-reflect — סוכן #2 «רושם-ההתקדמות». לולאת-הלמידה של המעבדה.
// קורא שיחה חדשה (lab_messages) מאז reflected_through, ומעדכן: מודל-הלומד (lab_learner),
// סטטוס-מושגים (lab_progress) ומאגר-הידע (lab_notes). מבודד. cron / ?s=SECRET.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5";
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const SYSTEM = "אתה «רושם-ההתקדמות» של מעבדת-לימוד. קראת שיחת-לימוד, ואתה מעדכן את זיכרון-המערכת. אתה לא מלמד ולא עונה — רק מסכם ומעדכן, ביושר. אם אין התקדמות אמיתית — אל תמציא. החזר אך ורק JSON תקין (בלי Markdown, בלי טקסט מסביב).";

function extractJson(t: string): any {
  try { return JSON.parse(t); } catch { /* noop */ }
  const a = t.indexOf("{"); const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* noop */ } }
  return null;
}

async function run() {
  const { data: learner } = await sb.from("lab_learner").select("*").eq("id", 1).maybeSingle();
  const since = learner?.reflected_through || new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: msgs } = await sb.from("lab_messages").select("role,author,content,created_at").eq("thread", "main").gt("created_at", since).order("created_at", { ascending: true }).limit(50);
  if (!msgs || msgs.length === 0) return { skipped: "no-new" };
  const { data: curr } = await sb.from("lab_curriculum").select("concept_key,title,module").order("module").order("sort");
  const { data: prog } = await sb.from("lab_progress").select("concept_key,status");
  const progMap: Record<string, string> = {};
  for (const p of (prog || [])) progMap[(p as any).concept_key] = (p as any).status;
  const validKeys = new Set((curr || []).map((c: any) => c.concept_key));
  const conceptList = (curr || []).map((c: any) => `${c.concept_key} (מ${c.module}) — ${c.title} [${progMap[c.concept_key] || "new"}]`).join("\n");
  const transcript = msgs.map((m: any) => `${m.role === "assistant" ? "מורה" : (m.author || "תלמיד")}: ${m.content}`).join("\n").slice(0, 8000);

  const user =
    `פרופיל הלומד הנוכחי:\nסיכום: ${learner?.summary || ""}\nרמה: ${learner?.level || ""}\nמיקוד: ${learner?.focus || ""}\nשאלות פתוחות: ${(learner?.open_questions || []).join(" | ")}\n\n` +
    `מפת המושגים (מפתח (מודול) — כותרת [סטטוס]):\n${conceptList}\n\n` +
    `השיחה החדשה מאז העדכון האחרון:\n${transcript}\n\n` +
    `עדכן את הזיכרון. החזר JSON במבנה המדויק:\n` +
    `{"summary":"סיכום מעודכן של הלומד (2-4 משפטים)","level":"רמה","focus":"על מה להתמקד עכשיו + הבא בתור","open_questions":["שאלה פתוחה"],"concept_updates":[{"concept_key":"מפתח מהרשימה בלבד","status":"new|introduced|practiced|understood","note":"קצר"}],"notes":[{"title":"מושג/תובנה חדשה לשמירה","body":"קצר","level":"linguistic|cognitive|research"}]}\n` +
    `כללים: concept_key רק מהרשימה. שנה status רק אם באמת התקדם בשיחה. notes רק אם באמת נלמד/נוסף משהו חדש (אחרת []). עד 6 concept_updates ועד 3 notes.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) return { err: `anthropic_${resp.status}` };
  const d = await resp.json();
  try { await sb.from("ai_token_log").insert({ source: "lab-reflect", kind: "reflect", model: MODEL, input_tokens: d?.usage?.input_tokens || 0, output_tokens: d?.usage?.output_tokens || 0 }); } catch { /* noop */ }
  const text = (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const out = extractJson(text);
  const nowIso = new Date().toISOString();
  const patch: any = { reflected_through: nowIso, updated_at: nowIso };  // תמיד מקדמים — לא לעכל שוב אותה שיחה
  let concepts = 0, notes = 0;
  if (out) {
    if (typeof out.summary === "string" && out.summary.trim()) patch.summary = out.summary.slice(0, 1200);
    if (typeof out.level === "string" && out.level.trim()) patch.level = out.level.slice(0, 120);
    if (typeof out.focus === "string" && out.focus.trim()) patch.focus = out.focus.slice(0, 400);
    if (Array.isArray(out.open_questions)) patch.open_questions = out.open_questions.filter((q: any) => typeof q === "string").slice(0, 6);
    for (const c of (Array.isArray(out.concept_updates) ? out.concept_updates : []).slice(0, 6)) {
      if (!c || !validKeys.has(c.concept_key)) continue;
      const st = ["new", "introduced", "practiced", "understood"].includes(c.status) ? c.status : null;
      if (!st) continue;
      await sb.from("lab_progress").upsert({ concept_key: c.concept_key, status: st, note: (c.note || "").slice(0, 500), updated_at: nowIso }, { onConflict: "concept_key" });
      concepts++;
    }
    for (const nt of (Array.isArray(out.notes) ? out.notes : []).slice(0, 3)) {
      if (!nt || !nt.title) continue;
      const lvl = ["linguistic", "cognitive", "research"].includes(nt.level) ? nt.level : null;
      await sb.from("lab_notes").insert({ kind: "insight", level: lvl, title: String(nt.title).slice(0, 200), body: (nt.body || "").slice(0, 2000), author: "claude" });
      notes++;
    }
  }
  await sb.from("lab_learner").update(patch).eq("id", 1);
  return { digested: msgs.length, concepts, notes, parsed: !!out };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!ANTHROPIC) return new Response(JSON.stringify({ err: "not_configured" }), { headers: { "Content-Type": "application/json" } });
  try { const r = await run(); return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } }); }
  catch (e) { return new Response(JSON.stringify({ err: String(e).slice(0, 200) }), { headers: { "Content-Type": "application/json" } }); }
});
