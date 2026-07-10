import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";

// 📜 מדיניות פרטיות — דף אמיתי (SEO). נדרש ל-Facebook/Google Login ולאימות-העסק במטא.
// כולל מקטע «מחיקת נתונים» (#data-deletion) שאליו מפנים את «Data Deletion Instructions URL» בפייסבוק.
const UPDATED = "10 ביולי 2026";

export default function PrivacyPage() {
  const P = usePalette();
  useEffect(() => {
    applySeo({
      title: "מדיניות פרטיות",
      description: "מדיניות הפרטיות של אתר סוד 1820 — איזה מידע נאסף, כיצד נעשה בו שימוש, וכיצד למחוק אותו.",
      path: "/privacy",
    });
    if (typeof window !== "undefined" && window.location.hash) {
      setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, []);

  const h2 = { color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800, margin: "28px 0 10px" };
  const p = { color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 12px" };
  const li = { color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.85, marginBottom: 6 };
  const strong = { color: P.accentText, fontWeight: 700 };

  return (
    <div style={{ background: P.pageBg, minHeight: "100vh" }}>
      <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "48px 22px 100px" }}>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,38px)", fontWeight: 800, margin: 0 }}>
          מדיניות פרטיות
        </h1>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginTop: 8 }}>
          עודכן לאחרונה: {UPDATED} · אתר <b style={strong}>סוד 1820</b> (sod1820.co.il)
        </div>

        <p style={{ ...p, marginTop: 22 }}>
          אנו מכבדים את פרטיותכם. מסמך זה מסביר איזה מידע נאסף באתר, כיצד נעשה בו שימוש,
          עם מי הוא משותף, וכיצד תוכלו לעיין בו או למחוק אותו. השימוש באתר מהווה הסכמה למדיניות זו.
        </p>

        <h2 style={h2}>1. איזה מידע נאסף</h2>
        <ul>
          <li style={li}><b style={strong}>בהרשמה / התחברות:</b> כתובת דוא״ל, שם תצוגה, ותמונת פרופיל — אם בחרתם להתחבר דרך Google או Facebook, פרטים אלה מגיעים מאותו חשבון (שם, מייל, תמונה בלבד).</li>
          <li style={li}><b style={strong}>תוכן שאתם יוצרים:</b> חיפושי גימטריה, פריטי מחקר, מועדפים ורמזים ששמרתם או שלחתם.</li>
          <li style={li}><b style={strong}>נתוני שימוש אנונימיים:</b> דפים שנצפו, מכשיר/דפדפן ומקור-הגעה — לצורכי שיפור האתר ומדידה. נאסף עם מזהה אנונימי, ללא זיהוי אישי.</li>
          <li style={li}><b style={strong}>עוגיות (Cookies):</b> לשמירת התחברות והעדפות, ולמדידה.</li>
        </ul>

        <h2 style={h2}>2. כיצד נעשה שימוש במידע</h2>
        <ul>
          <li style={li}>לספק את שירותי האתר — התחברות, אזור אישי, שמירת מחקר והעדפות.</li>
          <li style={li}>לשלוח עדכונים וניוזלטר — רק אם נרשמתם, וניתן להסיר בכל עת.</li>
          <li style={li}>לשפר את התוכן והחוויה, ולמדוד ביצועים בצורה מצטברת.</li>
        </ul>
        <p style={p}>איננו מוכרים מידע אישי לצדדים שלישיים.</p>

        <h2 style={h2}>3. שירותי צד-שלישי</h2>
        <p style={p}>לצורך התפעול אנו נעזרים בספקים המעבדים חלק מהנתונים בשמנו:</p>
        <ul>
          <li style={li}><b style={strong}>Supabase</b> — אחסון החשבונות והנתונים (בסיס הנתונים והאימות).</li>
          <li style={li}><b style={strong}>Google</b> — התחברות (OAuth) ומדידת תנועה (Google Analytics).</li>
          <li style={li}><b style={strong}>Meta (Facebook)</b> — התחברות (OAuth) ומדידה (Pixel / Conversions API).</li>
          <li style={li}><b style={strong}>Resend</b> — משלוח דוא״ל וניוזלטר.</li>
          <li style={li}><b style={strong}>Vercel</b> — אירוח האתר.</li>
        </ul>

        <h2 style={h2}>4. זכויותיכם</h2>
        <ul>
          <li style={li}>לעיין במידע השמור עליכם ולתקן אותו (דרך האזור האישי).</li>
          <li style={li}>לבטל הרשמה לניוזלטר בכל עת (קישור בתחתית כל דיוור).</li>
          <li style={li}>לבקש מחיקה מלאה של החשבון והנתונים — ראו סעיף 5.</li>
        </ul>

        <h2 style={h2} id="data-deletion">5. מחיקת נתונים</h2>
        <p style={p}>
          תוכלו לבקש בכל עת את מחיקת החשבון וכל המידע האישי שנשמר עליכם, כולל נתונים שהגיעו מהתחברות
          Google או Facebook. לביצוע הבקשה:
        </p>
        <ul>
          <li style={li}>שלחו דוא״ל אל <b style={strong} dir="ltr">yosiviner7@gmail.com</b> מהכתובת הרשומה בחשבונכם, עם הנושא «מחיקת נתונים».</li>
          <li style={li}>נאמת את הבקשה ונמחק את החשבון וכל הנתונים המשויכים אליו תוך <b style={strong}>30 יום</b>, ונשלח אישור.</li>
        </ul>
        <p style={p}>מחיקה היא סופית ואינה ניתנת לשחזור.</p>

        <h2 style={h2}>6. אבטחה</h2>
        <p style={p}>
          הגישה למידע מוגנת (הרשאות ברמת-שורה, הצפנת תעבורה). עם זאת, אף מערכת אינה חסינה לחלוטין,
          ואיננו יכולים להבטיח אבטחה מוחלטת.
        </p>

        <h2 style={h2}>7. יצירת קשר</h2>
        <p style={p}>
          לשאלות בנושא פרטיות: <b style={strong} dir="ltr">yosiviner7@gmail.com</b>.
        </p>

        <div style={{ textAlign: "center", marginTop: 34 }}>
          <Link to="/" style={{ color: P.accentDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
        </div>
      </div>
    </div>
  );
}
