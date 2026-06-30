import React, { useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import ResearchShell from "../components/ResearchShell.jsx";
import ResearchHome, { TOOLS } from "../components/ResearchHome.jsx";
import { isToolReady } from "../lib/hub/ready.js";
import QuickActions from "../components/QuickActions.jsx";
import VerseSearch from "../components/VerseSearch.jsx";
import NameStory from "../components/NameStory.jsx";
import FamilyCross from "../components/FamilyCross.jsx";
import ElsGrid from "../components/ElsGrid.jsx";
import LifeProfile from "../components/LifeProfile.jsx";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import FileAnalyzer from "../components/FileAnalyzer.jsx";
import SearchJourney from "../components/SearchJourney.jsx";
import CompareTwo from "../components/CompareTwo.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";

// בית-המדרש האמיתי נטען בעצלתיים — נפתח בתוך השלד (לא קישור חוצה). הדף עצמאי
// (לא תלוי ב-Layout) ובהיר זהב-על-קרם → נכנס חלק בלי שכפול ובלי לשבור את /beit-midrash.
const BeitMidrashPage = lazy(() => import("./BeitMidrashPage.jsx"));

// 🔬 /research — סביבת המחקר (שלב 1). מסך פתיחה = בית-הכלים; בחירת כלי פותחת
// אותו בתוך השלד. «הוסף למחקר» פולט Event → «המחקר הפעיל» מתעדכן חי (Research Bus).
// כל הדפים הקיימים נשארים כשהיו — זה מסך חדש שעוטף אותם.
function GematriaTool({ seed }) {
  const [result, setResult] = useState(null); // { word, ragil } מהמחשבון
  const entity = result?.word ? entityFromPhrase(result.word, result.ragil) : null;
  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ marginBottom: 8, fontWeight: 700 }}>🧮 מחשבון גימטריה · כל 17 השיטות · מאומת במנוע</div>
      <GematriaCalculator research seed={seed} onResult={setResult} />
      {entity && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--rw-line, #ece4d3)", paddingTop: 12 }}>
          <div className="rw-muted" style={{ marginBottom: 6 }}>
            «{entity.title}» = {result.ragil?.toLocaleString("he")} · לחצו «➕ הוסף למחקר» כדי לצרף ל«המחקר הפעיל» בצד (יישאר גם כשתעברו כלי).
          </div>
          <QuickActions entity={entity} />
        </div>
      )}
    </div>
  );
}

// כלי-המעבדה לשורה האופקית (deep-linkable: /research?tool=els)
const LAB_TOOLS = TOOLS.filter(t => t.status === "live");

export default function ResearchPage() {
  // 🧪 טיוטה — המעבדה פתוחה (בלי שער הרשמה). אין קישור בתפריט הראשי, הכתובת /research
  // אינה מפורסמת → דה-פקטו פרטית, אבל עובדת לכל מי שנכנס בלי צורך להתחבר.
  const [sp, setSp] = useSearchParams();

  // ה-URL הוא מקור-האמת לכלי הפעיל → deep-link נכנס ישר לכלי. q = מונח-זריעה (ממסע החיפוש)
  const tool = sp.get("tool");
  const seed = sp.get("q") || "";
  const setTool = t => setSp(t ? { tool: t } : {});
  // 🔗 «תחבר הכל»: מסע-חיפוש פותח כל מנוע עם המונח טעון מראש (els/gematria/verse…)
  const openTool = (t, q) => setSp(q ? { tool: t, q } : { tool: t });

  return (
    <ResearchShell>
      {/* שורת-כלים אופקית קבועה — תפריט-המשנה של המעבדה */}
      <div className="rw-toolbar">
        <button className={"rw-tchip" + (tool ? "" : " on")} onClick={() => setTool(null)}>🧭 מרכז הגילוי</button>
        {LAB_TOOLS.map(t => {
          const locked = !isToolReady(t.id);
          return (
            <button key={t.id} className={"rw-tchip" + (tool === t.id ? " on" : "")} onClick={() => setTool(t.id)}
              title={locked ? "בשדרוג — בקרוב" : t.title} style={locked ? { opacity: 0.6 } : undefined}>
              {locked ? "🔒" : t.icon} {t.title}
            </button>
          );
        })}
      </div>

      {!tool ? (
        <ResearchHome onOpen={setTool} />
      ) : !isToolReady(tool) ? (
        <div className="rw-card" style={{ textAlign: "center", padding: "44px 20px" }}>
          <div style={{ fontSize: 46, marginBottom: 14 }}>🔬</div>
          <div style={{ fontFamily: "inherit", fontSize: 20, fontWeight: 800, color: "var(--ink,#1b1d22)", marginBottom: 8 }}>הכלי בשדרוג</div>
          <div className="rw-muted" style={{ fontSize: 14.5, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 18px" }}>
            המעבדה עוברת שדרוג מסיבי — הכלי הזה ייפתח בקרוב לכל החוקרים.<br />כרגע פתוחים: <b>המחשבון</b> ו<b>דף המספר</b>.
          </div>
          <button className="rw-tchip on" onClick={() => setTool("gematria")} style={{ marginInlineEnd: 8 }}>🧮 למחשבון</button>
          <button className="rw-tchip" onClick={() => setTool(null)}>← מרכז הגילוי</button>
        </div>
      ) : (
        <>
          {tool === "journey" && <SearchJourney onOpenTool={openTool} />}
          {tool === "name" && <NameStory />}
          {tool === "family" && <FamilyCross />}
          {tool === "compare" && <CompareTwo onOpenTool={openTool} />}
          {tool === "els" && <ElsGrid seed={seed} />}
          {tool === "life" && <LifeProfile />}
          {tool === "gematria" && <GematriaTool seed={seed} />}
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
