import React, { useState, useRef, useEffect } from "react";
import { askRaziel } from "../lib/supabase.js";

const RAZIEL_WA = "972557049261";   // רזיאל בוואטסאפ (wa-christina)

// 🤖 RazielChat — צ'אט חופשי רב-תורי עם רזיאל · בית-הקבע בסביבת-המחקר.
// (raziel_companion_layer_law שכבה 1 · research_workspace_law פאנל AI Assistant.)
// עוטף את askRaziel הקיים — אין מנוע חדש: כל הודעה = subject; רציפות רב-תורית מגיעה מהזיכרון
// (fn_raziel_remember/context, כולל חוצה-ערוצים אתר↔וואטסאפ דרך הגשר), + context קצר מהתמליל
// לקוהרנטיות בתוך-סשן גם למשתמש אנונימי. metatron:true → רזיאל נשען על «העץ האחד» (חוקים+גרף).
// עובדה-מנוע ≠ פרשנות · קול אחד · מסיים בשאלה מזמינה.
export default function RazielChat() {
  const [msgs, setMsgs] = useState([]);   // {role:'user'|'raziel'|'off', text, facts?, paths?, follow?}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { const b = boxRef.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs, busy]);

  async function send(text) {
    const q = (text || "").trim();
    if (!q || busy) return;
    setInput("");
    // הקשר-תמליל קצר (2 התורות האחרונות) → קוהרנטיות בתוך-סשן גם בלי התחברות
    const hist = msgs.slice(-2).map(m => `${m.role === "user" ? "אני" : "רזיאל"}: ${m.text}`).join(" · ").slice(0, 500);
    setMsgs(m => [...m, { role: "user", text: q }]);
    setBusy(true);
    let r = null;
    try { r = await askRaziel({ subject: q, context: hist || null, metatron: true }); } catch { /* noop */ }
    setBusy(false);
    if (!r) { setMsgs(m => [...m, { role: "off", text: "רזיאל לא זמין כרגע — נסו שוב מעט מאוחר יותר." }]); return; }
    setMsgs(m => [...m, { role: "raziel", text: r.answer || "", facts: r.facts, paths: r.suggested_paths, follow: r.follow_up_question }]);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  const onKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } };
  const waUrl = `https://wa.me/${RAZIEL_WA}?text=${encodeURIComponent("שלום רזיאל 🌳 המשכתי מהאתר — ")}`;

  // עיצוב: שפה בהירה נקייה (research_workspace_law) — לבן/כחול + נגיעת-וואטסאפ ירוקה.
  const C = { ink: "#1b1d22", dim: "#5b6472", line: "#e2e8f2", card: "#fff", soft: "#f3f7ff", acc: "#2f6df6", wa: "#25d366" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 320 }}>
      {/* כותרת */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, paddingBottom: 10, borderBottom: `1px solid ${C.line}` }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#1a9e4b)", display: "grid", placeItems: "center", fontSize: 16, flex: "none" }}>🤖</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.ink, fontWeight: 800, fontSize: 14.5 }}>רזיאל · סוכן-המחקר שלך</div>
          <div style={{ color: C.dim, fontSize: 11 }}>שאל כל דבר — עובדה מהמנוע, לא נבואה · זוכר גם מהוואטסאפ</div>
        </div>
        <span style={{ color: C.acc, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 999, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", flex: "none" }}>בטא</span>
      </div>

      {/* תמליל */}
      <div ref={boxRef} style={{ flex: 1, overflowY: "auto", padding: "12px 2px", display: "flex", flexDirection: "column", gap: 10, minHeight: 180 }}>
        {msgs.length === 0 && (
          <div style={{ color: C.ink, fontSize: 14, lineHeight: 1.8, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px" }}>
            שלום 🌳 אני רזיאל, סוכן-המחקר האישי שלך. שאל אותי כל דבר — שם, מספר, פסוק, קשר בין דברים — ואחקור איתך מהמנוע.
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {["מה סוד 1820?", "נתח את השם דוד", "מה הקשר בין הגאולה למספרים?"].map(s => (
                <button key={s} onClick={() => send(s)} style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: C.card, color: C.acc, borderRadius: 999, fontSize: 12.5, fontWeight: 700, padding: "6px 12px" }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", background: C.acc, color: "#fff", borderRadius: "14px 14px 14px 4px", padding: "9px 13px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
        ) : (
          <div key={i} style={{ alignSelf: "flex-end", maxWidth: "92%" }}>
            <div style={{ background: m.role === "off" ? "#fff4f4" : C.card, border: `1px solid ${m.role === "off" ? "#f2c7c7" : C.line}`, borderInlineEnd: "3px solid #25d366", color: C.ink, borderRadius: "14px 14px 4px 14px", padding: "11px 14px", fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
              {m.text}
              {Array.isArray(m.facts) && m.facts.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
                  {m.facts.map((f, k) => (
                    <span key={k} style={{ color: C.acc, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 8, padding: "2px 9px", fontSize: 12, fontFamily: "ui-monospace,Menlo,monospace" }}>{f.label}{f.value != null ? ` = ${f.value}` : ""}</span>
                  ))}
                </div>
              )}
              {m.follow && <div style={{ color: C.acc, fontSize: 13.5, lineHeight: 1.6, marginTop: 9 }}>{m.follow}</div>}
            </div>
            {Array.isArray(m.paths) && m.paths.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7, justifyContent: "flex-end" }}>
                {m.paths.map((p, k) => (
                  <button key={p.id || k} onClick={() => send(p.label)} title={p.hint || ""} style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: C.soft, color: C.ink, borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "5px 11px" }}>{p.icon ? `${p.icon} ` : ""}{p.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {busy && <div style={{ alignSelf: "flex-end", color: C.dim, fontSize: 13, fontStyle: "italic", padding: "4px 6px" }}>✍️ רזיאל חוקר…</div>}
      </div>

      {/* קלט */}
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea ref={inputRef} value={input} dir="rtl" rows={1} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="שאל את רזיאל…  (Enter לשליחה)"
          style={{ flex: 1, resize: "none", maxHeight: 120, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, color: C.ink, fontSize: 15, lineHeight: 1.5, padding: "10px 13px", outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => send(input)} disabled={busy || !input.trim()} title="שלח"
          style={{ cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? 0.5 : 1, border: "none", borderRadius: 12, background: "linear-gradient(135deg,#25d366,#1a9e4b)", color: "#fff", fontSize: 15, fontWeight: 800, padding: "10px 16px", flex: "none" }}>שלח</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: C.dim, fontSize: 10.5, fontStyle: "italic" }}>העובדות מאומתות במנוע · הפרשנות = רמז משלים, לא נבואה.</span>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#1a9e4b", fontSize: 12, fontWeight: 800 }}>💬 המשך בוואטסאפ ←</a>
      </div>
    </div>
  );
}
