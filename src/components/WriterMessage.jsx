import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// ✉️ הודעה פרטית לכתב — גולש כותב לכתב; ההודעה נכנסת לתיבת-הפניות הקיימת (contact_messages),
// מתויגת ב-subject «הודעה לכתב: <שם>» כדי שהאדמין/הכתב ינתב אותה. עץ אחד: אין טבלה מקבילה.
export default function WriterMessage({ name, P: Pp }) {
  const Pctx = usePalette();
  const P = Pp || Pctx;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState("idle"); // idle | sending | done | error

  async function send(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setState("sending");
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim(),
      email: (form.email.trim() || "—"),
      subject: `✉️ הודעה לכתב: ${name}`,
      message: form.message.trim(),
    });
    setState(error ? "error" : "done");
  }

  const btn = {
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
    background: "transparent", color: P.accentText, border: `1px solid ${P.border}`,
    borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40,
  };
  const field = {
    width: "100%", boxSizing: "border-box", direction: "rtl", background: P.card, color: P.ink,
    border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 12px", fontFamily: F.body, fontSize: 15, outline: "none",
  };

  if (!open) return <button style={btn} onClick={() => setOpen(true)}>✉️ שלח הודעה ל{name}</button>;

  return (
    <div onClick={() => state !== "sending" && setOpen(false)} role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(6,4,12,.72)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: P.pageBg || P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22, direction: "rtl", boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>✉️ הודעה ל{name}</div>
          <button onClick={() => setOpen(false)} aria-label="סגירה" style={{ background: "none", border: "none", color: P.inkSoft, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {state === "done" ? (
          <div style={{ textAlign: "center", padding: "22px 6px" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>✅</div>
            <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.7 }}>ההודעה נשלחה ל{name}. תודה!</div>
            <button style={{ ...btn, marginTop: 14 }} onClick={() => setOpen(false)}>סגור</button>
          </div>
        ) : (
          <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.5 }}>כתבו הודעה אישית — היא תגיע לכתב דרך מערכת האתר.</div>
            <input style={field} placeholder="השם שלכם *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={field} type="email" placeholder="אימייל (אם תרצו תשובה)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <textarea style={{ ...field, minHeight: 110, resize: "vertical", lineHeight: 1.6 }} placeholder={`ההודעה ל${name} *`} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            {state === "error" && <div style={{ color: "#e0655e", fontFamily: F.body, fontSize: 13 }}>שגיאה בשליחה — נסו שוב.</div>}
            <button type="submit" disabled={state === "sending" || !form.name.trim() || !form.message.trim()}
              style={{ ...btn, justifyContent: "center", background: P.accentBtn || P.accentText, color: P.onAccent || "#1a1206", border: "none",
                opacity: (state === "sending" || !form.name.trim() || !form.message.trim()) ? .6 : 1 }}>
              {state === "sending" ? "שולח…" : "שלח הודעה ✉️"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
