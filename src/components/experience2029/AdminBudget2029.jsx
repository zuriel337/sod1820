import React, { useMemo, useState } from "react";
import { numeric } from "../../lib/admin/controlPlaneProjection.js";
import { budgetAlerts, viralComparison } from "../../lib/admin/controlPlanePlanning.js";
import { SourceStamp, SourceState, formatNumber } from "./AdminSource2029.jsx";

export default function AdminBudget2029({ state, result, selectedMonth, money, budgetField, warningField, notificationSource, healthSource, onRefresh }) {
  const [factor, setFactor] = useState("3");
  const validFactor = numeric(factor) != null && Number(factor) >= 1 && Number(factor) <= 100;
  const stress = useMemo(() => validFactor ? viralComparison(state.values, Number(factor), selectedMonth) : null, [state.values, factor, selectedMonth, validFactor]);
  const alerts = useMemo(() => budgetAlerts(result, state.values.budget, state.budgetWarningPercent ?? 80), [result, state.values.budget, state.budgetWarningPercent]);
  const current = alerts.find(x => x.month === selectedMonth);
  const attention = alerts.filter(x => x.state !== "within");
  const guard = healthSource.data?.usage?.storage_egress_guard;
  return <div data-experience-capability="admin-budget-alerts">
    <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">תקציב · התראות בתכנון</div><h2>מתי העומס עובר את התקציב?</h2></div><button className="sod29-action" onClick={onRefresh}>רענן ניטור וערוצים</button></div>
      <p className="sod29-muted">אלו אותן הנחות ואותם תרחישים של ״סימולציה ומשאבים״. התקציב נוגע לתוספת החודשית; אינו מגבלת ספק. ההנחות נשמרות בדפדפן הזה וניתנות לייצוא מהסימולטור.</p>
      <div className="sod29-admin-form">{budgetField}{warningField}</div>
      <p>התרחיש: <strong>{state.scenarioName}</strong> · חודש {selectedMonth} · תקציב לתוספת {money(state.values.budget)} · {state.provenance.budget === "user" ? "תקציב שהזנת" : "תקציב לדוגמה / תרחיש"}</p>
      <div className={`sod29-admin-alert ${current?.state || "within"}`} role="status">{current?.state === "critical" ? "חריגה משוערת" : current?.state === "warning" ? "מתקרב לסף שהגדרת" : "בתוך התקציב לפי ההנחות"}: תוספת {money(current?.amount ?? 0)} בחודש הנבחר.</div>
      <div className="sod29-admin-table"><table><caption>חודשים שמתקרבים לתקציב או עוברים אותו</caption><thead><tr><th scope="col">חודש</th><th scope="col">תוספת משוערת</th><th scope="col">מתוך התקציב</th><th scope="col">מצב תכנון</th></tr></thead><tbody>{attention.map(a => <tr key={a.month}><td>{a.month}</td><td>{money(a.amount)}</td><td>{a.ratio == null ? "תקציב 0 מול עלות חיובית" : `${formatNumber(a.ratio * 100, 1)}%`}</td><td>{a.state === "critical" ? "חריגה" : "התקרבות לסף"}</td></tr>)}</tbody></table></div>
      {!attention.length ? <p>לא נמצאה התקרבות לתקציב באופק ובהנחות הנוכחיים.</p> : null}
      <h3>בדיקת עומס ויראלי</h3><p className="sod29-muted">המכפיל משנה את קצב ההעלאות ואת העומס הנגזר ומחשב מחדש מכסות; זו אינה תחזית הסתברותית. התרחיש השמור אינו נדרס.</p>
      <div className="sod29-admin-toolbar"><label>מכפיל עומס<input type="number" min="1" max="100" step="any" value={factor} onChange={e => setFactor(e.target.value)} aria-invalid={!validFactor} /></label>{[1, 3, 10].map(n => <button className="sod29-action" key={n} aria-pressed={Number(factor) === n} onClick={() => setFactor(String(n))}>פי {n}</button>)}</div>
      {!validFactor ? <p role="alert">יש להזין מכפיל בין 1 ל־100.</p> : null}
      {stress ? <div className="sod29-admin-table"><table><caption>חודש {selectedMonth} — נוכחי מול עומס פי {stress.factor}</caption><thead><tr><th scope="col">מדד</th><th scope="col">נוכחי</th><th scope="col">תרחיש עומס</th></tr></thead><tbody>{[
        ["העלאות", formatNumber(stress.current.uploads), formatNumber(stress.stress.uploads)],
        ["אחסון בסוף · GB", formatNumber(stress.current.storageEnd, 2), formatNumber(stress.stress.storageEnd, 2)],
        ["תעבורה · GB", formatNumber(stress.current.usage.cached + stress.current.usage.uncached, 2), formatNumber(stress.stress.usage.cached + stress.stress.usage.uncached, 2)],
        ["תוספת משוערת", money(stress.current.delta), money(stress.stress.delta)],
        ["סה״כ משוער", money(stress.current.total), money(stress.stress.total)],
      ].map(([label, before, after]) => <tr key={label}><td>{label}</td><td>{before}</td><td>{after}</td></tr>)}</tbody></table></div> : null}
    </section>
    <section className="sod29-section"><h2>התראות פעילות במערכת מול התראות תכנון</h2>
      <p>התראות התקציב שלמעלה מוצגות בזמן שהמסך פתוח. הן אינן נשלחות במייל או בוואטסאפ. ניטור התעבורה וערוצי השומר הקיימים מוצגים בנפרד; לא שונתה הגדרה או הופעל משלוח.</p>
      <SourceState source={healthSource} name="health" onRetry={onRefresh} />
      <div className="sod29-admin-alert"><strong>שומר תעבורה קיים: {guard?.state || "לא ידוע"}</strong><p>סף אזהרה ב־24 שעות: {formatNumber(numeric(guard?.warn_24h_bytes) == null ? null : Number(guard.warn_24h_bytes) / 1e9, 3)} GB · סף קריטי: {formatNumber(numeric(guard?.critical_24h_bytes) == null ? null : Number(guard.critical_24h_bytes) / 1e9, 3)} GB</p><SourceStamp source={healthSource} name="health" basis={healthSource.data?.usage?.storage_egress_observed_basis || "UNKNOWN"} /></div>
      <SourceState source={notificationSource} name="notify" onRetry={onRefresh} />
      {notificationSource.status === "ready" ? <div className="sod29-admin-table"><table><thead><tr><th scope="col">ערוץ שומר קיים</th><th scope="col">מצב מוגדר</th></tr></thead><tbody>{notificationSource.data.map((n, i) => <tr key={`${n.channel}:${i}`}><td>{({ whatsapp: "וואטסאפ", email: "אימייל" })[n.channel] || n.channel}</td><td>{n.enabled == null ? "לא ידוע" : n.enabled ? "מופעל בהגדרות; המסירה לא אומתה" : "כבוי בהגדרות"}</td></tr>)}</tbody></table></div> : null}
      <SourceStamp source={notificationSource} name="notify" /><a className="sod29-action" href="/admin?tab=suggest">פתח הגדרות השומר הקיים ←</a>
    </section>
  </div>;
}
