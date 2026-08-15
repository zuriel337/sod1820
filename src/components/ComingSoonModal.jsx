import React, { useEffect } from "react";
import UpdatesBox from "./UpdatesBox.jsx";

// ✨ «מה עומד לבוא ב-SOD 1820» — מודאל שנפתח מהטיזר. כל מקטע בצבעים לפי התוכן שלו.
// הרשמה אחת כללית (source="coming-soon") דרך UpdatesBox הקיים → טבלת subscribers (בלי מנגנון חדש).
const SECTIONS = [
  {
    icon: "🌅", title: "ציר ההתגלות", tag: "הזמן מקבל צורה",
    accent: "#ffd27a", glow: "rgba(232,134,42,.45)", grad: "linear-gradient(135deg,#7a3d0e,#e8862a)",
    body: [
      "מבריאת העולם ועד שנת ו׳ אלפים — מסע על ציר זמן אחד, המחבר בין תאריכים, אירועים ונקודות מפתח.",
      "חקור תקופות, פתח אירועים, גלה מקורות וקשרים, וראה איך התמונה הגדולה נבנית לאורך הציר.",
    ],
  },
  {
    icon: "🧬", title: "מסע השורשים", tag: "הסיפור שלך התחיל הרבה לפניך",
    accent: "#86efac", glow: "rgba(13,148,136,.45)", grad: "linear-gradient(135deg,#064e3b,#0d9488)",
    body: [
      "התחל מהשם שלך ובנה את מסע השורשים שלך — הורים, סבים, שמות, תאריכים, מקומות ואירועי חיים שאתה בוחר להכניס למחקר.",
      "מה הקשר בין שמות במשפחה? אילו תאריכים חוזרים לאורך הדורות? אילו שמות, תאריכים ואירועים יכולים להפוך לכיווני מחקר?",
      "רזיאל עוזר להפוך את הסיפור שלך לשאלות מחקר — ומשם לחבר אותו למנועי השמות, המספרים, ההצלבות והצופן.",
      "המשפחה היא נקודת המוצא. המחקר מגלה לאן אפשר להמשיך.",
    ],
  },
  {
    icon: "🔠", title: "הצופן", tag: "מה מסתתר בין האותיות?",
    accent: "#c4b5fd", glow: "rgba(124,58,237,.45)", grad: "linear-gradient(135deg,#4c1d95,#7c3aed)",
    body: [
      "הצופן הוא לא רק חיפוש של מילה — הוא מרחב מחקר.",
      "שמות, תאריכים, מונחים ואירועים יכולים להפוך לנקודות מוצא לחיפוש בדילוגי אותיות ולהצלבות עם ממצאים נוספים.",
      "המערכת מתעדת מה חיפשת, באיזה נוסח ובאיזה מרחב חיפוש, ומפרידה בין ממצא, ראיה, מועמד והשערה.",
      "רזיאל עוזר לנתח את הממצאים, להציע כיווני המשך ולאתגר את המסקנות.",
      "מה שהתחיל בסיפור אישי יכול להפוך לשאלת מחקר.",
    ],
  },
  {
    icon: "🌍", title: "SOD 1820 באנגלית", tag: "העולם של SOD 1820 — עכשיו גם באנגלית",
    accent: "#93c5fd", glow: "rgba(37,99,235,.45)", grad: "linear-gradient(135deg,#1e40af,#3b82f6)",
    body: [
      "לא רק ממשק מתורגם.",
      "אנגלית תהיה גם שפת קלט למחקר: השם או המילה המקוריים נשמרים כפי שנמסרו, ומתוכם ניתן ליצור מועמדים וצורות מחקר שונות — תוך שמירה מלאה על המקור וה-provenance.",
      "המקור נשאר. המחקר מתרחב.",
    ],
  },
];

export default function ComingSoonModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div dir="rtl" role="dialog" aria-modal="true" aria-label="מה עומד לבוא ב-SOD 1820"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 6000, display: "flex", alignItems: "flex-start", justifyContent: "center",
        background: "rgba(6,4,16,.82)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        padding: "max(18px, env(safe-area-inset-top)) 14px 40px", overflowY: "auto",
      }}>
      <style>{`@keyframes csm-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes csm-sheen{0%{transform:translateX(120%)}100%{transform:translateX(-220%)}}`}</style>

      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 680, margin: "auto 0", animation: "csm-in .32s cubic-bezier(.2,.8,.2,1)",
          background: "linear-gradient(180deg,#140f24,#0b0714)", border: "1px solid rgba(232,200,74,.22)",
          borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,.6)", overflow: "hidden", position: "relative",
        }}>
        {/* כותרת */}
        <div style={{ position: "relative", padding: "22px 22px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
          <span aria-hidden style={{ position: "absolute", top: 0, bottom: 0, width: "30%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)", animation: "csm-sheen 6s ease-in-out infinite" }} />
          <div style={{ fontSize: 12, letterSpacing: 3, color: "#e8c84a", fontWeight: 800, fontFamily: "sans-serif" }}>בקרוב · SOD 1820</div>
          <h2 style={{ margin: "6px 0 4px", color: "#fff", fontSize: "clamp(20px,4.5vw,27px)", fontWeight: 900, fontFamily: "'Frank Ruhl Libre',serif" }}>מה עומד לבוא</h2>
          <div style={{ color: "#b9adcf", fontSize: 13.5 }}>שלושה עולמות חדשים — והצצה למה שנפתח</div>
          <button onClick={onClose} aria-label="סגירה"
            style={{ position: "absolute", insetInlineEnd: 12, top: 12, width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>×</button>
        </div>

        {/* מקטעים בצבעים לפי תוכן */}
        <div style={{ padding: "16px 16px 6px", display: "flex", flexDirection: "column", gap: 14 }}>
          {SECTIONS.map((s) => (
            <section key={s.title}
              style={{
                position: "relative", borderRadius: 16, padding: "16px 16px 16px 18px",
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                borderInlineStart: `4px solid ${s.accent}`, boxShadow: `0 0 30px ${s.glow} inset`,
                overflow: "hidden",
              }}>
              <div aria-hidden style={{ position: "absolute", insetInlineEnd: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: s.grad, opacity: .16, filter: "blur(6px)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                <span style={{ fontSize: 26, filter: `drop-shadow(0 0 10px ${s.glow})` }}>{s.icon}</span>
                <div>
                  <div style={{ color: s.accent, fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: 19, lineHeight: 1.15 }}>{s.title}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, opacity: .92 }}>{s.tag}</div>
                </div>
              </div>
              {s.body.map((p, i) => (
                <p key={i} style={{ margin: "6px 0 0", color: "#d6cde6", fontSize: 14, lineHeight: 1.75 }}>{p}</p>
              ))}
            </section>
          ))}
        </div>

        {/* הרשמה אחת כללית — דרך UpdatesBox הקיים (subscribers · source=coming-soon) */}
        <div style={{ padding: "8px 16px 22px" }}>
          <UpdatesBox
            source="coming-soon"
            title="רוצה להיות בין הראשונים?"
            body="רוצה לקבל עדכון כשדברים חדשים נפתחים ב־SOD 1820? השאירו מייל ונעדכן אתכם כשכל חוויה חדשה תיפתח — הרשמה אחת לכל השלושה."
            cta="עדכנו אותי"
          />
        </div>
      </div>
    </div>
  );
}
