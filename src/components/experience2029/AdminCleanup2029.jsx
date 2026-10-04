import React, { useMemo, useState } from "react";
import { numeric } from "../../lib/admin/controlPlaneProjection.js";
import { CLEANUP_LIMITS, cleanupInput, cleanupProjection } from "../../lib/admin/controlPlanePlanning.js";
import { SourceStamp, SourceState, formatNumber, formatTime } from "./AdminSource2029.jsx";

export default function AdminCleanup2029({ source, healthSource, onRefresh }) {
  const [selected, setSelected] = useState([]);
  const [assumptions, setAssumptions] = useState({ bytesPerRow: "", averageGB: "", rate: "", quota: "0" });
  const projection = useMemo(() => cleanupProjection(source.data, selected, assumptions), [source.data, selected, assumptions]);
  const usable = source.status === "ready";
  const update = (key, value) => setAssumptions(s => ({ ...s, [key]: value }));
  const money = v => v == null ? "לא ידוע" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "USD" }).format(v);
  const exportPlan = () => {
    const plan = { version: 1, kind: "retention-planning-only", exportedAt: new Date().toISOString(),
      source: "admin_retention_preview", sourceGeneratedAt: source.data?.generated_at || null, sourceReadAt: source.readAt,
      selectedTables: projection.chosen.map(r => ({ name: r.name, candidates: r.candidates, reason: r.reason })),
      assumptions, assumptionBasis: "USER_ENTERED_NOT_MEASURED", projection: { removedRows: projection.removedRows, logicalGB: projection.logicalGB, savingUSD: projection.saving }, executesDeletion: false };
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "sod1820-cleanup-plan.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="sod29-section" data-experience-capability="admin-cleanup-preview">
    <div className="sod29-section-head"><div><div className="sod29-kicker">ניקוי · תכנון</div><h2>לפני שמנקים, רואים מה יקרה</h2></div><button className="sod29-action" disabled={source.status === "loading"} onClick={onRefresh}>רענן תצוגת ניקוי</button></div>
    <p className="sod29-muted">תצוגת admin_retention_preview הקיימת קובעת את המועמדים, ההגנות והתלויות. הבחירה כאן בונה תרחיש בלבד ואינה מבצעת מחיקה או מרחיבה הרשאות.</p>
    <SourceState source={source} name="retention" onRetry={onRefresh} /><SourceStamp source={source} name="retention" />
    {usable ? <>
      <div className="sod29-actions"><span className="sod29-chip">{source.data?.mode || "מצב לא נמסר"}</span><span className="sod29-chip">{source.data?.delete_authorized === true ? "המקור מדווח על הרשאה כללית" : "אין הרשאת מחיקה כללית"}</span></div>
      <div className="sod29-admin-table"><table><caption>בחירה זמינה רק למועמדים שהמקור התיר במפורש וללא תלות לא ידועה</caption><thead><tr>{["לתכנון", "טבלה / מחיצה", "לפני · רשומות", "מוגנות", "מועמדים", "תלויות לא ידועות", "אחרי · תרחיש"].map(x => <th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{projection.tables.map(r => <tr key={r.key}>
        <td><input type="checkbox" aria-label={`כלול בתרחיש ${r.name}`} checked={r.eligible && selected.includes(r.key)} disabled={!r.eligible} onChange={e => setSelected(s => e.target.checked ? [...s, r.key] : s.filter(k => k !== r.key))} /></td>
        <td><strong>{r.name}</strong><small>{r.retentionClass}</small><details><summary>הגנות וסיבת המדיניות</summary><p>{r.reason}</p><p>טווח מקור: {formatTime(r.oldestAt)} — {formatTime(r.newestAt)}</p></details></td>
        <td>{formatNumber(r.total)}</td><td>{formatNumber(r.protectedRows)}</td><td>{formatNumber(r.candidates)}</td><td>{formatNumber(r.dependencies)}</td><td>{formatNumber(r.total == null ? null : r.total - (r.eligible && selected.includes(r.key) ? r.candidates : 0))}</td>
      </tr>)}</tbody></table></div>
      {!projection.tables.length ? <p>המקור לא החזיר טבלאות לתצוגה. לא הוסקו מועמדי ניקוי.</p> : null}
      <h3>אומדן נפח ועלות — לפי הנחות שלך</h3>
      <p className="sod29-muted">ה־preview מספק רשומות, לא bytes שיתפנו. הזן משקל ממוצע לרשומה רק אם יש לך בסיס מתאים. נפח לוגי משוער אינו הבטחה לשחרור דיסק; אינדקסים, ניפוח וגיבויים אינם מחושבים. מדד הנתונים/יומנים הוא אותו קירוב תכנון של הסימולטור, ולא מיפוי לחיוב DB compute.</p>
      <div className="sod29-admin-form">{[
        ["bytesPerRow", "משקל ממוצע לרשומה · bytes"], ["averageGB", "נפח ממוצע לחיוב לפני · GB"],
        ["rate", "תעריף תכנון · $ / GB / חודש"], ["quota", "מכסה כלולה לתכנון · GB"],
      ].map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max={CLEANUP_LIMITS[key]} step="any" inputMode="decimal" value={assumptions[key]} onChange={e => update(key, e.target.value)} aria-invalid={assumptions[key] !== "" && cleanupInput(key, assumptions[key]) == null} /><small>{assumptions[key] !== "" && cleanupInput(key, assumptions[key]) == null ? `יש להזין ערך בין 0 ל־${formatNumber(CLEANUP_LIMITS[key])}` : key === "quota" && assumptions.quota === "0" ? "0: לא הונחה מכסה כלולה" : "הנחה שהזנת; לא מדידה"}</small></label>)}</div>
      <div className="sod29-admin-table"><table><caption>השוואה מחושבת של התרחיש שבחרת</caption><thead><tr><th scope="col">מדד</th><th scope="col">לפני</th><th scope="col">אחרי בתרחיש</th><th scope="col">הפחתה בתרחיש</th></tr></thead><tbody>
        <tr><td>רשומות בטבלאות שנקראו</td><td>{formatNumber(projection.totalRows)}</td><td>{formatNumber(projection.afterRows)}</td><td>{formatNumber(projection.removedRows)}</td></tr>
        <tr><td>נפח לתכנון · GB</td><td>{formatNumber(assumptions.averageGB, 3)}</td><td>{formatNumber(projection.afterGB, 3)}</td><td>{formatNumber(projection.logicalGB, 3)}</td></tr>
        <tr><td>עלות חודשית משוערת למדד זה</td><td>{money(projection.beforeCost)}</td><td>{money(projection.afterCost)}</td><td>{money(projection.saving)}</td></tr>
      </tbody></table></div>
      {projection.logicalGB != null && numeric(assumptions.averageGB) != null && projection.logicalGB > Number(assumptions.averageGB) ? <p role="alert">אומדן ההפחתה גדול מנפח התכנון שהזנת. עלות ״אחרי״ אינה מחושבת עד לתיקון ההנחות.</p> : null}
      <p className="sod29-muted">נפח DB שנצפה במערכת: {numeric(healthSource.data?.db?.database_bytes) == null ? "לא ידוע" : `${formatNumber(healthSource.data.db.database_bytes / 1e9, 3)} GB`}. זהו צילום נוכחי נפרד, שלא הוזן אוטומטית לממוצע לחיוב.</p><SourceStamp source={healthSource} name="health" />
      <button className="sod29-action" onClick={exportPlan}>ייצא תוכנית לבדיקה</button>
    </> : null}
  </section>;
}
