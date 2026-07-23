import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { askRaziel } from "../lib/supabase.js";

const RAZIEL_WA = "972557049261";   // רזיאל — הסוכן בוואטסאפ (agent_identity: raziel · wa_slug wa-christina)

// 🤖 <AskRaziel> — שכבת-החוויה הקנונית «רזיאל מנחה» (canonical_ui_components_law + raziel_voice_law).
// מונחה-חוזה (raziel_response_contract): המוח מחליט אילו מסלולי-מחקר להציע, ה-UI *רק מרנדר* — אפס רשימה
// קשיחה. עובד היום עם מחרוזת (fallback {answer}), ומשתדרג אוטומטית כשהמוח מחזיר את החוזה המלא.
// עובדה-מנוע ≠ פרשנות · קול אחד · מסיים בשאלה מזמינה.
export default function AskRaziel({ subject, facts, context, greeting, waText, palette, cta = true }) {
  const _P = usePalette();
  const P = palette || _P;
  const [state, setState] = useState("idle");   // idle | busy | done | off
  const [res, setRes] = useState(null);          // חוזה-התגובה של רזיאל

  async function run({ path = null, again = false } = {}) {
    if (state === "busy") return;
    setState("busy");
    const r = await askRaziel({ subject, facts, context, path, again });
    if (r) { setRes(r); setState("done"); } else setState("off");
  }

  const waUrl = `https://wa.me/${RAZIEL_WA}?text=${encodeURIComponent(waText || `שלום רזיאל 🌳 חקרתי «${subject || ""}» באתר — `)}`;

  const chip = (on) => ({ cursor: "pointer", textDecoration: "none", border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : (P.cardSoft || P.card), color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontWeight: 700, fontSize: 13, padding: "8px 14px" });

  const paths = Array.isArray(res?.suggested_paths) ? res.suggested_paths : [];

  return (
    <div style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: "3px solid #25d366", borderRadius: 16, padding: "14px 16px", margin: "0 0 18px" }}>
      {/* כותרת רזיאל */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#1a9e4b)", display: "grid", placeItems: "center", fontSize: 16, flex: "none" }}>🤖</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>רזיאל · הסוכן שלך</div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>נחקור יחד — עובדה מהמנוע, לא נבואה</div>
        </div>
      </div>

      {/* הקשר-משתמש (מהמוח: «בפעם הקודמת חקרת X» / «הגעת מדף 776») */}
      {res?.context && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, marginBottom: 8, fontStyle: "italic" }}>{res.context}</div>}

      {/* פתיח */}
      {state !== "done" && greeting && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{greeting}</div>}
      {state === "done" && res?.greeting && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>{res.greeting}</div>}

      {state !== "done" ? (
        <div>
          <button onClick={() => run()} disabled={state === "busy"}
            style={{ cursor: state === "busy" ? "wait" : "pointer", border: "none", borderRadius: 999, background: "linear-gradient(135deg,#25d366,#1a9e4b)", color: "#fff", fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "10px 22px" }}>
            {state === "busy" ? "✍️ רזיאל חוקר…" : "🔮 שאל את רזיאל"}
          </button>
          {state === "off" && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, fontStyle: "italic", marginTop: 8 }}>רזיאל לא זמין כרגע — נסו שוב מאוחר יותר.</div>}
        </div>
      ) : (
        <div>
          {/* תשובה (פרשנות) */}
          {res?.answer && <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{res.answer}</p>}

          {/* עובדות-מנוע מאומתות — מוצג נפרד מהפרשנות */}
          {Array.isArray(res?.facts) && res.facts.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {res.facts.map((f, i) => (
                <span key={i} style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 8, padding: "3px 10px", fontFamily: F.mono, fontSize: 12 }}>
                  {f.label}{f.value != null ? ` = ${f.value}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* מסלולים דינמיים — רזיאל בחר; ה-UI רק מציג. לחיצה = לחקור את המסלול */}
          {paths.length > 0 && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
              {paths.map((p, i) => (
                <button key={p.id || i} onClick={() => run({ path: p.id })} title={p.hint || ""} style={chip(false)}>
                  {p.icon ? `${p.icon} ` : ""}{p.label}
                </button>
              ))}
            </div>
          )}

          {/* שאלה מזמינה (voice rule 5) */}
          {res?.follow_up_question && <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>{res.follow_up_question}</div>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {paths.length === 0 && res?.answer && (
              <button onClick={() => run({ again: true })} style={chip(false)}>🔍 רוצה שנעמיק?</button>
            )}
            {cta && res?.continue_wa !== false && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none", background: "#25d366", color: "#fff", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 13, padding: "8px 16px" }}>
                💬 המשך עם רזיאל בוואטסאפ
              </a>
            )}
          </div>

          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, marginTop: 10, fontStyle: "italic" }}>
            העובדות מאומתות במנוע · הפרשנות של רזיאל = רמז משלים, לא עובדה.
          </div>
        </div>
      )}
    </div>
  );
}
