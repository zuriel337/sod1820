import React, { useEffect, useMemo, useState } from "react";
import { track } from "../lib/tracking.js";

// ===== 🎓 משפך «שיעור 1» נודד — ניסוי המרה רב-זרועי =====
// מוצג בתחתית כל דף פוסט (כולל פוסטי WordPress ישנים — ה-CSS חי ברכיב, לא בתוכן).
// כל גולש מוגרל פעם אחת לווריאנט (דביק ב-localStorage) → מדידת המרה נקייה בין המשפכים.
// חשיפה נרשמת ל-visitor_events (section='funnel'), הרשמה ל-subscribers עם source פר-וריאנט
// (סיומת -rnd מבדילה מהמשפכים המוטמעים בפוסטים עצמם).
// כל הערכים אומתו במנוע הרשמי (fn_ragil/fn_misratar) לפני שנכנסו לכאן — gematria_engine_law.
// אין משפך כפול: פוסט שכבר מכיל משפך מוטמע בתוכן (sgl-form) מדלג על הרכיב.

const ENDPOINT = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/newsletter-signup";
const VKEY = "sod_lesson_funnel_variant";

// וריאנט = 4 מסכי תוכן (המסך החמישי — טופס — משותף).
// מסך: { pre?, h?, big?, pills?, note?, q?, cta?, twoBtns? }
const VARIANTS = {
  guetta: {
    screens: [
      { h: "מצאנו משהו מוזר…", pre: "שני ביטויים שונים לגמרי\nהגיעו בדיוק לאותו מספר.", cta: "תראו לי ←" },
      { big: "358", pills: ["משיח = 358", "נחש = 358"], q: "צירוף מקרים?", twoBtns: true },
      { pre: "עכשיו תראו עוד אחד…", big: "13", pills: ["אהבה = 13", "אחד = 13"] },
      { pre: "ורגע — אמרתם «צירוף מקרים»? בדקנו במנוע גם את זה:", big: "776", pills: ["צירוף מקרים = 776", "שלמות = 776", "ביאת המשיח = 776"], q: "«צירוף מקרים» = «שלמות» = «ביאת המשיח» — אותו מספר בדיוק. רוצים להבין את הקשר?" },
    ],
    s5p: "משיח=נחש, אהבה=אחד, וצירוף מקרים=ביאת המשיח.",
  },
  trump: {
    screens: [
      { h: "שני האנשים החזקים בעולם…", pre: "נשיא ארה״ב ונשיא רוסיה.\nהכנסנו את השמות למנוע החישוב — ומה שיצא עצר אותנו.", cta: "תראו לי ←" },
      { big: "424", pills: ["דונלד טראמפ = 424", "משיח בן דוד = 424"], q: "צירוף מקרים?", twoBtns: true },
      { pre: "ומהצד השני של המפה…", big: "424", pills: ["ולדימיר פוטין (מסתתר) = 424"], note: "מסתתר — שיטה קבועה: ההפרשים בין אות לאות, מילה-מילה. אפס בחירה, אפס כיוונון." },
      { pre: "ומה אומר על זה ספר תהלים?", big: "424", pills: ["אמרו בגוים יהוה מלך = 424"], q: "«אִמְרוּ בַגּוֹיִם ה׳ מָלָךְ» (תהלים צו, י) — בדיוק אותו מספר. רוצים להבין מה מסתתר כאן?" },
    ],
    s5p: "טראמפ, פוטין, והפסוק — כולם 424.",
  },
  squid: {
    screens: [
      { h: "למה דווקא 456?", pre: "מספר השחקן במשחקי הדיונון לא נבחר סתם.\nפתחנו את מנוע החישוב.", cta: "תראו לי ←" },
      { big: "456", pills: ["פרצוף = 456"], q: "המשחק שמוחק פנים — והמספר אומר «פרצוף». צירוף מקרים?", twoBtns: true },
      { pre: "עכשיו תראו מה עוד שווה 456…", big: "456", pills: ["כותל = 456", "בית לדוד = 456"] },
      { pre: "ועוד אחד, מהיסודות:", big: "456", pills: ["אברהם יצחק = 456"], q: "האבות, הכותל, בית דוד — והפרצוף שנמחק. אותו מספר בדיוק. רוצים להבין את הקשר?" },
    ],
    s5p: "פרצוף, כותל, בית לדוד, אברהם יצחק — כולם 456.",
  },
  matrix: {
    screens: [
      { h: "הסרט הזה ידע משהו…", pre: "«המטריקס» — הכנסנו את השם עצמו למנוע החישוב.\nמה שיצא הוא לא תסריט.", cta: "תראו לי ←" },
      { big: "424", pills: ["המטריקס = 424", "משיח בן דוד = 424"], q: "הסרט — בשמו — הוא משיח בן דוד. צירוף מקרים?", twoBtns: true },
      { pre: "והגיבור שבוקע את האשליה?", big: "67", pills: ["ניאו = 67", "בינה = 67"], note: "ניאו = בינה — ההבנה שרואה דרך המסך." },
      { pre: "ומי עוד שווה בדיוק 424?", big: "424", pills: ["דונלד טראמפ = 424"], q: "נשיא ארה״ב, הסרט, ומשיח בן דוד — אותו מספר. רוצים להבין מה זה אומר?" },
    ],
    s5p: "המטריקס, משיח בן דוד, וטראמפ — כולם 424.",
  },
};

