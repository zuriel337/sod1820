// 💬 חדר-רזיאל = אותו רזיאל של וואטסאפ, במצב-מחקר. לא סוכן/מקור-ידע/עץ חדש.
// קורא אך ורק דרך הפונקציות הקנוניות: fn_raziel_persona · fn_raziel_context · metatron_context.
// מוח רזיאל מחזיר מעטפת-JSON (לבוט וואטסאפ); כאן מפרקים אותה לעברית נקייה (humanize).
//
// 🔧 שדרוג רזיאל (raziel-upgrade): הבעיה שצוריאל ראה — «(אין תשובה — נסה להזכיר מספר)» —
// נבעה מקריאת-Anthropic יחידה ללא ניסיון-חוזר: כשהמודל החזיר טקסט-ריק או נכשל זמנית
// (עומס/timeout — קריאות ארכו 30-40ש׳), הפונקציה החזירה answer:null והצ׳אט הציג את הנפילה.
// התיקון: (1) callClaude עם ניסיונות-חוזרים + timeout לכל ניסיון; (2) fallback עברי חינני —
// לעולם לא מחזירים null לצ׳אט; (3) dossier קומפקטי (במקום JSON-גולמי ענק) → פחות טוקנים,
// מהיר יותר, וסיכון נמוך יותר לטקסט-ריק.
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || SB_SVC;
const H = { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }

// 🧹 מפרק מעטפת-JSON של רזיאל → עברית נקייה (greeting+answer+follow_up). אם לא JSON — מחזיר כמות שהוא.
function composeEnvelope(obj: any): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const parts: string[] = [];
  if (obj.greeting) parts.push(String(obj.greeting).trim());
  if (obj.answer != null) {
    if (typeof obj.answer === "string") parts.push(obj.answer.trim());
    else if (typeof obj.answer === "object") { const inner = composeEnvelope(obj.answer); if (inner) parts.push(inner); }
  }
  if (obj.follow_up_question) parts.push(String(obj.follow_up_question).trim());
  // רק אם באמת מעטפה (יש greeting/answer) — אחרת אל תהפוך אובייקט שרירותי
  return (obj.greeting != null || obj.answer != null) && parts.length ? parts.join("\n\n") : null;
}
function humanize(raw: string | null): string | null {
  if (!raw) return raw;
  let t = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { const c = composeEnvelope(JSON.parse(t)); if (c) return c; } catch { /* not pure json */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { const c = composeEnvelope(JSON.parse(t.slice(s, e + 1))); if (c) return (t.slice(0, s).trim() ? t.slice(0, s).trim() + "\n\n" : "") + c; } catch { /* embedded parse failed */ } }
  return raw;
}

