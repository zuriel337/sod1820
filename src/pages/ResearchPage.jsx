import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import ResearchShell from "../components/ResearchShell.jsx";
import ResearchHome, { TOOLS } from "../components/ResearchHome.jsx";
import { isToolReady } from "../lib/hub/ready.js";
import { useAuth } from "../lib/AuthContext.jsx";
import VerseSearch from "../components/VerseSearch.jsx";
import NameStory from "../components/NameStory.jsx";
import FamilyCross from "../components/FamilyCross.jsx";
import ElsGrid from "../components/ElsGrid.jsx";
import LifeProfile from "../components/LifeProfile.jsx";
import FileAnalyzer from "../components/FileAnalyzer.jsx";
import SearchJourney from "../components/SearchJourney.jsx";
import CompareTwo from "../components/CompareTwo.jsx";
import NumberTool from "../components/NumberTool.jsx";
import NotarikonTool from "../components/NotarikonTool.jsx";
import ToolGuide from "../components/research/ToolGuide.jsx";

// ❓ הדרכות «איך משתמשים» לכלי-המעבדה — מוצגות מעל הכלי הפעיל. כלי שיש לו הסבר משלו
// (נוטריקון · דילוגים · בית-המדרש) לא נכלל כאן כדי לא לכפול. כל ערך = title/intro/steps/tip.
const GUIDES = {
  verse: {
    title: "איך משתמשים בחיפוש בפסוקים",
    intro: "מאתרים ביטוי או ערך-גימטרי בתוך פסוקי התנ״ך — לפי טקסט או לפי מספר.",
    steps: [
      "בחרו היקף למעלה: כל התנ״ך או רק התורה — ואפשר לסנן לפי ספר.",
      "חיפוש לפי טקסט: הקלידו מילה/רצף — ותראו את כל הפסוקים שמכילים אותו, עם הדגשה.",
      "חיפוש לפי ערך: עברו ל«גימטריה», הזינו מספר (או טווח מ–עד) — ותראו פסוקים שערכם שווה לו.",
      "כל פסוק מציג את ערכו, קישור לדף-המספר, ו-➕ הוסף-למחקר / 🔗 שתף.",
    ],
    tip: "טווח-ערכים שימושי כשמחפשים קרבה למספר-מפתח (למשל 1815–1825 סביב 1820).",
  },
  compare: {
    title: "איך משתמשים בהשוואת שניים",
    intro: "מציבים שני ביטויים זה מול זה ומגלים היכן הם נפגשים בערך.",
    steps: [
      "הקלידו ביטוי בכל אחד משני השדות (למשל «נחש» מול «משיח»).",
      "המנוע מחשב את שניהם בכל השיטות ומסמן ערכים זהים.",
      "אותה שיטה בשניהם = הצלבה חזקה · שיטות שונות = הצלבה עקיפה.",
      "לחיצה על ערך משותף → דף-המספר עם כל ההצלבות.",
    ],
    tip: "«נחש» = «משיח» = 358 — הצלבה קלאסית באותה שיטה.",
  },
  name: {
    title: "איך משתמשים במנוע השמות",
    intro: "גוזרים מתוך שם את הערך, מבנה-האותיות, הפסוק וההתכנסויות שלו.",
    steps: [
      "הקלידו שם פרטי (או שם מלא, או «פלוני בן/בת פלונית»).",
      "המנוע מציג את הגימטריה ב-17 השיטות + פירוט אות-אות.",
      "מתחת — פסוק מתאים, ביטויים שווי-ערך והתכנסויות.",
      "כל ערך לחיץ → דף-המספר; אפשר לשמור ולשתף את הכרטיס.",
    ],
    tip: "נסו את שמכם, ואז את שם בן-הזוג — והשוו ב«הקשרים במשפחה».",
  },
  family: {
    title: "איך משתמשים ב«הקשרים במשפחה»",
    intro: "מגלים התכנסויות נסתרות בין שמות בני המשפחה — עובדה מחושבת, לא ניחוש.",
    steps: [
      "הוסיפו שמות של בני המשפחה, אחד-אחד.",
      "המנוע מחשב גימטריה לכל שם ומחפש ערכים משותפים וקשרים.",
      "כל קשר מוצג כעובדה מחושבת + קישור לדף-המספר.",
      "הרשימה נשמרת אצלכם בלבד (פרטי, מקומי).",
    ],
    tip: "אפשר להוסיף גם שמות-אם (למשל «דוד בן בת-שבע») להעמקת ההצלבות.",
  },
  life: {
    title: "איך משתמשים בניתוח חיים",
    intro: "מפת-שדה אישית: קלט אחד עובר בכל המנועים ומחזיר פלט אחיד להשוואה.",
    steps: [
      "הזינו את הנתונים (שם, ועוד פרטים לפי השדות).",
      "כל מנוע מחזיר את חלקו — גימטריה, מספרים קשורים, צירים.",
      "התוצאות מוצגות יחד כמפה אחת להשוואה.",
      "הנתונים נשמרים אצלכם בלבד.",
    ],
    tip: "זהו כלי-עומק — התחילו במנוע השמות אם רוצים משהו מהיר.",
  },
  journey: {
    title: "איך משתמשים במסע חיפוש",
    intro: "קלט אחד → כל המנועים רצים יחד → דוח-מחקר אחד מאוחד.",
    steps: [
      "הקלידו מילה · שם · או מספר אחד.",
      "המנוע מריץ במקביל: גימטריה · דילוגי-אותיות · פסוקים · מספרים קשורים.",
      "מקבלים דוח אחד, עם הפרדה ברורה בין עובדה מחושבת לפרשנות.",
      "מכל מקטע אפשר לקפוץ לכלי המתאים כדי להמשיך לעומק.",
    ],
    tip: "זו נקודת-הפתיחה הטובה ביותר כשלא יודעים מאיפה להתחיל.",
  },
  import: {
    title: "איך משתמשים בניתוח קובץ",
    intro: "מעלים קובץ עם רשימת שמות/ביטויים — והמנוע מחשב גימטריה לכולם ומאתר התכנסויות.",
    steps: [
      "הכינו אקסל/CSV עם עמודה של שמות או ביטויים.",
      "העלו את הקובץ — המנוע מחשב את כל השיטות לכל שורה.",
      "מזוהות התכנסויות (ערכים שחוזרים) ואימות מול ערך-נתון.",
      "אפשר לצרף המוני למחקר ולייצא CSV עם התוצאות.",
    ],
    tip: "שמרו את הקובץ בקידוד UTF-8 כדי שהעברית תיקרא נכון.",
  },
};