const KEYS = Object.keys(VARIANTS);

function pickVariant() {
  try {
    let v = localStorage.getItem(VKEY);
    if (!v || !VARIANTS[v]) {
      v = KEYS[Math.floor(Math.random() * KEYS.length)];
      localStorage.setItem(VKEY, v);
    }
    return v;
  } catch {
    return KEYS[Math.floor(Math.random() * KEYS.length)];
  }
}

const CSS = `
.lfx { background: linear-gradient(170deg, #16112a, #0e0a1a); border: 1.5px solid rgba(232,200,74,.5); border-radius: 18px; padding: 30px 16px; margin: 34px 0 8px; text-align: center; direction: rtl; overflow: hidden; box-shadow: 0 8px 40px rgba(232,200,74,.12); }
.lfx-scr { animation: lfxIn .55s ease; }
@keyframes lfxIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.lfx-chip { display: inline-block; background: rgba(232,200,74,.14); border: 1px solid rgba(232,200,74,.5); color: #e8c84a; border-radius: 999px; padding: 4px 16px; font-size: 12.5px; font-weight: 800; letter-spacing: 1px; margin-bottom: 14px; }
.lfx-h { color: #f0dc9a; font-size: clamp(21px, 5.5vw, 27px); font-weight: 800; margin: 4px 0 10px; }
.lfx-p { color: #ffffff; font-size: 15.5px; line-height: 2; margin: 0 0 16px; white-space: pre-line; }
.lfx-big { font-family: monospace; font-weight: 800; color: #ffe08a; font-size: clamp(46px, 12vw, 64px); line-height: 1.1; text-shadow: 0 0 40px rgba(255,216,107,.5); }
.lfx-eq { display: inline-block; margin: 8px 6px 0; padding: 9px 20px; border-radius: 999px; background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; font-size: 19px; font-weight: 700; }
.lfx-btn { display: inline-block; cursor: pointer; margin: 8px 5px 0; border: none; background: linear-gradient(135deg, #e8c84a, #c9a52e); color: #241a02; border-radius: 999px; padding: 12px 34px; font-size: 15.5px; font-weight: 800; min-height: 44px; box-sizing: border-box; font-family: inherit; }
.lfx-btn.ghost { background: none; border: 1.5px solid rgba(232,200,74,.55); color: #f0dc9a; }
.lfx-note { color: #9b917f; font-size: 12px; margin-top: 12px; line-height: 1.8; }
.lfx-sub { color: #c9bfa7; font-size: 13px; line-height: 1.9; margin-top: 12px; }
.lfx-q { color: #f0dc9a; font-weight: 800; font-size: 15.5px; line-height: 2; margin-top: 14px; }
.lfx-form { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; margin-top: 14px; }
.lfx-form input[type="email"] { flex: 1 1 220px; max-width: 300px; background: rgba(255,255,255,.06); border: 1px solid rgba(232,200,74,.45); border-radius: 999px; color: #f5ecd2; padding: 12px 18px; font-size: 16px; outline: none; text-align: center; }
.lfx-form button { cursor: pointer; border: none; background: linear-gradient(135deg, #e8c84a, #c9a52e); color: #241a02; border-radius: 999px; padding: 12px 26px; font-size: 15.5px; font-weight: 800; min-height: 48px; box-shadow: 0 6px 24px rgba(232,200,74,.35); font-family: inherit; }
@media (prefers-reduced-motion: reduce) { .lfx-scr { animation: none; } }
`;