async function rpc(fn: string, args: unknown): Promise<any> {
  try { const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function rest(path: string): Promise<any> {
  try { const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function uidFromToken(auth: string): Promise<string> {
  const tok = (auth || "").replace(/^Bearer\s+/i, "").trim();
  if (!tok || tok === SB_ANON || tok === SB_SVC) return "";
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${tok}` } });
    if (!r.ok) return "";
    const u = await r.json();
    return (u && typeof u.id === "string") ? u.id : "";
  } catch { return ""; }
}

async function loadThreadFull(uid: string, limit = 40): Promise<{ history: { role: string; text: string }[]; snapshot: unknown }> {
  if (!uid) return { history: [], snapshot: null };
  const rows = await rest(`agent_user_memory?user_ref=eq.${encodeURIComponent(uid)}&channel=eq.site&agent=eq.raziel&memory_type=eq.conversation&source=eq.site&select=content,data,created_at&order=created_at.asc&limit=${limit}`);
  const history: { role: string; text: string }[] = []; let snapshot: unknown = null;
  if (Array.isArray(rows)) for (const r of rows) {
    if (r.content) history.push({ role: "user", text: r.content });
    const reply = r?.data?.reply; if (reply) history.push({ role: "assistant", text: humanize(String(reply)) || String(reply) });
    if (r?.data?.context_snapshot) snapshot = r.data.context_snapshot;
  }
  return { history, snapshot };
}

async function saveExchange(uid: string, userMsg: string, reply: string, values: number[], snapshot: unknown) {
  if (!uid || !reply) return;
  try {
    await fetch(`${SB_URL}/rest/v1/agent_user_memory`, {
      method: "POST", headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({
        user_ref: uid, channel: "site", agent: "raziel",
        memory_type: "conversation", memory_scope: "personal", visibility: "private", source: "site",
        topic: (userMsg || `(${values.join(", ")})`).slice(0, 80),
        content: userMsg || `(${values.join(", ")})`,
        data: { reply, context_snapshot: snapshot, values },
      }),
    });
  } catch { /* לא שובר את התשובה */ }
}

const CORE_RULE_IDS = ["misratar_multi","ribua_definition","method_hierarchy_ragil_foundation","method_priority","messiah_frequency_law","intent_before_compute_law","gematria_engine_law","shitat_haechad_alef_law"];

const RESEARCH_RULES =
  "\n\n== מצב-מחקר · חדר-המספרים ==\n" +
  "לפניך: dossier קנוני (עוגן/התכנסויות/ראיות/החלטות) · ידע קנוני מ-metatron_context · וזיכרון-צוריאל.\n" +
  "חוקי-ברזל:\n" +
  "1. אל תחשב גימטריה בעצמך — רק ערכים שב-dossier/ידע הקנוני.\n" +
  "2. הפרד למדורים (רק הרלוונטיים) בכותרות אלה: 🔢 עובדות · 🔎 ממצאים · 🧠 פרשנות · ❓ השערה.\n" +
  "3. כל טענה מהותית — מקור בסוגריים: (שיטה X / ראיה / החלטה / node / זיכרון).\n" +
  "4. ידע חיצוני לעץ — סמן «[ידע חיצוני לעץ — לא אושר]». אסור להציגו כעובדה.\n" +
  "5. זוכר את צוריאל: אם משהו בזיכרון רלוונטי — התייחס. אבל זיכרון אינו מקור-אמת.\n" +
  "6. ⚠ סתירה — הקנון קודם: אם הזיכרון/השיחה סותר nodes/edges/ראיות/decision_ledger/חוקים — הצג את הסתירה במפורש והשאר את הקנון כקובע.\n" +
  "7. שאלה שיחתית/קצרה (למשל «כמה צפוי X», «מה הכי חזק», «למה זה דחוף») — ענה קצר וישיר בשפה אנושית; אל תכפה את כל המדורים כשאין צורך, אבל אל תמציא עובדות. אם חסר מידע בדוסייה — אמור זאת בכנות והצע מה כן אפשר לבדוק.\n" +
  "8. סיים כל תשובה: «🧬 מצב הידע: N עובדות · N ממצאים · N פרשנויות · N השערות · context <version>».\n" +
  "9. בלי נבואות/תאריכים עתידיים/טענות על אנשים חיים. עברית בלבד.\n" +
  "10. ⚠ פלט: השב **טקסט עברי רצוף בלבד** — בלי JSON, בלי מעטפה, בלי שדות כמו value/label/greeting/answer. רק מה שצוריאל קורא.";

const FALLBACK_PERSONA = "אתה רזיאל — חוקר-המספרים של סוד 1820, עֶדְשָׁה מעל עץ-הידע.";

function fmtMemory(rctx: any): string {
  const uc = rctx?.user_context; if (!uc) return "";
  const parts: string[] = [];
  if (uc.summary) parts.push("סיכום: " + String(uc.summary).slice(0, 600));
  const rc = Array.isArray(uc.recent_conversation) ? uc.recent_conversation.slice(0, 10) : [];
  if (rc.length) parts.push("נושאים אחרונים שדיברנו עליהם: " + rc.map((x: string) => String(x).slice(0, 80)).join(" · "));
  const pf = Array.isArray(uc.approved_preferences) ? uc.approved_preferences : [];
  if (pf.length) parts.push("העדפות שאישרת: " + pf.map((x: string) => String(x).slice(0, 100)).join(" · "));
  const rt = Array.isArray(uc.research_threads) ? uc.research_threads : [];
  if (rt.length) parts.push("קווי-מחקר: " + rt.map((x: string) => String(x).slice(0, 100)).join(" · "));
  return parts.length ? "== מה שאתה זוכר על צוריאל ==\n" + parts.join("\n") : "";
}

function fmtKnowledge(k: any): string {
  const c = k?.canonical; if (!c) return "";
  const parts: string[] = [];
  const m = (c.matches || []).slice(0, 12).map((x: any) => `${x.phrase}=${x.value}`);
  if (m.length) parts.push("ביטויים מאומתים במנוע: " + m.join(" · "));
  const cv = (c.convergences || []).map((x: any) => `${x.value}(קבוצה ${x.group_size})`);
  if (cv.length) parts.push("התכנסויות: " + cv.join(" · "));
  const ef = (c.engraved_facts || []).slice(0, 8).map((x: any) => x.statement);
  if (ef.length) parts.push("עובדות חקוקות: " + ef.join(" · "));
  const df = (c.definitions || []).slice(0, 4).map((x: any) => x.content);
  if (df.length) parts.push("הגדרות צוריאל: " + df.join(" · "));
  return parts.length ? "== ידע קנוני (metatron_context) ==\n" + parts.join("\n") : "";
}

// 🗜️ dossier קומפקטי בעברית — מחליף את JSON.stringify הגולמי (חסך טוקנים → מהיר + פחות טקסט-ריק).
function fmtDossier(value: number, d: any): string {
  if (!d) return `== dossier למספר ${value} ==\n(אין נתונים זמינים לערך זה)`;
  const f = d.facts || {};
  const lines: string[] = [`== dossier למספר ${value} ==`];
  if (f.node?.label) lines.push(`node: ${f.node.label}${f.node.description ? ` — ${f.node.description}` : ""}`);
  if (f.anchor) lines.push(`עוגן: ${typeof f.anchor === "string" ? f.anchor : JSON.stringify(f.anchor).slice(0, 300)}`);
  if (f.metatron_anchor) lines.push(`עוגן-מטטרון: ${typeof f.metatron_anchor === "string" ? f.metatron_anchor : JSON.stringify(f.metatron_anchor).slice(0, 200)}`);
  const cvs = Array.isArray(f.convergences) ? f.convergences : [];
  if (cvs.length) {
    lines.push("התכנסויות (שיטה · גודל-קבוצה · ביטויים):");
    for (const c of cvs.slice(0, 6)) {
      const ph = Array.isArray(c.phrases) ? c.phrases.slice(0, 16) : [];
      const more = Array.isArray(c.phrases) && c.phrases.length > 16 ? ` (+${c.phrases.length - 16})` : "";
      lines.push(`  · ${c.method} — קבוצה ${c.group_size}: ${ph.join(", ")}${more}`);
    }
  }
  const cards = Array.isArray(d.cards) ? d.cards : [];
  if (cards.length) lines.push(`כרטיסים: ${cards.slice(0, 6).map((c: any) => c.title || c.name || c.label).filter(Boolean).join(" · ")}`);
  const ev = Array.isArray(d.evidence) ? d.evidence : [];
  if (ev.length) lines.push(`ראיות: ${ev.length} (סטטוסים: ${Array.from(new Set(ev.map((e: any) => e.status).filter(Boolean))).join(", ")})`);
  const dec = Array.isArray(d.decisions) ? d.decisions : [];
  if (dec.length) lines.push(`החלטות: ${dec.slice(0, 6).map((x: any) => `${x.human_decision || x.status}${x.reason_code ? `/${x.reason_code}` : ""}`).join(" · ")}`);
  const pf = Array.isArray(d.preferences) ? d.preferences : [];
  if (pf.length) lines.push(`העדפות רלוונטיות: ${pf.slice(0, 4).map((x: any) => x.content || x.label || JSON.stringify(x).slice(0, 80)).join(" · ")}`);
  return lines.join("\n");
}

// 🔁 קריאת-Claude עם ניסיונות-חוזרים + timeout לכל ניסיון. מחזיר טקסט לא-ריק, או "" אם כל הניסיונות נכשלו.
async function callClaude(system: string, userMsg: string, tries = 3): Promise<{ text: string; error: string | null }> {
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt === 1 ? 700 : 1600));
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1800, system, messages: [{ role: "user", content: userMsg }] }),
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        lastErr = `anthropic_${resp.status}`;
        // 429/5xx/529 = חולף → נסה שוב; 4xx אחר = קבוע → אל תבזבז ניסיונות
        if (resp.status === 429 || resp.status >= 500) continue;
        return { text: "", error: lastErr + ": " + (await resp.text().catch(() => "")).slice(0, 200) };
      }
      const data = await resp.json();
      const rawText = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
      if (rawText) return { text: rawText, error: null };
      lastErr = "empty_text"; // טקסט-ריק (הבאג שצוריאל ראה) → נסה שוב
    } catch (e) {
      lastErr = ctrl.signal.aborted ? "timeout" : String(e).slice(0, 120);
    } finally {
      clearTimeout(to);
    }
  }
  return { text: "", error: lastErr };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!ANTHROPIC_KEY) return json({ answer: null, error: "not_configured" });
  try {
    const body = await req.json().catch(() => ({}));
    const uid = await uidFromToken(req.headers.get("Authorization") || "");

    if (body?.op === "history") { const t = await loadThreadFull(uid); return json({ history: t.history, snapshot: t.snapshot, uid_present: !!uid }); }

    const values: number[] = (Array.isArray(body?.values) ? body.values : [body?.value])
      .map((x: unknown) => parseInt(String(x), 10)).filter((x: number) => Number.isFinite(x)).slice(0, 3);
    const message = String(body?.message || "").slice(0, 2000);
    if (!values.length && !message) return json({ answer: null, error: "no_value" });

    const [personaRaw, rctx, knowledge, brainRows] = await Promise.all([
      rpc("fn_raziel_persona", { p_channel: "site" }),
      uid ? rpc("fn_raziel_context", { p_user_ref: uid, p_channel: "site" }) : Promise.resolve(null),
      rpc("metatron_context", { p_request: { ask: message, channel: "site", user: { ref: uid }, values } }),
      rest("raziel_brain?id=eq.1&select=voice_version,updated_at"),
    ]);
    const persona = (typeof personaRaw === "string" && personaRaw.trim()) ? personaRaw.trim() : FALLBACK_PERSONA;
    const brain = Array.isArray(brainRows) && brainRows[0] ? brainRows[0] : {};

    const dossiers = values.length ? await Promise.all(values.map(v => rpc("fn_number_dossier", { p_value: v }))) : [];
    const ctxVer = (knowledge?.context_version) ?? ((dossiers[0] as any)?.context_version) ?? "v1";

    const methods = Array.from(new Set(dossiers.flatMap((d: any) => (d?.facts?.convergences || []).map((m: any) => m.method)).filter(Boolean)));
    const [rulesSnap, engineSnap, decisions] = await Promise.all([
      rpc("fn_rules_snapshot", { p_rule_ids: CORE_RULE_IDS }),
      rpc("fn_engine_snapshot", { p_methods: methods.length ? methods : ["רגיל"] }),
      values.length ? rest(`decision_ledger?subject_ref=in.(${values.join(",")})&select=id,subject_ref,human_decision,reason_code,status,created_at&order=created_at.desc&limit=12`) : Promise.resolve([]),
    ]);

    const dossierBlock = values.length
      ? values.map((v, i) => fmtDossier(v, dossiers[i])).join("\n\n")
      : "(לא צוין מספר ספציפי)";
    const memBlock = fmtMemory(rctx);
    const knowBlock = fmtKnowledge(knowledge);

    const dbt = await loadThreadFull(uid, 12);
    const clientHist: { role: string; text: string }[] = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const history = dbt.history.length ? dbt.history.slice(-8) : clientHist;
    const convo = history.map(h => `${h.role === "assistant" ? "רזיאל" : "צוריאל"}: ${h.text}`).join("\n");

    const SYSTEM = persona + RESEARCH_RULES;
    const userMsg =
      `${dossierBlock}\n\n` +
      (knowBlock ? knowBlock + "\n\n" : "") +
      (memBlock ? memBlock + "\n\n" : "") +
      (convo ? `— שיחה עד כה —\n${convo}\n\n` : "") +
      `— צוריאל עכשיו —\n${message || (values.length > 1 ? `השווה בין ${values.join(" ל-")}` : `ספר לי הכל על ${values[0]}`)}\n\n` +
      `ענה בעברית רצופה בלבד (לא JSON) לפי המדורים. context version: ${typeof ctxVer === "string" ? ctxVer : JSON.stringify(ctxVer)}.`;

    const { text: rawText, error: aiError } = await callClaude(SYSTEM, userMsg);
    const text = humanize(rawText) || rawText;

    const snapshot = {
      persona: { source: "raziel_brain#1", voice_version: brain.voice_version ?? null, updated_at: brain.updated_at ?? null },
      memory_context: { recent_conversation_n: Array.isArray(rctx?.user_context?.recent_conversation) ? rctx.user_context.recent_conversation.length : 0, summary_present: !!(rctx?.user_context?.summary), refs: uid ? [uid] : [] },
      knowledge_context_version: knowledge?.context_version ?? null,
      rules_snapshot: rulesSnap ?? [], engine_snapshot: engineSnap ?? [],
      decisions: Array.isArray(decisions) ? decisions : [],
      values, model: MODEL,
    };

    if (uid && text) await saveExchange(uid, message, text, values, snapshot);

    // 🛟 fallback חינני — לעולם לא null לצ׳אט. הדוסייה כבר בידי ה-UI, אז רזיאל מכוון את צוריאל להמשיך.
    const answer = text || (values.length
      ? `רגע — נתקעתי בניתוח של ${values.join(" · ")} (${aiError === "timeout" ? "לקח יותר מדי זמן" : "עומס רגעי"}). הנתונים כבר לפניך בכרטיס. נסה לשלוח שוב, או שאל אותי משהו ממוקד — למשל «מה ההתכנסות הכי חזקה של ${values[0]}?» או «למה זה מעניין?» 🌳`
      : `לא תפסתי מספר לחקור. כתוב לי מספר (למשל 312) ואחקור אותו לעומק — או שאל על מספר שכבר על השולחן. 🌳`);

    return json({ answer, dossiers, values, context_version: ctxVer, model: MODEL, context_snapshot: snapshot, remembered: snapshot.memory_context.recent_conversation_n, persisted: !!(uid && text), degraded: !text, ai_error: text ? null : aiError });
  } catch (e) {
    return json({ answer: "אירעה תקלה רגעית אצלי — נסה שוב בעוד רגע. 🌳", error: String(e).slice(0, 200), degraded: true }, 200);
  }
});
