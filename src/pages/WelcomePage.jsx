import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { METHODS, onlyHeb } from "../lib/gematria.js";

// 🚪 /welcome — שער-הכניסה המודרך למרכז המחקר. יעד הכפתור «היכנסו למרכז המחקר» במייל-הפתיחה.
// מודרך + אינטראקטיבי (סיור 3 צעדים, מחשבון-חי דרך המנוע הרשמי) — לפי research_workspace_law:
// «פשוט ב-5 הדקות הראשונות», Progressive Disclosure, הסבר אינטראקטיבי. לא משכפל את /start (מדריך כללי).
const RAGIL = METHODS.find(m => m.key === "רגיל");
const gval = (w) => { try { return RAGIL ? RAGIL.fn(w) : 0; } catch { return 0; } };

const PILLARS = [
  ["🌍", "המציאות", "חדשות שמתחברות לפסוקים"],
  ["🎬", "התרבות", "מטריקס, סרטים, סדרות"],
  ["🔠", "התנ״ך", "דילוגי אותיות וצפנים"],
  ["🌐", "השפות", "עברית, אנגלית ומעבר"],
  ["👥", "הקהילה", "חוקרים שמגלים יחד"],
];

export default function WelcomePage() {
  const P = usePalette();
  const [name, setName] = useState("");
  const val = useMemo(() => gval(name), [name]);
  const hasHeb = useMemo(() => onlyHeb(name).length > 0, [name]);

  useEffect(() => {
    track("welcome");
    applySeo({ title: "ברוכים הבאים למרכז המחקר · סוד 1820", description: "שער הכניסה למרכז המחקר של סוד 1820 — סיור מודרך: גלו את המספר שלכם, פתחו דף מספר, ונסו את הצופן התנ״כי. פשוט להתחיל, עמוק בלי גבול.", path: "/welcome" });
  }, []);

  const card = { background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 18, padding: "20px 20px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" };
  const eyebrow = { color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, marginBottom: 8 };
  const stepNum = (n) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: P.accentBtn, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 14, flex: "0 0 auto" });
  const primary = { display: "inline-block", background: P.accentBtn, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontSize: 15, fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "12px 26px", cursor: "pointer", border: "none" };
  const ghost = { display: "inline-block", background: "transparent", color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700, textDecoration: "none", borderRadius: 999, padding: "11px 22px", border: `1px solid ${P.border}` };

  return (
    <div dir="rtl" style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 100px", position: "relative", zIndex: 1 }}>
      {/* HERO */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 6 }}>🔑</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(25px,5.5vw,38px)", fontWeight: 800, margin: "0 0 10px" }}>ברוכים הבאים למרכז המחקר</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16, lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
          מקום שבו מספרים, פסוקים, שמות ואירועי המציאות נחקרים יחד. הנה איך מתחילים — ב-3 צעדים.
        </p>
      </div>

      {/* PILLARS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 26 }}>
        {PILLARS.map(([em, t]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 13px", color: P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{em} {t}</span>
        ))}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {/* STEP 1 — inline calculator */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={stepNum(1)}>1</span>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>גלו את המספר שלכם</div>
          </div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 12px" }}>הקלידו שם, מילה או תאריך — והמנוע יחשב את הערך בגימטריה, בזמן אמת.</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="למשל: השם שלך…" autoComplete="off"
            style={{ width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "13px 15px", color: P.ink, fontFamily: F.body, fontSize: 17, outline: "none" }} />
          {hasHeb && (
            <div style={{ marginTop: 14, textAlign: "center", background: P.glow || "rgba(212,175,55,0.10)", border: `1px solid ${P.border}`, borderRadius: 14, padding: "16px 14px" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>הערך הרגיל</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{val}</div>
              <Link to={`/number/${val}?src=welcome`} style={{ ...primary, marginTop: 13, fontSize: 14.5 }}>פתחו את דף המספר {val} ←</Link>
              <div style={{ marginTop: 9 }}>
                <Link to="/community/calculator?src=welcome" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>לראות בכל 13 השיטות → למחשבון המלא</Link>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2 — number page */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={stepNum(2)}>2</span>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>כל מספר הוא עולם</div>
          </div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 13px" }}>
            בכל דף-מספר תמצאו את כל הביטויים שנופלים על אותו ערך, ההצלבות בין השיטות, ו<b style={{ color: P.accentText }}>ניתוח AI</b> בלחיצה — על בסיס עובדות-המנוע בלבד.
          </p>
          <Link to="/number/1820?src=welcome" style={ghost}>ראו דוגמה — דף המספר 1820 ←</Link>
        </div>

        {/* STEP 3 — ELS */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={stepNum(3)}>3</span>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>נסו למצוא צופן בעצמכם</div>
          </div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 13px" }}>
            הצופן התנ״כי (דילוגי אותיות · ELS) מחפש מילים וצירופים נסתרים בתורה ובתנ״ך. חפשו מילה — וראו מה עולה.
          </p>
          <Link to="/code?src=welcome" style={ghost}>כניסה לצופן התנ״כי ←</Link>
        </div>
      </div>

      {/* איך חוקרים נכון */}
      <div style={{ ...card, marginTop: 16, background: "transparent", borderStyle: "dashed" }}>
        <div style={eyebrow}>🧭 איך חוקרים נכון</div>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, margin: 0 }}>
          תמיד מפרידים <b style={{ color: P.accentText }}>עובדה</b> (הערך המחושב) מ<b style={{ color: P.accentText }}>פרשנות</b> (הרמז המשלים), ומחזקים ממצא דרך <b style={{ color: P.accentText }}>הצלבה</b> בין כמה שיטות. האתר לא מבקש שתאמינו — הוא מזמין אתכם לבדוק ולהצליב בעצמכם.
        </p>
      </div>

      {/* Progressive peek */}
      <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.9, margin: "18px 0 6px" }}>
        ויש עוד הרבה: <Link to="/forum" style={{ color: P.accentText, textDecoration: "none", fontWeight: 700 }}>פורום המחקר</Link> · <Link to="/archive?tab=reality" style={{ color: P.accentText, textDecoration: "none", fontWeight: 700 }}>זרם המציאות</Link> · <Link to="/research" style={{ color: P.accentText, textDecoration: "none", fontWeight: 700 }}>המחקר האישי שלכם</Link>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", marginTop: 20, display: "grid", gap: 11, justifyItems: "center" }}>
        <Link to="/join?src=welcome" style={{ ...primary, fontSize: 15.5, padding: "14px 32px" }}>🎁 הצטרפו · קבלו קרדיטים למחקר ←</Link>
        <Link to="/?src=welcome" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>או המשיכו לדף הבית ←</Link>
      </div>
    </div>
  );
}
