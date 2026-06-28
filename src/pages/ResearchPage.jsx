import React, { useState } from "react";
import ResearchShell from "../components/ResearchShell.jsx";
import ResearchHome from "../components/ResearchHome.jsx";
import QuickActions from "../components/QuickActions.jsx";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";

// 🔬 /research — סביבת המחקר (שלב 1). מסך פתיחה = בית-הכלים; בחירת כלי פותחת
// אותו בתוך השלד. «הוסף למחקר» פולט Event → «המחקר הפעיל» מתעדכן חי (Research Bus).
// כל הדפים הקיימים נשארים כשהיו — זה מסך חדש שעוטף אותם.
function GematriaTool() {
  const [result, setResult] = useState(null); // { word, ragil } מהמחשבון
  const entity = result?.word ? entityFromPhrase(result.word, result.ragil) : null;
  return (
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
  );
}

export default function ResearchPage() {
  const [tool, setTool] = useState(null); // null = בית-הכלים · 'gematria' = מחשבון

  return (
    <ResearchShell>
      {tool === null ? (
        <ResearchHome onOpen={setTool} />
      ) : (
        <>
          <button className="rw-back" onClick={() => setTool(null)}>← בית הכלים</button>
          {tool === "gematria" && <GematriaTool />}
        </>
      )}
    </ResearchShell>
  );
}
