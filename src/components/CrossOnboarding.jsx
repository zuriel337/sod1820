import React, { useEffect, useState } from "react";
import { F } from "../theme.js";

// 🎓 מסע הפתיחה של דף הקרוס — «מסוף הדרכה» חד-פעמי (בקשת צוריאל).
// 4 שקופיות שבהן ההצלבה *נבנית* מול העיניים בלחיצות (רעיון 3 — חוויית גילוי,
// לא קריאה): ① עובדה (13: אהבה=אחד) ② הצלבה (358: משיח=נחש ⭐) ③ התכנסות (1820 👑).
// מוצג פעם אחת פר-משתמש (localStorage — ברוח whats_new_law: פר-משתמש, לא חלון גלובלי).
// הדוגמאות אומתו במנוע הרשמי (fn_ragil): אהבה=13, אחד=13, משיח=358, נחש=358.
// הכרטיס הקבוע «מה זו הצלבה?» נשאר בדף כרענון — זה משלים, לא מחליף.

const KEY = "sod_cross_onboarding_v1";
export const shouldShowCrossOnboarding = () => {
  try { return !localStorage.getItem(KEY); } catch { return false; }
};
const markSeen = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* noop */ } };

// לוויני שקופית 4 — ישויות אמיתיות שנופלות על 1820 (המחשה מנתוני המערכת)
const SATS = [
  { t: "כי לה׳ המלוכה",      s: { top: 0, left: "50%", transform: "translateX(-50%)" } },
  { t: "בשתי שבתות",          s: { top: 34, right: -4 } },
  { t: "התגלות השם המפורש",   s: { top: 34, left: -8 } },
  { t: "כתל שריד בית מקדש",   s: { bottom: 0, right: 2 } },
  { t: "שמחת הבית השלישי",    s: { bottom: 0, left: 2 } },
];

const LAST = 5; // תת-שלבים: 0 פתיחה · 1 אהבה · 2 אחד · 3 משיח · 4 נחש⭐ · 5 התכנסות