export default function LessonFunnel({ slug, content }) {
  const variant = useMemo(pickVariant, []);
  const [step, setStep] = useState(0);

  // פוסט שכבר מכיל משפך מוטמע בתוכן — בלי כפילות
  const embedded = typeof content === "string" && content.includes("sgl-form");

  useEffect(() => {
    if (!embedded && slug) track("funnel", variant, "view", { slug });
  }, [embedded, slug, variant]);

  if (embedded) return null;
  const V = VARIANTS[variant];
  const s = V.screens[step];
  const next = () => setStep(n => Math.min(n + 1, 4));

  return (
    <div className="lfx">
      <style>{CSS}</style>
      {step < 4 ? (
        <div className="lfx-scr" key={step}>
          <div className="lfx-chip">🎓 שיעור 1 · {step === 0 ? "לומדים גימטריה — בחינם" : `${step + 1}/5`}</div>
          {s.h && <div className="lfx-h">{s.h}</div>}
          {s.pre && <p className="lfx-p">{s.pre}</p>}
          {s.big && <div className="lfx-big">{s.big}</div>}
          {s.pills && <div>{s.pills.map(p => <span key={p} className="lfx-eq">{p}</span>)}</div>}
          {s.note && <div className="lfx-sub">{s.note}</div>}
          {s.q && <div className="lfx-q">{s.q}</div>}
          <div style={{ marginTop: 16 }}>
            {s.twoBtns ? (
              <>
                <button type="button" className="lfx-btn" onClick={next}>לא</button>
                <button type="button" className="lfx-btn ghost" onClick={next}>אולי</button>
              </>
            ) : (
              <button type="button" className="lfx-btn" onClick={next}>
                {s.cta || (step === 3 ? "לא נראה לי… ←" : "ממשיכים ←")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="lfx-scr" key="s5">
          <div className="lfx-chip">🎓 שיעור 1 · 5/5</div>
          <p className="lfx-p">וכשזה קורה שוב ושוב סביב אותו מספר…</p>
          <div className="lfx-h">אנחנו קוראים לזה התכנסות ✦</div>
          <p className="lfx-p">
            {V.s5p}{"\n"}
            <b style={{ color: "#f0dc9a" }}>רוצים ללמוד לגלות דברים כאלה בעצמכם?</b>{"\n"}
            שיעור 2 — איך מחשבים ואיך מוצאים הצלבות — יישלח למייל, בחינם.
          </p>
          <form className="lfx-form" action={ENDPOINT} method="POST"
            onSubmit={() => { try { track("funnel", variant, "submit", { slug }); } catch { /* noop */ } }}>
            <input type="email" name="email" required placeholder="המייל שלכם" />
            <input type="hidden" name="source" value={`gematria-lesson-1-${variant}-rnd`} />
            <input type="hidden" name="back" value={`/${slug || ""}`} />
            <button type="submit">שלחו לי את שיעור 2 🎓</button>
          </form>
          <div className="lfx-note">⚙️ כל הערכים בשיעור אומתו במנוע · בלי ספאם — רק שיעורים.</div>
        </div>
      )}
    </div>
  );
}
