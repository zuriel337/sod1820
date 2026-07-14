import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ResearchShell from "../components/ResearchShell.jsx";
import ResearchHome, { TOOLS } from "../components/ResearchHome.jsx";
import { isToolReady, FLAGSHIP_TOOLS } from "../lib/hub/ready.js";
import { useViewAsUser, setViewAsUser } from "../lib/hub/viewAs.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import VerseSearch from "../components/VerseSearch.jsx";
import NameLabPage from "./NameLabPage.jsx";
import FamilyCross from "../components/FamilyCross.jsx";
import ElsGrid from "../components/ElsGrid.jsx";
import LifeProfile from "../components/LifeProfile.jsx";
import FileAnalyzer from "../components/FileAnalyzer.jsx";
import SearchJourney from "../components/SearchJourney.jsx";
import CompareTwo from "../components/CompareTwo.jsx";
import NumberTool from "../components/NumberTool.jsx";
import NotarikonTool from "../components/NotarikonTool.jsx";
import DatesTool from "../components/DatesTool.jsx";
import { NumHrefCtx } from "../lib/numHrefCtx.js";
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
  dates: {
    title: "איך משתמשים בתאריכים עבריים",
    intro: "ממירים תאריך לועזי לתאריך העברי המקביל — ומגלים את הגימטריה שלו.",
    steps: [
      "בחרו תאריך לועזי בשדה התאריך.",
      "אם האירוע היה אחרי השקיעה — סמנו «אחרי השקיעה» (עובר ליום העברי הבא).",
      "מתקבל התאריך העברי המלא (למשל «כ״ב סִיוָן תש״נ») והערך הגימטרי שלו.",
      "לחיצה על הערך → דף-המספר עם כל ההצלבות וההתכנסויות.",
    ],
    tip: "נסו תאריך לידה, או תאריך אירוע — וראו אם הערך נופל על מספר-מפתח.",
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
  // 🔑 מנהל (role=admin) פותח את כל הכלים הממומשים — גם הנעולים — לבדיקות. לציבור נשאר סגור.
  // 👁 «תצוגת משתמש»: כשמופעל, המנהל רואה בדיוק כמו משתמש רגיל (isAdmin אפקטיבי = false).
  const { isAdmin: realAdmin } = useAuth();
  const viewAsUser = useViewAsUser();
  const isAdmin = realAdmin && !viewAsUser;
  // 📱 בטלפון: דילוגי-אותיות (מטריצה רחבה) עדיפים כדף עצמאי /code, לא דחוסים בהיכל.
  const wide = useMediaQuery("(min-width: 768px)");
  // 💻 הודעת-מובייל: ההיכל מיטבי במחשב (נדחית — נשמר ב-localStorage)
  const [hideMobNote, setHideMobNote] = useState(() => { try { return localStorage.getItem("sod_hub_mobnote") === "1"; } catch { return false; } });
  // 🔬 כלל-הכניסה: כניסה להיכל הגילוי מדליקה מצב discovery לכל האתר — כל Hub שנפתח מכאן יורש אותו.
  const { enterDiscovery } = useResearch();
  useEffect(() => { enterDiscovery?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = id => isToolReady(id, isAdmin);
  const [soonOpen, setSoonOpen] = useState(false);
  // תפריט-המשנה: כלים פתוחים גלויים · כלים שיעבדו (בבנייה) תחת «בקרוב ▾»
  // דגלים ראשונים (דף המספר · מחשבון · מנוע השמות), אחר-כך השאר — סרגל נקי (המלצת ניקוי ההיכל).
  const FLAG_ORDER = ["number", "midrash", "name"];
  const rank = t => { const i = FLAG_ORDER.indexOf(t.id); return i < 0 ? 99 : i; };
  // מיזוג הכפילות: «מחשבון גימטריה» ו«בית המדרש» פותחים אותו מסך (בית המדרש נפתח בטאב המחשבון
  // כברירת-מחדל) → מסתירים את צ'יפ gematria, ובית-המדרש מוצג כ«🧮 מחשבון · בית המדרש».
  const READY_LAB = TOOLS.filter(t => ready(t.id) && t.id !== "gematria").sort((a, b) => rank(a) - rank(b));
  const FUTURE_LAB = TOOLS.filter(t => !ready(t.id));
  const chipOf = t => t.id === "midrash" ? { icon: "🧮", label: "מחשבון · בית המדרש" } : { icon: t.icon, label: t.title };

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
  // 🔓 היכל-הגילוי נפתח בהדרגה (READY_TOOLS). כלים פתוחים = לחיצים; השאר «🚧 בבנייה» ולא-לחיצים.
  // המנהל (אדמין) ממשיך לעבוד על כל הכלים הממומשים (READY_LAB כולל אותם דרך isToolReady).
  const subnav = (
    <div className="rw-subnav">
      <div className="rw-toolbar">
        <button className={"rw-tchip" + (tool ? "" : " on")} onClick={() => setTool(null)}>🏛️ היכל</button>
        {/* כלים פתוחים — דגלים ראשונים (לציבור: הפתוחים · למנהל: הכל) */}
        {READY_LAB.map(t => {
          const c = chipOf(t);
          return (
            <button key={t.id} className={"rw-tchip" + (tool === t.id ? " on" : "")} onClick={() => setTool(t.id)} title={t.title}>
              {c.icon} {c.label}{isAdmin && t.id !== "midrash" ? " 🔑" : ""}
            </button>
          );
        })}
      </div>
      {/* כלים בבנייה — מקובצים תחת «בקרוב ▾» יחיד (במקום 7 צ'יפים שמעמיסים את הסרגל) */}
      {FUTURE_LAB.length > 0 && (
        <div className="rw-more-wrap">
          <button className="rw-tchip" onClick={() => setSoonOpen(o => !o)} title="כלים בבנייה — בקרוב">
            🔜 בקרוב <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 800 }}>({FUTURE_LAB.length})</span>
          </button>
          {soonOpen && (
            <>
              <div className="rw-more-back" onClick={() => setSoonOpen(false)} />
              <div className="rw-more-pop">
                <div className="rw-more-h">בבנייה — ייפתחו בקרוב</div>
                {FUTURE_LAB.map(t => (
                  <div key={t.id} className="rw-more-item" style={{ cursor: "default", opacity: 0.72 }}>🚧 {t.icon} {t.title}</div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {/* 👁 מתג «תצוגת משתמש» — גלוי רק לאדמין אמיתי; מראה את ההיכל בדיוק כמו משתמש רגיל */}
      {realAdmin && (
        <button className="rw-tchip rw-adminview" onClick={() => setViewAsUser(!viewAsUser)}
          title={viewAsUser ? "חזור לתצוגת מנהל (כלים נעולים גלויים)" : "ראה את ההיכל בדיוק כמו משתמש רגיל"}
          style={{ marginInlineStart: "auto", flex: "none", borderStyle: viewAsUser ? "solid" : "dashed", whiteSpace: "nowrap" }}>
          {viewAsUser ? "🔑 חזרה לתצוגת מנהל" : "👁 תצוגת משתמש"}
        </button>
      )}
    </div>
  );

  return (
    <ResearchShell subnav={subnav}>
      {/* 🔗 כל קישורי-המספר בכל כלי נשארים בתוך ההיכל (/research?tool=number) — לא יוצאים לדף העצמאי */}
      <NumHrefCtx.Provider value={n => `/research?tool=number&n=${n}`}>
      {!wide && !hideMobNote && (
        <div className="rw-card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "var(--accS,#eef3ff)", border: "1px solid var(--line,#e4e7ec)", padding: "11px 13px" }}>
          <span style={{ fontSize: 20 }}>💻</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--ink,#1b1d22)", lineHeight: 1.5 }}>ההיכל עובד בצורה מיטבית דרך המחשב — במובייל חלק מהכלים והפאנלים מוצגים מצומצם.</span>
          <button onClick={() => { setHideMobNote(true); try { localStorage.setItem("sod_hub_mobnote", "1"); } catch { /* noop */ } }} title="הבנתי" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "var(--ink2,#5b6472)", lineHeight: 1 }}>✕</button>
        </div>
      )}
      {!tool ? (
        <ResearchHome onOpen={setTool} />
      ) : !ready(tool) ? (
        <div className="rw-card" style={{ textAlign: "center", padding: "44px 20px" }}>
          <div style={{ fontSize: 46, marginBottom: 14 }}>🔬</div>
          <div style={{ fontFamily: "inherit", fontSize: 20, fontWeight: 800, color: "var(--ink,#1b1d22)", marginBottom: 8 }}>הכלי בשדרוג</div>
          <div className="rw-muted" style={{ fontSize: 14.5, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 18px" }}>
            הכלי הזה עדיין <b>בבנייה</b> — ייפתח בקרוב לכל החוקרים.<br />פתוחים עכשיו: מחשבון · דף המספר · בית המדרש · חיפוש בפסוקים · השוואת מילים · נוטריקון · ניתוח קובץ.
          </div>
          <button className="rw-tchip on" onClick={() => setTool("gematria")} style={{ marginInlineEnd: 8 }}>🧮 למחשבון</button>
          <button className="rw-tchip" onClick={() => setTool(null)}>← היכל</button>
        </div>
      ) : (
        <>
          {GUIDES[tool] && <ToolGuide {...GUIDES[tool]} />}
          {tool === "journey" && <SearchJourney onOpenTool={openTool} />}
          {tool === "name" && <NameLabPage embedded />}
          {tool === "family" && <FamilyCross />}
          {tool === "compare" && <CompareTwo onOpenTool={openTool} />}
          {tool === "els" && (wide ? <ElsGrid seed={seed} /> : (
            <div className="rw-card" style={{ textAlign: "center", padding: "40px 22px" }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>🔠</div>
              <div style={{ fontWeight: 800, fontSize: 19, color: "var(--ink,#1b1d22)", marginBottom: 8 }}>דילוגי אותיות — עדיף כדף מלא</div>
              <div className="rw-muted" style={{ fontSize: 14, lineHeight: 1.75, maxWidth: 380, margin: "0 auto 18px" }}>
                מטריצת הדילוגים רחבה — בטלפון הכלי נוח יותר בדף העצמאי. (בהיכל המלא, במחשב, הוא נפתח כאן בפנים.)
              </div>
              <Link to="/code" className="rw-tchip on" style={{ display: "inline-block", textDecoration: "none" }}>🔠 פתח דילוגי אותיות ←</Link>
            </div>
          ))}
          {tool === "life" && <LifeProfile />}
          {tool === "number" && <NumberTool />}
          {tool === "notarikon" && <NotarikonTool />}
          {tool === "dates" && <DatesTool />}
          {tool === "verse" && <VerseSearch seed={seed} />}
          {tool === "import" && <FileAnalyzer />}
          {tool === "midrash" && (
            <Suspense fallback={<div className="rw-card rw-muted">טוען את בית המדרש…</div>}>
              <BeitMidrashPage />
            </Suspense>
          )}
        </>
      )}
      </NumHrefCtx.Provider>
    </ResearchShell>
  );
}
