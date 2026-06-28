import React, { useState } from "react";
import ResearchShell from "../components/ResearchShell.jsx";
import QuickActions from "../components/QuickActions.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";
import { calcGem } from "../theme.js";

// 🔬 /research — דמו חי של סביבת המחקר (שלב 1): מחשבון-מיני בתוך השלד.
// «הוסף למחקר» פולט Event → «המחקר הפעיל» בצד מתעדכן בזמן אמת (Research Bus).
// כל הדפים הקיימים נשארים כשהיו — זה מסך חדש שמדגים את השלד.
export default function ResearchPage() {
  const [term, setTerm] = useState("אלהים");
  const val = calcGem(term) || 0;
  const entity = entityFromPhrase(term.trim(), val);

  return (
    <ResearchShell>
      <div className="rw-card">
        <div className="rw-muted">ביטוי · גימטריה רגילה</div>
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          dir="rtl"
          aria-label="ביטוי לחישוב"
          style={{ fontSize: 19, fontWeight: 800, border: "none", background: "transparent", outline: "none", width: "100%", color: "inherit", padding: "4px 0", fontFamily: "inherit" }}
        />
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, margin: "4px 0" }}>{val.toLocaleString("he")}</div>
        <div className="rw-muted">לחצו «➕ הוסף למחקר» — והביטוי יצטרף ל«המחקר הפעיל» בצד (ויישאר גם כשתעברו כלי).</div>
        <QuickActions entity={entity} />
      </div>

      <div style={{ height: 12 }} />
      <div className="rw-card">
        <div style={{ fontWeight: 800, fontSize: 15 }}>✨ סביבת המחקר — שלב 1 (דמו)</div>
        <div className="rw-muted" style={{ marginTop: 4, lineHeight: 1.7 }}>
          השלד הקבוע · מרכז המחקר (פאנלים) · QuickActions · Event Bus · Local-first. הכלים הקיימים (גימטריה/דילוגים) ייכנסו לכאן בלי לשבור — אותו תוכן, מבנה חדש מסביב.
        </div>
      </div>
    </ResearchShell>
  );
}
