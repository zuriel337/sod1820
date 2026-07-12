// 📜 תיבת-ההגדרות של צוריאל — "אני נותן ל-AI את ההגדרות כאן במקום בצ'אט, והוא עונה לי כאן".
// הזרימה: צוריאל כותב → נשמר (researcher_definitions) → ה-AI (Sonnet) עונה מיד עם הבנה/שאלות →
// כל סוכן-פיתוח עתידי קורא את הרשומות הפתוחות בתחילת עבודה ומיישם לעץ (status→applied).
import React, { useState, useEffect } from "react";
import { C, F } from "../theme.js";
import { listResearcherDefinitions, addResearcherDefinition, updateResearcherDefinition, getAiAnalysis } from "../lib/supabase.js";

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const ST = { new: ["#8a8f98", "חדש"], ai_replied: ["#3ea6ff", "ה-AI ענה — ממתין לסוכן"], applied: ["#4caf7d", "יושם בעץ"], archived: ["#666", "בארכיון"] };

export default function DefinitionsInbox() {
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { listResearcherDefinitions().then(setItems); }, []);

  const submit = async () => {
    const c = content.trim();
    if (!c || busy) return;
    setBusy(true); setMsg("");
    try {
      const row = await addResearcherDefinition(c, context.trim() || null);
      setItems(it => [row, ...it]); setContent(""); setContext("");
      // 🤖 ה-AI עונה מיד — משקף הבנה, שואל שאלות-הבהרה, ולא קובע עובדות בעצמו.
      const facts =
        "[הנחיה: אתה עוזר-המחקר של צוריאל במערכת סוד1820. צוריאל כתב הגדרה/ידע חדש למערכת. " +
        "תפקידך: (1) שקף בקצרה מה הבנת. (2) שאל 1-2 שאלות הבהרה ממוקדות אם צריך (researcher_dialogue_law). " +
        "(3) ציין אילו ערכים דורשים אימות-מנוע לפני קיבוע. אל תמציא ערכי גימטריה. סוכן-פיתוח אנושי+AI יקרא את ההגדרה ויישם אותה בעץ.]\n\n" +
        (row.context ? `הקשר: ${row.context}\n` : "") + `ההגדרה של צוריאל:\n${c}`;
      const reply = await getAiAnalysis({ kind: "research", subject: "הגדרת חוקר חדשה", facts, fast: false });
      if (reply) {
        const upd = await updateResearcherDefinition(row.id, { ai_reply: reply, status: "ai_replied" });
        setItems(it => it.map(x => x.id === row.id ? upd : x));
      }
    } catch (e) { setMsg("שגיאה: " + (e.message || e).toString().slice(0, 120)); }
    setBusy(false);
  };

  return (
    <div style={box}>
      <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>📜 ההגדרות שלי למערכת</div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginBottom: 10 }}>
        כתוב כאן הגדרה, ידע או עיגון — בדיוק כמו בצ'אט. ה-AI יענה כאן מיד, והסוכן יקרא ויישם בעץ בעבודה הבאה (לא צריך לחכות לצ'אט פתוח).
      </div>
      <input value={context} onChange={e => setContext(e.target.value)} placeholder="על מה? (למשל: אתבש / 566 / שנים כפולות) — לא חובה"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, padding: "8px 11px", fontFamily: F.body, fontSize: 13, marginBottom: 7 }} />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
        placeholder="למשל: 54 זה גאולה בצורה הפוכה… / כתוב בספרים שאותיות גדולות זה דין…"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, padding: "9px 11px", fontFamily: F.body, fontSize: 13.5, resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8 }}>
        <button onClick={submit} disabled={busy || !content.trim()}
          style={{ cursor: "pointer", background: `linear-gradient(135deg, ${C.gold}, #c79a2a)`, border: "none", color: "#1a0e00", borderRadius: 9, padding: "8px 20px", fontFamily: F.heading, fontWeight: 800, fontSize: 13.5 }}>
          {busy ? "🤖 שומר ועונה…" : "📜 שמור למערכת"}
        </button>
        {msg && <span style={{ color: "#e0645a", fontSize: 12.5 }}>{msg}</span>}
      </div>

      {items.length > 0 && (
        <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
          {items.map(it => (
            <div key={it.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ background: (ST[it.status]?.[0] || "#888") + "22", border: `1px solid ${ST[it.status]?.[0] || "#888"}`, color: ST[it.status]?.[0] || "#888", borderRadius: 999, padding: "1px 9px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading }}>{ST[it.status]?.[1] || it.status}</span>
                {it.context && <span style={{ color: C.muted, fontSize: 11.5 }}>{it.context}</span>}
                <span style={{ color: C.muted, fontSize: 10.5, marginInlineStart: "auto" }}>{new Date(it.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-line" }}>{it.content}</div>
              {it.ai_reply && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                  <div style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 4 }}>🤖 תשובת ה-AI</div>
                  <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line", opacity: 0.92 }}>{it.ai_reply}</div>
                </div>
              )}
              {it.applied_note && (
                <div style={{ marginTop: 7, color: "#4caf7d", fontFamily: F.body, fontSize: 12 }}>✓ יושם: {it.applied_note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
