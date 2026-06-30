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