export default function CrossOnboarding({ open, onClose, phrases = 0, methods = 0 }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open]);
  // נעילת גלילת הרקע כשהמסע פתוח
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;

  const slide = step === 0 ? 1 : step <= 2 ? 2 : step <= 4 ? 3 : 4;
  const advance = () => { if (step < LAST) setStep(s => s + 1); };
  const done = e => { e?.stopPropagation(); markSeen(); onClose?.(); };

  const gold = "#e8c84a", goldSoft = "#f0dc9a", dim = "#9b917f";
  const wordCls = on => `ob-word${on ? " ob-in" : ""}`;
  const counter = phrases > 0
    ? `${phrases} ביטויים · ${methods} שיטות בלתי-תלויות`
    : "עשרות ביטויים · שיטות בלתי-תלויות";

  return (
    <div onClick={advance} role="dialog" aria-label="מסע פתיחה — הצלבת שיטות" style={{
      position: "fixed", inset: 0, zIndex: 3000, direction: "rtl",
      background: "rgba(5,4,10,.82)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom))",
      animation: "obFade .35s ease",
    }}>
      <div style={{
        width: "min(430px, 100%)", height: "min(730px, 92dvh)", position: "relative",
        borderRadius: 26, overflow: "hidden", display: "flex", flexDirection: "column",
        background: "linear-gradient(170deg,#141021 0%,#0e0a18 60%,#0b0814 100%)",
        border: `1px solid rgba(232,200,74,.35)`,
        boxShadow: "0 30px 90px rgba(0,0,0,.75), 0 0 60px rgba(232,200,74,.10)",
      }}>
        {/* פס עליון: דילוג · נקודות התקדמות · מיתוג */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
          <button onClick={done} aria-label="דלגו" style={{ cursor: "pointer", background: "none", border: "none",
            color: "#7d7466", fontFamily: F.heading, fontSize: 13, padding: "6px 8px", minHeight: 44 }}>דלגו ✕</button>
          <div style={{ display: "flex", gap: 7, direction: "ltr" }}>
            {[1, 2, 3, 4].map(d => (
              <span key={d} style={{ height: 8, borderRadius: 99, transition: "all .3s",
                width: d === slide ? 22 : 8,
                background: d === slide ? gold : "#2c2540",
                border: "1px solid rgba(232,200,74,.25)",
                boxShadow: d === slide ? `0 0 10px rgba(232,200,74,.8)` : "none" }} />
            ))}
          </div>
          <span style={{ color: "#8a7d3f", fontSize: 11, letterSpacing: 3, fontFamily: F.heading }}>SOD1820</span>
        </div>

        {/* הבמה */}
        <div key={slide} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "0 26px", textAlign: "center", animation: "obFade .45s ease" }}>

          {slide === 1 && (<>
            <div style={{ color: "#b39a3e", fontSize: 12.5, letterSpacing: 4, fontFamily: F.heading, marginBottom: 14 }}>מסע פתיחה · 1 מתוך 4</div>
            <h2 style={{ color: goldSoft, fontFamily: F.regal, fontSize: 29, fontWeight: 800, lineHeight: 1.5, margin: 0, textShadow: "0 0 34px rgba(232,200,74,.35)" }}>🔍 הצלבת שיטות</h2>
            <p style={{ color: "#cfc6b5", fontFamily: F.body, fontSize: 17.5, lineHeight: 2.1, marginTop: 16 }}>
              מספר אחד.<br /><b style={{ color: goldSoft }}>תשע שיטות חישוב.</b><br />המטרה — לגלות היכן כולן נפגשות.
            </p>
          </>)}

          {slide === 2 && (<>
            <div style={{ color: "#b39a3e", fontSize: 12.5, letterSpacing: 4, fontFamily: F.heading, marginBottom: 12 }}>שלב ① · עובדה</div>
            <div style={{ fontFamily: F.mono, fontWeight: 800, color: "#ffe08a", fontSize: 84, lineHeight: 1, textShadow: "0 0 55px rgba(255,215,100,.5)" }}>13</div>
            <div style={{ color: "#6f6553", fontSize: 22, margin: "12px 0 6px" }}>↓</div>
            <div>
              <span className={wordCls(step >= 1)}>אהבה</span>
              <span className={wordCls(step >= 2)} style={{ padding: "10px 14px", color: "#8d8270" }}>=</span>
              <span className={wordCls(step >= 2)}>אחד</span>
            </div>
            <p style={{ color: dim, fontFamily: F.body, fontSize: 13, lineHeight: 1.9, marginTop: 20, minHeight: 50, opacity: step >= 2 ? 1 : 0, transition: "opacity .5s" }}>
              <span style={{ color: "#b6ab92" }}>⚙️ שתי תוצאות אמת — חושבו ואומתו במנוע.</span><br />
              אף אחד לא בחר אותן. זה פשוט החשבון.
            </p>
          </>)}

          {slide === 3 && (<>
            <div style={{ color: "#b39a3e", fontSize: 12.5, letterSpacing: 4, fontFamily: F.heading, marginBottom: 12 }}>שלב ② · הצלבה</div>
            <div style={{ fontFamily: F.mono, fontWeight: 800, color: "#ffe08a", fontSize: 72, lineHeight: 1, textShadow: "0 0 55px rgba(255,215,100,.5)" }}>358</div>
            <div style={{ color: "#6f6553", fontSize: 22, margin: "12px 0 6px" }}>↓</div>
            <div>
              <span className={wordCls(step >= 3)}>משיח</span>
              <span className={wordCls(step >= 4)} style={{ padding: "10px 14px", color: "#8d8270" }}>=</span>
              <span className={wordCls(step >= 4)}>נחש</span>
            </div>
            <div style={{ minHeight: 62 }}>
              <span className={`ob-star${step >= 4 ? " ob-in" : ""}`}>⭐ נוצרה הצלבה!</span>
            </div>
            <p style={{ color: dim, fontFamily: F.body, fontSize: 13, lineHeight: 1.9, opacity: step >= 4 ? 1 : 0, transition: "opacity .5s .3s" }}>
              כששני ביטויים שונים נופלים על אותו ערך —<br />
              נוצרת נקודת מפגש. <span style={{ color: "#b6ab92" }}>העובדה מתמטית; המשמעות — רמז.</span>
            </p>
          </>)}

          {slide === 4 && (<>
            <div style={{ color: "#b39a3e", fontSize: 12.5, letterSpacing: 4, fontFamily: F.heading, marginBottom: 4 }}>שלב ③ · התכנסות</div>
            <div style={{ position: "relative", width: "min(330px,100%)", height: 264, margin: "0 auto" }}>
              {SATS.map(x => (
                <span key={x.t} style={{ position: "absolute", ...x.s, padding: "4px 11px", borderRadius: 999,
                  fontSize: 11.5, whiteSpace: "nowrap", fontFamily: F.body,
                  background: "rgba(232,200,74,.06)", border: "1px solid rgba(232,200,74,.3)", color: "#cbb96a" }}>{x.t}</span>
              ))}
              <div style={{ position: "absolute", inset: "52px 0 26px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: F.mono, fontWeight: 800, color: "#ffe08a", fontSize: 58, lineHeight: 1, textShadow: "0 0 55px rgba(255,215,100,.5)" }}>1820</div>
                <div style={{ color: "#b6ab92", fontFamily: F.body, fontSize: 12.5, marginTop: 7 }}>{counter}</div>
                <div style={{ fontSize: 32, marginTop: 4, filter: "drop-shadow(0 0 18px rgba(255,215,100,.6))" }}>👑</div>
              </div>
            </div>
            <span className="ob-star ob-in" style={{ fontSize: 16, marginTop: 6 }}>✦ התכנסות-על</span>
            <button onClick={done} style={{ cursor: "pointer", marginTop: 20, padding: "13px 40px", borderRadius: 999,
              border: "none", background: "linear-gradient(135deg,#e8c84a,#c9a52e)", color: "#241a02",
              fontFamily: F.heading, fontSize: 16, fontWeight: 800, minHeight: 48,
              boxShadow: "0 6px 30px rgba(232,200,74,.4)" }}>✦ התחל לחקור</button>
          </>)}
        </div>

        {/* רמז-הקשה */}
        {slide < 4 && (
          <div style={{ position: "absolute", bottom: 22, insetInline: 0, textAlign: "center",
            color: "#6f6553", fontSize: 13, fontFamily: F.body }}>
            <b style={{ color: "#b39a3e" }}>לחצו</b> בכל מקום להמשך 👆
          </div>
        )}
      </div>

      <style>{`
        @keyframes obFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ob-word { display: inline-block; margin: 7px 5px 0; padding: 10px 24px; border-radius: 999px;
          background: rgba(232,200,74,.07); border: 1px solid rgba(232,200,74,.45);
          color: #f0dc9a; font-family: ${F.regal}; font-size: 23px; font-weight: 700;
          opacity: 0; transform: translateY(14px); transition: all .5s ease; }
        .ob-word.ob-in { opacity: 1; transform: none; box-shadow: 0 0 26px rgba(232,200,74,.35);
          background: rgba(232,200,74,.12); }
        .ob-star { margin-top: 18px; opacity: 0; transform: scale(.6);
          transition: all .55s cubic-bezier(.2,1.4,.4,1);
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 24px; border-radius: 999px;
          background: linear-gradient(135deg, rgba(232,200,74,.22), rgba(232,200,74,.08));
          border: 1.5px solid #e8c84a; color: #ffe9a8; font-family: ${F.heading};
          font-size: 18px; font-weight: 800; box-shadow: 0 0 40px rgba(232,200,74,.35); }
        .ob-star.ob-in { opacity: 1; transform: scale(1); }
        @media (prefers-reduced-motion: reduce) {
          .ob-word, .ob-star { transition: none; }
        }
      `}</style>
    </div>
  );
}
