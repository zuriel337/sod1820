// 🕎 research-extract — ה-Research Extractor של SOD1820.
// ממיר טקסט מכל מקור (וואטסאפ/אתר/OCR/קול/מסמך/פורום) לשפת-המחקר האחידה: 5 סוגי-אובייקטים בלבד
// (fact · relation · observation · hypothesis · question). מטטרון קורא רק את השפה הזו — לא אכפת לו מהמקור.
// עובדות/קשרים מאומתים במנוע הרשמי (fn_all_methods). הכל נכנס כ-candidate → אישור צוריאל → קנוני בגרף.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const ANTHROPIC = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODEL = (Deno.env.get("EXTRACT_MODEL") || Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const SYSTEM =
`אתה ה-Research Extractor של SOD1820 — ממיר טקסט ממקור כלשהו לשפת-המחקר האחידה.
קודם החלט מה שווה לחלץ: אם אין תוכן-מחקר (ברכה/סמול-טוק/תודה/בקשה טכנית) — החזר [] ריק.
חלץ אך ורק 5 סוגי-אובייקטים:
- fact: עובדה בדידה שאפשר לאמת. terms=[הביטויים], value=המספר אם נטען. דוגמה: {"kind":"fact","statement":"שם «ציון סיבוני» = 958","terms":["ציון סיבוני"],"value":958}
- relation: קשר בין שני דברים. relates=[צד-א,צד-ב]. דוגמה: {"kind":"relation","statement":"שם ↔ מיקוד (אותו ערך)","relates":["שם","מיקוד"],"value":958}
- observation: תצפית לא-טריוויאלית. דוגמה: {"kind":"observation","statement":"אותו ערך 958 מופיע גם בשם וגם במיקוד","value":958}
- hypothesis: השערת-מחקר (פרשנות / «ייתכן»). דוגמה: {"kind":"hypothesis","statement":"ייתכן שכששם ומיקוד חולקים ערך יש בכך משמעות למחקר"}
- question: שאלה פתוחה שראוי לחקור. דוגמה: {"kind":"question","statement":"האם הדפוס הזה חוזר אצל חוקרים נוספים?"}
חוקי ברזל:
1. אל תמציא ערכי-גימטריה. אם נטען ערך — שים אותו ב-value; השרת יאמת במנוע. לא בטוח → value=null.
2. הפרד עובדה מפרשנות: טענה מאומתת=fact; «אולי/ייתכן/מרמז»=hypothesis. אף פעם לא fact לפרשנות.
3. בלי נבואות, בלי טענות על אנשים חיים. עברית בלבד.
4. כל אובייקט: {"kind","statement","terms":[],"value":null,"relates":[],"confidence":0-100,"evidence":"קטע קצר מהמקור"}.
פלט: אך ורק JSON array תקין. בלי טקסט לפני/אחרי, בלי Markdown, בלי גדרות-קוד.`;

const KINDS = ["fact", "relation", "observation", "hypothesis", "question"];
const hasHeb = (s: string) => /[א-ת]/.test(s || "");
function json(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } }); }

async function allMethods(w: string): Promise<Record<string, number> | null> {
  try { const { data } = await sb.rpc("fn_all_methods", { p_word: w }); return (data && (data as any)["רגיל"]) ? (data as any) : null; } catch { return null; }
}

