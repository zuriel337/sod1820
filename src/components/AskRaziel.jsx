import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getAiAnalysis } from "../lib/supabase.js";
import { trackAi } from "../lib/tracking.js";

const RAZIEL_WA = "972557049261";   // רזיאל — הסוכן בוואטסאפ (agent_identity: raziel · wa_slug wa-christina)

// 🤖 <AskRaziel> — שכבת-החוויה הקנונית «רזיאל מנחה» (canonical_ui_components_law).
// מופיע בכל מקום כאותו סוכן (דף-שם · דף-מספר · דפי-הכתבים): פותח, מנתח בקולו, מזמין להעמיק,
// וממשיך בוואטסאפ (אותו זיכרון — כשהמוח-המשותף יונחת). עובדה-מהמנוע (facts) ≠ פרשנות · בלי נבואות · קול אחד.
// כרגע עוטף את getAiAnalysis (ה-AI-באתר); כשפרסונת-רזיאל+זיכרון יוזרקו ל-ai-analyze (שלב 1) — הקול משתדרג בלי שינוי-רכיב.
export default function AskRaziel({ kind = "research", subject, facts, greeting, waText, palette, cta = true }) {
  const _P = usePalette();
  const P = palette || _P;
  const [state, setState] = useState("idle");   // idle | busy | done | off
  const [text, setText] = useState(null);
  const [deepened, setDeepened] = useState(false);

  async function run(again = false) {
    if (state === "busy") return;
    setState("busy"); if (again) setDeepened(true);
    try { trackAi(kind); } catch { /* noop */ }
    const a = await getAiAnalysis({ kind, subject, facts, again });
    if (a) { setText(a); setState("done"); } else setState("off");
  }

  const waUrl = `https://wa.me/${RAZIEL_WA}?text=${encodeURIComponent(waText || `שלום רזיאל 🌳 חקרתי «${subject || ""}» באתר — `)}`;

  return (
    <div style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: "3px solid #25d366", borderRadius: 16, padding: "14px 16px", margin: "0 0 18px" }}>
      {/* כותרת רזיאל */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: greeting && state === "idle" ? 8 : 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#1a9e4b)", display: "grid", placeItems: "center", fontSize: 16, flex: "none" }}>🤖</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>רזיאל · הסוכן שלך</div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>נחקור יחד — עובדה מהמנוע, לא נבואה</div>
        </div>
      </div>

      {/* בועת-פתיח (הנחיה) */}
      {greeting && state === "idle" && (
        <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{greeting}</div>
      )}

      {state !== "done" ? (
        <div>
          <button onClick={() => run(false)} disabled={state === "busy"}
            style={{ cursor: state === "busy" ? "wait" : "pointer", border: "none", borderRadius: 999, background: "linear-gradient(135deg,#25d366,#1a9e4b)", color: "#fff", fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "10px 22px" }}>
            {state === "busy" ? "✍️ רזיאל חוקר…" : "🔮 שאל את רזיאל"}
          </button>
          {state === "off" && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, fontStyle: "italic", marginTop: 8 }}>רזיאל לא זמין כרגע — נסו שוב מאוחר יותר.</div>}
        </div>
      ) : (
        <div>
          <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{text}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {!deepened && (
              <button onClick={() => run(true)}
                style={{ cursor: "pointer", border: `1px solid ${P.border}`, background: "none", color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 13, padding: "8px 16px" }}>
                🔍 רוצה שנעמיק?
              </button>
            )}
            {cta && (
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
