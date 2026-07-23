import React, { useState } from "react";
import { F } from "../../theme.js";
import { supabase } from "../../lib/supabase.js";

// 🧙 אשף «הכנת תיק המחקר» (researcher_dossier_law) — כניסה ראשונה של הבעלים.
// במקום דף ריק: כמה שאלות ידידותיות שבונות את התיק. נשמר דרך update_my_dossier + onboarded=true.
// עדשה בהירה (מקבל P). מדלג-בכל-שלב — «אמלא אחר כך».

const INTERESTS = [
  "🔠 דילוגי אותיות", "🔢 גימטריה", "📖 פסוקים ומקורות",
  "🌍 רמזי מציאות", "🎬 תרבות", "🌐 שפות", "👑 משיח וגאולה", "🏛 בית המקדש",
];

export default function DossierOnboarding({ P, name, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [about, setAbout] = useState("");
  const [interests, setInterests] = useState([]);
  const [focus, setFocus] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [busy, setBusy] = useState(false);

  const toggleInterest = (t) => setInterests(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]);

  async function finish() {
    setBusy(true);
    try {
      await supabase.rpc("update_my_dossier", { p_settings: {
        about: about.trim() || null, interests, current_focus: focus.trim() || null,
        visibility, onboarded: true,
      } });
    } catch { /* noop — לא חוסמים את המשתמש */ }
    setBusy(false);
    onDone?.({ about: about.trim(), interests, current_focus: focus.trim(), visibility, onboarded: true });
  }

  const steps = [
    // 0 — פתיח
    {
      title: `נעים להכיר${name && name !== "החוקר" ? `, ${name}` : ""} 👋`,
      body: (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8 }}>
          זה <b style={{ color: P.accentText }}>תיק המחקר שלך</b> — הבית של הגילויים, החידושים והקשרים שתאסוף לאורך הדרך.
          <br />בוא נכין אותו ב-4 שאלות קצרות. אפשר לדלג על כל שאלה ולמלא אחר כך.
        </div>
      ),
      next: "בוא נתחיל →",
    },
    // 1 — על החוקר
    {
      title: "🧑 כמה מילים עליך",
      body: (
        <textarea value={about} onChange={e => setAbout(e.target.value)} dir="auto" rows={3} autoFocus
          placeholder="מי אתה כחוקר, מה מסקרן אותך…"
          style={ta(P)} />
      ),
    },
    // 2 — תחומי עניין
    {
      title: "🔬 מה מעניין אותך לחקור?",
      body: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {INTERESTS.map(t => {
            const on = interests.includes(t);
            return (
              <button key={t} onClick={() => toggleInterest(t)}
                style={{ cursor: "pointer", border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : P.card,
                  color: on ? P.accentText : P.inkSoft, borderRadius: 999, padding: "8px 14px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>
                {t}
              </button>
            );
          })}
        </div>
      ),
    },
    // 3 — כרגע אני חוקר
    {
      title: "🟢 כרגע אני חוקר…",
      body: (
        <input value={focus} onChange={e => setFocus(e.target.value)} dir="auto" autoFocus
          placeholder="למשל: את הקשרים בין 2212 לעשרה בטבת"
          style={{ ...ta(P), minHeight: 0, height: 48 }} />
      ),
    },
    // 4 — נראות
    {
      title: "👁️ מי יראה את התיק?",
      body: (
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { v: "public", label: "🌍 ציבורי", hint: "גלוי לכולם ובגוגל" },
            { v: "unlisted", label: "🔗 קישור בלבד", hint: "רק מי שיש לו הקישור · לא בגוגל" },
            { v: "private", label: "🔒 פרטי", hint: "רק אתה — עד שתחליט לפרסם" },
          ].map(o => {
            const on = visibility === o.v;
            return (
              <button key={o.v} onClick={() => setVisibility(o.v)}
                style={{ cursor: "pointer", textAlign: "start", border: `1.5px solid ${on ? P.accent : P.border}`, background: on ? P.glow : P.card,
                  borderRadius: 12, padding: "12px 15px", fontFamily: F.body }}>
                <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>{o.label}</div>
                <div style={{ color: P.accentDim, fontSize: 12, marginTop: 2 }}>{o.hint}</div>
              </button>
            );
          })}
        </div>
      ),
      next: "סיים והכן את התיק ✦",
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <div dir="rtl" style={{ position: "fixed", inset: 0, zIndex: 4200, background: "rgba(20,22,28,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 480, width: "100%", background: P.pageBg, border: `1px solid ${P.border}`, borderRadius: 18,
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)", padding: "26px 24px 20px", position: "relative" }}>
        {/* מד-התקדמות */}
        <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? P.accent : P.border }} />
          ))}
        </div>

        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 21, fontWeight: 800, marginBottom: 12 }}>{cur.title}</div>
        <div style={{ marginBottom: 22 }}>{cur.body}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 13.5, cursor: "pointer" }}>← חזרה</button>
          )}
          <span style={{ marginInlineStart: "auto" }} />
          <button onClick={() => (last ? finish() : setStep(s => s + 1))} disabled={busy}
            style={{ background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 12, padding: "11px 22px",
              fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, cursor: busy ? "default" : "pointer" }}>
            {busy ? "מכין…" : (cur.next || "המשך →")}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: P.accentDim, fontFamily: F.body, fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>
            אמלא אחר כך
          </button>
        </div>
      </div>
    </div>
  );
}

function ta(P) {
  return { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, background: P.card,
    border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none", resize: "vertical" };
}