// בית-המדרש האמיתי נטען בעצלתיים — נפתח בתוך השלד (לא קישור חוצה). הדף עצמאי
// (לא תלוי ב-Layout) ובהיר זהב-על-קרם → נכנס חלק בלי שכפול ובלי לשבור את /beit-midrash.
// 🧮 מחשבון הגימטריה חי במקום אחד בלבד — בטאב-המחשבון של בית-המדרש (עץ אחד: בית קנוני יחיד).
// כל כניסת «gematria» בהיכל מנותבת לכאן (ראו ה-redirect למטה) → אין שני מחשבונים.
const BeitMidrashPage = lazy(() => import("./BeitMidrashPage.jsx"));

// 🔬 /research — סביבת המחקר (שלב 1). מסך פתיחה = בית-הכלים; בחירת כלי פותחת
// אותו בתוך השלד. «הוסף למחקר» פולט Event → «המחקר הפעיל» מתעדכן חי (Research Bus).
// כל הדפים הקיימים נשארים כשהיו — זה מסך חדש שעוטף אותם.
export default function ResearchPage() {
  // 🧪 טיוטה — המעבדה פתוחה (בלי שער הרשמה). אין קישור בתפריט הראשי, הכתובת /research
  // אינה מפורסמת → דה-פקטו פרטית, אבל עובדת לכל מי שנכנס בלי צורך להתחבר.
  const [sp, setSp] = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  // 🔑 מנהל (role=admin) פותח את כל הכלים הממומשים — גם הנעולים — לבדיקות. לציבור נשאר סגור.
  const { isAdmin } = useAuth();
  const ready = id => isToolReady(id, isAdmin);
  // תפריט-המשנה: כלים פתוחים גלויים · כלים שיעבדו (בבנייה) תחת «עוד»
  const READY_LAB = TOOLS.filter(t => ready(t.id));
  const FUTURE_LAB = TOOLS.filter(t => !ready(t.id));

  // ה-URL הוא מקור-האמת לכלי הפעיל → deep-link נכנס ישר לכלי. q = מונח-זריעה (ממסע החיפוש)
  const tool = sp.get("tool");
  const seed = sp.get("q") || "";
  // 🧮 איחוד המחשבונים: «gematria» אינו כלי נפרד — הוא הבית הקנוני בבית-המדרש (טאב מחשבון).
  // כל בקשה ל-tool=gematria מנותבת ל-tool=midrash&tab=calc (עם w=מונח-הזריעה אם יש).
  const setTool = t => t === "gematria" ? setSp({ tool: "midrash", tab: "calc" }) : setSp(t ? { tool: t } : {});
  // 🔗 «תחבר הכל»: מסע-חיפוש פותח כל מנוע עם המונח טעון מראש (els/verse…); gematria → בית-המדרש
  const openTool = (t, q) => t === "gematria"
    ? setSp(q ? { tool: "midrash", tab: "calc", w: q } : { tool: "midrash", tab: "calc" })
    : setSp(q ? { tool: t, q } : { tool: t });
  // ניתוב כניסות-חוץ ישירות (/gematria · קישורי-ישנים · שדה-השער): tool=gematria → בית-המדרש calc.
  useEffect(() => {
    if (tool !== "gematria") return;
    setSp(seed ? { tool: "midrash", tab: "calc", w: seed } : { tool: "midrash", tab: "calc" }, { replace: true });
  }, [tool, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // שורה 2 — סרגל כלי-המעבדה (מתחת לנאב); נמסר ל-ResearchShell כשורה ברוחב מלא
  const subnav = (
    <div className="rw-subnav">
      <div className="rw-toolbar">
        <button className={"rw-tchip" + (tool ? "" : " on")} onClick={() => setTool(null)}>🏛️ היכל הגילוי</button>
        {/* כלים שעובדים */}
        {READY_LAB.map(t => (
          <button key={t.id} className={"rw-tchip" + (tool === t.id ? " on" : "")} onClick={() => setTool(t.id)} title={t.title}>
            {t.icon} {t.title}
          </button>
        ))}
      </div>
      {/* כלים שיעבדו — תחת «עוד» (מחוץ לאזור-הגלילה כדי שלא ייחתך) */}
      {FUTURE_LAB.length > 0 && (
        <div className="rw-more-wrap">
          <button className={"rw-tchip" + (FUTURE_LAB.some(t => t.id === tool) ? " on" : "")} onClick={() => setMoreOpen(o => !o)}>עוד ▾</button>
          {moreOpen && (
            <>
              <div className="rw-more-back" onClick={() => setMoreOpen(false)} />
              <div className="rw-more-pop">
                <div className="rw-more-h">בבנייה · ייפתחו בקרוב</div>
                {FUTURE_LAB.map(t => (
                  <button key={t.id} className="rw-more-item" onClick={() => { setMoreOpen(false); setTool(t.id); }} title={t.desc}>
                    🔒 {t.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <ResearchShell subnav={subnav}>
      {!tool ? (
        <ResearchHome onOpen={setTool} />
      ) : !ready(tool) ? (
        <div className="rw-card" style={{ textAlign: "center", padding: "44px 20px" }}>
          <div style={{ fontSize: 46, marginBottom: 14 }}>🔬</div>
          <div style={{ fontFamily: "inherit", fontSize: 20, fontWeight: 800, color: "var(--ink,#1b1d22)", marginBottom: 8 }}>הכלי בשדרוג</div>
          <div className="rw-muted" style={{ fontSize: 14.5, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 18px" }}>
            המעבדה עוברת שדרוג מסיבי — הכלי הזה ייפתח בקרוב לכל החוקרים.<br />כרגע פתוחים: <b>המחשבון</b> ו<b>דף המספר</b>.
          </div>
          <button className="rw-tchip on" onClick={() => setTool("gematria")} style={{ marginInlineEnd: 8 }}>🧮 למחשבון</button>
          <button className="rw-tchip" onClick={() => setTool(null)}>← היכל הגילוי</button>
        </div>
      ) : (
        <>
          {GUIDES[tool] && <ToolGuide {...GUIDES[tool]} />}
          {tool === "journey" && <SearchJourney onOpenTool={openTool} />}
          {tool === "name" && <NameStory />}
          {tool === "family" && <FamilyCross />}
          {tool === "compare" && <CompareTwo onOpenTool={openTool} />}
          {tool === "els" && <ElsGrid seed={seed} />}
          {tool === "life" && <LifeProfile />}
          {tool === "number" && <NumberTool />}
          {tool === "notarikon" && <NotarikonTool />}
          {tool === "verse" && <VerseSearch seed={seed} />}
          {tool === "import" && <FileAnalyzer />}
          {tool === "midrash" && (
            <Suspense fallback={<div className="rw-card rw-muted">טוען את בית המדרש…</div>}>
              <BeitMidrashPage />
            </Suspense>
          )}
        </>
      )}
    </ResearchShell>
  );
}
