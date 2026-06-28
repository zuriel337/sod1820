import React, { useState } from "react";
import ResearchShell from "../components/ResearchShell.jsx";
import QuickActions from "../components/QuickActions.jsx";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";

// 🔬 /research — סביבת המחקר (שלב 1): המחשבון האמיתי (כל 17 השיטות, מאומת מול
// המנוע) בתוך השלד הקבוע. «הוסף למחקר» פולט Event → «המחקר הפעיל» מתעדכן חי
// (Research Bus). מצב research=true → כל חיפוש נשמר אוטומטית לרשימה הפרטית בלבד.
// כל הדפים הקיימים (/beit-midrash וכו') נשארים כשהיו — זה מסך חדש שעוטף אותם.
export default function ResearchPage() {
  const [result, setResult] = useState(null); // { word, ragil } מהמחשבון
  const entity = result?.word ? entityFromPhrase(result.word, result.ragil) : null;

  return (
    <ResearchShell>
      <div className="rw-card">
        <div className="rw-muted" style={{ marginBottom: 8, fontWeight: 700 }}>🧮 מחשבון גימטריה · כל 17 השיטות · מאומת במנוע</div>
        <GematriaCalculator research onResult={setResult} />
        {entity && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--rw-line, #ece4d3)", paddingTop: 12 }}>
            <div className="rw-muted" style={{ marginBottom: 6 }}>
              «{entity.title}» = {result.ragil?.toLocaleString("he")} · לחצו «➕ הוסף למחקר» כדי לצרף ל«המחקר הפעיל» בצד (יישאר גם כשתעברו כלי).
            </div>
            <QuickActions entity={entity} />
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />
      <div className="rw-card">
        <div style={{ fontWeight: 800, fontSize: 15 }}>✨ סביבת המחקר — שלב 1</div>
        <div className="rw-muted" style={{ marginTop: 4, lineHeight: 1.7 }}>
          השלד הקבוע · מרכז המחקר (פאנלים) · QuickActions · Event Bus · Local-first. זהו המחשבון האמיתי — אותו מנוע, אותן 17 שיטות — בתוך המבנה החדש. בהמשך ייכנסו גם הדילוגים (ELS) וההצלבות, באותו אופן: אותו תוכן, מבנה חדש מסביב.
        </div>
      </div>
    </ResearchShell>
  );
}