async function extractText(content: string, source: string, source_ref: string | null, contributor: string | null) {
  if (!content || content.trim().length < 8) return { inserted: 0, objects: [] as any[] };
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1600, system: SYSTEM,
      messages: [{ role: "user", content: `מקור: ${source}\n\nהטקסט:\n"""\n${content.slice(0, 6000)}\n"""\n\nהחזר JSON array בלבד לפי השפה.` }] }),
  });
  if (!resp.ok) return { inserted: 0, error: `anthropic_${resp.status}` };
  const d = await resp.json();
  const txt = (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  try { await sb.from("ai_token_log").insert({ source: "research-extract", kind: "extract", model: MODEL, input_tokens: d?.usage?.input_tokens || 0, output_tokens: d?.usage?.output_tokens || 0 }); } catch { /* noop */ }
  let arr: any;
  try { const i = txt.indexOf("["), j = txt.lastIndexOf("]"); arr = JSON.parse(txt.slice(i, j + 1)); } catch { return { inserted: 0, error: "parse", raw: txt.slice(0, 200) }; }
  if (!Array.isArray(arr)) return { inserted: 0, objects: [] };

  let inserted = 0; const out: any[] = [];
  for (const o of arr.slice(0, 20)) {
    const kind = String(o?.kind || "").toLowerCase();
    if (!KINDS.includes(kind)) continue;
    const statement = String(o?.statement || "").slice(0, 500).trim();
    if (!statement) continue;
    const terms = (Array.isArray(o?.terms) ? o.terms : []).map(String).slice(0, 6);
    const relates = (Array.isArray(o?.relates) ? o.relates : []).map(String).slice(0, 4);
    const value = (o?.value != null && !isNaN(+o.value)) ? Math.trunc(+o.value) : null;

    // אימות-מנוע: fact/relation עם value + ביטוי-עברי → מאמת מול fn_all_methods
    let engine_verified: boolean | null = null; let engine_detail: any = null;
    if ((kind === "fact" || kind === "relation") && value != null) {
      const det: Record<string, any> = {}; let anyHeb = false, matched = false;
      for (const t of [...terms, ...relates]) {
        if (hasHeb(t)) { anyHeb = true; const m = await allMethods(t); if (m) { det[t] = m; if (Object.values(m).some((v) => v === value)) matched = true; } }
      }
      if (anyHeb) { engine_verified = matched; engine_detail = det; }
    }

    // דדופ: אותו מקור+סוג+נוסח
    const { data: ex } = await sb.from("research_objects").select("id").eq("source_ref", source_ref || "").eq("kind", kind).eq("statement", statement).maybeSingle();
    if (ex) continue;

    await sb.from("research_objects").insert({
      kind, statement, terms, value, relates, source, source_ref, contributor,
      confidence: (o?.confidence != null && !isNaN(+o.confidence)) ? Math.trunc(+o.confidence) : null,
      engine_verified, engine_detail, evidence: String(o?.evidence || "").slice(0, 600), status: "candidate",
    });
    inserted++; out.push({ kind, statement, value, engine_verified });
  }
  return { inserted, objects: out };
}

// בונה טקסט-שיחה ממוזג (נכנס wa_bot_log + יוצא bot_transcripts) לפי chatId
async function buildConversation(chatId: string): Promise<{ text: string; name: string }> {
  const phone = chatId.replace("@c.us", "");
  const { data: inc } = await sb.from("wa_bot_log").select("created_at,text_in,sender_name").eq("sender", phone).eq("action", "raziel_dm").not("text_in", "is", null).order("created_at").limit(40);
  const { data: out } = await sb.from("bot_transcripts").select("created_at,message").eq("chat_id", chatId).order("created_at").limit(40);
  const rows = [
    ...(inc || []).map((r: any) => ({ t: r.created_at, who: r.sender_name || "משתמש", m: r.text_in })),
    ...(out || []).map((r: any) => ({ t: r.created_at, who: "רזיאל", m: r.message })),
  ].sort((a, b) => +new Date(a.t) - +new Date(b.t));
  const name = (inc || []).map((r: any) => r.sender_name).find(Boolean) || phone;
  return { text: rows.map((r) => `${r.who}: ${(r.m || "").replace(/\s+/g, " ").slice(0, 300)}`).join("\n"), name };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!ANTHROPIC) return json({ error: "not_configured" });
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode || u.searchParams.get("mode") || "extract";
  try {
    if (mode === "scan") {
      const hours = Math.min(Number(body?.hours || u.searchParams.get("hours") || 24), 168);
      const maxChats = Math.min(Number(body?.max || 8), 20);
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: chats } = await sb.from("bot_transcripts").select("chat_id,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(300);
      const seen = new Set<string>(); const list: string[] = [];
      for (const c of (chats || [])) { const cid = (c as any).chat_id; if (cid && cid.endsWith("@c.us") && !seen.has(cid)) { seen.add(cid); list.push(cid); } }
      let total = 0; const per: any[] = [];
      for (const chatId of list.slice(0, maxChats)) {
        const { text, name } = await buildConversation(chatId);
        if (text.length < 20) continue;
        const r = await extractText(text, "wa-raziel", chatId, name);
        total += r.inserted || 0; per.push({ chatId, name, inserted: r.inserted || 0 });
      }
      return json({ mode: "scan", total, chats: per });
    }
    const { source = "manual", source_ref = null, contributor = null, content = "" } = body;
    const r = await extractText(content, source, source_ref, contributor);
    return json({ mode: "extract", ...r });
  } catch (e) { return json({ error: String(e).slice(0, 200) }); }
});
