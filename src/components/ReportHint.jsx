import React, { useState } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId, track } from "../lib/tracking.js";
import { submitCommunityHint } from "../lib/community.js";

// ➕ «דווח רמז» — הפיצ'ר הראשון של שכבת-הזהות (identity_architecture_law).
// כל אחד (אנונימי או רשום) מדווח רמז → נכנס ל-community_hints כ-pending → אדמין מאשר → gallery_images.
// רכיב קנוני יחיד: כפתור + מודל. variant: "button" (פיל) · "banner" (קריאה בולטת).
async function uploadToGallery(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `community/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function ReportHint({ value = null, variant = "button", label }) {
  const P = usePalette();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [number, setNumber] = useState(value || "");
  const [desc, setDesc] = useState("");
  const [src, setSrc] = useState("");
  const [when, setWhen] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => { setImg(null); setPreview(null); setNumber(value || ""); setDesc(""); setSrc(""); setWhen(""); setName(""); setErr(""); setDone(false); };
  const close = () => { setOpen(false); setTimeout(reset, 250); };

  const pick = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { setErr("קובץ תמונה בלבד"); return; }
    if (f.size > 12 * 1024 * 1024) { setErr("תמונה עד 12MB"); return; }
    setErr(""); setImg(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setErr("");
    if (!img && !desc.trim()) { setErr("צריך תמונה או תיאור"); return; }
    setBusy(true);
    try {
      let imageUrl = null;
      if (img) imageUrl = await uploadToGallery(img);
      const r = await submitCommunityHint({
        visitorId: getVisitorId(), userId: user?.id || null, name,
        imageUrl, number, description: desc, sourceUrl: src, occurredAt: when || null,
      });
      if (r.ok) { setDone(true); try { track("community", "report-hint", "submit"); } catch { /* noop */ } }
      else setErr(r.error === "empty" ? "צריך תמונה או תיאור" : "שגיאה בשליחה, נסו שוב");
    } catch { setErr("שגיאה בהעלאת התמונה"); }
    setBusy(false);
  };

  const fieldStyle = { width: "100%", boxSizing: "border-box", background: P.cardSoft || P.card, border: `1px solid ${P.border}`, borderRadius: 10, color: P.ink, fontFamily: F.body, fontSize: 16, padding: "10px 12px" };
  const labelStyle = { display: "block", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, margin: "0 0 5px" };

  const trigger = variant === "banner" ? (
    <button onClick={() => setOpen(true)}
      style={{ cursor: "pointer", width: "100%", border: `1px dashed ${P.accent}`, background: P.glow, color: P.accentText, borderRadius: 14, padding: "14px 16px", fontFamily: F.heading, fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      ➕ ראיתם רמז? דווחו לנו — נבדוק ונוסיף לזרם
    </button>
  ) : (
    <button onClick={() => setOpen(true)}
      style={{ cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.accentText, borderRadius: 999, padding: "8px 15px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6 }}>
      ➕ {label || "דווח רמז"}
    </button>
  );

  const modal = open ? createPortal(
    <div role="dialog" aria-modal="true" onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(3,2,8,.78)", backdropFilter: "blur(5px)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 14px 40px" }}>
      <div onClick={e => e.stopPropagation()} dir="rtl"
        style={{ width: "100%", maxWidth: 460, background: P.pageBg || P.card, border: `1px solid ${P.border}`, borderRadius: 18, boxShadow: `0 18px 60px rgba(0,0,0,.5)`, padding: "20px 20px 22px", position: "relative" }}>
        <button onClick={close} aria-label="סגור" style={{ position: "absolute", insetInlineEnd: 14, top: 12, background: "none", border: "none", color: P.accentDim, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>

        {done ? (
          <div style={{ textAlign: "center", padding: "18px 6px" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🌳</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 21, fontWeight: 800, marginBottom: 8 }}>תודה! הרמז התקבל</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>הצוות יבדוק אותו — ואם הוא מתאים, הוא יופיע בזרם המציאות. כל רמז מוסיף לעץ האחד.</div>
            <button onClick={close} style={{ cursor: "pointer", border: "none", borderRadius: 999, background: `linear-gradient(135deg,${P.accent},${P.accentBtn || P.accent})`, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "11px 26px" }}>סגור</button>
          </div>
        ) : (
          <>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 21, fontWeight: 800, marginBottom: 3 }}>➕ דיווח רמז</div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>ראיתם מספר מעניין במציאות — שלט, כותרת, שעה, רכב? צלמו ושלחו. נבדוק ונוסיף לזרם.</div>

            <div style={{ display: "grid", gap: 13 }}>
              <div>
                <span style={labelStyle}>📷 תמונה</span>
                <label style={{ display: "block", cursor: "pointer", border: `1px dashed ${P.border}`, borderRadius: 12, padding: preview ? 8 : "22px 12px", textAlign: "center", background: P.cardSoft || P.card }}>
                  {preview
                    ? <img src={preview} alt="תצוגה" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block", margin: "0 auto" }} />
                    : <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5 }}>לחצו לבחירת תמונה</span>}
                  <input type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
                </label>
              </div>
              <div>
                <span style={labelStyle}>🔢 המספר הבולט (לא חובה)</span>
                <input type="number" inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)} placeholder="למשל 1820" style={fieldStyle} />
              </div>
              <div>
                <span style={labelStyle}>📝 מה ראיתם? (לא חובה)</span>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="תיאור קצר של הרמז וההקשר" style={{ ...fieldStyle, resize: "vertical", minHeight: 70 }} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <span style={labelStyle}>📅 מתי (לא חובה)</span>
                  <input type="date" value={when} onChange={e => setWhen(e.target.value)} style={fieldStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <span style={labelStyle}>✍️ שם (לא חובה)</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="איך לקרוא לכם" style={fieldStyle} />
                </div>
              </div>
              <div>
                <span style={labelStyle}>🔗 קישור למקור (לא חובה)</span>
                <input value={src} onChange={e => setSrc(e.target.value)} placeholder="https://…" dir="ltr" style={{ ...fieldStyle, textAlign: "left" }} />
              </div>

              {err && <div style={{ color: "#e0796f", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{err}</div>}

              <button onClick={submit} disabled={busy}
                style={{ cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 999, background: `linear-gradient(135deg,${P.accent},${P.accentBtn || P.accent})`, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 15.5, padding: "12px 20px", marginTop: 2 }}>
                {busy ? "📤 שולח…" : "📤 שליחת הרמז"}
              </button>
              <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>הדיווח עובר בדיקה לפני פרסום. אין צורך בהרשמה.</div>
            </div>
          </>
        )}
      </div>
    </div>, document.body) : null;

  return (<>{trigger}{modal}</>);
}
